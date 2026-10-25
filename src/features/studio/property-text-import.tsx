/** One local paste-and-review step imports property facts without changing recorded speech or shot subtitles. */
import { Button, Input } from 'animal-island-ui';
import { useState } from 'react';

import {
  PROPERTY_FIELDS,
  extractPropertyText,
  propertyTextPatch,
  type PropertyCandidate,
  type PropertyPatch,
} from './property-text';

/** Extraction is transient; changing source text invalidates the preview before any project mutation. */
export function PropertyTextImport({
  disabled,
  onApply,
}: {
  disabled: boolean;
  onApply: (patch: PropertyPatch) => void;
}) {
  const [source, setSource] = useState('');
  const [fields, setFields] = useState<Array<PropertyCandidate> | null>(null);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
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
        '提取结果过长，请缩短：小区名称最多32字，楼层/面积/户型/装修合计60字，总价20字，附加信息40字。',
      );
    }
  }
  return (
    <section className="mt-5 space-y-4" aria-label="整段文案提取房源信息">
      <div>
        <h3 className="text-lg leading-7 font-medium text-ink">
          粘贴整段文案，提取房源信息
        </h3>
        <p className="mt-2 text-xs text-muted">
          正文、口播脚本和多个版本可一起粘贴。本机规则提取，不调用模型；仅提取明确的房源字段，请核对后采纳。
        </p>
      </div>
      <label className="block">
        <span className="studio-label">房源原始文案</span>
        <textarea
          className="min-h-36 w-full resize-y px-4 py-3 text-sm"
          aria-label="房源原始文案"
          placeholder="例如：小区：安福浅水湾，3楼，128.65㎡精装三房，总价59万，另带柴草间。也可以粘贴整段发布文案。"
          maxLength={12000}
          value={source}
          disabled={disabled}
          onChange={(event) => {
            setSource(event.target.value);
            setFields(null);
            setNotice('');
            setError('');
          }}
        />
      </label>
      <Button
        className="island-action"
        disabled={disabled || !source.trim()}
        onClick={() => {
          setFields(extractPropertyText(source));
          setNotice('');
          setError('');
        }}
      >
        提取房源信息（本地免费）
      </Button>
      {fields && (
        <div
          className="space-y-4 border-t border-line pt-4"
          aria-label="待确认房源信息"
        >
          <p className="text-xs text-muted">
            未识别项留空，不覆盖对应原字段。楼层、面积、户型和装修会合并成一条房源说明；未识别的部分不会沿用旧说明。手机号、营销评价及粘贴的口播脚本不写入成片。
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
                    <span className="studio-label">
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
                  {field.candidates.length > 1 && (
                    <div
                      className="mt-2 flex flex-wrap gap-2"
                      aria-label={`${config.label}冲突候选`}
                    >
                      {field.candidates.map((candidate) => (
                        <Button
                          key={candidate}
                          className="island-action"
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
            className="island-action"
            type="primary"
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
