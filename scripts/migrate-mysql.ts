/** Administrator-only, repeatable import from private auth JSON and current draft snapshots. */
import { randomBytes, scryptSync } from 'node:crypto';
import { existsSync, lstatSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { PoolConnection, RowDataPacket } from 'mysql2/promise';
import { z } from 'zod';

import {
  DraftKind,
  projectDraftSchema,
} from '../src/services/definition/project';
import { videoEditDraftSchema } from '../src/services/definition/video-edit';
import { currentDraftSchema } from '../src/services/definition/current-draft';
import {
  closeDatabase,
  executeStatement,
  queryRows,
  verifyDatabase,
  withTransaction,
} from '../server/db/database';

const accountSchema = z.object({
  username: z.string().min(1).max(64),
  workspaceId: z.union([z.literal('legacy'), z.uuid()]).default('legacy'),
  salt: z.string().regex(/^[a-f0-9]{32}$/),
  passwordHash: z.string().regex(/^[a-f0-9]{128}$/),
});
type SourceAccount = z.infer<typeof accountSchema>;
interface AccountRow extends RowDataPacket {
  id: number;
  workspaceId: string;
  username: string;
  salt: string;
  passwordHash: string;
  isEnabled: number;
  isvoid: number;
}
interface DraftRow extends RowDataPacket {
  revision: string;
  projectText: string | null;
}

function readPrivateJson(path: string): unknown {
  const file = lstatSync(path);
  if (
    !file.isFile() ||
    file.isSymbolicLink() ||
    file.mode & 0o007 ||
    file.size > 3 * 1024 * 1024
  )
    throw new Error('私有源文件类型、权限或大小不符合要求。');
  return JSON.parse(readFileSync(path, 'utf8'));
}

function sourceAccounts(input: string): Array<SourceAccount> {
  if (input === '--local-legacy') {
    const salt = randomBytes(16).toString('hex');
    return [
      {
        username: 'local-disabled',
        workspaceId: 'legacy',
        salt,
        passwordHash: scryptSync(randomBytes(64), salt, 64).toString('hex'),
      },
    ];
  }
  const source = z
    .union([
      accountSchema,
      z.object({ accounts: z.array(accountSchema).min(1).max(20) }),
    ])
    .parse(readPrivateJson(input));
  const accounts = 'accounts' in source ? source.accounts : [source];
  if (
    new Set(accounts.map((account) => account.username)).size !==
      accounts.length ||
    new Set(accounts.map((account) => account.workspaceId)).size !==
      accounts.length
  )
    throw new Error('私有账号配置中有重复的账号或工作室标识。');
  return accounts;
}

function sourceDraft(workspaceId: string, kind: DraftKind) {
  const root = resolve(process.cwd(), 'data');
  const base =
    process.env.STUDIO_TEMPORARY_MEDIA === '1'
      ? resolve(root, 'current', workspaceId)
      : workspaceId === 'legacy'
        ? root
        : resolve(root, 'workspaces', workspaceId);
  const path = resolve(base, 'drafts', `${kind}.json`);
  if (!existsSync(path)) return null;
  const raw = readPrivateJson(path);
  return kind === DraftKind.Photo
    ? currentDraftSchema(projectDraftSchema).parse(raw)
    : currentDraftSchema(videoEditDraftSchema).parse(raw);
}

function importAccount(
  account: SourceAccount,
  disabled: boolean,
  connection: PoolConnection,
): Promise<number> {
  return queryRows<AccountRow>(
    'SELECT id, workspace_id AS workspaceId, username, salt, password_hash AS passwordHash, is_enabled AS isEnabled, isvoid FROM studio_account WHERE workspace_id = ? OR username = ? LIMIT 2 FOR UPDATE',
    [account.workspaceId, account.username],
    connection,
  ).then((rows) => {
    if (!rows.length)
      return executeStatement(
        'INSERT INTO studio_account (workspace_id, username, salt, password_hash, is_enabled) VALUES (?, ?, ?, ?, ?)',
        [
          account.workspaceId,
          account.username,
          account.salt,
          account.passwordHash,
          disabled ? 0 : 1,
        ],
        connection,
      ).then((result) => result.insertId);
    if (
      rows.length !== 1 ||
      rows[0].workspaceId !== account.workspaceId ||
      rows[0].username !== account.username ||
      (!disabled &&
        (rows[0].salt !== account.salt ||
          rows[0].passwordHash !== account.passwordHash)) ||
      rows[0].isEnabled !== (disabled ? 0 : 1) ||
      rows[0].isvoid !== 0
    )
      throw new Error('数据库账号与迁移源冲突，已停止导入。');
    return rows[0].id;
  });
}

function importDraft(
  accountId: number,
  kind: DraftKind,
  source: ReturnType<typeof sourceDraft>,
  connection: PoolConnection,
): Promise<void> {
  if (!source?.project) return Promise.resolve();
  const projectText = JSON.stringify(source.project);
  return queryRows<DraftRow>(
    'SELECT project_text AS projectText, revision FROM studio_current_draft WHERE account_id = ? AND draft_kind = ? LIMIT 1 FOR UPDATE',
    [accountId, kind],
    connection,
  ).then((rows) => {
    if (!rows.length)
      return executeStatement(
        'INSERT INTO studio_current_draft (account_id, draft_kind, project_text, revision) VALUES (?, ?, ?, ?)',
        [accountId, kind, projectText, source.revision!],
        connection,
      ).then(() => undefined);
    if (
      rows[0].revision !== source.revision ||
      rows[0].projectText !== projectText
    )
      throw new Error('数据库草稿与迁移源冲突，已保留已有记录。');
  });
}

const input = process.argv[2];
const apply = process.argv[3] === '--apply';
if (!input || (process.argv[3] && !apply)) {
  console.error(
    '用法：STUDIO_DB_CONFIG=私有配置 node --import tsx scripts/migrate-mysql.ts <auth.json|--local-legacy> [--apply]',
  );
  process.exitCode = 1;
} else {
  Promise.resolve()
    .then(() => sourceAccounts(input))
    .then((accounts) =>
      accounts.map((account) => ({
        account,
        photo: sourceDraft(account.workspaceId, DraftKind.Photo),
        video: sourceDraft(account.workspaceId, DraftKind.Video),
      })),
    )
    .then((records) => verifyDatabase().then(() => records))
    .then((records) => {
      if (!apply) {
        console.info(
          `只读检查完成：${records.length} 个账号，${records.reduce((n, record) => n + Number(Boolean(record.photo?.project)) + Number(Boolean(record.video?.project)), 0)} 份草稿。增加 --apply 后导入。`,
        );
        return;
      }
      return records
        .reduce<Promise<void>>(
          (chain, record) =>
            chain.then(() =>
              withTransaction((connection) =>
                importAccount(
                  record.account,
                  input === '--local-legacy',
                  connection,
                ).then((accountId) =>
                  importDraft(
                    accountId,
                    DraftKind.Photo,
                    record.photo,
                    connection,
                  ).then(() =>
                    importDraft(
                      accountId,
                      DraftKind.Video,
                      record.video,
                      connection,
                    ),
                  ),
                ),
              ),
            ),
          Promise.resolve(),
        )
        .then(() =>
          console.info(
            `导入核对完成：${records.length} 个账号。源文件未删除。`,
          ),
        );
    })
    .catch(() => {
      console.error(
        'MySQL 导入失败：请核对私有配置、表结构及是否存在冲突；源文件未修改。',
      );
      process.exitCode = 1;
    })
    .finally(() => closeDatabase());
}
