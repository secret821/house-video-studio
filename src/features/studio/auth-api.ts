/** Cookie-only login calls; passwords and session tokens are never stored in browser storage. */
import { z } from 'zod';

import {
  loginResultSchema,
  logoutInputSchema,
  sessionSchema,
  type loginInputSchema,
} from '@/services/definition/auth';

function authRequest<T>(
  path: string,
  options: {
    schema: z.ZodType<T>;
    body?: unknown;
    editorCheck?: boolean;
    headers?: HeadersInit;
  },
) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 30_000);
  const init: RequestInit = {
    cache: 'no-store',
    credentials: 'same-origin',
    signal: controller.signal,
  };
  const headers = new Headers(options.headers);
  if (options.editorCheck) headers.set('X-Studio-Session-Check', 'editor');
  if (options.body !== undefined) {
    init.method = 'POST';
    headers.set('Content-Type', 'application/json');
    init.body = JSON.stringify(options.body);
  }
  init.headers = headers;
  return fetch(`/api/auth/${path}`, init)
    .then((response) =>
      response
        .json()
        .catch(() => {
          throw new Error(`服务器返回异常 (${response.status})，请稍后重试。`);
        })
        .then((data: unknown) => {
          if (!response.ok) {
            const error = z.object({ message: z.string() }).safeParse(data);
            throw new Error(
              error.success
                ? error.data.message
                : '登录服务暂时不可用，请稍后再试。',
            );
          }
          return options.schema.parse(data);
        }),
    )
    .finally(() => clearTimeout(timer));
}
export const authApi = {
  getSession: (options?: { editorCheck?: boolean }) =>
    authRequest('session', { schema: sessionSchema, ...options }),
  login: (input: z.infer<typeof loginInputSchema>) =>
    authRequest('login', { schema: loginResultSchema, body: input }),
  logout: () =>
    workspaceRequest().then(({ headers }) =>
      authRequest('logout', {
        schema: sessionSchema,
        body: logoutInputSchema.parse({ confirmed: true }),
        headers,
      }),
    ),
};

let workspaceSession: Promise<z.infer<typeof sessionSchema>> | null = null;
/** Freeze the page identity so a stale tab cannot mutate a newly logged-in account's data. */
export function workspaceRequest(init?: RequestInit): Promise<RequestInit> {
  workspaceSession ??= authApi.getSession().catch((error: unknown) => {
    workspaceSession = null;
    throw error;
  });
  const pending = workspaceSession.then((session) => {
    const headers = new Headers(init?.headers);
    if (session.workspaceId)
      headers.set('X-Studio-Workspace', session.workspaceId);
    return { ...init, headers };
  });
  const signal = init?.signal;
  if (!signal) return pending;
  return new Promise<RequestInit>((resolve, reject) => {
    const abort = () => reject(signal.reason);
    if (signal.aborted) return abort();
    signal.addEventListener('abort', abort, { once: true });
    pending
      .then(resolve, reject)
      .finally(() => signal.removeEventListener('abort', abort));
  });
}

/** Browser drafts use the page's account; re-check the live session before writing local storage. */
export function getDraftSession() {
  workspaceSession ??= authApi.getSession().catch((error: unknown) => {
    workspaceSession = null;
    throw error;
  });
  return workspaceSession.then((expected) =>
    authApi.getSession().then((session) => {
      if (
        session.enabled &&
        (!session.authenticated || session.workspaceId !== expected.workspaceId)
      )
        throw new Error('登录账号已变化，请刷新页面后再保存草稿。');
      return session;
    }),
  );
}
