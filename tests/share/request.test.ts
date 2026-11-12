import assert from 'node:assert/strict';
import test from 'node:test';
import { z } from 'zod';

import { ApiClientError, requestApi } from '../../src/share/request';
import {
  createErrorResponse,
  createSuccessResponse,
} from '../../server/http/response';

test('one request boundary converts JSON names and exposes the validated envelope', (context) => {
  context.mock.method(
    globalThis,
    'fetch',
    (path: string, init: RequestInit) => {
      assert.equal(path, '/api/example');
      assert.equal(init.credentials, 'same-origin');
      assert.deepEqual(JSON.parse(String(init.body)), {
        page_size: 20,
        nested_value: { room_count: 3 },
      });
      return Promise.resolve(
        Response.json(
          createSuccessResponse(
            { itemCount: 2, nestedValue: { roomCount: 3 } },
            'req_test',
          ),
        ),
      );
    },
  );
  return requestApi('/api/example', {
    schema: z.object({
      itemCount: z.number(),
      nestedValue: z.object({ roomCount: z.number() }),
    }),
    init: {
      method: 'POST',
      body: { pageSize: 20, nestedValue: { roomCount: 3 } },
    },
  }).then((response) => {
    assert.equal(response.requestId, 'req_test');
    assert.equal(response.code, 0);
    assert.equal(response.data.nestedValue.roomCount, 3);
  });
});

test('HTTP and business errors retain code, status and request ID', (context) => {
  context.mock.method(globalThis, 'fetch', () =>
    Promise.resolve(
      Response.json(createErrorResponse(409, '草稿版本冲突', 'req_conflict'), {
        status: 409,
      }),
    ),
  );
  return assert.rejects(
    requestApi('/api/example', { schema: z.object({}) }),
    (error: unknown) => {
      assert.ok(error instanceof ApiClientError);
      assert.equal(error.status, 409);
      assert.equal(error.code, 409);
      assert.equal(error.requestId, 'req_conflict');
      assert.equal(error.message, '草稿版本冲突');
      return true;
    },
  );
});

test('an external deadline reports timeout instead of manual cancellation', (context) => {
  context.mock.method(globalThis, 'fetch', () =>
    Promise.reject(new DOMException('deadline', 'TimeoutError')),
  );
  const controller = new AbortController();
  controller.abort(new DOMException('deadline', 'TimeoutError'));
  return assert.rejects(
    requestApi('/api/example', {
      schema: z.object({}),
      init: { signal: controller.signal },
      cancelMessage: '手动取消',
      timeoutMessage: '请求超时',
    }),
    /请求超时/,
  );
});
