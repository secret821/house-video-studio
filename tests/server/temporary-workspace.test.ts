/** Temporary storage cleanup uses real disk files and cannot remove active account work. */
import assert from 'node:assert/strict';
import { before, after, test } from 'node:test';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { resolve } from 'node:path';
import { tmpdir } from 'node:os';
const original = process.cwd();
const isolated = mkdtempSync(resolve(tmpdir(), 'studio-temporary-test-'));
let workspace: typeof import('../../server/storage/workspace');
before(() => {
  process.chdir(isolated);
  process.env.STUDIO_TEMPORARY_MEDIA = '1';
  mkdirSync(resolve('data/temporary/session-old123'), { recursive: true });
  writeFileSync(
    resolve('data/temporary/session-old123/old.mp4'),
    'old user file',
  );
  return import('../../server/storage/workspace').then((module) => {
    workspace = module;
  });
});
after(() => {
  process.chdir(original);
  rmSync(isolated, { recursive: true, force: true });
});
test('restart and idle expiry discard scratch but retain account originals', () => {
  const a = workspace.registerWorkspace('11111111-1111-4111-8111-111111111111');
  const b = workspace.registerWorkspace('22222222-2222-4222-8222-222222222222');
  const scratch = workspace.runInWorkspace(b, () =>
    resolve(workspace.workspaceDirectory('exports'), 'scratch.mp4'),
  );
  writeFileSync(scratch, 'temporary output');
  const first = workspace.runInWorkspace(a, () =>
    resolve(workspace.workspaceDirectory('uploads'), 'a.mp4'),
  );
  const second = workspace.runInWorkspace(b, () =>
    resolve(workspace.workspaceDirectory('uploads'), 'b.mp4'),
  );
  assert.equal(existsSync(resolve('data/temporary/session-old123')), false);
  writeFileSync(first, 'first');
  writeFileSync(second, 'second');
  b.state.set('private', 'discard on expiry');
  const epoch = b.mediaSessionId;
  const release = workspace.runInWorkspace(a, () => workspace.holdWorkspace());
  const now = Date.now() + workspace.MEDIA_RETENTION_MS + 100;
  assert.deepEqual(workspace.cleanupWorkspaces(now), [b.id]);
  assert.equal(readFileSync(first, 'utf8'), 'first');
  assert.equal(readFileSync(second, 'utf8'), 'second');
  assert.equal(existsSync(scratch), false);
  assert.notEqual(b.mediaSessionId, epoch);
  assert.equal(b.state.size, 0);
  release();
  assert.deepEqual(workspace.cleanupWorkspaces(now), [a.id]);
  assert.equal(readFileSync(first, 'utf8'), 'first');
});
test('temporary workspaces cannot reset the old paid budget or submit paid generation', () => {
  return import('../../server/cloud/cloud').then((cloud) =>
    Promise.all([
      assert.rejects(cloud.cloudSpeech('must not be sent', 'Cherry'), /未授权/),
      assert.rejects(
        cloud.cloudOpening('/demo/unused.jpg', {
          src: '/demo/unused.wav',
          duration: 1,
          name: 'test',
          text: null,
        }),
        /未授权/,
      ),
    ]).then(() => assert.equal(existsSync(cloud.CLOUD_LEDGER), false)),
  );
});
