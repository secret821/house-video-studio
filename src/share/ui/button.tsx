'use client';

import { Button as AntButton, type ButtonProps } from 'antd';
import type { ComponentRef, Ref } from 'react';
import { cn } from '../cn';

/** Research workbench solid/hollow variants, retaining the native antd event/ref contract. */
export enum ButtonAppearance {
  Solid = 'solid',
  Hollow = 'hollow',
}

export type CommonButtonProps = ButtonProps & {
  appearance?: ButtonAppearance;
  ref?: Ref<ComponentRef<typeof AntButton>>;
};

const BUTTON_TYPE = {
  [ButtonAppearance.Solid]: 'primary',
  [ButtonAppearance.Hollow]: 'default',
} as const;

export function CommonButton({
  appearance,
  type,
  className,
  ...props
}: CommonButtonProps) {
  return (
    <AntButton
      {...props}
      type={appearance ? BUTTON_TYPE[appearance] : type}
      className={cn('studio-common-button', className)}
    />
  );
}
