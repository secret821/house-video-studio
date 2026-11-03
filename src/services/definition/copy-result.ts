/** Acyclic copy-result contract shared by model responses and the current editable browser draft. */
import { z } from 'zod';

export const COPY_MODEL = 'qwen3.7-flash';
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
/** Suggestions can be saved mid-edit, including temporarily empty text, without being adopted. */
export const savedCopyDraftSchema = z.object({
  identity: z.string().max(24000),
  result: copyResultSchema.extend({
    items: z
      .array(
        copyItemSchema.extend({
          title: z.string().max(24),
          narration: z.string().max(160),
          caption: z.string().max(100),
        }),
      )
      .min(1)
      .max(12),
  }),
});
export type SavedCopyDraft = z.infer<typeof savedCopyDraftSchema>;
