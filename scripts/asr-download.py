"""Install only fixed public model artifacts; incomplete or modified downloads never become active models."""
import hashlib
from pathlib import Path
import sys
import urllib.request

PREFIX = "https://huggingface.co/csukuangfj/sherpa-onnx-sense-voice-zh-en-ja-ko-yue-2024-07-17/resolve/2365baeacb507f821a0c8120fcee3d484dba7a07/"
FILES = [
    ("model.int8.onnx", PREFIX + "model.int8.onnx?download=true", "c71f0ce00bec95b07744e116345e33d8cbbe08cef896382cf907bf4b51a2cd51"),
    ("tokens.txt", PREFIX + "tokens.txt", "f449eb28dc567533d7fa59be34e2abca8784f771850c78a47fb731a31429a1dc"),
    ("test.wav", PREFIX + "test_wavs/zh.wav", "b77f1794fe374a0ba1ee1dc458bfaf9349496cbbfc32780c50ba3c5a7ad8e373"),
    ("silero_vad.onnx", "https://github.com/k2-fsa/sherpa-onnx/releases/download/asr-models/silero_vad.onnx", "9e2449e1087496d8d4caba907f23e0bd3f78d91fa552479bb9c23ac09cbb1fd6"),
]


def checksum(path):
    """Hash incrementally so installation does not load the entire model into memory."""
    digest = hashlib.sha256()
    with path.open("rb") as source:
        for block in iter(lambda: source.read(1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()


def install(directory, files=FILES):
    """Retry only public downloads, never user inference, with atomic checksum-verified activation."""
    directory.mkdir(parents=True, exist_ok=True)
    for name, url, expected in files:
        target = directory / name
        if target.exists() and checksum(target) == expected:
            continue
        part = directory / (name + ".part")
        for attempt in range(3):
            try:
                request = urllib.request.Request(url, headers={"Cache-Control": "no-cache"})
                with urllib.request.urlopen(request, timeout=180) as response, part.open("wb") as output:
                    for block in iter(lambda: response.read(1024 * 1024), b""):
                        output.write(block)
                if checksum(part) != expected:
                    raise ValueError(f"Checksum mismatch: {name}")
                part.replace(target)
                print(f"Verified: {name}", flush=True)
                break
            except Exception:
                part.unlink(missing_ok=True)
                if attempt == 2:
                    raise


if __name__ == "__main__":
    install(Path(sys.argv[1]))
