/** Free editing has an independent draft and never calls portrait generation or speech services. */
import { useEffect, useState } from 'react';

import { JobStatus } from '../../services/definition/project';
import {
  EMPTY_VIDEO_EDIT,
  CoverSource,
  VideoRole,
  videoEditSchema,
  type VideoEditJob,
  type VideoEditProject,
  type VideoShot,
} from '../../services/definition/video-edit';
import { createVideoShots } from '../../video/video-edit-timeline';

import api from './video-edit-api';
import studioApi from './api';

/** Own upload, validation and real task polling for the two-video workflow. */
export function useVideoEdit() {
  const [project, setProject] = useState<VideoEditProject>(EMPTY_VIDEO_EDIT);
  const [work, setWork] = useState<string | null>('正在读取本地视频草稿…');
  const [notice, setNotice] = useState({ text: '', error: false });
  const [job, setJob] = useState<VideoEditJob | null>(null);
  const rendering = job?.status === JobStatus.Rendering;
  const busy = work !== null || rendering;
  const validated = videoEditSchema.safeParse(project);
  const inputError = validated.success ? '' : validated.error.issues[0].message;
  const ready =
    validated.success &&
    project.opening !== null &&
    project.house !== null &&
    project.shots.length > 0;

  /** Display a rejected operation with enough context to retry explicitly. */
  function reportError(error: unknown) {
    setNotice({
      text: error instanceof Error ? error.message : '操作失败，请重试。',
      error: true,
    });
  }
  useEffect(() => {
    let active = true;
    Promise.all([api.getDraft(), api.getLatestJob()])
      .then(([draft, latest]) => {
        if (active) {
          setProject(draft);
          setJob(latest?.sessionId === draft.sessionId ? latest : null);
        }
      })
      .catch((error: unknown) => {
        if (active) reportError(error);
      })
      .finally(() => {
        if (active) setWork(null);
      });
    return () => {
      active = false;
    };
  }, []);
  const id = job?.id;
  useEffect(() => {
    if (!rendering || !id) return;
    let active = true;
    let timer: ReturnType<typeof setTimeout>;
    /** Serialize polls and retain an observable retry state when the local server is unavailable. */
    function poll() {
      api
        .getJob(id!)
        .then((next) => {
          if (!active) return;
          setJob(next);
          if (next.status === JobStatus.Rendering)
            timer = setTimeout(poll, 1000);
        })
        .catch((error: unknown) => {
          if (active) {
            reportError(error);
            timer = setTimeout(poll, 3000);
          }
        });
    }
    poll();
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [id, rendering]);

  /** Preserve uploaded media across reloads without touching the existing photo-tour draft. */
  function saveUpdated(next: VideoEditProject) {
    setProject(next);
    return api.saveDraft(next);
  }
  /** Uploading a replacement house clip resets only that clip's authored chapter ranges. */
  function uploadVideo(file: File | undefined, role: VideoRole) {
    if (!file) return;
    if (file.size > 250 * 1024 * 1024) {
      reportError(new Error('单个视频请控制在250MB以内。'));
      return;
    }
    setWork('正在本地处理视频与原声音量，不会上传云端…');
    setNotice({ text: '', error: false });
    api
      .uploadVideo(file)
      .then((asset) => {
        if (role === VideoRole.Opening)
          return saveUpdated({ ...project, opening: asset });
        if (asset.duration < 2)
          throw new Error('房屋视频至少需要2秒，才能设置剪辑片段。');
        return saveUpdated({
          ...project,
          house: asset,
          shots: createVideoShots(asset.duration),
        });
      })
      .catch(reportError)
      .finally(() => setWork(null));
  }
  /** Explicit mutations preserve all unrelated fields of the independent video draft. */
  function patch(patch: Partial<VideoEditProject>) {
    setProject((current) => ({ ...current, ...patch }));
  }
  /** A segment's timing and copy are edited as a single entity with a stable identifier. */
  function patchShot(id: string, patch: Partial<VideoShot>) {
    setProject((current) => ({
      ...current,
      shots: current.shots.map((shot) =>
        shot.id === id ? { ...shot, ...patch } : shot,
      ),
    }));
  }
  /** Persist the exact preview snapshot before submitting its local render. */
  function exportVideo() {
    setWork('正在提交免费本地导出…');
    setNotice({ text: '', error: false });
    api
      .saveDraft(project)
      .then(() => api.createJob(project))
      .then(setJob)
      .catch(reportError)
      .finally(() => setWork(null));
  }
  return {
    project,
    job,
    busy,
    work,
    notice,
    inputError,
    ready,
    newProject: () => {
      const next = {
        ...EMPTY_VIDEO_EDIT,
        name: '新房源视频',
        facts: '',
        price: '',
        extra: '',
        contact: '',
        sessionId: crypto.randomUUID(),
      };
      setWork('正在新建房源视频…');
      setNotice({ text: '', error: false });
      api
        .saveDraft(next)
        .then(() => {
          setProject(next);
          setJob(null);
          setNotice({
            text: '已新建空房源视频，草稿已保存。原始素材与历史成片保留。',
            error: false,
          });
        })
        .catch(reportError)
        .finally(() => setWork(null));
    },
    patch,
    patchShot,
    uploadVideo,
    uploadCoverImage: (file: File | undefined) => {
      if (!file) return;
      if (file.size > 20 * 1024 * 1024) {
        reportError(new Error('封面底图请控制在20MB以内。'));
        return;
      }
      setWork('正在本地处理封面底图…');
      setNotice({ text: '', error: false });
      studioApi
        .uploadImage(file)
        .then((image) =>
          saveUpdated({
            ...project,
            coverSource: CoverSource.Image,
            coverImage: image.src,
          }),
        )
        .catch(reportError)
        .finally(() => setWork(null));
    },
    exportVideo,
    save: () => {
      setWork('正在保存…');
      api
        .saveDraft(project)
        .then(() =>
          setNotice({
            text: '免费视频草稿已保存，照片模式草稿保持独立。',
            error: false,
          }),
        )
        .catch(reportError)
        .finally(() => setWork(null));
    },
    resetShots: () => {
      if (project.house)
        patch({ shots: createVideoShots(project.house.duration) });
    },
    removeShot: (id: string) =>
      patch({ shots: project.shots.filter((shot) => shot.id !== id) }),
    uploadMusic: (file: File | undefined) => {
      if (!file) return;
      setWork('正在读取本机音乐…');
      api
        .uploadMusic(file)
        .then((music) => saveUpdated({ ...project, music }))
        .catch(reportError)
        .finally(() => setWork(null));
    },
    originalMusic: () => {
      setWork('正在准备原创钢琴音乐…');
      api
        .getOriginalMusic()
        .then((music) => saveUpdated({ ...project, music }))
        .catch(reportError)
        .finally(() => setWork(null));
    },
  };
}
