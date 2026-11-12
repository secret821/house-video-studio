/** Build portable browser bundles on the build machine, never on a memory-constrained production render. */
import { bundle } from '@remotion/bundler';
import { writeFileSync, renameSync } from 'node:fs';
import { resolve } from 'node:path';

import {
  getVideoBundleFingerprint,
  VideoBundleKind,
} from '../server/video/video-bundles';

const root = process.cwd();
const fingerprint = getVideoBundleFingerprint(root);
const entries = [
  { kind: VideoBundleKind.Photo, entry: 'src/video/index.ts' },
  { kind: VideoBundleKind.Real, entry: 'src/video/video-edit-index.tsx' },
];
entries
  .reduce(
    (chain, item) =>
      chain.then(() => {
        const outDir = resolve(root, '.video-bundles', item.kind);
        return bundle({
          entryPoint: resolve(root, item.entry),
          outDir,
          enableCaching: false,
        }).then(() => {
          if (fingerprint !== getVideoBundleFingerprint(root))
            throw new Error('视频源码在构建期间发生变化，请重新构建。');
          const marker = resolve(outDir, 'source-manifest.json');
          writeFileSync(marker + '.tmp', JSON.stringify({ fingerprint }));
          renameSync(marker + '.tmp', marker);
          console.log(`Video bundle ready: ${item.kind}`);
        });
      }),
    Promise.resolve(),
  )
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  });
