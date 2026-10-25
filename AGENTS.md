# House Video Studio

独立 Next.js App Router＋React＋TypeScript 房源照片视频工具，遵循 `plan.md` 的已授权范围。修改前阅读相关模块及相邻文件。仅使用公共依赖；HTTP 使用业务 API 中的 fetch 和 Zod 契约；异步使用 Promise 链。Next 薄路由入口放在 `src/app`，页面业务逻辑放在 `src/features/studio`，服务契约放在 `src/services/definition`。Tailwind 超过6类用 clsx 分组，禁止 clsx 三目。视频画布内联样式属于媒体布局例外，所有视频动画必须由帧数驱动。完成前执行 lint、format:check、typecheck、build、test 和实际浏览器/MP4 验证。不得修改相邻科研工作台仓库。只在用户明确要求时发布到公网。

## 房产文案参考

生成或修改房源字幕、探盘口播、封面与发布正文时，先读取 `.agents/skills/house-tour-copywriting/SKILL.md`，按需读取其上游参考。来源与用法见 `SKILLS.md`。用户明确风格优先；保持真实数字及镜头依据，不机械套用上游长稿、逼单或外国平台模板。安装文档不代表获得调用付费服务或发布内容的授权。

免费实拍剪辑默认保留开场与房屋视频原声讲解，背景音乐低音量铺底；涉及精剪时须保证讲解连续，不为转场重叠或删掉讲解。

照片模式的人物开场直接上传已录视频并保留原声；不新增或恢复页面人物生成入口。旧生成素材与脚本仅供兼容。画面文案通过百炼qwen3.7-flash生成建议，用户确认免费额度和用完即停后主动触发；只在采纳时替换文字，不自动生成配音。视频只发送房屋段关键帧，不发送人物开场与音轨。

免费实拍剪辑的配置封面默认必须作为视频最前面的画面，默认展示1.2秒，可配置0.5～10秒，再完整播放真人开场和房屋视频；预览、实际MP4和播放器poster使用同一封面。不能只生成独立PNG就称视频封面已生效，也不能为封面截掉原声。

当前实拍主封面采用无蒙层真实背景，粗斜体描边艺术字直接覆盖画面；小区名白色黑描边、总价红色白描边，片头与独立封面一致。片尾保留原有克制版式，文案字段仍共用。

## 项目规范（Next.js 迁移后生效）

规范参考只读的 FigGenius 项目，结合本项目的公开依赖、本机媒体服务和现有契约裁剪。当前有效规则为本文件与 `rules/`；README 负责使用说明，不替代规则。

- 新增、移动文件先读 [目录规范](rules/project-structure-guidelines.md)。禁止恢复 `src/pages` 或添加无实际复用的共享层。
- 组件、状态、样式改动先读 [组件规范](rules/component-rules-spec.md)、[设计系统](rules/design-system.md) 和 [Tailwind 规范](rules/tailwind-usage.md)。
- API、契约、安全或云调用改动先读 [数据源规范](rules/api-data-source.md)。本项目保持 fetch＋Zod，不引入参考项目私有请求库。
- 视频、构建、运行与交付先读 [媒体与验证规范](rules/video-and-verification.md)。Express API 和 Next 页面共用本机服务，生产不能直接使用 next start。
- 不覆盖用户已有改动，不提交密钥，不修改参考仓库。新增代码严格遵守规则，旧实现只在本次触达范围治理，不批量重命名。
