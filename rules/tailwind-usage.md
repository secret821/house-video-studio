# Tailwind 与样式规范

- Tailwind v4 使用 CSS-first 配置，`src/theme.css` 是编辑器 token 与样式入口；Next 通过 `postcss.config.mjs` 的 `@tailwindcss/postcss` 编译，不再添加 Vite 插件。
- 复用 Ant Design 控件，产品主题以设计系统、StudioProvider与 `--studio-*` token为准；Tailwind通过 `@theme inline` 引用相同变量。库弹层由antd定位，不能手写listbox位移修补；少量外观覆盖保持作用域清楚。不能搬入参考项目的配色或SCSS体系。
- 超过 6 个 Tailwind 类时用 clsx 按布局、视觉、状态分组；条件用对象或 `&&`，禁止在 clsx 中使用三目。
- 常规编辑器避免结构性内联 style；视频画布的尺寸、位置、裁切和帧驱动样式是明确例外，不强改为静态类。
- CSS 保持作用域与命名清楚，不新增无关全局 reset。全局样式由根 layout 加载，不能分散到各路由重复注入。
- 原始媒体和视频导出的颜色属于内容数据，不受编辑器 UI token 限制；动画必须由帧数驱动。
