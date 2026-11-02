/** Shared studio copy suggestions remain separate from authored text until the user explicitly applies them. */
import { Button, Checkbox, Input } from 'antd';
import { useEffect, useState } from 'react';

import {
  COPY_MODEL,
  COPY_RESTRICTED_CLAIMS,
  CopyKind,
  copyResultSchema,
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
  const [brief, setBrief] = useState('');
  const requestInput: CopyInput = { ...input, brief };
  const identity = JSON.stringify(requestInput);
  const result = saved?.identity === identity ? saved.result : null;
  const invalidDraft = Boolean(
    result &&
    (!copyResultSchema.safeParse(result).success ||
      result.items.some(
        (item) =>
          !item.title.trim() ||
          !item.caption.trim() ||
          COPY_RESTRICTED_CLAIMS.some(
            (claim) =>
              `${item.title} ${item.caption} ${input.kind === CopyKind.Photo ? item.narration : ''}`.includes(
                claim,
              ) && !JSON.stringify(input.facts).includes(claim),
          ) ||
          (input.kind === CopyKind.Photo && !item.narration.trim()),
      )),
  );
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
      .generateCopy(requestInput, true)
      .then((result) => setSaved({ identity, result }))
      .catch((error: unknown) =>
        setError(
          error instanceof Error ? error.message : '文案生成失败，请重试。',
        ),
      )
      .finally(() => setLoading(false));
  }

  /** Edits stay in this suggestion draft, preserving shot identities, evidence and the provider's cached result. */
  function editItem(
    id: string,
    field: 'title' | 'narration' | 'caption',
    value: string,
  ) {
    setSaved((current) => {
      if (!current || current.identity !== identity) return current;
      return {
        ...current,
        result: {
          ...current.result,
          items: current.result.items.map((item) =>
            item.id === id ? { ...item, [field]: value } : item,
          ),
        },
      };
    });
    setApplied(false);
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
          : '按片段时长抽取2～6张关键帧，长片段写得更完整；照片直接看图。不发送人物开场与声音，画面说明不等于原声逐字字幕。'}
      </p>
      <label className="block">
        <span className="studio-label">文案要求（可选）</span>
        <Input.TextArea
          aria-label="文案要求"
          className="min-h-24 w-full resize-y px-4 py-3 text-sm"
          maxLength={2000}
          value={brief}
          disabled={disabled || loading}
          onChange={(event) => setBrief(event.target.value)}
          placeholder="例如：自然带看语气，重点说明画面中的布局和收纳；长片段分两三句，不要空泛广告语。房源数字请先填入上方信息。"
        />
      </label>
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
      <Checkbox.Group
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
          {result.warnings?.map((warning) => (
            <p key={warning} role="alert" className="text-sm text-danger">
              {warning}
            </p>
          ))}
          <p className="text-xs text-muted">
            {result.cached ? '已复用缓存，未再次调用模型。' : '建议已生成。'}
            可直接修改下方文案，修改不调用模型；点击采纳后才写入视频。画面依据只读。
          </p>
          {result.items.map((item, index) => (
            <div key={item.id} className="space-y-2 border-t border-line pt-3">
              <label className="block">
                <span className="studio-label">第{index + 1}段 · 标题</span>
                <Input
                  aria-label={`建议第${index + 1}段标题`}
                  value={item.title}
                  maxLength={24}
                  disabled={disabled || loading}
                  onChange={(event) =>
                    editItem(item.id, 'title', event.target.value)
                  }
                />
              </label>
              {input.kind === CopyKind.Photo && (
                <label className="block">
                  <span className="studio-label">
                    解说 · {item.narration.length}/160
                  </span>
                  <Input.TextArea
                    aria-label={`建议第${index + 1}段解说`}
                    className="min-h-24 w-full resize-y px-4 py-3 text-sm"
                    value={item.narration}
                    maxLength={160}
                    disabled={disabled || loading}
                    onChange={(event) =>
                      editItem(item.id, 'narration', event.target.value)
                    }
                  />
                </label>
              )}
              <label className="block">
                <span className="studio-label">
                  字幕 · {item.caption.length}/100
                </span>
                <Input.TextArea
                  aria-label={`建议第${index + 1}段字幕`}
                  className="min-h-24 w-full resize-y px-4 py-3 text-sm"
                  value={item.caption}
                  maxLength={100}
                  disabled={disabled || loading}
                  onChange={(event) =>
                    editItem(item.id, 'caption', event.target.value)
                  }
                />
              </label>
              {input.kind === CopyKind.Video && (
                <p className="text-sm text-body">
                  完整说明参考：{item.narration}
                  <span className="block text-xs text-muted">
                    供改写字幕参考，不写入成片或替换原声；短镜头字幕按阅读长度保留完整短句。
                  </span>
                </p>
              )}
              <p className="text-xs text-muted">画面依据：{item.evidence}</p>
            </div>
          ))}
          {invalidDraft && (
            <p role="alert" className="text-xs text-danger">
              请补齐标题/字幕/照片解说，并删改房源信息中未确认的装修、产权或车位等标签，再采纳。
            </p>
          )}
          <Button
            type="primary"
            className="island-action w-full"
            disabled={disabled || loading || applied || invalidDraft}
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
