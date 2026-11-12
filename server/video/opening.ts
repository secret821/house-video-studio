/** Local audio-driven talking portrait jobs. No face data leaves this machine. */
import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  renameSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { dirname, resolve } from 'node:path';
import { parseFile } from 'music-metadata';
import { z } from 'zod';

import {
  JobStatus,
  openingJobSchema,
  type OpeningInput,
  type OpeningJob,
  type VideoAsset,
} from '../../src/services/definition/project';
import {
  DATA,
  ROOT,
  UPLOADS,
  HttpError,
  resolveAsset,
  runFile,
} from '../media/media';
import { synthesizeSpeech } from '../speech/local-speech';

const ENGINE = resolve(DATA, 'local-avatar/SadTalker-main');
const PYTHON = resolve(DATA, 'local-avatar/venv/bin/python');
const JOBS = resolve(DATA, 'opening-jobs');
mkdirSync(JOBS, { recursive: true });
let activeJob: OpeningJob | null = null;

/** Capability is based on actual local executable and model files, not a UI toggle. */
export function getOpeningCapability() {
  const required = [
    PYTHON,
    resolve(ENGINE, 'inference.py'),
    resolve(ENGINE, 'checkpoints/SadTalker_V0.0.2_256.safetensors'),
    resolve(ENGINE, 'checkpoints/mapping_00109-model.pth.tar'),
    resolve(ENGINE, 'gfpgan/weights/alignment_WFLW_4HG.pth'),
    resolve(ENGINE, 'gfpgan/weights/detection_Resnet50_Final.pth'),
    resolve(DATA, 'local-avatar/bin/ffmpeg'),
  ];
  const ready = required.every(existsSync);
  return {
    ready,
    message: ready
      ? '本机口播引擎已就绪 · 照片与配音在本机处理'
      : '请先在项目终端执行 pnpm setup:avatar，安装本机口播模型。',
  };
}

/** Durable stage updates recover an interrupted job explicitly after server restart. */
function persist(job: OpeningJob) {
  const path = resolve(JOBS, `${job.id}.json`);
  writeFileSync(`${path}.tmp`, JSON.stringify(job));
  renameSync(`${path}.tmp`, path);
}

/** Read only bounded job identifiers; never resolve arbitrary filesystem input. */
export function getOpeningJob(id: string): OpeningJob {
  if (!/^[a-f0-9-]{36}$/.test(id))
    throw new HttpError(400, '无效的开场任务编号。');
  if (activeJob?.id === id) return activeJob;
  const path = resolve(JOBS, `${id}.json`);
  if (!existsSync(path)) throw new HttpError(404, '开场任务不存在。');
  const job = openingJobSchema.parse(JSON.parse(readFileSync(path, 'utf8')));
  if (job.status === JobStatus.Rendering) {
    job.status = JobStatus.Failed;
    job.message = '服务重启，人物开场生成中断，请重新生成。';
    persist(job);
  }
  return job;
}

/** Restore the last generation status after refreshing the editor. */
export function getLatestOpeningJob(): OpeningJob | null {
  if (activeJob) return activeJob;
  const paths = readdirSync(JOBS)
    .filter((name) => /^[a-f0-9-]{36}\.json$/.test(name))
    .sort(
      (a, b) =>
        statSync(resolve(JOBS, b)).mtimeMs - statSync(resolve(JOBS, a)).mtimeMs,
    );
  return paths.length ? getOpeningJob(paths[0].replace('.json', '')) : null;
}

/** Verify the actual output streams rather than trusting an MP4 extension. */
export function inspectVideo(path: string): Promise<VideoAsset> {
  return runFile(
    'pnpm',
    [
      'exec',
      'remotion',
      'ffprobe',
      '-v',
      'quiet',
      '-print_format',
      'json',
      '-show_streams',
      '-show_format',
      path,
    ],
    { cwd: ROOT, timeout: 30_000, maxBuffer: 2_000_000 },
  ).then(({ stdout }) => {
    const metadata = z
      .object({
        streams: z.array(
          z.object({
            codec_type: z.string(),
            width: z.number().optional(),
            height: z.number().optional(),
          }),
        ),
        format: z.object({ duration: z.coerce.number().positive().max(60) }),
      })
      .parse(JSON.parse(stdout));
    const video = metadata.streams.find(
      (stream) => stream.codec_type === 'video',
    );
    if (
      !video?.width ||
      !video.height ||
      !metadata.streams.some((stream) => stream.codec_type === 'audio')
    )
      throw new HttpError(422, '开场视频必须包含可播放的画面和声音。');
    return {
      src: `/media/${path.split('/').pop()}`,
      duration: metadata.format.duration,
      width: video.width,
      height: video.height,
    };
  });
}

/** The model's MP4V output is normalized to browser-compatible H.264/AAC before publication. */
export function normalizeOpeningVideo(
  source: string,
  target: string,
): Promise<VideoAsset> {
  const temporary = target.replace(/\.mp4$/, '.part.mp4');
  return runFile(
    resolve(DATA, 'local-avatar/bin/ffmpeg'),
    [
      '-y',
      '-i',
      source,
      '-vf',
      'pad=ceil(iw/2)*2:ceil(ih/2)*2',
      '-c:v',
      'libx264',
      '-preset',
      'fast',
      '-crf',
      '19',
      '-pix_fmt',
      'yuv420p',
      '-threads',
      '2',
      '-c:a',
      'aac',
      '-b:a',
      '128k',
      '-movflags',
      '+faststart',
      temporary,
    ],
    { cwd: ROOT, timeout: 180_000, maxBuffer: 2_000_000 },
  )
    .then(() => {
      renameSync(temporary, target);
      return inspectVideo(target);
    })
    .catch((error: unknown) => {
      writeFileSync(
        resolve(dirname(source), 'encoding.log'),
        error instanceof Error ? error.message : String(error),
      );
      throw new Error('口播画面已保留，视频编码失败；点击生成可直接重试编码。');
    });
}

// PyTorch 2.3 runs face synthesis on MPS; unsupported sampling/pooling operators use CPU.
// This bridge changes the execution device only; it preserves the model, weights and input pixels.
const MPS_COMPAT_BOOTSTRAP = String.raw`
import torch,torch.nn.functional as functional,runpy,sys
import torchvision.transforms.functional as vision_functional
sys.modules["torchvision.transforms.functional_tensor"]=vision_functional
cpu_operators=['grid_sample','interpolate','avg_pool3d','max_pool3d','adaptive_avg_pool3d']
def cpu_tensor(value):
    return value.cpu() if isinstance(value,torch.Tensor) else value
def restore_device(value,device):
    if isinstance(value,tuple):return tuple(restore_device(item,device) for item in value)
    return value.to(device) if isinstance(value,torch.Tensor) else value
def bridge(original):
    def invoke(input,*args,**kwargs):
        if isinstance(input,torch.Tensor) and input.device.type=='mps' and input.ndim==5:
            output=original(input.cpu(),*(cpu_tensor(item) for item in args),**{key:cpu_tensor(value) for key,value in kwargs.items()})
            return restore_device(output,input.device)
        return original(input,*args,**kwargs)
    return invoke
for name in cpu_operators:setattr(functional,name,bridge(getattr(functional,name)))
runpy.run_path('inference.py',run_name='__main__')
`;

/** Model stderr includes real batch percentages; non-measurable stages remain indeterminate. */
function runModel(job: OpeningJob, audioPath: string, directory: string) {
  return new Promise<void>((accept, reject) => {
    const child = spawn(
      PYTHON,
      [
        '-u',
        '-c',
        MPS_COMPAT_BOOTSTRAP,
        '--driven_audio',
        audioPath,
        '--source_image',
        resolveAsset(job.input.photo),
        '--result_dir',
        directory,
        '--preprocess',
        'full',
        '--still',
        '--size',
        '256',
        '--batch_size',
        '1',
        '--expression_scale',
        '1.0',
      ],
      {
        cwd: ENGINE,
        env: {
          ...process.env,
          PATH: `${resolve(DATA, 'local-avatar/bin')}:${process.env.PATH}`,
          OMP_NUM_THREADS: '4',
          OPENBLAS_NUM_THREADS: '4',
          PYTHONUNBUFFERED: '1',
          PYTORCH_ENABLE_MPS_FALLBACK: '1',
          PYTORCH_MPS_HIGH_WATERMARK_RATIO: '0.6',
          PYTORCH_MPS_LOW_WATERMARK_RATIO: '0.5',
          MPLCONFIGDIR: resolve(DATA, 'local-avatar/matplotlib'),
        },
        stdio: ['ignore', 'pipe', 'pipe'],
      },
    );
    let tail = '';
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      child.kill('SIGKILL');
    }, 40 * 60_000);
    /** Retain a bounded local diagnostic tail and derive progress only from model output. */
    function observe(chunk: Buffer) {
      const output = chunk.toString();
      tail = (tail + output).slice(-12_000);
      writeFileSync(resolve(directory, 'engine.log'), tail);
      if (/Face Renderer:/.test(output)) {
        const matches = [...output.matchAll(/Face Renderer:\s*:?\s*(\d+)%/g)];
        if (matches.length)
          job.progress = Number(matches[matches.length - 1][1]) / 100;
        job.message = '正在生成真实口型与表情，首次运行可能需要数分钟…';
      } else if (/seamlessClone:/.test(output)) {
        job.progress = null;
        job.message = '正在将动态人脸融合回原照片背景…';
      } else if (/3DMM Extraction/.test(output))
        job.message = '正在检测人脸并提取面部姿态…';
    }
    child.stdout.on('data', observe);
    child.stderr.on('data', observe);
    child.on('error', reject);
    child.on('close', (code) => {
      clearTimeout(timer);
      writeFileSync(resolve(directory, 'engine.log'), tail);
      if (code !== 0)
        reject(
          new Error(
            timedOut
              ? '本机生成超过40分钟，已停止。可缩短台词后重试。'
              : `本机口播模型执行失败，请查看 data/opening-jobs/${job.id}/engine.log。${tail
                  .split('\n')
                  .filter((line) => /Error:|Exception:/.test(line))
                  .slice(-1)
                  .join('')
                  .slice(0, 300)}`,
          ),
        );
      else accept();
    });
  });
}

/** Start a frozen opening request, using its own audio and a single bounded model process. */
export function createOpeningJob(input: OpeningInput): OpeningJob {
  if (activeJob) throw new HttpError(409, '已有口播开场正在生成，请稍候。');
  if (!getOpeningCapability().ready)
    throw new HttpError(503, getOpeningCapability().message);
  resolveAsset(input.photo);
  if (input.voiceover) {
    resolveAsset(input.voiceover.src);
    if (input.voiceover.duration > 30)
      throw new HttpError(400, '开场录音请控制在30秒以内。');
    if (input.voiceover.text !== null && input.voiceover.text !== input.script)
      throw new HttpError(400, '台词已经修改，请重新生成配音。');
  }
  const previous = getLatestOpeningJob();
  const reusable =
    previous?.status === JobStatus.Failed &&
    previous.input.photo === input.photo &&
    previous.input.script === input.script &&
    previous.input.voiceover?.src === input.voiceover?.src;
  const previousVideo =
    reusable && previous && existsSync(resolve(JOBS, previous.id))
      ? readdirSync(resolve(JOBS, previous.id)).find((name) =>
          name.endsWith('.mp4'),
        )
      : undefined;
  const job: OpeningJob = {
    id: randomUUID(),
    status: JobStatus.Rendering,
    progress: null,
    message: input.voiceover ? '正在准备开场录音…' : '正在生成普通话开场配音…',
    input,
    clip: null,
  };
  const directory = resolve(JOBS, job.id);
  mkdirSync(directory);
  persist(job);
  activeJob = job;
  let generation: Promise<void>;
  if (previousVideo && previous) {
    generation = Promise.resolve().then(() => {
      copyFileSync(
        resolve(JOBS, previous.id, previousVideo),
        resolve(directory, 'recovered-source.mp4'),
      );
      job.message = '画面已生成，正在重新编码…';
    });
  } else {
    const audio = input.voiceover
      ? parseFile(resolveAsset(input.voiceover.src)).then(({ format }) => {
          if (
            !format.duration ||
            !Number.isFinite(format.duration) ||
            format.duration > 30
          )
            throw new HttpError(400, '开场录音实际时长需在30秒以内。');
          return { ...input.voiceover!, duration: format.duration };
        })
      : synthesizeSpeech(input.script);
    generation = audio.then((voiceover) => {
      if (voiceover.duration > 30)
        throw new HttpError(400, '开场配音超过30秒，请缩短台词。');
      job.message = '正在加载本机口播模型…';
      persist(job);
      return runModel(job, resolveAsset(voiceover.src), directory);
    });
  }
  generation
    .then(() => {
      const output = readdirSync(directory).find((name) =>
        name.endsWith('.mp4'),
      );
      if (!output)
        throw new Error('模型没有生成视频。请换一张清晰的正面单人照片重试。');
      job.message = '正在检查视频画面与声音…';
      const path = resolve(UPLOADS, `${job.id}.mp4`);
      return normalizeOpeningVideo(resolve(directory, output), path);
    })
    .then((clip) => {
      job.clip = clip;
      job.status = JobStatus.Complete;
      job.progress = 1;
      job.message = '人物口播开场已生成，已可播放并加入成片。';
    })
    .catch((error: unknown) => {
      job.status = JobStatus.Failed;
      job.message =
        error instanceof Error ? error.message : '人物开场生成失败。';
      job.progress = null;
      console.error('[opening]', job.id, job.message);
    })
    .finally(() => {
      try {
        persist(job);
      } finally {
        activeJob = null;
      }
    })
    .catch((error: unknown) => {
      console.error(
        '[opening:save-status]',
        job.id,
        error instanceof Error ? error.message : error,
      );
    });
  return { ...job };
}
