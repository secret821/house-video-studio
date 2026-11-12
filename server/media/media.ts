/** File trust boundary: normalize images, inspect audio and resolve only owned assets. */
import { workspaceDirectory } from '../storage/workspace';
import { execFile } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { existsSync, mkdirSync, renameSync, unlinkSync } from 'node:fs';
import { basename, resolve } from 'node:path';
import { promisify } from 'node:util';
import { parseFile } from 'music-metadata';
import sharp from 'sharp';

import {
  mediaPathSchema,
  type AudioAsset,
  type Project,
} from '../../src/services/definition/project';

export const ROOT = process.cwd();
export const DATA = resolve(ROOT, 'data');
export const UPLOADS = resolve(DATA, 'uploads');
export const EXPORTS = resolve(DATA, 'exports');
export const runFile = promisify(execFile);
for (const directory of [UPLOADS, EXPORTS, resolve(DATA, 'jobs')])
  mkdirSync(directory, { recursive: true });

/** Preserve a meaningful HTTP status through the shared error handler. */
export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

/** Regex validation precedes resolution, preventing traversal and arbitrary URL rendering. */
export function resolveAsset(src: string): string {
  const safe = mediaPathSchema.parse(src);
  let path = safe.startsWith('/media/')
    ? resolve(workspaceDirectory('uploads'), basename(safe))
    : resolve(ROOT, 'public/demo', basename(safe));
  if (!existsSync(path) && /^\/media\/import-[a-f0-9]+\.(mp4|jpg)$/.test(safe))
    path = resolve(
      workspaceDirectory('video-edit', 'prepared'),
      basename(safe),
    );
  if (!existsSync(path))
    throw new HttpError(
      400,
      '临时素材不存在或已过期，请重新上传或重新载入演示房源。',
    );
  return path;
}

/** A referenced prepared clip becomes durable by a same-volume rename, never a video copy/download. */
export function retainDraftAsset(src: string) {
  if (!src.startsWith('/media/')) return;
  const path = resolveAsset(src);
  const retained = resolve(workspaceDirectory('uploads'), basename(src));
  if (path !== retained) renameSync(path, retained);
}

/** Full render validation also rejects stale narration and duplicate scene identifiers. */
export function validateAssets(project: Project) {
  if (!project.scenes.length && !project.opening?.clip)
    throw new HttpError(400, '请先添加至少一张房源照片。');
  if (
    new Set(project.scenes.map((scene) => scene.id)).size !==
    project.scenes.length
  )
    throw new HttpError(400, '场景标识重复。');
  project.scenes.forEach((scene) => {
    resolveAsset(scene.src);
    if (scene.voiceover) {
      resolveAsset(scene.voiceover.src);
      if (
        scene.voiceover.text !== null &&
        scene.voiceover.text !== scene.narration
      )
        throw new HttpError(400, '解说已修改，请重新生成配音。');
    }
  });
  if (project.opening) {
    if (!project.opening.clip)
      throw new HttpError(400, '人物开场尚未就绪，请先上传视频或移除开场。');
    resolveAsset(project.opening.clip.src);
  }
  if (project.music) resolveAsset(project.music.src);
}

/** Decode and re-encode to strip uploaded metadata and reject non-image content. */
export function saveImage(file: Express.Multer.File) {
  const name = `${randomUUID()}.jpg`;
  const image = sharp(file.buffer, { limitInputPixels: 50_000_000 });
  return image
    .metadata()
    .catch((error: unknown) => {
      throw new HttpError(
        400,
        `图片无法解码：${error instanceof Error ? error.message : '无效文件'}`,
      );
    })
    .then((metadata) => {
      if (!['jpeg', 'png', 'webp'].includes(metadata.format ?? ''))
        throw new HttpError(400, '仅支持 JPG、PNG 和 WebP 图片。');
      return image
        .rotate()
        .resize({
          width: 2560,
          height: 2560,
          fit: 'inside',
          withoutEnlargement: true,
        })
        .jpeg({ quality: 90 })
        .toFile(resolve(workspaceDirectory('uploads'), name));
    })
    .then(() => ({
      src: `/media/${name}`,
      name: file.originalname.slice(0, 120),
    }));
}

/** Audio metadata is verified after writing; invalid media is removed immediately. */
export function inspectAudio(
  path: string,
  details: { name: string; text: string | null },
): Promise<AudioAsset> {
  return parseFile(path)
    .then(({ format }) => {
      if (
        !format.duration ||
        !Number.isFinite(format.duration) ||
        format.duration > 600 ||
        !format.numberOfChannels
      )
        throw new HttpError(400, '音频需可解码，且不超过10分钟。');
      return {
        src: `/media/${basename(path)}`,
        duration: format.duration,
        name: details.name.slice(0, 160),
        text: details.text,
      };
    })
    .catch((error: unknown) => {
      if (existsSync(path)) unlinkSync(path);
      throw error;
    });
}
