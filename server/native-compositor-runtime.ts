/** Optional, administrator-installed compositor reads generated YUV/PNG only; original media stays with pinned Remotion. */
import { createHash } from 'node:crypto';
import { createReadStream, existsSync, readFileSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
export const COMPOSITOR_VERSION = 'trusted-yuv-overlay-b6.1.1-v1';
export const COMPOSITOR_RELEASE =
  'https://github.com/eugeneware/ffmpeg-static/releases/download/b6.1.1';
export const COMPOSITOR_ASSETS: Record<
  string,
  { sha256: string; gzipSha256: string; licenseSha256: string }
> = {
  'linux-x64': {
    sha256: 'e7e7fb30477f717e6f55f9180a70386c62677ef8a4d4d1a5d948f4098aa3eb99',
    gzipSha256:
      'bfe8a8fc511530457b528c48d77b5737527b504a3797a9bc4866aeca69c2dffa',
    licenseSha256:
      '8ceb4b9ee5adedde47b31e975c1d90c73ad27b6b165a1dcd80c7c545eb65b903',
  },
  'darwin-arm64': {
    sha256: 'a90e3db6a3fd35f6074b013f948b1aa45b31c6375489d39e572bea3f18336584',
    gzipSha256:
      '8923876afa8db5585022d7860ec7e589af192f441c56793971276d450ed3bbfa',
    licenseSha256:
      'cb48bf09a11f5fb576cddb0431c8f5ed0a60157a9ec942adffc13907cbe083f2',
  },
  'darwin-x64': {
    sha256: 'ebdddc936f61e14049a2d4b549a412b8a40deeff6540e58a9f2a2da9e6b18894',
    gzipSha256:
      '929b375c1182d956c51f7ac25e0b2b0411fb01f6f407aa15c9758efeb4242106',
    licenseSha256:
      '2e1d16c72fd74e12063776371da757322f8b77589386532f4fd8634bde7de1af',
  },
};
export function compositorDirectory() {
  return resolve(process.env.STUDIO_COMPOSITOR_DIR || '.runtime/compositor');
}
/** Stream checksums avoid an 80MB allocation on the small server. Cache only public runtime identity, never account media. */
export function fileChecksum(path: string): Promise<string> {
  return new Promise((accept, reject) => {
    const hash = createHash('sha256');
    createReadStream(path)
      .on('data', (chunk) => hash.update(chunk))
      .on('error', reject)
      .on('end', () => accept(hash.digest('hex')));
  });
}
let checked: { identity: string; pending: Promise<string | null> } | null =
  null;
/** Missing/unverified optional runtime retains the established renderer; requests cannot select an executable. */
export function getNativeCompositor(): Promise<string | null> {
  const directory = compositorDirectory(),
    file = resolve(directory, 'ffmpeg'),
    marker = resolve(directory, 'ready.txt');
  const asset = COMPOSITOR_ASSETS[`${process.platform}-${process.arch}`];
  if (!asset || !existsSync(file) || !existsSync(marker))
    return Promise.resolve(null);
  try {
    if (readFileSync(marker, 'utf8').trim() !== COMPOSITOR_VERSION)
      return Promise.resolve(null);
    const stat = statSync(file);
    const identity = `${file}:${stat.size}:${stat.mtimeMs}:${stat.ctimeMs}`;
    if (checked?.identity !== identity)
      checked = {
        identity,
        pending: fileChecksum(file)
          .then((hash) => (hash === asset.sha256 ? file : null))
          .catch(() => null),
      };
    return checked.pending;
  } catch {
    return Promise.resolve(null);
  }
}
