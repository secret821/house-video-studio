/** Real API-to-MP4 acceptance. VERIFY_JOB requires an explicitly exported browser draft in VERIFY_PROJECT. */
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { promisify } from 'node:util';
import { z } from 'zod';
import {
  apiEnvelopeSchema,
  toCamelKey,
  toSnakeKey,
  transformKeys,
} from '../src/services/definition/api-wire';

import {
  DIMENSIONS,
  FPS,
  JobStatus,
  jobSchema,
  projectSchema,
  sceneSchema,
  type Project,
} from '../src/services/definition/project';
import { getTimeline } from '../src/video/timeline';

const origin = process.env.VERIFY_ORIGIN || 'http://127.0.0.1:4318';
const runFile = promisify(execFile);

function readSuccess(response: Response): Promise<unknown> {
  return response.json().then((raw: unknown) => {
    const envelope = apiEnvelopeSchema.parse(transformKeys(raw, toCamelKey));
    assert.ok(response.ok && envelope.code === 0, envelope.message);
    return envelope.data;
  });
}

/** Keep HTTP failures explicit in the acceptance script as in the application. */
function request(path: string, body?: unknown) {
  return fetch(
    `${origin}/api/${path}`,
    body === undefined
      ? {}
      : {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(transformKeys(body, toSnakeKey)),
        },
  ).then(readSuccess);
}

/** Poll real work with a deadline; the 1s interval avoids hammering the local renderer. */
function waitForJob(
  id: string,
  deadline: number,
): Promise<z.infer<typeof jobSchema>> {
  return request(`get-render-job/${id}`).then((body) => {
    const job = jobSchema.parse(body);
    console.info(job.message);
    if (job.status === JobStatus.Complete) return job;
    if (job.status === JobStatus.Failed) throw new Error(job.message);
    assert.ok(Date.now() < deadline, '导出超时');
    return new Promise<void>((resolveTimer) =>
      setTimeout(resolveTimer, 1000),
    ).then(() => waitForJob(id, deadline));
  });
}

/** Verify upload normalization, invalid input, local-origin isolation and single-job concurrency. */
function verifyApi(project: Project) {
  const form = new FormData();
  form.append(
    'file',
    new Blob([readFileSync('public/demo/living.jpg')], { type: 'image/jpeg' }),
    '客厅.jpg',
  );
  return fetch(`${origin}/api/upload-image`, { method: 'POST', body: form })
    .then((response) => {
      assert.equal(response.status, 200);
      return readSuccess(response);
    })
    .then((raw) => {
      const asset = z.object({ src: z.string() }).parse(raw);
      assert.match(asset.src, /^\/media\/.+\.jpg$/);
      return fetch(`${origin}/api/create-render-job`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          transformKeys({ ...project, scenes: [], opening: null }, toSnakeKey),
        ),
      });
    })
    .then((response) => {
      assert.equal(response.status, 400);
      return fetch(`${origin}/api/save-draft`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Origin: 'https://example.com',
        },
        body: JSON.stringify(transformKeys(project, toSnakeKey)),
      });
    })
    .then((response) => {
      assert.equal(response.status, 403);
      return fetch(`${origin}/api/create-render-job`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          transformKeys(
            {
              ...project,
              scenes: [
                { ...project.scenes[0], src: 'http://127.0.0.1/private.jpg' },
              ],
            },
            toSnakeKey,
          ),
        ),
      });
    })
    .then((response) => {
      assert.equal(response.status, 400);
      const corrupt = new FormData();
      corrupt.append(
        'file',
        new Blob(['not an image'], { type: 'image/jpeg' }),
        'invalid.jpg',
      );
      return fetch(`${origin}/api/upload-image`, {
        method: 'POST',
        body: corrupt,
      });
    })
    .then((response) => {
      assert.equal(response.status, 400);
      const audio = new FormData();
      audio.append(
        'file',
        new Blob([readFileSync('public/demo/music.wav')], {
          type: 'audio/wav',
        }),
        'music.wav',
      );
      return fetch(`${origin}/api/upload-audio`, {
        method: 'POST',
        body: audio,
      });
    })
    .then((response) => {
      assert.equal(response.status, 200);
      return readSuccess(response);
    })
    .then((raw) => {
      const asset = z.object({ duration: z.number() }).parse(raw);
      assert.equal(asset.duration, 16);
    });
}

/** Inspect actual encoded streams, duration and seekable visual frames rather than file existence alone. */
function inspectVideo(details: {
  project: Project;
  output: string;
  id: string;
}) {
  const path = resolve('data/exports', details.output.split('/').pop()!);
  const probeSchema = z.object({
    streams: z.array(
      z
        .object({
          codec_type: z.string(),
          codec_name: z.string(),
          width: z.number().optional(),
          height: z.number().optional(),
        })
        .passthrough(),
    ),
    format: z.object({ duration: z.string() }).passthrough(),
  });
  return runFile(
    'pnpm',
    [
      'exec',
      'remotion',
      'ffprobe',
      '-v',
      'quiet',
      '-print_format',
      'json',
      '-show_streams',
      '-show_format',
      path,
    ],
    { maxBuffer: 4 * 1024 * 1024 },
  ).then(({ stdout }) => {
    const metadata = probeSchema.parse(JSON.parse(stdout));
    const video = metadata.streams.find(
      (stream) => stream.codec_type === 'video',
    );
    const audio = metadata.streams.find(
      (stream) => stream.codec_type === 'audio',
    );
    assert.equal(video?.codec_name, 'h264');
    assert.equal(audio?.codec_name, 'aac');
    assert.equal(video?.width, DIMENSIONS[details.project.aspect].width);
    assert.equal(video?.height, DIMENSIONS[details.project.aspect].height);
    assert.ok(
      Math.abs(
        Number(metadata.format.duration) -
          getTimeline(details.project).frames / FPS,
      ) < 0.15,
    );
    const report = {
      id: details.id,
      output: path,
      metadata,
      scenes: details.project.scenes.length,
      narrationTracks: details.project.scenes.filter((scene) => scene.voiceover)
        .length,
      passed: true,
    };
    writeFileSync('data/verification.json', JSON.stringify(report, null, 2));
    writeFileSync(
      'data/verified-project.json',
      JSON.stringify(details.project, null, 2),
    );
    return getTimeline(details.project)
      .scenes.reduce(
        (chain, scene, index) =>
          chain
            .then(() =>
              runFile(
                'pnpm',
                [
                  'exec',
                  'remotion',
                  'ffmpeg',
                  '-y',
                  '-ss',
                  String(scene.start / FPS + 1),
                  '-i',
                  path,
                  '-frames:v',
                  '1',
                  '-vf',
                  'scale=360:-1',
                  `data/scene-${index + 1}.png`,
                ],
                { maxBuffer: 4 * 1024 * 1024 },
              ),
            )
            .then(() => undefined),
        Promise.resolve(),
      )
      .then(() => {
        console.info(JSON.stringify(report, null, 2));
      });
  });
}

const source = process.env.VERIFY_JOB
  ? Promise.resolve().then(() => {
      if (!process.env.VERIFY_PROJECT)
        throw new Error(
          '草稿仅在浏览器保存；请用VERIFY_PROJECT指定导出的草稿JSON。',
        );
      return JSON.parse(
        readFileSync(process.env.VERIFY_PROJECT, 'utf8'),
      ) as unknown;
    })
  : request('get-demo');
source
  .then((body) => projectSchema.parse(body))
  .then((project) => verifyApi(project).then(() => project))
  .then((project) => {
    if (process.env.VERIFY_JOB) return { project, id: process.env.VERIFY_JOB };
    // Verification must never spend cloud allowance or overwrite the user's saved draft.
    const voiced = { ...project, scenes: [...project.scenes] };
    return project.scenes
      .reduce(
        (chain, scene, index) =>
          chain.then(() =>
            request('generate-local-narration', scene).then((body) => {
              voiced.scenes[index] = sceneSchema.parse(body);
            }),
          ),
        Promise.resolve(),
      )
      .then(() => voiced)
      .then((voiced) =>
        request('create-render-job', voiced).then((body) => ({
          project: voiced,
          id: jobSchema.parse(body).id,
        })),
      );
  })
  .then((details) => {
    if (process.env.VERIFY_JOB) return details;
    return fetch(`${origin}/api/create-render-job`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(transformKeys(details.project, toSnakeKey)),
    }).then((response) => {
      assert.equal(response.status, 409, '并发导出必须返回可重试的忙碌状态');
      return details;
    });
  })
  .then(({ project, id }) =>
    waitForJob(id, Date.now() + 10 * 60_000).then((job) => {
      assert.ok(job.output);
      return inspectVideo({ project, id, output: job.output });
    }),
  )
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  });
