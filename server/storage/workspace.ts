/** Account uploads/drafts survive restart; jobs, render caches and exports remain temporary. */
import { AsyncLocalStorage } from 'node:async_hooks';
import { randomUUID } from 'node:crypto';
import {
  existsSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  renameSync,
  rmSync,
} from 'node:fs';
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

/** Server-owned identities alone select the stable namespace; requests cannot supply these paths. */
function currentDirectory(id: string) {
  const directory = resolve(process.cwd(), 'data', 'current', id);
  mkdirSync(directory, { recursive: true, mode: 0o700 });
  return directory;
}

/** Upgrade existing uploads before removing process scratch; moving on the same volume copies no video bytes. */
function preserveUploads(directory: string) {
  readdirSync(directory, { withFileTypes: true }).forEach((entry) => {
    if (!/^(legacy|[a-f0-9-]{36})$/.test(entry.name)) return;
    if (!entry.isDirectory() || entry.isSymbolicLink())
      throw new Error('旧账号目录异常，已停止清理，请管理员检查。');
    const uploads = resolve(directory, entry.name, 'uploads');
    if (!existsSync(uploads)) return;
    if (lstatSync(uploads).isSymbolicLink())
      throw new Error('旧素材目录异常，已停止清理，请管理员检查。');
    const target = resolve(currentDirectory(entry.name), 'uploads');
    mkdirSync(target, { recursive: true, mode: 0o700 });
    readdirSync(uploads, { withFileTypes: true }).forEach((file) => {
      if (!file.isFile() || file.isSymbolicLink())
        throw new Error('旧素材文件异常，已停止清理，请管理员检查。');
      const destination = resolve(target, file.name);
      if (existsSync(destination))
        throw new Error('旧素材迁移遇到同名文件，已保留原文件，请管理员检查。');
      renameSync(resolve(uploads, file.name), destination);
    });
  });
}

/** The temporary directory is on the service's data disk, not a RAM-backed /run directory. */
function getTemporaryRoot(): string {
  if (!temporaryRoot) {
    const directory = resolve(process.cwd(), 'data', 'temporary');
    mkdirSync(directory, { recursive: true, mode: 0o700 });
    // Deployment is single-instance. Keep accepted originals, never revive old jobs/caches.
    readdirSync(directory)
      .filter((name) => /^session-[a-zA-Z0-9]+$/.test(name))
      .forEach((name) => {
        const previous = resolve(directory, name);
        if (lstatSync(previous).isSymbolicLink())
          throw new Error('旧工作室目录异常，已停止清理。');
        preserveUploads(previous);
        rmSync(previous, { recursive: true, force: true });
      });
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
/** Retain account originals/current drafts; processing and exports keep their disposable process scope. */
export function workspaceDirectory(...parts: Array<string>): string {
  const id = getWorkspace().id;
  const base = resolve(process.cwd(), 'data');
  const temporary = TEMPORARY_MEDIA ? getTemporaryRoot() : null;
  const retained = parts[0] === 'uploads' || parts[0] === 'drafts';
  const root = temporary
    ? retained
      ? currentDirectory(id)
      : resolve(temporary, id)
    : id === 'legacy'
      ? base
      : resolve(base, 'workspaces', id);
  const directory = resolve(root, ...parts);
  mkdirSync(directory, { recursive: true, mode: 0o700 });
  return directory;
}

/** Quota includes durable originals and temporary work; the two roots never overlap in public mode. */
export function workspaceStorageDirectories(): Array<string> {
  const directories = [workspaceDirectory()];
  if (TEMPORARY_MEDIA) directories.push(currentDirectory(getWorkspace().id));
  return directories;
}

/** Cleanup visits only known stable account directories, never a whole-disk or mtime scan. */
export function retainedWorkspaceIds(): Array<string> {
  const root = resolve(process.cwd(), 'data', 'current');
  if (!existsSync(root)) return [];
  return readdirSync(root, { withFileTypes: true })
    .filter(
      (entry) =>
        entry.isDirectory() && /^(legacy|[a-f0-9-]{36})$/.test(entry.name),
    )
    .map((entry) => entry.name);
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
