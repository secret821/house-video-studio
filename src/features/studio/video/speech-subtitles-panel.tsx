/** Recognition is an editable draft; only explicit adoption changes speech captions. */
import {
  CheckOutlined,
  DeleteOutlined,
  AudioOutlined,
} from '@ant-design/icons';
import {
  Button,
  Flex,
  Input,
  Select,
  Checkbox,
  Collapse,
  InputNumber,
  Popconfirm,
  ButtonAppearance,
} from '../../../share/ui';
import { useCallback, useEffect, useRef, useState } from 'react';

import { JobStatus } from '@/services/definition/project';
import {
  speechCaptionsSchema,
  type SpeechCaption,
  type SubtitleJob,
} from '@/services/definition/subtitles';

import api, { VideoEditRequestError } from './video-edit-api';
import { getSpeechVideos } from './speech-subtitles';
import type { useVideoEdit } from './use-video-edit';

const PAGE_SIZE = 20;
export function SpeechSubtitlesPanel({
  editor,
}: {
  editor: ReturnType<typeof useVideoEdit>;
}) {
  const { project, busy, setSubtitleBusy, updateSubtitles, stageSpeechDraft } =
    editor;
  const [capability, setCapability] = useState({
    ready: false,
    message: '正在检查本地原声识别…',
  });
  const [selection, setSelection] = useState('opening');
  const [job, setJob] = useState<SubtitleJob | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [page, setPage] = useState(0);
  const alive = useRef(true);
  const received = useRef(new Set<string>());
  const clips = getSpeechVideos(project);
  const selected = clips.find((clip) => clip.key === selection) ?? clips[0];
  const draft = selected?.video.speechDraft;
  const captions = draft ?? selected?.video.speechCaptions ?? [];
  const changed =
    draft !== undefined && draft !== selected?.video.speechCaptions;
  const validation = speechCaptionsSchema.safeParse(captions);
  const invalidTime =
    selected &&
    captions.some(
      (cue) => cue.endMs > Math.ceil(selected.video.duration * 1000),
    );
  let validationMessage = '';
  if (invalidTime) validationMessage = '字幕时间超出原片，请修改后添加。';
  else if (!validation.success)
    validationMessage = validation.error.issues[0].message;
  const polling = job?.status === JobStatus.Rendering;
  const recognizing = submitting || polling;
  const jobId = job?.id;
  const canRecognize = !busy && capability.ready && selected?.video.hasAudio;
  const shownPage = Math.min(
    page,
    Math.max(0, Math.ceil(captions.length / PAGE_SIZE) - 1),
  );

  useEffect(() => {
    alive.current = true;
    let active = true;
    Promise.all([api.getSubtitleCapability(), api.getLatestSubtitleJob()])
      .then(([next, latest]) => {
        if (!active) return;
        setCapability(next);
        // Resume a running task, but never silently reapply an old completed result.
        if (latest?.status === JobStatus.Rendering) setJob(latest);
      })
      .catch((reason: unknown) => {
        if (active)
          setError(
            reason instanceof Error
              ? reason.message
              : '读取识别状态失败，请刷新重试。',
          );
      });
    return () => {
      active = false;
      alive.current = false;
      setSubtitleBusy(false);
    };
  }, [setSubtitleBusy]);

  useEffect(() => {
    setSubtitleBusy(recognizing);
  }, [recognizing, setSubtitleBusy]);

  const recognize = useCallback((src: string) => {
    setSubmitting(true);
    setJob(null);
    setError('');
    return api
      .createSubtitleJob(src)
      .then((next) => {
        if (alive.current) setJob(next);
      })
      .catch((reason: unknown) => {
        if (alive.current)
          setError(reason instanceof Error ? reason.message : '启动识别失败。');
      })
      .finally(() => {
        if (alive.current) setSubmitting(false);
      });
  }, []);

  /** A late result can only stage text for its original, still-present source. */
  useEffect(() => {
    if (job?.status !== JobStatus.Complete || received.current.has(job.id))
      return;
    received.current.add(job.id);
    if (!getSpeechVideos(project).some(({ video }) => video.src === job.src))
      return;
    stageSpeechDraft({ src: job.src, captions: job.captions });
    setPage(0);
  }, [job, project, stageSpeechDraft]);

  useEffect(() => {
    if (!polling || !jobId) return;
    let active = true;
    let timer: ReturnType<typeof setTimeout>;
    function poll() {
      api
        .getSubtitleJob(jobId!)
        .then((next) => {
          if (!active) return;
          setJob(next);
          if (next.status === JobStatus.Rendering)
            timer = setTimeout(poll, 1200);
        })
        .catch((reason: unknown) => {
          if (!active) return;
          const message =
            reason instanceof Error ? reason.message : '读取进度失败，请重试。';
          setError(message);
          if (
            reason instanceof VideoEditRequestError &&
            reason.status >= 400 &&
            reason.status < 500 &&
            reason.status !== 429
          ) {
            setJob(
              (current) =>
                current && { ...current, status: JobStatus.Failed, message },
            );
            return;
          }
          timer = setTimeout(poll, 3000);
        });
    }
    poll();
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [polling, jobId]);

  function stage(next: Array<SpeechCaption>) {
    if (selected) stageSpeechDraft({ src: selected.video.src, captions: next });
  }
  function adopt() {
    if (!selected || busy || validationMessage || !changed) return;
    updateSubtitles({ src: selected.video.src, captions, onlyMissing: false });
    if (captions.length > 0) editor.patch({ subtitlesEnabled: true });
  }
  function editCue(id: string, patch: Partial<SpeechCaption>) {
    stage(captions.map((cue) => (cue.id === id ? { ...cue, ...patch } : cue)));
  }
  function cancel() {
    if (!job) return;
    api
      .cancelSubtitleJob(job.id)
      .then((next) => {
        if (alive.current) setJob(next);
      })
      .catch((reason: unknown) => {
        if (alive.current)
          setError(
            reason instanceof Error ? reason.message : '取消失败，请重试。',
          );
      });
  }
  return (
    <Collapse
      className="studio-disclosure mt-6"
      ghost
      defaultActiveKey={['panel']}
      expandIconPlacement="end"
      items={[
        {
          key: 'panel',
          label: <>原声字幕 · 生成后编辑（免费）</>,
          forceRender: true,
          children: (
            <>
              <div className="flex flex-col gap-6 pt-4">
                <p className="text-sm leading-6 text-muted">
                  选择视频并生成原声字幕，修改识别文案后点击“添加到视频”。默认不添加，不影响原来的房源文案、镜头字幕或配音；小区名和数字请核对。
                </p>
                <p className="text-xs leading-5 text-muted">
                  {capability.message}
                </p>
                {!clips.length && (
                  <p className="text-sm text-muted">
                    上传人物开场或房屋视频后，可主动生成原声字幕。
                  </p>
                )}
                {selected && (
                  <>
                    <label className="block">
                      <span className="mb-2 block text-body font-medium">
                        查看或修改哪份视频的字幕
                      </span>
                      <div className="island-select">
                        <Select
                          fieldNames={{ value: 'key', label: 'label' }}
                          aria-label="查看或修改哪份视频的字幕"
                          value={selected.key}
                          disabled={busy}
                          options={clips.map((clip) => ({
                            key: clip.key,
                            label: clip.label,
                          }))}
                          onChange={(key) => {
                            setSelection(String(key));
                            setPage(0);
                            setError('');
                          }}
                        />
                      </div>
                    </label>
                    {!selected.video.hasAudio && (
                      <p className="text-sm text-muted">
                        这份视频没有音轨，请换一份有讲话的视频。
                      </p>
                    )}
                    <Flex wrap align="center" gap={12}>
                      <Popconfirm
                        title="重新生成会替换待编辑的识别文案，已添加的字幕保持到再次确认。继续？"
                        disabled={!canRecognize || draft === undefined}
                        onConfirm={() => recognize(selected.video.src)}
                      >
                        <Button
                          icon={<AudioOutlined />}
                          disabled={!canRecognize || recognizing}
                          loading={recognizing}
                          onClick={() => {
                            if (draft === undefined)
                              void recognize(selected.video.src);
                          }}
                        >
                          生成原声字幕
                        </Button>
                      </Popconfirm>
                      {recognizing && job && (
                        <Button onClick={cancel}>取消识别</Button>
                      )}
                    </Flex>
                    {draft?.length === 0 && (
                      <p className="text-sm text-muted">
                        当前文案为空；可重新生成，或确认移除这份视频已添加的原声字幕。
                      </p>
                    )}
                  </>
                )}
                {job && (recognizing || job.src === selected?.video.src) && (
                  <p role="status" className="text-sm leading-6 text-muted">
                    {job.status === JobStatus.Complete
                      ? '识别完成。请编辑下方文案，确认后再添加到视频。'
                      : job.message}
                  </p>
                )}
                {error && (
                  <p role="alert" className="text-sm text-danger">
                    {error}
                  </p>
                )}
                {captions.length > 0 && (
                  <>
                    <p className="text-sm text-ink">
                      共{captions.length}条 ·
                      时间对应所选原片；修改后需确认添加才会用于预览和成片
                    </p>
                    <div className="space-y-4">
                      {captions
                        .slice(
                          shownPage * PAGE_SIZE,
                          (shownPage + 1) * PAGE_SIZE,
                        )
                        .map((cue) => (
                          <div
                            className="rounded-xl border border-line p-4"
                            key={cue.id}
                          >
                            <div className="grid grid-cols-2 gap-3">
                              <label>
                                <span className="mb-2 block text-body font-medium">
                                  开始 / 秒
                                </span>
                                <InputNumber
                                  min={0}
                                  step={0.01}
                                  value={cue.startMs / 1000}
                                  disabled={busy}
                                  aria-label={`字幕${cue.id}开始时间`}
                                  onChange={(value) => {
                                    if (value === null) return;
                                    editCue(cue.id, {
                                      startMs: Math.round(value * 1000),
                                    });
                                  }}
                                />
                              </label>
                              <label>
                                <span className="mb-2 block text-body font-medium">
                                  结束 / 秒
                                </span>
                                <InputNumber
                                  min={0}
                                  step={0.01}
                                  value={cue.endMs / 1000}
                                  disabled={busy}
                                  aria-label={`字幕${cue.id}结束时间`}
                                  onChange={(value) => {
                                    if (value === null) return;
                                    editCue(cue.id, {
                                      endMs: Math.round(value * 1000),
                                    });
                                  }}
                                />
                              </label>
                            </div>
                            <label className="mt-3 block">
                              <span className="mb-2 block text-body font-medium">
                                字幕文字
                              </span>
                              <Input.TextArea
                                autoSize={{ minRows: 2, maxRows: 4 }}
                                value={cue.text}
                                maxLength={28}
                                disabled={busy}
                                aria-label={`字幕文字${cue.id}`}
                                onChange={(event) =>
                                  editCue(cue.id, { text: event.target.value })
                                }
                              />
                            </label>
                            <Button
                              className="mt-3"
                              icon={<DeleteOutlined />}
                              danger
                              disabled={busy}
                              onClick={() =>
                                stage(
                                  captions.filter((item) => item.id !== cue.id),
                                )
                              }
                            >
                              删除这条字幕
                            </Button>
                          </div>
                        ))}
                    </div>
                    {captions.length > PAGE_SIZE && (
                      <Flex wrap align="center" gap={12}>
                        <Button
                          disabled={shownPage === 0}
                          onClick={() => setPage(shownPage - 1)}
                        >
                          上一页
                        </Button>
                        <span className="text-xs text-muted">
                          {shownPage + 1}/
                          {Math.ceil(captions.length / PAGE_SIZE)}
                        </span>
                        <Button
                          disabled={
                            (shownPage + 1) * PAGE_SIZE >= captions.length
                          }
                          onClick={() => setPage(shownPage + 1)}
                        >
                          下一页
                        </Button>
                      </Flex>
                    )}
                    {validationMessage && (
                      <p role="alert" className="text-sm text-danger">
                        {validationMessage}
                      </p>
                    )}
                  </>
                )}
                {/* Keep actions in a real row: inline buttons do not obey vertical spacing utilities. */}
                {selected && (changed || captions.length > 0) && (
                  <Flex wrap align="center" gap={12}>
                    <Popconfirm
                      title="用当前文案替换这份视频已添加的原声字幕？"
                      disabled={
                        !changed ||
                        busy ||
                        Boolean(validationMessage) ||
                        !selected.video.speechCaptions?.length
                      }
                      onConfirm={adopt}
                    >
                      <Button
                        icon={<CheckOutlined />}
                        appearance={ButtonAppearance.Solid}
                        disabled={
                          !changed || busy || Boolean(validationMessage)
                        }
                        onClick={() => {
                          if (!selected.video.speechCaptions?.length) adopt();
                        }}
                      >
                        {changed ? '确认文案并添加到视频' : '已添加到视频'}
                      </Button>
                    </Popconfirm>
                    {selected?.video.speechCaptions?.length ? (
                      <Popconfirm
                        title="移除这份视频的原声字幕？原来的镜头字幕保持不变。"
                        onConfirm={() => {
                          updateSubtitles({
                            src: selected.video.src,
                            captions: [],
                            onlyMissing: false,
                          });
                        }}
                      >
                        <Button
                          icon={<DeleteOutlined />}
                          danger
                          disabled={busy}
                        >
                          移除已添加的原声字幕
                        </Button>
                      </Popconfirm>
                    ) : null}
                  </Flex>
                )}
                <Checkbox
                  className="self-start text-sm text-ink"
                  checked={project.subtitlesEnabled ?? false}
                  disabled={busy}
                  onChange={(event) =>
                    editor.patch({ subtitlesEnabled: event.target.checked })
                  }
                >
                  在预览和成片显示已添加的原声字幕
                </Checkbox>
              </div>
            </>
          ),
        },
      ]}
    />
  );
}
