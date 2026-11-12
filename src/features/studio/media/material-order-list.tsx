/** Ordered house media supports handle dragging and explicit buttons for keyboard and assistive access. */
import { Button, cn } from '../../../share/ui';
import { HolderOutlined } from '@ant-design/icons';
import { useId } from 'react';

import { HouseMediaKind } from '@/services/definition/video-edit';

import { useMaterialSort } from './use-material-sort';
import { FileUpload } from './file-upload';
import { UploadedVideoPreview } from '../video/uploaded-video-preview';
import type { useVideoEdit } from '../video/use-video-edit';

/** Keep the recorded opening fixed; house materials and their matching shots move as one group. */
export function MaterialOrderList({
  editor,
}: {
  editor: ReturnType<typeof useVideoEdit>;
}) {
  const sort = useMaterialSort(editor);
  const hint = useId();
  const { materials, busy } = editor;
  if (!materials.length) return null;
  return (
    <div className="mt-4">
      <p id={hint} className="mb-3 text-xs text-muted">
        拖手柄排序，也可用上下方向键调整
      </p>
      <ol
        ref={sort.list}
        className="grid list-none gap-4 p-0"
        aria-label="房屋素材顺序"
      >
        {materials.map((source, index) => {
          const image = source.kind === HouseMediaKind.Image;
          const name = image ? source.name : source.video.name;
          const dragging = sort.drag?.id === source.id;
          const target = sort.drag && !dragging && sort.drag.target === index;
          return (
            <li
              key={source.id}
              data-material-id={source.id}
              className={cn(
                'relative min-w-0 rounded border-t border-line py-4',
                {
                  'bg-panel opacity-65': dragging,
                  'outline-2 outline-dashed outline-primary outline-offset-4':
                    target,
                },
              )}
            >
              <div className="flex min-w-0 items-center gap-3">
                <Button
                  className="!cursor-grab touch-none select-none !text-muted active:!cursor-grabbing [&_.anticon]:text-heading-4"
                  type="text"
                  size="small"
                  icon={<HolderOutlined aria-hidden="true" />}
                  aria-label={`拖动排序素材${index + 1}`}
                  aria-describedby={hint}
                  disabled={busy || materials.length < 2}
                  onPointerDown={(event) => sort.startDrag(event, index)}
                  onPointerMove={sort.moveDrag}
                  onPointerUp={() => sort.finishDrag(true)}
                  onPointerCancel={() => sort.finishDrag(false)}
                  onLostPointerCapture={() => sort.finishDrag(false)}
                  onKeyDown={(event) => {
                    if (event.key === 'Escape') sort.finishDrag(false);
                    if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
                      event.preventDefault();
                      sort.moveWithKeyboard(
                        index,
                        event.key === 'ArrowUp' ? -1 : 1,
                      );
                    }
                  }}
                />
                {image && (
                  <img
                    src={source.src}
                    alt={`房屋素材${index + 1}`}
                    className="h-20 w-14 shrink-0 rounded-lg object-cover"
                    draggable={false}
                  />
                )}
                {!image && (
                  <UploadedVideoPreview
                    key={source.video.src}
                    video={source.video}
                    label={`房屋视频${index + 1}`}
                    disabled={busy || Boolean(sort.drag)}
                  />
                )}
                <p className="min-w-0 text-sm break-words text-content">
                  {index + 1}. {name}
                  <span className="block text-xs text-muted">
                    {image
                      ? '照片'
                      : `视频 · ${source.video.duration.toFixed(1)}秒`}
                  </span>
                </p>
              </div>
              {target && (
                <p
                  className={cn(
                    'absolute -top-3 right-2 rounded bg-primary px-2 py-0.5',
                    'text-caption text-white',
                  )}
                >
                  松开移到第{index + 1}位
                </p>
              )}
              <div className="mt-3 flex flex-wrap items-center justify-end gap-3">
                <FileUpload
                  compact
                  label={`替换素材${index + 1}`}
                  accept={image ? '.jpg,.jpeg,.png,.webp' : '.mp4,.mov'}
                  disabled={busy || Boolean(sort.drag)}
                  onFiles={(files) =>
                    editor.replaceMaterial(source.id, files[0])
                  }
                />
                <Button
                  aria-label={`移除素材${index + 1}`}
                  disabled={busy || Boolean(sort.drag)}
                  onClick={() => editor.removeMaterial(source.id)}
                >
                  移除
                </Button>
              </div>
            </li>
          );
        })}
      </ol>
      <p className="sr-only" role="status" aria-live="polite">
        {sort.announcement}
      </p>
    </div>
  );
}
