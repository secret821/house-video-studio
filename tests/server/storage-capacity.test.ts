/** Real account files and deterministic disk availability exercise rejection, isolation and cancellation budgets. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { syncBuiltinESMExports } from 'node:module';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { before, after, test } from 'node:test';

const original = process.cwd();
const isolated = fs.mkdtempSync(resolve(tmpdir(), 'studio-capacity-'));
let storage: typeof import('../../server/storage/storage-capacity');
let workspace: typeof import('../../server/storage/workspace');
before(() => {
  process.chdir(isolated);
  process.env.STUDIO_TEMPORARY_MEDIA = '1';
  return import('../../server/storage/storage-capacity').then((module) => {
    storage = module;
    return import('../../server/storage/workspace').then((module) => {
      workspace = module;
    });
  });
});
after(() => {
  process.chdir(original);
  fs.rmSync(isolated, { recursive: true, force: true });
});

test('account usage plus pending writes reject over-budget work, without deleting existing media', () => {
  process.env.STUDIO_WORKSPACE_LIMIT_MIB = '1';
  const a = workspace.registerWorkspace('11111111-1111-4111-8111-111111111111');
  const b = workspace.registerWorkspace('22222222-2222-4222-8222-222222222222');
  workspace.runInWorkspace(a, () => {
    const path = resolve(workspace.workspaceDirectory('uploads'), 'keep.mp4');
    fs.writeFileSync(path, Buffer.alloc(storage.MIB / 2));
    const release = storage.reserveStorage(storage.MIB / 2);
    assert.equal(a.active, 1);
    assert.throws(() => storage.reserveStorage(1), /容量上限/);
    workspace.runInWorkspace(b, () => storage.reserveStorage(storage.MIB)());
    release();
    release();
    assert.equal(a.active, 0);
    storage.reserveStorage(storage.MIB / 2)();
    assert.equal(fs.statSync(path).size, storage.MIB / 2);
  });
  delete process.env.STUDIO_WORKSPACE_LIMIT_MIB;
});

test('shared disk reservations reject another account and recheck changes while queued', (context) => {
  const disk = fs.statfsSync(isolated);
  let available = 6;
  context.mock.method(fs, 'statfsSync', () => ({
    ...disk,
    bavail: available,
    bsize: storage.MIB,
  }));
  syncBuiltinESMExports();
  process.env.STUDIO_MIN_DISK_FREE_MIB = '1';
  context.after(() => {
    context.mock.restoreAll();
    syncBuiltinESMExports();
    delete process.env.STUDIO_MIN_DISK_FREE_MIB;
  });
  const a = workspace.registerWorkspace('33333333-3333-4333-8333-333333333333');
  const b = workspace.registerWorkspace('44444444-4444-4444-8444-444444444444');
  const release = workspace.runInWorkspace(a, () =>
    storage.reserveStorage(4 * storage.MIB),
  );
  try {
    workspace.runInWorkspace(b, () =>
      assert.throws(
        () => storage.reserveStorage(2 * storage.MIB),
        /磁盘空间不足/,
      ),
    );
    available = 4;
    assert.throws(storage.checkStorageReservations, /磁盘空间不足/);
  } finally {
    release();
  }
  workspace.runInWorkspace(b, () => storage.reserveStorage(2 * storage.MIB)());
});

test('invalid configuration cannot silently turn off protection; links never charge another account target', () => {
  process.env.STUDIO_WORKSPACE_LIMIT_MIB = '0';
  assert.throws(storage.storageLimits, /正整数/);
  delete process.env.STUDIO_WORKSPACE_LIMIT_MIB;
  const directory = resolve(isolated, 'links');
  fs.mkdirSync(directory);
  fs.symlinkSync(isolated, resolve(directory, 'outside'));
  assert.equal(
    storage.directoryBytes(directory),
    fs.lstatSync(resolve(directory, 'outside')).size,
  );
});
