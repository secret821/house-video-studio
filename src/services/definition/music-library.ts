/** Free-library metadata shared by search, imports and browser drafts. */
import { z } from 'zod';
import { musicTrackSchema } from './music';

export const musicCreditSchema = z.object({
  title: z.string().min(1).max(160),
  author: z.string().min(1).max(160),
  source: z.string().regex(/^https:\/\/ccmixter\.org\/files\/[\w-]+\/\d+$/),
  license: z
    .string()
    .regex(
      /^https:\/\/creativecommons\.org\/licenses\/by\/(?:2\.5|3\.0|4\.0)\/$/,
    ),
  attribution: z.string().min(1).max(1600),
});
export const libraryTrackSchema = z.object({
  id: z.number().int().positive(),
  credit: musicCreditSchema,
  preview: z
    .string()
    .regex(/^https:\/\/ccmixter\.org\/content\/[\w-]+\/[\w().-]+\.mp3$/),
});
export const musicSearchInputSchema = z.object({
  q: z.string().trim().max(80).default(''),
  page: z.coerce.number().int().min(0).max(9).default(0),
});
export const musicSearchResultSchema = z.object({
  tracks: z.array(libraryTrackSchema).max(12),
  hasMore: z.boolean(),
});
export const musicChoiceSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('builtin'), track: musicTrackSchema }),
  z.object({ kind: z.literal('online'), id: z.number().int().positive() }),
]);
export type LibraryTrack = z.infer<typeof libraryTrackSchema>;
export type MusicChoice = z.infer<typeof musicChoiceSchema>;
