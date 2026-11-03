# 项目结构与 Next.js 边界

参考 FigGenius 的薄路由入口与业务垂直聚合，按房源视频工具的实际能力裁剪；不照搬科研画布、账户和平台层。

- `src/app/`：Next App Router 的 `layout.tsx`、`page.tsx`、元信息及路由入口。入口只装配业务页面，不承担上传、状态、剪辑或接口编排。
- `src/features/studio/`：照片与免费实拍编辑器、组件、Hook、页面私有请求和工具。新增文件先归属此业务域，复杂后再按 `components/`、`hooks/` 等职责拆分；不为迁移机械拆文件。
- `src/services/definition/`：前后端共享的 Zod 契约与类型，不能导入 Node、文件系统或密钥模块。沿用现有专属契约层，不复制第二套类型。
- `src/video/`：Remotion 合成、时间轴与帧数计算；不能依赖 Next 路由或编辑器状态。
- `server/`：本机 Express、上传、媒体处理、云调用与持久任务。Next 负责页面，Express 在同一进程和来源处理 API、media、exports。
- `scripts/`：本地 CLI 与验收；`public/`：公开演示素材；`data/`：被 Git 忽略的用户草稿、素材、任务、预算与缓存。

跨目录新增代码使用 `@/* -> src/*`；模块内部可以相对引用。现有 Node/Remotion 相对引用保持可独立运行。禁止新建 `src/pages`，避免 Next Pages Router 把业务组件、API 工具和测试扫描为页面。不要新增没有真实复用的 shared、platform 或全局 store。

组件用到 Hook、Player 或浏览器事件时，从业务页面入口声明 `'use client'`；不能从客户端导入 `server/`。服务端渲染阶段不能读取 window、document、文件上传对象或浏览器存储。

本轮保留原有就近测试位置，新增测试遵循所属模块惯例；不为模仿参考项目批量移动测试。参考仓库只读，不能写入。

`src/features/studio/common/` 是登录、实拍和照片编辑实际复用的UI组件边界，包含公共控件适配、统一样式与入口；不提升为无业务归属的根级components目录，不复制参考项目科研业务组件。业务上传校验仍在FileUpload，媒体Player与排序保留原位置。
