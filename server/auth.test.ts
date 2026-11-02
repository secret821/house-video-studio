/** Exercise real HTTP boundaries: sessions, sign-out, expiry, attempts and renderer isolation. */
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { createHash, scryptSync } from 'node:crypto';
import {
  chmodSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { AuthAuditKind, type AuthAudit } from './auth';
import { createSessionStore, SESSION_SECONDS } from './auth-sessions';
import { request as httpRequest } from 'node:http';
import express from 'express';
import test from 'node:test';

import { getLoginDestination } from '../src/services/definition/auth';
import { installWorkspaceAuth, loadAuthCredentials } from './auth';
import { getWorkspace, workspaceState } from './workspace';
import {
  beginVideoUpload,
  cancelVideoUpload,
  getVideoUploadStatus,
  type VideoUploadTask,
} from './video-upload';

const PASSWORD = 'isolated-test-password-only';
const salt = 'ab'.repeat(16);
const credentials = {
  username: 'test-studio',
  salt,
  passwordHash: scryptSync(PASSWORD, salt, 64).toString('hex'),
};
const HOST = 'studio.example';
const ORIGIN = `http://${HOST}`;

function withServer(
  run: (origin: string) => Promise<unknown>,
  options: {
    now?: () => number;
    sessionStorePath?: string;
    onAudit?: (event: AuthAudit) => void;
    publicOrigin?: string;
    credentials?:
      | NonNullable<ReturnType<typeof loadAuthCredentials>>
      | typeof credentials
      | null;
    setup?: (app: express.Express) => void;
  } = {},
) {
  const app = express();
  // Preserve errors raised by the real server's earlier Host/Origin boundary.
  app.use((req, _res, next) => {
    if (req.headers.origin === 'http://evil.invalid')
      return next(
        Object.assign(new Error('cross-site forbidden'), { status: 403 }),
      );
    next();
  });
  installWorkspaceAuth(app, {
    credentials,
    port: 4340,
    publicOrigin: ORIGIN,
    ...options,
  });
  options.setup?.(app);
  app.use((_req, res) => res.json({ protected: true }));
  const server = app.listen(0, '127.0.0.1');
  return once(server, 'listening')
    .then(() => {
      const address = server.address();
      assert.ok(address && typeof address !== 'string');
      return run(`http://127.0.0.1:${address.port}`);
    })
    .finally(() => {
      server.close();
      server.closeAllConnections();
    })
    .then(() => undefined);
}
function request(
  origin: string,
  path: string,
  options: {
    body?: unknown;
    cookie?: string;
    host?: string;
    source?: string;
    method?: string;
    rawBody?: string;
    workspace?: string;
    editorCheck?: boolean;
    userAgent?: string;
  } = {},
) {
  const headers: Record<string, string> = { Host: options.host ?? HOST };
  if (options.cookie) headers.Cookie = options.cookie;
  if (options.editorCheck) headers['X-Studio-Session-Check'] = 'editor';
  if (options.userAgent) headers['User-Agent'] = options.userAgent;
  if (options.workspace) headers['X-Studio-Workspace'] = options.workspace;
  const hasBody = options.body !== undefined || options.rawBody !== undefined;
  if (hasBody) {
    headers['Content-Type'] = 'application/json';
    headers.Origin = options.source ?? ORIGIN;
  }
  // Node fetch rewrites Host; node:http is needed to test the actual proxy/renderer trust boundary.
  return new Promise<Response>((resolve, reject) => {
    const outgoing = httpRequest(
      origin + path,
      {
        method: options.method ?? (hasBody ? 'POST' : 'GET'),
        headers,
      },
      (incoming) => {
        const chunks: Array<Buffer> = [];
        incoming.on('data', (chunk: Buffer) => chunks.push(chunk));
        incoming.on('error', reject);
        incoming.on('end', () => {
          const responseHeaders = new Headers();
          for (const [key, value] of Object.entries(incoming.headers)) {
            if (Array.isArray(value))
              value.forEach((item) => responseHeaders.append(key, item));
            else if (value !== undefined) responseHeaders.set(key, value);
          }
          resolve(
            new Response(Buffer.concat(chunks), {
              status: incoming.statusCode,
              headers: responseHeaders,
            }),
          );
        });
      },
    );
    outgoing.on('error', reject);
    outgoing.end(
      options.rawBody ??
        (options.body === undefined ? undefined : JSON.stringify(options.body)),
    );
  });
}
function login(origin: string, cookie?: string, source = ORIGIN) {
  return request(origin, '/api/auth/login', {
    body: { username: credentials.username, password: PASSWORD },
    cookie,
    source,
  }).then((response) => {
    assert.equal(response.status, 200);
    const header = response.headers.get('set-cookie');
    assert.ok(header);
    assert.match(header, /HttpOnly/);
    assert.match(header, /SameSite=Strict/);
    assert.match(header, /Max-Age=604800/);
    return { cookie: header.split(';')[0], header };
  });
}

test('public authentication is required at startup; return destinations are an editor-only whitelist', () => {
  assert.throws(
    () => loadAuthCredentials(undefined, ORIGIN),
    /STUDIO_AUTH_CONFIG/,
  );
  assert.throws(
    () => loadAuthCredentials('/missing/private/auth.json', ORIGIN),
    /私有配置/,
  );
  assert.equal(loadAuthCredentials(), null);
  for (const path of [
    '//evil.invalid',
    '/api/save-draft',
    '/login',
    '/\\evil.invalid',
    'https://evil.invalid',
  ])
    assert.equal(getLoginDestination(path), '/');
  assert.equal(getLoginDestination('/photo-mode'), '/photo-mode');
});

test('malformed and oversized login JSON never echo submitted password text', () =>
  withServer((origin) => {
    return request(origin, '/api/auth/login', {
      rawBody: '{"password":"do-not-echo-test-secret",',
    })
      .then((res) => {
        assert.equal(res.status, 400);
        return res.text();
      })
      .then((body) => {
        assert.doesNotMatch(body, /do-not-echo-test-secret/);
        return request(origin, '/api/auth/login', {
          body: { password: 'x'.repeat(5000) },
        });
      })
      .then((res) => {
        assert.equal(res.status, 400);
        return res.text();
      })
      .then((body) => assert.doesNotMatch(body, /xxx/));
  }));

test('unauthenticated pages redirect, data stays JSON401; only pinned internal media reads bypass sessions', () =>
  withServer((origin) => {
    return request(origin, '/photo-mode')
      .then((response) => {
        assert.equal(response.status, 303);
        assert.equal(
          response.headers.get('location'),
          '/login?next=%2Fphoto-mode',
        );
        assert.match(response.headers.get('cache-control') ?? '', /no-store/);
        return Promise.all(
          [
            '/api/get-draft',
            '/api/video-edit/get-upload-status',
            '/api/video-edit/cancel-upload',
            '/media/fixture.jpg',
            '/exports/fixture.mp4',
            '/demo/living.jpg',
          ].map((path) =>
            request(origin, path).then((res) => assert.equal(res.status, 401)),
          ),
        );
      })
      .then(() =>
        request(origin, '/media/fixture.jpg', { host: '127.0.0.1:4340' }),
      )
      .then((res) => {
        assert.equal(res.status, 200);
        return request(origin, '/api/get-draft', { host: '127.0.0.1:4340' });
      })
      .then((res) => {
        assert.equal(res.status, 401);
        return request(origin, '/exports/fixture.mp4', {
          host: '127.0.0.1:4340',
        });
      })
      .then((res) => {
        assert.equal(res.status, 401);
        return request(origin, '/demo/living.jpg', {
          host: '127.0.0.1:4340',
          method: 'POST',
        });
      })
      .then((res) => {
        assert.equal(res.status, 401);
        return Promise.all(
          ['/login', '/login-preview.jpg', '/_next/static/chunk.js'].map(
            (path) =>
              request(origin, path).then((res) =>
                assert.equal(res.status, 200),
              ),
          ),
        );
      });
  }));

test('wrong credentials and cross-site login fail without a session; valid cookies rotate and logout revokes replay', () =>
  withServer((origin) => {
    let first = '';
    let second = '';
    return request(origin, '/api/auth/login', {
      body: { username: credentials.username, password: 'wrong' },
    })
      .then((res) => {
        assert.equal(res.status, 401);
        assert.equal(res.headers.get('set-cookie'), null);
        return res.text();
      })
      .then((body) => {
        assert.doesNotMatch(body, /wrong/);
        return request(origin, '/api/auth/login', {
          body: { username: credentials.username, password: PASSWORD },
          source: 'http://evil.invalid',
        });
      })
      .then((res) => {
        assert.equal(res.status, 403);
        return login(origin);
      })
      .then(({ cookie, header }) => {
        first = cookie;
        assert.doesNotMatch(header, /Secure/);
        return request(origin, '/api/get-draft', { cookie });
      })
      .then((res) => {
        assert.equal(res.status, 200);
        return login(origin, first);
      })
      .then(({ cookie }) => {
        second = cookie;
        assert.notEqual(first, second);
        return request(origin, '/api/get-draft', { cookie: first });
      })
      .then((res) => {
        assert.equal(res.status, 401);
        return request(origin, '/api/auth/logout', {
          cookie: second,
          body: { confirmed: true },
          source: 'http://evil.invalid',
        });
      })
      .then((res) => {
        assert.equal(res.status, 403);
        return request(origin, '/api/auth/logout', {
          cookie: second,
          body: { confirmed: true },
        });
      })
      .then((res) => {
        assert.equal(res.status, 200);
        assert.match(
          res.headers.get('set-cookie') ?? '',
          /Expires=Thu, 01 Jan 1970/,
        );
        return request(origin, '/api/get-draft', { cookie: second });
      })
      .then((res) => assert.equal(res.status, 401));
  }));

test('sessions expire after seven days and do not accept duplicated or forged cookies; HTTPS sets Secure', () => {
  let clock = Date.now();
  return withServer(
    (origin) =>
      login(origin, undefined, 'https://studio.example')
        .then(({ cookie, header }) => {
          assert.match(header, /Secure/);
          return request(origin, '/api/get-draft', {
            cookie: `${cookie}; ${cookie}`,
          }).then((res) => {
            assert.equal(res.status, 401);
            clock += 6 * 24 * 60 * 60 * 1000;
            return request(origin, '/api/get-draft', { cookie }).then(
              (active) => {
                assert.equal(active.status, 200);
                clock += 24 * 60 * 60 * 1000 + 1;
                return request(origin, '/api/get-draft', { cookie });
              },
            );
          });
        })
        .then((res) => {
          assert.equal(res.status, 401);
          return request(origin, '/api/get-draft', {
            cookie: 'house_studio_session=' + 'x'.repeat(43),
          });
        })
        .then((res) => assert.equal(res.status, 401)),
    { now: () => clock, publicOrigin: 'https://studio.example/' },
  );
});

test('workspace login rate is bounded and recovers after the minute window', () => {
  let clock = Date.now();
  return withServer(
    (origin) =>
      Array.from({ length: 10 })
        .reduce<Promise<void>>(
          (chain) =>
            chain
              .then(() =>
                request(origin, '/api/auth/login', {
                  body: {
                    username: credentials.username,
                    password: 'wrong-rate-test',
                  },
                }),
              )
              .then((res) => {
                assert.equal(res.status, 401);
              }),
          Promise.resolve(),
        )
        .then(() =>
          request(origin, '/api/auth/login', {
            body: { username: credentials.username, password: PASSWORD },
          }),
        )
        .then((res) => {
          assert.equal(res.status, 429);
          assert.equal(res.headers.get('retry-after'), '60');
          clock += 60001;
          return login(origin);
        }),
    { now: () => clock },
  );
});

test('local auth-disabled mode remains available without a public origin', () =>
  withServer(
    (origin) =>
      request(origin, '/api/get-draft').then((res) =>
        assert.equal(res.status, 200),
      ),
    { credentials: null, publicOrigin: undefined },
  ));

const secondId = '22222222-2222-4222-8222-222222222222';
const second = {
  username: 'second-studio',
  workspaceId: secondId,
  salt,
  passwordHash: scryptSync('second-test-password', salt, 64).toString('hex'),
};

test('two real sessions partition drafts, upload ownership and stale-tab identity across Promise continuations', () => {
  // Upload admission must measure disposable test files, never a developer's existing media.
  const original = process.cwd();
  const isolated = mkdtempSync(resolve(tmpdir(), 'studio-auth-upload-'));
  process.chdir(isolated);
  const tasks: Array<VideoUploadTask> = [];
  return withServer(
    (origin) => {
      let firstCookie = '';
      let secondCookie = '';
      let uploadId = '';
      return login(origin)
        .then(({ cookie }) => {
          firstCookie = cookie;
          return request(origin, '/api/auth/login', {
            body: {
              username: second.username,
              password: 'second-test-password',
            },
          });
        })
        .then((res) => {
          assert.equal(res.status, 200);
          secondCookie = res.headers.get('set-cookie')!.split(';')[0];
          return request(origin, '/api/scope', {
            cookie: firstCookie,
            workspace: 'legacy',
            body: { draft: 'first-private' },
          });
        })
        .then((res) => res.json())
        .then((body) => {
          assert.deepEqual(body, { id: 'legacy', draft: 'first-private' });
          return request(origin, '/api/scope', {
            cookie: secondCookie,
            workspace: secondId,
          });
        })
        .then((res) => res.json())
        .then((body) => {
          assert.deepEqual(body, { id: secondId, draft: null });
          return request(origin, '/api/scope', {
            cookie: secondCookie,
            workspace: 'legacy',
            body: { draft: 'stale-tab-overwrite' },
          });
        })
        .then((res) => {
          assert.equal(res.status, 409);
          return request(origin, '/api/start-upload', {
            cookie: firstCookie,
            workspace: 'legacy',
            body: {},
          });
        })
        .then((res) => res.json())
        .then((body) => {
          uploadId = body.id;
          return request(origin, '/api/upload-status', {
            cookie: secondCookie,
            workspace: secondId,
          });
        })
        .then((res) => res.json())
        .then((body) => {
          assert.equal(body.active, null);
          return request(origin, '/api/cancel-upload', {
            cookie: secondCookie,
            workspace: secondId,
            body: { id: uploadId },
          });
        })
        .then((res) => {
          assert.equal(res.status, 200);
          return request(origin, '/api/upload-status', {
            cookie: firstCookie,
            workspace: 'legacy',
          });
        })
        .then((res) => res.json())
        .then((body) => {
          assert.equal(body.active.id, uploadId);
          return request(origin, '/api/start-upload', {
            cookie: secondCookie,
            workspace: secondId,
            body: {},
          });
        })
        .then((res) => {
          assert.equal(res.status, 200);
          return request(origin, '/_workspace/legacy/media/secret.mp4', {
            cookie: secondCookie,
          });
        })
        .then((res) => {
          assert.equal(res.status, 403);
          return request(origin, '/api/scope', {
            cookie: secondCookie,
            workspace: secondId,
          });
        })
        .then((res) => res.json())
        .then((body) => assert.equal(body.draft, null));
    },
    {
      credentials: {
        accounts: [{ ...credentials, workspaceId: 'legacy' }, second],
      },
      setup: (app) => {
        app.use(express.json());
        app.all('/api/scope', (req, res) =>
          Promise.resolve().then(() => {
            const state = workspaceState('test-draft', () => ({
              draft: null as string | null,
            }));
            if (req.method === 'POST') state.draft = req.body.draft;
            res.json({ id: getWorkspace().id, draft: state.draft });
          }),
        );
        app.post('/api/start-upload', (_req, res) => {
          const task = beginVideoUpload();
          tasks.push(task);
          res.json(task.info);
        });
        app.get('/api/upload-status', (_req, res) =>
          res.json(getVideoUploadStatus()),
        );
        app.post('/api/cancel-upload', (req, res, next) =>
          cancelVideoUpload(req.body.id)
            .then((result) => res.json(result))
            .catch(next),
        );
      },
    },
  ).finally(() => {
    tasks.forEach((task) => task.finish());
    process.chdir(original);
    rmSync(isolated, { recursive: true, force: true });
  });
});

test('failed login attempts for one account do not throttle another account', () =>
  withServer(
    (origin) => {
      return Array.from({ length: 10 })
        .reduce<Promise<void>>(
          (chain) =>
            chain
              .then(() =>
                request(origin, '/api/auth/login', {
                  body: {
                    username: credentials.username,
                    password: 'incorrect',
                  },
                }),
              )
              .then((res) => {
                assert.equal(res.status, 401);
              }),
          Promise.resolve(),
        )
        .then(() =>
          request(origin, '/api/auth/login', {
            body: { username: credentials.username, password: PASSWORD },
          }),
        )
        .then((res) => {
          assert.equal(res.status, 429);
          return request(origin, '/api/auth/login', {
            body: {
              username: second.username,
              password: 'second-test-password',
            },
          });
        })
        .then((res) => assert.equal(res.status, 200));
    },
    {
      credentials: {
        accounts: [{ ...credentials, workspaceId: 'legacy' }, second],
      },
    },
  ));

test('the unused Next image optimizer cannot persist or expose private temporary account media', () =>
  withServer((origin) =>
    request(origin, '/_next/image?url=%2Fmedia%2Fsecret.jpg&w=640&q=75')
      .then((res) => {
        assert.equal(res.status, 404);
        return login(origin);
      })
      .then(({ cookie }) =>
        request(origin, '/_next/image?url=%2Fmedia%2Fsecret.jpg&w=640&q=75', {
          cookie,
        }),
      )
      .then((res) => assert.equal(res.status, 404)),
  ));

test('seven-day cookies survive server recreation and sign-out remains revoked after another restart', () => {
  const directory = mkdtempSync(resolve(tmpdir(), 'studio-week-session-'));
  const sessionStorePath = resolve(directory, 'sessions.json');
  let cookie = '';
  return withServer(
    (origin) =>
      login(origin).then((session) => {
        cookie = session.cookie;
        const stored = readFileSync(sessionStorePath, 'utf8');
        assert.doesNotMatch(stored, new RegExp(cookie.split('=')[1]));
        assert.doesNotMatch(stored, new RegExp(PASSWORD));
        assert.doesNotMatch(stored, new RegExp(credentials.passwordHash));
        assert.equal(statSync(sessionStorePath).mode & 0o777, 0o600);
      }),
    { sessionStorePath },
  )
    .then(() =>
      withServer(
        (origin) =>
          request(origin, '/api/get-draft', { cookie })
            .then((response) => {
              assert.equal(response.status, 200);
              return request(origin, '/api/auth/logout', {
                cookie,
                body: { confirmed: true },
              });
            })
            .then((response) => assert.equal(response.status, 200)),
        { sessionStorePath },
      ),
    )
    .then(() =>
      withServer(
        (origin) =>
          request(origin, '/api/get-draft', { cookie }).then((response) =>
            assert.equal(response.status, 401),
          ),
        { sessionStorePath },
      ),
    )
    .finally(() => rmSync(directory, { recursive: true, force: true }));
});

test('restored sessions expire absolutely after seven days and a password change invalidates previous tickets', () => {
  const directory = mkdtempSync(resolve(tmpdir(), 'studio-session-expiry-'));
  const path = resolve(directory, 'sessions.json');
  const account = { ...credentials, workspaceId: 'legacy' };
  let clock = Date.now();
  const options = { accounts: [account], path, now: () => clock };
  const digest = (token: string) =>
    createHash('sha256').update(token).digest('hex');
  try {
    const token = createSessionStore(options).create(account, null);
    clock += (SESSION_SECONDS - 1) * 1000;
    assert.ok(createSessionStore(options).get(digest(token)));
    clock += 1000;
    assert.equal(createSessionStore(options).get(digest(token)), undefined);
    const second = createSessionStore(options).create(account, null);
    assert.equal(
      createSessionStore({
        ...options,
        accounts: [{ ...account, passwordHash: '1'.repeat(128) }],
      }).get(digest(second)),
      undefined,
    );
    assert.equal(createSessionStore(options).get(digest(second)), undefined);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test('durable sessions stay bounded and unsafe or malformed stores fail closed', () => {
  const directory = mkdtempSync(resolve(tmpdir(), 'studio-session-bounds-'));
  const path = resolve(directory, 'sessions.json');
  const account = { ...credentials, workspaceId: 'legacy' };
  const options = { accounts: [account], path, now: Date.now };
  const digest = (token: string) =>
    createHash('sha256').update(token).digest('hex');
  try {
    const sessions = createSessionStore(options);
    const first = sessions.create(account, null);
    for (let index = 0; index < 32; index += 1) sessions.create(account, null);
    assert.equal(sessions.get(digest(first)), undefined);
    assert.equal(JSON.parse(readFileSync(path, 'utf8')).sessions.length, 32);
    chmodSync(path, 0o644);
    assert.throws(() => createSessionStore(options), /安全的登录状态文件/);
    chmodSync(path, 0o600);
    const token = sessions.create(account, null);
    chmodSync(path, 0o644);
    assert.throws(() => sessions.revoke(digest(token)), /Unsafe session file/);
    assert.ok(
      sessions.get(digest(token)),
      'A failed revocation must not claim it was committed',
    );
    chmodSync(path, 0o600);
    writeFileSync(path, '{broken');
    assert.throws(() => createSessionStore(options), /安全的登录状态文件/);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test('unconfirmed and stale logout requests keep the seven-day session and durable record untouched', () => {
  const directory = mkdtempSync(resolve(tmpdir(), 'studio-confirm-logout-'));
  const sessionStorePath = resolve(directory, 'sessions.json');
  const events: Array<AuthAudit> = [];
  let cookie = '';
  let stored = '';
  return withServer(
    (origin) =>
      login(origin)
        .then((session) => {
          cookie = session.cookie;
          stored = readFileSync(sessionStorePath, 'utf8');
          return [
            {},
            { confirmed: false },
            { confirmed: 'true' },
            { confirmed: true, extra: 'unexpected' },
          ].reduce(
            (chain, body) =>
              chain
                .then(() =>
                  request(origin, '/api/auth/logout', { cookie, body }),
                )
                .then((response) => {
                  assert.equal(response.status, 400);
                  assert.equal(response.headers.get('set-cookie'), null);
                  assert.equal(readFileSync(sessionStorePath, 'utf8'), stored);
                  return request(origin, '/api/get-draft', { cookie }).then(
                    (active) => assert.equal(active.status, 200),
                  );
                }),
            Promise.resolve(),
          );
        })
        .then(() =>
          request(origin, '/api/auth/logout', {
            cookie,
            body: { confirmed: true },
          }),
        )
        .then((response) => {
          assert.equal(response.status, 200);
          return request(origin, '/api/get-draft', { cookie });
        })
        .then((response) => {
          assert.equal(response.status, 401);
          assert.equal(
            events.filter(
              (event) => event.kind === AuthAuditKind.LogoutRejected,
            ).length,
            1,
          );
          assert.ok(
            events.some(
              (event) =>
                event.kind === AuthAuditKind.LogoutConfirmed &&
                event.sessionAvailable,
            ),
          );
          const audit = JSON.stringify(events);
          assert.ok(!audit.includes(cookie.split('=')[1]));
          assert.ok(!audit.includes(PASSWORD));
          assert.ok(!audit.includes(credentials.username));
        }),
    { sessionStorePath, onAudit: (event) => events.push(event) },
  ).finally(() => rmSync(directory, { recursive: true, force: true }));
});

test('lost-session diagnostics distinguish missing and malformed cookies, are bounded and omit raw headers', () => {
  const events: Array<AuthAudit> = [];
  let clock = Date.now();
  return withServer(
    (origin) =>
      Promise.all(
        Array.from({ length: 12 }, () =>
          request(origin, '/api/auth/session', {
            editorCheck: true,
            userAgent: 'iPhone Safari private-agent-secret',
          }),
        ),
      )
        .then((responses) => {
          assert.ok(responses.every((response) => response.status === 200));
          assert.equal(events.length, 1);
          assert.equal(events[0].cookiePresent, false);
          assert.equal(events[0].browser, 'ios-safari');
          return request(origin, '/api/auth/session', {
            editorCheck: true,
            cookie: 'house_studio_session=private-cookie-secret',
          });
        })
        .then(() => {
          assert.equal(events.length, 2);
          assert.equal(events[1].cookiePresent, true);
          assert.equal(events[1].cookieFormatValid, false);
          clock += 30000;
          return request(origin, '/api/auth/session', { editorCheck: true });
        })
        .then(() => {
          assert.equal(events.length, 3);
          assert.doesNotMatch(
            JSON.stringify(events),
            /private-cookie-secret|private-agent-secret/,
          );
        }),
    { now: () => clock, onAudit: (event) => events.push(event) },
  );
});

test('a stale tab cannot sign out the account selected by a later login', () =>
  withServer(
    (origin) => {
      let cookie = '';
      return request(origin, '/api/auth/login', {
        body: { username: second.username, password: 'second-test-password' },
      })
        .then((response) => {
          assert.equal(response.status, 200);
          cookie = response.headers.get('set-cookie')!.split(';')[0];
          return [undefined, 'legacy'].reduce(
            (chain, workspace) =>
              chain
                .then(() =>
                  request(origin, '/api/auth/logout', {
                    cookie,
                    workspace,
                    body: { confirmed: true },
                  }),
                )
                .then((response) => {
                  assert.equal(response.status, 409);
                  assert.equal(response.headers.get('set-cookie'), null);
                  return request(origin, '/api/get-draft', {
                    cookie,
                    workspace: secondId,
                  }).then((active) => assert.equal(active.status, 200));
                }),
            Promise.resolve(),
          );
        })
        .then(() =>
          request(origin, '/api/auth/logout', {
            cookie,
            workspace: secondId,
            body: { confirmed: true },
          }),
        )
        .then((response) => {
          assert.equal(response.status, 200);
          return request(origin, '/api/get-draft', {
            cookie,
            workspace: secondId,
          });
        })
        .then((response) => assert.equal(response.status, 401));
    },
    {
      credentials: {
        accounts: [{ ...credentials, workspaceId: 'legacy' }, second],
      },
    },
  ));
