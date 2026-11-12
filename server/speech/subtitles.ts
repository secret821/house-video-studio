/** Account-scoped offline ASR jobs. Polling never extends media lifetime and cancellation owns one task. */
import { Router } from 'express';
import { createHash, randomUUID } from 'node:crypto';
import {
  createReadStream,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  renameSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { resolve } from 'node:path';
import { z } from 'zod';
import sharp from 'sharp';

import { JobStatus } from '../../src/services/definition/project';
import { importedVideoSchema } from '../../src/services/definition/video-edit';
import {
  speechCaptionsSchema,
  subtitleJobSchema,
  type SubtitleJob,
} from '../../src/services/definition/subtitles';
import { HttpError, resolveAsset } from '../media/media';
import { acquireMediaSlot } from '../media/media-queue';
import { probeVideo } from '../video/video-edit';
import {
  runVideoUploadCommand,
  runVideoUploadMedia,
} from '../video/video-upload';
import { workspaceDirectory, workspaceState } from '../storage/workspace';
import {
  checkStorageReservations,
  MIB,
  reserveStorage,
} from '../storage/storage-capacity';

export const ASR_ID = 'sensevoice-int8-20240717-window8-overlap-timestamps-v5';
export const NANO_ASR_ID = 'fun-asr-nano-q8-runtime026-ctc-align-v1';
const taskState = () =>
  workspaceState('subtitles', () => ({
    active: null as { job: SubtitleJob; controller: AbortController } | null,
  }));
/** Called only while owning the media slot; discard idle image buffers without changing later cache limits. */
function releaseIdleMediaMemory() {
  if (process.platform !== 'linux') return;
  const limits = sharp.cache();
  sharp.cache(false);
  sharp.cache({
    memory: limits.memory.max,
    files: limits.files.max,
    items: limits.items.max,
  });
  global.gc?.();
}
/** Only administrator-owned runtime paths can choose the executable or models. */
export function getAsrRuntime() {
  const engine = process.env.STUDIO_ASR_ENGINE || 'sensevoice';
  if (engine !== 'sensevoice' && engine !== 'nano')
    throw new Error('STUDIO_ASR_ENGINE must be sensevoice or nano');
  const nano = engine === 'nano';
  const directory = resolve(
    process.env.STUDIO_ASR_DIR || (nano ? '.runtime/asr-nano' : '.runtime/asr'),
  );
  return {
    engine,
    id: nano ? NANO_ASR_ID : ASR_ID,
    directory,
    python: resolve(directory, 'venv/bin/python'),
    model: resolve(directory, 'model'),
    script: resolve(
      nano ? 'scripts/asr-nano-inference.py' : 'scripts/asr-inference.py',
    ),
    files: nano
      ? [
          'model.int8.onnx',
          'tokens.txt',
          'funasr-encoder-f16.gguf',
          'qwen3-0.6b-q8_0.gguf',
          'fsmn-vad.gguf',
        ]
      : ['model.int8.onnx', 'tokens.txt', 'silero_vad.onnx'],
  };
}
/** Ready is published by installation only after real offline timestamps have been checked. */
export function getSubtitleCapability() {
  const runtime = getAsrRuntime();
  const marker = resolve(runtime.directory, 'ready.txt');
  const ready =
    existsSync(marker) &&
    readFileSync(marker, 'utf8').trim() === runtime.id &&
    [
      runtime.python,
      runtime.script,
      ...(runtime.engine === 'nano'
        ? [
            resolve(runtime.directory, 'bin/llama-funasr-cli'),
            resolve('scripts/asr_nano_alignment.py'),
          ]
        : []),
      ...runtime.files.map((name) => resolve(runtime.model, name)),
    ].every(existsSync);
  return {
    ready,
    message: ready
      ? '本地免费识别原声，不上传音轨。识别可能有误，请核对小区名、数字和听不清的部分。'
      : '原声识别尚未安装，请管理员运行 pnpm setup:asr。原视频和手写字幕不受影响。',
  };
}
/** Atomic publication prevents a refresh from reading half-written transcript JSON. */
function persist(job: SubtitleJob) {
  const path = resolve(workspaceDirectory('subtitle-jobs'), `${job.id}.json`);
  writeFileSync(path + '.tmp', JSON.stringify(job), { mode: 0o600 });
  renameSync(path + '.tmp', path);
}
/** No other account can resolve a job, even when its UUID is known. */
export function getSubtitleJob(id: string): SubtitleJob {
  z.uuid().parse(id);
  const active = taskState().active;
  if (active?.job.id === id) return active.job;
  const path = resolve(workspaceDirectory('subtitle-jobs'), `${id}.json`);
  if (!existsSync(path))
    throw new HttpError(404, '字幕识别任务不存在或已过期。');
  const job = subtitleJobSchema.parse(JSON.parse(readFileSync(path, 'utf8')));
  if (job.status === JobStatus.Rendering) {
    job.status = JobStatus.Failed;
    job.message = '服务重启，识别已中断，请重新识别；原字幕保留。';
    persist(job);
  }
  return job;
}
/** Refresh resumes polling only the current account's most recent task. */
export function getLatestSubtitleJob(): SubtitleJob | null {
  if (taskState().active) return taskState().active!.job;
  const directory = workspaceDirectory('subtitle-jobs');
  const files = readdirSync(directory)
    .filter((name) => /^[a-f0-9-]{36}\.json$/.test(name))
    .sort(
      (a, b) =>
        statSync(resolve(directory, b)).mtimeMs -
        statSync(resolve(directory, a)).mtimeMs,
    );
  return files.length ? getSubtitleJob(files[0].slice(0, -5)) : null;
}
/** Content-based cache is private to the workspace, including in temporary deployments. */
function fingerprint(path: string, signal: AbortSignal): Promise<string> {
  const hash = createHash('sha256').update(getAsrRuntime().id);
  return new Promise((accept, reject) => {
    createReadStream(path, { signal })
      .on('data', (block) => hash.update(block))
      .on('error', reject)
      .on('end', () => accept(hash.digest('hex')));
  });
}
/** Returns immediately; queued/running tasks retain their workspace until all children and cleanup finish. */
export function createSubtitleJob(src: string): SubtitleJob {
  importedVideoSchema.shape.src.parse(src);
  const state = taskState();
  if (state.active)
    throw new HttpError(409, '当前账号已有原声识别任务，请等待或取消。');
  const path = resolveAsset(src);
  const capability = getSubtitleCapability();
  if (!capability.ready) throw new HttpError(503, capability.message);
  const runtime = getAsrRuntime();
  const controller = new AbortController();
  const operation = { controller };
  const job: SubtitleJob = {
    id: randomUUID(),
    src,
    status: JobStatus.Rendering,
    progress: 0,
    message: '排队等待本地识别资源…',
    captions: [],
  };
  const scratch = resolve(workspaceDirectory('subtitle-tmp'), job.id);
  const releaseStorage = reserveStorage(128 * MIB);
  try {
    mkdirSync(scratch, { recursive: true, mode: 0o700 });
    persist(job);
  } catch (error) {
    releaseStorage();
    throw error;
  }
  state.active = { job, controller };
  let release: (() => void) | undefined;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let duration = 0;
  let cache = '';
  acquireMediaSlot(controller.signal)
    .then((unlock) => {
      release = unlock;
      checkStorageReservations();
      timer = setTimeout(
        () =>
          controller.abort(
            new HttpError(408, '原声识别超过15分钟，已停止，请分段后重试。'),
          ),
        15 * 60_000,
      );
      job.message = '正在读取原声音轨…';
      persist(job);
      return probeVideo(path, operation);
    })
    .then((metadata) => {
      if (!metadata.hasAudio)
        throw new HttpError(400, '这份视频没有音轨，无法识别原声。');
      duration = metadata.duration;
      return fingerprint(path, controller.signal);
    })
    .then((key) => {
      cache = resolve(workspaceDirectory('subtitle-cache'), key + '.json');
      if (existsSync(cache)) {
        const parsed = speechCaptionsSchema.safeParse(
          JSON.parse(readFileSync(cache, 'utf8')),
        );
        if (parsed.success) return parsed.data;
        throw new HttpError(
          422,
          '本地字幕缓存损坏，请管理员检查；原字幕保留。',
        );
      }
      job.progress = 0.15;
      job.message = '正在提取识别用音轨，原视频保持不变…';
      persist(job);
      const audio = resolve(scratch, 'audio.wav');
      const output = resolve(scratch, 'captions.json');
      return runVideoUploadMedia(operation, {
        binary: 'ffmpeg',
        args: [
          '-y',
          '-v',
          'error',
          '-protocol_whitelist',
          'file,pipe',
          '-format_whitelist',
          'mov',
          '-threads',
          '1',
          '-i',
          path,
          '-map',
          '0:a:0',
          '-vn',
          '-threads',
          '1',
          '-ar',
          '16000',
          '-ac',
          '1',
          '-c:a',
          'pcm_s16le',
          '-t',
          String(duration),
          audio,
        ],
      })
        .then(() => {
          job.progress = 0.35;
          job.message = '正在本地识别原声与逐句时间，请稍候…';
          persist(job);
          releaseIdleMediaMemory();
          return runVideoUploadCommand(operation, {
            file: runtime.python,
            args: [
              runtime.script,
              '--model-dir',
              runtime.model,
              '--audio',
              audio,
              '--output',
              output,
            ],
            env: {
              ...process.env,
              OMP_NUM_THREADS: '1',
              HF_HUB_OFFLINE: '1',
              TRANSFORMERS_OFFLINE: '1',
            },
          });
        })
        .then(() => {
          if (statSync(output).size > 512 * 1024)
            throw new HttpError(422, '识别结果过大，请分段后重试。');
          return speechCaptionsSchema.parse(
            JSON.parse(readFileSync(output, 'utf8')),
          );
        });
    })
    .then((captions) => {
      controller.signal.throwIfAborted();
      if (captions.some((cue) => cue.endMs > Math.ceil(duration * 1000)))
        throw new HttpError(422, '识别时间超出原片，请重试或手动校对。');
      job.captions = captions;
      writeFileSync(cache + '.tmp', JSON.stringify(captions), { mode: 0o600 });
      renameSync(cache + '.tmp', cache);
      job.status = JobStatus.Complete;
      job.progress = 1;
      job.message = captions.length
        ? `已识别${captions.length}条字幕，请校对后采纳；原声未修改。`
        : '没有识别到清晰讲话，未生成字幕；请检查视频原声。';
      persist(job);
    })
    .catch((error: unknown) => {
      job.status = JobStatus.Failed;
      const reason: unknown = controller.signal.aborted
        ? controller.signal.reason
        : error;
      job.message =
        reason instanceof HttpError
          ? reason.message
          : '本地原声识别失败，请检查视频与模型运行环境；原字幕保留。';
      persist(job);
    })
    .finally(() => {
      clearTimeout(timer);
      try {
        rmSync(scratch, { recursive: true, force: true });
      } finally {
        release?.();
        releaseStorage();
        if (state.active?.job.id === job.id) state.active = null;
      }
    })
    .catch(() => {
      // Disk/cleanup failures must not become an unhandled background rejection or expose transcripts.
      console.error(
        '[subtitles] 识别任务状态或临时文件清理失败，请检查本机磁盘。',
      );
    });
  return job;
}
/** A stale cancel cannot abort another request or release another account's media slot. */
export function cancelSubtitleJob(id: string) {
  const active = taskState().active;
  if (!active) return getSubtitleJob(id);
  if (active.job.id !== id)
    throw new HttpError(409, '识别任务已变化，请刷新状态。');
  active.controller.abort(new HttpError(499, '已取消原声识别，原字幕保留。'));
  return active.job;
}
export const subtitlesRouter = Router();
subtitlesRouter.get('/get-capability', (_req, res) =>
  res.json(getSubtitleCapability()),
);
subtitlesRouter.get('/get-latest-job', (_req, res) =>
  res.json(getLatestSubtitleJob()),
);
subtitlesRouter.get('/get-job/:id', (req, res) =>
  res.json(getSubtitleJob(req.params.id)),
);
subtitlesRouter.post('/create-job', (req, res) =>
  res
    .status(202)
    .json(
      createSubtitleJob(
        z.object({ src: importedVideoSchema.shape.src }).parse(req.body).src,
      ),
    ),
);
subtitlesRouter.post('/cancel-job', (req, res) =>
  res.json(cancelSubtitleJob(z.object({ id: z.uuid() }).parse(req.body).id)),
);
