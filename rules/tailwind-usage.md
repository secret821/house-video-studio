---
description: 房源视频工作室的 Tailwind CSS v4 使用规范
globs:
  - 'src/**/*.tsx'
  - 'src/**/*.ts'
  - 'src/**/*.css'
alwaysApply: true
---

# Tailwind CSS 使用规范

本项目是单仓库 Next.js App Router 应用。产品界面采用 Tailwind CSS v4 和 Ant Design；Remotion 视频画布、原生媒体播放器与素材排序有独立的媒体约束。参考只读项目的 utility 组织方法，使用本项目真实 token 和目录。

## 当前入口与文件边界

- `src/theme.css` 是唯一 Tailwind 入口，定义 `@layer`、`@import 'tailwindcss'`、`@theme inline`、全局基础规则和少量必须跨组件生效的样式。`src/app/layout.tsx` 负责引入。
- `src/share/ui/` 是登录、实拍和照片模式共用的 Ant Design 控件适配层。页面从 `@/share/ui` 或相对路径引入控件；`src/share/ui/controls.css` 只保留库内部节点、触控尺寸和弹层等无法可靠通过组件根元素 utility 表达的规则，由 `StudioProvider` 引入。
- 页面和局部组件的布局、间距、颜色、字号及响应式优先写在对应 TSX 的 Tailwind class。不要为单个页面再建 CSS Module、SCSS 或平行的全局样式文件。
- `src/video/` 的画布尺寸、逐帧动画和媒体专用内联样式不受产品 UI 的 Tailwind 迁移约束；不得让界面主题改变封面或 MP4。
- 当前项目没有 `.scss` / `.sass` 文件。若发现旧文件，先查真实引用和样式用途，再迁移到就近的 TSX、`@theme` 或必要的库覆盖；不要机械替换文件后缀。

## Token 与视觉尺度

`src/theme.css` 中的 `--studio-*` 是产品主题权威，`StudioProvider` 把同一套值交给 Ant Design。Tailwind 的 `@theme inline` 只把这些值映射为 utility。当前界面以青绿色主色、白色面板、浅灰页面、细边框和小圆角为准；不在业务 TSX 写另一套 hex 色。

| 用途             | 现有 utility                                                         |
| ---------------- | -------------------------------------------------------------------- |
| 主色与浅色状态   | `text-primary`、`bg-primary`、`bg-primary-soft`、`border-primary`    |
| 页面、面板与边线 | `bg-page`、`bg-panel`、`border-line`、`border-input`                 |
| 正文与辅助色     | `text-ink`、`text-content`、`text-muted`、`text-danger`              |
| 排版             | `text-heading-1` 至 `text-heading-4`、`text-body`、`text-caption` 等 |

`text-body` 表示 14px/24px **字号**，`text-content` 表示正文**颜色**。两者可以并用。普通正文先用 `text-body`；缩小一级用 `text-caption`。确需新字号时，在 `@theme inline` 增加命名的 `--text-*` 值，并同步 `src/share/cn.ts` 的 `theme.text` 列表；不要在 TSX 写一次性的任意值字号。

间距优先采用 4px 尺度和现有 Tailwind utility；容器按现有设计系统保持 1440px 最大宽、桌面 24px/手机 16px 边距。媒体容器的画幅、固定高度、动态头部避让或安全区可使用有实际依据的任意值。不要把普通 12px 间距写成任意值，也不要为了消除每个 class 强造 token。

## className 合并

统一使用 `src/share/cn.ts`；业务页面可从 `@/share/ui` 导入。它先用 `clsx` 处理条件，再用 `tailwind-merge` 消除同组冲突，同时区分本项目字号与文字颜色。`cva` 和 `VariantProps` 从同一入口导出。

```tsx
import { cn } from '@/share/ui';

<div
  className={cn(
    'grid min-w-0 gap-4 rounded-lg',
    'border border-line bg-panel p-4',
    'text-body text-content',
    { 'border-primary bg-primary-soft': selected },
  )}
/>;
```

- 简短、静态的 class 直接写字符串；超过 6 个 utility 时用 `cn` 按布局、尺寸、边框/背景、文字、状态和响应式分组。
- 条件 class 用对象写法，不用三目拼接，也不在 JSX 中反复写同一套长字符串。
- 只有**纯视觉**变体确实被多个调用处复用时才用 `cva`。Ant Design 的 `type`、`size`、`loading` 等行为或库参数继续交给 common 适配层；不要为用上 `cva` 重写库交互。
- `cn` 不能代替正确的 CSS 层叠。遇到 Ant Design 内部节点和弹层定位，先查库 API 与主题 token；确需覆盖才在 `src/share/ui/controls.css` 写有作用域的规则。

## 何时保留 CSS

Tailwind utility 负责组件根元素和页面布局。以下规则可留在 CSS，并注明理由：

1. `@theme`、base、全局焦点与减少动态效果偏好。
2. Ant Design 生成的子节点、悬浮层、表单注入和上传拖拽区域，其样式无法稳定附着到业务 TSX 的具体元素。
3. 用运行时测得的 `--studio-header-height`、安全区和输入聚焦状态计算位置，以及排序拖拽反馈。
4. 原生音视频和 Remotion 的画幅、裁切、覆盖层与帧驱动动画。

CSS 例外要放在真实归属处并限制选择器范围；不要在 `src/theme.css` 持续堆页面私有 `.studio-*` 类。迁移旧类时同时删除无引用规则。避免 `!important`，除非已验证库样式无法通过主题、API 或作用域解决。

## 验证

样式变更后运行 `pnpm lint`、`pnpm format:check`、`pnpm typecheck`、`pnpm build`、`pnpm test`。在浏览器检查 `/`、`/video-edit`、`/photo-mode` 和 `/login` 的桌面/窄屏、刷新、弹层、表单、固定操作栏和控制台错误。涉及视频画布或字幕样式时，还需核对预览与实际 MP4；纯产品 UI 调整也不能把已有 MP4 验收冒充本轮生成。
