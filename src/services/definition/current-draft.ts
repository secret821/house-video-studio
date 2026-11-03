/** An opaque revision protects the one current draft against stale tabs and reordered saves. */
import { z } from 'zod';

export function currentDraftSchema<T>(project: z.ZodType<T>) {
  return z.object({
    project: project.nullable(),
    revision: z.uuid().nullable(),
  });
}

export function saveDraftSchema<T>(project: z.ZodType<T>) {
  return z.object({ project, revision: z.uuid().nullable() });
}

export function savedDraftSchema<T>(project: z.ZodType<T>) {
  return z.object({ project, revision: z.uuid() });
}
