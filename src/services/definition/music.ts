/** Built-in offline music choices shared by the editor and local synthesizer. */
import { z } from 'zod';

export enum MusicTrack {
  Piano = 'felt-piano',
  Pluck = 'sunny-pluck',
  Lounge = 'relaxed-lounge',
  Ambient = 'airy-ambient',
  Bells = 'clear-bells',
}
export const musicTrackSchema = z.enum(MusicTrack);
export const MUSIC_TRACK_MAP = {
  [MusicTrack.Piano]: {
    name: '原创轻钢琴 · Warm Interior',
    description: '温暖柔和，适合日常房源讲解。',
    filename: 'original-felt-piano-v1.wav',
  },
  [MusicTrack.Pluck]: {
    name: '明亮拨弦 · Sunny Walk',
    description: '轻快清爽，适合采光和生活空间展示。',
    filename: 'original-sunny-pluck-v1.wav',
  },
  [MusicTrack.Lounge]: {
    name: '轻松律动 · Easy Living',
    description: '舒展的电钢琴节奏，适合边走边讲。',
    filename: 'original-relaxed-lounge-v1.wav',
  },
  [MusicTrack.Ambient]: {
    name: '舒缓氛围 · Quiet Space',
    description: '缓慢铺开的柔和长音，适合安静的空间展示。',
    filename: 'original-airy-ambient-v1.wav',
  },
  [MusicTrack.Bells]: {
    name: '清透铃音 · Morning Light',
    description: '稀疏通透的铃音，适合简洁明亮的画面。',
    filename: 'original-clear-bells-v1.wav',
  },
} satisfies Record<
  MusicTrack,
  { name: string; description: string; filename: string }
>;
