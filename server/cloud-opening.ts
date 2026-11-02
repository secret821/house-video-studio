/** Bridge durable Bailian generation into the editor's existing opening-job contract. */
import {
  workspaceDirectory,
  workspaceState,
  holdWorkspace,
  getWorkspace,
} from './workspace';
import { randomUUID } from 'node:crypto';
import {
  existsSync,
  readFileSync,
  readdirSync,
  renameSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { resolve } from 'node:path';

import {
  JobStatus,
  openingJobSchema,
  type OpeningInput,
  type OpeningJob,
} from '../src/services/definition/project';

import { HttpError, resolveAsset } from './media';
import {
  cloudOpening,
  cloudSpeech,
  getCloudStatus,
  withCloudLock,
} from './cloud';

/** Running jobs belong to the authenticated account, including after the HTTP request ends. */
const jobState = () =>
  workspaceState('cloud-opening', () => ({
    activeJob: null as OpeningJob | null,
  }));

/** Return configuration flags and the spend guard without exposing credentials or signed media URLs. */
export function getOpeningCapability() {
  const status = getCloudStatus();
  return {
    ready: status.ready,
    message: status.ready
      ? `百炼万相 720P · 12秒含缓冲 · 本轮最多2版 / 30元；预算已预留${status.reservedYuan.toFixed(2)}元。生成会上传人物照与配音。`
      : getWorkspace().id !== 'legacy'
        ? '该账号未授权付费人物生成，请直接上传已录制的视频。'
        : '百炼尚未配置：请填写项目 .env.cloud 的北京地域 API Key 和业务空间 ID，保存后刷新页面。',
  };
}

/** Publish status atomically so refresh never reads half a task. */
function persist(job: OpeningJob) {
  const path = resolve(
    workspaceDirectory('cloud-opening-jobs'),
    `${job.id}.json`,
  );
  writeFileSync(`${path}.tmp`, JSON.stringify(job), { mode: 0o600 });
  renameSync(`${path}.tmp`, path);
}

/** A restarted web job can be resumed using its original cloud ledger, without repeating the paid POST. */
export function getOpeningJob(id: string): OpeningJob {
  if (!/^[a-f0-9-]{36}$/.test(id))
    throw new HttpError(400, '无效的开场任务编号。');
  const active = jobState().activeJob;
  if (active?.id === id) return active;
  const path = resolve(workspaceDirectory('cloud-opening-jobs'), `${id}.json`);
  if (!existsSync(path)) throw new HttpError(404, '开场任务不存在。');
  const job = openingJobSchema.parse(JSON.parse(readFileSync(path, 'utf8')));
  if (job.status === JobStatus.Rendering) {
    job.status = JobStatus.Failed;
    job.message =
      '服务已重启。使用相同照片、台词与录音再次点击生成，可查询原任务；未知提交不会自动重提。';
    persist(job);
  }
  return job;
}

/** Only cloud jobs are restored; an old SadTalker result cannot masquerade as a new model output. */
export function getLatestOpeningJob(): OpeningJob | null {
  if (jobState().activeJob) return jobState().activeJob;
  const files = readdirSync(workspaceDirectory('cloud-opening-jobs'))
    .filter((name) => /^[a-f0-9-]{36}\.json$/.test(name))
    .sort(
      (a, b) =>
        statSync(resolve(workspaceDirectory('cloud-opening-jobs'), b)).mtimeMs -
        statSync(resolve(workspaceDirectory('cloud-opening-jobs'), a)).mtimeMs,
    );
  return files.length ? getOpeningJob(files[0].replace('.json', '')) : null;
}

/** Freeze validated editor inputs before starting a bounded, exclusively locked cloud workflow. */
export function createOpeningJob(input: OpeningInput): OpeningJob {
  if (jobState().activeJob)
    throw new HttpError(409, '已有百炼人物开场正在生成，请稍候。');
  const capability = getOpeningCapability();
  if (!capability.ready) throw new HttpError(503, capability.message);
  resolveAsset(input.photo);
  if (!input.voiceover && input.script.length > 50)
    throw new HttpError(
      400,
      '测试开场请控制在50字以内；实际配音超过12秒时会停止视频提交。',
    );
  if (
    input.voiceover &&
    input.voiceover.text !== null &&
    input.voiceover.text !== input.script
  )
    throw new HttpError(400, '台词已修改，请重新生成开场配音。');
  const job: OpeningJob = {
    id: randomUUID(),
    status: JobStatus.Rendering,
    progress: null,
    message: '正在准备百炼配音…',
    input,
    clip: null,
  };
  persist(job);
  const releaseWorkspace = holdWorkspace();
  jobState().activeJob = job;
  withCloudLock(() => {
    const speech = input.voiceover
      ? Promise.resolve(input.voiceover)
      : cloudSpeech(input.script, 'Cherry');
    return speech.then((audio) => {
      job.message =
        '正在检测人像并生成万相口播；通常需要5–10分钟，刷新页面可查看原任务。';
      persist(job);
      return cloudOpening(input.photo, audio);
    });
  })
    .then((clip) => {
      job.clip = clip;
      job.status = JobStatus.Complete;
      job.progress = 1;
      job.message = '百炼人物口播已生成，可预览、下载并加入成片。';
    })
    .catch((error: unknown) => {
      job.status = JobStatus.Failed;
      job.message =
        error instanceof Error ? error.message : '百炼人物口播失败。';
      job.progress = null;
    })
    .finally(() => {
      try {
        persist(job);
      } finally {
        jobState().activeJob = null;
        releaseWorkspace();
      }
    })
    .catch((error: unknown) => {
      console.error(
        '[cloud-opening:save-status]',
        job.id,
        error instanceof Error ? error.message : '状态保存失败',
      );
    });
  return { ...job };
}
