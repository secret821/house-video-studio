# 2026-10-30 智能画面清理代码事实

仓库house-video-studio，main/cd40903，存在用户未提交改动，包括Ant Design迁移、原声字幕和配乐；保留当前实现。

- use-video-edit.ts：默认完整原片创建shots，缩短shots会同时裁掉讲解。
- src/services/definition/video-edit.ts：用户片段最短2秒、最多12段；importedVideo含可选原声字幕。
- src/video/video-edit.tsx：原片提供同步的画面和声音，字幕按原片时间映射。
- server/subtitles.ts：已有workspace隔离、媒体单槽、后台任务、进程组取消、期限与清理保护。
- video-edit-api.ts：现有fetch＋Zod边界；当前没有人物检测依赖。

本轮采用生成独立清理副本、接回原声的方式，保留所有用户片段时间、字幕和既有渲染契约。业务决定来自本会话的三项明确回答。
