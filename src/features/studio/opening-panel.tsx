/** Recorded presenter videos are uploaded locally and played before the photo tour with their original audio. */
import { Button, Title } from 'animal-island-ui';
import clsx from 'clsx';
import {
  DownloadIcon as Download,
  UploadIcon as Upload,
  TrashIcon as Trash2,
} from 'naive-icons';

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
      <h2 className="mb-4 text-xl leading-[30px] font-semibold text-ink">
        <Title size="small" color="app-yellow">
          00 / 上传开场视频
        </Title>
      </h2>
      <p className="mb-4 text-xs text-muted">
        直接上传录好的人物口播，保留视频原声，随后接入房源照片。无需生成人物或开场配音。
      </p>
      <fieldset disabled={busy} className="space-y-4">
        <label className="studio-button w-full">
          <Upload size={16} />
          {clip ? '更换开场视频' : '上传开场视频'}
          <input
            className="hidden"
            type="file"
            accept=".mp4,.mov"
            aria-label="上传开场视频"
            onChange={(event) => {
              studio.addOpeningVideo(event.target.files?.[0]);
              event.target.value = '';
            }}
          />
        </label>
        <p className="text-xs text-muted">
          MP4 / MOV，250MB以内，最长60秒。仅在本机处理。
        </p>
        {project.opening && (
          <Button
            className="island-action w-full"
            onClick={studio.removeOpening}
            icon={<Trash2 size={15} />}
          >
            移除人物开场
          </Button>
        )}
      </fieldset>
      {!clip && (
        <p className="mt-4 text-xs text-muted">
          开场可选，也可以直接从房源照片开始。
        </p>
      )}
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
            className={clsx(
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
              <Download size={14} />
              下载开场
            </a>
          </div>
          <p className="mt-2 text-xs text-muted">
            画面按成片画幅居中裁切，上传后可先播放确认。
          </p>
        </div>
      )}
    </section>
  );
}
