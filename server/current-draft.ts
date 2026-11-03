/** One atomic JSON snapshot per account/mode; saving never reads or copies video bytes. */
import {
  existsSync,
  readFileSync,
  renameSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { resolve, basename } from 'node:path';
import { z } from 'zod';
import { randomUUID } from 'node:crypto';

import {
  DraftKind,
  projectDraftSchema,
} from '../src/services/definition/project';
import { videoEditDraftSchema } from '../src/services/definition/video-edit';
import {
  currentDraftSchema,
  saveDraftSchema,
  savedDraftSchema,
} from '../src/services/definition/current-draft';
import { HttpError, resolveAsset, retainDraftAsset } from './media';
import { reserveStorage } from './storage-capacity';
import {
  findWorkspace,
  getWorkspace,
  registerWorkspace,
  retainedWorkspaceIds,
  runInWorkspace,
  workspaceDirectory,
} from './workspace';

const MEDIA_PATH = /^\/media\/[\w-]+\.(jpg|jpeg|png|webp|wav|mp3|m4a|ogg|mp4)$/;
const discardedSchema = z.array(z.string().regex(MEDIA_PATH));

function references(project: unknown): Set<string> {
  const paths = new Set<string>();
  JSON.stringify(project, (key, value: unknown) => {
    if (
      ['src', 'photo', 'poster', 'coverImage'].includes(key) &&
      typeof value === 'string' &&
      MEDIA_PATH.test(value)
    )
      paths.add(value);
    return value;
  });
  return paths;
}

function readJson<T>(path: string, schema: z.ZodType<T>): T | null {
  if (!existsSync(path)) return null;
  try {
    return schema.parse(JSON.parse(readFileSync(path, 'utf8')));
  } catch {
    throw new HttpError(
      500,
      '当前草稿文件无法读取，已保留原文件，请联系管理员检查。',
    );
  }
}

function writeJson(path: string, value: unknown) {
  const temporary = path + '.tmp';
  try {
    writeFileSync(temporary, JSON.stringify(value), { mode: 0o600 });
    renameSync(temporary, path);
  } finally {
    rmSync(temporary, { force: true });
  }
}

export function getCurrentDraft<T>(kind: DraftKind, schema: z.ZodType<T>) {
  return (
    readJson(
      resolve(workspaceDirectory('drafts'), `${kind}.json`),
      currentDraftSchema(schema),
    ) ?? { project: null, revision: null }
  );
}

/** A durable deletion list waits for renders, queued work and media streams before reclaiming old references. */
export function cleanupDiscardedDraftMedia() {
  if (getWorkspace().active) return;
  const directory = workspaceDirectory('drafts');
  const garbagePath = resolve(directory, 'discarded.json');
  const discarded = readJson(garbagePath, discardedSchema);
  if (!discarded?.length) return;
  const retained = references([
    getCurrentDraft(DraftKind.Photo, projectDraftSchema),
    getCurrentDraft(DraftKind.Video, videoEditDraftSchema),
  ]);
  discarded.forEach((path) => {
    if (!retained.has(path))
      rmSync(resolve(workspaceDirectory('uploads'), basename(path)), {
        force: true,
      });
  });
  rmSync(garbagePath, { force: true });
}

export function saveCurrentDraft<T>(
  kind: DraftKind,
  schema: z.ZodType<T>,
  input: unknown,
) {
  const { project, revision } = saveDraftSchema(schema).parse(input);
  const previous = getCurrentDraft(kind, schema);
  if (previous.revision !== revision)
    throw new HttpError(
      409,
      '草稿已在其他页面更新，请刷新查看最新草稿后再编辑。当前修改尚未保存。',
    );
  const paths = references(project);
  // Ownership remains enforced by the current workspace, never a client-supplied account path.
  paths.forEach((path) => resolveAsset(path));
  const directory = workspaceDirectory('drafts');
  const discardedPath = resolve(directory, 'discarded.json');
  const discarded = new Set(readJson(discardedPath, discardedSchema) ?? []);
  references(previous.project).forEach((path) => {
    if (!paths.has(path)) discarded.add(path);
  });
  const saved = savedDraftSchema(schema).parse({
    project,
    revision: randomUUID(),
  });
  const release = reserveStorage(
    (Buffer.byteLength(JSON.stringify(saved)) +
      Buffer.byteLength(JSON.stringify([...discarded]))) *
      2,
  );
  try {
    paths.forEach(retainDraftAsset);
    // Record deletion intent first. Cleanup always rechecks both committed projects after publication.
    if (discarded.size) writeJson(discardedPath, [...discarded]);
    writeJson(resolve(directory, `${kind}.json`), saved);
  } finally {
    release();
  }
  return saved;
}

/** Only known stable account directories are visited; no historical media/mtime sweep is performed. */
export function cleanupCurrentDrafts() {
  retainedWorkspaceIds().forEach((id) => {
    const workspace = findWorkspace(id) ?? registerWorkspace(id);
    if (!workspace.active)
      runInWorkspace(workspace, cleanupDiscardedDraftMedia);
  });
}

export function startCurrentDraftCleanup() {
  const timer = setInterval(() => {
    try {
      cleanupCurrentDrafts();
    } catch {
      console.error(
        '[current-draft:cleanup] 当前草稿旧引用清理失败，将在下次检查时重试。',
      );
    }
  }, 60_000);
  timer.unref();
}
