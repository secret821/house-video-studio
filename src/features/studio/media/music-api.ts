/** Only this boundary performs music requests; previews never change the selected music. */
import {
  musicSearchResultSchema,
  type MusicChoice,
} from '@/services/definition/music-library';
import { audioSchema } from '@/services/definition/project';
import { createApiSearchParams } from '@/share/request';
import { studioRequest } from '../request';
export const musicApi = {
  search: (q: string, page: number, signal: AbortSignal) =>
    studioRequest(`music/search?${createApiSearchParams({ q, page })}`, {
      schema: musicSearchResultSchema,
      init: {
        signal: AbortSignal.any([signal, AbortSignal.timeout(30_000)]),
      },
      networkMessage: '音乐加载失败，请使用内置曲目或重试。',
    }),
  select: (choice: MusicChoice, signal?: AbortSignal) =>
    studioRequest('music/select', {
      schema: audioSchema,
      init: {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(choice),
        signal: AbortSignal.any([
          ...(signal ? [signal] : []),
          AbortSignal.timeout(605_000),
        ]),
      },
      networkMessage: '音乐加载失败，请使用内置曲目或重试。',
    }),
};
