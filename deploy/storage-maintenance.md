# 存储容量与验收文件维护

## 两类清理

业务素材继续由 `server/workspace.ts` 管理：公网启用 `STUDIO_TEMPORARY_MEDIA=1`，每分钟检查，账号2小时无实际使用后清理；排队、运行和媒体流持有保护，服务重启后旧业务临时目录清空。不要用cron按文件mtime删除 `shared/data`，也不要为了清理而重启正在工作的服务。

每日维护只扫描工作室根目录下 `artifacts/*`、`verification/*` 及其中真实的 `data` 子目录、本机 `data/*verification*` 中符合分段命名的独立验收目录。未标记目录只列清单；管理员确认验收完成、不再作为任务运行目录后写入 `.studio-disposable.json`，该标记及目录中全部文件的最后修改/元数据变更均超过7天才删除。`--days` 可延长至更久。含运行依赖软链接的验收环境整体保留，可单独标记其中真实的data子目录；标记后不可重新用作运行目录；出现符号链接、特殊文件或损坏标记时保留待检查。正在使用的业务data、历史uploads/exports/render-cache、模型、登录摘要、私有配置、发布包和依赖都不属于维护目标。

目录内的日志随已完成验收目录一起到期。生产应用日志交给systemd journal现有轮转管理，本脚本不修改全服务器日志策略。

## 容量保护（随应用部署）

| 环境变量                     | 默认值（MiB） | 含义                               |
| ---------------------------- | ------------: | ---------------------------------- |
| `STUDIO_WORKSPACE_LIMIT_MIB` |          5120 | 单账号已有文件加尚未释放的预算上限 |
| `STUDIO_MIN_DISK_FREE_MIB`   |          1024 | 共享磁盘最低保留空间               |

必须为正整数，不接受0关闭保护；配置错误时拒绝启动。上传在接收multipart前按上限预留（视频250MiB、音频50MiB、照片40MiB含处理空间）；照片/实拍成片按现有输出估算并加原片准备空间预留，智能清理、识别及配音同样受保护。跨账号共享磁盘预算，队列开始时复查磁盘；失败、取消和清理结束后释放。超限返回507，错误沿用已有页面提示，不删除已有素材。下载、读取和取消不受新任务准入阻断。

这些是准入预算，**不是文件系统硬配额**：实际输出可能超过估算，其他服务也可能写满磁盘。本机兼容CLI的legacy范围包含旧data，历史文件也计入5GiB额度；本机接近额度时先清点历史成片，不要扩大公网默认值来掩盖堆积。

## 默认预览与完成标记

```sh
pnpm storage:maintenance
pnpm storage:maintenance --complete artifacts/已完成的验收目录
pnpm storage:maintenance --apply
```

标记命令使用独占创建，不能覆盖原标记；标记与删除不能合并为一个命令。默认7天从完成标记或最后修改较晚者起算，不会因补标记立即删除历史目录。完成标记只用于人工确认关闭的验收环境，不能用来代替任务锁。

首次本机盘点只生成清单，不标记历史素材。`.next/cache` 是可重建构建缓存，可在确认无构建任务后单独删除；`.next/server`、`.next/static` 和 `.video-bundles` 是运行产物，不纳入定时清理。旧发布之间存在依赖软链接，不能按日期批量删除releases。

## 安装服务器每日维护（管理员）

把本仓库的 `scripts/storage-maintenance.ts` 安装到 `/opt/house-video-studio/maintenance/storage-maintenance.ts`（root拥有、0644），把两个同名unit从deploy复制到 `/etc/systemd/system/`。脚本仅依赖Node内置模块，使用现有Node22运行时的类型剥离，不安装依赖，不修改current、Nginx、正式主unit或账号配置。

先运行只读预览：

```sh
/opt/house-video-studio/runtime/node22/bin/node --experimental-strip-types /opt/house-video-studio/maintenance/storage-maintenance.ts --root /opt/house-video-studio
systemd-analyze verify /etc/systemd/system/house-video-storage-maintenance.service /etc/systemd/system/house-video-storage-maintenance.timer
systemctl daemon-reload
systemctl enable --now house-video-storage-maintenance.timer
systemctl start house-video-storage-maintenance.service
systemctl list-timers house-video-storage-maintenance.timer
journalctl -u house-video-storage-maintenance.service -n 100 --no-pager
```

每天北京时间04:30后随机延迟最多10分钟运行，补执行离线期间错过的计划。独立维护进程限制128MiB、20%CPU及低IO优先级，不占用媒体渲染槽，不重启应用。服务日志输出候选、跳过原因、预计字节数和实际删除列表。只有标记完成并到期的目录会删除；未标记目录持续可见，需管理员判断后标记。

维护用根目录下 `.studio-storage-maintenance.lock` 串行化。若维护被强制终止留下锁，下次会明确失败；先确认维护service未运行，再由管理员删除该空锁目录。不要自动抢占未知锁。

停用/回滚：`systemctl disable --now house-video-storage-maintenance.timer`，等待维护service结束再移除维护脚本及两个unit、执行daemon-reload。无需重启工作室。删除完成标记可保留尚未到期的目录；已经删除的验收文件不备份，不能恢复。容量保护回退随应用版本处理，临时模式必须继续保留。
