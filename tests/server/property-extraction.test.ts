/** Isolated provider contract checks never use real credentials, user drafts or external inference. */
import assert from 'node:assert/strict';
import { before, after, test } from 'node:test';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';

import { propertyExtractionInputSchema } from '../../src/services/definition/property-extraction';
let service: typeof import('../../server/copy/property-extraction');
const originalDirectory = process.cwd();

const directory = mkdtempSync(resolve(tmpdir(), 'property-extraction-test-'));
const previousFetch = globalThis.fetch;
const previousKey = process.env.DASHSCOPE_API_KEY;
const previousSpace = process.env.DASHSCOPE_WORKSPACE_ID;
const source =
  '浅水湾，产证375.38个平方，四层格局。版本一总价59万，版本二总价60万。手机号13812345678';
const requests: Array<string> = [];
let rejectRequest = false;
let truncated = false;
const fields = [
  {
    key: 'area',
    candidates: [{ value: '产证375.38个平方', quote: '产证375.38个平方' }],
  },
  { key: 'storeys', candidates: [{ value: '四层格局', quote: '四层格局' }] },
  {
    key: 'price',
    candidates: [
      { value: '59万', quote: '总价59万' },
      { value: '60万', quote: '总价60万' },
    ],
  },
];
before(() => {
  process.chdir(directory);
  process.env.DASHSCOPE_API_KEY = 'sk-offline.extraction-only';
  process.env.DASHSCOPE_WORKSPACE_ID = 'offline';
  globalThis.fetch = (url, init) => {
    assert.equal(
      String(url),
      'https://offline.cn-beijing.maas.aliyuncs.com/compatible-mode/v1/chat/completions',
    );
    assert.equal(init?.redirect, 'error');
    requests.push(String(init?.body));
    if (rejectRequest)
      return Promise.resolve(Response.json({}, { status: 429 }));
    return Promise.resolve(
      Response.json({
        choices: [
          {
            message: { content: JSON.stringify({ fields }) },
            finish_reason: truncated ? 'length' : 'stop',
          },
        ],
      }),
    );
  };
  return import('../../server/copy/property-extraction').then((value) => {
    service = value;
  });
});
after(() => {
  globalThis.fetch = previousFetch;
  if (previousKey === undefined) delete process.env.DASHSCOPE_API_KEY;
  else process.env.DASHSCOPE_API_KEY = previousKey;
  if (previousSpace === undefined) delete process.env.DASHSCOPE_WORKSPACE_ID;
  else process.env.DASHSCOPE_WORKSPACE_ID = previousSpace;
  process.chdir(originalDirectory);
  rmSync(directory, { recursive: true, force: true });
});
test('quota acknowledgement and bounded input are required before any model request', () => {
  for (const input of [
    { text: source },
    { text: source, freeQuotaConfirmed: false },
    { text: ' ', freeQuotaConfirmed: true },
    { text: '字'.repeat(12001), freeQuotaConfirmed: true },
  ])
    assert.equal(propertyExtractionInputSchema.safeParse(input).success, false);
  assert.throws(() =>
    service.extractPropertyWithModel({ text: source }, directory),
  );
  assert.equal(requests.length, 0);
});
test('semantic fields preserve exact source evidence, conflicting prices and unknown blanks; cache does not call again', () => {
  return service
    .extractPropertyWithModel(
      { text: source, freeQuotaConfirmed: true },
      directory,
    )
    .then((result) => {
      assert.equal(result.cached, false);
      assert.equal(
        result.fields.find((field) => field.key === 'area')?.value,
        '产证375.38个平方',
      );
      assert.equal(
        result.fields.find((field) => field.key === 'floor')?.value,
        '',
      );
      assert.equal(
        result.fields.find((field) => field.key === 'name')?.value,
        '',
      );
      assert.deepEqual(
        result.fields.find((field) => field.key === 'price')?.candidates,
        ['59万', '60万'],
      );
      assert.equal(
        result.fields.find((field) => field.key === 'price')?.value,
        '',
      );
      assert.ok(!requests[0].includes('13812345678'));
      assert.ok(!requests[0].includes('image_url'));
      assert.ok(requests[0].includes('已移除手机号'));
      return service.extractPropertyWithModel(
        { text: source, freeQuotaConfirmed: true },
        directory,
      );
    })
    .then((result) => {
      assert.equal(result.cached, true);
      assert.equal(requests.length, 1);
    });
});
test('hallucinated values, evidence, unknown keys and duplicate fields are rejected', () => {
  for (const fields of [
    [
      {
        key: 'area',
        candidates: [{ value: '128平方米', quote: '产证375.38个平方' }],
      },
    ],
    [
      {
        key: 'price',
        candidates: [{ value: '59万', quote: '总价59万送车库' }],
      },
    ],
    [{ key: 'secret', candidates: [] }],
    [
      { key: 'price', candidates: [] },
      { key: 'price', candidates: [] },
    ],
    [
      {
        key: 'name',
        candidates: [{ value: '13812345678', quote: '手机号13812345678' }],
      },
    ],
  ])
    assert.throws(() =>
      service.parsePropertyContent(
        JSON.stringify({ fields }),
        service.extractionSource(source),
      ),
    );
  assert.throws(() => service.parsePropertyContent('not JSON', source));
});
test('provider failure and truncated output are not cached and never trigger an automatic retry', () => {
  const input = { text: source + '重试测试', freeQuotaConfirmed: true };
  const count = requests.length;
  rejectRequest = true;
  return assert
    .rejects(service.extractPropertyWithModel(input, directory), /HTTP 429/)
    .then(() => {
      assert.equal(requests.length, count + 1);
      rejectRequest = false;
      truncated = true;
      return assert.rejects(
        service.extractPropertyWithModel(input, directory),
        /截断/,
      );
    })
    .then(() => {
      assert.equal(requests.length, count + 2);
      truncated = false;
      return service.extractPropertyWithModel(input, directory);
    })
    .then((result) => {
      assert.equal(result.cached, false);
      assert.equal(requests.length, count + 3);
    });
});
