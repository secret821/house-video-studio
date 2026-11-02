/** Only project JSON lives in browser storage. Video/image bytes and credentials never enter these drafts. */
import { z } from 'zod';
import { getDraftSession } from './auth-api';

export enum BrowserDraftKind {
  Photo = 'photo',
  Video = 'video',
}
/** Account namespacing and a fresh cookie check protect same-browser account switches. */
export function readBrowserDraft<T>(
  kind: BrowserDraftKind,
  schema: z.ZodType<T>,
) {
  return getDraftSession().then((session) => {
    const value = localStorage.getItem(
      `house-studio:draft:${session.workspaceId ?? 'local'}:${kind}`,
    );
    if (!value) return { project: null, mediaExpired: false };
    const stored = z
      .object({ project: schema, mediaSessionId: z.string().nullable() })
      .parse(JSON.parse(value));
    return {
      project: stored.project,
      mediaExpired:
        session.temporaryMedia &&
        stored.mediaSessionId !== session.mediaSessionId,
    };
  });
}
/** Storage denial/quota failures reject, so a draft is never reported saved when the browser refused it. */
export function saveBrowserDraft<T>(
  kind: BrowserDraftKind,
  schema: z.ZodType<T>,
  project: T,
) {
  return getDraftSession().then((session) => {
    localStorage.setItem(
      `house-studio:draft:${session.workspaceId ?? 'local'}:${kind}`,
      JSON.stringify({
        project: schema.parse(project),
        mediaSessionId: session.mediaSessionId,
      }),
    );
    return { saved: true };
  });
}
