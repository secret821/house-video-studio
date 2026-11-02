/** One explicit local action analyzes and applies cleaned picture copies, with original speech and a reversible asset swap. */
import { Button, Progress } from 'antd';
import { useEffect, useRef, useState } from 'react';
import { JobStatus } from '@/services/definition/project';
import {
  getHouseMaterials,
  HouseMediaKind,
} from '@/services/definition/video-edit';
import type { CleanJob } from '@/services/definition/smart-clean';
import api, { VideoEditRequestError } from './video-edit-api';
import { applyCleanAssets } from './clean-project';
import type { useVideoEdit } from './use-video-edit';

/** Result application happens once per initiated/resumed job; loading old completed jobs never reapplies an undo. */
export function SmartCleanPanel({
  editor,
}: {
  editor: ReturnType<typeof useVideoEdit>;
}) {
  const { project, patch, setCleanBusy } = editor;
  const [capability, setCapability] = useState({
    ready: false,
    message: '正在检查本地检测…',
  });
  const [job, setJob] = useState<CleanJob | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [undo, setUndo] = useState<CleanJob['results']>([]);
  const [applied, setApplied] = useState(false);
  const requested = useRef<string | null>(null),
    handled = useRef<string | null>(null);
  const active = job?.status === JobStatus.Rendering;
  const working = pending || active;
  const videos = getHouseMaterials(project).flatMap((source) =>
    source.kind === HouseMediaKind.Video ? [source.video] : [],
  );
  useEffect(() => {
    setCleanBusy(working);
    return () => setCleanBusy(false);
  }, [working, setCleanBusy]);
  useEffect(() => {
    let alive = true;
    Promise.all([api.getCleanCapability(), api.getLatestCleanJob()])
      .then(([status, latest]) => {
        if (!alive) return;
        setCapability(status);
        if (latest?.status === JobStatus.Rendering) {
          requested.current = latest.id;
          setJob(latest);
        }
      })
      .catch((reason: unknown) => {
        if (alive)
          setError(
            reason instanceof Error ? reason.message : '无法检查本地清理状态。',
          );
      });
    return () => {
      alive = false;
    };
  }, []);
  const id = job?.id;
  useEffect(() => {
    if (!active || !id) return;
    let alive = true,
      timer: ReturnType<typeof setTimeout>;
    /** Serialize real status reads and stop on expired ownership or files. */
    function poll() {
      api
        .getCleanJob(id!)
        .then((next) => {
          if (!alive) return;
          setJob(next);
          if (next.status === JobStatus.Rendering)
            timer = setTimeout(poll, 1000);
        })
        .catch((reason: unknown) => {
          if (!alive) return;
          setError(
            reason instanceof Error ? reason.message : '清理状态读取失败。',
          );
          if (
            reason instanceof VideoEditRequestError &&
            [401, 403, 404, 409].includes(reason.status)
          )
            setJob(null);
          else timer = setTimeout(poll, 3000);
        });
    }
    poll();
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [active, id]);
  useEffect(() => {
    if (
      !job ||
      job.status !== JobStatus.Complete ||
      requested.current !== job.id ||
      handled.current === job.id
    )
      return;
    handled.current = job.id;
    if (!job.results.length) return;
    try {
      const update = applyCleanAssets(project, job.results);
      patch(update.patch);
      setUndo(update.undo);
      setApplied(true);
      api
        .saveDraft({ ...project, ...update.patch })
        .catch((reason: unknown) =>
          setError(
            reason instanceof Error
              ? reason.message
              : '结果已应用，但浏览器草稿保存失败，请手动保存。',
          ),
        );
    } catch (reason: unknown) {
      setError(reason instanceof Error ? reason.message : '清理结果未应用。');
    }
  }, [job, project, patch]);
  /** Inputs are only current house videos, never the presenter opening or audio. */
  function start() {
    if (editor.busy || !capability.ready || !videos.length) return;
    setPending(true);
    setError('');
    setApplied(false);
    api
      .createCleanJob(videos.map((video) => video.src))
      .then((next) => {
        requested.current = next.id;
        setJob(next);
      })
      .catch((reason: unknown) =>
        setError(reason instanceof Error ? reason.message : '启动清理失败。'),
      )
      .finally(() => setPending(false));
  }
  /** The inverse swap preserves edits made after cleaning, including subtitles and material ordering. */
  function restore() {
    try {
      const update = applyCleanAssets(project, undo);
      patch(update.patch);
      setUndo([]);
      setApplied(false);
      setJob(null);
      setError('');
      api
        .saveDraft({ ...project, ...update.patch })
        .catch((reason: unknown) =>
          setError(
            reason instanceof Error
              ? reason.message
              : '撤回已生效，请手动保存草稿。',
          ),
        );
    } catch (reason: unknown) {
      setError(
        reason instanceof Error ? reason.message : '素材已变化，无法撤回。',
      );
    }
  }
  /** Wait for server-side process cleanup; never free somebody else's queue entry from the browser. */
  function cancel() {
    if (!job) return;
    setPending(true);
    api
      .cancelCleanJob(job.id)
      .then(setJob)
      .catch((reason: unknown) =>
        setError(
          reason instanceof Error ? reason.message : '取消失败，请重试。',
        ),
      )
      .finally(() => setPending(false));
  }
  return (
    <section
      className="mt-6 border-t border-line pt-5"
      aria-label="智能画面清理"
    >
      <div className="flex flex-wrap items-center gap-3">
        <Button
          className="island-action"
          disabled={editor.busy || !capability.ready || !videos.length}
          onClick={start}
        >
          智能清理并应用
        </Button>
        {working && (
          <Button className="island-action" disabled={pending} onClick={cancel}>
            取消清理
          </Button>
        )}
        {!working && undo.length > 0 && (
          <Button
            className="island-action"
            disabled={editor.busy}
            onClick={restore}
          >
            撤回画面清理
          </Button>
        )}
      </div>
      <p className="mt-2 text-xs text-muted">
        避开人物与持续过暗画面 · 保留完整原声 · 自动应用后可撤回
      </p>
      {!capability.ready && (
        <p className="mt-2 text-xs text-muted">{capability.message}</p>
      )}
      {job && (
        <div className="mt-3" aria-live="polite">
          <p className="text-xs text-muted">
            {job.message}
            {applied &&
              job.results.length > 0 &&
              ' 已应用，请预览并重新生成成片。'}
          </p>
          {active && (
            <Progress
              percent={Math.round(job.progress * 100)}
              size="small"
              aria-label="智能画面清理进度"
            />
          )}
          {job.status === JobStatus.Failed && (
            <p role="alert" className="text-xs text-danger">
              原素材未修改。
            </p>
          )}
        </div>
      )}
      {error && (
        <p role="alert" className="mt-2 text-xs text-danger">
          {error}
        </p>
      )}
    </section>
  );
}
