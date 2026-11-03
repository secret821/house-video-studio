/** Template text selects a style; the sibling Ant Design Image owns its native preview. */
import { AppstoreOutlined, CheckCircleFilled } from '@ant-design/icons';
import {
  VIDEO_TEMPLATE_MAP,
  VideoTemplate,
} from '@/services/definition/project';
import { Button, Image, cn } from './common';

interface Props {
  value: VideoTemplate;
  disabled: boolean;
  onChange: (value: VideoTemplate) => void;
  showCoverSource?: boolean;
}

const TEMPLATES = [VideoTemplate.Editorial, VideoTemplate.Classic];

/** Keep preview independent from selection, including while a render disables template changes. */
export function VideoTemplatePicker({
  value,
  disabled,
  onChange,
  showCoverSource = false,
}: Props) {
  return (
    <section
      className={cn(
        'mb-6 grid gap-4 rounded-lg border border-line bg-panel',
        'px-6 py-5 max-[600px]:mb-4 max-[600px]:p-4',
      )}
      aria-label="视频模板"
    >
      <div>
        <h2 className="mb-1 flex items-center gap-2.5 text-heading-3 font-semibold">
          <AppstoreOutlined
            className="text-lg text-primary-hover"
            aria-hidden="true"
          />
          视频模板
        </h2>
      </div>
      <div className="grid grid-cols-2 gap-3 max-[600px]:grid-cols-1">
        {TEMPLATES.map((template) => {
          const selected = value === template;
          const editorial = template === VideoTemplate.Editorial;
          const option = VIDEO_TEMPLATE_MAP[template];
          return (
            <div
              key={template}
              className={cn(
                'relative flex min-w-0 items-center justify-start gap-4 rounded border p-3',
                'bg-panel text-left font-normal whitespace-normal text-ink',
                {
                  'border-primary bg-primary-soft': selected,
                  'border-line hover:border-primary': !selected,
                },
              )}
            >
              <Image
                src={`/demo/template-${template}.jpg`}
                alt={
                  editorial
                    ? `${option.name}封面效果参考：虚构人物口播首帧示意`
                    : `${option.name}封面效果参考`
                }
                classNames={{
                  root: 'relative block h-[114px] w-16 shrink-0 overflow-hidden bg-[#222] max-[600px]:h-[92px] max-[600px]:w-[52px]',
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
                  <strong
                    className={cn(
                      'flex flex-wrap items-center gap-2 text-data font-semibold',
                      {
                        'text-primary-hover': selected,
                      },
                    )}
                  >
                    {option.name}
                  </strong>
                  <span className="text-caption text-muted">
                    {option.description}
                  </span>
                  {showCoverSource && (
                    <span className="text-caption text-muted">
                      默认封面：{editorial ? '口播视频首帧' : '首份房屋素材'}
                    </span>
                  )}
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
