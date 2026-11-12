/** Explicit public-model installation; readiness requires a real offline Chinese transcript with timestamps. */
import { execFile } from 'node:child_process';
import {
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { resolve } from 'node:path';
import { promisify } from 'node:util';

import { getAsrRuntime } from '../server/speech/subtitles';
import { speechCaptionsSchema } from '../src/services/definition/subtitles';

const runtime = getAsrRuntime();
const run = promisify(execFile);
const bootstrap = process.env.ASR_BOOTSTRAP_PYTHON || 'python3';
const options = {
  timeout: 20 * 60_000,
  maxBuffer: 4 * 1024 * 1024,
  env: {
    ...process.env,
    PIP_DISABLE_PIP_VERSION_CHECK: '1',
    PIP_CACHE_DIR: resolve(runtime.directory, 'pip-cache'),
  },
};
mkdirSync(runtime.directory, { recursive: true });
rmSync(resolve(runtime.directory, 'ready.txt'), { force: true });
console.info(`安装免费原声识别运行时（${runtime.engine}）…`);
run(
  bootstrap,
  [
    '-c',
    'import sys; assert (3,10) <= sys.version_info[:2] < (3,14), "Use Python 3.10–3.13"',
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
  .then(() =>
    run(
      runtime.python,
      [
        '-m',
        'pip',
        'install',
        '-r',
        resolve(
          runtime.engine === 'nano'
            ? 'scripts/asr-nano-requirements.txt'
            : 'scripts/asr-requirements.txt',
        ),
      ],
      options,
    ),
  )
  .then(() => {
    console.info('下载并校验公开模型，原声音轨不会上传…');
    return run(
      runtime.python,
      [
        resolve(
          runtime.engine === 'nano'
            ? 'scripts/asr-nano-download.py'
            : 'scripts/asr-download.py',
        ),
        runtime.model,
      ],
      options,
    );
  })
  .then(() => {
    console.info('运行离线中文时间戳自检…');
    return run(
      runtime.python,
      [
        runtime.script,
        '--model-dir',
        runtime.model,
        '--audio',
        resolve(runtime.model, 'test.wav'),
        '--output',
        resolve(runtime.directory, 'check.json'),
      ],
      {
        ...options,
        timeout: 120_000,
        env: { ...options.env, HF_HUB_OFFLINE: '1', TRANSFORMERS_OFFLINE: '1' },
      },
    );
  })
  .then(() => {
    const captions = speechCaptionsSchema.parse(
      JSON.parse(
        readFileSync(resolve(runtime.directory, 'check.json'), 'utf8'),
      ),
    );
    if (!captions.length || !captions.some((cue) => cue.startMs > 0))
      throw new Error('中文时间戳自检失败。');
    writeFileSync(resolve(runtime.directory, 'ready.txt'), runtime.id + '\n');
    console.info(
      '免费原声识别已就绪。刷新工作室后可主动生成原声字幕，编辑文案并确认添加；已有字幕不自动覆盖。',
    );
  })
  .catch((error: unknown) => {
    console.error(
      '原声识别安装失败：',
      error instanceof Error ? error.message : '未知错误',
    );
    process.exitCode = 1;
  })
  .finally(() =>
    rmSync(resolve(runtime.directory, 'check.json'), { force: true }),
  );
