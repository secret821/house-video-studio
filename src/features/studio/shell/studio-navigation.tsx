/** Anchor navigation stays available while all three intake sections remain accessible. */
import { useEffect, useRef, useState } from 'react';
import { cn } from '../../../share/ui';
import {
  EditOutlined,
  EyeOutlined,
  FolderOpenOutlined,
  PictureOutlined,
} from '@ant-design/icons';

const STEPS = [
  { id: 'studio-materials', icon: FolderOpenOutlined, label: '素材' },
  { id: 'studio-copy', icon: EditOutlined, label: '文案' },
  { id: 'studio-settings', icon: PictureOutlined, label: '封面' },
  { id: 'studio-preview', icon: EyeOutlined, label: '预览' },
] as const;

/** Reading position follows section starts, including sections taller than the viewport. */
export function StudioNavigation({ onPreview }: { onPreview?: () => void }) {
  const [current, setCurrent] = useState<string>(STEPS[0].id);
  const navigation = useRef<HTMLElement>(null);
  useEffect(() => {
    let frame = 0;
    /** The desktop preview is sticky beside editing, so only mobile treats it as a fourth scroll section. */
    function updatePosition() {
      const marker =
        (navigation.current?.getBoundingClientRect().bottom ?? 0) + 24;
      let active: string = STEPS[0].id;
      STEPS.forEach(({ id }) => {
        if (
          id === 'studio-preview' &&
          window.matchMedia('(min-width: 801px)').matches
        )
          return;
        const section = document.getElementById(id);
        if (section && section.getBoundingClientRect().top <= marker)
          active = id;
      });
      setCurrent(active);
    }
    /** Coalesce scrolling into one layout read per frame and cancel it on unmount. */
    function schedulePosition() {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(updatePosition);
    }
    updatePosition();
    window.addEventListener('scroll', schedulePosition, { passive: true });
    window.addEventListener('resize', schedulePosition);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('scroll', schedulePosition);
      window.removeEventListener('resize', schedulePosition);
    };
  }, []);
  return (
    <nav
      ref={navigation}
      className={cn(
        'studio-step-nav sticky top-[var(--studio-header-height,0px)] z-30 mb-6',
        'grid grid-cols-4 border-b border-line bg-panel px-4',
        'max-[800px]:mb-4 max-[800px]:px-0',
      )}
      aria-label="视频制作步骤"
    >
      {STEPS.map((step) => {
        const Icon = step.icon;
        return (
          <a
            key={step.id}
            className={cn(
              'flex min-h-14 items-center justify-center gap-2 border-b-2 border-transparent px-2 py-3',
              'text-body font-medium text-muted transition-[color,background,border-color] duration-150',
              'hover:bg-primary-soft hover:text-primary-hover',
              'aria-[current=step]:border-primary aria-[current=step]:bg-primary-soft aria-[current=step]:font-semibold aria-[current=step]:text-primary-hover',
              'max-[800px]:min-h-12 max-[800px]:gap-1 max-[800px]:px-1 max-[800px]:py-2',
            )}
            href={`#${step.id}`}
            aria-current={current === step.id ? 'step' : undefined}
            onClick={(event) => {
              setCurrent(step.id);
              if (step.id === 'studio-preview' && onPreview) {
                event.preventDefault();
                onPreview();
              }
            }}
          >
            <Icon aria-hidden="true" />
            {step.label}
          </a>
        );
      })}
    </nav>
  );
}
