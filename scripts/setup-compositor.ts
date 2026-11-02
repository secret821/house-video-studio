/** Install one checksum-pinned public binary locally; never replace the system or Remotion media tools. */
import { execFile } from 'node:child_process';
import {
  createReadStream,
  createWriteStream,
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  rmSync,
  chmodSync,
  writeFileSync,
} from 'node:fs';
import { resolve } from 'node:path';
import { pipeline } from 'node:stream/promises';
import { promisify } from 'node:util';
import { createGunzip } from 'node:zlib';
import {
  COMPOSITOR_ASSETS,
  COMPOSITOR_RELEASE,
  COMPOSITOR_VERSION,
  compositorDirectory,
  fileChecksum,
} from '../server/native-compositor-runtime';
const directory = compositorDirectory(),
  platform = `${process.platform}-${process.arch}`,
  asset = COMPOSITOR_ASSETS[platform],
  run = promisify(execFile);
const file = resolve(directory, 'ffmpeg');
/** Downloads have a hard deadline; a partial binary never becomes executable/readiness. */
function download(name: string, target: string) {
  return run(
    'curl',
    [
      '--fail',
      '--location',
      '--retry',
      '2',
      '--connect-timeout',
      '20',
      '--max-time',
      '600',
      `${COMPOSITOR_RELEASE}/${name}`,
      '-o',
      target,
    ],
    { timeout: 20 * 60_000 },
  );
}
Promise.resolve()
  .then(() => {
    if (!asset) throw new Error('Unsupported compositor platform');
    mkdirSync(directory, { recursive: true, mode: 0o750 });
    rmSync(resolve(directory, 'ready.txt'), { force: true });
    return existsSync(file) ? fileChecksum(file) : '';
  })
  .then((hash) => {
    if (hash === asset.sha256) return;
    const gzip = file + '.download.gz',
      partial = file + '.tmp';
    return download(`ffmpeg-${platform}.gz`, gzip)
      .then(() => fileChecksum(gzip))
      .then((digest) => {
        if (digest !== asset.gzipSha256)
          throw new Error('Archive checksum mismatch');
        return pipeline(
          createReadStream(gzip),
          createGunzip(),
          createWriteStream(partial, { mode: 0o640 }),
        );
      })
      .then(() => fileChecksum(partial))
      .then((digest) => {
        if (digest !== asset.sha256)
          throw new Error('Binary checksum mismatch');
        renameSync(partial, file);
      })
      .finally(() => {
        rmSync(gzip, { force: true });
        rmSync(partial, { force: true });
      });
  })
  .then(() => {
    chmodSync(file, 0o750);
    return download(`${platform}.LICENSE`, resolve(directory, 'LICENSE.tmp'));
  })
  .then(() => fileChecksum(resolve(directory, 'LICENSE.tmp')))
  .then((hash) => {
    if (hash !== asset.licenseSha256)
      throw new Error('License checksum mismatch');
    renameSync(
      resolve(directory, 'LICENSE.tmp'),
      resolve(directory, 'LICENSE'),
    );
    return run(
      file,
      [
        '-v',
        'error',
        '-y',
        '-threads',
        '1',
        '-filter_complex_threads',
        '1',
        '-f',
        'lavfi',
        '-i',
        'color=c=black:s=16x16:r=30',
        '-f',
        'lavfi',
        '-i',
        'color=c=red:s=16x16:r=30',
        '-filter_complex',
        '[0:v][1:v]overlay',
        '-frames:v',
        '2',
        '-pix_fmt',
        'rgb24',
        '-f',
        'rawvideo',
        resolve(directory, 'self-test.rgb'),
      ],
      { timeout: 30000 },
    );
  })
  .then(() => {
    const pixels = readFileSync(resolve(directory, 'self-test.rgb'));
    if (pixels.length !== 16 * 16 * 3 * 2 || pixels[0] < 200 || pixels[1] > 20)
      throw new Error('Compositor smoke test failed');
    writeFileSync(resolve(directory, 'ready.txt'), COMPOSITOR_VERSION, {
      mode: 0o640,
    });
    console.info(
      'Native picture compositor ready; no business media was processed.',
    );
  })
  .catch((error: unknown) => {
    console.error(
      error instanceof Error ? error.message : 'Compositor installation failed',
    );
    process.exitCode = 1;
  });
