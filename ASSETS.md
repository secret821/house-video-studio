# 演示素材来源

照片仅用于演示工作流，不代表同一套房源。成片与编辑器均显式标为“演示房源”。项目不把照片中的装修、面积、价格或配套视为真实业务数据。

| 本地文件                | 原始图片地址                                                 |
| ----------------------- | ------------------------------------------------------------ |
| public/demo/living.jpg  | https://images.unsplash.com/photo-1600210492486-724fe5c67fb0 |
| public/demo/bedroom.jpg | https://images.unsplash.com/photo-1616594039964-ae9021a400a0 |
| public/demo/kitchen.jpg | https://images.unsplash.com/photo-1556912172-45b7abe8b7e1    |
| public/demo/dining.jpg  | https://images.unsplash.com/photo-1617806118233-18e1de247200 |

`scripts/prepare-demo.ts` 负责下载并转换为本地JPEG；背景音乐由该脚本数学合成，是项目原创16秒氛围音床。解说使用本机中文语音或用户上传的录音。依赖锁定于 `pnpm-lock.yaml`，Skills 来源为官方 remotion-dev/skills。

## 人物口播引擎与本轮测试

- 测试采用用户提供的第二张人物照片，按用户确认保留其原背景；去除相册界面后保存在 `data/uploads/opening-person.jpg`。照片、配音和视频均在忽略提交的本机data目录，不作为公共演示素材上传。
- 用户确认台词：“大家好，今天我带大家实地看一套房，看看它的户型、采光和周边环境，跟我一起出发吧。” 默认配音为macOS通用普通话女声。
- 官方引擎：https://github.com/OpenTalker/SadTalker ，源码提交 `cd4c0465ae0b54a6f85af57f5c65fec9fe23e7f8`。权重来源与校验值由安装脚本记录在本机manifest；上游LICENSE随源码保留在 `data/local-avatar/SadTalker-main/LICENSE`。
- 引擎使用隔离的Python/PyTorch，应用业务层、编辑器与任务编排保持TypeScript。本地入口加入Apple MPS设备选择兼容补丁，具体修改由 `scripts/setup-avatar.ts` 自动执行。

## Free real-footage assets (2026-10-25)

User-supplied MOVs: 143c7bbda49cf09d944696cd5c7b80d0.mov is the 9.518-second talking opening; 047b2c079060fc147408ed4cf46d08c1.mov is the 40.267-second property tour. Both are 540x960. The original speech and original source files are preserved, with no face model, voice clone or cloud upload. Normalized immutable copies and posters are private local files in data/uploads.

server/video-edit-music.ts synthesizes a separate 64-second piano track using mathematical oscillators, chord arpeggios and stereo echoes. It contains no downloaded song, recorded performance or third-party samples. The result is data/uploads/original-felt-piano-v1.wav. Property facts come from the user's text; no school, ownership or orientation claims were inferred.
