/** Fetch demo-only photographs and synthesize an original, quiet ambient audio bed. */
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import sharp from 'sharp';

const directory = resolve('public/demo');
mkdirSync(directory, { recursive: true });
const photos = {
  living: 'https://images.unsplash.com/photo-1600210492486-724fe5c67fb0',
  bedroom: 'https://images.unsplash.com/photo-1616594039964-ae9021a400a0',
  kitchen: 'https://images.unsplash.com/photo-1556912172-45b7abe8b7e1',
  dining: 'https://images.unsplash.com/photo-1617806118233-18e1de247200',
};

/** A smoothly enveloped chord sequence avoids clicks when the 16-second bed loops. */
function createMusic() {
  const sampleRate = 44100;
  const samples = sampleRate * 16;
  const buffer = Buffer.alloc(44 + samples * 2);
  buffer.write('RIFF');
  buffer.writeUInt32LE(buffer.length - 8, 4);
  buffer.write('WAVEfmt ', 8);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(1, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * 2, 28);
  buffer.writeUInt16LE(2, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write('data', 36);
  buffer.writeUInt32LE(samples * 2, 40);
  const chords = [
    [261.63, 329.63, 392],
    [220, 261.63, 329.63],
    [174.61, 220, 261.63],
    [196, 246.94, 293.66],
  ];
  for (let index = 0; index < samples; index++) {
    const time = index / sampleRate;
    const phase = (time % 4) / 4;
    const envelope = Math.sin(Math.PI * phase) ** 2;
    const chord = chords[Math.floor(time / 4)];
    const signal = chord.reduce(
      (sum, frequency) => sum + Math.sin(2 * Math.PI * frequency * time) / 3,
      0,
    );
    buffer.writeInt16LE(Math.round(signal * envelope * 5000), 44 + index * 2);
  }
  writeFileSync(resolve(directory, 'music.wav'), buffer);
}

Promise.all(
  Object.entries(photos).map(([name, url]) => {
    const target = resolve(directory, `${name}.jpg`);
    if (existsSync(target)) return Promise.resolve();
    return fetch(`${url}?auto=format&fit=crop&w=1800&q=85`)
      .then((response) => {
        if (!response.ok)
          throw new Error(`照片下载失败: ${name} (${response.status})`);
        return response.arrayBuffer();
      })
      .then((bytes) =>
        sharp(Buffer.from(bytes)).jpeg({ quality: 90 }).toFile(target),
      );
  }),
)
  .then(() => {
    createMusic();
    console.info('演示照片与原创背景音乐已准备。');
  })
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  });
