'use client';

import {
  Alert as AntAlert,
  Checkbox as AntCheckbox,
  Collapse as AntCollapse,
  Dropdown as AntDropdown,
  Flex as AntFlex,
  Form as AntForm,
  Modal as AntModal,
  Popconfirm as AntPopconfirm,
  Progress as AntProgress,
  Slider as AntSlider,
  Typography as AntTypography,
  Upload as AntUpload,
  type FormProps,
  type FormInstance,
  type UploadProps,
  type UploadRef,
} from 'antd';
import type { CheckboxGroupProps } from 'antd/es/checkbox';
import type { ComponentProps, Ref, ReactNode } from 'react';

// Each adapter owns the product styling hook; antd continues to own behavior and accessibility.
export function CommonAlert({
  className,
  ...props
}: ComponentProps<typeof AntAlert>) {
  return <AntAlert {...props} className={className} />;
}
function CommonCheckboxRoot({
  className,
  ...props
}: ComponentProps<typeof AntCheckbox>) {
  return <AntCheckbox {...props} className={className} />;
}
function CommonCheckboxGroup<Value = string>({
  className,
  ...props
}: CheckboxGroupProps<Value> & { ref?: Ref<HTMLDivElement> }) {
  return <AntCheckbox.Group<Value> {...props} className={className} />;
}
export const CommonCheckbox = Object.assign(CommonCheckboxRoot, {
  Group: CommonCheckboxGroup,
});
export function CommonPopconfirm(props: ComponentProps<typeof AntPopconfirm>) {
  return <AntPopconfirm {...props} />;
}
export function CommonCollapse({
  className,
  ...props
}: ComponentProps<typeof AntCollapse>) {
  return <AntCollapse {...props} className={className} />;
}
export function CommonDropdown(props: ComponentProps<typeof AntDropdown>) {
  return <AntDropdown {...props} />;
}
export function CommonFlex({
  className,
  ...props
}: ComponentProps<typeof AntFlex>) {
  return <AntFlex {...props} className={className} />;
}
function CommonFormRoot<Values = Record<string, unknown>>({
  className,
  ...props
}: FormProps<Values> & {
  children?: ReactNode;
  ref?: Ref<FormInstance<Values>>;
}) {
  return <AntForm<Values> {...props} className={className} />;
}
export const CommonForm = Object.assign(CommonFormRoot, {
  Item: AntForm.Item,
  List: AntForm.List,
  ErrorList: AntForm.ErrorList,
  Provider: AntForm.Provider,
  useForm: AntForm.useForm,
  useFormInstance: AntForm.useFormInstance,
  useWatch: AntForm.useWatch,
});
export function CommonModal({
  className,
  ...props
}: ComponentProps<typeof AntModal>) {
  return <AntModal {...props} className={className} />;
}
export function CommonProgress({
  className,
  ...props
}: ComponentProps<typeof AntProgress>) {
  return <AntProgress {...props} className={className} />;
}
export function CommonSlider({
  className,
  ...props
}: ComponentProps<typeof AntSlider>) {
  return <AntSlider {...props} className={className} />;
}
function CommonParagraph({
  className,
  ...props
}: ComponentProps<typeof AntTypography.Paragraph>) {
  return <AntTypography.Paragraph {...props} className={className} />;
}
export const CommonTypography = { Paragraph: CommonParagraph };

function CommonUploadRoot<Response = unknown>({
  className,
  ...props
}: UploadProps<Response> & { ref?: Ref<UploadRef<Response>> }) {
  return <AntUpload<Response> {...props} className={className} />;
}
function CommonDragger({
  className,
  ...props
}: ComponentProps<typeof AntUpload.Dragger>) {
  return <AntUpload.Dragger {...props} className={className} />;
}
export const CommonUpload = Object.assign(CommonUploadRoot, {
  Dragger: CommonDragger,
  LIST_IGNORE: AntUpload.LIST_IGNORE,
});
