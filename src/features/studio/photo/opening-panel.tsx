/** Recorded presenter videos are uploaded locally and played before the photo tour with their original audio. */
import { Button, ConfigProvider, cn } from '../../../share/ui';

import { FileUpload } from '../media/file-upload';
import type { useStudio } from './use-studio';

/** Upload, replacement and removal share the editor's busy state; no generation action is exposed. */
export function OpeningPanel({
  studio,
}: {
  studio: ReturnType<typeof useStudio>;
}) {
  const { project, busy } = studio;
  const clip = project.opening?.clip;
  return (
    <section
      className="mb-7 border-b border-line pb-7"
      aria-label="人物口播开场"
    >
      <h3 className="mb-4 text-base leading-6 font-semibold text-ink">
        人物开场（可选）
      </h3>
      <ConfigProvider componentDisabled={busy}>
        <fieldset disabled={busy} className="space-y-4">
          <FileUpload
            label={clip ? '更换开场视频' : '上传开场视频'}
            accept=".mp4,.mov"
            disabled={busy}
            onFiles={(files) => studio.addOpeningVideo(files[0])}
          />
          <p className="text-xs text-muted">
            MP4 / MOV，1GB以内，最长60秒。仅在本机处理。
          </p>
          {project.opening && (
            <Button className="w-full" onClick={studio.removeOpening}>
              移除人物开场
            </Button>
          )}
        </fieldset>
      </ConfigProvider>
      {clip && (
        <div className="mt-4">
          <video
            className="max-h-80 w-full rounded-lg bg-stage"
            aria-label="人物口播开场预览"
            src={clip.src}
            controls
            playsInline
          />
          <div
            className={cn(
              'flex flex-wrap items-center justify-between gap-2',
              'mt-2',
              'text-xs text-muted',
            )}
          >
            <span>{clip.duration.toFixed(1)}秒 · 原声开场已加入片头</span>
            <a
              className="inline-flex items-center gap-1 text-primary-hover"
              href={clip.src}
              download="talking-opening.mp4"
            >
              下载开场
            </a>
          </div>
          <p className="mt-2 text-xs text-muted">
            画面按成片画幅居中裁切。原片若无法预览，可生成成片后播放确认。
          </p>
        </div>
      )}
    </section>
  );
}
