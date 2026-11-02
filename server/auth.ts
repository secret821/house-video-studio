/** Account-scoped workspaces, salted password verification and revocable seven-day sessions. */
import { createHash, scrypt, timingSafeEqual } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { promisify } from 'node:util';
import {
  json,
  type Express,
  type Request,
  type Response,
  type NextFunction,
} from 'express';
import { z } from 'zod';

import {
  getLoginDestination,
  loginInputSchema,
  logoutInputSchema,
} from '../src/services/definition/auth';

import {
  registerWorkspace,
  runInWorkspace,
  findWorkspace,
  holdWorkspace,
  TEMPORARY_MEDIA,
  MEDIA_RETENTION_MS,
} from './workspace';

import { createSessionStore, SESSION_SECONDS } from './auth-sessions';

const COOKIE = 'house_studio_session';
const LOGIN_WINDOW_MS = 60 * 1000;
const LOGIN_ATTEMPTS = 10;
const deriveKey = promisify(scrypt);
const credentialsSchema = z.object({
  username: z.string().min(1).max(64),
  workspaceId: z
    .union([z.literal('legacy'), z.string().uuid()])
    .default('legacy'),
  salt: z.string().regex(/^[a-f0-9]{32}$/),
  passwordHash: z.string().regex(/^[a-f0-9]{128}$/),
});
type Credentials = z.input<typeof credentialsSchema>;
const accountConfigSchema = z
  .object({ accounts: z.array(credentialsSchema).min(1).max(20) })
  .superRefine(({ accounts }, ctx) => {
    if (
      new Set(accounts.map((a) => a.username)).size !== accounts.length ||
      new Set(accounts.map((a) => a.workspaceId)).size !== accounts.length
    )
      ctx.addIssue({ code: 'custom', message: '账号或工作室标识重复。' });
  });
type AuthConfig = Credentials | z.infer<typeof accountConfigSchema>;
export enum AuthAuditKind {
  LogoutRejected = 'logout-rejected',
  LogoutConfirmed = 'logout-confirmed',
  SessionUnavailable = 'session-unavailable',
}
/** Diagnostic categories contain no Cookie, session digest, password, account name or raw request content. */
export interface AuthAudit {
  kind: AuthAuditKind;
  processId: number;
  cookiePresent: boolean;
  cookieFormatValid: boolean;
  sessionAvailable: boolean;
  browser: 'ios-safari' | 'android' | 'other';
  surface: 'editor' | 'page' | 'logout';
}

/** A public server must never start without its private authentication configuration. */
export function loadAuthCredentials(path?: string, publicOrigin?: string) {
  if (!path) {
    if (publicOrigin) throw new Error('公网服务必须配置STUDIO_AUTH_CONFIG。');
    return null;
  }
  try {
    const raw: unknown = JSON.parse(readFileSync(path, 'utf8'));
    return z.union([credentialsSchema, accountConfigSchema]).parse(raw);
  } catch {
    throw new Error('无法读取有效的工作室登录配置，请检查私有配置文件。');
  }
}

export function installWorkspaceAuth(
  app: Express,
  options: {
    credentials: AuthConfig | null;
    publicOrigin?: string;
    port: number;
    now?: () => number;
    sessionStorePath?: string;
    onAudit?: (event: AuthAudit) => void;
  },
) {
  const { credentials, publicOrigin, port } = options;
  const now = options.now ?? Date.now;
  const accounts = credentials
    ? 'accounts' in credentials
      ? credentials.accounts
      : [credentialsSchema.parse(credentials)]
    : [];
  accounts.forEach((account) => registerWorkspace(account.workspaceId));
  const sessions = createSessionStore({
    accounts,
    path: credentials ? options.sessionStorePath : undefined,
    now,
  });
  const external = publicOrigin ? new URL(publicOrigin) : null;
  const secure = external?.protocol === 'https:';
  const loginAttempts = new Map<string, { start: number; count: number }>();
  const auditWindows = new Map<string, number>();

  function getSessionKey(req: Request) {
    const tokens = (req.headers.cookie ?? '')
      .split(';')
      .map((part) => part.trim())
      .filter((part) => part.startsWith(`${COOKIE}=`));
    if (tokens.length !== 1) return null;
    const token = tokens[0].slice(COOKIE.length + 1);
    if (!/^[A-Za-z0-9_-]{43}$/.test(token)) return null;
    return createHash('sha256').update(token).digest('hex');
  }
  function isAuthenticated(req: Request) {
    if (!credentials) return true;
    const key = getSessionKey(req);
    if (!key) return false;
    const session = sessions.get(key);
    if (session && session.expires > now()) return true;
    sessions.revoke(key);
    return false;
  }
  /** Rate-limit repeated anonymous failures by a finite set of categories, never by raw user input. */
  function auditAuth(
    kind: AuthAuditKind,
    req: Request,
    sessionAvailable: boolean,
  ) {
    const cookiePresent = (req.headers.cookie ?? '')
      .split(';')
      .some((part) => part.trim().startsWith(`${COOKIE}=`));
    const cookieFormatValid = getSessionKey(req) !== null;
    let surface: AuthAudit['surface'] = 'logout';
    if (kind === AuthAuditKind.SessionUnavailable)
      surface = req.path === '/api/auth/session' ? 'editor' : 'page';
    const bucket = `${kind}:${surface}:${cookiePresent}:${cookieFormatValid}`;
    if (kind !== AuthAuditKind.LogoutConfirmed || !sessionAvailable) {
      const previous = auditWindows.get(bucket);
      if (previous !== undefined && now() - previous < 30_000) return;
      auditWindows.set(bucket, now());
    }
    const agent = req.headers['user-agent'] ?? '';
    let browser: AuthAudit['browser'] = 'other';
    if (/iPhone|iPad/.test(agent) && /Safari/.test(agent))
      browser = 'ios-safari';
    else if (/Android/.test(agent)) browser = 'android';
    const event: AuthAudit = {
      kind,
      processId: process.pid,
      cookiePresent,
      cookieFormatValid,
      sessionAvailable,
      browser,
      surface,
    };
    if (options.onAudit) options.onAudit(event);
    else console.info('[auth-audit]', JSON.stringify(event));
  }
  function clearSession(req: Request, res: Response) {
    const key = getSessionKey(req);
    if (key) sessions.revoke(key);
    res.clearCookie(COOKIE, {
      httpOnly: true,
      sameSite: 'strict',
      secure,
      path: '/',
    });
  }
  /** A stale tab must not operate on an account selected by a later login in another tab. */
  function workspaceChanged(req: Request, workspaceId: string) {
    return (
      accounts.length > 1 && req.headers['x-studio-workspace'] !== workspaceId
    );
  }
  function checkAuthOrigin(req: Request, res: Response) {
    const expected = external?.origin ?? `http://127.0.0.1:${port}`;
    if (req.headers.origin === expected) return true;
    res.status(403).json({ message: '请从工作室登录页面操作。' });
    return false;
  }

  app.use((_req, res, next) => {
    res.setHeader('Cache-Control', 'private, no-store');
    next();
  });
  app.use(
    '/api/auth',
    json({ limit: '4kb' }),
    (error: unknown, _req: Request, res: Response, next: NextFunction) => {
      const parserError = z
        .object({ type: z.enum(['entity.parse.failed', 'entity.too.large']) })
        .safeParse(error);
      if (!parserError.success) return next(error);
      res.status(400).json({ message: '登录请求格式无效，请重新填写。' });
    },
  );
  app.get('/api/auth/session', (req, res) => {
    const authenticated = isAuthenticated(req);
    if (!authenticated && req.get('X-Studio-Session-Check') === 'editor')
      auditAuth(AuthAuditKind.SessionUnavailable, req, false);
    const session = sessions.get(getSessionKey(req) ?? '');
    const workspace = !credentials
      ? registerWorkspace('legacy')
      : session && registerWorkspace(session.workspaceId);
    res.json({
      enabled: Boolean(credentials),
      authenticated,
      temporaryMedia: TEMPORARY_MEDIA,
      mediaRetentionMs: MEDIA_RETENTION_MS,
      mediaSessionId: workspace?.mediaSessionId ?? null,
      username: sessions.get(getSessionKey(req) ?? '')?.username ?? null,
      workspaceId: sessions.get(getSessionKey(req) ?? '')?.workspaceId ?? null,
    });
  });
  app.post('/api/auth/login', (req, res, next) => {
    if (!checkAuthOrigin(req, res)) return;
    if (!credentials) return res.json({ authenticated: true });
    const input = loginInputSchema.safeParse(req.body);
    if (!input.success)
      return res.status(400).json({ message: '请填写有效的账号和密码。' });
    const account = accounts.find(
      (candidate) => candidate.username === input.data.username,
    );
    const bucket = account?.workspaceId ?? 'unknown';
    let attempts = loginAttempts.get(bucket);
    if (!attempts || now() - attempts.start >= LOGIN_WINDOW_MS) {
      attempts = { start: now(), count: 0 };
      loginAttempts.set(bucket, attempts);
    }
    if (attempts.count >= LOGIN_ATTEMPTS) {
      res.setHeader(
        'Retry-After',
        Math.ceil((LOGIN_WINDOW_MS - now() + attempts.start) / 1000),
      );
      return res
        .status(429)
        .json({ message: '登录尝试较多，请一分钟后再试。' });
    }
    attempts.count += 1;
    // Unknown names incur the same scrypt work without revealing the account list.
    const candidate = account ?? accounts[0];
    return deriveKey(input.data.password, candidate.salt, 64)
      .then((derived) => {
        const expected = Buffer.from(candidate.passwordHash, 'hex');
        const validPassword = timingSafeEqual(derived as Buffer, expected);
        if (!validPassword || !account)
          return res
            .status(401)
            .json({ message: '账号或密码不正确，请重新输入。' });
        const token = sessions.create(account, getSessionKey(req));
        res.cookie(COOKIE, token, {
          httpOnly: true,
          sameSite: 'strict',
          secure,
          path: '/',
          maxAge: SESSION_SECONDS * 1000,
        });
        return res.json({ authenticated: true });
      })
      .catch(next);
  });
  app.post('/api/auth/logout', (req, res) => {
    if (!checkAuthOrigin(req, res)) return;
    const authenticated = isAuthenticated(req);
    if (!logoutInputSchema.safeParse(req.body).success) {
      auditAuth(AuthAuditKind.LogoutRejected, req, authenticated);
      return res.status(400).json({
        message: '请刷新页面，并在退出确认区点击“确认退出”。登录状态未改变。',
      });
    }
    const session = sessions.get(getSessionKey(req) ?? '');
    if (session && workspaceChanged(req, session.workspaceId)) {
      auditAuth(AuthAuditKind.LogoutRejected, req, authenticated);
      return res.status(409).json({
        message: '登录账号已变化，请刷新页面后再退出。登录状态未改变。',
      });
    }
    clearSession(req, res);
    auditAuth(AuthAuditKind.LogoutConfirmed, req, authenticated);
    res.json({ authenticated: false, enabled: Boolean(credentials) });
  });
  app.use((req, res, next) => {
    // Native img/video elements need no shared Next image cache. Do not persist account media outside its temporary scope.
    if (req.path === '/_next/image') return res.status(404).end();
    // Private renderer routes must never be reachable using a public Host, even with a valid session.
    if (req.path.startsWith('/_workspace/')) {
      const match =
        /^\/_workspace\/(legacy|[a-f0-9-]{36})(\/(media|demo)\/[a-zA-Z0-9_.-]+)$/.exec(
          req.path,
        );
      const internal =
        /^(GET|HEAD)$/.test(req.method) &&
        req.headers.host === `127.0.0.1:${port}` &&
        ['127.0.0.1', '::ffff:127.0.0.1', '::1'].includes(
          req.socket.remoteAddress ?? '',
        );
      const workspace = match && findWorkspace(match[1]);
      if (!internal || !workspace)
        return res.status(403).json({ message: '不允许读取其他工作室。' });
      req.url =
        match[2] +
        (req.url.includes('?') ? req.url.slice(req.url.indexOf('?')) : '');
      return runInWorkspace(workspace, () => {
        const release = holdWorkspace();
        res.once('finish', release);
        res.once('close', release);
        next();
      });
    }
    if (!credentials)
      return runInWorkspace(registerWorkspace('legacy'), () => {
        const release = holdWorkspace(!/\/get-|\/auth\//.test(req.path));
        res.once('finish', release);
        res.once('close', release);
        next();
      });
    if (isAuthenticated(req)) {
      const session = sessions.get(getSessionKey(req)!)!;
      // Old tabs retain their original identity header: a later login cannot save their draft into another account.
      if (
        req.path.startsWith('/api/') &&
        workspaceChanged(req, session.workspaceId)
      )
        return res
          .status(409)
          .json({ message: '登录账号已变化，请刷新页面后再操作。' });
      return runInWorkspace(registerWorkspace(session.workspaceId), () => {
        const release = holdWorkspace(
          !req.path.startsWith('/api/') || req.method !== 'GET',
        );
        res.once('finish', release);
        res.once('close', release);
        next();
      });
    }
    const publicAsset =
      /^(GET|HEAD)$/.test(req.method) &&
      (req.path === '/login' ||
        req.path === '/login-preview.jpg' ||
        req.path.startsWith('/_next/static/'));
    // Nginx pins Host to the public origin. Only direct loopback media reads may bypass sessions for Remotion.
    const rendererAsset =
      /^(GET|HEAD)$/.test(req.method) &&
      req.headers.host === `127.0.0.1:${port}` &&
      ['127.0.0.1', '::ffff:127.0.0.1', '::1'].includes(
        req.socket.remoteAddress ?? '',
      ) &&
      /^\/(media|demo)\//.test(req.path);
    if (publicAsset || rendererAsset) return next();
    if (/^\/(api|media|exports|demo)(\/|$)/.test(req.path))
      return res
        .status(401)
        .json({ message: '登录已过期，请重新登录工作室。' });
    if (!/^(GET|HEAD)$/.test(req.method))
      return res.status(401).json({ message: '请先登录工作室。' });
    auditAuth(AuthAuditKind.SessionUnavailable, req, false);
    return res.redirect(
      303,
      `/login?next=${encodeURIComponent(getLoginDestination(req.path))}`,
    );
  });
}
