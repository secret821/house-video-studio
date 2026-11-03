/** Private MySQL connection for account and current-draft metadata only. */
import { lstatSync, readFileSync, realpathSync } from 'node:fs';
import { resolve, sep } from 'node:path';
import mysql from 'mysql2/promise';
import type {
  Pool,
  PoolConnection,
  ResultSetHeader,
  RowDataPacket,
} from 'mysql2/promise';
import { z } from 'zod';

const configSchema = z.object({
  host: z.string().min(1),
  port: z.number().int().min(1).max(65535),
  database: z.string().regex(/^[a-z][a-z0-9_]*$/),
  user: z.string().min(1),
  password: z.string(),
});

let pool: Pool | null = null;

export function databaseEnabled() {
  return Boolean(process.env.STUDIO_DB_CONFIG);
}

function readConfig() {
  const path = process.env.STUDIO_DB_CONFIG;
  if (!path) throw new Error('未配置 STUDIO_DB_CONFIG。');
  try {
    const file = lstatSync(path);
    if (
      !file.isFile() ||
      file.isSymbolicLink() ||
      file.mode & 0o007 ||
      file.size > 4096
    )
      throw new Error('unsafe database configuration');
    const actual = realpathSync(path);
    for (const directory of ['public', 'data']) {
      const exposed = resolve(process.cwd(), directory);
      if (actual === exposed || actual.startsWith(`${exposed}${sep}`))
        throw new Error('database configuration in business or public data');
    }
    return configSchema.parse(JSON.parse(readFileSync(path, 'utf8')));
  } catch {
    throw new Error('无法读取安全的 MySQL 私有配置，请检查 STUDIO_DB_CONFIG。');
  }
}

export function getDbPool(): Pool {
  if (pool) return pool;
  const config = readConfig();
  pool = mysql.createPool({
    ...config,
    charset: 'utf8mb4',
    connectionLimit: 4,
    waitForConnections: true,
    queueLimit: 32,
    connectTimeout: 5000,
    enableKeepAlive: true,
  });
  return pool;
}

type Executor = Pool | PoolConnection;

export function queryRows<T extends RowDataPacket>(
  sql: string,
  values: Array<string | number | null> = [],
  executor: Executor = getDbPool(),
): Promise<Array<T>> {
  return executor.execute<Array<T>>(sql, values).then(([rows]) => rows);
}

export function executeStatement(
  sql: string,
  values: Array<string | number | null> = [],
  executor: Executor = getDbPool(),
): Promise<ResultSetHeader> {
  return executor
    .execute<ResultSetHeader>(sql, values)
    .then(([result]) => result);
}

export function withTransaction<T>(
  action: (connection: PoolConnection) => Promise<T>,
): Promise<T> {
  return getDbPool()
    .getConnection()
    .then((connection) =>
      connection
        .beginTransaction()
        .then(() => action(connection))
        .then((value) => connection.commit().then(() => value))
        .catch((error: unknown) =>
          connection.rollback().then(() => {
            throw error;
          }),
        )
        .finally(() => connection.release()),
    );
}

export function verifyDatabase(): Promise<void> {
  return queryRows<RowDataPacket>(
    'SELECT id, workspace_id, username, salt, password_hash, is_enabled, isvoid FROM studio_account LIMIT 0',
  )
    .then(() =>
      queryRows<RowDataPacket>(
        'SELECT id, account_id, draft_kind, project_text, revision, isvoid FROM studio_current_draft LIMIT 0',
      ),
    )
    .then(() => undefined);
}

export function closeDatabase(): Promise<void> {
  if (!pool) return Promise.resolve();
  const current = pool;
  pool = null;
  return current.end();
}
