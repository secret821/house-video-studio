/** Both editors observe and cancel the same workspace upload, including uploads started on another device. */
import { useEffect, useRef, useState } from 'react';

import { createMediaId } from '../../../services/definition/media-id';
import {
  VIDEO_UPLOAD_TIMEOUT_MS,
  VideoUploadPhase,
  type VideoUploadTaskInfo,
} from '../../../services/definition/video-upload';
import api, { type VideoUploadOptions } from './video-edit-api';
import studioApi from '../photo/api';

const PHASE_LABELS = {
  [VideoUploadPhase.Waiting]: '已上传，等待服务器处理资源',
  [VideoUploadPhase.Receiving]: '正在上传',
  [VideoUploadPhase.Processing]: '校验视频信息（不转码）',
  [VideoUploadPhase.Cancelling]: '正在终止处理并释放占用',
};

/** A local abort stops transfer immediately; the server acknowledgment confirms descendant cleanup. */
export function useVideoUpload() {
  const [local, setLocal] = useState<VideoUploadTaskInfo | null>(null);
  const [remote, setRemote] = useState<VideoUploadTaskInfo | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [error, setError] = useState('');
  const [temporaryMedia, setTemporaryMedia] = useState(false);
  const [now, setNow] = useState(Date.now);
  const operation = useRef<{ id: string; controller: AbortController } | null>(
    null,
  );
  const mounted = useRef(true);
  const cancelRevision = useRef(0);
  let active = local ?? remote;
  if (local && remote?.id === local.id)
    active = {
      ...remote,
      name: local.name,
      deadline: Math.min(local.deadline, remote.deadline),
    };
  const remaining = active
    ? Math.max(0, Math.ceil((active.deadline - now) / 1000))
    : 0;
  const phase = cancelling ? VideoUploadPhase.Cancelling : active?.phase;
  let message = '';
  if (cancelling) message = '正在终止处理并释放服务器占用…';
  if (active && phase) {
    const name = local?.id === active.id ? local.name : active.name;
    message = `${PHASE_LABELS[phase]}：${name} · 限时15分钟，剩余${Math.floor(remaining / 60)}分${remaining % 60}秒`;
  }

  useEffect(() => {
    mounted.current = true;
    let live = true;
    let timer: ReturnType<typeof setTimeout>;
    /** Serial polling discovers remote-device uploads without overlapping requests. */
    function poll() {
      api
        .getUploadStatus()
        .then((status) => {
          if (live) {
            setRemote(status.active);
            setTemporaryMedia(status.temporaryMedia);
            setError('');
          }
        })
        .catch((failure: unknown) => {
          if (live)
            setError(
              failure instanceof Error ? failure.message : '无法读取上传状态。',
            );
        })
        .finally(() => {
          if (live) timer = setTimeout(poll, 2000);
        });
    }
    poll();
    return () => {
      live = false;
      mounted.current = false;
      cancelRevision.current += 1;
      clearTimeout(timer);
      operation.current?.controller.abort();
    };
  }, []);

  const id = active?.id;
  useEffect(() => {
    if (!id) return;
    setNow(Date.now());
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [id]);

  /** Keep a whole batch cancellable: rejection stops the caller's sequential file chain. */
  function run<T>(
    file: File,
    send: (file: File, options: VideoUploadOptions) => Promise<T>,
  ): Promise<T> {
    if (operation.current || remote)
      return Promise.reject(
        new Error('已有视频正在上传或处理，请先取消当前上传。'),
      );
    const id = createMediaId();
    const controller = new AbortController();
    operation.current = { id, controller };
    const startedAt = Date.now();
    setError('');
    setLocal({
      id,
      name: file.name,
      phase: VideoUploadPhase.Receiving,
      startedAt,
      deadline: startedAt + VIDEO_UPLOAD_TIMEOUT_MS,
    });
    return send(file, { id, signal: controller.signal })
      .then((value) => {
        controller.signal.throwIfAborted();
        if (!mounted.current) throw new Error('上传页面已关闭。');
        return value;
      })
      .finally(() => {
        if (operation.current?.id === id) operation.current = null;
        if (mounted.current) {
          setLocal(null);
          setRemote((current) => (current?.id === id ? null : current));
        }
      });
  }

  /** An ID-scoped cancel can safely be clicked from a second device in this shared workspace. */
  function cancelUpload() {
    if (!active || cancelling) return;
    const id = active.id;
    cancelRevision.current += 1;
    setCancelling(true);
    setError('');
    if (operation.current?.id === id) operation.current.controller.abort();
    api
      .cancelUpload(id)
      .then((status) => {
        if (mounted.current) setRemote(status.active);
      })
      .catch((failure: unknown) => {
        if (mounted.current)
          setError(
            `取消尚未确认，请重试。${failure instanceof Error ? failure.message : ''}`,
          );
      })
      .finally(() => {
        if (mounted.current) setCancelling(false);
      });
  }

  return {
    guardBatch: () => {
      const revision = cancelRevision.current;
      return () => {
        if (!mounted.current || revision !== cancelRevision.current)
          throw new Error('已终止本批上传，已保存的素材保留，可重新选择视频。');
      };
    },
    active,
    temporaryMedia,
    busy: Boolean(active || cancelling),
    cancelling: cancelling || active?.phase === VideoUploadPhase.Cancelling,
    message,
    error,
    cancelUpload,
    uploadVideo: (file: File) => run(file, api.uploadVideo),
    uploadOpeningVideo: (file: File) => run(file, studioApi.uploadOpeningVideo),
  };
}
