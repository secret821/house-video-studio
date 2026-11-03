# MySQL 接入与迁移

2026-11-03 腾讯云新站已完成本项目独立 MySQL 8.0 库建表与 3 个账号导入，并随完整镜像 `house-video-studio:20261103-full` 切换正式服务。连接文件仅在宿主机私有目录；切换前认证配置与业务数据备份位于服务器 `/opt/house-video-studio-docker/backups/full-local-20261103`。以下仍保留其他环境的操作步骤和回滚要求。

本版只把登录账号与每账号、每模式的当前草稿放入本项目独立 MySQL 8 库。原片、照片、配乐、成片、缓存、任务以及七天会话摘要继续留在原有磁盘目录。服务启用 `STUDIO_DB_CONFIG` 后，MySQL 是账号和草稿唯一权威；数据库故障不退回旧 JSON。公网启动必须配置数据库。ImageForge 的库、用户表和数据不参与迁移。

## 数据模型

`studio_account` 以唯一 `workspace_id` 绑定磁盘工作区，以区分大小写的唯一 `username` 登录；仅存现有 scrypt 盐和摘要、启用状态与创建/更新时间。`studio_current_draft` 以 `account_id + draft_kind` 唯一约束每账号的照片、实拍两份当前草稿；`project_text` 为最多由现有 2 MiB 请求限制写入的 JSON 文本，素材只存路径引用，`revision` 用于并发保存校验。两表的具体列、默认值和索引以[建表 SQL](sql/studio-mysql-schema.sql)为准。

## 准备

1. DBA 创建独立库和应用账号；审核并在该库执行 [`deploy/sql/studio-mysql-schema.sql`](sql/studio-mysql-schema.sql)。应用账号只需该库 `SELECT/INSERT/UPDATE` 权限，建表由管理员完成，不授予全局权限。
2. 管理员把 [`deploy/mysql.example.json`](mysql.example.json) 的字段填写到私有 `mysql.json`，文件建议 root:应用组、0640，父目录仅允许管理员和应用进入。`STUDIO_DB_CONFIG` 指向容器内/服务内的绝对路径。Docker Compose 使用 `STUDIO_DB_CONFIG_FILE` 指向宿主机私有文件；不要把口令写进 Compose、Git、镜像或日志。Docker host 网络下，`127.0.0.1` 指宿主机本地 MySQL；远程数据库使用其准确私网地址并配置数据库侧访问控制。
3. 先在隔离库运行只读预检：`STUDIO_DB_CONFIG=/私有/mysql.json STUDIO_TEMPORARY_MEDIA=1 node --import tsx scripts/migrate-mysql.ts /私有/auth.json`。该命令只校验源文件、表和连接，不导入；临时模式变量须与正式导入一致，才能读取同一账号草稿路径。旧单账号配置缺少 `workspaceId` 时按现有规则视为 `legacy`。全新本地无登录开发库可用 `--local-legacy` 建立禁用登录的 `legacy` 归属记录；不得把开发库用于生产。

## 正式迁移步骤

本节是操作说明，不构成执行授权。切换前先确认账号配置、`data/current` 草稿和媒体备份，停止本工作室写入并确认没有上传或生成任务。保持原 `auth.json` 与草稿 JSON 只读备份。管理员对目标库执行：

```sh
STUDIO_DB_CONFIG=/私有/mysql.json STUDIO_TEMPORARY_MEDIA=1 \
  node --import tsx scripts/migrate-mysql.ts /私有/auth.json --apply
```

脚本按稳定 workspace ID 导入原有 scrypt 盐与摘要，不需要明文密码；照片和实拍草稿只插入不存在的当前记录。重复执行只核对相同内容，遇到冲突停止，不覆盖数据库数据，也不删除源文件。新代码启动前检查两张表及有效账号，连接失败则拒绝监听。原会话摘要文件继续挂载；账号凭据四项不变时，已有有效 Cookie 可继续使用。账号更新后需重启服务，由原会话指纹逻辑撤销旧票据。

迁移后核对两个账号登录、两模式草稿、原片读取、跨账号隔离、刷新与跨浏览器恢复，再做两条实际 MP4。确认之后再决定切换公网。`STUDIO_AUTH_CONFIG` 在 MySQL 模式不再是运行时账号来源；原 auth.json 只作受保护的迁移备份。

后续管理员新增账号、启停账号或改密可准备仅包含 `username`（改密和新增另含 `password`）的私有 JSON，再执行 `STUDIO_DB_CONFIG=/私有/mysql.json node --import tsx scripts/manage-mysql-account.ts <add|disable|enable|password> /私有/输入.json`。执行后必须重启本工作室，才会加载新账号并依据凭据指纹撤销旧会话；脚本不打印账号和密码。原 `scripts/add-account.ts` 只适用于旧 JSON 认证方式，不用于新 MySQL 运行时。

## 回滚

先停止写入，运行 `STUDIO_DB_CONFIG=/私有/mysql.json node --import tsx scripts/export-mysql-drafts.ts /全新私有暂存目录`。脚本只导出有效账号的最新两模式草稿，拒绝覆盖现有目录。管理员检查导出数量、revision、项目内容和引用原片仍存在，再将对应 `<workspaceId>/drafts/<kind>.json` 原子放回旧版要求的账号目录。回退旧镜像时须同时恢复旧版 `compose.yaml`、`docker.env` 和只读 `auth.json` 挂载；仅改 `STUDIO_IMAGE` 会让旧版失去账号配置。若旧版还只读取临时媒体目录，必须核对并迁回其需要的原片路径，确认两模式都能读取后再对外切换。直接切换旧版会看到迁移前的旧草稿，可能丢失新编辑；不能省略导出。保留数据库和原始 JSON 直到完成验证。

## 验证与约束

- 使用 `EXPLAIN` 检查 `studio_account` 的唯一键与 `studio_current_draft` 的 `(account_id,draft_kind)` 唯一键；不使用外键、触发器、视图或存储过程。
- 会话文件仍需独立 0700/0600 私有目录，`STUDIO_TEMPORARY_MEDIA=1` 的任务和成片仍按原规则清理；原片和当前草稿引用的媒体按账号保留，受现有 5 GiB 配额和 1 GiB 磁盘预留控制。
- 旧系统的 systemd unit 与线上容器不会由代码修改自动更新；正式库建表、迁移、发布及回滚须单独操作与验收。
