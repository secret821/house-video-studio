/** Uploaded sources are played on demand; preview never changes the editing timeline or original audio. */
import { PlayCircleOutlined } from '@ant-design/icons';
import { useState } from 'react';

import type { ImportedVideo } from '@/services/definition/video-edit';

import { Alert, Button, Modal, cn } from '../../../share/ui';

/** Bind the dialog to its source so replacement/removal cannot keep an obsolete video playing. */
export function UploadedVideoPreview({
  video,
  label,
  disabled = false,
}: {
  video: ImportedVideo;
  label: string;
  disabled?: boolean;
}) {
  const [previewSrc, setPreviewSrc] = useState<string | null>(null);
  const [unavailable, setUnavailable] = useState(false);
  const open = previewSrc === video.src;
  return (
    <>
      <Button
        type="text"
        className={cn(
          '!h-24 !min-h-0 !w-16 !shrink-0',
          '!overflow-hidden !rounded !p-0',
        )}
        aria-label={`预览${label}：${video.name}`}
        disabled={disabled}
        onClick={() => {
          setUnavailable(false);
          setPreviewSrc(video.src);
        }}
      >
        <span className="relative block h-24 w-16 bg-[#222]">
          <img
            className="h-full w-full object-cover"
            src={video.poster}
            alt=""
            draggable={false}
          />
          <span
            className={cn(
              'absolute inset-0 flex flex-col items-center justify-center gap-0.5',
              'bg-black/35 text-heading-2 text-white',
            )}
          >
            <PlayCircleOutlined aria-hidden="true" />
            <span className="text-caption">预览</span>
          </span>
        </span>
      </Button>
      <Modal
        title={`${label}预览`}
        open={open}
        onCancel={() => setPreviewSrc(null)}
        footer={null}
        width={680}
        centered
        destroyOnHidden
        className="studio-ui"
        classNames={{
          body: 'max-h-[min(650px,calc(100dvh-160px))] overflow-y-auto',
        }}
      >
        {open && (
          <>
            <video
              key={video.src}
              className="block max-h-[min(60dvh,520px)] w-full bg-black object-contain"
              src={video.src}
              poster={video.poster}
              aria-label={`${label}原片播放器`}
              controls
              autoPlay
              playsInline
              preload="metadata"
              onError={() => setUnavailable(true)}
            />
            <p className="mt-3 break-words text-body text-content">
              {video.name} · {video.duration.toFixed(1)}秒
            </p>
            {unavailable && (
              <Alert
                className="mt-3"
                type="warning"
                showIcon
                title="原片暂时无法播放"
                description="素材可能已过期，或当前浏览器不支持该视频编码。可重新上传；编码不兼容的原片仍可生成成片后播放。"
              />
            )}
          </>
        )}
      </Modal>
    </>
  );
}
