/** Optional appearance and mixing controls stay collapsed until requested. */
import {
  Button,
  Input,
  Select,
  Slider,
  Collapse,
  ConfigProvider,
  Flex,
} from '../../../share/ui';
import { SoundOutlined, CloseOutlined } from '@ant-design/icons';
import {
  VideoTemplate,
  VIDEO_TEMPLATE_MAP,
} from '@/services/definition/project';

import { MusicPicker } from '../media/music-picker';
import {
  EMPTY_VIDEO_EDIT,
  CoverSource,
} from '@/services/definition/video-edit';

import { FileUpload } from '../media/file-upload';
import { CoverSettings } from '../photo/cover-settings';
import { StudioSectionHeading } from '../shell/studio-section-heading';
import type { useVideoEdit } from './use-video-edit';

const VOLUMES = [
  { key: 'openingVolume', label: '开场原声', max: 1.5 },
  { key: 'houseVolume', label: '房屋原声讲解', max: 1 },
  { key: 'musicVolume', label: '背景音乐', max: 0.6 },
] as const;

/** Existing defaults remain effective even when the optional controls are closed. */
export function VideoEditSettings({
  editor,
}: {
  editor: ReturnType<typeof useVideoEdit>;
}) {
  const { project, busy } = editor;
  return (
    <section
      id="studio-settings"
      className="island-panel studio-section"
      aria-label="封面与声音设置"
    >
      <StudioSectionHeading
        step="03"
        title="封面与声音"
        description={<>封面来源与样式独立选择 · 原声保留 · 轻配乐</>}
      />
      <ConfigProvider componentDisabled={busy}>
        <fieldset disabled={busy}>
          <label className="mb-6 block">
            <span className="mb-2 block text-body font-medium">左上角水印</span>
            <Input
              aria-label="左上角水印"
              value={project.watermark}
              maxLength={20}
              placeholder="留空不显示水印"
              onChange={(event) =>
                editor.patch({ watermark: event.target.value })
              }
            />
            <span className="mt-2 block text-xs text-muted">
              淡珊瑚橙艺术字固定在视频左上角，全片显示；留空关闭，修改后重新生成成片。
            </span>
          </label>
          <Collapse
            className="studio-disclosure !mt-0"
            ghost
            expandIconPlacement="end"
            activeKey={
              project.coverSource === CoverSource.Image && !project.coverImage
                ? ['panel']
                : undefined
            }
            items={[
              {
                key: 'panel',
                label: <>自定义底图与展示时长</>,
                forceRender: true,
                children: (
                  <>
                    <CoverSettings editor={editor} />
                  </>
                ),
              },
            ]}
          />
          <Collapse
            className="studio-disclosure"
            ghost
            expandIconPlacement="end"
            items={[
              {
                key: 'panel',
                label: <>片内样式、音乐、原声音量与转场</>,
                forceRender: true,
                children: (
                  <>
                    <div className="flex flex-col gap-6 pt-4">
                      <div className="island-select">
                        <span
                          className="mb-2 block text-body font-medium"
                          id="film-template-label"
                        >
                          片内文字与片尾样式
                        </span>
                        <Select
                          fieldNames={{ value: 'key', label: 'label' }}
                          aria-labelledby="film-template-label"
                          value={project.videoTemplate}
                          options={Object.values(VideoTemplate).map((key) => ({
                            key,
                            label: VIDEO_TEMPLATE_MAP[key].name,
                          }))}
                          onChange={(value) =>
                            editor.selectTemplate(value as VideoTemplate)
                          }
                        />
                        <p className="mt-2 text-xs text-muted">
                          只改变正片文字与片尾，不改变封面来源或封面样式。
                        </p>
                      </div>
                      <MusicPicker
                        music={project.music}
                        busy={busy}
                        onSelect={editor.selectMusic}
                      />
                      <div className="grid gap-4">
                        <FileUpload
                          label="上传背景音乐"
                          accept=".wav,.mp3,.m4a,.ogg"
                          disabled={busy}
                          onFiles={(files) => editor.uploadMusic(files[0])}
                        />
                        {project.music && (
                          <Flex wrap align="center" gap={12}>
                            <Button
                              icon={<SoundOutlined />}
                              onClick={() =>
                                editor.patch({
                                  musicVolume: EMPTY_VIDEO_EDIT.musicVolume,
                                })
                              }
                            >
                              推荐音量（
                              {Math.round(EMPTY_VIDEO_EDIT.musicVolume * 100)}
                              %）
                            </Button>
                            <Button
                              icon={<CloseOutlined />}
                              onClick={() => editor.patch({ music: null })}
                            >
                              关闭音乐
                            </Button>
                          </Flex>
                        )}
                      </div>
                      {project.music && (
                        <div>
                          <p className="mb-2 text-xs text-muted">
                            {project.music.name} · 全片铺底，首尾自动淡化。
                            推荐配乐只调整音乐音量，保留原声讲解设置。
                          </p>
                        </div>
                      )}
                      {VOLUMES.map((field) => (
                        <label key={field.key} className="block">
                          <span className="mb-2 block text-body font-medium">
                            {field.label} ·{' '}
                            {Math.round(project[field.key] * 100)}%
                          </span>
                          <Slider
                            min={0}
                            max={field.max}
                            step={0.01}
                            value={project[field.key]}
                            className="w-full accent-primary"
                            ariaLabelForHandle={field.label}
                            onChange={(value) =>
                              editor.patch({
                                [field.key]: value,
                              })
                            }
                          />
                        </label>
                      ))}
                      <label className="block">
                        <span className="mb-2 block text-body font-medium">
                          柔和淡化转场
                        </span>
                        <div className="island-select">
                          <Select
                            fieldNames={{ value: 'key', label: 'label' }}
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
                        原声开启时，转场只淡化画面，人声顺次播放。音乐建议先用
                        {Math.round(EMPTY_VIDEO_EDIT.musicVolume * 100)}
                        %，再按成片混音听感调整。内置音乐由本机合成。
                      </p>
                    </div>
                  </>
                ),
              },
            ]}
          />
        </fieldset>
      </ConfigProvider>
    </section>
  );
}
