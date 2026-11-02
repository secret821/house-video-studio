/** Shared account workspace login contracts; credentials never belong in project drafts. */
import { z } from 'zod';

export const loginInputSchema = z.object({
  username: z.string().trim().min(1).max(64),
  password: z.string().min(1).max(256),
});
export const sessionSchema = z.object({
  enabled: z.boolean(),
  temporaryMedia: z.boolean().default(false),
  mediaRetentionMs: z.number().default(7200000),
  mediaSessionId: z.string().nullable().default(null),
  authenticated: z.boolean(),
  username: z.string().nullable().default(null),
  workspaceId: z.string().nullable().default(null),
});
export const loginResultSchema = z.object({ authenticated: z.literal(true) });
/** Cached clients must not revoke a session with an unconfirmed empty request. */
export const logoutInputSchema = z
  .object({ confirmed: z.literal(true) })
  .strict();

/** Return only to editor routes, never to a supplied external address or an API. */
export function getLoginDestination(value: string | null) {
  return value === '/video-edit' || value === '/photo-mode' ? value : '/';
}
