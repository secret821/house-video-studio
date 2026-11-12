import { z } from 'zod';

import {
  apiEnvelopeSchema,
  toCamelKey,
  toSnakeKey,
  transformKeys,
  type ApiEnvelope,
} from '@/services/definition/api-wire';

export class ApiClientError extends Error {
  constructor(
    readonly status: number,
    readonly code: number,
    message: string,
    readonly requestId: string,
    readonly data: unknown = null,
  ) {
    super(message);
  }
}

export interface ApiRequestOptions<T> {
  schema: z.ZodType<T>;
  init?: Omit<RequestInit, 'body'> & { body?: RequestInit['body'] | object };
  prepare?: (init: RequestInit) => Promise<RequestInit>;
  timeoutMs?: number;
  cancelMessage?: string;
  timeoutMessage?: string;
  networkMessage?: string;
}

function requestBody(
  init: ApiRequestOptions<unknown>['init'],
  headers: Headers,
) {
  const body = init?.body;
  if (body === undefined || body === null || body instanceof FormData)
    return body;
  if (
    typeof body === 'string' &&
    headers.get('content-type')?.includes('application/json')
  )
    return JSON.stringify(transformKeys(JSON.parse(body), toSnakeKey));
  if (typeof body === 'object' && !(body instanceof Blob)) {
    headers.set('Content-Type', 'application/json');
    return JSON.stringify(transformKeys(body, toSnakeKey));
  }
  return body;
}

/** Same-origin API request with one timeout, envelope parser and Zod data contract. */
export function requestApi<T>(
  path: string,
  options: ApiRequestOptions<T>,
): Promise<ApiEnvelope<T>> {
  if (!/^\/api(?:\/|$)/.test(path))
    return Promise.reject(new Error('接口必须使用同源 /api 路径。'));
  const controller = new AbortController();
  const external = options.init?.signal;
  const abort = () => controller.abort(external?.reason);
  external?.addEventListener('abort', abort, { once: true });
  if (external?.aborted) abort();
  const timer =
    options.timeoutMs === undefined
      ? undefined
      : setTimeout(
          () => controller.abort(new Error('timeout')),
          options.timeoutMs,
        );
  const headers = new Headers(options.init?.headers);
  let body: BodyInit | null | undefined;
  try {
    body = requestBody(options.init, headers) as BodyInit | null | undefined;
  } catch (error) {
    if (timer) clearTimeout(timer);
    external?.removeEventListener('abort', abort);
    return Promise.reject(error);
  }
  const init: RequestInit = {
    ...options.init,
    body,
    headers,
    credentials: 'same-origin',
    signal: controller.signal,
  };
  return Promise.resolve(options.prepare ? options.prepare(init) : init)
    .then((prepared) => {
      controller.signal.throwIfAborted();
      return fetch(path, prepared);
    })
    .then((response) =>
      response
        .json()
        .catch(() => {
          throw new ApiClientError(
            response.status,
            response.status,
            `服务器返回异常 (${response.status})，请稍后重试。`,
            response.headers.get('X-Request-Id') ?? '',
          );
        })
        .then((raw: unknown) => {
          const parsed = apiEnvelopeSchema.safeParse(
            transformKeys(raw, toCamelKey),
          );
          if (!parsed.success)
            throw new ApiClientError(
              response.status,
              response.status,
              '接口响应格式异常，请刷新后重试。',
              response.headers.get('X-Request-Id') ?? '',
            );
          const payload = parsed.data;
          if (!response.ok || payload.code !== 0)
            throw new ApiClientError(
              response.status,
              payload.code,
              payload.message,
              payload.requestId,
              payload.data,
            );
          return {
            ...payload,
            data: options.schema.parse(payload.data),
          };
        }),
    )
    .catch((error: unknown) => {
      const abortReason = controller.signal.reason;
      if (
        options.timeoutMessage &&
        ((abortReason instanceof Error &&
          (abortReason.name === 'TimeoutError' ||
            abortReason.message === 'timeout')) ||
          (external?.reason instanceof Error &&
            external.reason.name === 'TimeoutError'))
      )
        throw new Error(options.timeoutMessage);
      if (external?.aborted && options.cancelMessage)
        throw new Error(options.cancelMessage);
      if (controller.signal.aborted && options.timeoutMessage)
        throw new Error(options.timeoutMessage);
      if (error instanceof TypeError && options.networkMessage)
        throw new Error(options.networkMessage);
      throw error;
    })
    .finally(() => {
      if (timer) clearTimeout(timer);
      external?.removeEventListener('abort', abort);
    });
}

/** Existing business adapters can keep returning their validated data model. */
export function requestData<T>(path: string, options: ApiRequestOptions<T>) {
  return requestApi(path, options).then((response) => response.data);
}

export function createApiSearchParams(params: Record<string, unknown>) {
  const search = new URLSearchParams();
  const entries = transformKeys(params, toSnakeKey) as Record<string, unknown>;
  Object.entries(entries).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return;
    if (Array.isArray(value)) {
      value.forEach((item) => search.append(key, String(item)));
      return;
    }
    search.set(key, String(value));
  });
  return search;
}
