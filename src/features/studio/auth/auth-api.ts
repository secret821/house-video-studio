/** Cookie-only login calls; passwords and session tokens are never stored in browser storage. */
import { z } from 'zod';
import { requestData } from '@/share/request';

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
  const init: RequestInit = {
    cache: 'no-store',
    credentials: 'same-origin',
  };
  const headers = new Headers(options.headers);
  if (options.editorCheck) headers.set('X-Studio-Session-Check', 'editor');
  if (options.body !== undefined) {
    init.method = 'POST';
    headers.set('Content-Type', 'application/json');
    init.body = JSON.stringify(options.body);
  }
  init.headers = headers;
  return requestData(`/api/auth/${path}`, {
    schema: options.schema,
    init,
    timeoutMs: 30_000,
    networkMessage: '登录服务暂时不可用，请稍后再试。',
  });
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
