'use client';

/** Photo-first editing workspace with a shared, exportable Remotion preview. */
import { MusicPicker } from './music-picker';
import { Player, type PlayerRef } from '@remotion/player';
import {
  Button,
  Input,
  Select,
  Checkbox,
  Slider,
  Progress,
  InputNumber,
  ConfigProvider,
} from 'antd';
import clsx from 'clsx';
import { useRef } from 'react';

import {
  ASPECT_MAP,
  EMPTY_PROJECT,
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

import { FileUpload } from './file-upload';
import { VideoUploadStatus } from './video-upload-status';
import { downloadProject } from './api';
import { useStudio } from './use-studio';
import { SceneEditor } from './scene-editor';
import { OpeningPanel } from './opening-panel';
import { StudioHeader } from './studio-header';

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
    work ?? (job?.status === JobStatus.Rendering ? job.message : null);

  return (
    <div
      key={project.sessionId}
      className="studio-ui island-workspace min-h-screen"
    >
      <StudioHeader
        busy={busy}
        saveDisabled={!project.name}
        photoMode
        actions={{ save: studio.saveDraft, newProject: studio.newProject }}
      />

      <main className="studio-shell">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-[28px] leading-9 font-semibold text-ink">
            照片精细编辑
          </h1>
          {statusText && (
            <div role="status" className="text-xs text-muted">
              {statusText}
            </div>
          )}
        </div>
        <VideoUploadStatus upload={studio.upload} />
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

        <div className="studio-editor-grid">
          <div className="studio-editing-column">
            <section
              className="island-panel min-w-0"
              aria-label="房源信息与场景"
            >
              <OpeningPanel studio={studio} />
              <ConfigProvider componentDisabled={busy}>
                <fieldset disabled={busy}>
                  <h2 className="mb-5 text-xl leading-[30px] font-semibold text-ink">
                    01 / 房源信息与照片
                  </h2>
                  <div className="grid grid-cols-2 gap-x-3 gap-y-6">
                    {PROPERTY_FIELDS.map((field) => (
                      <label
                        key={field.key}
                        className={clsx({
                          'col-span-2': [
                            'name',
                            'location',
                            'contact',
                          ].includes(field.key),
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
                  <FileUpload
                    label="添加房源照片"
                    accept=".jpg,.jpeg,.png,.webp"
                    multiple
                    disabled={busy || project.scenes.length >= 20}
                    onFiles={studio.addPhotos}
                  />
                  <p className="mt-2 text-xs text-muted">
                    JPG / PNG / WebP，每张不超过20MB
                  </p>
                  <div
                    className="mt-4 flex max-h-[520px] flex-col gap-2 overflow-y-auto"
                    aria-label="场景列表"
                  >
                    {project.scenes.map((scene, index) => (
                      <Button
                        key={scene.id}
                        aria-label={`选择场景${index + 1}：${scene.title}`}
                        aria-pressed={selected?.id === scene.id}
                        onClick={() => {
                          studio.setSelectedId(scene.id);
                          player.current?.seekTo(timeline.scenes[index].start);
                        }}
                        className={clsx(
                          'studio-scene-option flex items-center gap-3',
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
                      </Button>
                    ))}
                  </div>
                  <SceneEditor studio={studio} />
                </fieldset>
              </ConfigProvider>
            </section>

            <section
              className="island-panel min-w-0"
              aria-label="运镜与导出设置"
            >
              <ConfigProvider componentDisabled={busy}>
                <fieldset disabled={busy}>
                  <h2 className="mb-5 text-xl leading-[30px] font-semibold text-ink">
                    02 / 运镜、声音与输出设置
                  </h2>
                  {selected && (
                    <div className="space-y-6">
                      <div className="grid grid-cols-2 gap-3">
                        <label>
                          <span className="studio-label">运镜方式</span>
                          <div className="island-select">
                            <Select
                              fieldNames={{ value: 'key', label: 'label' }}
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
                          <InputNumber
                            min={3}
                            max={30}
                            step={0.5}
                            aria-label="场景时长"
                            value={selected.seconds}
                            onChange={(value) => {
                              if (value === null) return;
                              if (value >= 3 && value <= 30)
                                studio.patchScene({
                                  seconds: value,
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
                          >
                            上移
                          </Button>
                          <Button
                            className="island-action"
                            disabled={
                              selectedIndex === project.scenes.length - 1
                            }
                            onClick={() => studio.moveScene(1)}
                            aria-label="场景下移"
                          >
                            下移
                          </Button>
                          <Button
                            className="island-action"
                            onClick={studio.removeScene}
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
                    >
                      生成或更新照片解说配音（Kokoro 免费）
                    </Button>
                    <p className="mt-2 text-xs text-muted">
                      {studio.speechCapability.speechMessage}
                    </p>
                  </div>
                  <div className="mt-6 space-y-6 border-t border-line pt-5">
                    <label className="block">
                      <span className="studio-label">左上角水印</span>
                      <Input
                        aria-label="左上角水印"
                        value={project.watermark}
                        maxLength={20}
                        placeholder="留空不显示水印"
                        onChange={(event) =>
                          studio.setProject({
                            ...project,
                            watermark: event.target.value,
                          })
                        }
                      />
                      <span className="mt-2 block text-xs text-muted">
                        淡珊瑚橙艺术字固定在视频左上角，全片显示；留空关闭，修改后重新生成成片。
                      </span>
                    </label>
                    <label className="block">
                      <span className="studio-label">成片画幅</span>
                      <div className="island-select">
                        <Select
                          fieldNames={{ value: 'key', label: 'label' }}
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
                          fieldNames={{ value: 'key', label: 'label' }}
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
                        <Slider
                          className="w-full accent-primary"
                          min={0.3}
                          max={0.8}
                          step={0.1}
                          ariaLabelForHandle={'淡化时长'}
                          value={project.transitionSeconds}
                          onChange={(value) =>
                            studio.setProject({
                              ...project,
                              transitionSeconds: value,
                            })
                          }
                        />
                      </label>
                    )}
                    <Checkbox.Group
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
                      <MusicPicker
                        music={project.music}
                        busy={busy}
                        onSelect={studio.selectMusic}
                      />
                      <FileUpload
                        label="上传背景音乐"
                        accept=".wav,.mp3,.m4a,.ogg"
                        disabled={busy}
                        onFiles={(files) => studio.addAudio(files[0], false)}
                      />
                      {project.music && (
                        <>
                          <div className="mt-2 flex items-center justify-between gap-2 text-xs">
                            <span className="truncate">
                              {project.music.name}
                            </span>
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
                          <Button
                            className="island-action mt-3"
                            onClick={() =>
                              studio.setProject({
                                ...project,
                                musicVolume: EMPTY_PROJECT.musicVolume,
                              })
                            }
                          >
                            推荐配乐（
                            {Math.round(EMPTY_PROJECT.musicVolume * 100)}%）
                          </Button>
                          <label className="mt-3 block">
                            <span className="studio-label">
                              背景音量 · {Math.round(project.musicVolume * 100)}
                              %
                            </span>
                            <Slider
                              min={0}
                              max={0.5}
                              step={0.01}
                              className="w-full accent-primary"
                              ariaLabelForHandle={'背景音量'}
                              value={project.musicVolume}
                              onChange={(value) =>
                                studio.setProject({
                                  ...project,
                                  musicVolume: value,
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
                      >
                        导出配置
                      </Button>
                      <FileUpload
                        label="导入配置"
                        accept=".json"
                        disabled={busy}
                        onFiles={(files) => studio.importProject(files[0])}
                      />
                    </div>
                  </div>
                </fieldset>
              </ConfigProvider>
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
                  <Progress
                    className="mt-3 h-2 w-full accent-primary"
                    percent={job.progress * 100}
                    showInfo={false}
                    aria-label="视频导出进度"
                  />
                  {job.output && (
                    <>
                      <video
                        className="mt-4 max-h-64 w-full rounded-lg bg-stage"
                        src={job.output}
                        controls
                      />
                      <Button
                        className="studio-primary mt-3 w-full"
                        href={job.output}
                        download="房源探盘视频.mp4"
                      >
                        下载视频
                      </Button>
                    </>
                  )}
                </div>
              )}
            </section>
          </div>
          <section
            className="island-panel studio-preview-column"
            aria-label="视频预览"
          >
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-xl leading-[30px] font-semibold text-ink">
                实时预览
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
                'min-h-[300px]',
                'p-5',
                'rounded-xl bg-stage',
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
                        ? 'min(100%, 260px)'
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
            {project.demo && (
              <p className="mt-4 text-xs text-muted">
                当前为演示房源；照片来自不同空间，房源参数为虚构示例。制作真实带看时请替换照片和信息。
              </p>
            )}
          </section>
        </div>
      </main>
      <div className="studio-export-bar" aria-label="生成与下载">
        <div className="studio-export-summary">
          <strong>{busy ? '正在处理，请稍候' : '照片成片'}</strong>
          <span>
            {studio.upload.message ||
              (staleSpeech
                ? '解说已修改，请先更新配音'
                : `${project.scenes.length}张照片 · ${(timeline.frames / FPS).toFixed(1)}秒`)}
          </span>
        </div>
        <div className="studio-export-actions">
          {(studio.upload.active || studio.upload.cancelling) && (
            <Button
              className="island-action"
              disabled={studio.upload.cancelling}
              onClick={studio.upload.cancelUpload}
            >
              {studio.upload.cancelling ? '正在取消…' : '取消上传与处理'}
            </Button>
          )}
          {job?.status === JobStatus.Complete && job.output && (
            <Button className="studio-button" href={job.output} download>
              下载 MP4
            </Button>
          )}
          <Button
            className="island-action"
            type="primary"
            disabled={!canExport}
            onClick={studio.exportVideo}
          >
            {job?.output ? '重新生成成片' : '生成成片（免费）'}
          </Button>
        </div>
      </div>
    </div>
  );
}
