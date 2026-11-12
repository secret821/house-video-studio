/** Independent ccMixter API client: fixed origins, verified TLS and bounded responses. */
import { z } from 'zod';
import { get } from 'node:https';
import { Readable } from 'node:stream';
import {
  libraryTrackSchema,
  musicCreditSchema,
} from '../../src/services/definition/music-library';

export const MUSIC_MAX_BYTES = 20 * 1024 * 1024;
const rawTrackSchema = z.object({
  upload_id: z.coerce.number().int().positive(),
  upload_name: z.string(),
  user_real_name: z.string(),
  file_page_url: z.string(),
  license_url: z.string(),
  upload_extra: z.object({
    usertags: z.string().optional(),
    featuring: z.string().optional(),
    nsfw: z.union([z.boolean(), z.string()]).optional(),
  }),
  files: z.array(
    z.object({
      download_url: z.string(),
      file_rawsize: z.coerce.number().positive(),
      file_format_info: z.object({ mime_type: z.string() }),
    }),
  ),
});

/** Reject uncertain licensing and non-instrumental/explicit material rather than guessing. */
export function parseLibraryTrack(value: unknown) {
  const parsed = rawTrackSchema.safeParse(value);
  if (!parsed.success) return null;
  const raw = parsed.data;
  if (
    !raw.upload_extra.usertags?.split(',').includes('instrumental') ||
    (raw.upload_extra.nsfw &&
      raw.upload_extra.nsfw !== '0' &&
      raw.upload_extra.nsfw !== 'false')
  )
    return null;
  const file = raw.files.find(
    (entry) =>
      entry.file_format_info.mime_type === 'audio/mpeg' &&
      entry.file_rawsize <= MUSIC_MAX_BYTES &&
      libraryTrackSchema.shape.preview.safeParse(entry.download_url).success,
  );
  if (!file) return null;
  const source = raw.file_page_url.replace(/^http:/, 'https:');
  const license = raw.license_url.replace(/^http:/, 'https:');
  const featuring = raw.upload_extra.featuring?.slice(0, 500);
  const credit = {
    title: raw.upload_name,
    author: raw.user_real_name,
    source,
    license,
    attribution: `${raw.upload_name} — ${raw.user_real_name}${featuring ? `；参与：${featuring}` : ''}。来源：${source}；许可：${license}；本视频对音乐进行了截取、循环、音量调整及淡入淡出。`,
  };
  const result = libraryTrackSchema.safeParse({
    id: raw.upload_id,
    credit,
    preview: file.download_url,
  });
  return result.success ? result.data : null;
}

/** Read at most the stated budget; AbortSignal also covers a stalled response body. */
export function boundedBody(
  response: Response,
  maximum: number,
): Promise<Buffer> {
  if (!response.ok || !response.body)
    return Promise.reject(
      new Error('音乐库暂时无法访问，请使用内置曲目或稍后重试。'),
    );
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  function read(): Promise<Buffer> {
    return reader.read().then(({ done, value }) => {
      if (done) return Buffer.concat(chunks);
      size += value.byteLength;
      if (size > maximum)
        return reader.cancel().then(() => {
          throw new Error('音乐库返回的文件过大，请换一首曲目。');
        });
      chunks.push(value);
      return read();
    });
  }
  return read().finally(() => reader.releaseLock());
}

export function queryMusic(
  parameters: Record<string, string>,
  signal: AbortSignal,
) {
  const url = new URL('https://ccmixter.org/api/query');
  url.search = new URLSearchParams({ f: 'json', ...parameters }).toString();
  return readProvider(url, signal, 2 * 1024 * 1024)
    .then((body) =>
      z.array(z.unknown()).max(100).parse(JSON.parse(body.toString())),
    )
    .then((rows) => ({
      tracks: rows.map(parseLibraryTrack).filter((track) => track !== null),
      count: rows.length,
    }));
}

/** ccMixter's large X-JSON headers and slow TLS handshake require a bounded HTTPS adapter.
 * Browser APIs still use fetch; no redirects, credentials or TLS bypass are allowed here.
 */
function readProvider(
  url: URL,
  signal: AbortSignal,
  maximum: number,
  source?: string,
) {
  return new Promise<Response>((resolve, reject) => {
    const request = get(
      url,
      {
        signal,
        maxHeaderSize: 128 * 1024,
        headers: {
          'User-Agent': 'HouseVideoStudio/1.0',
          ...(source ? { Referer: source } : {}),
        },
      },
      (response) => {
        if (response.statusCode !== 200) {
          response.destroy();
          reject(new Error('音乐库暂时不可用。'));
          return;
        }
        resolve(
          new Response(Readable.toWeb(response) as ReadableStream<Uint8Array>),
        );
      },
    );
    request.on('error', reject);
  }).then((response) => boundedBody(response, maximum));
}

export function downloadMusic(
  url: string,
  source: string,
  signal: AbortSignal,
) {
  musicCreditSchema.shape.source.parse(source);
  libraryTrackSchema.shape.preview.parse(url);
  return readProvider(new URL(url), signal, MUSIC_MAX_BYTES, source);
}
