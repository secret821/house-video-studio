/** Offline ASR job tests use actual local FFprobe/FFmpeg and a disposable timestamp-engine fixture. */
import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { resolve } from 'node:path';
import { tmpdir } from 'node:os';

import { JobStatus } from '../../src/services/definition/project';
import {
  createSubtitleJob,
  cancelSubtitleJob,
  getSubtitleJob,
  getSubtitleCapability,
  ASR_ID,
  NANO_ASR_ID,
  getAsrRuntime,
} from '../../server/speech/subtitles';
import {
  registerWorkspace,
  runInWorkspace,
  workspaceDirectory,
} from '../../server/storage/workspace';
import { acquireMediaSlot } from '../../server/media/media-queue';
import { runVideoUploadMedia } from '../../server/video/video-upload';

const original = process.cwd();
const directory = mkdtempSync(resolve(tmpdir(), 'studio-subtitle-tests-'));
const src = '/media/source-11111111-1111-4111-8111-111111111111.mp4';
const workspaceA = registerWorkspace('11111111-1111-4111-8111-111111111111');
const workspaceB = registerWorkspace('22222222-2222-4222-8222-222222222222');
const savedRuntime = process.env.STUDIO_ASR_DIR;
const savedEngine = process.env.STUDIO_ASR_ENGINE;
before(() => {
  delete process.env.STUDIO_ASR_ENGINE;
  process.chdir(directory);
  process.env.STUDIO_ASR_DIR = resolve('.runtime/asr');
  mkdirSync('scripts');
  mkdirSync('.runtime/asr/venv/bin', { recursive: true });
  mkdirSync('.runtime/asr/model', { recursive: true });
  symlinkSync(process.execPath, resolve('.runtime/asr/venv/bin/python'));
  ['model.int8.onnx', 'tokens.txt', 'silero_vad.onnx'].forEach((name) =>
    writeFileSync(resolve('.runtime/asr/model', name), 'fixture'),
  );
  writeFileSync(
    'scripts/asr-inference.py',
    `const fs=require('node:fs');const args=process.argv;const output=args[args.indexOf('--output')+1];if(process.env.HF_HUB_OFFLINE!=='1')process.exit(8);fs.writeFileSync(output,JSON.stringify([{id:'cue',text:'这个是大厅啊',startMs:200,endMs:1500,timestampMs:null,confidence:null}]));`,
  );
  const operation = { controller: new AbortController() };
  return runVideoUploadMedia(operation, {
    binary: 'ffmpeg',
    args: [
      '-y',
      '-v',
      'error',
      '-f',
      'lavfi',
      '-i',
      'nullsrc=s=64x64:r=30:d=2',
      '-f',
      'lavfi',
      '-i',
      'sine=frequency=400:sample_rate=16000',
      '-t',
      '2',
      '-c:v',
      'libx264',
      '-threads',
      '1',
      '-c:a',
      'aac',
      resolve(directory, 'fixture.mp4'),
    ],
  }).then(() => {
    [workspaceA, workspaceB].forEach((workspace) =>
      runInWorkspace(workspace, () =>
        copyFileSync(
          'fixture.mp4',
          resolve(workspaceDirectory('uploads'), src.split('/').pop()!),
        ),
      ),
    );
  });
});
after(() => {
  if (savedEngine === undefined) delete process.env.STUDIO_ASR_ENGINE;
  else process.env.STUDIO_ASR_ENGINE = savedEngine;
  process.chdir(original);
  if (savedRuntime === undefined) delete process.env.STUDIO_ASR_DIR;
  else process.env.STUDIO_ASR_DIR = savedRuntime;
  rmSync(directory, { recursive: true, force: true });
});
/** Read the real task with a bounded deadline; no fabricated completion or network dependency. */
function finished(
  id: string,
  deadline = Date.now() + 15_000,
): Promise<ReturnType<typeof getSubtitleJob>> {
  const job = getSubtitleJob(id);
  if (job.status !== JobStatus.Rendering) return Promise.resolve(job);
  assert.ok(Date.now() < deadline, 'subtitle job deadline');
  return new Promise<void>((accept) => setTimeout(accept, 30)).then(() =>
    finished(id, deadline),
  );
}
test('installation required; arbitrary paths and another account media cannot reach recognition', () => {
  assert.equal(getSubtitleCapability().ready, false);
  runInWorkspace(workspaceA, () =>
    assert.throws(() => createSubtitleJob(src), /setup:asr/),
  );
  assert.throws(() => createSubtitleJob('https://example.com/private.mp4'));
  assert.throws(() => createSubtitleJob('/media/../../private.mp4'));
  runInWorkspace(
    registerWorkspace('33333333-3333-4333-8333-333333333333'),
    () => assert.throws(() => createSubtitleJob(src), /素材不存在|已过期/),
  );
});
test('real job is private, survives polling, reuses only its own cache and clears extracted audio', () => {
  writeFileSync('.runtime/asr/ready.txt', ASR_ID);
  return runInWorkspace(workspaceA, () => {
    const job = createSubtitleJob(src);
    assert.equal(workspaceA.active, 1);
    assert.throws(() => createSubtitleJob(src), /已有原声识别/);
    runInWorkspace(workspaceB, () =>
      assert.throws(() => getSubtitleJob(job.id), /不存在|过期/),
    );
    return finished(job.id)
      .then((done) => {
        assert.equal(done.status, JobStatus.Complete, done.message);
        assert.equal(done.captions[0].text, '这个是大厅啊');
        assert.equal(workspaceA.active, 0);
        assert.deepEqual(readdirSync(workspaceDirectory('subtitle-tmp')), []);
        assert.equal(
          readdirSync(workspaceDirectory('subtitle-cache')).length,
          1,
        );
        // Cached recognition must not launch a second engine, even when that engine subsequently fails.
        writeFileSync('scripts/asr-inference.py', 'process.exit(9)');
        return finished(createSubtitleJob(src).id);
      })
      .then((cached) => {
        assert.equal(cached.status, JobStatus.Complete, cached.message);
        return runInWorkspace(workspaceB, () =>
          finished(createSubtitleJob(src).id),
        );
      })
      .then((other) => {
        assert.equal(
          other.status,
          JobStatus.Failed,
          'other account cannot reuse the first account transcript',
        );
        assert.doesNotMatch(other.message, /fixture|private|\.py/);
        assert.equal(workspaceB.active, 0);
      });
  });
});
test('cancelling a queued task does not take or release the running account slot', () => {
  return acquireMediaSlot().then((release) => {
    const pending = runInWorkspace(workspaceA, () => {
      const job = createSubtitleJob(src);
      assert.throws(
        () => cancelSubtitleJob('44444444-4444-4444-8444-444444444444'),
        /已变化/,
      );
      cancelSubtitleJob(job.id);
      return finished(job.id);
    });
    return pending
      .then((done) => {
        assert.equal(done.status, JobStatus.Failed);
        assert.match(done.message, /取消/);
        assert.equal(workspaceA.active, 0);
        let entered = false;
        const next = acquireMediaSlot().then((unlock) => {
          entered = true;
          unlock();
        });
        assert.equal(entered, false);
        release();
        return next;
      })
      .finally(release);
  });
});
test('AAC tail padding cannot extend recognized captions beyond the original container duration', () => {
  const engine = readFileSync('scripts/asr-inference.py', 'utf8');
  const workspace = registerWorkspace('77777777-7777-4777-8777-777777777777');
  writeFileSync(
    'scripts/asr-inference.py',
    `const fs=require('node:fs');const args=process.argv;const audio=fs.readFileSync(args[args.indexOf('--audio')+1]);let rate=0,size=0;for(let offset=12;offset+8<=audio.length;){const id=audio.toString('ascii',offset,offset+4);const length=audio.readUInt32LE(offset+4);if(id==='fmt ')rate=audio.readUInt32LE(offset+16);if(id==='data'){size=length;break;}offset+=8+length+(length%2);}if(!rate||!size)process.exit(7);const endMs=Math.floor(size/rate*1000);fs.writeFileSync(args[args.indexOf('--output')+1],JSON.stringify([{id:'tail',text:'片尾讲话',startMs:endMs-500,endMs,timestampMs:null,confidence:null}]));`,
  );
  return runInWorkspace(workspace, () => {
    copyFileSync(
      'fixture.mp4',
      resolve(workspaceDirectory('uploads'), src.split('/').pop()!),
    );
    return finished(createSubtitleJob(src).id).then((job) => {
      assert.equal(job.status, JobStatus.Complete, job.message);
      assert.equal(job.captions[0].endMs, 2000);
    });
  }).finally(() => writeFileSync('scripts/asr-inference.py', engine));
});
test('restart makes an interrupted task visibly failed without repeating inference', () => {
  const id = '55555555-5555-4555-8555-555555555555';
  runInWorkspace(workspaceA, () => {
    const path = resolve(workspaceDirectory('subtitle-jobs'), id + '.json');
    writeFileSync(
      path,
      JSON.stringify({
        id,
        src,
        status: JobStatus.Rendering,
        progress: 0.35,
        message: '旧任务',
        captions: [],
      }),
    );
    assert.equal(getSubtitleJob(id).status, JobStatus.Failed);
    assert.match(JSON.parse(readFileSync(path, 'utf8')).message, /重启/);
    assert.ok(
      existsSync(resolve(workspaceDirectory('uploads'), src.split('/').pop()!)),
    );
  });
});
test('audio-free video is rejected from its real stream metadata rather than client flags', () => {
  const target = '/media/source-66666666-6666-4666-8666-666666666666.mp4';
  return runVideoUploadMedia(
    { controller: new AbortController() },
    {
      binary: 'ffmpeg',
      args: [
        '-y',
        '-v',
        'error',
        '-i',
        resolve(directory, 'fixture.mp4'),
        '-an',
        '-c:v',
        'copy',
        resolve(directory, 'no-audio.mp4'),
      ],
    },
  ).then(() =>
    runInWorkspace(workspaceA, () => {
      copyFileSync(
        resolve(directory, 'no-audio.mp4'),
        resolve(workspaceDirectory('uploads'), target.split('/').pop()!),
      );
      return finished(createSubtitleJob(target).id).then((job) => {
        assert.equal(job.status, JobStatus.Failed);
        assert.match(job.message, /没有音轨/);
        assert.equal(workspaceA.active, 0);
      });
    }),
  );
});
test('Nano requires its own ready marker and never reuses the old model transcript cache', () => {
  process.env.STUDIO_ASR_ENGINE = 'nano';
  assert.equal(getAsrRuntime().id, NANO_ASR_ID);
  assert.equal(getSubtitleCapability().ready, false);
  mkdirSync('.runtime/asr/bin', { recursive: true });
  writeFileSync('.runtime/asr/bin/llama-funasr-cli', 'fixture');
  writeFileSync('scripts/asr_nano_alignment.py', 'fixture');
  ['funasr-encoder-f16.gguf', 'qwen3-0.6b-q8_0.gguf', 'fsmn-vad.gguf'].forEach(
    (name) => writeFileSync(resolve('.runtime/asr/model', name), 'fixture'),
  );
  writeFileSync(
    'scripts/asr-nano-inference.py',
    `const fs=require('node:fs');const args=process.argv;fs.writeFileSync(args[args.indexOf('--output')+1],JSON.stringify([{id:'nano',text:'新模型识别结果',startMs:200,endMs:1500,timestampMs:null,confidence:null}]));`,
  );
  assert.equal(getSubtitleCapability().ready, false);
  writeFileSync('.runtime/asr/ready.txt', NANO_ASR_ID);
  assert.equal(getSubtitleCapability().ready, true);
  return runInWorkspace(workspaceA, () => finished(createSubtitleJob(src).id))
    .then((job) => {
      assert.equal(job.status, JobStatus.Complete, job.message);
      assert.equal(job.captions[0].text, '新模型识别结果');
    })
    .finally(() => {
      delete process.env.STUDIO_ASR_ENGINE;
      writeFileSync('.runtime/asr/ready.txt', ASR_ID);
    });
});
