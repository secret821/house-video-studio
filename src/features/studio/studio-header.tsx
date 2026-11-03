/** Both editors keep new-project and save visible; antd owns popup and keyboard interaction. */
import { Button, Dropdown, cn } from './common';
import { useLayoutEffect, useRef, useState } from 'react';
import {
  HomeOutlined,
  PlusOutlined,
  SaveOutlined,
  MoreOutlined,
  PictureOutlined,
  VideoCameraOutlined,
  InfoCircleOutlined,
  ExclamationCircleOutlined,
} from '@ant-design/icons';

import { SessionControl } from './session-control';

interface StudioHeaderProps {
  busy: boolean;
  saveDisabled: boolean;
  photoMode?: boolean;
  draftStatus: string;
  actions: { save: () => void; newProject: () => void };
}

const MODE_LINK_CLASS = cn(
  'flex items-center gap-2 border-b-2 border-transparent text-body',
  'font-medium whitespace-nowrap text-white opacity-80',
  'transition-[opacity,border-color] duration-150 hover:border-white hover:opacity-100',
  'aria-[current=page]:border-white aria-[current=page]:font-semibold aria-[current=page]:opacity-100',
  'max-[800px]:min-h-10',
);

export function StudioHeader({
  busy,
  saveDisabled,
  photoMode = false,
  draftStatus,
  actions,
}: StudioHeaderProps) {
  const header = useRef<HTMLElement>(null);
  const [sessionCheck, setSessionCheck] = useState(0);
  const draftStatusFailed = draftStatus.startsWith('草稿尚未保存：');
  useLayoutEffect(() => {
    const element = header.current;
    if (!element) return;
    const root = document.documentElement;
    const previous = root.style.getPropertyValue('--studio-header-height');
    /** Wrapped mobile controls and multi-line save notices share one measured sticky offset. */
    function updateHeight() {
      root.style.setProperty(
        '--studio-header-height',
        `${Math.ceil(element!.getBoundingClientRect().height)}px`,
      );
    }
    updateHeight();
    const observer = new ResizeObserver(updateHeight);
    observer.observe(element);
    return () => {
      observer.disconnect();
      if (previous) root.style.setProperty('--studio-header-height', previous);
      else root.style.removeProperty('--studio-header-height');
    };
  }, []);
  return (
    <header ref={header} className="sticky top-0 z-40 bg-primary">
      <div
        className={cn(
          'mx-auto flex min-h-12 w-full max-w-[1440px] items-center gap-4 px-6 py-1',
          'max-[1150px]:flex-wrap max-[1150px]:gap-4',
          'max-[800px]:gap-3 max-[800px]:px-4 max-[800px]:py-3',
        )}
      >
        <a
          className={cn(
            'inline-flex min-w-0 shrink-0 items-center gap-2',
            'text-heading-4 font-semibold text-white hover:text-white',
          )}
          href="/"
          aria-label="房源视频工作室首页"
        >
          <span
            className="grid h-8 w-8 place-items-center text-heading-2"
            aria-hidden="true"
          >
            <HomeOutlined />
          </span>
          <span>
            房源视频工作室<small className="hidden">HOUSE VIDEO STUDIO</small>
          </span>
        </a>
        <span
          data-header-divider
          className="h-6 w-px shrink-0 bg-white/40 max-[800px]:hidden"
          aria-hidden="true"
        />
        <nav
          className={cn(
            'flex self-stretch items-stretch gap-6',
            'max-[1150px]:gap-4',
            'max-[800px]:order-3 max-[800px]:min-h-10 max-[800px]:w-full',
          )}
          aria-label="制作模式"
        >
          <a
            className={MODE_LINK_CLASS}
            href="/video-edit"
            aria-current={!photoMode ? 'page' : undefined}
          >
            <VideoCameraOutlined aria-hidden="true" />
            实拍剪辑
          </a>
          <a
            className={MODE_LINK_CLASS}
            href="/photo-mode"
            aria-current={photoMode ? 'page' : undefined}
          >
            <PictureOutlined aria-hidden="true" />
            照片精细编辑
          </a>
        </nav>
        <div
          className={cn(
            'ms-auto flex max-w-full min-w-0 shrink-0 flex-wrap items-center gap-2',
            'max-[540px]:ms-0 max-[540px]:w-full max-[540px]:[&>button]:flex-1',
            'max-[800px]:[&>button]:px-3',
          )}
        >
          <Button
            aria-label="新建房源视频"
            icon={<PlusOutlined />}
            disabled={busy}
            onClick={actions.newProject}
          >
            新建
          </Button>
          <Button
            disabled={busy || saveDisabled}
            icon={<SaveOutlined />}
            onClick={actions.save}
          >
            保存草稿
          </Button>
          <Dropdown
            trigger={['click']}
            placement="bottomRight"
            destroyOnHidden={false}
            onOpenChange={(open) => {
              if (open) setSessionCheck((check) => check + 1);
            }}
            popupRender={() => (
              <div
                className={cn(
                  'studio-ui grid w-[min(280px,calc(100vw-32px))] max-h-[min(600px,70svh)] gap-2 overflow-y-auto',
                  'rounded-lg border border-line bg-panel p-3 shadow-md',
                )}
              >
                <Button
                  type="text"
                  className={cn(
                    '!flex !min-h-10 !items-center !rounded',
                    '!px-3 !py-2 hover:!bg-primary-soft',
                  )}
                  href={photoMode ? '/video-edit' : '/photo-mode'}
                >
                  {photoMode ? '返回实拍剪辑' : '照片精细编辑'}
                </Button>
                <SessionControl disabled={busy} refreshKey={sessionCheck} />
              </div>
            )}
          >
            <Button icon={<MoreOutlined />} aria-label="更多工作室操作">
              更多
            </Button>
          </Dropdown>
        </div>
      </div>
      <div className="mx-auto max-w-[1440px] px-6 pt-3 pb-4 max-[800px]:px-4">
        <p
          role={draftStatusFailed ? 'alert' : 'status'}
          aria-live={draftStatusFailed ? 'assertive' : 'polite'}
          className={cn(
            'inline-flex max-w-full items-start gap-2 rounded border px-3 py-1.5',
            'text-caption leading-5',
            {
              'border-white/20 bg-white/10 text-white/80': !draftStatusFailed,
              'border-danger/30 bg-white text-danger': draftStatusFailed,
            },
          )}
        >
          {draftStatusFailed ? (
            <ExclamationCircleOutlined
              className="mt-0.5 shrink-0 text-sm"
              aria-hidden="true"
            />
          ) : (
            <InfoCircleOutlined
              className="mt-0.5 shrink-0 text-sm"
              aria-hidden="true"
            />
          )}
          <span>{draftStatus}</span>
        </p>
      </div>
    </header>
  );
}
