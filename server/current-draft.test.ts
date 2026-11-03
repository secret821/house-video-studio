/** Real files prove single-snapshot persistence, ownership, revision checks and safe media reclamation. */
import assert from 'node:assert/strict';
import { before, after, test } from 'node:test';
import {
  mkdtempSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
  existsSync,
  statSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

import {
  DraftKind,
  EMPTY_PROJECT,
  projectDraftSchema,
} from '../src/services/definition/project';
import {
  EMPTY_VIDEO_EDIT,
  videoEditDraftSchema,
} from '../src/services/definition/video-edit';

const original = process.cwd();
const root = mkdtempSync(resolve(tmpdir(), 'studio-server-draft-'));
let workspace: typeof import('./workspace');
let drafts: typeof import('./current-draft');
const aId = '11111111-1111-4111-8111-111111111111';
const bId = '22222222-2222-4222-8222-222222222222';
const clip = {
  src: '/media/source-00000000-0000-4000-8000-000000000001.mp4',
  poster: '/demo/living.jpg',
  name: 'original.mp4',
  duration: 6,
  width: 720,
  height: 1280,
  hasAudio: true,
};
before(() => {
  process.chdir(root);
  process.env.STUDIO_TEMPORARY_MEDIA = '1';
  return import('./workspace').then((module) => {
    workspace = module;
    return import('./current-draft').then((module) => {
      drafts = module;
    });
  });
});
after(() => {
  process.chdir(original);
  rmSync(root, { recursive: true, force: true });
});

test('JSON saves overwrite one file, preserve exact raw video bytes and cannot cross accounts or stale revisions', () => {
  const a = workspace.registerWorkspace(aId),
    b = workspace.registerWorkspace(bId);
  workspace.runInWorkspace(a, () => {
    const path = resolve(
      workspace.workspaceDirectory('uploads'),
      'source-00000000-0000-4000-8000-000000000001.mp4',
    );
    writeFileSync(path, 'original accepted bytes');
    const first = drafts.saveCurrentDraft(
      DraftKind.Video,
      videoEditDraftSchema,
      { project: { ...EMPTY_VIDEO_EDIT, opening: clip }, revision: null },
    );
    const second = drafts.saveCurrentDraft(
      DraftKind.Video,
      videoEditDraftSchema,
      {
        project: {
          ...first.project,
          name: '最新房源',
          sourceText: '完整粘贴文案',
        },
        revision: first.revision,
      },
    );
    assert.notEqual(first.revision, second.revision);
    assert.equal(
      drafts.getCurrentDraft(DraftKind.Video, videoEditDraftSchema).project
        ?.name,
      '最新房源',
    );
    assert.equal(readFileSync(path, 'utf8'), 'original accepted bytes');
    assert.deepEqual(
      readdirSync(workspace.workspaceDirectory('drafts')).filter((x) =>
        x.endsWith('.json'),
      ),
      ['video.json'],
    );
    assert.throws(
      () =>
        drafts.saveCurrentDraft(DraftKind.Video, videoEditDraftSchema, {
          project: first.project,
          revision: first.revision,
        }),
      /其他页面更新/,
    );
    workspace.runInWorkspace(b, () => {
      assert.equal(
        drafts.getCurrentDraft(DraftKind.Video, videoEditDraftSchema).project,
        null,
      );
      assert.throws(
        () =>
          drafts.saveCurrentDraft(DraftKind.Video, videoEditDraftSchema, {
            project: first.project,
            revision: null,
          }),
        /不存在|过期/,
      );
    });
    assert.equal(
      drafts.getCurrentDraft(DraftKind.Video, videoEditDraftSchema).revision,
      second.revision,
    );
  });
});

test('New reclaims only former references, waits for account work and preserves the other mode', () => {
  const a = workspace.registerWorkspace(aId);
  workspace.runInWorkspace(a, () => {
    const photo = drafts.saveCurrentDraft(DraftKind.Photo, projectDraftSchema, {
      project: {
        ...EMPTY_PROJECT,
        opening: {
          source: 'upload',
          photo: null,
          script: '',
          voiceover: null,
          clip,
        },
      },
      revision: null,
    });
    const video = drafts.getCurrentDraft(DraftKind.Video, videoEditDraftSchema);
    drafts.saveCurrentDraft(DraftKind.Video, videoEditDraftSchema, {
      project: EMPTY_VIDEO_EDIT,
      revision: video.revision,
    });
    drafts.cleanupDiscardedDraftMedia();
    const path = resolve(
      workspace.workspaceDirectory('uploads'),
      'source-00000000-0000-4000-8000-000000000001.mp4',
    );
    assert.ok(
      existsSync(path),
      'photo mode still references this exact source',
    );
    const release = workspace.holdWorkspace();
    drafts.saveCurrentDraft(DraftKind.Photo, projectDraftSchema, {
      project: EMPTY_PROJECT,
      revision: photo.revision,
    });
    drafts.cleanupDiscardedDraftMedia();
    assert.ok(existsSync(path), 'running job or stream keeps its source');
    release();
    drafts.cleanupDiscardedDraftMedia();
    assert.equal(existsSync(path), false);
    assert.equal(
      drafts.getCurrentDraft(DraftKind.Photo, projectDraftSchema).project
        ?.opening,
      null,
    );
  });
});

test('an actual second process reads the same current draft and original after restart while scratch expires', () => {
  const isolated = resolve(root, 'restart');
  mkdirSync(isolated);
  const workspaceUrl = new URL('./workspace.ts', import.meta.url).href;
  const draftUrl = new URL('./current-draft.ts', import.meta.url).href;
  const projectUrl = new URL(
    '../src/services/definition/project.ts',
    import.meta.url,
  ).href;
  const editUrl = new URL(
    '../src/services/definition/video-edit.ts',
    import.meta.url,
  ).href;
  const intro = `import {writeFileSync,readFileSync,existsSync} from 'node:fs';import {resolve} from 'node:path';import * as w from ${JSON.stringify(workspaceUrl)};import * as d from ${JSON.stringify(draftUrl)};import {DraftKind} from ${JSON.stringify(projectUrl)};import {EMPTY_VIDEO_EDIT,videoEditDraftSchema} from ${JSON.stringify(editUrl)};`;
  const first =
    intro +
    `w.runInWorkspace(w.registerWorkspace(${JSON.stringify(aId)}),()=>{writeFileSync(resolve(w.workspaceDirectory('uploads'),'source-00000000-0000-4000-8000-000000000003.mp4'),'restart-original');writeFileSync(resolve(w.workspaceDirectory('exports'),'old.mp4'),'scratch');d.saveCurrentDraft(DraftKind.Video,videoEditDraftSchema,{project:{...EMPTY_VIDEO_EDIT,name:'重启保留',opening:${JSON.stringify({ ...clip, src: '/media/source-00000000-0000-4000-8000-000000000003.mp4' })}},revision:null});});`;
  const second =
    intro +
    `w.runInWorkspace(w.registerWorkspace(${JSON.stringify(aId)}),()=>{const p=d.getCurrentDraft(DraftKind.Video,videoEditDraftSchema).project;if(p?.name!=='重启保留'||readFileSync(resolve(w.workspaceDirectory('uploads'),'source-00000000-0000-4000-8000-000000000003.mp4'),'utf8')!=='restart-original')throw Error('lost draft/media');if(existsSync(resolve(w.workspaceDirectory('exports'),'old.mp4')))throw Error('scratch survived');console.log('RESTART_PERSISTENCE_PASS');});`;
  const run = promisify(execFile);
  const options = {
    cwd: isolated,
    env: { ...process.env, STUDIO_TEMPORARY_MEDIA: '1' },
  };
  return run(
    process.execPath,
    [
      '--import',
      import.meta.resolve('tsx'),
      '--input-type=module',
      '-e',
      first,
    ],
    options,
  )
    .then(() =>
      run(
        process.execPath,
        [
          '--import',
          import.meta.resolve('tsx'),
          '--input-type=module',
          '-e',
          second,
        ],
        options,
      ),
    )
    .then(({ stdout }) => assert.match(stdout, /RESTART_PERSISTENCE_PASS/));
});

test('a referenced prepared result is retained by rename instead of leaving the saved draft tied to temporary cache', () => {
  const account = workspace.registerWorkspace(
    '33333333-3333-4333-8333-333333333333',
  );
  workspace.runInWorkspace(account, () => {
    const name = 'import-' + 'a'.repeat(64) + '.mp4';
    const temporary = resolve(
      workspace.workspaceDirectory('video-edit', 'prepared'),
      name,
    );
    writeFileSync(temporary, 'prepared bytes');
    const inode = statSync(temporary).ino;
    const saved = drafts.saveCurrentDraft(
      DraftKind.Video,
      videoEditDraftSchema,
      {
        project: {
          ...EMPTY_VIDEO_EDIT,
          opening: { ...clip, src: '/media/' + name },
        },
        revision: null,
      },
    );
    const retained = resolve(workspace.workspaceDirectory('uploads'), name);
    assert.equal(existsSync(temporary), false);
    assert.equal(
      statSync(retained).ino,
      inode,
      'no second video file is copied',
    );
    assert.equal(
      drafts.getCurrentDraft(DraftKind.Video, videoEditDraftSchema).revision,
      saved.revision,
    );
  });
});
