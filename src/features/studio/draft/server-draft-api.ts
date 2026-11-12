/** Draft requests contain metadata only; raw videos stay on the server after their one upload. */
import { z } from 'zod';
import { requestData } from '@/share/request';

import { DraftKind } from '@/services/definition/project';
import {
  currentDraftSchema,
  savedDraftSchema,
} from '@/services/definition/current-draft';

import { workspaceRequest } from '../auth/auth-api';
import { readLegacyBrowserDraft } from './browser-draft';

const ROUTES = {
  [DraftKind.Photo]: '/api',
  [DraftKind.Video]: '/api/video-edit',
};
const revisions = new Map<DraftKind, string | null>();
const confirmedProjects = new Map<DraftKind, string>();
const queues = new Map<DraftKind, Promise<unknown>>();

function request<T>(
  kind: DraftKind,
  action: string,
  schema: z.ZodType<T>,
  project?: unknown,
) {
  return workspaceRequest({
    method: project === undefined ? 'GET' : 'POST',
    cache: 'no-store',
    signal: AbortSignal.timeout(30_000),
    ...(project !== undefined && {
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ project, revision: revisions.get(kind) ?? null }),
    }),
  }).then((init) =>
    requestData(`${ROUTES[kind]}/${action}`, { schema, init }).then(
      (value) => ({
        value,
        workspaceId:
          new Headers(init.headers).get('X-Studio-Workspace') ?? 'local',
      }),
    ),
  );
}

export function readServerDraft<T>(kind: DraftKind, schema: z.ZodType<T>) {
  return request(kind, 'get-draft', currentDraftSchema(schema)).then(
    ({ value, workspaceId }) => {
      revisions.set(kind, value.revision);
      if (value.project !== null) {
        confirmedProjects.set(kind, JSON.stringify(value.project));
        return { project: value.project, mediaExpired: false };
      }
      confirmedProjects.delete(kind);
      // Only the absence of a server draft permits importing an account-bound legacy JSON snapshot.
      return readLegacyBrowserDraft(kind, schema, workspaceId);
    },
  );
}

/** Serialize every writer, including explicit New; a rejected save does not prevent an explicit retry. */
export function saveServerDraft<T>(
  kind: DraftKind,
  schema: z.ZodType<T>,
  project: T,
): Promise<T> {
  const previous = queues.get(kind) ?? Promise.resolve();
  const send = () => {
    const parsed = schema.parse(project);
    // Querying or re-saving the acknowledged snapshot must not create a new revision or a duplicate POST.
    if (confirmedProjects.get(kind) === JSON.stringify(parsed))
      return Promise.resolve(parsed);
    return request(kind, 'save-draft', savedDraftSchema(schema), parsed).then(
      ({ value }) => {
        revisions.set(kind, value.revision);
        confirmedProjects.set(kind, JSON.stringify(value.project));
        return value.project;
      },
    );
  };
  const pending = previous.then(send, send);
  queues.set(kind, pending);
  return pending;
}
