"""Administrator-only pinned public Nano assets; Debian-compatible CPU runtime built from fixed source."""
import json
from pathlib import Path
import platform
import runpy
import shutil
import subprocess
import sys
import tarfile

common = runpy.run_path(str(Path(__file__).with_name('asr-download.py')))
install_files = common['install']
checksum = common['checksum']
RUNTIME_ID = 'fun-asr-nano-runtime026-cpu3-microbatch256-failclosed-v1'
MODELS = [
    ('funasr-encoder-f16.gguf', 'https://modelscope.cn/models/FunAudioLLM/Fun-ASR-Nano-GGUF/resolve/master/funasr-encoder-f16.gguf', 'f92f91d01a24fbed6c863495b2ee8c6a6788144a02858b75743f0946668de8a2'),
    ('qwen3-0.6b-q8_0.gguf', 'https://modelscope.cn/models/FunAudioLLM/Fun-ASR-Nano-GGUF/resolve/master/qwen3-0.6b-q8_0.gguf', '819f385dc0e035dccc3d9e7edaf6b7b044b8ba7ace63cbcbf84c7e397eecbf27'),
    ('fsmn-vad.gguf', 'https://modelscope.cn/models/FunAudioLLM/fsmn-vad-GGUF/resolve/master/fsmn-vad.gguf', '1270f2559c495f4e7b6e739541151027d360761a3fda43fc147034f5719f5479'),
]
SOURCES = [
    ('funasr.tar.gz', 'https://api.github.com/repos/modelscope/FunASR/tarball/runtime-llamacpp-v0.2.6', 'ceafca4994c28a01e5d2f7a748a82058b991e691348f532b3295eccc7e2dce8e'),
    ('llama.tar.gz', 'https://api.github.com/repos/ggml-org/llama.cpp/tarball/803b7fcae893e9caaee3921779628fef83ac0965', '5b810519e514951e2d15c47040682314c3482b5b69c6cf1da3dd40c25b1dd479'),
]


def patch_runtime(path):
    """Small reviewed resource/error patch; stop if upstream source does not match the pinned layout."""
    text = path.read_text()
    replacements = [
        ('ggml_backend_cpu_set_n_threads(be,8);', 'ggml_backend_cpu_set_n_threads(be,3);'),
        ('cp.n_ctx=2048; cp.n_batch=2048; cp.n_ubatch=2048;', 'cp.n_ctx=2048; cp.n_batch=2048; cp.n_ubatch=256; cp.n_threads=3; cp.n_threads_batch=3;'),
        ('int r=llama_decode(ctx,b); n_past+=n; return r;', 'int r=llama_decode(ctx,b); if(r!=0){fprintf(stderr,"decode failed\\n");exit(2);} n_past+=n; return r;'),
        ('        if(srt_mode){', '        if(!llama_vocab_is_eog(vocab,tk)){fprintf(stderr,"transcript token limit reached\\n");return 2;}\n        if(srt_mode){'),
    ]
    for before, after in replacements:
        if text.count(before) != 1:
            raise ValueError('Pinned Nano source no longer matches the reviewed patch')
        text = text.replace(before, after)
    path.write_text(text)


def extract(archive, directory):
    directory.mkdir(parents=True, exist_ok=True)
    with tarfile.open(archive) as bundle:
        bundle.extractall(directory, filter='data')
    roots = list(directory.iterdir())
    if len(roots) != 1 or not roots[0].is_dir():
        raise ValueError('Unexpected source archive layout')
    return roots[0]


def install_runtime(directory):
    target = directory / 'bin/llama-funasr-cli'
    manifest = directory / 'bin/runtime.json'
    identity = f'{platform.system()}-{platform.machine()}'
    if manifest.exists() and target.exists():
        saved = json.loads(manifest.read_text())
        if saved.get('id') == RUNTIME_ID and saved.get('platform') == identity and saved.get('sha256') == checksum(target):
            return
    if identity != 'Linux-x86_64':
        raise RuntimeError('Nano production installation requires Linux x86_64; build and validate other platforms separately')
    if not {'avx2', 'fma', 'f16c', 'bmi2'}.issubset(set(Path('/proc/cpuinfo').read_text().split())):
        raise RuntimeError('This Nano CPU build requires AVX2, FMA, F16C and BMI2')
    if not all(shutil.which(command) for command in ('cmake', 'g++', 'make')):
        raise RuntimeError('Install public build prerequisites first: cmake, g++, make (administrator action)')
    cache = directory / 'public-downloads'
    install_files(cache, SOURCES)
    build = directory / 'build'
    # This directory is installer-owned public source only, never business media or runtime models.
    if build.exists():
        shutil.rmtree(build)
    funasr = extract(cache / 'funasr.tar.gz', build / 'funasr')
    source = funasr / 'runtime/llama.cpp'
    llama = extract(cache / 'llama.tar.gz', build / 'llama')
    patch_runtime(source / 'fun-asr-nano/funasr-cli/funasr-cli.cpp')
    output = build / 'output'
    subprocess.run(['cmake', '-S', str(source), '-B', str(output), f'-DFETCHCONTENT_SOURCE_DIR_LLAMA={llama.resolve()}',
                    '-DCMAKE_BUILD_TYPE=Release', '-DGGML_NATIVE=OFF', '-DGGML_AVX2=ON', '-DGGML_FMA=ON',
                    '-DGGML_F16C=ON', '-DGGML_OPENMP=OFF'], check=True, timeout=120)
    subprocess.run(['cmake', '--build', str(output), '--target', 'llama-funasr-cli', '-j2'], check=True, timeout=900)
    target.parent.mkdir(parents=True, exist_ok=True)
    shutil.copyfile(output / 'bin/llama-funasr-cli', target)
    shutil.copyfile(funasr / 'LICENSE', target.parent / 'LICENSE-FunASR')
    shutil.copyfile(llama / 'LICENSE', target.parent / 'LICENSE-llama.cpp')
    target.chmod(0o755)
    manifest.write_text(json.dumps({'id': RUNTIME_ID, 'platform': identity, 'sha256': checksum(target)}))
    shutil.rmtree(build)


if __name__ == '__main__':
    model_dir = Path(sys.argv[1]).resolve()
    install_files(model_dir, common['FILES'][:3] + MODELS)
    install_runtime(model_dir.parent)
