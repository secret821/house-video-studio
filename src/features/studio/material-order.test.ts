/** Long moves must preserve every shot's text, timing, original sound settings and intervening order. */
import assert from 'node:assert/strict';
import test from 'node:test';

import {
  EMPTY_VIDEO_EDIT,
  HouseMediaKind,
  type HouseMaterial,
  type VideoEditProject,
} from '@/services/definition/video-edit';

import { reorderHouseMaterials } from './material-order';

const project: VideoEditProject = {
  ...EMPTY_VIDEO_EDIT,
  materials: ['a', 'b', 'c', 'd'].map<HouseMaterial>((id) => {
    if (id === 'c')
      return {
        id,
        kind: HouseMediaKind.Video,
        video: {
          src: '/media/source-00000000-0000-4000-8000-000000000001.mp4',
          poster: '/demo/bedroom.jpg',
          name: '保留原声的视频',
          duration: 5,
          width: 1080,
          height: 1920,
          hasAudio: true,
        },
      };
    return {
      id,
      kind: HouseMediaKind.Image,
      src: '/demo/living.jpg',
      name: id,
      duration: 5,
    };
  }),
  shots: ['a', 'a', 'b', 'c', 'd'].map((sourceId, index) => ({
    id: `shot-${index}`,
    sourceId,
    start: 0,
    end: 5,
    title: sourceId,
    text: `已确认的文案${index}`,
  })),
};

test('drag first material to last inserts it without swapping or changing authored shot data', () => {
  const snapshot = structuredClone(project);
  const result = reorderHouseMaterials(project, { from: 0, to: 3 });
  assert.deepEqual(
    result.materials.map(({ id }) => id),
    ['b', 'c', 'd', 'a'],
  );
  assert.deepEqual(
    result.shots.map(({ id }) => id),
    ['shot-2', 'shot-3', 'shot-4', 'shot-0', 'shot-1'],
  );
  for (const shot of result.shots)
    assert.deepEqual(
      shot,
      snapshot.shots.find(({ id }) => id === shot.id),
    );
  assert.deepEqual(project, snapshot);
});

test('backward drag keeps intervening items and all clip settings', () => {
  const result = reorderHouseMaterials(project, { from: 3, to: 1 });
  assert.deepEqual(
    result.materials.map(({ id }) => id),
    ['a', 'd', 'b', 'c'],
  );
  assert.equal(result.shots.length, project.shots.length);
  assert.deepEqual(
    reorderHouseMaterials(project, { from: 2, to: 2 }).materials,
    project.materials,
  );
  assert.throws(
    () => reorderHouseMaterials(project, { from: 0, to: 4 }),
    RangeError,
  );
  assert.throws(
    () => reorderHouseMaterials(project, { from: -1, to: 0 }),
    RangeError,
  );
});
