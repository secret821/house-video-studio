/** Conservative temporal grouping and checked donor selection are independent of the inference runtime. */
import { FPS } from '../src/services/definition/project';
import {
  CleanReason,
  type CleanRange,
  type CleanSample,
} from '../src/services/definition/smart-clean';
const SAMPLE_SECONDS = 0.25;
const PERSON_PADDING = 0.85;
const DARK_PADDING = 0.75;
const DARK_MIN_SECONDS = 0.75;
export interface CleanWindow {
  src: string;
  start: number;
  end: number;
}
export interface CleanSegment {
  src: string;
  sourceStart: number;
  sourceFrames: number;
  frames: number;
  replaced: boolean;
}

/** Extend human detections across sampling gaps; require sustained darkness instead of deleting brief exposure changes. */
export function getProblemRanges(
  samples: Array<CleanSample>,
  duration: number,
): Array<CleanRange> {
  const ranges: Array<CleanRange> = [];
  samples.forEach((sample) => {
    if (sample.person)
      ranges.push({
        start: Math.max(0, sample.time - PERSON_PADDING),
        end: Math.min(duration, sample.time + SAMPLE_SECONDS + PERSON_PADDING),
        reasons: [CleanReason.Person],
      });
  });
  let start: number | null = null;
  for (let index = 0; index <= samples.length; index++) {
    const sample = samples[index];
    if (sample?.dark && start === null) start = sample.time;
    if ((!sample?.dark || index === samples.length) && start !== null) {
      const end = Math.min(duration, sample?.time ?? duration);
      if (end - start >= DARK_MIN_SECONDS)
        ranges.push({
          start: Math.max(0, start - DARK_PADDING),
          end: Math.min(duration, end + DARK_PADDING),
          reasons: [CleanReason.Dark],
        });
      start = null;
    }
  }
  return ranges
    .sort((a, b) => a.start - b.start)
    .reduce<Array<CleanRange>>((merged, range) => {
      const last = merged.at(-1);
      if (last && range.start <= last.end + SAMPLE_SECONDS) {
        last.end = Math.max(last.end, range.end);
        last.reasons = [...new Set([...last.reasons, ...range.reasons])];
      } else merged.push({ ...range });
      return merged;
    }, []);
}

/** Donors contain only frames outside buffered problem intervals. */
export function getCleanWindows(
  src: string,
  duration: number,
  ranges: Array<CleanRange>,
): Array<CleanWindow> {
  const windows: Array<CleanWindow> = [];
  let cursor = 0;
  [...ranges, { start: duration, end: duration, reasons: [] }].forEach(
    (range) => {
      const start = Math.ceil(cursor * FPS) / FPS,
        end = Math.floor(range.start * FPS) / FPS;
      if (end - start >= 0.5) windows.push({ src, start, end });
      cursor = Math.max(cursor, range.end);
    },
  );
  return windows;
}

/** Preserve total frame count. A short checked donor can repeat its checked window, never read into a rejected interval. */
export function planCleanSegments(input: {
  src: string;
  duration: number;
  ranges: Array<CleanRange>;
  donors: Array<CleanWindow>;
}): Array<CleanSegment> {
  const total = Math.round(input.duration * FPS),
    plan: Array<CleanSegment> = [];
  let cursor = 0;
  input.ranges.forEach((range) => {
    const from = Math.max(cursor, Math.floor(range.start * FPS)),
      to = Math.min(total, Math.ceil(range.end * FPS));
    if (from > cursor)
      plan.push({
        src: input.src,
        sourceStart: cursor,
        sourceFrames: from - cursor,
        frames: from - cursor,
        replaced: false,
      });
    if (to <= from) return;
    const donor = [...input.donors].sort((a, b) => {
      const local = Number(b.src === input.src) - Number(a.src === input.src);
      if (local) return local;
      const enough =
        Number(b.end - b.start >= (to - from) / FPS) -
        Number(a.end - a.start >= (to - from) / FPS);
      return (
        enough ||
        Math.abs(a.start - from / FPS) - Math.abs(b.start - from / FPS)
      );
    })[0];
    if (!donor)
      throw new Error(
        '没有检测合格的补画面，请添加一段无人且明亮的房屋视频后重试；原素材保留。',
      );
    plan.push({
      src: donor.src,
      sourceStart: Math.ceil(donor.start * FPS),
      sourceFrames: Math.min(
        to - from,
        Math.floor(donor.end * FPS) - Math.ceil(donor.start * FPS),
      ),
      frames: to - from,
      replaced: true,
    });
    cursor = to;
  });
  if (cursor < total)
    plan.push({
      src: input.src,
      sourceStart: cursor,
      sourceFrames: total - cursor,
      frames: total - cursor,
      replaced: false,
    });
  return plan;
}
