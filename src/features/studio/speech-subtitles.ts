/** Speech recognition follows source identity, never the currently selected editor tab. */
import {
  getHouseMaterials,
  HouseMediaKind,
  type ImportedVideo,
  type VideoEditProject,
} from '@/services/definition/video-edit';
import type { SpeechCaption } from '@/services/definition/subtitles';

export function getSpeechVideos(project: VideoEditProject) {
  return [
    ...(project.opening
      ? [
          {
            key: 'opening',
            label: `人物开场 · ${project.opening.name}`,
            video: project.opening,
          },
        ]
      : []),
    ...getHouseMaterials(project).flatMap((source) =>
      source.kind === HouseMediaKind.Video
        ? [
            {
              key: `house:${source.id}`,
              label: `房屋视频 · ${source.video.name}`,
              video: source.video,
            },
          ]
        : [],
    ),
  ];
}

/** An empty array means silence or an explicit skip; it must not trigger recognition again. */
export function getPendingSpeechVideos(project: VideoEditProject) {
  return getSpeechVideos(project).filter(
    ({ video }) => video.hasAudio && video.speechCaptions === undefined,
  );
}

/** Late results cannot reinsert removed clips or overwrite manual edits. */
export function updateSpeechCaptions(
  project: VideoEditProject,
  options: {
    src: string;
    captions: Array<SpeechCaption>;
    onlyMissing: boolean;
    draftOnly?: boolean;
  },
): VideoEditProject {
  let changed = false;
  function update(video: ImportedVideo | null) {
    if (
      !video ||
      video.src !== options.src ||
      (options.onlyMissing && video.speechCaptions !== undefined)
    )
      return video;
    changed = true;
    if (options.draftOnly) return { ...video, speechDraft: options.captions };
    return {
      ...video,
      speechCaptions: options.captions,
      speechDraft: undefined,
    };
  }
  const opening = update(project.opening);
  const house = update(project.house);
  const materials = project.materials.map((source) => {
    if (source.kind !== HouseMediaKind.Video) return source;
    const video = update(source.video)!;
    return video === source.video ? source : { ...source, video };
  });
  return changed
    ? {
        ...project,
        opening,
        house,
        materials,
      }
    : project;
}
