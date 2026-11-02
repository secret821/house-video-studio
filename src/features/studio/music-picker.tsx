/** Shared music selector: offline fallback always visible; previews do not select. */
import { useEffect, useRef, useState } from 'react';
import {
  LoadingOutlined,
  PauseCircleOutlined,
  PlayCircleOutlined,
} from '@ant-design/icons';
import { Alert, Button, Flex, Input, Select, Typography, Modal } from 'antd';
import { MusicTrack, MUSIC_TRACK_MAP } from '@/services/definition/music';
import type { AudioAsset } from '@/services/definition/project';
import type {
  LibraryTrack,
  MusicChoice,
} from '@/services/definition/music-library';
import { musicApi } from './music-api';

type Props = {
  music: AudioAsset | null;
  busy: boolean;
  onSelect: (choice: MusicChoice, signal?: AbortSignal) => Promise<void>;
};

type OnlineMusicOption = {
  value: number;
  label: string;
  track: LibraryTrack;
};

// ccMixter primarily indexes English tags; only translate these explicit aliases.
const SEARCH_KEYWORDS: Record<string, string> = {
  钢琴: 'piano',
  轻音乐: 'ambient',
  氛围: 'ambient',
  吉他: 'guitar',
  原声: 'acoustic',
  放松: 'relaxing',
  轻松: 'relaxing',
  欢快: 'upbeat',
  爵士: 'jazz',
};
const SEARCH_SUGGESTIONS = ['钢琴', '吉他', '氛围', '欢快'];

function searchKeyword(query: string) {
  const term = query.trim();
  return Object.hasOwn(SEARCH_KEYWORDS, term) ? SEARCH_KEYWORDS[term] : term;
}

export function MusicPicker({ music, busy, onSelect }: Props) {
  const [query, setQuery] = useState('');
  const [importing, setImporting] = useState(false);
  const selection = useRef<AbortController | null>(null);
  const [results, setResults] = useState<LibraryTrack[]>([]);
  const [searching, setSearching] = useState(false);
  const [searched, setSearched] = useState(false);
  const [resultsOpen, setResultsOpen] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [message, setMessage] = useState('');
  const [playing, setPlaying] = useState('');
  const [loading, setLoading] = useState('');
  const audio = useRef<HTMLAudioElement | null>(null);
  const search = useRef<AbortController | null>(null);
  const sequence = useRef(0);
  const previewTimer = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );

  function stop() {
    sequence.current += 1;
    clearTimeout(previewTimer.current);
    if (audio.current) {
      audio.current.pause();
      audio.current.removeAttribute('src');
      audio.current.load();
      audio.current = null;
    }
    setPlaying('');
    setLoading('');
  }
  useEffect(
    () => () => {
      sequence.current += 1;
      clearTimeout(previewTimer.current);
      search.current?.abort();
      selection.current?.abort();
      audio.current?.pause();
      audio.current?.removeAttribute('src');
      audio.current?.load();
    },
    [],
  );
  useEffect(() => {
    if (busy) stop();
  }, [busy]);

  function preview(key: string, source: string) {
    if (playing === key || loading === key) {
      stop();
      return;
    }
    stop();
    setMessage('');
    setLoading(key);
    const token = sequence.current;
    const player = new Audio(source);
    audio.current = player;
    previewTimer.current = setTimeout(() => {
      if (token !== sequence.current) return;
      stop();
      setMessage('试听加载超时，请重试或使用内置曲目。');
    }, 605_000);
    player.onended = () => {
      if (token === sequence.current) stop();
    };
    player.onerror = () => {
      if (token !== sequence.current) return;
      stop();
      setMessage('试听加载失败，请重试；内置曲目仍可使用。');
    };
    player
      .play()
      .then(() => {
        if (token !== sequence.current) {
          player.pause();
          return;
        }
        clearTimeout(previewTimer.current);
        setLoading('');
        setPlaying(key);
      })
      .catch(() => {
        if (token !== sequence.current) return;
        stop();
        setMessage('试听未能播放，请再次点击试听按钮或换一首曲目。');
      });
  }

  function find(nextPage = 0, term = query) {
    stop();
    search.current?.abort();
    const controller = new AbortController();
    search.current = controller;
    setSearching(true);
    setSearched(false);
    setResults([]);
    setHasMore(false);
    setResultsOpen(false);
    setQuery(term);
    setMessage('');
    musicApi
      .search(searchKeyword(term), nextPage, controller.signal)
      .then((result) => {
        if (controller.signal.aborted) return;
        setResults(result.tracks);
        setHasMore(result.hasMore);
        setPage(nextPage);
        setSearched(true);
        setResultsOpen(result.tracks.length > 0);
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted)
          setMessage(
            error instanceof Error
              ? error.message
              : '在线搜索失败，可继续使用内置曲目。',
          );
      })
      .finally(() => {
        if (!controller.signal.aborted) setSearching(false);
      });
  }

  function choose(choice: MusicChoice) {
    if (selection.current) return;
    stop();
    setResultsOpen(false);
    const controller = new AbortController();
    selection.current = controller;
    setImporting(choice.kind === 'online');
    onSelect(choice, controller.signal)
      .catch((error: unknown) =>
        setMessage(
          controller.signal.aborted
            ? '已取消加载，可以使用内置曲目。'
            : error instanceof Error
              ? error.message
              : '选曲失败，请重试。',
        ),
      )
      .finally(() => {
        selection.current = null;
        setImporting(false);
      });
  }

  function previewButton(key: string, source: string, title: string) {
    const active = playing === key || loading === key;
    let icon = <PlayCircleOutlined />;
    if (loading === key) icon = <LoadingOutlined spin />;
    else if (playing === key) icon = <PauseCircleOutlined />;
    return (
      <Button
        type="text"
        className="music-preview-button"
        icon={icon}
        disabled={busy}
        aria-label={`${active ? '暂停' : '试听'} ${title}`}
        aria-pressed={active}
        onMouseDown={(event) => {
          event.preventDefault();
          event.stopPropagation();
        }}
        onKeyDown={(event) => event.stopPropagation()}
        onClick={(event) => {
          event.stopPropagation();
          preview(key, source);
        }}
      >
        {active ? '暂停' : '试听'}
      </Button>
    );
  }
  const selectedBuiltin = Object.values(MusicTrack).find(
    (track) => music?.src === `/media/${MUSIC_TRACK_MAP[track].filename}`,
  );
  let searchStatus = '点击搜索或常用关键词后加载曲目。曲库主要使用英文标签。';
  if (searching) searchStatus = '正在搜索在线曲库，通常需要 5～25 秒…';
  else if (searched) {
    let nextAction = '展开下方列表，点击曲名选用，右侧按钮试听。';
    if (!results.length)
      nextAction = hasMore
        ? '本页没有符合许可与格式要求的曲目，可查看下一页或换个关键词。'
        : '请换个关键词，或使用上方内置曲目。';
    searchStatus = `第 ${page + 1} 页找到 ${results.length} 首可用曲目。${nextAction}`;
  }
  if (searchKeyword(query) !== query.trim())
    searchStatus += ` “${query.trim()}”按 ${searchKeyword(query)} 搜索。`;
  return (
    <div className="music-picker">
      <Modal
        open={importing}
        title="正在加载在线音乐"
        onCancel={() => selection.current?.abort()}
        footer={
          <Button disabled={false} onClick={() => selection.current?.abort()}>
            取消加载
          </Button>
        }
      >
        <p>
          外网下载可能需要几分钟。完成后生成视频使用本地音乐；也可以取消，改用内置曲目。
        </p>
      </Modal>
      <div>
        <span className="studio-label">内置曲目 · 随时可用</span>
        <Select
          virtual={false}
          className="w-full"
          aria-label="内置背景音乐"
          disabled={busy}
          value={selectedBuiltin}
          placeholder="选择内置曲目（无需联网）"
          onOpenChange={(open) => {
            if (!open) stop();
          }}
          onChange={(track: MusicTrack) => choose({ kind: 'builtin', track })}
          options={Object.values(MusicTrack).map((track) => ({
            value: track,
            label: MUSIC_TRACK_MAP[track].name,
          }))}
          optionRender={(option) => {
            const track = option.value as MusicTrack;
            const item = MUSIC_TRACK_MAP[track];
            return (
              <div className="music-option">
                <span className="music-option-title">
                  {item.name}
                  <small>{item.description}</small>
                </span>
                {previewButton(
                  track,
                  `/music-preview/${encodeURIComponent(track)}`,
                  item.name,
                )}
              </div>
            );
          }}
        />
      </div>
      <Flex vertical gap={12}>
        <span className="studio-label mb-0">在线免费音乐库 · ccMixter</span>
        <Input.Search
          aria-label="搜索免费音乐"
          value={query}
          maxLength={80}
          disabled={busy}
          placeholder="输入钢琴、吉他、氛围或英文关键词"
          enterButton="搜索"
          loading={searching}
          onChange={(event) => {
            stop();
            search.current?.abort();
            setSearching(false);
            setQuery(event.target.value);
            setHasMore(false);
            setResults([]);
            setSearched(false);
            setResultsOpen(false);
            setMessage('');
          }}
          onSearch={() => find()}
        />
        <Flex align="center" wrap gap={8}>
          <span className="text-xs text-muted">试试</span>
          {SEARCH_SUGGESTIONS.map((keyword) => (
            <Button
              key={keyword}
              disabled={busy || searching}
              onClick={() => find(0, keyword)}
            >
              {keyword}
            </Button>
          ))}
        </Flex>
        <div role="status" aria-live="polite" className="text-xs text-muted">
          {searchStatus}
        </div>
        <Select<number, OnlineMusicOption>
          virtual={false}
          className="w-full"
          aria-label="在线音乐搜索结果"
          disabled={busy || searching}
          value={null}
          open={resultsOpen && !busy && !searching}
          placeholder={
            results.length
              ? `找到 ${results.length} 首曲目，点此展开试听或选用`
              : '搜索结果会显示在这里'
          }
          notFoundContent={
            searched ? '没有匹配曲目，换个关键词或使用内置音乐' : '先搜索音乐'
          }
          onOpenChange={(open) => {
            setResultsOpen(open);
            if (!open) stop();
          }}
          onChange={(id: number) => choose({ kind: 'online', id })}
          options={results.map((track) => ({
            value: track.id,
            label: track.credit.title,
            track,
          }))}
          optionRender={(option) => {
            // Closing animations can still render old options after a new search clears results.
            const { track } = option.data;
            return (
              <div className="music-option">
                <span className="music-option-title">
                  {track.credit.title}
                  <small>{track.credit.author} · CC BY</small>
                </span>
                {previewButton(
                  String(track.id),
                  `/music-preview/online/${track.id}`,
                  track.credit.title,
                )}
              </div>
            );
          }}
        />
        {hasMore && (
          <Button
            type="link"
            disabled={busy || searching}
            onClick={() => find(page + 1)}
          >
            下一页曲目
          </Button>
        )}
        <p className="text-xs text-muted">
          首次在线试听需加载音乐，受外网速度影响；选用后生成视频无需再次下载。在线曲目需保留署名。
        </p>
      </Flex>
      {message && <Alert type="warning" title={message} showIcon />}
      {music && (
        <div className="music-current">
          <span className="music-option-title">已选：{music.name}</span>
          {previewButton('selected', music.src, music.name)}
        </div>
      )}
      {music?.musicCredit && (
        <div className="music-credit">
          <Typography.Paragraph
            copyable={{ text: music.musicCredit.attribution }}
          >
            {music.musicCredit.attribution}
          </Typography.Paragraph>
        </div>
      )}
    </div>
  );
}
