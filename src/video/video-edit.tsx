/** An editorial real-estate cut using only uploaded footage, editable copy and local music. */
import { Audio, Video } from '@remotion/media';
import { TransitionSeries, linearTiming } from '@remotion/transitions';
import { fade } from '@remotion/transitions/fade';
import { Fragment } from 'react';
import { getSubtitleFrames } from './video-subtitles';
import { VideoWatermark } from './video-watermark';
import {
  PropertyCoverCopy,
  EDITORIAL_TEXT,
  EDITORIAL_TITLE,
} from './editorial-template';
import { VideoTemplate } from '../services/definition/project';
import {
  AbsoluteFill,
  Img,
  Sequence,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';

import {
  CoverSource,
  HouseMediaKind,
  getHouseMaterials,
  type VideoEditProject,
  type VideoShot,
} from '../services/definition/video-edit';

import {
  getVideoEditTimeline,
  getVideoMusicVolume,
  VIDEO_EDIT_TIMING,
} from './video-edit-timeline';

const INK = '#141917';
const WHITE = '#f8f5ee';
const CHAMPAGNE = '#dac7a4';
const FONT = 'PingFang SC, Microsoft YaHei, sans-serif';

/** The source stays unobstructed through the center; copy sits in generous lower-third safe space. */
function ShotCopy({
  project,
  shot,
  index,
}: {
  project: VideoEditProject;
  shot: VideoShot;
  index: number;
}) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const timeline = getVideoEditTimeline(project);
  const frames = timeline.shots[index].frames;
  const isLast = index === project.shots.length - 1;
  const outroOpacity = isLast
    ? interpolate(
        frame,
        [
          frames - VIDEO_EDIT_TIMING.captionExitLeadSeconds * fps,
          frames - VIDEO_EDIT_TIMING.closingSeconds * fps,
        ],
        [1, 0],
        {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
        },
      )
    : 1;
  return (
    <AbsoluteFill
      style={{
        fontFamily: FONT,
        color: WHITE,
        opacity: outroOpacity,
        ...(project.videoTemplate === VideoTemplate.Editorial &&
          EDITORIAL_TEXT),
      }}
    >
      {project.videoTemplate === VideoTemplate.Classic && (
        <AbsoluteFill
          style={{
            background:
              'linear-gradient(180deg,rgba(15,20,17,.55),transparent 26%,transparent 52%,rgba(15,20,17,.88))',
          }}
        />
      )}
      <div
        style={{
          position: 'absolute',
          top: 116,
          left: 84,
          right: 84,
          display: 'flex',
          justifyContent: 'space-between',
          fontSize: 30,
          letterSpacing: 3,
        }}
      >
        <span>{project.name}</span>
        <span style={{ color: CHAMPAGNE }}>实景带看</span>
      </div>
      <div
        style={{
          position: 'absolute',
          left: 84,
          right: 84,
          bottom:
            project.subtitlesEnabled ||
            project.videoTemplate === VideoTemplate.Editorial
              ? undefined
              : 250,
          top:
            project.subtitlesEnabled ||
            project.videoTemplate === VideoTemplate.Editorial
              ? 240
              : undefined,
          opacity: interpolate(
            frame,
            [0, VIDEO_EDIT_TIMING.captionFadeSeconds * fps],
            [0, 1],
            {
              extrapolateRight: 'clamp',
            },
          ),
          translate: `0 ${interpolate(frame, [0, VIDEO_EDIT_TIMING.captionEnterSeconds * fps], [24, 0], { extrapolateRight: 'clamp' })}px`,
        }}
      >
        <div
          style={{
            fontSize: 28,
            letterSpacing: 5,
            color: CHAMPAGNE,
            marginBottom: 22,
          }}
        >
          PROPERTY TOUR / {String(index + 1).padStart(2, '0')}
        </div>
        <div
          style={{
            ...(project.videoTemplate === VideoTemplate.Editorial &&
              EDITORIAL_TITLE),
            fontSize: 84,
            fontWeight: 500,
            lineHeight: 1.3,
            letterSpacing: 3,
            overflowWrap: 'anywhere',
          }}
        >
          {shot.title}
        </div>
        <div
          style={{
            fontSize: 42,
            lineHeight: 1.55,
            marginTop: 24,
            opacity: 0.92,
            overflowWrap: 'anywhere',
          }}
        >
          {shot.text}
        </div>
      </div>
      <div
        style={{
          position: 'absolute',
          left: 84,
          right: 84,
          bottom: 112,
          borderTop: '1px solid rgba(248,245,238,.45)',
          paddingTop: 24,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'baseline',
          gap: 28,
        }}
      >
        <div style={{ fontSize: 30, letterSpacing: 1 }}>{project.facts}</div>
        <div style={{ fontSize: 48, color: CHAMPAGNE, whiteSpace: 'nowrap' }}>
          {project.price}
        </div>
      </div>
    </AbsoluteFill>
  );
}

/** Opening speech is kept in full; a modest identity strip avoids artificial lip-sync or a second narration. */
function OpeningIdentity({ project }: { project: VideoEditProject }) {
  return (
    <AbsoluteFill
      style={{
        fontFamily: FONT,
        color: WHITE,
        ...(project.videoTemplate === VideoTemplate.Editorial &&
          EDITORIAL_TEXT),
        background:
          project.videoTemplate === VideoTemplate.Classic
            ? 'linear-gradient(0deg,rgba(15,20,17,.7),transparent 32%)'
            : undefined,
      }}
    >
      <div style={{ position: 'absolute', bottom: 128, left: 84, right: 84 }}>
        <div style={{ fontSize: 46, fontWeight: 500, letterSpacing: 4 }}>
          {project.name}
        </div>
        <div style={{ marginTop: 16, fontSize: 30, opacity: 0.9 }}>
          真人带看 · 房源实拍
        </div>
      </div>
    </AbsoluteFill>
  );
}

/** The closing invitation keeps its quieter layout while sharing editable property facts with the cover. */
function PropertySummary({ project }: { project: VideoEditProject }) {
  return (
    <AbsoluteFill
      style={{
        background: 'rgba(15,20,17,.82)',
        color: WHITE,
        fontFamily: FONT,
        justifyContent: 'center',
        padding: 84,
        ...(project.videoTemplate === VideoTemplate.Editorial &&
          EDITORIAL_TEXT),
      }}
    >
      <div style={{ fontSize: 34, color: CHAMPAGNE, letterSpacing: 5 }}>
        预约实地看房
      </div>
      <div
        style={{
          fontSize: 112,
          lineHeight: 1.4,
          marginTop: 36,
          fontWeight: 500,
        }}
      >
        {project.name}
      </div>
      <div style={{ fontSize: 82, color: CHAMPAGNE, marginTop: 42 }}>
        总价 {project.price}
      </div>
      <div style={{ fontSize: 42, marginTop: 32, lineHeight: 1.8 }}>
        {project.facts}
        <br />
        {project.extra}
      </div>
      <div
        style={{
          borderTop: '1px solid rgba(248,245,238,.35)',
          marginTop: 64,
          paddingTop: 32,
          fontSize: 38,
        }}
      >
        {project.contact}
      </div>
      <div
        style={{
          position: 'absolute',
          bottom: 120,
          left: 84,
          fontSize: 25,
          opacity: 0.65,
        }}
      >
        房源信息与附属空间情况，以实地核实为准
      </div>
    </AbsoluteFill>
  );
}

/** Only the closing card fades in; the standalone cover must be fully visible at frame zero. */
function ClosingInvitation({ project }: { project: VideoEditProject }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return (
    <AbsoluteFill
      style={{
        opacity: interpolate(
          frame,
          [0, VIDEO_EDIT_TIMING.closingFadeSeconds * fps],
          [0, 1],
          {
            extrapolateRight: 'clamp',
          },
        ),
      }}
    >
      <PropertySummary project={project} />
    </AbsoluteFill>
  );
}

/** The score is a continuous low bed; original speech stays on the video clips' own clocks. */
function TourMusic({ project }: { project: VideoEditProject }) {
  const frame = useCurrentFrame();
  if (!project.music) return null;
  return (
    <Audio
      name="全片低音量背景音乐"
      src={project.music.src}
      loop
      volume={getVideoMusicVolume(frame, project)}
    />
  );
}

/** Fade only the picture around a spoken cut, without shortening or overlapping either voice. */
function OriginalSoundFade({ frames }: { frames: number }) {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill
      style={{
        background: INK,
        opacity: interpolate(
          frame,
          [0, (frames - 1) / 2, frames - 1],
          [0, 1, 0],
          {
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
          },
        ),
      }}
    />
  );
}

/** White outlined captions stay readable on real footage and appear at the source speech timestamps. */
function SpeechSubtitles({ project }: { project: VideoEditProject }) {
  const cues = getSubtitleFrames(project, getVideoEditTimeline(project));
  return cues.map((cue) => (
    <Sequence
      key={cue.id}
      name={`原声字幕：${cue.text}`}
      from={cue.from}
      durationInFrames={cue.to - cue.from}
      layout="none"
    >
      <div
        style={{
          position: 'absolute',
          left: 72,
          right: 72,
          bottom: 420,
          textAlign: 'center',
          fontFamily: FONT,
          fontSize: 64,
          fontWeight: 900,
          lineHeight: 1.3,
          color: '#fff',
          WebkitTextStroke: '8px #111',
          paintOrder: 'stroke fill',
          textShadow: '0 4px 6px rgba(0,0,0,.6)',
          overflowWrap: 'anywhere',
          whiteSpace: 'pre-wrap',
        }}
      >
        {cue.text}
      </div>
    </Sequence>
  ));
}

/** The template is data-driven because cuts are authored in the app, with both cut timing and copy editable there. */
export function VideoEditFilm({
  project,
  musicOnly = false,
  graphicsOnly = false,
}: {
  project: VideoEditProject;
  musicOnly?: boolean;
  graphicsOnly?: boolean;
}) {
  const { fps } = useVideoConfig();
  const timeline = getVideoEditTimeline(project);
  if (
    !project.opening ||
    !getHouseMaterials(project).length ||
    !timeline.shots.length
  )
    return (
      <AbsoluteFill
        style={{
          background: INK,
          color: WHITE,
          justifyContent: 'center',
          alignItems: 'center',
          fontFamily: FONT,
          fontSize: 48,
        }}
      >
        请上传口播开场和房屋视频或照片
      </AbsoluteFill>
    );
  return (
    <AbsoluteFill style={{ background: graphicsOnly ? 'transparent' : INK }}>
      {!graphicsOnly && (
        <Sequence name="主封面" durationInFrames={timeline.coverFrames}>
          <VideoEditCover project={project} />
        </Sequence>
      )}
      <Sequence from={timeline.coverFrames} layout="none">
        <TransitionSeries>
          <TransitionSeries.Sequence
            name="真人口播开场"
            durationInFrames={timeline.openingFrames}
          >
            {!graphicsOnly && (
              <Video
                src={project.opening.src}
                objectFit="cover"
                volume={musicOnly ? 0 : project.openingVolume}
                style={{ width: '100%', height: '100%' }}
              />
            )}
            <OpeningIdentity project={project} />
          </TransitionSeries.Sequence>
          {timeline.overlap > 0 && (
            <TransitionSeries.Transition
              presentation={fade()}
              timing={linearTiming({ durationInFrames: timeline.overlap })}
            />
          )}
          {timeline.shots.map(({ shot, source, frames }, index) => (
            <Fragment key={shot.id}>
              <TransitionSeries.Sequence
                name={shot.title}
                durationInFrames={frames}
              >
                {!graphicsOnly && source?.kind === HouseMediaKind.Video && (
                  <Video
                    src={source.video.src}
                    objectFit="cover"
                    trimBefore={Math.round(shot.start * fps)}
                    volume={musicOnly ? 0 : project.houseVolume}
                    style={{ width: '100%', height: '100%' }}
                  />
                )}
                {!graphicsOnly && source?.kind === HouseMediaKind.Image && (
                  <Img
                    src={source.src}
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                    }}
                  />
                )}
                <ShotCopy project={project} shot={shot} index={index} />
              </TransitionSeries.Sequence>
              {index < timeline.shots.length - 1 && timeline.overlap > 0 && (
                <TransitionSeries.Transition
                  presentation={fade()}
                  timing={linearTiming({ durationInFrames: timeline.overlap })}
                />
              )}
            </Fragment>
          ))}
        </TransitionSeries>
      </Sequence>
      {timeline.overlap === 0 &&
        timeline.transitionFrames >= 3 &&
        timeline.shots.map(({ shot, start }) => (
          <Sequence
            key={shot.id}
            name="保留原声的画面淡化"
            from={start - Math.floor(timeline.transitionFrames / 2)}
            durationInFrames={timeline.transitionFrames}
            layout="none"
          >
            <OriginalSoundFade frames={timeline.transitionFrames} />
          </Sequence>
        ))}
      {!graphicsOnly && <TourMusic project={project} />}
      <Sequence
        from={Math.max(
          timeline.houseStart,
          timeline.frames - VIDEO_EDIT_TIMING.closingSeconds * fps,
        )}
        name="私信预约片尾"
      >
        <ClosingInvitation project={project} />
      </Sequence>
      <SpeechSubtitles project={project} />
      <Sequence from={timeline.coverFrames} layout="none" name="右下角水印">
        <VideoWatermark text={project.watermark} />
      </Sequence>
    </AbsoluteFill>
  );
}

/** Freeze the selected video's actual first frame; uploaded images share the same lettering and crop. */
export function VideoEditCover({ project }: { project: VideoEditProject }) {
  const first = getHouseMaterials(project)[0];
  const clip =
    project.coverSource === CoverSource.Opening
      ? project.opening
      : first?.kind === HouseMediaKind.Video
        ? first.video
        : null;
  const image =
    project.coverSource === CoverSource.Image
      ? project.coverImage
      : project.coverSource === CoverSource.House &&
          first?.kind === HouseMediaKind.Image
        ? first.src
        : null;
  return (
    <AbsoluteFill style={{ background: INK, color: WHITE, fontFamily: FONT }}>
      {image && (
        <Img
          src={image}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
      )}
      {project.coverSource !== CoverSource.Image && clip && (
        <Sequence name="封面底图第一帧" freeze={0}>
          <Video
            src={clip.src}
            muted
            objectFit="cover"
            style={{ width: '100%', height: '100%' }}
          />
        </Sequence>
      )}
      <PropertyCoverCopy
        name={project.name}
        price={project.price}
        facts={project.facts}
        extra={project.extra}
        contact={project.contact}
        template={project.videoTemplate}
      />
      <VideoWatermark text={project.watermark} />
    </AbsoluteFill>
  );
}

/** Internal export-only composition; all typography and animations reuse the normal film. */
export function VideoEditGraphics({ project }: { project: VideoEditProject }) {
  return <VideoEditFilm project={project} graphicsOnly />;
}
