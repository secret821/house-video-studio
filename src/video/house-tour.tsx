/** Media canvas uses output pixels and deterministic frame animation, not CSS animation. */
import { Audio, Video } from '@remotion/media';
import { TransitionSeries, linearTiming } from '@remotion/transitions';
import { fade } from '@remotion/transitions/fade';
import { Fragment } from 'react';
import {
  AbsoluteFill,
  Img,
  Sequence,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';

import {
  Motion,
  OpeningSource,
  VideoTemplate,
  type Project,
  type Scene,
} from '../services/definition/project';

import { getCaptionLines, getTimeline } from './timeline';
import { VideoWatermark } from './video-watermark';
import { EDITORIAL_TEXT, EDITORIAL_TITLE } from './editorial-template';

/** Only the moving image subscribes to every frame; crop protects the image edges. */
function MotionPhoto({ scene, frames }: { scene: Scene; frames: number }) {
  const frame = useCurrentFrame();
  const progress = interpolate(frame, [0, frames - 1], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  let scale = 1.08;
  let translate = '0% 0%';
  if (scene.motion === Motion.Push) scale = 1.03 + progress * 0.09;
  if (scene.motion === Motion.Pull) scale = 1.12 - progress * 0.09;
  if (scene.motion === Motion.Left) translate = `${3 - progress * 6}% 0%`;
  if (scene.motion === Motion.Right) translate = `${-3 + progress * 6}% 0%`;
  if (scene.motion === Motion.Still) scale = 1;
  return (
    <Img
      src={scene.src}
      style={{
        width: '100%',
        height: '100%',
        objectFit: 'cover',
        scale,
        translate,
      }}
    />
  );
}

/** Divide the current scene's spoken duration among readable sentence captions. */
function SceneCaption({ scene, frames }: { scene: Scene; frames: number }) {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const lines = getCaptionLines(scene.caption || scene.narration);
  const spokenFrames = scene.voiceover
    ? scene.voiceover.duration * fps
    : frames - fps * 0.8;
  const index = Math.min(
    lines.length - 1,
    Math.floor((Math.max(0, frame - fps * 0.4) / spokenFrames) * lines.length),
  );
  if (!lines.length) return null;
  return (
    <div
      style={{
        position: 'absolute',
        bottom: width > height ? '35%' : '33%',
        left: '8%',
        right: '8%',
        textAlign: 'center',
        fontSize: width * 0.041,
        lineHeight: 1.65,
        color: 'white',
        textShadow: '0 2px 8px black',
      }}
    >
      <span
        style={{
          background: 'rgba(0,0,0,.48)',
          padding: '10px 20px',
          boxDecorationBreak: 'clone',
          borderRadius: 8,
        }}
      >
        {lines[index]}
      </span>
    </div>
  );
}

/** Each scene owns its image, label, subtitle and narration together. */
function PhotoScene({
  scene,
  frames,
  captions,
  template,
}: {
  scene: Scene;
  frames: number;
  captions: boolean;
  template: VideoTemplate;
}) {
  const { fps, width, height } = useVideoConfig();
  return (
    <AbsoluteFill style={{ overflow: 'hidden' }}>
      <MotionPhoto scene={scene} frames={frames} />
      {template === VideoTemplate.Classic && (
        <AbsoluteFill
          style={{
            background:
              'linear-gradient(180deg,rgba(0,0,0,.38),transparent 38%,transparent 48%,rgba(0,0,0,.68))',
          }}
        />
      )}
      <div
        style={{
          position: 'absolute',
          left: '8%',
          right: '8%',
          top: width > height ? '42%' : '35%',
          fontSize: Math.min(width, height) * 0.078,
          fontWeight: 600,
          color: 'white',
          letterSpacing: 2,
          ...(template === VideoTemplate.Editorial && EDITORIAL_TITLE),
        }}
      >
        {scene.title}
      </div>
      {captions && <SceneCaption scene={scene} frames={frames} />}
      {scene.voiceover && (
        <Sequence from={Math.round(0.4 * fps)} layout="none">
          <Audio src={scene.voiceover.src} />
        </Sequence>
      )}
    </AbsoluteFill>
  );
}

/** This is the single video template used by both the web Player and MP4 renderer. */
function PhotoTour({ project }: { project: Project }) {
  const { width, height } = useVideoConfig();
  const timeline = getTimeline(project);
  const facts = [project.area, project.layout, project.price]
    .filter(Boolean)
    .join('  /  ');
  return (
    <AbsoluteFill
      style={{
        backgroundColor: '#101b1a',
        fontFamily: 'PingFang SC, Microsoft YaHei, sans-serif',
        ...(project.videoTemplate === VideoTemplate.Editorial &&
          EDITORIAL_TEXT),
      }}
    >
      <TransitionSeries>
        {timeline.scenes.map(({ scene, frames }, index) => (
          <Fragment key={scene.id}>
            <TransitionSeries.Sequence
              durationInFrames={frames}
              name={scene.title}
            >
              <PhotoScene
                scene={scene}
                frames={frames}
                captions={project.showCaptions}
                template={project.videoTemplate}
              />
            </TransitionSeries.Sequence>
            {index < timeline.scenes.length - 1 && timeline.overlap > 0 && (
              <TransitionSeries.Transition
                presentation={fade()}
                timing={linearTiming({ durationInFrames: timeline.overlap })}
              />
            )}
          </Fragment>
        ))}
      </TransitionSeries>
      <div
        style={{
          position: 'absolute',
          // Keep the portrait heading below the watermark and mobile playback controls.
          top: project.watermark.trim() ? height * 0.2 : height * 0.16,
          left: '8%',
          right: '8%',
          color: 'white',
          ...(project.videoTemplate === VideoTemplate.Editorial &&
            EDITORIAL_TEXT),
        }}
      >
        <div
          style={{
            fontSize: Math.min(width, height) * 0.025,
            letterSpacing: 5,
            marginBottom: 16,
          }}
        >
          {project.demo ? '演示房源' : '房源实景'}
        </div>
        <div
          style={{
            ...(project.videoTemplate === VideoTemplate.Editorial &&
              EDITORIAL_TITLE),
            fontSize: Math.min(width, height) * 0.058,
            fontWeight: 600,
            lineHeight: 1.4,
            overflowWrap: 'anywhere',
          }}
        >
          {project.name}
        </div>
        <div
          style={{
            fontSize: Math.min(width, height) * 0.03,
            marginTop: 14,
            opacity: 0.9,
          }}
        >
          {project.location}
        </div>
      </div>
      <div
        style={{
          position: 'absolute',
          bottom: width > height ? '5%' : '19%',
          left: '8%',
          right: '8%',
          color: 'white',
          fontSize: width * 0.032,
          lineHeight: 1.6,
        }}
      >
        <div
          style={{
            borderTop: '1px solid rgba(255,255,255,.5)',
            paddingTop: 18,
          }}
        >
          {facts}
        </div>
        <div style={{ fontSize: width * 0.025, opacity: 0.85 }}>
          {project.contact}
        </div>
      </div>
    </AbsoluteFill>
  );
}

/** Opening captions follow the generated clip duration, with no delayed duplicate voice track. */
function OpeningCaption({
  script,
  duration,
}: {
  script: string;
  duration: number;
}) {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const lines = getCaptionLines(script);
  const index = Math.min(
    lines.length - 1,
    Math.floor((frame / (duration * fps)) * lines.length),
  );
  return (
    <div
      style={{
        position: 'absolute',
        bottom: width > height ? '12%' : '25%',
        left: '8%',
        right: '8%',
        color: 'white',
        textAlign: 'center',
        fontSize: width * 0.043,
        lineHeight: 1.6,
        textShadow: '0 2px 6px black',
      }}
    >
      {lines[index]}
    </div>
  );
}

/** A real talking-head video plays first, then the existing photo tour starts at its own zero. */
export function HouseTour({ project }: { project: Project }) {
  const timeline = getTimeline(project);
  const opening = project.opening;
  const { width } = useVideoConfig();
  return (
    <AbsoluteFill style={{ backgroundColor: '#101b1a' }}>
      {opening?.clip && (
        <Sequence durationInFrames={timeline.openingFrames} name="人物口播开场">
          <Video
            src={opening.clip.src}
            objectFit="cover"
            style={{ width: '100%', height: '100%' }}
          />
          {opening.source !== OpeningSource.Upload && (
            <AbsoluteFill
              style={{
                background:
                  'linear-gradient(0deg,rgba(0,0,0,.65),transparent 35%)',
                fontFamily: 'PingFang SC, Microsoft YaHei, sans-serif',
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  top: '16%',
                  right: '7%',
                  fontSize: width * 0.024,
                  color: 'white',
                  background: 'rgba(0,0,0,.35)',
                  padding: '8px 14px',
                  borderRadius: 6,
                }}
              >
                AI 数字人口播
              </div>
              {project.showCaptions && (
                <OpeningCaption
                  script={opening.script}
                  duration={opening.clip.duration}
                />
              )}
            </AbsoluteFill>
          )}
        </Sequence>
      )}
      {project.scenes.length > 0 && (
        <Sequence
          from={timeline.openingFrames}
          durationInFrames={timeline.frames - timeline.openingFrames}
          name="房源照片带看"
        >
          <PhotoTour project={project} />
        </Sequence>
      )}
      {project.music && (
        <Audio src={project.music.src} volume={project.musicVolume} loop />
      )}
      <VideoWatermark text={project.watermark} />
    </AbsoluteFill>
  );
}
