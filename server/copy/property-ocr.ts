/** Offline property screenshot OCR. Images are decoded inside the account's short-lived workspace. */
import { workspaceDirectory } from '../storage/workspace';
import { randomUUID } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';
import sharp from 'sharp';

import { propertyOcrResultSchema } from '../../src/services/definition/property-extraction';

import { HttpError, runFile } from '../media/media';

export const OCR_VERSION = 'rapidocr-3.9.2-ppocrv6-small-v1';
const OCR_MODELS = [
  'PP-OCRv6_det_small.onnx',
  'ch_ppocr_mobile_v2.0_cls_mobile.onnx',
  'PP-OCRv6_rec_small.onnx',
];

/** Administrator-owned Python environment is separate from account media and never installed by a request. */
export function getPropertyOcrRuntime() {
  const directory = resolve(process.env.STUDIO_OCR_DIR || '.runtime/ocr');
  return {
    directory,
    python: resolve(directory, 'venv/bin/python'),
    models: resolve(directory, 'models'),
    ready: resolve(directory, 'ready.txt'),
    script: resolve('scripts/property-ocr.py'),
  };
}

/** A missing or stale installation leaves the button disabled with a useful setup message. */
export function getPropertyOcrCapability() {
  const runtime = getPropertyOcrRuntime();
  const ready =
    existsSync(runtime.python) &&
    existsSync(runtime.script) &&
    OCR_MODELS.every((name) => existsSync(resolve(runtime.models, name))) &&
    existsSync(runtime.ready) &&
    readFileSync(runtime.ready, 'utf8').trim() === OCR_VERSION;
  return {
    ready,
    message: ready
      ? '本地截图识别已就绪；识别文字仅进入待确认资料。'
      : '本地截图识别尚未安装，请管理员运行 pnpm setup:ocr。',
  };
}

/** Decode once, bound pixels and process output, then remove the image even when OCR fails. */
export function recognizePropertyScreenshot(
  file: Express.Multer.File,
  signal: AbortSignal,
) {
  const runtime = getPropertyOcrRuntime();
  if (!getPropertyOcrCapability().ready)
    return Promise.reject(new HttpError(503, '本地截图识别尚未安装。'));
  const directory = workspaceDirectory('property-ocr');
  mkdirSync(directory, { recursive: true, mode: 0o700 });
  const imagePath = resolve(directory, `${randomUUID()}.png`);
  const image = sharp(file.buffer, { limitInputPixels: 16_000_000 });
  return image
    .metadata()
    .then((metadata) => {
      if (!['jpeg', 'png', 'webp'].includes(metadata.format ?? ''))
        throw new HttpError(400, '截图仅支持 JPG、PNG 和 WebP。');
      if (!metadata.width || !metadata.height || metadata.height > 14000)
        throw new HttpError(400, '截图尺寸过大，请分段截取详情页。');
      return sharp(file.buffer, { limitInputPixels: 16_000_000 })
        .rotate()
        .resize({ width: 1600, withoutEnlargement: true })
        .png()
        .toFile(imagePath);
    })
    .then(() =>
      runFile(
        runtime.python,
        [runtime.script, 'recognize', runtime.models, imagePath],
        {
          signal,
          timeout: 90_000,
          maxBuffer: 256 * 1024,
          env: {
            ...process.env,
            OMP_NUM_THREADS: '2',
            OPENBLAS_NUM_THREADS: '2',
          },
        },
      ),
    )
    .then(({ stdout }) => {
      const result = propertyOcrResultSchema.parse(JSON.parse(stdout));
      if (!result.text.trim())
        throw new HttpError(
          422,
          '截图未识别到文字，请截取清晰的房源详情区域。',
        );
      return result;
    })
    .catch((error: unknown) => {
      if (error instanceof HttpError) throw error;
      if (error instanceof Error && error.name === 'AbortError') throw error;
      throw new HttpError(422, '截图识别失败，请换一张清晰截图重试。');
    })
    .finally(() => rmSync(imagePath, { force: true }));
}
