# 验收记录

项目为全新房源视频工具，没有线上页面复刻目标，因此 origin.html、复刻对照截图与 Recreation Metrics O1/O2/O3/S1/S2/S3 均不适用。浏览器复查与实际视频验证另行执行。

## 已有证据

- 已在网页载入5个演示场景、生成5段中文单人解说、保存草稿、导出真实MP4。
- 第一条样片：1080×1920、30fps、33.152秒、H.264视频＋AAC双声道音轨，约20MB。抽取5个场景关键帧并逐一目视检查，房源照片、场景标题、字幕和底部信息均正常。
- 浏览器验证了真实图片上传、场景排序、解说修改后清除旧配音、横竖屏切换、直接切换、草稿刷新恢复、成片下载入口。排序测试发现的选中项跟随问题已修复并复测。
- 渲染器本机媒体跨端口读取问题已修复；仅本机GET/HEAD媒体请求允许跨端口读取，API写入仍严格检查Origin与Host。
- Lint、TypeScript、生产构建、Prettier均已运行通过；8项行为测试通过，覆盖转场总时长、解说不重叠、字幕分句、路径边界、文件类型混用、空场景、缺失素材、旧配音。

## 规则与合理例外

- 独立项目不引入科研工作台私有运行时。HTTP在本地业务API边界使用fetch＋Zod，ESLint使用公开TypeScript与React Hooks规则。
- UI采用主题token、40px按钮与输入框、24px表单间距和显式居中网格。媒体画布采用输出像素坐标系，视频内联样式及播放器比例为必要例外。
- 官方Skills原文带有Markdown行末空格，`.gitattributes`仅将下载的第三方Skills排除空白检查；自写源码继续执行`git diff --check`。
- 构建存在Zod上游注释及Remotion预览依赖包体积提示，不阻断构建。Player有Remotion许可提示；没有将许可要求隐藏为免费商用承诺。
- 本机文字配音仅验证macOS系统声音；其他系统的录音上传路径可用，但本轮未做跨系统实机测试。

## 最终复查

- 最终项目目录：`/Users/liu/Desktop/指南针/house-video-studio`，科研工作台业务源码未修改。
- 已在最终目录通过 `pnpm start` 启动生产版本，访问地址 `http://127.0.0.1:4317`。
- 最终 `pnpm verify` 全流程通过：图片上传与规范化、无效图片拒绝、音频上传、空场景拒绝、远程资源拒绝、跨站写入拒绝、中文配音、草稿保存、真实渲染、并发409、FFprobe编码检查与5场景抽帧。
- 最终任务：`014eb387-c79c-4b18-b3cd-8e5820915129`。MP4为33.152秒，1080×1920，30fps，H.264＋AAC双声道，20,898,400字节。`data/verification.json`记录实际元数据，`data/verified-project.json`保留对应输入。
- 样片快捷副本：`data/exports/house-tour-demo.mp4`。原始任务成片及网页下载入口均保留。
- 浏览器实测1280、1440、1600、390像素宽度；文档宽度均等于视口宽度，无横向溢出。H1实测28px，按钮及输入框实测40px。
- 浏览器最终MP4：`readyState=4`、1080×1920、33.152秒、`error=null`；通过原生控件播放，时间推进至5.49秒。已实际下载到本机Downloads目录。
- 最终生产版本未出现新的运行错误；日志中仍有Remotion许可提示，早期开发热更新与媒体跨域问题已修复。最终生产渲染服务无媒体跨域错误。
- 源码静态检查、Prettier、TypeScript、构建与8项测试通过；自写JSX超过6个静态原子类的问题均已改为clsx分组；git diff --check通过（第三方Skills按上文例外处理）。
- UI截图：`data/studio-desktop.jpg`。未做Windows/Linux实机、横屏MP4导出及公网多用户部署验收；横屏已完成浏览器预览检查。
- 自查结论：未发现可确认的阻断问题，可以交付本地单人使用。

## 人物口播开场增量验收（2026-10-24）

- 输入为用户第二张人物照片，去掉相册界面，保留本人及原背景；台词使用用户确认的40字开场。配音是本机通用普通话女声，没有克隆本人声音。
- 实际引擎为固定官方提交的SadTalker，隔离Python/PyTorch环境；安装器已运行通过并验证重复执行。Apple MPS兼容处理包括设备选择、张量类型转换、5D算子CPU桥接和长序列逐帧释放GPU张量。业务代码仍为React＋TypeScript。
- 模型完成任务 `214428bd-5dcd-4b88-82b3-2d07e06fc6ac` 的推理与原背景融合后，首次规范编码失败；修复完整FFmpeg二进制后，新任务 `ee166d8f-200f-4671-80f4-2326d051d705` 复用同输入的原始结果，完成实际编码及媒体检查。失败恢复入口仅对相同输入的失败任务生效。
- 独立口播样片为9.408秒、960×1402、25fps、H.264＋AAC，1,441,798字节；快捷副本 `data/exports/talking-opening-demo.mp4`。已目视检查0.6/3.2/7.2秒关键帧，嘴型、牙齿与眼睛状态发生变化，人物服装和原背景保留；浏览器原生控件播放到结尾，error=null。
- 完整视频任务 `cf89d119-29e5-45fc-b8ff-e49cda62c637` 已完成：42.581秒、1080×1920、30fps、1277视频帧、H.264＋AAC双声道，24,036,328字节。快捷副本 `data/exports/house-tour-with-opening-demo.mp4`；实际元数据和断言保存在 `data/opening-verification.json`。
- 已目视检查完整视频2秒、9.8秒、28秒关键帧：人物口播→客厅→厨房的内容、字幕和信息布局正常。浏览器成片readyState=4、error=null，通过原生控件播放到19.84秒；已验证实际播放推进，不仅检查下载入口。
- 开场修改台词会立即移除旧视频并禁止导出；刷新恢复已保存输入及结果，已在浏览器验证。API实测空台词400、远程照片400、重复生成409、口播生成中导出409。反向“成片渲染中生成口播”的409保护已实现，未单独执行该并发场景。
- 新增开场时间轴、仅开场、旧草稿兼容与输入边界用例；11项测试通过。Lint、Prettier、TypeScript及生产构建通过；最终视频模板改动后再次执行目标文件ESLint与生产构建通过。自写源码git diff --check通过。
- UI实测1280/1440/1600/390像素无横向溢出。最终生产版本控制台仅保留Remotion许可提示；早期objectFit样式警告已改为组件属性，最后一次刷新未再出现。最终截图 `data/studio-opening-final.jpg`。
- 生成仅驱动面部区域，身体/背景主要静止，256px面部模型融合后仍偏软；未达到实拍级自然程度。未验证其他系统、任意背景替换、声纹克隆或LatentSync推理。照片及配音均在本机处理，未上传云端。
- 实际完整渲染曾遇磁盘空间不足；关闭可重建的持久化webpack缓存并清理项目生成缓存后重新导出成功。新推理或渲染仍需预留足够磁盘空间。
- LatentSync仅完成官方资料评估：官方入口输入视频＋音频，当前代码使用CUDA；1.5最低8GB显存，1.6最低18GB。可作为后续GPU口型环节，尚未接入或做效果对比。依据：https://github.com/bytedance/LatentSync 及其 `scripts/inference.py`。

## 公司代理核对与文案升级（2026-10-25）

- 重新读取科研工作台入口规则、AGENT及全部5份mdc，以及独立项目规则；修改范围限独立项目。
- 已整理8张房源照片、逐镜事实文案及可导入项目，data/house-tour-v2/project.json通过现有契约校验，素材齐全，旧草稿没有覆盖。
- 使用用户提供的公司代理密钥查询/v1/models成功；可见180个模型。MiniMax-M2.5为文字输入输出，语音模型gpt-4o-mini-tts虽列出audio-speech，但实际POST/v1/audio/speech返回404；该结果不能当作配音已接通。目录未发现本轮需要的人物/口型模型。
- MiniMax-M2.5真实文字调用成功，569输入tokens、946输出tokens；按用户截图单价估算0.0091413元，实际以公司代理账单为准。8镜头id、顺序和文案长度已通过运行时校验，文案人工复核未发现新增面积、售价、产权、院子归属或墙面病因结论。
- 当前语音测试失败，没有新音频、人物视频或新完整成片；没有上传人物照，未假称完成。配音失败没有自动重试，也没有改用旧模型替代新模型。
- 公司代理配置仅保存本机.env.proxy，mode600；Git排除真实.env文件。代码、公开示例、生成文案和终端日志未包含密钥。
- 本轮没有可见UI改动，浏览器未复查；当前网页仍为原版本。非网页复刻，origin.html和O1/O2/O3/S1/S2/S3均不适用。

- 补充实测：gpt-4o-audio-preview通过聊天式音频调用同样返回404；已停止尝试，未生成任何音频。两条失败音频路径均记录在本机请求账本，没有盲目重复同一请求。
- 本轮目标ESLint、全项目Lint、TypeScript、生产构建、Prettier和12项测试通过；git diff --check通过。真实.env及私有data路径经Git忽略检查通过，已检查新增源码和文案不含密钥。

WEBSITE_RECREATION_VERDICT: Ship with caution

## 百炼直连最终验收（2026-10-25，当前版本）

- 实际模型：北京地域`qwen3-tts-flash`（Cherry/Serena试听，成片采用Cherry）＋`wan2.2-s2v`720P。账号可见模型目录已读取；Instruct版本真实返回404，Flash在官方标准DashScope域名实际成功，万相在业务空间北京域名实际成功。保留3条失败语音预留，不删除或伪造成功。
- 真实云生成：10段配音、1次人像检测、2版人物视频成功；累计16条付费操作记录（含3条失败语音记录）。按返回用量和公开价估算7.53712元，客户端保守预留21.638元；不是实际账单，未超过已授权30元/两版/12秒的测试限制。
- 成片：`data/exports/house-tour-cloud-v2.mp4`，69.547秒、1080×1920、30fps、H.264/AAC，人物片头＋8张用户房屋照片＋8段配音；独立片头`data/exports/talking-opening-bailian-v2.mp4`为4.366667秒、720×1048。完整片的API、流信息、时长与时间轴、各场景关键帧检查通过，结果在`data/verification.json`及`data/bailian-verification/final-mp4-check.log`。
- 首版声音相对原配音前移约0.19秒；第二版添加250ms头静音和150ms尾静音，并转为标准PCM WAV。第二版音频包络相关0.9910，有声起点0.1503秒、末端4.1386秒，保留原配音首尾；原录音上限11.6秒，含缓冲不超过12秒。证据在`opening-buffered-audio-qc.json`。口型与声音的主观自然度交由用户观看样片评价，不宣称达到实拍品质。
- 网页实际点击“重新生成 / 恢复百炼口播”成功复用完成结果：返回4.366667秒，云调用仍16条、人物仍两版、预留仍21.638元。证据在`browser-cache-reuse.json`。预览实际播放到后续房屋镜头，独立片头和最终MP4的浏览器readyState均为4，控制台未发现error；保留既有Remotion许可提示。
- 浏览器复查覆盖1280、1440、1600和390宽度；页面scrollWidth等于视口宽度，配置缺失时按钮禁用且提示明确，配置后入口可用；加载/任务进行时锁定编辑、完成后恢复。保留主题#56BEB2/#16B799、40px按钮、12/20辅助文字和既有工作台布局，未重做视觉系统。
- 本地第二版完整渲染曾在84%遇到write EPIPE退出；仅凭堆栈未确定根因。当时空间紧张，已保留失败记录，只清理该失败任务的临时目录，将本轮内容相同的重复MP4校验后改成硬链接。加入预计64MiB＋每秒2MiB的工作空间预检，渲染并发降为1，CLI成片别名采用硬链接＋原子rename。之后同一项目真实恢复导出并通过成片检查，未重新调用云端。
- 空间预检507分支未实际命中：系统可用空间增加后高于预计阈值，额外测试导出被停止并归档，不能记为507行为通过。预检逻辑已类型与Lint检查；真实恢复导出已通过。
- `pnpm lint`、`format:check`、`typecheck`（含build）、`build`、23项离线测试、目标文件ESLint及`git diff --check`通过。构建保留既有大chunk提示。测试使用隔离文件系统和模拟HTTP，不消耗云费用；另有本机TTS到MP4回归通过。
- Key只保存在`.env.cloud`（600）并经Git忽略；发现示例配置含实际Key后已清空，私有配置仍可用；源码、文档、前端构建及示例扫描未发现Key，证据`privacy-check.json`。人物照按用户既有明确授权上传至百炼，输入临时存储为私有且模型绑定；未发布公网。
- 读取规则：科研工作台`AGENTS.md`、`AGENT.md`、五份`.cursor/rules/*.mdc`及独立项目`AGENTS.md`，未修改科研工作台。沿用独立项目明确允许的fetch＋Zod业务请求边界和Promise链；媒体内联样式为既有画布例外，本轮未扩展此例外。
- 非网站复刻：O1/O2/O3/S1/S2/S3均N/A。已保留`data/bailian-verification/origin.html`、before.png、section-map.json（含素材映射）及浏览器截图。

WEBSITE_RECREATION_VERDICT: Ship with caution

## 单张文案与增量渲染验收（2026-10-25，本轮）

- 规则与实现范围：重新读取科研工作台AGENTS.md、AGENT.md、全部5份mdc及独立项目AGENTS.md。使用ai-coding-contract、technical-design、frontend-vertical-colocation、前后端规范、frontend-ui-guardrails和code-review；只修改house-video-studio。延续原方案授权直接实现，无新增依赖、云服务、数据库或阶段审批。
- 照片列表下新增当前照片的标题、解说文案、独立字幕编辑器。字幕留空/与原解说相同时沿用原解说；改字幕保留全部音频。解说改词保留旧音频供试听，但页面及服务端阻止过期配音导出。可明确选择仅此张百炼配音、本机免费配音、上传录音或移除旧配音。批量配音保留匹配的音频，不生成片头。
- 新增本地分段缓存和单张本机配音API；渲染复用现有API，按片头、照片主体和相邻转场划分真实时间轴。完整媒体对提交标记后才复用，内容摘要不符或标记缺失重新构建；中断已完成片段仍可复用。无变化时跳过编译/Chromium，直接本地拼接。模板身份同时用于内存编译包与磁盘缓存，避免模板变化命中旧编译包。空字幕覆盖按显示语义归一化，恢复原稿能复用旧草稿缓存。
- 真实首次缓存导出289f1c7a-c7f8-4ae7-b870-7e07ee7e7c05完成16段。浏览器选择第3张并只修改字幕，任务3db57bbb-d460-4608-89d5-d5df7d656064实际更新3段、复用13段；变化仅本段及相邻两个转场。媒体对照显示整片解码WAV字节相同，片头与第7张关键帧字节相同，第3张关键帧不同；全部原配音和人物开场引用一致。证据data/incremental-verification/media-comparison.json及changed-job.json。
- 原文案已恢复，含空字幕兼容修正后重启服务，任务31265a60-1849-4b20-9c26-8f1e115f9047更新0段、复用16段。最终MP4为69.533625秒、1080×1920、H.264/AAC，8照片/8配音；VERIFY_JOB完整API与MP4验证通过，浏览器readyState=4。旧成片未覆盖，原草稿语义一致。证据reused-job.json、final-report.json、final-mp4-check.log。
- 单张已有配音API实测直接复用；单张本机TTS实测成功（2.17秒），没有调用云端。预算文件SHA256前后完全一致，仍74b0f704a41888bc0e8ba31cbde032cc060b6ce6463cdab50461caee9a3db77e，本轮新增模型费用为0；没有新增人物视频或付费改词调用。
- 34项离线测试通过，覆盖精确帧分区、字幕/时长/重排/音乐/模板/素材的失效范围、空字幕恢复、未完成和损坏缓存、旧草稿兼容。全项目及定向ESLint、Prettier、TypeScript、生产构建、git diff --check通过；构建保留原有大包和Zod注释提示。code-review自查未发现可确认的阻断问题。
- 浏览器复查1280/1440/1600/390宽度均无横向溢出，新操作按钮高度40px，300字长文案不撑破页面。验证加载/生成期间禁用、改解说过期警告、配音保留、完成后恢复操作；控制台无error。沿用主色#56BEB2、hover#16B799、背景#FAFAFA、8px控件圆角、24px表单间距、14/24正文与12/20辅助文字；仅新增编辑器内聚到pages/studio，不引入共享层或新样式体系。媒体画布仍是既有内联样式例外，业务请求沿用目标仓库允许的fetch+Zod。
- 仍需区分：有音乐时后续时间移动的缓存失效由离线测试覆盖，本轮真实MP4为无背景音乐；本轮没有为新改词实发百炼收费请求，本机声音音质基础，人物自然度保持原样。缓存占用本地磁盘，不自动清理用户素材/历史结果。
- 源码/文档/构建/示例扫描未发现私有Key；测试字幕、长文本及改词均已恢复。非网站复刻，O1/O2/O3/S1/S2/S3均N/A；保留data/incremental-verification/origin.html、before.png、section-map.json（含素材映射）、布局记录和界面截图。

WEBSITE_RECREATION_VERDICT: Ship with caution

## Free two-video editing acceptance (2026-10-25, current delivery)

- Scope: independent /video-edit page, React + TypeScript + Remotion, local-only media processing. Re-read the workbench AGENTS.md, AGENT.md and all five mdc files, plus the target project's AGENTS.md. Only the independent video project was modified. Existing fetch/Zod, Promise chains, colocated page modules, Tailwind tokens and clsx groups remain in use. Frame-driven media canvas styles retain the existing inline-layout exception.
- Input: the full 9.518-second real talking opening is retained. Four selected chapters from the 40.267-second house recording make the final picture 1054 frames at 30fps (35.133 seconds; container 35.136 seconds). Output is 1080x1920 H.264/AAC stereo 48kHz, about 33MiB. Sources are 540x960; this does not restore native HD detail. No generated presenter or new speech was used.
- Final render job: 78882d36-349b-482a-babb-b282b3b5b06c. Validated aliases are data/exports/anfu-qianshuiwan-free.mp4 and anfu-qianshuiwan-cover.png (1080x1920). Social caption, optional re-recording script, cover copy and pinned comment are in data/video-edit/publish-copy.txt. No phone numbers are present. Facts are limited to user-supplied information.
- Visual QA: inspected final frames at 1, 10.5, 17.5, 24, 30 and 34 seconds. White/champagne overlays, property footer, short fades and closing card display correctly. Fixed previous-shot text bleeding through the closing card; the mixed-space final chapter has a neutral label. Music is locally synthesized, starts in the house section and fades in/out. House source audio is muted.
- Audio QA: decoded actual movie PCM correlates 0.999978 with the imported opening, lag 0 samples. Tour music correlation is 0.997468, lag 0 samples, gain 0.319458 (configured 0.32). These checks verify placement and gain, not subjective listening quality. The tool did not support audible input, so no subjective listening review is claimed.
- Zero new model/API calls or fees. Cloud budget SHA256 remains 74b0f704a41888bc0e8ba31cbde032cc060b6ce6463cdab50461caee9a3db77e; old photo draft SHA256 remains d91bf4772e69dd11f32281b83b3cef0eefb8a8620cb0a5f163e0fc23c51244a3. Remotion's existing commercial-license notice is preserved; zero model fees do not imply every company qualifies for a free software license.
- After the final backend restart, a real browser export produced job 76c9dae5-29c7-4cd3-b894-eddbc1477f6d with complete/reused=true and identical output paths, without rendering again. This new mode caches whole movies; existing photo-mode segment caching is unchanged. A concurrent photo render request received HTTP409 during a free render.
- 43 offline tests, full-project ESLint, TypeScript and production build passed. Tests cover real FFmpeg normalization/reuse, Chinese filenames, corrupt input, local asset boundaries, cut validation, missing/tampered media, failure recovery, music and timeline. Fixed an observed approximately 0.1-second normalized-audio tail. Build retains its existing large-chunk warning. Final formatting and diff checks are recorded alongside the test logs.
- Browser QA: 1280/1440/1600/390 widths have no horizontal overflow; action buttons are 40px. Invalid first-cut end=1 shows the minimum-two-second warning and blocks save/export; restoring 6.6 restores controls. A 96-character caption does not overflow the page; it was restored. Loading/submission locks, completion unlocks and refresh recovery were observed. Actual exported video readyState=4/error=null, with playback advancing to 22.395 seconds. Final bundle has no new console errors; only the existing Remotion license warning remains. Video uploads were tested through the local HTTP API, not a browser file chooser.
- Evidence: data/video-edit/verification contains origin.html, before.png, section-map.json with asset mapping, layout.json, studio-final.png, cache-reuse.json, final-job.json, final-report.json and six final keyframes. Recreation Metrics O1/O2/O3/S1/S2/S3: N/A (feature work, not a site recreation). Windows/Linux, arbitrary codecs and public multi-user deployment were not verified.

WEBSITE_RECREATION_VERDICT: Ship with caution

## 房产文案 Skills 参考验收（2026-10-25）

- 按用户明确要求全网检索，从原始 GitHub 与 OOMOL 公开正文核对候选。采用 skill-installer 安装 sales-talk-library（Apache-2.0，固定提交7a7bfb5b96bddafb12e91fa29cdf8e2cc84c21c5）与 real-estate-marketing（MIT，固定提交99f3455d59e5f3ce66cde3b193fac514e28399b8）；原文、配套文件和许可证均保留。
- 中文 fangchan-tanpan-copywriter 只取得公开 source.md，作为带作者/来源/校验值的内部参考快照，未取得附录3个参考文件，也未确认再分发许可证；未伪称完整安装。没有安装 OOMOL CLI、登录、执行上游脚本或调用其模型。
- 使用 skill-creator 创建本项目 house-tour-copywriting 入口，按实际素材、用户事实、短字幕与自然语速适配；不机械套用外国MLS、强制冲突、逼单或过长口播。附上浅水湾四段改写示例，明确是参考稿，未写入草稿或替换真人原声。AGENTS.md、README.md与SKILLS.md已链接入口，后续在本项目范围可发现，未全局安装。
- 三个 Skill 的 frontmatter 校验通过；7个上游文件的SHA256与下载字节一致，本地入口/索引链接通过。43项离线测试、ESLint、TypeScript、生产构建、格式和git diff检查通过；保留既有构建大chunk提示。
- 原照片草稿及云端预算的既有SHA256均保持不变；本轮没有新增模型/API费用，没有修改业务源码、当前视频草稿或成片。只是项目参考文件，不代表网页已经接入一键AI文案。浏览器未复查：无可见UI变更，未重渲染MP4。
- 来源、用途、版本、许可与完整性边界见SKILLS.md及.agents/skills/house-tour-copywriting/references/upstream-sources.json。Recreation Metrics O1/O2/O3/S1/S2/S3均N/A，非网页复刻。

WEBSITE_RECREATION_VERDICT: Ship with caution

## 原声讲解与底乐最终验收（2026-10-25）

- 用户要求保留视频原声讲解，音乐作底。免费模式默认开场原声100%、房屋原声100%、配乐8%；音乐全片铺底并首尾淡化。房屋有原声时，画面淡化不缩短或交叠声音；静音房屋段仍兼容原交叠淡化。自动分段改为整帧边界，避免小数边界累计多帧。
- 当前草稿补齐房屋0–40.266667秒连续范围，保留已有房源数值与字幕，不生成新讲解。真人开场9.518秒完整保留；最终1494帧/30fps，即49.8秒画面、49.813秒容器，1080×1920、H.264/AAC双声道48kHz、47,185,786字节。原片不修改，旧精剪输出仍保留在内容摘要路径。
- 真实本地任务053d577f-a22d-4a0b-9e92-bff22c204a70完成。交付 data/exports/anfu-qianshuiwan-original-audio.mp4；默认 anfu-qianshuiwan-free.mp4 与封面别名通过硬链接原子更新。项目备份和原声版配置分别在 audio-verification/before-project.json 与 project-qianshuiwan-original-audio.json。
- 实际成片与两条导入原声、音乐的PCM分量拟合通过：开场、开场到房屋、三个章节边界、完整房屋、片尾共7个窗口，相关性最低0.9999359，最佳滞后均0采样；原声增益0.99756–0.99881，音乐分量约为设定的0.997倍。开场原声整体高于配乐19.48dB，完整房屋原声整体高于配乐16.38dB（包括静音/环境声段，不声称每一时刻均为该比值）。左右声道解码峰值0.86594/0.86392，未达到满幅。
- 使用内置PCM16 WAV解码验证；内置FFmpeg不支持裸f32le封装或pcm_f32le编码，未安装新依赖。上述证据核对声轨内容、连续性与音量，不等于主观听审，工具仍无可听音频输入。
- 浏览器原生播放器实际完整播放至49.813秒，ended=true、readyState=4、error=null；页面显示开场/房屋原声100%、音乐8%，导出期间锁定、完成后恢复。1280/1440/1600/390宽度无横向溢出，按钮40px；最终构建仅保留既有Remotion许可提示，未出现新增error。检查片尾48.5秒关键帧，无上一镜字幕透出。
- 浏览器再次导出，任务1dd492ca-238d-4399-b873-ab41314fde38完成且reused=true、输出路径相同，没有重新渲染。45项离线测试、目标及全项目ESLint、TypeScript、生产构建、格式与git diff检查通过；构建仍有既有大chunk提示。
- 预算与旧照片草稿的既有SHA256完全不变，本轮模型/API费用为0。修改仅限独立视频项目；已读取入口/AGENT/五份mdc与项目规则，沿用Promise链、现有请求边界和媒体画布内联布局例外。README、AGENTS、plan及旧版文案示例的时间码适用范围已同步。
- 证据位于 data/video-edit/audio-verification：origin.html、before.png、before-project.json、studio-final.png、section-map.json（素材映射）、layout.json、wide-layout.json、current-job.json、cache-reuse.json、final-report.json、PCM与关键帧。Recreation Metrics O1/O2/O3/S1/S2/S3均N/A，非网页复刻。未做Windows/Linux或其他输入格式验收。

WEBSITE_RECREATION_VERDICT: Ship with caution

## Animal Island 页面风格重构（2026-10-25）

- 用户授权两页风格重构。指定本地库目录不存在，接入公开 animal-island-ui 2.3.0（安装包声明 MIT）及 naive-icons 1.7.0，移除已无引用的 lucide-react。入口只导入一次库样式；沿用 React/TypeScript、Tailwind 和 pages/studio 内聚结构，没有新增请求或改动媒体模板、服务契约、后端业务。
- 两页统一为暖米色背景、棕色文字、胶囊按钮/输入、丝带标题；Button、Input、Select、Checkbox 使用库的公开 API。采用 icon 属性避免图标在文字内部换行；长中文操作允许换行。视频播放器和原片画面配色独立。保留原生文件/范围输入、多行文本和媒体选择列表；文件输入可获得键盘焦点并继承 fieldset 禁用。
- 实际浏览器验证照片页375/1280/1920、实拍页375/1920。两页375和1920时 documentElement.scrollWidth 均等于视口宽度。发现库默认侧开菜单在375px越界，增加工作室局部的移动端定位覆盖（仅布局，因库内联定位使用有说明的!important）；修复后照片菜单横向范围38–154px，实拍菜单38–198.63px。测试键盘展开/选择/Escape、输入值同步、字幕开关、导航和导出期间禁用，复原临时编辑，没有保存测试文案。浏览器错误日志为空。
- 从新界面实际触发照片导出，任务50931ef2-9885-45c5-8bb0-687597fab90c完成，更新0段/复用16段。ffprobe验证1080×1920、H.264/AAC、69.533625秒；ffmpeg实际解码前5秒成功；浏览器成片readyState=4、无媒体错误。未调用付费生成服务。
- lint、format:check、typecheck、build通过，45项测试通过。构建仍有大chunk和既有Zod注释提示；库完整样式与内置中文字体会增加静态资源，未为此扩大到拆包或依赖升级。范围自查未发现阻断问题；未实发收费生成、未重新上传原素材。
- 证据位于data/ui-island：origin.html、origin-theme.css、before.png、after.png、两页375/1920全页截图，以及包含模块与素材映射、媒体信息和指标的section-map.json。O1元素完整、O2内容准确、O3响应式、S2交互、S3事实约束通过；S1按用户要求的海岛风改版验收，不宣称原页面像素还原。

WEBSITE_RECREATION_VERDICT: Ship

## 主封面使用片尾文案（2026-10-25）

- 主封面与片尾共用PropertySummary静态卡片，包含“预约实地看房”、安福·浅水湾、总价59万、3楼/128.65㎡/精装修、另带柴草间、私信约看及核实说明。只在片尾包装帧驱动淡入，避免封面第0帧透明；保持已有画布内联样式例外。没有增加字段、接口、依赖或视频开头片段。
- 实际本地任务ba85348f-4bc8-4e11-8c1b-6f6ec9f3e161完成，输出free-tour-76b60df09b77f5584d967397af89baabff90dce014e7395514efe5c91e50884b.mp4及同摘要封面。封面1080×1920，已目视核对完整文字、无裁切；成片1494帧/30fps、49.8秒画面、49.813秒容器、H.264/AAC双声道48kHz。
- 新旧成片解码为48kHz双声道PCM16 WAV后SHA256完全一致；1、23、47、48.5秒四个关键帧解码PNG字节一致，包括片尾淡入。免费草稿、旧照片草稿和云端预算的SHA256与本轮基线一致，未调用付费模型。既有整片缓存因模板更新重新本地渲染，未宣称仅渲染封面；原内容摘要输出保留，默认视频与封面交付别名原子更新。
- 浏览器确认最新封面加载成功、自然尺寸1080×1920，下载链接均指向新任务；成片readyState=4、duration=49.813、error=null。1280与390宽度无横向溢出；仅有既有Remotion许可提示，无新增error。检查保留100%/100%原声、8%配乐。未重复全片主观听审；本轮用音轨逐字节一致核对。
- 目标与全项目ESLint、format:check、typecheck、build、git diff --check通过，45项测试通过。既有构建大chunk及Zod注释提示仍存在；自查未发现可确认问题，可以推进。只修改视频模板与直接相关文档，没有修改相邻科研工作台或其他页面源码。
- 证据位于data/video-edit/cover-verification：origin.html、before.png、before-template.tsx、before-sha.json、current-job.json、final-report.json、studio-final.png、section-map.json与解码音频/关键帧；核验脚本data/video-edit/verify-cover.mts。Recreation Metrics O1/O2/O3/S1/S2/S3均N/A，本次非网页复刻。未做其他房源长文本或Windows/Linux验收。

WEBSITE_RECREATION_VERDICT: Ship with caution

## 上传人物开场视频验收（2026-10-25）

- 当前网页照片模式用MP4/MOV上传开场替代人物照、台词、开场录音和云端生成入口；复用已有本地视频上传API和编码流程。250MB内，开场最长60秒；上传成功自动保存，失败保留原开场，移除后可从照片开始。照片解说配音及独立实拍剪辑继续使用原流程。没有新增依赖或云端调用。
- 契约新增opening.source可选枚举，旧草稿缺字段保留旧生成样式。上传开场不添加AI标识、暗色渐变和旧台词字幕。来源加入缓存身份，避免相同文件切换来源时复用错误画面。页面不再获取或轮询人物生成任务；旧素材、历史CLI及预算保留。
- 浏览器实测上传已有真人开场视频成功（规范后9.5秒），草稿刷新恢复，预览无AI标识；损坏MP4返回明确错误且原开场不变；移除后显示可选开场空态，未保存移除时刷新恢复。375px/1920px下文档宽度等于视口，无横向溢出。
- 本地测试快照为上传开场＋一张3秒房源照片，无音乐、无额外配音。任务f1b9ac1a-96ad-4889-8262-0b6bc2c0015f实际完成2段，H.264/AAC、1080×1920、12.500313秒。逐帧检查开场无AI标识与旧字幕、10.5秒已进入照片。前9.4秒解码声音与上传视频对比相关0.99962，最佳时差0秒，原声保留。测试快照不覆盖原照片列表和实拍草稿，验收后恢复原照片草稿。
- lint、format:check、typecheck、build通过；48项测试通过，包括上传开场契约往返、60秒边界、旧草稿、来源切换缓存失效等。既有测试的“尚未生成”错误文案断言同步为“尚未就绪”。构建保留既有大包提示。README、AGENTS与plan已按当前操作方式同步，明确网页尚无自动识图/视频生成房源文案能力。
- 证据在data/upload-opening-verification：修改前源码/草稿与截图、uploaded-project.json、render-project.json、测试日志、任务、probe.json、开场/照片关键帧、原声解码WAV与audio-report.json、手机及宽屏截图。云端预算SHA256保持74b0f704a41888bc0e8ba31cbde032cc060b6ce6463cdab50461caee9a3db77e。
- 非网站复刻：Recreation Metrics O1/O2/S1/S3为N/A；O3与S2按本次功能范围通过浏览器验收。范围自查未发现阻断问题；真实超大/超长视频未重传，时长上限及非法文件由契约测试和真实损坏文件覆盖。

WEBSITE_RECREATION_VERDICT: Ship

## 配置封面默认在视频最前（2026-10-25）

- 上轮只同步独立PNG，实际MP4首帧仍是人物，页面video也未绑定poster；用户指出并明确要求配置封面默认置前。本轮在免费实拍模板最前添加36帧/1.2秒同一封面，原真人开场和房屋片段整体后移，保留全部原声，不新增接口、字段、开关或付费调用。Player、渲染元数据、淡化和底乐使用同一时间轴，原生导出播放器poster绑定任务封面。沿用媒体画布内联样式例外，Tailwind及请求边界不变。
- 实际任务f02eab2a-17e5-4337-9f4a-d6391022fa20完成。输出free-tour-30ce1492dd443ec0955786f1e406431532ddd95f1be569123412e90b4a7c9b06.mp4及同摘要封面。成片1530帧/30fps，51.0秒画面、51.008秒容器、1080×1920、H.264/AAC。data/exports/anfu-qianshuiwan-cover-first.mp4作为独立交付名，原默认别名同步更新；保留原49.8秒内容摘要输出，未覆盖源片。
- 实际解码第0帧和第35帧与封面RGB像素的PSNR分别42.408/42.431dB（H.264有损压缩）；第36帧已进入真人画面，PSNR8.790dB。已目视核对首帧文字和真人衔接。1.2秒封面不是仅页面poster，也不是一帧闪过。
- 8个原声/音乐拟合窗口覆盖封面到口播、口播到房屋、三个房屋章节、完整房屋和片尾。最低相关性0.9999334，最佳滞后均0采样；原声增益0.99748–0.99873，底乐为设定的0.99496–0.99841倍，解码单声道峰值0.79462。两段完整原声保持100%，配乐8%连续铺底，封面期间有底乐、人物声音从1.2秒开始。该检查不等于主观听审。
- 浏览器确认预览0秒直接显示指定封面，导出播放器绑定同一封面，实际MP4可播放到51.008秒：ended=true、readyState=4、error=null。1280和390宽度无横向溢出；仅既有Remotion许可提示，无新error。最新下载链接指向本轮内容摘要。
- 目标及全项目ESLint、format:check、typecheck、build通过，git diff --check通过。免费视频专项12项测试全部通过，包括空项目不插封面、短开场的封面独立时段、原声完整与静音交叠兼容。全量测试47/48通过：范围外server/security.test.ts仍断言“尚未生成”，当前照片模块错误提示为“尚未就绪”，未为本轮封面修改无关测试或模块；构建保留既有Zod注释与大chunk提示。人工复核本轮差异未发现阻断问题。
- 免费草稿及云端预算SHA256与本轮基线一致。照片草稿在处理期间出现范围外更新，当前SHA256为299342363e31808d9e3fdea25f93bf14a6d7a9a48810f0f3e691c770ebd5fabd；本轮未写入、还原或覆盖该草稿，未把它记作未变化。仅在目标视频项目实施，科研工作台未修改。
- 证据位于data/video-edit/first-frame-verification：origin.html、before.png、before-template.tsx、before-timeline.ts、before-page.tsx、before-tests.ts、before-sha.json、current-job.json、final-report.json、cover-frames-report.json、首帧/衔接帧、preview-first.png、export-poster.png、browser-playback.json、tests.log与video-edit-tests.log。核验脚本verify-embedded-cover.mts与verify-cover-frames.mts均在data/video-edit。AGENTS、README、plan已记录封面置前默认行为及51秒时长。Recreation Metrics O1/O2/O3/S1/S2/S3均N/A，本轮是视频封面功能修复，非网页复刻；未验证Windows/Linux或其他平台自动选封面策略。

WEBSITE_RECREATION_VERDICT: Ship with caution

## 百炼画面文案接入（2026-10-25）

- 用户授权先接入阿里百炼免费额度方案。新增qwen3.7-flash照片/视频关键帧文案接口与共享页面建议面板；照片只发送当前图片和房源事实，视频每段本机抽两帧，最多12段，不发送人物开场、音轨或联系信息。生成、预览、采纳分离，不自动改原文、配音或导出。输入变化隐藏旧建议，复用相同输入及实际图片字节的缓存。
- 服务器固定北京业务空间官方端点、Key仅在服务端；复用云任务锁、120秒超时、不自动重试，检查输出字段、数量和镜头顺序，并拦截未提供的阿拉伯数字。该检查不能证明全部事实，页面要求用户核对后采纳。只接受本地媒体路径并核对真实视频时长，抽帧临时目录结束即清理。
- 未确认免费额度时按钮禁用，接口也要求显式true确认。程序无法读取免费余额或代设用完即停，必须在百炼控制台核实后由用户主动生成；未设置可能按量计费。真实账号仅执行只读模型目录检查，qwen3.7-flash可见；未发送真实推理请求，不能据此宣称生成质量或额度验证通过。既有云预算账本未改变。
- 浏览器在独立临时数据目录、4322端口和完全拦截的模拟模型网络中验收：照片及视频建议均显示“离线验收”，采纳前不改标题，采纳后生效；重复请求命中缓存；事实变化隐藏建议；视频采纳保留片段起止。模拟响应不代表真实识图结果。照片采纳后从页面实际导出3秒1080×1920 H.264/AAC MP4，并目视解码帧确认字幕与标题。375/1920宽度均无页面横向溢出。
- 已返回4317正式页面，确认配置提示、未勾选状态与禁用按钮；1280宽度无溢出。未在正式页面触发推理或采纳；照片草稿与基线一致，视频草稿仅新增coverSeconds=1.2（兼容默认封面时长），其余字段与基线一致。lint、format:check、typecheck、build、test全部通过，最新全量55/55。构建仍有既有Zod注释和大chunk提示。范围内人工复核未发现阻断问题；真实模型端到端生成仍待用户核实免费额度后验收。
- 背景音乐来源已从server/video-edit-music.ts核对：本机数学合成64秒立体声音轨，没有下载歌曲或录音，也不调用百炼；可上传自己的配乐。封面逻辑只读核对：从房屋视频靠前位置截帧，使用用户房源字段固定模板排字，本机输出PNG并在MP4最前展示，时长由页面设置；没有自动挑最佳画面或手动选帧。
- 证据：data/copy-verification内origin.html、before.png、after.png、section-map.json（含资源映射）、四张响应式截图、render-job.json、probe.json、accepted-copy.mp4与accepted-frame.png。Recreation Metrics O1/O2/S1/S3=N/A（本轮是功能接入，非网站复刻），O3/S2=pass。

HARNESS_DOCS_STATUS: Updated
HARNESS_REVIEW_VERDICT: Ship with caution
WEBSITE_RECREATION_VERDICT: Ship with caution

## 无蒙层艺术字封面与可调时长验收（2026-10-25）

- 按用户参考图调整实拍主封面：取消暗色蒙层，直接在真实画面上叠加粗斜体白色黑描边小区名、红色白描边总价及醒目房源信息。使用现有系统字体、文字描边/阴影和轻微倾斜，不新增字体依赖或生成图片；不复用参考图品牌、水印或房源承诺。片头与独立PNG使用同一组件，片尾保留原版式及相同房源字段。媒体画布内联样式属于现有例外，没有修改页面主题或其他业务模块。
- 增加coverSeconds契约：0.5～10秒、默认1.2秒，Zod请求/响应边界兼容旧草稿；字段在房源信息区编辑、保存，时间轴按30fps取整后同时用于预览、渲染和音乐总长。无效值会提示检查剪辑设置，保存/导出禁用；完整原片与原声顺延，不新增接口或付费调用。
- 实际浏览器输入0.2秒显示最小时长错误并禁用导出；改2.3秒预览总长52.1秒，保存刷新仍为2.3秒。恢复1.2秒后从页面实际发起免费导出，任务390451eb-5be0-45bd-8922-721614df78d9完成。导出时字段禁用，完成后恢复。1280与390宽度无横向溢出，当前播放器与下载封面均指向新任务。
- 主输出free-tour-9ac80594bfcbf9c7442b56e21008982fa3b0edc9a55a4580ba76152989e4c02f.mp4及同摘要封面。1530帧、51.0秒画面、51.008秒容器、1080×1920、H.264/AAC双声道48kHz。交付anfu-qianshuiwan-art-cover.mp4/png，原默认别名同步更新，旧内容摘要文件和原始素材保留。
- 实际MP4第0/35帧与新PNG的RGB PSNR为38.596/38.676dB，第36帧进入口播；已目视核对描边大字、无遮挡原背景和文字无裁切。独立Sharp参考图与Chromium封面在无文字顶部区域的RGB均值差为-0.203/-3.605/-3.467（255满幅），按独立解码/缩放2%满幅均值容差核验，不宣称逐像素相同；初次采用2级阈值过严，已记录为比较方法调整，没有修改背景图来迎合检查。
- 新旧51秒成片解码为48kHz双声道PCM16 WAV后字节完全一致；2.2/24.2/49.7秒原内容关键帧相似性检查通过。原声100%/100%、底乐8%不变，免费草稿只增加coverSeconds=1.2，其他字段的原始序列化摘要与基线一致；云端预算摘要不变。
- 另外用实际Remotion渲染2.3秒输入：Composition总1563帧/52.1秒，第68帧与独立封面高度一致（RGB PSNR101.018dB，存在极少像素舍入差异，非逐像素完全相同），第69帧已变为真人画面。只渲染边界两帧，没有重复导出第二部整片或改变当前保存值。
- 全项目ESLint、format:check、typecheck、build及git diff --check通过，55项离线测试全部通过，新增旧草稿默认值、时长上下界、短/长封面完整保留原片的用例。构建保留既有Zod注释及大chunk提示。复核本轮差异未发现可确认阻断问题；未验证Windows/Linux字体效果、任意长标题及其他平台自动选封面策略。未做主观听审，音轨使用字节一致性核验。
- 证据在data/video-edit/art-cover-verification：origin.html、before.png、baseline-map.json、源码基线、before-sha.json、studio-final.png、section-map.json、invalid-duration.json、duration-reload.json、current-job.json、final-report.json、custom-duration-report.json、首帧/边界帧、音轨和检查日志。核验脚本data/video-edit/verify-art-cover.mts与verify-custom-cover.mts。Recreation Metrics O1/O2/O3/S1/S2/S3均N/A，本轮为视频封面与时长配置，非网页复刻。

WEBSITE_RECREATION_VERDICT: Ship

## Next.js 与 rules 迁移（2026-10-25）

用户授权将项目改用 Next，并参考 FigGenius 代码规范增加 rules。只读参考其 AGENTS、目录/组件/Tailwind/API/设计系统规则与 Next 配置；本项目采用 Next 16.4.3 App Router、src/app 薄入口和 src/features/studio 业务聚合。原公共 Zod 契约、Express 本机 API、Remotion 模板和 data 路径保持兼容；新增六份 rules 并更新 AGENTS、README、plan。Vite 入口和依赖移除，Tailwind 改为 PostCSS；开发 .next-dev 与生产 .next 分离。现有未提交改动保持，未改参考仓库。

已执行验证：

- lint、format:check、typecheck、build；Next 生产构建成功生成 /、/video-edit 和框架 404。
- 完整离线测试 62/62 通过（data/next-migration/tests.log）。首次因磁盘不足有两项空间预检阻断，清理本轮失败的 Next 可重建缓存后重跑通过；未清用户素材/成片。
- 生产 4318 与开发 4319：两个路由直达 HTTP 200；生产浏览器双向导航和刷新读取旧草稿；375px 两页 scrollWidth=375、图片无损坏，1920px 桌面预览正常；浏览器无 error，只保留既有 Remotion license 提示。
- 真实 HTTP：未知 API 返回 JSON 404，跨站 save-draft 返回 403，演示图片 Range 返回 206。没有通过验收写入用户草稿。
- 生产 API 实际创建三秒演示图导出任务 b7883bbc-6076-4325-bc6e-3d73fe577541：本地更新 1 段，复用 0 段。ffprobe 确认 H.264、AAC、1080×1920、30fps、3.000313 秒；解码第 1 秒画面并人工查看正常。输入/结果/探测/抽帧位于 data/next-migration。未调用任何付费模型。
- 两份原草稿和云预算 SHA1 均与迁移前记录一致；源片与原成片未删除。验收新增独立测试任务，因此照片页“最近导出”可显示测试片；草稿内容未改变。

范围评审：按 code-review、前后端规范复核薄入口、客户端边界、Next handler 前的安全/媒体/API 顺序、生产 BUILD_ID 检查、端口占用失败、依赖及锁文件和运行方式，未发现可确认的迁移问题。保留自定义 Express 服务是为了复用上传和长任务；不能直接 next start，也不启用 standalone/static export。没有为迁移新增数据库、队列、云服务或第二套 API。

未覆盖：没有重新调用付费云服务，也没有重新导出整段用户实拍长片。原视频模板未因迁移改变，真实本地短片导出与原实拍播放器已核查。磁盘仍紧张，长片沿用现有空间预检。

Recreation Metrics：O1/O2/O3/S1/S2/S3 均 N/A，本任务为应用框架与规则迁移，没有目标站复刻或视觉相似度评分。保留原 HTML 于 data/next-migration/origin.html；结构为页头/房源编辑/预览/设置，素材沿用原 public、media、exports 映射。浏览器验证如上。WEBSITE_RECREATION_VERDICT: Ship（迁移范围）。
