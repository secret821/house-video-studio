/** Anchor navigation stays available while all three intake sections remain accessible. */
import { useEffect, useRef, useState } from 'react';

const STEPS = [
  { id: 'studio-materials', number: '01', label: '素材' },
  { id: 'studio-copy', number: '02', label: '文案' },
  { id: 'studio-settings', number: '03', label: '封面' },
  { id: 'studio-preview', number: '04', label: '预览' },
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
    <nav ref={navigation} className="studio-step-nav" aria-label="视频制作步骤">
      {STEPS.map((step) => (
        <a
          key={step.id}
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
          <span>{step.number}</span>
          {step.label}
        </a>
      ))}
    </nav>
  );
}
