/** Install the tested macOS local avatar runtime into ignored project data only. */
import { execFile } from 'node:child_process';
import {
  existsSync,
  mkdirSync,
  readFileSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { resolve } from 'node:path';
import { promisify } from 'node:util';

const run = promisify(execFile);
const root = process.cwd();
const local = resolve(root, 'data/local-avatar');
const python = resolve(local, 'venv/bin/python');
const engine = resolve(local, 'SadTalker-main');
const sourceCommit = 'cd4c0465ae0b54a6f85af57f5c65fec9fe23e7f8';
const pins = readFileSync(
  resolve(root, 'scripts/avatar-requirements.txt'),
  'utf8',
)
  .trim()
  .split(/\r?\n/);
const files = {
  'checkpoints/SadTalker_V0.0.2_256.safetensors':
    'https://github.com/OpenTalker/SadTalker/releases/download/v0.0.2-rc/SadTalker_V0.0.2_256.safetensors',
  'checkpoints/mapping_00109-model.pth.tar':
    'https://github.com/OpenTalker/SadTalker/releases/download/v0.0.2-rc/mapping_00109-model.pth.tar',
  'gfpgan/weights/alignment_WFLW_4HG.pth':
    'https://github.com/xinntao/facexlib/releases/download/v0.1.0/alignment_WFLW_4HG.pth',
  'gfpgan/weights/detection_Resnet50_Final.pth':
    'https://github.com/xinntao/facexlib/releases/download/v0.1.0/detection_Resnet50_Final.pth',
};

// The official engine is Python; this small bootstrap avoids shell interpolation and global installs.
const download = String.raw`
import urllib.request,tarfile,pathlib,json,sys,concurrent.futures,hashlib
root=pathlib.Path(sys.argv[1])
commit=sys.argv[2]
files=json.loads(sys.argv[3])
engine=root/'SadTalker-main'
root.mkdir(parents=True,exist_ok=True)
def fetch(url,path):
    part=path.with_suffix(path.suffix+'.part')
    with urllib.request.urlopen(url,timeout=120) as response,part.open('wb') as out:
        while True:
            block=response.read(4*1024*1024)
            if not block:break
            out.write(block)
    part.replace(path)
if not (engine/'inference.py').exists():
    archive=root/'source.tar.gz'
    fetch('https://codeload.github.com/OpenTalker/SadTalker/tar.gz/'+commit,archive)
    with tarfile.open(archive) as source:
        for member in source.getmembers():
            destination=(root/member.name).resolve()
            if root.resolve() not in destination.parents or member.issym() or member.islnk():raise ValueError('Unsafe source archive')
        source.extractall(root)
    (root/('SadTalker-'+commit)).rename(engine)
    archive.unlink()
def install(item):
    relative,url=item
    path=engine/relative
    path.parent.mkdir(parents=True,exist_ok=True)
    if not path.exists() or path.stat().st_size<1000000:
        print('Downloading '+relative,flush=True)
        fetch(url,path)
    digest=hashlib.sha256()
    with path.open('rb') as source:
        for block in iter(lambda:source.read(4*1024*1024),b''):digest.update(block)
    return {'path':relative,'bytes':path.stat().st_size,'sha256':digest.hexdigest(),'source':url}
with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:manifest=list(pool.map(install,files.items()))
(root/'model-manifest.json').write_text(json.dumps({'source_commit':commit,'models':manifest},indent=2))
entry=engine/'inference.py'
source=entry.read_text()
if 'args.device = "mps"' not in source:
    expected='    else:\n        args.device = "cpu"'
    replacement='    elif torch.backends.mps.is_available() and not args.cpu:\n        args.device = "mps"\n    else:\n        args.device = "cpu"'
    if expected not in source:raise ValueError('Unsupported engine version for Apple GPU patch')
    entry.write_text(source.replace(expected,replacement))
patches={

'src/facerender/animate.py':[('target_semantics=target_semantics.to(self.device)','target_semantics=target_semantics.cpu()')],
'src/facerender/modules/make_animation.py':[('target_semantics_frame = target_semantics[:, frame_idx]','target_semantics_frame = target_semantics[:, frame_idx].contiguous().to(source_image.device)'),("predictions.append(out['prediction'])","predictions.append(out['prediction'].cpu())")],
'src/facerender/modules/util.py':[('mean.type()','mean'),('.type(type)','.to(type)')],
'src/facerender/modules/keypoint_detector.py':[('heatmap.type()','heatmap')],
'src/facerender/modules/dense_motion.py':[("kp_source['value'].type()","kp_source['value']"),('.type(heatmap.type())','.to(heatmap)')],
}
for relative,replacements in patches.items():
    path=engine/relative
    source=path.read_text()
    for before,after in replacements:
        if after not in source:source=source.replace(before,after)
    path.write_text(source)
print('Local model files ready',flush=True)
`;

if (process.platform !== 'darwin' || process.arch !== 'arm64') {
  throw new Error(
    '此安装脚本已在 Apple 芯片 macOS 验证；当前系统请使用已生成的开场视频。',
  );
}
mkdirSync(local, { recursive: true });
console.info('安装本机口播环境，约需2.2GB空间；人物照片不会上传。');
run(
  '/usr/bin/python3',
  ['-c', download, local, sourceCommit, JSON.stringify(files)],
  { timeout: 20 * 60_000, maxBuffer: 2_000_000 },
)
  .then(({ stdout }) => {
    console.info(stdout);
    if (existsSync(python)) return;
    return run(
      'uv',
      ['venv', '--python', '/usr/bin/python3', resolve(local, 'venv')],
      { timeout: 120_000 },
    );
  })
  .then(() =>
    run(
      python,
      [
        '-c',
        'import importlib.metadata,json,sys; pins=json.loads(sys.argv[1]); missing=[];\nfor pin in pins:\n name,wanted=pin.split("==");\n try: installed=importlib.metadata.version(name)\n except importlib.metadata.PackageNotFoundError: installed=None\n if installed != wanted: missing.append(pin)\nprint(json.dumps(missing))',
        JSON.stringify(pins),
      ],
      { timeout: 30_000 },
    ),
  )
  .then(({ stdout }) => {
    const missing: Array<string> = JSON.parse(stdout);
    if (!missing.length) return { stderr: '已复用现有本机依赖。' };
    return run(
      'uv',
      ['pip', 'install', '--python', python, '--no-cache', ...pins],
      { timeout: 20 * 60_000, maxBuffer: 2_000_000 },
    );
  })
  .then(({ stderr }) => {
    console.info(stderr);
    return run(
      python,
      ['-c', 'import imageio_ffmpeg; print(imageio_ffmpeg.get_ffmpeg_exe())'],
      { timeout: 30_000 },
    );
  })
  .then(({ stdout }) => {
    const binary = stdout.trim();
    const bin = resolve(local, 'bin');
    mkdirSync(bin, { recursive: true });
    if (!existsSync(resolve(bin, 'ffmpeg')))
      symlinkSync(binary, resolve(bin, 'ffmpeg'));
    writeFileSync(
      resolve(local, 'runtime.json'),
      JSON.stringify(
        {
          sourceCommit,
          platform: process.platform,
          architecture: process.arch,
          pins,
        },
        null,
        2,
      ),
    );
    if (!existsSync(resolve(engine, 'inference.py')))
      throw new Error('模型入口缺失。');
    console.info('本机口播引擎安装完成，可在网页中生成人物开场。');
  })
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : '安装失败');
    process.exitCode = 1;
  });
