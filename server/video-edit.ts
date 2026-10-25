/** Local-only video ingest, independent drafts and export jobs; no cloud client or credential is imported. */
import { bundle } from '@remotion/bundler';
import {
  renderMedia,
  renderStill,
  selectComposition,
} from '@remotion/renderer';
import { Router } from 'express';
import multer from 'multer';
import { createHash, randomUUID } from 'node:crypto';
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  renameSync,
  statSync,
  statfsSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs';
import { basename, resolve } from 'node:path';
import { z } from 'zod';

import { FPS, JobStatus } from '../src/services/definition/project';
import {
  EMPTY_VIDEO_EDIT,
  CoverSource,
  importedVideoSchema,
  videoEditJobSchema,
  videoEditSchema,
  type ImportedVideo,
  type VideoEditJob,
  type VideoEditProject,
} from '../src/services/definition/video-edit';
import { getVideoEditTimeline } from '../src/video/video-edit-timeline';

import {
  DATA,
  EXPORTS,
  ROOT,
  UPLOADS,
  HttpError,
  resolveAsset,
  runFile,
} from './media';
import { getOriginalMusic } from './video-edit-music';

const DIRECTORY = resolve(DATA, 'video-edit');
const JOBS = resolve(DIRECTORY, 'jobs');
const INCOMING = resolve(DIRECTORY, 'incoming');
for (const path of [JOBS, INCOMING]) mkdirSync(path, { recursive: true });
let activeJob: VideoEditJob | null = null;
let compiled: { identity: string; promise: Promise<string> } | null = null;
const probeSchema = z.object({
  format: z.object({ duration: z.string() }),
  streams: z.array(
    z.object({
      codec_type: z.string(),
      width: z.number().optional(),
      height: z.number().optional(),
    }),
  ),
});

/** Inspect the actual file, never trusting a client-supplied duration or an extension alone. */
export function probeVideo(path: string) {
  return runFile(
    'pnpm',
    [
      'exec',
      'remotion',
      'ffprobe',
      '-v',
      'error',
      '-show_entries',
      'stream=codec_type,width,height:format=duration',
      '-of',
      'json',
      path,
    ],
    { cwd: ROOT, timeout: 30_000, maxBuffer: 1024 * 1024 },
  )
    .then(({ stdout }) => {
      const metadata = probeSchema.parse(JSON.parse(stdout));
      const video = metadata.streams.find(
        (stream) => stream.codec_type === 'video',
      );
      const duration = Number(metadata.format.duration);
      if (
        !video?.width ||
        !video.height ||
        !Number.isFinite(duration) ||
        duration < 0.5 ||
        duration > 600
      )
        throw new HttpError(400, '视频需可解码，时长0.5秒至10分钟。');
      return {
        duration,
        width: video.width,
        height: video.height,
        hasAudio: metadata.streams.some(
          (stream) => stream.codec_type === 'audio',
        ),
      };
    })
    .catch((error: unknown) => {
      if (error instanceof HttpError) throw error;
      throw new HttpError(400, '无法读取视频，请上传有效的MP4或MOV文件。');
    });
}

/** Multipart filenames may arrive as Latin-1 decoded UTF-8; normalize only this transport boundary. */
function decodeUploadName(name: string): string {
  if (Array.from(name).some((character) => character.charCodeAt(0) > 255))
    return name;
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(
      Buffer.from(name, 'latin1'),
    );
  } catch {
    return name;
  } // Genuine Latin-1 names remain intact when they are not valid UTF-8 bytes.
}

/** Normalize rotation, frame rate and audio locally; immutable content names let repeated uploads reuse media. */
export function ingestVideo(
  path: string,
  originalName: string,
): Promise<ImportedVideo> {
  const digest = createHash('sha256')
    .update(readFileSync(path))
    .update('video-ingest-30fps-v2')
    .digest('hex');
  const filename = `import-${digest}.mp4`;
  const target = resolve(UPLOADS, filename);
  const part = resolve(INCOMING, `${randomUUID()}.part.mp4`);
  const poster = `import-${digest}.jpg`;
  const disk = statfsSync(UPLOADS);
  if (disk.bavail * disk.bsize < statSync(path).size * 2 + 128 * 1024 * 1024)
    return Promise.reject(
      new HttpError(507, '可用磁盘空间不足，请先释放空间再上传。'),
    );
  return probeVideo(path)
    .then((metadata) => {
      if (existsSync(target)) return;
      return runFile(
        'pnpm',
        [
          'exec',
          'remotion',
          'ffmpeg',
          '-v',
          'error',
          '-y',
          '-i',
          path,
          '-map',
          '0:v:0',
          '-map',
          '0:a:0?',
          '-vf',
          "scale=w='min(1080,iw)':h='min(1920,ih)':force_original_aspect_ratio=decrease:force_divisible_by=2",
          ...(metadata.hasAudio
            ? [
                '-af',
                `loudnorm=I=-16:TP=-1.5:LRA=11,atrim=duration=${metadata.duration},asetpts=PTS-STARTPTS`,
              ]
            : []),
          '-t',
          String(metadata.duration),
          '-r',
          '30',
          '-c:v',
          'libx264',
          '-preset',
          'fast',
          '-crf',
          '18',
          '-pix_fmt',
          'yuv420p',
          '-c:a',
          'aac',
          '-b:a',
          '192k',
          '-ar',
          '48000',
          '-threads',
          '2',
          '-map_metadata',
          '-1',
          '-movflags',
          '+faststart',
          part,
        ],
        { cwd: ROOT, timeout: 600_000, maxBuffer: 2 * 1024 * 1024 },
      ).then(() => renameSync(part, target));
    })
    .then(() => probeVideo(target))
    .then((metadata) => {
      const posterPath = resolve(UPLOADS, poster);
      const pending = existsSync(posterPath)
        ? Promise.resolve()
        : runFile(
            'pnpm',
            [
              'exec',
              'remotion',
              'ffmpeg',
              '-v',
              'error',
              '-y',
              '-ss',
              String(Math.min(1, metadata.duration / 2)),
              '-i',
              target,
              '-frames:v',
              '1',
              '-q:v',
              '2',
              posterPath,
            ],
            { cwd: ROOT, timeout: 30_000, maxBuffer: 1024 * 1024 },
          );
      return pending.then(() =>
        importedVideoSchema.parse({
          ...metadata,
          src: `/media/${filename}`,
          poster: `/media/${poster}`,
          name: basename(decodeUploadName(originalName)).slice(0, 160),
        }),
      );
    })
    .catch((error: unknown) => {
      if (error instanceof HttpError) throw error;
      console.error('[video-ingest]', error);
      throw new HttpError(
        422,
        '本地视频处理失败，请检查视频格式与可用磁盘空间；详情已记录在本机服务日志。',
      );
    })
    .finally(() => {
      if (existsSync(part)) unlinkSync(part);
    });
}

/** Atomic draft/job publication preserves the separate photo project and avoids half-written JSON on refresh. */
function persist(path: string, value: unknown) {
  writeFileSync(`${path}.tmp`, JSON.stringify(value, null, 2), { mode: 0o600 });
  renameSync(`${path}.tmp`, path);
}

/** An interrupted export is visibly failed after a restart; cached finished media remains available. */
export function getVideoEditJob(id: string): VideoEditJob {
  if (!/^[a-f0-9-]{36}$/.test(id)) throw new HttpError(400, '任务编号无效。');
  if (activeJob?.id === id) return activeJob;
  const path = resolve(JOBS, `${id}.json`);
  if (!existsSync(path)) throw new HttpError(404, '视频剪辑任务不存在。');
  const job = videoEditJobSchema.parse(JSON.parse(readFileSync(path, 'utf8')));
  if (job.status === JobStatus.Rendering) {
    job.status = JobStatus.Failed;
    job.message = '服务重启，剪辑导出中断；请重新导出，已有素材保留。';
    persist(path, job);
  }
  return job;
}

/** Restore the latest independent free-video job on page load. */
export function getLatestVideoEditJob(): VideoEditJob | null {
  if (activeJob) return activeJob;
  const files = readdirSync(JOBS)
    .filter((file) => /^[a-f0-9-]{36}\.json$/.test(file))
    .sort(
      (left, right) =>
        statSync(resolve(JOBS, right)).mtimeMs -
        statSync(resolve(JOBS, left)).mtimeMs,
    );
  return files.length ? getVideoEditJob(files[0].replace('.json', '')) : null;
}

/** All export media comes from validated local ownership paths; modified duration metadata is rejected. */
function validateVideoProject(project: VideoEditProject) {
  if (!project.opening || !project.house || !project.shots.length)
    return Promise.reject(
      new HttpError(400, '请上传开场、房屋视频，并保留至少一个房屋片段。'),
    );
  const clips = [project.opening, project.house];
  clips.forEach((clip) => {
    resolveAsset(clip.src);
    resolveAsset(clip.poster);
  });
  if (project.music) resolveAsset(project.music.src);
  if (project.coverSource === CoverSource.Image && project.coverImage)
    resolveAsset(project.coverImage);
  return Promise.all(
    clips.map((clip) =>
      probeVideo(resolveAsset(clip.src)).then((actual) => {
        if (
          Math.abs(actual.duration - clip.duration) > 1 / FPS ||
          actual.width !== clip.width ||
          actual.height !== clip.height ||
          actual.hasAudio !== clip.hasAudio
        )
          throw new HttpError(400, '视频信息已变化，请重新上传素材后导出。');
      }),
    ),
  );
}

/** A corrupt or incomplete local cache is rebuilt, rather than making identical exports permanently fail. */
function canReuseVideoOutput(paths: {
  marker: string;
  output: string;
  cover: string;
}): boolean {
  if (![paths.marker, paths.output, paths.cover].every(existsSync))
    return false;
  try {
    const cached = z
      .object({ video: z.string(), cover: z.string() })
      .parse(JSON.parse(readFileSync(paths.marker, 'utf8')));
    const digest = (path: string) =>
      createHash('sha256').update(readFileSync(path)).digest('hex');
    return (
      cached.video === digest(paths.output) &&
      cached.cover === digest(paths.cover)
    );
  } catch (error) {
    console.warn(
      '[video-edit-cache] invalid local marker; rebuilding',
      error instanceof Error ? error.name : 'invalid marker',
    );
    return false;
  }
}

/** The free path freezes one snapshot and runs only local bundling/rendering, with durable progress. */
export function createVideoEditJob(
  project: VideoEditProject,
  origin: string,
): VideoEditJob {
  if (activeJob) throw new HttpError(409, '已有免费视频正在导出，请稍候。');
  if (!project.opening || !project.house || !project.shots.length)
    throw new HttpError(400, '请先上传两段视频并设置房屋片段。');
  project = structuredClone(project);
  const required =
    (192 + (getVideoEditTimeline(project).frames / FPS) * 3) * 1024 * 1024;
  const disk = statfsSync(EXPORTS);
  if (disk.bavail * disk.bsize < required)
    throw new HttpError(
      507,
      `导出需要约${Math.ceil(required / 1024 / 1024)}MB可用空间。`,
    );
  const job: VideoEditJob = {
    sessionId: project.sessionId,
    id: randomUUID(),
    status: JobStatus.Rendering,
    progress: 0,
    message: '正在核对本地视频…',
    output: null,
    cover: null,
    reused: false,
  };
  activeJob = job;
  persist(resolve(JOBS, `${job.id}.json`), job);
  const template = [
    'video-edit.tsx',
    'video-edit-timeline.ts',
    'video-edit-index.tsx',
  ]
    .map((file) => readFileSync(resolve(ROOT, 'src/video', file), 'utf8'))
    .join('\n');
  const identity = createHash('sha256').update(template).digest('hex');
  const absolute: VideoEditProject = {
    ...project,
    coverImage: project.coverImage && origin + project.coverImage,
    opening: {
      ...project.opening!,
      src: origin + project.opening!.src,
      poster: origin + project.opening!.poster,
    },
    house: {
      ...project.house!,
      src: origin + project.house!.src,
      poster: origin + project.house!.poster,
    },
    music: project.music && {
      ...project.music,
      src: origin + project.music.src,
    },
  };
  const browserExecutable =
    process.env.CHROME_PATH ||
    (process.platform === 'darwin'
      ? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
      : undefined);
  Promise.resolve()
    .then(() => validateVideoProject(project))
    .then(() => {
      const hash = createHash('sha256')
        .update(JSON.stringify(project))
        .update(identity)
        .update('h264-crf19-aac48k-v1');
      [
        project.opening!.src,
        project.house!.src,
        project.house!.poster,
        ...(project.coverSource === CoverSource.Image && project.coverImage
          ? [project.coverImage]
          : []),
        ...(project.music ? [project.music.src] : []),
      ].forEach((src) => hash.update(readFileSync(resolveAsset(src))));
      const key = hash.digest('hex');
      const movie = `free-tour-${key}.mp4`;
      const cover = `free-cover-${key}.png`;
      const output = resolve(EXPORTS, movie);
      const coverPath = resolve(EXPORTS, cover);
      const marker = resolve(DIRECTORY, `${key}.json`);
      if (canReuseVideoOutput({ marker, output, cover: coverPath })) {
        job.output = `/exports/${movie}`;
        job.cover = `/exports/${cover}`;
        job.reused = true;
        return;
      }
      if (!compiled || compiled.identity !== identity)
        compiled = {
          identity,
          promise: bundle({
            entryPoint: resolve(ROOT, 'src/video/video-edit-index.tsx'),
            outDir: resolve(DIRECTORY, 'bundle'),
            enableCaching: false,
          }).catch((error: unknown) => {
            compiled = null;
            throw error;
          }),
        };
      job.message = '正在准备本地剪辑模板…';
      const part = resolve(EXPORTS, `free-${job.id}.part.mp4`);
      return compiled.promise
        .then((serveUrl) =>
          selectComposition({
            serveUrl,
            id: 'FreeVideoTour',
            inputProps: { project: absolute },
            browserExecutable,
          }).then((composition) => ({ serveUrl, composition })),
        )
        .then(({ serveUrl, composition }) =>
          renderMedia({
            serveUrl,
            composition,
            inputProps: { project: absolute },
            codec: 'h264',
            audioCodec: 'aac',
            sampleRate: 48000,
            crf: 19,
            pixelFormat: 'yuv420p',
            concurrency: 1,
            browserExecutable,
            outputLocation: part,
            timeoutInMilliseconds: 60_000,
            onProgress: ({ progress }) => {
              job.progress = progress * 0.95;
              job.message = `本地剪辑中 ${Math.round(progress * 100)}% · 不调用付费模型`;
            },
          })
            .then(() =>
              selectComposition({
                serveUrl,
                id: 'FreeVideoCover',
                inputProps: { project: absolute },
                browserExecutable,
              }),
            )
            .then((coverComposition) =>
              renderStill({
                serveUrl,
                composition: coverComposition,
                inputProps: { project: absolute },
                output: coverPath,
                imageFormat: 'png',
                browserExecutable,
              }),
            )
            .then(() => {
              renameSync(part, output);
              persist(marker, {
                video: createHash('sha256')
                  .update(readFileSync(output))
                  .digest('hex'),
                cover: createHash('sha256')
                  .update(readFileSync(coverPath))
                  .digest('hex'),
              });
              job.output = `/exports/${movie}`;
              job.cover = `/exports/${cover}`;
            }),
        );
    })
    .then(() => {
      job.status = JobStatus.Complete;
      job.progress = 1;
      job.message = job.reused
        ? '已复用本地成片与封面，未重新渲染。'
        : '免费剪辑完成，成片与封面均保存在本机。';
    })
    .catch((error: unknown) => {
      job.status = JobStatus.Failed;
      job.message = `本地剪辑失败：${error instanceof Error ? error.message.slice(0, 500) : '未知错误'}`;
      console.error('[video-edit]', job.id, error);
    })
    .finally(() => {
      persist(resolve(JOBS, `${job.id}.json`), job);
      activeJob = null;
    });
  return { ...job };
}

export const videoEditRouter = Router();
videoEditRouter.get('/get-draft', (_req, res) => {
  const path = resolve(DIRECTORY, 'draft.json');
  res.json(
    existsSync(path)
      ? videoEditSchema.parse(JSON.parse(readFileSync(path, 'utf8')))
      : { ...EMPTY_VIDEO_EDIT, music: getOriginalMusic() },
  );
});
videoEditRouter.get('/get-original-music', (_req, res) =>
  res.json(getOriginalMusic()),
);
videoEditRouter.post('/save-draft', (req, res) => {
  persist(resolve(DIRECTORY, 'draft.json'), videoEditSchema.parse(req.body));
  res.json({ saved: true });
});
videoEditRouter.get('/get-latest-render-job', (_req, res) =>
  res.json(getLatestVideoEditJob()),
);
videoEditRouter.get('/get-render-job/:id', (req, res) =>
  res.json(getVideoEditJob(req.params.id)),
);
videoEditRouter.post('/create-render-job', (req, res) => {
  const port = Number(process.env.PORT || 4317);
  res
    .status(202)
    .json(
      createVideoEditJob(
        videoEditSchema.parse(req.body),
        `http://127.0.0.1:${port}`,
      ),
    );
});
const upload = multer({
  dest: INCOMING,
  limits: { files: 1, fileSize: 250 * 1024 * 1024 },
});
videoEditRouter.post(
  '/upload-video',
  upload.single('file'),
  (req, res, next) => {
    const file = req.file;
    if (!file) return next(new HttpError(400, '请选择MP4或MOV视频。'));
    if (!/\.(mp4|mov)$/i.test(file.originalname)) {
      unlinkSync(file.path);
      return next(new HttpError(400, '仅支持MP4与MOV。'));
    }
    return Promise.resolve()
      .then(() => ingestVideo(file.path, file.originalname))
      .then((asset) => res.json(asset))
      .catch(next)
      .finally(() => {
        if (existsSync(file.path)) unlinkSync(file.path);
      });
  },
);
