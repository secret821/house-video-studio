/** Shared-resource waiting must preserve each account's asynchronous scope and cancellation ownership. */
import assert from 'node:assert/strict';
import test from 'node:test';
import { acquireMediaSlot } from '../../server/media/media-queue';
import {
  getWorkspace,
  registerWorkspace,
  runInWorkspace,
} from '../../server/storage/workspace';

test('a cancelled waiting account never interrupts the running account or takes its slot', () => {
  const first = registerWorkspace('11111111-1111-4111-8111-111111111111');
  const second = registerWorkspace('33333333-3333-4333-8333-333333333333');
  const controller = new AbortController();
  let release: (() => void) | undefined;
  let entered = false;
  return runInWorkspace(first, () =>
    acquireMediaSlot().then((unlock) => {
      release = unlock;
      assert.equal(getWorkspace().id, first.id);
      const cancelled = runInWorkspace(second, () =>
        acquireMediaSlot(controller.signal),
      );
      const queued = runInWorkspace(second, () =>
        acquireMediaSlot().then((unlockSecond) => {
          entered = true;
          assert.equal(getWorkspace().id, second.id);
          unlockSecond();
        }),
      );
      controller.abort(new Error('cancel only second waiting item'));
      return assert.rejects(cancelled, /cancel only second/).then(() => {
        assert.equal(entered, false);
        release!();
        return queued;
      });
    }),
  ).finally(() => release?.());
});
