/** Bounded revocable login records, separate from temporary business media and read-only account configuration. */
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import {
  closeSync,
  existsSync,
  fsyncSync,
  lstatSync,
  mkdirSync,
  openSync,
  readFileSync,
  renameSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs';
import { dirname } from 'node:path';
import { z } from 'zod';

export const SESSION_SECONDS = 7 * 24 * 60 * 60;
const MAX_SESSIONS = 32;
interface Account {
  username: string;
  workspaceId: string;
  salt: string;
  passwordHash: string;
}
const recordSchema = z.object({
  key: z.string().regex(/^[a-f0-9]{64}$/),
  expires: z.number().int().positive(),
  username: z.string().min(1).max(64),
  workspaceId: z.union([z.literal('legacy'), z.string().uuid()]),
  credentialVersion: z.string().regex(/^[a-f0-9]{64}$/),
});
const storeSchema = z.object({
  version: z.literal(1),
  sessions: z.array(recordSchema).max(20 * MAX_SESSIONS),
});
type Session = z.infer<typeof recordSchema>;

/** Account edits revoke old sessions without exposing password material in the session file. */
function accountVersion(account: Account) {
  return createHash('sha256')
    .update(
      JSON.stringify([
        account.username,
        account.workspaceId,
        account.salt,
        account.passwordHash,
      ]),
    )
    .digest('hex');
}

export function createSessionStore(options: {
  accounts: Array<Account>;
  path?: string;
  now: () => number;
}) {
  const { accounts, path, now } = options;
  let sessions = new Map<string, Session>();
  if (path) {
    try {
      mkdirSync(dirname(path), { recursive: true, mode: 0o700 });
      const directory = lstatSync(dirname(path));
      if (!directory.isDirectory() || directory.mode & 0o077)
        throw new Error('Session directory must be private');
      if (existsSync(path)) {
        const file = lstatSync(path);
        if (!file.isFile() || file.mode & 0o077 || file.size > 512 * 1024)
          throw new Error('Unsafe session file');
        const stored = storeSchema.parse(
          JSON.parse(readFileSync(path, 'utf8')),
        );
        for (const session of stored.sessions) {
          const account = accounts.find(
            (candidate) =>
              candidate.workspaceId === session.workspaceId &&
              candidate.username === session.username,
          );
          if (
            session.expires > now() &&
            account &&
            accountVersion(account) === session.credentialVersion
          )
            sessions.set(session.key, session);
        }
        for (const account of accounts) {
          const own = [...sessions.values()].filter(
            (session) => session.workspaceId === account.workspaceId,
          );
          own
            .slice(0, Math.max(0, own.length - MAX_SESSIONS))
            .forEach((session) => sessions.delete(session.key));
        }
      }
    } catch {
      throw new Error(
        '无法读取安全的登录状态文件，请检查STUDIO_SESSION_STORE及私有目录权限。',
      );
    }
  }

  /** Publish disk state before acknowledging a login or sign-out; failed writes never claim success. */
  function commit(next: Map<string, Session>) {
    if (path) {
      const part = `${path}.${randomUUID()}.tmp`;
      try {
        if (existsSync(path)) {
          const file = lstatSync(path);
          if (!file.isFile() || file.mode & 0o077)
            throw new Error('Unsafe session file');
        }
        const descriptor = openSync(part, 'wx', 0o600);
        try {
          writeFileSync(
            descriptor,
            JSON.stringify({ version: 1, sessions: [...next.values()] }),
          );
          fsyncSync(descriptor);
        } finally {
          closeSync(descriptor);
        }
        renameSync(part, path);
        if (process.platform === 'linux') {
          const directory = openSync(dirname(path), 'r');
          try {
            fsyncSync(directory);
          } finally {
            closeSync(directory);
          }
        }
      } finally {
        if (existsSync(part)) unlinkSync(part);
      }
    }
    sessions = next;
  }
  if (path) commit(sessions);

  function revoke(key: string) {
    if (!sessions.has(key)) return;
    const next = new Map(sessions);
    next.delete(key);
    commit(next);
  }
  return {
    get(key: string): Session | undefined {
      const session = sessions.get(key);
      if (session && session.expires > now()) return session;
      revoke(key);
      return undefined;
    },
    revoke,
    create(account: Account, previous: string | null) {
      const next = new Map(sessions);
      if (previous) next.delete(previous);
      for (const [key, session] of next)
        if (session.expires <= now()) next.delete(key);
      const own = [...next.values()].filter(
        (session) => session.workspaceId === account.workspaceId,
      );
      if (own.length >= MAX_SESSIONS) next.delete(own[0].key);
      const token = randomBytes(32).toString('base64url');
      const key = createHash('sha256').update(token).digest('hex');
      next.set(key, {
        key,
        expires: now() + SESSION_SECONDS * 1000,
        username: account.username,
        workspaceId: account.workspaceId,
        credentialVersion: accountVersion(account),
      });
      commit(next);
      return token;
    },
  };
}
