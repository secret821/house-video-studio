import { randomUUID } from 'node:crypto';
import type { RequestHandler } from 'express';
import {
  toCamelKey,
  toSnakeKey,
  transformKeys,
} from '../../src/services/definition/api-wire';

/** API field names are snake_case on the wire; domain objects remain camelCase. */

export function createSuccessResponse(data: unknown, requestId: string) {
  return {
    request_id: requestId,
    code: 0,
    message: 'success',
    data: transformKeys(data ?? null, toSnakeKey),
  };
}

export function createErrorResponse(
  status: number,
  message: string,
  requestId: string,
) {
  return { request_id: requestId, code: status, message, data: null };
}

/** Apply the envelope at the Express boundary, including authentication and errors. */
export const installApiEnvelope: RequestHandler = (req, res, next) => {
  if (!/^\/api(?:\/|$)/.test(req.path)) return next();
  const requestId = `req_${randomUUID()}`;
  res.setHeader('X-Request-Id', requestId);
  const sendJson = res.json.bind(res);
  res.json = ((data: unknown) => {
    if (res.statusCode >= 400) {
      const message =
        data &&
        typeof data === 'object' &&
        'message' in data &&
        typeof data.message === 'string'
          ? data.message
          : `请求失败 (${res.statusCode})`;
      return sendJson(createErrorResponse(res.statusCode, message, requestId));
    }
    return sendJson(createSuccessResponse(data, requestId));
  }) as typeof res.json;
  next();
};

/** Existing Zod contracts and business handlers continue to receive camelCase objects. */
export const normalizeApiJsonBody: RequestHandler = (req, _res, next) => {
  if (/^\/api(?:\/|$)/.test(req.path) && req.is('application/json'))
    req.body = transformKeys(req.body, toCamelKey);
  next();
};
