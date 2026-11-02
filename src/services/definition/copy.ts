/** Copy requests contain only property facts and selected house media, never presenter videos or credentials. */
import { z } from 'zod';

import { imagePathSchema, projectSchema } from './project';
import {
  importedVideoSchema,
  houseMaterialSchema,
  videoEditSchema,
  videoShotSchema,
} from './video-edit';

export const COPY_MODEL = 'qwen3.7-flash';
/** These labels need supplied property facts; seeing a surface or parked car is insufficient. */
export const COPY_RESTRICTED_CLAIMS = [
  '精装修',
  '精装',
  '全新装修',
  '毛坯',
  '未装修',
  '未进行任何装修',
  '拎包入住',
  '南北通透',
  '坐北朝南',
  '朝南',
  '学区房',
  '产权清晰',
  '满五唯一',
  '满二',
  '送车位',
  '带车位',
  '赠送车库',
  '停车位',
  '有车位',
  '可停车',
  '承重梁',
] as const;
export enum CopyKind {
  Photo = 'photo',
  Video = 'video',
}
export const copyInputSchema = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal(CopyKind.Photo),
    brief: z.string().max(2000).optional(),
    facts: projectSchema.pick({
      name: true,
      location: true,
      area: true,
      layout: true,
      price: true,
    }),
    scene: z.object({ id: z.string().min(1).max(80), src: imagePathSchema }),
  }),
  z.object({
    kind: z.literal(CopyKind.Video),
    brief: z.string().max(2000).optional(),
    facts: z.object({
      name: videoEditSchema.shape.name,
      facts: videoEditSchema.shape.facts,
      price: videoEditSchema.shape.price,
      extra: videoEditSchema.shape.extra,
    }),
    house: importedVideoSchema.nullable(),
    materials: z.array(houseMaterialSchema).max(12).default([]),
    shots: z
      .array(
        z.object({
          id: videoShotSchema.shape.id,
          sourceId: videoShotSchema.shape.sourceId,
          start: videoShotSchema.shape.start,
          end: videoShotSchema.shape.end,
        }),
      )
      .min(1)
      .max(12),
  }),
]);
export const copySubmissionSchema = z.object({
  input: copyInputSchema,
  freeQuotaConfirmed: z.literal(true),
});
export const copyItemSchema = z.object({
  id: z.string().min(1).max(80),
  title: z.string().min(1).max(24),
  narration: z.string().min(1).max(160),
  caption: z.string().min(1).max(100),
  evidence: z.string().min(1).max(240),
});
export const copyResultSchema = z.object({
  model: z.literal(COPY_MODEL),
  cached: z.boolean(),
  items: z.array(copyItemSchema).min(1).max(12),
  warnings: z.array(z.string().max(240)).max(12).optional(),
});
export const copyCapabilitySchema = z.object({
  ready: z.boolean(),
  model: z.literal(COPY_MODEL),
  message: z.string(),
});
export type CopyInput = z.infer<typeof copyInputSchema>;
export type CopyResult = z.infer<typeof copyResultSchema>;
