/** Upload deadlines and cancellation status are shared by the server and both editors. */
import { z } from 'zod';

export const VIDEO_UPLOAD_MAX_BYTES = 1024 * 1024 * 1024;
export const VIDEO_UPLOAD_TIMEOUT_MS = 15 * 60_000;
export enum VideoUploadPhase {
  Receiving = 'receiving',
  Processing = 'processing',
  Waiting = 'waiting',
  Cancelling = 'cancelling',
}
export const videoUploadTaskSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  startedAt: z.number(),
  deadline: z.number(),
  phase: z.enum(VideoUploadPhase),
});
export const videoUploadStatusSchema = z.object({
  active: videoUploadTaskSchema.nullable(),
  temporaryMedia: z.boolean().default(false),
});
export const cancelVideoUploadSchema = z.object({ id: z.string().uuid() });
export type VideoUploadTaskInfo = z.infer<typeof videoUploadTaskSchema>;
