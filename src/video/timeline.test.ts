/** Behavioral timing checks protect spoken audio and crossfade duration. */
import assert from 'node:assert/strict';
import test from 'node:test';

import {
  EMPTY_PROJECT,
  FPS,
  projectSchema,
  Motion,
  Transition,
  type Scene,
} from '../services/definition/project';

import { getCaptionLines, getSceneFrames, getTimeline } from './timeline';

const scene: Scene = {
  id: 'test',
  src: '/demo/living.jpg',
  title: '客厅',
  narration: '客厅介绍',
  seconds: 5,
  motion: Motion.Push,
  voiceover: null,
};
test('crossfade overlaps subtract from total duration; hard cuts do not', () => {
  const project = {
    ...EMPTY_PROJECT,
    scenes: [scene, { ...scene, id: 'next' }],
  };
  assert.equal(getTimeline(project).frames, 285);
  assert.equal(
    getTimeline({ ...project, transition: Transition.Cut }).frames,
    300,
  );
});
test('spoken audio finishes before next narration starts at the longest transition', () => {
  const voiced = {
    ...scene,
    voiceover: {
      src: '/media/test.wav',
      name: '解说',
      text: scene.narration,
      duration: 10,
    },
  };
  const timeline = getTimeline({
    ...EMPTY_PROJECT,
    transitionSeconds: 0.8,
    scenes: [voiced, { ...voiced, id: 'next' }],
  });
  const speechEnd = 0.4 * FPS + voiced.voiceover.duration * FPS;
  const nextSpeechStart = timeline.scenes[1].start + 0.4 * FPS;
  assert.ok(speechEnd <= nextSpeechStart);
  assert.equal(getSceneFrames(voiced), 336);
});
test('captions retain the script and keep individual lines short', () => {
  const text = '今天带你看看这套房。先从客厅开始，看看房间的真实布局。';
  const lines = getCaptionLines(text);
  assert.equal(lines.join(''), text);
  assert.ok(lines.every((line) => line.length <= 24));
});

test('talking opening plays in full before photo speech, without transition overlap', () => {
  const opening = {
    photo: '/demo/living.jpg',
    script: '开场',
    voiceover: null,
    clip: {
      src: '/media/opening.mp4',
      duration: 8.13,
      width: 960,
      height: 1400,
    },
  };
  const timeline = getTimeline({
    ...EMPTY_PROJECT,
    opening,
    scenes: [scene, { ...scene, id: 'next' }],
  });
  assert.equal(timeline.openingFrames, 244);
  assert.equal(timeline.scenes[0].start, 244);
  assert.equal(timeline.frames, 529);
  assert.equal(getTimeline({ ...EMPTY_PROJECT, opening }).frames, 244);
});

test('watermark defaults on legacy photo drafts, permits custom or empty text and rejects multiline or oversized input', () => {
  const legacy = { ...EMPTY_PROJECT, watermark: undefined };
  assert.equal(projectSchema.parse(legacy).watermark, '青连实拍');
  assert.equal(
    projectSchema.parse({ ...legacy, watermark: ' 自定义水印 ' }).watermark,
    '自定义水印',
  );
  assert.equal(projectSchema.parse({ ...legacy, watermark: '' }).watermark, '');
  for (const watermark of ['水印\n换行', '字'.repeat(21)])
    assert.equal(
      projectSchema.safeParse({ ...legacy, watermark }).success,
      false,
    );
});
