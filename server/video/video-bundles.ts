/** Small servers consume immutable, source-matched video bundles instead of compiling during a render. */
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { resolve, relative } from 'node:path';
import { z } from 'zod';

export enum VideoBundleKind {
  Photo = 'photo',
  Real = 'real',
}
export const RENDER_CACHE_LIMITS = {
  // Remotion's media cache requires at least 240 MB.
  mediaCacheSizeInBytes: 256 * 1024 * 1024,
  offthreadVideoCacheSizeInBytes: 64 * 1024 * 1024,
};

/** Opt in on measured larger hosts; absent or invalid settings retain the small-server limit. */
export function getVideoProcessingThreads(
  value = process.env.STUDIO_VIDEO_THREADS,
) {
  const threads = Number(value ?? 1);
  return Number.isInteger(threads) && threads >= 1 && threads <= 3
    ? threads
    : 1;
}

/** Include source paths, media contracts and locked dependencies; a stale build must never render a changed template. */
export function getVideoBundleFingerprint(root: string) {
  const hash = createHash('sha256');
  function visit(directory: string) {
    readdirSync(directory, { withFileTypes: true })
      .sort((a, b) => a.name.localeCompare(b.name))
      .forEach((entry) => {
        const path = resolve(directory, entry.name);
        if (entry.isDirectory()) visit(path);
        else if (/\.tsx?$/.test(entry.name) && !entry.name.includes('.test.'))
          hash.update(relative(root, path)).update(readFileSync(path));
      });
  }
  visit(resolve(root, 'src/video'));
  visit(resolve(root, 'src/services/definition'));
  for (const file of ['package.json', 'pnpm-lock.yaml'])
    hash.update(file).update(readFileSync(resolve(root, file)));
  return hash.digest('hex');
}

export function getPrebuiltVideoBundle(
  kind: VideoBundleKind,
  root: string,
  enabled = process.env.PREBUILT_VIDEO_BUNDLES === '1',
) {
  if (!enabled) return null;
  const directory = resolve(root, '.video-bundles', kind);
  const marker = resolve(directory, 'source-manifest.json');
  if (!existsSync(marker) || !existsSync(resolve(directory, 'index.html')))
    throw new Error('预编译视频模板缺失，请先执行pnpm build:video并重新发布。');
  const manifest = z
    .object({ fingerprint: z.string().regex(/^[a-f0-9]{64}$/) })
    .parse(JSON.parse(readFileSync(marker, 'utf8')));
  if (manifest.fingerprint !== getVideoBundleFingerprint(root))
    throw new Error(
      '预编译视频模板与当前源码不匹配，请重新构建发布，未开始渲染。',
    );
  return directory;
}
