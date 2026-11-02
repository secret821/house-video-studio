"""No model/network needed: a VAD that ignores its limit must still produce bounded ASR streams."""
import contextlib
import hashlib
import importlib.util
from pathlib import Path
import sys
import tempfile
from types import SimpleNamespace
import unittest
from unittest.mock import patch
import wave

import numpy as np

spec = importlib.util.spec_from_file_location("asr_under_test", Path(__file__).with_name("asr-inference.py"))
asr = importlib.util.module_from_spec(spec)
spec.loader.exec_module(asr)


class ContinuousVad:
    def __init__(self, *_args, **_kwargs):
        self.samples = 0
        self.queue = []

    def accept_waveform(self, samples):
        self.samples += len(samples)

    def empty(self):
        return not self.queue

    @property
    def front(self):
        return self.queue[0]

    def pop(self):
        self.queue.pop(0)

    def flush(self):
        if self.samples:
            self.queue.append(SimpleNamespace(start=0, samples=np.zeros(self.samples)))

    def reset(self):
        self.samples = 0
        self.queue = []


class WindowingTest(unittest.TestCase):
    def test_continuous_speech_is_bounded_and_absolute_timestamps_survive_resets(self):
        lengths = []

        class Recognizer:
            def create_stream(self):
                def accept_waveform(_rate, samples):
                    lengths.append(len(samples))
                return SimpleNamespace(accept_waveform=accept_waveform)

            def decode_stream(self, stream):
                duration = lengths[-1] / 16000
                stamps = [index + 0.5 for index in range(int(duration))]
                stamps.append(duration - 0.25)
                stream.result = SimpleNamespace(tokens=["测试"] * len(stamps), timestamps=stamps)

        engine = SimpleNamespace(
            OfflineRecognizer=SimpleNamespace(from_sense_voice=lambda **_kwargs: Recognizer()),
            VadModelConfig=lambda: SimpleNamespace(silero_vad=SimpleNamespace(window_size=512)),
            VoiceActivityDetector=ContinuousVad,
        )
        with tempfile.TemporaryDirectory() as directory:
            audio = Path(directory) / "continuous.wav"
            with wave.open(str(audio), "wb") as output:
                output.setparams((1, 2, 16000, 0, "NONE", "not compressed"))
                output.writeframes(b"\0\0" * 322000)
            before = hashlib.sha256(audio.read_bytes()).digest()
            with patch.dict(sys.modules, {"sherpa_onnx": engine}), patch.object(
                asr, "bounded_model_loading", lambda _path: contextlib.nullcontext()
            ):
                captions = asr.transcribe(Path(directory), audio)
            self.assertEqual(len(lengths), 3)
            self.assertLessEqual(max(lengths), asr.MAX_WINDOW_SAMPLES)
            self.assertEqual([captions[index]["startMs"] for index in [0, 7, 14]], [500, 7500, 14500])
            self.assertEqual(sum(cue["text"].count("测试") for cue in captions), 21)
            self.assertTrue(all(left["endMs"] <= right["startMs"] for left, right in zip(captions, captions[1:])))
            self.assertEqual(captions[-1]["endMs"], 20125)
            self.assertEqual(hashlib.sha256(audio.read_bytes()).digest(), before)


if __name__ == "__main__":
    unittest.main()
