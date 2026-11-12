/** Shared status sits outside disabled editor fieldsets so cancellation remains accessible. */
import type { useVideoUpload } from './use-video-upload';
import { Button } from '../../../share/ui';

export function VideoUploadStatus({
  upload,
}: {
  upload: ReturnType<typeof useVideoUpload>;
}) {
  return (
    <>
      {upload.active && (
        <div role="status" className="island-panel mb-4">
          <p className="text-sm break-all text-content">{upload.message}</p>
          <p className="mt-2 text-xs text-muted">
            超过15分钟自动终止。可终止后重新选择视频；替换成功前保留原素材。
          </p>
          <Button
            className="mt-3"
            disabled={upload.cancelling}
            onClick={upload.cancelUpload}
          >
            {upload.cancelling ? '正在终止…' : '终止上传，重新选择'}
          </Button>
        </div>
      )}
      {upload.error && (
        <p role="alert" className="mb-4 text-sm text-danger">
          {upload.error}
        </p>
      )}
    </>
  );
}
