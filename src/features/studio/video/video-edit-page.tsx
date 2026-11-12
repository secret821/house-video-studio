'use client';

/** Two-video workspace: original talking opening plus a locally scored, captioned property tour. */
import {
  Button,
  Input,
  Collapse,
  InputNumber,
  ConfigProvider,
  Modal,
  ButtonAppearance,
  cn,
} from '../../../share/ui';
import { useState } from 'react';
import {
  DeleteOutlined,
  DownloadOutlined,
  EyeOutlined,
  VideoCameraOutlined,
} from '@ant-design/icons';

import {
  FPS,
  JobStatus,
  VideoTemplate,
  VIDEO_TEMPLATE_MAP,
} from '../../../services/definition/project';
import { getVideoEditTimeline } from '../../../video/video-edit-timeline';

import { CopyKind } from '../../../services/definition/copy';
import {
  HouseMediaKind,
  getShotMaterial,
} from '../../../services/definition/video-edit';

import { VideoUploadStatus } from './video-upload-status';
import { useVideoEdit } from './use-video-edit';
import { CopyGenerator } from '../photo/copy-generator';
import { PropertyTextImport } from '../photo/property-text-import';
import { HouseMaterials } from '../photo/house-materials';
import { SmartCleanPanel } from './smart-clean-panel';
import { StudioHeader } from '../shell/studio-header';
import { StudioNavigation } from '../shell/studio-navigation';
import { StudioSectionHeading } from '../shell/studio-section-heading';
import { VideoEditPreview } from './video-edit-preview';
import { VideoEditSettings } from './video-edit-settings';
import { SpeechSubtitlesPanel } from './speech-subtitles-panel';
import { VideoTemplatePicker } from './video-template-picker';

const FIELDS = [
  { key: 'name', label: '小区 / 片名', max: 32 },
  { key: 'facts', label: '楼层 / 面积 / 装修', max: 60 },
  { key: 'price', label: '房源总价', max: 20 },
  { key: 'extra', label: '附加信息', max: 40 },
] as const;
/** Keep local timing/sound separate from the optional, explicitly requested cloud copy suggestions. */
export function VideoEditPage() {
  const editor = useVideoEdit();
  const [previewOpen, setPreviewOpen] = useState(false);
  const [confirmExportOpen, setConfirmExportOpen] = useState(false);
  const { project, job, busy, ready, notice } = editor;
  const generatedTemplate =
    VIDEO_TEMPLATE_MAP[job?.videoTemplate ?? VideoTemplate.Classic].name;
  const timeline = getVideoEditTimeline(project);
  const canExport = ready && !busy;
  const includedMaterialIds = new Set(
    project.shots.map((shot) => getShotMaterial(editor.materials, shot)?.id),
  );
  const includedMaterials = editor.materials.filter((source) =>
    includedMaterialIds.has(source.id),
  );
  const houseVideoCount = includedMaterials.filter(
    (source) => source.kind === HouseMediaKind.Video,
  ).length;
  const housePhotoCount = includedMaterials.length - houseVideoCount;
  let missingInputMessage = '添加口播与房屋素材后即可生成';
  if (!project.opening) missingInputMessage = '缺少口播开场，请上传后生成';
  else if (!editor.materials.length)
    missingInputMessage = '缺少房屋视频或照片，请上传后生成';
  else if (!project.shots.length)
    missingInputMessage = '缺少房屋片段，请重新分段后生成';
  function confirmExport() {
    if (!canExport) return;
    setConfirmExportOpen(false);
    editor.exportVideo();
  }
  return (
    <div key={project.sessionId} className="studio-ui min-h-screen bg-page">
      <StudioHeader
        draftStatus={editor.draftStatus}
        busy={busy}
        saveDisabled={Boolean(editor.inputError)}
        actions={{ save: editor.save, newProject: editor.newProject }}
      />
      <main
        className={cn(
          'mx-auto w-full max-w-[1440px] px-6 pt-6 pb-[136px]',
          'max-[800px]:px-4 max-[800px]:pt-4 max-[800px]:pb-[calc(208px+env(safe-area-inset-bottom))]',
        )}
      >
        <h1 className="sr-only">房源视频制作</h1>
        <VideoTemplatePicker
          value={project.videoTemplate}
          coverStyle={project.coverStyle}
          onCoverStyleChange={(coverStyle) => editor.patch({ coverStyle })}
          disabled={busy}
          onChange={editor.selectTemplate}
          showCoverSource
        />
        <StudioNavigation onPreview={() => setPreviewOpen(true)} />
        {(editor.work || notice.text) && (
          <div
            role={notice.error ? 'alert' : 'status'}
            className={cn(
              'mb-6 break-words rounded border border-line bg-panel px-4 py-3',
              { 'text-danger': notice.error },
            )}
          >
            {editor.work ?? notice.text}
          </div>
        )}
        <VideoUploadStatus upload={editor.upload} />
        <div
          className={cn(
            'grid grid-cols-[minmax(0,1fr)_336px] items-start gap-6',
            'max-[1150px]:grid-cols-[minmax(0,1fr)_304px]',
            'max-[800px]:grid-cols-1',
          )}
        >
          <div className="grid min-w-0 gap-6 max-[800px]:gap-4">
            <section
              id="studio-materials"
              className="island-panel studio-section"
              aria-labelledby="materials-title"
            >
              <StudioSectionHeading
                step="01"
                title="上传素材"
                id="materials-title"
              />
              <HouseMaterials editor={editor} />
              <SmartCleanPanel editor={editor} />
            </section>
            <section
              id="studio-copy"
              className="island-panel studio-section"
              aria-label="房源信息与文案"
            >
              <StudioSectionHeading step="02" title="写下房源亮点" />
              <SpeechSubtitlesPanel editor={editor} />
              <ConfigProvider componentDisabled={busy}>
                <fieldset
                  disabled={busy}
                  className="mt-6 min-w-0 border-t border-line pt-6"
                >
                  <PropertyTextImport
                    disabled={busy}
                    onApply={editor.patch}
                    draft={{
                      source: project.sourceText ?? '',
                      fields: project.propertyFields ?? null,
                      onChange: editor.patch,
                    }}
                  />
                  <div className="mt-5 grid gap-6 sm:grid-cols-2">
                    {FIELDS.map((field) => (
                      <label key={field.key} className="min-w-0">
                        <span className="mb-2 block text-body font-medium">
                          {field.label}
                        </span>
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

                  <Collapse
                    className="studio-disclosure"
                    ghost
                    expandIconPlacement="end"
                    items={[
                      {
                        key: 'panel',
                        label: <>片尾联系引导</>,
                        forceRender: true,
                        children: (
                          <>
                            <label className="mt-4 block">
                              <span className="mb-2 block text-body font-medium">
                                片尾联系引导
                              </span>
                              <Input
                                aria-label="片尾联系引导"
                                value={project.contact}
                                maxLength={50}
                                onChange={(event) =>
                                  editor.patch({ contact: event.target.value })
                                }
                              />
                            </label>
                          </>
                        ),
                      },
                    ]}
                  />

                  <Collapse
                    className="studio-disclosure mt-6"
                    ghost
                    expandIconPlacement="end"
                    items={[
                      {
                        key: 'panel',
                        label: (
                          <>逐段字幕与剪辑时间（{project.shots.length} 段）</>
                        ),
                        forceRender: true,
                        children: (
                          <>
                            <div className="mt-7 flex flex-wrap items-center justify-between gap-3">
                              <h3 className="text-lg leading-7 font-medium text-ink">
                                房屋片段 · 逐段配置
                              </h3>
                              <Button
                                disabled={!editor.materials.length}
                                onClick={editor.resetShots}
                              >
                                按素材重新分段
                              </Button>
                            </div>
                            <p className="mt-2 text-xs text-muted">
                              视频时间对应各自原片；照片按展示时长配置。保留讲解时请连续覆盖原片，裁切会同时裁掉对应声音。文案以房源信息为准。
                            </p>
                            {editor.inputError && (
                              <p
                                role="alert"
                                className="mt-3 text-xs text-danger"
                              >
                                {editor.inputError}
                              </p>
                            )}
                            {!project.shots.length && (
                              <p className="mt-5 text-sm text-muted">
                                上传房屋视频或照片后，在这里编辑每份素材的展示时间和字幕。
                              </p>
                            )}
                            {editor.materials.length > 0 &&
                              project.shots.length > 0 && (
                                <Collapse
                                  className="studio-disclosure mt-5"
                                  ghost
                                  expandIconPlacement="end"
                                  items={[
                                    {
                                      key: 'panel',
                                      label: <>按房屋画面生成字幕（可选）</>,
                                      forceRender: true,
                                      children: (
                                        <>
                                          <CopyGenerator
                                            draft={{
                                              brief: project.copyBrief ?? '',
                                              suggestion:
                                                project.copyDraft ?? null,
                                              onChange: editor.patch,
                                            }}
                                            disabled={
                                              busy || Boolean(editor.inputError)
                                            }
                                            input={{
                                              kind: CopyKind.Video,
                                              facts: {
                                                name: project.name,
                                                facts: project.facts,
                                                price: project.price,
                                                extra: project.extra,
                                              },
                                              house: project.house,
                                              materials: editor.materials,
                                              shots: project.shots.map(
                                                (shot) => ({
                                                  id: shot.id,
                                                  sourceId: shot.sourceId,
                                                  start: shot.start,
                                                  end: shot.end,
                                                }),
                                              ),
                                            }}
                                            onApply={(result) =>
                                              editor.patch({
                                                shots: project.shots.map(
                                                  (shot, index) => ({
                                                    ...shot,
                                                    title:
                                                      result.items[index].title,
                                                    text: result.items[index]
                                                      .caption,
                                                  }),
                                                ),
                                              })
                                            }
                                          />
                                        </>
                                      ),
                                    },
                                  ]}
                                />
                              )}
                            <div className="mt-5 space-y-6">
                              {timeline.shots.map(({ shot, source }, index) => (
                                <div
                                  key={shot.id}
                                  className="border-t border-line pt-5"
                                >
                                  <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                                    <h3 className="text-lg leading-7 font-medium text-ink">
                                      片段 {index + 1}
                                    </h3>
                                    <Button
                                      onClick={() => editor.removeShot(shot.id)}
                                      aria-label={`移除片段${index + 1}`}
                                      icon={<DeleteOutlined />}
                                    >
                                      移除
                                    </Button>
                                  </div>
                                  <div className="grid grid-cols-2 gap-3">
                                    {(['start', 'end'] as const).map((key) => (
                                      <label key={key}>
                                        <span className="mb-2 block text-body font-medium">
                                          {key === 'start'
                                            ? '开始 / 秒'
                                            : '结束 / 秒'}
                                        </span>
                                        <InputNumber
                                          min={0}
                                          max={
                                            source?.kind ===
                                            HouseMediaKind.Video
                                              ? source.video.duration
                                              : source?.duration
                                          }
                                          step={0.1}
                                          aria-label={`片段${index + 1}${key === 'start' ? '开始' : '结束'}`}
                                          value={shot[key]}
                                          onChange={(value) => {
                                            if (value === null) return;
                                            if (Number.isFinite(value))
                                              editor.patchShot(shot.id, {
                                                [key]: value,
                                              });
                                          }}
                                        />
                                      </label>
                                    ))}
                                  </div>
                                  <label className="mt-6 block">
                                    <span className="mb-2 block text-body font-medium">
                                      画面主标题
                                    </span>
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
                                    <span className="mb-2 block text-body font-medium">
                                      本段文案 · 仅加画面字幕，不生成配音
                                    </span>
                                    <Input.TextArea
                                      className={cn(
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
                          </>
                        ),
                      },
                    ]}
                  />
                </fieldset>
              </ConfigProvider>
            </section>
            <VideoEditSettings editor={editor} />
          </div>
          {!previewOpen && (
            <VideoEditPreview key={project.sessionId} editor={editor} />
          )}
          {previewOpen && <div aria-hidden="true" />}
        </div>
      </main>
      <Modal
        title="视频预览"
        open={previewOpen}
        onCancel={() => setPreviewOpen(false)}
        footer={null}
        width={480}
        centered
        destroyOnHidden
        className="studio-ui"
        classNames={{
          body: 'max-h-[min(650px,calc(100dvh-160px))] overflow-y-auto',
        }}
      >
        {previewOpen && (
          <VideoEditPreview key={project.sessionId} editor={editor} dialog />
        )}
      </Modal>
      <Modal
        className="studio-ui"
        title="确认生成视频"
        open={confirmExportOpen}
        centered
        width={440}
        okText="确认生成"
        cancelText="返回检查"
        okButtonProps={{ disabled: !canExport }}
        cancelButtonProps={{ autoFocus: true }}
        onCancel={() => setConfirmExportOpen(false)}
        onOk={confirmExport}
      >
        <p>将按封面、口播开场、房屋素材的顺序生成一条视频。请确认本次素材：</p>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-content">
          <li>口播开场：{project.opening?.name ?? '未上传'}</li>
          <li>
            房屋画面：{houseVideoCount} 段视频、{housePhotoCount} 张照片，共
            {project.shots.length} 个片段
          </li>
        </ul>
        <p className="mt-3 text-xs text-muted">
          下载区的旧成片不会随草稿修改；确认后会按当前素材重新生成。
        </p>
      </Modal>
      <div className="studio-export-bar" aria-label="生成与下载">
        <div className="grid min-w-0 gap-1 max-[800px]:w-full">
          <strong className="text-body font-medium max-[800px]:hidden">
            {job?.status === JobStatus.Rendering
              ? '后台生成中，可切换应用'
              : busy
                ? '正在处理，请稍候'
                : '准备生成成片'}
          </strong>
          <span className="break-words text-caption text-muted">
            {editor.upload.message ||
              (busy && (editor.work ?? job?.message ?? '正在准备素材…')) ||
              editor.inputError ||
              (ready
                ? `${editor.materials.length}份素材 · ${(timeline.frames / FPS).toFixed(1)}秒 · 竖屏高清`
                : missingInputMessage)}
          </span>
        </div>
        <div
          className={cn(
            'flex min-w-0 flex-wrap items-center gap-2',
            'max-[800px]:w-full max-[800px]:[&>*:last-child]:flex-[1_0_auto]',
            'max-[540px]:[&>*]:min-w-0',
          )}
        >
          <Button icon={<EyeOutlined />} onClick={() => setPreviewOpen(true)}>
            看预览
          </Button>
          {(editor.upload.active || editor.upload.cancelling) && (
            <Button
              disabled={editor.upload.cancelling}
              onClick={editor.upload.cancelUpload}
            >
              {editor.upload.cancelling ? '正在取消…' : '取消上传与处理'}
            </Button>
          )}
          {job?.status === JobStatus.Complete && job.output && (
            <Button
              href={job.output}
              download={`房源视频-${generatedTemplate}.mp4`}
              title="下载已生成的文件；修改后请重新生成"
              icon={<DownloadOutlined />}
            >
              下载{generatedTemplate} MP4
            </Button>
          )}
          {job?.status === JobStatus.Complete && job.cover && (
            <Button
              className="studio-cover-download"
              icon={<DownloadOutlined />}
              href={job.cover}
              download={`房源封面-${generatedTemplate}.png`}
            >
              下载封面
            </Button>
          )}
          <Button
            appearance={ButtonAppearance.Solid}
            icon={<VideoCameraOutlined />}
            disabled={!canExport}
            onClick={() => setConfirmExportOpen(true)}
          >
            {job?.output ? '重新生成成片' : '生成成片（免费）'}
          </Button>
        </div>
      </div>
    </div>
  );
}
