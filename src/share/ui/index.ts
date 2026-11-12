/** Studio UI public boundary. Product pages import controls here, never directly from antd. */
export { CommonButton as Button, ButtonAppearance } from './button';
export type { CommonButtonProps as ButtonProps } from './button';
export {
  CommonInput as Input,
  CommonInputNumber as InputNumber,
  CommonSelect as Select,
} from './inputs';
export {
  CommonAlert as Alert,
  CommonCheckbox as Checkbox,
  CommonCollapse as Collapse,
  CommonDropdown as Dropdown,
  CommonFlex as Flex,
  CommonForm as Form,
  CommonModal as Modal,
  CommonPopconfirm as Popconfirm,
  CommonProgress as Progress,
  CommonSlider as Slider,
  CommonTypography as Typography,
  CommonUpload as Upload,
} from './controls';
// Preserve native context identity and Image's built-in preview/PreviewGroup behavior.
export { ConfigProvider, Image } from 'antd';
export { cn, cva, type VariantProps } from '../cn';
