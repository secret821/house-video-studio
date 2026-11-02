/** Original-speech captions stay independent from authored listing copy and video cuts. */
import type { Caption } from '@remotion/captions';
import { z } from 'zod';

import { JobStatus } from './project';

export const speechCaptionSchema = z
  .object({
    id: z.string().min(1).max(80),
    text: z.string().trim().min(1).max(28),
    startMs: z.number().int().min(0).max(600_000),
    endMs: z.number().int().positive().max(600_000),
    timestampMs: z.number().nullable(),
    confidence: z.number().min(0).max(1).nullable(),
  })
  .refine((cue) => cue.endMs > cue.startMs, '字幕结束时间须晚于开始时间。');
export const speechCaptionsSchema = z
  .array(speechCaptionSchema)
  .max(600)
  .superRefine((cues, context) => {
    if (new Set(cues.map((cue) => cue.id)).size !== cues.length)
      context.addIssue({ code: 'custom', message: '字幕编号不能重复。' });
    cues.forEach((cue, index) => {
      if (index > 0 && cue.startMs < cues[index - 1].endMs)
        context.addIssue({
          code: 'custom',
          path: [index, 'startMs'],
          message: '字幕需按时间排列，前后不能重叠。',
        });
    });
  });
export type SpeechCaption = z.infer<typeof speechCaptionSchema> & Caption;
export const subtitleCapabilitySchema = z.object({
  ready: z.boolean(),
  message: z.string(),
});
export const subtitleJobSchema = z.object({
  id: z.string().uuid(),
  src: z.string(),
  status: z.enum(JobStatus),
  progress: z.number().min(0).max(1),
  message: z.string(),
  captions: speechCaptionsSchema,
});
export type SubtitleJob = z.infer<typeof subtitleJobSchema>;
