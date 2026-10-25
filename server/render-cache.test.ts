/** Offline cache-dependency tests: local edits must not spend cloud credits or invalidate unrelated ranges. */
import assert from 'node:assert/strict';
import test from 'node:test';

import {
  EMPTY_PROJECT,
  Motion,
  OpeningSource,
  Transition,
  type Project,
} from '../src/services/definition/project';
import { getTimeline } from '../src/video/timeline';

import { planSegments } from './render-cache';

const project: Project = {
  ...EMPTY_PROJECT,
  opening: {
    photo: '/demo/living.jpg',
    script: '开场',
    voiceover: null,
    clip: {
      src: '/media/opening.mp4',
      duration: 4.3667,
      width: 720,
      height: 1048,
    },
  },
  scenes: Array.from({ length: 4 }, (_, index) => ({
    id: `room-${index}`,
    src: '/demo/living.jpg',
    title: `房间${index}`,
    narration: `房间${index}的介绍。`,
    motion: Motion.Push,
    seconds: 3,
    voiceover: {
      src: '/demo/music.wav',
      duration: 1,
      name: '录音',
      text: null,
    },
  })),
};
const identity = { template: 'test-v1', asset: (src: string) => src };

/** Return exactly which cached parts change; scene labels are only a human-readable diagnostic. */
function changed(next: Project) {
  const before = new Set(
    planSegments(project, identity).map((segment) => segment.key),
  );
  return planSegments(next, identity).filter(
    (segment) => !before.has(segment.key),
  );
}

test('frame ranges cover every preview frame exactly once, including non-round opening and fades', () => {
  for (const transition of [Transition.Fade, Transition.Cut]) {
    const draft = { ...project, transition, transitionSeconds: 0.8 };
    const segments = planSegments(draft, identity);
    let cursor = 0;
    for (const segment of segments) {
      assert.equal(segment.start, cursor);
      assert.ok(segment.end >= segment.start);
      cursor = segment.end + 1;
    }
    assert.equal(cursor, getTimeline(draft).frames);
  }
});
test('editing one interior caption rebuilds only its own frames and the two adjacent fades', () => {
  const next = structuredClone(project);
  next.scenes[1].caption = '新的字幕，不修改声音。';
  assert.deepEqual(next.scenes[1].voiceover, project.scenes[1].voiceover);
  const invalidated = changed(next);
  assert.equal(invalidated.length, 3);
  assert.ok(
    invalidated.every((segment) => segment.sceneIds.includes('room-1')),
  );
  assert.ok(
    invalidated.every((segment) => !segment.sceneIds.includes('room-3')),
  );
});
test('hard cuts require only the edited photo to render', () => {
  const before = { ...project, transition: Transition.Cut };
  const next = structuredClone(before);
  next.scenes[1].title = '新标题';
  const keys = new Set(
    planSegments(before, identity).map((segment) => segment.key),
  );
  assert.equal(
    planSegments(next, identity).filter((segment) => !keys.has(segment.key))
      .length,
    1,
  );
});
test('length changes preserve later photo ranges when there is no global music', () => {
  const next = structuredClone(project);
  next.scenes[1].seconds = 6;
  const invalidated = changed(next);
  assert.equal(invalidated.length, 3);
  assert.ok(
    invalidated.every((segment) => segment.sceneIds.includes('room-1')),
  );
});
test('music positions invalidate shifted later ranges, but preserve the original opening', () => {
  const before = {
    ...project,
    music: { src: '/demo/music.wav', name: '音乐', text: null, duration: 20 },
  };
  const next = structuredClone(before);
  next.scenes[1].seconds = 6;
  const keys = new Set(
    planSegments(before, identity).map((segment) => segment.key),
  );
  const invalidated = planSegments(next, identity).filter(
    (segment) => !keys.has(segment.key),
  );
  assert.equal(invalidated.length, 6);
  assert.ok(invalidated.every((segment) => segment.sceneIds.length > 0));
});
test('reordering keeps unchanged interiors and opening, but updates new neighboring transitions', () => {
  const next = structuredClone(project);
  [next.scenes[1], next.scenes[2]] = [next.scenes[2], next.scenes[1]];
  assert.equal(changed(next).length, 3);
  assert.ok(changed(next).every((segment) => segment.sceneIds.length === 2));
});
test('output format, template code and actual media bytes invalidate dependent cached parts', () => {
  assert.equal(changed({ ...project, name: '新房源标题' }).length, 7);
  const before = new Set(
    planSegments(project, identity).map((segment) => segment.key),
  );
  assert.equal(
    planSegments(project, { ...identity, template: 'new-template' }).filter(
      (segment) => !before.has(segment.key),
    ).length,
    8,
  );
  assert.equal(
    planSegments(project, {
      ...identity,
      asset: (src) => (src.endsWith('opening.mp4') ? 'changed bytes' : src),
    }).filter((segment) => !before.has(segment.key)).length,
    1,
  );
});
test('unchanged repeat export reuses all keys, and opening-only projects have one valid range', () => {
  assert.deepEqual(changed(structuredClone(project)), []);
  const segments = planSegments({ ...project, scenes: [] }, identity);
  assert.equal(segments.length, 1);
  assert.equal(
    segments[0].end + 1,
    getTimeline({ ...project, scenes: [] }).frames,
  );
});

test('clearing an override or copying the narration back restores original cache keys', () => {
  const next = structuredClone(project);
  next.scenes[1].caption = '';
  assert.deepEqual(changed(next), []);
  next.scenes[1].caption = next.scenes[1].narration;
  assert.deepEqual(changed(next), []);
});

// Changing provenance changes visible opening overlays and must not reuse that cached video range.
test('switching an opening from generated to uploaded invalidates only its own cached range', () => {
  const next = structuredClone(project);
  next.opening!.source = OpeningSource.Upload;
  const invalidated = changed(next);
  assert.equal(invalidated.length, 1);
  assert.equal(invalidated[0].label, '人物开场');
  assert.equal(invalidated[0].start, 0);
});
