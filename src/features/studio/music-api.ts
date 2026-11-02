/** Only this boundary performs music requests; previews never change the selected music. */
import { z } from 'zod';
import {
  musicSearchResultSchema,
  type MusicChoice,
} from '@/services/definition/music-library';
import { audioSchema } from '@/services/definition/project';
import { workspaceRequest } from './auth-api';

function request<T>(path: string, schema: z.ZodType<T>, init: RequestInit) {
  return workspaceRequest(init)
    .then((options) => fetch(`/api/music/${path}`, options))
    .then((response) =>
      response.json().then((body: unknown) => {
        if (!response.ok) {
          const parsed = z.object({ message: z.string() }).safeParse(body);
          throw new Error(
            parsed.success
              ? parsed.data.message
              : '音乐加载失败，请使用内置曲目或重试。',
          );
        }
        return schema.parse(body);
      }),
    );
}
export const musicApi = {
  search: (q: string, page: number, signal: AbortSignal) =>
    request(
      `search?${new URLSearchParams({ q, page: String(page) })}`,
      musicSearchResultSchema,
      { signal: AbortSignal.any([signal, AbortSignal.timeout(30_000)]) },
    ),
  select: (choice: MusicChoice, signal?: AbortSignal) =>
    request('select', audioSchema, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(choice),
      signal: AbortSignal.any([
        ...(signal ? [signal] : []),
        AbortSignal.timeout(605_000),
      ]),
    }),
};
