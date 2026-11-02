"""Offline Nano recognition followed by acoustic timestamps, under the owning media process group."""
import argparse
import json
import os
from pathlib import Path
import re
import subprocess
import tempfile
import wave


def parse_srt(source, duration_ms):
    segments = []
    for block in source.strip().split('\n\n'):
        if not block.strip():
            continue
        lines = block.strip().splitlines()
        if len(lines) < 3 or not lines[0].isdigit():
            raise ValueError('Invalid Nano segment output')
        match = re.fullmatch(r'(\d{2}):(\d{2}):(\d{2}),(\d{3}) --> (\d{2}):(\d{2}):(\d{2}),(\d{3})', lines[1])
        if not match:
            raise ValueError('Nano did not return source timestamps')
        values = list(map(int, match.groups()))
        if any(values[i] >= 60 for i in (1, 2, 5, 6)):
            raise ValueError('Invalid Nano clock fields')
        start, end = [(values[i] * 3600 + values[i + 1] * 60 + values[i + 2]) * 1000 + values[i + 3]
                      for i in (0, 4)]
        if end - start > 31_000 or end > duration_ms + 100:
            raise ValueError('Nano segment exceeds the source or bounded acoustic window')
        end = min(end, duration_ms)
        text = ''.join(lines[2:]).strip()
        if start < 0 or end <= start or end - start > 31_000 or (segments and start < segments[-1][1]):
            raise ValueError('Nano returned overlapping or unbounded speech segments')
        if not text or len(text) > 1000:
            raise ValueError('Invalid Nano transcript length')
        segments.append((start, end, text))
    return segments


def transcribe(model_dir, audio_path, output_path):
    with wave.open(str(audio_path)) as source:
        if (source.getframerate(), source.getnchannels(), source.getsampwidth()) != (16000, 1, 2):
            raise ValueError('Expected mono 16 kHz PCM audio')
        # Complete milliseconds only: resampling/AAC durations need not contain an integer number of ms.
        duration_ms = source.getnframes() // 16
        if not 0 < duration_ms <= 600_000:
            raise ValueError('Audio exceeds the supported source duration')
    # Capture transcript files inside the owning workspace. No user text goes to process logs.
    with tempfile.TemporaryFile(dir=output_path.parent) as output, tempfile.TemporaryFile(dir=output_path.parent) as errors:
        command = [str(model_dir.parent / 'bin/llama-funasr-cli'), '--enc', str(model_dir / 'funasr-encoder-f16.gguf'),
                   '-m', str(model_dir / 'qwen3-0.6b-q8_0.gguf'), '-a', str(audio_path),
                   '--vad', str(model_dir / 'fsmn-vad.gguf'), '--vad-maxseg', '30000', '--srt']
        result = subprocess.run(command, stdout=output, stderr=errors, timeout=840, check=False)
        if result.returncode:
            raise RuntimeError('Local Nano recognition failed')
        if output.tell() > 512 * 1024:
            raise ValueError('Nano transcript exceeds the bounded result size')
        output.seek(0)
        segments = parse_srt(output.read().decode('utf-8'), duration_ms)
    if not segments:
        return []
    # Load the alignment model only after Nano releases its larger model and compute buffers.
    from asr_nano_alignment import AcousticAligner
    import numpy as np
    aligner = AcousticAligner(model_dir)
    captions = []
    with wave.open(str(audio_path)) as source:
        for start, end, text in segments:
            source.setpos(start * 16)
            samples = np.frombuffer(source.readframes((end - start) * 16), dtype='<i2')
            if len(samples) != (end - start) * 16:
                raise ValueError('Audio ended before the declared speech segment')
            captions.extend(aligner.align(samples, text, start, end))
            if len(captions) > 600:
                raise ValueError('Too many subtitles; split the source video')
    return captions


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--model-dir', type=Path, required=True)
    parser.add_argument('--audio', type=Path, required=True)
    parser.add_argument('--output', type=Path, required=True)
    args = parser.parse_args()
    os.umask(0o077)
    captions = transcribe(args.model_dir, args.audio, args.output)
    args.output.write_text(json.dumps(captions, ensure_ascii=False), encoding='utf-8')
    os.chmod(args.output, 0o600)
