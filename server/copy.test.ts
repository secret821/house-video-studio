/** Offline provider and media tests isolate credentials, caches and all filesystem writes from user projects. */
import assert from 'node:assert/strict';
import { before, after, test } from 'node:test';
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  rmSync,
  symlinkSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import sharp from 'sharp';

import {
  COPY_MODEL,
  CopyKind,
  copyInputSchema,
  copySubmissionSchema,
  type CopyInput,
} from '../src/services/definition/copy';
import { HouseMediaKind } from '../src/services/definition/video-edit';

const original = process.cwd();
const isolated = mkdtempSync(resolve(tmpdir(), 'copy-offline-'));
const oldFetch = globalThis.fetch;
const oldKey = process.env.DASHSCOPE_API_KEY;
const oldWorkspace = process.env.DASHSCOPE_WORKSPACE_ID;
let service: typeof import('./copy');
const requests: Array<{ url: string; body: Record<string, unknown> }> = [];
let failure = false;
const photo: CopyInput = {
  kind: CopyKind.Photo,
  facts: {
    name: '样本房源',
    location: '',
    area: '',
    layout: '',
    price: '59万',
  },
  scene: { id: 'living', src: '/demo/living.jpg' },
};

/** A fixed, grounded response allows real image preparation and cache behavior to run without any external traffic. */
function mockFetch(
  input: string | URL | Request,
  init?: RequestInit,
): Promise<Response> {
  const url = String(input);
  assert.equal(
    url,
    'https://offline.cn-beijing.maas.aliyuncs.com/compatible-mode/v1/chat/completions',
  );
  assert.equal(init?.redirect, 'error');
  const body = JSON.parse(String(init?.body));
  requests.push({ url, body });
  if (failure)
    return Promise.resolve(Response.json({ error: 'quota' }, { status: 429 }));
  const text = body.messages[1].content[0].text;
  const source = copyInputSchema.parse(
    JSON.parse(text.slice(text.indexOf('{'))),
  );
  const ids =
    source.kind === CopyKind.Photo
      ? [source.scene.id]
      : source.shots.map((shot) => shot.id);
  return Promise.resolve(
    Response.json({
      choices: [
        {
          message: {
            content: JSON.stringify({
              items: ids.map((id) => ({
                id,
                title: '看看实际空间',
                narration: '跟着镜头看看空间的实际状态。',
                caption: '沿镜头查看空间，细节以现场为准。',
                evidence: '仅根据提供的画面，不推断面积和朝向。',
              })),
            }),
          },
          finish_reason: 'stop',
        },
      ],
    }),
  );
}
before(() => {
  process.chdir(isolated);
  symlinkSync(
    resolve(original, 'node_modules'),
    resolve(isolated, 'node_modules'),
  );
  copyFileSync(
    resolve(original, 'package.json'),
    resolve(isolated, 'package.json'),
  );
  mkdirSync(resolve(isolated, 'public/demo'), { recursive: true });
  globalThis.fetch = mockFetch;
  delete process.env.DASHSCOPE_API_KEY;
  delete process.env.DASHSCOPE_WORKSPACE_ID;
  return sharp({
    create: { width: 32, height: 48, channels: 3, background: '#aabbcc' },
  })
    .jpeg()
    .toFile(resolve(isolated, 'public/demo/living.jpg'))
    .then(() => import('./copy'))
    .then((value) => {
      service = value;
    });
});
after(() => {
  globalThis.fetch = oldFetch;
  if (oldKey === undefined) delete process.env.DASHSCOPE_API_KEY;
  else process.env.DASHSCOPE_API_KEY = oldKey;
  if (oldWorkspace === undefined) delete process.env.DASHSCOPE_WORKSPACE_ID;
  else process.env.DASHSCOPE_WORKSPACE_ID = oldWorkspace;
  process.chdir(original);
  rmSync(isolated, { recursive: true, force: true });
});

test('missing config and missing free-quota acknowledgement cannot trigger a request', () => {
  assert.equal(
    copySubmissionSchema.safeParse({ input: photo, freeQuotaConfirmed: false })
      .success,
    false,
  );
  assert.equal(copySubmissionSchema.safeParse({ input: photo }).success, false);
  return assert
    .rejects(service.generateCopy(photo), /北京地域/)
    .then(() => assert.equal(requests.length, 0));
});
test('photo copy uses only resized local images, explicit JSON/non-thinking mode and exact grounded identities', () => {
  process.env.DASHSCOPE_API_KEY = 'sk-offline.copy-test-credential';
  process.env.DASHSCOPE_WORKSPACE_ID = 'offline';
  return service
    .generateCopy(photo)
    .then((result) => {
      assert.equal(result.model, COPY_MODEL);
      assert.equal(result.cached, false);
      assert.equal(result.items[0].id, 'living');
      const body = requests[0].body;
      assert.equal(body.enable_thinking, false);
      assert.equal(body.max_tokens, 8192);
      assert.deepEqual(body.response_format, { type: 'json_object' });
      assert.ok(JSON.stringify(body).includes('data:image/jpeg;base64,'));
      assert.ok(!JSON.stringify(body).includes('Authorization'));
      assert.equal(
        existsSync(resolve(isolated, 'data/house-tour-v2/cloud/budget.json')),
        false,
      );
      return service.generateCopy(photo);
    })
    .then((result) => {
      assert.equal(result.cached, true);
      assert.equal(requests.length, 1);
    });
});
test('fact and actual image-byte changes invalidate only the copy cache', () => {
  return service
    .generateCopy({ ...photo, facts: { ...photo.facts, name: '新房源' } })
    .then(() => {
      assert.equal(requests.length, 2);
      return sharp({
        create: { width: 32, height: 48, channels: 3, background: '#ccddee' },
      })
        .jpeg()
        .toFile(resolve(isolated, 'public/demo/living.jpg'));
    })
    .then(() => service.generateCopy(photo))
    .then(() => assert.equal(requests.length, 3));
});
test('untrusted output cannot invent numbers, change order or drop scene identities', () => {
  const item = {
    id: 'living',
    title: '看看空间',
    narration: '看看实际画面。',
    caption: '现场查看。',
    evidence: '画面有限。',
  };
  assert.throws(
    () =>
      service.parseCopyContent(
        JSON.stringify({ items: [{ ...item, id: 'other' }] }),
        photo,
      ),
    /顺序/,
  );
  assert.throws(
    () =>
      service.parseCopyContent(
        JSON.stringify({ items: [{ ...item, caption: '面积120平方米' }] }),
        photo,
      ),
    /未提供的数字/,
  );
  assert.throws(() => service.parseCopyContent('not json', photo));
  assert.throws(() =>
    copyInputSchema.parse({
      ...photo,
      scene: { id: 'x', src: 'https://evil.invalid/image.jpg' },
    }),
  );
});
test('provider quota errors remain visible, have no automatic retry and do not become cached success', () => {
  failure = true;
  const before = requests.length;
  return assert
    .rejects(
      service.generateCopy({
        ...photo,
        facts: { ...photo.facts, name: '额度失败样本' },
      }),
      /HTTP 429/,
    )
    .then(() => {
      assert.equal(requests.length, before + 1);
      failure = false;
      return service.generateCopy({
        ...photo,
        facts: { ...photo.facts, name: '额度失败样本' },
      });
    })
    .then((result) => assert.equal(result.cached, false));
});
test('video copy extracts two real frames per valid shot, excludes audio, and rejects invalid timing before network', () => {
  const name = `import-${'a'.repeat(64)}.mp4`;
  const path = resolve(isolated, 'data/uploads', name);
  return promisify(execFile)(
    'pnpm',
    [
      'exec',
      'remotion',
      'ffmpeg',
      '-v',
      'error',
      '-y',
      '-f',
      'lavfi',
      '-i',
      'nullsrc=s=32x48:r=30:d=6',
      '-c:v',
      'libx264',
      '-t',
      '6',
      path,
    ],
    { cwd: isolated },
  ).then(() => {
    const video: CopyInput = {
      kind: CopyKind.Video,
      materials: [],
      facts: { name: '样本', facts: '', price: '', extra: '' },
      house: {
        src: `/media/${name}`,
        poster: '/demo/living.jpg',
        name: '房屋.mp4',
        duration: 6,
        width: 32,
        height: 48,
        hasAudio: false,
      },
      shots: [
        { id: 'first', start: 0, end: 3 },
        { id: 'second', start: 3, end: 6 },
      ],
    };
    return service.generateCopy(video).then((result) => {
      assert.deepEqual(
        result.items.map((item) => item.id),
        ['first', 'second'],
      );
      const body = JSON.stringify(requests.at(-1)!.body);
      assert.equal((body.match(/data:image\/jpeg;base64,/g) ?? []).length, 4);
      assert.ok(!body.includes('input_audio'));
      const count = requests.length;
      return assert
        .rejects(
          service.generateCopy({
            ...video,
            shots: [{ id: 'first', start: 0, end: 7 }],
          }),
          /片段范围/,
        )
        .then(() => assert.equal(requests.length, count));
    });
  });
});

test('photo chapters in the unified editor use their own media references without a legacy house video', () => {
  process.env.DASHSCOPE_API_KEY = 'sk-offline.copy-test-credential';
  process.env.DASHSCOPE_WORKSPACE_ID = 'offline';
  const input: CopyInput = {
    kind: CopyKind.Video,
    facts: { name: '实拍验收', facts: '', price: '', extra: '' },
    house: null,
    materials: [
      {
        id: 'photo-source',
        kind: HouseMediaKind.Image,
        src: '/demo/living.jpg',
        name: '房源照片',
        duration: 30,
      },
    ],
    shots: [{ id: 'photo-shot', sourceId: 'photo-source', start: 0, end: 5 }],
  };
  return service
    .generateCopy(input)
    .then((result) => {
      assert.equal(result.items[0].id, 'photo-shot');
      assert.equal(
        (
          JSON.stringify(requests.at(-1)!.body).match(
            /data:image\/jpeg;base64,/g,
          ) ?? []
        ).length,
        1,
      );
      const count = requests.length;
      return assert
        .rejects(
          service.generateCopy({
            ...input,
            shots: [{ id: 'bad', sourceId: 'missing', start: 0, end: 5 }],
          }),
          /对应素材无效/,
        )
        .then(() => assert.equal(requests.length, count));
    })
    .finally(() => {
      delete process.env.DASHSCOPE_API_KEY;
      delete process.env.DASHSCOPE_WORKSPACE_ID;
    });
});

test('long chapters sample more actual frames, carry a writing brief and use duration-aware grounded prompts', () => {
  process.env.DASHSCOPE_API_KEY = 'sk-offline.copy-test-credential';
  process.env.DASHSCOPE_WORKSPACE_ID = 'offline';
  const name = `import-${'b'.repeat(64)}.mp4`;
  const path = resolve(isolated, 'data/uploads', name);
  return promisify(execFile)(
    'pnpm',
    [
      'exec',
      'remotion',
      'ffmpeg',
      '-v',
      'error',
      '-y',
      '-f',
      'lavfi',
      '-i',
      'nullsrc=s=32x48:r=30:d=20',
      '-c:v',
      'libx264',
      '-t',
      '20',
      path,
    ],
    { cwd: isolated },
  ).then(() => {
    const input: CopyInput = {
      kind: CopyKind.Video,
      brief: '自然带看，重点说明空间布局',
      facts: { name: '长片段', facts: '', price: '', extra: '' },
      materials: [],
      house: {
        src: `/media/${name}`,
        poster: '/demo/living.jpg',
        name: 'house.mp4',
        duration: 20,
        width: 32,
        height: 48,
        hasAudio: false,
      },
      shots: [{ id: 'long', start: 0, end: 20 }],
    };
    return service.generateCopy(input).then(() => {
      const body = JSON.stringify(requests.at(-1)!.body);
      assert.equal((body.match(/data:image\/jpeg;base64,/g) ?? []).length, 4);
      assert.ok(body.includes('原片时间'));
      assert.ok(body.includes('45-90字'));
      assert.ok(body.includes(input.brief!));
      for (const seconds of [2, 6, 20, 60, 600]) {
        const fractions = service.getCopyFrameFractions(seconds);
        assert.ok(fractions.length >= 2 && fractions.length <= 6);
        assert.ok(
          fractions.every(
            (n, index) =>
              n > 0 && n < 1 && (index === 0 || n > fractions[index - 1]),
          ),
        );
      }
    });
  });
});

test('generated copy cannot add unconfirmed property tags or overfill a short video chapter', () => {
  const item = {
    id: 'x',
    title: '看看实拍',
    narration: '跟着画面看看。',
    caption: '现场查看。',
    evidence: '画面依据。',
  };
  const warned = service.parseCopyContent(
    JSON.stringify({
      items: [{ ...item, id: 'living', caption: '毛坯房看过来' }],
    }),
    photo,
  );
  assert.ok(warned.warnings.some((warning) => warning.includes('毛坯')));
  const input: CopyInput = {
    kind: CopyKind.Video,
    facts: { name: '房源', facts: '', price: '', extra: '' },
    house: null,
    materials: [],
    shots: [{ id: 'x', start: 0, end: 5 }],
  };
  assert.throws(
    () =>
      service.parseCopyContent(
        JSON.stringify({ items: [{ ...item, caption: '客厅实景'.repeat(8) }] }),
        input,
      ),
    /可读长度/,
  );
  assert.equal(service.getCopyCaptionLimit(5), 24);
  assert.equal(service.getCopyCaptionLimit(20), 60);
  assert.equal(service.getCopyCaptionLimit(60), 100);
  assert.equal(
    service.fitCopyCaption(
      '先看看窗边的位置。再观察客厅与其他房间的通行关系。',
      24,
    ),
    '先看看窗边的位置。',
  );
});
