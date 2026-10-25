'use client';

/** Two-video workspace: original talking opening plus a locally scored, captioned property tour. */
import { Player } from '@remotion/player';
import { Button, Input, Select, Title } from 'animal-island-ui';
import clsx from 'clsx';
import {
  DownloadIcon as Download,
  MusicIcon as Music2,
  SaveIcon as Save,
  ScissorsIcon as Scissors,
  UploadIcon as Upload,
} from 'naive-icons';

import { FPS, JobStatus } from '../../services/definition/project';
import {
  VIDEO_ROLE_MAP,
  VideoRole,
} from '../../services/definition/video-edit';
import { VideoEditFilm } from '../../video/video-edit';
import { getVideoEditTimeline } from '../../video/video-edit-timeline';

import { CopyKind } from '../../services/definition/copy';

import { useVideoEdit } from './use-video-edit';
import { CopyGenerator } from './copy-generator';
import { PropertyTextImport } from './property-text-import';
import { CoverSettings } from './cover-settings';

const FIELDS = [
  { key: 'name', label: '小区 / 片名', max: 32 },
  { key: 'facts', label: '楼层 / 面积 / 装修', max: 60 },
  { key: 'price', label: '房源总价', max: 20 },
  { key: 'extra', label: '附加信息', max: 40 },
  { key: 'contact', label: '片尾联系引导', max: 50 },
] as const;
const VOLUMES = [
  { key: 'openingVolume', label: '开场原声', max: 1.5 },
  { key: 'houseVolume', label: '房屋原声讲解', max: 1 },
  { key: 'musicVolume', label: '背景音乐', max: 0.6 },
] as const;

/** Keep local timing/sound separate from the optional, explicitly requested cloud copy suggestions. */
export function VideoEditPage() {
  const editor = useVideoEdit();
  const { project, job, busy, ready, notice } = editor;
  const timeline = getVideoEditTimeline(project);
  const canExport = ready && !busy;
  return (
    <div key={project.sessionId} className="island-workspace min-h-screen">
      <header className="island-header">
        <div
          className={clsx(
            'mx-auto flex flex-wrap items-center justify-between gap-4',
            'max-w-[1600px]',
            'px-5 py-4',
          )}
        >
          <div className="flex items-center gap-3">
            <Scissors className="size-7 text-primary" />
            <div>
              <div className="text-lg font-semibold text-ink">免费实拍剪辑</div>
              <div className="text-xs text-muted">
                本地剪辑与配乐 · 可选百炼画面文案
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              className="island-action"
              onClick={editor.newProject}
              disabled={busy}
            >
              新建房源视频
            </Button>
            <a className="studio-button" href="/">
              照片模式
            </a>
            <Button
              className="island-action"
              disabled={busy || Boolean(editor.inputError)}
              onClick={editor.save}
              icon={<Save size={16} />}
            >
              保存草稿
            </Button>
            <Button
              className="island-action"
              type="primary"
              disabled={!canExport}
              onClick={editor.exportVideo}
              icon={<Download size={16} />}
            >
              免费导出 MP4
            </Button>
          </div>
        </div>
      </header>
      <main className="island-main mx-auto max-w-[1600px] px-5 pt-7 pb-12">
        <div className="island-intro">
          <div className="island-eyebrow">HOUSE VIDEO STUDIO / 实拍剪辑</div>
          <h1 className="text-[28px] leading-9 font-semibold text-ink">
            把真实带看，剪得更从容
          </h1>
          <p className="mt-2 text-sm text-muted">
            本地剪辑与导出无需Key；可选百炼画面文案需要配置Key并确认免费额度。保留真人原声，字幕生成后由你核对采纳。
          </p>
        </div>
        {(editor.work || notice.text) && (
          <div
            role={notice.error ? 'alert' : 'status'}
            className={clsx('mt-5 rounded-lg border px-4 py-3', {
              'border-danger text-danger': notice.error,
              'border-line text-body': !notice.error,
            })}
          >
            {editor.work ?? notice.text}
          </div>
        )}
        <fieldset
          disabled={busy}
          className="mt-7 grid gap-5 sm:grid-cols-2"
          aria-label="两段视频素材"
        >
          {Object.values(VideoRole).map((role) => {
            const clip = project[role];
            return (
              <div key={role} className="island-panel min-w-0">
                <h2 className="text-xl leading-[30px] font-semibold text-ink">
                  <Title size="small" color="app-teal">
                    {role === VideoRole.Opening ? '01 / ' : '02 / '}
                    {VIDEO_ROLE_MAP[role]}
                  </Title>
                </h2>
                <div className="mt-4 flex min-w-0 items-center gap-4">
                  {clip && (
                    <img
                      src={clip.poster}
                      alt={VIDEO_ROLE_MAP[role]}
                      className="h-28 w-20 shrink-0 rounded-lg object-cover"
                    />
                  )}
                  <div className="min-w-0">
                    <label className="studio-button">
                      <Upload size={16} />
                      {clip ? '更换视频' : '上传视频'}
                      <input
                        className="hidden"
                        type="file"
                        accept=".mp4,.mov"
                        aria-label={`上传${VIDEO_ROLE_MAP[role]}`}
                        onChange={(event) => {
                          editor.uploadVideo(event.target.files?.[0], role);
                          event.target.value = '';
                        }}
                      />
                    </label>
                    <p className="mt-2 text-xs break-words text-muted">
                      {clip
                        ? `${clip.name} · ${clip.duration.toFixed(1)}秒 · ${clip.width}×${clip.height}`
                        : 'MP4 / MOV，250MB内，最长10分钟'}
                    </p>
                    <p className="mt-1 text-xs text-muted">
                      {role === VideoRole.Opening
                        ? '使用视频中的真人声音，不重新生成口播。'
                        : '保留房屋视频原声讲解，音乐低音量铺底。'}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </fieldset>
        <div className="mt-7 grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_420px]">
          <section
            className="island-panel order-2 min-w-0 lg:order-1"
            aria-label="房源文案与声音设置"
          >
            <fieldset disabled={busy}>
              <h2 className="text-xl leading-[30px] font-semibold text-ink">
                <Title size="small" color="app-teal">
                  03 / 房源信息与文案
                </Title>
              </h2>
              <PropertyTextImport disabled={busy} onApply={editor.patch} />
              <div className="mt-5 grid gap-6 sm:grid-cols-2">
                {FIELDS.map((field) => (
                  <label
                    key={field.key}
                    className={clsx({
                      'sm:col-span-2': field.key === 'contact',
                    })}
                  >
                    <span className="studio-label">{field.label}</span>
                    <Input
                      aria-label={field.label}
                      value={project[field.key]}
                      maxLength={field.max}
                      onChange={(event) =>
                        editor.patch({ [field.key]: event.target.value })
                      }
                    />
                  </label>
                ))}
              </div>
              <CoverSettings editor={editor} />
              <div className="mt-7 flex flex-wrap items-center justify-between gap-3">
                <h3 className="text-lg leading-7 font-medium text-ink">
                  房屋片段 · 逐段配置
                </h3>
                <Button
                  className="island-action"
                  disabled={!project.house}
                  onClick={editor.resetShots}
                >
                  按视频重新分段
                </Button>
              </div>
              <p className="mt-2 text-xs text-muted">
                时间均对应房屋原视频。保留讲解时请连续覆盖原片，裁切会同时裁掉对应声音。文案以房源信息为准。
              </p>
              {editor.inputError && (
                <p role="alert" className="mt-3 text-xs text-danger">
                  {editor.inputError}
                </p>
              )}
              {!project.shots.length && (
                <p className="mt-5 text-sm text-muted">
                  上传房屋视频后，在这里编辑每段的时间和文案。
                </p>
              )}
              {project.house && project.shots.length > 0 && (
                <div className="mt-5">
                  <CopyGenerator
                    disabled={busy || Boolean(editor.inputError)}
                    input={{
                      kind: CopyKind.Video,
                      facts: {
                        name: project.name,
                        facts: project.facts,
                        price: project.price,
                        extra: project.extra,
                      },
                      house: project.house,
                      shots: project.shots.map((shot) => ({
                        id: shot.id,
                        start: shot.start,
                        end: shot.end,
                      })),
                    }}
                    onApply={(result) =>
                      editor.patch({
                        shots: project.shots.map((shot, index) => ({
                          ...shot,
                          title: result.items[index].title,
                          text: result.items[index].caption,
                        })),
                      })
                    }
                  />
                </div>
              )}
              <div className="mt-5 space-y-6">
                {project.shots.map((shot, index) => (
                  <div key={shot.id} className="border-t border-line pt-5">
                    <div className="mb-4 flex items-center justify-between">
                      <h3 className="text-lg leading-7 font-medium text-ink">
                        片段 {index + 1}
                      </h3>
                      <Button
                        className="island-action"
                        onClick={() => editor.removeShot(shot.id)}
                        aria-label={`移除片段${index + 1}`}
                      >
                        移除
                      </Button>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      {(['start', 'end'] as const).map((key) => (
                        <label key={key}>
                          <span className="studio-label">
                            {key === 'start' ? '开始 / 秒' : '结束 / 秒'}
                          </span>
                          <Input
                            type="number"
                            min={0}
                            max={project.house?.duration}
                            step={0.1}
                            aria-label={`片段${index + 1}${key === 'start' ? '开始' : '结束'}`}
                            value={shot[key]}
                            onChange={(event) => {
                              if (Number.isFinite(event.target.valueAsNumber))
                                editor.patchShot(shot.id, {
                                  [key]: event.target.valueAsNumber,
                                });
                            }}
                          />
                        </label>
                      ))}
                    </div>
                    <label className="mt-6 block">
                      <span className="studio-label">画面主标题</span>
                      <Input
                        aria-label={`片段${index + 1}标题`}
                        value={shot.title}
                        maxLength={24}
                        onChange={(event) =>
                          editor.patchShot(shot.id, {
                            title: event.target.value,
                          })
                        }
                      />
                    </label>
                    <label className="mt-6 block">
                      <span className="studio-label">
                        本段文案 · 仅加画面字幕，不生成配音
                      </span>
                      <textarea
                        className={clsx(
                          'w-full min-h-24',
                          'px-3 py-2',
                          'rounded-lg border border-input bg-panel',
                          'text-sm leading-6',
                          'focus:outline-primary',
                        )}
                        aria-label={`片段${index + 1}文案`}
                        maxLength={100}
                        value={shot.text}
                        onChange={(event) =>
                          editor.patchShot(shot.id, {
                            text: event.target.value,
                          })
                        }
                      />
                    </label>
                  </div>
                ))}
              </div>
              <div className="mt-7 space-y-6 border-t border-line pt-5">
                <h2 className="text-xl leading-[30px] font-semibold text-ink">
                  <Title size="small" color="app-teal">
                    04 / 音乐与转场
                  </Title>
                </h2>
                <div className="flex flex-wrap gap-2">
                  <label className="studio-button">
                    <Music2 size={16} />
                    上传背景音乐
                    <input
                      className="hidden"
                      type="file"
                      accept=".wav,.mp3,.m4a,.ogg"
                      aria-label="上传背景音乐"
                      onChange={(event) => {
                        editor.uploadMusic(event.target.files?.[0]);
                        event.target.value = '';
                      }}
                    />
                  </label>
                  <Button
                    className="island-action"
                    onClick={editor.originalMusic}
                  >
                    使用原创钢琴
                  </Button>
                  {project.music && (
                    <Button
                      className="island-action"
                      onClick={() => editor.patch({ music: null })}
                    >
                      关闭音乐
                    </Button>
                  )}
                </div>
                {project.music && (
                  <div>
                    <p className="mb-2 text-xs text-muted">
                      {project.music.name} · 全片低音量铺底，首尾自动淡化
                    </p>
                    <audio
                      controls
                      className="h-10 w-full"
                      src={project.music.src}
                      aria-label="背景音乐试听"
                    />
                  </div>
                )}
                {VOLUMES.map((field) => (
                  <label key={field.key} className="block">
                    <span className="studio-label">
                      {field.label} · {Math.round(project[field.key] * 100)}%
                    </span>
                    <input
                      type="range"
                      min={0}
                      max={field.max}
                      step={0.01}
                      value={project[field.key]}
                      className="w-full accent-primary"
                      aria-label={field.label}
                      onChange={(event) =>
                        editor.patch({
                          [field.key]: event.target.valueAsNumber,
                        })
                      }
                    />
                  </label>
                ))}
                <label className="block">
                  <span className="studio-label">柔和淡化转场</span>
                  <div className="island-select">
                    <Select
                      disabled={busy}
                      aria-label="柔和淡化转场"
                      value={String(project.transitionSeconds)}
                      onChange={(value) =>
                        editor.patch({ transitionSeconds: Number(value) })
                      }
                      options={[
                        { key: String(0), label: '直接切换' },
                        { key: String(0.35), label: '短淡化 · 0.35秒' },
                        { key: String(0.6), label: '柔和淡化 · 0.6秒' },
                      ]}
                    />
                  </div>
                </label>
                <p className="text-xs text-muted">
                  原声开启时，转场只淡化画面，人声顺次播放。音乐建议先用8%，以讲解清楚为主。内置音乐由本机合成。
                </p>
              </div>
            </fieldset>
          </section>
          <section
            className="island-preview order-1 min-w-0 lg:order-2"
            aria-label="免费剪辑预览与导出"
          >
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-xl leading-[30px] font-semibold text-ink">
                <Title size="small" color="app-teal">
                  成片预览
                </Title>
              </h2>
              <span className="text-xs text-muted">
                {ready && `${(timeline.frames / FPS).toFixed(1)}秒`}
                {!ready && editor.inputError && '请检查剪辑设置'}
                {!ready && !editor.inputError && '等待两段视频'}
              </span>
            </div>
            <div
              className={clsx(
                'flex items-center justify-center',
                'min-h-[420px]',
                'p-4',
                'rounded-xl bg-stage',
              )}
            >
              {ready && (
                <Player
                  component={VideoEditFilm}
                  inputProps={{ project }}
                  durationInFrames={timeline.frames}
                  compositionWidth={1080}
                  compositionHeight={1920}
                  fps={FPS}
                  controls
                  style={{ width: 'min(100%, 320px)' }}
                  errorFallback={({ error }) => (
                    <div className="p-4 text-white">
                      预览失败：{error.message}
                    </div>
                  )}
                />
              )}
              {!ready && (
                <div className="max-w-64 text-center text-white">
                  <Scissors className="mx-auto mb-5 size-10 opacity-60" />
                  <p className="text-lg leading-7">
                    {editor.inputError
                      ? '请检查剪辑设置'
                      : '先上传开场与房屋视频'}
                  </p>
                  <p className="mt-3 text-sm text-white/65">
                    {editor.inputError
                      ? editor.inputError
                      : '两段视频、音乐和文字均在本机剪辑，不需要生成模型。'}
                  </p>
                </div>
              )}
            </div>
            <p className="mt-3 text-xs text-muted">
              1080 × 1920 · 30 FPS · H.264 / AAC
              {ready && (
                <> · 开头含{(timeline.coverFrames / FPS).toFixed(1)}秒主封面</>
              )}
            </p>
            <Button
              type="primary"
              className="island-action mt-5 w-full"
              disabled={!canExport}
              onClick={editor.exportVideo}
              icon={<Download size={16} />}
            >
              免费导出成片与封面
            </Button>
            {job && (
              <div
                className="mt-6 border-t border-line pt-5"
                aria-live="polite"
              >
                <h3 className="text-lg leading-7 font-medium text-ink">
                  最近一次导出
                </h3>
                <p
                  className={clsx('mt-2 text-xs break-words', {
                    'text-danger': job.status === JobStatus.Failed,
                    'text-muted': job.status !== JobStatus.Failed,
                  })}
                >
                  {job.message}
                </p>
                <progress
                  className="mt-3 h-2 w-full accent-primary"
                  max={1}
                  value={job.progress}
                  aria-label="免费视频导出进度"
                />
                {job.output && (
                  <>
                    <video
                      className="mt-4 w-full rounded-lg"
                      src={job.output}
                      poster={job.cover ?? undefined}
                      controls
                      aria-label="已导出免费视频"
                    />
                    <div className="mt-3 flex flex-wrap gap-2">
                      <a className="studio-primary" href={job.output} download>
                        下载 MP4
                      </a>
                      {job.cover && (
                        <a className="studio-button" href={job.cover} download>
                          下载封面
                        </a>
                      )}
                    </div>
                    {job.cover && (
                      <img
                        className="mt-4 w-full rounded-lg"
                        src={job.cover}
                        alt="房源视频封面"
                      />
                    )}
                  </>
                )}
              </div>
            )}
          </section>
        </div>
        <footer className="island-footer">
          房源视频工作室<span>慢慢打磨每一帧，认真呈现每一处家。</span>
        </footer>
      </main>
    </div>
  );
}
