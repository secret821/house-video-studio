/** Offline video-editing contracts are independent from cloud portrait and photo drafts. */
import { z } from 'zod';

import { savedCopyDraftSchema } from './copy-result';
import { propertyCandidateSchema } from './property-extraction';
import { speechCaptionsSchema, speechCaptionSchema } from './subtitles';

import {
  audioSchema,
  DEFAULT_WATERMARK,
  watermarkTextSchema,
  imagePathSchema,
  jobSchema,
  VideoPreparation,
  VIDEO_PENDING_POSTER,
  VideoTemplate,
  videoTemplateSchema,
  CoverStyle,
  coverStyleSchema,
} from './project';

export enum VideoRole {
  Opening = 'opening',
  House = 'house',
}
export enum CoverSource {
  Opening = 'opening',
  House = 'house',
  Image = 'image',
}
/** Template presentation defaults; shared footage, authored copy and timing remain project data. */
export const VIDEO_TEMPLATE_COVER_SOURCE_MAP = {
  [VideoTemplate.Classic]: CoverSource.House,
  [VideoTemplate.Editorial]: CoverSource.Opening,
} as const;
export const COVER_SOURCE_MAP = {
  [CoverSource.Opening]: '口播开场视频第一帧',
  [CoverSource.House]: '首份房屋素材（视频首帧 / 照片）',
  [CoverSource.Image]: '单独上传封面底图',
};
export const VIDEO_ROLE_MAP = {
  [VideoRole.Opening]: '真人口播开场',
  [VideoRole.House]: '房屋实拍视频',
};
export const importedVideoSchema = z
  .object({
    src: z
      .string()
      .regex(/^\/media\/(?:import-[a-f0-9]{64}|source-[a-f0-9-]{36})\.mp4$/),
    preparation: z.enum(VideoPreparation).optional(),
    poster: z.union([imagePathSchema, z.literal(VIDEO_PENDING_POSTER)]),
    name: z.string().max(160),
    duration: z.number().min(0.5).max(600),
    width: z.number().int().positive().max(4096),
    height: z.number().int().positive().max(4096),
    hasAudio: z.boolean(),
    speechCaptions: speechCaptionsSchema.optional(),
    // Staged edits are saved independently and never rendered until explicit adoption.
    speechDraft: z
      .array(
        z.object({ ...speechCaptionSchema.shape, text: z.string().max(28) }),
      )
      .max(600)
      .optional(),
  })
  .superRefine((video, context) => {
    if (
      video.speechCaptions?.some(
        (cue) => cue.endMs > Math.ceil(video.duration * 1000),
      )
    )
      context.addIssue({
        code: 'custom',
        path: ['speechCaptions'],
        message: '字幕时间不能超出原片时长。',
      });
  });
export enum HouseMediaKind {
  Video = 'video',
  Image = 'image',
}
export const houseMaterialSchema = z.discriminatedUnion('kind', [
  z.object({
    id: z.string().min(1).max(80),
    kind: z.literal(HouseMediaKind.Video),
    video: importedVideoSchema,
  }),
  z.object({
    id: z.string().min(1).max(80),
    kind: z.literal(HouseMediaKind.Image),
    src: imagePathSchema,
    name: z.string().max(160),
    duration: z.number().min(2).max(30),
  }),
]);
export type HouseMaterial = z.infer<typeof houseMaterialSchema>;

/** Legacy one-video drafts remain playable while new projects own an ordered mixed-media collection. */
export function getHouseMaterials(project: {
  house: ImportedVideo | null;
  materials: Array<HouseMaterial>;
}): Array<HouseMaterial> {
  if (project.materials.length) return project.materials;
  return project.house
    ? [{ id: 'legacy-house', kind: HouseMediaKind.Video, video: project.house }]
    : [];
}

/** Shot references are resolved consistently for validation, preview, cloud keyframes and export. */
export function getShotMaterial(
  sources: Array<HouseMaterial>,
  shot: { sourceId?: string },
): HouseMaterial | undefined {
  return shot.sourceId
    ? sources.find((source) => source.id === shot.sourceId)
    : sources[0];
}
export const videoShotSchema = z
  .object({
    id: z.string().min(1).max(80),
    sourceId: z.string().min(1).max(80).optional(),
    start: z.number().min(0).max(600),
    end: z.number().min(0).max(600),
    title: z.string().max(24),
    text: z.string().max(100),
  })
  .refine((shot) => shot.end - shot.start >= 2, '每个房屋片段至少保留2秒。');
export const videoEditTextFields = {
  name: z.string().min(1).max(32),
  facts: z.string().max(60),
  price: z.string().max(20),
  extra: z.string().max(40),
};
const videoEditFieldsSchema = z.object({
  sourceText: z.string().max(12000).optional(),
  propertyFields: z
    .array(propertyCandidateSchema)
    .max(10)
    .nullable()
    .optional(),
  copyBrief: z.string().max(2000).optional(),
  copyDraft: savedCopyDraftSchema.nullable().optional(),
  sessionId: z.string().uuid().optional(),
  videoTemplate: videoTemplateSchema,
  coverStyle: coverStyleSchema,
  opening: importedVideoSchema.nullable(),
  house: importedVideoSchema.nullable(),
  materials: z.array(houseMaterialSchema).max(12).default([]),
  ...videoEditTextFields,
  contact: z.string().max(50),
  shots: z.array(videoShotSchema).max(12),
  music: audioSchema.nullable(),
  musicVolume: z.number().min(0).max(0.6),
  watermark: watermarkTextSchema,
  openingVolume: z.number().min(0).max(1.5),
  houseVolume: z.number().min(0).max(1),
  subtitlesEnabled: z.boolean().optional(),
  transitionSeconds: z.number().min(0).max(0.8),
  coverSource: z.enum(CoverSource).optional(),
  coverImage: imagePathSchema.nullable().default(null),
  coverSeconds: z
    .number()
    .min(0.5, '封面展示时长至少0.5秒。')
    .max(10, '封面展示时长最多10秒。')
    .default(1.2),
});
/** Drafts retain unfinished text while export keeps the stricter validation below. */
function applyVideoDefaults(project: z.infer<typeof videoEditFieldsSchema>) {
  return {
    ...project,
    coverSource:
      project.coverSource ??
      VIDEO_TEMPLATE_COVER_SOURCE_MAP[project.videoTemplate],
  };
}
export const videoEditDraftSchema = videoEditFieldsSchema
  .extend({ name: z.string().max(32) })
  .transform(applyVideoDefaults);
export const videoEditSchema = videoEditFieldsSchema
  .transform(applyVideoDefaults)
  .superRefine((project, context) => {
    const clips = [
      project.opening,
      ...getHouseMaterials(project).flatMap((source) =>
        source.kind === HouseMediaKind.Video ? [source.video] : [],
      ),
    ];
    if (
      clips.reduce(
        (count, clip) => count + (clip?.speechCaptions?.length ?? 0),
        0,
      ) > 6000
    )
      context.addIssue({
        code: 'custom',
        message: '全片字幕最多6000条，请拆分项目。',
      });
    if (project.coverSource === CoverSource.Image && !project.coverImage)
      context.addIssue({
        code: 'custom',
        path: ['coverImage'],
        message: '请上传封面底图，或选择视频第一帧。',
      });
    if (
      new Set(project.shots.map((shot) => shot.id)).size !==
      project.shots.length
    )
      context.addIssue({ code: 'custom', message: '片段编号不能重复。' });
    const sources = getHouseMaterials(project);
    if (new Set(sources.map((source) => source.id)).size !== sources.length)
      context.addIssue({ code: 'custom', message: '房屋素材编号不能重复。' });
    project.shots.forEach((shot) => {
      const source = getShotMaterial(sources, shot);
      const duration =
        source?.kind === HouseMediaKind.Video
          ? source.video.duration
          : source?.duration;
      if (duration === undefined || shot.end > duration + 0.001)
        context.addIssue({
          code: 'custom',
          message: '片段需要对应有效房屋素材，结束时间不能超出素材时长。',
        });
    });
  });
export const videoEditJobSchema = jobSchema.extend({
  cover: z.string().nullable(),
  reused: z.boolean(),
});
export type ImportedVideo = z.infer<typeof importedVideoSchema>;
export type VideoShot = z.infer<typeof videoShotSchema>;
export type VideoEditProject = z.infer<typeof videoEditSchema>;
export type VideoEditJob = z.infer<typeof videoEditJobSchema>;
export const EMPTY_VIDEO_EDIT: VideoEditProject = {
  videoTemplate: VideoTemplate.Classic,
  coverStyle: CoverStyle.New,
  opening: null,
  house: null,
  materials: [],
  name: '新房源视频',
  facts: '',
  price: '',
  extra: '',
  contact: '',
  shots: [],
  music: null,
  musicVolume: 0.4,
  watermark: DEFAULT_WATERMARK,
  openingVolume: 1,
  houseVolume: 1,
  transitionSeconds: 0.35,
  coverSource: VIDEO_TEMPLATE_COVER_SOURCE_MAP[VideoTemplate.Classic],
  coverImage: null,
  coverSeconds: 1.2,
};
