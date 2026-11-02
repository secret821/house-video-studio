/** Bounded local analysis and encoding reuse the pinned media binary and the caller's cancellation owner. */
import { createHash } from 'node:crypto';
import {
  mkdirSync,
  readFileSync,
  readdirSync,
  renameSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { basename, resolve } from 'node:path';
import { z } from 'zod';
import { FPS, VideoPreparation } from '../src/services/definition/project';
import {
  cleanSampleSchema,
  type CleanRange,
} from '../src/services/definition/smart-clean';
import { probeVideo } from './video-edit';
import { resolveAsset, HttpError } from './media';
import { runVideoUploadCommand, runVideoUploadMedia } from './video-upload';
import { workspaceDirectory } from './workspace';
import {
  getProblemRanges,
  getCleanWindows,
  planCleanSegments,
  type CleanWindow,
} from './smart-clean-ranges';

type Operation = { controller: AbortController };
export interface AnalyzedVideo {
  src: string;
  metadata: Awaited<ReturnType<typeof probeVideo>>;
  ranges: Array<CleanRange>;
  windows: Array<CleanWindow>;
}

/** Frame files live only in this account's protected scratch directory; no video/audio reaches a remote provider. */
export function analyzeCleanVideo(options: {
  src: string;
  directory: string;
  model: string;
  operation: Operation;
}): Promise<AnalyzedVideo> {
  const { src, directory, model, operation } = options;
  const frames = resolve(directory, 'frames');
  mkdirSync(frames, { recursive: true, mode: 0o700 });
  return probeVideo(resolveAsset(src), operation).then((metadata) =>
    runVideoUploadMedia(operation, {
      binary: 'ffmpeg',
      args: [
        '-v',
        'error',
        '-y',
        '-threads',
        '1',
        '-filter_threads',
        '1',
        '-protocol_whitelist',
        'file,pipe',
        '-format_whitelist',
        'mov',
        '-i',
        resolveAsset(src),
        '-an',
        '-vf',
        'scale=384:384:force_original_aspect_ratio=decrease',
        '-r',
        '4',
        '-frames:v',
        '2401',
        '-q:v',
        '3',
        resolve(frames, '%06d.jpg'),
      ],
    }).then(() => {
      const files = readdirSync(frames)
        .filter((name) => /^\d{6}\.jpg$/.test(name))
        .sort();
      if (!files.length)
        throw new HttpError(422, '无法读取房屋视频画面，原素材保留。');
      const output = resolve(directory, 'analysis.json'),
        input = resolve(directory, 'input.json');
      writeFileSync(
        input,
        JSON.stringify({
          model,
          output,
          frames: files.map((name, index) => ({
            path: resolve(frames, name),
            time: index / 4,
          })),
        }),
        { mode: 0o600 },
      );
      return runVideoUploadCommand(operation, {
        file: process.execPath,
        args: ['--import', 'tsx', 'scripts/smart-clean-inference.ts', input],
        env: { ...process.env, OMP_NUM_THREADS: '1' },
      }).then(() => {
        const samples = z
          .array(cleanSampleSchema)
          .min(1)
          .max(2402)
          .parse(JSON.parse(readFileSync(output, 'utf8')));
        const ranges = getProblemRanges(samples, metadata.duration);
        rmSync(frames, { recursive: true, force: true });
        return {
          src,
          metadata,
          ranges,
          windows: getCleanWindows(src, metadata.duration, ranges),
        };
      });
    }),
  );
}

/** Encode checked picture segments, then mux only the original clip's complete voice track. */
export function encodeCleanVideo(options: {
  video: AnalyzedVideo;
  donors: Array<CleanWindow>;
  directory: string;
  operation: Operation;
  identity: string;
}) {
  const { video, donors, directory, operation, identity } = options;
  const plan = planCleanSegments({
    src: video.src,
    duration: video.metadata.duration,
    ranges: video.ranges,
    donors,
  });
  const scale = Math.min(
    1,
    1080 / video.metadata.width,
    1920 / video.metadata.height,
  );
  const width = Math.max(2, Math.floor((video.metadata.width * scale) / 2) * 2),
    height = Math.max(2, Math.floor((video.metadata.height * scale) / 2) * 2);
  const hash = createHash('sha256')
    .update(identity)
    .update(video.src)
    .digest('hex');
  const output = resolve(workspaceDirectory('uploads'), `import-${hash}.mp4`),
    poster = resolve(workspaceDirectory('uploads'), `${hash}.jpg`);
  const partial = resolve(directory, 'cleaning.mp4');
  return plan
    .reduce(
      (chain, segment, index) =>
        chain.then(() =>
          runVideoUploadMedia(operation, {
            binary: 'ffmpeg',
            args: [
              '-v',
              'error',
              '-y',
              '-threads',
              '1',
              '-filter_threads',
              '1',
              '-ss',
              String(segment.sourceStart / FPS),
              '-protocol_whitelist',
              'file,pipe',
              '-format_whitelist',
              'mov',
              '-i',
              resolveAsset(segment.src),
              '-an',
              '-vf',
              `trim=duration=${segment.sourceFrames / FPS},scale=${width}:${height}:force_original_aspect_ratio=increase,crop=${width}:${height}`,
              '-r',
              '30',
              '-frames:v',
              String(segment.sourceFrames),
              '-c:v',
              'libx264',
              '-preset',
              'veryfast',
              '-bf',
              '0',
              '-aspect',
              `${width}:${height}`,
              '-crf',
              '20',
              '-pix_fmt',
              'yuv420p',
              resolve(directory, `base-${index}.mp4`),
            ],
          }).then(() => {
            const base = resolve(directory, `base-${index}.mp4`),
              target = resolve(directory, `part-${index}.mp4`);
            if (segment.frames === segment.sourceFrames) {
              renameSync(base, target);
              return;
            }
            return runVideoUploadMedia(operation, {
              binary: 'ffmpeg',
              args: [
                '-v',
                'error',
                '-y',
                '-stream_loop',
                '-1',
                '-i',
                base,
                '-an',
                '-c:v',
                'copy',
                '-frames:v',
                String(segment.frames),
                target,
              ],
            }).then(() => {});
          }),
        ),
      Promise.resolve(),
    )
    .then(() => {
      if (!video.metadata.hasAudio) return;
      return runVideoUploadMedia(operation, {
        binary: 'ffmpeg',
        args: [
          '-v',
          'error',
          '-y',
          '-threads',
          '1',
          '-protocol_whitelist',
          'file,pipe',
          '-format_whitelist',
          'mov',
          '-i',
          resolveAsset(video.src),
          '-vn',
          '-map',
          '0:a:0',
          '-af',
          `apad,atrim=duration=${Math.round(video.metadata.duration * FPS) / FPS},asetpts=PTS-STARTPTS`,
          '-c:a',
          'aac',
          '-b:a',
          '192k',
          '-ar',
          '48000',
          resolve(directory, 'voice.mp4'),
        ],
      }).then(() => {});
    })
    .then(() => {
      const concat = resolve(directory, 'concat.txt');
      writeFileSync(
        concat,
        plan.map((_, index) => `file 'part-${index}.mp4'`).join('\n'),
      );
      return runVideoUploadMedia(operation, {
        binary: 'ffmpeg',
        args: [
          '-v',
          'error',
          '-y',
          '-threads',
          '1',
          '-f',
          'concat',
          '-safe',
          '1',
          '-i',
          concat,
          ...(video.metadata.hasAudio
            ? ['-i', resolve(directory, 'voice.mp4')]
            : []),
          '-map',
          '0:v:0',
          ...(video.metadata.hasAudio
            ? ['-map', '1:a:0', '-c:a', 'copy']
            : ['-an']),
          '-c:v',
          'copy',
          '-movflags',
          '+faststart',
          partial,
        ],
      });
    })
    .then(() => probeVideo(partial, operation))
    .then((actual) => {
      if (
        Math.abs(actual.duration - video.metadata.duration) > 1 / FPS ||
        actual.hasAudio !== video.metadata.hasAudio
      )
        throw new HttpError(422, '清理副本时长或音轨校验失败，原素材保留。');
      return runVideoUploadMedia(operation, {
        binary: 'ffmpeg',
        args: [
          '-v',
          'error',
          '-y',
          '-threads',
          '1',
          '-i',
          partial,
          '-frames:v',
          '1',
          poster,
        ],
      }).then(() => {
        operation.controller.signal.throwIfAborted();
        renameSync(partial, output);
        return {
          src: `/media/${basename(output)}`,
          poster: `/media/${basename(poster)}`,
          preparation: VideoPreparation.Ready,
          name: basename(video.src),
          duration: video.metadata.duration,
          width: actual.width,
          height: actual.height,
          hasAudio: actual.hasAudio,
        };
      });
    })
    .catch((error: unknown) => {
      [partial, output, poster].forEach((file) => {
        try {
          rmSync(file, { force: true });
        } catch {
          console.error('[smart-clean] incomplete copy cleanup failed');
        }
      });
      throw error;
    });
}
