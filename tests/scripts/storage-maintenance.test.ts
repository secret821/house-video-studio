/** Destructive maintenance is exercised only against disposable fixtures, including links and fresh writes. */
import assert from 'node:assert/strict';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  rmSync,
  symlinkSync,
  utimesSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { test } from 'node:test';
import {
  applyMaintenance,
  inspectMaintenance,
  markMaintenanceComplete,
} from '../../scripts/storage-maintenance';

const DAY = 24 * 60 * 60_000;
test('preview never deletes; apply removes only marked expired acceptance trees, retaining live/private files', () => {
  const root = mkdtempSync(resolve(tmpdir(), 'studio-maintenance-'));
  const now = Date.now();
  try {
    [
      'artifacts/old',
      'artifacts/fresh',
      'artifacts/unmarked',
      'verification/remote',
      'data/test-verification',
      'data/uploads',
      'data/temporary/session-abc/legacy',
      '.runtime/asr',
      'private/sessions',
      'releases/old',
    ].forEach((path) => {
      mkdirSync(resolve(root, path), { recursive: true });
      writeFileSync(resolve(root, path, 'keep.bin'), 'fixture');
    });
    [
      'artifacts/old',
      'artifacts/fresh',
      'verification/remote',
      'data/test-verification',
    ].forEach((path) => markMaintenanceComplete(root, path));
    const future = now + 8 * DAY;
    utimesSync(
      resolve(root, 'artifacts/fresh/keep.bin'),
      new Date(future),
      new Date(future),
    );
    const entries = inspectMaintenance(root, 7, future);
    assert.equal(entries.filter((entry) => entry.eligible).length, 3);
    assert.ok(existsSync(resolve(root, 'artifacts/old/keep.bin')));
    assert.equal(
      inspectMaintenance(root).some((entry) => entry.eligible),
      false,
    );
    assert.equal(applyMaintenance(root, 7, future).length, 3);
    assert.equal(existsSync(resolve(root, 'artifacts/old')), false);
    [
      'artifacts/fresh',
      'artifacts/unmarked',
      'data/uploads',
      'data/temporary/session-abc/legacy',
      '.runtime/asr',
      'private/sessions',
      'releases/old',
    ].forEach((path) => assert.ok(existsSync(resolve(root, path, 'keep.bin'))));
    assert.deepEqual(applyMaintenance(root, 7, future), []);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('links, malformed markers, path escape and concurrent sweepers cannot broaden deletion', () => {
  const root = mkdtempSync(resolve(tmpdir(), 'studio-maintenance-links-'));
  const outside = mkdtempSync(resolve(tmpdir(), 'studio-maintenance-outside-'));
  try {
    mkdirSync(resolve(root, 'artifacts/bad'), { recursive: true });
    writeFileSync(resolve(root, 'artifacts/bad/.studio-disposable.json'), '{}');
    mkdirSync(resolve(root, 'artifacts/linked'));
    writeFileSync(resolve(outside, 'keep.bin'), 'private');
    symlinkSync(outside, resolve(root, 'artifacts/linked/escape'));
    symlinkSync(outside, resolve(root, 'artifacts/alias'));
    mkdirSync(resolve(root, 'verification/finished/data'), { recursive: true });
    writeFileSync(
      resolve(root, 'verification/finished/data/sample.mp4'),
      'sample',
    );
    symlinkSync(outside, resolve(root, 'verification/finished/node_modules'));
    markMaintenanceComplete(root, 'verification/finished/data');
    const later = Date.now() + 20 * DAY;
    assert.equal(applyMaintenance(root, 7, later).length, 1);
    assert.ok(
      existsSync(resolve(root, 'verification/finished/node_modules/keep.bin')),
    );
    assert.equal(
      inspectMaintenance(root, 7, Date.now() + 20 * DAY).some(
        (entry) => entry.eligible,
      ),
      false,
    );
    assert.throws(
      () => markMaintenanceComplete(root, 'artifacts/linked'),
      /符号链接/,
    );
    assert.throws(
      () => markMaintenanceComplete(root, 'data/uploads'),
      /只能标记/,
    );
    assert.throws(
      () => markMaintenanceComplete(root, '../artifacts/bad'),
      /只能标记/,
    );
    assert.throws(() => applyMaintenance(root, 0), /至少7天/);
    mkdirSync(resolve(root, '.studio-storage-maintenance.lock'));
    assert.throws(() => applyMaintenance(root), /EEXIST/);
    assert.ok(existsSync(resolve(outside, 'keep.bin')));
  } finally {
    rmSync(root, { recursive: true, force: true });
    rmSync(outside, { recursive: true, force: true });
  }
});
