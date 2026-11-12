# 验收记录

## 经典实拍取消价格卡、总价居中与腾讯云更新（2026-11-04）

- 按用户反馈去掉经典实拍封面右下角整块价格卡和卡内标签；低饱和红色描边总价位于房屋画面中部且水平居中，附加特点居中放在下方，联系文字靠底，房屋底图连续可见。模板选择说明同步改为“居中总价”；杂志留白保持。改前、改后 1080×1920 封面、315×405 三列裁切、来源页面及版块/素材映射在 `artifacts/cover-classic-center-20261104/`。隔离候选浏览器已核对卡片与放大预览。
- 本地 lint、format:check、typecheck、Next build、build:video 与 185 项测试通过。Linux 3CPU/2560MiB 隔离候选实际生成经典原生、杂志原生、杂志浏览器三条 MP4，均为 1080×1920 H.264/AAC，时长 5.600、5.600、5.611 秒；经典第 0 帧确认居中总价且无价格卡。候选无 OOM/重启，双视频包源码指纹通过；短片不代表长片资源上限。
- 正式镜像 `house-video-studio:20261104-cover-center`，ID `sha256:6f7024ecbeed35cb3298f5376a872120f58ec79b0371f55eb9f7091a43f828bb`，Next `7mnXhPpmFxCTE6jEk20r9`；洁净归档 SHA256 `ffd53296b1a05a33389d7038aa42887685e965962ed23e6814324ff595fd6bef`。切换前无运行任务及近 3 分钟新业务文件，只备份 Compose 和环境元数据。原片目录前后均约 236 MiB，临时成片按现有重启规则清理。正式容器 healthy、OOM=false、重启 0，数据库与视频包校验通过；公网登录页 200、匿名编辑页 303、匿名业务 API 401。未用正式账号做浏览器交互，旧阿里云站未改，Git 未推送。

## 经典实拍缩略图标题修正与双模板上线（2026-11-04）

- 用与用户三列页面一致的 315×405 居中裁切检查经典实拍封面，原版标题顶部被截断。将经典标题由 150px 缩至 122px、顶部从 165px 下移至 310px；新版裁切图文字完整，房源要点、价格卡和杂志人物封面保持。原版与新版截图、页面及映射证据在 `artifacts/cover-title-position-20261104/`。
- 本地 lint、format:check、typecheck、Next build、build:video、185 项测试通过。Linux 3CPU/2560MiB 隔离候选生成经典原生、杂志原生、杂志浏览器三条实际 1080×1920 H.264/AAC MP4，时长 5.600、5.600、5.611 秒；经典第 0 帧包含调整后的标题。候选浏览器核对两张封面卡和放大图，两套视频包指纹通过，候选无 OOM/重启。首次从上一版叠加构建触发 Docker max depth，改从完整基线叠加两套当前封面后成功。
- 正式镜像 `house-video-studio:20261104-cover-grid`，ID `sha256:dcbe264193fbb66f9e6ff2ae95a1785a75ef2473555763fe3fb1ed1133bd52e7`，Next `AnLzxR7svKLn017aYzXof`；洁净归档 SHA256 `82974ef741b606d512c6280d61bb80a52b40ea817abc49b0e3491bb0d45dfadd`。切换前无运行任务及近 3 分钟新业务文件，只备份 Compose 和环境元数据。原片目录仍约 236 MiB，临时成片按现有重启规则清理。公网登录页 200、匿名编辑页 303、匿名 API 401；正式账号浏览器交互和长片资源上限未在本轮复验。旧阿里云站未改，Git 未推送。

## 人物封面标题缩小下移与腾讯云更新（2026-11-04）

- 按用户圈出的三列缩略图，杂志留白人物封面标题从 150px 缩到 122px、副标题从 91px 缩到 72px，文字组顶部由 150px 下移至 310px。保留价格条、房源要点、封面来源和经典实拍布局。将原图、原版、新版以及居中裁切为 315×405 的缩略图保存在 `artifacts/cover-title-position-20261104/`；原版标题在缩略图上沿被截断，新版完整显示。候选浏览器已核对模板卡及放大参考图。
- 本地 lint、format:check、typecheck、Next build、build:video 与 185 项测试通过。Linux 3CPU/2560MiB 隔离候选实际生成经典原生、杂志原生、杂志浏览器三条 MP4，均为 1080×1920 H.264/AAC，时长分别 5.600、5.600、5.611 秒；第 0 帧可见调整后的杂志标题。候选无 OOM/重启，双视频包源码指纹校验通过。短片不代表长片资源上限。
- 正式镜像 `house-video-studio:20261104-cover-title`，ID `sha256:56a30a7df16302141bf9481bef4beae83fa60838482ab1e0f221f32e657e6b50`，Next `PE4iAIIiyzHtpV7gTau3g`。以旧正式镜像为基础叠加封面组件、杂志参考图、Next 产物和两套视频包；洁净归档 SHA256 `0785ce35d942d9b01f4e9506a5492331db227097af8bdfdc6b889f7454d07b65`。切换前正式任务均完成、近 3 分钟无新业务文件；只备份 Compose 与环境元数据。原片目录切换前后均约 236 MiB，临时成片按既有模式清理。正式容器 healthy、OOM=false、重启 0，数据库、两套视频包指纹与源码摘要校验通过；公网登录页 200、匿名编辑页 303、匿名业务 API 401。正式账号浏览器交互未覆盖。旧阿里云站未改，Git 未推送。

## 封面暗红调色与腾讯云完整本地版本发布（2026-11-04）

- 两套封面价格区域的高亮红改为低饱和暗红渐变；标题、字段映射、封面来源和时序沿用现有模板。上线版本包含当前本地完整运行源码与目录重构，镜像 `house-video-studio:20261104-cover-muted`，ID `sha256:b4cbae5fba12a6e72de395238ffc3320f8865e814e2146628976c59f3d733deb`，Next `OpGJChlratBuPnI2DRnDl`。旧正式版 `20261103-full` 保留；本轮未提交 Git，旧镜像继承的修订标签不能作为新源码修订号。源码包洁净归档 SHA256 `6dde6faaa43eb01b8c90500fa41f154f85791b3b4761c04f1c471b8cac643128`。
- 先保存原版/新版封面截图、页面 HTML、版块和素材映射到 `artifacts/cover-muted-20261104/`。本地 lint、format:check、typecheck、Next build、双视频包构建与 185/185 测试通过。本地浏览器核对双模板卡和放大预览，三条实际 MP4 均含新封面。Linux 3CPU/2560MiB 隔离候选完成经典原生、杂志原生、杂志浏览器合成 MP4，均 1080×1920、H.264/AAC，时长分别 5.600、5.600、5.611 秒；抽取第 0 帧确认暗红封面，候选无 OOM/重启。Linux 候选浏览器确认模板卡片，OCR 就绪；测试数据在独立目录，不使用正式账号媒体。首次打包混入 macOS `._` 附加文件，构建时视频指纹拒绝，清理后用 `COPYFILE_DISABLE=1` 重制洁净归档并通过同一校验。
- 切换前线上渲染任务记录均为 complete，原片目录约 236 MiB；备份旧 Compose 与 `docker.env` 到 `backups/cover-muted-20261104` 后切换。重建后原片目录仍约 236 MiB，临时成片按既有规则清理；MySQL、认证、会话挂载和 Nginx 未改。正式容器 healthy、OOM=false、重启数 0，数据库和双视频包指纹校验通过，线上源码及两张模板图 SHA 与本地一致。公网匿名编辑页 303 跳登录、登录页 200、业务 API 401。未执行正式账号浏览器交互，候选浏览器验收不冒称正式站登录验收；短片不代表长片资源上限。旧阿里云站未改，Git 未推送。

## 两套封面参考图样式（2026-11-04，本地）

- 以用户提供的人物封面和房屋封面为视觉参考。先保存原图、旧模板图及本地 `origin.html`，并在 `artifacts/cover-style-20261104/` 记录版块和素材映射；应用内未嵌入用户图片或图中价格、口号。杂志留白采用上方白色黑描边标题、浅金色副标题、左侧红色价格条；经典实拍采用上方白色黑描边标题、中部浅金色要点、右下红色价格卡。两个模板的放大参考图由同一 Remotion 封面组件重新生成。
- 本地 `lint`、`format:check`、`typecheck`、`build`、`build:video` 和 185 项测试通过；两个视频包指纹与源码匹配。隔离完整服务浏览器打开 `/video-edit`，核对两张模板卡及放大预览。经业务 API 实际生成经典原生、杂志原生、杂志浏览器合成三份 MP4，均为 1080×1920、H.264/AAC，时长分别 5.600、5.600、5.611 秒，抽帧确认新封面进入视频第 0 帧。证据及生成预览在 `artifacts/cover-style-20261104/`。
- 本轮只完成本地修改和验收，未部署公网；线上仍是 2026-11-03 的封面样式。人物与房屋示例底图是演示素材，实际封面取用户选择的素材和当前房源字段。

## 腾讯云当前本地完整版发布（2026-11-03）

- 用户要求将当前本地版本全部部署，而非仅 OCR 冻结版。正式镜像 `house-video-studio:20261103-full`，SHA256 `ad980648c45ec837f2813bc659a5a5d1df6a6df292229501cd9c5937f930a023`，源码提交 `36b73d98e5089a3e636c237dfb5c4662b069ef11`，Next 构建 `SF70XfT4HgIgcGbIO3R2_`。复用已验收的 Linux 媒体/OCR 运行时，放入该提交的全部源码、页面产物与重新构建的双视频包；新增生产依赖在 Linux 用锁文件安装。
- 宿主机安装 MySQL 8.0.46，仅监听 127.0.0.1；独立库和应用账号仅授予本库 SELECT/INSERT/UPDATE。迁移只读预检为 3 个账号、0 份旧服务端草稿，导入后 3 个账号全部启用且 workspace ID 唯一，源认证文件未删除；会话目录继续挂载。切换前备份旧 Compose、环境、认证配置及 322 MiB 业务 data 归档到 `/opt/house-video-studio-docker/backups/full-local-20261103`；旧镜像保留。新服务启动后已接收原片迁入 `data/current`，旧临时任务/成片按重启规则清理。
- 3 CPU/2560 MiB 隔离候选浏览器实际看到杂志留白、经典实拍模板并切换为杂志留白；OCR 就绪。候选实际导出经典和杂志留白原生、杂志留白混合素材浏览器、照片模式共 4 份 MP4，均 1080×1920、H.264/AAC；原生与混合片约 5.6 秒，照片片约 3 秒，证据位于 `artifacts/deploy-full-20261103`。候选无 OOM/重启。正式容器 healthy、无 OOM/重启，MySQL 唯一索引查询使用 `uniq_workspace_id`，OCR 自检就绪；公网匿名制作页 303 跳登录，登录页 200，匿名 API/media/exports 均 401。正式站的账号浏览器点击未完成，不将候选页面检查冒充正式站交互验收；本次没有重新验证长片性能。

## 腾讯云房源截图OCR发布（2026-11-03）

- 用户明确要求将截图识别与文本段解析更新上线，并在获知重启会清理约1.29GB临时原片/成片后明确要求直接切换。冻结版从当时线上`20261103-opening-removal`镜像及源码叠加OCR范围，排除当前工作区的MySQL与其他未发布改动；最终镜像`house-video-studio:20261103-property-ocr`，SHA256 `6fe7fa56054ff20d8c94532df92a495dfc3c5871ec63f58ad8dc6081debbf37b`，Next `dl1lz77686aykzf_NBaHj7993837127`。
- 冻结版lint、format:check、typecheck、Next构建、双视频包构建及指纹校验通过；176项测试中174通过、2跳过、0失败。Linux使用Python 3.11、RapidOCR 3.9.2、ONNX Runtime 1.23.2和无界面OpenCV，中文离线自检通过。用户真实贝壳截图实际OCR文字保留售价66.8万、房型5室3厅、建筑面积168.45㎡和概览，排除户型图房间面积；候选字段为学府花园、5房3厅2卫、精装修、共7层/高楼层、满五/南朝向/无电梯。隔离候选浏览器验证上传、待确认、确认填入、截图移除及刷新后草稿保留。
- 隔离Linux容器限制3CPU/2560MiB：实际导出照片MP4为3.000313秒、1080×1920、H.264/AAC；5200像素长截图与短片并发请求时，OCR在10.619秒完成、成片在23.214秒完成，按媒体单槽串行，内存峰值908701696字节、OCR临时文件余量0、无OOM/重启。该验收不代表任意长图、长片或不同负载的上限。
- 切换前线上51份临时业务文件共1294357217字节，7份任务记录均为complete，用户已确认可清理。仅备份Compose/docker.env元数据至`backups/property-ocr-20261103`，保留认证和独立sessions挂载；重建后正式容器healthy、OOM=false、重启0，OCR ready、双视频包校验通过，公网匿名页面303跳登录、OCR/media/exports均401。正式账号浏览器点击未覆盖；候选页面证据不能冒充正式站。旧镜像可回退，但再次重建仍会清理当时的临时业务文件。旧阿里云站未改、未推送Git。

## 杂志封面橙黄色黑描边（2026-11-02，本地）

- 仅改EditorialCover封面：橙黄色字面#ffc34d、黑描边#15110b，主标题/价格700字重、描边按画幅缩放，辅助文字用较细描边；同色下划线、纯文字、上方位置保持，无背景色块或顶部边框。片内字幕、水印、经典模板、音频和时序不变。
- 实际FreeVideoCover生成参考PNG，再编码为public/demo/template-editorial.jpg；预览、独立封面及原生/浏览器MP4共用同一组件，现有源码指纹会使旧渲染缓存失效。未来发布须重新构建双视频包，本轮未发布公网。
- lint、format:check、typecheck及171项测试通过；实际原生11.2秒、混合照片浏览器9.216秒MP4通过，证据在artifacts/orange-cover-2026-11-02/。最终构建、浏览器与画面检查结果见该目录review.md。

## 腾讯云模板与配乐发布（2026-11-02）

- 已按用户要求发布至106.54.221.18；用户明确确认保存素材并暂停。正式镜像`20261102-editorial-bgm`，SHA256 `9f2c146e10002c12ad7b271d1c237ec86294e7c550733f3a2ddeffa0fd9c3dd7`，Next `IQtSbl7TQrZiZgqy-vAOB`；认证/cloud/Compose摘要不变，保留原两账号密码及独立sessions。
- 冻结在当前线上workbench-compact基础上，仅叠加22份已验证文件，未带入其他会话的自动草稿、后台任务恢复和文案持久化修改。冻结版独立类型检查、Next/双视频包构建及两项默认配乐测试通过，不将本地171项测试冒称冻结版本全量测试。
- 同资源限制Linux隔离验收四份MP4：经典/新模板原生各5.2秒、新模板浏览器混合6.208秒、照片3.000313秒，均1080×1920/H264/AAC48kHz。两种原生音频RMS/peak相同；默认音乐在静音封面0.2～1.0秒RMS -33.95dBFS，跨账号成片404；峰值990261248字节，无OOM/重启。浏览器通过SSH转发实际检查候选登录、新建钢琴40%、新模板默认口播来源、图片原生预览及375/1920px无横向溢出。
- 正式切换前32份业务文件、无运行任务；确认后文件快照未变才重建。正式healthy、重启0、无OOM、22份源码摘要匹配，公网登录/资源/匿名鉴权检查通过。正式站浏览器被保存的权限设置拒绝，未宣称正式站实际点击验收。回退元数据为backups/template-bgm-20261102，旧镜像保留，候选与隧道停止；证据在artifacts/template-deploy-2026-11-02/。

## 新建实拍项目默认配乐（2026-11-02）

- 根因：首次无草稿通过getOriginalMusic加载配乐，“新建”却直接复制music:null的EMPTY_VIDEO_EDIT，导致新建后直接生成无音乐。现由业务API的createDraft统一初始化，准备当前workspace的默认轻钢琴后才保存/替换草稿，音量40%；音乐失败保留原项目，已有草稿music:null/手动关闭不强制开启。
- 诊断边界：本机此前最近一份成片的静音封面段仍有音乐（0.2～1.0秒RMS约-32.94dBFS），不能把所有“听不到”归因于同一缺陷；本轮未擅自提高混音音量。
- lint、format:check、typecheck、build及171项测试通过，覆盖默认音乐、独立session、准备失败拒绝、恢复关闭音乐草稿。Chrome隔离账号实测“新建→上传两段测试素材→直接生成”，不手动选曲，预览显示钢琴40%；实际MP4为1080×1920/H264/AAC48kHz、11.266667秒，静音封面0.2～1.0秒RMS -33.95dBFS/峰值0.06079，确认音乐进入文件。手动关闭后页面显示无背景音乐，刷新恢复由自动测试覆盖。
- 证据在artifacts/bgm-default-2026-11-02/。不覆盖用户草稿或重新制作历史成片；渲染/混音算法与照片模式未改，未部署公网。

## 模板说明与原生图片预览（2026-11-02）

- 实拍模板卡片新增默认底图说明：杂志留白使用口播视频首帧；经典实拍使用首份房屋素材（视频首帧/照片），均可手动更换。照片模式不显示这段实拍封面来源说明。
- Image从common入口使用antd原生预览，图片与模板选择按钮并列，移除自建预览入口、状态和Modal。实测点击未选中的经典参考图可放大、关闭后仍选中杂志留白。
- lint、format:check、typecheck、build及169项测试通过。Chrome隔离实例4320检查原生图片预览、375/1920px无横向溢出；本地4318重载构建后也实际点击图片放大成功，截图见artifacts/template-copy-2026-11-02/。本轮只改产品UI说明/预览，视频合成组件未改，不重复导出MP4，未部署公网。

## 杂志留白模板（2026-11-02，本地）

- 新模板在顶部排第一，经典保持旧草稿默认。两个模板均有同一FreeVideoCover组件生成的封面参考图与放大入口。杂志留白默认口播首帧，上部衬线纯文字与细下划线、下方留人物，不加文字色块、顶部边框或卡片阴影。
- 契约、缓存和任务模板身份同步。模板切换清除旧成片显示，刷新核对session/template；保留素材、原声与字幕内容/时间。发布须重建两套视频包，本轮未发布公网。
- lint、typecheck、build通过；完整测试167/167通过。首次测试受本机磁盘不足影响，空间恢复后完整重跑全绿，未修改业务容量保护。format:check另见任务日志。
- 实际MP4：经典与新模板原生路径各11.2秒，新模板混合照片浏览器路径9.216秒，照片模式3.000313秒，均1080×1920/H264/AAC48kHz。新旧模板音频RMS/peak一致；跨账号读取成片404。
- Chrome实测首页、实拍直达、模板切换、刷新持久化、默认口播来源和参考图放大；375px与1920px无横向溢出。文字层背景透明、上边框0px；预览及MP4画面已查看。
- 证据在artifacts/editorial-template-2026-11-02/。使用演示素材，未作真人脸自动避让或长片资源上限验收。照片页HTTP与实际MP4正常，但浏览器工具在直达photo-mode时显示加载失败，未宣称该页交互验收完成。

## 本地免费原声识别字幕（2026-10-30）

- 范围：按用户确认及圈出的参考样式，在实拍页增加原声识别、逐条文字/源片时间校对、明确采纳、启用/清除和草稿保存。人物开场与每份房屋视频可分别识别；照片跳过。白色粗字、黑描边、画面下方显示，与画面文案分开。上传不运行识别，不改原声/裁切，不接收费API，未发布公网。
- 运行：macOS本机安装 sherpa-onnx 1.12.40 / numpy 2.2.6，SenseVoice INT8＋Silero VAD，固定官方模型与SHA256，真实中文离线时间戳自检通过才发布ready。模型239233841字节，SHA256 c71f0ce00bec95b07744e116345e33d8cbbe08cef896382cf907bf4b51a2cd51。公开示例中文与自制Kokoro测试讲话均真实识别成功；同音字“啊”被识别为“狼”后由测试人员在页面校对，原始识别结果保留，不宣称零误差或方言准确率。
- 契约/隔离：字幕是原片可选字段，旧草稿仍有效；每份最多600条、单条28字、总计6000条，越界、重复编号、乱序/重叠均拦截。接口只接当前workspace本地原片；服务端重新探测音轨和时长，流式摘要缓存、临时音轨、任务按账号存放。排队/运行持有workspace，共用媒体单槽；取消只取消对应任务，15分钟执行期限，错误不回显原声文本/子进程日志，重启失败可恢复识别。
- 浏览器：通过真实文件选择器上传合成演示视频，分别识别开场与房屋片，检查不自动采纳、文字纠错、非法起止时间禁用采纳、采纳后启用、保存刷新保留校对文字。发现并修正启动识别时旧completed任务轮询覆盖新结果的问题，修正后uncached/cache路径均成功。最终构建再次跑通识别→校对→采纳→保存；1280和390宽度scrollWidth分别为1280和390，无横向溢出。截图位于artifacts/subtitles-2026-10-30/editor-desktop.png与editor-mobile.png。主动重启隔离临时服务后旧媒体按设计失效，页面给出重新上传提示；开发环境4320未停止。
- 真实MP4：demo-corrected.mp4来自页面校对/采纳后的纯视频稀疏原生渲染；demo-mixed.mp4包含照片，走完整浏览器渲染。均成功完成，H.264、1080×1920、30fps、AAC 48k；画面帧长分别约11.533秒与13.533秒，容器时长11.541秒与13.547秒。开场与房屋讲话均显示校对后的字幕，静音封面和后续照片不残留讲话字幕；caption-frame.png、mixed-caption.png、mixed-photo.png、cover.png保留实际解码帧。浏览器直接打开真实MP4，readyState=4、error=null，播放到11.541秒结束，解码1080×1920，证据browser-playback.json/png。audio-check.json：片头解码静音RMS0，开场1.2秒、房屋6.3667秒处与原声4.4秒片段相关系数0.99094/0.98641，AAC有重编码，不宣称PCM逐字节相等。单元测试另覆盖裁切、静音、重排、转场交接及稀疏字幕进入/退出帧。
- 完整检查：lint、format:check、typecheck、Next生产build、git diff --check通过，129/129测试通过。测试需启动本机HTTP监听；受限沙箱最初14项listen EPERM，授权本机监听后完整重跑通过。证据与日志在artifacts/subtitles-2026-10-30，测试与业务媒体位于隔离临时目录，未使用用户房源录音、未调用云识别。生产构建后重启自有测试服务，避免旧manifest与新静态包混用；没有修改用户既有开发服务。
- 自审范围为本轮字幕相关改动，与/private/tmp/house-subtitles-baseline核对，保留已有UI/认证/Kokoro改动。无新增已确认功能缺陷；唯一交付限制是Linux资源：公开5.6秒示例本机CPU约0.99秒，最大RSS735526912字节（约701MiB），peak footprint577930224字节；这是识别子进程，不是整服务。现有Linux整控制组768MiB尚未验收，不能直接部署、不调高上限。长片/真实噪声和方言准确率尚未验证；未重建线上视频包、未发布。
- Stop复核scope 6d4351dc367a9d7a5dfb41046739cfcd仅涵盖scripts/asr-requirements.txt、asr-inference.py、asr-download.py；其他改动不归此结论。No findings。离线补验：两份Python语法、已安装四份公开模型摘要、下载损坏的3次有界重试/旧文件保留/part清理、校验成功原子替换、有效缓存零下载均通过；真实CPU识别再次产出2条字幕，通过共享Zod及原片时长校验。README补齐固定依赖与安装失败重试说明，AGENTS与部署手册现有路径/离线边界一致，无需重复追加。Linux768MiB与长片资源仍未验收，结论Ship with caution。
- 文档已同步README、AGENTS、plan、deploy/README；Recreation Metrics O1/O2/O3/S1/S2/S3均N/A（原声字幕功能，不是网站复刻）。

WEBSITE_RECREATION_VERDICT: Ship with caution

HARNESS_DOCS_STATUS: Updated

HARNESS_REVIEW_VERDICT: Ship with caution

## Kokoro-82M v1.1-zh 切换（2026-10-28，本机验收）

本次范围只包括本轮工具写入的Kokoro推理/安装/测试文件、照片单张和批量配音入口、相关按钮文案、验收脚本及直接关联文档。开始时仓库已有大量未提交改动，不将整份HEAD差异作为本次评审对象；相邻项目未修改。

- 官方模型`hexgrad/Kokoro-82M-v1.1-zh`，revision `01e7505bd6a7a2ac4975463114c3a7650a9f7218`，音色`zf_001`；权重SHA256核对官方值`b1d8410fa44dfb5c15471fd6c4225ea6b4e9ac7fa03c98e8bea47a9928476e2b`通过。安装自检实际离线合成成功。Python3.11、torch2.6.0、kokoro0.9.4、misaki0.9.4；独立运行目录约1.2GB。首次自检发现脚本同名遮蔽Python包，已改为`kokoro-inference.py`并重新通过。
- lint、format:check、typecheck、build、git diff --check通过。完整离线测试117/117通过；首次沙箱运行因loopback监听EPERM有14项环境失败，获准本机监听后全量通过。最后清理保护改动后再次通过定向4项适配器测试。
- 定向测试覆盖缺模型禁用、空/超长输入、账号目录隔离、排队期间保护临时媒体、成功/失败清除文本、子进程错误脱敏、损坏音频删除和槽位释放。长文本分割额外检查300字符、长句/换行的完整保留与每块音素上限。
- 真实接口通过单张生成、批量改词只更新变更场景、匹配场景保持旧音频路径；5条匹配配音批量调用全部复用。运行子进程设置HF/Transformers离线，模型和词典已安装；未调用付费API。
- `pnpm verify`已改为通过真实`generate-local-narration`接口生成5条配音，再渲染成片。样片44.233秒，1080×1920，H.264/AAC，5条场景配音；WAV为24kHz/单声道/16bit PCM，首条8.675秒，峰值约-7.02dBFS，RMS约-25.56dBFS。现有FFmpeg没有volumedetect滤镜，改用PCM样本直接计算音量。检查实际首尾场景关键帧与浏览器MP4播放（播放中、duration44.233、videoWidth1080、videoHeight1920、error=null）。
- 浏览器`/`与`/video-edit`直达/刷新正常，三类输入保留；`/photo-mode`安装缺失/就绪提示、单张生成/播放、改词后过期提示及禁止导出、恢复原文后解锁均通过。桌面1280×720和窄屏390×844截图检查，窄屏scrollWidth=390无横向溢出。控制台存在既有Remotion许可证提示及一次图片解码warning，未见本次Kokoro的请求/播放/水合错误；真实成片画面已检查。
- 证据位于`data/kokoro-verification/`：`voice.wav`、`demo.mp4`、`report.json`、`project.json`、`batch.json`、`photo-mode.png`、`photo-mode-mobile.png`。演示均为虚构房源，未覆盖用户浏览器草稿；证据在本地非临时模式保存，不随公网发布打包。

按code-review与IntegrityGate对本轮确认改动复核，未发现可确认的P0/P1/P2/P3问题。API字段、路径和Zod契约保持兼容，无需修改共享契约或视频模板。按neat-freak增量核对并同步README、AGENTS、plan和部署说明的模型/命令/运行边界。Linux正式环境768MiB限制下的峰值、OOM和长文案资源验收未覆盖，因此仅可作为本地交付，尚未发布；不调整线上资源限制。

本任务不属于网站复刻，Recreation Metrics O1/O2/O3/S1/S2/S3全部N/A。WEBSITE_RECREATION_VERDICT: Ship with caution。HARNESS_DOCS_STATUS: Updated。HARNESS_REVIEW_VERDICT: Ship with caution。

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

## 本机端口冲突与限定范围复核（2026-10-26）

本次原始问题为4317被旧生产服务占用。先确认原进程属于本仓库且三个任务均已完成，再停止旧进程恢复开发服务。期间工作区由其他工作流将默认端口改为4318；本次保留这些改动，并核对scripts/cloud.ts、scripts/verify.ts、server/index.ts、server/video-edit.ts四个门禁文件的完整差异及直接依赖。README启动与实拍地址同步4318，补充PORT、VERIFY_ORIGIN与EADDRINUSE排查；rules/api-data-source.md已同步4318，无需再改。枚举根目录、rules及新增deploy文档，当前契约、鉴权与预编译运行要求已由对应工作流记录，不覆盖其发布说明或历史验收端口。

当前lint、format:check、typecheck、生产build通过；完整84/84测试在允许本机随机端口监听后通过（沙箱首次运行鉴权测试因EPERM失败）。复核服务入口Host/Origin与鉴权先后顺序、默认端口一致性、多素材本地路径验证与绝对URL、缓存身份及预编译指纹依赖，未发现本次范围可确认的新问题。当前4318首页浏览器已读取原有口播及四份房屋素材，页面恢复可操作；未点击保存、生成或云调用。验收过程中外部工作流重启过服务，不将旧进程退出解释成产品故障，也不停止其后来启动的进程。

本轮pnpm verify实际经过4318 API与本机免费语音生成任务34b19b64-a9ce-402d-b0cb-a2efb238133b：5个演示场景、9段本地渲染、H.264/AAC、1080×1920、33.133秒，编码与时长断言及解码抽帧通过，报告在data/verification.json、data/verified-project.json与data/scene-*.png。不调用付费模型、不保存正式草稿。该媒体验收发生在期间其他登录/预编译改动之前，不能代替这些后续改动或大素材压力验收；当前完整自动检查已重跑，后续登录/部署媒体证据见对应章节。

Recreation Metrics O1/O2/O3/S1/S2/S3=N/A（本机启动故障与代码复核，非网站复刻）。WEBSITE_RECREATION_VERDICT: Ship with caution。

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

## 上传入口拖拽（2026-10-25）

新增 studio 域内复用的 FileUpload，实拍口播/房屋多素材/封面/音乐、照片模式开场/批量照片/单图录音/音乐/JSON配置导入均接入。点击和拖入走相同业务回调，沿用上传限制与本机服务；扩展名错误、单文件区多份文件和禁用状态在前端阻断。原生 input 支持键盘与重复选择，文件拖入高亮只改变颜色，边框宽度始终相同。不新增依赖、API 或云调用。

验证结果：

- lint、format:check、typecheck、build 通过；完整 test 66/66 通过；git diff --check 通过。
- 临时隔离浏览器页挂载真实 FileUpload，通过 DataTransfer＋DragEvent 验证多文件顺序（first.JPG、second.png）、单文件拒绝多份、错误扩展名、不区分扩展名大小写、连续同名接收、disabled 和父 fieldset 禁用。输出仅包含预期的三次回调，无错误/禁用回调。
- 使用真实 JPEG 的 drop 事件调用业务 api.uploadImage，得到 /media/dd702686-9759-499b-9b4c-01719fd543ca.jpg；原生文件选择器再次上传成功，得到 /media/80a9b98b-f5b5-4538-b564-cf6d536223af.jpg。隔离验收不保存草稿。临时页面已移除，源证据留 data/drag-upload-verification/browser-harness.tsx。
- /video-edit 的口播、混合素材和音乐入口，以及 /photo-mode 的开场、图片、录音、音乐和导入入口在浏览器显示正确。375px 两页 scrollWidth=375；默认桌面宽度1280px截图正常；浏览器无 error。桌面/窄屏证据在 data/drag-upload-verification/desktop.png 与 mobile.png。
- 将上述 drop 上传图片提交真实本地导出，任务54a1640f-60f4-4b99-a3c7-12fe9f5c07f3完成，更新1段/复用0段；ffprobe确认 H.264/AAC、1080×1920、30fps、3.000313秒，解码第1秒画面查看正常。未发付费请求。
- 两份草稿与云预算 SHA1 和改动前相同。测试新增独立上传文件/短片任务，不改用户原片或已有成片；照片页最近任务可能显示测试片。

范围评审：输入边界、批量顺序、父级禁用、点击兼容、键盘访问、错误显示和调用方逐项核对，未发现可确认问题。代码仅在 studio 域内聚合，不引入全局上传层。现有工作区其他未提交改动保持。

Recreation Metrics：O1/O2/O3/S1/S2/S3 均 N/A，本次为既有上传交互增强，未进行站点复刻。保留 origin.html、旧生产页面 before.png 与原 HouseMaterials 作为证据；页面分区仍为页头/素材/房源文案/预览，素材继续使用原 media、demo、exports 映射。WEBSITE_RECREATION_VERDICT: Ship（上传交互范围）。

## 统一默认入口、混合素材与封面来源（2026-10-25）

用户指出实际页面仍为旧照片页，默认应为口播开场＋多份房屋视频/照片＋房源信息与文案。首页与/video-edit现共用VideoEditPage和草稿，旧照片精细编辑保留/photo-mode。空项目始终显示三类输入。新增materials判别联合及shot.sourceId，同步本机验证、预览、导出、缓存和百炼关键帧，兼容旧house单视频草稿。最多12素材/12片段，逐份上传保存，可调序/移除；新视频默认完整播放，照片5秒，可编辑至30秒。保留同期独立工作加入的FileUpload控件，不新增依赖或API。

整段文案在本机规则提取，先核对再采纳。用户多版本浅水湾原文得到安福浅水湾、3楼、128.65㎡、3房、精装修、59万、另带柴草间。59/60万冲突先选定，改变原文清空旧预览；采纳前不改项目，不替换已录声音。字段可编辑并保存，原文仅页面临时保存。规则不承诺任意语义识别，未识别内容可手填；同期独立口语规则扩展保留。

封面默认口播真实第0帧，可选首份房屋视频第0帧/照片或上传图。冻结且静音，不使用约1秒缩略图，来源/图片/0.5～10秒时长通过Zod保存；预览、MP4开头与PNG共用组件。上传来源缺图时阻止保存/导出。新建先保存空草稿，成功后清空编辑内容、临时输入与任务显示；保存失败保留当前项目。sessionId隔离历史任务，新建后刷新不再显示旧下载链接，源文件及历史输出保留。

实际4322隔离浏览器验证：新建空白与刷新、文件选择器上传口播、一次混选1个视频＋2张照片、排序/移除/保存刷新、长文提取采纳、三种封面、缺图错误、原创音乐与三次导出通过。默认口播和房屋封面两版均17.707秒；上传图封面＋口播＋纯照片版15.339秒，全部H.264/AAC、1080×1920。原生播放器结束时ended=true、readyState=4、error=null。正式4317的/和/video-edit也已核对为同一新页面，textarea和multiple上传输入存在，无console error，保留正式当前素材，未在正式草稿点击新建或导出。

375/1280/1440/1600/1920宽度无横向溢出。1920宽运镜触发器及菜单左右边界同为1466/1606，垂直间距6px；375宽封面触发器和菜单同为38～337。作用域内覆盖供应商偏移，保留向上展开与最大高度。

MP4解码核验：口播/房屋/上传图封面背景相对真实来源PSNR为40.370/39.275/30.751dB（含缩放与有损编码）；第0与35帧53.533dB，第36帧进入正文13.372dB。已目视三种封面及混合照片正文。切换口播/房屋底图两版解码WAV的SHA256一致，未增加或重放原声。未做跨系统字体及主观听审；未调用真实百炼推理或发布公网。

lint、format:check、typecheck、Next生产build及完整test通过，最新69/69；git diff --check通过。按code-review复核素材引用、真实文件验证、旧草稿兼容、任务会话隔离、时间轴和缓存，未发现本轮可确认阻断问题。README、plan、媒体规则同步。正式草稿在验收期间存在用户及其他授权工作活动，未还原覆盖，不宣称其字节始终未变；本轮导出/新建均使用隔离目录，未清理旧人物环境。

IntegrityGate完整范围复核：覆盖review-pack-949fabafd252b8b6e1f12fd35ba4307c列出的全部文件，以及新建的photo-mode入口、HouseMaterials和FileUpload。copy.ts公共契约由server/copy.ts的copySubmissionSchema/copyInputSchema直接解析；video-edit契约由业务API、Express路由、真实媒体验证和Remotion共同消费，不存在只改前端猜字段的情况。旧请求缺materials时补空数组，旧house仍解析为legacy-house，sourceId可选；新多素材请求逐片验证本机路径、时长和引用后才抽帧。Next生成的next-env.d.ts只随生产/开发切换输出路径，tsconfig已包含两种类型目录，无手工业务逻辑。无需数据库、其他仓库或单独镜像同步；页面/API同一应用构建重启，回滚需恢复旧草稿，不能让旧程序直接读新多素材数据。No findings。

neat-freak文档同步已枚举根目录Markdown与rules，确认无docs目录，Codex使用AGENTS.md而非额外项目记忆。README改正开头默认模式、混合上传与重新分段行为、照片次级入口、两种草稿路径及回滚要求，合并旧单视频说明；AGENTS原段落补默认三输入和封面来源规则，plan过期pages路径修正。ASSETS与SKILLS为素材来源及技能安装说明，不改变其来源/授权；其余rules保持既有边界，媒体规则已更新。没有修改相邻参考仓库或全局代理配置。文档变更后Prettier与diff检查通过；上一轮69项测试、生产构建及实际浏览器/MP4证据适用于本轮审查，本次未再改可执行代码。

证据在data/text-import-verification：origin.html、before.png、after.png、section-map.json、桌面/空态/窄屏/菜单截图、mixed-project.json、custom-project.json、三个任务JSON与cover-opening/house/custom.mp4和PNG、media-report.json、playback.json、tests.log及next-build.log。临时数据目录见harness-root.txt。Recreation Metrics：O1/O2/S1/S3=N/A（功能修复，非网站复刻）；O3/S2=pass。

HARNESS_DOCS_STATUS: Updated
HARNESS_REVIEW_VERDICT: Ship
WEBSITE_RECREATION_VERDICT: Ship

## 口语别墅文案提取（2026-10-25）

用户七条原文包含“位于老城区、四层格局、产证375.38个平方、挑空大客厅、总价336万”。旧规则把四层格局归为所在4楼，漏掉带“个”的面积单位，且没有位置/房屋类型/建筑层数的待确认项；总价原本可以匹配。现修正本地解析和采纳说明，仍使用原facts/price/extra，不新增服务端字段或接口。

用户原文提取结果：位置老城区、房屋类型别墅、建筑层数共4层、面积产证375.38㎡、总价336万、附加空间挑空客厅。采纳得到 facts=“老城区 / 别墅 / 共4层 / 产证375.38㎡”、price=“336万”、extra=“挑空客厅”。小区名、所在楼层、几房几厅、装修留空；不把受众开头里的安福猜成小区名称，不把一二楼客厅重复识别成所在2楼，也不采纳“气场拉满”等营销评价。

- 定向测试10/10、完整测试69/69通过，新增真实原文、共12层与实际3楼并存、空格/口语单位、同义产证面积去重、否定/范围/冲突与位置手机号排除。lint、format:check、typecheck、build、git diff --check通过。
- 开发浏览器粘贴完整七条、点击提取，10个待确认项正确显示；点击采纳更新当前房源说明、价格、附加信息与封面预览。未点击保存，草稿和预算SHA1不变。375px scrollWidth=375，浏览器无error；截图与extracted.json在data/property-text-villa-verification。
- 将提取结果写入带“演示素材、非该别墅实景”标识的三秒本地测试片：6177ca88-1a67-4658-ad13-98203be80a1b，更新1段/复用0段。ffprobe/解码抽帧核查H.264/AAC、1080×1920、30fps与约3秒；画面显示“老城区 / 别墅 / 共4层 / 产证375.38㎡ / 336万”和“挑空客厅”。只使用演示图片，无云调用、无人物声音更改、不覆盖正式草稿/原片/成片。
- 复核本次三个源码/测试文件的候选顺序、冲突禁用、数字与面积口径、字段长度和旧用例兼容，No findings。任意自然语言仍不保证全部识别，显式字段可人工核对与修改。

Recreation Metrics O1/O2/O3/S1/S2/S3=N/A（本机规则修复，非站点复刻）；结构仍为原粘贴/预览/采纳区，素材映射保持原demo/media/exports，原解析器证据保存在property-text-before.ts。WEBSITE_RECREATION_VERDICT: Ship。

## 配乐预览反馈与建议结果就地编辑（2026-10-25）

本轮两个用户请求一并完成。配乐实测：用户草稿已有原创钢琴；隔离播放器在无原声输出时测到WebAudio running、master gain=1、frame413 RMS约0.011314，64秒后frame1927 RMS约0.002094，说明确有钢琴输出。新增成片预览的曲名/音量状态、“只听配乐/恢复原声与配乐”对照与提示；试听仅通过VideoEditFilm可选musicOnly参数关闭视频原声输出，项目volume参数和时间轴不改，导出默认musicOnly=false。原声和配乐输入仍按原有编辑器保存。明确选择原创钢琴时若音量0则恢复8%，保留非零自定音量，并给出成功提示；上次导出仍是固定文件，提示调整后重新导出。

TourMusic用自己的useCurrentFrame计算数值volume，保持原曲线和整片帧坐标，避免默认循环回调在64秒重置后丢失片尾淡出。遵循本地Remotion音频技能的数值音量用法。

生成建议改为本地可编辑草稿：逐段标题24字、字幕100字，照片另可改解说160字；画面依据只读。编辑更新saved.result的副本，保留identity/id/evidence，修改不调用模型、不写云缓存。空白/超限不可采纳；采纳使用修改值，编辑后可再次采纳；input事实/素材/时间变化仍隐藏旧结果，busy/loading禁用输入。

验证：

- 完整lint、format:check、typecheck、build、git diff --check通过；69/69离线测试通过。
- 隔离浏览器页使用真实CopyGenerator，拦截copy请求为测试内替身，未触发真实模型。视频4条建议修改第1条标题/字幕后，采纳前输出仍“尚未采纳”；采纳后JSON包含修改值，其他片段、id和依据不变。再次编辑可再次采纳，模型请求计数仍为1；空标题阻止采纳、busy禁用、事实变化隐藏旧建议。照片模式解说/字幕修改采纳通过，原生maxLength为24/160/100。截图、结果、临时源码证据在data/copy-edit-verification。
- 实际页面显示“已加入：原创轻钢琴 · Warm Interior · 11%音量 · 全片铺底”，只听配乐可来回切换，预览总时长仍85.9秒；恢复原声后停止播放，没有保存或修改用户项目。临时音频探针和copy替身页面在验收后关闭并移除，正式构建不包含这些路由。
- 有/无配乐的真实Remotion成片前6秒对照，H.264/AAC、30fps。首秒处于静音封面原片时段：有配乐PCM RMS=0.005169648，无配乐RMS=0，确认音乐实际混入成片。原片和时长输入相同；原声参数均保持100%。证据在data/music-preview-verification。
- 修改后的“手动修改后的标题”“核对实拍后修改的字幕。”已出现在实际4秒MP4的房屋段，解码抽帧人工确认。两套验收片均以0.5倍尺寸540×960节约验证资源；正式导出仍1080×1920。未覆盖或替换用户正式成片。
- 两份草稿和旧云预算SHA1与本轮基线一致；未发真实云生成请求、未更改原始素材或音轨。期间用户自行完成的导出保持原状，没有为本轮验证重启正在使用的媒体服务。

范围评审：核对预览solo和导出mix分离、时间轴不变、循环帧坐标、Zod/字数、建议副本与采纳边界、错误/禁用与过期结果、公共依赖及临时页面清理，No findings。README和plan已同步。物理扬声器主观响度未作保证，采用浏览器非零信号和实际MP4音轨对照验证。

Recreation Metrics O1/O2/O3/S1/S2/S3=N/A（既有播放器及建议编辑交互增强，非站点复刻）。用户截图reference-before.png、修改前VideoEdit源码、界面截图与音频/成片构成证据；页面分区和素材映射保持原studio/demo/media/exports。WEBSITE_RECREATION_VERDICT: Ship。

## 实际下载成片配乐听感修正（2026-10-25）

用户提供 Downloads 中 free-tour-30991750…mp4 并反馈听不到音乐。文件与本机原导出 SHA256 相同，85.952秒、1080×1920、30fps、48kHz双声道AAC。直接解码并对齐五份原片及原创钢琴，五段拟合配乐增益0.1095～0.1098，钢琴比讲解低约16～23dB。原曲存在不代表成片听感足够，上一轮仅依赖非零信号的验收不足。

本轮新项目默认配乐由8%改25%，保留开场/房屋原声100%；旧草稿不自动迁移，新增“推荐配乐（25%）”按钮仅更新musicVolume，试听标签明确音乐原曲未混音。README及plan同步，既有历史验证数字不改写。按用户本次修正请求，通过实际页面将当前草稿11%提高25%并重新完整导出，项目快照逐字段比较仅musicVolume变化，其余素材、文案、时间、封面、原声音量均一致。

- 新任务 f66bdb74-0003-40c0-b6c3-0238a1587131，reused=false，完整生成 `data/exports/free-tour-a2583dfec058a379991054c932e4f90218b763ea2d4d706eb6e288b8f9e57df3.mp4` 与同hash封面，保留旧文件。新MP4长度85.952秒，解码采样数与旧版均4125696；原声未因本次修正裁切。
- 10个音频拟合窗口覆盖开场、四段房屋、62.5～63.9秒、64.1～65.8秒循环后、66～68秒、79～81秒和83～85.4秒淡出。新旧已有混音增益0.99952～1.00054，新增钢琴增益0.13953～0.14015，总配乐约0.24952～0.25013，即提高约7.13dB。全片解码峰值0.91065，达到绝对值1的采样为0。该客观验证不等于用户播放设备上的主观听审。
- 浏览器实际点击推荐、导出并播放新MP4，readyState=4、duration=85.952、error=null、muted=false，播放约39秒后暂停。导出中推荐按钮与音量滑条随fieldset禁用，完成后恢复。375px视口scrollWidth=375，无横向溢出；桌面1280px检查，临时视口已reset，验收截图 `data/export-music-investigation/mix-settings.png`。
- lint、format:check、typecheck、build均通过；test 69/69通过。证据保存在 `data/export-music-investigation/`（component-fit.json、corrected-audio-report.json、corrected-probe.json、frame-comparison.json、tests.log、build.log）。没有调用云模型、增加依赖/接口或公开发布。
- IntegrityGate复核范围覆盖本轮默认音量、推荐按钮与文档，并复核Stop清单的cover-settings、opening-panel、scene-editor、studio-page、video-edit-page、file-upload、house-materials全部变更。上传仍走同一服务校验；禁用边界、单一项目状态和显式导出快照未改变。No findings。

## 语义提取、文案质量与吸顶生成/下载（2026-10-25）

按用户三项反馈：新增百炼文字语义提取，改进画面文案的信息量与核对，顶部吸顶并分开生成和下载。实现前保留data/copy-v2-verification/origin.html、before.png、before-page.tsx、before-copy.ts、before-theme.css及两份草稿基线，沿用animal-island-ui/既有青绿与暖色主题，不加图片字体或依赖。

新增POST /api/copy/extract-property，前端api.ts与公共property-extraction.ts契约同步。字段配置从页面工具移到共享契约，既有本地规则不变，保留无需云调用入口。语义提取只发送移除手机号的原文，不发送媒体/音轨；返回候选与原文连续引句，服务端校验value确实在quote中、quote确实在原文中，限制长度、重复字段与联系方式；未知留空，冲突先确认。只预览/编辑，采纳才patch房源字段，草稿另行保存。cache键含模型、提示、原文摘要，文件0600、目录0700，不保存原始请求体。

复用qwen3.7-flash、北京业务空间与云锁，抽出copy-provider.ts供两个真实调用方复用；JSON模式、非思考、temperature=0.2、8192 token、120秒超时、无重定向、无自动重试或换模。生成文案加入可选brief，按每段时长采样2～6帧（最多12段/72帧），标注原片时间；较长片段建议45～90字、分2～3句，不足事实不硬凑。短镜头按max(24,3×秒数)、最多100字保留完整开头短句，无法保留完整短句则报错；不切碎文字、不为修稿再次调用模型。视频展示之前隐藏的完整narration供参考，不写入成片或替换原声。模型加入未提供的阿拉伯数字仍整体拒绝；未确认装修/朝向/产权/车位等已配置标签返回warnings，UI按当前可采纳字段重新检查，删改前禁用采纳。此规则不是完整事实证明，镜头内容和参考说明仍需人工核对，尤其主观判断及词表外结论。

真实模型：用户在本轮异步回复确认有免费额度、已开启用完即停并允许真实验证后，实际执行6次推理：3次文字提取（浅水湾一次、别墅两次）、同一组房屋关键帧文案3次。最初sandbox连接失败没有自动重试，取得网络执行权限后按已授权范围手动验证。浅水湾得到安福浅水湾、3楼、128.65㎡、三房、精装修、59万及附带柴草间；别墅首轮漏挑空客厅，明确字段提示后获得老城区、四层格局、产证375.38个平方、336万、一二楼做了挑空大客厅；小区名、所在楼层与具体房厅数留空。真实返回仍出现毛坯、承重梁、可停车等未确认判断，不能宣称模型无误。早期策略因此拒绝输出，最终策略保留原稿供编辑、明确warnings并阻止直接采纳；同一真实响应按最终解析规则离线重验，结果见real-copy-guarded.json。没有为了展示成功伪造真实模型输出，没有在正式草稿自动采纳或生成配音。只发送房屋关键帧，没有人物开场、音轨或Key。免费额度由用户确认，程序未读取余额或实际账单，不能独立证明每次账单为零。

浏览器：4322使用完全隔离草稿/媒体副本及离线模型替身，真实FileUpload/CopyGenerator/PropertyTextImport与API链路。未勾选时语义按钮禁用，59/60万冲突禁用采纳，选择59万后可采纳，采纳前房源名仍为离线验收房源。加入毛坯标签时采纳禁用，编辑标题/字幕后恢复；修改文案要求隐藏旧建议。实际点击顶部生成完成任务0a5fe97a-a689-440d-8b25-201bbd896f13，再点击顶部下载；浏览器下载至Downloads，SHA256与生成文件一致（804c418105b8ff5adfd49144a3763b5c97341ad2438dd3a7ea009179b72f4fe6），下载后仍只有1个任务，证明不是重新生成。输出7.851秒、1080×1920、H.264/AAC，解码第4秒确认标题及采纳字幕可见。未修改视频模板时间轴或原声。

吸顶：所有studio header position=sticky/top=0/z-index=40。375宽、scrollY=7456.5时header.top=0、高240，下载按钮在视口182～222之间，scrollWidth=375；1280桌面截图正常。正式4317使用最终构建，1440宽scrollWidth=1440，scrollY=1031时header.top=0，无console error。正式页点击同一别墅原文语义提取命中真实缓存并展示引句，未点击采纳/保存/生成；保留当前项目及上次成片，用户仍需核对后采纳。照片页共用吸顶CSS及生成/下载区分。默认端口4318是同期独立授权修改，本轮保留；为用户当前4317入口以PORT=4317启动正式服务，不覆盖4318进程。

质量门禁：lint、format:check、typecheck、Next生产build通过；75/75离线测试通过，涵盖同意前置、真实引句、手机号移除、伪造/重复字段、截断/429无重试、缓存、长片真实取帧、字幕短句与未确认标签警告；git diff --check通过。范围复核接口/共享Zod/服务/前端消费已同步，无数据库或外部仓库依赖，新增可选brief/warnings向后兼容，旧项目字段未迁移；部署需同一应用构建并重启API。No findings（代码范围）；真实语义质量仍需人工复核，因此Ship with caution。

neat-freak同步：枚举根目录Markdown及rules，无docs目录，无额外项目记忆；README就地更新模型提取、2～6帧、完整参考、短句与警告、生成/下载及API说明，AGENTS和api-data-source更新云调用范围，plan记录本轮设计，ASSETS/SKILLS素材与技能来源不变，无需改。原verify历史记录保留，不篡改其他授权工作的配乐验证。证据目录包含real-villa-recheck.json、real-multi.json、real-copy-provider-final.json、real-copy-guarded.json、unsafe-review.png、mobile-sticky.png、header-1280.png、after.png、accepted.mp4/accepted-frame.png、render-job.json、download-report.json、tests.log、build.log与section-map.json。

Recreation Metrics O1/O2/S1/S3=N/A（功能改进，非目标站复刻）；O3/S2=pass。浏览器及真实MP4验证如上。WEBSITE_RECREATION_VERDICT: Ship with caution
HARNESS_DOCS_STATUS: Updated
HARNESS_REVIEW_VERDICT: Ship with caution

## 宝塔 Linux 部署与上线验收（2026-10-26）

用户确认将房源视频工作室部署至121.41.6.73，沿用文件存储、空工作室并同步百炼私有配置。只读参考image-forge-AI发布方式；不迁移其数据库或本机房源素材。IP原首页为ImageForge，原反代及站点配置已备份。用户在2026-10-26明确回复“现在切换IP首页”后，只替换IP站点反代，nginx -t及reload成功，原服务与数据库仍运行。证据在data/deployment-verification，包括origin.html、before.png、candidate-final.png、candidate-375.png、linux-complete.png、isolated.mp4、isolated-probe.json、result.json、section-map.json、linux-final-report.txt及public-report.txt。

服务发布在/opt/house-video-studio/releases/20261025T154800Z，current指向该版本，shared/data中只有程序生成的内置钢琴，无用户草稿、原片或历史成片。shared/.env.cloud单独传输且0600，只检查模型能力ready=true，不发新的模型推理。独立Node22和Chromium，系统Node20不替换；Linux安装中文字体和浏览器系统依赖。认证文件root持有、www组可读，应用用户无写权限；Nginx的页面/API/media/exports统一保护，应用只监听127.0.0.1:4340，PUBLIC_ORIGIN为准确的HTTP IP来源，Origin不删改。独立loopback预览网关实测匿名401、认证200、恶意Origin写入403、正确Origin进入API、Range请求206；原IP反代摘要仍与备份一致。

真实Linux FileUpload链路导入合成开场视频及演示房源照片，配置中文房源文字、3秒照片和25%内置音乐，在隔离verification目录渲染。首轮运行时编译导致OOM，系统日志确认同时影响原ImageForge及MySQL自动重启；两者已恢复，未改其数据或配置。后改为构建机预编译photo/real视频包，生产校验视频源码、共享契约及锁文件摘要，缺失/过期直接失败。实测发现Remotion媒体缓存最低240MB，最终设256MB，视频帧缓存64MB、单线程、Node堆384MB。进一步迁入systemd控制组，768MB总内存、一个CPU核、停止时清理全组子进程，保护原服务；原候选PM2应用仅移除本工作室一项。

最终控制组内实际完成任务81613118-96ab-40d6-a031-f190aa38cfab，NRestarts=0，内存峰值达到768MB限制并发生回收，无新增系统OOM、原服务无再次重启。MP4为H.264/AAC、1080×1920、30FPS、容器5.845秒（175视频帧），包含1.2秒开头封面、完整2秒合成开场及照片段。抽帧确认中文封面/片尾可见；短照片被既有片尾覆盖，本次未将其当作逐段字幕效果证据。HTTP下载与原文件SHA256一致，Range206；浏览器原生播放器readyState=4，播放到5.845秒末尾且无媒体错误。该片使用演示照片及音乐，不含真人口播，不能视为长片、真实人声听感或12份大素材压力验收。

候选浏览器空状态显示三类输入、顶部生成/下载分离、百炼配置就绪，桌面1280和窄屏375均无横向溢出。lint、format:check、typecheck、Next生产build、77/77离线测试通过，build:video两包构建通过，bash -n、systemd-analyze verify及nginx -t通过。源码/契约/依赖清单随同一发布包同步；无数据库契约变化。PUBLIC_ORIGIN、Linux浏览器路径及预编译指纹有离线验证；已有语义提取、混合素材和生成/下载改动的契约与浏览器复核见前节。No findings（已修正发现的问题）；HTTP无加密及长片资源压力仍为交付限制。

公网切换后：页面、video-edit、API、media、exports匿名访问401；认证后页面200、百炼ready=true、跨站写入403、正确Origin进入API、Range206。用户Mac从公网IP取得认证页面并核对工作室标题，保存public-origin.html。内置浏览器直达公网被Basic认证拦截（ERR_INVALID_AUTH_CREDENTIALS），无法在其内完成登录；浏览器完整页面与MP4播放证据来自同一服务器通过SSH隧道的候选验收，不宣称公网浏览器已完成登录。私有凭据以0600文件交付，不写入代码、公开日志或发布包。

neat-freak检查README、AGENTS、rules、plan和部署说明，修正原“仅本机无公网部署”的过期描述，同步systemd、预编译包、Linux限制、当前上线状态及回滚；没有docs目录或其他项目文档需修改。Recreation Metrics O1/O2/S1/S3=N/A（部署，非视觉复刻），O3/S2=pass（服务器候选浏览器与MP4，公网认证后HTTP另验）。WEBSITE_RECREATION_VERDICT: Ship with caution。

## 正式登录页面与会话上线（2026-10-26）

用户要求替换浏览器Basic弹窗。本轮实现/login薄路由、studio登录页及CSS模块、auth-api、两个编辑器共用的SessionControl、共享auth Zod契约、Express auth中间件与管理员配置迁移脚本；无新增依赖、数据库、用户注册或云调用。证据先保存在data/login-verification/origin.html、before.png、before-index.ts、before-proxy.conf和baseline-status.txt；主题、分区与素材映射见theme-snapshot.json、section-map.json。登录图复用公开演示客厅图，不包含用户素材；ASSETS已补来源。

账号密码沿用原凭据，服务器只新增root:housevideo/0640的private/auth.json，父目录0750。随机盐scrypt校验，32字节随机会话只存SHA256摘要，8小时过期，登录轮换旧会话、退出撤销、服务重启失效，最多32个会话。Cookie为HttpOnly/SameSite=Strict/Path=/，HTTPS来源才启用Secure；本次仍是用户已知的HTTP地址，不能宣称加密。登录每工作室最多10次/分钟，JSON限4KB，错误提示不回显密码；不写浏览器存储或日志。认证在Host/Origin之后、数据/Next之前执行。PUBLIC_ORIGIN缺少STUDIO_AUTH_CONFIG时启动失败；Nginx固定上游Host为公网IP，移除Basic，不用127.0.0.1或客户端Host。匿名页面303到登录，API/media/exports/demo为401；只有/login、登录用公共图片、Next静态构建资源公开。直接内部127.0.0.1仅可GET/HEAD media/demo，API和exports仍须会话。Next HTML使用动态响应，公网实测Cache-Control含private/no-store、无WWW-Authenticate。

本机4353使用独立假账号与空数据验收，Linux4344使用同一候选构建和隔离演示素材，均不改正式草稿。浏览器验证错误密码提示、清空密码、显示/隐藏、Enter提交进入工作室、顶部退出返回登录；1280/1440/1600桌面和375窄屏无横向溢出；最终移动标题为自然两行。标准表单控件与主按钮40px、表单间距24px，沿用宿主暖色tokens、24px面板与库交互；不套用灰白主题。移动标题最后调整为自然的两行，未增加依赖或字体。截图desktop-1280.png、desktop-1440.png、desktop-1600.png、mobile-375.png、wrong-password.png、linux-complete.png；最终检查页无console error/warn，登录返回/photo-mode及照片页退出均通过。公网页面已实际加载，Nginx日志显示HTML/样式/图片/字体/脚本与session接口均200；但内置浏览器对公网tab的自动观察多次超时并重置，故不把它算作公网浏览器完成登录。完整UI交互和真实视频播放证据来自本机/SSH候选；公网认证流程用真实HTTP另验，结果public-auth-report.txt及Mac取得的public-after.html/public-after-headers.txt。

真实Linux任务2a545899-2d68-408a-81ec-f3e0066aecb8通过会话提交：合成开场2秒、演示客厅照片6秒、1.2秒封面、25%钢琴。输出accepted.mp4为H.264/AAC、1080×1920、30FPS、容器8.853秒，抽4.2秒确认“演示客厅”及测试字幕，播放器readyState=4且播放至结尾，无媒体错误。登录后下载1868116字节，与原文件SHA256均为26f3101b181a5fe5d5ae6f5b3690184d50fa6421da0b0e7d72d00d483f739c7a；未登录实际MP4为401，登录后200、Range206。768MB控制组内完成，无新增OOM，NRestarts=0。未做长片/并发压力、真实人声听感或真实百炼调用；视频模板与原声逻辑没有修改。

84/84测试、lint、typecheck、format:check、生产build、build:video均通过；bash -n、systemd-analyze verify及nginx -t通过。测试覆盖启动缺配置、返回路径白名单、真实Host、媒体例外、错误密码/来源、畸形与过大JSON、Cookie轮换/伪造/重复/过期/退出重放、HTTPS Secure、限流恢复和本地免登录模式。首轮测试被sandbox禁止监听本机端口，获得本机端口执行权限后运行；另发现Node fetch改写Host，改用node:http验证真实Host。Linux联调发现JSON错误处理会把上游403改为400，已限制只处理JSON解析/大小错误并增加前置Origin错误测试，最终公网403正确。

上线目录/opt/house-video-studio/releases/20261026-login，current已切换。切换前确认无渲染任务，备份login-before-proxy.conf、login-before.service及current路径，先启用新应用鉴权再移除Basic，脚本失败自动恢复。正式shared/data和百炼配置保留，未把测试素材迁入；原ImageForge HTTP200、MySQL及工作室active。公网实测登录200、受限页303、数据401、登录后页面/API200、跨站403、退出后旧Cookie401。API、Zod、前端调用和部署配置同批同步，不涉及SQL或其他仓库。回滚顺序、会话行为与私有配置已同步README、AGENTS、rules、deploy/README、plan及原私有凭据文件的使用说明。

IntegrityGate/code-review复核上述全部新增文件、index鉴权顺序、layout缓存、两个编辑器退出入口、代理/服务/stage脚本与测试；No findings（已修正发现的问题）。新增鉴权模块和会话控件分别承担服务边界与跨编辑器复用，无第二套身份数据库。现有HTTP及公网浏览器自动化限制如上。Recreation Metrics O1/O2/S1/S3=N/A（原产品登录页改进，非目标站复刻），O3/S2=pass（本机及SSH浏览器、MP4及公网HTTP）。WEBSITE_RECREATION_VERDICT: Ship with caution。
WEBSITE_RECREATION_VERDICT: Ship with caution

## 登录与工作流界面整理（2026-10-26）

用户要求整体整理毛胚观感、过大留白、按钮边界、装饰图标和混乱交互。本轮修改仅在studio业务页面/控件、主题与说明文档；无新增依赖、请求、数据库或认证规则。`data/ux-reorg-verification/`先保留origin.html、before-login.png、before-studio.png、before-video-edit.tsx、before-login.css与用户参考图；theme-snapshot.json记录旧库按钮硬编码与当前局部tokens，section-map.json记录分区及复用素材。复用现有公开客厅图，没有新建图像素材。

当前采用warm professional workspace：#28695d主色、#1d5147悬停、#f4f3ee背景、#fffefa面板、#293d37文字，1px边框、8px控件与14px面板圆角。用户明确要求覆盖旧立体胶囊/丝带风格，仍复用animal-island-ui公开控件；`@theme inline`让Tailwind读取局部token，媒体播放器按钮不受产品按钮覆盖。保留密码可见性/视频播放等有明确用途的图标，删除其余装饰图标。动作反馈只用颜色与边框，未增加动效或依赖。

实拍页为四个编号定位区，空态直接显示口播、多个房屋视频/照片、房源文案；主编辑列加固定预览，窄屏输入在前。可选AI、逐段时间与混音用原生details展开。生成统一在底部固定栏，完成后出现下载；照片精细模式同步双列与明确文字操作，删掉重复合成入口。私有SceneEditor移除canExport透传后唯一调用点已同步；实际生成仍调用原useStudio.exportVideo，接口/Zod/视频时间轴/云调用边界无需改动。

实际浏览器验证登录及主编辑1280/1440/1600与375宽度，scrollWidth均等于视口；登录主按钮48px且背景rgb(40,105,93)，手机工作室头部修正为107px，不再挤为149/169px。照片模式验证1600与375、演示加载和当前照片文案入口。主流程通过原生文件选择器上传2秒测试开场、2秒房屋视频及照片混合素材；本地文案提取后采纳，字段正确更新。步骤导航、AI与声音展开、封面菜单、Escape关闭、草稿恢复及新建清空均实测；手机封面菜单横向33–342px，视口375px。清空仅在隔离测试data中进行，原素材/成片保留。截图login-1280/1440/1600.png、login-mobile-375.png、studio-final-desktop.png、studio-mobile-375.png、cover-menu-mobile.png、copy-mobile-375.png、photo-desktop-1600.png、photo-mobile.png。浏览器无新增error，只有既有Remotion许可提示。

通过新版固定操作栏实际生成本机MP4：job f6850e77-bb67-4ed3-8b59-e389c78a5073，10.219秒、1080×1920、H.264/AAC、30fps；浏览器原生播放器ended=true、readyState=4、error=null。下载文件与accepted.mp4的SHA256均为88aefdd6fcc2925d8fc0be80d7f30340ea2d471e20b52b435653df621ab75be9。浏览器下载工具虽然最终成功但等待约12分钟，后续下载使用HTTP与文件校验，不重复调用该等待接口。所有素材、账号和草稿使用4353隔离工作室；未调用模型。

Linux候选使用独立演示data，先发现验收unit缺少pnpm路径，再发现macOS打包混入356个AppleDouble元数据文件导致模板摘要失败；均在正式切换前修正。候选PATH与正式unit一致，移除发布包元数据后源码摘要与视频包同为40b4221c5044b0f6d61a0cdf17689de666d245c22d6d8cdfe045d99b54c2e14e；干净打包命令与检查已同步部署文档。随后全新渲染job 01ba9da9-1884-4f21-9c4b-160f56f1e6b7成功，reused=false，8.853秒1080×1920 H.264/AAC；linux-accepted.mp4的SHA256为0b5fe4c6cb5a00e50232c646f4340b4526bee028f9b93862469d8f4e2a085d0c。candidate-auth-report.json验证登录、页面/静态资源、媒体401/200/Range206、跨站403及退出撤销Cookie。

生产切至releases/20261026-ux（Build ID l24GcW9QBJcCaLXnetMHB），切换前检查两个正式渲染队列空闲，备份current/systemd/反代与数据摘要；切换前后shared/data完全一致，NRestarts=0，原ImageForge HTTP200、mysqld仍运行。公网正式地址的登录、受限页303、数据401、登录后页面/静态资源200、跨站403、退出后旧Cookie401均通过，页面含新步骤与固定操作栏，百炼配置ready=true且没有实际推理调用。公网证据public-auth-report.json、public-login.html、public-login-headers.txt、switch-report.txt。当前HTTP与公网浏览器自动观察不稳定的既有限制继续保留：界面交互证据来自本机同一构建，公网以真实HTTP验收，不声称已完成公网浏览器全流程。未验证更大媒体/多人同时操作；本轮未变更这些行为。

lint、format:check、typecheck、build、test全部通过，84/84测试；git diff --check通过。IntegrityGate/code-review复核登录/两个编辑器/共享上传、文案导入、声音与封面入口、局部CSS、既有API调用及部署边界，No findings（验收发现的布局、路径与打包问题已修正）。neat-freak同步README当前操作说明、设计与Tailwind规则、plan、部署回滚说明；AGENTS仅指向规则，无需新增历史叙事。无跨仓或SQL改动。Recreation Metrics O1/O2/S1/S3=N/A（原产品改版，非目标站复刻），O3/S2=pass（浏览器、实际MP4与公网HTTP）；WEBSITE_RECREATION_VERDICT: Ship with caution。

## 手机上传长时间处理排查与修复（2026-10-26，未上线）

本轮只读检查现有正式服务器：约57MiB、69.545646秒的手机视频已上传到incoming，FFmpeg持续转码，CPU约99.5%，工作室控制组内存约805MB并接近768MiB限制，NRestarts=0。Nginx在15:34:09记录该iPhone上传接口200，实际等待约8分钟。因此本次不是传输失败或进程崩溃，而是转码过慢且没有明确的等待反馈。未中断用户任务、修改正式草稿或发布修复。汇总见data/upload-flow-verification/diagnosis.json，未把用户IP、密码和素材写入验收报告。

修复范围：server/video-edit.ts对大文件使用流式摘要，保留真实媒体探测、文件大小、磁盘检查、完整原声、不可变输出及失败清理；限制输入解码和滤镜线程，x264改用veryfast，缓存版本更新为v3；同一服务的视频导入与实拍导出互斥，冲突明确409。video-edit-api仍使用fetch和Zod，普通请求30秒、视频与实拍配乐上传15分钟超时，代理HTML错误及断网有明确提示，不自动重试。use-video-edit显示当前文件、素材序号、等待秒数与保存阶段；秒数是等待时间，不宣称真实转码百分比。

另修复公网HTTP环境下crypto.randomUUID不可用导致新建、房屋素材及分镜创建失败的问题。新增纯浏览器/Node共用的UUID v4生成函数src/services/definition/media-id.ts，用getRandomValues生成媒体及草稿标识；照片Hook、实拍Hook及共用时间轴都消费它。该函数属于现有共享媒体数据定义边界，确有三个调用模块，无新增shared层、依赖、API路径或字段。身份认证与会话随机数仍使用原Node安全实现。测试让randomUUID抛错，验证新建UUID合法、唯一且分镜创建成功；还覆盖并发拒绝及失败解锁、代理504和悬挂请求超时。

本机4357使用/private/tmp/house-upload-check-esine2hx独立data，原仓库及线上草稿未被验收覆盖。375px浏览器通过真实选择器上传2160x3840的3秒合成音轨MOV，再多选房屋视频和厨房照片；保存、/video-edit直达和刷新恢复、免费生成、新建空项目、损坏视频明确错误及解除busy均实测。1280px首页无横向溢出；照片模式互跳正常，页面无console error。手机端是桌面浏览器375px模拟，未连接实体iPhone。截图mobile-complete.png及result.json在data/upload-flow-verification；分区、素材和主题参考沿用上轮UX证据，界面布局/素材未改，不称新视觉复刻。

实际新任务7a95ecad-a1a0-4e8a-bdab-939c9143b85c，reused=false，MP4为H.264/AAC、1080x1920、30fps、12.203秒，包含1.2秒封面、完整3秒开场、3秒房屋视频和5秒照片。浏览器原生播放器ended=true、currentTime=12.203、readyState=4，无媒体错误；实际解码抽取封面、开场、房屋和照片画面并检查。文件accepted.mp4、mp4-probe.json及抽帧保留；音轨为合成测试音，未评价真人讲解听感。相同本机3秒4K样片旧转码1.596秒、新转码1.016秒，只是短片参数对照，不推断小内存Linux上70秒素材的改善幅度。

lint、format:check、typecheck、Next生产build、build:video及89/89测试通过，预编译real模板源码指纹验证通过，git diff --check通过。登录集成测试首轮因沙箱禁止监听本机端口而失败，在允许本机端口后完整重跑通过。测试及浏览器均不发云模型请求。完整记录及本轮差异在data/upload-flow-verification；既有大批用户改动保留。neat-freak已枚举根目录、rules及deploy文档（无docs目录），README补充上传等待、超时、失败重试和视频导入互斥说明；AGENTS/rules/deploy的使用入口、API字段、鉴权与发布要求未改变，无需改写。以后发布必须同时带新版Next构建、server及两套视频预编译包，不能只替换源码。

Stop门禁进一步核对全部七个代码文件、对应Express路由和Zod。FormData的file字段、上传路径及响应schema未改，timeoutMs只在客户端计时，不传后端；无需新增DTO或迁移。复核发现配乐上传不应使用30秒普通请求超时，已同步为15分钟并加测试，覆盖慢传输30秒不中断及15分钟终止。最新Next构建重启隔离服务后，又通过真实浏览器选择器上传music.wav，草稿记录16秒配乐，按钮恢复可用且控制台无error。文档矩阵和上下游无需改动证据在documentation-review.json。IntegrityGate/code-review按本轮实际差异复核输入、并发锁释放、失败清理、fetch超时及Zod、HTTP标识兼容和视频指纹同步：No findings。未覆盖实体iPhone、修复版Linux大视频及多人压力，线上仍运行旧版本，需取得明确公网发布授权后验证。Recreation Metrics O1/O2/S1/S3=N/A，O3/S2=pass（本机浏览器与实际MP4）；WEBSITE_RECREATION_VERDICT: Ship with caution。

## 手机上传修复版上线（2026-10-26）

用户明确回复“上线吧 我好实机测试一下”后，将已通过89/89测试及lint、format:check、typecheck、Next build、build:video的源码/产物打包上线。包排除本机data、私有.env、node_modules、Next缓存与AppleDouble文件；SHA256为7a749bc02be9bea4d9def6dfc4e3340ba6867120be94f27595c1f17bc16074dd。新release为20261026-upload-fix；package.json和pnpm-lock.yaml与旧ux版本逐字一致，复用服务器已有Linux依赖，没有上传macOS依赖或修改其他项目。

先使用端口4344和独立verification/upload-20261026数据目录启动受768MiB内存、一个CPU核限制的候选服务。实际上传3秒2160x3840合成MOV并规范化到1080x1920，约22.013秒；添加厨房演示照片，保存并读取同一草稿，再提交新任务9f336d65-8d85-4ac9-9de8-891ff81bb8da（reused=false）。初次验收脚本的180秒等待上限先到，服务和任务仍正常推进；继续同一任务最终完成，没有重复渲染。成片12.203秒、1080x1920、30fps、H.264/AAC，2886710字节，下载SHA256为9c464921d5507fa9fb54794b5f1e4f9e64b07e0475fba3eb2e0f7452cde930c6，与服务器原输出一致；实际抽帧确认封面及照片，音轨为合成测试音。候选NRestarts=0。短片仍耗时，不能推断真实70秒视频性能已达标，留给实体手机测试。

候选鉴权实测匿名401、登录200、媒体Range206、跨站403、退出401。浏览器经SSH隧道打开候选登录页，375px无横向溢出、图片无损坏、无console error；完整上传/保存/导出浏览器证据沿用上一节的同一修复构建本机验收。公网页面自动观察仍超时，因此不宣称已完成公网浏览器登录后全流程。自动审批拒绝将既有凭据复制至本机，改为在服务器内用既有受保护凭据验证登录，未绕过拒绝、未导出密码、未放宽认证。

切换前确认三个正式任务接口无rendering且incoming为空，备份current、正式unit、IP反代和完整shared/data至backups/upload-fix-20261026。停止候选后切换current并只重启house-video-studio；脚本对失败设置回滚。正式unit、Nginx内容逐字未变，数据文件SHA256清单切换前后完全相同。正式current指向20261026-upload-fix，Next构建46JVyBC88UDO2Lh3kKoAP，NRestarts=0，active/running；mysqld仍active。公网地址实际HTTP检查登录页、三页面、Next静态资源200，匿名编辑器303、数据/媒体/成片401、登录后既有口播Range206、跨站写入403、退出会话401。用户原草稿仍有开场且没有房屋素材；验收没有替换正式草稿或进行付费调用。

部署证据在data/upload-release-verification：origin.html、baseline-origin.html、section-map.json、asset-and-theme-map.json、Linux候选登录截图、acceptance.json、accepted.mp4、accepted-probe.json、抽帧、切换与公网报告。回滚和Linux依赖复用关系已同步deploy/README.md。此次没有再改产品代码；部署与数据校验No findings。Recreation Metrics O1/O2/S1/S3=N/A（功能修复发布，非视觉复刻），O3/S2=pass（本机完整浏览器、Linux候选登录浏览器与真实MP4、公网HTTP）；实体iPhone和大文件压力待用户验证。WEBSITE_RECREATION_VERDICT: Ship with caution。

## 上传五分钟截止、手动取消与跨设备释放（2026-10-26）

用户实机反馈等待三四分钟，电脑被全局上传锁挡住，明确要求超时和取消。前版只有客户端等待期限，未把断线/取消传播给FFmpeg，且pnpm/CLI包装进程的终止不代表子进程停止。本轮以用户现有上线授权继续修复并更新现有网站；开始检查时旧服务incoming已空、没有FFmpeg，无需中断用户任务。

新增共享video-upload契约：固定300000ms、接收/处理/取消阶段、当前任务id和起止时间。server/video-upload管理单一拥有者，从multipart之前计时；按id取消、超时和HTTP断线共用AbortController，探测、流式摘要、转码和缩略图均受控。命令以参数数组启动独立进程组，取消杀整组并等待close；缩略图使用临时文件后原子发布，finally确保释放占用，保留已完成素材和草稿。旧upload-video的file字段不变，新增可选uploadId；GET get-upload-status和POST cancel-upload经过同一Express鉴权/来源保护，不含数据库或付费调用。陈旧id不能停止新任务，取消结束才返回空闲。

两个编辑器新增同一业务Hook及上传提示，轮询串行可清理，显示5分钟剩余时间。固定底部取消按钮不在禁用fieldset里，手机/电脑均可取消当前工作室任务；本地优先识别当前文件，兼容跨设备状态。批量取消使当前Promise失败并停止后续项，已保存项保留；照片模式开场复用同一上传控制。普通请求30秒、实拍配乐15分钟不变。纯媒体UUID及帧驱动视频模板未变。

94/94完整测试通过，覆盖客户端5分钟边界及外部abort、服务端300秒边界（模拟时钟）、清理前不解锁、父/子进程停止、陈旧id隔离、真实半传输取消/断开与临时文件清理、取消后再次请求、两个新增路由匿名401。lint、format:check、typecheck、生产build、build:video及diff检查通过。没有新增依赖或修改其他仓库。neat-freak检查README、AGENTS、rules、plan和部署说明；README原15分钟视频说明已改为5分钟、取消/断线和跨设备行为，列明新增接口；plan记录用户明确要求，部署文档同步版本及回滚，AGENTS/rules无需增加历史叙事。

本机4359使用/private/tmp/house-upload-cancel-check独立数据：模拟另一个设备保持multipart上传，浏览器375px显示剩余时间和固定取消按钮，scrollWidth=375。点击后连接RemoteDisconnected、incoming清空、口播上传按钮立即可用；随后真实文件选择器重传3秒4K MOV成功并保存。文件选择工具本身有长等待，不把它当成视频处理耗时。新任务5eb7eb7f-7eb4-40f9-86bd-fc42aada2f85实际生成H.264/AAC、1080x1920、5.845秒，浏览器播放器readyState=4且可播放。截图cancel-mobile.png、local-job.json、local-accepted.mp4和探测报告在data/upload-cancel-verification。

Linux候选cancel-20261026同样使用独立数据、768MiB及一个CPU核。确认实际FFmpeg叶子进程已启动后，取消接口约0.039秒返回空闲，pnpm/CLI/FFmpeg三个PID 1091285、1091300、1091329全部终止（包含检查叶子进程，非仅包装层）。临时文件清空，再次上传成功，3秒4K样片处理约22.737秒；新任务b57ba605-7b9b-4b09-9c86-6a0b7c53a840完成，reused=false，MP4 H.264/AAC、1080x1920、30fps、5.845秒，1366009字节，SHA256 67fdaf5affb084b9607fe2a7e6ebd55c05fb88d74da06ca4b9f9f0bee503be79，抽取封面解码正常。开始两次验收准备失败分别是包上传未结束时摘要检查拒绝，以及服务器Python3.6不支持text参数；均在正式切换前处理，未把脚本问题当成产品故障。94项本机测试与真实Linux取消互补，不把模拟时钟等同于实体手机等待5分钟的结果。

正式切到20261026-upload-cancel前备份current/unit/反代/完整data，确认正式队列和incoming空闲。切换脚本支持失败回滚，只重启house-video-studio；正式unit和Nginx逐字未改，shared/data前后摘要一致，原开场与草稿保留，候选数据不迁入。正式服务active/running、NRestarts=0。已完成公网登录、页面/静态资源、既有素材Range及新增状态/取消接口检查；原凭据只在服务器内使用，未再次尝试导出凭据。发布证据、接口报告和切换日志保存同目录，回滚见deploy/README。实拍大文件仍可能触发5分钟截止，不承诺转码性能已满足长片；实体iPhone由用户继续验证。

IntegrityGate/code-review复核新增共享契约、两层HTTP API、拥有者释放、整组子进程终止、临时文件、两页状态与按钮、身份/Origin及发布回滚：No findings。新增模块均在现有server或studio业务域，状态控件和Hook真实复用于两个编辑器，未新建共享平台或持久任务系统。Recreation Metrics O1/O2/S1/S3=N/A，O3/S2=pass（本机浏览器及Linux实际取消/MP4，公网HTTP）；WEBSITE_RECREATION_VERDICT: Ship with caution。

## 上传性能根因、免重复视频编码与直接媒体工具（2026-10-26）

用户继续追问上传为何比以前慢。本轮只读观察到约1.8MiB、10.219秒的视频已经完整进入incoming，FFmpeg在转码阶段CPU约99%，服务约670MiB且仍限制为一个CPU核。磁盘尚余约19GiB，不是空间耗尽。旧流程对任何输入都完整视频解码/缩放/重编码，并在探测、转码、输出探测、缩略图每步通过pnpm和Remotion CLI启动额外Node进程。先前超时/取消只解决退出和占用，没有解决这一性能根因。

在服务器私有0700的verification/performance-20261026保存诊断样本并以0640以下权限处理，没有传出视频。取样时本次incoming已结束，分析使用最近规范化输出，不把它虚构成原始手机文件；各组都对同一10.219秒样本运行。在独立640MiB/一CPU核诊断unit比较：CLI探测3.212秒，直接探测0.037秒；原完整转码经CLI26.846秒；复制视频流仍规范音频经CLI6.557秒，直接运行同一FFmpeg2.818秒。time的最大单进程RSS从完整转码约420188KiB降为复制约131588KiB，该指标不是工作室总内存。样片数据及单次测量不代表所有原片，也不是公网传输速度测量。

server/video-edit增加真实编码/像素格式/名义及平均帧率/SAR/起始时间/色彩传递/旋转检查；只在H.264、8bit4:2:0（包含全范围yuvj420p）、30fps、方形像素、零起始、无旋转SDR及1080x1920限制内复制视频包，音频仍归一化至AAC48k并保留完整时长；其他来源保持转换。缓存摘要版本v4避免与旧策略混淆。server/video-upload使用已固定依赖@remotion/renderer的RenderInternals导出定位同包二进制并设置与CLI相同的动态库查找，不写死平台目录、不新装系统工具；继续走原进程组控制，因此超时/取消不回退成只杀包装层。服务路由、ImportedVideo响应和草稿字段不变，没有客户端或数据库契约变更。

96/96完整测试、lint、format:check、typecheck、Next build、diff检查通过；视频模板/共享定义未变，沿用已通过build:video和源码指纹校验的1a346788e4a3cbf28e2c92a06b13a66eecdc6c86966294e80353aa26fcb13e20视频包。新增真实逐视频包SHA256相等测试，证明不是第二次编码恰好得到相似画面；24fps转换为30fps及带真实旋转矩阵的来源正确回退，原取消/截止/断线/鉴权继续回归。测试初始用旧rotate元数据命令未生成真实旋转，按已安装FFmpeg帮助改用display_rotation；时长断言改为对应测试文件的实测容器时长，避免把测试重封装自身的时戳差异当成丢帧。

本机4362使用独立临时data，实际兼容10秒MP4导入685ms，新任务dd875eb4-630e-4a1a-a1e0-239789606704为reused=false，生成13.077秒H.264/AAC、1080x1920、30fps成片。浏览器刷新恢复草稿及新成片，原生播放器readyState=4、ended=true、currentTime=13.077、无媒体error；1280及375px无横向溢出，console无error。本机时长不当成Linux性能承诺。

Linux候选fast-20261026在原768MiB/一CPU核限制内对同一诊断样本完整导入3.426秒（含探测、音频、封装、输出复核与封面），源/结果视频包逐一相同。随后只用旧候选的合成素材新渲染任务76dab66a-1da5-4bfa-b872-8ec2ce15008a，reused=false，5.845秒H.264/AAC、1080x1920、30fps，1343661字节，SHA256 fc7354fd52e1f0ac5e80263123d7e7a0d429dbf3c4ad34d15f2bdb52be1a7a49；合成成片保留服务器，仅取回不含视频内容的验收报告；首次SSH取证中途断开后重取报告。候选用户诊断样本未迁入正式data。仍需完整转换的4K/HEVC等不承诺同样速度。

按原有修复上线授权，发布20261026-upload-fast。构建包SHA256为135fee56edda31b414e19b71d3e0e1139ebeaa8b14907a18052668503a0120eb，Next构建2vSvry8IzZxCpu8foW6PJ，依赖/锁与前版一致，Linux依赖继续复用。切换前备份current/unit/反代/完整data，队列空闲且incoming为空，切换前后shared/data摘要一致；仅重启工作室，Nginx和正式unit未改，服务active/running、NRestarts=0。公网登录/页面/静态资源、旧素材Range206、新取消接口身份及Origin边界继续检查，未调用模型。证据位于data/upload-performance-verification，回滚见deploy/README。

neat-freak同步README兼容快速导入说明、plan实施范围及deploy当前版本/二进制版本边界，AGENTS/rules/既有API字段无需变更。IntegrityGate/code-review按这次server/video-edit、server/video-upload和新增真实媒体测试复核，无新增系统零件/依赖/权限，No findings。Recreation Metrics O1/O2/S1/S3=N/A（后端性能修复），O3/S2=pass（本机浏览器/MP4、Linux同样本导入及新MP4、公网HTTP）；WEBSITE_RECREATION_VERDICT: Ship with caution。

## 2026-10-26：视频多选与账号隔离初版（后续临时方案取代存储部分）

用户新增视频多选并指定新账号lhh，要求数据与任务隔离。原房屋素材选择器已带multiple；本轮补充移动媒体MIME选择能力和明确的批量入口/顺序处理提示，人物口播保持一段。新服务端workspace作用域按Cookie会话绑定身份；legacy数据原地保留，新增账号使用独立data/workspaces/<uuid>，草稿、媒体、成片、内容缓存、运行状态与任务记录均隔离。Remotion走准确loopback Host专用/_workspace路径，公网会话也不能越过。API新增页面身份头防止同浏览器旧标签页在账号切换后误保存；会话DTO新增可空username/workspaceId，上传phase新增waiting，前端消费者同步。无新增依赖/数据库/环境变量；付费预算仍为原授权总账，新账号不能重置预算或直接调用付费人物/配音。

证据在data/account-isolation-verification：源码入口修改前快照、已有页面origin/section-map/asset-map和窄屏基线，lint/typecheck/format/build/build-video/test日志、local/acceptance.json及两份实际MP4、desktop/mobile截图。自动审批拒绝下载线上源码归档，未重试或改路径绕过；复核使用本地源码与隔离运行证据。源码归档不是发布依赖。工作区在本轮开始前已有大量未提交内容，本轮不覆盖、不提交其他已有改动。

99/99离线测试通过，含真实双账号HTTP会话、Promise背景状态、草稿作用域、上传id隔离、旧标签页身份错配409、不同账号登录限流相互独立、排队取消不抢占当前slot，保留全部兼容视频逐包哈希、24fps/旋转回退、进程组取消、五分钟截止与断线清理回归。lint、format:check、typecheck、Next生产构建和两套视频模板构建通过；源码包摘要06267ba7f773b4e5562770daf3f475d9330469a3c282b1cf61e6cce6263bd20e，Next构建sBgnrZHNxfxBGeaBrGeDx。

本机独立目录/private/tmp/house-account-isolation-check、端口4363、管理员测试凭据，无真实草稿或云配置。两个真实账号分别上传视频/照片、存储两套草稿；另一个账号猜测媒体、导出、封面与任务id均404，带其他账号头返回409，公网Host的内部渲染路径403；准确loopback内部读取200。A导出时B视频接收后进入waiting，B取消后A没有失败；随后B导出202接收并排队，两份MP4均完成且reused=false。H.264/AAC、1080×1920、30fps、8.683秒，真实HTTP Range206，未上传云服务。Linux候选执行同一脚本，结果另行记录。

浏览器实际登录B读取其独立草稿；原生文件选择器isMultiple=true，一次选中batch-one.mp4和batch-two.mp4，两段顺序添加且草稿持久化，375与1280宽无横向溢出。实际MP4播放器readyState=4，点击原生播放按钮后paused=false且时间推进。另一标签页退出B并登录A，旧B页面点击保存返回“登录账号已变化，请刷新页面后再操作”，未覆盖A草稿。首轮多选验收错误引用不存在的本机第二份样片，第一份已保存，第二份连接中断；换成两份已核实存在的文件后成功，不把该验收脚本错误算成产品通过。构建时重写本机.next后曾导致仍运行的旧候选导航失败，停止并按最终构建重启后恢复；正式部署使用独立release，不原地改.next。浏览器正常流程没有JS或水合错误，仅保留上游Remotion许可提示；实体iPhone选择器仍需用户实测。

Recreation Metrics：O1/O2/S1/S3不适用（本轮是既有功能及权限修复，无页面重建目标）；O3/S2通过（功能交互与桌面/窄屏验收），图片资产沿用原有来源未新增替换。

## 2026-10-26：最终临时存储与浏览器草稿交付

用户随后确认2小时空闲清理、重启清空，并授权清空旧业务文件；自动审批要求额外明确备份范围后，用户明确授权删除upload-fix、upload-cancel和upload-fast三份data.tar.gz及旧校验清单。最终不迁移原业务素材/草稿，不建立新的旧data备份。账号配置保留、原密码不变，新增lhh；密码不写入本文件。首次输出账号交付文件被审批误认为可能包含哈希；仅核对字段名证明为新生成的username/password后，以最小字段完成交付，没有输出原账号凭据、盐值或哈希。

最终103/103测试通过，lint、format:check、typecheck、Next生产构建、视频模板构建与git diff --check通过。追加覆盖真实临时目录的重启清理、两小时边界、活动任务不清理、媒体epoch轮换、浏览器草稿刷新/配额失败/旧账号写入拦截、临时模式禁止重置账本后付费生成，以及关闭Next共享图片优化缓存。所有模型网络均为离线替身，未发付费请求。最新本机构建VlHnFOvEDBvFiRDDL74Tv；资源补丁仅3个服务器文件，前端源代码未变，线上/候选复用先前实际浏览器验收的fVEoMuVIULQDgXJ7dW1TY。视频指纹865f48d85a484e9be45cf126556972669b06448d4677a85db8a5f29490b054db保持。

本机与Linux的临时模式双账号脚本均实际通过：服务器save-draft返回410，不产生draft.json；A导出期间B视频进入waiting，B取消不影响A，随后B导出也完成且两份均reused=false。任务/素材/封面/成片猜id跨账号404，篡改页面账号头409，公网内部媒体路径403，正常文件Range206。两份LinuxMP4均H.264/AAC、1080×1920、30fps、4.139秒；证据data/account-isolation-verification/linux-temporary及linux-temporary-report.log。旧持久化候选在需求转向后停止，不能把那轮未结束的Linux验收误写成最终通过。

浏览器最终构建实际一次多选two-one.mp4和two-two.mp4，两份按顺序添加并保存到浏览器，刷新恢复房源名称/两份素材；真实生成7.211秒MP4，原生播放器播放到ended=true/currentTime=7.211/readyState=4，无媒体错误。375宽无横向溢出；temporary-mobile.png展示2小时及浏览器草稿提示。控制台正常路径无应用/水合错误，仅上游许可提示。重启隔离服务后重新登录，浏览器仍恢复房源文字，明确提示“临时素材已过期或服务已重启，请重新上传”；此时旧媒体404/播放器无法播放是已清空文件的预期结果。清除浏览器数据、换浏览器/设备不会恢复草稿；实体iPhone选择器和长视频资源压力仍由用户后续实测，不宣称覆盖。

最后资源复核补齐照片/画面文案排队和共享合成音轨。新增目标实际场景在本机和Linux均通过：A真实导出中，B照片请求等待媒体槽；B首次读取配乐仅复制缓存；A正常完成MP4，B照片成功且A不可读取，非法图片失败后下一次真实上传成功。证据local-memory.log、linux-memory.log；Linux目标成片SHA256为9483e9dc1ec21384b97d1953f8201a4df7c6f6c6bf442da31cac8db5944e32e1。资源补丁SHA256为3035463d31b582f73c57018490a01266a4b183684eece9ce63a86a56ef8b010b，未改依赖、契约、视频画布或资源上限。

正式切换记录temporary-switch-report.log：任务空闲后删除旧业务文件28份、旧数据备份/校验清单11份（含已授权3份archive）及验证副本媒体16份，候选data目录也清理；没有创建新业务data备份。上线后两个真实账号登录、空工作室、草稿410、错账号头409、内部路径403、退出撤销都通过。公网匿名检查/login200、API401、media401，Nginx保持固定Host及原Origin规则。unit相对旧版只新增STUDIO_TEMPORARY_MEDIA=1，后续资源补丁unit完全不改；没有动其他服务或数据库。

当前current为releases/20261026-accounts-memory，ActiveState=active/SubState=running/NRestarts=0，补丁切换后MemoryCurrent约239MiB（250638336字节，闲置时测量，不是峰值或长片保证）。原上限768MiB/单CPU、Node堆384MiB及媒体缓存限制保留。资源补丁前再次核对两个账号任务空闲；备份只含配置/current，不含业务data。业务文件仅在data/temporary下，没有永久业务文件或服务器draft.json；程序音轨/模板是无用户媒体的控制资源。源代码下载归档被审批拒绝，未绕过；未导出生产源码或认证哈希。

No findings：已复核本轮账号/临时存储/媒体队列代码及原Stop范围的HTTP UUID、导入、取消、Hook/API和时间轴兼容，103项回归与真实媒体证据覆盖其主链。跨层证据：auth/video-upload定义与服务端响应、auth-api/API/Hook标签一起更新；浏览器草稿读写在业务API边界，服务器410与调用方同步；新增环境变量在unit、启动断言、部署命令和文档一致。无数据库或依赖变化，媒体/exports URL格式保持；前后端统一上线，旧客户端须刷新。回滚只允许支持临时模式的账号版本，不能恢复已删除业务文件。

Recreation Metrics：O1/O2/S1/S3不适用（无页面重建目标）；O3/S2通过（实际多选、浏览器草稿、手机/桌面交互及MP4）。本轮已实际同步README、AGENTS、plan、deploy/README、规则与本验证记录；ASSETS/SKILLS无需修改，素材来源和安装能力未变。

终检补充：资源补丁最后的实际MP4探测仍为H.264/AAC、1080×1920、30fps、4.139秒，纯合成测试媒体/停止候选data已清理，只留无业务内容的结果报告。经公网Nginx实际入口再次运行两个账号的登录/草稿410/错身份409/内部路径403/退出测试，全部通过；final-public-report.log含DEPLOYED_SOURCE_MATCHES，完整非测试TS/TSX源码摘要与本机一致。终检发现video-edit-api.ts仅链式调用折行格式不合规，修正后format:check全通过，运行表达式和已部署JS行为未改，源码同步后重新核对摘要。公网浏览器自动化尝试超时一次，未计为公网浏览器通过；完整UI证据来自本机同源候选，公网通过HTTP实际鉴权检查，实体手机仍需用户验收。自动审批对备份范围及新账号凭据材料的拒绝已按明确授权和最小字段证明解决；源码归档未执行，改用摘要核验。

后续复核（用户确认忽略误贴的A/B测评、继续检查内存补丁）：正式current仍为accounts-memory，完整部署源码摘要匹配。此轮通过实际公网入口复查原账号与lhh登录、临时模式、服务器草稿410、账号头409、内部媒体403及退出撤销，均通过。控制组读数memory.usage=297787392字节（约284MiB），启动以来峰值297910272字节（约284MiB），上限805306368字节（768MiB），failcnt=0、NRestarts=0；其中常驻217948160字节（约208MiB）、缓存77152256字节（约74MiB）。主机MemAvailable=892383232字节（约851MiB）。这些是空闲复核时的实际读数，不替代前述候选并发导出测试，也不是长片峰值保证。临时目录33868932字节，永久业务文件=0、draft.json=0、原3份data备份剩余=0，报告为data/account-isolation-verification/memory-followup-report.json。没有因此重跑无变化的103项测试或修改代码；前一轮103项、真实MP4和浏览器证据仍适用于摘要完全一致的版本。

## 上传保留原片、生成时处理（2026-10-27）

用户要求手机上传不再同时剪辑。已按现有契约保留接收/取消/5分钟期限，把转码、规范原声与缩略图移动到生成202之后的重型槽；上传只有原片落盘和一次FFprobe校验（30秒、独立单槽），不哈希、不运行FFmpeg、不等待其他账号的渲染。source-UUID路径必须由服务端准备，客户端Ready不能跳过；只在渲染快照替换成import缓存路径，保留原时长/片段/名称，原片不被覆盖。两种模式共用准备函数，单份15分钟截止、解码/编码各1线程；摘要与成片校验采用流式读取。旧import草稿兼容；准备结果、原片、任务与成片仍按账号临时存储，浏览器草稿规则不变。

执行lint、format:check、typecheck、Next build、build:video、全部106项测试通过。新增覆盖原始字节一致、上传不产生归一化文件、占用重型槽时仍完成原片上传、客户端标志不能绕过验证、HEVC显式准备转H.264；兼容画面逐包哈希、24fps/旋转、原声时长、五分钟边界/取消/断线、错误后重传与账号隔离继续通过。首次普通沙箱测试有loopback listen EPERM，获准运行隔离HTTP服务后全套通过；HEVC夹具改用固定二进制实际支持的nullsrc过滤器。15分钟完整墙钟等待未执行，检查了截止控制器、进程组终止和finally释放路径，不把短片成功当作长片压力验收。

本机隔离目录/private/tmp/house-upload-original-check使用两个测试账号，不读私有云配置。HTTP实际上传HEVC原片，逐字节下载比较相同，上传后不存在import文件；A生成期间B上传成功，双方媒体/成片猜路径404，错误账号头/服务器草稿规则由既有测试覆盖。新实拍MP4为H.264/AAC、1080×1920、30fps、4.501秒；照片模式开场也准备成功且生成新的MP4。相同项目再生成复用准备和成片缓存。成片第0帧与独立封面RGB RMSE=2.365（有损编码差异），覆盖画面相同；660Hz合成原声幅度在封面为1.19、开场约7882、房屋约7873，原声没有提前到封面，原有低音量背景音乐保留。证据data/deferred-upload-verification/local。

浏览器真实选择口播，再一次多选two-one.mp4/two-two.mp4，页面明确按序新增2份并保存到当前浏览器，缩略图标明原片状态；生成按钮触发后台准备，完成后下载链接可用，原生播放器完整播放7.211秒，ended=true、readyState=4、无媒体错误。/与/video-edit直达、刷新恢复双份素材；照片模式入口与上传按钮加载可用。375、390、1920宽检查scrollWidth等于viewport，无横向溢出，保存mobile-375.png、desktop-1920.png等截图。测试曾跨过2小时临时保留期，旧默认配乐清理后首次生成按预期提示素材过期；新建项目和重新上传后完成，不将已过期文件的失败隐藏成成功。实体手机相册准备、手机网络和长片没有实测，浏览器HEVC支持仍取决于设备；页面已提示可生成成片后播放。

Linux候选original-20261027在与正式相同的768MiB/单核、堆384MiB、媒体/帧缓存256/64MiB下通过两账号、原片接收、两种模式实际新MP4和缓存复用。额外合成3840×2160/12fps/HEVC/2秒、30299字节样片，原片上传和校验0.111秒、生成51.728秒，原始字节不变；这是loopback小样片检查，不能当作真实手机传输或复杂长片速度。首次双线程4K峰值793079808字节，接近上限，因此降为1线程并清空候选缓存复测新成片：峰值690429952字节（约658MiB）、failcnt=0、NRestarts=0。最终同包重启候选后再次通过认证、三页、原片上传和隔离检查。旧临时systemd单元停止后会被移除，已按原参数重新创建；正式服务在候选验收期间未改。

按code-review/integrity-gate复核本次delta及原Hook列出的video-edit、use-studio、use-video-edit、video-edit-api、video-edit-timeline、media-id调用链：No findings。契约变更在共享Zod、上传响应、浏览器原片提示、两种后台生成路径同步；没有数据库、依赖、云调用或认证变更。源码/Next/两套视频包同包切换，旧网页需刷新；回退会失去source路径的旧前端支持，需重传，不恢复已删除业务文件。检查README、AGENTS、ASSETS、plan、rules和deploy说明并就地移除现行流程里的“上传时转码/等待重型队列”表述；历史验收章节保留为历史，不当作当前流程。

Recreation Metrics：O1/O2/S1/S3 N/A（本轮为上传流程改动，没有参考图复刻）；O3 Pass（375/390/1920）；S2 Pass（多选、保存、生成、播放、模式跳转）；WEBSITE_RECREATION_VERDICT: Ship with caution。完整长片和实体手机待用户实测。

正式上线已完成：切换前两个账号均无活动任务，backups/original-20261027仅保存current/unit元数据；未创建业务数据备份、未改认证/Nginx/其他项目。当前release为20261027-upload-original，Next构建16HCSIuY6f4TY5IClW2iU、视频包指纹2ca62de90ff9a36a71760cf9bb12734005c09f15709a59a702c50c2aa784efa1，最终构建包SHA256为13163306cd7e564b250330068b0fdd1b9d5ff7e313c3b9d33d0fbc7d25268e5a。逐份非测试src/server源码摘要与本机一致。经实际公网IP/Nginx再次验证两账号登录、三页200、临时模式/空工作室、服务器草稿410、身份头409、内部媒体403和退出401；服务active/running、NRestarts=0，复查驻留控制组内存242847744字节，认证文件仍640 root:housevideo。候选已停止；生产重启按原规则清空临时素材，浏览器需刷新重新登录/重传，未将合成验收文件迁入正式账号。证据见data/deferred-upload-verification/linux与source.sha256。

## 首份房屋素材默认封面（2026-10-27）

本轮按用户要求只修改封面来源默认值：共享videoEditSchema缺省值与EMPTY_VIDEO_EDIT均从Opening改为House，两处网页说明同步。显式保存的Opening/House/Image不覆盖；缺少字段才使用新默认值。现有模板已支持视频第0帧/照片，未改封面时长、版式、原声、上传或生成流程，也未新增依赖/API/数据库。README、AGENTS和媒体规则就地同步，plan追加需求与范围，历史默认值记录保留作历史。

lint、format:check、typecheck、Next build、build:video和106项测试均通过；复用并更新现有封面契约测试，确认EMPTY与缺省均为House、明确Opening可保留、自定义图路径仍验证。浏览器独立测试账号实际新建项目，默认combobox为“首份房屋素材（视频首帧/照片）”；手动选择口播、保存、刷新，草稿加载完成后仍为口播，再新建恢复House。375/1920宽scrollWidth与viewport一致，手机截图显示完整选项与1.2秒设置。证据data/house-cover-default-verification/browser.json、mobile-375.png与desktop-1920.png；未覆盖实体手机原生选择器。

本机使用2秒合成口播与首份公开演示厨房照片生成新MP4，默认House，status=complete/reused=false；H.264/AAC、1080×1920、30fps、4.843秒。目视视频第0帧为厨房照片，非绿色口播夹具，独立PNG与MP4第0帧RGB RMSE=2.728（有损编码差异）。证据local/project.json、probe.json、cover.png、frame-zero.png、comparison.json。照片及视频首帧选择均沿用src/video/video-edit.tsx既有分支；没有重写渲染逻辑。

范围复核No findings：新建入口、共享缺省、API空模板、草稿恢复、下拉状态与模板分支一致；改变默认值不重写明确选择，缓存含项目来源且两套视频包随共享契约重建。生产依赖/认证/临时文件策略不变。Next构建qd13mejRgdF98G1BoDoO8，两套视频指纹ce7e133aed152d9c4e6150fe55f84dfb5549c828e1fad54044d43a1e89ea17ea，构建包SHA256为5c1ea1a49732ae5f4fd7c0013ee19cfbae0e1dfbc0455c8ce7f500be252358ff。源码证据与截图在编码前保留，未覆盖用户已有其他改动。

Recreation Metrics：O1/O2/S1/S3 N/A（局部功能调整，无参考图复刻）；O3 Pass（375/1920）；S2 Pass（默认值、手动切换、保存、刷新、新建）；WEBSITE_RECREATION_VERDICT: Ship with caution。

Linux候选已完成同一首份厨房照片的实际新成片，defaultCover=house、status=complete、reused=false；候选peak=560041984字节、failcnt=0、NRestarts=0。候选首次启动约28秒，超过旧15秒探测窗口；确认HTTP200后重跑通过，并把部署就绪探测调整为有界60次、每次curl最多2秒。第一次正式切换在创建备份/切current前被原账号运行中任务门禁阻止（进度约34%），旧版本继续运行；停止已空闲候选释放资源，保存验收结果，等待正式任务空闲再切换，没有中断用户任务。

当前交付状态：代码/构建/验收完成，尚未上线。当前原账号真实任务已持续约18分钟、最近约57%；仅等待任务complete后自动切换仍会按临时策略清空未下载的成片，因此已撤回自动上线建议，要求先由用户下载结果后确认切换。正式保持20261027-upload-original，待发布20261027-house-cover；没有后台自动发布程序或自动化。具体恢复步骤见data/house-cover-default-verification/PENDING.md。

用户随后明确回复“等当前任务完成后自动上线”。已告知成功后预留10分钟下载窗口，并创建本聊天heartbeat跟进（ID automation，每5分钟检查，等待时静默，完成或异常时通知并暂停）。服务器finish-cover-when-idle.py已通过Python语法检查和只读实测，跟踪当前具体任务，首次记录时任务进度79%；成功后计时600秒，两个账号空闲且没有临时媒体文件流时才执行已验收切换与公网校验。脚本仅保存任务UUID、时间与发布状态元数据，不保存素材或密码；没有越过当前运行任务。授权与等待安排以后段为准，暂未发布事实保持不变。

用户随后确认“已下载完成，可以上线”，已暂停heartbeat automation，再通过双账号空闲门禁完成正式切换到20261027-house-cover。公网check-public-cover.py验证两账号defaultCoverIsHouse=true、页面/认证/身份头/媒体隔离正常；Next BUILD_ID=qd13mejRgdF98G1BoDoO8，服务active/running、NRestarts=0。当前封面事项已完成，后续继续处理用户新提出的1080P生成提速要求。

## 2026-10-27 1080P原生合成与7天登录（已上线）

用户确认按“浏览器只画字幕、封面与变化帧，FFmpeg合成原片，复杂转场原流程”实施，并明确登录保留一周。实现与复核见plan.md末节、data/render-speed-verification/review.md。运行时固定FFmpeg缺少overlay与rawvideo demuxer，复用已有Sharp并使用image2pipe/rawvideo显式frame_size和单线程流；没有新依赖、公开API/字段、CPU/内存额度或付费调用。源码/上传准备/账号隔离/2小时清理保持原边界。

本机lint、format:check、typecheck、Next build、两套build:video及110/110测试通过，日志在data/render-speed-verification；Next构建et3nVQjcNRn43lrX5KyJM，视频包指纹e38ed20d3e21210963706b3bdde71ed16ed957e6cd2ca269ceae8eaeac9f4488。浏览器真实登录测试账号，重启4355隔离服务后同一标签页刷新仍显示native-test，/、/video-edit、/photo-mode正常；截图session-after-restart.png。7天绝对边界、密码身份变更撤销、32会话上限、文件权限/失败原子性、退出后再重启仍拒绝旧票据由定向与完整测试覆盖。

同一11.2秒/336帧1080P合成夹具、单核/768MiB：旧medium123.120秒、控制组采样峰值805195776B；最终原生114.343秒、640974848B。约7.1%提速、20.4%峰值下降，收益仅代表本样片，不能承诺手机长片倍数。整数JS叠加实验108.220秒但峰值757338112B，比Sharp更高，已撤销。最终本机生成8.456秒只用于功能验收，不当作服务器性能。基础对照结果before-full.json/native.json；15个封面、字幕入场、转场、淡出与片尾帧点对照原模板无错位，视觉RGB RMS约1.4～2.9（含H.264有损与YUV转换），证据visual-local.json。11.2秒H264/1080×1920/30fps/AAC48k，封面静音，原声在1.25～11.15秒保持660Hz连续，见audio-local.json。

Linux完整应用候选native-app-20261027：真实上传两份原片、生成配乐＋同源两段裁剪的新成片（reused=false），进度确认走快速合成；再次提交缓存reused=true。全流程含准备、下载/复用约160.45秒，不与基础114.343秒混作同条件。控制组峰值684810240B（约653MiB），failcnt=0；照片混合回退另外生成成功，峰值728293376B（约695MiB）、failcnt=0。实际新MP4视频338帧/11.266667秒、音频11.266秒、H264/AAC48k立体声，领先封面与独立PNG RGB RMS=2.681；已目视字幕与片尾。证据accepted.mp4、linux-media.json、linux-*.png及acceptance.json。素材为公开厨房照片与合成音，不使用用户业务素材。

候选两账号真实HTTP：Cookie Max-Age=604800，重启后原Cookie仍有效、workspaceId不变但临时媒体会话变化；主动退出后401，再重启旧Cookie仍401；另一账号不能读取首账号成片、伪造workspace头409、跨站退出403。结果sessions-after.json/sessions-revoked.json。正式两账号切换前无上传、照片/口播/实拍任务，current原子切为/opt/house-video-studio/releases/20261027-native-session，安装7天会话unit，独立private/sessions目录0700、文件0600；auth.json SHA一致。仅备份current/unit及配置摘要到backups/native-session-20261027，无业务备份、无账号/代理/其他项目变更。公网两账号空工作室/首份房屋封面/权限与退出通过，Max-Age604800且私有摘要正确保存；服务active/running、NRestarts=0、切换检查内存218148864B。

回滚须先清空持久票据再恢复旧内存认证版，禁止恢复会话快照；避免后续升级复活旧Cookie。常规重启保留7天登录，但临时素材/成片仍按原规则清空；首次升级旧内存票据无法迁移，需登录一次。实体手机与更长原片尚须用户实机验证，当前单核生成速度仍有限；照片/交叠转场采用常规流程。No findings；Ship with caution。

Recreation Metrics：O1/O2/S1/S3 N/A（服务与合成流程调整，无参考图复刻）；O3 Pass（界面沿用375/1920验收，本轮三入口无布局变更）；S2 Pass（浏览器登录/刷新/重启与真实生成/下载、会话/账号隔离）；WEBSITE_RECREATION_VERDICT: Ship with caution。

## 2026-10-27 未操作却退出登录排查（线上未重启，保护候选未部署）

用户明确12:22后已重新登录，且没有点击退出。只读查询：系统自2026-03-05运行，house-video-studio最后启动为2026-10-27 12:21:39（上轮切换），PID1140667、NRestarts=0；当前release仍20261027-native-session。13:41:51 iPhone Safari登录200，13:42:09/11/12生成均202且后台失败为旧临时素材不存在，13:44:50同Safari发POST /api/auth/logout 200，随后GET /login。注销前未见401；不能把本次跳转解释为自动重启、7天到期，也不能据请求推断用户误触。暂停的封面heartbeat未运行。没有下载业务素材、修改线上认证/代理或重启服务。

源码仅SessionControl退出事件调用authApi.logout，无定时或pageshow注销；pageshow只检查会话。根因尚未复现/定位。最小防护为退出两步确认：初次只展开“确定退出当前账号？”及取消/确认按钮；确认才调用原API，取消保留会话。显式htmlType=button，确认期间忙态不允许注销，不改变Cookie期限/服务端权限/HTTP契约。此为保护措施，不能声称根因已修复。补丁仅本机，等待用户对跳转前最后操作的反馈，再决定后续追踪与上线；不因本次排查清空线上素材。

本机完整lint、format:check、typecheck、Next build、110/110测试通过。typecheck首次与Next build同时读取被重建的.next/types，产生TS6053；构建完成后串行重跑通过，无源码类型错误。实际浏览器复用上轮测试Cookie仍登录：实拍页点击一次只展开确认区、取消并刷新仍登录；375×812无横向溢出、焦点落取消；照片模式同样先确认，明确确认后才到/login。截图data/logout-investigation/desktop-confirm.png、mobile-confirm.png（内容为浏览器JPEG截图，扩展名仅存档）及mobile-confirm-header.png，结果browser.json。未复现实体Safari的自动触发；无新增单元测试镜像UI状态，用实际浏览器行为覆盖。媒体链路未改，沿用上轮真实MP4验收，不重编码/重跑生产成片。

复核范围SessionControl与唯一authApi.logout调用、服务端会话撤销和请求日志：防护未发现可确认问题，原异常触发原因待定位。O1/O2/S1/S3 N/A（局部交互保护，非参考图还原）；O3 Pass（1280/375）；S2 Pass（取消/刷新/确认/两编辑器）。WEBSITE_RECREATION_VERDICT: Ship with caution。

## 2026-10-27 持续异常退出：服务端保护与会话检查保留页面（候选未上线）

用户再次报告“经常莫名其妙跳”。只读复查正式PID1140667、NRestarts=0、启动12:21:39，未新增部署或重启；旧日志唯一明确浏览器注销仍为13:44:50，触发源未复现。不能宣称Safari自身问题、误触或根因已修复。

本轮代码：server/auth.ts的logout必须通过src/services/definition/auth.ts新增logoutInputSchema（confirmed字面true、strict），多账号注销复用工作室身份核对；空/false/字符串/多余字段400，账号头缺失或旧身份409，均不清Cookie或撤销有效会话。auth-api改为options请求形式，确认注销带共享契约和workspaceRequest冻结头；SessionControl两步确认、串行检查、失败原地提示、显式重查，只有明确退出成功才前端跳登录。后端授权照常，不能凭编辑页面保留而访问私有API。新[auth-audit]仅类别、Cookie存在/格式布尔、会话可用、PID和粗浏览器分类；匿名失败固定桶30秒限制，不记原始headers/Cookie/摘要/密码/账号名/正文。

完整113/113通过（新增3项真实HTTP测试：旧/未确认请求保留私有文件与Cookie；日志分类/限流/脱敏；旧标签不能注销后登录账号），lint、typecheck、format、Next build、两套video build通过。共享definition变化使视频包指纹更新，虽媒体模板本身未变也必须同包发布。测试与构建无付费请求。

真实浏览器通过loopback4356故障代理仅替换editor检查响应：模拟无会话，页面保持/且375×812无横向溢出；编辑未保存文字“会话恢复前未保存的房源”；移除故障后点“重新检查登录”，账号恢复且原字串仍在，未离开编辑页。取消确认保留登录；最终双账号本机配置中用当前客户端确认注销成功到/login，证明workspace头链路有效。故障代理只在data/logout-investigation/session-check-proxy.mjs，不进入src/server或发布包，不在正式服务器开放端口。浏览器截图session-unavailable-mobile.png/header.png，最终测试账号非真实用户。原生Safari随机触发尚未复现；本次不重编码媒体，沿用此前真实MP4及查看编码验证。

复核：API/client/Zod同步、明确注销成功/失败/旧标签/重启边界与分类日志均有证据；无可确认新增问题。保护可用于试运行，仍需上线后分类证据定位原始随机触发，不能视为彻底修复。候选未上线，未改正式current/unit/auth.json或用户会话。Recreation Metrics：O1/O2/S1/S3=N/A（局部功能保护），O3=Pass（1280/375），S2=Pass（故障模拟保留页、重查保留文字、取消/确认与多账号链路）。WEBSITE_RECREATION_VERDICT: Ship with caution。

Linux独立候选auth-guard-20261027已验收（未改正式current）：两测试账号旧空JSON/false/字符串注销400且Cookie未变，旧workspace409且会话仍有效；候选重启后原票据仍有效，明确confirmed=true+正确workspace注销成功；再次重启旧票据401。正式PID1140667/12:21:39/NRestarts0保持。只重启候选后已停止，failcnt0。候选Next构建uIrjICtRlyKnGsqAz6xDh，视频两包指纹b072b5c14c0cd7c61f41af11565d65a9ef7629a4f318f37e00312e6570c40811，候选源码Auth与本机SHA256一致；结果guard-before/after/revoked.json。完整包/private/tmp/house-auth-guard-release.tar.gz及摘要已生成并上传，仅验证目录，不作为正式发布。用户上线确认待答复，未以早前授权覆盖本轮“不重启线上”的承诺。

## 2026-10-27 14:30 登录保护授权上线

用户明确选择“现在上线，临时文件可以清空”。新增切换脚本switch-guard.sh只复用已验收包：Linux候选guard-before/after/revoked结果、包SHA、关键源码/Next/两套视频包与正式unit一致检查通过，稳定依赖链接native-session（不链接动态current，避免依赖环）；两真实账号预检idle=true后原子切至releases/20261027-auth-guard，仅重启工作室，时间14:30:31。没有整机重启或其他项目操作。按既有临时策略清空旧媒体，不建立业务备份；仅备份current/unit和auth文件摘要到backups/auth-guard-20261027。

正式公网用各自独立探测Cookie验收：升级前7天票据在升级后仍有效、workspaceId不变、mediaSessionId按预期变化。两账号未确认注销400、错误workspace注销409，均不清Cookie且仍认证；明确confirmed=true+匹配身份注销成功后旧Cookie401。三个编辑器页面200、未认证API401、服务器草稿410、私有内部路由403、跨站注销403、空临时工作室、首份房屋素材封面全部通过。只注销本轮新建的探测票据，不撤销用户其他票据；探测Cookie文件已清理。auth配置摘要一致、unit未改、服务active/running、自动重启0、切换检查内存199958528B。结果auth-guard-live-before/after.json，当前发布构建uIrjICtRlyKnGsqAz6xDh，视频指纹b072b5c14c0cd7c61f41af11565d65a9ef7629a4f318f37e00312e6570c40811。

本轮没有改应用源码，沿用同一构建已通过113项与本机浏览器（1280/375、故障模拟保留页/未保存文案、取消/确认）及Linux候选证据。公网页面IAB自动读取两次超时，未把它记为浏览器成功；额外公网HTML/JS/CSS检查见public-assets.json。原始Safari偶发触发未复现，保留分类排查盲区。Recreation Metrics：O1/O2/S1/S3=N/A，O3/S2=Pass（已验收同构建及公网API验证）；WEBSITE_RECREATION_VERDICT: Ship with caution。

## 2026-10-30 手机操作与暖色界面优化

用户提供Sprig页面URL和六张参考图，随后要求素材可拖拽排序、删除顶部及无操作价值的文案，并将成片红字调淡。本轮在原有Next.js App Router、React、TypeScript、Tailwind v4和animal-island-ui内实现；未发布公网，未调用云模型、配音或其他付费服务。

### 实现与范围

- `.studio-ui`切换为奶油底、梅色文字、陶橙主按钮与鼠尾草/淡紫素材分组。移动按钮至少44px、输入16px、设置折叠行48px、表单间距24px；保留20/30px模块标题。产品主题不侵入视频画布。
- 按用户后续意见删除实拍入口宣传首屏和页尾口号；照片模式删除重复介绍，仅保留模式标题与实际工作状态。三个输入持续存在，步骤为吸顶页内定位，不设上传门槛。
- 两种编辑器共用紧凑头部，保存可直接访问；更多菜单支持外部点击和Escape关闭。高级封面、混音、时间、AI建议及规格说明按需展开；输入聚焦时手机底栏隐藏，保留安全区与底部空间。
- 房屋素材通过独立手柄使用Pointer Events排序，普通行仍可滚动。支持落点提示、边缘滚动、越界/取消不提交、方向键替代操作。提交采用插入而非首尾互换；对应素材所有片段跟随，保留时间、字幕和原声设置。人物开场位置仍固定在房屋素材之前。
- `src/features/studio/`沿用现有页面垂直聚合：新增共用header、步骤导航、实拍settings/preview、排序list/hook/纯函数及就近测试；主实拍页面由约650行收敛至约330行。没有新增shared层、依赖、接口或账号存储。package.json仅为新排序测试追加现有test脚本路径。
- 成片封面总价文字由`#ec2426`改为珊瑚红`#e87973`，总价标签与数字共用该色，白描边、字体、背景、片头时长及原声不变。实时预览、片头和独立PNG继续使用同一组件；模板源码参与原有缓存摘要，重新生成会得到新文件，旧成片不会自动变色。
- 对照本轮修改前快照复核，保留工作区已有改动。没有修改相邻仓库、认证、上传/渲染服务、云调用和数据契约。既有文案来源核对、额度确认和采纳边界仍保留。

### 实际验证

- 最终完整lint、format:check、typecheck、Next生产build通过；完整测试119/119通过，其中新增2项覆盖跨多项插入、反向移动、混合视频/照片、同素材多片段、字幕/时间保留及原输入不被修改。测试HTTP监听需在沙箱外运行，最初沙箱内EPERM不是业务断言失败。
- Chrome实际检查`/`、`/video-edit`直达/刷新及`/photo-mode`，验证草稿保存/恢复、固定导航、更多菜单外部点击/Escape关闭、输入聚焦底栏避让、封面下拉、素材多选、排序、预览、生成、成片poster与下载。
- 375/390/768/1280/1440/1600/1920px七种宽度复查，document.scrollWidth均等于视口宽度，可见业务节点没有横向溢出。375px头部72px、步骤约58px，常用按钮44px。截图与viewport-audit.json保存实际结果。
- 本地格式示例经真实页面提取，10项均得到唯一候选，确认后名称/说明/价格/附加信息正确写入，刷新恢复一致。
- 375px实际鼠标指针拖拽两项成功；1440px跨三项拖拽把首项插入第三位，中间两项相对顺序保留；方向键移动成功；拖出列表横向范围取消后顺序保持。随后保存并导出16.2秒MP4，抽帧确认顺序为开场、房屋视频、客厅照片、厨房照片。实体iPhone/Android触摸、系统键盘和长列表持续边缘滚动尚未在真机验收。
- 首轮11.2秒MP4通过真实上传、页面生成与下载。排序后16.2秒MP4同样为H.264/AAC、1080×1920、30fps。原两段视频分别完整保留2秒和3秒，默认封面1.2秒；未缩短原片或增加讲解重叠。
- 淡红色再次经现有API全流程生成11.2秒MP4，job.reused=false。独立封面内匹配新色像素32674，实际MP4首帧匹配新色像素29867；首帧与PNG每通道平均绝对误差1.59（编码误差），确认颜色同时进入实际视频与独立封面。
- 最终新建浏览器会话错误/警告列表为空；含Player的历史会话有Remotion自带许可提示。开发过程中先添加import再写新文件曾触发短暂HMR缺模块日志，完成文件后已恢复，最终构建与新会话未出现该错误。

### 来源、证据与范围复核

证据目录：`artifacts/ui-refresh-2026-10-30/`。保存origin.html、参考全页截图、用户截图、section-map.md、asset-map.json、最终手机/桌面截图、视口JSON、排序前后截图、实际MP4及抽帧、珊瑚红像素核对结果。原站学生、植物和耳机图片仅作风格依据，没有放进业务页面。

本轮人工范围复核：未发现可确认的遗留问题。排序复用原项目状态与shot关联，取消和卸载清理指针动画帧；菜单监听可清理，SSR不读取window；没有新增付费或发布动作。真机触摸验证限制如上，浏览器响应尺寸验证不等于真机覆盖。

Recreation Metrics按用户要求的“风格适配”口径评估，而非复制营销站：O1操作元素完整；O2房源内容和原声口径保持；O3七种尺寸通过；S1暖色/圆润/柔和层次适配且按用户要求去除宣传区，不声称90%逐像素还原；S2上传/表单/折叠/菜单/拖拽/生成下载实测通过；S3未搬入无关内容或虚构房源事实。WEBSITE_RECREATION_VERDICT: Ship。

## 内置背景音乐五选一（2026-10-30）

范围仅为本轮确认写入的music共享定义、合成器、启动预热、原get-original-music的可选track查询、video-edit业务API/Hook/声音设置及既有配乐测试；不把工作区其余已有改动归本轮。原钢琴默认文件名与AudioAsset/草稿字段保留，新增拨弦/律动/氛围/铃音各64秒；五首不同SHA256、立体声PCM44.1kHz、有效峰值且不削波、缓存复用测试通过。服务器枚举校验后才能选择固定文件名，账号仍经workspace复制，启动预热避免渲染中临时合成。没有依赖、费用、媒体上传流程或公网变更。源码按现有features/studio与services/definition放置，无新增shared层。

完整lint、format:check、typecheck、Next build和119/119测试通过。首次沙箱运行14项监听测试因listen EPERM失败，允许本机监听后全量119项通过，非源码问题。原有开发服务未停止；生产候选使用/private/tmp/house-music-acceptance独立业务目录、4378 loopback及最终构建副本，避免触及用户草稿/业务素材。曾共享.next时/video-edit出现ChunkLoadError，复制固定构建并重启候选后直达/刷新成功，不把失败计为通过。

实际浏览器依次切换拨弦、律动、氛围、铃音，音源正确且64秒，铃音原曲点击后paused=false/time推进；刷新及/video-edit恢复所选铃音，开场/房屋原声保持100%、配乐25%。1280与375×812均scrollWidth等于viewport，手机五个选项完整可选。截图和源码证据artifacts/music-options-2026-10-30，包括origin.html、before.png、options-desktop.png、options-mobile.png和section-map.json。实体手机与Linux资源压力未本轮重测。

公开演示照片与660/880Hz合成音在隔离服务上传，真实生成拨弦/铃音两份MP4：H.264/AAC、1080×1920、30fps、6.208秒。拨弦首次新渲染后，分析脚本因内置FFmpeg不支持color/s16le调整为公开图片输入/WAV输出；最终分析复用已生成拨弦成片（reused=true），铃音为新导出（reused=false）。五秒解码音轨差异RMS=755.086，确认选曲改变实际音频。浏览器铃音成片readyState=4、paused=false且时间推进，证据mp4-verification.json、两份MP4与WAV。验收脚本首次并行上传409，按现有同账号单槽改为顺序上传后通过；该错误不进入业务实现。

局部IntegrityGate/代码复核：No findings。核对前后端枚举、旧请求缺省、上传曲目展示、请求失败提示、busy禁用、预览/导出同一AudioAsset、缓存随素材变化及账号作用域；README/ASSETS/plan已同步，AGENTS和部署规则无需变更（不新增运行配置、路由或依赖）。发布时前后端同包重启，旧后端会忽略新查询参数；本轮没有公网发布。Recreation Metrics：O1/O2/S1/S3不适用（局部功能扩充，无网站复刻目标）；O3/S2通过（桌面/手机交互与真实MP4）。WEBSITE_RECREATION_VERDICT: Ship；HARNESS_DOCS_STATUS: Updated；HARNESS_REVIEW_VERDICT: Ship。

## 顶部常驻新建按钮（2026-10-30）

用户要求将更多中的新建放出来。本轮仅将StudioHeader原newProject动作移到保存草稿之前，显示“新建”、aria-label仍为“新建房源视频”；从更多中移除重复入口。保留busy禁用、相同新建动作、菜单外部点击与Escape行为；小屏topbar允许换行，操作组靠右。没有新增文件/共享层/API或媒体逻辑。README、plan与设计系统对应规则已就地同步；AGENTS/部署/API文档无需修改，因为运行、权限和契约均未变化。

原页面/用户截图与映射证据保存在artifacts/header-new-2026-10-30：origin.html、before.png、section-map.json，沿用既有暖色token和animal-island-ui，无新图片或字体资产。浏览器在1280、375×812、320×812检查，scrollWidth分别等于viewport；375单行显示，新建约52.5×44px，320操作整组换行。用户127.0.0.1草稿未执行新建测试；另用localhost独立浏览器存储，实拍编辑测试片名后点击顶部新建，恢复“新房源视频”，刷新仍为空草稿，旧成片不混入。更多只剩模式切换（无认证测试环境），切换照片模式后同样实际新建成功；测试标签无console error。当前用户4378候选已更新，照片和实拍共用头部。实体手机未本轮实测。

本轮本地lint、format:check、typecheck、Next build通过，按钮文件单独ESLint/Prettier及git diff --check通过。整仓测试执行两次，均116/119通过；失败源于并行字幕改动的离线fixture未复制src/video/video-subtitles.ts（ENOENT），继发两项媒体槽占用断言失败，非本次头部代码。首次全局lint/格式也曾命中并行字幕未完成片段，后续复查已通过；不擅自修改这些范围外文件。实际旧铃音MP4在页面readyState=4、duration=6.208、paused=false且时间推进，无媒体错误；本轮没有重编码或修改成片模板，沿用上一轮H.264/AAC、1080×1920/30fps证据。

限定复核：本轮确认写入的头部按钮/CSS与说明未发现可确认问题，其他并行工作不归本轮结论。Recreation Metrics：O1/O2/S1/S3不适用（局部按钮位置调整）；O3/S2通过（实际桌面/窄屏、新建动作、模式切换及既有MP4播放）。WEBSITE_RECREATION_VERDICT: Ship；HARNESS_DOCS_STATUS: Updated；HARNESS_REVIEW_VERDICT: Ship。整仓字幕测试失败仍需其所属任务处理，未宣称全部检查通过或公网发布。

## Ant Design全量基础控件迁移（2026-10-30）

用户明确要求组件全部换用antd并保留样式。本轮确认写入范围：17份studio视图/控件文件、新StudioProvider、根layout、两份CSS、use-studio/use-video-edit的文件批次入参、use-material-sort的PointerEvent类型、package/lock及直接相关说明；未接管既有字幕服务/模型/视频画布等其他工作区改动。新增文件位于现有features/studio业务域，无新增shared层、服务端API、账号规则或付费能力。源码和依赖中不再引用animal-island-ui/naive-icons；现用antd6.6.8、官方icons6.3.4、Next registry1.3.0，pnpm why确认registry/antd共用cssinjs2.1.2。

直接使用Button（含下载/预览链接）、Input/TextArea/Password、InputNumber、Select、Checkbox/Group、Slider、Progress、Collapse、Upload.Dragger、Dropdown、Form和Modal。移除自写拖放进入/离开计数、文件input、菜单外部点击/Escape监听、密码显隐state和内联退出确认区；FileUpload仅保留统一业务格式校验与一批只交付一次的边界，返回LIST_IGNORE，上传继续走既有fetch API并保持原顺序。fieldset同时提供antd禁用上下文；Collapse forceRender延续原details中的组件生命周期。原生音视频、Remotion与场景排序保留专用实现，排序事件泛型适配antd的HTMLElement能力。品牌/步骤/文字超链接仍采用语义HTML，不以通用控件替换视频内容。

主题使用现有暖色/圆角/阴影，旧变量独立为--studio-*，删除旧vendor DOM和listbox位移覆盖；禁用主按钮仍保留柔和红色，关闭antd的中文按钮自动空格。照片选中行保留原高亮和左对齐；手机输入焦点隐藏操作栏仅匹配可编辑文字输入，排除readonly选择器与复选框。实际1440宽：页面背景rgb(255,244,223)、面板rgb(255,252,245)、主色rgb(185,80,59)，面板/按钮圆角24px，按钮高度至少44px，scrollWidth=1440，旧vendor class数为0。375、320均无横向溢出；375配乐下拉宽309px、x=33/right=342，五首完整可见且由antd定位。证据visual-verification.json、desktop-final.png、mobile-final.png、mobile-320.png、mobile-music.png。

全部lint、format:check、typecheck、Next build通过，127/127测试通过（test-results.log）。真实localhost浏览器使用独立草稿：Upload.Dragger上传2秒公开图片/合成音口播，一次多选house.mp4与kitchen.jpg，按选择顺序只添加一次；输入不支持的txt显示格式错误且没有新增素材。InputNumber将照片结束从5秒改为2秒，键盘上移排序保留素材/片段对应关系；Slider将配乐25%调至26%，保存/刷新仍恢复两份素材、片名、顺序和音量。照片模式另批量上传living/bedroom，切换选中场景、编辑TextArea字幕及关闭Checkbox.Group字幕显示，保存/刷新后选回第二张，文字与关闭状态保持。上传/渲染中Button/Input/Select/Checkbox/Slider均禁用，取消上传入口仍在fieldset外，原业务取消与隔离测试通过；本轮未手动取消正在上传的样片。

通过迁移后的页面点击生成，实际新MP4 reused=false，H.264/AAC、1080×1920、30fps、8.213秒（画面时间线8.2秒）；封面PNG与第0帧RGB RMS=2.706，已目视封面、口播/照片/房屋帧，无UI主题渗入画布。新antd下载按钮实际下载到浏览器，成片readyState=4、paused=false且时间推进。证据verified-tour.mp4、mp4-verification.json、cover.png、frame-*.png。该片使用公开演示照片与660/880Hz合成音，不读取真实用户业务素材；没有发AI文案/配音/识别云请求。

4379独立测试账号完成：Form必填提示、Input.Password显示/隐藏、错密码统一提示且密码框清空、正确登录；更多菜单出现账号与退出，第一次点击仅打开Modal，默认焦点落“取消”，取消后仍登录，再次明确确认才注销到/login。375宽弹窗无溢出，aria-modal=true；最终登录外观去掉额外必填星号并保留原加粗标签与44px输入高度。测试凭据为临时fixture，验证后停止4379并删除私有配置，未访问管理员真实认证文件。当前4378保留最终本地候选；原127.0.0.1草稿没有执行新建或清空，试听中改动的配乐已恢复清透铃音。浏览器正常流程无应用/水合错误；有素材预览时仅上游Remotion许可提醒。实体手机、Linux资源峰值及公网发布不在本轮实测范围。

限定IntegrityGate/code-review复核：No findings，核对新库数据回调、数值null、批次去重、忙碌禁用、弹层生命周期、密码清除、退出二次确认、SSR首屏样式与依赖单实例。README、AGENTS、ASSETS、plan、组件/主题/Tailwind规则已同步；部署文档沿用锁文件安装和构建/重启流程，无新环境变量或端口配置要求。Recreation Metrics：O1/O2/S1/S3不适用（组件库迁移，无外站复刻目标）；O3/S2通过（四路由、桌面/窄屏、交互与新MP4）。WEBSITE_RECREATION_VERDICT: Ship；HARNESS_DOCS_STATUS: Updated；HARNESS_REVIEW_VERDICT: Ship。

## 2026-10-30 智能画面清理

用户确认识别人脸/明显身体/镜中人、忽略偶尔手臂；只移除问题画面，保留完整讲解，用合格房屋镜头补齐，并要求直接应用查看。实现本地SSD MobileNet INT8＋UltraFace检测、持续暗场判断、独立画面副本、原声复用、自动采纳和当前页撤回。人物开场不提交检测，所有片段时间、字幕、排序保留；无合格视频区间时明确失败。清理原片不删除，后续仍由既有导出处理最终声音。

模型安装脚本已实际运行，固定SHA256及真实推理自检通过。10秒公开测试片：0～3秒明亮房间、3～5秒OpenCV人物正例、5～7秒黑场、7～10秒房间，连续440Hz测试音。实际模型识别并合并缓冲区间2.65～8.25秒，生成10秒540×960 H.264/AAC副本；在3.05、4、6、7.5秒抽帧目视均为合格房间。对输出再次运行完整本地检测，问题区间为空。不是用户真实房源，不据此宣称真实房源或镜面场景100%检出。

核对音轨时发现同步归一化会使测试片末尾解码采样缩短，因此清理阶段保持原声音量，先完整编码音轨、再流复制合并；音量规范仍交由现有最终导出。最终清理前后16kHz解码均160085样本，10个1秒区间RMS均非零且接近原声；证据actual-audio-check.json、after-clean.mp4、output-reanalysis.json。

浏览器在本次专用4320空草稿中上传2秒公开口播示例和10秒测试片，一键清理后显示“已应用”与撤回按钮，时间线保持13.2秒（封面1.2秒＋口播2秒＋房屋10秒）。撤回恢复原片，重新启动后立即取消显示原素材保留且释放操作禁用；最终实现再次上传原片、清理并自动应用成功。375×812及1440×1000无横向溢出，清理与撤回按钮可用；手机证据mobile-applied.png。实际通过页面生成最终MP4，H.264/AAC、1080×1920、30fps，画面13.2秒、容器13.205秒；第7.2秒抽帧确认已替换为房间画面，完成状态及下载入口正常（final-tour.mp4、final-tour-probe.json）。

完整lint、format:check、typecheck、Next build通过，135/135测试通过，git diff --check通过。新增范围合并/持续暗场/候选安全/重复补画面、素材交换撤回和账号隔离/服务重启测试。限定代码复核检查fetch＋Zod、账号目录、清理保护、媒体单槽、取消所有权、错误不暴露路径、失败副本清理、原声与时间线，未发现阻塞问题。原有Ant Design、字幕、配乐及用户未提交改动保留。没有公网发布、付费或云端识别请求；实体手机触控、Linux768MiB运行上限、真实镜面/遮挡人物检出率未覆盖。

Recreation Metrics：O1/O2/S1/S3不适用（功能增量）；O3/S2通过（沿用现有样式、桌面/窄屏和实际导出）。WEBSITE_RECREATION_VERDICT: Ship；HARNESS_DOCS_STATUS: Updated；HARNESS_REVIEW_VERDICT: Ship。

## 2026-10-30 smart-clean deployment

Authorized by the user's request to update production. No application source changes in this turn. Published 20261030-smart-clean at 2026-10-30T13:55:05+08:00, Next build h_dKePLxSEEtNhfT8O9v4, video fingerprint c02651d2ee27e45733fa3de93a0ac220412003761715cf31e5ada0b65583b62a. Fresh Linux production dependencies and checksum-verified vision models passed offline inference; no macOS dependencies, local business media or credentials were packaged.

Independent candidate under the existing one CPU/768MiB limit passed people/dark cleanup, original byte preservation, cross-account 404, Range206, stale workspace409, cross-origin403 and queued cancellation ownership. Real and photo MP4 exports completed at H.264/AAC, 1080x1920, 30fps. The cleaned 10-second fixture has identical decoded audio sample length (160085 at 16kHz), no silent second and no problem ranges on repeat vision analysis. Candidate cgroup peak 694378496 bytes, failcnt=0, NRestarts=0. Photo test fixtures were corrected to the existing 3-second minimum and the photo response's actual contract; no application changes were needed.

Both production accounts were idle before cutover. Existing seven-day sessions survived; authenticated routes, smart-clean readiness, logout confirmation400/stale workspace409/revocation401, server draft410 and private path403 passed through the public endpoint. Original account configuration and Nginx hashes were unchanged. Added only the smart-clean model-directory systemd drop-in. Candidate stopped; production active with NRestarts=0. Restart cleared temporary media by the existing policy. Rollback metadata is in backups/smart-clean-20261030; no business backup or session snapshot was created.

Online browser control repeatedly timed out and native window permissions were unavailable, so no online screenshot or touch verification is claimed. Same-build local desktop/375px browser evidence remains applicable; public HTTP, two-account API and actual Linux MP4 checks passed. Short fixtures do not establish long-video resource limits or complete mirror/person recall. Evidence: artifacts/deploy-smart-clean-2026-10-30, without credentials. Recreation Metrics O1/O2/O3/S1/S2/S3: N/A (deployment only). WEBSITE_RECREATION_VERDICT: Ship with caution. HARNESS_DOCS_STATUS: Updated.

## 2026-10-30 右下角文字水印

实现默认“青连实拍”、自定义单行20字、留空关闭，实拍和照片模式均保存到原浏览器草稿。共用VideoWatermark覆盖预览、人物开场、房屋画面、片尾、实拍片头与独立封面；片头无重复叠字。水印文字进入缓存键，组件进入模板指纹。README、plan与媒体验证规则已同步。限定复核检查默认兼容、保存/载入、输入限制、全片覆盖、原声/时长不变和缓存失效，未发现阻塞问题。

执行lint、format:check、typecheck、Next build、全部138/138测试及git diff --check通过。新增契约测试覆盖旧草稿默认、自定义、关闭及非法长度/换行；照片缓存测试覆盖含人物开场的全部片段随水印修改或关闭失效。实际4380隔离服务用公开演示照片和合成测试音导出：native-default/native-custom为快速合成、H.264/AAC、1080×1920、30fps、6.2秒；mixed-off为视频/照片混排的常规渲染、8.213秒；photo-custom为1920×1080横版、3.000313秒。四份均为实际MP4，检查封面与开场抽帧，文字/关闭效果正确。缺省水印的旧项目与显式默认文字导出缓存等价；修改文字实际reused=false。默认与关闭封面像素对比仅右下角3539像素发生明显变化，范围x923～1039、y1844～1877，符合小号边角水印。详细记录和样片位于artifacts/watermark-2026-10-30/mp4-verification.json。

浏览器验证两页水印字段，实拍自定义“青连精选房源”保存/刷新后恢复且预览只有一个水印，照片页留空预览水印元素为0，20字自动缩为23.76px。4380使用单独测试草稿；4378原有空草稿保留并刷新到新版本，没有清空或上传测试媒体。实际界面宽度1280与624均无横向溢出；尝试375视口覆盖未改变主标签的实际624宽度，因此本轮不宣称375设备验收。未调用付费/云服务，未发布公网。证据desktop-settings.png、mobile-settings.png（实际624宽）、native-default-0.png、native-custom-1.5.png、photo-custom-0.6.png。

验收脚本首次误用已自动删除的中间目录判断快速合成，随后改为记录实际进度；合成测试片缺SAR元数据时正确走常规路径，补齐方形像素后核对快速路径。照片轮询一次连接重置后增加只读GET有限重试并重新完整验收，最终四份与边界断言全部通过；不是产品渲染失败。Recreation Metrics：O1/O2/S1/S3不适用（功能增量）；O3/S2通过（现有视觉、交互和实际MP4），375宽另列未验证。WEBSITE_RECREATION_VERDICT: Ship；HARNESS_DOCS_STATUS: Updated；HARNESS_REVIEW_VERDICT: Ship。

## 临时资源维护与容量保护（2026-10-30）

本轮范围：server/storage-capacity.ts、三类上传、照片/实拍导出、智能清理、字幕识别、Kokoro及内置配乐复制的存储准入；独立维护脚本、就近测试、每日systemd服务、项目运行说明。既有工作区含大量其他改动，未以整份HEAD差异作为本轮评审范围；已有文件以/private/tmp/studio-storage-baseline与确认写入片段取证，新文件按本轮实际写入检查。未修改视频模板、页面、前后端DTO、登录、模型或付费授权。

- 门禁：pnpm lint、format:check、typecheck、build均通过，完整pnpm test为144/144。首次沙箱测试中的HTTP监听EPERM已在允许loopback监听的环境重跑通过；修复新增清理保护重复计数和缺失素材原有异步失败语义后通过。维护候选去重后重跑五项存储/删除边界测试通过。
- 真实磁盘：覆盖默认预览零删除、完成标记、7天边界、目录新改动续期、未标记保留、坏标记、链接/目录穿越、并发清理锁、验收环境真实data与依赖链接分离。额度覆盖已有文件+预留、跨账号独立限额、共享磁盘竞争、排队时容量变化、幂等释放及超额后重传。旧临时workspace真实过期/活跃保护测试继续通过。
- 浏览器：隔离4325服务的首页与/video-edit直达和刷新，桌面及375px；4326独立100MiB额度服务实际选择测试视频，返回507并显示容量提示，未锁死上传页面。截图在artifacts/storage-maintenance-2026-10-30，端口/临时服务已停止、两份隔离测试目录已清理，不覆盖用户草稿。开始服务前一次浏览器连接失败，服务就绪后重新创建测试页验证；未将失败导航计为通过。
- 两条实际MP4：照片3.000313秒，实拍5.200000秒，均H.264/AAC、1080×1920、30fps，已抽帧检查。实拍为1.2秒静音封面+2秒开场+2秒房屋片段；封面0～1秒RMS=0，后续两段音频RMS约0.122，时长完整。合成测试素材仅用于回归，不代表真实房源，也不验证长片峰值。
- 本机：清除.next/cache可重建缓存1057916KiB（约1GiB），.next运行产物仍保留；63份历史exports只生成清单，不删除。data/local-avatar、.runtime、原片、旧成片、预算和账号配置保留。旧exports含硬链接，清单逻辑字节与du物理占用可能不同。
- 服务器只读审计：40G根分区约22G已用、17G可用；shared/data 54M、verification 1.2G、releases 5.3G；STUDIO_TEMPORARY_MEDIA=1，近7天无temporary-media清理错误。未把“无错误日志”当作所有负载已验收。
- 服务器已独立安装house-video-storage-maintenance.timer/service：每天北京时间04:30后随机延迟最多10分钟；多次手工启动Result=success/ExecMainStatus=0，零删除。七份已完成且无运行进程的verification真实data共362072089字节已标记，至少再保留7天，依赖软链接外壳不删除。正式MainPID=1263177、NRestarts=0、ActiveState=active，未切换current或重启应用、未改Nginx/账号/主unit。安装脚本SHA256为58a2962d7c43e3a34c10127b08cdf58f3a611edc5d9481959dc7ab1018d3c9a9，与本机一致。
- 范围内code-review与IntegrityGate安全复核：未发现可确认的遗留问题；检查账号作用域、容量拒绝/任务状态、队列持有与释放、删除白名单/标记/软链接/保留期/锁、部署与回滚。代码没有新依赖、API、付费调用或数据库。
- 尚未覆盖：容量保护未发布到正式应用；未验证真实长视频在Linux768MiB控制组下的整服务表现。容量准入不是OS硬配额，外部服务写盘或输出超估算仍需处理；不会据本轮小样声称消除磁盘耗尽风险。ASR/Kokoro等本机候选未随维护脚本上线。
- 文档：按neat-freak增量同步README、AGENTS、plan、deploy/README及deploy/storage-maintenance.md，未接管历史改动或全局记忆。
- 页面复刻指标O1/O2/O3/S1/S2/S3：不适用（本轮为存储维护，无参考站复刻）；浏览器验证如上。WEBSITE_RECREATION_VERDICT: Ship（不涉及复刻）。
- HARNESS_DOCS_STATUS: Updated；HARNESS_REVIEW_VERDICT: Ship with caution（容量保护保留在本地候选，公开应用未切换）。

## Docker部署候选（2026-10-31，未完成运行验收）

- 确认范围：新增Dockerfile、.dockerignore、compose.yaml及deploy/docker下的entrypoint.sh、prepare-host.sh、docker.env.example、nginx.conf.example、README.md；既有README、AGENTS、deploy/README与docs/plan仅添加本轮Docker入口/边界/方案段，本节记录验证。不改业务源码、包版本、媒体线程、API契约或旧服务器。其他会话存在大量并行修改，仅以确认写入片段和/private/tmp/studio-docker-baseline核对，不按完整HEAD差异认定本轮归属。
- 静态门禁：pnpm lint、format:check、typecheck、build、build:video通过，执行时全部148/148测试通过。新增Compose、部署文档另行Prettier检查通过；bash -n prepare-host.sh、sh -n entrypoint.sh通过。Compose示例完整解析通过；空环境明确拒绝缺失PUBLIC_ORIGIN。解析结果为host网络、UID/GID1000、init、3CPU/2560MiB、128MiB共享内存、删除capabilities、禁止提权、私有auth/cloud只读及禁止自动创建缺失挂载源。
- 实际linux/amd64镜像构建：Docker Hub认证端点超时，改用AWS ECR Public中Docker官方发布者的同版本Node22.23.4-bookworm-slim，固定索引SHA256；未改Docker全局代理或镜像来源。Linux锁文件安装、Next生产编译、photo/real两套视频模板编译、Chrome Headless Shell下载与智能清理离线自检均已通过。随后setup:compositor所在层提交失败：BuildKit metadata_v2.db input/output error；本机空间曾降至229MiB，失败退出后约892MiB。未产出完整候选镜像，不将上游编译通过当作交付成功。Docker的STUDIO_AUTH_CONFIG提示对应配置文件路径，并非写入密钥。
- 资源与清理：停止继续构建；仅清除本轮本机Next可重建缓存，保留运行产物、历史视频、模型、账号和其他项目文件。本轮缓存精确ID清理返回0B，缓存仍有不可回收占用；检查发现其他项目容器正在运行，因此没有重启Docker、全局prune、删除其镜像/卷或改全局配置。需要在具有足够可用空间的构建环境重建，本轮不自行删除用户历史数据。
- 未验证项：完整镜像、非root容器启动、实际只读挂载、认证/双账号/Host/Origin边界、重建后登录保留与媒体失效、Docker浏览器、两条实际MP4、整容器峰值与OOM均未执行，不能引用历史宿主机证据替代。原生Linux的host网络与新4核4GiB候选资源仍须新服务器实测；ASR/Kokoro未打包或新增上线验收。没有推送镜像仓库、购买服务器、登录新服务器、切换公网或修改旧阿里云服务。
- 范围内code-review/IntegrityGate：检查构建上下文白名单、Linux依赖与模板指纹、loopback监听、Host/Origin代理、认证及会话目录权限、临时媒体生命周期、停止与回滚路径；未发现可确认的代码缺陷，但核心运行验证被磁盘环境阻塞，Docker运行交付结论为Block。按neat-freak同步README、AGENTS、部署runbook及方案/本节，文档明确候选未验收；未扩大到其他任务或全局记忆。
- 证据：artifacts/docker-2026-10-31中的build-linux-amd64.log、next-build.log、video-build.log、tests.log与compose-example.json均为本轮实际输出，不含业务素材或凭据。Recreation Metrics O1/O2/O3/S1/S2/S3：N/A（部署配置，无参考站复刻）；浏览器未验证。WEBSITE_RECREATION_VERDICT: Block（候选运行验收未完成）。HARNESS_DOCS_STATUS: Updated；HARNESS_REVIEW_VERDICT: Block。

## 腾讯云Docker迁移（2026-10-31）

任务范围：用户明确要求持续完成新服务器部署，保留原两个用户名/密码，不迁移账户业务数据。新机106.54.221.18为Ubuntu24.04 x86_64、Docker27.5.1、Compose2.32.4，4核4GB；旧121.41.6.73及相邻项目均保留。确认写入仅为Docker预编译包装/白名单和相关部署文档、方案及本节，不按大量既有HEAD差异归属本轮；应用业务源码从已上线固定release打包，本机未验收功能未发布。

基础迁移已完成：从20261031-render-optimization及其smart-clean依赖解引用公开程序/Next/两套视频包，原锁文件重装Linux生产依赖、Chromium和字体，校验两份ONNX模型、叠加二进制及许可证并离线自检。首先发现Mac传输生成的._文件改变模板指纹，发布校验正确拒绝渲染；修复tar元数据、上下文白名单并增加构建内两套指纹验证后，镜像02b50aaec74facd5506e6e9a92e844afa58e5a511eb7c12c23722bdc64353c67通过。没有绕过源码校验、降低分辨率或改音轨处理。

两个原账号的加盐密码配置、稳定workspaceId及已有云配置经SSH管道转存私有文件，摘要与旧站完全相同；凭据不进入镜像、日志或本机文件。用旧站管理员已有的两份凭据经SSH管道在新机loopback实际登录、核对身份并立即注销，两账号均成功。原登录摘要和全部业务媒体未传输，新账号测试登录不代表迁移旧登录记录。root:1000/0750私有父目录、0640认证/cloud只读挂载、1000:1000/0700会话目录和0600会话文件均核对；生产仍只监听127.0.0.1:4340，Nginx固定106.54.221.18并保留Origin。容器UID1000、init、cap_drop ALL、no-new-privileges、3CPU/2560MiB、日志滚动和健康检查生效；Docker/Nginx启用开机启动。

基础候选使用独立虚构两账号与公开演示/合成视频，验证未登录页面303/API-media-exports401、私有渲染路径403、错误Origin403、旧workspace409、未确认注销400、跨账号素材/任务/成片404、原片上传字节不变及Range206。实际实拍5.200000秒/156帧、照片3.000313秒/90帧，均H264/AAC48k、1080×1920、30fps；静音封面0～1秒RMS=0，开场/房屋原声RMS约0.122。含配乐和无配乐各保留一份，不能把背景音乐误判为封面原声泄漏。抽帧已查看。智能清理真实替换3秒全黑测试片的1段画面，保留原声与时长，跨账号结果不可读。首次nullsrc测试片实际为绿色，不能作为过暗样本；改用Sharp生成明确黑图后完成替换验证。重启两账号Cookie继续有效，媒体session改变、旧素材404、任务空，明确注销撤销且不影响另一账号。基础容器峰值1024847872字节，memory.events全零，无OOM；这不构成长片资源承诺。

公开入口已启用，HTTP登录200、编辑页303、未登录接口/媒体/成片401、错误Origin403、私有路径403、Next静态资源200。固定Host伪造测试在服务器本机经过Nginx返回401；外部HTTP链路对不匹配Host会先拒绝，因此不把外部代理行为当作应用证据。Nginx刚reload时一次旧worker/login404，随后本机和外部完整复查200；未将瞬时结果计为通过。真实浏览器自动验收被来源权限策略拒绝，未换浏览器或绕过权限；以HTTP/API和实际MP4验证继续，不能声称已完成桌面/移动页面交互。基础独立候选已停止删除，测试素材目录、测试账号和测试会话已清理，公开样片/报告单独保留。正式容器healthy、NRestarts=0、OOMKilled=false，旧站未重启或改配置。

迁移期间旧站另有20261031-watermark-subtitles正式发布，因此最终同步该已上线基线（Next RlIPVLm_imjay0YYQFXuN，模板0f4da68ee2c20980ad049475e049beb0c2bbb2988a3a617f8a8935186f6cf61c），避免新站少功能。只取四份固定摘要的公开ASR模型/自检音频；Docker内Python3.11重新建venv，不复制旧venv或用户音轨。PyPI下载慢，主动停止本轮安装子进程后，仅本次构建参数切换腾讯云官方TLS镜像源，版本仍固定，未改全局配置。最新版字幕、水印与两条MP4验收及最终切换结果待补，不将基础版成功冒充最新版本已交付。

本机静态门禁lint、format:check、typecheck、Next build通过；测试初次14项因沙箱禁止loopback监听而EPERM，允许监听后149/149通过。新部署文档另行Prettier、Compose配置和脚本语法通过。并行会话更新了旧站及文档，只读取其正式发布作为迁移依据，不将其代码变更归本轮实现或评审。证据目录artifacts/tencent-migration-2026-10-31不含真实凭据或用户素材。

最终结果：已切换到house-video-studio:20261031-migration-current，镜像SHA256 b1b3392e0ab60756d25e6a2e8a61b0fea41c7dff83fe55bc3f58c087856bf253，Next RlIPVLm_imjay0YYQFXuN、模板0f4da68ee2c20980ad049475e049beb0c2bbb2988a3a617f8a8935186f6cf61c、ASR sensevoice-int8-20240717-window8-overlap-timestamps-v5均在正式容器核对。腾讯官方PyPI镜像源使固定依赖安装与离线中文自检完成；只改构建参数，无全局配置或版本升级。Kokoro、存储准入等本机其他候选没有夹带上线。

最新版独立候选重新完成实拍5.2秒、照片3.000313秒，以及采纳公开中文测试音频字幕/自定义“迁移验收”水印的9.2秒MP4（分别156/90/276帧），全部H264/AAC48k、1080×1920、30fps；静音封面与两段原声RMS复核通过。实际中文识别约3.517秒、带字幕水印实拍导出约12.575秒，均为短公开样片而非提速倍数承诺。识别另一账号的排队任务取消后，当前账号识别继续成功；结果/成片跨账号404。抽帧已实际查看：封面有水印且没有讲话字幕，开场实际显示识别字幕及右下角水印。最新版完整候选峰值1298448384字节（约1.21GiB），memory.events low/high/max/oom/oom_kill/oom_group_kill均为0，限额2560MiB。基础与最终版auth/auth-sessions/workspace源码逐字节摘要相同，因此沿用已完成的同一会话/临时生命周期实测，而不将无关代码更新误作新验证。

切换前原两个账号均无上传、生成、智能清理或识别任务；新站用户业务文件数为0，排除的是已知五首公共合成配乐和_control公共缓存。仅备份Compose和环境文件元数据，保留现有私有认证与实时会话挂载，没有复制/恢复历史会话。最终正式容器healthy、RestartCount=0、OOMKilled=false、3CPU/2684354560字节限额。切换后再次用两个原用户名/密码在loopback登录，各自ASR与智能清理ready=true，随后只注销测试登录；原密码没有修改。外部HTTP登录200、编辑页303、受保护API/媒体/成片401、私有渲染路径403、错误Origin403与静态资源200复查通过。最终独立候选已停止删除；测试账号、测试会话和测试业务目录已清理，正式容器未再重启。公开样片及无凭据报告位于artifacts/tencent-migration-2026-10-31/current。

范围内code-review/IntegrityGate复核未发现可确认的遗留代码问题：新增预编译Docker包装及白名单是为了迁移已上线准确版本，未新增API/数据表/业务队列或收费调用；检查Linux依赖、模板配套、ASR冷安装与只读公共模型、账号/会话挂载、固定Host/Origin、日志/资源/重启与回退。按neat-freak实际同步README、AGENTS、部署runbook和方案/本记录；未接管其他任务实现、科研仓库或全局配置。覆盖限制：未完成浏览器页面交互/窄屏验收，未测新容器的真实手机长片/4K/多账号长期高负载；不以小样消除这些风险。Recreation Metrics O1/O2/O3/S1/S2/S3：N/A（迁移部署，无参考站复刻）。WEBSITE_RECREATION_VERDICT: Ship with caution。HARNESS_DOCS_STATUS: Updated；HARNESS_REVIEW_VERDICT: Ship with caution。

## 2026-10-31 新机实拍线程优化（scope: video-threads-20261031）

- 授权：用户要求优化当前新站，确认已下载成片并允许验收后切换。旧阿里云服务未变更。任务代码基线和生产三文件差异见`artifacts/video-threads-2026-10-31/{local-task.patch,production.patch}`；不以整个脏工作区作为本轮范围。
- 实现：`server/video-bundles.ts`集中解析`STUDIO_VIDEO_THREADS`，有效1～3，缺省/非法回退1。实拍原片准备与原生合成使用配置；原始管道输出线程1、浏览器并发1、媒体单槽/串行片段、取消/清理保护、ASR和照片处理策略保持。新增一项参数边界测试，Compose及样例同步传参。无新依赖、API、数据契约或UI变更。
- 静态门禁：lint、format:check、typecheck、build、150/150 tests通过；shell语法和Compose配置检查通过。生产候选从冻结迁移镜像叠加三个服务文件，不发布当前本机其他源码；两套预编译模板摘要在构建时校验通过。
- 性能：三份当前任务HEVC原片仅在新服务器隔离测试目录内复制与使用，不下载到开发机。基线和候选都重新上传、重新准备，完整执行API任务，`reused=false`；统一测试项目（不是恢复用户浏览器草稿），同样83.333333秒/2500帧输出。单线程214.984秒，3线程118.632秒，减少44.8%。生成CPU从约140%提升到约300%；两者均3CPU/2560MiB配额，生产服务空闲。完整原片准备在基线约50秒，候选约28秒。测试不是4K/10分钟长片或持续并发压测，也不保证相同提速比例。
- 品质：H.264/AAC、1080×1920、30fps、48kHz双声道和帧数一致；完整48kHz双声道PCM样本误差0。第0/3/30/60/82秒抽帧PSNR分别为一致/42.50/42.31/44.72/48.47dB，编码CRF和preset不变。公共合成样片实拍5.2秒156帧、照片3.000313秒90帧均通过探测；封面RMS0、开场/房屋原声非静音，封面与照片水印截图已目视核对。报告在`comparison.json`、`public-media-report.json`。
- 资源/安全：候选验收峰值1168945152字节，memory.events的max/oom/oom_kill均0。两个独立测试账号分别登录，未登录保护、Origin拒绝、旧workspace409、未确认退出400、跨账号媒体/任务/成片404、Range206、原片上传字节保持均通过。ASR和智能清理ready保持。没有付费调用。
- 实际排查中的工具修正：测试容器首次启动需约20秒，早期探测出现connection refused，改为等待健康接口后才开始计时；固定Remotion FFmpeg不提供rawvideo/s16le muxer，比较脚本改用其已有image2pipe/WAV输出，未更换生产媒体运行时。以上失败不伪记为通过。
- 页面未改，原有浏览器权限限制仍在，本轮没有交互UI浏览器验收；实际服务端Chromium渲染和两条MP4已执行，不将其称为桌面/手机交互验收。O1/O2/O3/S1/S2/S3不适用（后端性能优化）。
- 范围评审（code-review / integrity-gate）：No findings。新增仅一个有界管理员配置，默认旧行为，环境传递与容器实际值检查匹配；HTTP契约、前端、模板、认证及数据库均无变化。发布保留原凭据/会话私有挂载，按用户确认的现有规则重启清空临时媒体；回滚元数据仅包含配置，不含会话快照。未覆盖的更长/4K/高并发资源情况如上。
- 文档同步（neat-freak）：README、Docker运维/样例、docs/plan、本文和验证产物已同步。AGENTS无需增加规则，既有多账号隔离、单槽、精确Host/Origin和临时清理约束保持。部署最终健康和账号检查见`deployment.json`、`account-report.json`。

最终部署确认（2026-10-31 13:14 CST启动）：新镜像健康、重启计数0、OOMKilled=false，运行配置确认为3线程、3CPU/2560MiB；三个部署文件摘要与候选一致。原两个用户名/密码分别实际登录成功，测试登录随后撤销，ASR/智能清理ready=true；认证文件摘要与切换前一致。公网登录200、私有页303、未登录API/media/exports401、内部workspace路径403、错误Origin403及静态资源200通过；Nginx固定Host探测返回401。独立测试容器及含用户原片副本的测试目录已删除，业务媒体按用户已确认的重启规则清空。

## 2026-10-31 滑块修复部署到新站

范围只包含新站冻结版本的页面产物/水平滑块CSS及本次部署说明，不按完整工作区HEAD差异扩展本次代码归属。用户指定仅更新106.54.221.18，随后明确Git先不提交；未暂存、未提交、未推送，之前为提交准备的.gitignore三行已按原样撤回，其他修改保留。

以实际运行`20261031-video-threads`镜像为基线取源码，确认theme.css与上轮修复前快照一致后仅叠加已验收规则，独立重建Next并包装镜像。最终镜像8c0272f1c62f4ea77cff23f641185b8116310c04c1bfcad71f097410c77ce97a，Next K8lWeRhgNbAXehzapk5Tk。构建检查两套模板摘要，后端/运行时/模型不变；没有发布仍在修改的本地其他源码。

独立候选容器使用假账号、独立data/sessions与相同3CPU/2560MiB限制。浏览器通过SSH转发访问服务器候选，1280和375px三组滑块中心偏差均0、无横向溢出，键盘25→26%；既有本地1280/1440/1600/375拖动及150项测试证据沿用。候选实际实拍6.2秒186帧、照片3秒90帧新MP4均1080×1920/30fps、H264/AAC，隔离、Origin、原片上传字节、跨账号404和Range206通过，候选无OOM/重启。本次不据小样宣称长片资源上限。

切换前两账号上传、照片/实拍/开场、清理与字幕任务均空闲。13:35:32+08:00切换完成，两账号7天Cookie跨重建保留，字幕及智能清理ready，退出400/409/明确退出与Origin拒绝通过。3线程、Compose、认证/cloud摘要保持；正式容器healthy、OOM=false、RestartCount=0。公网login200、私有页面303、API/media/exports401、私有路径403和静态资源200通过。正式浏览器打开超时，已在报告明确区分同镜像候选和正式浏览器。配置回退仅到保留3线程与ASR的上一镜像，不回放会话快照。

本轮报告、来源、section/asset映射和截图在artifacts/deploy-slider-2026-10-31；其验收数据不推送Git。Recreation Metrics O1/O2/O3/S1/S2/S3=N/A（部署已有局部修复）。

## 2026-10-31 自动原声字幕与预览弹窗

用户明确更新需求：全部有音轨的视频上传后自动识别并直接填入可编辑字幕，无需手动识别/采纳。现有AGENTS/README与计划已按此要求同步；仍不在上传请求中识别，不改原声或事实，不调用收费接口。页面顺序消费现有媒体单槽；待识别、失败、暂停、重试和明确跳过可见，未处理完不能静默生成缺字幕成片。已有字幕/空字幕保留，迟到结果按当前原片路径合并，不能恢复被移除素材或覆盖手工修改。当前自动队列依赖制作页保持打开，刷新可通过已有缓存继续。

底部“看预览”和顶部预览步骤改为antd弹窗。打开时卸载侧栏播放器，关闭时卸载弹窗播放器，避免双播放器声音；有成片优先显示上次成片并提示修改后重新生成，否则使用原Remotion实时预览。保留暖色StudioProvider主题和新近部署的滑块对齐样式。

实际现场耗时核对：13:18:09开始、13:20:21完成，约132秒生成97.066667秒成片；之前约225秒生成83.333333秒成片，等待减少约41%，因输入不同不作为严格同片性能结论。此前严格同片83.33秒对照214.984→118.632秒（44.8%）仍是线程优化的可比证据。当前实际请求日志没有识别POST，原本为手动识别流程，不能将未触发识别误诊为模型故障。自动识别会增加首次上传后的处理时间，缓存命中会复用结果。

验证：lint、format:check、typecheck、workspace build及冻结正式源码build通过，152项测试通过。新增覆盖自动待处理集合、照片/无音轨跳过、空结果/明确跳过、已关闭显示保留、人工编辑保护、移除源迟到结果和原片时间保留。评审修正了仅清空ref但effect不重新执行的重试问题，加入明确重试版本状态；完成消息不再提示手动采纳。

隔离服务器候选使用独立假账号/data/sessions、3CPU/2560MiB、STUDIO_VIDEO_THREADS=3。真实识别/跨账号404/排队取消不打断另一账号通过；三份视频连续识别得到1/1/17条字幕，包含60秒公开语音（约7.538秒识别，前两份缓存各约0.505秒）。纯视频11.2秒与视频混合照片13.205秒实际MP4均H264、1080×1920、30fps、AAC48k。抽帧目视确认两条路径均有原声字幕，静音封面、后续照片段没有残留讲话字幕。另实拍5.2秒、照片3秒和字幕水印9.2秒导出、账号隔离/原片字节/Range206/Origin拒绝通过。峰值1114177536字节（约1.04GiB）、测试结束当前约353MiB，memory.events全0、pressure total=0、OOMKilled=false、RestartCount=0；此60秒公开重复语音不能证明任意更长/连续自然讲话/4K的资源上限，也不是旧1CPU/768MiB验收。

冻结基线为最新正式slider-alignment镜像8c0272f1c62f4ea77cff23f641185b8116310c04c1bfcad71f097410c77ce97a。仅叠加6个UI/状态文件与重建Next，无服务端、模板、账号或模型变更；两套模板指纹检查通过。最终候选house-video-studio:20261031-auto-subtitles-preview-final，镜像d74c83d0535018b520b45e8246f7f323f69f7251ab8c280d94498216fc709165，Next Zj8ttAulb85l-7cX1s1qz。最终包再跑实拍/照片/识别字幕导出与隔离、取消验证通过。

浏览器限制：用户再次明确允许检查后，工具仍以已保存权限/受管策略拒绝观察106.54.221.18。未绕过，无法取得origin.html、页面截图或实际点击证据；不得把服务端Chromium生成MP4等同于页面自动队列/弹窗/响应式交互验收。Recreation Metrics O1/O2/O3/S1/S2/S3=N/A（局部功能修复）。范围评审未发现未处理的代码缺陷，交付结论Ship with caution；主要剩余风险为React自动流程及弹窗缺少实际浏览器验证。

产物：artifacts/auto-subtitles-2026-10-31含作用域补丁、来源/区域/资源映射、静态检查、API/媒体报告和公开样片解码帧。13:41前正式站已有新业务素材，因此等待用户下载并暂停后才允许重建；切换授权问题已发出，候选完成不等于已上线。

上线确认：用户已明确确认下载并暂停，允许切换。2026-10-31 13:56:04 CST正式重建完成，实际镜像与最终候选一致。上线前两账号任务空闲，auth/cloud/Compose摘要保持；正式健康检查healthy、重启计数0、OOMKilled=false，原两账号密码实际登录成功，ASR与智能清理ready，测试登录已撤销。公网login200、私有页303、API/media/exports401、内部workspace路径403、错误Origin403及静态资源200通过。最终证据见deployment.json/account-report.json/release.json；此后不再处于等待切换状态。浏览器权限限制仍在，未声称实际页面交互验收。测试容器已停止，不占用正式计算资源；隔离公开样片和报告保留，未停止或修改旧阿里云服务。

## 2026-10-31 Nano 与独立可编辑原声字幕（已切换）

按用户最新要求，原声识别改为主动生成 → 编辑文案 → 明确添加，默认不识别、不添加，未识别不阻止成片导出。原房源文案、镜头字幕及配音保持独立。免费模型使用用户对照后选择的 Fun-ASR-Nano，离线 CTC 强制对齐保留其文字。

153 项 TS 测试、5 项 Python 算法测试、lint/format/typecheck/build 通过；新服务器 3CPU/2560MiB 整服务完成三份真实短片、110.8 秒连续讲话、静音、600 秒公开重复音轨、运行/排队取消与账号隔离。10 分钟音轨 199.86 秒完成，峰值 2484.8MiB 含文件页缓存，OOM/重启均为 0；结束匿名内存 228.4MiB，无残留 ASR 进程和字幕临时目录。最终镜像两条带字幕 MP4 与原照片导出通过，抽帧确认修改文案生效、原文案保留、封面无讲话字幕。浏览器观察仍被已有站点策略拒绝，未实际点击验收。

候选 house-video-studio:20261031-nano-manual-subtitles，摘要 sha256:2fd8649280166a234d82005679b1f5f6c1c3571d8d9e5cb7043892cb0bc42958，Next build wKe-Z2cwr_Nw_Hs9s6uc-。仅冻结生产基线叠加本轮文件；其他本机未发布变更未进入候选。正式站新增素材后首次激活检查停止。用户随后明确确认已保存并暂停，2026-10-31 23:52:58 CST开始切换。额外诊断进程导入服务模块触发临时目录重置，导致主服务启动时ENOENT并自动重启1次；诊断进程已退出，23:53:13 CST恢复运行，后续连续观察healthy、同一PID/重启计数不再增加，OOMKilled=false。正式认证仍为2个账号，auth/cloud/Compose摘要均未变；Nano ready，匿名业务API及媒体均401，公网认证状态接口正常。运维说明已禁止在正式data挂载上另起服务模块导入进程。详见[本轮验收](../artifacts/20261031-nano-manual-subtitles/verification.md)。

## 手机视频上传放宽（2026-11-01）

上传1GiB和15分钟限制、Node/Nginx超时与大小边界统一；本地六项门禁和153测试通过。隔离Linux真实multipart验证300MiB/1GiB成功、多1/2字节413、超代理正文413；容量507、取消/断线半文件清理及账号隔离通过，大文件原片生成MP4及原实拍/照片导出回归通过。峰值1083772928字节、无OOM或重启。测试原片为短MP4附加合法free box，不能代表真实长片渲染性能。浏览器观察仍受站点权限阻止，手机需刷新新地址复测；旧站未更新。发布范围、证据和限制见[本轮验收](../artifacts/20261101-upload-limit/verification.md)。

## 配乐与左上角艺术水印（2026-11-01）

实拍推荐音乐40%、照片20%，旧草稿和静音保留，可点推荐配乐应用；水印改为左上角淡珊瑚橙粗斜体衬线艺术字，横屏照片标题调整间距。153项测试及lint/format/typecheck/build通过，最终Linux镜像7份MP4覆盖原生、浏览器与照片分段路径；实际AAC解码测得音乐提高约4.08dB，静音保持，抽帧确认封面/成片/长水印与关闭效果。峰值1152598016字节，OOM/重启0，测试容器已停止。新站空业务状态下切换，原账号密码与配置摘要保留；旧站未修改。浏览器实际点击仍因站点权限未验证。范围、回退与证据见[本轮验收](../artifacts/20261101-music-watermark/verification.md)。

## 2026-11-01 内置兜底与在线音乐库

- 范围：两种编辑器共用内置五曲/在线搜索/右侧 🎺 播放暂停及可取消导入；上游技能仅项目内文档参考，应用独立实现，不调用付费服务。
- lint、format:check、typecheck、build、158项test通过；冻结发布版本Next构建、两套模板摘要及Docker构建通过。仅叠加本次补丁，不发布无归属工作区改动。
- Linux真实接口：匿名401、Origin403、账号身份409、非法参数400；原生内置试听、在线取消清理、账号媒体隔离404通过。在线搜索18.29秒/12首；6.58MB曲目首次加载428.31秒，选用复用0.31秒。外网慢是真实限制，保留内置兜底、加载取消和10分钟截止。
- 实际4个MP4覆盖在线实拍/照片、内置实拍和关闭原声的内置纯配乐；1080×1920 H.264+48kHz AAC，均非静音。测试容器OOM=false、异常重启0。
- 浏览器保存的站点观察权限阻止访问，没有绕过，也没有声称实际桌面/手机点击验收通过。Recreation Metrics O1/O2/O3/S1/S2/S3均N/A（本次为功能增量）；来源证据与盲区见 artifacts/20261101-music-library/source-evidence.md。
- 复核与MP4/指标见 artifacts/20261101-music-library/；结论 Ship with caution。

生产已于本轮切换至 `house-video-studio:20261101-music-library`，镜像摘要 `f03bc04a3bafbff2dca05f00f7457577ffe06eee2bfc620d66b34984b0460210`，Next `Nho3NdJ8qW4d_LFMvKu7k`。切换前空业务目录检查通过，原账号/云配置/Compose哈希不变；公网鉴权和登录检查通过，服务running、OOM=false、异常重启0，旧阿里云未变。回滚使用前版完整镜像 `20261101-music-watermark` 及部署目录的 `backups/music-library-20261101`。

# 2026-11-01 制作页布局与 Ant Design 图标

字幕操作改为12px间距、垂直居中的可换行按钮组，显示开关独立一行；音乐上传/音量操作分组，界面使用Ant Design Icons，折叠恢复标准箭头。保持暖色主题与原业务状态。完整门禁及158项测试通过；冻结候选独立构建与Linux两份H.264/AAC、1080×1920实际MP4通过，无OOM或重启。浏览器仍被保存的站点权限阻止，桌面/手机布局及实际交互未验收，不以MP4代替。用户明确确认后已于2026-11-01 21:16（北京时间）发布到106.54.221.18；切换前空业务目录检查通过，认证/云配置/Compose摘要不变，公网鉴权与容器healthy检查通过，异常重启0、无OOM。详见 [本轮验证](../artifacts/ui-layout-2026-11-01/verification.md)。

## 2026-11-01 全页间距与搜索反馈（本地已更新）

在用户指定的本地4318实际复现antd未分层reset覆盖Tailwind间距；启用组件样式层并统一音乐组12px间距。两种编辑模式新增常用中文关键词映射、可见数量/空结果状态和成功自动展开；修复结果菜单关闭动画读取已清空数据导致换词崩溃。实际检查首页、实拍直达、照片编辑及隔离登录页，375/1280/1470/1920px覆盖，窄屏无横向溢出，宽屏左右居中。lint/format/typecheck/build与158测试通过；隔离实拍带字幕5.2秒、照片3秒两份1080P H.264/AAC MP4及账号隔离通过。中文钢琴能返回12首；海外音乐下载仍实测出现连接重置，失败/取消保留内置音乐，不保证每首在线音乐可下载。未触发完整ASR浏览器识别或付费调用，公网未发布。详见[本轮验收与截图](../artifacts/spacing-search-2026-11-01/verification.md)。

## 2026-11-02 发布间距修复并归档项目源码

正式镜像为 `house-video-studio:20261102-spacing-search`，SHA256 `0267d30ae9fe9330e9a0d694431c5e5fab918f51b279aedc00ebe4cf3a8d0e9d`，Next `61vJc5CWCTuPyPr6q0LcM`；只叠加上节已验证的三份UI源码与Next，全部修改前文件与冻结生产基线一致。原账号配置、cloud和Compose摘要未变，切换前业务文件为0，正式healthy且重启0、OOM=false。

重新执行lint、format:check、typecheck、build和158项测试通过。Linux隔离候选导出实拍带原声字幕5.2秒、照片3.000313秒，两份均1080×1920 H.264＋48kHz AAC且非静音，抽帧确认字幕、水印；跨账号成片404、匿名音乐API401。浏览器通过4328 SSH转发访问隔离测试账号，不连接正式站：登录后中文钢琴返回12首、Flex gap=12px、1470px无横向溢出，控制台错误为空。一次浏览器CDP读取超时后重读成功；不将此记作应用错误。完整历史多视口检查见上节；本次不重复声称已验证全部浏览器流程或长片资源上限。

Git按用户确认提交全部当前项目源码和文档，排除data、模型、密钥、构建产物、验收产物和Python缓存；扫描出的凭据样式字符串均为明确的离线测试假值。首次暂存发现2026-10-26遗留零字节index.lock，确认无进程持有后移动到临时验收目录留档，再正常暂存。Git源码范围大于冻结部署范围，详见部署说明。

Recreation Metrics：O1/O2/O3/S1/S2/S3均N/A（本轮部署现有界面修复，未执行页面复刻）。浏览器验证为Linux候选实测，正式站仅HTTP与发布摘要核验。在线曲目下载稳定性仍属已知限制。

## 2026-11-02 同步科研工作台视觉规范（本地）

按用户最新要求，参考只读scientific-research-workbench的主题配置、颜色常量和布局样式，替换暖色胶囊方案：主色#27b7aa、激活#17a79a，白面板/浅灰底、4px控件/8px面板圆角、40px桌面/44px手机控件，统一表单与操作间距。顶部直接提供两种制作模式，登录页和两种制作页共用主题。参考仓库未修改；视频模板、API、认证与媒体流程未改动。

lint、format:check、typecheck、build和158项测试通过。Chrome实际验证隔离登录、首页、实拍直达与刷新、照片模式切换、折叠、预览弹窗、音乐搜索；375/1470/1920px无横向溢出，1920px内容1440px居中，最终桌面页头48px、按钮40px/4px圆角。钢琴搜索实际返回12首。隔离实拍带字幕5.2秒、照片3.000313秒MP4均1080×1920 H.264＋48kHz AAC、音轨非静音，抽帧确认字幕/水印，跨账号成片404。最终CSS收尾只调整页头与手机面板内边距，重新构建并浏览器复验；媒体代码不变，无需重复渲染。

本地4318已在确认三个最新生成任务均完成、未启用临时媒体重启清理后更新；未发布公网、未提交Git。本轮未验证Safari/微信真机、长片资源上限、完整ASR识别或所有在线曲目下载。浏览器记录无应用错误。截图、来源、MP4与复核记录见 `artifacts/workbench-style-2026-11-02/`。

Recreation Metrics：本轮为风格同步而非科研页面逐像素复刻。O1/O2：本项目业务元素及内容保留；O3：375/1470/1920px实测；S1：按参考源码精确token同步，未取得参考页新截图，不声称像素一致；S2：上述交互实际通过；S3：未引入参考站业务/素材或推测内容。

## 2026-11-02 公共UI组件封装（本地）

新增studio/common作为登录、实拍与照片编辑的统一控件入口，适配科研工作台CommonButton的Solid/Hollow方式并保留antd原生契约。18个页面/业务组件替换直接导入；按钮、输入复合组件、泛型选择/数字输入、复选框组、表单、弹窗、确认、上传和进度均通过公共层使用。控件样式从theme.css收口到common/controls.css，删除逐页island-action/studio-button/studio-primary修补类；ESLint禁止业务绕过入口。未引入参考项目私有依赖或科研业务组件。范围以本轮修改前快照为准，不重复评审上一轮未提交的主题改造。

lint、format:check、typecheck、build和162项测试通过（含4项新增公共控件契约测试）。Chrome实际验证空登录校验、登录、更多菜单、退出弹窗取消、两类视频上传、真实生成按钮忙碌禁用/完成、下载MP4、折叠、中文钢琴搜索12首、照片模式。375/1470/1920px检查；手机完成态主按钮空间不足时整行换行，保持文字与44px触控高度。两份隔离MP4为5.2秒实拍带字幕及3.000313秒照片，均1080×1920 H.264/AAC48k非静音、账号隔离通过。最后修改仅手机底栏flex布局，重建并复验。

验收期间本机磁盘剩余约300MiB，上传正常触发507容量保护；只清除可重新生成的.next/cache/webpack缓存，未删除业务媒体/模型。隔离4320以STUDIO_MIN_DISK_FREE_MIB=128完成小样验收，本地4318/公网配置未降低。重建时旧验收进程引用过期CSS产生短暂资源404，重启最终构建后复验正常，不把此过程作为应用零错误的证据。未重复完整ASR、长片资源或Safari/微信真机验收。本地4318已更新；公网与Git未发布。证据见artifacts/common-ui-2026-11-02。

Recreation Metrics：O1控件/入口保留；O2业务文案/数据不变；O3实际375/1470/1920；S1既有工作台主题保持（本轮封装，不是逐像素复刻）；S2上述真实交互通过；S3无虚构业务/参考素材。参考仓库只读。

## 2026-11-02 紧凑按钮与拖拽手柄（本地）

按用户要求继续照参考CommonButton收紧样式：普通按钮36px、小号32px、2px圆角、14px粗体，普通padding6px16px、小号4px12px；手机不再强制44px按钮。默认描边使用主色，实心禁用态保留主色半透明。拖拽手柄改为antd text/small/icon用法，28×28px无边框、16px图标，删除44px/10px内边距覆盖。试听按钮32px，登录按钮36px。输入控件尺寸与媒体模板不变。

Lint、format:check、typecheck和生产build通过。完整测试首先因本机空闲空间低于上传预算触发507失败；清理本轮可重建webpack pack缓存后仍不足两份1GiB并发预算。仅测试进程设置STUDIO_MIN_DISK_FREE_MIB=128后161/162通过，唯一失败为auth.test.ts两账号并发上传第二份预算被507拒绝，未改业务容量逻辑或放宽本地4318/公网配置，不能报告完整测试通过。

Chrome隔离账号实际确认登录、两个素材、鼠标拖拽与方向键重排、预览弹窗；375/1470/1920px无横向溢出，桌面/手机普通按钮实测36px，手柄28×28px/图标16px，试听32px，宽屏2px按钮圆角与6px16px内边距。浏览器只有Remotion既有许可证提醒，无应用错误。两份实际MP4回归为实拍带字幕5.2秒、照片3.000313秒，1080×1920 H.264/AAC48k非静音；本轮仅CSS和图标渲染方式变化，导出帧与前次已检查帧一致。

本地4318在检查既有任务完成后更新，未发布公网或推送Git。来源、前后截图、section/asset映射、限定差异和检查日志见artifacts/compact-buttons-2026-11-02。Recreation Metrics：O1/O2业务元素与文案保留；O3三种宽度实测；S1按钮高度/圆角/字重按参考源码，宽度适配中文与响应式；S2鼠标/键盘排序及预览通过；S3无新增参考业务或素材。Safari/微信真机未覆盖，完整测试受磁盘条件限制。

## 2026-11-02 发布工作台主题、公共UI与紧凑按钮

用户明确要求更新线上后，从上一spacing-search冻结源码准备候选，仅叠加三轮已验证的26份UI文件并独立构建Next。21份修改前UI摘要匹配正式镜像，5份公共适配新增；后端、package/lock、两套模板和Linux运行时未改。镜像 `house-video-studio:20261102-workbench-compact`，SHA256 `aec694e0ff3a80311cbb25666feb2e22e56b3baebe07eed431c189312d8b84a5`，Next `fPuWDyqFxFymvUpmirziq`。

同3CPU/2560MiB独立Linux容器完成实拍带字幕5.2秒、照片3.000313秒MP4，两份1080×1920 H.264/AAC48k非静音，跨账号导出404、匿名音乐API401。浏览器通过4328隧道访问候选，验证登录、预览弹窗、375/1470/1920px布局；按钮36px/2px圆角、1920时主容器1440px，浏览器错误/警告为空。测试脚本初次因新验收目录父组权限失败，限定修改该新目录组后成功重跑，无正式目录权限调整。

切换前再次检查正式数据文件数为0，保留账号、cloud与Compose摘要，备份仅部署元数据到backups/workbench-compact-20261102。正式新镜像healthy、重启0、OOM=false；26份源码哈希与候选一致。公网登录页/样式200、业务API及media/exports匿名401，新36px控件CSS可取。账号及密码配置保持原文件，独立会话挂载未变。候选容器和SSH转发停止；未修改旧站或推送Git。

本地完整测试的并发上传用例仍受磁盘不足阻塞，不报告162项全部通过。未重复完整ASR、长片资源上限、Safari/微信真机或正式站浏览器登录点击。Recreation Metrics：O1/O2原功能内容保留；O3候选375/1470/1920实测；S1工作台主题和紧凑尺寸一致；S2候选登录/预览、Linux导出与正式HTTP通过；S3没有扩展业务/参考素材。发布证据见artifacts/workbench-deploy-2026-11-02，源码范围与回退见deploy/docker/README.md。

## 当前单份草稿、终止替换与后台生成（2026-11-02）

确认范围仅为本轮工具写入的草稿/素材备份恢复、上传终止与逐份替换、任务提交和恢复状态读取、共享契约及其必要调用方/说明片段；不把当前工作区其他模板、主题、部署等并行改动计为本轮产出或review范围。来源证据为`artifacts/current-draft-2026-11-02/origin.html`、`before.png`和`section-map.json`。

已实现：每账号/模式的当前JSON覆盖保存，引用素材串行备份到IndexedDB并去重；即时账号绑定本地检查点在网络确认前保留最后输入，异步完整保存仍核对当前登录，失败不假报成功且可手动重试。原始整段文案、待采纳房源提取、画面文案/要求、原声字幕编辑稿与已采用文字/设置共同保存；未采纳字幕仍不渲染。新建仅替换当前模式并清理其旧Blob，模式间保持独立。过期/重启后检查真实资源并复用原校验上传接口恢复，精确重映射素材字段，原片字节/文案/顺序/时序保留。旧JSON未备份且已过期的媒体仍需用户重选。

上传状态处直接终止，本批剩余上传和迟到响应受取消保护；逐份替换保留素材ID/顺序/文案，范围限制到新时长，取消或失败保留原片，成功后清理旧本地Blob。当前页头沿用科研工作台主题`#27b7aa`/白面板/浅灰背景与common控件；仅调整状态行与操作容器布局，修复375px操作挤成竖排文字，按钮保持公共36px规格。

复用原有服务端202后台渲染与账号媒体单槽，不新增worker、队列、数据库或生产依赖。提交不等待浏览器Blob备份，页面卸载只中断状态读取；前台/pageshow/online事件替换暂停的旧状态读，迟到响应不能回退新进度。提交响应丢失先查询最新任务，不自动重提。活动任务可独立于草稿恢复查询；服务器进程仍须运行，服务重启中断的失败语义及完成后2小时临时文件清理规则不变。

实际验证（仅隔离4391服务、自建浏览器profile和合成媒体，不覆盖已有业务草稿/媒体，不读取云凭据，不发模型请求）：

- 实际口播＋房屋视频上传、无需手动保存的文字/原始资料与视频刷新恢复；空标题中间态保存/刷新；真实限速上传中途终止保留旧片，成功替换后保留ID且旧Blob消失。
- 删除本轮隔离服务的uploads模拟同进程素材过期，刷新自动恢复；真实重启隔离服务后再打开，也自动恢复。下载两份恢复视频与合成原片逐字节相同，文字/时长不变。
- 1440px桌面、375px窄屏、首页/实拍直达/刷新/照片模式实际浏览器检查；375px无横向溢出，页头三个操作均36px高。`after-mobile.png`为初验长图，其中旧操作挤压问题在`mobile-header-final.png`复验已修复。只做Chrome移动视口与关闭整个浏览器验证，没有实体iOS/Android测试。
- 三条实际导出均在202返回、任务仍running时关闭整个浏览器；通过文件系统观察任务JSON完成，期间无浏览器进度请求。重开同一profile能找回同一任务编号与MP4下载。纯视频native：H.264/AAC、1080×1920、30fps、6.000秒；视频/照片混排常规浏览器路径：同编码/尺寸/帧率、11.008秒；照片模式：同规格、5.000313秒。抽帧实查封面。样片、封面、帧图及ffprobe报告在同一证据目录。
- 模拟IndexedDB容量异常，当前JSON文字保留、状态明确失败；恢复存储后点击保存，失败状态清除。实际生成POST在服务接收后故意丢弃响应，页面找回该任务，POST计数恰为1；visible事件立即刷新同一任务，不重提；随后关闭浏览器，该任务也完成。
- 显式新建清空当前实拍项目并删除其全部Blob；刷新仍为空，照片模式自己的Blob和草稿保留。浏览器未捕获未处理页面异常；故意丢弃响应产生的预期网络错误不计产品异常。

最终默认环境`pnpm lint`、`pnpm format:check`、`pnpm typecheck`、`pnpm build`、`pnpm test`（169/169）及`git diff --check`通过。早期可用磁盘约0.9GiB，默认保护正确拒绝任务，曾用仅验收进程的虚拟磁盘读数继续小样片检查；之后实际可用空间恢复约7GiB，取消模拟后全量默认测试169/169和三条真实MP4后台验收均通过。源代码的5GiB账号/1GiB磁盘预留没有改动。只清理过本轮可再生Next编译缓存，没有清理用户data/模型/认证文件。必要测试夹具补入已有editorial-template文件，未将既有模板实现归本轮。

限定review（code-review/integrity-gate）：No findings。检查调用方、账号命名空间/旧页面身份、恢复上传边界、取消/迟到/覆盖/清理顺序、未采纳文字、前台恢复、请求结果未知和资源保护。新增零件均位于既有studio域与共享definition层；copy-result拆分仅为解除项目草稿引用文案结果的循环依赖，旧copy导出保持兼容。README、AGENTS、API规则、plan和deploy/README已实际同步；无数据库/环境/锁文件/Docker变更。发布时需一起包含新增源码与Next/视频包构建，旧客户端应刷新；本轮未发布公网，也未声称Linux资源长片或实体手机验收通过。

限制：浏览器备份不跨设备/来源同步，清除网站数据、浏览器回收存储或可用空间不足仍可能造成备份不可用，须保留原始文件；无法恢复此前从未备份且已被清理的旧片。服务本身关闭/重启不属于浏览器后台运行保证。素材备份进行中离页提示保护本地草稿，不取消已接收的后台渲染。

Recreation Metrics：O1/O2/S1/S3不适用（现有业务交互改造，无网站重建目标）；O3/S2通过（实际功能、浏览器与三条MP4）。WEBSITE_RECREATION_VERDICT: Ship with caution（实体手机/公网未验收）。HARNESS_DOCS_STATUS: Updated。HARNESS_REVIEW_VERDICT: Ship with caution。

## 顶部吸顶、真实账号与同房源双模板（2026-11-02）

确认范围为本轮共享StudioHeader/SessionControl、相关theme布局、两种模式的模板选择与已完成成片展示/下载片段，以及对应README/AGENTS/plan/规则说明。当前工作区还有其他任务的模板实现、公共控件与部署改动，不将整份HEAD差异归本轮，也不对范围外部分给review结论。

- 共享页头改为原生sticky。ResizeObserver实测页头高度，并通过同一CSS变量驱动步骤栏top、桌面预览top/可视高度和锚点scroll-margin。手机换行、保存提示变为多行时同步避让，按钮保持已有common的36px规格；保留科研工作台`#27b7aa`/白面板/浅灰背景/小圆角主题，没有新增视觉系统或页面按钮外观补丁。
- 更多菜单直接读取服务端当前会话username；每次打开重新核对，加载/读取失败/登录失效明确显示，不能将上一次账号名当成当前账号。显示当前账号与带图标的退出入口；本机未启用登录时说明并禁用退出。沿用原确认弹窗、confirmed=true、X-Studio-Workspace一致性和可靠撤销流程，没有改认证API或凭据。菜单/弹窗使用common控件和产品主题。
- 用户追加要求：同一房源生成一版后，允许切换模板再生成另一版，现有素材、信息与设置不变。用户后续澄清模板表现配置必须随目标模板切换：实拍同步更新videoTemplate和目标coverSource（经典House、杂志Opening），房源资料/素材共用；照片模式由videoTemplate切换视觉。之前将封面来源也冻结为共用信息的理解已修正，最终双向封面验收见后续补充。上一版完成任务不清空，刷新仍按同一项目恢复；下载入口、文件名显示实际生成模板。当前模板预览即时更新；最终补丁取消所有旧MP4替代实时预览的分支，旧文件仅在独立成片区播放下载。继续复用原模板缓存、媒体单槽和临时exports，只有一套当前草稿，没有新增服务端历史版本、接口或依赖。

来源与复查证据在`artifacts/sticky-account-2026-11-02/`：用户截图、修改前header/session/theme源码、origin.html、section-map.json、浏览器与模板报告、脚本和MP4。既有4318服务需要登录，origin.html为它的登录跳转页；没有读取用户Cookie/账号配置来获取编辑页“前图”，也没有把这次失败导航计为验证通过。页面主体与按钮基线以本轮修改前源码和用户截图为准。

实际浏览器验收使用4394隔离服务和两个自行创建的测试账号，不操作用户真实账号、草稿或成片：

1. `/`、`/video-edit`、`/photo-mode`分别在375、768、1440、1600px验证真实滚动：页头top=0、三个顶部按钮仍在视口内，步骤栏恰位于页头下方，无水平溢出；步骤锚点目标不被两条吸顶栏覆盖。多行保存状态实测触发偏移更新。菜单在视口内可点、Escape关闭。原Antd按钮的响应式属性存在短暂过渡，尺寸检查等待原生动画结束后执行，没有把过渡中的中间尺寸计为最终布局。
2. 更多显示与真实登录输入一致的`sticky-acceptance`。实际登录切换至`sticky-second-acceptance`后，不重建原菜单，重新打开即显示新会话的登录名，不保留旧名。菜单账号读取网络失败时显示“暂时无法读取”且退出禁用；恢复网络并重新检查后显示真实名称、退出可用。取消退出弹窗不发请求且票据仍有效；明确确认只发送一次confirmed=true和当前页匹配账号头，退出后回到登录页，测试票据已失效。两次账号切换后的退出在刷新绑定新页面身份后验收，未绕过旧页面账号一致性保护。
3. 实拍同一项目：实际上传两份合成视频、填写房源和原始资料，先导出经典实拍，再切换杂志留白；比较完整草稿JSON，初验曾按“只改videoTemplate”比较全部字段并保留House来源；这只验证了资料保留，并不满足随后澄清的模板封面切换要求，不能作为最终封面验收。最终仅允许videoTemplate/coverSource变化，其余源视频路径/素材ID/文案/音量/时序须一致，见补充报告。切换后刷新，旧经典版仍按模板名可下载；新杂志版输出路径不同，旧MP4仍200。切回经典，完整快照恢复为原始值，重新生成reused=true并复用经典文件。
4. 照片模式同样用同一张实际上传照片和房源信息连续生成经典与杂志两份MP4；除template字段外快照一致，原成片仍可下载。全流程没有触发文案生成、原声识别或配音请求，未捕获未处理页面异常。窄屏输入聚焦按既有规则隐藏底栏，验收在输入失焦后点击生成，没有把测试脚本等待隐藏按钮造成的超时当作产品通过。
5. 四份真实MP4：实拍两版均H.264/AAC、1080×1920、30fps、6.000秒；照片两版同编码/画幅/帧率、5.000313秒。FFmpeg解码至48kHz双声道PCM，每一对模板的音频字节数和SHA256完全相同（实拍1155072字节，照片962560字节）；时长相同，实际抽帧确认不同模板样式。另有1920×1080、3.000313秒的认证照片MP4用于页头修改的导出回归。没有用页面截图替代MP4验收。

最终lint、format:check、typecheck、Next build、全部171/171测试与git diff --check通过。初次隔离启动误将会话目录作为STUDIO_SESSION_STORE文件路径，安全检查正确拒绝；改用其私有目录内store.json后启动成功，未改业务安全校验。测试脚本登录缺Origin的请求同样被拒绝，补入准确同源Origin后验收，未放宽Host/Origin。

code-review/integrity-gate限定复核：No findings。核对实拍/照片调用方、共享UI主题、动态吸顶偏移、会话来源与重开刷新、退出取消/确认、共享资料保留与模板表现配置同步、旧片标识/预览隔离、缓存及当前草稿语义。README、AGENTS、design-system/video规则与plan已就地同步；无数据库/API/环境/锁文件或部署配置变更。未来发布须包含完整前后端源码与构建产物并遵守已有视频包校验；本轮未公网发布，现有用户服务/凭据未改。实体手机与公网入口未覆盖，不能据本机合成短样片声称大体积长片资源验收通过。

Recreation Metrics：O1/O2/S1/S3不适用（交互改造与现有模板复用，不是网站重建）；O3/S2通过（真实滚动/账号/模板操作及实际MP4）。WEBSITE_RECREATION_VERDICT: Ship with caution。HARNESS_DOCS_STATUS: Updated。HARNESS_REVIEW_VERDICT: Ship with caution。

### 最终澄清：模板表现配置必须同步切换（2026-11-02）

用户明确保留的是房源信息/视频等资料，模板内容（首屏封面、文案样式等）必须应用目标模板。已修正前述“只改template、冻结封面来源”的理解：共用VIDEO_TEMPLATE_COVER_SOURCE_MAP，供缺省契约与实际模板切换同时使用；经典为House、杂志为Opening，两方向都切换。手动更改当前来源仍允许，再点已选模板也可重新套用其默认来源，不会因“模板键相同”提前返回。模板卡片显示各自来源说明。

逐项核对：封面来源是唯一具有不同模板默认值、又单独保存在项目中的表现字段；现已同步。封面文字排版、片内房源文案样式、章节标题、片尾由videoTemplate直接驱动，预览和渲染共用组件，未发现其他脱离模板的样式状态。房源数字/文字、原视频/照片、手工字幕及待确认稿、配乐、音量、剪辑区间、共用封面时长等项目资料/设置保留；原声字幕继续遵守用户原定白字黑描边规则，不因模板切换擅自改写或重新识别。

最终封面验收使用相同口播原片＋首份房屋照片，经典先导出房屋底图，杂志导出口播首帧，再切回经典。前端选项、当前草稿、刷新恢复和POST快照均对应House→Opening→House；排除videoTemplate/coverSource后，完整共享快照逐字段一致。经典回切重新生成reused=true，旧版两份成片仍可下载。两份实际MP4均H.264/AAC、1080×1920、30fps、8.235秒，解码音频SHA256完全相同（1581056字节）；抽帧确认经典为房屋照片，杂志为绿色合成开场首帧，封面与文字版式同时切换。证据cover-template-report.json、cover-mp4-report.json和cover-real-*-frame.png。旧4份短样片仅作为先前通用双模板/音频回归，不冒充这次封面配置最终证明。

补验模板提交不等待草稿：暂停自动草稿网络确认时，切换杂志仍可立即POST并获得202，随后释放读请求，任务实际完成，见nonblocking-template.json。README、AGENTS、video规则与plan已按最终澄清修正，未增加历史草稿或每模板素材副本。

最终预览复核另发现：完成视频即使模板名相同，也可能属于修改封面/文字前的旧配置。因此取消预览弹窗优先展示旧MP4的分支，弹窗始终渲染当前project；已生成文件仍在独立的成片区按真实模板播放下载。使用真实上传原片和真实既有MP4作为“旧完成任务”的API夹具，检验同为Classic但当前封面改Opening/标题修改后，弹窗显示“实时预览”和当前标题，旧文件仍保留独立入口；该UI夹具不冒充新的后台渲染。

收尾补验：手动将经典来源改为Opening，再点已选经典可恢复House；手动将杂志来源改为House，再点已选杂志可恢复Opening，共用资料未改，见cover-reapply-report.json。当前配置实时预览UI夹具验证通过，见preview-current-report.json。最终构建遇到同目录其他构建占用后，在独立验收目录使用相同源码/公开依赖及复制的相同package/config完成`pnpm build`，未停止其他构建或删除其锁；最终lint/format/typecheck、独立Next build、171/171测试及diff检查通过。临时服务仅loopback4394，验证完停止；未更新公网。

## 2026-11-03 用户授权更新线上版本

已按“更新线上版本”发布至腾讯云http://106.54.221.18，镜像`house-video-studio:20261103-current-draft`（f1d4c519762bc4ece6494e80cc342bf0650d7d867b1242ec28b6574254710fef），Next `wX-Uu76IqyTWJeS4w7ezJ`。从工作区冻结171份src/server/scripts/public源码；与正式容器逐份摘要一致，冻结后无业务源码变化。Next和两套视频包独立重建并校验指纹，复用原Linux公开依赖/运行时；未复制本机依赖、模型、认证、会话或业务媒体。

本轮lint/format/typecheck/build/build:video通过。冻结本机测试因磁盘余量507失败1项，媒体运行时未正确关联时另跳过2项，没有把该结果冒充成功。首次Linux单元测试误沿用生产temporary模式及无开发依赖，测试环境不匹配；后在一次性测试层补齐锁定公开开发依赖，显式NODE_ENV=test/STUDIO_TEMPORARY_MEDIA=0，不挂载任何生产数据/凭据，171/171全部通过且零跳过。测试层不作为发布镜像；正式环境保持temporary=1与原资源/认证设置。日志保留修正前后证据。

隔离Linux候选四份实际MP4：经典原生5.2秒、杂志原生5.2秒、杂志混合素材6.208秒、杂志照片5秒；均1080×1920 H264/AAC，画面与音轨检查通过。候选内存峰值972128256字节，无OOM/重启；跨账号404、匿名401、错误Origin403、错工作室409通过。浏览器实测三个制作入口各四种宽度（375/768/1440/1600），吸顶/偏移/菜单/无横向溢出，实际账号切换、取消退出和确认退出通过，pageErrors为空；模板手动覆盖后重套用House/Opening通过，共享资料一致。初版脚本硬编码旧夹具workspace，改为读取候选实际会话；另一段错误地在异步新建尚未结束就操作禁用选项，改为对独立新草稿验收。没有改业务代码或削弱安全检查。后续UI复验用完全相同SHA256的内置钢琴字节作为网络夹具；实际MP4未替换服务器媒体响应。

正式切换前无非_control业务文件/任务，保护检查通过后才重建。回退元数据在backups/current-draft-20261103，不备份/恢复会话及临时媒体；认证、cloud、Compose摘要未变，sessions挂载保留。线上171份源码匹配，health healthy，restart=0、OOM=false；就绪前首个HTTP检查遇到502，服务完成启动后全量重试通过：入口303、登录200、匿名session200、API/media/exports401、新构建CSS/JS200。没有更改旧阿里云或推送Git。真实公网登录浏览器/实体手机未覆盖，不能据候选或短片声称通过正式站点击验收或长片资源测试。

证据：artifacts/current-release-2026-11-03中的build/video-build、linux-unit-corrected、linux-media、browser-report、cover-reapply-report、activation/public-check日志及四份实际MP4。Recreation Metrics：O1/O2/S1/S3不适用；O3/S2候选通过。WEBSITE_RECREATION_VERDICT: Ship with caution。HARNESS_DOCS_STATUS: Updated。HARNESS_REVIEW_VERDICT: Ship with caution。

后台补验：浏览器请求上下文真实上传合成原片并提交新任务，服务端返回202/rendering后立即关闭整个浏览器；没有浏览器轮询，仅通过SSH读取隔离候选任务JSON，最终complete，见background-report.json/background-api.log。额外的持久浏览器UI关闭/复开脚本等待草稿保存超时，未计为候选通过，也未据此宣称实体手机切后台或本轮Linux UI复开验收；此前本机关闭/复开及素材恢复证据仍按原范围有效。完成后停止未完成的独立浏览器脚本、候选容器和转发；正式容器保持healthy。

## 2026-11-03 实拍口播移除入口修复

用户反馈口播无法移除。对照正式版本源文件与实际浏览器复现：默认实拍页HouseMaterials仅提供更换/预览，漏了移除按钮，useVideoEdit也未暴露对应操作；照片模式OpeningPanel已有移除，非后端删除失败。修改仅限house-materials.tsx和use-video-edit.ts：公共Button接入removeOpening，使用既有函数式patch只置opening=null，自动草稿沿原链路保存；上传/生成/识别等忙碌态继续禁用，房屋资料与配置不变。不新增API、依赖、字段、模板或服务端草稿；实际源文件范围见artifacts/opening-removal-2026-11-03/task.patch，其他Git改动不计本次评审。

改前origin.html、375/1440截图、区块与素材映射已保存。浏览器使用独立私有夹具账号与真实上传原片，先复现缺按钮，再验证/video-edit 1440px与/ 375px：更换或上传不同src的口播、点击移除、对比完整项目快照（仅opening变化）、检查IndexedDB移除唯一口播Blob而房屋素材仍在、刷新仍无口播。照片模式既有移除与两个模式草稿隔离同时通过；无页面异常、无横向溢出。初版基线脚本在已登录状态导航登录页触发自动跳转竞态，改为导航前注入独立夹具草稿，未修改应用登录逻辑。截图在可实际点击后采集。

lint、format:check、typecheck、171/171完整测试（零跳过）及独立生产构建通过。Next提示隔离目录父子同名锁文件的根目录推断警告，构建成功，源码和产物逐份验证；未调整业务构建配置。构建后本机其他占用使可用空间降至约1.3GiB，上传按默认1GiB磁盘预留正确返回507；仅独立本机合成短片验收进程使用STUDIO_MIN_DISK_FREE_MIB=1，串行测试23KB夹具，正式设置未改。该本机验收不能证明生产磁盘准入。移除后重新加入口播的实际MP4成功：5.2秒、1080×1920 H264/AAC。实拍仍沿用既有要求：重新上传口播后方可生成；本次未把无口播导出扩为新功能。

Linux候选复用current-draft镜像，只叠加两份源文件与新Next产物；两套视频包源指纹仍匹配，无媒体/契约源码变化，不伪称重新构建视频包。默认3CPU/2560MiB、1GiB磁盘预留下真实上传与5.2秒1080P MP4通过，跨账号成片404、匿名401、错误Origin403与错账号409通过；候选导出峰值818896896字节、重启0、OOM=false。父镜像摘要、新源码/产物及受保护配置在切换时校验，未触碰旧阿里云。

scoped code-review/integrity-gate：No findings；复核按钮忙碌态、函数式更新、预览条件卸载、speech源身份防迟到写回、浏览器当前草稿及Blob引用保留。README就地补齐入口说明，验证与发布记录同步；AGENTS/契约/环境/依赖无新规则变化，不追加修复流水账。实体手机未测，公网登录浏览器无本次交互证据；候选截图不冒充正式站。

Recreation Metrics：O1/O2/S1/S3不适用（局部功能修复）；O3/S2通过（375/1440浏览器交互、草稿和实际MP4）。WEBSITE_RECREATION_VERDICT: Ship with caution。HARNESS_DOCS_STATUS: Updated。HARNESS_REVIEW_VERDICT: Ship with caution。

正式发布完成：镜像house-video-studio:20261103-opening-removal，SHA256 391c69a271692611e37e2e4903803cf387c3e54f6ab51c2f853d5612a0bb4c2d，Next 9rm-x47eJNthooYBprMD1。切换前仅5份与_control音乐源逐字节一致的内置音乐副本，无上传/任务；账号/cloud/Compose摘要一致，sessions挂载保留，无业务数据或会话快照操作。上线171份完整源码摘要匹配，public-check与public-button-code.json确认公网新JS已包含移除入口，鉴权/静态资源正常，healthy、restart=0、OOM=false。回退元数据backups/opening-removal-20261103；独立候选与本机服务已停，未修改旧阿里云或推送Git。

## 两套模板文字大小与样式统一（2026-11-03）

## 两套模板文字大小与样式统一（2026-11-03）

本轮范围为 `artifacts/template-type-2026-11-03/scope.json` 与 `task.patch`，只评价本轮净修改，不将既有未提交内容归为本轮。按用户要求，两套封面共用经典实拍原有字体、字号、颜色、字重、斜体和描边：标题148px、总价190px、资料64px、附加86px、联系42px；第一套杂志留白从154px处向下集中排列，经典仍保留240px顶部与全画面分布。不再按文字长度自动缩小杂志字号。实拍开场、镜头文案和原声字幕，以及照片模式标题/字幕共用经典样式；模板默认封面来源和第一套无全画面蒙层的处理继续沿用。参考图由实际共用封面composition重生成，两套预构建视频包已重建且指纹一致。

最终 lint、format:check、typecheck、Next build、171/171测试及diff空白检查通过。隔离loopback4396服务与全新浏览器上下文验证 `/`、`/video-edit`、`/photo-mode`，1440px桌面和375px窄屏无横向溢出；切换/刷新保留模板，预览DOM逐项核对两套标题、总价、资料、附加、联系文字的字号、字体、字重、颜色和描边完全一致，无pageerror。封面参考图已更新为同样的大字排版。产品页面未改主题、控件、网格或动效，媒体画布沿用独立像素规则。

实际新生成4份MP4：经典纯视频、杂志纯视频（原生合成），杂志混合照片（浏览器路径），杂志照片模式。均为H.264、1080×1920；前三份AAC、5.6秒，照片模式3秒无配音。两套纯视频解码WAV SHA256完全相同，原声与时长不变；前三份封面PNG与实际第0帧RGB RMSE分别2.493、2.502、3.220，符合有损编码差异。目视封面、片内原声字幕、照片标题与字幕，桌面/手机预览截图通过。全部使用既有合成测试口播与公开演示照片，未触发文案/识别/配音或付费模型，未覆盖用户草稿，未发布公网。此处短片仅验证排版，不替代Linux长片资源验收。早期验收夹具遇到固定FFmpeg不支持color滤镜、照片时长下限3秒和浏览器初始化等待，已改为既有合成片、3秒照片及等待实际草稿就绪后重跑；未修改业务规则绕过。

证据：同目录 `browser-report.json`、`media-report.json`、`media-metrics.json`、`photo-report.json`、`*-preview.png`、`template-*.png`、4份实际MP4和检查日志；隔离服务目录见harness-root.txt。任务范围复核No findings。Recreation Metrics O1/O2/O3/S1/S2/S3均N/A（视频模板文字调整，非网站复刻）。WEBSITE_RECREATION_VERDICT: Ship。HARNESS_DOCS_STATUS: Updated。HARNESS_REVIEW_VERDICT: Ship。

## 本地房源截图识别与文本段解析（2026-11-03）

服务端新增按账号临时目录处理的 RapidOCR 3.9.2 本地识别；管理员运行 `pnpm setup:ocr` 安装并离线自检后，页面才开放单张截图入口。识别文字先进入可编辑原文和候选字段，用户核对并明确点击“确认并填入房源信息”后才改项目字段。文本解析补充 `1、🏡百顺苑小区`、`70+万`、完整户型优先、顶楼与露台/柴草间/朝向/税费等信息；OCR 将面积单位误读为 `m` 时，仅在有面积标签的上下文还原为 `㎡`。未触发百炼或其他付费接口。

本机以 Python 3.12 完成 `pnpm setup:ocr` 中文离线自检。使用根据用户文字生成的模拟贝壳风格截图和一张长截图，实际 OCR 输出面积、户型、装修、朝向、税费、`70+万`；解析得到百顺苑、顶楼/133.93㎡/4房2厅2卫/精装修、70+万及露台/柴草间/南北通透/满五唯一/不限购。独立生产构建与 loopback 浏览器 `/video-edit` 完成截图上传、待确认字段显示、点击确认及刷新后的草稿检查；确认前项目字段未更新。无效图片返回422、错误 Origin 返回403，临时 OCR 文件处理后清空。浏览器截图在 `artifacts/property-ocr-2026-11-03/browser-confirmed.png`。

`pnpm lint`、`pnpm format:check`、`pnpm typecheck`、`pnpm build`、`pnpm test` 全部通过，178/178 测试通过。独立服务实际导出3秒、1080×1920 MP4，ffprobe 显示 H.264/AAC、90帧，证明此次改动未阻断现有照片导出；样本和成片保存在 `artifacts/property-ocr-2026-11-03/synthetic-input.png` 与 `photo-export.mp4`。测试截图是模拟素材，尚无用户提供的真实贝壳详情页截图；实际页面布局、复杂背景与不同手机截图仍需样本核验。OCR 尚未在 Linux 整服务资源限制下验收，未发布公网。

## 真实房源截图识别修正（2026-11-03）

用户提供1080×2348真实详情页截图，旧OCR逐行文字虽读到66.8万和168.45，但售价/房型/建筑面积标签位于数值下一行，字段解析漏掉价格和建筑面积；户型图内主卧13.31㎡被误选为整套面积。新规则在同一横排按OCR坐标配对数值与标签，只保留房源卡片及概览事实，过滤户型图尺寸、导航、咨询与联系人。没有训练或更换模型；仍用本地RapidOCR，其他不符合此布局的截图走原有逐行结果供人工核对。原图未复制进仓库或验收产物。

实际识别后文字为“满五；学府花园复式楼，5房3厅2卫，精装修；售价66.8万；房型5室3厅；建筑面积168.45㎡；普通住宅、南朝向、无电梯、高楼层共7层、小区学府花园”等。字段解析得到小区学府花园、住宅/共7层/高楼层/168.45㎡/5房3厅2卫/精装修、总价66.8万、附加满五/南朝向/无电梯。原始OCR文本直接粘贴时也能识别数值与下行标签，并排除户型图尺寸。两条定向回归测试覆盖上述输入。

隔离生产构建浏览器实际上传该图、检查待确认字段、点击确认、保存并刷新；确认前项目字段未改，确认后仍保留正确值。识别成功后页面无截图预览，浏览器DOM中的blob图片数为0，账号临时OCR文件已清空。证据在 `artifacts/property-ocr-real-2026-11-03/` 的 `candidates.png`、`source-no-image.png` 和独立导出的 `photo-export.mp4`。lint、format:check、typecheck、Next build及180/180测试通过；MP4为3秒、1080×1920、H.264/AAC、90帧。本次仅验证一张真实页面布局，其他详情页样式和数字误识仍需更多截图；Linux整服务资源限制未验收，未发布公网。

## 杂志模板区分颜色、左对齐与人物参考（2026-11-03补充）

用户澄清字号可以接近，颜色/风格必须区分，并追加第一套左对齐、参考底图必须体现人物口播首帧。最终第一套标题148px、总价190px保持；橙金色#ffc34d正体衬线字/深色描边/下划线，资料与联系暖米白#fff0d2，全部封面文字左对齐，左边84px、上方154px开始排列；经典保留白色斜体/珊瑚红价格与原居中布局。杂志片内装饰标题和照片标题同步衬线色系，实际原声字幕的字体、白字黑描边和时间不改。默认coverSource仍为杂志Opening、经典House，没有把参考人物图写入用户项目。

第一套参考底图为内置image_gen生成的虚构人物示意，放在画面右下，为左上文字留空间。原图保存在本轮artifacts，仅将最终共用FreeVideoCover从冻结口播片第0帧生成的封面JPG用于public/demo/template-editorial.jpg；没有新增人物生成入口或读取私人媒体。第二套参考JPG与本轮基线SHA256完全一致。生成提示词/来源和制作过程见同目录imagegen-notes.md、prepare-presenter.mts、references.mts；原图、2秒静帧示意口播和完整参考PNG一并保留以便重建。

最终根目录lint、format:check、typecheck、Next build、178/178测试、build:video及diff空白检查通过，两套视频包均已重建。另有60/60本轮相关时间轴/字幕/视频/缓存测试通过。早期并行草稿迁移导致全量检查出现过中间态失败，最终在其稳定后重跑通过；曾并行执行Next构建和typecheck造成.next/types生成文件竞争，也已在构建后顺序重跑通过。

浏览器使用独立目录中的兼容项目快照并同步最终视频模块，验证375/1440宽的实时预览、切换、刷新、首页/实拍直达/照片模式；DOM确认两套字号相同、第一套颜色/字体不同且text-align=left，无pageerror。实际点击放大人物参考图，口播首帧来源说明可见，预览没有改变已选模板。独立隔离目录不覆盖本地用户草稿；同期草稿存储业务改动不属于本轮评审范围，未把旧页面快照当成该迁移的端到端验收。

真实新生成经典纯视频、杂志纯视频、杂志混合照片浏览器路径和杂志照片模式4份MP4，1080×1920/H.264，前三份AAC/5.6秒，照片3秒无配音。经典/杂志原生路径解码WAV的SHA256相同，原声、时长未变；对应独立封面与实际第0帧RGB RMSE=2.493/3.064/3.831。目视人物参考确认面部不被示例文字遮挡。证据artifacts/template-gold-2026-11-03下的scope.json、task.patch、browser-report.json、reference-report.json、media-report.json、media-metrics.json、photo-report.json、PNG/JPG/MP4与检查日志。短夹具不代替Linux长片资源验收。未发布公网，未发业务文案/字幕识别/配音或付费模型请求。

本轮范围复核No findings。Recreation Metrics O1/O2/O3/S1/S2/S3均N/A（视频模板调整）。WEBSITE_RECREATION_VERDICT: Ship。HARNESS_DOCS_STATUS: Updated。HARNESS_REVIEW_VERDICT: Ship。

## 2026-11-03 服务器当前草稿与原片保留

用户确认改为仅提交JSON、查询回填，视频保留到新建。实现、178项测试、真实浏览器/重启及两条MP4证据见[当前草稿验收](current-draft/verification.md)。本轮未单独发布；MySQL接入、库内迁移与正式切换分别记录，不把本地文件模式测试冒充公网通过。

## 工作台导航与标题层级（2026-11-03）

页头两种制作模式和实拍四步导航增加 Ant Design 图标，选中项用较重字重、青绿色选中线和浅色底标出。模板标题升至20/30px并置于卡片上方，删去“新增”角标和重复长说明；实拍卡片保留精简的默认封面来源。照片模式把人物开场、房源信息与设置归入编号主区块，子标题降为16/24px，避免与主标题同级。

隔离生产服务在 `/video-edit`、`/photo-mode` 的1440px和375px真实浏览器中均无横向溢出或页面脚本错误；实际点击模板选择和实拍步骤跳转通过。`pnpm lint`、`pnpm format:check`、`pnpm typecheck`、`pnpm build` 与180/180测试通过。隔离服务另完成一份真实MP4导出；直接核验为44.233秒、1080×1920、H.264/AAC，首尾帧可解码。`pnpm verify` 的最终文件探测仍按旧 `data/exports` 路径读取，与临时媒体模式实际的 `data/temporary/session-*/legacy/exports` 不一致，因此脚本以路径错误退出；成片本身及直接探测通过。本次只改产品页面样式，未改视频画布或发布公网。截图、浏览器报告、成片与解码帧在 `artifacts/ui-hierarchy-2026-11-03/`。

## 本地端口占用自动重启（2026-11-03）

本地启动在 Next 初始化前检查端口；只在监听者为同用户、同仓库目录、命令为本项目 `server/index.ts` 时发送 SIGTERM，等待端口释放后启动。监听阶段遇到 EADDRINUSE 还会做一次相同校验与重试。`PUBLIC_ORIGIN` 模式不自动停止旧实例；无法确认身份或超时均退出并报错。重新启动会中断旧进程的后台任务。

实际用默认4318端口验证：先替换同仓库暂停的旧生产命令进程，再替换正在运行的旧开发命令进程；均出现停止旧 PID 和新的“已启动”日志。首次开发对开发复测发现 Next 在监听前报告已有实例，因此增加前置检查后复测通过。另在同仓库目录启动其他 Node 监听者，自动清理明确拒绝，原进程保持运行。Chrome 直达首页和`/video-edit`显示工作室，HTTP两页200、未知API为JSON 404。已有3秒、1080×1920、H.264的照片MP4用固定ffprobe重新探测；本轮未新生成MP4或执行媒体任务。

最终浏览器复测曾发现开发模式 CSS 编译失败：Tailwind 将规范文档里的带星号占位符示例扫描成无效 `var()`。将该文档示例改为文字说明并重启后，`/video-edit`恢复200，Chrome中原账号草稿正常回填；未修改草稿。`pnpm lint`、`pnpm format:check`、`pnpm typecheck`、`pnpm build`和`pnpm test`最终通过，180/180测试通过。初次测试受沙箱loopback监听EPERM影响，允许本机监听后重跑通过。未发布公网。

## Tailwind 规则与页面样式整理（2026-11-03）

按当前单仓库 Next.js／Tailwind v4／Ant Design 结构重写 `rules/tailwind-usage.md`。项目源码没有 SCSS 或 Sass；三个旧页面 CSS Module（登录、模板选择、视频上传预览）已移入对应 TSX 的 Tailwind utility 并删除。全局 `src/theme.css` 从约 762 行收敛到 287 行，保留主题 token、Ant Design 子节点覆盖、动态头部与底部安全区等跨组件规则；`common/controls.css` 的 100 行保留库控件内部布局与触控规则。common 控件不再附加无对应样式的占位 class；页面重复区块标题归入 `studio-section-heading.tsx`。新增 `common/cn.ts`，集中导出 `cn`、`cva`、`VariantProps`；`text-body` 明确为字号、`text-content` 为正文颜色，避免合并冲突。

桌面和 375px 手机宽度的 `/video-edit`、`/photo-mode`、隔离认证服务 `/login` 已在 Chrome 实际检查；登录页手机端无横向溢出，浏览器没有 console error。隔离服务仅使用临时认证配置，没有使用或改写用户登录凭据。复检已存在的 3 秒照片 MP4，实际解码 90 帧与 AAC，输出为 H.264、1080×1920；本轮没有新生成 MP4，媒体画布代码未改。直接用 Remotion CLI 试渲染时因环境无法解析 `remotion.media` 而未启动渲染，不把旧成片写成新导出证据。

最终 `pnpm lint`、`pnpm format:check`、`pnpm build`、`pnpm typecheck`、`pnpm test` 和 `git diff --check` 均通过；181/181 测试通过。未发布公网。

## 目录、统一请求与接口响应重构（2026-11-03）

本轮把 TS/Python 测试集中到根目录 `tests/`，Studio 文件按 auth/draft/photo/video/media/jobs/shell 分组，跨模式控件迁到 `src/share/ui`，服务端文件按能力分组。新增 `src/share/request.ts`、`src/services/definition/api-wire.ts` 与 `server/http/response.ts`；浏览器业务 API 共用同源请求、snake_case 线上字段、camelCase 业务字段和 Zod data 校验，Express 的 `/api` 响应共用 `request_id/code/message/data`。TanStack Query 管理会话查询，草稿串行保存和媒体后台任务仍用现有专用流程。CLI 验收脚本及 Docker 白名单路径已同步，当前规则与 README 已更新；参考项目的画板、模型训练和私有请求/权限系统未复制。

`pnpm lint`、`pnpm format:check`、`pnpm typecheck`、`pnpm build`、`pnpm build:video` 和 `pnpm test` 均通过，TS 测试185/185；两份 Python ASR 测试分别用系统 Python 与 Nano 虚拟环境通过（1项、5项）。隔离生产服务在 5321 端口以 Chrome 打开 `/`、`/video-edit`、`/photo-mode`，两种编辑模式的输入与导航正常出现；真实 `/api/get-capabilities`、`/api/auth/session` 返回 snake_case envelope，未知 API 返回 envelope 404，非法文案请求返回 envelope 400 且未触发云调用。两套 Remotion 视频包重新构建成功。

为核对实际导出，在 `/private/tmp/house-restructure-accept-_wi0t4kq` 建独立数据目录、运行5322端口的本地生产服务并执行 `pnpm verify`。脚本通过真实 API 上传演示素材、检查无效请求/来源限制/任务并发、生成本地配音、创建并轮询任务，最终导出44.233秒、1080×1920、H.264/AAC照片 MP4，检测到5个场景与5条配音，并成功解码每个场景的画面帧；Chrome可打开该成片的原生播放器。旧的3秒照片成片也重新 ffprobe 为1080×1920、H.264/AAC、90帧，实际解码首帧。未验证新 Linux 镜像或公网部署，也未覆盖用户现有草稿；本轮未重新导出实拍两套模板。

## 微信竖屏播放文字避让（2026-11-06）

依据用户提供的 1206×2622 微信播放截图，调整两套实拍封面与片内、照片模式共用水印和画面文案的位置。竖屏水印从顶部 5% 移至高度约 16%，封面标题下移到 430px；长小区名自动缩字，避免压到房源要点。两套封面的联系文案与免责声明分别离底 310px、260px。实拍片内顶部身份行、镜头文案和底部要点同步移入中间可见区；原声字幕保留距底 420px，以免挤到片尾联系文案。照片模式竖屏的顶部资料、场景标题、字幕和底部信息错开；横屏字幕单独避开底部信息栏。封面参考 JPG 与两套预构建视频包已重建。未修改原声、素材顺序、字段值或视频时长。

Remotion Chromium 实际渲染经典、杂志两套封面及片内多帧，另检查照片模式竖屏、横屏与较长小区名；本机两套实际 MP4 重新导出并解码首帧和片内帧，均为 1080×1920、H.264/AAC、5.611 秒。`pnpm lint`、`pnpm format:check`、`pnpm typecheck`、`pnpm build`、`pnpm build:video`、`pnpm test` 与 `git diff --check` 通过，185/185 测试通过。Linux 候选镜像 `house-video-studio:20261106-wechat-safe` 已启动验收，首页、实拍页和照片页均 200；经典原生、杂志原生和杂志浏览器三条实际 MP4 为 1080×1920 H.264/AAC，时长分别 5.600、5.600、5.611 秒，OOM 与重启均为 0，测试容器已停止。浏览器自动化入口两次超时，未完成交互式页面检查；微信真机不同机型尚未复测。用户明确允许清空旧临时结果并切换后，正式版已改为 `house-video-studio:20261106-wechat-safe`；原 `compose.yaml` 和 `docker.env` 备份于服务器 `backups/wechat-safe-20261106`。切换后容器运行中、OOM=false、重启 0，稳定原片约 534 MiB；公网登录页 200、匿名编辑页 303、匿名业务 API 401，双视频包校验通过。原始截图、基线源码、section/asset 映射、抽帧、两套本机及三套 Linux MP4 与探测报告见 `artifacts/wechat-safe-area-20261106/`。

## 口播与房屋视频拼接复查（2026-11-06）

用户报告下载 MP4 仅有房屋讲解。使用本机已有的两份不同原片构造隔离的 0.5 秒封面、3 秒口播、3 秒房屋片段，不改当前草稿。常规 Remotion 路径成片 6.507 秒、原生合成路径成片 6.500 秒；两份 MP4 的 1.5 秒解码帧均是人物口播，4.5 秒解码帧均是房屋画面。本机测试没有复现缺段，用户报告的具体 MP4／任务快照尚未取得，故不能断言其根因。修正了房屋原声静音时仍压缩有声口播尾段的时间线条件；导出增加成片时长检查，原生结果缺段时退回常规渲染，最终仍不符则任务失败，不发布缺段成片。`pnpm lint`、`pnpm format:check`、`pnpm typecheck`、`pnpm build`、`pnpm build:video`、`pnpm test` 通过，186/186 测试通过。未发布公网。

## 实拍成片生成前确认（2026-11-07）

核对现有页面与服务端：口播开场、至少一份房屋视频或照片及房屋片段均为生成前置条件，缺项时服务端也拒绝任务。本轮在可生成时新增确认弹窗，显示口播文件名、房屋视频和照片数量，用户确认后才提交后台任务；缺项时底部显示具体缺少的输入。`pnpm lint`、`pnpm format:check`、`pnpm typecheck`、`pnpm build`、`pnpm test` 通过，186/186 测试通过。本机 Chrome 对 `/video-edit` 的直接打开返回 200；计算机交互工具超时，未完成弹窗点击的浏览器验收。未修改 MP4 时间线，未发布公网。

## 杂志留白人物封面回退（2026-11-07）

按用户要求，仅将杂志留白人物封面的标题、价格条、联系文字、免责声明与封面水印恢复至 2026-11-06 微信避让调整前的位置；经典实拍封面及两套模板片内画面、水印位置保持当前版本。回退前的两套参考图、旧版人物封面、源码及版块/素材映射在 `artifacts/editorial-cover-rollback-20261107/`。本轮未修改房源文字、时长、原声或草稿。Remotion Chromium 已重渲染两套 1080×1920 封面，经典封面 PNG 与回退前基线逐字节一致；人物封面与 11 月 6 日调整前参考图布局一致，更新了页面参考 JPG。人物模板实际 MP4 为 1080×1920 H.264/AAC、5.611 秒，首帧与片内帧已解码核对。`pnpm lint`、`pnpm format:check`、`pnpm typecheck`、`pnpm build`、`pnpm build:video`、`pnpm test` 及 `git diff --check` 通过，186/186 测试通过。未进行微信真机复测，本轮未部署公网。

## 杂志留白人物封面回退候选上线验收（2026-11-07）

冻结当前线上源码并叠加本轮四份人物封面文件，另外三处本地未上线改动未纳入。Next 与双视频包在冻结目录重新构建；164 份运行文件中其余 160 份逐哈希匹配当前线上。候选 `house-video-studio:20261107-editorial-rollback`（ID `sha256:55e6e262b2eea6754386041f6f11b3c75673c3c1813d6d796bfcaa7cf053940b`）已在隔离 Linux 容器启动，登录页 200、匿名编辑页 303，双视频包校验通过；Linux Remotion 实际输出 1080×1920 人物模板封面。经典封面本地重渲染与旧基线逐字节一致，本地人物模板 MP4 为 1080×1920 H.264/AAC、5.611 秒。隔离容器无 OOM/重启；微信真机尚未复测。正式服务有近期临时成片，切换清空前已再次请求用户确认。

## 经典实拍封面总价字色调亮候选（2026-11-07）

依据用户在手机相册截图中圈出的总价文字，仅将经典实拍封面总价填充色从 `#c05a55` 调为 `#ef8b7c`；位置与描边不变，杂志留白人物封面保持前一轮回退样式。用户截图、改前/改后参考图、来源 HTML、版块/素材映射及实际 MP4 抽帧位于 `artifacts/classic-price-bright-20261107/`。本地 lint、格式、类型、Next 与双视频包构建通过；清理本轮生成缓存后 186/186 测试通过。经典实际 MP4 为 1080×1920 H.264/AAC、5.611 秒。最终 Linux 候选 `house-video-studio:20261107-cover-tune`（ID `sha256:ae3ba51b13fe97672e8e6fdb7506cc33513b1e99efdf4714105bf162ae0087c2`）使用冻结线上源码构建，其他 159 份运行文件匹配线上；隔离登录页 200、匿名编辑页 303，双视频包校验通过，两套 Linux 封面渲染通过且人物封面 PNG 与上版候选逐字节一致。无 OOM/重启，隔离容器已停止。微信真机未复测。用户明确允许切换并清空临时结果后，已备份原 `compose.yaml`、`docker.env` 至 `backups/cover-tune-20261107` 并切换正式镜像。切换前无运行任务，稳定原片目录约 689 MiB；切换后约 699 MiB，旧临时结果清空，新业务随即产生独立临时任务。正式容器 healthy、OOM=false、重启 0，双视频包校验通过；公网登录页 200、匿名编辑页 303、匿名业务 API 401。

## 封面来源排版与手机实时预览（2026-11-08）

用户反馈切换口播封面后出现房屋封面排版，以及手机实时预览可能未播完。核对发现封面底图由 `coverSource` 选择，而封面文字与水印位置仍由 `videoTemplate` 单独选择；已有草稿可形成两者不一致。现让口播首帧使用人物排版、首份房屋素材使用房屋排版，独立图片维持当前模板排版。模板卡示例图只放大预览，不触发选中；用户纠正后撤销了曾尝试的图片点击选中行为。Remotion 的 HTML 视频回退路径原先 `pauseWhenBuffering` 默认 false，现对口播、房屋片段和冻结封面显式设为 true，避免网络缓冲时预览时间轴继续前进；不改变实际 MP4 的帧时长或原声。

本地 `pnpm lint`、`pnpm format:check`、`pnpm typecheck`、`pnpm build`、`pnpm build:video`、`pnpm test` 均通过，186/186 测试通过。真实导出两套 1080×1920、H.264/AAC、5.611 秒 MP4，核对首帧和片内帧。用线上 `20261107-cover-tune` 镜像提取完整源码构建独立候选，逐文件差异仅上述两份源码；候选两套视频包指纹通过。Linux 隔离候选 `/video-edit` 返回 200，浏览器点击人物示例图仅打开大图，关闭后经典模板仍选中；上传 2.4 秒测试原片为开场及房屋素材，实时预览总长 6.0 秒，默认宽度和 375px 宽度均播放至结束后回到播放按钮，375px 页面无横向溢出。隔离服务已停止。正式镜像 `20261108-cover-mobile` 健康、OOM=false、重启 0，双包校验与公网匿名访问状态通过。未取得反馈所用实体手机与具体原片，不能据短片浏览器验收断言所有 iOS/微信长片已解决；如仍复现需收集设备、系统、预览类型、卡住时间及对应原片信息。

证据在 `artifacts/cover-mobile-fix-20261108/`，包含线上源码快照、洁净发布包、两套本地 MP4、探测报告与首帧/片内帧。Recreation Metrics：O1/O2/S1/S3 不适用（局部媒体功能修复）；O3/S2 通过（候选浏览器 375px 与实际 MP4）。WEBSITE_RECREATION_VERDICT: Ship with caution（实体手机长片未覆盖）。

## 实拍封面版本字段与模板选择（2026-11-12）

实拍草稿新增 `coverStyle`（`new` / `original`），缺失字段默认 `new`，显式选择原版可保存并恢复。该字段由前后端共用的 `videoEditDraftSchema` / `videoEditSchema` 校验，现有草稿保存和生成路由直接使用这两个契约；线上 snake_case 适配层将其转换为 `cover_style`，无需新增 API、数据库列或迁移。模板区将当前字段传入选择组件；旧草稿默认值和非法值的测试已覆盖。

本地 `pnpm lint`、`pnpm format:check`、`pnpm typecheck`、`pnpm build`、`pnpm build:video`、`pnpm test` 通过，187 项测试通过；浏览器 `/video-edit` 已核对新版、原版选择切换并恢复新版。使用隔离临时图片与无声视频生成两套 1080×1920、H.264、4.833 秒 MP4，解码首帧核对封面排版。临时素材没有真实讲解音轨，未覆盖原声保持与原生合成路径；未发布公网。

## 实拍模板区收纳与原版标题字号（2026-11-12）

模板区收回为两张卡片；“切换封面样式”弹窗显示新版、原版两个带独立放大预览图的勾选项，选择后卡片参考图同步更新。原版经典实拍封面主标题在原有高度提高字号及描边粗细，参考 JPG 由同一封面组件重新渲染。桌面浏览器已验证弹窗选择、大图预览及恢复新版；390px 宽度弹窗无横向溢出。隔离临时素材导出原版经典 1080×1920 H.264、4.833 秒 MP4，核对封面画面；临时视频无讲解音轨，未据此声明真实原声验收或原生合成路径通过。未发布公网。

## 片内中文文字与人物封面字号（2026-11-12）

实拍片内固定英文装饰行改为“房屋实拍 · 第N段”，镜头标题字号由84px降至66px；照片模式固定英文“HOUSE TOUR”移除，用户自填字段不被改写。原版杂志人物封面主标题改为珊瑚色，文字左移、放大且区域不超过1080px画布的一半。新版杂志人物封面主标题改为浅金色，主标题、房源信息和联系文字放大，移除两者之间的分割线；右侧文字区域仍小于半屏。

Remotion Chromium 实际渲染两版封面和实拍片内帧，检查换行、颜色和区域边界；Chrome 本地工作室页面核对新版封面实时预览。隔离素材导出片内45帧与新版封面36帧短MP4，均为H.264，未覆盖完整原声或长片。`pnpm lint`、`pnpm format:check`、`pnpm typecheck`、`pnpm build`、`pnpm build:video`、`pnpm test` 与 `git diff --check` 通过，187项测试通过。未发布公网，旧成片需重新生成才会采用新样式。

## 新版经典封面标题与详情卡（2026-11-12）

针对用户预览图调整新版经典房屋封面：水印移至叠层红色标题卡上方，标题在卡内上下居中；渐变流光详情卡只保留面积、户型优先的两项，文字在卡内上下居中；艺术描边总价和其余房源要点依次排在下方。流光位置由Remotion帧数决定。新版参考图 `public/demo/template-classic-new.jpg` 用同一封面组件和示意素材重新生成；旧版封面组件和原版参考图未改。用户已确认此前叠字源于上传的视频本身，本轮没有改写视频原片。

用示意房源字段渲染1080×1920封面 JPG，并导出同组件封面段 `/tmp/house-cover-new-classic-final.mp4`：H.264、1080×1920、1.2秒。浏览器打开新版经典参考图确认叠层、详情和价格排版；本地草稿为用户现有数据，浏览器只查看弹窗，没有切换或保存。`pnpm lint`、`pnpm format:check`、`pnpm typecheck`、`pnpm build`、`pnpm build:video`、`pnpm test` 通过，187/187测试通过。未用用户原片导出完整成片，未验收原声及原生合成路径；未发布公网。

同日按用户截图把原版人物封面的附加特点由84px缩至60px、价格下房源要点由72px缩至44px；标题、价格及半屏宽度未变。使用字段上限60字房源要点、23字附加特点与8字价格渲染封面，底部要点不再与联系文字重叠或被画布裁切；Chrome 本地真实草稿预览中的两处文字也已核对。另导出封面36帧H.264短MP4；`pnpm lint`、`pnpm format:check`、`pnpm typecheck`、`pnpm build`、`pnpm build:video`、`pnpm test` 与 `git diff --check` 通过，187项测试通过。未重新导出完整用户成片，未发布公网。

同日按经典实拍封面截图，把原版房源要点由82px缩至60px；主标题、总价和附加特点不变。使用当前草稿同类字段渲染实际封面静帧，房源要点与下方总价之间留有间距；模板卡的原版经典参考JPG由同一组件重渲染，Chrome 本地草稿实时预览已核对。导出封面36帧H.264短MP4；`pnpm lint`、`pnpm format:check`、`pnpm typecheck`、`pnpm build`、`pnpm build:video`、`pnpm test` 与 `git diff --check` 通过，187项测试通过。未重新导出完整用户成片，未发布公网。
