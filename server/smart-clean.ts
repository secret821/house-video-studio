/** Account-scoped local cleaning jobs hold the existing media slot through child exit and scratch cleanup. */
import { Router } from 'express';
import { randomUUID } from 'node:crypto';
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
  renameSync,
  statSync,
  statfsSync,
} from 'node:fs';
import { resolve } from 'node:path';
import { z } from 'zod';
import { JobStatus } from '../src/services/definition/project';
import {
  cleanInputSchema,
  cleanJobSchema,
  type CleanJob,
} from '../src/services/definition/smart-clean';
import { workspaceDirectory, workspaceState } from './workspace';
import { acquireMediaSlot } from './media-queue';
import { checkStorageReservations, reserveStorage } from './storage-capacity';
import { HttpError, resolveAsset } from './media';
import { SMART_CLEAN_MODELS, SMART_CLEAN_VERSION } from './smart-clean-models';
import {
  analyzeCleanVideo,
  encodeCleanVideo,
  type AnalyzedVideo,
} from './smart-clean-media';
const taskState = () =>
  workspaceState('smart-clean', () => ({
    active: null as {
      job: CleanJob;
      controller: AbortController;
      done: Promise<void>;
    } | null,
  }));

/** Only administrators can choose the installed model directory; requests never choose executable paths. */
export function getCleanCapability() {
  const directory = resolve(
    process.env.STUDIO_SMART_CLEAN_DIR || '.runtime/smart-clean',
  );
  const marker = resolve(directory, 'ready.txt');
  const ready =
    existsSync(marker) &&
    readFileSync(marker, 'utf8').trim() === SMART_CLEAN_VERSION &&
    SMART_CLEAN_MODELS.every((model) =>
      existsSync(resolve(directory, model.name)),
    );
  return {
    ready,
    message: ready
      ? '本地检测人物和持续过暗画面，保留原声与总时长。'
      : '本地检测尚未安装，请管理员运行 pnpm setup:smart-clean。',
  };
}
/** Publish complete JSON snapshots rather than exposing half-written task files. */
function persist(job: CleanJob) {
  const file = resolve(
    workspaceDirectory('smart-clean-jobs'),
    job.id + '.json',
  );
  writeFileSync(file + '.tmp', JSON.stringify(job), { mode: 0o600 });
  renameSync(file + '.tmp', file);
}
/** IDs resolve only in the session's workspace, including after restart or expiry. */
export function getCleanJob(id: string): CleanJob {
  z.uuid().parse(id);
  const active = taskState().active;
  if (active?.job.id === id) return active.job;
  const file = resolve(workspaceDirectory('smart-clean-jobs'), id + '.json');
  if (!existsSync(file))
    throw new HttpError(404, '智能清理任务已过期或不存在。');
  const job = cleanJobSchema.parse(JSON.parse(readFileSync(file, 'utf8')));
  if (job.status === JobStatus.Rendering) {
    job.status = JobStatus.Failed;
    job.message = '服务重启，清理已中断，原素材保留。';
    persist(job);
  }
  return job;
}
/** A refreshed page can discover and cancel its own running task. Completed results are never auto-reapplied on load. */
export function getLatestCleanJob() {
  if (taskState().active) return taskState().active!.job;
  const directory = workspaceDirectory('smart-clean-jobs');
  const files = readdirSync(directory)
    .filter((name) => /^[a-f0-9-]{36}\.json$/.test(name))
    .sort(
      (a, b) =>
        statSync(resolve(directory, b)).mtimeMs -
        statSync(resolve(directory, a)).mtimeMs,
    );
  return files.length ? getCleanJob(files[0].slice(0, -5)) : null;
}
/** Finish analysis for all submitted house clips before choosing replacement pictures from checked windows. */
export function createCleanJob(raw: unknown): CleanJob {
  const input = cleanInputSchema.parse(raw),
    state = taskState();
  if (state.active)
    throw new HttpError(409, '当前账号已有智能清理任务，请等待或取消。');
  if (!getCleanCapability().ready)
    throw new HttpError(503, getCleanCapability().message);
  input.sources.forEach(resolveAsset);
  const disk = statfsSync(workspaceDirectory());
  const required = input.sources.reduce(
    (sum, src) => sum + statSync(resolveAsset(src)).size * 2,
    512 * 1024 * 1024,
  );
  if (Number(disk.bavail) * Number(disk.bsize) < required)
    throw new HttpError(507, '磁盘空间不足，未开始清理。');
  const job: CleanJob = {
    id: randomUUID(),
    status: JobStatus.Rendering,
    progress: 0,
    message: '排队等待本地检测资源…',
    results: [],
  };
  const controller = new AbortController(),
    operation = { controller };
  const scratch = resolve(workspaceDirectory('smart-clean-tmp'), job.id);
  let complete!: () => void;
  const done = new Promise<void>((accept) => {
    complete = accept;
  });
  const releaseStorage = reserveStorage(required);
  try {
    mkdirSync(scratch, { recursive: true, mode: 0o700 });
    persist(job);
  } catch (error) {
    releaseStorage();
    throw error;
  }
  state.active = { job, controller, done };
  const analyzed: Array<AnalyzedVideo> = [];
  const published: Array<string> = [];
  let release: (() => void) | undefined,
    timer: ReturnType<typeof setTimeout> | undefined;
  acquireMediaSlot(controller.signal)
    .then((unlock) => {
      release = unlock;
      checkStorageReservations();
      timer = setTimeout(
        () =>
          controller.abort(
            new HttpError(408, '智能清理超过30分钟，已停止，原素材保留。'),
          ),
        30 * 60 * 1000,
      );
      return input.sources.reduce(
        (chain, src, index) =>
          chain.then(() => {
            job.message = `检测房屋视频 ${index + 1}/${input.sources.length}：人物与过暗画面…`;
            persist(job);
            return analyzeCleanVideo({
              src,
              directory: resolve(scratch, 'analysis-' + index),
              model: resolve(
                process.env.STUDIO_SMART_CLEAN_DIR || '.runtime/smart-clean',
              ),
              operation,
            }).then((video) => {
              analyzed.push(video);
              job.progress = ((index + 1) / input.sources.length) * 0.5;
              persist(job);
            });
          }),
        Promise.resolve(),
      );
    })
    .then(() => {
      const donors = analyzed.flatMap((video) => video.windows);
      const targets = analyzed.filter((video) => video.ranges.length);
      if (targets.length && !donors.length)
        throw new HttpError(
          422,
          '没有合格补画面，请添加一段无人且明亮的房屋视频后重试；原素材保留。',
        );
      return targets.reduce(
        (chain, video, index) =>
          chain.then(() => {
            const directory = resolve(scratch, 'encode-' + index);
            mkdirSync(directory, { recursive: true, mode: 0o700 });
            job.message = `替换问题画面 ${index + 1}/${targets.length}，完整保留原声…`;
            persist(job);
            return encodeCleanVideo({
              video,
              donors,
              directory,
              operation,
              identity: SMART_CLEAN_VERSION + job.id,
            }).then((asset) => {
              published.push(asset.src, asset.poster);
              job.results.push({
                originalSrc: video.src,
                asset,
                ranges: video.ranges,
              });
              job.progress = 0.5 + ((index + 1) / targets.length) * 0.5;
              persist(job);
              rmSync(directory, { recursive: true, force: true });
            });
          }),
        Promise.resolve(),
      );
    })
    .then(() => {
      controller.signal.throwIfAborted();
      job.status = JobStatus.Complete;
      job.progress = 1;
      const count = job.results.reduce(
        (sum, result) => sum + result.ranges.length,
        0,
      );
      job.message = count
        ? `已替换${count}处问题画面，原声和总时长保留。`
        : '未检测到需要替换的人物或持续过暗画面。';
      persist(job);
    })
    .catch((error: unknown) => {
      const reason: unknown = controller.signal.aborted
        ? controller.signal.reason
        : error;
      job.status = JobStatus.Failed;
      job.message =
        reason instanceof HttpError
          ? reason.message
          : '本地清理失败，请检查模型与素材后重试；原素材保留。';
      job.results = [];
      published.forEach((src) => {
        try {
          rmSync(resolveAsset(src), { force: true });
        } catch {
          console.error('[smart-clean] partial media cleanup failed');
        }
      });
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
        complete();
      }
    })
    .catch(() => {
      console.error('[smart-clean] task persistence or cleanup failed');
    });
  return job;
}
/** Cancellation owns only this task and waits until every child and scratch file is released. */
export function cancelCleanJob(id: string) {
  const active = taskState().active;
  if (!active) return Promise.resolve(getCleanJob(id));
  if (active.job.id !== id)
    throw new HttpError(409, '任务已变化，请刷新状态。');
  active.controller.abort(new HttpError(499, '已取消智能清理，原素材保留。'));
  return active.done.then(() => getCleanJob(id));
}
export const smartCleanRouter = Router();
smartCleanRouter.get('/get-capability', (_req, res) =>
  res.json(getCleanCapability()),
);
smartCleanRouter.get('/get-latest-job', (_req, res) =>
  res.json(getLatestCleanJob()),
);
smartCleanRouter.get('/get-job/:id', (req, res) =>
  res.json(getCleanJob(req.params.id)),
);
smartCleanRouter.post('/create-job', (req, res) =>
  res.status(202).json(createCleanJob(req.body)),
);
smartCleanRouter.post('/cancel-job', (req, res, next) =>
  Promise.resolve()
    .then(() => cancelCleanJob(z.object({ id: z.uuid() }).parse(req.body).id))
    .then((job) => res.json(job))
    .catch(next),
);
