/** Free-video behavior is tested offline with disposable files and a transport that rejects external requests. */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import {
  MusicTrack,
  MUSIC_TRACK_MAP,
  musicTrackSchema,
} from '../../src/services/definition/music';
import { execFile } from 'node:child_process';
import express from 'express';
import { request as httpRequest } from 'node:http';
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
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
  createSuccessResponse,
  createErrorResponse,
} from '../../server/http/response';

import {
  EMPTY_VIDEO_EDIT,
  CoverSource,
  HouseMediaKind,
  getHouseMaterials,
  importedVideoSchema,
  videoEditSchema,
  type ImportedVideo,
} from '../../src/services/definition/video-edit';
import { acquireMediaSlot } from '../../server/media/media-queue';
import { resolveAsset } from '../../server/media/media';
import { getVideoProcessingThreads } from '../../server/video/video-bundles';
import {
  JobStatus,
  VideoPreparation,
  VIDEO_PENDING_POSTER,
} from '../../src/services/definition/project';
import { createMediaId } from '../../src/services/definition/media-id';
import videoEditApi, {
  VideoEditRequestError,
} from '../../src/features/studio/video/video-edit-api';
import { workspaceRequest } from '../../src/features/studio/auth/auth-api';
import {
  VIDEO_UPLOAD_TIMEOUT_MS,
  VideoUploadPhase,
  videoUploadStatusSchema,
} from '../../src/services/definition/video-upload';
import {
  createVideoShots,
  getVideoEditTimeline,
  getVideoMusicVolume,
  getNativeVideoSegments,
  getVideoGraphicFrames,
  createMaterialShots,
} from '../../src/video/video-edit-timeline';

const original = process.cwd();
const isolated = mkdtempSync(resolve(tmpdir(), 'free-video-offline-'));
const run = promisify(execFile);
const oldFetch = globalThis.fetch;
let service: typeof import('../../server/video/video-edit');
let uploads: typeof import('../../server/video/video-upload');
let music: typeof import('../../server/video/video-edit-music');
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
  mkdirSync(resolve(isolated, 'server/video'), { recursive: true });
  copyFileSync(
    resolve(original, 'server/video/video-edit-native.ts'),
    resolve(isolated, 'server/video/video-edit-native.ts'),
  );
  [
    'video-edit.tsx',
    'video-edit-timeline.ts',
    'video-edit-index.tsx',
    'editorial-template.tsx',
    'video-subtitles.ts',
    'video-watermark.tsx',
  ].forEach((name) =>
    copyFileSync(
      resolve(original, 'src/video', name),
      resolve(isolated, 'src/video', name),
    ),
  );
  mkdirSync(resolve(isolated, 'public/demo'), { recursive: true });
  copyFileSync(
    resolve(original, 'public/demo/video-pending.svg'),
    resolve(isolated, 'public/demo/video-pending.svg'),
  );
  // Initialize this page's auth-disabled fixture before individual transport timeout mocks.
  globalThis.fetch = () =>
    Promise.resolve(
      Response.json(
        createSuccessResponse(
          { enabled: false, authenticated: true },
          'req_test',
        ),
      ),
    );
  return workspaceRequest().then(() => {
    globalThis.fetch = () =>
      Promise.reject(new Error('Network is forbidden in free-video tests'));
    return Promise.all([
      import('../../server/video/video-edit'),
      import('../../server/video/video-edit-music'),
      import('../../server/video/video-upload'),
    ]).then(([video, audio, videoUploads]) => {
      service = video;
      music = audio;
      uploads = videoUploads;
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
test('MOV uploads preserve original bytes, sound and metadata without encoding or extracting thumbnails', () =>
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
          assert.notEqual(next.src, clip.src);
          assert.equal(next.preparation, VideoPreparation.Original);
          assert.equal(next.poster, VIDEO_PENDING_POSTER);
          assert.deepEqual(
            readFileSync(path),
            readFileSync(resolve(isolated, 'fixture.mov')),
          );
          assert.equal(
            readdirSync(resolve(isolated, 'data/uploads')).some((name) =>
              name.startsWith('import-'),
            ),
            false,
          );
          assert.equal(next.name, '再次上传.mov');
          assert.equal(statSync(path).mtimeMs, before);
        });
    }));
test('capacity rejection leaves upload ownership idle and permits retry after space is available', () => {
  process.env.STUDIO_WORKSPACE_LIMIT_MIB = '1';
  return assert
    .rejects(
      service.ingestVideo(resolve(isolated, 'fixture.mov'), 'quota.mov'),
      /容量上限/,
    )
    .then(() => {
      assert.equal(uploads.getVideoUploadStatus().active, null);
      delete process.env.STUDIO_WORKSPACE_LIMIT_MIB;
      return service.ingestVideo(resolve(isolated, 'fixture.mov'), 'retry.mov');
    })
    .then((asset) => assert.equal(asset.preparation, VideoPreparation.Original))
    .finally(() => {
      delete process.env.STUDIO_WORKSPACE_LIMIT_MIB;
    });
});
test('original upload completes while the heavy rendering slot is occupied', () => {
  return acquireMediaSlot().then((release) => {
    const started = Date.now();
    return service
      .ingestVideo(resolve(isolated, 'fixture.mov'), 'during-render.mov')
      .then((asset) => {
        assert.equal(asset.preparation, VideoPreparation.Original);
        assert.ok(Date.now() - started < 10_000);
      })
      .finally(release);
  });
});
test('client preparation flags cannot skip raw source validation', () =>
  assert.rejects(
    service.prepareVideoForRender({ ...clip, duration: 9 }),
    /原片信息已变化/,
  ));
test('native rendering accepts unspecified square-pixel metadata but rejects explicit anamorphic geometry', () => {
  const jpeg = resolve(isolated, 'square-source.jpg');
  const unspecified = resolve(isolated, 'unspecified-sar.mp4');
  const anamorphic = resolve(isolated, 'anamorphic.mp4');
  return import('sharp')
    .then(({ default: sharp }) =>
      sharp({
        create: { width: 32, height: 48, channels: 3, background: '#a08060' },
      })
        .jpeg()
        .toFile(jpeg),
    )
    .then(() =>
      uploads.runVideoUploadMedia(
        { controller: new AbortController() },
        {
          binary: 'ffmpeg',
          args: [
            '-v',
            'error',
            '-y',
            '-loop',
            '1',
            '-i',
            jpeg,
            '-r',
            '30',
            '-c:v',
            'libx264',
            '-pix_fmt',
            'yuv420p',
            '-t',
            '1',
            unspecified,
          ],
        },
      ),
    )
    .then(() => service.probeVideo(unspecified))
    .then((metadata) => {
      assert.equal(metadata.canCopyVideo, false);
      assert.equal(metadata.canRenderNative, true);
    })
    .then(() => service.ingestVideo(unspecified, 'square-packets.mp4'))
    .then((asset) => service.prepareVideoForRender(asset))
    .then((prepared) => {
      assert.ok(prepared);
      const target = resolveAsset(prepared.src);
      return Promise.all(
        [unspecified, target].map((path) =>
          uploads.runVideoUploadMedia(
            { controller: new AbortController() },
            {
              binary: 'ffprobe',
              args: [
                '-v',
                'error',
                '-select_streams',
                'v:0',
                '-show_packets',
                '-show_entries',
                'packet=data_hash',
                '-show_data_hash',
                'sha256',
                '-of',
                'json',
                path,
              ],
            },
          ),
        ),
      ).then(([before, after]) =>
        assert.deepEqual(JSON.parse(after.stdout), JSON.parse(before.stdout)),
      );
    })
    .then(() => {
      return uploads.runVideoUploadMedia(
        { controller: new AbortController() },
        {
          binary: 'ffmpeg',
          args: [
            '-v',
            'error',
            '-y',
            '-i',
            unspecified,
            '-c:v',
            'copy',
            '-aspect',
            '4:3',
            anamorphic,
          ],
        },
      );
    })
    .then(() => service.probeVideo(anamorphic))
    .then((metadata) => {
      assert.equal(metadata.canCopyVideo, false);
      assert.equal(metadata.canRenderNative, false);
    });
});
test('unreadable files fail explicitly instead of publishing a video asset', () => {
  writeFileSync(resolve(isolated, 'broken.mov'), 'not a video');
  return assert.rejects(
    service.ingestVideo(resolve(isolated, 'broken.mov'), 'broken.mov'),
    /无法读取视频/,
  );
});
test('compatible H264 video keeps every original video packet while normalizing its audio', () => {
  const source = resolve(isolated, 'fixture.mov');
  let target: string;
  /** Compare compressed video payloads: a second encoder cannot accidentally satisfy this assertion. */
  function packets(path: string) {
    return run(
      'pnpm',
      [
        'exec',
        'remotion',
        'ffprobe',
        '-v',
        'error',
        '-select_streams',
        'v:0',
        '-show_packets',
        '-show_entries',
        'packet=data_hash',
        '-show_data_hash',
        'sha256',
        '-of',
        'json',
        path,
      ],
      { cwd: isolated },
    ).then(
      ({ stdout }) =>
        JSON.parse(stdout) as { packets: Array<{ data_hash: string }> },
    );
  }
  return service
    .probeVideo(source)
    .then((metadata) => assert.equal(metadata.canCopyVideo, true))
    .then(() => service.prepareVideoForRender(clip))
    .then((asset) => {
      assert.equal(asset?.preparation, VideoPreparation.Ready);
      assert.match(asset!.poster, /import-.*\.jpg$/);
      target = resolveAsset(asset!.src);
      return service
        .prepareVideoForRender(clip)
        .then((cached) => assert.equal(cached?.src, asset?.src));
    })
    .then(() => Promise.all([packets(source), packets(target)]))
    .then(([before, after]) => {
      assert.ok(before.packets.length > 0);
      assert.deepEqual(after.packets, before.packets);
    });
});
test('24fps and rotated sources still use normalization and preserve their intended duration and orientation', () => {
  const source = resolve(isolated, 'fixture.mov');
  const slower = resolve(isolated, '24fps.mov');
  const rotated = resolve(isolated, 'rotated.mov');
  let slowerDuration = 0;
  let rotatedDuration = 0;
  return run(
    'pnpm',
    [
      'exec',
      'remotion',
      'ffmpeg',
      '-v',
      'error',
      '-y',
      '-i',
      source,
      '-r',
      '24',
      '-c:v',
      'libx264',
      '-c:a',
      'copy',
      slower,
    ],
    { cwd: isolated },
  )
    .then(() => service.probeVideo(slower))
    .then((metadata) => {
      slowerDuration = metadata.duration;
      assert.equal(metadata.canCopyVideo, false);
    })
    .then(() => service.ingestVideo(slower, '24fps.mov'))
    .then((asset) => {
      assert.equal(asset.preparation, VideoPreparation.Original);
      assert.deepEqual(
        readFileSync(resolveAsset(asset.src)),
        readFileSync(slower),
      );
      return service.prepareVideoForRender(asset);
    })
    .then((prepared) => {
      assert.ok(prepared);
      return prepared;
    })
    .then((asset) => {
      assert.ok(
        Math.abs(asset.duration - slowerDuration) < 0.1,
        JSON.stringify({ assetDuration: asset.duration, slowerDuration }),
      );
      return run(
        'pnpm',
        [
          'exec',
          'remotion',
          'ffprobe',
          '-v',
          'error',
          '-select_streams',
          'v:0',
          '-show_entries',
          'stream=r_frame_rate',
          '-of',
          'json',
          resolveAsset(asset.src),
        ],
        { cwd: isolated },
      );
    })
    .then(({ stdout }) =>
      assert.equal(JSON.parse(stdout).streams[0].r_frame_rate, '30/1'),
    )
    .then(() =>
      run(
        'pnpm',
        [
          'exec',
          'remotion',
          'ffmpeg',
          '-v',
          'error',
          '-y',
          '-display_rotation:v:0',
          '90',
          '-i',
          source,
          '-c',
          'copy',
          rotated,
        ],
        { cwd: isolated },
      ),
    )
    .then(() => service.probeVideo(rotated))
    .then((metadata) => {
      rotatedDuration = metadata.duration;
      assert.equal(metadata.canCopyVideo, false);
    })
    .then(() => service.ingestVideo(rotated, 'rotated.mov'))
    .then((asset) => {
      assert.equal(asset.width, 48);
      assert.equal(asset.height, 32);
      return service.prepareVideoForRender(asset);
    })
    .then((prepared) => {
      assert.ok(prepared);
      return prepared;
    })
    .then((asset) => {
      assert.equal(asset.width, 48);
      assert.equal(asset.height, 32);
      assert.ok(
        Math.abs(asset.duration - rotatedDuration) < 0.1,
        JSON.stringify({ assetDuration: asset.duration, rotatedDuration }),
      );
    });
});
test('HEVC phone originals remain unchanged until explicit preparation produces H264', () => {
  const source = resolve(isolated, 'phone-hevc.mov');
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
      'nullsrc=s=64x96:r=24:d=2',
      '-c:v',
      'libx265',
      '-x265-params',
      'pools=1:frame-threads=1:log-level=error',
      '-tag:v',
      'hvc1',
      source,
    ],
    { cwd: isolated },
  )
    .then(() => service.ingestVideo(source, '手机原片.mov'))
    .then((asset) => {
      assert.equal(asset.preparation, VideoPreparation.Original);
      assert.deepEqual(
        readFileSync(resolveAsset(asset.src)),
        readFileSync(source),
      );
      return service.prepareVideoForRender(asset);
    })
    .then((asset) => {
      assert.ok(asset);
      assert.equal(asset.preparation, VideoPreparation.Ready);
      assert.equal(asset.hasAudio, false);
      return service.probeVideo(resolveAsset(asset.src));
    })
    .then((metadata) => assert.equal(metadata.canCopyVideo, true));
});
test('HTTP browsers without randomUUID can create valid unique drafts and material shots', (context) => {
  context.mock.method(crypto, 'randomUUID', () => {
    throw new Error('randomUUID is unavailable on the HTTP origin');
  });
  const ids = Array.from({ length: 100 }, () => createMediaId());
  assert.equal(new Set(ids).size, ids.length);
  ids.forEach((sessionId) =>
    assert.equal(
      videoEditSchema.safeParse({ ...EMPTY_VIDEO_EDIT, sessionId }).success,
      true,
    ),
  );
  assert.equal(createVideoShots(3).length, 1);
  assert.equal(
    createMaterialShots([
      { id: createMediaId(), kind: HouseMediaKind.Video, video: clip },
    ]).length,
    1,
  );
});
test('concurrent ingests fail visibly and release their lock after failure', () => {
  const first = service.ingestVideo(
    resolve(isolated, 'missing.mov'),
    'missing.mov',
  );
  const rejected = assert.rejects(
    service.ingestVideo(resolve(isolated, 'fixture.mov'), 'second.mov'),
    /正在处理视频/,
  );
  assert.throws(
    () => service.createVideoEditJob(EMPTY_VIDEO_EDIT, 'http://127.0.0.1:4318'),
    /正在处理或导出/,
  );
  return Promise.all([assert.rejects(first, /无法读取视频/), rejected])
    .then(() =>
      service.ingestVideo(
        resolve(isolated, 'fixture.mov'),
        'after-failure.mov',
      ),
    )
    .then((asset) => assert.equal(asset.duration, clip.duration));
});
test('video API reports proxy HTML errors instead of JSON parse errors', (context) => {
  context.mock.method(globalThis, 'fetch', () =>
    Promise.resolve(
      new Response('<html>Gateway timeout</html>', { status: 504 }),
    ),
  );
  return assert.rejects(videoEditApi.getLatestJob(), /服务器返回异常 \(504\)/);
});
test('expired subtitle tasks keep their HTTP status so the editor can stop polling and unlock', (context) => {
  context.mock.method(globalThis, 'fetch', () =>
    Promise.resolve(
      Response.json(
        createErrorResponse(404, '字幕识别任务不存在或已过期。', 'req_test'),
        { status: 404 },
      ),
    ),
  );
  return assert.rejects(
    videoEditApi.getSubtitleJob('11111111-1111-4111-8111-111111111111'),
    (error: unknown) => {
      assert.ok(error instanceof VideoEditRequestError);
      assert.equal(error.status, 404);
      assert.match(error.message, /过期/);
      return true;
    },
  );
});
test('a stalled video request times out and rejects so the editor can leave its busy state', (context) => {
  context.mock.timers.enable({ apis: ['setTimeout'] });
  context.mock.method(
    globalThis,
    'fetch',
    (_input: unknown, init?: RequestInit) =>
      new Promise((_resolve, reject) => {
        init?.signal?.addEventListener(
          'abort',
          () => reject(new DOMException('Aborted', 'AbortError')),
          { once: true },
        );
      }),
  );
  const pending = assert.rejects(videoEditApi.getLatestJob(), /请求超时/);
  return new Promise<void>((resolve) => setImmediate(resolve)).then(() => {
    context.mock.timers.tick(30_000);
    return pending;
  });
});
test('video upload stops at fifteen minutes while music retains its separate transfer deadline', (context) => {
  context.mock.timers.enable({ apis: ['setTimeout'] });
  const signals: Array<AbortSignal> = [];
  context.mock.method(
    globalThis,
    'fetch',
    (_input: unknown, init?: RequestInit) =>
      new Promise((_resolve, reject) => {
        assert.ok(init?.signal);
        const signal = init.signal;
        signals.push(signal);
        signal.addEventListener(
          'abort',
          () => reject(new DOMException('Aborted', 'AbortError')),
          { once: true },
        );
      }),
  );
  const file = new File(['upload fixture'], 'fixture.mov');
  const pending = Promise.all([
    assert.rejects(videoEditApi.uploadVideo(file), /请求超时/),
    assert.rejects(videoEditApi.uploadMusic(file), /请求超时/),
  ]);
  return new Promise<void>((resolve) => setImmediate(resolve)).then(() => {
    context.mock.timers.tick(30_000);
    assert.equal(signals.length, 2);
    assert.ok(signals.every((signal) => !signal.aborted));
    context.mock.timers.tick(VIDEO_UPLOAD_TIMEOUT_MS - 30_000);
    assert.equal(signals[0].aborted, true);
    assert.equal(signals[1].aborted, true);
    return pending.then(() =>
      assert.ok(signals.every((signal) => signal.aborted)),
    );
  });
});
test('external cancellation immediately aborts the video HTTP request', (context) => {
  context.mock.method(
    globalThis,
    'fetch',
    (_input: unknown, init?: RequestInit) =>
      new Promise((_resolve, reject) => {
        init?.signal?.addEventListener(
          'abort',
          () => reject(new DOMException('Aborted', 'AbortError')),
          { once: true },
        );
      }),
  );
  const controller = new AbortController();
  const pending = assert.rejects(
    videoEditApi.uploadVideo(new File(['fixture'], 'file.mov'), {
      id: createMediaId(),
      signal: controller.signal,
    }),
    /已取消/,
  );
  controller.abort();
  return pending;
});
test('server deadline aborts after fifteen minutes and retains ownership until cleanup finishes', (context) => {
  context.mock.timers.enable({ apis: ['setTimeout'] });
  const task = uploads.beginVideoUpload();
  try {
    context.mock.timers.tick(VIDEO_UPLOAD_TIMEOUT_MS - 1);
    assert.equal(task.controller.signal.aborted, false);
    context.mock.timers.tick(1);
    assert.equal(task.controller.signal.aborted, true);
    assert.match(task.controller.signal.reason.message, /超过15分钟/);
    assert.equal(
      uploads.getVideoUploadStatus().active?.phase,
      VideoUploadPhase.Cancelling,
    );
    assert.throws(() => uploads.beginVideoUpload(), /正在处理视频/);
  } finally {
    task.finish();
  }
  assert.equal(uploads.getVideoUploadStatus().active, null);
});

/** Wait only for observable child/request state, bounded so a leaked lock fails the test. */
function waitForUploadState(
  predicate: () => boolean,
  deadline = Date.now() + 3000,
): Promise<void> {
  if (predicate()) return Promise.resolve();
  if (Date.now() > deadline)
    return Promise.reject(new Error('Upload cleanup did not finish'));
  return new Promise<void>((resolveTimer) => setTimeout(resolveTimer, 20)).then(
    () => waitForUploadState(predicate, deadline),
  );
}
test('cancel kills a command and its descendant before allowing the next upload', () => {
  const heartbeat = resolve(isolated, 'descendant-heartbeat');
  const task = uploads.beginVideoUpload();
  const childScript = `const fs=require('node:fs'); setInterval(()=>fs.appendFileSync(${JSON.stringify(heartbeat)},'x'),20)`;
  const parentScript = `require('node:child_process').spawn(process.execPath,['-e',${JSON.stringify(childScript)}],{stdio:'inherit'});setInterval(()=>{},1000)`;
  const pending = assert.rejects(
    uploads
      .runVideoUploadCommand(task, {
        file: process.execPath,
        args: ['-e', parentScript],
      })
      .finally(task.finish),
    /已取消/,
  );
  return waitForUploadState(() => existsSync(heartbeat))
    .then(() => uploads.cancelVideoUpload(task.info.id))
    .then(() => pending)
    .then(() => {
      assert.equal(uploads.getVideoUploadStatus().active, null);
      const bytes = statSync(heartbeat).size;
      return new Promise<void>((resolveTimer) =>
        setTimeout(resolveTimer, 100),
      ).then(() => assert.equal(statSync(heartbeat).size, bytes));
    })
    .then(() => {
      const next = uploads.beginVideoUpload();
      next.finish();
    });
});
test('stale cancellation cannot stop a newer upload', () => {
  const task = uploads.beginVideoUpload();
  return assert
    .rejects(uploads.cancelVideoUpload(createMediaId()), /已变化/)
    .then(() => assert.equal(task.controller.signal.aborted, false))
    .finally(task.finish);
});

test(
  'HTTP cancellation during intake and disconnect both release the lock and remove partial files',
  { timeout: 10000 },
  () => {
    const app = express();
    app.use(express.json());
    app.use('/api/video-edit', service.videoEditRouter);
    app.use(
      (
        error: Error & { status?: number },
        _req: express.Request,
        res: express.Response,
        _next: express.NextFunction,
      ) => res.status(error.status ?? 500).json({ message: error.message }),
    );
    const server = app.listen(0, '127.0.0.1');
    let slow: ReturnType<typeof httpRequest> | undefined;
    const failures: Array<Error> = [];
    /** Talk to the real router without relaxing this suite's external-fetch prohibition. */
    function call(
      path: string,
      body?: unknown,
    ): Promise<{ status: number; body: unknown }> {
      const address = server.address();
      assert.ok(address && typeof address === 'object');
      return new Promise((resolveResponse, reject) => {
        const request = httpRequest(
          {
            host: '127.0.0.1',
            port: address.port,
            path: '/api/video-edit/' + path,
            method: body === undefined ? 'GET' : 'POST',
            headers:
              body === undefined ? {} : { 'Content-Type': 'application/json' },
          },
          (response) => {
            let text = '';
            response.on('data', (chunk) => {
              text += chunk;
            });
            response.on('end', () => {
              try {
                resolveResponse({
                  status: response.statusCode!,
                  body: JSON.parse(text),
                });
              } catch (error) {
                reject(error);
              }
            });
          },
        );
        request.on('error', reject);
        request.end(body === undefined ? undefined : JSON.stringify(body));
      });
    }
    /** A multipart body deliberately left unfinished models a phone sending a large file. */
    function startSlow(id: string) {
      const address = server.address();
      assert.ok(address && typeof address === 'object');
      slow = httpRequest(
        {
          host: '127.0.0.1',
          port: address.port,
          path: '/api/video-edit/upload-video?uploadId=' + id,
          method: 'POST',
          headers: {
            'Content-Type': 'multipart/form-data; boundary=test-upload',
          },
        },
        (response) => response.resume(),
      );
      slow.on('error', (error) => {
        failures.push(error);
      });
      slow.write(
        '--test-upload\r\nContent-Disposition: form-data; name="file"; filename="phone.mov"\r\nContent-Type: video/quicktime\r\n\r\n',
      );
      slow.write(Buffer.alloc(65536));
    }
    return new Promise<void>((resolveListening) =>
      server.once('listening', resolveListening),
    )
      .then(() => {
        const id = createMediaId();
        startSlow(id);
        return waitForUploadState(
          () => uploads.getVideoUploadStatus().active?.id === id,
        )
          .then(() => call('get-upload-status'))
          .then((response) => {
            assert.equal(
              videoUploadStatusSchema.parse(response.body).active?.id,
              id,
            );
            return call('cancel-upload', { id });
          });
      })
      .then((response) => {
        assert.equal(response.status, 200);
        assert.equal(videoUploadStatusSchema.parse(response.body).active, null);
        return waitForUploadState(
          () =>
            readdirSync(resolve(isolated, 'data/video-edit/incoming'))
              .length === 0,
        );
      })
      .then(() => {
        const id = createMediaId();
        startSlow(id);
        return waitForUploadState(
          () => uploads.getVideoUploadStatus().active?.id === id,
        );
      })
      .then(() => {
        slow!.destroy();
        return waitForUploadState(
          () => uploads.getVideoUploadStatus().active === null,
        );
      })
      .then(() =>
        waitForUploadState(
          () =>
            readdirSync(resolve(isolated, 'data/video-edit/incoming'))
              .length === 0,
        ),
      )
      .then(() => call('upload-video', {}))
      .then((response) => {
        assert.equal(response.status, 400);
        assert.equal(uploads.getVideoUploadStatus().active, null);
        assert.ok(failures.length > 0);
      })
      .finally(() => {
        slow?.destroy();
        server.closeAllConnections();
        return new Promise<void>((resolveClosed) =>
          server.close(() => resolveClosed()),
        );
      });
  },
);
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
  assert.equal(project.musicVolume, 0.4);
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
    openingVolume: 0,
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
test('audible opening remains complete when house footage is muted', () => {
  const project = {
    ...EMPTY_VIDEO_EDIT,
    opening: clip,
    house: { ...clip, duration: 10 },
    houseVolume: 0,
    shots: createVideoShots(10),
  };
  const timeline = getVideoEditTimeline(project);
  assert.equal(timeline.overlap, 0);
  assert.equal(
    timeline.houseStart,
    timeline.coverFrames + timeline.openingFrames,
  );
  assert.equal(
    timeline.frames,
    timeline.coverFrames + timeline.openingFrames + 300,
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

test('cover source defaults to the first house material, preserves explicit choices and validates custom images', () => {
  const old = {
    ...EMPTY_VIDEO_EDIT,
    coverSource: undefined,
    coverImage: undefined,
  };
  assert.equal(EMPTY_VIDEO_EDIT.coverSource, CoverSource.House);
  assert.equal(videoEditSchema.parse(old).coverSource, CoverSource.House);
  assert.equal(
    videoEditSchema.parse({ ...old, coverSource: CoverSource.Opening })
      .coverSource,
    CoverSource.Opening,
  );
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

test('mixed house media bind each chapter to its own file and preserve original spoken video duration', () => {
  const materials = [
    {
      id: 'photo',
      kind: HouseMediaKind.Image as const,
      src: '/demo/living.jpg',
      name: '照片',
      duration: 30,
    },
    { id: 'video', kind: HouseMediaKind.Video as const, video: clip },
  ];
  const project = videoEditSchema.parse({
    ...EMPTY_VIDEO_EDIT,
    opening: clip,
    house: null,
    materials,
    shots: createMaterialShots(materials),
  });
  assert.equal(project.shots[0].end, 5);
  assert.equal(project.shots[1].end, clip.duration);
  const timeline = getVideoEditTimeline(project);
  assert.equal(timeline.overlap, 0);
  assert.equal(timeline.shots[0].source?.kind, HouseMediaKind.Image);
  assert.equal(timeline.shots[1].source?.kind, HouseMediaKind.Video);
  assert.equal(timeline.frames, 36 + Math.round(clip.duration * 30) * 2 + 150);
  assert.equal(
    getHouseMaterials({ ...project, materials: [], house: clip })[0].id,
    'legacy-house',
  );
  for (const patch of [
    { shots: [{ ...project.shots[0], sourceId: 'missing' }] },
    { shots: [{ ...project.shots[1], end: clip.duration + 1 }] },
    { materials: [materials[0], materials[0]] },
  ])
    assert.equal(
      videoEditSchema.safeParse({ ...project, ...patch }).success,
      false,
    );
});
test('built-in music has five distinct, reusable, non-clipping stereo scores and keeps the piano default', () => {
  const hashes = new Set<string>();
  for (const track of Object.values(MusicTrack)) {
    const asset = music.getOriginalMusic(track);
    const path = resolveAsset(asset.src);
    const bytes = readFileSync(path);
    assert.equal(bytes.toString('ascii', 0, 4), 'RIFF');
    assert.equal(bytes.readUInt16LE(22), 2);
    assert.equal(bytes.readUInt32LE(24), 44100);
    assert.equal(asset.duration, 64);
    assert.equal(asset.name, MUSIC_TRACK_MAP[track].name);
    let peak = 0;
    for (let index = 44; index < bytes.length; index += 2)
      peak = Math.max(peak, Math.abs(bytes.readInt16LE(index)));
    assert.ok(peak > 1000 && peak < 32767);
    hashes.add(createHash('sha256').update(bytes).digest('hex'));
    const modified = statSync(path).mtimeMs;
    assert.deepEqual(music.getOriginalMusic(track), asset);
    assert.equal(statSync(path).mtimeMs, modified);
  }
  assert.equal(hashes.size, 5);
  assert.deepEqual(
    music.getOriginalMusic(),
    music.getOriginalMusic(MusicTrack.Piano),
  );
  assert.equal(musicTrackSchema.safeParse('../outside').success, false);
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

test('native plans keep complete speech clocks and render only graphics changes between static spans', () => {
  const project = {
    ...EMPTY_VIDEO_EDIT,
    opening: clip,
    house: { ...clip, duration: 16 },
    shots: [
      { id: 'a', start: 0, end: 8, title: 'A', text: '' },
      { id: 'b', start: 8, end: 16, title: 'B', text: '' },
    ],
  };
  const timeline = getVideoEditTimeline(project);
  const segments = getNativeVideoSegments(project);
  assert.ok(segments);
  assert.equal(segments[0].frames, Math.round(clip.duration * 30));
  assert.equal(segments[1].start, timeline.houseStart);
  assert.equal(segments[2].sourceStart, 240);
  assert.equal(
    segments.reduce(
      (count, segment) => count + segment.frames,
      timeline.coverFrames,
    ),
    timeline.frames,
  );
  const frames = getVideoGraphicFrames(project);
  assert.equal(new Set(frames).size, frames.length);
  assert.ok(frames.length < timeline.frames / 2);
  assert.ok(frames.includes(timeline.coverFrames));
  assert.ok(
    frames.includes(
      timeline.houseStart - Math.floor(timeline.transitionFrames / 2),
    ),
  );
  assert.ok(frames.includes(timeline.shots[1].start + 18));
  assert.ok(frames.includes(timeline.frames - 96 + 15));
  assert.equal(
    frames.includes(timeline.houseStart + 60),
    false,
    'An unchanged middle caption is held, not repainted',
  );
  assert.ok(
    frames.every(
      (frame) =>
        frame >= timeline.coverFrames &&
        frame < timeline.frames &&
        Number.isInteger(frame),
    ),
  );
  assert.ok(
    getNativeVideoSegments({ ...project, houseVolume: 0 }),
    'An audible opening retains every frame when house sound is muted',
  );
  assert.equal(
    getNativeVideoSegments({
      ...project,
      materials: [
        {
          id: 'p',
          kind: HouseMediaKind.Image,
          src: '/demo/kitchen.jpg',
          name: 'p',
          duration: 8,
        },
      ],
      shots: [
        { id: 'p', sourceId: 'p', start: 0, end: 8, title: 'p', text: '' },
      ],
    }),
    null,
  );
});

test('real-video watermarks default on old drafts, can be edited or disabled and stay single-line', () => {
  const legacy = { ...EMPTY_VIDEO_EDIT, watermark: undefined };
  assert.equal(videoEditSchema.parse(legacy).watermark, '青连实拍');
  assert.equal(EMPTY_VIDEO_EDIT.watermark, '青连实拍');
  for (const watermark of ['我的实拍', ''])
    assert.equal(
      videoEditSchema.parse({ ...legacy, watermark }).watermark,
      watermark,
    );
  for (const watermark of ['水印\n换行', '字'.repeat(21)])
    assert.equal(
      videoEditSchema.safeParse({ ...legacy, watermark }).success,
      false,
    );
});

test('video processing threads require a bounded administrator opt-in', () => {
  for (const value of [
    '',
    '0',
    '-1',
    '4',
    '999',
    '1.5',
    'NaN',
    'Infinity',
    'auto',
  ])
    assert.equal(getVideoProcessingThreads(value), 1);
  for (const value of ['1', '2', '3'])
    assert.equal(getVideoProcessingThreads(value), Number(value));
});

test('editorial defaults to the presenter cover while classic and explicit cover choices remain compatible', () => {
  const legacy = {
    ...EMPTY_VIDEO_EDIT,
    videoTemplate: undefined,
    coverSource: undefined,
  };
  assert.equal(videoEditSchema.parse(legacy).videoTemplate, 'classic');
  assert.equal(videoEditSchema.parse(legacy).coverSource, CoverSource.House);
  const editorial = videoEditSchema.parse({
    ...legacy,
    videoTemplate: 'editorial',
  });
  assert.equal(editorial.coverSource, CoverSource.Opening);
  assert.equal(
    videoEditSchema.parse({ ...editorial, coverSource: CoverSource.House })
      .coverSource,
    CoverSource.House,
  );
  assert.equal(
    videoEditSchema.safeParse({ ...legacy, videoTemplate: 'unknown' }).success,
    false,
  );
  assert.deepEqual(
    getVideoEditTimeline(editorial),
    getVideoEditTimeline(videoEditSchema.parse(legacy)),
  );
});
