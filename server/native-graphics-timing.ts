/** Exact 30fps image holds, shared by concat construction and frame-boundary tests. */
import { FPS } from '../src/services/definition/project';
export function getGraphicRuns(options: {
  frames: Array<number>;
  start: number;
  length: number;
}) {
  const end = options.start + options.length;
  const initial = options.frames
    .filter((frame) => frame <= options.start)
    .at(-1);
  if (initial === undefined) throw new Error('Missing initial graphics frame');
  const changes = [
    initial,
    ...options.frames.filter((frame) => frame > options.start && frame < end),
  ];
  return changes.map((frame, index) => ({
    frame,
    length: (changes[index + 1] ?? end) - Math.max(options.start, frame),
  }));
}

/** This manifest names only generated workspace graphics, never uploaded filenames or arbitrary URLs. */
export function createGraphicConcat(
  options: Parameters<typeof getGraphicRuns>[0],
) {
  const runs = getGraphicRuns(options);
  return [
    'ffconcat version 1.0',
    ...runs.flatMap((run) => [
      `file 'g-${run.frame}.png'`,
      `option framerate ${FPS}`,
      `duration ${run.length / FPS}`,
    ]),
    `file 'g-${runs.at(-1)!.frame}.png'`,
    `option framerate ${FPS}`,
  ].join('\n');
}
