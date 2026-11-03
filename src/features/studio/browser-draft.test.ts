/** Server draft metadata and legacy JSON compatibility preserve authored project contents. */
import assert from 'node:assert/strict';
import test from 'node:test';
import { authApi } from './auth-api';
import videoApi from './video-edit-api';
import {
  EMPTY_PROJECT,
  projectDraftSchema,
  projectSchema,
} from '@/services/definition/project';
import { readLegacyBrowserDraft } from './browser-draft';
import { readServerDraft, saveServerDraft } from './server-draft-api';
import { randomUUID } from 'node:crypto';
import { DraftKind } from '@/services/definition/project';

import {
  EMPTY_VIDEO_EDIT,
  videoEditSchema,
  videoEditDraftSchema,
  HouseMediaKind,
  type ImportedVideo,
} from '@/services/definition/video-edit';
import {
  getPendingSpeechVideos,
  updateSpeechCaptions,
} from './speech-subtitles';

test('new video drafts acquire the default score before returning a fresh project; unavailable music rejects instead of silently creating a muted draft', (context) => {
  const music = {
    src: '/media/original-felt-piano-v1.wav',
    duration: 64,
    name: '默认轻钢琴',
    text: null,
  };
  const requestMusic = context.mock.method(videoApi, 'getOriginalMusic', () =>
    Promise.resolve(music),
  );
  return videoApi.createDraft().then((first) =>
    videoApi.createDraft().then((second) => {
      assert.equal(requestMusic.mock.callCount(), 2);
      assert.deepEqual(first.music, music);
      assert.equal(first.musicVolume, 0.4);
      assert.notEqual(first.sessionId, second.sessionId);
      assert.deepEqual(first.materials, []);
      assert.equal(first.opening, null);
      assert.equal(first.house, null);
      requestMusic.mock.mockImplementation(() =>
        Promise.reject(new Error('默认音乐准备失败')),
      );
      return assert.rejects(videoApi.createDraft(), /默认音乐准备失败/);
    }),
  );
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

test('unfinished titles are saved in draft contracts while export contracts still reject them', () => {
  assert.equal(
    projectDraftSchema.parse({ ...EMPTY_PROJECT, name: '' }).name,
    '',
  );
  assert.equal(
    videoEditDraftSchema.parse({ ...EMPTY_VIDEO_EDIT, name: '' }).name,
    '',
  );
  assert.equal(
    projectSchema.safeParse({ ...EMPTY_PROJECT, name: '' }).success,
    false,
  );
  assert.equal(
    videoEditSchema.safeParse({ ...EMPTY_VIDEO_EDIT, name: '' }).success,
    false,
  );
});

test('pending original-speech edits survive drafts without enabling or replacing rendered subtitles', () => {
  const project = {
    ...EMPTY_VIDEO_EDIT,
    opening: { ...speechClip, speechCaptions: speechCues },
    subtitlesEnabled: false,
  };
  const staged = updateSpeechCaptions(project, {
    src: speechClip.src,
    captions: [{ ...speechCues[0], text: '' }],
    onlyMissing: false,
    draftOnly: true,
  });
  const saved = videoEditDraftSchema.parse(staged);
  assert.equal(saved.opening?.speechDraft?.[0].text, '');
  assert.deepEqual(saved.opening?.speechCaptions, speechCues);
  assert.equal(saved.subtitlesEnabled, false);
  const adopted = updateSpeechCaptions(staged, {
    src: speechClip.src,
    captions: [{ ...speechCues[0], text: '校对后的文字' }],
    onlyMissing: false,
  });
  assert.equal(adopted.opening?.speechDraft, undefined);
  assert.equal(adopted.opening?.speechCaptions?.[0].text, '校对后的文字');
});

test('a server draft is authoritative, music-free settings stay off, and media is never fetched for saving', (context) => {
  const project = {
    ...EMPTY_VIDEO_EDIT,
    name: '服务器当前草稿',
    music: null,
    opening: speechClip,
  };
  let revision = randomUUID();
  let saved = project;
  context.mock.method(authApi, 'getSession', () =>
    Promise.resolve({ enabled: false, authenticated: false }),
  );
  const calls: string[] = [];
  context.mock.method(
    globalThis,
    'fetch',
    (path: string, init: RequestInit) => {
      calls.push(path);
      assert.ok(path.endsWith('/get-draft') || path.endsWith('/save-draft'));
      if (init.method === 'POST') {
        const body = JSON.parse(init.body as string);
        assert.equal(body.revision, revision);
        saved = body.project;
        revision = randomUUID();
      }
      return Promise.resolve(Response.json({ project: saved, revision }));
    },
  );
  return videoApi
    .getDraft()
    .then(({ project: restored }) => {
      assert.equal(restored.name, project.name);
      assert.equal(restored.music, null);
      return videoApi.saveDraft({ ...restored, name: '修改后保存' });
    })
    .then(() => {
      assert.equal(saved.name, '修改后保存');
      assert.equal(calls.length, 2);
      assert.ok(calls.every((path) => !path.startsWith('/media/')));
    });
});

test('server save writers are serialized and use the acknowledged revision, without sending any video body', (context) => {
  let revision: string | null = null;
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  const posted: Array<{
    project: typeof EMPTY_VIDEO_EDIT;
    revision: string | null;
  }> = [];
  context.mock.method(
    globalThis,
    'fetch',
    (path: string, init: RequestInit) => {
      if (init.method !== 'POST')
        return Promise.resolve(Response.json({ project: null, revision }));
      const body = JSON.parse(init.body as string);
      posted.push(body);
      const commit = () => {
        assert.equal(body.revision, revision);
        revision = randomUUID();
        return Response.json({ project: body.project, revision });
      };
      return posted.length === 1
        ? gate.then(commit)
        : Promise.resolve(commit());
    },
  );
  return readServerDraft(DraftKind.Video, videoEditDraftSchema)
    .then(() => {
      const first = saveServerDraft(DraftKind.Video, videoEditDraftSchema, {
        ...EMPTY_VIDEO_EDIT,
        name: '较早修改',
      });
      const second = saveServerDraft(DraftKind.Video, videoEditDraftSchema, {
        ...EMPTY_VIDEO_EDIT,
        name: '最新修改',
        opening: speechClip,
      });
      return new Promise<void>((resolve) => setImmediate(resolve)).then(() => {
        assert.equal(posted.length, 1);
        assert.equal(typeof posted[0].project, 'object');
        release();
        return Promise.all([first, second]);
      });
    })
    .then(() => {
      assert.equal(posted.length, 2);
      assert.equal(posted[1].project.name, '最新修改');
      assert.equal(posted[1].project.opening?.src, speechClip.src);
      assert.equal(JSON.stringify(posted[1]).includes('base64'), false);
    });
});

test('failed saves reject visibly, preserve the old revision, and only an explicit retry sends again', (context) => {
  let calls = 0;
  const revision = randomUUID();
  context.mock.method(
    globalThis,
    'fetch',
    (_path: string, init: RequestInit) => {
      if (init.method !== 'POST')
        return Promise.resolve(
          Response.json({ project: EMPTY_VIDEO_EDIT, revision }),
        );
      calls++;
      assert.equal(JSON.parse(init.body as string).revision, revision);
      if (calls === 1)
        return Promise.resolve(
          Response.json(
            { message: '磁盘空间不足，草稿未保存' },
            { status: 507 },
          ),
        );
      return Promise.resolve(
        Response.json({
          project: JSON.parse(init.body as string).project,
          revision: randomUUID(),
        }),
      );
    },
  );
  return readServerDraft(DraftKind.Video, videoEditDraftSchema)
    .then(() =>
      assert.rejects(
        saveServerDraft(DraftKind.Video, videoEditDraftSchema, {
          ...EMPTY_VIDEO_EDIT,
          name: '新的编辑',
        }),
        /未保存/,
      ),
    )
    .then(() => {
      assert.equal(calls, 1);
      return saveServerDraft(DraftKind.Video, videoEditDraftSchema, {
        ...EMPTY_VIDEO_EDIT,
        name: '新的编辑',
      });
    })
    .then(() => assert.equal(calls, 2));
});

test('legacy migration reads only the matching account/mode JSON, without opening IndexedDB', () => {
  const old = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  const keys: string[] = [];
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: {
      getItem: (key: string) => {
        keys.push(key);
        return JSON.stringify({
          project: {
            ...EMPTY_VIDEO_EDIT,
            name: '旧版资料保留',
            opening: speechClip,
          },
        });
      },
    },
  });
  try {
    const restored = readLegacyBrowserDraft(
      DraftKind.Video,
      videoEditDraftSchema,
      'current-account',
    );
    assert.equal(restored.project?.name, '旧版资料保留');
    assert.deepEqual(keys, ['house-studio:draft:current-account:video']);
    assert.equal(restored.project?.opening?.src, speechClip.src);
  } finally {
    if (old) Object.defineProperty(globalThis, 'localStorage', old);
    else Reflect.deleteProperty(globalThis, 'localStorage');
  }
});
