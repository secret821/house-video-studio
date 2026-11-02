/** Owns editor state, sequential uploads, speech generation and real job polling. */
import { VIDEO_UPLOAD_MAX_BYTES } from '../../services/definition/video-upload';
import { useEffect, useState } from 'react';
import { createMediaId } from '../../services/definition/media-id';

import {
  EMPTY_PROJECT,
  JobStatus,
  Motion,
  type Project,
  type RenderJob,
  type Scene,
} from '../../services/definition/project';

import api from './api';
import { musicApi } from './music-api';
import type { MusicChoice } from '@/services/definition/music-library';
import { useVideoUpload } from './use-video-upload';

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
  function reportError(error: unknown) {
    setNotice({
      text: error instanceof Error ? error.message : '操作失败，请重试。',
      error: true,
    });
  }

  useEffect(() => {
    let active = true;
    Promise.all([api.getDraft(), api.getCapabilities(), api.getLatestRender()])
      .then(([{ project: draft, mediaExpired }, capabilities, latest]) => {
        if (!active) return;
        if (draft) setProject(draft);
        if (mediaExpired)
          setNotice({
            text: '草稿文案已恢复，但临时素材已过期或服务已重启，请重新上传素材后生成。',
            error: true,
          });
        setSpeechCapability(capabilities);
        setJob(latest?.sessionId === draft?.sessionId ? latest : null);
      })
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
  }, []);

  const jobId = job?.id;
  useEffect(() => {
    if (!rendering || !jobId) return;
    let active = true;
    let timer: ReturnType<typeof setTimeout>;
    /** Poll once per second after completion of the previous request, never in parallel. */
    function poll() {
      api
        .getRender(jobId!)
        .then((next) => {
          if (!active) return;
          setJob(next);
          if (next.status === JobStatus.Rendering)
            timer = setTimeout(poll, 1000);
        })
        .catch((error: unknown) => {
          if (!active) return;
          setNotice({
            text: `读取导出进度失败：${error instanceof Error ? error.message : '网络异常'}。正在重试。`,
            error: true,
          });
          timer = setTimeout(poll, 3000);
        });
    }
    poll();
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [jobId, rendering]);

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
      .saveDraft(project)
      .then(() => api.createRender(project))
      .then(setJob)
      .catch(reportError)
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
    upload,
    project,
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
          setSelectedId('');
          setJob(null);
          setNotice({
            text: '已新建空房源视频，草稿已保存到当前浏览器。原始素材与历史成片保留。',
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
      api
        .saveDraft(project)
        .then(() =>
          setNotice({
            text: '草稿已保存到本机，下次打开自动载入。',
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
