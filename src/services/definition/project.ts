/** Shared contract validates browser drafts and all rendering input. */
import { z } from 'zod';
import { musicCreditSchema } from './music-library';

export enum Motion {
  Push = 'push',
  Pull = 'pull',
  Left = 'left',
  Right = 'right',
  Still = 'still',
}
export enum Aspect {
  Portrait = 'portrait',
  Landscape = 'landscape',
}
export enum Transition {
  Fade = 'fade',
  Cut = 'cut',
}
export enum JobStatus {
  Rendering = 'rendering',
  Complete = 'complete',
  Failed = 'failed',
}
export const MOTION_MAP = {
  [Motion.Push]: '缓慢推近',
  [Motion.Pull]: '缓慢拉远',
  [Motion.Left]: '向左平移',
  [Motion.Right]: '向右平移',
  [Motion.Still]: '保持静止',
};
export const ASPECT_MAP = {
  [Aspect.Portrait]: '竖屏 9:16',
  [Aspect.Landscape]: '横屏 16:9',
};
export const DIMENSIONS = {
  [Aspect.Portrait]: { width: 1080, height: 1920 },
  [Aspect.Landscape]: { width: 1920, height: 1080 },
};
export const FPS = 30;
export const DEFAULT_WATERMARK = '青连实拍';
export const watermarkTextSchema = z
  .string()
  .trim()
  .max(20, '水印最多20个字。')
  .regex(/^[^\r\n]*$/, '水印请使用单行文字。')
  .default(DEFAULT_WATERMARK);
/** New uploads retain their original bytes; old drafts without this flag are already prepared. */
export enum VideoPreparation {
  Original = 'original',
  Ready = 'ready',
}
export const VIDEO_PENDING_POSTER = '/demo/video-pending.svg';
export const mediaPathSchema = z
  .string()
  .regex(
    /^\/(media|demo)\/[a-zA-Z0-9_-]+\.(jpg|jpeg|png|webp|wav|mp3|m4a|ogg|mp4)$/,
  )
  .or(z.literal(VIDEO_PENDING_POSTER));
export const audioSchema = z.object({
  src: z.string().regex(/^\/(media|demo)\/[a-zA-Z0-9_-]+\.(wav|mp3|m4a|ogg)$/),
  duration: z.number().positive().max(600),
  name: z.string().max(160),
  text: z.string().max(300).nullable(),
  musicCredit: musicCreditSchema.optional(),
});
export const sceneSchema = z.object({
  id: z.string().min(1).max(80),
  src: z
    .string()
    .regex(/^\/(media|demo)\/[a-zA-Z0-9_-]+\.(jpg|jpeg|png|webp)$/),
  title: z.string().max(32),
  narration: z.string().max(300),
  caption: z.string().max(300).optional(),
  seconds: z.number().min(3).max(30),
  motion: z.enum(Motion),
  voiceover: audioSchema.nullable(),
});
export const imagePathSchema = z
  .string()
  .regex(/^\/(media|demo)\/[a-zA-Z0-9_-]+\.(jpg|jpeg|png|webp)$/);
export const videoAssetSchema = z.object({
  preparation: z.enum(VideoPreparation).optional(),
  src: z.string().regex(/^\/media\/[a-zA-Z0-9_-]+\.mp4$/),
  duration: z.number().positive().max(60),
  width: z.number().int().positive().max(4096),
  height: z.number().int().positive().max(4096),
});
export const OPENING_SCRIPT =
  '大家好，今天我带大家实地看一套房，看看它的户型、采光和周边环境，跟我一起出发吧。';
export const openingInputSchema = z.object({
  photo: imagePathSchema,
  script: z
    .string()
    .min(1)
    .max(150)
    .refine((text) => text.trim().length > 0, '请输入开场台词。'),
  voiceover: audioSchema.nullable(),
});
/** Missing source denotes a legacy generated opening; uploads never get synthetic captions or an AI badge. */
export enum OpeningSource {
  Upload = 'upload',
  Generated = 'generated',
}
export const openingSchema = z.object({
  source: z.enum(OpeningSource).optional(),
  photo: imagePathSchema.nullable(),
  script: z.string().max(150),
  voiceover: audioSchema.nullable(),
  clip: videoAssetSchema.nullable(),
});
export const openingJobSchema = z.object({
  id: z.string(),
  status: z.enum(JobStatus),
  progress: z.number().min(0).max(1).nullable(),
  message: z.string(),
  input: openingInputSchema,
  clip: videoAssetSchema.nullable(),
});
export type OpeningInput = z.infer<typeof openingInputSchema>;
export type Opening = z.infer<typeof openingSchema>;
export type OpeningJob = z.infer<typeof openingJobSchema>;
export type VideoAsset = z.infer<typeof videoAssetSchema>;
export const projectSchema = z.object({
  sessionId: z.string().uuid().optional(),
  name: z.string().min(1).max(60),
  location: z.string().max(80),
  area: z.string().max(30),
  layout: z.string().max(30),
  price: z.string().max(30),
  contact: z.string().max(80),
  aspect: z.enum(Aspect),
  transition: z.enum(Transition),
  transitionSeconds: z.number().min(0.3).max(0.8),
  showCaptions: z.boolean(),
  watermark: watermarkTextSchema,
  demo: z.boolean(),
  scenes: z.array(sceneSchema).max(20),
  opening: openingSchema.nullable().default(null),
  music: audioSchema.nullable(),
  musicVolume: z.number().min(0).max(0.5),
});
export const jobSchema = z.object({
  sessionId: z.string().uuid().optional(),
  id: z.string(),
  status: z.enum(JobStatus),
  progress: z.number().min(0).max(1),
  message: z.string(),
  output: z.string().nullable(),
  cache: z
    .object({
      rendered: z.number().int().nonnegative(),
      reused: z.number().int().nonnegative(),
      total: z.number().int().positive(),
    })
    .optional(),
});
export type Scene = z.infer<typeof sceneSchema>;
export type Project = z.infer<typeof projectSchema>;
export type AudioAsset = z.infer<typeof audioSchema>;
export type RenderJob = z.infer<typeof jobSchema>;
export const EMPTY_PROJECT: Project = {
  name: '我的房源',
  location: '',
  area: '',
  layout: '',
  price: '',
  contact: '',
  aspect: Aspect.Portrait,
  transition: Transition.Fade,
  transitionSeconds: 0.5,
  showCaptions: true,
  watermark: DEFAULT_WATERMARK,
  demo: false,
  scenes: [],
  opening: null,
  music: null,
  musicVolume: 0.2,
};
