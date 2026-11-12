/** Real speech timing follows source cuts; decorative copy and silent covers do not move it. */
import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  videoEditSchema,
  videoEditDraftSchema,
  EMPTY_VIDEO_EDIT,
  HouseMediaKind,
  type VideoEditProject,
  type ImportedVideo,
} from '../../src/services/definition/video-edit';
import { CoverStyle } from '../../src/services/definition/project';
import {
  speechCaptionsSchema,
  type SpeechCaption,
} from '../../src/services/definition/subtitles';
import {
  getVideoEditTimeline,
  getVideoGraphicFrames,
} from '../../src/video/video-edit-timeline';
import { getSubtitleFrames } from '../../src/video/video-subtitles';

const cue = (id: string, startMs: number, endMs: number): SpeechCaption => ({
  id,
  text: '这个是大厅啊',
  startMs,
  endMs,
  timestampMs: null,
  confidence: null,
});
const clip: ImportedVideo = {
  src: `/media/import-${'a'.repeat(64)}.mp4`,
  poster: '/demo/living.jpg',
  duration: 10,
  width: 1080,
  height: 1920,
  hasAudio: true,
  name: '原片',
};
/** Keep exactly the same two original clips while testing cover offsets, cuts and render modes. */
function project(): VideoEditProject {
  return {
    ...EMPTY_VIDEO_EDIT,
    subtitlesEnabled: true,
    opening: {
      ...clip,
      duration: 3,
      speechCaptions: [cue('opening', 500, 2000)],
    },
    materials: [
      {
        id: 'house',
        kind: HouseMediaKind.Video,
        video: {
          ...clip,
          speechCaptions: [
            cue('cut-left', 1000, 2500),
            cue('middle', 3000, 4000),
            cue('cut-right', 4500, 6000),
          ],
        },
      },
    ],
    shots: [
      {
        id: 'shot',
        sourceId: 'house',
        start: 2,
        end: 5,
        title: '房屋实拍',
        text: '原有文案',
      },
    ],
  };
}
test('cover stays silent; opening and trimmed house captions use the same source positions as audio', () => {
  const value = project();
  const timeline = getVideoEditTimeline(value);
  const frames = getSubtitleFrames(value, timeline);
  assert.deepEqual(
    frames.map(({ from, to }) => [from, to]),
    [
      [51, 96],
      [126, 141],
      [156, 186],
      [201, 216],
    ],
  );
  assert.ok(frames.every((item) => item.from >= timeline.coverFrames));
  assert.equal(timeline.frames, 216);
});
test('sparse native graphics includes each caption enter/exit, including the opening and final closing layer', () => {
  const value = project();
  const timeline = getVideoEditTimeline(value);
  const samples = new Set(getVideoGraphicFrames(value));
  getSubtitleFrames(value, timeline).forEach((item) => {
    assert.ok(samples.has(item.from));
    if (item.to < timeline.frames) assert.ok(samples.has(item.to));
  });
});
test('repeated sources do not leak subtitles; muted playback retains text with one caption at a time', () => {
  const value = project();
  value.shots.push({ ...value.shots[0], id: 'repeat', start: 6, end: 8 });
  const frames = getSubtitleFrames(value, getVideoEditTimeline(value));
  assert.equal(
    frames.length,
    4,
    'a silent portion of a reused source has no stale captions',
  );
  value.openingVolume = 0;
  value.houseVolume = 0;
  const muted = getSubtitleFrames(value, getVideoEditTimeline(value));
  assert.equal(muted.length, 4);
  muted.forEach((item, index) => {
    if (index > 0) assert.ok(item.from >= muted[index - 1].to);
  });
  value.subtitlesEnabled = false;
  assert.deepEqual(getSubtitleFrames(value, getVideoEditTimeline(value)), []);
});
test('cover versions keep old drafts readable and select the new layout by default', () => {
  const oldDraft = { ...EMPTY_VIDEO_EDIT, coverStyle: undefined };
  assert.equal(videoEditDraftSchema.parse(oldDraft).coverStyle, CoverStyle.New);
  assert.equal(
    videoEditDraftSchema.parse({ ...oldDraft, coverStyle: CoverStyle.Original })
      .coverStyle,
    CoverStyle.Original,
  );
  assert.equal(
    videoEditDraftSchema.safeParse({ ...oldDraft, coverStyle: 'unknown' })
      .success,
    false,
  );
});
test('old drafts remain valid; invalid, overlapping and out-of-range captions are blocked', () => {
  assert.equal(videoEditSchema.safeParse(EMPTY_VIDEO_EDIT).success, true);
  assert.equal(
    speechCaptionsSchema.safeParse([cue('a', 0, 1000), cue('b', 900, 1200)])
      .success,
    false,
  );
  assert.equal(
    speechCaptionsSchema.safeParse([
      cue('same', 0, 1000),
      cue('same', 1000, 1200),
    ]).success,
    false,
  );
  const value = project();
  value.opening!.speechCaptions = [cue('long', 0, 4000)];
  assert.equal(videoEditSchema.safeParse(value).success, false);
  assert.equal(
    videoEditSchema.safeParse({
      ...project(),
      opening: { ...clip, speechCaptions: [] },
    }).success,
    true,
  );
});
