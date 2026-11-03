/** Administrator-only account changes; restart the studio after each successful change. */
import { randomBytes, randomUUID, scryptSync } from 'node:crypto';
import { lstatSync, readFileSync } from 'node:fs';
import type { RowDataPacket } from 'mysql2/promise';
import { z } from 'zod';

import { loginInputSchema } from '../src/services/definition/auth';
import {
  closeDatabase,
  executeStatement,
  queryRows,
  verifyDatabase,
  withTransaction,
} from '../server/database';

const identitySchema = z.object({ username: z.string().min(1).max(64) });
interface CountRow extends RowDataPacket {
  accountCount: number;
}

function readInput(path: string) {
  const file = lstatSync(path);
  if (
    !file.isFile() ||
    file.isSymbolicLink() ||
    file.mode & 0o007 ||
    file.size > 4096
  )
    throw new Error('私有输入文件不安全。');
  return JSON.parse(readFileSync(path, 'utf8')) as unknown;
}

const [action, path] = process.argv.slice(2);
if (!['add', 'disable', 'enable', 'password'].includes(action ?? '') || !path) {
  console.error(
    '用法：STUDIO_DB_CONFIG=私有配置 node --import tsx scripts/manage-mysql-account.ts <add|disable|enable|password> <私有输入JSON>',
  );
  process.exitCode = 1;
} else {
  Promise.resolve()
    .then(() =>
      action === 'add' || action === 'password'
        ? loginInputSchema.parse(readInput(path))
        : identitySchema.parse(readInput(path)),
    )
    .then((input) => verifyDatabase().then(() => input))
    .then((input) => {
      if (action === 'add') {
        const account = loginInputSchema.parse(input);
        const salt = randomBytes(16).toString('hex');
        const hash = scryptSync(account.password, salt, 64).toString('hex');
        return withTransaction((connection) =>
          queryRows<CountRow>(
            'SELECT COUNT(*) AS accountCount FROM studio_account WHERE isvoid = 0',
            [],
            connection,
          ).then((rows) => {
            if (rows[0].accountCount >= 20)
              throw new Error('账号数量已达上限。');
            return executeStatement(
              'INSERT INTO studio_account (workspace_id, username, salt, password_hash) VALUES (?, ?, ?, ?)',
              [randomUUID(), account.username, salt, hash],
              connection,
            );
          }),
        ).then(() => undefined);
      }
      const { username } = identitySchema.parse(input);
      if (action === 'password') {
        const password = loginInputSchema.parse(input).password;
        const salt = randomBytes(16).toString('hex');
        const hash = scryptSync(password, salt, 64).toString('hex');
        return executeStatement(
          'UPDATE studio_account SET salt = ?, password_hash = ? WHERE username = ? AND isvoid = 0',
          [salt, hash, username],
        ).then((result) => {
          if (result.affectedRows !== 1) throw new Error('账号不存在。');
        });
      }
      return executeStatement(
        'UPDATE studio_account SET is_enabled = ? WHERE username = ? AND isvoid = 0',
        [action === 'enable' ? 1 : 0, username],
      ).then((result) => {
        if (result.affectedRows !== 1) throw new Error('账号不存在。');
      });
    })
    .then(() =>
      console.info(
        '账号变更完成。请重启工作室，使会话指纹与账号状态重新加载。',
      ),
    )
    .catch(() => {
      console.error(
        '账号变更失败：请检查私有输入、数据库与账号状态；不输出账号或密码。',
      );
      process.exitCode = 1;
    })
    .finally(() => closeDatabase());
}
