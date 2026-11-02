/** Offline adapter tests use a disposable executable fixture; no model downloads or paid calls. */
import assert from 'node:assert/strict';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { after, test } from 'node:test';

import {
  synthesizeSpeech,
  getLocalSpeechCapability,
  KOKORO_MODEL,
  KOKORO_REVISION,
  KOKORO_VOICE,
} from './local-speech';
import {
  registerWorkspace,
  runInWorkspace,
  workspaceDirectory,
} from './workspace';
import { acquireMediaSlot } from './media-queue';

const original = process.cwd();
const directory = mkdtempSync(resolve(tmpdir(), 'studio-kokoro-'));
process.chdir(directory);

after(() => {
  process.chdir(original);
  rmSync(directory, { recursive: true, force: true });
});

test('missing runtime disables speech with an actionable message and no output', () => {
  assert.equal(getLocalSpeechCapability().speechReady, false);
  return assert.rejects(synthesizeSpeech('测试'), /setup:kokoro/);
});

test('offline synthesis isolates accounts, queues heavy work and removes private input', () => {
  const runtime = resolve('.runtime/kokoro');
  mkdirSync(resolve(runtime, 'venv/bin'), { recursive: true });
  mkdirSync(resolve(runtime, 'model/voices'), { recursive: true });
  mkdirSync('scripts');
  symlinkSync(process.execPath, resolve(runtime, 'venv/bin/python'));
  ['config.json', 'kokoro-v1_1-zh.pth', 'voices/zf_001.pt'].forEach((name) =>
    writeFileSync(resolve(runtime, 'model', name), 'fixture'),
  );
  writeFileSync(
    resolve(runtime, 'ready.txt'),
    `${KOKORO_MODEL}@${KOKORO_REVISION}:${KOKORO_VOICE}`,
  );
  writeFileSync(
    'scripts/kokoro-inference.py',
    `
const fs = require('node:fs');
const args = process.argv;
const text = fs.readFileSync(args[args.indexOf('--text-file') + 1], 'utf8');
const output = args[args.indexOf('--output') + 1];
if (process.env.HF_HUB_OFFLINE !== '1' || process.env.TRANSFORMERS_OFFLINE !== '1') process.exit(4);
if (text === '失败') { fs.writeFileSync(output, 'partial'); console.error('private narration'); process.exit(1); }
if (text === '坏音频') { fs.writeFileSync(output, 'corrupt'); process.exit(0); }
const wav = Buffer.alloc(44 + 48000);
wav.write('RIFF', 0); wav.writeUInt32LE(wav.length - 8, 4); wav.write('WAVEfmt ', 8);
wav.writeUInt32LE(16, 16); wav.writeUInt16LE(1, 20); wav.writeUInt16LE(1, 22);
wav.writeUInt32LE(24000, 24); wav.writeUInt32LE(48000, 28); wav.writeUInt16LE(2, 32); wav.writeUInt16LE(16, 34);
wav.write('data', 36); wav.writeUInt32LE(48000, 40); fs.writeFileSync(output, wav);
`,
  );
  assert.equal(getLocalSpeechCapability().speechReady, true);
  const first = registerWorkspace('11111111-1111-4111-8111-111111111111');
  const second = registerWorkspace('22222222-2222-4222-8222-222222222222');
  return acquireMediaSlot()
    .then((release) => {
      const pending = runInWorkspace(first, () => synthesizeSpeech('第一账号'));
      assert.equal(
        first.active,
        1,
        'queued synthesis protects temporary media',
      );
      release();
      return pending;
    })
    .then((audio) => {
      assert.equal(audio.text, '第一账号');
      assert.equal(audio.duration, 1);
      assert.match(audio.name, /Kokoro/);
      runInWorkspace(first, () => {
        assert.ok(
          existsSync(
            resolve(workspaceDirectory('uploads'), audio.src.split('/').pop()!),
          ),
        );
        assert.equal(readdirSync(workspaceDirectory('speech-tmp')).length, 0);
      });
      runInWorkspace(second, () =>
        assert.equal(
          existsSync(
            resolve(workspaceDirectory('uploads'), audio.src.split('/').pop()!),
          ),
          false,
        ),
      );
      assert.equal(first.active, 0);
      return runInWorkspace(second, () => synthesizeSpeech('第二账号'));
    })
    .then(() => {
      assert.equal(second.active, 0);
    });
});

test('failed and malformed output is removed, and child stderr is not exposed', () => {
  const workspace = registerWorkspace('33333333-3333-4333-8333-333333333333');
  return runInWorkspace(workspace, () =>
    assert
      .rejects(synthesizeSpeech('失败'), (error: Error) => {
        assert.match(error.message, /Kokoro 配音失败/);
        assert.doesNotMatch(error.message, /private narration/);
        return true;
      })
      .then(() => assert.rejects(synthesizeSpeech('坏音频')))
      .then(() => {
        assert.deepEqual(readdirSync(workspaceDirectory('uploads')), []);
        assert.deepEqual(readdirSync(workspaceDirectory('speech-tmp')), []);
        assert.equal(workspace.active, 0);
        assert.ok(readFileSync('.runtime/kokoro/ready.txt', 'utf8'));
      }),
  );
});

test('blank and oversized text fail before entering the heavy slot', () =>
  assert
    .rejects(synthesizeSpeech('  '), /1～300/)
    .then(() => assert.rejects(synthesizeSpeech('中'.repeat(301)), /1～300/)));
