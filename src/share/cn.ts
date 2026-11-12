import { type ClassValue, clsx } from 'clsx';
import { extendTailwindMerge } from 'tailwind-merge';

// Keep project font sizes distinct from text colors during class merging.
const mergeClasses = extendTailwindMerge({
  extend: {
    theme: {
      leading: ['body', 'highlight'],
      text: [
        'heading-1',
        'heading-2',
        'heading-3',
        'heading-4',
        'body',
        'body-compact',
        'caption',
        'sub-caption',
        'data',
        'kpi',
      ],
    },
  },
});

export function cn(...inputs: ClassValue[]) {
  return mergeClasses(clsx(inputs));
}

export { cva, type VariantProps } from 'class-variance-authority';
