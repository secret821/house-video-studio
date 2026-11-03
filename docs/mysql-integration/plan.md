# 开发方案：账号与当前草稿接入 MySQL

- 需求来源：2026-11-03 用户要求项目接入 MySQL，并明确选择“保存账号与当前草稿，媒体文件仍放磁盘”。
- 评审状态：**待用户确认；确认前不修改业务代码、不建表、不切换线上数据源。**
- 代码依据：本仓库 `server/auth.ts`、`server/auth-sessions.ts`、`server/current-draft.ts`、`server/workspace.ts`、`server/index.ts`、`server/video-edit.ts` 和 `compose.yaml`；参考仓库只读查看了 `src/server/shared/db/mysql.ts` 及 `reference/sql/ifa-backend-foundation-schema.sql`。
- 基线说明：当前工作区有大量未提交改动，其中 `server/current-draft.ts` 是新增文件，已经把当前草稿从浏览器改为服务端账号目录下的 JSON。实施时以这份现有工作区为基础保留改动，不回退到旧的纯浏览器草稿。

## 1. 准备怎么实现

服务启动时先连接独立的 MySQL 8 数据库，检查表结构并读取有效账号，成功后才监听端口。登录仍用现有 scrypt 摘要和七天可撤销会话；账号身份与密码摘要改由本项目的账号表提供，现有会话摘要文件暂时保留。照片与实拍编辑器继续调用现有 `get-draft` / `save-draft` 接口，服务端把每账号、每模式唯一的当前草稿写入 MySQL，并以现有 revision 防止旧标签覆盖新内容。原片、照片、配乐、成片和媒体缓存继续按 workspace 存在磁盘；MySQL 中只存账号、项目 JSON 与媒体路径引用，不存媒体字节。数据库不可用时启动失败或草稿操作明确报错，不静默退回旧文件以免出现两份权威数据。

本次不引入 ImageForge 的用户表、权限体系、Axios、数据库实例或业务数据，也不改变视频制作、付费调用和公网发布行为。会话仍在 `STUDIO_SESSION_STORE` 的私有文件中，任务和成片仍按现行生命周期管理。

## 2. 具体改哪些地方

| 位置                                               | 当前职责                                              | 拟改动                                                                                                                                                            |
| -------------------------------------------------- | ----------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `server/auth.ts`、`server/auth-sessions.ts`        | 从只读认证 JSON 构造账号列表，验证密码和持久会话      | 从 MySQL 的有效账号构造同形状列表；保持旧 Cookie、密码算法、限流、会话版本指纹与 workspace 绑定；新增/禁用账号仍由管理员操作并重启服务生效                        |
| `server/current-draft.ts`                          | 按账号目录原子读写两份草稿 JSON，维护旧媒体待清理列表 | 用账号 ID＋模式读写 MySQL 当前草稿，保留 Zod 校验、revision 比较、媒体路径归属校验；待清理路径仍可用账号磁盘文件记录，但每次删除前必须回查 MySQL 两模式的当前引用 |
| `server/index.ts`、`server/video-edit.ts`          | 安装鉴权及草稿接口                                    | 启动前数据库预检；草稿路由转为 Promise 链并把错误交给现有错误处理；不改接口路径与成功 JSON                                                                        |
| `server/` 新增数据库模块                           | 当前无数据库连接                                      | 从参考项目裁剪 `mysql2/promise` 连接池与参数化查询，单独实现账号、草稿 Repository；连接池限制适配单实例小内存服务                                                 |
| `scripts/`、`deploy/`                              | 私有 JSON 账号配置、文件草稿、Docker 挂载             | 提供管理员显式执行的导入/核对/回退导出脚本；新增私有 DB 配置挂载和启动说明，不把口令放到镜像或 Git                                                                |
| `src/features/studio/`、`src/services/definition/` | 现有草稿 API、Zod 契约和保存状态                      | 原则上不改接口契约和页面流程；仅在数据库错误提示需要区分时触及现有业务 API                                                                                        |

**预计新增系统零件：MySQL 8 数据库、两张本项目专属表、`mysql2` 公共依赖、数据库连接与两个 Repository、一次性管理员迁移和回退导出脚本、私有数据库配置。** 不新增 Redis、队列、任务表、媒体 BLOB、账号管理页面或第三方认证。

### 数据库表设计草案

新库建议使用独立库名 `house_video_studio` 和只授予该库必要权限的应用账号，不与 ImageForge 共库。下列 SQL 仅供方案评审；当前没有执行，也不包含账号数据。所有表为 InnoDB、`utf8mb4`。`studio_current_draft.account_id` 在应用层关联 `studio_account.id`，不创建外键。数据库与服务使用 UTC 保存/解析时间，草稿业务字段仍由现有 Zod 契约校验。

```sql
CREATE TABLE `studio_account` (
  `id` int unsigned NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  `workspace_id` varchar(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL DEFAULT '' COMMENT '现有稳定工作室标识，legacy或小写UUID',
  `username` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL DEFAULT '' COMMENT '登录账号，保留现有区分大小写语义',
  `salt` char(32) CHARACTER SET ascii COLLATE ascii_bin NOT NULL DEFAULT '' COMMENT '现有scrypt随机盐十六进制值',
  `password_hash` char(128) CHARACTER SET ascii COLLATE ascii_bin NOT NULL DEFAULT '' COMMENT '现有64字节scrypt摘要十六进制值',
  `is_enabled` tinyint(1) unsigned NOT NULL DEFAULT 1 COMMENT '1允许登录/0禁用登录',
  `isvoid` tinyint(1) NOT NULL DEFAULT 0 COMMENT '0正常/1作废',
  `create_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `update_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_workspace_id` (`workspace_id`),
  UNIQUE KEY `uniq_username` (`username`),
  KEY `idx_is_enabled` (`is_enabled`, `isvoid`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='房源工作室登录账号-20261103-codex';

CREATE TABLE `studio_current_draft` (
  `id` int unsigned NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  `account_id` int unsigned NOT NULL DEFAULT 0 COMMENT '所属studio_account主键ID',
  `draft_kind` varchar(16) CHARACTER SET ascii COLLATE ascii_bin NOT NULL DEFAULT '' COMMENT '制作模式：photo或video',
  `project_text` mediumtext NULL DEFAULT NULL COMMENT '经共享Zod契约校验的当前项目JSON，仅保存路径引用',
  `revision` char(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL DEFAULT '' COMMENT '当前版本UUID，旧页面保存时作乐观并发比较',
  `isvoid` tinyint(1) NOT NULL DEFAULT 0 COMMENT '0当前有效/1作废',
  `create_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `update_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_account_id_draft_kind` (`account_id`, `draft_kind`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='每账号每模式唯一当前草稿-20261103-codex';
```

`project_text` 使用 `MEDIUMTEXT`，因为现有草稿请求上限为 2 MiB，普通 `TEXT` 的 64 KiB 上限不足；不使用 MySQL JSON 类型。写入仍限制为现有 2 MiB 接口上限，不能借字段容量扩大请求。草稿唯一键同时服务 `WHERE account_id = ? AND draft_kind = ?` 查询；账号唯一键服务启动加载和登录账号匹配。预计仅几十个账号和每账号两行草稿；上线前以独立测试库的实际查询执行 `EXPLAIN` 核实索引。`idx_is_enabled` 用于启动时只加载有效账号；如 `EXPLAIN` 证明小表全扫成本更低，可保留该索引用于未来账号增长，不以小表全扫视作故障。无金额字段、分页或 `GROUP BY`。

MySQL 规范自检：✅ 两表均含 `id/isvoid/create_time/update_time`；✅ 表和字段注释完整；✅ 表、列、索引采用小写下划线命名；✅ 无浮点金额；✅ `account_id` 类型与账号主键一致且由复合唯一键索引；✅ 查询计划均列出字段，不使用 `SELECT *`；N/A `GROUP BY` 与分页；✅ 事务只覆盖短暂的数据库写入，不包含媒体处理；⏳ `EXPLAIN` 待隔离 MySQL 实例实测。

### 账号与会话

现有私有 `auth.json` 是唯一可信的迁移来源。管理员脚本只读取它，逐条校验用户名、稳定 workspace ID、盐和摘要；在事务中按 `workspace_id` 与 `username` 双重检查后插入，不重新哈希密码、不打印凭据。导入前检查数据库中是否已有冲突；重复运行只能确认完全一致，任何差异都停止。启动时检查数据库连接、预期表和有效账号，注册原 workspace ID 后才安装鉴权并监听。账号新增、停用、改密由管理员命令操作数据库，服务重启后沿用 `auth-sessions.ts` 的凭据指纹规则使旧会话失效；本次不增加 Web 管理页面。现有 `STUDIO_SESSION_STORE` 文件及有效 Cookie 可以在账号四项凭据完全一致时继续使用。

本地无登录的 `legacy` 模式也需要一个 `workspace_id='legacy'` 的数据库账号记录作为草稿归属：若旧单账号配置本来就是 `legacy`，沿用其真实凭据；只有全新本地开发库才由管理员创建禁用登录、随机不可知密码的占位账号。开发库不得复用生产库。公网必须至少有一个有效登录账号，允许迁移来的真实 `legacy` 账号登录；公网禁止关闭数据库或降级为旧文件账号。数据库故障时不返回未经检查的另一个账号数据；已有登录的草稿请求报服务不可用且页面保留未保存内容。

### 草稿读写与媒体回收

`GET` 通过当前会话绑定的 workspace ID 查账号 ID，再读该模式行；无记录仍返回 `{project:null,revision:null}`。`POST` 先用现有 Zod 契约和 `resolveAsset` 验证项目及每个 `/media/` 引用属于当前 workspace，再以数据库唯一键和 revision 进行原子条件更新。首次写入用唯一键处理双标签并发；已有记录只允许 `WHERE revision = ?` 更新，受影响行数为零返回现有 409 文案。新 revision 由服务端生成，数据库提交成功后才返回。查询和保存均不接受请求体或身份头指定 account ID。JSON 解析失败或 DB 读写失败不能把草稿当作空项目。

当前 `discarded.json` 只表示待回收媒体路径，不作为草稿权威源。先记录旧引用的删除意图，再提交新草稿；清理前从 MySQL 重新读取照片和实拍当前草稿，且确认账号没有运行任务/流式读取。DB 不可用就延期回收。这样在数据库写入失败、两个模式共用媒体或任务尚在运行时不会误删原片。配额仍由现有 `server/storage-capacity.ts` 统计磁盘文件。

### 迁移、发布与回滚

1. 管理员准备独立数据库、应用最小权限账号及私有配置文件，先在隔离库执行审核后的建表 SQL；不接触 ImageForge 数据库。Docker `host` 网络下配置准确 DB 地址，不修改应用的 loopback HTTP 监听或 Host/Origin 保护。
2. 停止这一个工作室的写入并确认无上传/生成任务；只读备份私有 `auth.json`、会话文件和 `data/current` 中待迁移的草稿元数据，保留原片。迁移脚本把账号与两模式 JSON 导入测试/候选库，校验 Zod、revision、记录数和内容摘要；已有 DB 草稿绝不覆盖。候选服务启动并通过账号、草稿、媒体与 MP4 验证后，才计划正式切换。**本次方案/后续代码完成均不代表已获公网部署或建生产库授权。**
3. 切换后旧 JSON 保留为迁移快照，应用不再写它。若需回退至旧文件版本，先停止写入、把 MySQL 最新当前草稿原子导出为旧格式并校验媒体路径仍存在，再切旧版；不能直接用切换前 JSON 覆盖新编辑。数据库表和旧文件先保留，确认回退完成后再决定清理。

配置建议 `STUDIO_DB_CONFIG` 指向管理员持有、应用只读的私有 JSON（host、port、database、user、password），与账号/媒体文件分离；镜像和示例只包含字段名，不含口令。连接池建议最多 4 条连接，设置连接/请求超时，启动和健康检查验证 DB 可用。参考项目的 `mysql2/promise` 用法可借鉴，但不复制其 ImageForge 表、项目 Repository 或默认示例密码。

## 3. 风险与重点 Review

| 风险或判断                           | 拟定处理                                                                                                               |
| ------------------------------------ | ---------------------------------------------------------------------------------------------------------------------- |
| 账号表成为认证权威，改变现有安全边界 | 维持 scrypt、稳定 workspace ID、会话指纹、Cookie、限流和 Host/Origin；启动未完成迁移就拒绝监听，不能自动转为无认证模式 |
| 草稿迁移与当前大量未提交改动重叠     | 只在确认方案后围绕现有 `current-draft.ts` 和调用方实施；不重置或覆盖用户工作区，先记录实施时的实际差异                 |
| MySQL 不可用造成不能登录或保存       | 启动失败、运行时草稿读写明确失败；UI 保留本地未保存编辑，禁止假成功和旧文件回退                                        |
| MySQL 草稿与磁盘原片生命周期不同     | 保持稳定的按账号原片目录；读取草稿后如引用丢失沿用现有素材错误，不编造可播放文件；回收前回查两模式引用                 |
| 旧版回滚会看不到新草稿               | 提供显式 DB→JSON 导出和验签步骤，停写后回退；不直接切旧版                                                              |
| 数据库位置、账号和口令尚未提供       | 不影响代码与隔离验证；正式配置由管理员在发布前提供，不能写入仓库或消息日志                                             |

**重点请确认**：账号和草稿成为 MySQL 的唯一权威源；会话摘要文件及媒体文件继续留在现有独立目录；正式迁移由管理员单独执行并验证，当前不发布公网。

## 4. 怎么验证和交付

- 数据库：隔离 MySQL 8 库中执行建表、重复迁移、冲突迁移、无账号/无表/断连启动；`EXPLAIN` 核对账号唯一键与草稿复合唯一键。验收只读查询两账号各两模式隔离。
- 认证：原凭据登录、错误密码/不存在账号、登录限流、七天会话重启保留、退出立即撤销、改密/停用后重启失效、旧标签 workspace 头冲突；SQL 错误不得泄露凭据。
- 草稿：空草稿、照片/实拍分别保存、刷新和跨浏览器恢复、同账号双标签 revision 冲突、两账号隔离、媒体路径越权、数据库故障保留编辑、删除旧媒体时另一模式和运行任务保护。
- 媒体与交付：真实浏览器检查首页及 `/video-edit`，两种 MP4 路径各导出一份，核对编码、画幅、原声和封面；执行 `pnpm lint`、`pnpm format:check`、`pnpm typecheck`、`pnpm build`、`pnpm test`。不发付费请求，不修改参考仓库，不在未授权时发布公网。
- 后续编码交付时附最终 SQL 文件、管理员迁移/回退命令和隔离库执行记录；生产 SQL 与正式切换需另行授权。
