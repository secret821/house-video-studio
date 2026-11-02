/** Own one bounded upload, including its entire process group; never unlock while a decoder is still alive. */
import { workspaceState, TEMPORARY_MEDIA } from './workspace';
import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { dirname } from 'node:path';
import { RenderInternals } from '@remotion/renderer';

import {
  VIDEO_UPLOAD_TIMEOUT_MS,
  VideoUploadPhase,
  type VideoUploadTaskInfo,
} from '../src/services/definition/video-upload';
import { HttpError, ROOT } from './media';
import { reserveStorage, VIDEO_UPLOAD_BYTES } from './storage-capacity';

export interface VideoUploadTask {
  info: VideoUploadTaskInfo;
  controller: AbortController;
  done: Promise<void>;
  finish: () => void;
}
const uploadState = () =>
  workspaceState('upload', () => ({ active: null as VideoUploadTask | null }));

/** Snapshot IDs prevent an old cancel request from stopping a newer device's upload. */
export function getVideoUploadStatus() {
  const task = uploadState().active;
  return {
    active: task ? { ...task.info } : null,
    temporaryMedia: TEMPORARY_MEDIA,
  };
}

/** The deadline begins before multipart intake, so slow sends cannot hold the workspace indefinitely. */
export function beginVideoUpload(id: string = randomUUID()): VideoUploadTask {
  const state = uploadState();
  if (state.active)
    throw new HttpError(
      409,
      '服务器正在处理视频，可在页面取消当前上传后重试。',
    );
  const releaseStorage = reserveStorage(VIDEO_UPLOAD_BYTES);
  const controller = new AbortController();
  let complete!: () => void;
  const done = new Promise<void>((resolve) => {
    complete = resolve;
  });
  const timer = setTimeout(
    () =>
      controller.abort(
        new HttpError(
          408,
          '视频上传或信息校验超过15分钟，已终止，请检查网络后重试。',
        ),
      ),
    VIDEO_UPLOAD_TIMEOUT_MS,
  );
  const task: VideoUploadTask = {
    info: {
      id,
      name: '视频',
      startedAt: Date.now(),
      deadline: Date.now() + VIDEO_UPLOAD_TIMEOUT_MS,
      phase: VideoUploadPhase.Receiving,
    },
    controller,
    done,
    finish: () => {
      clearTimeout(timer);
      if (state.active === task) state.active = null;
      releaseStorage();
      complete();
    },
  };
  controller.signal.addEventListener(
    'abort',
    () => {
      task.info.phase = VideoUploadPhase.Cancelling;
    },
    { once: true },
  );
  state.active = task;
  return task;
}

/** Cancellation is idempotent for a completed upload, and completes only after cleanup releases ownership. */
export function cancelVideoUpload(id: string) {
  const task = uploadState().active;
  if (!task) return Promise.resolve(getVideoUploadStatus());
  if (task.info.id !== id)
    return Promise.reject(
      new HttpError(409, '当前上传已变化，请刷新状态后再取消。'),
    );
  task.controller.abort(
    new HttpError(499, '已取消视频上传与处理，已保存的素材保留。'),
  );
  return task.done.then(getVideoUploadStatus);
}

/** Killing the process group also kills pnpm/CLI descendants; aborting only their parent leaks FFmpeg. */
export function runVideoUploadCommand(
  task: Pick<VideoUploadTask, 'controller'>,
  command: { file: string; args: Array<string>; env?: NodeJS.ProcessEnv },
) {
  task.controller.signal.throwIfAborted();
  return new Promise<{ stdout: string; stderr: string }>((resolve, reject) => {
    const child = spawn(command.file, command.args, {
      cwd: ROOT,
      env: command.env,
      detached: process.platform !== 'win32',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let stdout = '';
    let stderr = '';
    let failure: unknown;
    /** Stop all descendants immediately; only disposable partial files are being written. */
    function stop() {
      failure =
        task.controller.signal.reason ??
        new HttpError(422, '视频处理输出过大，已停止。');
      if (!child.pid) return;
      try {
        if (process.platform === 'win32') child.kill('SIGKILL');
        else process.kill(-child.pid, 'SIGKILL');
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== 'ESRCH')
          child.kill('SIGKILL');
      }
    }
    task.controller.signal.addEventListener('abort', stop, { once: true });
    child.stdout.on('data', (chunk: Buffer) => {
      stdout += chunk.toString();
      if (stdout.length > 2 * 1024 * 1024) stop();
    });
    child.stderr.on('data', (chunk: Buffer) => {
      stderr = (stderr + chunk.toString()).slice(-2 * 1024 * 1024);
    });
    child.on('error', (error) => {
      failure = error;
    });
    child.on('close', (code) => {
      task.controller.signal.removeEventListener('abort', stop);
      if (failure) reject(failure);
      else if (code !== 0)
        reject(new Error(`视频处理退出 (${code})：${stderr.slice(-1000)}`));
      else resolve({ stdout, stderr });
    });
    if (task.controller.signal.aborted) stop();
  });
}

/** The pinned Remotion package resolves its own binary; avoid CLI startup and private node_modules paths. */
export function runVideoUploadMedia(
  task: Pick<VideoUploadTask, 'controller'>,
  command: { binary: 'ffmpeg' | 'ffprobe'; args: Array<string> },
) {
  task.controller.signal.throwIfAborted();
  return runVideoUploadCommand(task, getVideoMediaCommand(command));
}

/** Streaming and buffered operations must resolve exactly the same pinned FFmpeg and library paths. */
export function getVideoMediaCommand(command: {
  binary: 'ffmpeg' | 'ffprobe';
  args: Array<string>;
}) {
  const file = RenderInternals.getExecutablePath({
    type: command.binary,
    indent: false,
    logLevel: 'error',
    binariesDirectory: null,
  });
  RenderInternals.makeFileExecutableIfItIsNot(file);
  // Match Remotion CLI's dynamic-library lookup without launching two extra Node processes per command.
  const env = { ...process.env };
  if (process.platform === 'darwin') env.DYLD_LIBRARY_PATH = dirname(file);
  else if (process.platform === 'win32')
    env.PATH = `${dirname(file)};${process.env.PATH}`;
  else env.LD_LIBRARY_PATH = dirname(file);
  return { file, args: command.args, env };
}
