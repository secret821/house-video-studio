/** Behaviour tests prove temporal grouping, checked donor boundaries and unchanged output duration. */
import assert from 'node:assert/strict';
import test from 'node:test';
import {
  CleanReason,
  type CleanSample,
} from '../src/services/definition/smart-clean';
import {
  getProblemRanges,
  getCleanWindows,
  planCleanSegments,
} from './smart-clean-ranges';

/** Quarter-second evidence stands in for a deterministic detector result, independent of model accuracy. */
function samples(
  darkTimes: Array<number>,
  personTimes: Array<number> = [],
): Array<CleanSample> {
  return Array.from({ length: 48 }, (_, i) => ({
    time: i / 4,
    dark: darkTimes.includes(i / 4),
    person: personTimes.includes(i / 4),
    mean: 100,
    confidence: 0.9,
  }));
}

test('brief dark flashes remain; sustained dark sections and isolated person samples receive bounded intervals', () => {
  assert.deepEqual(getProblemRanges(samples([1, 1.25]), 6), []);
  const ranges = getProblemRanges(samples([5, 5.25, 5.5], [0, 11.75]), 12);
  assert.equal(ranges.length, 3);
  assert.equal(ranges[0].start, 0);
  assert.equal(ranges.at(-1)!.end, 12);
  assert.deepEqual(ranges[1].reasons, [CleanReason.Dark]);
});

test('overlapping dark/person intervals merge with both reasons and no outside duration', () => {
  const ranges = getProblemRanges(samples([2, 2.25, 2.5], [2.25]), 6);
  assert.equal(ranges.length, 1);
  assert.deepEqual(
    new Set(ranges[0].reasons),
    new Set([CleanReason.Person, CleanReason.Dark]),
  );
});

test('replacement pictures never read into a rejected interval, and original frame count is preserved', () => {
  const ranges = [{ start: 2, end: 4, reasons: [CleanReason.Person] }];
  const donors = getCleanWindows('original', 6, ranges);
  const plan = planCleanSegments({
    src: 'original',
    duration: 6,
    ranges,
    donors,
  });
  assert.equal(
    plan.reduce((sum, part) => sum + part.frames, 0),
    180,
  );
  for (const part of plan.filter((part) => part.replaced)) {
    assert.ok(
      part.sourceStart + part.sourceFrames <= 60 || part.sourceStart >= 120,
    );
  }
  assert.throws(
    () =>
      planCleanSegments({
        src: 'original',
        duration: 6,
        ranges: [{ start: 0, end: 6, reasons: [CleanReason.Dark] }],
        donors: [],
      }),
    /补画面/,
  );
});

test('a shorter checked donor repeats instead of leaking following rejected frames; local footage is preferred', () => {
  const plan = planCleanSegments({
    src: 'original',
    duration: 8,
    ranges: [{ start: 2, end: 8, reasons: [CleanReason.Dark] }],
    donors: [
      { src: 'other', start: 0, end: 12 },
      { src: 'original', start: 0, end: 2 },
    ],
  });
  assert.equal(plan[1].src, 'original');
  assert.equal(plan[1].sourceFrames, 60);
  assert.equal(plan[1].frames, 180);
});
