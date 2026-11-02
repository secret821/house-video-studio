---
name: bgm-library
description: 维护本项目内置兜底曲目与 ccMixter 在线免费音乐搜索、试听、署名和账号内导入。用户选曲，不自动代选。
---

# 背景音乐库维护

本项目同时保留五首本地合成音乐、用户上传和在线搜索。在线失效不能隐藏内置选曲或清空现有音乐。每项右侧 播放／暂停按钮 只试听/暂停，点击曲名才选用；两种视频编辑模式共用 MusicPicker。

搜索界面支持常用中文标签（如钢琴→piano、吉他→guitar、氛围→ambient）并显示实际查询词；不是任意中文翻译。成功后显示数量并展开结果，空结果与请求失败必须有明确反馈，不自动代选或清空当前音乐。

## 接入与核验

- 官方查询接口：https://ccmixter.org/query-api 。应用独立实现位于 `server/music-provider.ts`、`server/music-library.ts`；浏览器请求集中在 `src/features/studio/music-api.ts`。
- 只放行明确 CC BY 2.5/3.0/4.0 的纯音乐 MP3。不得凭“免费”标签推定可商用，不自动放宽许可。署名随 AudioAsset.musicCredit 保存并在界面提供复制。
- 选中后下载到当前账号临时 uploads，保留大小、超时、断连取消和存储预算；成片只读取本地文件。预览不自动选用、切换预览停止上一首。
- 保留 TLS 校验和固定上游来源，不接受客户端 URL。故障测试必须覆盖内置曲目可用、账号隔离、下载超限及中断清理。

## 上游来源边界

安装来源为 TeamWiseFlow/xiaobei 的 bgm-library，固定版本和原始文件摘要见 `references/upstream-source.json`，原始说明见 `references/upstream-SKILL.md`，许可见 `LICENSE`。上游许可证有多租户限制；原脚本关闭 TLS 校验。本项目仅保留文档参考，已移除此次安装的可执行脚本和包配置，不将上游代码用于多账号生产服务，不调用自动 pick/force 命令。

这是项目内维护技能，不是付费服务、自动选曲或发布授权。新安装技能从后续回合发现；页面运行不依赖技能执行。
