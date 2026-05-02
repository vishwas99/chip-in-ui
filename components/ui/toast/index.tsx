'use client';
import React from 'react';
import { createToast, createToastHook } from '@gluestack-ui/toast';
import { tva } from '@gluestack-ui/nativewind-utils/tva';
import {
  withStyleContext,
  useStyleContext,
} from '@gluestack-ui/nativewind-utils/withStyleContext';
import { View, Text } from 'react-native';
import type { VariantProps } from '@gluestack-ui/nativewind-utils';

const SCOPE = 'TOAST';

const Root = withStyleContext(View, SCOPE);

const UIToast = createToast({
  Root: Root,
  Title: Text,
  Description: Text,
});

export const useToast = createToastHook(UIToast);

const toastStyle = tva({
  base: 'p-4 rounded-2xl shadow-2xl flex-row items-center gap-3 border mx-4 mb-28',
  variants: {
    action: {
      info: 'bg-[#1C2854] border-[#24335E]',
      error: 'bg-[#450A0A] border-[#7F1D1D]',
      success: 'bg-[#064E3B] border-[#065F46]',
      warning: 'bg-[#451A03] border-[#78350F]',
    },
    variant: {
      solid: 'opacity-95',
      outline: 'bg-transparent',
    },
  },
});

const toastTitleStyle = tva({
  base: 'text-typography-0 font-bold text-sm',
  parentVariants: {
    action: {
      info: 'text-info-500',
      error: 'text-error-500',
      success: 'text-success-500',
      warning: 'text-warning-500',
    },
  },
});

const toastDescriptionStyle = tva({
  base: 'text-typography-400 text-xs',
});

type IToastProps = React.ComponentPropsWithoutRef<typeof UIToast> &
  VariantProps<typeof toastStyle> & { className?: string };

const Toast = React.forwardRef<
  React.ComponentRef<typeof UIToast>,
  IToastProps
>(function Toast(
  { className, variant = 'solid', action = 'info', ...props },
  ref
) {
  return (
    <UIToast
      ref={ref}
      {...props}
      className={toastStyle({ variant, action, class: className })}
      context={{ variant, action }}
    />
  );
});

type IToastTitleProps = React.ComponentPropsWithoutRef<typeof UIToast.Title> &
  VariantProps<typeof toastTitleStyle> & { className?: string };

const ToastTitle = React.forwardRef<
  React.ComponentRef<typeof UIToast.Title>,
  IToastTitleProps
>(function ToastTitle({ className, variant, action, ...props }, ref) {
  const {
    variant: parentVariant,
    action: parentAction,
  } = useStyleContext(SCOPE);

  return (
    <UIToast.Title
      ref={ref}
      {...props}
      className={toastTitleStyle({
        parentVariants: {
          variant: parentVariant,
          action: parentAction,
        },
        variant,
        action,
        class: className,
      })}
    />
  );
});

type IToastDescriptionProps = React.ComponentPropsWithoutRef<
  typeof UIToast.Description
> &
  VariantProps<typeof toastDescriptionStyle> & { className?: string };

const ToastDescription = React.forwardRef<
  React.ComponentRef<typeof UIToast.Description>,
  IToastDescriptionProps
>(function ToastDescription({ className, variant, action, ...props }, ref) {
  return (
    <UIToast.Description
      ref={ref}
      {...props}
      className={toastDescriptionStyle({
        variant,
        action,
        class: className,
      })}
    />
  );
});

Toast.displayName = 'Toast';
ToastTitle.displayName = 'ToastTitle';
ToastDescription.displayName = 'ToastDescription';

export { Toast, ToastTitle, ToastDescription };
