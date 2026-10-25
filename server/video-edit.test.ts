/** Free-video behavior is tested offline with disposable files and a transport that rejects external requests. */
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  statSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { promisify } from 'node:util';
import { before, after, test } from 'node:test';

import {
  EMPTY_VIDEO_EDIT,
  CoverSource,
  importedVideoSchema,
  videoEditSchema,
  type ImportedVideo,
} from '../src/services/definition/video-edit';
import { JobStatus } from '../src/services/definition/project';
import {
  createVideoShots,
  getVideoEditTimeline,
  getVideoMusicVolume,
} from '../src/video/video-edit-timeline';

const original = process.cwd();
const isolated = mkdtempSync(resolve(tmpdir(), 'free-video-offline-'));
const run = promisify(execFile);
const oldFetch = globalThis.fetch;
let service: typeof import('./video-edit');
let music: typeof import('./video-edit-music');
let clip: ImportedVideo;

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
  mkdirSync(resolve(isolated, 'src/video'), { recursive: true });
  ['video-edit.tsx', 'video-edit-timeline.ts', 'video-edit-index.tsx'].forEach(
    (name) =>
      copyFileSync(
        resolve(original, 'src/video', name),
        resolve(isolated, 'src/video', name),
      ),
  );
  globalThis.fetch = () =>
    Promise.reject(new Error('Network is forbidden in free-video tests'));
  return Promise.all([
    import('./video-edit'),
    import('./video-edit-music'),
  ]).then(([video, audio]) => {
    service = video;
    music = audio;
    return run(
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
        'nullsrc=s=32x48:r=30:d=3',
        '-f',
        'lavfi',
        '-i',
        'sine=frequency=440:sample_rate=48000:duration=3',
        '-c:v',
        'libx264',
        '-c:a',
        'aac',
        '-t',
        '3',
        resolve(isolated, 'fixture.mov'),
      ],
      { cwd: isolated },
    );
  });
});
after(() => {
  globalThis.fetch = oldFetch;
  process.chdir(original);
  rmSync(isolated, { recursive: true, force: true });
});

test('free video input rejects arbitrary URLs and unowned or unnormalized media', () => {
  assert.equal(
    importedVideoSchema.safeParse({
      ...EMPTY_VIDEO_EDIT,
      src: 'https://example.com/a.mov',
    }).success,
    false,
  );
  assert.equal(
    importedVideoSchema.safeParse({
      src: '/media/../private.mp4',
      poster: '/demo/living.jpg',
      name: 'x',
      duration: 3,
      width: 32,
      height: 48,
      hasAudio: true,
    }).success,
    false,
  );
});
test('real MOV normalization preserves source, sound and dimensions, and repeat ingest reuses immutable output', () =>
  service
    .ingestVideo(resolve(isolated, 'fixture.mov'), '样本.mov')
    .then((asset) => {
      clip = asset;
      assert.equal(clip.width, 32);
      assert.equal(clip.height, 48);
      assert.equal(clip.hasAudio, true);
      assert.ok(Math.abs(clip.duration - 3) < 0.1);
      assert.ok(existsSync(resolve(isolated, 'fixture.mov')));
      const path = resolve(
        isolated,
        'data/uploads',
        clip.src.split('/').pop()!,
      );
      const before = statSync(path).mtimeMs;
      return service
        .ingestVideo(
          resolve(isolated, 'fixture.mov'),
          Buffer.from('再次上传.mov').toString('latin1'),
        )
        .then((next) => {
          assert.equal(next.src, clip.src);
          assert.equal(next.name, '再次上传.mov');
          assert.equal(statSync(path).mtimeMs, before);
        });
    }));
test('unreadable files fail explicitly instead of publishing a video asset', () => {
  writeFileSync(resolve(isolated, 'broken.mov'), 'not a video');
  return assert.rejects(
    service.ingestVideo(resolve(isolated, 'broken.mov'), 'broken.mov'),
    /无法读取视频/,
  );
});
test('shot validation rejects reversed, too-short, out-of-bounds and duplicate ranges', () => {
  const valid = {
    ...EMPTY_VIDEO_EDIT,
    opening: clip,
    house: clip,
    shots: [{ id: 'one', start: 0, end: 3, title: '实景', text: '文案' }],
  };
  assert.equal(videoEditSchema.safeParse(valid).success, true);
  for (const shots of [
    [{ ...valid.shots[0], start: 2, end: 1 }],
    [{ ...valid.shots[0], end: 4 }],
    [...valid.shots, valid.shots[0]],
  ])
    assert.equal(videoEditSchema.safeParse({ ...valid, shots }).success, false);
});
test('both original voice tracks retain their duration and never overlap under a quiet full-film score', () => {
  const project = {
    ...EMPTY_VIDEO_EDIT,
    opening: clip,
    house: { ...clip, duration: 10 },
    shots: createVideoShots(10),
  };
  const timeline = getVideoEditTimeline(project);
  assert.equal(timeline.openingFrames, Math.round(clip.duration * 30));
  assert.equal(
    timeline.houseStart,
    timeline.coverFrames + timeline.openingFrames - timeline.overlap,
  );
  assert.equal(
    timeline.frames,
    timeline.coverFrames + timeline.openingFrames + 300 - timeline.overlap * 4,
  );
  assert.equal(getVideoMusicVolume(0, project), 0);
  assert.equal(timeline.overlap, 0);
  assert.equal(
    timeline.houseStart,
    timeline.coverFrames + timeline.openingFrames,
  );
  assert.equal(project.houseVolume, 1);
  assert.equal(project.musicVolume, 0.08);
  assert.ok(getVideoMusicVolume(60, project) > 0);
  assert.equal(getVideoMusicVolume(60, project), project.musicVolume);
  assert.equal(
    getVideoMusicVolume(timeline.houseStart, project),
    project.musicVolume,
  );
  assert.equal(getVideoMusicVolume(timeline.frames - 1, project), 0);
  assert.ok(getVideoMusicVolume(timeline.houseStart + 60, project) > 0);
});
test('muted source tours retain overlapping crossfades when explicitly requested', () => {
  const project = {
    ...EMPTY_VIDEO_EDIT,
    opening: clip,
    house: { ...clip, duration: 10 },
    houseVolume: 0,
    shots: createVideoShots(10),
  };
  const timeline = getVideoEditTimeline(project);
  assert.ok(timeline.overlap > 0);
  assert.equal(
    timeline.frames,
    timeline.coverFrames + timeline.openingFrames + 300 - 4 * timeline.overlap,
  );
});
test('the cover has its own time before speech and is absent from an empty project', () => {
  const empty = getVideoEditTimeline(EMPTY_VIDEO_EDIT);
  assert.equal(empty.coverFrames, 0);
  assert.equal(empty.frames, 1);
  const project = {
    ...EMPTY_VIDEO_EDIT,
    opening: { ...clip, duration: 0.5 },
    house: { ...clip, duration: 10 },
    shots: createVideoShots(10),
  };
  const timeline = getVideoEditTimeline(project);
  assert.equal(timeline.coverFrames, 36);
  assert.equal(timeline.openingFrames, 15);
  assert.equal(timeline.houseStart, 51);
  assert.equal(timeline.shots[0].start, 51);
  assert.equal(timeline.frames, 351);
});
test('cover duration defaults for old drafts, validates bounds and shifts intact source clips', () => {
  const legacy = videoEditSchema.parse({
    ...EMPTY_VIDEO_EDIT,
    coverSeconds: undefined,
  });
  assert.equal(legacy.coverSeconds, 1.2);
  const ready = {
    ...legacy,
    opening: { ...clip, duration: 0.5 },
    house: { ...clip, duration: 10 },
    shots: createVideoShots(10),
  };
  for (const coverSeconds of [0.5, 2.3, 10]) {
    const project = videoEditSchema.parse({ ...ready, coverSeconds });
    const timeline = getVideoEditTimeline(project);
    assert.equal(timeline.coverFrames, Math.round(coverSeconds * 30));
    assert.equal(timeline.openingFrames, 15);
    assert.equal(timeline.houseStart - timeline.coverFrames, 15);
    assert.equal(timeline.frames - timeline.coverFrames, 315);
  }
  for (const coverSeconds of [0.49, 10.01, NaN, Infinity, '2'])
    assert.equal(
      videoEditSchema.safeParse({ ...ready, coverSeconds }).success,
      false,
    );
});
test('automatic chapters preserve every source frame across fractional boundaries', () => {
  for (const duration of [10.1, 9.518, 40.266667]) {
    const shots = createVideoShots(duration);
    let cursor = 0;
    for (const shot of shots) {
      assert.equal(Math.round(shot.start * 30), cursor);
      cursor += Math.round((shot.end - shot.start) * 30);
    }
    assert.equal(cursor, Math.round(duration * 30));
    assert.equal(shots[shots.length - 1].end, duration);
  }
});

test('cover source defaults to the opening and custom backgrounds require owned image paths', () => {
  const old = {
    ...EMPTY_VIDEO_EDIT,
    coverSource: undefined,
    coverImage: undefined,
  };
  assert.equal(videoEditSchema.parse(old).coverSource, CoverSource.Opening);
  assert.equal(videoEditSchema.parse(old).coverImage, null);
  assert.equal(
    videoEditSchema.safeParse({ ...old, coverSource: CoverSource.House })
      .success,
    true,
  );
  assert.equal(
    videoEditSchema.safeParse({ ...old, coverSource: CoverSource.Image })
      .success,
    false,
  );
  assert.equal(
    videoEditSchema.safeParse({
      ...old,
      coverSource: CoverSource.Image,
      coverImage: '/media/background.jpg',
    }).success,
    true,
  );
  for (const coverImage of [
    'https://example.com/image.jpg',
    '/media/../secret.jpg',
    '/media/audio.mp3',
  ])
    assert.equal(
      videoEditSchema.safeParse({
        ...old,
        coverSource: CoverSource.Image,
        coverImage,
      }).success,
      false,
    );
});
test('original music is a real non-clipping stereo PCM track, reused on later requests', () => {
  const asset = music.getOriginalMusic();
  const path = resolve(isolated, 'data/uploads', asset.src.split('/').pop()!);
  const bytes = readFileSync(path);
  assert.equal(bytes.toString('ascii', 0, 4), 'RIFF');
  assert.equal(bytes.readUInt16LE(22), 2);
  assert.equal(bytes.readUInt32LE(24), 44100);
  assert.equal(asset.duration, 64);
  let peak = 0;
  for (let index = 44; index < bytes.length; index += 2)
    peak = Math.max(peak, Math.abs(bytes.readInt16LE(index)));
  assert.ok(peak > 1000 && peak < 32767);
  const modified = statSync(path).mtimeMs;
  assert.deepEqual(music.getOriginalMusic(), asset);
  assert.equal(statSync(path).mtimeMs, modified);
});
test('empty exports fail before a task starts', () =>
  assert.throws(
    () => service.createVideoEditJob(EMPTY_VIDEO_EDIT, 'http://127.0.0.1:4317'),
    /上传两段/,
  ));
test('tampered actual video duration becomes an observable failed job without starting a render', () => {
  const job = service.createVideoEditJob(
    {
      ...EMPTY_VIDEO_EDIT,
      opening: { ...clip, duration: 9 },
      house: clip,
      shots: [{ id: 'one', start: 0, end: 3, title: '实景', text: '' }],
    },
    'http://127.0.0.1:4317',
  );
  /** The background metadata probe has real asynchronous progress, so poll its durable status with a bounded timer. */
  function waitForFailure(attempt = 0): Promise<void> {
    const current = service.getVideoEditJob(job.id);
    if (current.status === JobStatus.Failed) {
      assert.match(current.message, /信息已变化/);
      return Promise.resolve();
    }
    if (attempt > 100)
      return Promise.reject(
        new Error('Metadata-validation job did not settle'),
      );
    return new Promise<void>((done) => setTimeout(done, 30)).then(() =>
      waitForFailure(attempt + 1),
    );
  }
  return waitForFailure();
});

test('missing owned media fails the background job and releases the export queue', () => {
  const missing = { ...clip, src: `/media/import-${'0'.repeat(64)}.mp4` };
  const job = service.createVideoEditJob(
    {
      ...EMPTY_VIDEO_EDIT,
      opening: missing,
      house: clip,
      shots: [{ id: 'one', start: 0, end: 3, title: '实景', text: '' }],
    },
    'http://127.0.0.1:4317',
  );
  // Metadata validation runs asynchronously; this short bounded poll observes its real settled state.
  return new Promise<void>((done) => setTimeout(done, 30)).then(() => {
    assert.equal(service.getVideoEditJob(job.id).status, JobStatus.Failed);
    assert.match(service.getVideoEditJob(job.id).message, /素材不存在/);
    assert.throws(
      () =>
        service.createVideoEditJob(EMPTY_VIDEO_EDIT, 'http://127.0.0.1:4317'),
      /上传两段/,
    );
  });
});

test('a missing custom cover is observable and jobs retain the new-project session', () => {
  const sessionId = '169a1ac0-b7a4-4a37-8cb2-5190e95e57a2';
  const job = service.createVideoEditJob(
    {
      ...EMPTY_VIDEO_EDIT,
      sessionId,
      opening: clip,
      house: clip,
      shots: [{ id: 'one', start: 0, end: 3, title: '实景', text: '' }],
      coverSource: CoverSource.Image,
      coverImage: '/media/missing-cover.jpg',
    },
    'http://127.0.0.1:4317',
  );
  assert.equal(job.sessionId, sessionId);
  return new Promise<void>((done) => setTimeout(done, 30)).then(() => {
    const failed = service.getVideoEditJob(job.id);
    assert.equal(failed.status, JobStatus.Failed);
    assert.match(failed.message, /素材不存在/);
  });
});
