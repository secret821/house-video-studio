/** Content-addressed local frame ranges preserve unchanged scenes and exact crossfades. */
import { workspaceDirectory } from './workspace';
import { createHash } from 'node:crypto';
import {
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { resolve } from 'node:path';
import { z } from 'zod';

import {
  FPS,
  type Project,
  type Scene,
} from '../src/services/definition/project';
import { getTimeline } from '../src/video/timeline';

import { ROOT, resolveAsset, runFile } from './media';

export interface RenderSegment {
  key: string;
  label: string;
  start: number;
  end: number;
  sceneIds: Array<string>;
}

/** Hash structured inputs or bytes without exposing local paths in user-facing responses. */
export function fingerprint(value: unknown): string {
  return createHash('sha256')
    .update(Buffer.isBuffer(value) ? value : JSON.stringify(value))
    .digest('hex');
}

/** Empty or identical overrides have the same rendered meaning as a legacy scene without caption. */
function sceneContent(scene: Scene) {
  const content = { ...scene };
  if (!content.caption || content.caption === content.narration)
    delete content.caption;
  return content;
}

/** Partition the exact preview timeline: opening, scene interiors and adjacent crossfades. */
export function planSegments(
  project: Project,
  identity: { template: string; asset: (src: string) => string },
): Array<RenderSegment> {
  const timeline = getTimeline(project);
  const segments: Array<RenderSegment> = [];
  const {
    aspect,
    showCaptions,
    name,
    location,
    area,
    layout,
    price,
    contact,
    demo,
  } = project;
  const common = {
    aspect,
    showCaptions,
    watermark: project.watermark,
    template: identity.template,
    fps: FPS,
  };
  const labels = { name, location, area, layout, price, contact, demo };
  /** Music is rendered in timeline coordinates, so a shifted start must invalidate its range. */
  function addSegment(
    segment: Omit<RenderSegment, 'key'>,
    content: unknown,
    sources: Array<string>,
  ) {
    const music = project.music && {
      ...project.music,
      volume: project.musicVolume,
      start: segment.start,
      digest: identity.asset(project.music.src),
    };
    segments.push({
      ...segment,
      key: fingerprint({
        common,
        content,
        music,
        frames: segment.end - segment.start + 1,
        assets: sources.map(identity.asset),
      }),
    });
  }
  if (project.opening?.clip) {
    addSegment(
      {
        label: '人物开场',
        start: 0,
        end: timeline.openingFrames - 1,
        sceneIds: [],
      },
      {
        opening: {
          source: project.opening.source,
          script: project.opening.script,
          clip: project.opening.clip,
        },
      },
      [project.opening.clip.src],
    );
  }
  timeline.scenes.forEach(({ scene, frames, start }, index) => {
    const incoming = index > 0 ? timeline.overlap : 0;
    const outgoing = index < timeline.scenes.length - 1 ? timeline.overlap : 0;
    const sources = [
      scene.src,
      ...(scene.voiceover ? [scene.voiceover.src] : []),
    ];
    addSegment(
      {
        label: `照片${index + 1} · ${scene.title}`,
        start: start + incoming,
        end: start + frames - outgoing - 1,
        sceneIds: [scene.id],
      },
      { labels, scene: sceneContent(scene), frames, offset: incoming },
      sources,
    );
    const next = timeline.scenes[index + 1];
    if (next && outgoing) {
      addSegment(
        {
          label: `照片${index + 1} → ${index + 2} 转场`,
          start: next.start,
          end: start + frames - 1,
          sceneIds: [scene.id, next.scene.id],
        },
        {
          labels,
          left: sceneContent(scene),
          leftFrames: frames,
          right: sceneContent(next.scene),
          rightFrames: next.frames,
          overlap: outgoing,
        },
        [
          ...sources,
          next.scene.src,
          ...(next.scene.voiceover ? [next.scene.voiceover.src] : []),
        ],
      );
    }
  });
  return segments;
}

export const CACHE_DIRECTORY = resolve(workspaceDirectory(), 'render-cache');
const manifestSchema = z.object({
  key: z.string(),
  video: z.string(),
  audio: z.string(),
});

/** The same template identity invalidates both disk segments and the server's compiled bundle. */
export function getTemplateFingerprint(): string {
  return fingerprint(
    ['house-tour.tsx', 'timeline.ts', 'root.tsx', 'video-watermark.tsx']
      .map((file) => readFileSync(resolve(ROOT, 'src/video', file), 'utf8'))
      .concat('range-pcm-48000-veryfast-v2'),
  );
}

/** Invalidate exports when video code or media bytes change, including after a server restart. */
export function getRenderSegments(project: Project): Array<RenderSegment> {
  const assets = new Map<string, string>();
  return planSegments(project, {
    template: getTemplateFingerprint(),
    asset: (src) => {
      if (!assets.has(src))
        assets.set(src, fingerprint(readFileSync(resolveAsset(src))));
      return assets.get(src)!;
    },
  });
}

/** Cache paths contain only server-generated hex hashes, never user-supplied filenames. */
export function segmentPaths(segment: RenderSegment) {
  return {
    video: resolve(workspaceDirectory('render-cache'), `${segment.key}.mp4`),
    audio: resolve(workspaceDirectory('render-cache'), `${segment.key}.wav`),
    manifest: resolve(
      workspaceDirectory('render-cache'),
      `${segment.key}.json`,
    ),
  };
}

/** Only a committed pair with matching media digests may be reused after interruption. */
export function hasCachedSegment(segment: RenderSegment): boolean {
  const paths = segmentPaths(segment);
  if (![paths.manifest, paths.video, paths.audio].every(existsSync))
    return false;
  try {
    const manifest = manifestSchema.parse(
      JSON.parse(readFileSync(paths.manifest, 'utf8')),
    );
    return (
      manifest.key === segment.key &&
      manifest.video === fingerprint(readFileSync(paths.video)) &&
      manifest.audio === fingerprint(readFileSync(paths.audio))
    );
  } catch (error) {
    console.warn(
      '[render-cache] invalid entry; rebuilding',
      segment.key,
      error instanceof Error ? error.name : 'invalid cache',
    );
    return false;
  }
}

/** Publishing the marker last makes partially written media safely retryable. */
export function commitSegment(segment: RenderSegment) {
  const paths = segmentPaths(segment);
  if (statSync(paths.video).size === 0 || statSync(paths.audio).size < 44)
    throw new Error('片段输出不完整，未写入缓存。');
  writeFileSync(
    `${paths.manifest}.tmp`,
    JSON.stringify({
      key: segment.key,
      video: fingerprint(readFileSync(paths.video)),
      audio: fingerprint(readFileSync(paths.audio)),
    }),
  );
  renameSync(`${paths.manifest}.tmp`, paths.manifest);
}

/** Copy cached H.264 frames and join PCM continuously; encode AAC once to avoid segment padding. */
export function concatenateSegments(input: {
  segments: Array<RenderSegment>;
  id: string;
  output: string;
}) {
  mkdirSync(workspaceDirectory('render-cache'), { recursive: true });
  const videoList = resolve(
    workspaceDirectory('render-cache'),
    `${input.id}-video.txt`,
  );
  const audioList = resolve(
    workspaceDirectory('render-cache'),
    `${input.id}-audio.txt`,
  );
  writeFileSync(
    videoList,
    input.segments
      .map(
        (segment) =>
          `file '${segment.key}.mp4'\nduration ${(segment.end - segment.start + 1) / FPS}`,
      )
      .join('\n'),
  );
  writeFileSync(
    audioList,
    input.segments.map((segment) => `file '${segment.key}.wav'`).join('\n'),
  );
  const frames = input.segments.reduce(
    (total, segment) => total + segment.end - segment.start + 1,
    0,
  );
  return runFile(
    'pnpm',
    [
      'exec',
      'remotion',
      'ffmpeg',
      '-y',
      '-f',
      'concat',
      '-safe',
      '1',
      '-i',
      videoList,
      '-f',
      'concat',
      '-safe',
      '1',
      '-i',
      audioList,
      '-map',
      '0:v:0',
      '-map',
      '1:a:0',
      '-c:v',
      'copy',
      '-c:a',
      'aac',
      '-b:a',
      '192k',
      '-t',
      String(frames / FPS),
      '-movflags',
      '+faststart',
      input.output,
    ],
    { cwd: ROOT, timeout: 120_000, maxBuffer: 4 * 1024 * 1024 },
  );
}
