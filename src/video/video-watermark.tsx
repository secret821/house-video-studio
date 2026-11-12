/** A static coral lettering mark shared by preview, cover, full rendering and native graphics layers. */
import { useVideoConfig } from 'remotion';

export function VideoWatermark({
  text,
  portraitTop = 0.16,
}: {
  text: string;
  portraitTop?: number;
}) {
  const { width, height } = useVideoConfig();
  const value = text.trim();
  if (!value) return null;
  const shortSide = Math.min(width, height);
  const maxWidth = width * 0.44;
  const fontSize = Math.min(
    shortSide * 0.038,
    maxWidth / (Array.from(value).length * 1.1),
  );
  return (
    <div
      data-testid="video-watermark"
      style={{
        position: 'absolute',
        left: Math.round(shortSide * 0.05),
        top: Math.round(
          height > width ? height * portraitTop : shortSide * 0.1,
        ),
        maxWidth,
        fontFamily: 'Noto Serif CJK SC, Songti SC, SimSun, serif',
        fontSize,
        fontWeight: 900,
        fontStyle: 'italic',
        letterSpacing: fontSize * 0.035,
        lineHeight: 1.3,
        whiteSpace: 'nowrap',
        textAlign: 'left',
        color: '#f3a17d',
        WebkitTextStroke: `${Math.max(1, fontSize * 0.035)}px #fff3e8`,
        paintOrder: 'stroke fill',
        textShadow: '2px 3px 0 rgba(97,49,33,.65), 0 2px 6px rgba(0,0,0,.3)',
        pointerEvents: 'none',
      }}
    >
      {value}
    </div>
  );
}
