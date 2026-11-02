/** Authenticated account scopes own temporary files and task state; browser drafts never belong here. */
import { AsyncLocalStorage } from 'node:async_hooks';
import { randomUUID } from 'node:crypto';
import { mkdirSync, mkdtempSync, readdirSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';

export const TEMPORARY_MEDIA = process.env.STUDIO_TEMPORARY_MEDIA === '1';
export const MEDIA_RETENTION_MS = 2 * 60 * 60_000;
export interface Workspace {
  id: string;
  state: Map<string, unknown>;
  active: number;
  lastUsed: number;
  mediaSessionId: string;
}
const scope = new AsyncLocalStorage<Workspace>();
const workspaces = new Map<string, Workspace>();
let temporaryRoot: string | null = null;

/** The temporary directory is on the service's data disk, not a RAM-backed /run directory. */
function getTemporaryRoot(): string {
  if (!temporaryRoot) {
    const directory = resolve(process.cwd(), 'data', 'temporary');
    mkdirSync(directory, { recursive: true, mode: 0o700 });
    // Deployment is single-instance. A restart never revives previous process media.
    readdirSync(directory)
      .filter((name) => /^session-[a-zA-Z0-9]+$/.test(name))
      .forEach((name) =>
        rmSync(resolve(directory, name), { recursive: true, force: true }),
      );
    temporaryRoot = mkdtempSync(resolve(directory, 'session-'));
  }
  return temporaryRoot;
}
/** Only administrator-configured identities can become filesystem namespaces. */
export function registerWorkspace(id: string): Workspace {
  if (id !== 'legacy' && !/^[a-f0-9-]{36}$/.test(id))
    throw new Error('无效的工作室标识。');
  let workspace = workspaces.get(id);
  if (!workspace) {
    workspace = {
      id,
      state: new Map(),
      active: 0,
      lastUsed: Date.now(),
      mediaSessionId: randomUUID(),
    };
    workspaces.set(id, workspace);
  }
  return workspace;
}
/** Local CLI retains compatibility; authenticated requests are explicitly scoped by middleware. */
export function getWorkspace() {
  return scope.getStore() ?? registerWorkspace('legacy');
}
/** Promise descendants retain the authenticated workspace while background jobs run. */
export function runInWorkspace<T>(workspace: Workspace, action: () => T): T {
  return scope.run(workspace, action);
}
/** Internal renderer reads can select only a previously registered administrator-owned identity. */
export function findWorkspace(id: string) {
  return workspaces.get(id);
}
/** New deployments use disposable process/account directories; CLI compatibility does not migrate old data. */
export function workspaceDirectory(...parts: Array<string>): string {
  const id = getWorkspace().id;
  const base = resolve(process.cwd(), 'data');
  const root = TEMPORARY_MEDIA
    ? resolve(getTemporaryRoot(), id)
    : id === 'legacy'
      ? base
      : resolve(base, 'workspaces', id);
  const directory = resolve(root, ...parts);
  mkdirSync(directory, { recursive: true });
  return directory;
}
/** Shared templates and process locks contain no account media and cannot be removed by another account's idle cleanup. */
export function sharedWorkspaceDirectory(...parts: Array<string>): string {
  const root = TEMPORARY_MEDIA
    ? resolve(getTemporaryRoot(), '_control')
    : resolve(process.cwd(), 'data', 'shared-runtime');
  const directory = resolve(root, ...parts);
  mkdirSync(directory, { recursive: true });
  return directory;
}
/** Running requests and background work prevent cleanup. Polling may hold a request but must not extend retention. */
export function holdWorkspace(touch = true): () => void {
  const workspace = getWorkspace();
  workspace.active += 1;
  if (touch) workspace.lastUsed = Date.now();
  let released = false;
  return () => {
    if (released) return;
    released = true;
    workspace.active -= 1;
    if (touch) workspace.lastUsed = Date.now();
  };
}
/** Clear only idle, expired account data. Never cancel another account's running/queued work. */
export function cleanupWorkspaces(now = Date.now()): Array<string> {
  if (!TEMPORARY_MEDIA || !temporaryRoot) return [];
  const expired: Array<string> = [];
  for (const workspace of workspaces.values()) {
    if (workspace.active || now - workspace.lastUsed < MEDIA_RETENTION_MS)
      continue;
    rmSync(resolve(temporaryRoot, workspace.id), {
      recursive: true,
      force: true,
    });
    workspace.state.clear();
    workspace.mediaSessionId = randomUUID();
    workspace.lastUsed = now;
    expired.push(workspace.id);
  }
  return expired;
}
/** One-minute cleanup cadence bounds disk retention; it does not keep a stopped process alive. */
export function startWorkspaceCleanup() {
  if (!TEMPORARY_MEDIA) return;
  const timer = setInterval(() => {
    try {
      cleanupWorkspaces();
    } catch (error) {
      console.error(
        '[temporary-media:cleanup]',
        error instanceof Error ? error.message : '清理失败',
      );
    }
  }, 60_000);
  timer.unref();
}
/** Typed task state is partitioned by authenticated identity, never by a request-supplied account id. */
export function workspaceState<T>(key: string, initial: () => T): T {
  const state = getWorkspace().state;
  if (!state.has(key)) state.set(key, initial());
  return state.get(key) as T;
}
/** Remotion uses an account-bound loopback route without browser cookies. */
export function workspaceRenderOrigin(origin: string): string {
  return `${origin}/_workspace/${getWorkspace().id}`;
}
