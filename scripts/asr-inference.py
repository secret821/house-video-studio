"""Offline CPU speech recognition. Never changes the source audio or invents listing copy."""
import argparse
from contextlib import contextmanager
import json
import os
from pathlib import Path
import sys
import uuid
import wave

SAMPLE_RATE = 16000
MAX_WINDOW_SAMPLES = SAMPLE_RATE * 8
OVERLAP_SAMPLES = SAMPLE_RATE


def release_model_cache(model_path, stop):
    """Discard only the read-only public model's redundant Linux file cache."""
    with model_path.open("rb") as model:
        while not stop.is_set():
            os.posix_fadvise(model.fileno(), 0, 0, os.POSIX_FADV_DONTNEED)
            stop.wait(0.005)


@contextmanager
def bounded_model_loading(model_path):
    """ONNX holds its own weights; keep the 228MiB source cache out of the loading peak."""
    if not sys.platform.startswith("linux") or not hasattr(os, "posix_fadvise"):
        yield
        return
    import multiprocessing
    context = multiprocessing.get_context("fork")
    stop = context.Event()
    helper = context.Process(target=release_model_cache, args=(model_path, stop), daemon=True)
    # Fork before importing numerical libraries or creating their worker threads.
    helper.start()
    try:
        yield
    finally:
        stop.set()
        helper.join(timeout=2)
        if helper.is_alive():
            helper.terminate()
            helper.join()
        if helper.exitcode != 0:
            raise RuntimeError("Could not release the public model file cache")


def transcribe(model_dir, audio_path):
    """VAD bounds each utterance; CTC token timestamps keep subtitles attached to real speech."""
    with bounded_model_loading(model_dir / "model.int8.onnx"):
        import numpy as np
        import sherpa_onnx
        recognizer = sherpa_onnx.OfflineRecognizer.from_sense_voice(
            model=str(model_dir / "model.int8.onnx"), tokens=str(model_dir / "tokens.txt"),
            num_threads=1, provider="cpu", language="zh", use_itn=True, debug=False,
        )
    config = sherpa_onnx.VadModelConfig()
    config.silero_vad.model = str(model_dir / "silero_vad.onnx")
    config.silero_vad.min_silence_duration = 0.4
    config.silero_vad.min_speech_duration = 0.25
    # Bound activation memory as well as audio buffering on the 768MiB service.
    config.silero_vad.max_speech_duration = 8
    config.sample_rate = SAMPLE_RATE
    config.num_threads = 1
    vad = sherpa_onnx.VoiceActivityDetector(config, buffer_size_in_seconds=30)
    captions = []
    window_start = 0
    valid_start = 0
    valid_end = float("inf")

    def collect():
        """Keep recognition content unchanged apart from display spacing and line-length grouping."""
        while not vad.empty():
            segment = vad.front
            offset = (window_start + segment.start) / SAMPLE_RATE
            length = len(segment.samples) / SAMPLE_RATE
            stream = recognizer.create_stream()
            stream.accept_waveform(SAMPLE_RATE, segment.samples)
            recognizer.decode_stream(stream)
            result = stream.result
            tokens = list(result.tokens)
            stamps = list(result.timestamps)
            if len(tokens) != len(stamps):
                raise ValueError("Recognition did not return aligned timestamps")
            text = ""
            begin = None
            previous = None

            def emit(end):
                """Flush only real timed tokens, with at most two readable subtitle lines."""
                nonlocal text, begin
                end = min(end, valid_end)
                if text.strip() and begin is not None and end > begin:
                    captions.append({
                        "id": str(uuid.uuid4()), "text": text.strip(),
                        "startMs": round(begin * 1000), "endMs": round(end * 1000),
                        "timestampMs": None, "confidence": None,
                    })
                text, begin = "", None

            for index, (token, stamp) in enumerate(zip(tokens, stamps)):
                if token.startswith("<|"):
                    continue
                word = token.replace("▁", " ")
                time = offset + stamp
                if not valid_start <= time < valid_end:
                    continue
                if text and (len(text + word) > 14 or (previous is not None and time - previous > 0.6)):
                    emit(min(time, (previous or time) + 0.45))
                if begin is None:
                    begin = time
                text += word
                previous = time
                next_time = offset + (stamps[index + 1] if index + 1 < len(stamps) else length)
                if word.endswith(("。", "！", "？", ".", "!", "?")):
                    emit(min(next_time, time + 0.45))
            if text:
                emit(min(offset + length, (previous or offset) + 0.55))
            vad.pop()

    with wave.open(str(audio_path), "rb") as source:
        if (source.getframerate(), source.getnchannels(), source.getsampwidth()) != (SAMPLE_RATE, 1, 2):
            raise ValueError("Expected mono 16 kHz PCM audio")
        total = source.getnframes()
        while window_start < total:
            end = min(total, window_start + MAX_WINDOW_SAMPLES)
            final_window = end == total
            valid_start = (window_start + (OVERLAP_SAMPLES // 2 if window_start else 0)) / SAMPLE_RATE
            valid_end = float("inf") if final_window else (end - OVERLAP_SAMPLES // 2) / SAMPLE_RATE
            source.setpos(window_start)
            remaining = end - window_start
            vad.reset()
            while remaining:
                block = source.readframes(min(config.silero_vad.window_size, remaining))
                if not block:
                    raise ValueError("Recognition audio ended before its declared duration")
                samples = np.frombuffer(block, dtype="<i2").astype(np.float32) / 32768
                remaining -= len(samples)
                if len(samples) < config.silero_vad.window_size:
                    samples = np.pad(samples, (0, config.silero_vad.window_size - len(samples)))
                vad.accept_waveform(samples)
                collect()
            # VAD's duration hint does not cap continuous speech; flush/reset the actual stream.
            # One second of shared context protects boundary words; token ownership meets at its midpoint.
            vad.flush()
            collect()
            if final_window:
                break
            window_start += MAX_WINDOW_SAMPLES - OVERLAP_SAMPLES
        duration_ms = round(source.getnframes() / SAMPLE_RATE * 1000)
    # Sample padding and VAD tails must never publish captions beyond the source.
    output = []
    for cue in captions:
        cue["endMs"] = min(cue["endMs"], duration_ms)
        if output:
            cue["startMs"] = max(cue["startMs"], output[-1]["endMs"])
        if cue["endMs"] > cue["startMs"]:
            output.append(cue)
    return output


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--model-dir", type=Path, required=True)
    parser.add_argument("--audio", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    result = transcribe(args.model_dir, args.audio)
    args.output.write_text(json.dumps(result, ensure_ascii=False), encoding="utf-8")
    os.chmod(args.output, 0o600)
