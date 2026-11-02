/** A material move also carries its authored shots, keeping every clip and original duration intact. */
import {
  getHouseMaterials,
  getShotMaterial,
  type VideoEditProject,
} from '@/services/definition/video-edit';

/** Insert rather than swap: a long drag preserves the relative order of all intervening materials. */
export function reorderHouseMaterials(
  project: VideoEditProject,
  position: { from: number; to: number },
): Pick<VideoEditProject, 'house' | 'materials' | 'shots'> {
  const materials = getHouseMaterials(project);
  if (
    !Number.isInteger(position.from) ||
    !Number.isInteger(position.to) ||
    position.from < 0 ||
    position.to < 0 ||
    position.from >= materials.length ||
    position.to >= materials.length
  )
    throw new RangeError('素材排序位置无效。');
  const ordered = [...materials];
  const [moved] = ordered.splice(position.from, 1);
  ordered.splice(position.to, 0, moved);
  return {
    house: null,
    materials: ordered,
    shots: ordered.flatMap((source) =>
      project.shots
        .filter((shot) => getShotMaterial(materials, shot)?.id === source.id)
        .map((shot) => ({ ...shot, sourceId: source.id })),
    ),
  };
}
