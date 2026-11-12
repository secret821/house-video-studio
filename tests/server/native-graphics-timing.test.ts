/** Sparse holds must change on the authored frame, including across source segment boundaries. */
import assert from 'node:assert/strict';
import test from 'node:test';
import { execFile } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { promisify } from 'node:util';
import sharp from 'sharp';
import {
  getGraphicRuns,
  createGraphicConcat,
} from '../../server/media/native-graphics-timing';
import { getNativeCompositor } from '../../server/media/native-compositor-runtime';
test('sparse graphics use exact frame lengths and retain the graphic active before a segment starts', () => {
  const runs = getGraphicRuns({
    frames: [36, 37, 42, 90, 100],
    start: 40,
    length: 60,
  });
  assert.deepEqual(runs, [
    { frame: 37, length: 2 },
    { frame: 42, length: 48 },
    { frame: 90, length: 10 },
  ]);
  assert.equal(
    runs.reduce((sum, run) => sum + run.length, 0),
    60,
  );
  assert.throws(
    () => getGraphicRuns({ frames: [10], start: 0, length: 5 }),
    /initial/,
  );
});
test('installed compositor changes a one-frame graphic at its exact 30fps boundary', (context) =>
  getNativeCompositor().then((binary) => {
    if (!binary) {
      context.skip('Optional compositor is not installed');
      return;
    }
    const dir = mkdtempSync(resolve(tmpdir(), 'graphics-timing-'));
    const width = 16,
      height = 16,
      frames = 6;
    const yuv = Buffer.alloc(width * height * 1.5 * frames, 128);
    for (let frame = 0; frame < frames; frame++)
      yuv.fill(16, frame * 384, frame * 384 + 256);
    writeFileSync(resolve(dir, 'video.yuv'), yuv);
    return Promise.all([
      sharp({ create: { width, height, channels: 4, background: '#ff0000' } })
        .png()
        .toFile(resolve(dir, 'g-0.png')),
      sharp({ create: { width, height, channels: 4, background: '#00ff00' } })
        .png()
        .toFile(resolve(dir, 'g-1.png')),
    ])
      .then(() => {
        writeFileSync(
          resolve(dir, 'graphics.txt'),
          createGraphicConcat({ frames: [0, 1], start: 0, length: 6 }),
        );

        return promisify(execFile)(
          binary,
          [
            '-v',
            'error',
            '-y',
            '-threads',
            '1',
            '-filter_complex_threads',
            '1',
            '-f',
            'rawvideo',
            '-pixel_format',
            'yuv420p',
            '-video_size',
            '16x16',
            '-framerate',
            '30',
            '-i',
            resolve(dir, 'video.yuv'),
            '-f',
            'concat',
            '-safe',
            '0',
            '-i',
            resolve(dir, 'graphics.txt'),
            '-filter_complex',
            '[1:v]format=yuva420p[g];[0:v][g]overlay=eof_action=repeat:format=yuv420[out]',
            '-map',
            '[out]',
            '-frames:v',
            '6',
            '-pix_fmt',
            'rgb24',
            '-f',
            'rawvideo',
            resolve(dir, 'output.rgb'),
          ],
          { timeout: 30000 },
        );
      })
      .then(() => {
        const output = readFileSync(resolve(dir, 'output.rgb'));
        assert.equal(output.length, 16 * 16 * 3 * frames);
        assert.ok(
          output[0] > 200 && output[1] < 30,
          'Frame zero must remain red',
        );
        for (let frame = 1; frame < frames; frame++) {
          const offset = frame * 16 * 16 * 3;
          assert.ok(
            output[offset] < 30 && output[offset + 1] > 200,
            `Frame ${frame} must be green`,
          );
        }
      })
      .finally(() => rmSync(dir, { recursive: true, force: true }));
  }));

test('transparent graphics retain full-range source black levels', (context) =>
  getNativeCompositor().then((binary) => {
    if (!binary) {
      context.skip('Optional compositor is not installed');
      return;
    }
    const dir = mkdtempSync(resolve(tmpdir(), 'graphics-range-'));
    const yuv = Buffer.alloc(384, 128);
    yuv.fill(16, 0, 256);
    writeFileSync(resolve(dir, 'video.yuv'), yuv);
    return sharp({
      create: {
        width: 16,
        height: 16,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      },
    })
      .png()
      .toFile(resolve(dir, 'clear.png'))
      .then(() =>
        promisify(execFile)(
          binary,
          [
            '-v',
            'error',
            '-y',
            '-threads',
            '1',
            '-filter_complex_threads',
            '1',
            '-f',
            'rawvideo',
            '-pixel_format',
            'yuv420p',
            '-video_size',
            '16x16',
            '-framerate',
            '30',
            '-color_range',
            'pc',
            '-i',
            resolve(dir, 'video.yuv'),
            '-i',
            resolve(dir, 'clear.png'),
            '-filter_complex',
            '[0:v]scale=in_range=pc:out_range=tv[v];[1:v]format=yuva420p[g];[v][g]overlay=shortest=0:eof_action=repeat:format=yuv420[out]',
            '-map',
            '[out]',
            '-frames:v',
            '1',
            '-pix_fmt',
            'rgb24',
            '-f',
            'rawvideo',
            resolve(dir, 'output.rgb'),
          ],
          { timeout: 30000 },
        ),
      )
      .then(() => {
        const result = readFileSync(resolve(dir, 'output.rgb'));
        assert.equal(result.length, 16 * 16 * 3);
        assert.ok(
          [...result].every((value) => Math.abs(value - 16) <= 2),
          'Transparent overlays must not crush source black levels',
        );
      })
      .finally(() => rmSync(dir, { recursive: true, force: true }));
  }));
