import type { ButtonHTMLAttributes } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva('inline-flex items-center justify-center gap-2 rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-500 disabled:pointer-events-none disabled:opacity-50', {
  variants: {
    variant: {
      default: 'bg-zinc-100 text-zinc-950 hover:bg-white',
      ghost: 'text-zinc-400 hover:bg-zinc-900 hover:text-zinc-100',
      outline: 'border border-zinc-800 text-zinc-400 hover:bg-zinc-900 hover:text-zinc-100',
      destructive: 'text-zinc-600 hover:bg-zinc-900 hover:text-rose-400',
    },
    size: {
      default: 'px-3 py-2',
      sm: 'px-2.5 py-1.5 text-xs',
      icon: 'h-8 w-8',
    },
  },
  defaultVariants: { variant: 'default', size: 'default' },
});

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {}

export function Button({ className, variant, size, type = 'button', ...props }: ButtonProps): JSX.Element {
  return <button type={type} className={cn(buttonVariants({ variant, size, className }))} {...props} />;
}

export { buttonVariants };
