/** Browser-only JSON drafts must survive refresh, report expiry, and reject stale-account writes. */
import assert from 'node:assert/strict';
import test from 'node:test';
import { z } from 'zod';
import { authApi } from './auth-api';
import {
  BrowserDraftKind,
  readBrowserDraft,
  saveBrowserDraft,
} from './browser-draft';

import {
  EMPTY_VIDEO_EDIT,
  HouseMediaKind,
  type ImportedVideo,
} from '@/services/definition/video-edit';
import {
  getPendingSpeechVideos,
  updateSpeechCaptions,
} from './speech-subtitles';

test('drafts stay in the account browser namespace; expired media and failed storage never become successful saves', (context) => {
  const values = new Map<string, string>();
  const original = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  let denied = false;
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => {
        if (denied) throw new Error('quota denied');
        values.set(key, value);
      },
    },
  });
  const session = {
    enabled: true,
    authenticated: true,
    username: 'first',
    workspaceId: 'first-id',
    temporaryMedia: true,
    mediaRetentionMs: 7200000,
    mediaSessionId: 'epoch-one',
  };
  context.mock.method(authApi, 'getSession', () =>
    Promise.resolve({ ...session }),
  );
  const schema = z.object({ name: z.string() });
  return saveBrowserDraft(BrowserDraftKind.Video, schema, {
    name: 'first private draft',
  })
    .then(() => readBrowserDraft(BrowserDraftKind.Video, schema))
    .then((draft) => {
      assert.deepEqual(draft, {
        project: { name: 'first private draft' },
        mediaExpired: false,
      });
      assert.equal(values.size, 1);
      assert.ok(values.has('house-studio:draft:first-id:video'));
      session.mediaSessionId = 'epoch-two';
      return readBrowserDraft(BrowserDraftKind.Video, schema);
    })
    .then((draft) => {
      assert.equal(draft.mediaExpired, true);
      denied = true;
      return assert.rejects(
        saveBrowserDraft(BrowserDraftKind.Video, schema, {
          name: 'quota lost',
        }),
        /quota denied/,
      );
    })
    .then(() => {
      denied = false;
      session.workspaceId = 'second-id';
      return assert.rejects(
        saveBrowserDraft(BrowserDraftKind.Video, schema, {
          name: 'stale first page',
        }),
        /登录账号已变化/,
      );
    })
    .then(() => {
      assert.equal(values.size, 1);
      assert.match([...values.values()][0], /first private draft/);
      assert.doesNotMatch(
        [...values.values()][0],
        /stale first page|quota lost/,
      );
    })
    .finally(() => {
      if (original) Object.defineProperty(globalThis, 'localStorage', original);
      else Reflect.deleteProperty(globalThis, 'localStorage');
    });
});

const speechClip: ImportedVideo = {
  src: '/media/source-00000000-0000-4000-8000-000000000001.mp4',
  poster: '/demo/living.jpg',
  name: 'speech.mp4',
  duration: 6,
  width: 720,
  height: 1280,
  hasAudio: true,
};
const speechCues = [
  {
    id: 'cue',
    text: '这是一条原声字幕',
    startMs: 200,
    endMs: 1800,
    timestampMs: null,
    confidence: null,
  },
];

test('speech caption updates preserve existing copy, display choice, edits and source timing', () => {
  const house = {
    ...speechClip,
    src: '/media/source-00000000-0000-4000-8000-000000000002.mp4',
  };
  const project = {
    ...EMPTY_VIDEO_EDIT,
    opening: speechClip,
    facts: '原有房源信息',
    shots: [
      {
        id: 'existing-copy',
        start: 0,
        end: 3,
        title: '客厅',
        text: '原来的镜头文案',
      },
    ],
    materials: [
      { id: 'house', kind: HouseMediaKind.Video as const, video: house },
      {
        id: 'photo',
        kind: HouseMediaKind.Image as const,
        src: '/demo/living.jpg',
        name: 'photo',
        duration: 3,
      },
      {
        id: 'silent',
        kind: HouseMediaKind.Video as const,
        video: { ...house, hasAudio: false },
      },
    ],
  };
  assert.equal(getPendingSpeechVideos(project).length, 2);
  const next = updateSpeechCaptions(project, {
    src: house.src,
    captions: speechCues,
    onlyMissing: true,
  });
  assert.equal(next.opening?.speechCaptions, undefined);
  assert.equal(next.subtitlesEnabled, undefined);
  assert.equal(next.shots, project.shots);
  assert.equal(next.facts, project.facts);
  assert.equal(next.music, project.music);
  assert.equal(next.openingVolume, project.openingVolume);
  assert.equal(next.houseVolume, project.houseVolume);
  assert.equal(project.opening.speechCaptions, undefined);
  assert.equal(next.shots[0].text, '原来的镜头文案');
  assert.equal(getPendingSpeechVideos(next).length, 1);
  const edited = updateSpeechCaptions(next, {
    src: house.src,
    captions: [{ ...speechCues[0], text: '人工改过的字幕' }],
    onlyMissing: false,
  });
  assert.equal(
    updateSpeechCaptions(edited, {
      src: house.src,
      captions: speechCues,
      onlyMissing: true,
    }),
    edited,
  );
  assert.equal(
    updateSpeechCaptions(edited, {
      src: '/media/removed.mp4',
      captions: speechCues,
      onlyMissing: true,
    }),
    edited,
  );
  assert.equal(
    next.materials[0].kind === HouseMediaKind.Video &&
      next.materials[0].video.speechCaptions?.[0].endMs,
    1800,
  );
});

test('empty speech captions preserve a disabled subtitle display', () => {
  const project = {
    ...EMPTY_VIDEO_EDIT,
    opening: speechClip,
    subtitlesEnabled: false,
  };
  const skipped = updateSpeechCaptions(project, {
    src: speechClip.src,
    captions: [],
    onlyMissing: true,
  });
  assert.deepEqual(getPendingSpeechVideos(skipped), []);
  assert.equal(skipped.subtitlesEnabled, false);
  assert.equal(
    updateSpeechCaptions(skipped, {
      src: speechClip.src,
      captions: speechCues,
      onlyMissing: true,
    }),
    skipped,
  );
});
