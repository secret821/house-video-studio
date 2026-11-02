/** Shared frame accounting for free-video preview, rendering, music and tests. */
import { FPS } from '../services/definition/project';
import { createMediaId } from '../services/definition/media-id';
import { getSubtitleFrames } from './video-subtitles';
import {
  HouseMediaKind,
  getHouseMaterials,
  getShotMaterial,
  type VideoEditProject,
  type VideoShot,
  type HouseMaterial,
} from '../services/definition/video-edit';

/** Shared motion windows keep sparse graphics and the interactive preview on identical frames. */
export const VIDEO_EDIT_TIMING = {
  captionFadeSeconds: 0.5,
  captionEnterSeconds: 0.6,
  captionExitLeadSeconds: 3.6,
  closingSeconds: 3.2,
  closingFadeSeconds: 0.5,
};

/** A short cover precedes both complete source clips; silent tours may still overlap their footage. */
export function getVideoEditTimeline(project: VideoEditProject) {
  const sources = getHouseMaterials(project);
  const coverFrames =
    project.opening && sources.length && project.shots.length
      ? Math.round(project.coverSeconds * FPS)
      : 0;
  const openingFrames = project.opening
    ? Math.round(project.opening.duration * FPS)
    : 0;
  const shotFrames = project.shots.map((shot) =>
    Math.round((shot.end - shot.start) * FPS),
  );
  const lengths = [...(openingFrames ? [openingFrames] : []), ...shotFrames];
  const transitionFrames =
    lengths.length > 1
      ? Math.min(
          Math.round(project.transitionSeconds * FPS),
          Math.floor(Math.min(...lengths) / 3),
        )
      : 0;
  const overlap =
    sources.some(
      (source) => source.kind === HouseMediaKind.Video && source.video.hasAudio,
    ) && project.houseVolume > 0
      ? 0
      : transitionFrames;
  let cursor = coverFrames + openingFrames;
  const shots = project.shots.map((shot, index) => {
    if (index > 0 || openingFrames) cursor -= overlap;
    const start = cursor;
    cursor += shotFrames[index];
    return {
      shot,
      source: getShotMaterial(sources, shot),
      start,
      frames: shotFrames[index],
    };
  });
  return {
    coverFrames,
    openingFrames,
    transitionFrames,
    overlap,
    shots,
    houseStart: shots[0]?.start ?? coverFrames + openingFrames,
    frames: Math.max(1, cursor),
  };
}

/** Each newly added file starts as one editable chapter; image chapters default to five seconds. */
export function createMaterialShots(
  sources: Array<HouseMaterial>,
): Array<VideoShot> {
  return sources.map((source) => ({
    id: createMediaId(),
    sourceId: source.id,
    start: 0,
    end:
      source.kind === HouseMediaKind.Video
        ? source.video.duration
        : Math.min(5, source.duration),
    title: source.kind === HouseMediaKind.Video ? '房屋实拍' : '房源照片',
    text: '',
  }));
}

/** Neutral editable chapters are starting points, not an AI claim to recognize rooms. */
export function createVideoShots(duration: number): Array<VideoShot> {
  const count = Math.min(4, Math.floor(duration / 2));
  const totalFrames = Math.round(duration * FPS);
  return Array.from({ length: count }, (_, index) => ({
    id: createMediaId(),
    start: Math.round((totalFrames * index) / count) / FPS,
    end:
      index === count - 1
        ? duration
        : Math.round((totalFrames * (index + 1)) / count) / FPS,
    title: ['房源实景', '空间布局', '居住细节', '预约看房'][index],
    text: [
      '跟着镜头，看看家的模样。',
      '客餐与房间，实拍呈现。',
      '装修与房况，以现场实物为准。',
      '想了解这套房，欢迎私信咨询。',
    ][index],
  }));
}

/** A quiet music bed spans both original voice tracks, with fades only at the film edges. */
export function getVideoMusicVolume(
  frame: number,
  project: VideoEditProject,
): number {
  const timeline = getVideoEditTimeline(project);
  return (
    project.musicVolume *
    Math.max(
      0,
      Math.min(
        1,
        frame / (FPS * 1.2),
        (timeline.frames - 1 - frame) / (FPS * 2),
      ),
    )
  );
}

/** Render every animated graphics frame and hold the unchanged image between those windows. */
export function getVideoGraphicFrames(
  project: VideoEditProject,
): Array<number> {
  const timeline = getVideoEditTimeline(project);
  if (!project.opening || !timeline.shots.length) return [];
  const frames = new Set<number>();
  const add = (frame: number) => {
    if (frame >= timeline.coverFrames && frame < timeline.frames)
      frames.add(frame);
  };
  const range = (start: number, end: number) => {
    for (
      let frame = Math.max(timeline.coverFrames, Math.floor(start));
      frame <= Math.ceil(end) && frame < timeline.frames;
      frame += 1
    )
      add(frame);
  };
  add(timeline.coverFrames);
  getSubtitleFrames(project, timeline).forEach((cue) => {
    add(cue.from);
    add(cue.to);
  });
  timeline.shots.forEach((shot, index) => {
    range(shot.start, shot.start + VIDEO_EDIT_TIMING.captionEnterSeconds * FPS);
    if (index === timeline.shots.length - 1)
      range(
        Math.max(
          shot.start,
          shot.start +
            shot.frames -
            VIDEO_EDIT_TIMING.captionExitLeadSeconds * FPS,
        ),
        shot.start + shot.frames - VIDEO_EDIT_TIMING.closingSeconds * FPS,
      );
    if (timeline.overlap === 0 && timeline.transitionFrames >= 3) {
      const start = shot.start - Math.floor(timeline.transitionFrames / 2);
      range(start, start + timeline.transitionFrames);
    }
  });
  const closing = Math.max(
    timeline.houseStart,
    timeline.frames - VIDEO_EDIT_TIMING.closingSeconds * FPS,
  );
  range(closing, closing + VIDEO_EDIT_TIMING.closingFadeSeconds * FPS);
  return [...frames].sort((left, right) => left - right);
}

/** Native composition is safe only when complete spoken clips follow each other without picture overlap. */
export function getNativeVideoSegments(project: VideoEditProject) {
  const timeline = getVideoEditTimeline(project);
  if (
    !project.opening ||
    !timeline.shots.length ||
    timeline.overlap !== 0 ||
    getHouseMaterials(project).some(
      (source) => source.kind !== HouseMediaKind.Video,
    )
  )
    return null;
  const segments = [
    {
      clip: project.opening,
      start: timeline.coverFrames,
      sourceStart: 0,
      frames: timeline.openingFrames,
      volume: project.openingVolume,
    },
  ];
  for (const shot of timeline.shots) {
    if (shot.source?.kind !== HouseMediaKind.Video) return null;
    segments.push({
      clip: shot.source.video,
      start: shot.start,
      sourceStart: Math.round(shot.shot.start * FPS),
      frames: shot.frames,
      volume: project.houseVolume,
    });
  }
  return segments;
}
