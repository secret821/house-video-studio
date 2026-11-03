/** Equal-sized cover layouts retain distinct Classic and gold Editorial lettering. */
import type { CSSProperties } from 'react';
import { AbsoluteFill } from 'remotion';
import { VideoTemplate } from '../services/definition/project';

export const EDITORIAL_TEXT: CSSProperties = {
  fontFamily: 'Noto Serif CJK SC, Songti SC, SimSun, serif',
  fontStyle: 'normal',
  fontWeight: 700,
  color: '#fff0d2',
  WebkitTextStroke: '2px #21170d',
  paintOrder: 'stroke fill',
  textShadow: '0 4px 8px rgba(0,0,0,.8)',
  overflowWrap: 'anywhere',
};
export const EDITORIAL_TITLE: CSSProperties = {
  ...EDITORIAL_TEXT,
  color: '#ffc34d',
  textDecoration: 'underline',
  textDecorationColor: '#ffc34d',
  textDecorationThickness: '5px',
  textUnderlineOffset: '16px',
};

const COVER_LETTERING: CSSProperties = {
  fontFamily: 'Arial Black, PingFang SC, Microsoft YaHei, sans-serif',
  fontWeight: 900,
  fontStyle: 'italic',
  color: '#fff',
  WebkitTextStroke: '12px #121212',
  paintOrder: 'stroke fill',
  textShadow: '7px 10px 0 #121212',
  overflowWrap: 'anywhere',
};

export function PropertyCoverCopy({
  name,
  price,
  facts,
  extra,
  contact,
  template = VideoTemplate.Classic,
}: {
  name: string;
  price: string;
  facts: string;
  extra: string;
  contact: string;
  template?: VideoTemplate;
}) {
  const editorial = template === VideoTemplate.Editorial;
  const lettering: CSSProperties = editorial
    ? { ...EDITORIAL_TEXT, color: '#ffc34d', WebkitTextStroke: '8px #21170d' }
    : COVER_LETTERING;
  return (
    <>
      <AbsoluteFill
        style={{
          padding: editorial ? '154px 84px 0' : '240px 84px 170px',
          alignItems: editorial ? 'flex-start' : 'center',
          justifyContent: editorial ? 'flex-start' : 'space-between',
          gap: editorial ? 32 : undefined,
          textAlign: editorial ? 'left' : 'center',
        }}
      >
        <div
          style={{
            width: '100%',
            transform: editorial ? undefined : 'rotate(-2deg)',
          }}
        >
          <div
            style={{
              ...lettering,
              fontSize: 44,
              fontStyle: 'normal',
              WebkitTextStroke: editorial ? '3px #21170d' : '6px #121212',
              letterSpacing: 6,
              marginBottom: 24,
            }}
          >
            {editorial ? '房源档案 / 实景记录' : '预约实地看房'}
          </div>
          <div
            style={{
              ...lettering,
              fontSize: 148,
              lineHeight: 1.25,
              letterSpacing: 1,
              ...(editorial && EDITORIAL_TITLE),
              WebkitTextStroke: editorial
                ? '8px #21170d'
                : lettering.WebkitTextStroke,
            }}
          >
            {name}
          </div>
        </div>
        <div
          style={{
            ...lettering,
            width: '100%',
            color: editorial ? '#ffc34d' : '#e87973',
            WebkitTextStroke: editorial ? '8px #21170d' : '14px #fff',
            textShadow: editorial
              ? EDITORIAL_TEXT.textShadow
              : '7px 10px 0 #121212, -3px -3px 0 #121212',
            fontSize: 190,
            lineHeight: 1.1,
            transform: editorial ? undefined : 'rotate(-3deg)',
          }}
        >
          <div style={{ fontSize: 62, marginBottom: 16 }}>总价</div>
          {price}
        </div>
        <div
          style={{
            ...lettering,
            width: '100%',
            fontSize: 64,
            lineHeight: 1.55,
            color: editorial ? '#fff0d2' : lettering.color,
            WebkitTextStroke: editorial ? '4px #21170d' : '9px #121212',
            transform: editorial ? undefined : 'rotate(-1deg)',
          }}
        >
          {facts}
          <div style={{ fontSize: 86, marginTop: 26 }}>{extra}</div>
        </div>
        <div
          style={{
            ...lettering,
            width: '100%',
            fontSize: 42,
            color: editorial ? '#fff0d2' : lettering.color,
            lineHeight: 1.5,
            fontStyle: 'normal',
            WebkitTextStroke: editorial ? '3px #21170d' : '6px #121212',
          }}
        >
          {contact}
        </div>
      </AbsoluteFill>
      <div
        style={{
          ...lettering,
          position: 'absolute',
          left: 84,
          right: 84,
          bottom: 80,
          textAlign: editorial ? 'left' : 'center',
          fontSize: 25,
          fontWeight: 600,
          fontStyle: 'normal',
          WebkitTextStroke: '3px #121212',
          textShadow: '1px 2px 3px #121212',
        }}
      >
        房源信息与附属空间情况，以实地核实为准
      </div>
    </>
  );
}
