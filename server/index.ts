/** Loopback editor with server-only Bailian calls and locally stored media/results. */
import {
  workspaceDirectory,
  workspaceState,
  startWorkspaceCleanup,
  TEMPORARY_MEDIA,
  getWorkspace,
  runInWorkspace,
} from './workspace';
import express from 'express';
import multer from 'multer';
import nextApp from 'next';
import { randomUUID } from 'node:crypto';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { z } from 'zod';
import { VIDEO_UPLOAD_TIMEOUT_MS } from '../src/services/definition/video-upload';

import {
  JobStatus,
  DraftKind,
  openingInputSchema,
  projectSchema,
  projectDraftSchema,
  sceneSchema,
} from '../src/services/definition/project';

import { DEMO_PROJECT } from './demo';
import {
  ROOT,
  HttpError,
  inspectAudio,
  saveImage,
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
import { getVideoUploadStatus } from './video-upload';
import { acquireMediaSlot } from './media-queue';
import { getLocalSpeechCapability, synthesizeSpeech } from './local-speech';
import { getOriginalMusic } from './video-edit-music';
import { MusicTrack } from '../src/services/definition/music';

import { copyRouter } from './copy';
import { musicRouter, musicPreviewRouter } from './music-library';
import { subtitlesRouter } from './subtitles';
import { smartCleanRouter } from './smart-clean';
import { getAccessPolicy } from './access-policy';
import { installWorkspaceAuth, loadAuthCredentials } from './auth';
import { loadActiveAccounts, getAccountId } from './account-repository';
import { closeDatabase, databaseEnabled, verifyDatabase } from './database';
import {
  prepareLocalStudioPort,
  stopPreviousLocalStudio,
} from './port-recovery';
import {
  getDatabaseCurrentDraft,
  saveDatabaseCurrentDraft,
  cleanupDatabaseDiscardedMedia,
  startDatabaseDraftCleanup,
} from './database-current-draft';
import { reserveStorage, storageLimits, MIB } from './storage-capacity';
import {
  getCurrentDraft,
  saveCurrentDraft,
  cleanupDiscardedDraftMedia,
  startCurrentDraftCleanup,
} from './current-draft';

storageLimits();

const app = express();
const port = Number(process.env.PORT || 4318);
const origin = `http://127.0.0.1:${port}`;
const access = getAccessPolicy(port, process.env.PUBLIC_ORIGIN);
if (process.env.PUBLIC_ORIGIN && !TEMPORARY_MEDIA)
  throw new Error(
    '公网工作室必须启用STUDIO_TEMPORARY_MEDIA=1，业务文件仅临时保存。',
  );
const speechState = () => workspaceState('speech', () => ({ busy: false }));

// Host and Origin checks protect loopback file-writing endpoints from cross-site requests.
app.use((req, res, next) => {
  if (!access.hosts.has(req.headers.host ?? ''))
    return next(new HttpError(403, '仅允许本机访问。'));
  const requestOrigin = req.headers.origin;
  if (requestOrigin && !access.origins.has(requestOrigin)) {
    // Remotion serves its composition on a separate ephemeral loopback port.
    // Only read-only media requests get this exception; API mutations stay same-origin.
    const rendererMedia =
      /^(GET|HEAD)$/.test(req.method) &&
      /^\/(?:_workspace\/(?:legacy|[a-f0-9-]{36})\/)?(media|demo)\//.test(
        req.path,
      ) &&
      /^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(requestOrigin);
    if (!rendererMedia) return next(new HttpError(403, '不允许跨站请求。'));
    res.setHeader('Access-Control-Allow-Origin', requestOrigin);
    res.setHeader('Vary', 'Origin');
  }
  next();
});
if (process.env.PUBLIC_ORIGIN && !process.env.STUDIO_SESSION_STORE)
  throw new Error('公网服务必须配置STUDIO_SESSION_STORE以保留7天登录状态。');
if (process.env.PUBLIC_ORIGIN && !databaseEnabled())
  throw new Error('公网服务必须配置 STUDIO_DB_CONFIG 并完成 MySQL 迁移。');
const authApp = express();
app.use(authApp);
const authReady = databaseEnabled()
  ? verifyDatabase()
      .then(() => loadActiveAccounts())
      .then((accounts) => {
        if (process.env.PUBLIC_ORIGIN && !accounts.length)
          throw new Error('MySQL 中没有有效的工作室账号。');
        return accounts.length
          ? {
              accounts: accounts.map(
                ({ workspaceId, username, salt, passwordHash }) => ({
                  workspaceId,
                  username,
                  salt,
                  passwordHash,
                }),
              ),
            }
          : getAccountId('legacy').then(() => null);
      })
      .then((credentials) => {
        installWorkspaceAuth(authApp, {
          credentials,
          publicOrigin: process.env.PUBLIC_ORIGIN,
          sessionStorePath: process.env.STUDIO_SESSION_STORE,
          port,
        });
      })
  : Promise.resolve().then(() => {
      installWorkspaceAuth(authApp, {
        credentials: loadAuthCredentials(
          process.env.STUDIO_AUTH_CONFIG,
          process.env.PUBLIC_ORIGIN,
        ),
        publicOrigin: process.env.PUBLIC_ORIGIN,
        sessionStorePath: process.env.STUDIO_SESSION_STORE,
        port,
      });
    });
// Timed captions can exceed the small metadata body; scope the larger bounded JSON parser to video export.
app.use(
  [
    '/api/video-edit/create-render-job',
    '/api/video-edit/save-draft',
    '/api/save-draft',
  ],
  express.json({ limit: '2mb' }),
);
app.use(express.json({ limit: '256kb' }));
app.use((_req, res, next) => {
  // Auth's earlier finish listener releases the request first; active jobs/streams still prevent deletion.
  const workspace = getWorkspace();
  res.once('finish', () =>
    runInWorkspace(workspace, () => {
      try {
        if (databaseEnabled()) {
          cleanupDatabaseDiscardedMedia().catch(() =>
            console.error(
              '[current-draft:cleanup] MySQL 旧素材清理失败，将在下次检查时重试。',
            ),
          );
          return;
        }
        cleanupDiscardedDraftMedia();
      } catch {
        console.error(
          '[current-draft:cleanup] 旧素材清理未完成，将在下次检查时重试。',
        );
      }
    }),
  );
  next();
});
app.use('/media', (req, res, next) =>
  express.static(workspaceDirectory('uploads'), {
    dotfiles: 'deny',
    index: false,
  })(req, res, next),
);
app.use('/media', (req, res, next) =>
  express.static(workspaceDirectory('video-edit', 'prepared'), {
    dotfiles: 'deny',
    index: false,
  })(req, res, next),
);
app.use('/demo', express.static(resolve(ROOT, 'public/demo')));
app.use('/exports', (req, res, next) =>
  express.static(workspaceDirectory('exports'), {
    dotfiles: 'deny',
    index: false,
  })(req, res, next),
);

app.use(
  ['/api/video-edit/create-render-job', '/api/video-edit/upload-video'],
  (_req, _res, next) => {
    if (
      getLatestJob()?.status === JobStatus.Rendering ||
      getLatestOpeningJob()?.status === JobStatus.Rendering
    )
      return next(new HttpError(409, '请等待当前照片或口播任务完成。'));
    next();
  },
);
app.use('/api/video-edit', videoEditRouter);
app.use('/api/copy', copyRouter);
app.use('/api/music', musicRouter);
app.use('/music-preview', musicPreviewRouter);
app.use('/api/subtitles', subtitlesRouter);
app.use('/api/smart-clean', smartCleanRouter);

app.get('/api/get-capabilities', (_req, res) =>
  res.json(getLocalSpeechCapability()),
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
    getVideoUploadStatus().active ||
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
app.get('/api/get-draft', (_req, res, next) =>
  Promise.resolve(
    databaseEnabled()
      ? getDatabaseCurrentDraft(DraftKind.Photo, projectDraftSchema)
      : getCurrentDraft(DraftKind.Photo, projectDraftSchema),
  )
    .then((draft) => res.json(draft))
    .catch(next),
);
app.post('/api/save-draft', (req, res, next) =>
  Promise.resolve(
    databaseEnabled()
      ? saveDatabaseCurrentDraft(DraftKind.Photo, projectDraftSchema, req.body)
      : saveCurrentDraft(DraftKind.Photo, projectDraftSchema, req.body),
  )
    .then((draft) => res.json(draft))
    .catch(next),
);
const imageUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024, files: 1 },
});
// Acquire before multipart buffering: a second account's 20MB image/Sharp decode must not compete with a running render.
app.post('/api/upload-image', (req, res, next) => {
  const releaseStorage = reserveStorage(40 * MIB);
  const controller = new AbortController();
  const disconnected = () => {
    if (!res.writableFinished)
      controller.abort(new HttpError(499, '图片上传连接已断开。'));
  };
  res.once('close', disconnected);
  return acquireMediaSlot(controller.signal)
    .then((release) => {
      if (controller.signal.aborted || req.destroyed) {
        release();
        throw new HttpError(499, '图片上传连接已断开。');
      }
      return new Promise<void>((resolveUpload, reject) => {
        imageUpload.single('file')(req, res, (error: unknown) => {
          if (error) reject(error);
          else resolveUpload();
        });
      })
        .then(() => {
          if (!req.file) throw new HttpError(400, '请选择图片。');
          return saveImage(req.file);
        })
        .then((asset) => res.json(asset))
        .finally(release);
    })
    .catch((error: unknown) => {
      if (!res.destroyed) next(error);
    })
    .finally(() => {
      res.off('close', disconnected);
      releaseStorage();
    });
});
const audioUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, done) =>
      done(null, workspaceDirectory('uploads')),
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
app.post('/api/upload-audio', (req, res, next) => {
  const releaseStorage = reserveStorage(50 * MIB);
  return new Promise<void>((resolveUpload, reject) => {
    audioUpload.single('file')(req, res, (error: unknown) => {
      if (error) reject(error);
      else resolveUpload();
    });
  })
    .then(() => {
      if (!req.file) throw new HttpError(400, '请选择音频。');
      return inspectAudio(req.file.path, {
        name: req.file.originalname,
        text: null,
      });
    })
    .then((asset) => res.json(asset))
    .catch(next)
    .finally(releaseStorage);
});
app.post('/api/generate-narration', (req, res, next) => {
  if (speechState().busy)
    return next(new HttpError(409, '配音正在生成，请稍候。'));
  const scenes = z.array(sceneSchema).min(1).max(20).parse(req.body);
  scenes.forEach((scene) => resolveAsset(scene.src));
  speechState().busy = true;
  // Serial offline synthesis preserves matching audio and bounds memory on the small server.
  const output = new Map<string, ReturnType<typeof sceneSchema.parse>>();
  return scenes
    .reduce(
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
          resolveAsset(scene.src);
          return synthesizeSpeech(scene.narration).then((voiceover) => {
            output.set(scene.id, { ...scene, voiceover });
          });
        }),
      Promise.resolve(),
    )
    .then(() => res.json(scenes.map((scene) => output.get(scene.id))))
    .catch(next)
    .finally(() => {
      speechState().busy = false;
    });
});
app.post('/api/generate-local-narration', (req, res, next) => {
  if (speechState().busy)
    return next(new HttpError(409, '配音正在生成，请稍候。'));
  const scene = sceneSchema.parse(req.body);
  resolveAsset(scene.src);
  if (!scene.narration.trim())
    throw new HttpError(400, '请先填写当前图片的解说文案。');
  speechState().busy = true;
  return synthesizeSpeech(scene.narration)
    .then((voiceover) => res.json({ ...scene, voiceover }))
    .catch(next)
    .finally(() => {
      speechState().busy = false;
    });
});
app.post('/api/create-render-job', (req, res) => {
  if (getVideoUploadStatus().active)
    throw new HttpError(409, '请先等待或取消当前视频上传。');
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

function listenOnce(): Promise<import('node:http').Server> {
  return new Promise((resolve, reject) => {
    const server = app.listen(port, '127.0.0.1');
    server.once('error', reject);
    server.once('listening', () => {
      server.removeListener('error', reject);
      resolve(server);
    });
  });
}

authReady
  .then(() => {
    if (
      process.argv.includes('--production') &&
      !existsSync(resolve(ROOT, '.next/BUILD_ID'))
    )
      throw new Error('请先执行 pnpm build。');
    return process.env.PUBLIC_ORIGIN
      ? undefined
      : prepareLocalStudioPort(port, ROOT);
  })
  .then(() => startApp())
  .then(() => {
    // Generate the immutable score once before accepting media work; account copies do not allocate synthesis buffers.
    Object.values(MusicTrack).forEach((track) => getOriginalMusic(track));
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
    return listenOnce()
      .catch((error: NodeJS.ErrnoException) => {
        if (error.code !== 'EADDRINUSE' || process.env.PUBLIC_ORIGIN)
          throw error;
        return stopPreviousLocalStudio(port, ROOT).then(() => listenOnce());
      })
      .then((server) => {
        // Keep Node's request deadline beyond the per-upload cancellation and cleanup deadline.
        server.requestTimeout = VIDEO_UPLOAD_TIMEOUT_MS + 30_000;
        startWorkspaceCleanup();
        if (databaseEnabled()) startDatabaseDraftCleanup();
        else startCurrentDraftCleanup();
        console.info(`房源视频工作室已启动：${origin}`);
      });
  })
  .catch((error: unknown) => {
    console.error(
      '[startup]',
      error instanceof Error ? error.message : '服务初始化失败。',
    );
    return closeDatabase().finally(() => process.exit(1));
  });
