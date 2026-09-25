import type { ButtonHTMLAttributes } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva('inline-flex items-center justify-center gap-1.5 rounded-strip font-body text-sm font-medium transition-[background-color,border-color,color,transform] duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-base motion-safe:active:scale-[0.98] disabled:pointer-events-none disabled:opacity-40', {
  variants: {
    variant: {
      default: 'bg-accent text-accent-fg hover:bg-accent/90',
      ghost: 'text-muted hover:bg-raised hover:text-ink',
      outline: 'border border-line-strong text-muted hover:border-accent hover:text-ink',
      destructive: 'text-faint hover:bg-raised hover:text-hold',
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
