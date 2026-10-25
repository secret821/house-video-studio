/** One local rendering job at a time, with durable progress and actionable failure state. */
import { bundle } from '@remotion/bundler';
import { renderMedia, selectComposition } from '@remotion/renderer';
import { randomUUID } from 'node:crypto';
import {
  existsSync,
  readFileSync,
  mkdirSync,
  readdirSync,
  renameSync,
  statSync,
  statfsSync,
  writeFileSync,
} from 'node:fs';
import { resolve } from 'node:path';

import {
  JobStatus,
  FPS,
  jobSchema,
  type Project,
  type RenderJob,
} from '../src/services/definition/project';

import { DATA, EXPORTS, ROOT, HttpError, validateAssets } from './media';
import { getTimeline } from '../src/video/timeline';
import {
  CACHE_DIRECTORY,
  getTemplateFingerprint,
  getRenderSegments,
  hasCachedSegment,
  segmentPaths,
  commitSegment,
  concatenateSegments,
} from './render-cache';

let activeJob: RenderJob | null = null;
let bundlePromise: Promise<string> | null = null;
let bundleIdentity = '';

/** Atomic status writes allow clients to observe real progress and recover after restart. */
function persistJob(job: RenderJob) {
  const path = resolve(DATA, 'jobs', `${job.id}.json`);
  writeFileSync(`${path}.tmp`, JSON.stringify(job));
  renameSync(`${path}.tmp`, path);
}

/** Reuse a compiled template only while its source matches the segment-cache identity. */
function getBundle() {
  const identity = getTemplateFingerprint();
  if (!bundlePromise || bundleIdentity !== identity) {
    bundleIdentity = identity;
    bundlePromise = bundle({
      entryPoint: resolve(ROOT, 'src/video/index.ts'),
      enableCaching: false,
      outDir: resolve(DATA, 'bundle'),
    }).catch((error: unknown) => {
      bundlePromise = null;
      throw error;
    });
  }
  return bundlePromise;
}

/** Read a persisted job; an interrupted render is never reported as still making progress. */
export function getJob(id: string): RenderJob {
  if (!/^[a-f0-9-]{36}$/.test(id)) throw new HttpError(400, '无效的任务编号。');
  if (activeJob?.id === id) return activeJob;
  const path = resolve(DATA, 'jobs', `${id}.json`);
  if (!existsSync(path)) throw new HttpError(404, '任务不存在。');
  const job = jobSchema.parse(JSON.parse(readFileSync(path, 'utf8')));
  if (job.status === JobStatus.Rendering) {
    job.status = JobStatus.Failed;
    job.message = '服务已重启，导出中断，请重新导出。';
    persistJob(job);
  }
  return job;
}

/** Restore the latest task after page refresh, including interrupted-task failure state. */
export function getLatestJob(): RenderJob | null {
  if (activeJob) return activeJob;
  const directory = resolve(DATA, 'jobs');
  const paths = readdirSync(directory)
    .filter((name) => /^[a-f0-9-]{36}\.json$/.test(name))
    .sort(
      (left, right) =>
        statSync(resolve(directory, right)).mtimeMs -
        statSync(resolve(directory, left)).mtimeMs,
    );
  return paths.length ? getJob(paths[0].replace('.json', '')) : null;
}

/** Validate a frozen project snapshot before starting any background work. */
export function createJob(project: Project, origin: string): RenderJob {
  if (activeJob) throw new HttpError(409, '已有视频正在导出，请等待完成。');
  project = structuredClone(project);
  validateAssets(project);
  const segments = getRenderSegments(project);
  const cached = new Set(
    segments.filter(hasCachedSegment).map((segment) => segment.key),
  );
  mkdirSync(CACHE_DIRECTORY, { recursive: true });
  // Budget both the temporary encoder output and final 1080P asset before launching Chromium/ffmpeg.
  const disk = statfsSync(EXPORTS);
  const requiredBytes =
    (64 + (getTimeline(project).frames / FPS) * 2) * 1024 * 1024;
  if (disk.bavail * disk.bsize < requiredBytes)
    throw new HttpError(
      507,
      `导出工作空间不足，请先释放至少${Math.ceil(requiredBytes / 1024 / 1024)}MB可用空间；已有云端素材会保留。`,
    );
  const job: RenderJob = {
    sessionId: project.sessionId,
    id: randomUUID(),
    status: JobStatus.Rendering,
    progress: 0,
    message: '正在准备视频模板…',
    output: null,
    cache: {
      rendered: 0,
      reused: segments.filter((segment) => cached.has(segment.key)).length,
      total: segments.length,
    },
  };
  const absoluteProject: Project = {
    ...project,
    opening: project.opening && {
      ...project.opening,
      clip: project.opening.clip && {
        ...project.opening.clip,
        src: origin + project.opening.clip.src,
      },
    },
    scenes: project.scenes.map((scene) => ({
      ...scene,
      src: origin + scene.src,
      voiceover: scene.voiceover && {
        ...scene.voiceover,
        src: origin + scene.voiceover.src,
      },
    })),
    music: project.music && {
      ...project.music,
      src: origin + project.music.src,
    },
  };
  activeJob = job;
  persistJob(job);
  const browserExecutable =
    process.env.CHROME_PATH ||
    (process.platform === 'darwin'
      ? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
      : undefined);
  const preparation = segments.every((segment) => cached.has(segment.key))
    ? Promise.resolve()
    : getBundle()
        .then((serveUrl) =>
          selectComposition({
            serveUrl,
            id: 'HouseTour',
            inputProps: { project: absoluteProject },
            browserExecutable,
          }).then((composition) => ({ serveUrl, composition })),
        )
        .then(({ serveUrl, composition }) =>
          segments.reduce(
            (chain, segment, index) =>
              chain.then(() => {
                if (cached.has(segment.key)) {
                  job.progress = ((index + 1) / segments.length) * 0.95;
                  job.message = `复用缓存：${segment.label}`;
                  return;
                }
                const paths = segmentPaths(segment);
                return renderMedia({
                  serveUrl,
                  composition,
                  inputProps: { project: absoluteProject },
                  codec: 'h264',
                  audioCodec: 'pcm-16',
                  separateAudioTo: paths.audio,
                  sampleRate: 48000,
                  pixelFormat: 'yuv420p',
                  crf: 20,
                  concurrency: 1,
                  outputLocation: paths.video,
                  frameRange: [segment.start, segment.end],
                  browserExecutable,
                  timeoutInMilliseconds: 60_000,
                  onProgress: ({ progress }) => {
                    job.progress =
                      ((index + progress) / segments.length) * 0.95;
                    job.message = `本地更新 ${segment.label} · ${Math.round(progress * 100)}%（复用${job.cache!.reused}段）`;
                  },
                }).then(() => {
                  commitSegment(segment);
                  job.cache!.rendered += 1;
                  persistJob(job);
                });
              }),
            Promise.resolve(),
          ),
        );
  preparation
    .then(() => {
      job.message = '正在本地拼接缓存片段，不调用付费模型…';
      job.progress = 0.96;
      writeFileSync(
        resolve(DATA, 'jobs', `${job.id}-segments.json`),
        JSON.stringify({ segments, cache: job.cache }, null, 2),
      );
      const output = resolve(EXPORTS, `${job.id}.part.mp4`);
      return concatenateSegments({ segments, id: job.id, output }).then(() =>
        renameSync(output, resolve(EXPORTS, `${job.id}.mp4`)),
      );
    })
    .then(() => {
      job.status = JobStatus.Complete;
      job.progress = 1;
      job.message = `视频已生成：本地更新${job.cache!.rendered}段、复用${job.cache!.reused}段，未调用付费模型。`;
      job.output = `/exports/${job.id}.mp4`;
    })
    .catch((error: unknown) => {
      job.status = JobStatus.Failed;
      job.message = `导出失败：${error instanceof Error ? error.message.slice(0, 600) : '未知渲染错误'}`;
      console.error('[render]', job.id, error);
    })
    .finally(() => {
      persistJob(job);
      activeJob = null;
    });
  return { ...job };
}
