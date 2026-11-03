/** Local-only video ingest, independent drafts and export jobs; no cloud client or credential is imported. */
import { VIDEO_UPLOAD_MAX_BYTES } from '../src/services/definition/video-upload';
import { acquireMediaSlot, acquireVideoProbeSlot } from './media-queue';
import { checkStorageReservations, reserveStorage } from './storage-capacity';
import { getNativeCompositor } from './native-compositor-runtime';
import { workspaceRenderOrigin, sharedWorkspaceDirectory } from './workspace';
import { workspaceDirectory, workspaceState } from './workspace';
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
  createReadStream,
  mkdirSync,
  readFileSync,
  readdirSync,
  renameSync,
  statSync,
  statfsSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs';
import { copyFile } from 'node:fs/promises';
import { basename, resolve } from 'node:path';
import { z } from 'zod';

import {
  FPS,
  JobStatus,
  DraftKind,
  VideoPreparation,
  VIDEO_PENDING_POSTER,
} from '../src/services/definition/project';
import {
  CoverSource,
  HouseMediaKind,
  getHouseMaterials,
  importedVideoSchema,
  videoEditJobSchema,
  videoEditSchema,
  videoEditDraftSchema,
  type ImportedVideo,
  type VideoEditJob,
  type VideoEditProject,
} from '../src/services/definition/video-edit';
import {
  getVideoEditTimeline,
  getNativeVideoSegments,
} from '../src/video/video-edit-timeline';
import {
  renderNativeVideo,
  NativeVideoCompatibilityError,
} from './video-edit-native';

import { ROOT, HttpError, resolveAsset } from './media';
import { getOriginalMusic } from './video-edit-music';
import { getCurrentDraft, saveCurrentDraft } from './current-draft';
import {
  getDatabaseCurrentDraft,
  saveDatabaseCurrentDraft,
} from './database-current-draft';
import { databaseEnabled } from './database';
import { MusicTrack, musicTrackSchema } from '../src/services/definition/music';
import {
  beginVideoUpload,
  cancelVideoUpload,
  getVideoUploadStatus,
  runVideoUploadMedia,
  type VideoUploadTask,
} from './video-upload';
import {
  cancelVideoUploadSchema,
  VideoUploadPhase,
} from '../src/services/definition/video-upload';
import {
  getPrebuiltVideoBundle,
  VideoBundleKind,
  RENDER_CACHE_LIMITS,
  getVideoProcessingThreads,
} from './video-bundles';

for (const path of [
  workspaceDirectory('video-edit', 'jobs'),
  workspaceDirectory('video-edit', 'incoming'),
])
  mkdirSync(path, { recursive: true });
/** Running jobs belong to the authenticated account, including after the HTTP request ends. */
const jobState = () =>
  workspaceState('video-edit', () => ({
    activeJob: null as VideoEditJob | null,
  }));
let compiled: { identity: string; promise: Promise<string> } | null = null;
const probeSchema = z.object({
  format: z.object({ duration: z.string() }),
  streams: z.array(
    z.object({
      codec_type: z.string(),
      width: z.number().optional(),
      height: z.number().optional(),
      codec_name: z.string().optional(),
      pix_fmt: z.string().optional(),
      r_frame_rate: z.string().optional(),
      avg_frame_rate: z.string().optional(),
      sample_aspect_ratio: z.string().optional(),
      start_time: z.string().optional(),
      duration: z.string().optional(),
      color_transfer: z.string().optional(),
      side_data_list: z
        .array(z.object({ rotation: z.number().optional() }))
        .optional(),
    }),
  ),
});

/** Inspect the actual file, never trusting a client-supplied duration or an extension alone. */
export function probeVideo(
  path: string,
  task?: Pick<VideoUploadTask, 'controller'>,
) {
  const operation = task ?? { controller: new AbortController() };
  const timeout = setTimeout(
    () =>
      operation.controller.abort(
        new HttpError(408, '读取视频信息超时，请检查文件后重试。'),
      ),
    30_000,
  );
  const args = [
    '-protocol_whitelist',
    'file,pipe',
    '-format_whitelist',
    'mov',
    '-v',
    'error',
    '-show_entries',
    'stream=codec_type,codec_name,width,height,pix_fmt,r_frame_rate,avg_frame_rate,sample_aspect_ratio,start_time,duration,color_transfer:stream_side_data=rotation:format=duration',
    '-of',
    'json',
    path,
  ];
  const pending = acquireVideoProbeSlot(operation.controller.signal).then(
    (release) =>
      Promise.resolve()
        .then(() => runVideoUploadMedia(operation, { binary: 'ffprobe', args }))
        .finally(release),
  );
  return pending
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
      const rotation =
        video.side_data_list?.find((side) => side.rotation !== undefined)
          ?.rotation ?? 0;
      const rotated = Math.abs(Math.round(rotation / 90)) % 2 === 1;
      const nativeGeometry =
        video.codec_name === 'h264' &&
        ['yuv420p', 'yuvj420p'].includes(video.pix_fmt ?? '') &&
        video.width <= 1080 &&
        video.height <= 1920 &&
        video.width % 2 === 0 &&
        video.height % 2 === 0 &&
        video.r_frame_rate === '30/1' &&
        video.avg_frame_rate === '30/1' &&
        video.start_time !== undefined &&
        Math.abs(Number(video.start_time)) < 0.000001 &&
        !['smpte2084', 'arib-std-b67'].includes(video.color_transfer ?? '') &&
        !video.side_data_list?.some(
          (side) => side.rotation && Math.abs(side.rotation) > 0.001,
        );
      return {
        duration,
        videoDuration:
          video.duration && Number.isFinite(Number(video.duration))
            ? Number(video.duration)
            : null,
        width: rotated ? video.height : video.width,
        height: rotated ? video.width : video.height,
        hasAudio: metadata.streams.some(
          (stream) => stream.codec_type === 'audio',
        ),
        canCopyVideo: nativeGeometry && video.sample_aspect_ratio === '1:1',
        // Missing SAR follows the same square-pixel geometry as browser playback; explicit anamorphic ratios remain excluded.
        canRenderNative:
          nativeGeometry &&
          (video.sample_aspect_ratio === undefined ||
            video.sample_aspect_ratio === '1:1'),
      };
    })
    .catch((error: unknown) => {
      operation.controller.signal.throwIfAborted();
      if (error instanceof HttpError) throw error;
      throw new HttpError(400, '无法读取视频，请上传有效的MP4或MOV文件。');
    })
    .finally(() => clearTimeout(timeout));
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

/** Receive originals without encoding; a separate lightweight probe slot keeps uploads independent of renders. */
export function ingestVideo(
  path: string,
  originalName: string,
): Promise<ImportedVideo> {
  if (jobState().activeJob?.status === JobStatus.Rendering)
    return Promise.reject(
      new HttpError(409, '服务器正在处理视频，请等待当前任务完成后再上传。'),
    );
  let task: VideoUploadTask;
  try {
    task = beginVideoUpload();
  } catch (error) {
    return Promise.reject(error);
  }
  return ingestUploadedVideo({ path, originalName }, task).finally(task.finish);
}

/** Upload only receives and probes original bytes. It never takes the encode/render slot or starts FFmpeg. */
function ingestUploadedVideo(
  file: { path: string; originalName: string; move?: boolean },
  task: VideoUploadTask,
): Promise<ImportedVideo> {
  task.controller.signal.throwIfAborted();
  task.info.phase = VideoUploadPhase.Processing;
  task.info.name = decodeUploadName(file.originalName).slice(0, 160);
  const name = `source-${randomUUID()}.mp4`;
  const target = resolve(workspaceDirectory('uploads'), name);
  let published = false;
  let probeMetadata!: Awaited<ReturnType<typeof probeVideo>>;
  return probeVideo(file.path, task)
    .then((metadata) => {
      probeMetadata = metadata;
      if (metadata.width > 4096 || metadata.height > 4096)
        throw new HttpError(400, '视频画面请控制在4096像素以内。');
      task.controller.signal.throwIfAborted();
      return file.move
        ? Promise.resolve().then(() => renameSync(file.path, target))
        : copyFile(file.path, target);
    })
    .then(() => {
      task.controller.signal.throwIfAborted();
      // Metadata is tiny and was already validated; no second scan of the moved file is needed.
      const asset = importedVideoSchema.parse({
        ...probeMetadata,
        src: `/media/${name}`,
        poster: VIDEO_PENDING_POSTER,
        preparation: VideoPreparation.Original,
        name: basename(decodeUploadName(file.originalName)).slice(0, 160),
      });
      published = true;
      return asset;
    })
    .finally(() => {
      if (!published && existsSync(target)) unlinkSync(target);
    });
}

/** Stream hashes during generation without buffering whole phone videos or finished films. */
function hashFile(
  path: string,
  hash = createHash('sha256'),
  signal?: AbortSignal,
) {
  return new Promise<ReturnType<typeof createHash>>((resolveHash, reject) => {
    createReadStream(path, { signal })
      .on('data', (chunk) => hash.update(chunk))
      .on('error', reject)
      .on('end', () => resolveHash(hash));
  });
}

/** Only server-generated source paths need preparation. Client flags cannot bypass conversion or ownership checks. */
export function prepareVideoForRender(
  clip: Pick<ImportedVideo, 'src' | 'duration' | 'width' | 'height'>,
): Promise<ImportedVideo | null> {
  if (!/^\/media\/source-[a-f0-9-]{36}\.mp4$/.test(clip.src))
    return Promise.resolve(null);
  const path = resolveAsset(clip.src);
  const operation = { controller: new AbortController() };
  const timeout = setTimeout(
    () =>
      operation.controller.abort(
        new HttpError(
          408,
          '单份视频准备超过15分钟，已停止；请缩短或压缩原片后重试。',
        ),
      ),
    15 * 60_000,
  );
  return probeVideo(path, operation)
    .then((metadata) => {
      if (
        Math.abs(metadata.duration - clip.duration) > 1 / FPS ||
        metadata.width !== clip.width ||
        metadata.height !== clip.height
      )
        throw new HttpError(400, '原片信息已变化，请重新上传。');
      return hashFile(path, undefined, operation.controller.signal).then(
        (hash) =>
          hash.update('video-render-prepare-v2-square-packets').digest('hex'),
      );
    })
    .then((digest) =>
      normalizeVideo({
        path,
        originalName: '上传原片',
        digest,
        task: operation,
      }),
    )
    .finally(() => clearTimeout(timeout));
}

/** Bound decoder/filter threads as well as the encoder, preserving complete audio and the existing output format. */
function normalizeVideo({
  path,
  originalName,
  digest,
  task,
}: {
  path: string;
  originalName: string;
  digest: string;
  task: Pick<VideoUploadTask, 'controller'>;
}): Promise<ImportedVideo> {
  const filename = `import-${digest}.mp4`;
  const target = resolve(
    workspaceDirectory('video-edit', 'prepared'),
    filename,
  );
  const part = resolve(
    workspaceDirectory('video-edit', 'incoming'),
    `${randomUUID()}.part.mp4`,
  );
  const poster = `import-${digest}.jpg`;
  const posterPart = resolve(
    workspaceDirectory('video-edit', 'incoming'),
    `${randomUUID()}.part.jpg`,
  );
  const disk = statfsSync(workspaceDirectory('video-edit', 'prepared'));
  if (disk.bavail * disk.bsize < statSync(path).size * 2 + 128 * 1024 * 1024)
    return Promise.reject(
      new HttpError(507, '可用磁盘空间不足，请先释放空间再上传。'),
    );
  return probeVideo(path, task)
    .then((metadata) => {
      if (existsSync(target)) return;
      return runVideoUploadMedia(task, {
        binary: 'ffmpeg',
        args: [
          '-v',
          'error',
          '-y',
          '-threads',
          String(getVideoProcessingThreads()),
          '-filter_threads',
          String(getVideoProcessingThreads()),
          '-protocol_whitelist',
          'file,pipe',
          '-format_whitelist',
          'mov',
          '-i',
          path,
          '-map',
          '0:v:0',
          '-map',
          '0:a:0?',
          // Unspecified SAR already displays as square pixels; preserve its H264 packets instead of re-encoding before composition.
          ...(metadata.canRenderNative
            ? ['-c:v', 'copy']
            : [
                '-vf',
                "scale=w='min(1080,iw)':h='min(1920,ih)':force_original_aspect_ratio=decrease:force_divisible_by=2",
                '-r',
                '30',
                '-c:v',
                'libx264',
                '-preset',
                'veryfast',
                '-crf',
                '18',
                '-pix_fmt',
                'yuv420p',
              ]),
          ...(metadata.hasAudio
            ? [
                '-af',
                `loudnorm=I=-16:TP=-1.5:LRA=11,atrim=duration=${metadata.duration},asetpts=PTS-STARTPTS`,
              ]
            : []),
          '-t',
          String(metadata.duration),
          '-c:a',
          'aac',
          '-b:a',
          '192k',
          '-ar',
          '48000',
          '-threads',
          String(getVideoProcessingThreads()),
          '-map_metadata',
          '-1',
          '-map_metadata:s',
          '-1',
          '-movflags',
          '+faststart',
          part,
        ],
      }).then(() => {
        task.controller.signal.throwIfAborted();
        renameSync(part, target);
      });
    })
    .then(() => probeVideo(target, task))
    .then((metadata) => {
      const posterPath = resolve(
        workspaceDirectory('video-edit', 'prepared'),
        poster,
      );
      const pending = existsSync(posterPath)
        ? Promise.resolve()
        : runVideoUploadMedia(task, {
            binary: 'ffmpeg',
            args: [
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
              posterPart,
            ],
          }).then(() => {
            task.controller.signal.throwIfAborted();
            renameSync(posterPart, posterPath);
          });
      return pending.then(() => {
        task.controller.signal.throwIfAborted();
        return importedVideoSchema.parse({
          ...metadata,
          preparation: VideoPreparation.Ready,
          src: `/media/${filename}`,
          poster: `/media/${poster}`,
          name: basename(decodeUploadName(originalName)).slice(0, 160),
        });
      });
    })
    .catch((error: unknown) => {
      task.controller.signal.throwIfAborted();
      if (error instanceof HttpError) throw error;
      console.error('[video-ingest]', error);
      throw new HttpError(
        422,
        '本地视频处理失败，请检查视频格式与可用磁盘空间；详情已记录在本机服务日志。',
      );
    })
    .finally(() => {
      if (existsSync(part)) unlinkSync(part);
      if (existsSync(posterPart)) unlinkSync(posterPart);
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
  const active = jobState().activeJob;
  if (active?.id === id) return active;
  const path = resolve(workspaceDirectory('video-edit', 'jobs'), `${id}.json`);
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
  if (jobState().activeJob) return jobState().activeJob;
  const files = readdirSync(workspaceDirectory('video-edit', 'jobs'))
    .filter((file) => /^[a-f0-9-]{36}\.json$/.test(file))
    .sort(
      (left, right) =>
        statSync(resolve(workspaceDirectory('video-edit', 'jobs'), right))
          .mtimeMs -
        statSync(resolve(workspaceDirectory('video-edit', 'jobs'), left))
          .mtimeMs,
    );
  return files.length ? getVideoEditJob(files[0].replace('.json', '')) : null;
}

/** All export media comes from validated local ownership paths; modified duration metadata is rejected. */
function validateVideoProject(project: VideoEditProject) {
  const sources = getHouseMaterials(project);
  if (!project.opening || !sources.length || !project.shots.length)
    return Promise.reject(
      new HttpError(400, '请上传开场、房屋视频，并保留至少一个房屋片段。'),
    );
  const clips = [
    project.opening,
    ...sources.flatMap((source) =>
      source.kind === HouseMediaKind.Video ? [source.video] : [],
    ),
  ];
  sources.forEach((source) => {
    if (source.kind === HouseMediaKind.Image) resolveAsset(source.src);
  });
  clips.forEach((clip) => {
    resolveAsset(clip.src);
    resolveAsset(clip.poster);
  });
  if (project.music) resolveAsset(project.music.src);
  if (project.coverSource === CoverSource.Image && project.coverImage)
    resolveAsset(project.coverImage);
  return clips.reduce(
    (chain, clip) =>
      chain.then(() =>
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
    Promise.resolve(),
  );
}

/** A corrupt or incomplete local cache is rebuilt, rather than making identical exports permanently fail. */
function canReuseVideoOutput(paths: {
  marker: string;
  output: string;
  cover: string;
}): Promise<boolean> {
  if (![paths.marker, paths.output, paths.cover].every(existsSync))
    return Promise.resolve(false);
  return Promise.resolve()
    .then(() => {
      const cached = z
        .object({ video: z.string(), cover: z.string() })
        .parse(JSON.parse(readFileSync(paths.marker, 'utf8')));
      return hashFile(paths.output).then((video) =>
        hashFile(paths.cover).then(
          (cover) =>
            cached.video === video.digest('hex') &&
            cached.cover === cover.digest('hex'),
        ),
      );
    })
    .catch((error: unknown) => {
      console.warn(
        '[video-edit-cache] invalid local marker; rebuilding',
        error instanceof Error ? error.name : 'invalid marker',
      );
      return false;
    });
}

/** Prepare each unique original once inside the render slot; retain the user's exact timeline and labels. */
function prepareVideoProject(project: VideoEditProject, job: VideoEditJob) {
  const clips = [
    project.opening!,
    ...getHouseMaterials(project).flatMap((source) =>
      source.kind === HouseMediaKind.Video ? [source.video] : [],
    ),
  ];
  const unique = [...new Map(clips.map((clip) => [clip.src, clip])).values()];
  const prepared = new Map<string, ImportedVideo>();
  return unique
    .reduce(
      (chain, clip, index) =>
        chain.then(() => {
          job.message = `准备第${index + 1}/${unique.length}份视频：转码、处理原声与缩略图…`;
          return prepareVideoForRender(clip).then((asset) => {
            if (asset) prepared.set(clip.src, asset);
            job.progress = ((index + 1) / unique.length) * 0.15;
          });
        }),
      Promise.resolve(),
    )
    .then(() => {
      const update = (clip: ImportedVideo): ImportedVideo => {
        const asset = prepared.get(clip.src);
        return asset
          ? { ...clip, ...asset, duration: clip.duration, name: clip.name }
          : clip;
      };
      project.opening = update(project.opening!);
      if (project.house) project.house = update(project.house);
      project.materials = project.materials.map((source) =>
        source.kind === HouseMediaKind.Video
          ? { ...source, video: update(source.video) }
          : source,
      );
    });
}

/** The free path freezes one snapshot and runs only local bundling/rendering, with durable progress. */
export function createVideoEditJob(
  project: VideoEditProject,
  origin: string,
): VideoEditJob {
  if (jobState().activeJob || getVideoUploadStatus().active)
    throw new HttpError(409, '已有视频正在处理或导出，请稍候。');
  if (
    !project.opening ||
    !getHouseMaterials(project).length ||
    !project.shots.length
  )
    throw new HttpError(400, '请先上传两段视频并设置房屋片段。');
  project = structuredClone(project);
  origin = workspaceRenderOrigin(origin);
  const required =
    (192 + (getVideoEditTimeline(project).frames / FPS) * 3) * 1024 * 1024;
  const disk = statfsSync(workspaceDirectory('exports'));
  if (disk.bavail * disk.bsize < required)
    throw new HttpError(
      507,
      `导出需要约${Math.ceil(required / 1024 / 1024)}MB可用空间。`,
    );
  const job: VideoEditJob = {
    sessionId: project.sessionId,
    videoTemplate: project.videoTemplate,
    id: randomUUID(),
    status: JobStatus.Rendering,
    progress: 0,
    message: '等待服务器处理资源，其他账号的任务会继续运行…',
    output: null,
    cover: null,
    reused: false,
  };
  const template = [
    'video-edit.tsx',
    'video-edit-timeline.ts',
    'video-subtitles.ts',
    'video-watermark.tsx',
    'editorial-template.tsx',
    'video-edit-index.tsx',
  ]
    .map((file) => readFileSync(resolve(ROOT, 'src/video', file), 'utf8'))
    .concat(readFileSync(resolve(ROOT, 'server/video-edit-native.ts'), 'utf8'))
    .join('\n');
  const identity = createHash('sha256').update(template).digest('hex');
  const browserExecutable =
    process.env.CHROME_PATH ||
    (process.platform === 'darwin'
      ? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
      : undefined);
  const preparationBytes = [
    project.opening,
    ...getHouseMaterials(project).flatMap((source) =>
      source.kind === HouseMediaKind.Video ? [source.video] : [],
    ),
  ].reduce((sum, video) => {
    // Missing owned media still becomes a failed background job with a pollable status.
    if (
      video!.src.startsWith('/media/') &&
      !existsSync(resolve(workspaceDirectory('uploads'), basename(video!.src)))
    )
      return sum;
    return sum + statSync(resolveAsset(video!.src)).size * 2;
  }, 0);
  const releaseStorage = reserveStorage(Math.ceil(required + preparationBytes));
  try {
    persist(
      resolve(workspaceDirectory('video-edit', 'jobs'), `${job.id}.json`),
      job,
    );
  } catch (error) {
    releaseStorage();
    throw error;
  }
  jobState().activeJob = job;
  let release: (() => void) | undefined;
  acquireMediaSlot()
    .then((unlock) => {
      release = unlock;
      checkStorageReservations();
      return validateVideoProject(project).then(() =>
        prepareVideoProject(project, job),
      );
    })
    .then(() => {
      const hash = createHash('sha256')
        .update(JSON.stringify(project))
        .update(identity)
        .update('native-yuv-overlay-v2-h264-veryfast-crf19-aac48k');
      const hashes = [
        project.opening!.src,
        ...getHouseMaterials(project).flatMap((source) =>
          source.kind === HouseMediaKind.Video
            ? [source.video.src, source.video.poster]
            : [source.src],
        ),
        ...(project.coverSource === CoverSource.Image && project.coverImage
          ? [project.coverImage]
          : []),
        ...(project.music ? [project.music.src] : []),
      ]
        .reduce(
          (chain, src) =>
            chain.then(() => hashFile(resolveAsset(src), hash).then(() => {})),
          Promise.resolve(),
        )
        .then(() => hash.digest('hex'));
      return hashes;
    })
    .then((key) => {
      const absolute: VideoEditProject = {
        ...project,
        coverImage: project.coverImage && origin + project.coverImage,
        materials: project.materials.map((source) =>
          source.kind === HouseMediaKind.Image
            ? { ...source, src: origin + source.src }
            : {
                ...source,
                video: {
                  ...source.video,
                  src: origin + source.video.src,
                  poster: origin + source.video.poster,
                },
              },
        ),
        opening: {
          ...project.opening!,
          src: origin + project.opening!.src,
          poster: origin + project.opening!.poster,
        },
        house: project.house && {
          ...project.house,
          src: origin + project.house.src,
          poster: origin + project.house.poster,
        },
        music: project.music && {
          ...project.music,
          src: origin + project.music.src,
        },
      };

      const movie = `free-tour-${key}.mp4`;
      const cover = `free-cover-${key}.png`;
      const output = resolve(workspaceDirectory('exports'), movie);
      const coverPath = resolve(workspaceDirectory('exports'), cover);
      const marker = resolve(workspaceDirectory('video-edit'), `${key}.json`);
      return canReuseVideoOutput({ marker, output, cover: coverPath }).then(
        (reusable) => {
          if (reusable) {
            job.output = `/exports/${movie}`;
            job.cover = `/exports/${cover}`;
            job.reused = true;
            return;
          }
          if (!compiled || compiled.identity !== identity) {
            const prebuilt = getPrebuiltVideoBundle(VideoBundleKind.Real, ROOT);
            compiled = {
              identity,
              promise: (prebuilt
                ? Promise.resolve(prebuilt)
                : bundle({
                    entryPoint: resolve(ROOT, 'src/video/video-edit-index.tsx'),
                    outDir: sharedWorkspaceDirectory('bundles', 'real'),
                    enableCaching: false,
                  })
              ).catch((error: unknown) => {
                compiled = null;
                throw error;
              }),
            };
          }
          job.message = '正在准备本地剪辑模板…';
          const part = resolve(
            workspaceDirectory('exports'),
            `free-${job.id}.part.mp4`,
          );
          const renderWithBrowser = (serveUrl: string) =>
            selectComposition({
              serveUrl,
              id: 'FreeVideoTour',
              inputProps: { project: absolute },
              browserExecutable,
            })
              .then((composition) => ({ serveUrl, composition }))
              .then(({ serveUrl, composition }) =>
                renderMedia({
                  ...RENDER_CACHE_LIMITS,
                  offthreadVideoThreads: 1,
                  serveUrl,
                  composition,
                  inputProps: { project: absolute },
                  codec: 'h264',
                  x264Preset: 'veryfast',
                  audioCodec: 'aac',
                  sampleRate: 48000,
                  crf: 19,
                  pixelFormat: 'yuv420p',
                  concurrency: 1,
                  browserExecutable,
                  outputLocation: part,
                  timeoutInMilliseconds: 60_000,
                  onProgress: ({ progress }) => {
                    job.progress = 0.15 + progress * 0.8;
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
                      ...RENDER_CACHE_LIMITS,
                      serveUrl,
                      composition: coverComposition,
                      inputProps: { project: absolute },
                      output: coverPath,
                      imageFormat: 'png',
                      browserExecutable,
                    }),
                  ),
              );
          return compiled.promise
            .then((serveUrl) => {
              const segments = getNativeVideoSegments(project);
              const eligible = getNativeCompositor().then((runtime) =>
                segments
                  ? [
                      ...new Map(
                        segments.map((segment) => [
                          segment.clip.src,
                          segment.clip,
                        ]),
                      ).values(),
                    ].reduce(
                      (chain, clip) =>
                        chain.then((safe) =>
                          !safe
                            ? false
                            : probeVideo(resolveAsset(clip.src)).then(
                                (metadata) =>
                                  (runtime
                                    ? metadata.canRenderNative
                                    : metadata.canCopyVideo) &&
                                  metadata.videoDuration !== null &&
                                  metadata.videoDuration + 2 / FPS >=
                                    clip.duration,
                              ),
                        ),
                      Promise.resolve(true),
                    )
                  : Promise.resolve(false),
              );
              return eligible.then((native) => {
                if (!native) return renderWithBrowser(serveUrl);
                return renderNativeVideo({
                  project,
                  absolute,
                  serveUrl,
                  jobId: job.id,
                  output: part,
                  cover: coverPath,
                  browserExecutable,
                  onProgress: (progress, message) => {
                    job.progress = progress;
                    job.message = message;
                  },
                }).catch((error: unknown) => {
                  if (!(error instanceof NativeVideoCompatibilityError))
                    throw error;
                  console.warn(
                    '[video-edit-native] encoded tail requires the normal renderer',
                  );
                  return renderWithBrowser(serveUrl);
                });
              });
            })
            .then(() => {
              renameSync(part, output);
              return hashFile(output).then((video) =>
                hashFile(coverPath).then((coverHash) => {
                  persist(marker, {
                    video: video.digest('hex'),
                    cover: coverHash.digest('hex'),
                  });
                  job.output = `/exports/${movie}`;
                  job.cover = `/exports/${cover}`;
                }),
              );
            });
        },
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
      try {
        persist(
          resolve(workspaceDirectory('video-edit', 'jobs'), `${job.id}.json`),
          job,
        );
      } finally {
        jobState().activeJob = null;
        releaseStorage();
        release?.();
      }
    });
  return { ...job };
}

export const videoEditRouter = Router();
videoEditRouter.get('/get-draft', (_req, res, next) =>
  Promise.resolve(
    databaseEnabled()
      ? getDatabaseCurrentDraft(DraftKind.Video, videoEditDraftSchema)
      : getCurrentDraft(DraftKind.Video, videoEditDraftSchema),
  )
    .then((draft) => res.json(draft))
    .catch(next),
);
videoEditRouter.get('/get-original-music', (req, res) =>
  res.json(
    getOriginalMusic(
      musicTrackSchema.default(MusicTrack.Piano).parse(req.query.track),
    ),
  ),
);
videoEditRouter.post('/save-draft', (req, res, next) =>
  Promise.resolve(
    databaseEnabled()
      ? saveDatabaseCurrentDraft(
          DraftKind.Video,
          videoEditDraftSchema,
          req.body,
        )
      : saveCurrentDraft(DraftKind.Video, videoEditDraftSchema, req.body),
  )
    .then((draft) => res.json(draft))
    .catch(next),
);
videoEditRouter.get('/get-latest-render-job', (_req, res) =>
  res.json(getLatestVideoEditJob()),
);
videoEditRouter.get('/get-render-job/:id', (req, res) =>
  res.json(getVideoEditJob(req.params.id)),
);
videoEditRouter.post('/create-render-job', (req, res) => {
  const port = Number(process.env.PORT || 4318);
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
  storage: multer.diskStorage({
    destination: (_req, _file, done) =>
      done(null, workspaceDirectory('video-edit', 'incoming')),
  }),
  // Busboy emits its limit event at equality; allow the advertised inclusive 1GiB boundary.
  limits: { files: 1, fileSize: VIDEO_UPLOAD_MAX_BYTES + 1 },
});
videoEditRouter.post('/upload-video', (req, res, next) => {
  if (jobState().activeJob)
    return next(new HttpError(409, '请等待当前视频导出完成后再上传。'));
  const id = z.string().uuid().optional().parse(req.query.uploadId);
  const task = beginVideoUpload(id);
  let receiving = true;
  /** Dropping the HTTP request must stop decoding too, rather than leaving a detached lock. */
  const disconnected = () => {
    if (!res.writableFinished)
      task.controller.abort(
        new HttpError(499, '上传连接已断开，视频处理已终止。'),
      );
  };
  const stopReceiving = () => {
    if (receiving) req.destroy(task.controller.signal.reason);
  };
  res.once('close', disconnected);
  task.controller.signal.addEventListener('abort', stopReceiving);
  return new Promise<void>((resolveUpload, reject) => {
    upload.single('file')(req, res, (error: unknown) => {
      if (
        error instanceof multer.MulterError &&
        error.code === 'LIMIT_FILE_SIZE'
      )
        reject(new HttpError(413, '单个视频请控制在1GB以内。'));
      else if (error) reject(error);
      else resolveUpload();
    });
  })
    .then(() => {
      receiving = false;
      task.controller.signal.throwIfAborted();
      const file = req.file;
      if (!file) throw new HttpError(400, '请选择MP4或MOV视频。');
      if (file.size > VIDEO_UPLOAD_MAX_BYTES)
        throw new HttpError(413, '单个视频请控制在1GB以内。');
      if (!/\.(mp4|mov)$/i.test(file.originalname))
        throw new HttpError(400, '仅支持MP4与MOV。');
      return ingestUploadedVideo(
        { path: file.path, originalName: file.originalname, move: true },
        task,
      );
    })
    .then((asset) => res.json(asset))
    .catch((error: unknown) => {
      if (!res.destroyed) next(task.controller.signal.reason ?? error);
    })
    .finally(() => {
      res.off('close', disconnected);
      task.controller.signal.removeEventListener('abort', stopReceiving);
      try {
        if (req.file && existsSync(req.file.path)) unlinkSync(req.file.path);
      } finally {
        task.finish();
      }
    });
});
videoEditRouter.get('/get-upload-status', (_req, res) =>
  res.json(getVideoUploadStatus()),
);
videoEditRouter.post('/cancel-upload', (req, res, next) =>
  cancelVideoUpload(cancelVideoUploadSchema.parse(req.body).id)
    .then((status) => res.json(status))
    .catch(next),
);
