/** One bounded JSON transport for property extraction and visual copy; credentials never leave the server. */
import { z } from 'zod';

import { COPY_MODEL } from '../../src/services/definition/copy';

import { readCloudConfig } from '../cloud/cloud';
import { HttpError } from '../media/media';

export type CopyContent =
  | string
  | Array<
      | { type: 'text'; text: string }
      | { type: 'image_url'; image_url: { url: string } }
    >;
const responseSchema = z.object({
  choices: z
    .array(
      z.object({
        message: z.object({ content: z.string() }),
        finish_reason: z.string().nullable().optional(),
      }),
    )
    .min(1),
});

/** The caller owns the cloud lock and content cache; failed calls are never automatically retried. */
export function requestCopyJson(
  system: string,
  content: CopyContent,
): Promise<string> {
  const config = readCloudConfig();
  if (!config.ready)
    return Promise.reject(
      new HttpError(400, '请先配置北京地域百炼Key和业务空间ID。'),
    );
  return fetch(
    `https://${config.workspace}.cn-beijing.maas.aliyuncs.com/compatible-mode/v1/chat/completions`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.key}`,
        'Content-Type': 'application/json',
      },
      redirect: 'error',
      signal: AbortSignal.timeout(120_000),
      body: JSON.stringify({
        model: COPY_MODEL,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content },
        ],
        enable_thinking: false,
        temperature: 0.2,
        response_format: { type: 'json_object' },
        max_tokens: 8192,
      }),
    },
  )
    .then((response) => {
      if (!response.ok)
        throw new HttpError(
          response.status === 429 ? 429 : 502,
          `百炼请求失败（HTTP ${response.status}）。请检查免费额度、用完即停和模型权限；未自动重试。`,
        );
      return response.json();
    })
    .then((body: unknown) => {
      const result = responseSchema.parse(body).choices[0];
      if (result.finish_reason === 'length')
        throw new HttpError(
          422,
          '模型输出被截断，未应用，请减少输入或片段数。',
        );
      return result.message.content;
    })
    .catch((error: unknown) => {
      if (error instanceof HttpError) throw error;
      throw new HttpError(
        502,
        '百炼请求超时、连接失败或响应无效，未应用结果；可稍后手动重试。',
      );
    });
}
