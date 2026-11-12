/** Explicit local-only bootstrap. No text, audio, credentials or account media are downloaded or uploaded. */
import { execFile } from 'node:child_process';
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { promisify } from 'node:util';

import {
  getKokoroRuntime,
  KOKORO_MODEL,
  KOKORO_REVISION,
  KOKORO_VOICE,
} from '../server/speech/local-speech';
import { inspectAudio } from '../server/media/media';

const run = promisify(execFile);
const runtime = getKokoroRuntime();
mkdirSync(runtime.directory, { recursive: true });
rmSync(resolve(runtime.directory, 'ready.txt'), { force: true });
const options = {
  timeout: 20 * 60_000,
  maxBuffer: 4 * 1024 * 1024,
  env: {
    ...process.env,
    HF_HOME: resolve(runtime.directory, 'huggingface'),
    XDG_CACHE_HOME: resolve(runtime.directory, 'cache'),
    MPLCONFIGDIR: resolve(runtime.directory, 'matplotlib'),
    HF_HUB_DISABLE_XET: '1',
    HF_HUB_DISABLE_TELEMETRY: '1',
    PIP_DISABLE_PIP_VERSION_CHECK: '1',
  },
};
const input = resolve(runtime.directory, 'check.txt');
const output = resolve(runtime.directory, 'check.wav');
console.info('安装 Kokoro-82M v1.1-zh（仅下载公开依赖和模型）…');
const bootstrap = process.env.KOKORO_BOOTSTRAP_PYTHON || 'python3';
run(
  bootstrap,
  [
    '-c',
    'import sys; assert (3,10) <= sys.version_info[:2] < (3,14), "Kokoro requires Python 3.10–3.13"',
  ],
  options,
)
  .then(() =>
    existsSync(runtime.python)
      ? undefined
      : run(
          bootstrap,
          ['-m', 'venv', resolve(runtime.directory, 'venv')],
          options,
        ),
  )
  .then(() => run(runtime.python, ['-m', 'ensurepip'], options))
  // Linux uses the CPU wheel to avoid downloading CUDA libraries on the small server.
  .then(() => {
    const args = ['-m', 'pip', 'install', 'torch==2.6.0'];
    if (process.platform === 'linux')
      args.push('--index-url', 'https://download.pytorch.org/whl/cpu');
    return run(runtime.python, args, options);
  })
  .then(() =>
    run(
      runtime.python,
      [
        '-m',
        'pip',
        'install',
        '-r',
        resolve('scripts/kokoro-requirements.txt'),
      ],
      options,
    ),
  )
  .then(() => {
    console.info('下载并校验官方中文模型及 zf_001 音色…');
    return run(
      runtime.python,
      [runtime.script, 'prepare', '--model-dir', runtime.model],
      options,
    );
  })
  .then(() => {
    writeFileSync(input, '你好，欢迎使用本地中文配音。', { mode: 0o600 });
    return run(
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
        ...options,
        timeout: 5 * 60_000,
        env: { ...options.env, HF_HUB_OFFLINE: '1', TRANSFORMERS_OFFLINE: '1' },
      },
    );
  })
  .then(() => inspectAudio(output, { name: 'Kokoro 安装自检', text: null }))
  .then(() => {
    writeFileSync(
      resolve(runtime.directory, 'ready.txt'),
      `${KOKORO_MODEL}@${KOKORO_REVISION}:${KOKORO_VOICE}\n`,
    );
    console.info('Kokoro 安装完成，离线配音自检通过。刷新照片模式即可使用。');
  })
  .catch((error: unknown) => {
    console.error(
      'Kokoro 安装失败：',
      error instanceof Error ? error.message : '未知错误',
    );
    process.exitCode = 1;
  })
  .finally(() => {
    rmSync(input, { force: true });
    rmSync(output, { force: true });
  });
