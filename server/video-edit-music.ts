/** Original offline felt-piano texture: synthesized oscillators, no third-party song or audio samples. */
import { existsSync, writeFileSync, renameSync } from 'node:fs';
import { resolve } from 'node:path';

import { type AudioAsset } from '../src/services/definition/project';

import { UPLOADS } from './media';

const SAMPLE_RATE = 44100;
const MUSIC_SECONDS = 64;

/** A warm four-chord arrangement with damped harmonics and quiet stereo echoes. */
export function getOriginalMusic(): AudioAsset {
  const name = 'original-felt-piano-v1.wav';
  const path = resolve(UPLOADS, name);
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
        const attack = 1 - Math.exp(-time * 55);
        const tone =
          Math.sin(2 * Math.PI * frequency * time) * Math.exp(-time * 1.25) +
          0.24 *
            Math.sin(2 * Math.PI * frequency * 2.001 * time) *
            Math.exp(-time * 2.5) +
          0.07 *
            Math.sin(2 * Math.PI * frequency * 3 * time) *
            Math.exp(-time * 4);
        const value = gain * attack * tone;
        left[offset + index] += value * Math.sqrt((1 - pan) / 2);
        right[offset + index] += value * Math.sqrt((1 + pan) / 2);
      }
    }
    for (let bar = 0; bar < 16; bar += 1) {
      const chord = chords[bar % chords.length];
      note(chord[0], bar * 4, 0.19, -0.12);
      [2, 4, 3, 5, 4, 3, 4, 2].forEach((degree, step) =>
        note(
          chord[degree],
          bar * 4 + step * 0.5 + 0.03,
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
  return {
    src: `/media/${name}`,
    duration: MUSIC_SECONDS,
    name: '原创轻钢琴 · Warm Interior',
    text: null,
  };
}
