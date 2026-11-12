/** Explicit administrator bootstrap; no model, package or sample image is fetched by a user request. */
import { execFile } from 'node:child_process';
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { promisify } from 'node:util';
import sharp from 'sharp';

import {
  getPropertyOcrRuntime,
  OCR_VERSION,
} from '../server/copy/property-ocr';
import { propertyOcrResultSchema } from '../src/services/definition/property-extraction';

const run = promisify(execFile);
const runtime = getPropertyOcrRuntime();
const bootstrap = process.env.OCR_BOOTSTRAP_PYTHON || 'python3';
const sample = resolve(runtime.directory, 'check.png');
const options = {
  timeout: 15 * 60_000,
  maxBuffer: 2 * 1024 * 1024,
  env: { ...process.env, PIP_DISABLE_PIP_VERSION_CHECK: '1' },
};
mkdirSync(runtime.directory, { recursive: true });
rmSync(runtime.ready, { force: true });
console.info('安装本地 RapidOCR CPU 运行时并执行中文离线自检…');
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
  .then(() =>
    run(
      runtime.python,
      ['-m', 'pip', 'install', '-r', resolve('scripts/ocr-requirements.txt')],
      options,
    ),
  )
  .then(() =>
    process.env.STUDIO_OCR_HEADLESS === '1'
      ? run(
          runtime.python,
          ['-m', 'pip', 'uninstall', '-y', 'opencv-python'],
          options,
        ).then(() =>
          run(
            runtime.python,
            ['-m', 'pip', 'install', 'opencv-python-headless==5.0.0.93'],
            options,
          ),
        )
      : undefined,
  )
  .then(() => {
    mkdirSync(runtime.models, { recursive: true });
    return run(
      runtime.python,
      [
        '-c',
        `import pathlib, rapidocr, shutil, sys
src = pathlib.Path(rapidocr.__file__).parent / 'models'
dst = pathlib.Path(sys.argv[1])
for name in ('PP-OCRv6_det_small.onnx', 'ch_ppocr_mobile_v2.0_cls_mobile.onnx', 'PP-OCRv6_rec_small.onnx'):
    shutil.copy2(src / name, dst / name)`,
        runtime.models,
      ],
      options,
    );
  })
  .then(() =>
    sharp(resolve('scripts/property-ocr-check.svg')).png().toFile(sample),
  )
  .then(() =>
    run(runtime.python, [runtime.script, 'recognize', runtime.models, sample], {
      ...options,
      timeout: 120_000,
    }),
  )
  .then(({ stdout }) => {
    const result = propertyOcrResultSchema.parse(JSON.parse(stdout));
    if (!result.text.includes('133.93') || !result.text.includes('70'))
      throw new Error(`RapidOCR 中文离线自检未通过：${result.text}`);
    writeFileSync(runtime.ready, OCR_VERSION + '\n', { mode: 0o600 });
    console.info('RapidOCR 本地截图识别已就绪。');
  })
  .catch((error: unknown) => {
    console.error('RapidOCR 安装或自检失败：', error);
    process.exitCode = 1;
  })
  .finally(() => rmSync(sample, { force: true }));
