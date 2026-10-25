'use client';

/** Photo-first editing workspace with a shared, exportable Remotion preview. */
import { Player, type PlayerRef } from '@remotion/player';
import { Button, Input, Select, Title, Checkbox } from 'animal-island-ui';
import clsx from 'clsx';
import {
  ArrowDownIcon as ArrowDown,
  ArrowUpIcon as ArrowUp,
  DownloadIcon as Download,
  CameraIcon as Film,
  FolderIcon as FolderOpen,
  ImageIcon as ImagePlus,
  MicIcon as Mic,
  MusicIcon as Music2,
  SaveIcon as Save,
  TrashIcon as Trash2,
  UploadIcon as Upload,
  VideoIcon as Video,
} from 'naive-icons';
import { useRef } from 'react';

import {
  ASPECT_MAP,
  Aspect,
  DIMENSIONS,
  FPS,
  JobStatus,
  MOTION_MAP,
  Motion,
  Transition,
} from '../../services/definition/project';
import { HouseTour } from '../../video/house-tour';
import { getSceneFrames, getTimeline } from '../../video/timeline';

import { downloadProject } from './api';
import { useStudio } from './use-studio';
import { SceneEditor } from './scene-editor';
import { OpeningPanel } from './opening-panel';

const PROPERTY_FIELDS = [
  {
    key: 'name',
    label: '房源标题',
    placeholder: '给这套房子起一个标题',
    max: 60,
  },
  {
    key: 'location',
    label: '小区 / 位置',
    placeholder: '例如：城市花园 · 南区',
    max: 80,
  },
  { key: 'area', label: '建筑面积', placeholder: '例如：120㎡', max: 30 },
  { key: 'layout', label: '户型', placeholder: '例如：三室两厅', max: 30 },
  { key: 'price', label: '价格', placeholder: '例如：总价280万元', max: 30 },
  {
    key: 'contact',
    label: '片尾联系信息',
    placeholder: '预约看房方式',
    max: 80,
  },
] as const;

/** The editor is intentionally one route; controls are grouped by the user's creation steps. */
export function StudioPage() {
  const studio = useStudio();
  const { project, selected, busy, work, notice, job } = studio;
  const player = useRef<PlayerRef>(null);
  const photoInput = useRef<HTMLInputElement>(null);
  const timeline = getTimeline(project);
  const dimensions = DIMENSIONS[project.aspect];
  const selectedIndex = project.scenes.findIndex(
    (scene) => scene.id === selected?.id,
  );
  const hasScenes = project.scenes.length > 0 || Boolean(project.opening?.clip);
  const hasNarration = project.scenes.some(
    (scene) => scene.narration.trim().length > 0,
  );
  const staleSpeech = project.scenes.some(
    (scene) =>
      scene.voiceover?.text !== null &&
      scene.voiceover &&
      scene.voiceover.text !== scene.narration,
  );
  const canExport =
    hasScenes &&
    !staleSpeech &&
    project.name.length > 0 &&
    !busy &&
    (!project.opening || Boolean(project.opening.clip));
  const statusText =
    work ??
    (job?.status === JobStatus.Rendering
      ? job.message
      : '开场视频直接上传 · 素材和成片保存在本机');

  return (
    <div key={project.sessionId} className="island-workspace min-h-screen">
      <header className="island-header">
        <div
          className={clsx(
            'mx-auto flex flex-wrap items-center justify-between gap-4',
            'max-w-[1600px]',
            'px-5 py-4',
            'max-sm:flex-wrap',
          )}
        >
          <div className="flex min-w-0 items-center gap-3">
            <Film className="size-7 shrink-0 text-primary" />
            <div>
              <div className="text-lg font-semibold text-ink">
                房源视频工作室
              </div>
              <div className="text-xs text-muted">HOUSE VIDEO STUDIO</div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              className="island-action"
              onClick={studio.newProject}
              disabled={busy}
            >
              新建房源视频
            </Button>
            <a className="studio-button" href="/video-edit">
              免费实拍剪辑
            </a>
            <Button
              className="island-action"
              onClick={studio.loadDemo}
              disabled={busy}
              icon={<FolderOpen size={16} />}
            >
              体验演示房源
            </Button>
            <Button
              className="island-action"
              onClick={studio.saveDraft}
              disabled={busy || !project.name}
              icon={<Save size={16} />}
            >
              保存草稿
            </Button>
            <Button
              className="island-action"
              type="primary"
              onClick={studio.exportVideo}
              disabled={!canExport}
              icon={<Download size={16} />}
            >
              导出 MP4
            </Button>
          </div>
        </div>
      </header>

      <main className="island-main mx-auto max-w-[1600px] px-5 pt-7 pb-12">
        <div className="island-intro mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <div className="island-eyebrow">HOUSE VIDEO STUDIO / 照片带看</div>
            <h1 className="text-[28px] leading-9 font-semibold text-ink">
              把房源照片，变成一段带看
            </h1>
            <p className="mt-2 text-sm text-muted">
              人物开场，照片带看。把你的解说和房源故事接成一条视频。
            </p>
          </div>
          <div role="status" className="text-xs text-muted">
            {statusText}
          </div>
        </div>
        {notice.text && (
          <div
            role={notice.error ? 'alert' : 'status'}
            className={clsx('mb-5 rounded-lg border px-4 py-3', {
              'border-danger text-danger': notice.error,
              'border-primary bg-primary-soft text-body': !notice.error,
            })}
          >
            {notice.text}
          </div>
        )}

        <div
          className={clsx(
            'grid items-start gap-6',
            'grid-cols-1',
            'xl:grid-cols-[320px_minmax(0,1fr)_300px]',
            'md:grid-cols-[minmax(0,1fr)_320px]',
          )}
        >
          <section
            className="island-panel min-w-0 md:col-span-2 xl:col-span-1"
            aria-label="房源信息与场景"
          >
            <OpeningPanel studio={studio} />
            <fieldset disabled={busy}>
              <h2 className="mb-5 text-xl leading-[30px] font-semibold text-ink">
                <Title size="small" color="app-teal">
                  01 / 房源与照片
                </Title>
              </h2>
              <div className="grid grid-cols-2 gap-x-3 gap-y-6">
                {PROPERTY_FIELDS.map((field) => (
                  <label
                    key={field.key}
                    className={clsx({
                      'col-span-2': ['name', 'location', 'contact'].includes(
                        field.key,
                      ),
                    })}
                  >
                    <span className="studio-label">{field.label}</span>
                    <Input
                      aria-label={field.label}
                      value={project[field.key]}
                      maxLength={field.max}
                      placeholder={field.placeholder}
                      onChange={(event) =>
                        studio.setProject({
                          ...project,
                          [field.key]: event.target.value,
                        })
                      }
                    />
                  </label>
                ))}
              </div>
              <div className="mt-7 mb-3 flex items-center justify-between">
                <h3 className="text-lg leading-7 font-medium text-ink">
                  场景顺序
                </h3>
                <span className="text-xs text-muted">
                  {project.scenes.length} / 20 张
                </span>
              </div>
              <input
                ref={photoInput}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                className="hidden"
                aria-label="上传房源照片"
                onChange={(event) => {
                  studio.addPhotos(event.target.files);
                  event.target.value = '';
                }}
              />
              <Button
                className="island-action w-full"
                disabled={project.scenes.length >= 20}
                onClick={() => photoInput.current?.click()}
                icon={<ImagePlus size={16} />}
              >
                添加房源照片
              </Button>
              <p className="mt-2 text-xs text-muted">
                JPG / PNG / WebP，每张不超过20MB
              </p>
              <div
                className="mt-4 flex max-h-[520px] flex-col gap-2 overflow-y-auto"
                aria-label="场景列表"
              >
                {project.scenes.map((scene, index) => (
                  <button
                    key={scene.id}
                    aria-label={`选择场景${index + 1}：${scene.title}`}
                    aria-pressed={selected?.id === scene.id}
                    onClick={() => {
                      studio.setSelectedId(scene.id);
                      player.current?.seekTo(timeline.scenes[index].start);
                    }}
                    className={clsx(
                      'flex items-center gap-3',
                      'w-full',
                      'p-2',
                      'rounded-lg border',
                      'text-left',
                      'transition-colors hover:border-primary',
                      {
                        'border-primary bg-primary-soft':
                          selected?.id === scene.id,
                        'border-input bg-panel': selected?.id !== scene.id,
                      },
                    )}
                  >
                    <img
                      className="h-14 w-20 shrink-0 rounded object-cover"
                      src={scene.src}
                      alt={scene.title || `房源照片${index + 1}`}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm text-ink">
                        {String(index + 1).padStart(2, '0')} ·{' '}
                        {scene.title || '未命名场景'}
                      </div>
                      <div className="text-xs text-muted">
                        {(getSceneFrames(scene) / FPS).toFixed(1)}秒 ·{' '}
                        {MOTION_MAP[scene.motion]}{' '}
                        {scene.voiceover && '· 已配音'} · 编辑文案
                      </div>
                    </div>
                  </button>
                ))}
              </div>
              <SceneEditor studio={studio} canExport={canExport} />
            </fieldset>
          </section>

          <section className="island-preview min-w-0" aria-label="视频预览">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-xl leading-[30px] font-semibold text-ink">
                <Title size="small" color="app-teal">
                  02 / 预览成片
                </Title>
              </h2>
              <span className="text-xs text-muted">
                {hasScenes
                  ? `${(timeline.frames / FPS).toFixed(1)} 秒 · 30 FPS`
                  : '等待添加照片'}
              </span>
            </div>
            <div
              className={clsx(
                'flex items-center justify-center',
                'min-h-[420px]',
                'p-5',
                'rounded-xl bg-stage',
                'lg:min-h-[560px]',
              )}
            >
              {hasScenes && (
                <Player
                  ref={player}
                  component={HouseTour}
                  inputProps={{ project }}
                  durationInFrames={timeline.frames}
                  fps={FPS}
                  compositionWidth={dimensions.width}
                  compositionHeight={dimensions.height}
                  controls
                  style={{
                    width:
                      project.aspect === Aspect.Portrait
                        ? 'min(100%, 304px)'
                        : '100%',
                  }}
                  errorFallback={({ error }) => (
                    <div className="p-6 text-white">
                      素材无法预览：{error.message}。请检查文件或重新上传。
                    </div>
                  )}
                />
              )}
              {!hasScenes && (
                <div className="max-w-72 text-center text-white">
                  <Video size={44} className="mx-auto mb-5 opacity-60" />
                  <h3 className="text-lg leading-7 font-medium">
                    从第一张房源照片开始
                  </h3>
                  <p className="mt-3 text-sm text-white/60">
                    添加照片后，这里会实时预览运镜、字幕和转场。也可以载入演示房源体验完整流程。
                  </p>
                  <Button
                    onClick={studio.loadDemo}
                    disabled={busy}
                    className="island-action studio-primary mt-6"
                  >
                    载入演示房源
                  </Button>
                </div>
              )}
            </div>
            <div
              className={clsx(
                'flex flex-wrap items-center justify-between gap-2',
                'mt-4',
                'text-xs text-muted',
              )}
            >
              <span>
                {dimensions.width} × {dimensions.height} · H.264 MP4
              </span>
              <span>预览和导出共用视频模板</span>
            </div>
            <div className="mt-6 border-t border-line pt-5">
              <h3 className="text-lg leading-7 font-medium text-ink">
                一条视频，三个步骤
              </h3>
              <ol
                className={clsx(
                  'flex flex-wrap',
                  'mt-3 gap-x-6 gap-y-2',
                  'text-sm text-muted',
                )}
              >
                <li>01 整理真实房源照片</li>
                <li>02 编辑解说与运镜</li>
                <li>03 试听预览并导出</li>
              </ol>
            </div>
            {project.demo && (
              <p className="mt-4 text-xs text-muted">
                当前为演示房源；照片来自不同空间，房源参数为虚构示例。制作真实带看时请替换照片和信息。
              </p>
            )}
          </section>

          <section className="island-panel min-w-0" aria-label="运镜与导出设置">
            <fieldset disabled={busy}>
              <h2 className="mb-5 text-xl leading-[30px] font-semibold text-ink">
                <Title size="small" color="app-teal">
                  03 / 解说与运镜
                </Title>
              </h2>
              {selected && (
                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-3">
                    <label>
                      <span className="studio-label">运镜方式</span>
                      <div className="island-select">
                        <Select
                          disabled={busy}
                          aria-label="运镜方式"
                          value={selected.motion}
                          onChange={(value) =>
                            studio.patchScene({ motion: value as Motion })
                          }
                          options={Object.entries(MOTION_MAP).map(
                            ([key, label]) => ({ key, label }),
                          )}
                        />
                      </div>
                    </label>
                    <label>
                      <span className="studio-label">基础时长 / 秒</span>
                      <Input
                        type="number"
                        min={3}
                        max={30}
                        step={0.5}
                        aria-label="场景时长"
                        value={selected.seconds}
                        onChange={(event) => {
                          if (
                            event.target.valueAsNumber >= 3 &&
                            event.target.valueAsNumber <= 30
                          )
                            studio.patchScene({
                              seconds: event.target.valueAsNumber,
                            });
                        }}
                      />
                    </label>
                  </div>
                  <div>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        className="island-action"
                        disabled={selectedIndex <= 0}
                        onClick={() => studio.moveScene(-1)}
                        aria-label="场景上移"
                        icon={<ArrowUp size={16} />}
                      ></Button>
                      <Button
                        className="island-action"
                        disabled={selectedIndex === project.scenes.length - 1}
                        onClick={() => studio.moveScene(1)}
                        aria-label="场景下移"
                        icon={<ArrowDown size={16} />}
                      ></Button>
                      <Button
                        className="island-action"
                        onClick={studio.removeScene}
                        icon={<Trash2 size={15} />}
                      >
                        移除场景
                      </Button>
                    </div>
                  </div>
                </div>
              )}
              {!selected && (
                <p className="text-sm text-muted">
                  添加照片后，在这里编辑每个场景。
                </p>
              )}
              {staleSpeech && (
                <p role="alert" className="mt-4 text-xs text-danger">
                  解说文案已修改，请在照片下更新该张配音，或移除旧音频后再导出。
                </p>
              )}
              <div className="mt-6 border-t border-line pt-5">
                <Button
                  className="island-action w-full"
                  onClick={studio.generateSpeech}
                  disabled={
                    !hasNarration || !studio.speechCapability.speechReady
                  }
                  icon={<Mic size={16} />}
                >
                  补齐缺失 / 已改词配音（百炼）
                </Button>
                <p className="mt-2 text-xs text-muted">
                  {studio.speechCapability.speechMessage}
                </p>
              </div>
              <div className="mt-6 space-y-6 border-t border-line pt-5">
                <label className="block">
                  <span className="studio-label">成片画幅</span>
                  <div className="island-select">
                    <Select
                      disabled={busy}
                      aria-label="成片画幅"
                      value={project.aspect}
                      onChange={(value) =>
                        studio.setProject({
                          ...project,
                          aspect: value as Aspect,
                        })
                      }
                      options={Object.entries(ASPECT_MAP).map(
                        ([key, label]) => ({
                          key,
                          label,
                        }),
                      )}
                    />
                  </div>
                </label>
                <label className="block">
                  <span className="studio-label">场景转场</span>
                  <div className="island-select">
                    <Select
                      disabled={busy}
                      aria-label="场景转场"
                      value={project.transition}
                      onChange={(value) =>
                        studio.setProject({
                          ...project,
                          transition: value as Transition,
                        })
                      }
                      options={[
                        { key: String(Transition.Fade), label: '柔和淡化' },
                        { key: String(Transition.Cut), label: '直接切换' },
                      ]}
                    />
                  </div>
                </label>
                {project.transition === Transition.Fade && (
                  <label className="block">
                    <span className="studio-label">
                      淡化时长 · {project.transitionSeconds}秒
                    </span>
                    <input
                      className="w-full accent-primary"
                      type="range"
                      min={0.3}
                      max={0.8}
                      step={0.1}
                      aria-label="淡化时长"
                      value={project.transitionSeconds}
                      onChange={(event) =>
                        studio.setProject({
                          ...project,
                          transitionSeconds: event.target.valueAsNumber,
                        })
                      }
                    />
                  </label>
                )}
                <Checkbox
                  disabled={busy}
                  options={[{ value: 'captions', label: '显示解说字幕' }]}
                  value={project.showCaptions ? ['captions'] : []}
                  onChange={(values) =>
                    studio.setProject({
                      ...project,
                      showCaptions: values.includes('captions'),
                    })
                  }
                />
                <div>
                  <label className="studio-button w-full">
                    <Music2 size={16} />
                    上传背景音乐
                    <input
                      className="hidden"
                      type="file"
                      accept=".wav,.mp3,.m4a,.ogg"
                      aria-label="上传背景音乐"
                      onChange={(event) => {
                        studio.addAudio(event.target.files?.[0], false);
                        event.target.value = '';
                      }}
                    />
                  </label>
                  {project.music && (
                    <>
                      <div className="mt-2 flex items-center justify-between gap-2 text-xs">
                        <span className="truncate">{project.music.name}</span>
                        <Button
                          type="text"
                          danger
                          className="island-action shrink-0"
                          onClick={() =>
                            studio.setProject({ ...project, music: null })
                          }
                        >
                          移除
                        </Button>
                      </div>
                      <label className="mt-3 block">
                        <span className="studio-label">
                          背景音量 · {Math.round(project.musicVolume * 100)}%
                        </span>
                        <input
                          type="range"
                          min={0}
                          max={0.5}
                          step={0.01}
                          className="w-full accent-primary"
                          aria-label="背景音量"
                          value={project.musicVolume}
                          onChange={(event) =>
                            studio.setProject({
                              ...project,
                              musicVolume: event.target.valueAsNumber,
                            })
                          }
                        />
                      </label>
                    </>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    className="island-action"
                    onClick={() => downloadProject(project)}
                    icon={<Download size={14} />}
                  >
                    导出配置
                  </Button>
                  <label className="studio-button">
                    <Upload size={14} />
                    导入配置
                    <input
                      className="hidden"
                      type="file"
                      accept=".json"
                      aria-label="导入配置"
                      onChange={(event) => {
                        studio.importProject(event.target.files?.[0]);
                        event.target.value = '';
                      }}
                    />
                  </label>
                </div>
              </div>
            </fieldset>
            {job && (
              <div
                className="mt-6 border-t border-line pt-5"
                aria-live="polite"
              >
                <h3 className="text-lg leading-7 font-medium text-ink">
                  导出任务
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
                  aria-label="视频导出进度"
                />
                {job.output && (
                  <>
                    <video
                      className="mt-4 max-h-64 w-full rounded-lg bg-stage"
                      src={job.output}
                      controls
                    />
                    <a
                      className="studio-primary mt-3 w-full"
                      href={job.output}
                      download="房源探盘视频.mp4"
                    >
                      <Download size={16} />
                      下载视频
                    </a>
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
