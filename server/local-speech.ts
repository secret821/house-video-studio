/** Offline Kokoro adapter: shared immutable model, account-owned text/audio, one heavy media slot. */
import { existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { resolve } from 'node:path';

import { HttpError, inspectAudio, runFile } from './media';
import { acquireMediaSlot } from './media-queue';
import {
  checkStorageReservations,
  MIB,
  reserveStorage,
} from './storage-capacity';
import { holdWorkspace, workspaceDirectory } from './workspace';

export const KOKORO_MODEL = 'hexgrad/Kokoro-82M-v1.1-zh';
export const KOKORO_VOICE = 'zf_001';
export const KOKORO_REVISION = '01e7505bd6a7a2ac4975463114c3a7650a9f7218';

/** Administrator configuration selects only installed runtime files, never request data. */
export function getKokoroRuntime() {
  const directory = resolve(process.env.STUDIO_KOKORO_DIR || '.runtime/kokoro');
  return {
    directory,
    python: resolve(directory, 'venv/bin/python'),
    model: resolve(directory, 'model'),
    script: resolve('scripts/kokoro-inference.py'),
  };
}

/** Installation marks ready only after an offline synthesis and decode have succeeded. */
export function getLocalSpeechCapability() {
  const runtime = getKokoroRuntime();
  let ready = false;
  try {
    ready =
      readFileSync(resolve(runtime.directory, 'ready.txt'), 'utf8').trim() ===
        `${KOKORO_MODEL}@${KOKORO_REVISION}:${KOKORO_VOICE}` &&
      [
        runtime.python,
        runtime.script,
        'config.json',
        'kokoro-v1_1-zh.pth',
        'voices/zf_001.pt',
      ].every((path, index) =>
        existsSync(index < 2 ? path : resolve(runtime.model, path)),
      );
  } catch (error) {
    if (
      !(error instanceof Error) ||
      !('code' in error) ||
      error.code !== 'ENOENT'
    )
      throw error;
  }
  return {
    localSpeechReady: ready,
    speechReady: ready,
    speechMessage: ready
      ? 'Kokoro-82M v1.1-zh · 中文女声 · 本地免费配音，生成时不上传文字。'
      : 'Kokoro 尚未安装完成，请管理员运行 pnpm setup:kokoro；也可上传录音。',
  };
}

/** Each invocation exits to release model memory; failures never publish or retain partial media. */
export function synthesizeSpeech(text: string) {
  if (!text.trim() || text.length > 300)
    return Promise.reject(new HttpError(400, '配音文字需为1～300字。'));
  const capability = getLocalSpeechCapability();
  if (!capability.speechReady)
    return Promise.reject(new HttpError(503, capability.speechMessage));
  const releaseWorkspace = holdWorkspace();
  const runtime = getKokoroRuntime();
  const id = randomUUID();
  const input = resolve(workspaceDirectory('speech-tmp'), `${id}.txt`);
  const output = resolve(workspaceDirectory('uploads'), `${id}.wav`);
  let releaseStorage: (() => void) | undefined;
  return Promise.resolve()
    .then(() => {
      releaseStorage = reserveStorage(64 * MIB);
      return acquireMediaSlot();
    })
    .then((release) =>
      Promise.resolve()
        .then(() => {
          checkStorageReservations();
          writeFileSync(input, text, { mode: 0o600 });
          return runFile(
            runtime.python,
            [
              runtime.script,
              'synthesize',
              '--model-dir',
              runtime.model,
              '--text-file',
              input,
              '--output',
              output,
            ],
            {
              timeout: 5 * 60_000,
              maxBuffer: 256 * 1024,
              env: {
                ...process.env,
                HF_HUB_OFFLINE: '1',
                TRANSFORMERS_OFFLINE: '1',
                HF_HOME: resolve(runtime.directory, 'huggingface'),
                XDG_CACHE_HOME: resolve(runtime.directory, 'cache'),
                MPLCONFIGDIR: resolve(runtime.directory, 'matplotlib'),
                OMP_NUM_THREADS: '1',
                TOKENIZERS_PARALLELISM: 'false',
              },
            },
          );
        })
        .catch((error: unknown) => {
          rmSync(output, { force: true });
          if (error instanceof HttpError) throw error;
          // Child stderr/argv may contain private text or filesystem paths.
          const timedOut =
            error instanceof Error && 'killed' in error && error.killed;
          throw new HttpError(
            502,
            timedOut
              ? 'Kokoro 配音超时，请缩短文案后重试。'
              : 'Kokoro 配音失败，请检查本地模型依赖；原配音已保留。',
          );
        })
        .then(() =>
          inspectAudio(output, { name: 'Kokoro v1.1-zh · 中文女声', text }),
        )
        .finally(release),
    )
    .finally(() => {
      try {
        rmSync(input, { force: true });
      } finally {
        releaseWorkspace();
        releaseStorage?.();
      }
    });
}
