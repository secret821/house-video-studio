/** Free editing has an independent draft and never calls portrait generation or speech services. */
import { VIDEO_UPLOAD_MAX_BYTES } from '../../services/definition/video-upload';
import { useCallback, useEffect, useState } from 'react';
import { musicApi } from './music-api';
import type { MusicChoice } from '@/services/definition/music-library';
import { createMediaId } from '../../services/definition/media-id';

import { JobStatus } from '../../services/definition/project';
import {
  EMPTY_VIDEO_EDIT,
  CoverSource,
  VideoRole,
  HouseMediaKind,
  getHouseMaterials,
  getShotMaterial,
  type HouseMaterial,
  videoEditSchema,
  type VideoEditJob,
  type VideoEditProject,
  type VideoShot,
} from '../../services/definition/video-edit';
import {
  createMaterialShots,
  createVideoShots,
} from '../../video/video-edit-timeline';

import api from './video-edit-api';
import studioApi from './api';
import { useVideoUpload } from './use-video-upload';
import { reorderHouseMaterials } from './material-order';
import { updateSpeechCaptions } from './speech-subtitles';

/** Own upload, validation and real task polling for the two-video workflow. */
export function useVideoEdit() {
  const upload = useVideoUpload();
  const [project, setProject] = useState<VideoEditProject>(EMPTY_VIDEO_EDIT);
  const [work, setWork] = useState<string | null>('正在读取本地视频草稿…');
  const [elapsed, setElapsed] = useState(0);
  const [notice, setNotice] = useState({ text: '', error: false });
  const [job, setJob] = useState<VideoEditJob | null>(null);
  const [subtitleBusy, setSubtitleBusy] = useState(false);
  const [cleanBusy, setCleanBusy] = useState(false);
  const rendering = job?.status === JobStatus.Rendering;
  const busy =
    work !== null || rendering || upload.busy || subtitleBusy || cleanBusy;
  const updateSubtitles = useCallback(
    (options: Parameters<typeof updateSpeechCaptions>[1]) => {
      setProject((current) => updateSpeechCaptions(current, options));
    },
    [],
  );
  const validated = videoEditSchema.safeParse(project);
  const inputError = validated.success ? '' : validated.error.issues[0].message;
  const materials = getHouseMaterials(project);
  const ready =
    validated.success &&
    project.opening !== null &&
    materials.length > 0 &&
    project.shots.length > 0;

  useEffect(() => {
    setElapsed(0);
    if (!work) return;
    const started = Date.now();
    const timer = setInterval(
      () => setElapsed(Math.floor((Date.now() - started) / 1000)),
      1000,
    );
    return () => clearInterval(timer);
  }, [work]);

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
      .then(([{ project: draft, mediaExpired }, latest]) => {
        if (active) {
          setProject(draft);
          if (mediaExpired)
            setNotice({
              text: '草稿文案已恢复，但临时素材已过期或服务已重启，请重新上传素材后生成。',
              error: true,
            });
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
    if (file.size > VIDEO_UPLOAD_MAX_BYTES) {
      reportError(new Error('单个视频请控制在1GB以内。'));
      return;
    }
    setWork(`正在上传原片“${file.name}”，上传后仅校验信息，请保持页面打开…`);
    setNotice({ text: '', error: false });
    upload
      .uploadVideo(file)
      .then((asset) => {
        setWork('原片已上传，正在保存浏览器草稿…');
        if (role === VideoRole.Opening)
          return saveUpdated({ ...project, opening: asset });
        if (asset.duration < 2)
          throw new Error('房屋视频至少需要2秒，才能设置剪辑片段。');
        return saveUpdated({
          ...project,
          house: asset,
          materials: [],
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

  /** Upload mixed house files in selection order, saving each success before proceeding to the next file. */
  function addHouseMedia(files: FileList | readonly File[] | null) {
    if (!files?.length) return;
    if (
      materials.length + files.length > 12 ||
      project.shots.length + files.length > 12
    ) {
      reportError(
        new Error(
          '当前最多保留12份房屋素材和12个片段，请先移除不需要的素材或片段。',
        ),
      );
      return;
    }
    setWork('正在准备房屋视频 / 照片…');
    setNotice({ text: '', error: false });
    let next: VideoEditProject = {
      ...project,
      house: null,
      materials,
      shots: project.shots.map((shot) => ({
        ...shot,
        sourceId: shot.sourceId ?? materials[0]?.id,
      })),
    };
    const selected = Array.from(files);
    selected
      .reduce(
        (chain, file, index) =>
          chain.then(() => {
            setWork(
              `正在上传第${index + 1}/${selected.length}份素材“${file.name}”，转码将在生成成片时进行…`,
            );
            const video = /\.(mp4|mov)$/i.test(file.name);
            const limit = video ? VIDEO_UPLOAD_MAX_BYTES : 20 * 1024 * 1024;
            if (file.size > limit)
              throw new Error(
                `${file.name}超出${video ? '1GB' : '20MB'}限制。`,
              );
            const pending: Promise<HouseMaterial> = video
              ? upload.uploadVideo(file).then((asset) => {
                  if (asset.duration < 2)
                    throw new Error('房屋视频至少需要2秒。');
                  return {
                    id: createMediaId(),
                    kind: HouseMediaKind.Video,
                    video: asset,
                  };
                })
              : studioApi.uploadImage(file).then((image) => ({
                  id: createMediaId(),
                  kind: HouseMediaKind.Image,
                  src: image.src,
                  name: image.name,
                  duration: 30,
                }));
            return pending.then((source) => {
              setWork(
                `第${index + 1}/${selected.length}份素材上传完成，正在保存草稿…`,
              );
              next = {
                ...next,
                materials: [...next.materials, source],
                shots: [...next.shots, ...createMaterialShots([source])],
              };
              return saveUpdated(next).then(() =>
                setNotice({
                  text: `已添加${next.materials.length}份房屋素材，草稿已保存到当前浏览器。`,
                  error: false,
                }),
              );
            });
          }),
        Promise.resolve(),
      )
      .catch(reportError)
      .finally(() => setWork(null));
  }
  return {
    setSubtitleBusy,
    updateSubtitles,
    setCleanBusy,
    project,
    upload,
    materials,
    job,
    busy,
    work: work && elapsed >= 10 ? `${work}（已等待${elapsed}秒）` : work,
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
        sessionId: createMediaId(),
      };
      setWork('正在新建房源视频…');
      setNotice({ text: '', error: false });
      api
        .saveDraft(next)
        .then(() => {
          setProject(next);
          setJob(null);
          setNotice({
            text: '已新建空房源视频，草稿已保存到当前浏览器。原始素材与历史成片保留。',
            error: false,
          });
        })
        .catch(reportError)
        .finally(() => setWork(null));
    },
    patch,
    patchShot,
    uploadVideo,
    addHouseMedia,
    removeMaterial: (id: string) =>
      patch({
        house: null,
        materials: materials.filter((source) => source.id !== id),
        shots: project.shots.filter(
          (shot) => getShotMaterial(materials, shot)?.id !== id,
        ),
      }),
    moveMaterial: (index: number, offset: number) => {
      const target = index + offset;
      if (target < 0 || target >= materials.length) return;
      patch(reorderHouseMaterials(project, { from: index, to: target }));
    },
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
      if (project.materials.length)
        patch({ shots: createMaterialShots(materials) });
      else if (project.house)
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
    selectMusic: (choice: MusicChoice, signal?: AbortSignal) => {
      setWork('正在准备背景音乐…');
      setNotice({ text: '', error: false });
      return musicApi
        .select(choice, signal)
        .then((music) =>
          saveUpdated({
            ...project,
            music,
            musicVolume: project.musicVolume || EMPTY_VIDEO_EDIT.musicVolume,
          }),
        )
        .then(() =>
          setNotice({
            text: '已选用背景音乐；生成成片时使用当前账号的本地音乐文件。',
            error: false,
          }),
        )
        .finally(() => setWork(null));
    },
  };
}
