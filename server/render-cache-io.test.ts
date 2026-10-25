/** Cache publication and corruption checks use a disposable directory, never real project artifacts. */
import assert from 'node:assert/strict';
import {
  mkdtempSync,
  mkdirSync,
  rmSync,
  writeFileSync,
  readFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { test, after } from 'node:test';

const source = process.cwd();
const isolated = mkdtempSync(resolve(tmpdir(), 'house-cache-test-'));
process.chdir(isolated);
const cache = import('./render-cache');
after(() => {
  process.chdir(source);
  rmSync(isolated, { recursive: true, force: true });
});

test('incomplete pairs never hit cache; completed segments survive refresh and detect corrupt media', () =>
  cache.then(
    ({
      CACHE_DIRECTORY,
      segmentPaths,
      hasCachedSegment,
      commitSegment,
      fingerprint,
    }) => {
      mkdirSync(CACHE_DIRECTORY, { recursive: true });
      const segment = {
        key: fingerprint('test segment'),
        label: '离线测试',
        start: 0,
        end: 89,
        sceneIds: ['one'],
      };
      const paths = segmentPaths(segment);
      writeFileSync(paths.video, Buffer.alloc(100, 1));
      assert.equal(hasCachedSegment(segment), false);
      writeFileSync(paths.audio, Buffer.alloc(100, 2));
      assert.equal(hasCachedSegment(segment), false);
      commitSegment(segment);
      assert.equal(hasCachedSegment(segment), true);
      const original = readFileSync(paths.video);
      writeFileSync(paths.video, 'corrupt');
      assert.equal(hasCachedSegment(segment), false);
      writeFileSync(paths.video, original);
      assert.equal(hasCachedSegment(segment), true);
    },
  ));
