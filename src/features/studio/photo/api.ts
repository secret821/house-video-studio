/** All HTTP, parsing and import/export boundaries are confined to this business module. */
import { z } from 'zod';
import { studioRequest as request } from '../request';
import { readServerDraft, saveServerDraft } from '../draft/server-draft-api';
import { DraftKind } from '@/services/definition/project';

import {
  audioSchema,
  OpeningSource,
  openingSchema,
  jobSchema,
  projectSchema,
  projectDraftSchema,
  sceneSchema,
  type Project,
  type Scene,
} from '../../../services/definition/project';

import {
  copyCapabilitySchema,
  copyResultSchema,
  type CopyInput,
} from '../../../services/definition/copy';

import videoEditApi from '../video/video-edit-api';
import type { VideoUploadOptions } from '../video/video-edit-api';
import {
  propertyExtractionResultSchema,
  propertyOcrCapabilitySchema,
  propertyOcrResultSchema,
} from '../../../services/definition/property-extraction';

/** Shared JSON mutation setup; the API owns the wire representation. */
function post(body: unknown): RequestInit {
  return {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  };
}

/** Multipart uploads preserve browser-set content boundaries. */
function uploadImage(file: File) {
  const body = new FormData();
  body.append('file', file);
  return request('upload-image', {
    schema: z.object({ src: z.string(), name: z.string() }),
    init: { method: 'POST', body },
  });
}

const api = {
  getPropertyOcrCapability: () =>
    request('copy/get-ocr-capability', { schema: propertyOcrCapabilitySchema }),
  recognizePropertyScreenshot: (file: File) => {
    const body = new FormData();
    body.append('file', file);
    return request('copy/recognize-property-screenshot', {
      schema: propertyOcrResultSchema,
      init: { method: 'POST', body },
    });
  },
  extractProperty: (text: string, freeQuotaConfirmed: true) =>
    request('copy/extract-property', {
      schema: propertyExtractionResultSchema,
      init: post({ text, freeQuotaConfirmed }),
    }),
  getCopyCapability: () =>
    request('copy/get-capability', { schema: copyCapabilitySchema }),
  generateCopy: (input: CopyInput, freeQuotaConfirmed: true) =>
    request('copy/generate-copy', {
      schema: copyResultSchema,
      init: post({ input, freeQuotaConfirmed }),
    }),
  /** Reuse local video ingestion; project schema limits photo-mode openings to 60 seconds. */
  uploadOpeningVideo: (file: File, options?: VideoUploadOptions) =>
    videoEditApi.uploadVideo(file, options).then((clip) => {
      if (clip.duration > 60)
        throw new Error('照片带看的开场视频请控制在60秒以内。');
      return openingSchema.parse({
        source: OpeningSource.Upload,
        photo: null,
        script: '',
        voiceover: null,
        clip,
      });
    }),
  getDemo: () => request('get-demo', { schema: projectSchema }),
  getDraft: () => readServerDraft(DraftKind.Photo, projectDraftSchema),
  getCapabilities: () =>
    request('get-capabilities', {
      schema: z.object({
        speechReady: z.boolean(),
        speechMessage: z.string(),
        localSpeechReady: z.boolean().default(false),
      }),
    }),
  saveDraft: (project: Project) =>
    saveServerDraft(DraftKind.Photo, projectDraftSchema, project),
  uploadImage,
  getLatestRender: () =>
    request('get-latest-render-job', { schema: jobSchema.nullable() }),
  uploadAudio: (file: File) => requestAudio(file),
  generateLocalNarration: (scene: Scene) =>
    request('generate-local-narration', {
      schema: sceneSchema,
      init: post(scene),
    }),
  generateNarration: (scenes: Array<Scene>) =>
    request('generate-narration', {
      schema: z.array(sceneSchema),
      init: post(scenes),
    }),
  createRender: (project: Project) =>
    request('create-render-job', { schema: jobSchema, init: post(project) }),
  getRender: (id: string, signal?: AbortSignal) =>
    request(`get-render-job/${encodeURIComponent(id)}`, {
      schema: jobSchema,
      init: {
        signal: AbortSignal.any([
          AbortSignal.timeout(30000),
          ...(signal ? [signal] : []),
        ]),
      },
    }),
  importProject: (file: File) =>
    file.text().then((text) => projectSchema.parse(JSON.parse(text))),
};

/** Audio has a dedicated contract, avoiding union casts in the page. */
function requestAudio(file: File) {
  const body = new FormData();
  body.append('file', file);
  return request('upload-audio', {
    schema: audioSchema,
    init: { method: 'POST', body },
  });
}

/** Export a portable project description; media remains in the local project data folder. */
export function downloadProject(project: Project) {
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(project, null, 2)], { type: 'application/json' }),
  );
  const link = document.createElement('a');
  link.href = url;
  link.download = 'house-video-project.json';
  link.click();
  URL.revokeObjectURL(url);
}

export default api;
