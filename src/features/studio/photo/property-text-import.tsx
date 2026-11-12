/** One local paste-and-review step imports property facts without changing recorded speech or shot subtitles. */
import {
  Button,
  Checkbox,
  Input,
  Collapse,
  ButtonAppearance,
  cn,
} from '../../../share/ui';
import { useEffect, useRef, useState } from 'react';

import api from './api';
import { FileUpload } from '../media/file-upload';

import {
  PROPERTY_FIELDS,
  extractPropertyText,
  propertyTextPatch,
  type PropertyCandidate,
  type PropertyPatch,
} from './property-text';

/** Extraction is transient; changing source text invalidates the preview before any project mutation. */
export function PropertyTextImport({
  disabled: parentDisabled,
  onApply,
  draft,
}: {
  disabled: boolean;
  onApply: (patch: PropertyPatch) => void;
  draft: {
    source: string;
    fields: Array<PropertyCandidate> | null;
    onChange: (patch: {
      sourceText?: string;
      propertyFields?: Array<PropertyCandidate> | null;
    }) => void;
  };
}) {
  const { source, fields, onChange } = draft;
  /** Unadopted extraction edits are part of the same current draft as their source text. */
  function setFields(
    value:
      | Array<PropertyCandidate>
      | null
      | ((
          current: Array<PropertyCandidate> | null,
        ) => Array<PropertyCandidate> | null),
  ) {
    onChange({
      propertyFields: typeof value === 'function' ? value(fields) : value,
    });
  }
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const requestVersion = useRef(0);
  const [ocrCapability, setOcrCapability] = useState({
    ready: false,
    message: '正在检查本地截图识别…',
  });
  const [capability, setCapability] = useState({
    ready: false,
    message: '正在检查百炼配置…',
  });
  const disabled = parentDisabled || loading;
  useEffect(() => {
    requestVersion.current += 1;
    setLoading(false);
  }, [source]);
  useEffect(
    () => () => {
      requestVersion.current += 1;
    },
    [],
  );
  useEffect(() => {
    let active = true;
    api
      .getPropertyOcrCapability()
      .then((result) => {
        if (active) setOcrCapability(result);
      })
      .catch((error: unknown) => {
        if (active)
          setOcrCapability({
            ready: false,
            message:
              error instanceof Error ? error.message : '截图识别配置读取失败。',
          });
      });
    api
      .getCopyCapability()
      .then((result) => {
        if (active) setCapability(result);
      })
      .catch((error: unknown) => {
        if (active)
          setCapability({
            ready: false,
            message:
              error instanceof Error ? error.message : '配置读取失败，请刷新。',
          });
      });
    return () => {
      active = false;
    };
  }, []);

  /** OCR text enters the same editable source and review fields; a changed draft rejects late results. */
  function recognizeScreenshot(files: Array<File>) {
    if (disabled || !ocrCapability.ready) return;
    const file = files[0];
    if (file.size > 10 * 1024 * 1024) {
      setError('截图不能超过10MiB，请分段截取详情页。');
      return;
    }
    const version = ++requestVersion.current;
    setLoading(true);
    setError('');
    setNotice('');
    api
      .recognizePropertyScreenshot(file)
      .then(({ text }) => {
        if (version !== requestVersion.current) return;
        onChange({
          sourceText: text,
          propertyFields: extractPropertyText(text),
        });
        setNotice('截图已识别并移除。请校对文字和字段，再确认填入。');
      })
      .catch((error: unknown) => {
        if (version === requestVersion.current)
          setError(error instanceof Error ? error.message : '截图识别失败。');
      })
      .finally(() => {
        if (version === requestVersion.current) setLoading(false);
      });
  }

  /** The model returns editable fields and exact source quotes; no project mutation occurs here. */
  function extractWithModel() {
    if (!confirmed || disabled) return;
    setLoading(true);
    setError('');
    setNotice('');
    setFields(null);
    api
      .extractProperty(source, true)
      .then((result) => {
        setFields(result.fields);
        setNotice(
          result.cached
            ? '已复用语义提取结果，未再次调用模型。请核对原文依据后采纳。'
            : '语义提取完成，请核对字段和原文依据后采纳。',
        );
      })
      .catch((error: unknown) =>
        setError(
          error instanceof Error ? error.message : '提取失败，可使用本地提取。',
        ),
      )
      .finally(() => setLoading(false));
  }
  const unresolved = fields?.some(
    (field) => field.candidates.length > 1 && !field.value.trim(),
  );
  const hasValues = fields?.some((field) => field.value.trim());

  /** Field editing resolves a disagreement explicitly and leaves every other candidate unchanged. */
  function editField(key: PropertyCandidate['key'], value: string) {
    setFields((current) =>
      current!.map((field) =>
        field.key === key ? { ...field, value } : field,
      ),
    );
    setNotice('');
    setError('');
  }

  /** Check the same saved-project limits before writing any preview values into the editor. */
  function apply() {
    if (!fields || unresolved) return;
    try {
      const patch = propertyTextPatch(fields);
      onApply(patch);
      setNotice(
        '已填入房源信息，封面与片尾预览已更新。请保存草稿；逐段字幕仍可单独编辑或按画面生成。',
      );
      setError('');
    } catch {
      setError(
        '提取结果过长，请缩短：小区名称最多32字，位置/类型/层数/楼层/面积/户型/装修合计60字，总价20字，附加信息40字。',
      );
    }
  }
  return (
    <section className="space-y-4" aria-label="整段文案提取房源信息">
      <label className="block">
        <span className="mb-2 block text-body font-medium">
          粘贴房源资料或口播文案
        </span>
        <Input.TextArea
          className="min-h-36 w-full resize-y px-4 py-3 text-sm"
          aria-label="房源原始文案"
          placeholder="例如：小区：安福浅水湾，3楼，128.65㎡精装三房，总价59万，另带柴草间。也可以粘贴整段发布文案。"
          maxLength={12000}
          value={source}
          disabled={disabled}
          onChange={(event) => {
            onChange({ sourceText: event.target.value });
            setFields(null);
            setNotice('');
            setError('');
          }}
        />
      </label>
      <div className="space-y-2">
        <FileUpload
          label="识别房源详情截图（本地免费）"
          accept=".jpg,.jpeg,.png,.webp"
          disabled={disabled || !ocrCapability.ready}
          onFiles={recognizeScreenshot}
        />
        <p className="text-xs text-muted">
          {ocrCapability.message}{' '}
          支持贝壳详情页截图；一次一张，识别后自动移除图片，可修改文字和字段。
        </p>
      </div>
      <Collapse
        className="studio-upload-help"
        ghost
        expandIconPlacement="end"
        items={[
          {
            key: 'panel',
            label: <>怎样填写更容易识别？</>,
            forceRender: true,
            children: (
              <>
                <p>
                  一行一个字段，未知项删除，只保留一个确定值。以下仅为格式示例：
                </p>
                <pre
                  className={cn(
                    'whitespace-pre-wrap rounded bg-page p-4',
                    'font-sans leading-6 text-ink',
                  )}
                >{`小区：幸福家园
位置：安福县平都镇
房屋类型：住宅
建筑层数：共18层
所在楼层：3楼
面积：128.65㎡
户型：3房2厅2卫
装修：精装修
总价：59万
附加特点：另带储藏室`}</pre>
              </>
            ),
          },
        ]}
      />
      {loading && (
        <p role="status" className="text-xs text-muted">
          正在识别或理解房源资料…
        </p>
      )}
      {error && (
        <p role="alert" className="text-xs text-danger">
          {error}
        </p>
      )}
      <Button
        disabled={disabled || !source.trim()}
        onClick={() => {
          setFields(extractPropertyText(source));
          setNotice('');
          setError('');
        }}
      >
        提取房源信息（本地免费）
      </Button>
      <Collapse
        className="studio-disclosure"
        ghost
        expandIconPlacement="end"
        items={[
          {
            key: 'panel',
            label: <>使用 AI 理解复杂文案（可选）</>,
            forceRender: true,
            children: (
              <>
                <div className="space-y-4 pt-4">
                  <p className="text-xs text-muted">
                    {capability.message}{' '}
                    语义提取只发送这段文字，移除手机号，不发送视频、照片或音轨。
                  </p>
                  <Checkbox.Group
                    disabled={disabled}
                    options={[
                      {
                        value: 'free',
                        label:
                          '我已确认qwen3.7-flash免费额度，并开启“免费额度用完即停”',
                      },
                    ]}
                    value={confirmed ? ['free'] : []}
                    onChange={(values) => setConfirmed(values.includes('free'))}
                  />
                  <p className="text-xs text-muted">
                    需在百炼控制台核实；本程序不能读取余额或设置开关，未开启可能计费。仅点击语义提取才调用。
                  </p>
                  <Button
                    appearance={ButtonAppearance.Solid}
                    loading={loading}
                    disabled={
                      disabled ||
                      !confirmed ||
                      !capability.ready ||
                      !source.trim()
                    }
                    onClick={extractWithModel}
                  >
                    百炼语义提取房源信息
                  </Button>
                </div>
              </>
            ),
          },
        ]}
      />
      {fields && (
        <div
          className="space-y-4 border-t border-line pt-4"
          aria-label="待确认房源信息"
        >
          <p className="text-xs text-muted">
            未识别项留空，不猜小区名称或房厅数量。位置、类型、楼层、面积、户型和装修会合并成房源说明；露台、朝向及税费等明确说法进入附加信息，采纳前请核实。手机号和营销评价不写入成片。
          </p>
          {unresolved && (
            <p role="alert" className="text-sm text-danger">
              不同版本存在冲突，请选择或填写正确值后再采纳。
            </p>
          )}
          {!hasValues && !unresolved && (
            <p role="status" className="text-sm text-muted">
              未识别到明确字段。可补充“小区：名称、总价：59万、128.65㎡、3楼”等写法后重新提取，或在下方补充。
            </p>
          )}
          <div className="grid gap-6 sm:grid-cols-2">
            {PROPERTY_FIELDS.map((config, index) => {
              const field = fields[index];
              return (
                <div key={config.key} className="min-w-0">
                  <label className="block">
                    <span className="mb-2 block text-body font-medium">
                      提取结果 · {config.label}
                    </span>
                    <Input
                      aria-label={`提取结果${config.label}`}
                      value={field.value}
                      maxLength={config.max}
                      disabled={disabled}
                      onChange={(event) =>
                        editField(config.key, event.target.value)
                      }
                    />
                  </label>
                  {field.evidence?.map((item) => (
                    <p
                      key={`${item.value}:${item.quote}`}
                      className="mt-1 text-xs text-muted"
                    >
                      原文依据：{item.quote}
                    </p>
                  ))}
                  {field.candidates.length > 1 && (
                    <div
                      className="mt-2 flex flex-wrap gap-2"
                      aria-label={`${config.label}冲突候选`}
                    >
                      {field.candidates.map((candidate) => (
                        <Button
                          key={candidate}
                          disabled={disabled}
                          onClick={() => editField(config.key, candidate)}
                        >
                          使用{candidate}
                        </Button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          {error && (
            <p role="alert" className="text-sm text-danger">
              {error}
            </p>
          )}
          <Button
            appearance={ButtonAppearance.Solid}
            disabled={disabled || !hasValues || Boolean(unresolved)}
            onClick={apply}
          >
            确认并填入房源信息
          </Button>
        </div>
      )}
      {notice && (
        <p role="status" className="text-sm text-primary-hover">
          {notice}
        </p>
      )}
    </section>
  );
}
