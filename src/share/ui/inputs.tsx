'use client';

import {
  Input as AntInput,
  InputNumber as AntInputNumber,
  Select as AntSelect,
  type InputNumberProps,
  type SelectProps,
} from 'antd';
import type {
  BaseOptionType,
  DefaultOptionType,
  RefSelectProps,
} from 'antd/es/select';
import type { ComponentProps, ComponentRef, Ref } from 'react';

function CommonTextInput({
  className,
  ...props
}: ComponentProps<typeof AntInput>) {
  return <AntInput {...props} className={className} />;
}
function CommonTextArea({
  className,
  ...props
}: ComponentProps<typeof AntInput.TextArea>) {
  return <AntInput.TextArea {...props} className={className} />;
}
function CommonPassword({
  className,
  ...props
}: ComponentProps<typeof AntInput.Password>) {
  return <AntInput.Password {...props} className={className} />;
}
function CommonSearch({
  className,
  ...props
}: ComponentProps<typeof AntInput.Search>) {
  return <AntInput.Search {...props} className={className} />;
}

/** Keep native compound APIs and refs; Form.Item can still inject value/onChange. */
export const CommonInput = Object.assign(CommonTextInput, {
  TextArea: CommonTextArea,
  Password: CommonPassword,
  Search: CommonSearch,
});

export function CommonInputNumber<Value extends number | string = number>({
  className,
  ...props
}: InputNumberProps<Value> & {
  ref?: Ref<ComponentRef<typeof AntInputNumber>>;
}) {
  return <AntInputNumber<Value> {...props} className={className} />;
}

/** Preserve value/option generics, especially typed music search optionRender callbacks. */
export function CommonSelect<
  Value = unknown,
  Option extends BaseOptionType = DefaultOptionType,
>({
  className,
  ...props
}: SelectProps<Value, Option> & { ref?: Ref<RefSelectProps> }) {
  return <AntSelect<Value, Option> {...props} className={className} />;
}
