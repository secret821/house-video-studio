import assert from 'node:assert/strict';
import test from 'node:test';
import express from 'express';

import {
  installApiEnvelope,
  normalizeApiJsonBody,
} from '../../server/http/response';

test('Express API responses use one snake_case envelope while handlers keep camelCase DTOs', () => {
  const app = express();
  app.use(installApiEnvelope);
  app.use(express.json());
  app.use(normalizeApiJsonBody);
  app.post('/api/example', (req, res) => {
    assert.deepEqual(req.body, { pageSize: 12, details: { roomCount: 2 } });
    res.status(202).json({ itemCount: 1, details: req.body.details });
  });
  app.get('/api/fail', (_req, res) =>
    res.status(403).json({ message: '没有权限' }),
  );
  return new Promise<void>((resolve, reject) => {
    const server = app.listen(0, '127.0.0.1', () => {
      const address = server.address();
      if (!address || typeof address === 'string') {
        reject(new Error('无法读取测试端口'));
        return;
      }
      const base = `http://127.0.0.1:${address.port}`;
      fetch(`${base}/api/example`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ page_size: 12, details: { room_count: 2 } }),
      })
        .then((response) => {
          assert.equal(response.status, 202);
          return response.json();
        })
        .then((body) => {
          assert.match(body.request_id, /^req_[a-f0-9-]{36}$/);
          assert.deepEqual(body.data, {
            item_count: 1,
            details: { room_count: 2 },
          });
          return fetch(`${base}/api/fail`);
        })
        .then((response) =>
          response.json().then((body) => ({ response, body })),
        )
        .then(({ response, body }) => {
          assert.equal(response.status, 403);
          assert.equal(body.code, 403);
          assert.equal(body.message, '没有权限');
          assert.equal(body.data, null);
          resolve();
        }, reject)
        .finally(() => server.close());
    });
  });
});
