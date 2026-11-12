import { Button, Collapse, ConfigProvider, cn } from '../../../share/ui';
/** The default intake pairs one recorded introduction with an ordered collection of house clips and photos. */

import { VideoRole } from '@/services/definition/video-edit';

import { FileUpload } from '../media/file-upload';
import { MaterialOrderList } from '../media/material-order-list';
import { UploadedVideoPreview } from '../video/uploaded-video-preview';
import type { useVideoEdit } from '../video/use-video-edit';

/** Inputs remain visible for an empty project; adding more files never replaces previous house media. */
export function HouseMaterials({
  editor,
}: {
  editor: ReturnType<typeof useVideoEdit>;
}) {
  const { project, busy } = editor;
  return (
    <ConfigProvider componentDisabled={busy}>
      <fieldset
        disabled={busy}
        className={cn(
          'grid grid-cols-2 gap-6 max-[1150px]:grid-cols-1',
          'max-[800px]:grid-cols-2 max-[800px]:gap-4 max-[540px]:grid-cols-1',
        )}
        aria-label="口播开场与房屋素材"
      >
        <section
          className="studio-material-card min-w-0"
          aria-label="口播开场上传"
        >
          <h2 className="text-heading-4 font-medium text-ink">人物口播开场</h2>
          <div className="mt-4">
            <FileUpload
              label={project.opening ? '更换口播视频' : '上传口播视频'}
              accept=".mp4,.mov"
              disabled={busy}
              onFiles={(files) =>
                editor.uploadVideo(files[0], VideoRole.Opening)
              }
            />
          </div>
          {project.opening && (
            <div className="mt-4 min-w-0">
              <div className="flex min-w-0 items-center gap-3">
                <UploadedVideoPreview
                  key={project.opening.src}
                  video={project.opening}
                  label="口播开场"
                  disabled={busy}
                />
                <p className="min-w-0 break-words text-caption text-content">
                  {project.opening.name} · {project.opening.duration.toFixed(1)}
                  秒
                </p>
              </div>
              <Button
                className="mt-3"
                disabled={busy}
                onClick={editor.removeOpening}
              >
                移除口播视频
              </Button>
            </div>
          )}
          <Collapse
            className="studio-upload-help"
            ghost
            expandIconPlacement="end"
            items={[
              {
                key: 'panel',
                label: <>口播上传要求</>,
                forceRender: true,
                children: (
                  <>
                    <p>MP4 / MOV，1GB内，最长10分钟。原片上传后保留原声。</p>
                  </>
                ),
              },
            ]}
          />
        </section>
        <section
          className="studio-material-card min-w-0"
          aria-label="房屋视频与照片上传"
        >
          <h2 className="text-heading-4 font-medium text-ink">房屋实拍素材</h2>
          <div className="mt-4">
            <FileUpload
              label="添加房屋视频 / 照片"
              accept=".mp4,.mov,.jpg,.jpeg,.png,.webp"
              multiple
              disabled={busy}
              onFiles={editor.addHouseMedia}
            />
          </div>
          <Collapse
            className="studio-upload-help"
            ghost
            expandIconPlacement="end"
            items={[
              {
                key: 'panel',
                label: <>支持格式与素材数量</>,
                forceRender: true,
                children: (
                  <>
                    <p>
                      最多12份。视频支持MP4 / MOV，1GB内且至少2秒；照片支持JPG /
                      PNG /
                      WebP，20MB内，默认展示5秒，可在逐段配置调整至30秒。部分手机原片不能直接预览，可生成成片后播放。
                    </p>
                  </>
                ),
              },
            ]}
          />
          <MaterialOrderList editor={editor} />
        </section>
      </fieldset>
    </ConfigProvider>
  );
}
