/** All free-video requests and response normalization remain at this page's business boundary. */
import { z } from 'zod';
import {
  cleanCapabilitySchema,
  cleanJobSchema,
} from '@/services/definition/smart-clean';
import { workspaceRequest } from './auth-api';
import {
  readBrowserDraft,
  saveBrowserDraft,
  BrowserDraftKind,
} from './browser-draft';

import { audioSchema } from '../../services/definition/project';
import { MusicTrack } from '../../services/definition/music';
import {
  subtitleCapabilitySchema,
  subtitleJobSchema,
} from '../../services/definition/subtitles';
import {
  VIDEO_UPLOAD_TIMEOUT_MS,
  videoUploadStatusSchema,
} from '../../services/definition/video-upload';
import {
  EMPTY_VIDEO_EDIT,
  importedVideoSchema,
  videoEditJobSchema,
  videoEditSchema,
  type VideoEditProject,
} from '../../services/definition/video-edit';

/** Preserve the server's actionable error instead of converting failures into a successful empty response. */
export class VideoEditRequestError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

/** HTTP status remains available to stop polling expired or unauthorized tasks. */
function request<T>(
  path: string,
  options: { schema: z.ZodType<T>; init?: RequestInit; timeoutMs?: number },
): Promise<T> {
  const controller = new AbortController();
  const external = options.init?.signal;
  const abort = () => controller.abort(external?.reason);
  external?.addEventListener('abort', abort, { once: true });
  if (external?.aborted) abort();
  const timer = setTimeout(
    () => controller.abort(),
    options.timeoutMs ?? 30_000,
  );
  return workspaceRequest({ ...options.init, signal: controller.signal })
    .then((init) => {
      controller.signal.throwIfAborted();
      return fetch(`/api/${path}`, init);
    })
    .then((response) =>
      response
        .json()
        .catch(() => {
          throw new Error(
            `服务器返回异常 (${response.status})，请检查网络后重试。`,
          );
        })
        .then((body: unknown) => {
          if (!response.ok) {
            const error = z.object({ message: z.string() }).safeParse(body);
            throw new VideoEditRequestError(
              response.status,
              error.success
                ? error.data.message
                : `请求失败 (${response.status})`,
            );
          }
          return options.schema.parse(body);
        }),
    )
    .catch((error: unknown) => {
      if (external?.aborted)
        throw new Error('已取消上传与处理，已保存的素材保留。');
      if (controller.signal.aborted)
        throw new Error(
          '请求超时，连接已结束，请检查网络后重试。大视频建议分段上传；已保存的素材仍会保留。',
        );
      if (error instanceof TypeError)
        throw new Error(
          '网络连接中断，请保持页面在前台并检查网络后重试。已保存的素材仍会保留。',
        );
      throw error;
    })
    .finally(() => {
      clearTimeout(timer);
      external?.removeEventListener('abort', abort);
    });
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
  getCleanCapability: () =>
    request('smart-clean/get-capability', { schema: cleanCapabilitySchema }),
  getLatestCleanJob: () =>
    request('smart-clean/get-latest-job', {
      schema: cleanJobSchema.nullable(),
    }),
  createCleanJob: (sources: Array<string>) =>
    request('smart-clean/create-job', {
      schema: cleanJobSchema,
      init: post({ sources }),
    }),
  getCleanJob: (id: string) =>
    request(`smart-clean/get-job/${encodeURIComponent(id)}`, {
      schema: cleanJobSchema,
    }),
  cancelCleanJob: (id: string) =>
    request('smart-clean/cancel-job', {
      schema: cleanJobSchema,
      init: post({ id }),
      timeoutMs: 60000,
    }),
  getSubtitleCapability: () =>
    request('subtitles/get-capability', { schema: subtitleCapabilitySchema }),
  getLatestSubtitleJob: () =>
    request('subtitles/get-latest-job', {
      schema: subtitleJobSchema.nullable(),
    }),
  createSubtitleJob: (src: string) =>
    request('subtitles/create-job', {
      schema: subtitleJobSchema,
      init: post({ src }),
    }),
  getSubtitleJob: (id: string) =>
    request(`subtitles/get-job/${encodeURIComponent(id)}`, {
      schema: subtitleJobSchema,
    }),
  cancelSubtitleJob: (id: string) =>
    request('subtitles/cancel-job', {
      schema: subtitleJobSchema,
      init: post({ id }),
    }),
  getDraft: () =>
    readBrowserDraft(BrowserDraftKind.Video, videoEditSchema).then((draft) => {
      if (draft.project) return { ...draft, project: draft.project };
      return api.getOriginalMusic().then((music) => ({
        project: { ...EMPTY_VIDEO_EDIT, music },
        mediaExpired: false,
      }));
    }),
  saveDraft: (project: VideoEditProject) =>
    saveBrowserDraft(BrowserDraftKind.Video, videoEditSchema, project),
  uploadVideo: (file: File, options?: VideoUploadOptions) =>
    request(
      `video-edit/upload-video${options ? `?uploadId=${encodeURIComponent(options.id)}` : ''}`,
      {
        schema: importedVideoSchema,
        init: { ...upload(file), signal: options?.signal },
        timeoutMs: VIDEO_UPLOAD_TIMEOUT_MS,
      },
    ),
  getUploadStatus: () =>
    request('video-edit/get-upload-status', {
      schema: videoUploadStatusSchema,
    }),
  cancelUpload: (id: string) =>
    request('video-edit/cancel-upload', {
      schema: videoUploadStatusSchema,
      init: post({ id }),
    }),
  uploadMusic: (file: File) =>
    request('upload-audio', {
      schema: audioSchema,
      init: upload(file),
      timeoutMs: 15 * 60_000,
    }),
  getOriginalMusic: (track = MusicTrack.Piano) =>
    request(
      `video-edit/get-original-music?track=${encodeURIComponent(track)}`,
      { schema: audioSchema },
    ),
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
export interface VideoUploadOptions {
  id: string;
  signal: AbortSignal;
}
export default api;
