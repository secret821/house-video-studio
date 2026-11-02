/** Shared status sits outside disabled editor fieldsets so cancellation remains accessible. */
import type { useVideoUpload } from './use-video-upload';

export function VideoUploadStatus({
  upload,
}: {
  upload: ReturnType<typeof useVideoUpload>;
}) {
  return (
    <>
      {upload.temporaryMedia && (
        <p className="mb-4 text-sm text-muted">
          草稿仅保存在当前浏览器。素材和成片最后使用2小时后清理，服务重启即清空，请及时下载；过期后需重新上传。
        </p>
      )}
      {upload.active && (
        <div role="status" className="island-panel mb-4">
          <p className="text-sm break-all text-body">{upload.message}</p>
          <p className="mt-2 text-xs text-muted">
            超过15分钟自动终止。可用底部“取消上传与处理”停止当前任务；已保存的素材保留。
          </p>
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
