/** Replace only video references so authored cuts, subtitles, text and material order survive cleaning and undo. */
import {
  HouseMediaKind,
  getHouseMaterials,
  type VideoEditProject,
} from '@/services/definition/video-edit';
import type { CleanJob } from '@/services/definition/smart-clean';
type Results = CleanJob['results'];
/** The original asset metadata forms an inverse operation, not a second copy of the entire editable project. */
export function applyCleanAssets(project: VideoEditProject, results: Results) {
  const clips = getHouseMaterials(project).flatMap((source) =>
    source.kind === HouseMediaKind.Video ? [source.video] : [],
  );
  if (
    results.some(
      (result) => !clips.some((clip) => clip.src === result.originalSrc),
    )
  )
    throw new Error('房屋素材已变化，未应用清理结果，请重新分析。');
  const undo: Results = [];
  const replace = (clip: NonNullable<VideoEditProject['house']>) => {
    const result = results.find((item) => item.originalSrc === clip.src);
    if (!result) return clip;
    undo.push({
      originalSrc: result.asset.src,
      asset: clip,
      ranges: result.ranges,
    });
    return {
      ...clip,
      ...result.asset,
      name: clip.name,
      speechCaptions: clip.speechCaptions,
    };
  };
  return {
    patch: {
      house: project.house ? replace(project.house) : null,
      materials: project.materials.map((source) =>
        source.kind === HouseMediaKind.Video
          ? { ...source, video: replace(source.video) }
          : source,
      ),
    },
    undo,
  };
}
