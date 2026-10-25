/** Shared studio copy suggestions remain separate from authored text until the user explicitly applies them. */
import { Button, Checkbox } from 'animal-island-ui';
import { useEffect, useState } from 'react';

import {
  COPY_MODEL,
  CopyKind,
  type CopyInput,
  type CopyResult,
} from '../../services/definition/copy';

import api from './api';

/** Bind each result to its exact facts, selected scene and shot ranges; changes hide stale suggestions. */
export function CopyGenerator({
  input,
  disabled,
  onApply,
}: {
  input: CopyInput;
  disabled: boolean;
  onApply: (result: CopyResult) => void;
}) {
  const [capability, setCapability] = useState({
    ready: false,
    message: '正在检查百炼文案配置…',
  });
  const [confirmed, setConfirmed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState<{
    identity: string;
    result: CopyResult;
  } | null>(null);
  const [applied, setApplied] = useState(false);
  const identity = JSON.stringify(input);
  const result = saved?.identity === identity ? saved.result : null;
  useEffect(() => {
    let active = true;
    api
      .getCopyCapability()
      .then((value) => {
        if (active) setCapability(value);
      })
      .catch((error: unknown) => {
        if (active)
          setCapability({
            ready: false,
            message:
              error instanceof Error
                ? error.message
                : '文案配置读取失败，请刷新。',
          });
      });
    return () => {
      active = false;
    };
  }, []);

  /** Generation never alters current copy or starts narration/rendering, even if facts change while awaiting the response. */
  function generate() {
    if (!confirmed) return;
    setLoading(true);
    setError('');
    setApplied(false);
    api
      .generateCopy(input, true)
      .then((result) => setSaved({ identity, result }))
      .catch((error: unknown) =>
        setError(
          error instanceof Error ? error.message : '文案生成失败，请重试。',
        ),
      )
      .finally(() => setLoading(false));
  }
  return (
    <section
      aria-label="百炼画面文案"
      className="space-y-3 border-t border-line pt-5"
    >
      <h3 className="text-lg leading-7 font-medium text-ink">按画面生成文案</h3>
      <p className="text-xs text-muted">
        {input.kind === CopyKind.Photo
          ? '只发送当前房源图片及已填房源信息，不发送人物开场。'
          : '在本机为每段抽取两张关键帧，再发送到百炼；不发送人物开场与视频声音。生成的是画面说明，不是原声逐字字幕。'}
      </p>
      <p className="text-xs text-muted">
        {COPY_MODEL} · {capability.message}{' '}
        <a
          className="text-primary-hover underline"
          href="https://bailian.console.aliyun.com/"
          target="_blank"
          rel="noopener noreferrer"
        >
          打开百炼控制台
        </a>
      </p>
      <Checkbox
        disabled={disabled || loading}
        options={[
          {
            value: 'free',
            label: '我已在百炼确认免费额度，并开启该模型“免费额度用完即停”',
          },
        ]}
        value={confirmed ? ['free'] : []}
        onChange={(values) => setConfirmed(values.includes('free'))}
      />
      <p className="text-xs text-muted">
        本程序无法读取免费余额或设置上述开关；未开启时可能按量计费。仅点击生成才调用，已有相同结果优先复用。
      </p>
      <Button
        className="island-action w-full"
        disabled={disabled || loading || !capability.ready || !confirmed}
        loading={loading}
        onClick={generate}
      >
        {input.kind === CopyKind.Photo
          ? '看图生成当前照片文案'
          : '看关键帧生成逐段文案'}
      </Button>
      {loading && (
        <p role="status" className="text-xs text-muted">
          正在整理画面并生成建议，请稍候…
        </p>
      )}
      {error && (
        <p role="alert" className="text-xs text-danger">
          {error}
        </p>
      )}
      {result && (
        <div className="space-y-4" aria-label="待采纳文案建议">
          <p className="text-xs text-muted">
            {result.cached ? '已复用缓存，未再次调用模型。' : '建议已生成。'}
            请核对房源事实和画面，采纳后仍可编辑。
          </p>
          {result.items.map((item) => (
            <div key={item.id} className="space-y-2 border-t border-line pt-3">
              <p className="font-bold text-ink">{item.title}</p>
              {input.kind === CopyKind.Photo && (
                <p className="text-sm text-body">解说：{item.narration}</p>
              )}
              <p className="text-sm text-body">字幕：{item.caption}</p>
              <p className="text-xs text-muted">画面依据：{item.evidence}</p>
            </div>
          ))}
          <Button
            type="primary"
            className="island-action w-full"
            disabled={disabled || loading || applied}
            onClick={() => {
              onApply(result);
              setApplied(true);
            }}
          >
            {applied ? '已采纳，可继续编辑' : '采纳以上文案'}
          </Button>
          {input.kind === CopyKind.Photo && (
            <p className="text-xs text-muted">
              采纳不生成配音；已有配音若与新解说不符，需要明确更新或移除后再导出。
            </p>
          )}
        </div>
      )}
    </section>
  );
}
