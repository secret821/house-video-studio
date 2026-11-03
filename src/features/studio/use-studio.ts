/** Owns editor state, sequential uploads, speech generation and real job polling. */
import { VIDEO_UPLOAD_MAX_BYTES } from '../../services/definition/video-upload';
import { useCallback, useEffect, useState } from 'react';
import { createMediaId } from '../../services/definition/media-id';

import {
  EMPTY_PROJECT,
  JobStatus,
  Motion,
  VideoTemplate,
  VIDEO_TEMPLATE_MAP,
  type Project,
  type RenderJob,
  type Scene,
} from '../../services/definition/project';

import api from './api';
import { musicApi } from './music-api';
import type { MusicChoice } from '@/services/definition/music-library';
import { useVideoUpload } from './use-video-upload';
import { useCurrentDraft } from './use-current-draft';
import { useBackgroundJob } from './use-background-job';

enum Work {
  Loading = '正在读取本机草稿…',
  Upload = '正在上传素材…',
  Music = '正在准备背景音乐…',
  Speech = '正在生成中文解说…',
  Saving = '正在保存…',
  Starting = '正在提交导出…',
  Opening = '正在本地处理开场视频，请稍候…',
}

/** The complete editor workflow stays local to the studio page. */
export function useStudio() {
  const upload = useVideoUpload();
  const [project, setProject] = useState<Project>(EMPTY_PROJECT);
  const [draftLoaded, setDraftLoaded] = useState(false);
  const currentDraft = useCurrentDraft({
    project,
    loaded: draftLoaded,
    save: api.saveDraft,
  });
  const [selectedId, setSelectedId] = useState('');
  const [work, setWork] = useState<Work | null>(Work.Loading);
  const [notice, setNotice] = useState({ text: '', error: false });
  const [job, setJob] = useState<RenderJob | null>(null);
  const [speechCapability, setSpeechCapability] = useState({
    localSpeechReady: false,
    speechReady: false,
    speechMessage: '正在检查 Kokoro 本地配音…',
  });
  const selected =
    project.scenes.find((scene) => scene.id === selectedId) ??
    project.scenes[0];
  const rendering = job?.status === JobStatus.Rendering;
  const busy = work !== null || rendering || upload.busy;

  /** Display failures rather than leaving rejected background work invisible. */
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
          if (draft.project) setProject(draft.project);
          setDraftLoaded(true);
        }
        return draft;
      }),
      api.getCapabilities(),
      api.getLatestRender().then((latest) => {
        if (active && latest?.status === JobStatus.Rendering) setJob(latest);
        return latest;
      }),
    ])
      .then(
        ([
          { project: draft, mediaExpired, mediaError },
          capabilities,
          latest,
        ]) => {
          if (!active) return;
          if (draft) setProject(draft);
          if (mediaExpired || mediaError)
            setNotice({
              text:
                mediaError ??
                '旧草稿文字已恢复，部分素材没有本地备份且已过期，请重新上传这些素材。',
              error: true,
            });
          setSpeechCapability(capabilities);
          setJob(
            latest?.status === JobStatus.Rendering ||
              latest?.sessionId === draft?.sessionId
              ? latest
              : null,
          );
        },
      )
      .catch((error: unknown) => {
        if (active)
          setNotice({
            text: error instanceof Error ? error.message : '读取失败',
            error: true,
          });
      })
      .finally(() => {
        if (active) setWork(null);
      });
    return () => {
      active = false;
    };
  }, [reportError]);

  useBackgroundJob(job, {
    read: api.getRender,
    onChange: setJob,
    onError: reportError,
  });

  /** Attach a local video only after normalization succeeds; failed replacements retain the prior opening. */
  function addOpeningVideo(file: File | undefined) {
    if (!file) return;
    if (file.size > VIDEO_UPLOAD_MAX_BYTES) {
      reportError(new Error('开场视频请控制在1GB以内。'));
      return;
    }
    setWork(Work.Opening);
    setNotice({ text: '', error: false });
    upload
      .uploadOpeningVideo(file)
      .then((opening) => {
        const completed = { ...project, opening };
        setProject(completed);
        return api.saveDraft(completed);
      })
      .then(() =>
        setNotice({
          text: '开场视频已保存到本机，将保留原声并接在房源照片前。',
          error: false,
        }),
      )
      .catch(reportError)
      .finally(() => setWork(null));
  }

  /** Keep old audio available for comparison; stale speech blocks export until explicitly replaced or removed. */
  function patchScene(patch: Partial<Scene>) {
    if (!selected) return;
    setProject((current) => ({
      ...current,
      scenes: current.scenes.map((scene) => {
        if (scene.id !== selected.id) return scene;
        return { ...scene, ...patch };
      }),
    }));
  }

  /** Keep scene order explicit and preserve entity identifiers through moves. */
  function moveScene(offset: number) {
    if (!selected) return;
    const index = project.scenes.findIndex((scene) => scene.id === selected.id);
    const target = index + offset;
    if (target < 0 || target >= project.scenes.length) return;
    const scenes = [...project.scenes];
    [scenes[index], scenes[target]] = [scenes[target], scenes[index]];
    setProject({ ...project, scenes });
    setSelectedId(selected.id);
  }

  /** Sequential image uploads retain earlier successes if a later image fails. */
  function addPhotos(files: FileList | readonly File[] | null) {
    if (!files?.length) return;
    if (project.scenes.length + files.length > 20) {
      reportError(new Error('最多支持20个场景，请减少照片数量。'));
      return;
    }
    setWork(Work.Upload);
    Array.from(files)
      .reduce(
        (chain, file) =>
          chain
            .then(() => api.uploadImage(file))
            .then((asset) => {
              const scene: Scene = {
                id: createMediaId(),
                src: asset.src,
                title: file.name.replace(/\.[^.]+$/, '').slice(0, 32),
                narration: '',
                seconds: 5,
                motion: Motion.Push,
                voiceover: null,
              };
              setProject((current) => ({
                ...current,
                scenes: [...current.scenes, scene],
              }));
              setSelectedId(scene.id);
            }),
        Promise.resolve(),
      )
      .catch(reportError)
      .finally(() => setWork(null));
  }

  /** Upload either narration for the selected scene or a background-music track. */
  function addAudio(file: File | undefined, narration: boolean) {
    if (!file) return;
    setWork(Work.Upload);
    api
      .uploadAudio(file)
      .then((audio) => {
        if (narration) patchScene({ voiceover: audio });
        else setProject((current) => ({ ...current, music: audio }));
      })
      .catch(reportError)
      .finally(() => setWork(null));
  }

  /** Export the current snapshot; the page remains locked while it renders. */
  function exportVideo() {
    setNotice({ text: '', error: false });
    setWork(Work.Starting);
    api
      .createRender(project)
      .then(setJob)
      .catch((failure: unknown) =>
        api
          .getLatestRender()
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

  /** Only the selected scene is submitted to offline Kokoro synthesis. */
  function generateSceneSpeech() {
    if (!selected || !selected.narration.trim()) return;
    setWork(Work.Speech);
    setNotice({ text: '', error: false });
    api
      .generateLocalNarration(selected)
      .then((updated) => {
        const completed = {
          ...project,
          scenes: project.scenes.map((scene) =>
            scene.id === updated.id ? updated : scene,
          ),
        };
        setProject(completed);
        return api.saveDraft(completed);
      })
      .then(() =>
        setNotice({
          text: '当前图片 Kokoro 配音已就绪，其余配音和人物开场已保留。',
          error: false,
        }),
      )
      .catch(reportError)
      .finally(() => setWork(null));
  }

  return {
    selectTemplate: (videoTemplate: VideoTemplate) => {
      if (busy || videoTemplate === project.videoTemplate) return;
      const next = { ...project, videoTemplate };
      setProject(next);
      setNotice({
        text: `已切换为${VIDEO_TEMPLATE_MAP[videoTemplate].name}，照片和房源信息保持不变，点击“重新生成成片”制作另一版。`,
        error: false,
      });
    },
    upload,
    project,
    draftStatus: currentDraft.status,
    selected,
    busy,
    work,
    notice,
    job,
    newProject: () => {
      const next = {
        ...EMPTY_PROJECT,
        name: '新房源视频',
        sessionId: createMediaId(),
      };
      setWork(Work.Saving);
      setNotice({ text: '', error: false });
      api
        .saveDraft(next)
        .then(() => {
          setProject(next);
          setDraftLoaded(true);
          setSelectedId('');
          setJob(null);
          setNotice({
            text: '已新建空房源视频，当前草稿已替换，旧草稿已替换，不再引用的素材将在空闲后清理。',
            error: false,
          });
        })
        .catch(reportError)
        .finally(() => setWork(null));
    },
    speechCapability,
    addOpeningVideo,
    removeOpening: () => setProject({ ...project, opening: null }),
    setProject,
    setSelectedId,
    patchScene,
    moveScene,
    addPhotos,
    addAudio,
    selectMusic: (choice: MusicChoice, signal?: AbortSignal) => {
      setWork(Work.Music);
      return musicApi
        .select(choice, signal)
        .then((music) =>
          setProject((current) => ({
            ...current,
            music,
            musicVolume: current.musicVolume || EMPTY_PROJECT.musicVolume,
          })),
        )
        .finally(() => setWork(null));
    },
    exportVideo,
    generateLocalSpeech: generateSceneSpeech,
    removeScene: () => {
      if (selected)
        setProject({
          ...project,
          scenes: project.scenes.filter((scene) => scene.id !== selected.id),
        });
    },
    loadDemo: () => {
      setWork(Work.Loading);
      api
        .getDemo()
        .then(setProject)
        .then(() =>
          setNotice({
            text: '已载入演示照片。可先生成中文解说，再导出样片。',
            error: false,
          }),
        )
        .catch(reportError)
        .finally(() => setWork(null));
    },
    saveDraft: () => {
      setWork(Work.Saving);
      currentDraft
        .save()
        .then(() =>
          setNotice({
            text: '草稿已保存到当前账号，下次打开自动载入。',
            error: false,
          }),
        )
        .catch(reportError)
        .finally(() => setWork(null));
    },
    importProject: (file: File | undefined) => {
      if (!file) return;
      setWork(Work.Loading);
      api
        .importProject(file)
        .then(setProject)
        .catch(reportError)
        .finally(() => setWork(null));
    },
    generateSpeech: () => {
      setWork(Work.Speech);
      api
        .generateNarration(project.scenes)
        .then((scenes) => {
          const completed = { ...project, scenes };
          setProject(completed);
          return api.saveDraft(completed);
        })
        .then(() =>
          setNotice({
            text: '仅缺失或过期的解说已更新，其余配音已复用。',
            error: false,
          }),
        )
        .catch(reportError)
        .finally(() => setWork(null));
    },
  };
}
