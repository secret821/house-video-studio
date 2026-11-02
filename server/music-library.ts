/** Authenticated account-scoped music import; no upstream scripts or paid services. */
import { Router, type Request, type Response } from 'express';
import { existsSync } from 'node:fs';
import type { AudioAsset } from '../src/services/definition/project';
import { z } from 'zod';
import { randomUUID } from 'node:crypto';
import { writeFile, rm } from 'node:fs/promises';
import { resolve } from 'node:path';
import { musicTrackSchema } from '../src/services/definition/music';
import {
  musicChoiceSchema,
  musicSearchInputSchema,
} from '../src/services/definition/music-library';
import { HttpError, inspectAudio } from './media';
import { reserveStorage } from './storage-capacity';
import { holdWorkspace, workspaceDirectory, workspaceState } from './workspace';
import { getOriginalMusic } from './video-edit-music';
import { downloadMusic, MUSIC_MAX_BYTES, queryMusic } from './music-provider';

export const musicRouter = Router();
export const musicPreviewRouter = Router();
const state = () =>
  workspaceState('music-library', () => ({
    searching: false,
    importing: false,
    previewing: false,
    cache: new Map<number, AudioAsset>(),
  }));

/** Disconnects cancel network work; cleanup protection lasts until the Promise settles. */
function operation<T>(
  req: Request,
  res: Response,
  kind: 'searching' | 'importing' | 'previewing',
  run: (signal: AbortSignal) => Promise<T>,
) {
  const current = state();
  if (current[kind])
    return Promise.reject(
      new HttpError(409, '上一项音乐操作仍在结束，请稍后重试。'),
    );
  current[kind] = true;
  const release = holdWorkspace();
  const controller = new AbortController();
  const abort = () => controller.abort();
  res.once('close', abort);
  const timeout = setTimeout(abort, kind === 'searching' ? 25_000 : 600_000);
  return Promise.resolve()
    .then(() => run(controller.signal))
    .catch((error: unknown) => {
      if (error instanceof HttpError) throw error;
      throw new HttpError(
        502,
        '在线音乐暂时不可用或加载超时，请重试或选择内置曲目；已选音乐保持不变。',
      );
    })
    .finally(() => {
      clearTimeout(timeout);
      res.off('close', abort);
      current[kind] = false;
      release();
    });
}

// Native audio cannot attach the page identity header. This authenticated route exposes only fixed built-in public compositions.
musicPreviewRouter.get('/:track', (req, res) => {
  const track = musicTrackSchema.parse(req.params.track);
  return res.redirect(303, getOriginalMusic(track).src);
});

musicRouter.get('/search', (req, res, next) => {
  const { q, page } = musicSearchInputSchema.parse(req.query);
  return operation(req, res, 'searching', (signal) =>
    queryMusic(
      {
        limit: '12',
        offset: String(page * 12),
        lic: 'by',
        reqtags: 'instrumental',
        ...(q ? { search: q, search_type: 'all' } : { tags: 'instrumental' }),
      },
      signal,
    ).then(({ tracks, count }) => ({
      tracks,
      hasMore: count === 12 && page < 9,
    })),
  )
    .then((result) => res.json(result))
    .catch(next);
});

/** Completed preview downloads are reused by selection; neither previews nor searches change drafts. */
function importMusic(id: number, signal: AbortSignal) {
  const cached = state().cache.get(id);
  if (
    cached &&
    existsSync(
      resolve(
        workspaceDirectory('uploads'),
        cached.src.slice('/media/'.length),
      ),
    )
  )
    return Promise.resolve(cached);
  const release = reserveStorage(MUSIC_MAX_BYTES);
  const path = resolve(workspaceDirectory('uploads'), `${randomUUID()}.mp3`);
  let completed = false;
  return queryMusic({ ids: String(id), limit: '1' }, signal)
    .then(({ tracks }) => {
      const track = tracks.find((entry) => entry.id === id);
      if (!track)
        throw new HttpError(
          422,
          '这首音乐暂不符合免费使用条件，请换一首或使用内置曲目。',
        );
      return downloadMusic(track.preview, track.credit.source, signal)
        .then((bytes) => {
          signal.throwIfAborted();
          return writeFile(path, bytes, { flag: 'wx', mode: 0o600, signal });
        })
        .then(() =>
          inspectAudio(path, { name: track.credit.title, text: null }),
        )
        .then((asset) => {
          signal.throwIfAborted();
          const result = { ...asset, musicCredit: track.credit };
          const cache = state().cache;
          if (cache.size >= 24) cache.delete(cache.keys().next().value!);
          cache.set(id, result);
          completed = true;
          return result;
        });
    })
    .finally(() =>
      (completed ? Promise.resolve() : rm(path, { force: true })).finally(
        release,
      ),
    );
}

musicPreviewRouter.get('/online/:id', (req, res, next) => {
  const id = z.coerce.number().int().positive().parse(req.params.id);
  return operation(req, res, 'previewing', (signal) => importMusic(id, signal))
    .then((asset) => res.redirect(303, asset.src))
    .catch(next);
});

musicRouter.post('/select', (req, res, next) => {
  const choice = musicChoiceSchema.parse(req.body);
  if (choice.kind === 'builtin')
    return res.json(getOriginalMusic(choice.track));
  return operation(req, res, 'importing', (signal) =>
    importMusic(choice.id, signal),
  )
    .then((asset) => res.json(asset))
    .catch(next);
});
