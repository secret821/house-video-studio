/** Complete prepared house-tour workflow: configuration -> voice preview -> portrait -> narrated MP4. */
import {
  copyFileSync,
  linkSync,
  existsSync,
  readFileSync,
  renameSync,
  writeFileSync,
} from 'node:fs';
import { resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';

import {
  JobStatus,
  jobSchema,
  projectSchema,
  type Project,
  type RenderJob,
} from '../src/services/definition/project';

import {
  CLOUD_VOICES,
  cloudOpening,
  cloudSpeech,
  completedCloudOpening,
  getCloudStatus,
  withCloudLock,
} from '../server/cloud';
import { DATA, resolveAsset } from '../server/media';

const directory = resolve(DATA, 'house-tour-v2');
const path = resolve(directory, 'project-bailian.json');
const command = process.argv[2] ?? 'status';
const voice = z.enum(CLOUD_VOICES).parse(process.argv[3] ?? 'Cherry');
const origin = `http://127.0.0.1:${Number(process.env.PORT || 4318)}`;

/** A completed step is reusable after failure; source photos and earlier project drafts remain separate. */
function saveProject(project: Project) {
  writeFileSync(
    `${path}.tmp`,
    JSON.stringify(projectSchema.parse(project), null, 2),
    { mode: 0o600 },
  );
  renameSync(`${path}.tmp`, path);
}

/** Local rendering uses the same validated API as the browser, without transmitting any cloud key. */
function request(endpoint: string, body?: unknown): Promise<unknown> {
  return fetch(`${origin}/api/${endpoint}`, {
    method: body === undefined ? 'GET' : 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(30000),
    redirect: 'error',
  }).then((response) =>
    response.json().then((payload: unknown) => {
      if (!response.ok) {
        const error = z.object({ message: z.string() }).safeParse(payload);
        throw new Error(
          error.success
            ? error.data.message
            : `本地服务返回 HTTP ${response.status}`,
        );
      }
      return payload;
    }),
  );
}

/** Only poll a persisted render id; server restart and network errors never cause an automatic resubmit. */
function waitForRender(id: string, deadline: number): Promise<RenderJob> {
  return request(`get-render-job/${id}`).then((body) => {
    const job = jobSchema.parse(body);
    if (job.status === JobStatus.Complete) return job;
    if (job.status === JobStatus.Failed) throw new Error(job.message);
    if (Date.now() > deadline)
      throw new Error('本地导出等待超时；任务编号已保存，可在网页查看。');
    console.info(`本地导出：${Math.round(job.progress * 100)}%`);
    return new Promise<void>((done) => setTimeout(done, 5000)).then(() =>
      waitForRender(id, deadline),
    );
  });
}

/** Resume a previously submitted local render before considering a new one. */
function renderProject(project: Project) {
  const record = resolve(directory, 'bailian-render.json');
  const fingerprint = JSON.stringify(project);
  let pending: Promise<RenderJob>;
  if (existsSync(record)) {
    const previous = z
      .object({ project: z.string(), id: z.string() })
      .parse(JSON.parse(readFileSync(record, 'utf8')));
    pending =
      previous.project === fingerprint
        ? request(`get-render-job/${previous.id}`).then((body) =>
            jobSchema.parse(body).status === JobStatus.Failed
              ? submit()
              : waitForRender(previous.id, Date.now() + 30 * 60000),
          )
        : submit();
  } else pending = submit();
  /** Record the real render id immediately; ambiguous creation is not silently repeated within this run. */
  function submit() {
    return request('create-render-job', project).then((body) => {
      const job = jobSchema.parse(body);
      writeFileSync(
        record,
        JSON.stringify({ project: fingerprint, id: job.id }),
        { mode: 0o600 },
      );
      return waitForRender(job.id, Date.now() + 30 * 60000);
    });
  }
  return pending.then((job) => {
    if (!job.output || !/^\/exports\/[a-f0-9-]{36}\.mp4$/.test(job.output))
      throw new Error('本地导出结果无效。');
    const target = resolve(DATA, 'exports/house-tour-cloud-v2.mp4');
    // Same-filesystem hard links avoid duplicating a large MP4; rename never truncates an older result.
    const temporary = `${target}.${randomUUID()}.link`;
    linkSync(resolve(DATA, 'exports', job.output.split('/').pop()!), temporary);
    renameSync(temporary, target);
    console.info(`完整视频：${target}`);
  });
}

/** Default status command is offline; only explicit production subcommands can trigger cloud charges. */
function run() {
  const status = getCloudStatus();
  if (command === 'status') {
    console.info(JSON.stringify(status, null, 2));
    return Promise.resolve();
  }
  if (!['voices', 'opening', 'finish', 'all'].includes(command))
    throw new Error(
      '命令：pnpm cloud status | voices | opening Cherry | finish Cherry | all Cherry（也可用Serena）',
    );
  if (!(command === 'voices' ? status.speechReady : status.ready))
    throw new Error(
      '请在 .env.cloud 填写北京地域 API Key；万相还需业务空间 ID。未发起云调用。',
    );
  if (!existsSync(path))
    throw new Error(
      '缺少 data/house-tour-v2/project-bailian.json；可在网页导入真实房源并使用生成按钮。',
    );
  // Preflight the local renderer before an all/finish command spends any cloud allowance.
  const preflight = ['all', 'finish'].includes(command)
    ? request('get-capabilities')
    : Promise.resolve();
  return preflight.then(() =>
    withCloudLock(() => {
      let project = projectSchema.parse(JSON.parse(readFileSync(path, 'utf8')));
      const opening = project.opening;
      if (!opening?.photo) throw new Error('请先提供人物照片。');
      if (opening.script.length > 50)
        throw new Error('测试开场请控制在50字以内。');
      if (command === 'voices')
        return CLOUD_VOICES.reduce(
          (chain, selected) =>
            chain.then(() =>
              cloudSpeech(opening.script, selected).then((audio) => {
                console.info(
                  `${selected}试听：${resolveAsset(audio.src)}（${audio.duration.toFixed(2)}秒）`,
                );
              }),
            ),
          Promise.resolve(),
        );
      return cloudSpeech(opening.script, voice).then((audio) => {
        const video =
          command === 'finish'
            ? completedCloudOpening(opening.photo!, audio)
            : cloudOpening(opening.photo!, audio);
        return video.then((clip) => {
          project = {
            ...project,
            opening: { ...opening, voiceover: audio, clip },
          };
          saveProject(project);
          console.info(
            `新版口播：${resolveAsset(clip.src)}（${clip.duration.toFixed(2)}秒）`,
          );
          if (command === 'opening') return;
          return project.scenes
            .reduce(
              (chain, scene, index) =>
                chain.then(() => {
                  if (!scene.narration.trim()) {
                    project.scenes[index] = { ...scene, voiceover: null };
                    return;
                  }
                  return cloudSpeech(scene.narration, voice).then(
                    (voiceover) => {
                      project.scenes[index] = { ...scene, voiceover };
                      saveProject(project);
                    },
                  );
                }),
              Promise.resolve(),
            )
            .then(() => {
              const draft = resolve(DATA, 'draft.json');
              const backup = resolve(directory, 'draft-before-bailian.json');
              if (existsSync(draft) && !existsSync(backup))
                copyFileSync(draft, backup);
              return request('save-draft', project);
            })
            .then(() => renderProject(project));
        });
      });
    }),
  );
}

Promise.resolve()
  .then(run)
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : '百炼流程失败。');
    process.exitCode = 1;
  });
