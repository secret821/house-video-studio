/** All free-video requests and response normalization remain at this page's business boundary. */
import { z } from 'zod';
import {
  cleanCapabilitySchema,
  cleanJobSchema,
} from '@/services/definition/smart-clean';
import { studioRequest } from '../request';
import { readServerDraft, saveServerDraft } from '../draft/server-draft-api';
import { DraftKind } from '@/services/definition/project';

import { audioSchema } from '../../../services/definition/project';
import { MusicTrack } from '../../../services/definition/music';
import { createMediaId } from '../../../services/definition/media-id';
import {
  subtitleCapabilitySchema,
  subtitleJobSchema,
} from '../../../services/definition/subtitles';
import {
  VIDEO_UPLOAD_TIMEOUT_MS,
  videoUploadStatusSchema,
} from '../../../services/definition/video-upload';
import {
  EMPTY_VIDEO_EDIT,
  importedVideoSchema,
  videoEditJobSchema,
  videoEditDraftSchema,
  type VideoEditProject,
} from '../../../services/definition/video-edit';

/** Preserve the server's actionable error instead of converting failures into a successful empty response. */
export { ApiClientError as VideoEditRequestError } from '@/share/request';

/** HTTP status remains available to stop polling expired or unauthorized tasks. */
function request<T>(
  path: string,
  options: { schema: z.ZodType<T>; init?: RequestInit; timeoutMs?: number },
): Promise<T> {
  return studioRequest(path, {
    ...options,
    timeoutMs: options.timeoutMs ?? 30_000,
    cancelMessage: '已取消上传与处理，已保存的素材保留。',
    timeoutMessage:
      '请求超时，连接已结束，请检查网络后重试。大视频建议分段上传；已保存的素材仍会保留。',
    networkMessage:
      '网络连接中断，请保持页面在前台并检查网络后重试。已保存的素材仍会保留。',
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
  /** First load and explicit New share the same owned offline score; failure must not replace the current draft. */
  createDraft: () =>
    api.getOriginalMusic().then((music) => ({
      ...EMPTY_VIDEO_EDIT,
      sessionId: createMediaId(),
      music,
    })),
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
    readServerDraft(DraftKind.Video, videoEditDraftSchema).then<{
      project: VideoEditProject;
      mediaExpired: boolean;
      mediaError?: string;
    }>((draft) => {
      if (draft.project) return { ...draft, project: draft.project };
      return api.createDraft().then((project) => ({
        ...draft,
        project,
        mediaExpired: false,
      }));
    }),
  saveDraft: (project: VideoEditProject) =>
    saveServerDraft(DraftKind.Video, videoEditDraftSchema, project),
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
  getJob: (id: string, signal?: AbortSignal) =>
    request(`video-edit/get-render-job/${encodeURIComponent(id)}`, {
      schema: videoEditJobSchema,
      init: { signal },
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
