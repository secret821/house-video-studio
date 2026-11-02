/** Download only official MIT model assets, verify hashes, then publish readiness after real local inference. */
import { createHash } from 'node:crypto';
import { execFile } from 'node:child_process';
import {
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { resolve } from 'node:path';
import { promisify } from 'node:util';
import {
  SMART_CLEAN_MODELS,
  SMART_CLEAN_VERSION,
} from '../server/smart-clean-models';
const directory = resolve(
  process.env.STUDIO_SMART_CLEAN_DIR || '.runtime/smart-clean',
);
mkdirSync(directory, { recursive: true, mode: 0o700 });
/** An unverified or truncated file never becomes an installed model. */
function install(model: (typeof SMART_CLEAN_MODELS)[number]) {
  const path = resolve(directory, model.name);
  if (
    existsSync(path) &&
    createHash('sha256').update(readFileSync(path)).digest('hex') ===
      model.sha256
  )
    return Promise.resolve();
  return promisify(execFile)(
    'curl',
    [
      '--fail',
      '--location',
      '--silent',
      '--show-error',
      '--max-time',
      '600',
      '--retry',
      '2',
      '--continue-at',
      '-',
      `https://media.githubusercontent.com/media/onnx/models/main/${model.source}`,
      '--output',
      path + '.tmp',
    ],
    { timeout: 20 * 60_000 },
  ).then(() => {
    const buffer = readFileSync(path + '.tmp');
    if (createHash('sha256').update(buffer).digest('hex') !== model.sha256)
      throw new Error('Model checksum mismatch');
    renameSync(path + '.tmp', path);
  });
}
Promise.resolve()
  .then(() => {
    rmSync(resolve(directory, 'ready.txt'), { force: true });
  })
  .then(() =>
    SMART_CLEAN_MODELS.reduce(
      (chain, model) => chain.then(() => install(model)),
      Promise.resolve(),
    ),
  )
  .then(() => {
    const input = resolve(directory, 'self-test.json');
    writeFileSync(
      input,
      JSON.stringify({
        model: directory,
        output: resolve(directory, 'self-test-result.json'),
        frames: [{ path: resolve('public/demo/bedroom.jpg'), time: 0 }],
      }),
    );
    return promisify(execFile)(
      process.execPath,
      ['--import', 'tsx', 'scripts/smart-clean-inference.ts', input],
      { timeout: 120000, env: { ...process.env, OMP_NUM_THREADS: '1' } },
    );
  })
  .then(() => {
    writeFileSync(resolve(directory, 'ready.txt'), SMART_CLEAN_VERSION, {
      mode: 0o600,
    });
    console.info('Local smart cleaning is ready. No media is uploaded.');
  })
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : 'Setup failed');
    process.exitCode = 1;
  });
