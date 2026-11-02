"""Official Kokoro inference only; Node owns account paths, scheduling and media validation."""
import argparse
import hashlib
import os
from pathlib import Path
import re

REPO_ID = "hexgrad/Kokoro-82M-v1.1-zh"
REVISION = "01e7505bd6a7a2ac4975463114c3a7650a9f7218"
VOICE = "zf_001"
SAMPLE_RATE = 24000
MODEL_HASH = "b1d8410fa44dfb5c15471fd6c4225ea6b4e9ac7fa03c98e8bea47a9928476e2b"


def prepare(directory):
    """Only the explicit installation command may fetch public model assets."""
    from huggingface_hub import snapshot_download
    snapshot_download(
        repo_id=REPO_ID, revision=REVISION, local_dir=directory,
        allow_patterns=["config.json", "kokoro-v1_1-zh.pth", f"voices/{VOICE}.pt"],
    )
    model = Path(directory) / "kokoro-v1_1-zh.pth"
    with model.open("rb") as source:
        digest = hashlib.sha256()
        for block in iter(lambda: source.read(1024 * 1024), b""):
            digest.update(block)
    if digest.hexdigest() != MODEL_HASH:
        raise ValueError("Kokoro model checksum mismatch")


def phonemize(pipeline, text):
    """Split by punctuation and phoneme count before inference, never silently truncate narration."""
    for sentence in re.split(r"(?<=[。！？；.!?;\n])", text):
        if not sentence.strip():
            continue
        phonemes, _ = pipeline.g2p(sentence)
        if not phonemes.strip():
            raise ValueError("Text has no pronounceable phonemes")
        if "❓" in phonemes:
            raise ValueError("Text contains unsupported pronunciation")
        if len(phonemes) > 180 and len(sentence) > 1:
            midpoint = len(sentence) // 2
            yield from phonemize(pipeline, sentence[:midpoint])
            yield from phonemize(pipeline, sentence[midpoint:])
        else:
            yield phonemes


def synthesize(args):
    """Load only local files and concatenate every generated segment into 24 kHz PCM WAV."""
    import numpy as np
    import soundfile as sf
    import torch
    from kokoro import KModel, KPipeline
    from loguru import logger
    logger.remove()  # Upstream debug logs may include the complete narration.
    torch.set_num_threads(1)
    torch.set_num_interop_threads(1)
    model_dir = Path(args.model_dir)
    model = KModel(
        repo_id=REPO_ID, config=str(model_dir / "config.json"),
        model=str(model_dir / "kokoro-v1_1-zh.pth"),
    ).to("cpu").eval()
    english = KPipeline(lang_code="a", repo_id=REPO_ID, model=False)

    def english_phonemes(text):
        """Keep English terms in mixed Chinese copy instead of dropping them."""
        return " ".join(result.phonemes for result in english(text))

    chinese = KPipeline(lang_code="z", repo_id=REPO_ID, model=model, en_callable=english_phonemes)
    voice = str(model_dir / "voices" / f"{VOICE}.pt")
    text = Path(args.text_file).read_text(encoding="utf-8")
    chunks = []
    for phonemes in phonemize(chinese, text):
        result = next(chinese.generate_from_tokens(phonemes, voice=voice, speed=1.0))
        audio = result.audio.numpy()
        if not audio.size or not np.isfinite(audio).all():
            raise ValueError("Kokoro returned invalid audio")
        chunks.append(audio)
    if not chunks:
        raise ValueError("No speech generated")
    sf.write(args.output, np.concatenate(chunks), SAMPLE_RATE, subtype="PCM_16")
    os.chmod(args.output, 0o600)


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("mode", choices=["prepare", "synthesize"])
    parser.add_argument("--model-dir", required=True)
    parser.add_argument("--text-file")
    parser.add_argument("--output")
    arguments = parser.parse_args()
    if arguments.mode == "prepare":
        prepare(arguments.model_dir)
    else:
        os.environ["HF_HUB_OFFLINE"] = "1"
        os.environ["TRANSFORMERS_OFFLINE"] = "1"
        synthesize(arguments)
