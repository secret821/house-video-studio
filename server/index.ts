/** Loopback editor with server-only Bailian calls and locally stored media/results. */
import express from 'express';
import multer from 'multer';
import nextApp from 'next';
import { randomUUID } from 'node:crypto';
import { existsSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { z } from 'zod';

import {
  JobStatus,
  openingInputSchema,
  projectSchema,
  sceneSchema,
} from '../src/services/definition/project';

import { DEMO_PROJECT } from './demo';
import {
  DATA,
  EXPORTS,
  ROOT,
  UPLOADS,
  HttpError,
  inspectAudio,
  saveImage,
  synthesizeSpeech,
  resolveAsset,
  validateAssets,
} from './media';
import { createJob, getJob, getLatestJob } from './render';
import {
  createOpeningJob,
  getOpeningCapability,
  getOpeningJob,
  getLatestOpeningJob,
} from './cloud-opening';
import { cloudSpeech, getCloudStatus, withCloudLock } from './cloud';

import { videoEditRouter, getLatestVideoEditJob } from './video-edit';

import { copyRouter } from './copy';

const app = express();
const port = Number(process.env.PORT || 4317);
const origin = `http://127.0.0.1:${port}`;
const allowedHosts = new Set([`127.0.0.1:${port}`, `localhost:${port}`]);
let speechBusy = false;

// Host and Origin checks protect loopback file-writing endpoints from cross-site requests.
app.use((req, res, next) => {
  if (!allowedHosts.has(req.headers.host ?? ''))
    return next(new HttpError(403, '仅允许本机访问。'));
  const requestOrigin = req.headers.origin;
  if (
    requestOrigin &&
    ![origin, `http://localhost:${port}`].includes(requestOrigin)
  ) {
    // Remotion serves its composition on a separate ephemeral loopback port.
    // Only read-only media requests get this exception; API mutations stay same-origin.
    const rendererMedia =
      /^(GET|HEAD)$/.test(req.method) &&
      /^\/(media|demo)\//.test(req.path) &&
      /^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(requestOrigin);
    if (!rendererMedia) return next(new HttpError(403, '不允许跨站请求。'));
    res.setHeader('Access-Control-Allow-Origin', requestOrigin);
    res.setHeader('Vary', 'Origin');
  }
  next();
});
app.use(express.json({ limit: '256kb' }));
app.use('/media', express.static(UPLOADS, { dotfiles: 'deny' }));
app.use('/demo', express.static(resolve(ROOT, 'public/demo')));
app.use('/exports', express.static(EXPORTS));

app.use('/api/video-edit/create-render-job', (_req, _res, next) => {
  if (
    getLatestJob()?.status === JobStatus.Rendering ||
    getLatestOpeningJob()?.status === JobStatus.Rendering
  )
    return next(new HttpError(409, '请等待当前照片或口播任务完成。'));
  next();
});
app.use('/api/video-edit', videoEditRouter);
app.use('/api/copy', copyRouter);

app.get('/api/get-capabilities', (_req, res) =>
  res.json({
    localSpeechReady: process.platform === 'darwin',
    speechReady: getCloudStatus().speechReady,
    speechMessage: getCloudStatus().speechMessage,
  }),
);
app.get('/api/get-cloud-status', (_req, res) => res.json(getCloudStatus()));
app.post('/api/generate-opening-speech', (req, res, next) => {
  const { script } = openingInputSchema.parse(req.body);
  if (script.length > 50)
    throw new HttpError(400, '测试开场请控制在50字以内。');
  return withCloudLock(() => cloudSpeech(script, 'Cherry'))
    .then((audio) => res.json(audio))
    .catch(next);
});
app.get('/api/get-opening-capability', (_req, res) =>
  res.json(getOpeningCapability()),
);
app.get('/api/get-latest-opening-job', (_req, res) =>
  res.json(getLatestOpeningJob()),
);
app.post('/api/create-opening-job', (req, res) => {
  if (
    getLatestJob()?.status === JobStatus.Rendering ||
    getLatestVideoEditJob()?.status === JobStatus.Rendering
  )
    throw new HttpError(409, '请等待当前视频导出完成后再生成人物开场。');
  res.status(202).json(createOpeningJob(openingInputSchema.parse(req.body)));
});
app.get('/api/get-opening-job/:id', (req, res) =>
  res.json(getOpeningJob(req.params.id)),
);
app.get('/api/get-demo', (_req, res) => res.json(DEMO_PROJECT));
app.get('/api/get-latest-render-job', (_req, res) => res.json(getLatestJob()));
app.get('/api/get-draft', (_req, res) => {
  const path = resolve(DATA, 'draft.json');
  res.json(
    existsSync(path)
      ? projectSchema.parse(JSON.parse(readFileSync(path, 'utf8')))
      : null,
  );
});
app.post('/api/save-draft', (req, res) => {
  const project = projectSchema.parse(req.body);
  const path = resolve(DATA, 'draft.json');
  writeFileSync(`${path}.tmp`, JSON.stringify(project, null, 2));
  renameSync(`${path}.tmp`, path);
  res.json({ saved: true });
});
const imageUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024, files: 1 },
});
app.post('/api/upload-image', imageUpload.single('file'), (req, res, next) => {
  if (!req.file) return next(new HttpError(400, '请选择图片。'));
  return saveImage(req.file)
    .then((asset) => res.json(asset))
    .catch(next);
});
const audioUpload = multer({
  storage: multer.diskStorage({
    destination: UPLOADS,
    filename: (_req, file, done) => {
      const extension = file.originalname.split('.').pop()?.toLowerCase();
      if (!extension || !['wav', 'mp3', 'm4a', 'ogg'].includes(extension))
        return done(
          new HttpError(400, '请上传 WAV、MP3、M4A 或 OGG 音频。'),
          '',
        );
      done(null, `${randomUUID()}.${extension}`);
    },
  }),
  limits: { fileSize: 50 * 1024 * 1024, files: 1 },
});
app.post('/api/upload-audio', audioUpload.single('file'), (req, res, next) => {
  if (!req.file) return next(new HttpError(400, '请选择音频。'));
  return inspectAudio(req.file.path, {
    name: req.file.originalname,
    text: null,
  })
    .then((asset) => res.json(asset))
    .catch(next);
});
app.post('/api/generate-narration', (req, res, next) => {
  if (speechBusy) return next(new HttpError(409, '配音正在生成，请稍候。'));
  const scenes = z.array(sceneSchema).min(1).max(20).parse(req.body);
  speechBusy = true;
  // Serial cloud synthesis bounds concurrent calls and retains each completed result in the ledger.
  const output = new Map<string, ReturnType<typeof sceneSchema.parse>>();
  return withCloudLock(() =>
    scenes.reduce(
      (chain, scene) =>
        chain.then(() => {
          if (
            scene.voiceover &&
            (scene.voiceover.text === null ||
              scene.voiceover.text === scene.narration)
          ) {
            resolveAsset(scene.voiceover.src);
            output.set(scene.id, scene);
            return;
          }
          if (!scene.narration.trim()) {
            output.set(scene.id, { ...scene, voiceover: null });
            return;
          }
          return cloudSpeech(scene.narration, 'Cherry').then((voiceover) => {
            output.set(scene.id, { ...scene, voiceover });
          });
        }),
      Promise.resolve(),
    ),
  )
    .then(() => res.json(scenes.map((scene) => output.get(scene.id))))
    .catch(next)
    .finally(() => {
      speechBusy = false;
    });
});
app.post('/api/generate-local-narration', (req, res, next) => {
  if (speechBusy) return next(new HttpError(409, '配音正在生成，请稍候。'));
  const scene = sceneSchema.parse(req.body);
  resolveAsset(scene.src);
  if (!scene.narration.trim())
    throw new HttpError(400, '请先填写当前图片的解说文案。');
  speechBusy = true;
  return synthesizeSpeech(scene.narration)
    .then((voiceover) => res.json({ ...scene, voiceover }))
    .catch(next)
    .finally(() => {
      speechBusy = false;
    });
});
app.post('/api/create-render-job', (req, res) => {
  if (getLatestOpeningJob()?.status === JobStatus.Rendering)
    throw new HttpError(409, '请等待人物开场生成完成后再导出视频。');
  if (getLatestVideoEditJob()?.status === JobStatus.Rendering)
    throw new HttpError(409, '请等待免费视频剪辑完成。');
  const project = projectSchema.parse(req.body);
  validateAssets(project);
  res.status(202).json(createJob(project, origin));
});
app.get('/api/get-render-job/:id', (req, res) =>
  res.json(getJob(req.params.id)),
);

/** JSON errors must stay observable; never let an API failure become a successful HTML page. */
app.use('/api', (_req, _res, next) => next(new HttpError(404, '接口不存在。')));

/** Complete server setup before listening, so an open page never sees half-initialized routing. */
function startApp() {
  const dev = !process.argv.includes('--production');
  if (!dev && !existsSync(resolve(ROOT, '.next/BUILD_ID')))
    throw new Error('请先执行 pnpm build。');
  const frontend = nextApp({ dev, dir: ROOT, hostname: '127.0.0.1', port });
  const handle = frontend.getRequestHandler();
  return frontend.prepare().then(() => {
    app.use((req, res, next) => {
      handle(req, res).catch(next);
    });
  });
}

startApp()
  .then(() => {
    app.use(
      (
        error: unknown,
        _req: express.Request,
        res: express.Response,
        _next: express.NextFunction,
      ) => {
        const status =
          error instanceof HttpError
            ? error.status
            : error instanceof z.ZodError || error instanceof multer.MulterError
              ? 400
              : 500;
        const message =
          error instanceof z.ZodError
            ? `输入不符合要求：${error.issues.map((issue) => issue.message).join('；')}`
            : error instanceof Error
              ? error.message
              : '服务处理失败。';
        if (status === 500) console.error('[api]', error);
        res.status(status).json({ message });
      },
    );
    app
      .listen(port, '127.0.0.1', () =>
        console.info(`房源视频工作室已启动：${origin}`),
      )
      .on('error', (error: Error) => {
        console.error('本地服务启动失败：', error.message);
        process.exit(1);
      });
  })
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  });
