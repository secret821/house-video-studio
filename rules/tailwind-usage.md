# Tailwind 与样式规范

- Tailwind v4 使用 CSS-first 配置，`src/theme.css` 是编辑器 token 与样式入口；Next 通过 `postcss.config.mjs` 的 `@tailwindcss/postcss` 编译，不再添加 Vite 插件。
- 保持 animal-island-ui 主题与现有 token；界面优先引用 token，不能搬入参考项目的配色或 SCSS 体系。
- 超过 6 个 Tailwind 类时用 clsx 按布局、视觉、状态分组；条件用对象或 `&&`，禁止在 clsx 中使用三目。
- 常规编辑器避免结构性内联 style；视频画布的尺寸、位置、裁切和帧驱动样式是明确例外，不强改为静态类。
- CSS 保持作用域与命名清楚，不新增无关全局 reset。全局样式由根 layout 加载，不能分散到各路由重复注入。
- 原始媒体和视频导出的颜色属于内容数据，不受编辑器 UI token 限制；动画必须由帧数驱动。
