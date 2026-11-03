# Docker 部署

面向新购的 Linux x86_64 服务器，推荐4核4GiB、一次执行一个重型媒体任务。购买页的Docker CE镜像只是预装Docker；本仓库的Dockerfile才负责构建房源视频应用。当前源码已加入 MySQL 账号和草稿数据源，但尚未切换正式服务或执行正式库迁移；现有线上镜像仍按下面的历史记录运行。新候选的建表、迁移和回滚见 [MySQL 接入说明](../mysql.md)。

腾讯云新站为`http://106.54.221.18`，应用位于`/opt/house-video-studio-docker`，Compose管理单容器，宿主机Nginx代理到127.0.0.1:4340。2026-10-31已按用户要求迁移两个原账号并实际验证相同用户名/密码可登录，旧素材、成片、任务和登录记录未迁移，旧阿里云服务继续保留。迁移基线镜像`house-video-studio:20261031-migration-current`（SHA256 b1b3392e0ab60756d25e6a2e8a61b0fea41c7dff83fe55bc3f58c087856bf253）对应旧站正式watermark-subtitles版本，Next构建RlIPVLm_imjay0YYQFXuN。三份MP4、实际字幕识别/排队取消、水印抽帧、智能清理、隔离、重启登录与公网HTTP检查通过；候选峰值1298448384字节、无OOM，未据短样片承诺长片性能。浏览器自动化因来源权限被拒绝，不能声称页面交互验收完成。完整记录见[验证记录](../../docs/verification.md)。

根目录Dockerfile是完整源码构建路径；本次正式版迁移使用`Dockerfile.prebuilt`包装已构建且摘要匹配的产物，不把本机其他未验收代码发布。早先本机磁盘不足的构建失败仍是历史记录，不代表新机镜像构建失败。

仓库通用Dockerfile仍不会自动安装房源截图OCR，直接按通用路径重建会使按钮禁用。当前线上冻结镜像已单独在Linux内运行`STUDIO_OCR_HEADLESS=1 pnpm setup:ocr`并完成离线自检，使用RapidOCR 3.9.2、ONNX Runtime CPU及无界面OpenCV；不要复制macOS虚拟环境。重新发布时须同时包含OCR白名单文件、Next产物和与源码指纹匹配的完整双视频包。

现机日常查看（管理员）：

```sh
cd /opt/house-video-studio-docker
sudo docker compose --env-file docker.env ps
sudo docker compose --env-file docker.env logs --tail 100
sudo systemctl status nginx
```

最终切换前检查两个账号无活动上传/生成/识别，且新站无用户业务文件，仅保存Compose与环境文件元数据到`backups/migration-current-20261031`；没有保存或恢复会话快照。基础镜像标签`20261031-migration`保留用于受控回退，但缺少后续水印/ASR能力；需要这些能力时旧阿里云站仍可用。回退或未来重建仍会按临时模式清空业务媒体，应先确认任务与下载状态，不能自动重启正在使用的服务。

## 当前运行版本（2026-11-03房源截图OCR）

正式镜像为`house-video-studio:20261103-property-ocr`，SHA256 `6fe7fa56054ff20d8c94532df92a495dfc3c5871ec63f58ad8dc6081debbf37b`，Next `dl1lz77686aykzf_NBaHj7993837127`。从已上线的`20261103-opening-removal`镜像及其源码冻结，只叠加截图OCR、文本解析、对应API/UI/契约、`setup:ocr`脚本与重新构建的Next和完整双视频包；未将当前工作区的MySQL或其他未发布改动带入。Linux镜像内中文离线自检和双视频包源码指纹校验通过。

冻结候选`lint`、`format:check`、`typecheck`、`build`及测试通过：176项中174通过、2跳过、0失败。3CPU/2560MiB隔离容器用用户提供的贝壳截图识别出学府花园、66.8万、168.45㎡、5房3厅2卫、精装修、满五、南朝向、无电梯和楼层；浏览器实测上传、待确认字段、点击确认、截图移除与刷新后的草稿。实际照片MP4为3.000313秒、1080×1920、H.264/AAC。5200像素长图与短片同时请求时，OCR在10.619秒完成，成片在23.214秒完成，符合媒体单槽顺序；隔离容器内存峰值908701696字节，临时OCR图片余量0，无OOM/重启。短样本不代表任意长图或长片的性能上限。

切换前线上有51份临时业务文件、约1.29GB，任务记录7份均已完成；用户获知重启会清空这些文件后明确要求直接切换。仅保存原Compose和`docker.env`回退元数据于`backups/property-ocr-20261103`，未备份或恢复业务媒体、认证文件和会话。正式容器healthy、OOM=false、重启0，OCR ready及双视频包校验通过；公网未登录页面303跳转登录，OCR/media/exports接口401。认证和独立sessions挂载未改。正式账号浏览器点击未覆盖，隔离候选的浏览器截图不作为正式站截图。隔离容器与SSH隧道已停止，旧镜像保留；未更新旧阿里云站、未推送Git。

回退前仍须确认任务空闲并保存需要的当前媒体，再从`backups/property-ocr-20261103`恢复`docker.env`并用原Compose重建；回到`20261103-opening-removal`也会按临时模式清理当时的业务媒体。冻结发布上下文位于服务器`/home/ubuntu/studio-ocr-candidate-20261103`，不要用当前未冻结工作区直接重建并声称与本镜像一致。

## 上一运行版本（2026-11-03口播移除修复）

延续本轮线上更新修复，正式版为`house-video-studio:20261103-opening-removal`，镜像SHA256 `391c69a271692611e37e2e4903803cf387c3e54f6ab51c2f853d5612a0bb4c2d`，Next `9rm-x47eJNthooYBprMD1`。只在current-draft父镜像叠加house-materials/use-video-edit两份源码与重新构建的Next；服务器、契约、依赖、模型、两套视频包沿用父版，视频包源码指纹校验通过。修复实拍页遗漏“移除口播视频”，只清空opening并沿现有浏览器草稿保存，房源文字/房屋素材与模板设置保留；照片模式入口保持。

lint、格式、类型、171/171测试及生产构建通过。独立浏览器实测/video-edit桌面和/的375px上传/更换/移除、Blob引用修剪、刷新不恢复旧口播，以及照片模式移除/模式隔离；无页面异常。本机生成的5.2秒1080P H264/AAC MP4通过；本机因其他磁盘占用，构建后的合成短片验收进程单独下调预留，仅用于小夹具，不代表正式准入。隔离Linux候选使用正式默认3CPU/2560MiB与1GiB磁盘预留，实际上传/MP4与账号边界通过，峰值818896896字节，无OOM/重启。

切换前无自传媒体或任务，仅5份与内置音乐逐字节一致的可重建副本；若发现其他业务文件，发布脚本会停止。回退元数据为`backups/opening-removal-20261103`，认证/cloud/Compose摘要未变，sessions挂载保持，无会话/业务媒体备份恢复。上线171份源码匹配、healthy、重启0、OOM=false；公网匿名鉴权/静态资源通过，实际HTTP读取新JS确认包含移除按钮。正式账号浏览器点击与实体手机未覆盖，候选截图不冒充正式站截图。旧阿里云未改、未推送Git。

候选容器与本机验收服务已停止。证据为`artifacts/opening-removal-2026-11-03/`。回退仍需确认任务和媒体，再恢复该备份docker.env并用原Compose重建，不恢复历史素材或会话。

## 上一运行版本（2026-11-03当前草稿、后台生成与模板切换）

按用户“更新线上版本”要求，已切换至`house-video-studio:20261103-current-draft`，镜像SHA256 `f1d4c519762bc4ece6494e80cc342bf0650d7d867b1242ec28b6574254710fef`，Next `wX-Uu76IqyTWJeS4w7ezJ`。以editorial-bgm的既有Linux依赖与媒体运行时为基础，冻结本次完整src/server/scripts/public和package元数据，再构建Next与两套摘要匹配的视频包；依赖/锁文件未变，不包含本机node_modules、模型、凭据或业务数据。171份源码摘要与上线容器逐份一致。

包含每账号/模式仅保留当前一版的浏览器草稿和素材备份、取消/替换上传、提交后服务端后台生成、顶部操作吸顶、真实登录账号与退出入口、保留房源素材并同步切换模板默认封面来源，以及当前配置实时预览。容量保护按既有默认5GiB账号配额和1GiB磁盘预留完整生效，不改变现机3CPU/2560MiB、3视频线程、Nano与认证配置。

冻结版lint、格式、类型、Next/双视频包构建通过；本机完整测试受磁盘余量保护拦截一项，转到隔离Linux测试层补齐公开开发依赖并使用测试环境后，171/171全部通过、零跳过。该测试层未用于正式运行。Linux候选同3CPU/2560MiB，经典实拍、杂志原生、杂志混合素材浏览器渲染和杂志照片四份1080×1920 H264/AAC MP4通过，跨账号404、错误Origin403和错账号409通过；四片阶段内存峰值972128256字节，无OOM/重启。浏览器经SSH转发验证候选三个入口、375/768/1440/1600px吸顶与菜单、实际账号切换、退出取消/确认和双向模板默认封面重套用；共享资料保持。后续菜单/封面复验的内置钢琴响应使用与候选SHA256完全一致的合成音频夹具，以避免重复下载；四份MP4使用真实服务器音乐路径。

切换前再次确认无用户业务媒体/任务，保存Compose/docker.env回退元数据至`backups/current-draft-20261103`，没有保存或恢复会话/业务媒体快照。认证、cloud和Compose摘要保持一致，sessions独立挂载保留，旧账号密码不变。正式容器healthy、重启0、无OOM，公网登录页/新版静态资源正常，匿名API/media/exports均401；启动期间短暂502，服务就绪后复核通过。正式站浏览器登录交互与实体手机未覆盖，候选浏览器证据不冒充正式站截图，短样片不代表长片资源上限。

回退前仍须检查任务和保存需要的媒体，再恢复该目录docker.env并使用原Compose重建；不恢复历史素材/会话。旧editorial-bgm镜像保留，旧阿里云服务未改，未推送Git。额外浏览器请求上下文在202/rendering后关闭，零浏览器轮询下任务仍完成；持久浏览器UI复开脚本保存等待超时，未计通过。发布证据在`artifacts/current-release-2026-11-03/`。

## 上一运行版本（2026-11-02杂志留白模板与默认配乐）

用户明确要求更新线上，并确认已保存素材、暂停使用后，已切换至`house-video-studio:20261102-editorial-bgm`，镜像SHA256 `9f2c146e10002c12ad7b271d1c237ec86294e7c550733f3a2ddeffa0fd9c3dd7`，Next `IQtSbl7TQrZiZgqy-vAOB`。以workbench-compact冻结源码为基础，只叠加22份模板、契约、UI、默认配乐和参考图文件；17份既有文件的发布前摘要与正式容器逐份匹配。未带入工作区其他自动草稿/后台任务/文案持久化改动，依赖、ASR、认证和服务器既有资源策略沿用父镜像。

包含顶部双模板、上方纯文字封面与下划线、口播首帧默认底图、antd Image原生预览和默认配乐新建修复；切换模板使缓存失效，完成任务记录模板身份，经典旧草稿兼容。两套视频包均重新构建并通过源码指纹校验，不能只复制本地Next产物重建。

冻结版本单独通过类型检查、Next/两套视频包构建及两项默认配乐测试；Linux隔离容器同样3CPU/2560MiB，经典、新模板原生、新模板浏览器混合素材和照片模式四份1080P H264/AAC MP4通过。新旧原生音频水平一致，静音封面段确认有默认配乐，跨账号读取成片404；内存峰值990261248字节，无OOM/重启。浏览器经SSH转发实测隔离候选登录、新建默认钢琴40%、模板切换、原生图片预览及375/1920px布局；候选证据不等于正式站点击验收。

切换前正式站有32份业务文件、无运行任务，用户明确确认可清空；切换前再次检查文件路径/大小/mtime快照未变。认证、cloud配置和Compose摘要保持一致，独立sessions挂载保留，原两个账号密码不变。正式容器healthy、重启0、无OOM，22份上线源码摘要匹配，公网登录页/构建资源与匿名API/media/exports鉴权检查通过；正式站浏览器仍受已保存权限阻止。

回退元数据为`backups/template-bgm-20261102`，父镜像workbench-compact保留。回退前同样需保存文件并暂停使用，再恢复该目录docker.env并用原Compose重建；不恢复历史媒体或会话快照。隔离测试容器与SSH隧道验收后停止。证据在`artifacts/template-deploy-2026-11-02/`；本地工作区171项测试不能等同于冻结发布版全量测试，冻结版验证范围以上述独立检查为准。未更新旧阿里云服务，未推送Git。

## 上一运行版本（2026-11-02工作台风格与紧凑公共控件）

按用户明确部署要求，已切换至 `house-video-studio:20261102-workbench-compact`，镜像SHA256 `aec694e0ff3a80311cbb25666feb2e22e56b3baebe07eed431c189312d8b84a5`，Next `fPuWDyqFxFymvUpmirziq`。以spacing-search冻结发布源码为基础，只叠加已验证的26份UI源码（工作台主题、公共控件、紧凑按钮与拖拽手柄）并独立构建Next；21份既有UI文件修改前摘要逐份匹配正式容器，5份公共控件文件为新增。服务器逻辑、package/lock、Linux依赖、媒体模板、Nano运行时和私有配置沿用原镜像。

独立Linux候选采用同样3CPU/2560MiB限制，两种1080P H.264/AAC MP4、字幕水印抽帧、跨账号404/匿名401检查通过。通过SSH转发访问隔离候选，浏览器实际验证登录、预览弹窗和375/1470/1920px布局，36px按钮/2px圆角正确，无横向溢出、浏览器错误为空。正式站通过HTTP校验新版样式、登录页和接口/媒体鉴权，容器healthy、重启0、无OOM；26份上线UI源码摘要全部匹配候选。候选截图不冒充正式站浏览器截图。

切换前正式业务文件为0；两个账号配置、cloud配置与Compose摘要一致，独立sessions挂载保留。回退元数据在 `backups/workbench-compact-20261102`，恢复该目录docker.env后用原Compose重建；回退同样必须先检查任务与媒体并保存需要的文件，不恢复历史业务媒体或会话快照。隔离测试容器已停止。未改旧阿里云服务，未推送Git。

本地完整测试的1项并发上传用例仍受磁盘空闲空间不足影响；不将Linux两份MP4验收写成完整测试全部通过。此前本地Lint/格式/类型/构建通过，详细局限见验证记录。本次发布范围仍小于Git工作区全部源码，重建此镜像应使用冻结发布目录及26份UI白名单，不能直接用脏工作区替代。

## 上一版本（2026-11-02间距与音乐搜索）

用户明确要求部署并推送Git后，已切换至 `house-video-studio:20261102-spacing-search`，镜像SHA256 `0267d30ae9fe9330e9a0d694431c5e5fab918f51b279aedc00ebe4cf3a8d0e9d`，Next `61vJc5CWCTuPyPr6q0LcM`。基于上一已上线ui-layout冻结源码，仅更新 `src/app/layout.tsx`、`src/theme.css`、`src/features/studio/music-picker.tsx` 与Next产物；后端、依赖、媒体模板、ASR和私有配置保持原版本。

本机lint、format、typecheck、build及158项测试通过；新服务器同3CPU/2560MiB隔离候选完成两种1080P H.264/AAC MP4、字幕水印抽帧及跨账号404检查。通过本机SSH转发访问隔离候选（非正式站），浏览器实测“钢琴”返回12首、12px控件间距、1470px无横向溢出且控制台无错误。在线音乐下载仍受上游连接稳定性影响，内置曲目和上传继续兜底。

切换前无用户业务媒体、任务或上传残片；认证、cloud配置和Compose摘要不变。正式容器healthy、异常重启0、无OOM。公网浏览器观察仍受已保存权限限制，不能把候选截图当作正式站截图。回退元数据在 `backups/spacing-search-20261102`；回退前检查任务空闲和用户文件，再恢复其中docker.env并用原Compose重建，不恢复业务媒体或会话快照。

Git按用户确认保存全部当前项目源码与文档，不包含业务媒体、模型、密钥或本地验收产物。因此Git源码范围大于本次三文件冻结发布；不得直接用Git最新源码重建并声称与本镜像完全一致。

## 上一运行版本（2026-11-01布局与 Ant Design 图标）

用户明确确认后，于2026-11-01 21:16（北京时间）切换至 `house-video-studio:20261101-ui-layout`，镜像SHA256 `e28449a44510474598cfb63df65de35e1615632250a3564e4cb5f30c5775609d`，Next `CCt09EJpccJWaA9aRj8MP`。父镜像为music-library，仅覆盖本轮9个UI源文件和Next；服务器、视频模板、依赖、ASR与在线/内置音乐功能保持。158项测试、完整静态门禁及隔离Linux两份MP4通过。

切换前无用户业务媒体/任务/上传残片；认证、云配置和Compose摘要一致。正式容器healthy、异常重启0、无OOM，公网鉴权检查通过；浏览器仍被保存的站点权限阻止，实际视觉与点击未验收。完整证据见 [本轮验收](../../artifacts/ui-layout-2026-11-01/verification.md)。

回退元数据位于 `backups/ui-layout-20261101`，上一镜像为 `house-video-studio:20261101-music-library`。回退前先保存成片、暂停使用并检查空闲，再恢复该目录docker.env，用原Compose重建；不恢复历史登录摘要或业务媒体。旧阿里云服务未修改。

## 历史版本（2026-11-01配乐与艺术水印）

新站镜像 `house-video-studio:20261101-music-watermark`，SHA256 `36b9ebb84a51d155f7a4a5b4ab8c615986d0cf04887808a4a69b42116edf2920`，Next `YS9EUUMCA1ispA0NviQGn`。以 upload-1gb 为父镜像，仅叠加本轮6个源码文件、Next和两套媒体模板。实拍推荐配乐40%、照片20%，旧草稿保留原值，可点击推荐配乐后重新生成；共用水印为左上角淡珊瑚橙艺术字，横屏照片标题同步避让。Nano主动识别、上传限制与资源配额保持。

已通过153项测试、完整静态门禁、最终隔离Linux镜像7份MP4与跨账号读取检查。切换检查确认没有用户素材、成片或任务，仅有启动生成的内置音乐；保护配置摘要一致，账号密码保留。测试容器已停止。浏览器观察仍受站点权限限制，未实际点击验收。详见[本轮验收](../../artifacts/20261101-music-watermark/verification.md)。

回退元数据为 `backups/music-watermark-20261101`，上一镜像为 upload-1gb；回退前仍需保存成片、暂停使用并检查空闲，恢复其中docker.env后按原Compose重建，不恢复历史会话或业务媒体。

## 大视频上传配置（2026-11-01）

该次上传功能发布镜像为`house-video-studio:20261101-upload-1gb`（SHA256 `ea4b548348f8e26339c72b4c72e611f8b57c74ed86664220a60fa754f695256a`），保留此前Nano手动字幕功能。11:18:56 CST切换，健康检查通过、重启计数0；账号/云配置/Compose校验一致。回退元数据位于`backups/upload-limit-20261101`；回退也会清空临时媒体，仍须先检查任务和用户文件。完整证据见[本轮验收](../../artifacts/20261101-upload-limit/verification.md)。

视频单文件上限1GiB（界面显示1GB），房屋视频、实拍口播和照片模式开场共用；照片/音频大小和视频时长上限不变。浏览器与上传任务统一15分钟，Node HTTP收包期限930秒，轻量元数据探测仍最多30秒。Nginx使用`client_max_body_size 1030m`为multipart留空间，`client_body_timeout 900s`仅限制相邻数据读取间隔，总时限由应用控制；保留流式代理。大于1GiB返回413及中文提示，不能改成无限制接收。

冻结发布只覆盖上传相关文件、Next和两套视频包。旧正式版尚未带有本地完整容量保护，本次只补回视频上传入口的`storage-capacity.ts`预算：默认账号5GiB、磁盘预留1GiB，接收前预留1GiB，直到清理结束才释放；不声称其他旧版导出路径也已同步本地容量改造。两个账号认证和会话目录保持独立。切换前确认无活动任务和用户媒体；若存在用户媒体须先由用户保存并暂停，重建按既有规则清空临时业务文件。

旧阿里云实例不随本次更新，手机必须进入腾讯云新地址并刷新。手机相册交出文件之前的等待、实际手机网络和浏览器操作仍需使用原手机复测；300MB/1GiB测试文件使用真实MP4加合法free box填充，证明接收大小边界，不代表1GiB复杂长片的渲染性能。

## 镜像与网络

- 镜像基于Node 22.23.4 / Debian Bookworm，默认从AWS ECR Public的Docker官方发布者拉取，按SHA256摘要固定；固定pnpm 10.14.0，按锁文件安装Linux依赖。多阶段构建包含Next产物、两套源码摘要匹配的视频包、Chromium及中文字体，运行层不携带webpack构建缓存。不能打包本机node_modules、.runtime、data、历史视频、.env、账号或登录摘要。管理员如需切换镜像来源，可显式传入NODE_IMAGE构建参数，只使用可核验的同版本官方镜像，不自动改Docker全局代理或镜像仓库。
- 智能清理与可选原生叠加运行时在镜像构建时从既有固定来源下载、校验并离线自检；运行期间不安装，不调用付费服务，不替换系统或Remotion FFmpeg。完整源码基础镜像不自动包含ASR/Kokoro；冻结正式版迁移可显式`ENABLE_ASR=1`保留已上线ASR，按下节在容器内新建Linux虚拟环境并独立自检，不复制旧venv或macOS环境。Kokoro仍不在本次范围。
- Compose使用`network_mode: host`，应用仍只监听`127.0.0.1:4340`，与原来的内部渲染媒体读取边界一致。它共享Linux主机网络，不使用Docker端口发布，也不把Express改成0.0.0.0。宿主机Nginx负责公网入口，必须固定公网Host、保留Origin。此配置面向原生Linux；Docker Desktop不是等价的生产网络验收环境。
- 容器使用UID/GID 1000、init进程及45秒停止期限，删除Linux capabilities并禁止提权。没有privileged、Docker socket挂载或全盘挂载。Chromium和FFmpeg子进程随容器停止，临时业务素材按原规则在重启后清空。

## 准备新服务器（管理员）

新机器准备须有部署授权；本次用户已经明确要求持续完成迁移部署，旧服务仍保留。后续新增主机或切换域名不由本文自动授权。先确认Docker、Compose插件和x86_64架构：

```sh
docker version
docker compose version
uname -m
```

准备专用存储（首次执行；目录已存在时脚本拒绝修改，需人工检查）：

```sh
sudo bash deploy/docker/prepare-host.sh
sudo install -o root -g 1000 -m 0640 /管理员私有路径/mysql.json /opt/house-video-studio-docker/private/mysql.json
cp deploy/docker/docker.env.example deploy/docker/.env
```

新候选的 `mysql.json` 只放数据库连接参数，账号盐和摘要经管理员脚本从旧 `auth.json` 迁入独立 MySQL 库；旧文件作为迁移备份留在私有目录，不挂入新容器。private父目录root:1000/0750、mysql.json和cloud.env为root:1000/0640；data与sessions独立为1000:1000/0700，sessions.json由应用以0600原子写入。应用可读数据库配置但不能改私有文件或其父目录。现有目录不能未经确认递归chown。

修改`deploy/docker/.env`：`PUBLIC_ORIGIN`设为新站完整准确来源，例如`http://新IP`或`https://你的域名`，不带路径。默认4340端口先确认未被占用；候选可选其他端口，并同步上游Nginx端口。所有挂载源必须已存在；Compose不会悄悄创建缺失的MySQL配置文件为目录。

cloud.env默认为空，免费本机剪辑可用。需要现有百炼文案功能时，由管理员把已授权配置写入该文件；请求仍需用户确认免费额度，不因容器启动触发模型调用。不要把API Key直接放到Compose配置、命令行或构建参数。MySQL/cloud文件使用单文件只读挂载，管理员原子替换源文件后需重建容器，不能假定旧挂载已更新。

## 构建与启动

### 冻结正式版迁移

冻结目录只收明确发布版本的package/lock、src/server/public、必须的scripts、Next和两套视频包，解引用发布软链接但不收data、.env、认证或会话。智能清理推理脚本须从同一已上线发布依赖补齐。公开运行时仅收固定摘要的ONNX模型、叠加二进制/许可证/ready及`.runtime/SHA256SUMS`；迁移ASR时仅可额外收model.int8.onnx、tokens.txt、silero_vad.onnx与官方自检test.wav，下载脚本会重新核验固定摘要。将本目录`Dockerfile.prebuilt`及其dockerignore分别作为冻结目录的Dockerfile/.dockerignore；传输时使用`COPYFILE_DISABLE=1 tar --no-xattrs`，并排除`._*`与`.DS_Store`，防止Mac附加文件改变源码指纹。

```sh
# 在上述冻结目录执行；ENABLE_ASR=1仅用于已授权、已上线ASR的同版本迁移。
docker build --platform linux/amd64 --build-arg ENABLE_ASR=1 -t house-video-studio:你的版本号 .
```

镜像安装原锁定Linux生产依赖与Chromium，在构建阶段拒绝Next配套视频模板的源码指纹不匹配；校验公共运行时并完成智能清理自检。ASR使用镜像内Python3.11新建venv、固定requirements与离线中文时间戳自检，成功后才启用，Node以`--expose-gc`保留已上线回收能力。最终仍须实际容器、两条MP4及字幕验证，不能只看ready文件。

PyPI下载较慢时，可按[腾讯云官方文档](https://cloud.tencent.com/document/product/213/8623)在本次构建显式传入`--build-arg PIP_INDEX_URL=https://mirrors.cloud.tencent.com/pypi/simple`。默认仍为PyPI；不改宿主机全局pip配置，不关闭TLS验证，不改变锁定版本，也不在构建参数中放凭据。

### 完整源码构建

建议在构建机完成linux/amd64镜像，避免4GiB服务器同时编译和生成视频：

```sh
docker build --platform linux/amd64 -t house-video-studio:你的版本号 .
docker save house-video-studio:你的版本号 | gzip > house-video-studio.tar.gz
```

仅传输此镜像归档和必要部署文件，在新服务器加载；不传本机data或.env。镜像归档也占磁盘，加载验收后只删除本次归档，不运行全局`docker system prune --volumes`。如使用镜像仓库，须另行获得发布授权，不默认推送到公网。

```sh
gzip -dc house-video-studio.tar.gz | docker load
# 编辑deploy/docker/.env中的STUDIO_IMAGE，使其与已加载的版本号一致。
docker compose --env-file deploy/docker/.env config --quiet
docker compose --env-file deploy/docker/.env up -d --no-build
docker compose --env-file deploy/docker/.env ps
docker compose --env-file deploy/docker/.env logs --tail 100
```

新 MySQL 候选的健康检查读取本机会话状态并查询两张数据库表，不续期业务素材。默认json日志每份10MiB、最多3份。容器不健康会显示unhealthy；restart只负责进程退出后的重启，不把健康检查失败误说成会自动修复。

## 容量、资源与持久化

候选默认最多3个CPU、2560MiB内存、Node堆768MiB、共享内存128MiB，交换上限与内存上限相同。此为新4核4GiB专用服务器的起始配置，**不是已经通过Linux长视频验收的结论**，不适用于原2核2GiB共享服务器，也不在本轮改旧服务器限额。编码/渲染内部仍有单线程阶段，Docker本身不会自动使其并行；先用同一项目比较生成耗时再决定线程调整，不承诺倍数。继续保留进程内媒体单槽，不能增加副本或同时启动第二个容器共享data。

跨容器保留专用data与独立sessions目录，MySQL元数据单独维护，私有配置只读。新版本原片在data/current/<workspace>/uploads，公网草稿以MySQL为权威，本地文件草稿在同账号drafts；保存/查询只传JSON，不回下载原片。新建或移除且无双模式引用/在用任务后才回收原片，重启保留；temporary只存处理缓存、任务和成片，闲置2小时及重启清理，排队/运行/流式读取受保护。升级先迁移旧temporary里的账号uploads，同卷rename不复制视频，同名冲突停止清理。旧浏览器JSON仅在服务器无草稿时迁移，旧IndexedDB不自动清空。新来源通常仍需登录，不能打包Cookie或会话；正常重建保留7天会话。此数据模型不能直接回退到只读temporary/uploads的旧镜像，须保留稳定目录与元数据兼容能力；不能以旧镜像启动成功代替素材可读检查。线上实际状态仍以本页当前运行版本为准。

构建缓存、旧镜像、验收文件与业务媒体是不同清理范围。既有每日验收维护脚本继续由宿主机独立运行，只处理已标记完成的验收目录；它不清除Docker卷、镜像或构建缓存。

本次冻结正式版没有带入本机尚未发布的存储准入改动，不能仅凭Compose中的容量环境变量声称新站已经启用5GiB硬配额。两小时临时清理仍由已上线应用执行。旧机的每日验收timer没有自动迁入新机；新机本轮独立测试容器及其测试账号、业务data和会话会在取证后删除，保留的公开样片/报告不属于用户媒体。

## 2026-10-31 滑块对齐（上一版本）

2026-10-31 13:35:32 +08:00按用户明确授权更新新站106.54.221.18。当时镜像`house-video-studio:20261031-slider-alignment`，SHA256 `8c0272f1c62f4ea77cff23f641185b8116310c04c1bfcad71f097410c77ce97a`，Next构建`K8lWeRhgNbAXehzapk5Tk`。以上一线程优化镜像为基础，仅叠加重新构建的Next产物和`src/theme.css`水平滑块规则，不带入本机其他正在修改的代码；后端、ASR、依赖及两套视频模板继续沿用原镜像。构建上下文在新机`/home/ubuntu/house-video-slider-20261031`。

移除会使轨道单独下移的padding/min-height覆盖，恢复Ant Design原生圆点定位；外边距保留空间，auto宽度避免横向撑出容器。独立服务器候选浏览器1280px与375px三个滑块中心偏差均0，键盘调节通过；候选实拍/照片两份新MP4与账号边界通过。正式账号切换前全部任务空闲，升级后两账号登录保留、字幕/智能清理ready、认证/Origin/退出保护通过。3CPU/2560MiB、STUDIO_VIDEO_THREADS=3、认证/cloud只读配置和Compose文件均保持，正式容器healthy、无OOM/重启。正式浏览器打开超时，公网HTTP和静态资源通过；不将同镜像候选截图称作正式站截图。

仅保存Compose/docker.env元数据和私有配置摘要至`backups/slider-20261031`，不保存或恢复登录摘要、业务媒体。回滚先确认任务/下载状态，恢复该目录docker.env后用原Compose重建，回到`20261031-video-threads`；仍保留3线程、ASR/水印与现有私有挂载，重建清空临时素材、浏览器草稿保留。旧阿里云站未更新。完整证据在`artifacts/deploy-slider-2026-10-31`；用户随后明确暂不提交Git，本轮无暂存、提交或推送。

## 2026-10-31 视频线程优化

上一镜像`house-video-studio:20261031-video-threads`，SHA256 `cac37e641a531e1afd8fc6b59d147c114edad25b23cb869965568e33502eaf78`，只在上述迁移基线镜像叠加`server/video-bundles.ts`、`server/video-edit.ts`、`server/video-edit-native.ts`。Next与两套视频模板、ASR模型、依赖和账号配置不变；构建检查两套模板指纹。部署构建上下文保留在新机`/home/ubuntu/house-video-threads-20261031`，不包含用户素材、凭据或本地其他候选源码。

新机`docker.env`显式设置`STUDIO_VIDEO_THREADS=3`，容器仍为3CPU/2560MiB。实际三份HEVC原片、统一测试项目输出83.333333秒，基线214.984秒、优化118.632秒，耗时减少44.8%；这是单组同素材对照，不保证所有素材均有相同比例。两份成片均2500帧、1080×1920、30fps、H.264/AAC；48kHz双声道PCM对比一致，五个抽样画面PSNR至少42.31dB（封面一致）。验收峰值1168945152字节，无OOM。

切换前用户已下载成片并确认可重启；两个账号任务空闲。配置元数据备份在`backups/video-threads-20261031`，认证只读挂载和会话目录保留，不保存或恢复会话快照。回退时先确认任务与下载状态，恢复该目录的`compose.yaml`、`docker.env`并用Compose重建，回到保留ASR/水印的`20261031-migration-current`。重建仍按临时模式清空业务媒体，不要在任务运行中切换。隔离验收账号、登录摘要、三份原片副本与成片已随独立测试目录删除，仅保留无凭据指标和公开样片截图。

## 视频处理线程

`STUDIO_VIDEO_THREADS`仅控制实拍原片准备和原生合成中的FFmpeg解码、滤镜、编码线程。有效值为1、2、3；缺省和非法值退回1，避免扩大旧服务器资源占用。Compose透传该参数；4核新机须先在3CPU/2560MiB容器内实测，再显式配置3。它不增加重型任务并发数，不改变浏览器渲染并发或ASR配置；相同CRF、画幅、帧率、完整原声和图层模板继续使用。改环境后必须重建应用容器才生效，按临时模式先下载成片并停止提交任务。

## 公网验收与切换

Nginx示例见`nginx.conf.example`。替换其中的`server_name`和**固定Host**为新站真实Host，必须与PUBLIC_ORIGIN一致；非标准公网端口也须包含。不能使用`$http_host`/客户端任意Host、127.0.0.1或删除Origin来绕过校验。只开放公网入口，不开放4340，应用/媒体/成片均由Express登录会话保护。域名部署应配置HTTPS，并同步更新PUBLIC_ORIGIN。

切换前在候选验证：未登录页面/API/media/exports保护、正常登录与退出、跨账号隔离/旧标签页、Origin与私有渲染路径拒绝、上传取消/排队、两种真实MP4（编码/时长/音轨/封面/水印）、重建后登录保留及素材失效，以及Docker整体CPU/内存峰值/OOM情况。所有静态门禁与本地验收不能替代新服务器实测。用户明确授权公网切换后，再备份现有Nginx/current/配置元数据，nginx -t通过才reload，确认正式任务空闲后再动旧服务；不把本机其他未验收候选顺带发布。

回滚时恢复上一已验收镜像标签和相同私有挂载，不恢复历史会话快照，不复制旧业务媒体。容器重建仍会清空临时素材。`docker compose down`不带任何清卷选项；回滚旧站代理也必须保留认证、固定Host和Origin保护。旧阿里云上的其他项目与数据库不属于本次迁移范围。

## 历史版本（2026-10-31自动字幕与预览弹窗，后由手动字幕版本替代）

用户确认已下载成片、暂停任务并允许切换后，13:56:04 +08:00更新106.54.221.18。当时镜像`house-video-studio:20261031-auto-subtitles-preview-final`，SHA256 `d74c83d0535018b520b45e8246f7f323f69f7251ab8c280d94498216fc709165`，Next构建`Zj8ttAulb85l-7cX1s1qz`。以slider-alignment为父镜像，仅叠加6个studio UI/状态文件及重建Next，保留滑块样式、3线程、3CPU/2560MiB、模型与视频模板；未发布当前本机其他候选。构建上下文在`/home/ubuntu/studio-preview-subtitles-final-build-20261031`。

上传完成后页面自动串行识别所有有音轨视频，结果直接填入可编辑原声字幕，默认显示；照片/无音轨跳过，已有文字和明确空字幕不覆盖。识别失败需重试或明确跳过后生成，暂停后主动继续；自动队列需要制作页保持打开。底栏和顶部预览按钮打开antd弹窗，有成片时优先显示上次成片，修改后仍须重新生成。

152项测试、静态门禁、独立服务器实际识别/取消/隔离和两种带字幕MP4路径通过；最终镜像再次通过实拍、照片和字幕导出。浏览器在用户允许后仍被保存的站点权限拒绝，因此实际页面点击与自动队列交互未验收，不能以服务端MP4替代。具体证据见`docs/verification.md`与`artifacts/auto-subtitles-2026-10-31`。

切换前两个账号任务均空闲；正式容器healthy、RestartCount=0、OOMKilled=false。原两个账号密码实际登录成功，ASR/智能清理ready；认证、cloud与Compose摘要保持，独立会话挂载保留。公网登录/未登录访问保护、错误Origin及Next静态资源通过。旧阿里云服务保持运行。

回退元数据在`/opt/house-video-studio-docker/backups/auto-subtitles-preview-20261031`，上一镜像为slider-alignment。需要回退时仍先确认下载/任务空闲，恢复其中docker.env并按原Compose重建，不恢复旧会话或临时素材。重启清空临时素材规则保持。

# 在线音乐库运行边界

内置五曲与本机上传始终作为兜底。ccMixter 仅在用户主动搜索或选用时访问；服务器需能访问 https://ccmixter.org，不需要 API key。已导入的音乐用于成片时不再联网。

受会话保护的接口：`GET /api/music/search?q=&page=0`（每页最多12条，页码0～9），`POST /api/music/select`（`{kind:"builtin",track:"felt-piano"}` 或 `{kind:"online",id:71077}`，返回 AudioAsset）。`GET /music-preview/:track` 仅允许五个固定内置曲目，供无法携带自定义身份头的原生音频控件使用；普通业务 API 仍校验页面身份。

导入重新校验 ID、CC BY 许可和固定 HTTPS 来源，不接受客户端 URL。每账号搜索、导入和在线试听各一个占用；预留20MiB存储预算，超时或断连清理半成品。成品随账号临时目录清理。ccMixter 的 X-JSON 大响应头使用有界 Node HTTPS 适配器（128KiB头、2MiB正文）；TLS 校验不变，浏览器业务请求仍为 fetch。

署名是 AudioAsset 的可选 musicCredit，新旧草稿兼容。冻结发布同时包括新增音乐服务、共享契约、选择器、Next 构建和两套重新生成的模板摘要。项目维护 skill 不进入生产镜像。回滚使用上一个完整镜像，不能单独回滚前端或模板。

实际新服务器导入测试发现 Node fetch 自带10秒连接超时早于业务截止（UND_ERR_CONNECT_TIMEOUT），固定来源音频下载也使用同一有界 HTTPS 适配器，保留 TLS 校验、域名/路径白名单和取消信号，无新增依赖。

在线原生试听走 `GET /music-preview/online/:id`，仅接收曲目ID，服务端再次校验来源和许可。下载携带已验证的曲目来源页以满足上游防盗链要求；缓存限当前workspace最多24条索引，实体文件仍受账号预算/临时清理约束。试听完成后选用复用本地音乐，试听不更新草稿。
