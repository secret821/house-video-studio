import { Collapse, ConfigProvider } from 'antd';
/** The default intake pairs one recorded introduction with an ordered collection of house clips and photos. */

import { VideoRole } from '@/services/definition/video-edit';

import { FileUpload } from './file-upload';
import { MaterialOrderList } from './material-order-list';
import type { useVideoEdit } from './use-video-edit';

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
        className="studio-material-grid"
        aria-label="口播开场与房屋素材"
      >
        <section
          className="studio-material-card min-w-0"
          aria-label="口播开场上传"
        >
          <h2 className="text-xl leading-[30px] font-semibold text-ink">
            人物口播开场
          </h2>
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
            <div className="mt-4 flex min-w-0 items-center gap-3">
              <img
                className="h-24 w-16 shrink-0 rounded-lg object-cover"
                src={project.opening.poster}
                alt="口播开场缩略图"
              />
              <p className="min-w-0 text-sm break-words text-body">
                {project.opening.name} · {project.opening.duration.toFixed(1)}秒
              </p>
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
          <h2 className="text-xl leading-[30px] font-semibold text-ink">
            房屋实拍素材
          </h2>
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
