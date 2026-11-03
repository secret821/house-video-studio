# Studio common UI

本项目登录、实拍与照片编辑共享的UI边界。页面从 `./common` 导入控件，禁止直接依赖antd及其子路径；ESLint会检查。StudioProvider是主题/国际化基础设施例外，AntdRegistry继续负责首屏样式。

## 使用

```tsx
import { Button, ButtonAppearance, Input, Select, Form } from './common';

<Button appearance={ButtonAppearance.Solid} loading={pending} disabled={busy} onClick={save}>
  保存
</Button>
<Button appearance={ButtonAppearance.Hollow} onClick={cancel}>取消</Button>
```

默认按钮沿用antd次要按钮；主操作显式使用Solid。`disabled`、`loading`、`htmlType`、`href/download`、ARIA、事件、React19 ref完整传递。保留antd原生`type`用于text/link等语义。不要再添加island-action、studio-button或studio-primary来单独修补按钮。

- `button.tsx`：按钮变体、统一样式入口。
- `inputs.tsx`：Input（TextArea/Password/Search）、InputNumber、泛型Select。
- `controls.tsx`：Alert、Checkbox/Group、Collapse、Dropdown、Flex、Form、Modal、Popconfirm、Progress、Slider、Typography.Paragraph、Upload/Dragger。
- `cn.ts`：本业务域共用 `clsx`＋`tailwind-merge`，区分排版字号与文字颜色，并导出 `cva` 类型/函数。
- `controls.css`：只保留antd内部节点的控件尺寸、换行、输入与移动触控规则；由StudioProvider一次加载。页面布局使用就近Tailwind utility；动态媒体定位等少量例外保留在theme.css。
- Form.Item/useForm等直接保留antd的复合API和上下文身份；ConfigProvider仅作为上下文基础设施导出。所有行为仍交由antd实现，不复制状态机或定位代码。
- Image通过公共入口保留antd原生预览与PreviewGroup，直接点击缩略图放大，不另建预览按钮或Modal。模板图片预览与模板选择按钮是相邻控件，预览不会切换模板。

## 参考来源与适配

只读来源：`scientific-research-workbench/src/components/common/common-button.tsx`、`common-progress.tsx`、`collapsible-panel.tsx`及上一轮主题来源。按用户要求迁移CommonButton实心/描边思想与公共控件边界，使用本项目公共antd和Tailwind实现，不依赖参考仓库别名或SCSS。

按用户最新要求，按钮采用参考项目的普通36px/小号32px高度、2px圆角、14px粗体；普通横向16px/小号12px内边距。图标按钮32px，小号图标按钮28px，拖拽手柄使用小号文字型按钮与16px图标。手机不再统一拉高到44px；中文长按钮保留自适应宽度和必要换行，不照搬参考按钮固定72/98/120px宽度。参考倒计时进度不能表达真实渲染进度，因此继续封装antd Progress并显示真实值。科研文档树、元素周期表、数据导入、富文本和平台上传等不属于本项目UI，不复制未使用代码或业务依赖。

更新公共能力时核对两种编辑模式与登录，尤其检查下拉触发器ref、表单注入、选择器泛型、上传LIST_IGNORE/Dragger、disabled/提交/下载语义。新增控件先在此处适配，再通过index暴露；不得用类型断言掩盖泛型或ref不兼容。
