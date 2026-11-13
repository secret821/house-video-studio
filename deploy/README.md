# 宝塔部署

腾讯云新站`http://106.54.221.18`的单容器部署、账号迁移与验收状态见 [Docker部署](docker/README.md)。旧阿里云systemd/宝塔服务继续保留，本页后续发布记录属于旧机；不得将新4核服务器的Compose限额套用到原2核2GiB机器，也不自动停止旧站。

当前腾讯云正式版为 2026-11-13 的 `house-video-studio:20261113-f6979c7`，封面来源与四种样式可独立选择，新版人物封面及片内默认标题同步调整；此前工作室模块重组、房源截图 OCR、MySQL 账号/草稿和本地媒体运行时继续沿用。下文“本地候选”描述仅指旧阿里云机器当时的历史状态。最新发布、回退与验证见 [Docker 部署](docker/README.md) 和 [验收记录](../docs/verification.md)。

2026-11-06 的微信竖屏文字避让版 `house-video-studio:20261106-wechat-safe` 曾按用户授权切换至正式服务；切换清空了此前的临时任务与成片，稳定上传原片保留。候选验收及正式检查见 [Docker 部署](docker/README.md)。

## 磁盘维护

2026-10-30 已独立安装每日维护timer，正式主应用未切换、未重启。服务器根分区约40G、已用22G、可用17G；业务目录54M，验收目录1.2G、发布包5.3G。临时模式已开启，近7天未见temporary-media清理错误。七份已完成且无运行进程的验收data已标记，合计约345MiB，从标记起至少保留7天；含软链接的环境外壳保持。首次与补标记后的维护均成功且零删除，后续执行以journal实际结果为准。容量保护仍为本地候选，不宣称线上已生效。

存储容量保护、只读盘点、每日维护安装与回滚见 [storage-maintenance.md](storage-maintenance.md)。业务文件仍由应用按2小时空闲清理；每日维护只删除标记完成且至少保留7天的独立验收目录，不操作账号data、登录、模型或发布包。维护脚本可独立安装，不需要重启工作室；容量保护代码须随应用候选验证后部署，未发布前不会在线上生效。

## 2026-10-31 水印与原声字幕上线

当前正式版本为 `/opt/house-video-studio/releases/20261031-watermark-subtitles`，2026-10-31 04:01:22 +08:00切换。以render-optimization冻结源码为基线，只覆盖水印控件/契约/视频模板/缓存和ASR内存及片尾修复，不混入本地存储/云调用候选。Next构建 `RlIPVLm_imjay0YYQFXuN`，Next和两套视频包同包重建；Linux依赖仍链接smart-clean发布树，不可删除依赖目标。

管理员在 `/opt/house-video-studio/runtime/asr`独立安装官方Python 3.11.14、锁定sherpa-onnx/numpy与校验摘要的公开SenseVoice INT8/Silero模型；执行 `pnpm setup:asr` 真实中文离线自检后启用。目录由root:housevideo持有，目录/可执行0750、普通模型与ready文件0640，应用只读，不更改系统Python。业务音轨与缓存仍在账号临时workspace。水印支持默认、自定义、清空关闭；字幕仍需用户逐份识别、校对并明确采纳。

新增唯一drop-in `asr.conf`：设置 `STUDIO_ASR_DIR=/opt/house-video-studio/runtime/asr`，覆盖ExecStart为独立Node22的 `node --expose-gc --max-old-space-size=192 --import tsx server/index.ts --production`。1CPU/768MiB限额不变；识别获得媒体单槽后释放闲置Sharp缓存/Node内存，Linux加载模型时只回收该只读公开模型的重复文件缓存。PCM每窗最多8秒、重叠1秒，按重叠中点分配token时间，保留源片绝对时序；派生WAV按容器时长截取，避免AAC填充造成片尾字幕越界。原音文件与原声播放不改动。

完整候选完成短片、600秒中文片、连续讲话、两账号隔离/排队/取消、原生/混合照片/照片模式MP4。600秒识别约109.426秒，连续60秒约18～19秒；整控制组峰值805306368字节、failcnt27297、oom_kill0、NRestarts0。failcnt是触限/回收压力计数，不是任务失败计数；仍明确说明资源紧张，不保证未知长片。切换前两账号全部任务空闲，7天登录跨升级与认证/Origin保护通过。完整公开样片及浏览器证据见 `artifacts/watermark-subtitles-release-2026-10-31/verification.md`。

只备份current/unit配置元数据与认证/代理摘要至 `backups/watermark-subtitles-20261031`，不备份或回放会话/业务文件。回滚将current原子切回 `releases/20261031-render-optimization`，仅撤除本次 `asr.conf`，daemon-reload后只重启house-video-studio；恢复旧384MiB Node堆，保留smart-clean/compositor、认证、实时登录摘要和临时模式。重启仍清空临时媒体，草稿保留。不得恢复旧会话或删除依赖链接目标。

## 2026-10-31 合成优化上线

前一正式版本为 `/opt/house-video-studio/releases/20261031-render-optimization`，2026-10-31 00:09:01 +08:00按用户明确授权切换，切换前两账号上传、视频生成及智能清理均空闲。新增 `compositor.conf` 仅设置 `STUDIO_COMPOSITOR_DIR=/opt/house-video-studio/runtime/compositor`；运行时固定摘要、许可证及真实叠加自检通过，由root持有、housevideo组只读。保留1CPU/768MiB、原smart-clean和7天登录摘要，认证、Nginx、主unit摘要未变，不启用其他本地候选能力。

发布范围仅四个已验收后端文件，沿用智能清理版本的Next、src/public、视频包、package/lock及Linux依赖，构建ID `h_dKePLxSEEtNhfT8O9v4`、视频包指纹 `c02651d2ee27e45733fa3de93a0ac220412003761715cf31e5ada0b65583b62a` 不变并经过运行期匹配检查。旧 `20261030-smart-clean` 是当前资源/依赖链接目标，不能删除。发布内附管理员安装脚本，可执行 `STUDIO_COMPOSITOR_DIR=/opt/house-video-studio/runtime/compositor node --import tsx scripts/setup-compositor.ts`；冻结的package没有新增pnpm脚本，完整新源码安装才使用 `pnpm setup:compositor`。

正式两账号登录跨升级保持、退出确认/旧标签/Origin/私有路径校验通过。公开13.2秒样片真实上传并新生成1080×1920/30fps、396帧、H264/AAC48k MP4，耗时63.263秒，优化路径已使用；与候选解码音轨及0/36/126关键帧一致。控制组峰值680730624字节（约649.2MiB），failcnt=0、NRestarts=0。线上浏览器连接超时；HTTP页面、静态资源与两账号API通过，未冒称线上浏览器验收。完整报告见 `artifacts/deploy-render-optimization-2026-10-31/verification.md`。

仅备份配置元数据/摘要到 `backups/render-optimization-20261031`，不备份业务或会话。回滚原子切回 `releases/20261030-smart-clean`，仅移除本次 `compositor.conf`，daemon-reload后只重启house-video-studio；保留smart-clean、认证和实时会话。回滚重启同样清空临时媒体，不恢复旧会话快照。正式验收目录 `verification/render-optimization-20261031` 只保存公开测试片与报告；现有账号临时测试媒体按2小时规则清理。

## 2026-10-30 智能清理上线

智能清理上线版本为 `/opt/house-video-studio/releases/20261030-smart-clean`，2026-10-30 13:55:05 +08:00按用户明确授权切换。Next构建 `h_dKePLxSEEtNhfT8O9v4`，两套视频包摘要 `c02651d2ee27e45733fa3de93a0ac220412003761715cf31e5ada0b65583b62a`；Linux独立安装锁定的生产依赖，没有复制macOS node_modules。检测模型经过固定SHA256校验和真实离线推理，持久安装在 `/opt/house-video-studio/runtime/smart-clean`，模型及ready标记由root持有、housevideo组只读；正式服务新增drop-in `/etc/systemd/system/house-video-studio.service.d/smart-clean.conf`，仅设置 `STUDIO_SMART_CLEAN_DIR`。不安装尚未验收的ASR/Kokoro模型，也不提高原有内存或CPU限制。

候选使用独立测试账号、临时data和4344端口；人物/黑场测试片清理约29.443秒，清理副本原声解码采样长度与原片一致，输出重新检测无问题区间，实拍与照片模式均完成实际1080P MP4。单核/768MiB控制组峰值694378496字节（约662MiB），failcnt=0、NRestarts=0；只证明本次短样片，不保证真实长片峰值。切换前两正式账号均无活动任务；切换后两账号7天登录跨升级保留、智能清理ready、认证/Origin/草稿410/私有路径校验通过。正式账号配置、Nginx和原systemd主unit摘要保持；没有迁移本机房源媒体或复制会话文件。候选服务已停止，测试数据不迁入正式工作室。

回滚元数据在 `backups/smart-clean-20261030`，不含业务媒体或会话快照。回滚时把current原子切回 `releases/20261027-auth-guard`，移除本次唯一新增的 `smart-clean.conf` drop-in，daemon-reload后仅重启house-video-studio。保留实时登录摘要、认证配置、临时模式及其他服务；重启仍按现有规则清空临时素材。上线报告在 `verification/smart-clean-20261030`。本次浏览器自动化连接超时、原生窗口权限不可用，因此线上页面仅通过HTTP/两账号接口验证；本地同构建的桌面与375窄屏浏览器证据见 `artifacts/smart-clean-2026-10-30`，未虚报线上浏览器验收。

原声识别运行说明以上方现役发布段落为准。发布包必须包含 `scripts/asr-inference.py`、`scripts/asr-download.py`、`scripts/setup-asr.ts`、`scripts/asr-requirements.txt`；Linux重新创建虚拟环境，不能复制macOS环境。重新安装时使用Python 3.10～3.13，指定 `ASR_BOOTSTRAP_PYTHON` 和持久 `STUDIO_ASR_DIR` 后运行 `pnpm setup:asr`；须以新代码对应ASR_ID完成离线自检才写ready，不能手改标记跳过检查。每次更改识别窗口/时间戳实现须升级缓存身份，修改共享视频契约还须重建Next及两套视频包。模型更换或运行配置变化后，按原资源限制重新验收，失败不得擅自提高上限。

Kokoro配音当前仅为本地候选，尚未发布。候选包须额外包含 `scripts/kokoro-inference.py`、`scripts/setup-kokoro.ts` 和 `scripts/kokoro-requirements.txt`。管理员准备Python 3.10～3.13，执行 `pnpm setup:kokoro`，用 `STUDIO_KOKORO_DIR` 指向独立持久目录，服务用户需有读取模型及写入词典缓存权限；模型不放入临时业务data。Linux仅安装CPU版PyTorch，不复制macOS虚拟环境。须在现有768MiB限制下完成中文单张/批量、视频排队、账号隔离和真实MP4候选验收并记录峰值/OOM后才能发布；本轮未提高资源上限。未安装或自检失败时配音禁用，原声和上传录音仍可使用。

下述宝塔发布清单当时不含房源截图 OCR，旧阿里云站点仍不提供该功能。腾讯云 Docker 正式镜像现已包含 `scripts/property-ocr.py`、`scripts/setup-ocr.ts`、`scripts/ocr-requirements.txt` 及 Linux OCR 模型，中文离线自检、长截图与媒体排队的候选验收见 [验收记录](../docs/verification.md)。其他 Linux 环境须用 Python 3.10～3.13 重新安装并自检，不能复制 macOS 虚拟环境。

本项目是按账号隔离的文件存储工具，不使用ImageForge数据库。发布目录为`/opt/house-video-studio/releases`，`current`指向当前版本；业务文件仅在`shared/data/temporary/session-*`按账号临时保存（2小时空闲清理，重启清空），私有百炼配置为`shared/.env.cloud`。上线空工作室，不打包本机data、原片、历史成片或.env文件。

本机执行完整验证、`pnpm build`及`pnpm build:video`，只打包`.next`（排除cache）、`.video-bundles`、`src`、`server`、`public`、`deploy`、package.json、pnpm-lock.yaml、next.config.mjs、tsconfig.json和next-env.d.ts。Linux服务器须重新安装生产依赖，不能复制macOS node_modules；tsx为自定义服务器的生产依赖。上传至新的时间戳release后执行`bash deploy/stage-baota.sh <release绝对路径>`。脚本安装独立、校验摘要的Node22，准备Remotion浏览器，使用独立housevideo用户和systemd服务；不会替换全局Node或修改现有应用。

2GB服务器不在生成时编译视频模板：systemd设置`PREBUILT_VIDEO_BUNDLES=1`，使用与视频源码、共享契约和锁文件摘要匹配的预编译包，缺失或过期直接报错。修改这些文件后须重跑`build:video`；不能只上传源码。单任务单渲染线程，基础unit的Node堆上限384MB，现役ASR drop-in收紧为192MiB并开启--expose-gc；媒体缓存256MB（Remotion最低240MB），视频帧缓存64MB。缓存限制并非进程总内存上限；长视频和并发仍须按机器资源验收。systemd将主进程及Chromium/FFmpeg子进程放在同一控制组，MemoryLimit=768M、CPUQuota=100%、OOMScoreAdjust=500；资源超限时仅中断本服务；浏览器草稿保留，重启后临时素材需重传。停止服务使用KillMode=control-group，避免遗留渲染子进程。

可选原生叠加运行时：管理员在目标Linux环境执行 `STUDIO_COMPOSITOR_DIR=/opt/house-video-studio/runtime/compositor pnpm setup:compositor`，完成固定摘要、许可证及真实叠加自检后，将目录设为root:housevideo，目录/二进制0750、许可证/ready标记0640。仅给该服务增加同名环境变量，不替换系统或Remotion媒体工具；它只读取应用生成的YUV/PNG。未安装或校验失败会走兼容路径，出现异常先核对安装目录、标记和二进制摘要，禁止临时改用系统FFmpeg。启用前用独立data、原1CPU/768MiB完成实际MP4验收，发布仍需明确授权及空闲检查；回退恢复旧release并撤掉本次compositor环境变量，保留原smart-clean、认证、会话及资源配置。2026-10-30的候选已于2026-10-31按上文上线；原候选证据见 `artifacts/render-optimization-2026-10-30/verification.md`。

服务管理使用`systemctl status/restart house-video-studio`及`journalctl -u house-video-studio`，开机自启。原ImageForge继续由原PM2管理。首次从本轮候选PM2迁移时只移除`house-video-studio`候选，不能重启整个PM2。

Chromium需要Linux运行库和中文字体；应先检查ldd、fc-list并安装缺失的发行版包。服务仅监听127.0.0.1:4340。PUBLIC_ORIGIN为准确的外部来源，不能设通配符或通过删改Origin请求头绕过校验。Nginx只转发到loopback，必须固定Host为公网Host（当前121.41.6.73）；禁止传入127.0.0.1或客户端任意Host，否则外部媒体请求会混入渲染例外。页面/API/media/exports由Express会话保护，不能仅隐藏页面按钮。当前目标为HTTP IP，正式机密传输应使用域名与HTTPS；改域名时同时修改PUBLIC_ORIGIN和代理中的固定Host。

正式登录采用`STUDIO_AUTH_CONFIG=/opt/house-video-studio/private/auth.json`，文件root:housevideo、0640，父目录root:housevideo、0750，应用只有读取权限。单账号配置兼容username、随机salt及64字节scrypt摘要；多账号为accounts数组，每项增加稳定workspaceId。不能进入构建包。首次可用管理员持有的原凭据JSON执行`node --import tsx scripts/configure-login.ts <原凭据JSON> <私有输出路径>`，输出不会覆盖已有文件或打印密码。该脚本不负责修改账号密码；原凭据私下交付。会话自登录时起7天过期，每账号最多32个会话，退出立即撤销，重启继续有效。正式unit必须设置`STUDIO_SESSION_STORE=/opt/house-video-studio/private/sessions/sessions.json`，应用拥有独立sessions目录（0700），文件0600原子写入，仅保存票据SHA-256摘要、到期时间、账号及凭据指纹。账号配置仍由root持有只读；会话文件不能放入data或媒体备份，不受2小时清理影响。损坏、权限过宽或不可写时拒绝启动/写入，不能伪报成功；修改密码/移除账号后重启会撤销旧票据。首次升级前的内存会话需重新登录一次，此后重启不退出；每账号每分钟最多10次登录尝试。Cookie设置HttpOnly、SameSite=Strict、Path=/，HTTPS来源下启用Secure；浏览器存储不保存密码或Token。

先用SSH隧道验证：未登录页面303到/login、API/媒体401、登录后200、跨站写入403、退出后旧Cookie401、Range媒体、真实视频上传、照片混合、实际MP4和下载。内部渲染只能通过准确127.0.0.1 Host读取media/demo，不能读取API和exports。百炼仅确认配置就绪，不因部署自动消耗推理额度。服务器会运行新渲染，不迁移macOS本机语音能力。

121.41.6.73首页于2026-10-26经用户确认切换为房源视频工作室；原ImageForge服务和域名入口保留。登录页版本目录为`/opt/house-video-studio/releases/20261026-login`。后续切换前仍须备份现有IP站点的反代文件、systemd配置和current指向。登录页切换时先让新应用启用会话保护，再移除旧Basic代理；不能先去掉认证。将proxy.conf装入同一反代位置，nginx -t成功后再reload。只切换IP站点，不停止imageforge-ai或修改其数据库及ai.imageforge站点。

回滚登录页版本时，先恢复`backups/login-before-proxy.conf`的Basic代理并test/reload，再恢复`backups/login-before.service`、current指向`releases/20261025T154800Z`，daemon-reload后重启房源服务；这样不会出现无认证窗口。两版本使用同一shared/data，不清空素材。更早的ImageForge反代仍保留在`backups/ip-proxy-before.conf`，目标反代文件为`/www/server/panel/vhost/nginx/proxy/121.41.6.73/f4ae2aa053d8e07d344cb970a150474a_121.41.6.73.conf`。不得在验收失败时清理原服务或原数据。

macOS打包必须去除资源分支和扩展属性，例如 `COPYFILE_DISABLE=1 tar --no-xattrs --exclude='.next/cache' -czf /tmp/house-video-release.tar.gz .next .video-bundles src server public deploy package.json pnpm-lock.yaml next.config.mjs tsconfig.json next-env.d.ts`。发布前检查候选`src`中没有`._*`元数据文件；这些伪源码会使预编译模板摘要校验失败。候选服务的PATH也须与正式unit一致，包含独立Node和pnpm目录。界面构建验证通过后仍须实际生成MP4，不能只读取上次缓存文件作为新部署验收。

上一轮界面版本为`/opt/house-video-studio/releases/20261026-ux`。仅回退这次界面时，依据`backups/ux-before-current.txt`把current切回`releases/20261026-login`并重启house-video-studio即可，继续使用Cookie登录；不恢复Basic、不改Nginx、不清空shared/data。切换前后的数据摘要在`backups/ux-data-before.sha256`与`ux-data-after.sha256`，本次完全一致。更早的登录功能回滚才使用上文login-before的反代/服务备份。

上一轮上传修复版本为`/opt/house-video-studio/releases/20261026-upload-fix`（2026-10-26，用户明确授权上线），包含手机HTTP标识兼容、视频导入资源限制和上传等待/超时修复。Next构建ID为`46JVyBC88UDO2Lh3kKoAP`，两套视频包指纹为`f88594071c58ccf9c1bd3b31d6a53065c78e750117a35ddb8663dc6dc596519c`。依赖清单与锁文件和ux版本完全相同，复用该版本的Linux node_modules，不能删除仍被新版链接的ux目录。私有认证和百炼配置、Nginx与正式systemd配置保持原样，shared/data切换前后摘要一致。

历史版本回滚依据`backups/upload-fix-20261026/current.txt`，把current切回`releases/20261026-ux`并只重启house-video-studio；无需改Nginx或恢复Basic。该备份目录只保留配置元数据；旧data.tar.gz及业务数据摘要已按授权删除，不能据此恢复旧业务文件。版本重启使现有会话失效，手机需重新登录。部署验收使用`verification/upload-20261026`独立data，合成4K素材和新MP4未迁入正式工作室；验收临时服务已停止。

上一轮取消修复版本为`/opt/house-video-studio/releases/20261026-upload-cancel`，Next构建`kARgbm-z_ghGNLTDVH_-R`，两套视频包指纹`1a346788e4a3cbf28e2c92a06b13a66eecdc6c86966294e80353aa26fcb13e20`。单个视频从接收开始统一5分钟超时，取消或断线会终止整组pnpm/CLI/FFmpeg，清理完成后释放上传占用。新增受既有登录/Origin保护的GET上传状态和POST按id取消接口，两个编辑器共用状态及底部取消按钮，可跨设备取消当前任务。上传仍是请求内的短生命周期任务，不写入持久队列；重启由systemd控制组停止子进程。

回滚本轮时依据`backups/upload-cancel-20261026/current.txt`切回`releases/20261026-upload-fix`并只重启工作室。备份只保留service、proxy.conf等配置元数据；data.tar.gz及旧业务数据摘要已按授权删除。Nginx和正式unit未改，不恢复Basic、不覆盖上线后的草稿。新版Linux依赖仍链接旧发布目录，必须保留upload-fix及其引用的ux目录。候选cancel-20261026使用独立测试数据，真实取消/重传/MP4验收通过后已停止临时服务；实体手机继续由用户测试。

上一轮运行版本为`/opt/house-video-studio/releases/20261026-upload-fast`，Next构建`2vSvry8IzZxCpu8foW6PJ`。兼容的SDR H.264/4:2:0、30fps、方形像素、零起始和无旋转视频，在尺寸限制内直接封装视频流，音频处理和缩略图保留；不满足条件继续转换。视频导入使用已固定Remotion 4.0.538导出的RenderInternals二进制定位与权限检查，直接运行同一FFmpeg/FFprobe，避免每步启动pnpm和CLI；没有新系统FFmpeg依赖，也没有硬编码平台node_modules路径。升级Remotion时需一起验证这个固定版本边界，不能单独替换库。5分钟截止、进程组终止、断线清理及原CPU/内存控制保持生效。缓存版本v4，旧草稿和媒体仍可读。

回滚依据`backups/upload-fast-20261026/current.txt`切回`releases/20261026-upload-cancel`，只重启工作室，不改Nginx、不清空shared/data。该目录仅保留unit/反代等配置元数据；data.tar.gz及旧业务数据摘要已按授权删除。依赖仍来自旧发布的Linux树，保留fast所链接的cancel、upload-fix和ux目录。候选fast-20261026的数据与诊断私有样本不迁入正式工作室；私有样本保存在服务器受限verification/performance-20261026内，没有下载至本机或上传云服务。

多账号管理员操作：准备管理员私有的新增账号JSON（username/password），在候选release执行`node --import tsx scripts/add-account.ts <现有auth.json> <新增私有凭据JSON> <新的私有输出JSON>`。脚本保留原哈希并分配稳定UUID，拒绝重名且不覆盖输出。账号标识用于临时目录及浏览器草稿命名，不复制旧业务数据。配置备份后由root设root:housevideo/0640，父目录0750，以同文件系统rename原子替换；应用不得写认证文件，凭据不得进入构建包、日志或README。

前后端和unit须同包切换：session新增username/workspaceId/temporaryMedia/mediaSessionId，上传phase新增waiting，多账号业务API必须带X-Studio-Workspace并与Cookie一致；旧页面须刷新；7天会话版本起服务重启保留登录，临时素材仍清空。业务当前草稿按账号/模式自动覆盖保存：localStorage存JSON，IndexedDB存当前引用素材Blob，新建替换且不保留历史；服务器save-draft为410、get-draft仅空模板。浏览器清理数据/换设备不会同步草稿。过期或重启后优先从当前浏览器备份通过既有校验上传接口恢复素材；没有本地备份的旧素材须重传。生成202/任务编号返回后执行独立于浏览器，服务进程仍须持续运行；服务重启继续沿用中断失败语义。VERIFY_JOB验收还需VERIFY_PROJECT指向浏览器手工导出的草稿JSON。

正式unit必须设置`STUDIO_TEMPORARY_MEDIA=1`，公网缺配置拒绝启动。磁盘临时目录为shared/data/temporary/session-*/<id>，不放/run等tmpfs；启动清理上个进程目录。账号2小时无实际使用后清理，每分钟检查；状态轮询不续期。上传/导出队列、运行任务和媒体流持有清理保护；不能删除运行中任务目录。模板包/进程锁为不含业务媒体的_control目录。登录配置保留，临时模式禁用依赖持久预算账本的付费生成功能，避免清理账本后重置旧授权；不因部署发模型请求。照片解码/生成准备/导出FIFO单槽，不提高768MiB/一个CPU核限制。视频上传不占重型槽，5分钟只覆盖接收与信息校验，轻量探测槽一次1个FFprobe，独立30秒截止。

切换前确认正式任务空闲，停止候选和正式服务后，按用户本次明确授权清空旧shared/data业务文件、历史data备份及verification中的业务媒体，不建立新的旧业务data备份。只备份认证、current、unit和Nginx配置；不得触碰其他项目、数据库、密钥或原服务。此清理不可从本服务恢复。新代码/认证/unit切换失败须撤回服务并排查，不能恢复已授权删除的数据或自动改回旧的持久上传行为。Nginx固定Host、Origin和认证文件权限保持不变。

上一轮运行版本：`/opt/house-video-studio/releases/20261026-accounts-memory`，基于已验收的`20261026-accounts-temporary`，只补充server/index.ts、copy.ts和video-edit-music.ts三份服务器文件。两者前端源代码/DTO/依赖均相同，线上沿用Next构建`fVEoMuVIULQDgXJ7dW1TY`和视频包指纹`865f48d85a484e9be45cf126556972669b06448d4677a85db8a5f29490b054db`；本机最终全量构建也已通过。配乐在接收请求前于_control中合成一次，账号只复制确定的音轨；照片在multipart缓冲前排队，画面提取/文案流程同样受媒体槽控制，防止第二个账号的解码内存挤占导出。图片优化共享缓存入口/_next/image已关闭，产品使用原生img/video。

账号临时版本的清理已执行：旧shared/data业务文件、明确授权的upload-fix/upload-cancel/upload-fast三份data.tar.gz、旧校验清单及验证目录中的旧媒体已删除，未创建新的业务data备份。私有账号配置未删，lhh已加入；正文不能记录密码。旧业务数据不可从本服务恢复。最初的源码归档下载被自动审批拒绝，未导出源码；删除备份经用户补充明确授权后执行。新账号交付文件仅含用户名和初始密码，不是含盐/哈希的认证配置。

本次资源补丁回滚可依据`backups/memory-20261026/current.txt`切回`releases/20261026-accounts-temporary`并仅重启本工作室，保持现有两账号配置及STUDIO_TEMPORARY_MEDIA=1；重启会清空临时素材，浏览器草稿保留。不得退回upload-fast等旧持久上传版本继续接收业务文件。需要撤回账号/临时模式时先停服务再调整，不恢复已删除的数据。保留依赖链接所指向的upload-fast、cancel、upload-fix和ux Linux树；不要因旧业务备份已删而删除仍被链接的运行依赖。

上一轮运行版本：`/opt/house-video-studio/releases/20261027-upload-original`，已通过两账号空闲检查并完成切换。本轮将视频转码/音量处理/缩略图移到生成成片时，上传只原子接收原片和读取元数据；实拍与照片开场共用准备逻辑。原片单份准备15分钟截止、解码与编码各1线程；上传保留5分钟超时和按id取消。新响应支持source-UUID.mp4、固定video-pending.svg及可选preparation字段，旧import路径保持兼容。前后端必须同包发布，旧页面需刷新后重新登录。Next构建`16HCSIuY6f4TY5IClW2iU`，两套视频包指纹`2ca62de90ff9a36a71760cf9bb12734005c09f15709a59a702c50c2aa784efa1`。依赖/锁文件未变，仍复用accounts-memory的Linux依赖链接；保留它及其依赖指向的旧release。

候选original-20261027使用独立临时data、测试账号和端口4344，在768MiB/单核限制下完成原片字节比对、A生成期间B上传、两种模式新MP4、缓存复用与4K HEVC验收。4K样片仅2秒/约30KB合成文件，loopback上传校验0.111秒、生成51.728秒；这不是手机网络上传速度或长片性能承诺。单线程候选内存峰值690429952字节（约658MiB），failcnt=0、NRestarts=0，长片与复杂画面仍可能触达资源上限。

正式切换前确认两个账号无活动上传/生成，仅备份current和unit元数据至backups/original-20261027，不创建业务数据备份。停止候选、原子切current并只重启本工作室，认证文件/私有配置/Nginx/资源上限保持原样；启动按现有规则清空旧临时目录。上线校验失败时切回accounts-memory并重启，同样保持临时模式和现有两账号配置，不恢复已删除业务文件。回滚原片版本会使尚存浏览器草稿的source路径不受旧前端契约支持，须重新上传；不能把Ready标志伪装成旧import路径。

已上线的封面默认来源版本为`20261027-house-cover`：新建项目及缺少coverSource字段时默认house，已有明确opening/image/house选择保持不变；网页两处说明同步。共享契约变化须同时更新Next与两套预编译视频包，Next构建`qd13mejRgdF98G1BoDoO8`，视频包指纹`ce7e133aed152d9c4e6150fe55f84dfb5549c828e1fad54044d43a1e89ea17ea`。依赖、上传/生成、账号与临时保留策略没有调整。按两账号空闲检查切换，只备份current/unit元数据至backups/cover-20261027；回退目标为upload-original并继续临时模式，重启需要重新登录/重传，浏览器明确保存的封面选择不被改写。

封面默认值现已上线：用户确认当前成片已下载后，20261027-house-cover通过两个账号空闲门禁并完成切换。公网两账号defaultCoverIsHouse=true，Next构建qd13mejRgdF98G1BoDoO8，服务active/running、NRestarts=0，认证及Nginx未变。原heartbeat跟进automation已暂停，避免重复发布。

1080P提速使用同一Remotion模板生成稀疏透明PNG变化帧，关闭浏览器后由现有Sharp逐帧叠加FFmpeg解码流，再用H.264 veryfast/CRF19编码。固定Remotion FFmpeg的rawvideo demuxer不可用，改用image2pipe＋rawvideo编解码及显式frame_size，单帧缓冲与管道背压限制内存；不安装额外FFmpeg、不提高CPU/内存限制。只处理无重叠的全视频时间线，异常尾帧可见告警后回退常规渲染；资源/文件错误直接失败，照片/重叠转场常规渲染。缓存盐已更新。发布必须同包更新源码、Next和两套视频包，同时安装新版unit并准备私有sessions目录。回滚到旧内存认证版本前必须原子清空会话摘要（保留0700/0600及应用所有权），全员重新登录；旧版本不能撤销新摘要，故不能保留旧有效票据或恢复历史session快照，否则再次升级可能复活旧Cookie。

上一版为`/opt/house-video-studio/releases/20261027-native-session`：Next构建`et3nVQjcNRn43lrX5KyJM`，两套视频包指纹`e38ed20d3e21210963706b3bdde71ed16ed957e6cd2ca269ceae8eaeac9f4488`。正式两账号7天Cookie/私有摘要/退出与权限验证通过，原auth.json未改；只备份current/unit元数据至`backups/native-session-20261027`。受保护的会话摘要不进入业务清理/备份。回退目标house-cover使用旧内存认证，先按上文原子清空会话摘要再恢复旧unit/current，保留临时模式，不恢复旧业务文件。Linux同条件小样123.120→114.343秒，约7.1%提速、峰值约768→611MiB；实际多段/配乐/准备全流程与手机长视频不能据此线性推算。候选测试服务已停止，封面heartbeat继续暂停。

当前正式版本为`/opt/house-video-studio/releases/20261027-auth-guard`。用户本轮明确授权“现在上线，临时文件可以清空”，两账号无上传/生成任务后于2026-10-27 14:30:31切换并仅重启工作室一次；现有7天Cookie跨升级继续有效，启动按临时规则清空媒体。Next构建`uIrjICtRlyKnGsqAz6xDh`、两套视频包指纹`b072b5c14c0cd7c61f41af11565d65a9ef7629a4f318f37e00312e6570c40811`。独立候选已停止；正式两账号未确认注销400、旧workspace注销409且票据保持、明确注销200/旧Cookie401、私有路径与默认封面验证均通过，服务active/running、自动NRestarts=0。

前后端同包启用保护：POST /api/auth/logout严格要求共享契约confirmed=true，多账号同时携带页面冻结X-Studio-Workspace。空JSON/旧缓存调用400、账号头不符409均不撤销会话或清Cookie；预检/验收脚本须同步新参数和身份头，不能误判失败后回滚。编辑页会话检查失败保留原页，支持原地重查，不再自动带走未保存内容；实际失效Cookie直接访问私有页面/API仍由后端鉴权。客户端首次使用刷新加载新版即可，既有有效登录不强制退出。

[auth-audit]由现有journald接收，只含固定事件、Cookie存在/格式与票据可用布尔、PID和粗略浏览器分类；匿名失败固定桶30秒限流，成功的有效主动注销逐次记录。不输出Cookie/摘要/密码/账号名、原始UA或正文。日志只能说明服务端观察到什么，不能当成人类点击证明。原始Safari异常触发尚未定位；当前版是已验收保护与诊断，不声称根因彻底修复。

仅备份current/unit和auth配置摘要至`backups/auth-guard-20261027`，没有业务备份，也没有复制/恢复会话快照。auth.json SHA、unit、Nginx、依赖与资源限制保持原样。回滚时将current原子切回native-session并只重启工作室；两者会话文件格式兼容，保留私有会话实时文件、不恢复旧快照、不撤销现有票据。回退到更早的内存认证版才按前文清空持久票据，防止再升级复活旧Cookie。
