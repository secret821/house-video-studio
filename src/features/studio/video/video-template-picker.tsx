/** Film templates and cover choices share reference art but keep separate state. */
import { AppstoreOutlined, CheckCircleFilled } from '@ant-design/icons';
import { useState } from 'react';
import {
  CoverStyle,
  VIDEO_TEMPLATE_MAP,
  VideoTemplate,
} from '@/services/definition/project';
import {
  COVER_SOURCE_MAP,
  CoverSource,
} from '@/services/definition/video-edit';
import { Button, Checkbox, Image, Modal, cn } from '../../../share/ui';

const TEMPLATES = [VideoTemplate.Editorial, VideoTemplate.Classic];
const COVER_STYLES = [CoverStyle.New, CoverStyle.Original];
const COVER_SOURCES = [CoverSource.Opening, CoverSource.House];
const NEW_COVER_PREVIEW_REVISION = '20261113-person-banner';

function coverPreview(template: VideoTemplate, style: CoverStyle) {
  return style === CoverStyle.New
    ? `/demo/template-${template}-new.jpg?v=${NEW_COVER_PREVIEW_REVISION}`
    : `/demo/template-${template}.jpg`;
}

function coverStyleLabel(template: VideoTemplate, style: CoverStyle) {
  return `${VIDEO_TEMPLATE_MAP[template].name} · ${style === CoverStyle.New ? '新版' : '原版'}`;
}

/** Photo mode still selects the film template without a cover source or artwork version. */
export function VideoTemplatePicker({
  value,
  disabled,
  onChange,
}: {
  value: VideoTemplate;
  disabled: boolean;
  onChange: (value: VideoTemplate) => void;
}) {
  return (
    <section
      className={cn(
        'mb-6 grid gap-4 rounded-lg border border-line bg-panel',
        'px-6 py-5 max-[600px]:mb-4 max-[600px]:p-4',
      )}
      aria-label="视频模板"
    >
      <h2 className="flex items-center gap-2.5 text-heading-3 font-semibold">
        <AppstoreOutlined className="text-lg text-primary-hover" aria-hidden />
        视频模板
      </h2>
      <div className="grid grid-cols-2 gap-3 max-[600px]:grid-cols-1">
        {TEMPLATES.map((template) => {
          const selected = value === template;
          const option = VIDEO_TEMPLATE_MAP[template];
          return (
            <div
              key={template}
              className={cn(
                'relative flex min-w-0 items-center gap-4 rounded border p-3',
                'bg-panel text-left text-ink',
                {
                  'border-primary bg-primary-soft': selected,
                  'border-line hover:border-primary': !selected,
                },
              )}
            >
              <Image
                src={`/demo/template-${template}.jpg`}
                alt={`${option.name}模板示例图`}
                classNames={{
                  root: 'block h-[114px] w-16 shrink-0 overflow-hidden bg-[#222]',
                  image: 'h-full w-full object-contain',
                }}
                preview={{ cover: '预览' }}
              />
              <Button
                type="text"
                className={cn(
                  '!static !h-auto !min-w-0 !flex-1 !self-stretch !justify-start',
                  '!border-0 !bg-transparent !p-0 !text-left !font-normal !whitespace-normal',
                )}
                aria-label={`选择${option.name}模板`}
                aria-pressed={selected}
                disabled={disabled}
                onClick={() => onChange(template)}
              >
                <span className="grid min-w-0 gap-1 pr-4">
                  <strong className="text-data font-semibold">
                    {option.name}
                  </strong>
                  <span className="text-caption text-muted">
                    {option.description}
                  </span>
                </span>
                {selected && (
                  <CheckCircleFilled
                    className="absolute top-3 right-3 text-heading-4 text-primary"
                    aria-hidden
                  />
                )}
              </Button>
            </div>
          );
        })}
      </div>
    </section>
  );
}

/** Video covers choose the source and one of four artwork layouts independently. */
export function VideoCoverPicker({
  template,
  style,
  source,
  disabled,
  onStyleChange,
  onSourceChange,
}: {
  template: VideoTemplate;
  style: CoverStyle;
  source: CoverSource;
  disabled: boolean;
  onStyleChange: (template: VideoTemplate, style: CoverStyle) => void;
  onSourceChange: (source: CoverSource) => void;
}) {
  const [open, setOpen] = useState(false);
  const currentLabel = coverStyleLabel(template, style);
  return (
    <section
      className={cn(
        'mb-6 rounded-lg border border-line bg-panel px-6 py-5',
        'max-[600px]:mb-4 max-[600px]:p-4',
      )}
      aria-label="视频封面"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2.5 text-heading-3 font-semibold">
          <AppstoreOutlined
            className="text-lg text-primary-hover"
            aria-hidden
          />
          视频封面
        </h2>
        <Button disabled={disabled} onClick={() => setOpen(true)}>
          更改
        </Button>
      </div>
      <div className="mt-4 flex items-center gap-4">
        <Image
          src={coverPreview(template, style)}
          alt={`${currentLabel}版式示例图`}
          classNames={{
            root: 'block h-[92px] w-[52px] shrink-0 overflow-hidden bg-[#222]',
            image: 'h-full w-full object-contain',
          }}
          preview={{ cover: '预览' }}
        />
        <div className="min-w-0">
          <p className="text-body font-semibold text-ink">{currentLabel}</p>
          <p className="text-caption text-muted">
            封面来源：{COVER_SOURCE_MAP[source]}
          </p>
          <p className="text-caption text-muted">
            示例图仅展示版式，实际画面使用当前素材。
          </p>
        </div>
      </div>
      <Modal
        title="更改封面"
        width={720}
        open={open}
        onCancel={() => setOpen(false)}
        footer={null}
      >
        <div className="grid gap-6">
          <section aria-label="封面截取来源">
            <h3 className="mb-3 text-body font-semibold text-ink">
              封面截取来源
            </h3>
            <div className="grid grid-cols-2 gap-3 max-[480px]:grid-cols-1">
              {COVER_SOURCES.map((option) => (
                <div
                  key={option}
                  className="flex items-center gap-3 rounded border border-line p-3 text-body"
                >
                  <Checkbox
                    checked={source === option}
                    disabled={disabled}
                    onChange={() => onSourceChange(option)}
                    aria-label={`选择${COVER_SOURCE_MAP[option]}`}
                  />
                  {COVER_SOURCE_MAP[option]}
                </div>
              ))}
            </div>
            {source === CoverSource.Image && (
              <p className="mt-2 text-caption text-muted">
                当前使用单独上传的封面底图；选择口播或房屋素材即可切换。
              </p>
            )}
          </section>
          <section aria-label="封面样式">
            <h3 className="mb-3 text-body font-semibold text-ink">封面样式</h3>
            <div className="grid grid-cols-2 gap-3 max-[480px]:grid-cols-1">
              {TEMPLATES.flatMap((option) =>
                COVER_STYLES.map((version) => {
                  const selected = template === option && style === version;
                  const label = coverStyleLabel(option, version);
                  return (
                    <div
                      key={`${option}-${version}`}
                      className={cn(
                        'flex items-center gap-3 rounded border p-3',
                        { 'border-primary bg-primary-soft': selected },
                        { 'border-line': !selected },
                      )}
                    >
                      <Checkbox
                        checked={selected}
                        disabled={disabled}
                        onChange={() => onStyleChange(option, version)}
                        aria-label={`选择${label}封面样式`}
                      />
                      <Image
                        src={coverPreview(option, version)}
                        alt={`${label}封面样式示例图`}
                        classNames={{
                          root: 'block h-[114px] w-16 shrink-0 overflow-hidden bg-[#222]',
                          image: 'h-full w-full object-contain',
                        }}
                        preview={{ cover: '预览' }}
                      />
                      <span className="text-body font-medium">{label}</span>
                    </div>
                  );
                }),
              )}
            </div>
          </section>
        </div>
      </Modal>
    </section>
  );
}
