/** One timeline calculation is shared by preview, export and tests. */
import {
  FPS,
  Transition,
  type Project,
  type Scene,
} from '../services/definition/project';

/** Leave silence around speech to prevent narration overlap across a crossfade. */
export function getSceneFrames(scene: Scene): number {
  return Math.ceil(
    Math.max(
      scene.seconds,
      scene.voiceover ? scene.voiceover.duration + 1.2 : 0,
    ) * FPS,
  );
}

/** Crossfades shorten the timeline by their overlap, unlike hard cuts. */
export function getTimeline(project: Project) {
  const overlap =
    project.transition === Transition.Fade
      ? Math.round(project.transitionSeconds * FPS)
      : 0;
  const openingFrames = project.opening?.clip
    ? Math.ceil(project.opening.clip.duration * FPS)
    : 0;
  let cursor = openingFrames;
  const scenes = project.scenes.map((scene, index) => {
    const frames = getSceneFrames(scene);
    const start = cursor;
    cursor += frames - (index < project.scenes.length - 1 ? overlap : 0);
    return { scene, frames, start };
  });
  return { scenes, overlap, openingFrames, frames: Math.max(1, cursor) };
}

/** Sentence-based captions are estimates, not forced word alignment. */
export function getCaptionLines(text: string): Array<string> {
  return (text.match(/[^。！？；，,!?;]+[。！？；，,!?;]?/gu) ?? []).flatMap(
    (sentence) => sentence.match(/.{1,24}/gu) ?? [],
  );
}
