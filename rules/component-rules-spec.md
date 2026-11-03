# 组件与状态规范

- 使用 TypeScript 严格模式、函数组件与 Hook；不新增 any，以 `import type` 导入类型。
- 页面展示、状态编排、请求边界保持职责清楚；复用现有 `use-studio`、`use-video-edit` 与业务 API，不在 JSX 发请求。
- 异步使用 Promise 链，返回完整 Promise；禁止 async/await、空 catch、伪造成功或静默丢失后台错误。
- Hook 依赖完整，轮询需串行、可清理，不在页面卸载后更新状态。加载、错误、禁用和渲染中状态必须可见。
- 稳定状态与协议枚举沿用显式 enum；展示项放在对应 MAP；JSX 避免嵌套三元，列表使用稳定业务 id。
- 页面控件统一使用 Ant Design（antd），图标使用 @ant-design/icons。按钮、输入、数值框、选择器、复选框、滑块、进度、折叠、上传、菜单、表单和确认弹窗优先使用库原生能力，不再维护同类自定义交互。保留现有语义、可访问标签、业务校验和忙碌禁用；原生音视频、Remotion预览与素材排序属于专用媒体交互。
- 主题集中在 src/features/studio/studio-provider.tsx，Next布局使用官方AntdRegistry注入首屏样式。页面布局优先写在就近 TSX 的 Tailwind class，主题 token 与必要的跨组件规则留在 src/theme.css，Ant Design 内部控件样式留在 common/controls.css；不再新增页面 CSS Module，不能恢复旧组件库或默认切成antd蓝色主题。
- 不为一次性透传、无收益的格式转换或假定未来复用增加公共抽象。修改旧实现只治理当前需求影响范围。
- 同一项目状态只有一个来源；文案建议只有采纳时才写回，配音过期时沿用阻断，不能通过页面状态绕过服务端校验。

## 统一UI封装

页面基础控件必须通过 `src/features/studio/common` 导入；该层封装antd，不自建交互状态机。按钮使用公共Button与ButtonAppearance，控件尺寸/换行由common/controls.css维护；页面只负责布局，不再加island-action等按钮修补类。Select/InputNumber/Checkbox.Group保留泛型，Input复合组件与Form上下文、上传Dragger/LIST_IGNORE和React19 ref保持兼容。主题Provider可直接使用antd基础设施；其他页面由ESLint禁止直接导入antd及子路径。参考组件的适配和未迁入的科研业务组件见common/README.md。
