import assert from 'node:assert/strict';
import test from 'node:test';

import { cn } from '../../src/share/cn';

test('project font sizes and text colors merge independently', () => {
  assert.equal(
    cn('text-heading-3 text-content', 'text-caption'),
    'text-content text-caption',
  );
  assert.equal(
    cn('text-caption text-content', 'text-danger'),
    'text-caption text-danger',
  );
  assert.equal(cn('leading-body', 'leading-highlight'), 'leading-highlight');
  assert.equal(cn('px-2', { 'px-4': true, hidden: false }), 'px-4');
});
