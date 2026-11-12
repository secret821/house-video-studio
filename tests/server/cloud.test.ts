/** Offline cloud contract tests use an isolated filesystem and fake transport; no paid API can run. */
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { before, after, test } from 'node:test';
import {
  copyFileSync,
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';

import {
  CloudCallKind,
  readCloudLedger,
  reserveCloudCall,
  updateCloudCall,
  CloudCallState,
} from '../../server/cloud/cloud-budget';

const source = process.cwd();
const isolated = mkdtempSync(resolve(tmpdir(), 'bailian-offline-'));
const originalFetch = globalThis.fetch;
const originalKey = process.env.DASHSCOPE_API_KEY;
const originalWorkspace = process.env.DASHSCOPE_WORKSPACE_ID;
let cloud: typeof import('../../server/cloud/cloud');
const requests: Array<{
  url: string;
  body: unknown;
  authorization: string | null;
}> = [];
let failSpeech = false;
let polls = 0;

/** A one-second PCM WAV exercises real duration inspection without synthesizing any voice. */
function wav() {
  const bytes = Buffer.alloc(44 + 48000);
  bytes.write('RIFF');
  bytes.writeUInt32LE(bytes.length - 8, 4);
  bytes.write('WAVEfmt ', 8);
  bytes.writeUInt32LE(16, 16);
  bytes.writeUInt16LE(1, 20);
  bytes.writeUInt16LE(1, 22);
  bytes.writeUInt32LE(24000, 24);
  bytes.writeUInt32LE(48000, 28);
  bytes.writeUInt16LE(2, 32);
  bytes.writeUInt16LE(16, 34);
  bytes.write('data', 36);
  bytes.writeUInt32LE(48000, 40);
  return bytes;
}

/** Match only the documented endpoints; unexpected network routes fail closed. */
function fakeFetch(
  input: string | URL | Request,
  init?: RequestInit,
): Promise<Response> {
  const url = String(input);
  const headers = new Headers(init?.headers);
  requests.push({
    url,
    body: typeof init?.body === 'string' ? JSON.parse(init.body) : null,
    authorization: headers.get('Authorization'),
  });
  if (url.includes('/multimodal-generation/')) {
    if (failSpeech)
      return Promise.resolve(
        Response.json({ code: 'InvalidApiKey' }, { status: 401 }),
      );
    return Promise.resolve(
      Response.json({
        output: {
          audio: {
            url: 'https://dashscope-result-bj.oss-cn-beijing.aliyuncs.com/test.wav',
          },
        },
        usage: { characters: 10 },
      }),
    );
  }
  if (url.endsWith('/test.wav')) return Promise.resolve(new Response(wav()));
  if (url.includes('/uploads?action='))
    return Promise.resolve(
      Response.json({
        data: {
          policy: 'test',
          signature: 'test',
          upload_dir: 'offline',
          upload_host: 'https://dashscope-file-bj.oss-cn-beijing.aliyuncs.com',
          oss_access_key_id: 'offline',
          x_oss_object_acl: 'private',
          x_oss_forbid_overwrite: 'true',
        },
      }),
    );
  if (url === 'https://dashscope-file-bj.oss-cn-beijing.aliyuncs.com/')
    return Promise.resolve(new Response(''));
  if (url.endsWith('/face-detect'))
    return Promise.resolve(Response.json({ output: { check_pass: true } }));
  if (url.endsWith('/video-synthesis'))
    return Promise.resolve(
      Response.json({
        output: { task_id: 'offline-task', task_status: 'PENDING' },
      }),
    );
  if (url.includes('/tasks/')) {
    polls++;
    return Promise.resolve(
      Response.json({
        output: {
          task_id: 'offline-task',
          task_status: 'SUCCEEDED',
          results: {
            video_url:
              'https://dashscope-result-hz.oss-cn-hangzhou.aliyuncs.com/test.mp4',
          },
        },
        usage: { duration: 9.408 },
      }),
    );
  }
  if (url.endsWith('/test.mp4'))
    return Promise.resolve(
      new Response(readFileSync(resolve(isolated, 'fixture.mp4'))),
    );
  return Promise.reject(
    new Error(`Unexpected offline route: ${new URL(url).pathname}`),
  );
}

before(() => {
  // Modules are imported after cwd changes so production uploads and budget files are never touched.
  process.chdir(isolated);
  globalThis.fetch = fakeFetch;
  delete process.env.DASHSCOPE_API_KEY;
  delete process.env.DASHSCOPE_WORKSPACE_ID;
  symlinkSync(
    resolve(source, 'node_modules'),
    resolve(isolated, 'node_modules'),
  );
  copyFileSync(
    resolve(source, 'package.json'),
    resolve(isolated, 'package.json'),
  );
  return import('../../server/cloud/cloud').then((module) => {
    cloud = module;
    return promisify(execFile)(
      'pnpm',
      [
        'exec',
        'remotion',
        'ffmpeg',
        '-y',
        '-f',
        'lavfi',
        '-i',
        'nullsrc=s=480x640:r=16',
        '-f',
        'lavfi',
        '-i',
        'anullsrc=r=24000:cl=mono',
        '-t',
        '1',
        '-c:v',
        'libx264',
        '-c:a',
        'aac',
        '-pix_fmt',
        'yuv420p',
        resolve(isolated, 'fixture.mp4'),
      ],
      { cwd: isolated, timeout: 30000 },
    );
  });
});
after(() => {
  globalThis.fetch = originalFetch;
  if (originalKey === undefined) delete process.env.DASHSCOPE_API_KEY;
  else process.env.DASHSCOPE_API_KEY = originalKey;
  if (originalWorkspace === undefined)
    delete process.env.DASHSCOPE_WORKSPACE_ID;
  else process.env.DASHSCOPE_WORKSPACE_ID = originalWorkspace;
  process.chdir(source);
  rmSync(isolated, { recursive: true });
});

test('missing key causes zero network calls and zero reservations', () => {
  assert.equal(cloud.getCloudStatus().ready, false);
  return assert
    .rejects(
      cloud.withCloudLock(() =>
        cloud.cloudSpeech('今天从院子看起。', 'Cherry'),
      ),
      /DASHSCOPE_API_KEY/,
    )
    .then(() => {
      assert.equal(requests.length, 0);
      assert.equal(
        Object.keys(readCloudLedger(cloud.CLOUD_LEDGER).calls).length,
        0,
      );
    });
});

test('speech uses standard Beijing origin, Chinese language and voice settings, and a reusable inspected cache', () => {
  process.env.DASHSCOPE_API_KEY = 'sk-offline.test-not-a-real-credential';
  return cloud
    .withCloudLock(() => cloud.cloudSpeech('今天从院子看起。', 'Cherry'))
    .then((audio) => {
      assert.equal(audio.duration, 1);
      assert.equal(audio.text, '今天从院子看起。');
      assert.equal(audio.src.startsWith('/media/speech-'), true);
      const submission = requests.find((request) =>
        request.url.includes('/multimodal-generation/'),
      )!;
      assert.equal(new URL(submission.url).hostname, 'dashscope.aliyuncs.com');
      assert.deepEqual(submission.body, {
        model: 'qwen3-tts-flash',
        input: {
          text: audio.text,
          voice: 'Cherry',
          language_type: 'Chinese',
        },
      });
      const count = requests.length;
      return cloud
        .withCloudLock(() => cloud.cloudSpeech('今天从院子看起。', 'Cherry'))
        .then((cached) => {
          assert.deepEqual(cached, audio);
          assert.equal(requests.length, count);
        });
    });
});

test('HTTP failure remains observable and the same paid speech is never automatically resubmitted', () => {
  failSpeech = true;
  return assert
    .rejects(
      cloud.withCloudLock(() => cloud.cloudSpeech('失败路径。', 'Cherry')),
      /HTTP 401/,
    )
    .then(() => {
      const count = requests.length;
      return assert
        .rejects(
          cloud.withCloudLock(() => cloud.cloudSpeech('失败路径。', 'Cherry')),
          /结果尚未确认/,
        )
        .then(() => assert.equal(requests.length, count));
    })
    .finally(() => {
      failSpeech = false;
    });
});

test('budget retains ambiguous/failed charges, enforces 30 yuan and two video attempts', () => {
  const file = resolve(isolated, 'limits.json');
  reserveCloudCall(file, 'a', CloudCallKind.Video, 10800);
  updateCloudCall(file, 'a', { state: CloudCallState.Failed });
  assert.throws(
    () => reserveCloudCall(file, 'a', CloudCallKind.Video, 10800),
    /重复提交/,
  );
  reserveCloudCall(file, 'b', CloudCallKind.Video, 10800);
  assert.throws(
    () => reserveCloudCall(file, 'c', CloudCallKind.Video, 1),
    /两版/,
  );
  assert.throws(
    () => reserveCloudCall(file, 'd', CloudCallKind.Speech, 10000),
    /30元/,
  );
  assert.equal(readCloudLedger(file).calls.a.reserved_milli, 10800);
});

test('cloud media rejects arbitrary hosts, local addresses, userinfo, and ports', () => {
  [
    'https://evil.example/voice.wav',
    'https://127.0.0.1/x',
    'https://oss-cn-beijing.aliyuncs.com.evil.example/x',
    'https://a.oss-cn-beijing.aliyuncs.com:8080/x',
    'https://user@a.oss-cn-beijing.aliyuncs.com/x',
  ].forEach((url) => assert.throws(() => cloud.aliyunMediaUrl(url)));
  assert.equal(
    cloud
      .aliyunMediaUrl(
        'http://dashscope-result-bj.oss-cn-beijing.aliyuncs.com/x',
      )
      .startsWith('https://'),
    true,
  );
});

test('exclusive lock blocks overlapping production commands', () => {
  return cloud.withCloudLock(() =>
    assert.rejects(
      cloud.withCloudLock(() => Promise.resolve()),
      /正在执行/,
    ),
  );
});

test('video contract uses model-bound uploads, workspace task recovery, and real MP4 normalization', () => {
  process.env.DASHSCOPE_WORKSPACE_ID = 'offline-workspace';
  copyFileSync(
    resolve(source, 'public/demo/living.jpg'),
    resolve(isolated, 'data/uploads/photo.jpg'),
  );
  return cloud
    .withCloudLock(() =>
      cloud
        .cloudSpeech('今天从院子看起。', 'Cherry')
        .then((audio) => cloud.cloudOpening('/media/photo.jpg', audio)),
    )
    .then((clip) => {
      assert.equal(clip.duration > 0 && clip.duration <= 12.15, true);
      assert.equal(clip.width > 0, true);
      assert.equal(
        existsSync(
          resolve(isolated, 'data/uploads', clip.src.split('/').pop()!),
        ),
        true,
      );
      assert.equal(polls, 1);
      const submission = requests.find((request) =>
        request.url.endsWith('/video-synthesis'),
      )!;
      assert.equal(
        new URL(submission.url).hostname,
        'offline-workspace.cn-beijing.maas.aliyuncs.com',
      );
      const payload = submission.body as {
        model: string;
        input: { image_url: string; audio_url: string };
        parameters: { resolution: string };
      };
      assert.equal(payload.model, 'wan2.2-s2v');
      assert.equal(payload.parameters.resolution, '720P');
      assert.match(payload.input.image_url, /^oss:\/\//);
      assert.match(payload.input.audio_url, /^oss:\/\//);
      const posts = requests.filter((request) =>
        request.url.endsWith('/video-synthesis'),
      ).length;
      return cloud
        .withCloudLock(() =>
          cloud
            .cloudSpeech('今天从院子看起。', 'Cherry')
            .then((audio) => cloud.cloudOpening('/media/photo.jpg', audio)),
        )
        .then((cached) => {
          assert.deepEqual(cached, clip);
          assert.equal(
            requests.filter((request) =>
              request.url.endsWith('/video-synthesis'),
            ).length,
            posts,
          );
          assert.equal(
            requests.filter(
              (request) =>
                request.url.includes('.oss-cn-') && request.authorization,
            ).length,
            0,
          );
        });
    });
});

test('pending tasks resume by stored task_id and download without another generation POST', () => {
  // The real identity is reused, then only the local completion fields are removed to emulate interruption.
  const ledger = readCloudLedger(cloud.CLOUD_LEDGER);
  const videoKey = Object.keys(ledger.calls).find(
    (id) => ledger.calls[id].kind === CloudCallKind.Video,
  )!;
  updateCloudCall(cloud.CLOUD_LEDGER, videoKey, {
    state: CloudCallState.Submitted,
    remote_url: undefined,
    clip: undefined,
  });
  const posts = requests.filter((request) =>
    request.url.endsWith('/video-synthesis'),
  ).length;
  return cloud
    .withCloudLock(() =>
      cloud
        .cloudSpeech('今天从院子看起。', 'Cherry')
        .then((audio) => cloud.cloudOpening('/media/photo.jpg', audio)),
    )
    .then(() => {
      assert.equal(polls, 2);
      assert.equal(
        requests.filter((request) => request.url.endsWith('/video-synthesis'))
          .length,
        posts,
      );
    });
});

test('streamed oversize assets never publish a partial local file', () => {
  const target = resolve(isolated, 'oversize.wav');
  return assert
    .rejects(
      cloud.downloadCloudMedia(
        'https://dashscope-result-bj.oss-cn-beijing.aliyuncs.com/test.wav',
        target,
        10,
      ),
      /上限/,
    )
    .then(() => {
      assert.equal(existsSync(target), false);
      assert.equal(existsSync(`${target}.part`), false);
    });
});

test('actual recording length is checked before any upload or reservation', () => {
  const long = Buffer.alloc(44 + 48000 * 13);
  wav().copy(long, 0, 0, 44);
  long.writeUInt32LE(long.length - 8, 4);
  long.writeUInt32LE(long.length - 44, 40);
  writeFileSync(resolve(isolated, 'data/uploads/long.wav'), long);
  const count = requests.length;
  const reservations = Object.keys(
    readCloudLedger(cloud.CLOUD_LEDGER).calls,
  ).length;
  return assert
    .rejects(
      cloud.withCloudLock(() =>
        cloud.cloudOpening('/media/photo.jpg', {
          src: '/media/long.wav',
          duration: 1,
          name: 'false metadata',
          text: null,
        }),
      ),
      /12秒/,
    )
    .then(() => {
      assert.equal(requests.length, count);
      assert.equal(
        Object.keys(readCloudLedger(cloud.CLOUD_LEDGER).calls).length,
        reservations,
      );
    });
});

test('driving audio preserves the sentence with short silence buffers and a canonical WAV header', () => {
  return cloud
    .withCloudLock(() =>
      cloud
        .cloudSpeech('今天从院子看起。', 'Cherry')
        .then((audio) => cloud.prepareDrivingAudio(audio)),
    )
    .then((path) => {
      const bytes = readFileSync(path);
      assert.equal(bytes.toString('ascii', 0, 4), 'RIFF');
      assert.equal(bytes.readUInt32LE(4), bytes.length - 8);
      // Read real duration through ffprobe; it must include 250ms head and 150ms tail padding.
      return promisify(execFile)(
        'pnpm',
        [
          'exec',
          'remotion',
          'ffprobe',
          '-v',
          'quiet',
          '-show_entries',
          'format=duration',
          '-of',
          'default=noprint_wrappers=1:nokey=1',
          path,
        ],
        { cwd: isolated, timeout: 30000 },
      ).then(({ stdout }) => assert.equal(Number(stdout), 1.4));
    });
});
