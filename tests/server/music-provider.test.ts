/** Network and licensing boundaries independent of provider uptime. */
import assert from 'node:assert/strict';
import test from 'node:test';
import {
  boundedBody,
  parseLibraryTrack,
  MUSIC_MAX_BYTES,
} from '../../server/music/music-provider';
import { audioSchema } from '../../src/services/definition/project';

const track = {
  upload_id: 123,
  upload_name: 'Piano',
  user_real_name: 'Artist',
  file_page_url: 'http://ccmixter.org/files/artist/123',
  license_url: 'http://creativecommons.org/licenses/by/3.0/',
  upload_extra: {
    usertags: 'piano,instrumental',
    featuring: 'Pianist',
    nsfw: false,
  },
  files: [
    {
      download_url: 'https://ccmixter.org/content/artist/song.mp3',
      file_rawsize: 1024,
      file_format_info: { mime_type: 'audio/mpeg' },
    },
  ],
};
test('CC BY attribution survives audio draft validation; old audio remains valid', () => {
  const result = parseLibraryTrack(track)!;
  assert.match(result.credit.attribution, /Pianist/);
  const audio = {
    src: '/media/test.mp3',
    duration: 10,
    name: 'Piano',
    text: null,
  };
  assert.equal(audioSchema.parse(audio).musicCredit, undefined);
  assert.deepEqual(
    audioSchema.parse({ ...audio, musicCredit: result.credit }).musicCredit,
    result.credit,
  );
});
test('reject uncertain/NC/ND/SA licenses and external or local URLs', () => {
  for (const license of [
    'by-nc/3.0',
    'by-nd/4.0',
    'by-sa/4.0',
    'unknown/3.0',
  ]) {
    assert.equal(
      parseLibraryTrack({
        ...track,
        license_url: `https://creativecommons.org/licenses/${license}/`,
      }),
      null,
    );
  }
  for (const url of [
    'http://127.0.0.1/file.mp3',
    'https://ccmixter.org.evil.test/content/a/a.mp3',
    'https://ccmixter.org/content/a/../../api/a.mp3',
    'https://user@ccmixter.org/content/a/a.mp3',
  ]) {
    assert.equal(
      parseLibraryTrack({
        ...track,
        files: [{ ...track.files[0], download_url: url }],
      }),
      null,
    );
  }
});
test('reject oversize, explicit and non-instrumental results', () => {
  assert.equal(
    parseLibraryTrack({
      ...track,
      files: [{ ...track.files[0], file_rawsize: MUSIC_MAX_BYTES + 1 }],
    }),
    null,
  );
  assert.equal(
    parseLibraryTrack({
      ...track,
      upload_extra: { ...track.upload_extra, nsfw: true },
    }),
    null,
  );
  assert.equal(
    parseLibraryTrack({ ...track, upload_extra: { usertags: 'speech' } }),
    null,
  );
});
test('bounded reader cancels chunked overflow without trusting Content-Length', () => {
  let cancelled = false;
  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(new Uint8Array(5));
    },
    cancel() {
      cancelled = true;
    },
  });
  return assert
    .rejects(boundedBody(new Response(stream), 4), /过大/)
    .then(() => assert.equal(cancelled, true));
});
test('reader preserves complete bytes and rejects provider failures', () =>
  Promise.all([
    boundedBody(new Response('abc'), 3).then((bytes) =>
      assert.equal(bytes.toString(), 'abc'),
    ),
    assert.rejects(
      boundedBody(new Response('error', { status: 500 }), 50),
      /暂时/,
    ),
  ]).then(() => undefined));
