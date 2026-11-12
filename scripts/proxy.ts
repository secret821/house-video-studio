/** Reproducible, bounded model check and short samples for the user's existing company proxy. */
import { createHash } from 'node:crypto';
import {
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { resolve } from 'node:path';
import { z } from 'zod';
import { DATA, UPLOADS, inspectAudio } from '../server/media/media';
import {
  parseProxyCopy,
  proxyModelsSchema,
  proxyRequest,
} from '../server/cloud/model-proxy';
import { projectSchema } from '../src/services/definition/project';
const directory = resolve(DATA, 'house-tour-v2');
const projectPath = resolve(directory, 'project.json');
const ledgerPath = resolve(directory, 'proxy-calls.json');
const command = process.argv[2] ?? 'check';
const entrySchema = z.object({
  model: z.string(),
  state: z.enum(['pending', 'complete', 'failed']),
  reserved_yuan: z.literal(1),
});
const ledgerSchema = z.record(z.string(), entrySchema);

/** Atomic local bookkeeping preserves pending calls across crashes; retries never duplicate a paid POST. */
function writeJson(path: string, value: unknown) {
  writeFileSync(`${path}.tmp`, JSON.stringify(value, null, 2) + '\n', {
    mode: 0o600,
  });
  renameSync(`${path}.tmp`, path);
}

/** Bound this sample batch to one copy rewrite and two short voice samples, reserving 1 CNY each. */
function paid<T>(
  id: string,
  model: string,
  action: () => Promise<T>,
): Promise<T> {
  const ledger = existsSync(ledgerPath)
    ? ledgerSchema.parse(JSON.parse(readFileSync(ledgerPath, 'utf8')))
    : {};
  if (ledger[id])
    return Promise.reject(
      new Error('这一请求已经提交过，请核对已保存结果；未自动重提。'),
    );
  if (
    Object.values(ledger).reduce((sum, entry) => sum + entry.reserved_yuan, 0) +
      1 >
      30 ||
    Object.values(ledger).filter((entry) => entry.model === model).length >=
      (model === 'MiniMax-M2.5' ? 1 : 2)
  )
    return Promise.reject(
      new Error('已达到本轮文案或短配音样本限制，未提交请求。'),
    );
  ledger[id] = { model, state: 'pending', reserved_yuan: 1 };
  writeJson(ledgerPath, ledger);
  return action()
    .then((result) => {
      ledger[id].state = 'complete';
      writeJson(ledgerPath, ledger);
      return result;
    })
    .catch((error: unknown) => {
      ledger[id].state = 'failed';
      writeJson(ledgerPath, ledger);
      throw error;
    });
}

/** Read-only catalog verification proves model capabilities before any paid generation. */
function catalog() {
  return proxyRequest('models')
    .then((response) => response.json())
    .then((body) => proxyModelsSchema.parse(body).data);
}

/** Rewrite from already-reviewed visible facts, then validate identity and length boundaries. */
function copy() {
  const target = resolve(directory, 'minimax-copy.json');
  if (existsSync(target)) {
    console.info(`已有文案：${target}`);
    return Promise.resolve();
  }
  const project = projectSchema.parse(
    JSON.parse(readFileSync(projectPath, 'utf8')),
  );
  const facts = project.scenes.map((scene) => ({
    id: scene.id,
    title: scene.title,
    narration: scene.narration,
  }));
  const instructions =
    '把这些实拍房源的逐镜解说改得更像一位成年女经纪人陪朋友看房。语言口语化、简洁，不播音、不煽情、不用豪宅销售套话。严格保留事实与不确定性：院子归属未核实，墙面起皮不能诊断原因。不要加入面积、价格、产权、朝向、学区、户型总数、装修材质或全天采光结论。只输出JSON，不输出思考过程，不要Markdown。格式为 {"opening":"30到40字的轻松开场","scenes":[{"id":"原id","title":"短标题","narration":"35到50字的口语解说"}]}，严格保持8个镜头的id和顺序，开场不重复描述所有细节。';
  return paid('copy-v1', 'MiniMax-M2.5', () =>
    proxyRequest('chat/completions', {
      model: 'MiniMax-M2.5',
      messages: [
        { role: 'system', content: instructions },
        {
          role: 'user',
          content: JSON.stringify({
            opening: project.opening?.script,
            scenes: facts,
          }),
        },
      ],
      max_tokens: 4096,
      temperature: 0.6,
      stream: false,
    })
      .then((response) => response.json())
      .then((body) => {
        const result = z
          .object({
            choices: z
              .array(z.object({ message: z.object({ content: z.string() }) }))
              .min(1),
            usage: z
              .object({
                prompt_tokens: z.number(),
                completion_tokens: z.number(),
              })
              .optional(),
          })
          .parse(body);
        const rewritten = parseProxyCopy(
          result.choices[0].message.content,
          project.scenes.map((scene) => scene.id),
        );
        writeJson(target, rewritten);
        writeFileSync(
          resolve(directory, 'minimax-script.txt'),
          [
            '模型：公司代理 MiniMax-M2.5',
            '仅文字润色；尚未生成人物视频。',
            '',
            `开场：${rewritten.opening}`,
            '',
            ...rewritten.scenes.flatMap((scene, index) => [
              `${index + 1}. ${scene.title}`,
              scene.narration,
              '',
            ]),
          ].join('\n'),
        );
        if (result.usage)
          writeJson(resolve(directory, 'minimax-text-usage.json'), {
            ...result.usage,
            estimated_yuan:
              (result.usage.prompt_tokens * 2.1) / 1000000 +
              (result.usage.completion_tokens * 8.4) / 1000000,
            note: '按用户截图文字单价估算，实际以公司代理账单为准。',
          });
        console.info(`MiniMax文案已生成：${target}`);
      }),
  );
}

/** Produce two <=50-character previews only; full narration awaits the short-sample listening check. */
function voices() {
  const text = z
    .object({ opening: z.string().min(1).max(50) })
    .parse(
      JSON.parse(readFileSync(resolve(directory, 'minimax-copy.json'), 'utf8')),
    ).opening;
  return ['coral', 'shimmer'].reduce(
    (chain, voice) =>
      chain.then(() => {
        const id = `speech-${voice}-${createHash('sha256').update(text).digest('hex').slice(0, 12)}`;
        const path = resolve(UPLOADS, `proxy-${id}.mp3`);
        if (existsSync(path))
          return inspectAudio(path, {
            name: `自然女声试听 · ${voice}`,
            text,
          }).then((audio) =>
            console.info(
              `${voice}已有试听：${path}（${audio.duration.toFixed(2)}秒）`,
            ),
          );
        return paid(id, 'gpt-4o-mini-tts', () =>
          proxyRequest('audio/speech', {
            model: 'gpt-4o-mini-tts',
            voice,
            input: text,
            instructions:
              '请用清晰自然的普通话，像陪一位朋友实地看房。亲切、轻松，语速适中略利落；短句之间有轻微停顿，强调“院子”和“进去看看”。避免播音腔、喊话、刻意气声和夸张情绪。',
            response_format: 'mp3',
            speed: 1,
          })
            .then((response) => {
              if (
                !(response.headers.get('content-type') ?? '').match(
                  /audio|octet-stream/,
                )
              )
                throw new Error('语音接口未返回音频，未当作成功。');
              return response.arrayBuffer();
            })
            .then((buffer) => {
              if (!buffer.byteLength || buffer.byteLength > 5000000)
                throw new Error('试听音频为空或超过5MB。');
              writeFileSync(`${path}.part`, Buffer.from(buffer), {
                mode: 0o600,
              });
              renameSync(`${path}.part`, path);
              return inspectAudio(path, {
                name: `自然女声试听 · ${voice}`,
                text,
              });
            })
            .then((audio) => {
              writeJson(resolve(directory, `voice-${voice}.json`), audio);
              console.info(
                `${voice}试听：${path}（${audio.duration.toFixed(2)}秒）`,
              );
            }),
        );
      }),
    Promise.resolve(),
  );
}

/** Catalog check is the safe default; mutations use an exclusive lock and never silently resubmit. */
function run() {
  if (!['check', 'copy', 'voices'].includes(command))
    throw new Error('用法：pnpm proxy check | copy | voices');
  return catalog().then((models) => {
    const relevant = models.filter((model) =>
      /MiniMax|speech|tts|s2v|omnihuman|lipsync|avatar|wan2|emo-v1/i.test(
        model.id,
      ),
    );
    writeJson(resolve(directory, 'proxy-capabilities.json'), relevant);
    if (command === 'check') {
      console.info(JSON.stringify(relevant, null, 2));
      return;
    }
    const model = command === 'copy' ? 'MiniMax-M2.5' : 'gpt-4o-mini-tts';
    if (!models.some((item) => item.id === model))
      throw new Error(`代理未开放所需模型：${model}`);
    const lock = resolve(directory, 'proxy-operation.lock');
    if (existsSync(lock))
      throw new Error('存在未结束的代理操作锁，请先确认原进程/请求状态。');
    mkdirSync(lock);
    return Promise.resolve()
      .then(() => (command === 'copy' ? copy() : voices()))
      .finally(() => rmSync(lock, { recursive: true }));
  });
}
Promise.resolve()
  .then(run)
  .catch((error: unknown) => {
    console.error(
      error instanceof Error ? error.message : '代理操作失败，未输出密钥。',
    );
    process.exitCode = 1;
  });
