/** Cover sources share the existing property lettering, local image upload and saved-project timing. */
import { Input, Select } from 'animal-island-ui';
import { UploadIcon as Upload } from 'naive-icons';

import {
  COVER_SOURCE_MAP,
  CoverSource,
} from '@/services/definition/video-edit';

import type { useVideoEdit } from './use-video-edit';

/** The default uses the opening's actual first frame; no approximate poster or silent fallback is used. */
export function CoverSettings({
  editor,
}: {
  editor: ReturnType<typeof useVideoEdit>;
}) {
  const { project, busy } = editor;
  return (
    <section
      className="mt-7 space-y-5 border-t border-line pt-5"
      aria-label="封面底图与展示时长"
    >
      <h3 className="text-lg leading-7 font-medium text-ink">封面底图与时长</h3>
      <div className="island-select">
        <span className="studio-label" id="cover-source-label">
          封面底图来源
        </span>
        <Select
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
          默认使用口播开场视频第一帧。底图居中裁切，保留现有艺术字；预览、视频开头与导出封面一致。
        </p>
      </div>
      {project.coverSource === CoverSource.Image && (
        <div>
          <label className="studio-button">
            <Upload size={16} />
            {project.coverImage ? '更换封面底图' : '上传封面底图'}
            <input
              className="hidden"
              type="file"
              accept=".jpg,.jpeg,.png,.webp"
              aria-label="上传封面底图"
              disabled={busy}
              onChange={(event) => {
                editor.uploadCoverImage(event.target.files?.[0]);
                event.target.value = '';
              }}
            />
          </label>
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
        <span className="studio-label">封面展示时长 / 秒</span>
        <Input
          type="number"
          min={0.5}
          max={10}
          step={0.1}
          aria-label="封面展示时长"
          value={project.coverSeconds}
          onChange={(event) => {
            if (Number.isFinite(event.target.valueAsNumber))
              editor.patch({ coverSeconds: event.target.valueAsNumber });
          }}
        />
        <span className="mt-2 block text-xs text-muted">
          0.5～10秒，随后完整播放原视频。保存草稿后保留来源和时长设置。
        </span>
      </label>
    </section>
  );
}
