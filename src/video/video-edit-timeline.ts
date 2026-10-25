/** Shared frame accounting for free-video preview, rendering, music and tests. */
import { FPS } from '../services/definition/project';
import {
  type VideoEditProject,
  type VideoShot,
} from '../services/definition/video-edit';

/** A short cover precedes both complete source clips; silent tours may still overlap their footage. */
export function getVideoEditTimeline(project: VideoEditProject) {
  const coverFrames =
    project.opening && project.house && project.shots.length
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
    project.house?.hasAudio && project.houseVolume > 0 ? 0 : transitionFrames;
  let cursor = coverFrames + openingFrames;
  const shots = project.shots.map((shot, index) => {
    if (index > 0 || openingFrames) cursor -= overlap;
    const start = cursor;
    cursor += shotFrames[index];
    return { shot, start, frames: shotFrames[index] };
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

/** Neutral editable chapters are starting points, not an AI claim to recognize rooms. */
export function createVideoShots(duration: number): Array<VideoShot> {
  const count = Math.min(4, Math.floor(duration / 2));
  const totalFrames = Math.round(duration * FPS);
  return Array.from({ length: count }, (_, index) => ({
    id: crypto.randomUUID(),
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
