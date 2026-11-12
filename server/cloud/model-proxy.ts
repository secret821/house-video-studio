/** Company proxy boundary. Secrets never enter client code, returned objects, or provider error logs. */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parseEnv } from 'node:util';
import { z } from 'zod';
import { ROOT } from '../media/media';

export const PROXY_ORIGIN = 'https://new-api.shiyanjia.com';
export const proxyModelsSchema = z.object({
  data: z.array(
    z.object({
      id: z.string(),
      supported_endpoint_types: z.array(z.string()).default([]),
    }),
  ),
});
export const proxyCopySchema = z.object({
  opening: z.string().min(1).max(50),
  scenes: z
    .array(
      z.object({
        id: z.string(),
        title: z.string().min(1).max(32),
        narration: z.string().min(1).max(150),
      }),
    )
    .length(8),
});

/** Only the user-provided company endpoint may receive this credential. */
export function proxyHeaders() {
  const config = parseEnv(readFileSync(resolve(ROOT, '.env.proxy'), 'utf8'));
  if (
    config.MODEL_PROXY_BASE_URL !== `${PROXY_ORIGIN}/v1` ||
    !/^sk-[A-Za-z0-9_-]{12,}$/.test(config.MODEL_PROXY_API_KEY ?? '')
  )
    throw new Error('公司代理本机配置缺失或无效。');
  return {
    Authorization: `Bearer ${config.MODEL_PROXY_API_KEY}`,
    'Content-Type': 'application/json',
  };
}

/** Limit requests to the three checked routes; a proxy key is never sent to another provider. */
export function proxyRequest(
  path: 'models' | 'chat/completions' | 'audio/speech',
  body?: unknown,
) {
  return fetch(`${PROXY_ORIGIN}/v1/${path}`, {
    method: body === undefined ? 'GET' : 'POST',
    headers: proxyHeaders(),
    body: body === undefined ? undefined : JSON.stringify(body),
    redirect: 'error',
    signal: AbortSignal.timeout(180000),
  }).then((response) => {
    if (!response.ok)
      throw new Error(
        `公司模型代理请求失败（HTTP ${response.status}，${path}）；未自动重试。`,
      );
    return response;
  });
}

/** Model output is data: require the exact eight source scene identities before using it. */
export function parseProxyCopy(content: string, ids: Array<string>) {
  const text = content
    .trim()
    .replace(/^```(?:json)?\s*/, '')
    .replace(/\s*```$/, '');
  const copy = proxyCopySchema.parse(JSON.parse(text));
  if (
    new Set(copy.scenes.map((scene) => scene.id)).size !== 8 ||
    copy.scenes.some((scene, index) => scene.id !== ids[index])
  )
    throw new Error('模型改变了镜头标识或顺序，文案未应用。');
  return copy;
}
