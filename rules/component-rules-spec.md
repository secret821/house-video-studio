# 组件与状态规范

- 使用 TypeScript 严格模式、函数组件与 Hook；不新增 any，以 `import type` 导入类型。
- 页面展示、状态编排、请求边界保持职责清楚；复用现有 `use-studio`、`use-video-edit` 与业务 API，不在 JSX 发请求。
- 异步使用 Promise 链，返回完整 Promise；禁止 async/await、空 catch、伪造成功或静默丢失后台错误。
- Hook 依赖完整，轮询需串行、可清理，不在页面卸载后更新状态。加载、错误、禁用和渲染中状态必须可见。
- 稳定状态与协议枚举沿用显式 enum；展示项放在对应 MAP；JSX 避免嵌套三元，列表使用稳定业务 id。
- 页面控件统一使用 Ant Design（antd），图标使用 @ant-design/icons。按钮、输入、数值框、选择器、复选框、滑块、进度、折叠、上传、菜单、表单和确认弹窗优先使用库原生能力，不再维护同类自定义交互。保留现有语义、可访问标签、业务校验和忙碌禁用；原生音视频、Remotion预览与素材排序属于专用媒体交互。
- 主题集中在 `src/features/studio/shell/studio-provider.tsx`，Next布局使用官方AntdRegistry注入首屏样式。页面布局优先写在就近 TSX 的 Tailwind class，主题 token 与必要的跨组件规则留在 `src/theme.css`，Ant Design 内部控件样式留在 `src/share/ui/controls.css`；不再新增页面 CSS Module，不能恢复旧组件库或默认切成antd蓝色主题。
- 不为一次性透传、无收益的格式转换或假定未来复用增加公共抽象。修改旧实现只治理当前需求影响范围。
- 同一项目状态只有一个来源；文案建议只有采纳时才写回，配音过期时沿用阻断，不能通过页面状态绕过服务端校验。

## 统一UI封装

页面基础控件必须通过 `src/share/ui` 导入；该层封装antd，不自建交互状态机。按钮使用公共Button与ButtonAppearance，控件尺寸/换行由`src/share/ui/controls.css`维护；页面只负责布局，不再加island-action等按钮修补类。Select/InputNumber/Checkbox.Group保留泛型，Input复合组件与Form上下文、上传Dragger/LIST_IGNORE和React19 ref保持兼容。主题Provider可直接使用antd基础设施；其他页面由ESLint禁止直接导入antd及子路径。参考组件的适配见`src/share/ui/README.md`。

## 页面、服务端状态与复杂度

- `src/app` 只装配 feature 页面；photo/video 页面负责布局与状态编排，业务请求只在同 feature 的 API adapter。两种模式共用的 UI 能力才提升到 `src/share/ui`，不得把编辑器状态放入公共控件。
- 正式只读服务端状态优先用 TanStack Query，按资源命名 query key；会话查询必须在菜单打开和页面返回时重查。草稿保存队列、长任务轮询、上传和取消依赖明确的串行/恢复语义，沿用专用 Hook 和 Promise 链，不能让自动重试产生重复提交。
- 参数只传当前组件实际需要的值；同一值不要同时保留原始对象、派生状态和缓存副本。复杂页面按可独立理解的编辑区块拆组件，静态选项与映射留在领域模块，避免把业务规则写进 JSX。
- 显式处理加载、空、错误、成功四态；按钮在提交中锁定，失败后保留输入和可见重试。表单、Modal、上传、排序均保持键盘/触摸/可访问标签与组件库原生语义。
