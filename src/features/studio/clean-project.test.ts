/** Asset swaps are reversible without overwriting later captions, cuts or ordering. */
import assert from 'node:assert/strict';
import test from 'node:test';
import {
  EMPTY_VIDEO_EDIT,
  HouseMediaKind,
  type ImportedVideo,
  type VideoEditProject,
} from '@/services/definition/video-edit';
import { applyCleanAssets } from './clean-project';
const clip: ImportedVideo = {
  src: '/media/source-00000000-0000-4000-8000-000000000001.mp4',
  poster: '/demo/bedroom.jpg',
  name: 'original',
  duration: 8,
  width: 1080,
  height: 1920,
  hasAudio: true,
  speechCaptions: [
    {
      id: 'voice',
      startMs: 1000,
      endMs: 3000,
      text: '完整讲解',
      timestampMs: null,
      confidence: null,
    },
  ],
};
const project: VideoEditProject = {
  ...EMPTY_VIDEO_EDIT,
  opening: clip,
  materials: [{ id: 'house', kind: HouseMediaKind.Video, video: clip }],
  shots: [
    {
      id: 'cut',
      sourceId: 'house',
      start: 1,
      end: 7,
      title: '标题',
      text: '字幕',
    },
  ],
};
test('cleaning and undo preserve source speech captions and all authored fields', () => {
  const cleaned = { ...clip, src: '/media/import-' + 'a'.repeat(64) + '.mp4' };
  const update = applyCleanAssets(project, [
    { originalSrc: clip.src, asset: cleaned, ranges: [] },
  ]);
  const next = { ...project, ...update.patch, name: '后来改的标题' };
  const restored = applyCleanAssets(next, update.undo);
  assert.deepEqual(
    { ...next, ...restored.patch },
    { ...project, name: '后来改的标题' },
  );
  assert.strictEqual(next.opening, clip);
  assert.deepEqual(next.shots, project.shots);
  assert.throws(
    () =>
      applyCleanAssets({ ...project, materials: [] }, [
        { originalSrc: clip.src, asset: cleaned, ranges: [] },
      ]),
    /已变化/,
  );
});
