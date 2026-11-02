# House Video Studio

实拍原声字幕使用本地免费引擎：默认SenseVoice INT8＋Silero VAD；新腾讯云可显式配置`STUDIO_ASR_ENGINE=nano`使用Fun-ASR-Nano F16/Q8＋FSMN VAD，识别后顺序运行SenseVoice INT8 CTC强制对齐，仅提供时间、不改Nano文字。Nano目录默认`.runtime/asr-nano`，限新机3CPU/2560MiB独立整服务验收，不能用于旧768MiB服务或沿用旧模型长片验收结论。管理员执行 `pnpm setup:asr` 校验与离线自检后启用；模型在 `.runtime/asr` 或 `STUDIO_ASR_DIR`。按用户最新要求，默认不识别、不添加原声字幕；用户逐份点击“生成原声字幕”，结果仅进入独立可编辑文案，确认“添加到视频”后才写入speechCaptions并开启原声字幕显示。不在上传或生成成片时自动识别，未识别不得阻止导出；不覆盖房源文案、镜头字幕或配音，不改变原声。再次编辑/重新识别只改变待确认文案，明确确认后才替换已添加的原声字幕；迟到结果不能写回已移除/替换的原片。任务/缓存/音轨须按workspace隔离，复用媒体单槽及取消保护。预览与两种MP4路径共用帧映射，静音封面不显示讲话字幕。旧SenseVoice部署在Linux启用前须在原1CPU/768MiB整服务限制下完成长短片、连续讲话、取消/隔离与两条实际MP4验收，记录内存回收压力、OOM与重启，不能据短样片保证长片上限；未验收不得上线。

独立 Next.js App Router＋React＋TypeScript 房源照片视频工具，遵循 `plan.md` 的已授权范围。修改前阅读相关模块及相邻文件。仅使用公共依赖；HTTP 使用业务 API 中的 fetch 和 Zod 契约；异步使用 Promise 链。Next 薄路由入口放在 `src/app`，页面业务逻辑放在 `src/features/studio`，服务契约放在 `src/services/definition`。Tailwind 超过6类用 clsx 分组，禁止 clsx 三目。视频画布内联样式属于媒体布局例外，所有视频动画必须由帧数驱动。完成前执行 lint、format:check、typecheck、build、test 和实际浏览器/MP4 验证。不得修改相邻科研工作台仓库。只在用户明确要求时发布到公网。

存储保护沿用 `server/storage-capacity.ts`：默认每账号5GiB、磁盘预留1GiB，可配置 `STUDIO_WORKSPACE_LIMIT_MIB` / `STUDIO_MIN_DISK_FREE_MIB`；排队与运行预算直到任务/清理结束才释放。外部维护脚本只能删除已显式标记完成且至少7天未改动的独立验收目录，不得按mtime扫描删除业务data、模型、认证配置或发布依赖。操作见 `deploy/storage-maintenance.md`。

## 房产文案参考

生成或修改房源字幕、探盘口播、封面与发布正文时，先读取 `.agents/skills/house-tour-copywriting/SKILL.md`，按需读取其上游参考。来源与用法见 `SKILLS.md`。用户明确风格优先；保持真实数字及镜头依据，不机械套用上游长稿、逼单或外国平台模板。安装文档不代表获得调用付费服务或发布内容的授权。

默认首页与`/video-edit`共用制作入口：已录口播＋多份房屋视频/照片＋房源信息与整段文案，空项目也必须显示三类输入；旧照片精细编辑在`/photo-mode`。免费实拍剪辑默认保留开场与房屋视频原声讲解，背景音乐低音量铺底；涉及精剪时须保证讲解连续，不为转场重叠或删掉讲解。

照片模式的人物开场直接上传已录视频并保留原声；不新增或恢复页面人物生成入口。旧生成素材与脚本仅供兼容。语义提取和画面文案沿用百炼qwen3.7-flash，确认免费额度和用完即停后主动触发；只在采纳时改字段/文字，不自动配音。提取只发移除手机号的原文并核对原文证据；画面文案只发房屋照片或每段2～6张关键帧，不发人物开场或音轨。模型建议须核对，未确认房源标签不能直接采纳。

照片单张/批量配音采用本地 Kokoro-82M v1.1-zh（zf_001），由用户主动生成，不调用付费配音。官方Python推理为媒体运行时例外；`pnpm setup:kokoro`离线自检后启用，模型与依赖放`.runtime/kokoro`或管理员配置的`STUDIO_KOKORO_DIR`，业务文字/音频仍按workspace隔离。推理使用媒体单槽，长文案完整分段合成；Linux上线前须按现有内存限制独立验收。

免费实拍剪辑的配置封面默认必须作为视频最前面的画面，默认展示1.2秒，可配置0.5～10秒，再完整播放真人开场和房屋视频；预览、实际MP4和播放器poster使用同一封面。不能只生成独立PNG就称视频封面已生效，也不能为封面截掉原声。

视频上传仅收原片与受限元数据校验，不在上传时转码、规范音量或抽帧，也不等待重型渲染槽。实拍和照片开场在生成成片时按账号准备原片，单份准备15分钟、上传15分钟、单视频1GiB；客户端状态不能跳过原片路径校验。

当前实拍主封面默认取首份房屋素材（视频第0帧/照片），可选口播第0帧或上传图，冻结且静音。采用无蒙层真实背景，粗斜体描边艺术字直接覆盖画面；小区名白色黑描边、总价红色白描边，片头与独立封面一致。片尾保留原有克制版式，文案字段仍共用。

## 项目规范（Next.js 迁移后生效）

Docker路径使用根目录Dockerfile/compose.yaml与deploy/docker说明；仅Linux x86_64，保持host网络下的准确loopback监听。完整源码上下文排除data、.env、凭据、会话、本机node_modules与.runtime；冻结正式版用Dockerfile.prebuilt和配套白名单，只收已核验公共运行时，ASR显式启用后在容器内重装Linux依赖并自检。两种路径均排除Mac的._附加文件，构建时校验两套模板指纹。认证只读挂载，sessions和临时业务data分开，单实例，不挂Docker socket、不放开任意Host/Origin。容器限额仅用于新服务器，不能据此修改旧服务或声称已通过真实长片资源验收。

规范参考只读的 FigGenius 项目，结合本项目的公开依赖、本机媒体服务和现有契约裁剪。当前有效规则为本文件与 `rules/`；README 负责使用说明，不替代规则。

页面基础控件按用户要求统一使用antd，图标使用@ant-design/icons，Next首屏样式使用官方AntdRegistry。保留现有暖色视觉与布局，以StudioProvider和--studio-*变量管理主题；库已有交互不得另写同类实现。原生音视频、Remotion预览和素材排序保留专用媒体实现。

- 新增、移动文件先读 [目录规范](rules/project-structure-guidelines.md)。禁止恢复 `src/pages` 或添加无实际复用的共享层。
- 组件、状态、样式改动先读 [组件规范](rules/component-rules-spec.md)、[设计系统](rules/design-system.md) 和 [Tailwind 规范](rules/tailwind-usage.md)。
- API、契约、安全或云调用改动先读 [数据源规范](rules/api-data-source.md)。本项目保持 fetch＋Zod，不引入参考项目私有请求库。
- 视频、构建、运行与交付先读 [媒体与验证规范](rules/video-and-verification.md)。Express API 和 Next 页面共用本机服务，生产不能直接使用 next start。
- 不覆盖用户已有改动，不提交密钥，不修改参考仓库。新增代码严格遵守规则，旧实现只在本次触达范围治理，不批量重命名。
- 宝塔部署仍保持loopback监听；PUBLIC_ORIGIN只能显式加入准确来源，不能删除或改写Origin绕过校验。公网必须配置STUDIO_AUTH_CONFIG并由Express会话保护页面/API/media/exports；Nginx须把Host固定为公网Host，不能转发客户端任意Host或127.0.0.1，否则会进入仅供渲染的media/demo读取例外。认证文件由管理员持有、应用用户不可写；7天登录摘要独立存于STUDIO_SESSION_STORE私有目录（0700/0600），与2小时临时业务文件分开，退出先可靠撤销再返回成功。部署/回滚见deploy/README.md，私有账号配置独立保存，业务媒体仅临时存放并按部署规则清理，不复用ImageForge数据库。

账号隔离使用服务端会话绑定的workspace作用域；请求/后台任务的数据目录与运行占用都须由该作用域获取，不能新增全局用户缓存或固定data路径。公网必须STUDIO_TEMPORARY_MEDIA=1：账号媒体/成片/缓存/任务只在data/temporary/session-*/<id>，最后实际使用2小时后清理、重启清空；运行/排队任务与流式请求须持有清理保护。草稿JSON仅按账号存当前浏览器，不得恢复服务端保存草稿。业务API的页面身份头只作会话一致性校验，不能用它选择账号。带工作室路径的渲染媒体仅允许准确loopback Host读取，公网会话不能越过此限制。重型导入/导出通过媒体单槽排队，取消不得释放别人的占用；临时模式不得重置付费账本后继续调用旧付费授权；当前不启用付费生成功能。

背景音乐必须保留内置离线兜底与上传入口；在线 ccMixter 搜索由用户主动发起，播放／暂停按钮 试听不选曲。只接受明确 CC BY，保存署名到 musicCredit；导入按 workspace 隔离且受预算/大小/超时约束。bgm-library 上游仅保留参考文档，不运行或发布其有多租户限制的脚本。
