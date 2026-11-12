# 项目目录结构规范

参考只读 `image-forge-AI/rules` 的入口、业务、共享、服务分层；本项目是单仓库 Next.js App Router＋Express 媒体服务，不建立画板、模型训练或平台管理目录。

## 当前结构

| 目录                                                                        | 职责                                                                                         |
| --------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| `src/app/`                                                                  | Next 页面薄入口、布局、元信息；不放业务请求或媒体处理                                        |
| `src/features/studio/auth/`                                                 | 登录、会话、账号操作                                                                         |
| `src/features/studio/draft/`                                                | 当前草稿、旧浏览器草稿迁移、保存队列                                                         |
| `src/features/studio/photo/`                                                | 照片模式页面、文案、照片编辑                                                                 |
| `src/features/studio/video/`                                                | 实拍模式页面、视频编辑、字幕与清理                                                           |
| `src/features/studio/media/`                                                | 两种编辑模式复用的上传、素材排序和音乐选择                                                   |
| `src/features/studio/jobs/`                                                 | 后台任务的浏览器状态恢复                                                                     |
| `src/features/studio/shell/`                                                | 两种编辑模式的页头、导航、主题与会话挂载                                                     |
| `src/features/studio/request.ts`                                            | 向业务请求注入页面工作区身份                                                                 |
| `src/share/ui/`                                                             | 登录和两种模式共用的 Ant Design 控件适配、CSS                                                |
| `src/share/cn.ts`、`src/share/request.ts`                                   | 通用类名合并与唯一 HTTP 请求入口                                                             |
| `src/services/definition/`                                                  | 前后端共享 Zod 契约与协议字段转换，不能引入 Node 或密钥                                      |
| `src/video/`                                                                | Remotion 画布、时间轴和帧映射，与编辑器状态分离                                              |
| `server/index.ts`                                                           | Express 启动、Host/Origin/会话边界、路由装配                                                 |
| `server/auth/`、`draft/`、`db/`、`storage/`                                 | 认证、草稿、MySQL 与账号文件作用域                                                           |
| `server/http/`                                                              | 统一响应与请求体命名边界                                                                     |
| `server/video/`、`media/`、`speech/`、`music/`、`clean/`、`copy/`、`cloud/` | 各自服务端能力                                                                               |
| `tests/`                                                                    | 所有 TS/Python 测试；按 `server/`、`studio/`、`video/`、`share/`、`scripts/`、`python/` 分类 |
| `scripts/`、`public/`、`data/`                                              | CLI 与安装脚本、公开演示素材、Git 忽略的账号数据                                             |

## 新文件归属

1. 先判断是否为单一业务模式；能归入 `photo/` 或 `video/` 的不放在根目录。
2. 两种模式真实复用的浏览器交互放 `media/`、`jobs/` 或 `shell/`；基础控件放 `src/share/ui/`。不能因想象中的复用把业务状态提升到 share。
3. 请求传输、命名转换、错误封装只在 `src/share/request.ts`；业务路径、Zod schema 和参数仍归相应 feature 的 `api.ts`。
4. 服务端依认证、草稿、媒体、语音等真实能力归目录。`server/index.ts` 只装配中间件和路由，复杂业务从入口抽出。
5. 测试放 `tests/<领域>/`，名称与被测功能对应；不得为测试向业务目录加文件。Python 测试从仓库根目录定位真实脚本。

## 依赖与迁移

`@/*` 指向 `src/*`；Node、Remotion 与 CLI 可使用相对路径确保直接运行。`src/app` 不导入 `server/`；客户端组件不能导入 Node、文件系统、数据库或私有环境变量。模块内优先相对导入，跨业务层使用明确路径。禁止恢复 `src/pages`，也不为目录对称性新建空层。`src/theme.css` 是产品 Tailwind 入口；视频画布的动态帧样式留在 `src/video`。

移动文件时同步检查源码导入、测试、`package.json`、TypeScript/ESLint、Docker COPY/白名单、运行时源码摘要路径、README 与部署说明。历史验收记录保留当时路径，当前操作说明必须指向现行路径。改动后运行全部质量门禁和真实浏览器/API/MP4 验证。
