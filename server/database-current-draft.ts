/** MySQL owns one metadata snapshot per account/mode; original media stays on disk. */
import { randomUUID } from 'node:crypto';
import {
  existsSync,
  readFileSync,
  renameSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { basename, resolve } from 'node:path';
import type { PoolConnection, RowDataPacket } from 'mysql2/promise';
import { z } from 'zod';

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
import { getAccountId } from './account-repository';
import { executeStatement, queryRows, withTransaction } from './database';
import { HttpError, resolveAsset, retainDraftAsset } from './media';
import {
  findWorkspace,
  getWorkspace,
  holdWorkspace,
  registerWorkspace,
  retainedWorkspaceIds,
  runInWorkspace,
  workspaceDirectory,
  workspaceState,
} from './workspace';

const MEDIA_PATH = /^\/media\/[\w-]+\.(jpg|jpeg|png|webp|wav|mp3|m4a|ogg|mp4)$/;
const discardedSchema = z.array(z.string().regex(MEDIA_PATH));
interface DraftRow extends RowDataPacket {
  projectText: string | null;
  revision: string;
}
const selectDraft =
  'SELECT project_text AS projectText, revision FROM studio_current_draft WHERE account_id = ? AND draft_kind = ? AND isvoid = 0 LIMIT 1';
const draftMutation = () =>
  workspaceState('database-draft-mutation', () => ({ epoch: 0 }));

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

function parseDraft<T>(row: DraftRow | undefined, schema: z.ZodType<T>) {
  if (!row) return { project: null, revision: null };
  try {
    return currentDraftSchema(schema).parse({
      project: row.projectText === null ? null : JSON.parse(row.projectText),
      revision: row.revision,
    });
  } catch {
    throw new HttpError(
      500,
      '当前草稿数据无法读取，已保留数据库记录，请联系管理员检查。',
    );
  }
}

function discardedPath() {
  return resolve(workspaceDirectory('drafts'), 'discarded.json');
}

function readDiscarded(): Array<string> {
  const path = discardedPath();
  if (!existsSync(path)) return [];
  try {
    return discardedSchema.parse(JSON.parse(readFileSync(path, 'utf8')));
  } catch {
    throw new HttpError(500, '旧素材清理记录无法读取，已保留原文件。');
  }
}

function writeDiscarded(paths: Array<string>) {
  const path = discardedPath();
  const temp = `${path}.${randomUUID()}.tmp`;
  try {
    writeFileSync(temp, JSON.stringify(paths), { flag: 'wx', mode: 0o600 });
    renameSync(temp, path);
    draftMutation().epoch += 1;
  } finally {
    rmSync(temp, { force: true });
  }
}

function databaseFailure(error: unknown): never {
  if (error instanceof HttpError) throw error;
  console.error('[database:draft] 操作失败，已保留原草稿。');
  throw new HttpError(503, '草稿数据库暂不可用，请保留当前页面并稍后重试。');
}

export function getDatabaseCurrentDraft<T>(
  kind: DraftKind,
  schema: z.ZodType<T>,
) {
  const workspaceId = getWorkspace().id;
  return getAccountId(workspaceId)
    .then((accountId) => queryRows<DraftRow>(selectDraft, [accountId, kind]))
    .then((rows) => parseDraft(rows[0], schema))
    .catch(databaseFailure);
}

export function saveDatabaseCurrentDraft<T>(
  kind: DraftKind,
  schema: z.ZodType<T>,
  input: unknown,
) {
  const { project, revision } = saveDraftSchema(schema).parse(input);
  const workspaceId = getWorkspace().id;
  const paths = references(project);
  paths.forEach((path) => resolveAsset(path));
  const saved = savedDraftSchema(schema).parse({
    project,
    revision: randomUUID(),
  });
  const release = holdWorkspace();
  return getAccountId(workspaceId)
    .then((accountId) =>
      withTransaction((connection: PoolConnection) =>
        queryRows<DraftRow>(
          `${selectDraft} FOR UPDATE`,
          [accountId, kind],
          connection,
        ).then((rows) => {
          const previous = parseDraft(rows[0], schema);
          if (previous.revision !== revision)
            throw new HttpError(
              409,
              '草稿已在其他页面更新，请刷新查看最新草稿后再编辑。当前修改尚未保存。',
            );
          // Prepared legacy clips must survive process restart once the draft adopts them.
          paths.forEach(retainDraftAsset);
          const discarded = new Set(readDiscarded());
          references(previous.project).forEach((path) => {
            if (!paths.has(path)) discarded.add(path);
          });
          // Publish deletion intent before the database commit; cleanup always checks committed references.
          if (discarded.size) writeDiscarded([...discarded]);
          const text = JSON.stringify(saved.project);
          return rows.length
            ? executeStatement(
                'UPDATE studio_current_draft SET project_text = ?, revision = ? WHERE account_id = ? AND draft_kind = ? AND revision = ? AND isvoid = 0',
                [text, saved.revision, accountId, kind, revision],
                connection,
              ).then((result) => {
                if (result.affectedRows !== 1)
                  throw new HttpError(
                    409,
                    '草稿已在其他页面更新，请刷新后重试。',
                  );
              })
            : executeStatement(
                'INSERT INTO studio_current_draft (account_id, draft_kind, project_text, revision) VALUES (?, ?, ?, ?)',
                [accountId, kind, text, saved.revision],
                connection,
              ).then(() => undefined);
        }),
      ),
    )
    .then(() => {
      draftMutation().epoch += 1;
      return saved;
    })
    .catch((error: unknown) => {
      if (
        error instanceof Error &&
        'code' in error &&
        error.code === 'ER_DUP_ENTRY'
      )
        throw new HttpError(409, '草稿已在其他页面更新，请刷新后重试。');
      return databaseFailure(error);
    })
    .finally(release);
}

export function cleanupDatabaseDiscardedMedia(): Promise<void> {
  if (getWorkspace().active) return Promise.resolve();
  const epoch = draftMutation().epoch;
  const discarded = readDiscarded();
  if (!discarded.length) return Promise.resolve();
  return Promise.all([
    getDatabaseCurrentDraft(DraftKind.Photo, projectDraftSchema),
    getDatabaseCurrentDraft(DraftKind.Video, videoEditDraftSchema),
  ]).then(([photo, video]) => {
    if (getWorkspace().active || draftMutation().epoch !== epoch) return;
    const retained = references([photo.project, video.project]);
    discarded.forEach((path) => {
      if (!retained.has(path))
        rmSync(resolve(workspaceDirectory('uploads'), basename(path)), {
          force: true,
        });
    });
    rmSync(discardedPath(), { force: true });
  });
}

export function startDatabaseDraftCleanup() {
  const timer = setInterval(() => {
    retainedWorkspaceIds()
      .reduce<Promise<void>>(
        (chain, id) =>
          chain.then(() => {
            const workspace = findWorkspace(id) ?? registerWorkspace(id);
            return runInWorkspace(workspace, cleanupDatabaseDiscardedMedia);
          }),
        Promise.resolve(),
      )
      .catch(() => {
        console.error(
          '[current-draft:cleanup] MySQL 或旧素材清理失败，将在下次检查时重试。',
        );
      });
  }, 60_000);
  timer.unref();
}
