/** Free editing has an independent draft and never calls portrait generation or speech services. */
import { VIDEO_UPLOAD_MAX_BYTES } from '../../../services/definition/video-upload';
import { useCallback, useEffect, useState } from 'react';
import { musicApi } from '../media/music-api';
import type { MusicChoice } from '@/services/definition/music-library';
import type { SpeechCaption } from '@/services/definition/subtitles';
import { createMediaId } from '../../../services/definition/media-id';

import {
  JobStatus,
  VideoTemplate,
  VIDEO_TEMPLATE_MAP,
} from '../../../services/definition/project';
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
} from '../../../services/definition/video-edit';
import {
  createMaterialShots,
  createVideoShots,
} from '../../../video/video-edit-timeline';

import api from './video-edit-api';
import studioApi from '../photo/api';
import { useVideoUpload } from './use-video-upload';
import { useCurrentDraft } from '../draft/use-current-draft';
import { useBackgroundJob } from '../jobs/use-background-job';
import { reorderHouseMaterials } from '../media/material-order';
import { updateSpeechCaptions } from './speech-subtitles';

/** Own upload, validation and real task polling for the two-video workflow. */
export function useVideoEdit() {
  const upload = useVideoUpload();
  const [project, setProject] = useState<VideoEditProject>(EMPTY_VIDEO_EDIT);
  const [draftLoaded, setDraftLoaded] = useState(false);
  const currentDraft = useCurrentDraft({
    project,
    loaded: draftLoaded,
    save: api.saveDraft,
  });
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
  const stageSpeechDraft = useCallback(
    (options: { src: string; captions: Array<SpeechCaption> }) => {
      setProject((current) =>
        updateSpeechCaptions(current, {
          ...options,
          onlyMissing: false,
          draftOnly: true,
        }),
      );
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
  const reportError = useCallback((error: unknown) => {
    setNotice({
      text: error instanceof Error ? error.message : '操作失败，请重试。',
      error: true,
    });
  }, []);
  useEffect(() => {
    let active = true;
    Promise.all([
      api.getDraft().then((draft) => {
        if (active) {
          setProject(draft.project);
          setDraftLoaded(true);
        }
        return draft;
      }),
      api.getLatestJob().then((latest) => {
        if (active && latest?.status === JobStatus.Rendering) setJob(latest);
        return latest;
      }),
    ])
      .then(([{ project: draft, mediaExpired, mediaError }, latest]) => {
        if (active) {
          setProject(draft);
          if (mediaExpired || mediaError)
            setNotice({
              text:
                mediaError ??
                '旧草稿文字已恢复，部分素材没有本地备份且已过期，请重新上传这些素材。',
              error: true,
            });
          setJob(
            latest?.status === JobStatus.Rendering ||
              latest?.sessionId === draft.sessionId
              ? latest
              : null,
          );
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
  }, [reportError]);
  useBackgroundJob(job, {
    read: api.getJob,
    onChange: setJob,
    onError: reportError,
  });

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
        setWork('原片已上传，正在保存草稿数据…');
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
  function selectTemplate(videoTemplate: VideoTemplate) {
    if (busy) return;
    if (videoTemplate === project.videoTemplate) return;
    setProject((current) => ({ ...current, videoTemplate }));
    setNotice({
      text: `片内样式已切换为${VIDEO_TEMPLATE_MAP[videoTemplate].name}；封面来源与封面样式保持当前选择。`,
      error: false,
    });
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
  /** Submit the frozen snapshot immediately; browser draft backup never controls server execution. */
  function exportVideo() {
    setWork('正在提交免费本地导出…');
    setNotice({ text: '', error: false });
    api
      .createJob(project)
      .then(setJob)
      .catch((failure: unknown) =>
        api
          .getLatestJob()
          .then((latest) => {
            if (
              latest &&
              latest.id !== job?.id &&
              latest.status !== JobStatus.Failed &&
              latest.sessionId === project.sessionId &&
              (latest.videoTemplate ?? VideoTemplate.Classic) ===
                project.videoTemplate
            ) {
              setJob(latest);
              setNotice({
                text: '已找回服务端接收的后台任务，可以切换应用，回来后继续查看进度。',
                error: false,
              });
            } else reportError(failure);
          })
          .catch(() => reportError(failure)),
      )
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
    const assertActive = upload.guardBatch();
    selected
      .reduce(
        (chain, file, index) =>
          chain.then(() => {
            assertActive();
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
              assertActive();
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
                  text: `已添加${next.materials.length}份房屋素材，草稿已保存到当前账号。`,
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

  /** Replace one source atomically; preserve its position and copy, bounding ranges to the new clip. */
  function replaceMaterial(id: string, file: File | undefined) {
    const source = materials.find((item) => item.id === id);
    if (!file || !source || busy) return;
    const video = source.kind === HouseMediaKind.Video;
    if (file.size > (video ? VIDEO_UPLOAD_MAX_BYTES : 20 * 1024 * 1024)) {
      reportError(new Error('替换文件超出大小限制。'));
      return;
    }
    setWork(`正在替换“${file.name}”，完成前保留原素材…`);
    setNotice({ text: '', error: false });
    const pending: Promise<HouseMaterial> = video
      ? upload.uploadVideo(file).then((asset) => {
          if (asset.duration < 2) throw new Error('房屋视频至少需要2秒。');
          return { id, kind: HouseMediaKind.Video, video: asset };
        })
      : studioApi.uploadImage(file).then((asset) => ({ ...source, ...asset }));
    pending
      .then((replacement) => {
        const duration =
          replacement.kind === HouseMediaKind.Video
            ? replacement.video.duration
            : replacement.duration;
        return saveUpdated({
          ...project,
          house: null,
          materials: materials.map((item) =>
            item.id === id ? replacement : item,
          ),
          shots: project.shots.map((shot) => {
            if (getShotMaterial(materials, shot)?.id !== id) return shot;
            return {
              ...shot,
              sourceId: id,
              start: Math.min(shot.start, duration - 2),
              end: Math.min(shot.end, duration),
            };
          }),
        });
      })
      .then(() =>
        setNotice({
          text: '素材已替换，顺序和文案已保留，片段范围已适配新时长。',
          error: false,
        }),
      )
      .catch(reportError)
      .finally(() => setWork(null));
  }
  return {
    replaceMaterial,
    selectTemplate,
    setSubtitleBusy,
    updateSubtitles,
    stageSpeechDraft,
    setCleanBusy,
    project,
    draftStatus: currentDraft.status,
    upload,
    materials,
    job,
    busy,
    work: work && elapsed >= 10 ? `${work}（已等待${elapsed}秒）` : work,
    notice,
    inputError,
    ready,
    newProject: () => {
      setWork('正在新建房源视频…');
      setNotice({ text: '', error: false });
      api
        .createDraft()
        .then((next) =>
          api.saveDraft(next).then(() => {
            setProject(next);
            setDraftLoaded(true);
            setJob(null);
            setNotice({
              text: '已新建空房源视频，已加入默认轻钢琴配乐；可在声音设置更换或关闭。',
              error: false,
            });
          }),
        )
        .catch(reportError)
        .finally(() => setWork(null));
    },
    patch,
    patchShot,
    uploadVideo,
    removeOpening: () => patch({ opening: null }),
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
      currentDraft
        .save()
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
