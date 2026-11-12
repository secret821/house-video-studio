/** Preview owns its audition state; export continues to consume the unchanged project. */
import { Player } from '@remotion/player';
import { Button, Progress, ButtonAppearance, cn } from '../../../share/ui';
import { DownloadOutlined, SoundOutlined } from '@ant-design/icons';
import { useState } from 'react';

import {
  FPS,
  JobStatus,
  VideoTemplate,
  VIDEO_TEMPLATE_MAP,
} from '@/services/definition/project';
import { VideoEditFilm } from '@/video/video-edit';
import { getVideoEditTimeline } from '@/video/video-edit-timeline';

import type { useVideoEdit } from './use-video-edit';

/** Keep the same composition and source audio for mobile, desktop and export. */
export function VideoEditPreview({
  editor,
  dialog = false,
}: {
  editor: ReturnType<typeof useVideoEdit>;
  dialog?: boolean;
}) {
  const { project, job, ready } = editor;
  const [musicSolo, setMusicSolo] = useState(false);
  const soloActive = musicSolo && Boolean(project.music);
  const generatedTemplate =
    VIDEO_TEMPLATE_MAP[job?.videoTemplate ?? VideoTemplate.Classic].name;
  const timeline = getVideoEditTimeline(project);
  return (
    <aside
      id="studio-preview"
      className={cn('island-panel', { 'studio-preview-column': !dialog })}
      aria-label="预览与生成"
    >
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl leading-[30px] font-semibold text-ink">
          实时预览
        </h2>
        <span className="text-xs text-muted">
          {ready && `${(timeline.frames / FPS).toFixed(1)}秒`}
          {!ready && editor.inputError && '请检查剪辑设置'}
          {!ready && !editor.inputError && '等待上传素材'}
        </span>
      </div>
      <div
        className={cn(
          'flex items-center justify-center',
          'min-h-[300px]',
          'p-4',
          'rounded-xl bg-stage',
        )}
      >
        {ready && (
          <Player
            component={VideoEditFilm}
            inputProps={{ project, musicOnly: soloActive }}
            durationInFrames={timeline.frames}
            compositionWidth={1080}
            compositionHeight={1920}
            fps={FPS}
            controls
            style={{ width: 'min(100%, 260px)' }}
            errorFallback={() => (
              <div className="p-4 text-white">
                原片暂不支持浏览器预览，请点击“生成成片”后播放确认。
              </div>
            )}
          />
        )}
        {!ready && (
          <div className="max-w-64 text-center text-white">
            <p className="text-lg leading-7">
              {editor.inputError ? '请检查剪辑设置' : '先上传口播与房屋素材'}
            </p>
            <p className="mt-3 text-sm text-white/65">
              {editor.inputError
                ? editor.inputError
                : '房屋视频或照片可混合添加，配乐和导出均在本机完成。'}
            </p>
          </div>
        )}
      </div>
      {ready && (
        <div className="mt-3 space-y-2" aria-label="预览配乐状态">
          <p className="text-xs text-muted" role="status">
            {!project.music && '当前预览未添加背景音乐。'}
            {project.music &&
              project.musicVolume === 0 &&
              '已选择配乐，但背景音乐音量为0，请调高后播放试听。'}
            {project.music &&
              project.musicVolume > 0 &&
              `已加入：${project.music.name} · ${Math.round(project.musicVolume * 100)}%音量 · 全片铺底`}
          </p>
          {project.music && (
            <>
              <Button
                icon={<SoundOutlined />}
                aria-pressed={soloActive}
                disabled={project.musicVolume === 0}
                onClick={() => setMusicSolo((current) => !current)}
              >
                {soloActive ? '恢复原声与配乐' : '只听配乐'}
              </Button>
              <p className="text-xs text-muted">
                {soloActive && '当前仅试听配乐；'}
                点击播放器播放后试听。此切换只影响预览，导出仍保留原声与当前配乐设置。
              </p>
            </>
          )}
        </div>
      )}
      <p className="mt-3 text-xs text-muted">
        1080 × 1920 · 30 FPS · H.264 / AAC
        {ready && (
          <> · 开头含{(timeline.coverFrames / FPS).toFixed(1)}秒主封面</>
        )}
      </p>
      {job && (
        <div
          id="studio-result"
          className="studio-result mt-6 border-t border-line pt-5"
          aria-live="polite"
        >
          <h3 className="text-lg leading-7 font-medium text-ink">
            成片与生成状态
            {job.status === JobStatus.Complete && ` · ${generatedTemplate}`}
          </h3>
          {job.status === JobStatus.Rendering && (
            <p className="mt-3 text-sm text-content">
              任务已提交，正在后台生成。可以锁屏、切换应用或关闭页面；返回后自动恢复进度。任务编号：
              {job.id}
            </p>
          )}
          <p
            className={cn('mt-2 text-xs break-words', {
              'text-danger': job.status === JobStatus.Failed,
              'text-muted': job.status !== JobStatus.Failed,
            })}
          >
            {job.message}
          </p>
          <Progress
            className="mt-3 h-2 w-full accent-primary"
            percent={job.progress * 100}
            showInfo={false}
            aria-label="免费视频导出进度"
          />
          {job.output && (
            <>
              <p className="mt-3 text-xs text-muted">
                下载的是上次生成的文件，不会重新制作。调整素材顺序、配乐或文案后，请先重新生成成片。
              </p>
              <video
                className={cn('mt-4 w-full rounded-lg', {
                  'max-h-[55dvh] object-contain': dialog,
                })}
                src={job.output}
                poster={job.cover ?? undefined}
                controls
                playsInline
                preload="metadata"
                aria-label="已导出免费视频"
              />
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <Button
                  appearance={ButtonAppearance.Solid}
                  icon={<DownloadOutlined />}
                  href={job.output}
                  download={`房源视频-${generatedTemplate}.mp4`}
                >
                  下载{generatedTemplate} MP4
                </Button>
                {job.cover && (
                  <Button
                    icon={<DownloadOutlined />}
                    href={job.cover}
                    download={`房源封面-${generatedTemplate}.png`}
                  >
                    下载封面
                  </Button>
                )}
              </div>
              {job.cover && !dialog && (
                <img
                  className="mt-4 w-full rounded-lg"
                  src={job.cover}
                  alt="房源视频封面"
                />
              )}
            </>
          )}
        </div>
      )}
    </aside>
  );
}
