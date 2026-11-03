/** Cover sources share the existing property lettering, local image upload and saved-project timing. */
import { Select, InputNumber } from './common';
import { VideoTemplate } from '@/services/definition/project';

import {
  COVER_SOURCE_MAP,
  CoverSource,
} from '@/services/definition/video-edit';

import { FileUpload } from './file-upload';
import type { useVideoEdit } from './use-video-edit';

/** The default uses the first house photo or video's actual first frame, never an approximate poster. */
export function CoverSettings({
  editor,
}: {
  editor: ReturnType<typeof useVideoEdit>;
}) {
  const { project, busy } = editor;
  return (
    <section className="space-y-6 pt-4" aria-label="封面底图与展示时长">
      <div className="island-select">
        <span
          className="mb-2 block text-body font-medium"
          id="cover-source-label"
        >
          封面底图来源
        </span>
        <Select
          fieldNames={{ value: 'key', label: 'label' }}
          aria-labelledby="cover-source-label"
          aria-label="封面底图来源"
          value={project.coverSource}
          options={Object.values(CoverSource).map((key) => ({
            key,
            label: COVER_SOURCE_MAP[key],
          }))}
          disabled={busy}
          onChange={(value) =>
            editor.patch({ coverSource: value as CoverSource })
          }
        />
        <p className="mt-2 text-xs text-muted">
          {project.videoTemplate === VideoTemplate.Editorial
            ? '杂志留白默认取口播开场视频第一帧，文字位于画面上半部，下面留出人物画面；仍可手动更换底图。'
            : '经典实拍默认使用首份房屋素材：视频取第一帧，照片直接使用。'}
          点击模板会应用其默认底图来源，仍可在当前模板手动更改；再次点击已选模板可恢复默认来源。底图居中裁切，预览、视频开头与导出封面一致。
        </p>
      </div>
      {project.coverSource === CoverSource.Image && (
        <div>
          <FileUpload
            label={project.coverImage ? '更换封面底图' : '上传封面底图'}
            accept=".jpg,.jpeg,.png,.webp"
            disabled={busy}
            onFiles={(files) => editor.uploadCoverImage(files[0])}
          />
          <p className="mt-2 text-xs text-muted">
            JPG / PNG / WebP，20MB内，仅在本机处理。更换失败保留已有底图。
          </p>
          {!project.coverImage && (
            <p role="alert" className="mt-2 text-xs text-danger">
              请先上传底图，或切换为视频第一帧。
            </p>
          )}
          {project.coverImage && (
            <img
              src={project.coverImage}
              alt="已上传封面底图"
              className="mt-4 h-28 w-20 rounded-lg object-cover"
            />
          )}
        </div>
      )}
      <label className="block max-w-xs">
        <span className="mb-2 block text-body font-medium">
          封面展示时长 / 秒
        </span>
        <InputNumber
          min={0.5}
          max={10}
          step={0.1}
          aria-label="封面展示时长"
          value={project.coverSeconds}
          onChange={(value) => {
            if (value === null) return;
            if (Number.isFinite(value)) editor.patch({ coverSeconds: value });
          }}
        />
        <span className="mt-2 block text-xs text-muted">
          0.5～10秒，随后完整播放原视频。保存草稿后保留来源和时长设置。
        </span>
      </label>
    </section>
  );
}
