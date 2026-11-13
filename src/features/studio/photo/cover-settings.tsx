/** Cover sources share the existing property lettering, local image upload and saved-project timing. */
import { Button, InputNumber } from '../../../share/ui';

import { CoverSource } from '@/services/definition/video-edit';

import { FileUpload } from '../media/file-upload';
import type { useVideoEdit } from '../video/use-video-edit';

/** The default uses the first house photo or video's actual first frame, never an approximate poster. */
export function CoverSettings({
  editor,
}: {
  editor: ReturnType<typeof useVideoEdit>;
}) {
  const { project, busy } = editor;
  return (
    <section className="space-y-6 pt-4" aria-label="封面底图与展示时长">
      <div>
        <FileUpload
          label={
            project.coverImage ? '更换自定义封面底图' : '上传自定义封面底图'
          }
          accept=".jpg,.jpeg,.png,.webp"
          disabled={busy}
          onFiles={(files) => editor.uploadCoverImage(files[0])}
        />
        <p className="mt-2 text-xs text-muted">
          上传后使用自定义底图，不改变封面样式；点击“更改封面”可切回口播或房屋素材。JPG
          / PNG / WebP，20MB内。
        </p>
        {project.coverSource === CoverSource.Image && !project.coverImage && (
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
        {project.coverImage && project.coverSource !== CoverSource.Image && (
          <Button
            className="mt-3"
            disabled={busy}
            onClick={() => editor.patch({ coverSource: CoverSource.Image })}
          >
            使用已上传底图
          </Button>
        )}
      </div>
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
