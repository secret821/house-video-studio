# 演示素材来源

## 本地智能清理模型与验证素材

人物检测使用官方 [ONNX SSD MobileNet v1 INT8](https://github.com/onnx/models/tree/main/validated/vision/object_detection_segmentation/ssd-mobilenetv1)，人脸检测使用官方 [ONNX UltraFace RFB-320](https://github.com/onnx/models/tree/main/validated/vision/body_analysis/ultraface)；ONNX Models仓库MIT许可，模型来源和固定SHA256记录在 `server/smart-clean-models.ts`，安装保存在忽略提交的 `.runtime/smart-clean`。运行时来自公共npm包onnxruntime-node。

智能清理验证视频由已有公开 bedroom.jpg、黑色画面与原创440Hz测试音合成，人物正例使用 [OpenCV basketball1.png](https://github.com/opencv/opencv/blob/master/samples/data/basketball1.png)，遵循上游OpenCV仓库许可，仅用于本地检测验证。测试视频并非用户的真实房源，输出位于 `artifacts/smart-clean-2026-10-30`，不会自动发布。

照片仅用于演示工作流，不代表同一套房源。成片与编辑器均显式标为“演示房源”。项目不把照片中的装修、面积、价格或配套视为真实业务数据。

| 本地文件                | 原始图片地址                                                 |
| ----------------------- | ------------------------------------------------------------ |
| public/demo/living.jpg  | https://images.unsplash.com/photo-1600210492486-724fe5c67fb0 |
| public/demo/bedroom.jpg | https://images.unsplash.com/photo-1616594039964-ae9021a400a0 |
| public/demo/kitchen.jpg | https://images.unsplash.com/photo-1556912172-45b7abe8b7e1    |
| public/demo/dining.jpg  | https://images.unsplash.com/photo-1617806118233-18e1de247200 |

`scripts/prepare-demo.ts` 负责下载并转换为本地JPEG；背景音乐由该脚本数学合成，是项目原创16秒氛围音床。解说使用本机中文语音或用户上传的录音。依赖锁定于 `pnpm-lock.yaml`，Skills 来源为官方 remotion-dev/skills。

登录页的`public/login-preview.jpg`复用上述living.jpg作为公开客厅示意图，不含用户素材、房源事实或私人文件。控件统一使用antd，图标来自官方@ant-design/icons；保留原有字体栈与本机字体回退，不为迁移新增外部图片或字体请求。

## 人物口播引擎与本轮测试

- 测试采用用户提供的第二张人物照片，按用户确认保留其原背景；去除相册界面后保存在 `data/uploads/opening-person.jpg`。照片、配音和视频均在忽略提交的本机data目录，不作为公共演示素材上传。
- 用户确认台词：“大家好，今天我带大家实地看一套房，看看它的户型、采光和周边环境，跟我一起出发吧。” 默认配音为macOS通用普通话女声。
- 官方引擎：https://github.com/OpenTalker/SadTalker ，源码提交 `cd4c0465ae0b54a6f85af57f5c65fec9fe23e7f8`。权重来源与校验值由安装脚本记录在本机manifest；上游LICENSE随源码保留在 `data/local-avatar/SadTalker-main/LICENSE`。
- 引擎使用隔离的Python/PyTorch，应用业务层、编辑器与任务编排保持TypeScript。本地入口加入Apple MPS设备选择兼容补丁，具体修改由 `scripts/setup-avatar.ts` 自动执行。

## Free real-footage assets (2026-10-25)

User-supplied MOVs: 143c7bbda49cf09d944696cd5c7b80d0.mov is the 9.518-second talking opening; 047b2c079060fc147408ed4cf46d08c1.mov is the 40.267-second property tour. Both are 540x960. The original speech and original source files are preserved, with no face model, voice clone or cloud upload. Normalized immutable copies and posters are private local files in data/uploads.

server/video-edit-music.ts synthesizes five separate 64-second stereo tracks using mathematical oscillators, chord arpeggios and stereo echoes: felt piano, sunny pluck, relaxed lounge, airy ambient and clear bells. Each uses its own rhythm and timbre, with no downloaded song, recorded performance or third-party samples. Filenames and labels are defined in src/services/definition/music.ts; the original original-felt-piano-v1.wav remains compatible. Scores are prepared at startup in the shared template cache, then copied into the current account workspace on selection. Property facts come from the user's text; no school, ownership or orientation claims were inferred.

视频待处理缩略图 `public/demo/video-pending.svg` 为本项目手写SVG（播放图标与“原片已上传/生成成片时处理”文字），不含外部资源、脚本或第三方素材；仅作为上传成功后的状态图，不替代成片封面。
