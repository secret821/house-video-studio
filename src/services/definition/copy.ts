/** Copy requests contain only property facts and selected house media, never presenter videos or credentials. */
import { z } from 'zod';

import { imagePathSchema, projectSchema } from './project';
import {
  importedVideoSchema,
  videoEditSchema,
  videoShotSchema,
} from './video-edit';

export const COPY_MODEL = 'qwen3.7-flash';
export enum CopyKind {
  Photo = 'photo',
  Video = 'video',
}
export const copyInputSchema = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal(CopyKind.Photo),
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
    facts: z.object({
      name: videoEditSchema.shape.name,
      facts: videoEditSchema.shape.facts,
      price: videoEditSchema.shape.price,
      extra: videoEditSchema.shape.extra,
    }),
    house: importedVideoSchema,
    shots: z
      .array(
        z.object({
          id: videoShotSchema.shape.id,
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
});
export const copyCapabilitySchema = z.object({
  ready: z.boolean(),
  model: z.literal(COPY_MODEL),
  message: z.string(),
});
export type CopyInput = z.infer<typeof copyInputSchema>;
export type CopyResult = z.infer<typeof copyResultSchema>;
