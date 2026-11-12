# API、数据源与服务端规范

参考只读 `image-forge-AI/rules/server-api-data-source.md` 的统一响应、字段边界和数据源纪律，并按本项目 Express＋Next 同源服务、MySQL 当前草稿、磁盘媒体与会话机制实施。

## 分层与数据源

- `server/index.ts` 装配 Host/Origin、会话、请求体限制和业务路由；服务逻辑在 `server/<能力>/`，不能在 Next `src/app` 重复实现 API。
- `src/services/definition/` 保持前后端共享 Zod 契约；服务端校验输入与账号资源归属，前端校验成功 data。调用方不能靠 TypeScript 断言替代运行时解析。
- 公网启用 `STUDIO_DB_CONFIG` 后，账号与每账号/模式唯一当前草稿只读写本项目独立 MySQL；不能回退旧账号/草稿 JSON。无 DB 的本地离线开发可用原文件模式。会话摘要、原片、任务与成片按既有 workspace 磁盘规则，迁移与回滚见 `deploy/mysql.md`。
- `server/auth/` 提供会话身份，`server/storage/` 给出账号作用域、配额与临时资源保护，`server/draft/` 维护 revision 与媒体引用。业务代码不能从客户端 header 选择账号。
- 外部云调用只由服务端固定目的地发起，密钥不得进入 `NEXT_PUBLIC_`、浏览器响应或日志。付费/免费额度确认与现有预算锁保持。

## 统一 HTTP 协议

所有 `/api` JSON 响应使用 `server/http/response.ts` 的 `createSuccessResponse` / `createErrorResponse`，由 `installApiEnvelope` 在 Express 边界统一应用；业务路由继续返回经校验的业务对象，不自行拼 envelope。

```json
{
  "request_id": "req_123",
  "code": 0,
  "message": "success",
  "data": { "workspace_id": "example" }
}
```

- 成功 `code = 0`，HTTP 状态保留原语义，包括后台任务的 202；失败 `code = HTTP 状态码`、`data = null`，保留 400/401/403/409/429/507 等原状态与可见错误信息。`X-Request-Id` 与 `request_id` 一致，便于排查。
- HTTP JSON body、query 与响应 data 使用 `snake_case`；浏览器 TypeScript、Zod 契约及现有 Express 业务对象保持 `camelCase`。`src/share/request.ts` 在出入边界转换，`server/http/response.ts` 在 Express 边界转换。文件名、用户自由输入的文本和 multipart 二进制不作转换。
- 前端业务调用 `requestData` 或 `requestApi`，业务对象读取 `requestId`。所有接口在请求层做同源 `/api` 约束、超时/取消、JSON envelope 解析和 Zod data 校验；业务 API 文件只定义路径、输入、schema 和业务错误文案。不要在每个 API 文件重复 fetch、response.json、命名转换或状态处理。
- Query 参数由 `createApiSearchParams` 转换；JSON body 经请求层转换。`FormData` 保留浏览器边界且不强设 Content-Type。`src/features/studio/request.ts` 负责工作区身份注入，不能把它放入通用请求工具。
- 非 `/api` 的 media、exports、demo、静态资源与 MP4 流保留各自 HTTP 格式。未知 API 必须返回 envelope 404，不能落入 Next HTML 页。

## TanStack Query 与异步

`StudioProvider` 安装单个 `QueryClientProvider`。会话查询由 `useQuery` 管理，并在菜单打开及 `pageshow` 时核对服务端账号；退出清空该客户端缓存。后续正式的只读服务端状态优先使用同 feature 的 query key/hook，提交后按业务资源失效或重取。草稿保存队列、上传、任务轮询、取消与媒体单槽有明确顺序和生命周期，继续由现有业务 Hook/Promise 链维护，不能用默认 Query 自动重试造成重复提交、付费调用或丢失任务。全局默认关闭重试。异步代码遵循本项目 Promise 链规范。

## 认证、安全与兼容

- 先校验准确 Host/Origin，再经过 Express 会话保护 `/api`、私有媒体和页面。宝塔/Nginx 必须固定公网 Host，上游只监听 loopback；不能放开任意 Host/Origin。内部媒体路径只允许准确本机渲染来源。
- `X-Studio-Workspace` 只检查浏览器页面身份与当前会话是否一致；服务端以 Cookie 会话决定账号。退出须显式 confirmed=true 且验证身份，一致性失败不能撤销另一账号会话。
- 请求体、上传大小、真实媒体格式、路径、草稿 revision、任务预算与存储配额仍由服务端检查。API 改造不得把上传变为请求内转码，也不能让客户端准备状态跳过原片验证。
- 新旧客户端协议切换需页面和 Express 同版本发布；回滚两端保持配套。接口迁移后至少验证成功、参数错误、未授权、冲突、HTML 代理错误、断网和超时。

## 新接口检查清单

定义业务归属和同源路径 → Zod 输入/输出 → 会话及 workspace 权限 → 幂等/并发/预算 → HTTP 状态和统一 envelope → 前端 request adapter → 正常与失败测试 → 文档和镜像同步。MySQL SQL、迁移、回滚见 `deploy/mysql.md`；不要复制参考项目的 RBAC 表、画板/模型训练接口或私有请求库。
