/** Aliyun Beijing speech and portrait generation, scoped to the authorized local test project. */
import { createHash } from 'node:crypto';
import {
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  rmSync,
  statfsSync,
  statSync,
  openSync,
  closeSync,
  writeSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs';
import { basename, resolve } from 'node:path';
import { parseEnv } from 'node:util';
import { z } from 'zod';
import {
  type AudioAsset,
  type VideoAsset,
} from '../src/services/definition/project';
import {
  DATA,
  ROOT,
  UPLOADS,
  inspectAudio,
  resolveAsset,
  runFile,
} from './media';
import { inspectVideo } from './opening';
import {
  CloudCallKind,
  CloudCallState,
  readCloudLedger,
  reserveCloudCall,
  updateCloudCall,
} from './cloud-budget';

export const CLOUD_DIRECTORY = resolve(DATA, 'house-tour-v2/cloud');
export const CLOUD_LEDGER = resolve(CLOUD_DIRECTORY, 'budget.json');
export const CLOUD_VOICES = ['Cherry', 'Serena'] as const;
export type CloudVoice = (typeof CLOUD_VOICES)[number];
const TTS_MODEL = 'qwen3-tts-flash';
const VIDEO_MODEL = 'wan2.2-s2v';
const DETECT_MODEL = 'wan2.2-s2v-detect';
const taskSchema = z.object({
  output: z.object({
    task_id: z.string().regex(/^[a-zA-Z0-9-]{1,100}$/),
    task_status: z.enum([
      'PENDING',
      'RUNNING',
      'SUCCEEDED',
      'FAILED',
      'UNKNOWN',
      'CANCELED',
    ]),
    results: z.object({ video_url: z.string() }).optional(),
    video_url: z.string().optional(),
    code: z.string().optional(),
  }),
  usage: z.object({ duration: z.number().nonnegative().optional() }).optional(),
});

/** Parse the private file without exporting secrets into browser build variables or console output. */
export function readCloudConfig() {
  const file = resolve(ROOT, '.env.cloud');
  const local = existsSync(file) ? parseEnv(readFileSync(file, 'utf8')) : {};
  const key = process.env.DASHSCOPE_API_KEY || local.DASHSCOPE_API_KEY || '';
  const workspace =
    process.env.DASHSCOPE_WORKSPACE_ID || local.DASHSCOPE_WORKSPACE_ID || '';
  const keyReady = /^sk-[A-Za-z0-9_.-]{12,509}$/.test(key);
  const workspaceReady = /^[A-Za-z0-9][A-Za-z0-9-]{0,99}$/.test(workspace);
  return {
    key,
    workspace,
    keyReady,
    workspaceReady,
    ready: keyReady && workspaceReady,
  };
}

/** Default command is read-only and does not validate credentials through a billable cloud request. */
export function getCloudStatus() {
  const config = readCloudConfig();
  const ledger = readCloudLedger(CLOUD_LEDGER);
  return {
    ready: config.ready,
    keyConfigured: config.keyReady,
    workspaceConfigured: config.workspaceReady,
    speechReady: config.keyReady,
    speechModel: TTS_MODEL,
    speechMessage: config.keyReady
      ? '百炼自然女声 Cherry · 生成会调用云服务，修改解说后需重新生成。'
      : '请在项目 .env.cloud 中填写北京地域 DASHSCOPE_API_KEY，保存后刷新页面。',
    region: 'cn-beijing',
    model: VIDEO_MODEL,
    resolution: '720P',
    limitYuan: 30,
    maxOpenings: 2,
    maxOpeningSeconds: 12,
    reservedYuan:
      Object.values(ledger.calls).reduce(
        (sum, call) => sum + call.reserved_milli,
        0,
      ) / 1000,
    openingReservations: Object.values(ledger.calls).filter(
      (call) => call.kind === CloudCallKind.Video,
    ).length,
  };
}

/** Only provider-owned OSS resources may be read; signed links are never logged. */
export function aliyunMediaUrl(raw: string) {
  const url = new URL(raw);
  if (
    !['https:', 'http:'].includes(url.protocol) ||
    !/^[-a-zA-Z0-9]+\.oss-cn-(beijing|hangzhou|shanghai)\.aliyuncs\.com$/.test(
      url.hostname,
    ) ||
    url.username ||
    url.password ||
    url.port
  )
    throw new Error('云端返回了非许可的素材地址，已停止下载。');
  url.protocol = 'https:';
  return url.href;
}

/** One process owns the ledger; stale locks are reclaimed only when their owner no longer exists. */
function runWithCloudLock<T>(action: () => Promise<T>): Promise<T> {
  mkdirSync(CLOUD_DIRECTORY, { recursive: true });
  const lock = resolve(CLOUD_DIRECTORY, 'process.lock');
  if (existsSync(lock)) {
    const owner = z
      .object({ pid: z.number().int().positive() })
      .parse(JSON.parse(readFileSync(resolve(lock, 'owner.json'), 'utf8')));
    let alive = true;
    try {
      process.kill(owner.pid, 0);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ESRCH') alive = false;
      else throw error;
    }
    if (alive) return Promise.reject(new Error('已有云端制作命令正在执行。'));
    rmSync(lock, { recursive: true });
  }
  mkdirSync(lock);
  writeFileSync(
    resolve(lock, 'owner.json'),
    JSON.stringify({ pid: process.pid }),
    { mode: 0o600 },
  );
  return Promise.resolve()
    .then(action)
    .finally(() => rmSync(lock, { recursive: true }));
}

/** Lock acquisition failures are rejections so callers always execute their loading-state cleanup. */
export function withCloudLock<T>(action: () => Promise<T>): Promise<T> {
  return Promise.resolve().then(() => runWithCloudLock(action));
}

/** Deterministic identities bind cached speech/video to exact text, voice and source photo bytes. */
export function fingerprint(...values: Array<string | Buffer>) {
  const hash = createHash('sha256');
  values.forEach((value) => {
    hash.update(value);
    hash.update('\0');
  });
  return hash.digest('hex');
}

/** Do not use third-party gateways or arbitrary base URLs for this face-data authorization. */
function apiRequest<T>(
  path: string,
  schema: z.ZodType<T>,
  body?: unknown,
  asyncTask = false,
  uploadPolicy = false,
): Promise<T> {
  const config = readCloudConfig();
  if (
    !config.keyReady ||
    (!uploadPolicy &&
      (asyncTask ||
        path.startsWith('tasks/') ||
        path.includes('image2video/')) &&
      !config.workspaceReady)
  )
    return Promise.reject(
      new Error(
        '请先在本机 .env.cloud 配置北京地域 DASHSCOPE_API_KEY 和 DASHSCOPE_WORKSPACE_ID。',
      ),
    );
  const origin =
    uploadPolicy ||
    (!asyncTask && !path.startsWith('tasks/') && !path.includes('image2video/'))
      ? 'https://dashscope.aliyuncs.com'
      : `https://${config.workspace}.cn-beijing.maas.aliyuncs.com`;
  return fetch(`${origin}/api/v1/${path}`, {
    method: body === undefined ? 'GET' : 'POST',
    headers: {
      Authorization: `Bearer ${config.key}`,
      'Content-Type': 'application/json',
      'X-DashScope-OssResourceResolve': 'enable',
      ...(asyncTask ? { 'X-DashScope-Async': 'enable' } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
    redirect: 'error',
    signal: AbortSignal.timeout(120_000),
  }).then((response) =>
    response.json().then((payload: unknown) => {
      if (!response.ok) {
        const error = z
          .object({
            code: z.union([z.string(), z.number()]).optional(),
            error: z
              .object({
                code: z.union([z.string(), z.number()]).optional(),
                message: z.string().optional(),
              })
              .optional(),
            request_id: z.string().optional(),
            message: z.string().optional(),
          })
          .safeParse(payload);
        const code = error.success
          ? String(
              error.data.code ?? error.data.error?.code ?? 'request_failed',
            )
          : 'request_failed';
        const detail = error.success
          ? (error.data.message ?? error.data.error?.message ?? '')
              .replaceAll(config.key, '[密钥已隐藏]')
              .replace(/sk-[A-Za-z0-9_.-]+/g, '[密钥已隐藏]')
              .replace(/https?:\/\/\S+/g, '[地址已隐藏]')
              .slice(0, 200)
          : '';
        throw new Error(
          `阿里云请求失败（HTTP ${response.status}，${code.replace(/[^a-zA-Z0-9_.-]/g, '').slice(0, 80)}）；请检查账号服务权限、地域和余额。未自动重试。${detail}`,
        );
      }
      return schema.parse(payload);
    }),
  );
}

/** Stream with a strict byte cap; a failed transfer never publishes a partial asset. */
export function downloadCloudMedia(
  raw: string,
  target: string,
  maxBytes: number,
) {
  const url = aliyunMediaUrl(raw);
  const disk = statfsSync(UPLOADS);
  if (disk.bavail * disk.bsize < maxBytes * 2)
    return Promise.reject(new Error('本机剩余空间不足，请先释放空间。'));
  const part = `${target}.part`;
  return fetch(url, { redirect: 'error', signal: AbortSignal.timeout(180_000) })
    .then((response) => {
      if (!response.ok || !response.body)
        throw new Error(
          `云端素材下载失败（HTTP ${response.status}）；可恢复原任务。`,
        );
      if (Number(response.headers.get('content-length')) > maxBytes)
        throw new Error('云端素材超出大小上限。');
      const reader = response.body.getReader();
      const descriptor = openSync(part, 'w', 0o600);
      let total = 0;
      /** Read one chunk at a time so missing content-length cannot exhaust memory. */
      function transfer(): Promise<void> {
        return reader.read().then(({ done, value }) => {
          if (done) {
            if (!total) throw new Error('云端素材为空。');
            return;
          }
          total += value.byteLength;
          if (total > maxBytes) throw new Error('云端素材超出大小上限。');
          writeSync(descriptor, value);
          return transfer();
        });
      }
      return transfer().finally(() => {
        closeSync(descriptor);
        return reader.cancel();
      });
    })
    .then(() => renameSync(part, target))
    .catch((error: unknown) => {
      if (existsSync(part)) unlinkSync(part);
      throw error;
    });
}

/** Temporary uploads are private, model-bound and expire after 48 hours under Aliyun's test API. */
function upload(path: string, model: string): Promise<string> {
  const info = z.object({
    data: z.object({
      policy: z.string(),
      signature: z.string(),
      upload_dir: z.string(),
      upload_host: z.string(),
      oss_access_key_id: z.string(),
      x_oss_object_acl: z.literal('private'),
      x_oss_forbid_overwrite: z.string(),
    }),
  });
  return apiRequest(
    `uploads?action=getPolicy&model=${encodeURIComponent(model)}`,
    info,
    undefined,
    false,
    true,
  ).then(({ data }) => {
    const host = new URL(aliyunMediaUrl(data.upload_host));
    if (!host.hostname.endsWith('.oss-cn-beijing.aliyuncs.com'))
      throw new Error('临时上传地址不在已授权北京地域。');
    const key = `${data.upload_dir}/${fingerprint(readFileSync(path)).slice(0, 20)}-${basename(path)}`;
    const form = new FormData();
    const fields = {
      OSSAccessKeyId: data.oss_access_key_id,
      Signature: data.signature,
      policy: data.policy,
      'x-oss-object-acl': data.x_oss_object_acl,
      'x-oss-forbid-overwrite': data.x_oss_forbid_overwrite,
      key,
      success_action_status: '200',
    };
    Object.entries(fields).forEach(([name, value]) => form.append(name, value));
    form.append('file', new Blob([readFileSync(path)]), basename(path));
    return fetch(host.href, {
      method: 'POST',
      body: form,
      redirect: 'error',
      signal: AbortSignal.timeout(120_000),
    }).then((response) => {
      if (!response.ok)
        throw new Error(`北京临时素材上传失败（HTTP ${response.status}）。`);
      return `oss://${key}`;
    });
  });
}

/** Reuse completed audio or finish its download; an ambiguous POST is never sent twice. */
export function cloudSpeech(
  text: string,
  voice: CloudVoice,
): Promise<AudioAsset> {
  z.string()
    .min(1)
    .max(300)
    .refine((value) => value.trim().length > 0)
    .parse(text);
  if (!readCloudConfig().keyReady)
    return Promise.reject(
      new Error(
        '请先在 .env.cloud 填写北京地域 DASHSCOPE_API_KEY。未发起付费请求。',
      ),
    );
  z.enum(CLOUD_VOICES).parse(voice);
  const key = `speech-${fingerprint(TTS_MODEL, text, voice, 'dashscope-qwen-tts-v1')}`;
  const path = resolve(UPLOADS, `${key}.wav`);
  const existing = readCloudLedger(CLOUD_LEDGER).calls[key];
  if (existing?.audio && existsSync(path))
    return Promise.resolve(existing.audio);
  const resultSchema = z.object({
    output: z.object({ audio: z.object({ url: z.string() }) }),
    usage: z.object({ characters: z.number().nonnegative() }).optional(),
  });
  let source: Promise<string>;
  if (existing?.remote_url) source = Promise.resolve(existing.remote_url);
  else if (existing)
    return Promise.reject(
      new Error('配音请求结果尚未确认，已保留预算预留，未重复扣费提交。'),
    );
  else {
    reserveCloudCall(
      CLOUD_LEDGER,
      key,
      CloudCallKind.Speech,
      Math.max(1, Math.ceil(text.length * 0.08)),
    );
    source = apiRequest(
      'services/aigc/multimodal-generation/generation',
      resultSchema,
      {
        model: TTS_MODEL,
        input: {
          text,
          voice,
          language_type: 'Chinese',
        },
      },
    ).then((result) => {
      const url = aliyunMediaUrl(result.output.audio.url);
      updateCloudCall(CLOUD_LEDGER, key, {
        state: CloudCallState.Submitted,
        remote_url: url,
        actual_milli: (result.usage?.characters ?? text.length) * 0.08,
      });
      return url;
    });
  }
  return source
    .then((url) => downloadCloudMedia(url, path, 15_000_000))
    .then(() => inspectAudio(path, { name: `Qwen 自然女声 · ${voice}`, text }))
    .then((audio) => {
      updateCloudCall(CLOUD_LEDGER, key, {
        state: CloudCallState.Complete,
        audio,
      });
      return audio;
    });
}

/** Poll only an existing task, allowing restart recovery without another generation charge. */
function waitForVideo(
  key: string,
  taskId: string,
  deadline: number,
): Promise<string> {
  return apiRequest(`tasks/${taskId}`, taskSchema).then((result) => {
    const status = result.output.task_status;
    console.info(`万相原任务状态：${status}`);
    if (status === 'SUCCEEDED') {
      const raw = result.output.results?.video_url ?? result.output.video_url;
      if (!raw) throw new Error('云任务成功但没有视频地址，已保留任务ID。');
      const url = aliyunMediaUrl(raw);
      updateCloudCall(CLOUD_LEDGER, key, {
        remote_url: url,
        actual_milli:
          result.usage?.duration === undefined
            ? undefined
            : result.usage.duration * 900,
      });
      return url;
    }
    if (['FAILED', 'CANCELED', 'UNKNOWN'].includes(status)) {
      updateCloudCall(CLOUD_LEDGER, key, { state: CloudCallState.Failed });
      throw new Error(`万相原任务${status}；已停止，未自动重提。`);
    }
    if (Date.now() > deadline)
      throw new Error('云端等待超时；任务ID已保存，重新执行可继续查询原任务。');
    return new Promise<void>((done) => setTimeout(done, 15000)).then(() =>
      waitForVideo(key, taskId, deadline),
    );
  });
}

/** Bind video generation to the approved portrait and an actual <=12 second voice track. */
export function openingKey(photo: string, audio: AudioAsset) {
  return `video-${fingerprint(readFileSync(resolveAsset(photo)), readFileSync(resolveAsset(audio.src)), VIDEO_MODEL, '720P', 'speech-buffer-250ms-150ms-v1')}`;
}

/** Resolve completed, pending, and new video work through one durable operation identity. */
function generateCloudOpening(
  photo: string,
  audio: AudioAsset,
): Promise<VideoAsset> {
  if (!readCloudConfig().ready)
    return Promise.reject(
      new Error('请先在 .env.cloud 填写北京地域 API Key 和业务空间 ID。'),
    );
  const key = openingKey(photo, audio);
  const existing = readCloudLedger(CLOUD_LEDGER).calls[key];
  const path = resolve(UPLOADS, `${key}.mp4`);
  if (existing?.clip && existsSync(path)) return Promise.resolve(existing.clip);
  if (existing?.state === CloudCallState.Failed)
    return Promise.reject(new Error('原任务已失败，本轮不自动重提付费生成。'));
  let source: Promise<string>;
  if (existing?.remote_url) source = Promise.resolve(existing.remote_url);
  else if (existing?.task_id)
    source = waitForVideo(key, existing.task_id, Date.now() + 40 * 60000);
  else if (existing)
    return Promise.reject(
      new Error('原视频提交结果尚未确认，请先核对百炼任务记录，未重复提交。'),
    );
  else {
    if (audio.duration > 12)
      return Promise.reject(
        new Error('开场配音超过已授权12秒，请先缩短台词或调整配音。'),
      );
    if (
      Object.values(readCloudLedger(CLOUD_LEDGER).calls).some(
        (call) =>
          call.kind === CloudCallKind.Video &&
          [CloudCallState.Reserved, CloudCallState.Submitted].includes(
            call.state,
          ),
      )
    )
      return Promise.reject(new Error('请先恢复上一个云端视频任务。'));
    if (
      Object.values(readCloudLedger(CLOUD_LEDGER).calls).filter(
        (call) => call.kind === CloudCallKind.Video,
      ).length >= 2
    )
      return Promise.reject(new Error('已达到本轮最多两版人物开场的限制。'));
    const photoPath = resolveAsset(photo);
    const detectKey = `detect-${fingerprint(readFileSync(photoPath), DETECT_MODEL)}`;
    const detected = readCloudLedger(CLOUD_LEDGER).calls[detectKey];
    let check: Promise<boolean>;
    if (detected?.check_pass !== undefined)
      check = Promise.resolve(detected.check_pass);
    else if (detected)
      check = Promise.reject(new Error('人像检测请求结果未确认，未重复提交。'));
    else {
      reserveCloudCall(CLOUD_LEDGER, detectKey, CloudCallKind.Detect, 4);
      check = upload(photoPath, DETECT_MODEL)
        .then((image_url) =>
          apiRequest(
            'services/aigc/image2video/face-detect',
            z.object({ output: z.object({ check_pass: z.boolean() }) }),
            { model: DETECT_MODEL, input: { image_url } },
          ),
        )
        .then((result) => {
          updateCloudCall(CLOUD_LEDGER, detectKey, {
            state: CloudCallState.Complete,
            check_pass: result.output.check_pass,
            actual_milli: 4,
          });
          return result.output.check_pass;
        });
    }
    source = check
      .then((passed) => {
        if (!passed)
          throw new Error('人物照未通过万相输入检测，未提交视频任务。');
        reserveCloudCall(CLOUD_LEDGER, key, CloudCallKind.Video, 10800);
        return upload(photoPath, VIDEO_MODEL);
      })
      .then((image_url) =>
        prepareDrivingAudio(audio)
          .then((path) => upload(path, VIDEO_MODEL))
          .then((audio_url) =>
            apiRequest(
              'services/aigc/image2video/video-synthesis',
              taskSchema,
              {
                model: VIDEO_MODEL,
                input: { image_url, audio_url },
                parameters: { resolution: '720P' },
              },
              true,
            ),
          ),
      )
      .then((result) => {
        updateCloudCall(CLOUD_LEDGER, key, {
          state: CloudCallState.Submitted,
          task_id: result.output.task_id,
        });
        return waitForVideo(
          key,
          result.output.task_id,
          Date.now() + 40 * 60000,
        );
      });
  }
  const raw = resolve(CLOUD_DIRECTORY, `${key}-raw.mp4`);
  return source
    .then((url) =>
      existsSync(raw) ? undefined : downloadCloudMedia(url, raw, 80_000_000),
    )
    .then(() => normalizeCloudVideo(raw, path))
    .then((clip) => {
      if (clip.duration > 12.15)
        throw new Error(
          '云端片长超出12秒预期，已保存原任务，请核对账单后继续。',
        );
      updateCloudCall(CLOUD_LEDGER, key, {
        state: CloudCallState.Complete,
        clip,
      });
      return clip;
    });
}

/** Confirm a completed output before it is attached to the final house-tour draft. */
export function completedCloudOpening(photo: string, audio: AudioAsset) {
  const call = readCloudLedger(CLOUD_LEDGER).calls[openingKey(photo, audio)];
  if (call?.state !== CloudCallState.Complete || !call.clip)
    return Promise.reject(
      new Error('请先生成并检查这一音色的人物开场，再制作完整视频。'),
    );
  return inspectVideo(resolveAsset(call.clip.src));
}

/** Cloud encoding uses Remotion's bundled ffmpeg; no SadTalker installation is needed. */
function normalizeCloudVideo(
  source: string,
  target: string,
): Promise<VideoAsset> {
  const part = target.replace(/\.mp4$/, '.part.mp4');
  return runFile(
    'pnpm',
    [
      'exec',
      'remotion',
      'ffmpeg',
      '-y',
      '-i',
      source,
      '-vf',
      'scale=ceil(iw/2)*2:ceil(ih/2)*2',
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
      part,
    ],
    { cwd: ROOT, timeout: 180_000, maxBuffer: 2_000_000 },
  )
    .then(() => inspectVideo(part))
    .then((clip) => {
      renameSync(part, target);
      return { ...clip, src: `/media/${basename(target)}` };
    });
}

/** Wan removes a small leading audio window; silence protects the first spoken consonant.
 * Re-encoding also replaces provider streaming WAV placeholder lengths with a canonical PCM header.
 */
export function prepareDrivingAudio(audio: AudioAsset): Promise<string> {
  const source = resolveAsset(audio.src);
  const path = resolve(
    CLOUD_DIRECTORY,
    `drive-${fingerprint(readFileSync(source), 'buffer-v1')}.wav`,
  );
  if (existsSync(path)) return Promise.resolve(path);
  const part = path.replace(/\.wav$/, '.part.wav');
  return runFile(
    'pnpm',
    [
      'exec',
      'remotion',
      'ffmpeg',
      '-y',
      '-i',
      source,
      '-af',
      'adelay=250,apad=pad_dur=0.15',
      '-ar',
      '24000',
      '-ac',
      '1',
      '-c:a',
      'pcm_s16le',
      part,
    ],
    { cwd: ROOT, timeout: 30000, maxBuffer: 2_000_000 },
  )
    .then(() => inspectAudio(part, { name: '口播驱动缓冲', text: audio.text }))
    .then((verified) => {
      if (verified.duration > 12 || statSync(part).size >= 15_000_000)
        throw new Error('含缓冲的驱动音频超过12秒或15MB，请缩短开场。');
      renameSync(part, path);
      return path;
    });
}

/** Inspect source bytes before a cloud upload or charge, including browser-supplied recordings. */
export function cloudOpening(
  photo: string,
  audio: AudioAsset,
): Promise<VideoAsset> {
  const audioPath = resolveAsset(audio.src);
  return inspectAudio(audioPath, { name: audio.name, text: audio.text }).then(
    (verified) => {
      if (
        verified.duration + 0.4 > 12 ||
        statSync(audioPath).size >= 15_000_000 ||
        !/\.(wav|mp3)$/.test(audioPath)
      )
        throw new Error(
          '万相开场录音需为 WAV/MP3，小于15MB且含缓冲不超过12秒（原录音最多11.6秒）。',
        );
      return import('sharp')
        .then(({ default: sharp }) => sharp(resolveAsset(photo)).metadata())
        .then((metadata) => {
          if (
            !metadata.width ||
            !metadata.height ||
            Math.min(metadata.width, metadata.height) < 400 ||
            Math.max(metadata.width, metadata.height) > 7000
          )
            throw new Error('人物照片宽高都需在400到7000像素之间。');
          return prepareDrivingAudio(verified).then(() =>
            generateCloudOpening(photo, verified),
          );
        });
    },
  );
}
