/** Job persistence must not turn guessed IDs or a restart into cross-account media access. */
import assert from 'node:assert/strict';
import test from 'node:test';
import { randomUUID } from 'node:crypto';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { JobStatus } from '../../src/services/definition/project';
import {
  runInWorkspace,
  registerWorkspace,
  workspaceDirectory,
} from '../../server/storage/workspace';
import {
  getCleanJob,
  getLatestCleanJob,
  cancelCleanJob,
} from '../../server/clean/smart-clean';

test('cleaning jobs are workspace-private and interrupted work never looks complete', () => {
  const root = mkdtempSync(resolve(tmpdir(), 'smart-clean-test-')),
    original = process.cwd();
  process.chdir(root);
  try {
    const a = registerWorkspace(randomUUID()),
      b = registerWorkspace(randomUUID()),
      id = randomUUID();
    runInWorkspace(a, () => {
      writeFileSync(
        resolve(workspaceDirectory('smart-clean-jobs'), id + '.json'),
        JSON.stringify({
          id,
          status: JobStatus.Rendering,
          progress: 0.4,
          message: 'running',
          results: [],
        }),
      );
      const job = getCleanJob(id);
      assert.equal(job.status, JobStatus.Failed);
      assert.match(job.message, /中断/);
      assert.equal(getLatestCleanJob()?.id, id);
    });
    runInWorkspace(b, () => {
      assert.throws(() => getCleanJob(id), /过期|不存在/);
      assert.equal(getLatestCleanJob(), null);
      assert.throws(() => cancelCleanJob(id), /过期|不存在/);
      assert.throws(() => getCleanJob('../outside'));
    });
  } finally {
    process.chdir(original);
    rmSync(root, { recursive: true, force: true });
  }
});
