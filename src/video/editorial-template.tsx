/** Shared editorial scene lettering and the two reference-led film cover layouts. */
import type { CSSProperties } from 'react';
import { Img, useCurrentFrame } from 'remotion';
import { CoverStyle, VideoTemplate } from '../services/definition/project';

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
  fontFamily:
    'Arial Black, Noto Sans CJK SC, PingFang SC, Microsoft YaHei, sans-serif',
  fontWeight: 900,
  fontStyle: 'italic',
  color: '#fff',
  WebkitTextStroke: '10px #0b0909',
  paintOrder: 'stroke fill',
  textShadow: '10px 13px 0 rgba(0,0,0,.55)',
  overflowWrap: 'anywhere',
};

interface CoverCopyProps {
  name: string;
  price: string;
  facts: string;
  extra: string;
  contact: string;
  template?: VideoTemplate;
  coverStyle?: CoverStyle;
  detailImages?: string[];
}

const COVER_GOLD: CSSProperties = {
  ...COVER_LETTERING,
  color: '#ffe89c',
  WebkitTextStroke: '9px #0b0909',
};

function getCoverTitleSize(name: string) {
  if (name.length > 16) return 96;
  if (name.length > 8) return 112;
  return 132;
}

function CoverDisclaimer({ bottom }: { bottom: number }) {
  return (
    <div
      style={{
        position: 'absolute',
        right: 42,
        bottom,
        fontFamily: 'Noto Sans CJK SC, PingFang SC, sans-serif',
        fontSize: 22,
        color: '#fff',
        WebkitTextStroke: '2px #111',
        paintOrder: 'stroke fill',
        textShadow: '0 2px 4px #111',
      }}
    >
      房源信息以实地核实为准
    </div>
  );
}

/** Talking-head cover: large outlined promise, then price to the left of the person. */
function EditorialCoverCopy({
  name,
  price,
  facts,
  extra,
  contact,
}: CoverCopyProps) {
  return (
    <>
      <div
        style={{
          position: 'absolute',
          top: 310,
          left: 36,
          width: 500,
          rotate: '-3deg',
        }}
      >
        <div
          style={{
            ...COVER_LETTERING,
            color: '#ff927a',
            fontSize: name.length > 6 ? 82 : name.length > 4 ? 106 : 142,
            lineHeight: 1.15,
            letterSpacing: -2,
            WebkitTextStroke: '13px #080808',
          }}
        >
          {name}
        </div>
        {extra && (
          <div
            style={{
              ...COVER_GOLD,
              marginTop: 14,
              fontSize: 60,
              lineHeight: 1.2,
            }}
          >
            {extra}
          </div>
        )}
      </div>
      <div style={{ position: 'absolute', top: 1080, left: 0, width: 530 }}>
        {price && (
          <div
            style={{
              position: 'relative',
              left: -14,
              width: 'fit-content',
              maxWidth: 530,
              padding: '28px 36px 34px 50px',
              borderRadius: '0 130px 130px 0',
              background: 'linear-gradient(125deg,#b94b4b,#8d2931)',
              boxShadow: '13px 18px 0 rgba(25,0,0,.72)',
              rotate: '-3deg',
            }}
          >
            <div
              style={{
                ...COVER_LETTERING,
                fontSize: price.length > 6 ? 78 : price.length > 4 ? 104 : 142,
                lineHeight: 1.12,
              }}
            >
              {price}
            </div>
          </div>
        )}
        {facts && (
          <div
            style={{
              ...COVER_LETTERING,
              marginTop: price ? 76 : 140,
              marginLeft: 36,
              width: 490,
              fontSize: 44,
              lineHeight: 1.35,
              WebkitTextStroke: '7px #080808',
              rotate: '-2deg',
            }}
          >
            {facts}
          </div>
        )}
      </div>
      {contact && (
        <div
          style={{
            ...COVER_LETTERING,
            position: 'absolute',
            bottom: 104,
            left: 36,
            width: 500,
            fontSize: 46,
            fontStyle: 'normal',
            WebkitTextStroke: '5px #080808',
          }}
        >
          {contact}
        </div>
      )}
      <CoverDisclaimer bottom={24} />
    </>
  );
}

/** Room cover: centered facts and price leave the footage visible below. */
function ClassicCoverCopy({
  name,
  price,
  facts,
  extra,
  contact,
}: CoverCopyProps) {
  return (
    <>
      <div
        style={{
          position: 'absolute',
          ...COVER_LETTERING,
          top: 430,
          left: 48,
          right: 48,
          fontSize: getCoverTitleSize(name),
          lineHeight: 1.16,
          textAlign: 'center',
          WebkitTextStroke: '15px #080808',
          rotate: '-2deg',
        }}
      >
        {name}
      </div>
      {facts && (
        <div
          style={{
            ...COVER_GOLD,
            position: 'absolute',
            top: 770,
            left: 66,
            right: 66,
            fontSize: 60,
            lineHeight: 1.2,
            textAlign: 'center',
            rotate: '-3deg',
          }}
        >
          {facts}
        </div>
      )}
      {(price || extra) && (
        <div
          style={{
            position: 'absolute',
            top: 1030,
            left: 48,
            right: 48,
            textAlign: 'center',
            rotate: '-3deg',
          }}
        >
          {price && (
            <div
              style={{
                ...COVER_LETTERING,
                color: '#ef8b7c',
                fontSize: 166,
                lineHeight: 1.12,
              }}
            >
              {price}
            </div>
          )}
          {extra && (
            <div
              style={{
                ...COVER_GOLD,
                marginTop: price ? 28 : 0,
                fontSize: 52,
                lineHeight: 1.2,
              }}
            >
              {extra}
            </div>
          )}
        </div>
      )}
      {contact && (
        <div
          style={{
            ...COVER_LETTERING,
            position: 'absolute',
            right: 58,
            bottom: 310,
            left: 58,
            fontSize: 38,
            lineHeight: 1.2,
            textAlign: 'center',
            WebkitTextStroke: '5px #080808',
          }}
        >
          {contact}
        </div>
      )}
      <CoverDisclaimer bottom={260} />
    </>
  );
}

/** A lower-third headline keeps the speaker's face and platform controls clear. */
function NewEditorialCoverCopy({
  name,
  price,
  facts,
  extra,
  contact,
}: CoverCopyProps) {
  const detailFields = [facts, price, extra].filter(Boolean);
  const detailLength = detailFields.join(' ｜ ').length;
  const compact = name.length > 20 || detailLength > 70 || contact.length > 28;
  return (
    <>
      <div
        style={{
          position: 'absolute',
          top: 880,
          bottom: 410,
          left: 0,
          right: 0,
          padding: '42px 46px 54px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          background:
            'linear-gradient(180deg,rgba(0,0,0,.06),rgba(0,0,0,.69) 15%,rgba(0,0,0,.7) 82%,rgba(0,0,0,.05))',
          color: '#fff',
        }}
      >
        <div
          style={{
            color: '#ffe119',
            fontSize: compact
              ? 60
              : name.length > 16
                ? 68
                : name.length > 8
                  ? 108
                  : name.length > 4
                    ? 146
                    : 172,
            fontWeight: 900,
            WebkitTextStroke: '10px #0b0909',
            paintOrder: 'stroke fill',
            lineHeight: 1.12,
            textAlign: 'center',
            overflowWrap: 'anywhere',
            textShadow: '6px 9px 0 rgba(0,0,0,.62)',
          }}
        >
          {name}
        </div>
        {(facts || price || extra) && (
          <div
            style={{
              marginTop: compact ? 14 : 24,
              fontSize: compact
                ? 30
                : detailLength > 40
                  ? 40
                  : detailLength > 20
                    ? 48
                    : 58,
              fontWeight: 800,
              textAlign: 'center',
              lineHeight: 1.3,
              overflowWrap: 'anywhere',
              WebkitTextStroke: '5px #141414',
              paintOrder: 'stroke fill',
              textShadow: '3px 5px 0 rgba(0,0,0,.6)',
            }}
          >
            {detailFields.map((value, index) => (
              <span
                key={`${index}-${value}`}
                style={{
                  display: 'inline-block',
                  maxWidth: '100%',
                  margin: '0 6px',
                  overflowWrap: 'anywhere',
                }}
              >
                {value}
              </span>
            ))}
          </div>
        )}
        {contact && (
          <div
            style={{
              marginTop: compact ? 14 : 22,
              fontSize: compact ? 30 : 42,
              fontWeight: 700,
              textAlign: 'center',
              lineHeight: 1.25,
              WebkitTextStroke: '4px #141414',
              paintOrder: 'stroke fill',
            }}
          >
            {contact}
          </div>
        )}
      </div>
      <CoverDisclaimer bottom={38} />
    </>
  );
}

/** Keep the badge readable by selecting area and layout before less distinctive facts. */
function splitCoverFacts(facts: string, extra: string) {
  const parts = [
    ...new Set(
      [facts, extra]
        .flatMap((value) => value.split(/[/|｜、，,；;]+/))
        .map((value) => value.trim())
        .filter(Boolean),
    ),
  ];
  const priority = [
    parts.find((value) => /\d+(?:\.\d+)?\s*(?:㎡|m²)/i.test(value)),
    parts.find((value) => /\d+\s*(?:房|室)/.test(value)),
  ].filter((value): value is string => Boolean(value));
  const highlights = [...new Set([...priority, ...parts])].slice(0, 2);
  return {
    highlights,
    remaining: parts.filter((value) => !highlights.includes(value)),
  };
}

/** Stack two cards behind the title; the title and detail badge share one centered block. */
function NewClassicCoverCopy({
  name,
  price,
  facts,
  extra,
  contact,
  detailImages,
}: CoverCopyProps) {
  const frame = useCurrentFrame();
  const { highlights, remaining } = splitCoverFacts(facts, extra);
  const remainingText = remaining.join(' ｜ ');
  return (
    <>
      <div
        style={{
          position: 'absolute',
          top: 250,
          left: 70,
          right: 70,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div
          style={{
            position: 'relative',
            width: '100%',
            minHeight: 310,
          }}
        >
          <div
            style={{
              position: 'absolute',
              inset: '4px 12px 14px -12px',
              transform: 'rotate(-3deg)',
              borderRadius: 26,
              background: 'rgba(80,7,12,.28)',
              boxShadow: '0 16px 24px rgba(30,0,0,.3)',
            }}
          />
          <div
            style={{
              position: 'absolute',
              inset: '12px -12px 4px 12px',
              transform: 'rotate(2.5deg)',
              borderRadius: 26,
              background: 'rgba(116,16,19,.24)',
            }}
          />
          <div
            style={{
              position: 'relative',
              zIndex: 1,
              minHeight: 310,
              padding: '34px 42px',
              borderRadius: 26,
              border: '3px solid rgba(255,238,220,.8)',
              background:
                'linear-gradient(140deg,rgba(67,5,11,.68),rgba(98,10,16,.62))',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxSizing: 'border-box',
            }}
          >
            <div
              style={{
                color: '#fff',
                fontSize: name.length > 16 ? 65 : name.length > 8 ? 94 : 136,
                fontWeight: 900,
                lineHeight: 1.12,
                textAlign: 'center',
                overflowWrap: 'anywhere',
                textShadow: '0 5px 8px rgba(0,0,0,.35)',
              }}
            >
              {name}
            </div>
          </div>
        </div>
        {highlights.length > 0 && (
          <div
            style={{
              position: 'relative',
              zIndex: 2,
              width: '82%',
              minHeight: 120,
              marginTop: -30,
              padding: '20px 28px',
              borderRadius: 72,
              backgroundImage:
                'linear-gradient(110deg,rgba(233,166,14,.68),rgba(255,221,64,.67) 22%,rgba(255,246,177,.66) 35%,rgba(248,193,37,.65) 52%,rgba(255,244,161,.64) 66%,rgba(229,161,11,.62))',
              backgroundSize: '220% 100%',
              backgroundPosition: `${Math.min(100, (frame / 45) * 100)}% 0`,
              boxShadow:
                '0 10px 20px rgba(95,44,0,.4),inset 0 2px 4px rgba(255,255,255,.35)',
              color: '#790d08',
              fontSize: highlights.join(' ｜ ').length > 14 ? 48 : 62,
              fontWeight: 900,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              textAlign: 'center',
              lineHeight: 1.2,
              overflowWrap: 'anywhere',
              boxSizing: 'border-box',
            }}
          >
            <span>{highlights.join(' ｜ ')}</span>
          </div>
        )}
      </div>
      {price && (
        <div
          style={{
            ...COVER_LETTERING,
            position: 'absolute',
            top: detailImages?.length ? 835 : 1020,
            left: 85,
            right: 85,
            color: '#ef8b7c',
            fontSize: price.length > 10 ? 100 : 150,
            textAlign: 'center',
            lineHeight: 1.1,
            WebkitTextStroke: '11px #080808',
          }}
        >
          {price}
        </div>
      )}
      {remainingText && (
        <div
          style={{
            ...COVER_GOLD,
            position: 'absolute',
            top: detailImages?.length ? 1030 : 1235,
            left: 80,
            right: 80,
            fontSize:
              remainingText.length > 55
                ? 32
                : remainingText.length > 30
                  ? 38
                  : 44,
            lineHeight: 1.35,
            textAlign: 'center',
            WebkitTextStroke: '5px #080808',
          }}
        >
          {remainingText}
        </div>
      )}
      {detailImages && detailImages.length > 0 && (
        <div
          style={{
            position: 'absolute',
            bottom: 285,
            left: 60,
            right: 60,
            height: 420,
            display: 'flex',
            gap: 22,
            alignItems: 'center',
          }}
        >
          {detailImages.slice(0, 2).map((src, index) => (
            <div
              key={`${src}-${index}`}
              style={{
                flex: 1,
                minWidth: 0,
                height: 360,
                border: '14px solid #fff',
                borderRadius: 14,
                background: '#fff',
                boxShadow: '0 12px 22px rgba(0,0,0,.4)',
                rotate: index === 0 ? '-5deg' : '5deg',
                overflow: 'hidden',
              }}
            >
              <Img
                src={src}
                alt=""
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            </div>
          ))}
        </div>
      )}
      {contact && (
        <div
          style={{
            position: 'absolute',
            bottom: 155,
            left: 130,
            right: 130,
            padding: '18px 26px',
            borderRadius: 24,
            background: 'rgba(155,16,18,.9)',
            color: '#fff',
            fontSize: 44,
            fontWeight: 700,
            textAlign: 'center',
            lineHeight: 1.25,
          }}
        >
          {contact}
        </div>
      )}
      <CoverDisclaimer bottom={38} />
    </>
  );
}

export function PropertyCoverCopy(props: CoverCopyProps) {
  if (props.coverStyle !== CoverStyle.Original)
    return props.template === VideoTemplate.Editorial ? (
      <NewEditorialCoverCopy {...props} />
    ) : (
      <NewClassicCoverCopy {...props} />
    );
  return props.template === VideoTemplate.Editorial ? (
    <EditorialCoverCopy {...props} />
  ) : (
    <ClassicCoverCopy {...props} />
  );
}
