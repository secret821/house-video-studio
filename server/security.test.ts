/** Rendering must never turn user-controlled asset paths into arbitrary file or URL access. */
import assert from 'node:assert/strict';
import test from 'node:test';

import {
  EMPTY_PROJECT,
  OpeningSource,
  Motion,
  mediaPathSchema,
  sceneSchema,
  audioSchema,
  projectSchema,
  openingInputSchema,
} from '../src/services/definition/project';

import { resolveAsset, validateAssets } from './media';
import { parseProxyCopy } from './model-proxy';

test('asset boundary rejects remote URLs, traversal and executable uploads', () => {
  [
    'http://localhost/private.jpg',
    'file:///etc/passwd',
    '/media/../secret.jpg',
    '/demo/a.svg',
    '/demo/%2e%2e.jpg',
    '/media/a.jpg?x=1',
  ].forEach((path) =>
    assert.equal(mediaPathSchema.safeParse(path).success, false),
  );
});
test('image and audio contracts cannot be swapped by imported configuration', () => {
  assert.equal(
    audioSchema.safeParse({
      src: '/demo/living.jpg',
      duration: 5,
      name: 'wrong',
      text: null,
    }).success,
    false,
  );
  assert.equal(
    sceneSchema.safeParse({
      id: 'test',
      src: '/demo/music.wav',
      title: '',
      narration: '',
      seconds: 5,
      motion: Motion.Push,
      voiceover: null,
    }).success,
    false,
  );
});
test('rendering an empty project fails explicitly', () => {
  assert.throws(() => validateAssets(EMPTY_PROJECT), /至少一张/);
});
test('missing local files fail before spawning the browser', () => {
  assert.throws(() => resolveAsset('/media/nonexistent.jpg'), /素材不存在/);
});
test('stale synthesized speech is rejected', () => {
  assert.throws(
    () =>
      validateAssets({
        ...EMPTY_PROJECT,
        scenes: [
          {
            id: 'test',
            src: '/demo/living.jpg',
            title: '客厅',
            narration: '新解说',
            seconds: 5,
            motion: Motion.Push,
            voiceover: {
              src: '/demo/music.wav',
              duration: 16,
              name: '旧解说',
              text: '旧解说',
            },
          },
        ],
      }),
    /重新生成配音/,
  );
});

test('old photo drafts remain compatible; opening rejects remote faces and blank scripts', () => {
  const legacy = { ...EMPTY_PROJECT };
  Reflect.deleteProperty(legacy, 'opening');
  assert.equal(projectSchema.parse(legacy).opening, null);
  assert.equal(
    openingInputSchema.safeParse({
      photo: 'https://example.com/person.jpg',
      script: '你好',
      voiceover: null,
    }).success,
    false,
  );
  assert.equal(
    openingInputSchema.safeParse({
      photo: '/media/person.jpg',
      script: '   ',
      voiceover: null,
    }).success,
    false,
  );
  assert.throws(
    () =>
      validateAssets({
        ...EMPTY_PROJECT,
        scenes: [
          {
            id: 'one',
            src: '/demo/living.jpg',
            title: '',
            narration: '',
            seconds: 5,
            motion: Motion.Push,
            voiceover: null,
          },
        ],
        opening: {
          photo: '/demo/living.jpg',
          script: '你好',
          voiceover: null,
          clip: null,
        },
      }),
    /尚未就绪/,
  );
});

test('opening keeps the exact script so whitespace does not prevent result recovery', () => {
  const input = openingInputSchema.parse({
    photo: '/media/person.jpg',
    script: '  大家好。\n',
    voiceover: null,
  });
  assert.equal(input.script, '  大家好。\n');
});

test('proxy copy cannot reorder, duplicate, or inject additional scene identities', () => {
  const ids = Array.from({ length: 8 }, (_, index) => `scene-${index}`);
  const scenes = ids.map((id) => ({
    id,
    title: '实拍空间',
    narration: '仅描述可见的空间。',
  }));
  const valid = { opening: '今天从院子看起。', scenes };
  assert.equal(parseProxyCopy(JSON.stringify(valid), ids).scenes.length, 8);
  assert.throws(
    () =>
      parseProxyCopy(
        JSON.stringify({ ...valid, scenes: [...scenes].reverse() }),
        ids,
      ),
    /标识或顺序/,
  );
  assert.throws(
    () =>
      parseProxyCopy(
        JSON.stringify({
          ...valid,
          scenes: [...scenes.slice(0, 7), scenes[0]],
        }),
        ids,
      ),
    /标识或顺序/,
  );
  assert.throws(() =>
    parseProxyCopy(
      JSON.stringify({ ...valid, scenes: [...scenes, scenes[0]] }),
      ids,
    ),
  );
});

test('legacy drafts accept independent subtitles without invalidating matching narration', () => {
  const scene = sceneSchema.parse({
    id: 'caption-only',
    src: '/demo/living.jpg',
    title: '客厅',
    narration: '已有解说',
    seconds: 5,
    motion: Motion.Push,
    voiceover: {
      src: '/demo/music.wav',
      duration: 16,
      name: '旧声音',
      text: '已有解说',
    },
  });
  assert.equal(scene.caption, undefined);
  validateAssets({
    ...EMPTY_PROJECT,
    scenes: [{ ...scene, caption: '仅改显示文案' }],
  });
  assert.equal(
    projectSchema.parse({ ...EMPTY_PROJECT, scenes: [scene] }).scenes[0]
      .voiceover?.text,
    '已有解说',
  );
});

// Upload provenance survives draft round-trips; legacy generated openings remain distinguishable.
test('uploaded opening videos round-trip without a portrait or speech script, while legacy drafts remain compatible', () => {
  const opening = {
    photo: null,
    script: '',
    voiceover: null,
    clip: {
      src: '/media/import-video.mp4',
      duration: 60,
      width: 540,
      height: 960,
    },
  };
  const uploaded = projectSchema.parse({
    ...EMPTY_PROJECT,
    opening: { ...opening, source: OpeningSource.Upload },
  });
  assert.equal(
    projectSchema.parse(JSON.parse(JSON.stringify(uploaded))).opening?.source,
    OpeningSource.Upload,
  );
  assert.equal(uploaded.opening?.script, '');
  assert.equal(
    projectSchema.parse({ ...EMPTY_PROJECT, opening }).opening?.source,
    undefined,
  );
  assert.equal(
    projectSchema.safeParse({
      ...uploaded,
      opening: {
        ...uploaded.opening,
        clip: { ...opening.clip, duration: 60.1 },
      },
    }).success,
    false,
  );
});
