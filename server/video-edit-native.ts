/** Sparse browser graphics over streamed native frames; one media slot and one bounded frame pipeline per job. */
import {
  openBrowser,
  renderFrames,
  renderStill,
  selectComposition,
  type BrowserExecutable,
} from '@remotion/renderer';
import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';
import {
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { resolve } from 'node:path';
import { Transform, type TransformCallback } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import sharp from 'sharp';

import { FPS } from '../src/services/definition/project';
import type { VideoEditProject } from '../src/services/definition/video-edit';
import {
  getNativeVideoSegments,
  getVideoEditTimeline,
  getVideoGraphicFrames,
} from '../src/video/video-edit-timeline';
import { HttpError, ROOT, resolveAsset } from './media';
import {
  RENDER_CACHE_LIMITS,
  getVideoProcessingThreads,
} from './video-bundles';
import { getVideoMediaCommand, runVideoUploadMedia } from './video-upload';
import { workspaceDirectory } from './workspace';
import { getNativeCompositor } from './native-compositor-runtime';
import { createGraphicConcat } from './native-graphics-timing';

const WIDTH = 1080;
const HEIGHT = 1920;
const FRAME_BYTES = WIDTH * HEIGHT * 4;
/** Only an unusual encoded tail may fall back to the established renderer; other failures remain visible. */
export class NativeVideoCompatibilityError extends Error {}

type Operation = { controller: AbortController };
/** Streaming children use the same pinned binary and abort their whole process group before releasing ownership. */
function startPipe(
  operation: Operation,
  args: Array<string>,
  compositor?: string,
) {
  operation.controller.signal.throwIfAborted();
  const command = compositor
    ? { file: compositor, args, env: process.env }
    : getVideoMediaCommand({ binary: 'ffmpeg', args });
  const child = spawn(command.file, command.args, {
    cwd: ROOT,
    env: command.env,
    detached: process.platform !== 'win32',
    stdio: ['pipe', 'pipe', 'pipe'],
  }) as ChildProcessWithoutNullStreams;
  let stderr = '';
  let failure: unknown;
  const stop = () => {
    failure = operation.controller.signal.reason;
    if (!child.pid) return;
    try {
      if (process.platform === 'win32') child.kill('SIGKILL');
      else process.kill(-child.pid, 'SIGKILL');
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ESRCH')
        child.kill('SIGKILL');
    }
  };
  const done = new Promise<void>((complete, reject) => {
    child.stderr.on('data', (chunk: Buffer) => {
      stderr = (stderr + chunk.toString()).slice(-1024 * 1024);
    });
    child.on('error', (error) => {
      failure = error;
    });
    child.on('close', (code) => {
      operation.controller.signal.removeEventListener('abort', stop);
      if (failure) reject(failure);
      else if (code !== 0)
        reject(new Error(`原生视频处理退出 (${code})：${stderr.slice(-800)}`));
      else complete();
    });
    operation.controller.signal.addEventListener('abort', stop, { once: true });
    if (operation.controller.signal.aborted) stop();
  });
  return { child, done };
}

/** A reusable RGBA input frame and one graphics image keep the stream bounded; pipe() supplies backpressure. */
class GraphicsStream extends Transform {
  private readonly frame = Buffer.allocUnsafe(FRAME_BYTES);
  private offset = 0;
  private index = 0;
  private graphicIndex = 0;
  private graphic: Buffer | null = null;
  constructor(
    private readonly options: {
      directory: string;
      graphicFrames: Array<number>;
      start: number;
      frames: number;
      onFrame: (frame: number) => void;
    },
  ) {
    super({ highWaterMark: FRAME_BYTES });
  }

  private composite() {
    const global = this.options.start + this.index;
    let selected = this.graphicIndex;
    while (
      selected + 1 < this.options.graphicFrames.length &&
      this.options.graphicFrames[selected + 1] <= global
    )
      selected += 1;
    const pending =
      !this.graphic || selected !== this.graphicIndex
        ? sharp(
            readFileSync(
              resolve(
                this.options.directory,
                `g-${this.options.graphicFrames[selected]}.png`,
              ),
            ),
          )
            .ensureAlpha()
            .raw()
            .toBuffer()
            .then((graphic) => {
              this.graphic = graphic;
              this.graphicIndex = selected;
            })
        : Promise.resolve();
    return pending
      .then(() =>
        sharp(this.frame, {
          raw: { width: WIDTH, height: HEIGHT, channels: 4 },
        })
          .composite([
            {
              input: this.graphic!,
              raw: { width: WIDTH, height: HEIGHT, channels: 4 },
            },
          ])
          .raw()
          .toBuffer(),
      )
      .then((output) => {
        this.push(output);
        this.index += 1;
        this.options.onFrame(global + 1);
      });
  }

  _transform(
    chunk: Buffer,
    _encoding: BufferEncoding,
    callback: TransformCallback,
  ) {
    const consume = (position: number): Promise<void> => {
      const size = Math.min(FRAME_BYTES - this.offset, chunk.length - position);
      chunk.copy(this.frame, this.offset, position, position + size);
      this.offset += size;
      if (this.offset < FRAME_BYTES) return Promise.resolve();
      if (this.index >= this.options.frames)
        return Promise.reject(
          new NativeVideoCompatibilityError('视频帧数与源信息不一致。'),
        );
      return this.composite().then(() => {
        this.offset = 0;
        return position + size < chunk.length
          ? consume(position + size)
          : undefined;
      });
    };
    consume(0).then(() => callback(), callback);
  }

  _flush(callback: TransformCallback) {
    const missing = this.options.frames - this.index;
    if (this.offset || this.index === 0 || missing > 2)
      return callback(
        new NativeVideoCompatibilityError('视频尾帧信息不一致。'),
      );
    // AAC/container rounding can exceed video by at most two frames; hold its last picture while keeping all speech.
    Array.from({ length: missing }, () => 0)
      .reduce<Promise<void>>(
        (chain) => chain.then(() => this.composite()),
        Promise.resolve(),
      )
      .then(() => callback(), callback);
  }
}

/** Only count bounded YUV bytes; no frame copies or image work pass through Node on the accelerated path. */
class CheckedYuvStream extends Transform {
  private bytes = 0;
  constructor(
    private readonly frames: number,
    private readonly frameBytes: number,
    private readonly onFrame: (frame: number) => void,
  ) {
    super({ highWaterMark: 256 * 1024 });
  }
  _transform(
    chunk: Buffer,
    _encoding: BufferEncoding,
    callback: TransformCallback,
  ) {
    const before = Math.floor(this.bytes / this.frameBytes);
    this.bytes += chunk.length;
    const frame = Math.min(
      this.frames,
      Math.floor(this.bytes / this.frameBytes),
    );
    if (frame > before) this.onFrame(frame);
    this.push(chunk);
    callback();
  }
  _flush(callback: TransformCallback) {
    const actual = this.bytes / this.frameBytes;
    if (
      !Number.isInteger(actual) ||
      actual < 1 ||
      actual > this.frames ||
      this.frames - actual > 2
    )
      return callback(
        new NativeVideoCompatibilityError('视频尾帧信息不一致。'),
      );
    callback();
  }
}

function withDeadline<T>(
  operation: Operation,
  run: () => Promise<T>,
): Promise<T> {
  const timer = setTimeout(
    () =>
      operation.controller.abort(
        new HttpError(
          408,
          '单段视频合成超过15分钟，已停止，请缩短素材后重试。',
        ),
      ),
    15 * 60_000,
  );
  return Promise.resolve()
    .then(run)
    .finally(() => clearTimeout(timer));
}
const videoThreads = String(getVideoProcessingThreads());
const common = [
  '-v',
  'error',
  '-y',
  '-threads',
  videoThreads,
  '-filter_threads',
  videoThreads,
];
const videoEncoding = [
  '-c:v',
  'libx264',
  '-preset',
  'veryfast',
  '-crf',
  '19',
  '-threads',
  videoThreads,
  '-pix_fmt',
  'yuv420p',
  '-r',
  String(FPS),
  '-aspect',
  '9:16',
];
const audioEncoding = ['-ac', '2', '-ar', '48000', '-c:a', 'pcm_s16le'];

function silence(operation: Operation, output: string, frames: number) {
  return runVideoUploadMedia(operation, {
    binary: 'ffmpeg',
    args: [
      ...common,
      '-f',
      'lavfi',
      '-i',
      'anullsrc=r=48000:cl=stereo',
      ...audioEncoding,
      '-t',
      String(frames / FPS),
      output,
    ],
  }).then(() => {});
}

function renderSegment(options: {
  operation: Operation;
  segment: NonNullable<ReturnType<typeof getNativeVideoSegments>>[number];
  directory: string;
  ordinal: number;
  graphicFrames: Array<number>;
  onFrame: (frame: number) => void;
  compositor: string | null;
}) {
  const {
    operation,
    segment,
    directory,
    ordinal,
    graphicFrames,
    onFrame,
    compositor,
  } = options;
  const audioPath = resolve(directory, `${ordinal}.wav`);
  const videoPath = resolve(directory, `${ordinal}.mp4`);
  return withDeadline(operation, () => {
    const graphicsList = resolve(directory, `graphics-${ordinal}.txt`);
    if (compositor) {
      writeFileSync(
        graphicsList,
        createGraphicConcat({
          frames: graphicFrames,
          start: segment.start,
          length: segment.frames,
        }),
        { mode: 0o600 },
      );
    }
    const decoder = startPipe(operation, [
      ...common,
      '-ss',
      String(segment.sourceStart / FPS),
      '-protocol_whitelist',
      'file,pipe',
      '-format_whitelist',
      'mov',
      '-i',
      resolveAsset(segment.clip.src),
      '-map',
      '0:v:0',
      '-vf',
      compositor
        ? 'scale=iw:ih:in_range=auto:out_range=pc,format=pix_fmts=yuv420p'
        : 'scale=w=1080:h=1920:force_original_aspect_ratio=increase:flags=bilinear,crop=w=1080:h=1920,format=pix_fmts=rgba',
      '-r',
      String(FPS),
      '-frames:v',
      String(segment.frames),
      '-an',
      '-f',
      'image2pipe',
      '-c:v',
      'rawvideo',
      '-threads',
      '1',
      '-pix_fmt',
      compositor ? 'yuv420p' : 'rgba',
      'pipe:1',
      ...(segment.clip.hasAudio
        ? [
            '-map',
            '0:a:0',
            '-vn',
            '-af',
            `apad,atrim=duration=${segment.frames / FPS},asetpts=PTS-STARTPTS,volume=${segment.volume}`,
            ...audioEncoding,
            '-t',
            String(segment.frames / FPS),
            audioPath,
          ]
        : []),
    ]);
    decoder.child.stdin.end();
    const encoder = startPipe(
      operation,
      compositor
        ? [
            ...common,
            '-filter_complex_threads',
            videoThreads,
            '-f',
            'rawvideo',
            '-pixel_format',
            'yuv420p',
            '-video_size',
            `${segment.clip.width}x${segment.clip.height}`,
            '-framerate',
            String(FPS),
            '-color_range',
            'pc',
            '-i',
            'pipe:0',
            '-protocol_whitelist',
            'file,pipe',
            '-f',
            'concat',
            '-safe',
            '0',
            '-i',
            graphicsList,
            '-filter_complex',
            '[0:v]scale=w=1080:h=1920:force_original_aspect_ratio=increase:flags=bilinear:in_range=pc:out_range=tv,crop=w=1080:h=1920,tpad=stop_mode=clone:stop=2[v];[1:v]format=yuva420p[g];[v][g]overlay=shortest=0:eof_action=repeat:format=yuv420[out]',
            '-map',
            '[out]',
            '-an',
            ...videoEncoding,
            '-frames:v',
            String(segment.frames),
            videoPath,
          ]
        : [
            ...common,
            '-f',
            'image2pipe',
            '-c:v',
            'rawvideo',
            '-pixel_format',
            'rgba',
            '-video_size',
            `${WIDTH}x${HEIGHT}`,
            '-frame_size',
            String(FRAME_BYTES),
            '-probesize',
            '32',
            '-analyzeduration',
            '0',
            '-framerate',
            String(FPS),
            '-i',
            'pipe:0',
            '-map',
            '0:v:0',
            '-an',
            ...videoEncoding,
            '-frames:v',
            String(segment.frames),
            videoPath,
          ],
      compositor ?? undefined,
    );
    encoder.child.stdout.resume();
    const graphics = compositor
      ? new CheckedYuvStream(
          segment.frames,
          segment.clip.width * segment.clip.height * 1.5,
          (frame) => onFrame(segment.start + frame),
        )
      : new GraphicsStream({
          directory,
          graphicFrames,
          start: segment.start,
          frames: segment.frames,
          onFrame,
        });
    const tasks = [
      decoder.done,
      encoder.done,
      pipeline(decoder.child.stdout, graphics, encoder.child.stdin),
    ];
    return Promise.all(tasks)
      .catch((error: unknown) => {
        operation.controller.abort(error);
        return Promise.allSettled(tasks).then(() => {
          throw error;
        });
      })
      .then(() =>
        segment.clip.hasAudio
          ? undefined
          : silence(operation, audioPath, segment.frames),
      );
  });
}

/** The normal template creates exact transparent frames; native decoding/compositing never reimplements its animation. */
export function renderNativeVideo(options: {
  project: VideoEditProject;
  absolute: VideoEditProject;
  serveUrl: string;
  jobId: string;
  output: string;
  cover: string;
  browserExecutable?: BrowserExecutable;
  onProgress: (progress: number, message: string) => void;
}) {
  const {
    project,
    absolute,
    serveUrl,
    jobId,
    output,
    cover,
    browserExecutable,
    onProgress,
  } = options;
  const segments = getNativeVideoSegments(project);
  if (!segments)
    return Promise.reject(
      new NativeVideoCompatibilityError('当前时间线需要常规转场渲染。'),
    );
  const timeline = getVideoEditTimeline(project);
  const graphicFrames = getVideoGraphicFrames(project);
  const directory = workspaceDirectory('video-edit', 'native', jobId);
  mkdirSync(directory, { recursive: true });
  const operation = { controller: new AbortController() };
  let compositor: string | null = null;
  return getNativeCompositor()
    .then((runtime) => {
      compositor = runtime;
      return openBrowser('chrome', { browserExecutable, logLevel: 'error' });
    })
    .then((browser) => {
      const shared = {
        serveUrl,
        inputProps: { project: absolute },
        browserExecutable,
        puppeteerInstance: browser,
      };
      return selectComposition({ ...shared, id: 'FreeVideoCover' })
        .then((composition) =>
          renderStill({
            ...shared,
            ...RENDER_CACHE_LIMITS,
            composition,
            output: cover,
            imageFormat: 'png',
          }),
        )
        .then(() => selectComposition({ ...shared, id: 'FreeVideoGraphics' }))
        .then((composition) =>
          renderFrames({
            ...shared,
            ...RENDER_CACHE_LIMITS,
            composition,
            imageFormat: 'png',
            frames: graphicFrames,
            outputDir: null,
            concurrency: 1,
            muted: true,
            onStart: () => onProgress(0.15, '正在准备字幕与动画图层…'),
            onFrameUpdate: (rendered) =>
              onProgress(
                0.15 + (rendered / graphicFrames.length) * 0.2,
                `正在生成字幕动画 ${rendered}/${graphicFrames.length}帧…`,
              ),
            onFrameBuffer: (buffer, frame) => {
              writeFileSync(resolve(directory, `g-${frame}.png`), buffer, {
                mode: 0o600,
              });
            },
          }),
        )
        .finally(() => browser.close({ silent: true }));
    })
    .then(() => {
      for (const frame of graphicFrames)
        if (!existsSync(resolve(directory, `g-${frame}.png`)))
          throw new Error('字幕图层帧不完整。');
      return withDeadline(operation, () =>
        runVideoUploadMedia(operation, {
          binary: 'ffmpeg',
          args: [
            ...common,
            '-loop',
            '1',
            '-i',
            cover,
            ...videoEncoding,
            '-frames:v',
            String(timeline.coverFrames),
            '-an',
            resolve(directory, '0.mp4'),
          ],
        }).then(() =>
          silence(operation, resolve(directory, '0.wav'), timeline.coverFrames),
        ),
      );
    })
    .then(() =>
      segments.reduce(
        (chain, segment, index) =>
          chain.then(() =>
            renderSegment({
              operation,
              segment,
              directory,
              ordinal: index + 1,
              graphicFrames,
              compositor,
              onFrame: (frame) =>
                onProgress(
                  0.35 + (frame / timeline.frames) * 0.6,
                  `${compositor ? '正在高效合成' : '正在兼容合成'}第${index + 1}/${segments.length}段视频 · ${Math.round((frame / timeline.frames) * 100)}%`,
                ),
            }),
          ),
        Promise.resolve(),
      ),
    )
    .then(() => {
      onProgress(0.96, '正在合并原声与背景音乐…');
      writeFileSync(
        resolve(directory, 'video.txt'),
        Array.from(
          { length: segments.length + 1 },
          (_, index) => `file '${index}.mp4'`,
        ).join('\n'),
      );
      writeFileSync(
        resolve(directory, 'audio.txt'),
        Array.from(
          { length: segments.length + 1 },
          (_, index) => `file '${index}.wav'`,
        ).join('\n'),
      );
      const duration = timeline.frames / FPS;
      const music = project.music;
      return withDeadline(operation, () =>
        runVideoUploadMedia(operation, {
          binary: 'ffmpeg',
          args: [
            ...common,
            '-f',
            'concat',
            '-safe',
            '1',
            '-i',
            resolve(directory, 'video.txt'),
            '-f',
            'concat',
            '-safe',
            '1',
            '-i',
            resolve(directory, 'audio.txt'),
            ...(music
              ? [
                  '-stream_loop',
                  '-1',
                  '-i',
                  resolveAsset(music.src),
                  '-filter_complex',
                  `[2:a]atrim=duration=${duration},asetpts=PTS-STARTPTS,volume='${project.musicVolume}*max(0,min(1,min(t/1.2,(${(timeline.frames - 1) / FPS}-t)/2)))':eval=frame[m];[1:a][m]amix=inputs=2:duration=first:normalize=0[a]`,
                  '-map',
                  '0:v:0',
                  '-map',
                  '[a]',
                ]
              : ['-map', '0:v:0', '-map', '1:a:0']),
            '-c:v',
            'copy',
            '-c:a',
            'aac',
            '-b:a',
            '192k',
            '-ar',
            '48000',
            '-t',
            String(duration),
            '-movflags',
            '+faststart',
            output,
          ],
        }).then(() => {}),
      );
    })
    .finally(() => rmSync(directory, { recursive: true, force: true }));
}
