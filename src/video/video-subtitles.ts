/** Map original-source timestamps through cuts and the silent cover without changing any audio. */
import { FPS } from '../services/definition/project';
import {
  HouseMediaKind,
  type VideoEditProject,
} from '../services/definition/video-edit';
import type { SpeechCaption } from '../services/definition/subtitles';
import type { getVideoEditTimeline } from './video-edit-timeline';

export interface SubtitleFrame extends SpeechCaption {
  from: number;
  to: number;
}
/** A caption clipped by a cut cannot leak into an adjacent clip, image or silent cover. */
export function getSubtitleFrames(
  project: VideoEditProject,
  timeline: ReturnType<typeof getVideoEditTimeline>,
): Array<SubtitleFrame> {
  if (!project.subtitlesEnabled) return [];
  const output: Array<SubtitleFrame> = [];
  const spans = [
    ...(project.opening
      ? [
          {
            prefix: 'opening',
            cues: project.opening.speechCaptions ?? [],
            startMs: 0,
            endMs: project.opening.duration * 1000,
            from: timeline.coverFrames,
            frames: timeline.openingFrames,
          },
        ]
      : []),
    ...timeline.shots.map(({ shot, source, start, frames }) => ({
      prefix: shot.id,
      cues:
        source?.kind === HouseMediaKind.Video
          ? (source.video.speechCaptions ?? [])
          : [],
      startMs: shot.start * 1000,
      endMs: shot.end * 1000,
      from: start,
      frames,
    })),
  ];
  const append = (
    cues: Array<SpeechCaption>,
    startMs: number,
    endMs: number,
    from: number,
    frames: number,
    prefix: string,
    index: number,
  ) => {
    cues.forEach((cue) => {
      const left = Math.max(cue.startMs, startMs);
      const right = Math.min(cue.endMs, endMs);
      // Muting original sound keeps subtitles useful; a picture crossfade hands text over at its midpoint.
      const begin = Math.max(
        from + (index > 0 ? Math.ceil(timeline.overlap / 2) : 0),
        from + Math.round(((left - startMs) * FPS) / 1000),
      );
      const finish = Math.min(
        from +
          frames -
          (index < spans.length - 1 ? Math.floor(timeline.overlap / 2) : 0),
        from + Math.round(((right - startMs) * FPS) / 1000),
      );
      if (right > left && finish > begin)
        output.push({
          ...cue,
          id: `${prefix}-${cue.id}`,
          from: begin,
          to: finish,
        });
    });
  };
  spans.forEach((span, index) =>
    append(
      span.cues,
      span.startMs,
      span.endMs,
      span.from,
      span.frames,
      span.prefix,
      index,
    ),
  );
  return output.sort((a, b) => a.from - b.from);
}
