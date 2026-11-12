/** Per-photo copy and explicit audio actions live next to the photo selector, not hidden in export settings. */
import { Button, Input, Collapse, cn } from '../../../share/ui';

import { CopyKind } from '../../../services/definition/copy';

import { FileUpload } from '../media/file-upload';
import { useStudio } from './use-studio';
import { CopyGenerator } from './copy-generator';

interface SceneEditorProps {
  studio: ReturnType<typeof useStudio>;
}

/** Subtitle-only edits preserve narration; changing spoken text requires an explicit voice action. */
export function SceneEditor({ studio }: SceneEditorProps) {
  const { selected, project, busy } = studio;
  if (!selected)
    return (
      <p className="mt-4 text-sm text-muted">添加照片后，可逐张配置文案。</p>
    );
  const index = project.scenes.findIndex((scene) => scene.id === selected.id);
  const stale =
    selected.voiceover &&
    selected.voiceover.text !== null &&
    selected.voiceover.text !== selected.narration;
  const emptyScript = !selected.narration.trim();
  return (
    <section
      aria-label="当前图片文案配置"
      className="mt-6 space-y-6 border-t border-line pt-5"
    >
      <div>
        <h3 className="text-lg leading-7 font-medium text-ink">
          第 {index + 1} 张 / {project.scenes.length} · 文案配置
        </h3>
        <p className="mt-2 text-xs text-muted">
          点选上方照片，在这里编辑。字幕与画面更新在本机完成。
        </p>
      </div>
      <Collapse
        className="studio-disclosure"
        ghost
        expandIconPlacement="end"
        items={[
          {
            key: 'panel',
            label: <>按照片生成文案（可选）</>,
            forceRender: true,
            children: (
              <>
                <CopyGenerator
                  draft={{
                    brief: project.copyBrief ?? '',
                    suggestion: project.copyDraft ?? null,
                    onChange: (patch) =>
                      studio.setProject((current) => ({
                        ...current,
                        ...patch,
                      })),
                  }}
                  disabled={busy}
                  input={{
                    kind: CopyKind.Photo,
                    facts: {
                      name: project.name,
                      location: project.location,
                      area: project.area,
                      layout: project.layout,
                      price: project.price,
                    },
                    scene: { id: selected.id, src: selected.src },
                  }}
                  onApply={(result) =>
                    studio.patchScene({
                      title: result.items[0].title,
                      narration: result.items[0].narration,
                      caption: result.items[0].caption,
                    })
                  }
                />
              </>
            ),
          },
        ]}
      />
      <label className="block">
        <span className="mb-2 block text-body font-medium">当前图片标题</span>
        <Input
          aria-label="当前图片标题"
          value={selected.title}
          maxLength={32}
          onChange={(event) => studio.patchScene({ title: event.target.value })}
        />
      </label>
      <label className="block">
        <span className="mb-2 block text-body font-medium">
          解说文案 · {selected.narration.length}/300
        </span>
        <Input.TextArea
          className={cn(
            'w-full min-h-28',
            'px-3 py-2',
            'rounded-lg border border-input bg-panel',
            'text-sm leading-6',
            'focus:outline-primary',
          )}
          aria-label="当前图片解说文案"
          value={selected.narration}
          maxLength={300}
          placeholder="填写这张照片需要说出的内容…"
          onChange={(event) =>
            studio.patchScene({ narration: event.target.value })
          }
        />
      </label>
      <label className="block">
        <span className="mb-2 block text-body font-medium">
          独立字幕文案 · 免费修改
        </span>
        <Input.TextArea
          className={cn(
            'w-full min-h-24',
            'px-3 py-2',
            'rounded-lg border border-input bg-panel',
            'text-sm leading-6',
            'focus:outline-primary',
          )}
          aria-label="当前图片字幕文案"
          value={selected.caption ?? ''}
          maxLength={300}
          placeholder="留空跟随解说；仅改此处会保留原配音"
          onChange={(event) =>
            studio.patchScene({ caption: event.target.value })
          }
        />
        <span className="mt-2 block text-xs text-muted">
          只改字幕不会改声音，也不会调用云端模型。
        </span>
      </label>
      <div>
        {stale && (
          <p role="alert" className="mb-3 text-xs text-danger">
            解说已改词，旧声音暂留试听。请更新配音、上传新录音或移除旧配音后再合成。
          </p>
        )}
        {selected.voiceover && (
          <div className="mb-3">
            <audio
              aria-label="当前图片配音试听"
              className="h-9 w-full"
              src={selected.voiceover.src}
              controls
            />
            <Button
              danger
              className="mt-2"
              onClick={() => studio.patchScene({ voiceover: null })}
            >
              移除当前图片配音
            </Button>
          </div>
        )}
        <div className="flex flex-col gap-2">
          <Button
            className="w-full"
            disabled={
              busy || emptyScript || !studio.speechCapability.localSpeechReady
            }
            onClick={studio.generateLocalSpeech}
          >
            仅此张 Kokoro 配音（免费）
          </Button>
          <FileUpload
            label="上传当前图片录音"
            accept=".wav,.mp3,.m4a,.ogg"
            disabled={busy}
            onFiles={(files) => studio.addAudio(files[0], true)}
          />
        </div>
        <p className="mt-2 text-xs text-muted">
          Kokoro v1.1-zh
          中文女声，本地生成；也可上传本人录音。人物开场保留原声。
        </p>
      </div>
      <p className="text-xs text-muted">
        修改完成后，点击底部“生成成片”。生成会更新所有已改片段并复用其他缓存，不会自动生成配音。
      </p>
    </section>
  );
}
