/** All free-video requests and response normalization remain at this page's business boundary. */
import { z } from 'zod';

import { audioSchema } from '../../services/definition/project';
import {
  importedVideoSchema,
  videoEditJobSchema,
  videoEditSchema,
  type VideoEditProject,
} from '../../services/definition/video-edit';

/** Preserve the server's actionable error instead of converting failures into a successful empty response. */
function request<T>(
  path: string,
  options: { schema: z.ZodType<T>; init?: RequestInit },
): Promise<T> {
  return fetch(`/api/${path}`, options.init).then((response) =>
    response.json().then((body: unknown) => {
      if (!response.ok) {
        const error = z.object({ message: z.string() }).safeParse(body);
        throw new Error(
          error.success ? error.data.message : `请求失败 (${response.status})`,
        );
      }
      return options.schema.parse(body);
    }),
  );
}
/** JSON wire formatting is confined to this API boundary. */
function post(body: unknown): RequestInit {
  return {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  };
}
/** Browser-owned multipart boundaries are used for local video and music uploads. */
function upload(file: File): RequestInit {
  const body = new FormData();
  body.append('file', file);
  return { method: 'POST', body };
}
const api = {
  getDraft: () => request('video-edit/get-draft', { schema: videoEditSchema }),
  saveDraft: (project: VideoEditProject) =>
    request('video-edit/save-draft', {
      schema: z.object({ saved: z.boolean() }),
      init: post(project),
    }),
  uploadVideo: (file: File) =>
    request('video-edit/upload-video', {
      schema: importedVideoSchema,
      init: upload(file),
    }),
  uploadMusic: (file: File) =>
    request('upload-audio', { schema: audioSchema, init: upload(file) }),
  getOriginalMusic: () =>
    request('video-edit/get-original-music', { schema: audioSchema }),
  getLatestJob: () =>
    request('video-edit/get-latest-render-job', {
      schema: videoEditJobSchema.nullable(),
    }),
  getJob: (id: string) =>
    request(`video-edit/get-render-job/${encodeURIComponent(id)}`, {
      schema: videoEditJobSchema,
    }),
  createJob: (project: VideoEditProject) =>
    request('video-edit/create-render-job', {
      schema: videoEditJobSchema,
      init: post(project),
    }),
};
export default api;
