/** Original offline arrangements: synthesized oscillators, no third-party songs or samples. */
import {
  workspaceDirectory,
  sharedWorkspaceDirectory,
} from '../storage/workspace';
import {
  existsSync,
  writeFileSync,
  renameSync,
  copyFileSync,
  statSync,
} from 'node:fs';
import { reserveStorage } from '../storage/storage-capacity';
import { resolve } from 'node:path';

import { type AudioAsset } from '../../src/services/definition/project';
import {
  MusicTrack,
  MUSIC_TRACK_MAP,
} from '../../src/services/definition/music';

const SAMPLE_RATE = 44100;
const MUSIC_SECONDS = 64;

/** The omitted choice keeps the original piano and old drafts byte-for-byte compatible. */
export function getOriginalMusic(track = MusicTrack.Piano): AudioAsset {
  const { filename: name } = MUSIC_TRACK_MAP[track];
  const path = resolve(sharedWorkspaceDirectory('music'), name);
  const ownedPath = resolve(workspaceDirectory('uploads'), name);
  if (!existsSync(path)) {
    const frames = SAMPLE_RATE * MUSIC_SECONDS;
    const left = new Float32Array(frames);
    const right = new Float32Array(frames);
    const chords = [
      [45, 52, 57, 60, 64, 71],
      [41, 48, 53, 57, 60, 67],
      [48, 55, 60, 64, 67, 74],
      [43, 50, 55, 59, 62, 69],
    ];
    /** Add an individual damped note with a soft attack and natural, non-linear harmonic decay. */
    function note(midi: number, start: number, gain: number, pan: number) {
      const frequency = 440 * Math.pow(2, (midi - 69) / 12);
      const offset = Math.floor(start * SAMPLE_RATE);
      for (
        let index = 0;
        index < SAMPLE_RATE * 5 && offset + index < frames;
        index += 1
      ) {
        const time = index / SAMPLE_RATE;
        let attack = 1 - Math.exp(-time * 55);
        let tone =
          Math.sin(2 * Math.PI * frequency * time) * Math.exp(-time * 1.25) +
          0.24 *
            Math.sin(2 * Math.PI * frequency * 2.001 * time) *
            Math.exp(-time * 2.5) +
          0.07 *
            Math.sin(2 * Math.PI * frequency * 3 * time) *
            Math.exp(-time * 4);
        if (track === MusicTrack.Pluck) {
          tone =
            (Math.sin(2 * Math.PI * frequency * time) +
              0.45 * Math.sin(2 * Math.PI * frequency * 2 * time) +
              0.18 * Math.sin(2 * Math.PI * frequency * 3 * time)) *
            Math.exp(-time * 3.6);
        } else if (track === MusicTrack.Lounge) {
          tone =
            Math.sin(
              2 * Math.PI * frequency * time +
                1.1 *
                  Math.sin(2 * Math.PI * frequency * 2 * time) *
                  Math.exp(-time * 3),
            ) * Math.exp(-time * 1.8);
        } else if (track === MusicTrack.Ambient) {
          attack = 1 - Math.exp(-time * 1.6);
          tone =
            (Math.sin(2 * Math.PI * frequency * time) +
              0.25 * Math.sin(2 * Math.PI * frequency * 1.003 * time)) *
            Math.exp(-time * 0.8);
        } else if (track === MusicTrack.Bells) {
          tone =
            Math.sin(2 * Math.PI * frequency * time) * Math.exp(-time * 1.4) +
            0.3 *
              Math.sin(2 * Math.PI * frequency * 2.76 * time) *
              Math.exp(-time * 2.8) +
            0.12 *
              Math.sin(2 * Math.PI * frequency * 5.4 * time) *
              Math.exp(-time * 4);
        }
        const value = gain * attack * tone;
        left[offset + index] += value * Math.sqrt((1 - pan) / 2);
        right[offset + index] += value * Math.sqrt((1 + pan) / 2);
      }
    }
    const arrangements = {
      [MusicTrack.Piano]: {
        barSeconds: 4,
        transpose: 0,
        steps: [2, 4, 3, 5, 4, 3, 4, 2],
      },
      [MusicTrack.Pluck]: {
        barSeconds: 3.2,
        transpose: 7,
        steps: [2, 3, 4, 3, 5, 4, 3, 4],
      },
      [MusicTrack.Lounge]: {
        barSeconds: 4,
        transpose: 0,
        steps: [2, 4, 3, 4, 5, 3],
      },
      [MusicTrack.Ambient]: {
        barSeconds: 8,
        transpose: 0,
        steps: [2, 3, 4, 5],
      },
      [MusicTrack.Bells]: {
        barSeconds: 6.4,
        transpose: 12,
        steps: [2, 4, 3, 5],
      },
    };
    const arrangement = arrangements[track];
    for (let bar = 0; bar * arrangement.barSeconds < MUSIC_SECONDS; bar += 1) {
      const chord = chords[bar % chords.length];
      const start = bar * arrangement.barSeconds;
      note(chord[0], start, 0.19, -0.12);
      arrangement.steps.forEach((degree, step) =>
        note(
          chord[degree] + arrangement.transpose,
          start +
            (step * arrangement.barSeconds) / arrangement.steps.length +
            0.03,
          0.105 * (step % 2 ? 0.8 : 1),
          step % 2 ? 0.32 : -0.28,
        ),
      );
    }
    const dryLeft = left.slice();
    const dryRight = right.slice();
    [0.137, 0.293, 0.449].forEach((delay, tap) => {
      const offset = Math.round(delay * SAMPLE_RATE);
      const gain = 0.18 / (tap + 1);
      for (let index = offset; index < frames; index += 1) {
        left[index] += dryRight[index - offset] * gain;
        right[index] += dryLeft[index - offset] * gain;
      }
    });
    let peak = 0;
    for (let index = 0; index < frames; index += 1)
      peak = Math.max(peak, Math.abs(left[index]), Math.abs(right[index]));
    const bytes = Buffer.alloc(44 + frames * 4);
    bytes.write('RIFF');
    bytes.writeUInt32LE(bytes.length - 8, 4);
    bytes.write('WAVEfmt ', 8);
    bytes.writeUInt32LE(16, 16);
    bytes.writeUInt16LE(1, 20);
    bytes.writeUInt16LE(2, 22);
    bytes.writeUInt32LE(SAMPLE_RATE, 24);
    bytes.writeUInt32LE(SAMPLE_RATE * 4, 28);
    bytes.writeUInt16LE(4, 32);
    bytes.writeUInt16LE(16, 34);
    bytes.write('data', 36);
    bytes.writeUInt32LE(frames * 4, 40);
    for (let index = 0; index < frames; index += 1) {
      const envelope = Math.max(
        0,
        Math.min(1, index / SAMPLE_RATE, (frames - index) / (SAMPLE_RATE * 2)),
      );
      bytes.writeInt16LE(
        Math.round((left[index] / peak) * 20000 * envelope),
        44 + index * 4,
      );
      bytes.writeInt16LE(
        Math.round((right[index] / peak) * 20000 * envelope),
        46 + index * 4,
      );
    }
    writeFileSync(`${path}.tmp`, bytes);
    renameSync(`${path}.tmp`, path);
  }
  if (!existsSync(ownedPath)) {
    const release = reserveStorage(statSync(path).size);
    try {
      copyFileSync(path, ownedPath);
    } finally {
      release();
    }
  }
  return {
    src: `/media/${name}`,
    duration: MUSIC_SECONDS,
    name: MUSIC_TRACK_MAP[track].name,
    text: null,
  };
}
