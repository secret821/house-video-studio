/** Local cleaning produces new owned video assets; user timelines and original speech timestamps do not change. */
import { z } from 'zod';
import { JobStatus } from './project';
import { importedVideoSchema } from './video-edit';
export enum CleanReason {
  Person = 'person',
  Dark = 'dark',
}
export const cleanRangeSchema = z
  .object({
    start: z.number().nonnegative(),
    end: z.number().positive(),
    reasons: z.array(z.enum(CleanReason)).min(1).max(2),
  })
  .refine((range) => range.end > range.start);
export const cleanSampleSchema = z.object({
  time: z.number().nonnegative(),
  person: z.boolean(),
  dark: z.boolean(),
  mean: z.number(),
  confidence: z.number(),
});
export const cleanInputSchema = z
  .object({ sources: z.array(importedVideoSchema.shape.src).min(1).max(12) })
  .refine(
    (input) => new Set(input.sources).size === input.sources.length,
    '素材不能重复。',
  );
export const cleanAssetSchema = z.object({
  originalSrc: importedVideoSchema.shape.src,
  asset: importedVideoSchema,
  ranges: z.array(cleanRangeSchema).max(2400),
});
export const cleanJobSchema = z.object({
  id: z.uuid(),
  status: z.enum(JobStatus),
  progress: z.number().min(0).max(1),
  message: z.string(),
  results: z.array(cleanAssetSchema).max(12),
});
export const cleanCapabilitySchema = z.object({
  ready: z.boolean(),
  message: z.string(),
});
export type CleanRange = z.infer<typeof cleanRangeSchema>;
export type CleanSample = z.infer<typeof cleanSampleSchema>;
export type CleanJob = z.infer<typeof cleanJobSchema>;
