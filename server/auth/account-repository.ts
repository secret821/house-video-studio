/** Stable workspace IDs and existing scrypt hashes are imported without changing passwords. */
import type { RowDataPacket } from 'mysql2/promise';
import { z } from 'zod';
import { queryRows } from '../db/database';

const accountSchema = z.object({
  id: z.number().int().positive(),
  workspaceId: z.union([z.literal('legacy'), z.uuid()]),
  username: z.string().min(1).max(64),
  salt: z.string().regex(/^[a-f0-9]{32}$/),
  passwordHash: z.string().regex(/^[a-f0-9]{128}$/),
});
export type DatabaseAccount = z.infer<typeof accountSchema>;
interface AccountRow extends RowDataPacket {
  id: number;
  workspaceId: string;
  username: string;
  salt: string;
  passwordHash: string;
}
interface AccountIdRow extends RowDataPacket {
  id: number;
}

export function loadActiveAccounts(): Promise<Array<DatabaseAccount>> {
  return queryRows<AccountRow>(
    'SELECT id, workspace_id AS workspaceId, username, salt, password_hash AS passwordHash FROM studio_account WHERE isvoid = 0 AND is_enabled = 1 ORDER BY id LIMIT 21',
  ).then((rows) => {
    if (rows.length > 20)
      throw new Error('MySQL 中有效账号超过现有服务的20账号上限。');
    return rows.map((row) => accountSchema.parse(row));
  });
}

export function getAccountId(workspaceId: string): Promise<number> {
  return queryRows<AccountIdRow>(
    'SELECT id FROM studio_account WHERE workspace_id = ? AND isvoid = 0 LIMIT 1',
    [workspaceId],
  ).then((rows) => {
    if (rows.length !== 1)
      throw new Error('当前工作室账号不存在，请联系管理员。');
    return z.number().int().positive().parse(rows[0].id);
  });
}
