# API、数据和服务边界

- 浏览器请求集中在 studio 业务 API，使用原生 fetch；通过 `src/services/definition` 的 Zod 契约解析成功响应。保持现有路径、字段与错误语义，不照搬参考项目的 Axios、字段转换或身份体系。
- 组件不能直接访问本机文件、Node 模块、云 Key 或预算。密钥只从服务端私有环境配置读取，禁止 NEXT_PUBLIC_ 前缀、日志或客户端打包。
- Express 的 Host/Origin 隔离必须在 API、静态媒体和 Next handler 之前执行；默认只监听 `127.0.0.1:4318`。未知 API 返回明确 JSON 404，不能落入 Next HTML 页面。
- 文件上传限制、真实媒体探测、路径校验、请求体限制、任务互斥、持久化恢复、内容缓存与预算防重保持生效。迁移页面框架不能重置 data 或绕过边界。
- Next 的页面路由不重复实现现有 API，不把耗时的本机 ffmpeg/Remotion 任务改成 Server Action 或临时请求内状态。
- 所有云调用均保持主动触发和费用授权；语义提取与文案固定 qwen3.7-flash，确认免费额度与用完即停后才允许请求。提取只发送移除手机号的原文；画面文案只发房屋图片/关键帧，不发送人物开场和音轨。
- 本地错误要可见；失败不自动重试付费调用、不切模型、不删除预算或任务记录来强行重跑。
- 用户明确授权公网部署时，PUBLIC_ORIGIN只能加入准确来源，Host/Origin保护与本机渲染读取同时保留。服务仍只监听loopback，Express会话鉴权在API/媒体/Next前执行；除登录页、登录接口与公开构建资源外，页面和数据须保护。Nginx必须固定上游公网Host，不能删除或改写Origin；127.0.0.1专用例外只允许GET/HEAD的media/demo，不能放行API或成片。认证私有配置不能被应用修改，不复用参考项目数据库。

- 多账号的存储目录、内容缓存和运行任务必须从server/workspace作用域取得。身份来自管理员私有认证配置与Cookie会话；X-Studio-Workspace只检查旧页面是否仍属于当前登录，不能决定数据归属。内部/_workspace/<id>/media路径须准确loopback Host和本机来源，公网即使登录也返回403。旧媒体URL仍为/media/<filename>，由会话选择私有目录；exports同样隔离。

- 草稿仅在浏览器按账号/模式保存；服务端save-draft返回410，get-draft仅为空模板兼容。临时模式必须启用，业务目录按账号最后实际使用2小时清理、每分钟检查；后台/排队任务和媒体流持有清理保护，状态轮询不延长保留期，服务重启不复活旧媒体。前端须提示过期后重传，浏览器存储失败不能伪报成功。

- 视频上传返回原片UUID路径及可选preparation状态，旧import路径保持兼容；只能放行固定video-pending.svg占位图，不接受任意SVG。生成时由服务端路径决定准备，摘要使用流式读取。FFprobe限制file/pipe协议与MOV容器，并有独立并发槽及30秒截止；不可被客户端Ready标志绕过。

- 注销属于当前页面账号的明确操作：共享logoutInputSchema要求confirmed=true，多账号需核对X-Studio-Workspace。拒绝未确认或旧标签注销时不能清Cookie或撤销票据；会话检查失败不能通过静默删Cookie来“修复”。诊断日志仅允许固定类别及布尔状态，不含Cookie/摘要/密码/账号名或原始请求内容。
