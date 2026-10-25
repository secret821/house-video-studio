/** Offline video-editing contracts are independent from cloud portrait and photo drafts. */
import { z } from 'zod';

import { audioSchema, imagePathSchema, jobSchema } from './project';

export enum VideoRole {
  Opening = 'opening',
  House = 'house',
}
export enum CoverSource {
  Opening = 'opening',
  House = 'house',
  Image = 'image',
}
export const COVER_SOURCE_MAP = {
  [CoverSource.Opening]: '口播开场视频第一帧',
  [CoverSource.House]: '房屋实拍视频第一帧',
  [CoverSource.Image]: '单独上传封面底图',
};
export const VIDEO_ROLE_MAP = {
  [VideoRole.Opening]: '真人口播开场',
  [VideoRole.House]: '房屋实拍视频',
};
export const importedVideoSchema = z.object({
  src: z.string().regex(/^\/media\/import-[a-f0-9]{64}\.mp4$/),
  poster: imagePathSchema,
  name: z.string().max(160),
  duration: z.number().min(0.5).max(600),
  width: z.number().int().positive().max(4096),
  height: z.number().int().positive().max(4096),
  hasAudio: z.boolean(),
});
export const videoShotSchema = z
  .object({
    id: z.string().min(1).max(80),
    start: z.number().min(0).max(600),
    end: z.number().min(0).max(600),
    title: z.string().max(24),
    text: z.string().max(100),
  })
  .refine((shot) => shot.end - shot.start >= 2, '每个房屋片段至少保留2秒。');
export const videoEditSchema = z
  .object({
    sessionId: z.string().uuid().optional(),
    opening: importedVideoSchema.nullable(),
    house: importedVideoSchema.nullable(),
    name: z.string().min(1).max(32),
    facts: z.string().max(60),
    price: z.string().max(20),
    extra: z.string().max(40),
    contact: z.string().max(50),
    shots: z.array(videoShotSchema).max(12),
    music: audioSchema.nullable(),
    musicVolume: z.number().min(0).max(0.6),
    openingVolume: z.number().min(0).max(1.5),
    houseVolume: z.number().min(0).max(1),
    transitionSeconds: z.number().min(0).max(0.8),
    coverSource: z.enum(CoverSource).default(CoverSource.Opening),
    coverImage: imagePathSchema.nullable().default(null),
    coverSeconds: z
      .number()
      .min(0.5, '封面展示时长至少0.5秒。')
      .max(10, '封面展示时长最多10秒。')
      .default(1.2),
  })
  .superRefine((project, context) => {
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
    project.shots.forEach((shot) => {
      if (!project.house || shot.end > project.house.duration + 0.001)
        context.addIssue({
          code: 'custom',
          message: '片段结束时间不能超出房屋原视频。',
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
  opening: null,
  house: null,
  name: '安福 · 浅水湾',
  facts: '3楼 / 128.65㎡ / 精装修',
  price: '59万',
  extra: '另带柴草间',
  contact: '私信咨询 · 预约实地看房',
  shots: [],
  music: null,
  musicVolume: 0.08,
  openingVolume: 1,
  houseVolume: 1,
  transitionSeconds: 0.35,
  coverSource: CoverSource.Opening,
  coverImage: null,
  coverSeconds: 1.2,
};
