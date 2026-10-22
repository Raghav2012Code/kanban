import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

const base = 'inline-flex items-center justify-center gap-1.5 rounded-ui font-body text-sm font-medium transition-[background-color,border-color,color,box-shadow,transform] duration-150 ease-out focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-base motion-safe:active:scale-[0.98] disabled:pointer-events-none disabled:opacity-40';

const variants = {
  default: 'bg-accent text-accent-fg shadow-xs hover:bg-accent-strong',
  ghost: 'text-muted hover:bg-raised hover:text-ink',
  outline: 'border border-line-control bg-surface text-ink shadow-xs hover:border-accent hover:text-accent',
  destructive: 'text-muted hover:bg-raised hover:text-hold',
} as const;

const sizes = {
  default: 'h-9 px-3',
  sm: 'h-8 px-2.5 text-[13px]',
  icon: 'h-8 w-8',
} as const;

type Variant = keyof typeof variants;
type Size = keyof typeof sizes;

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant = 'default', size = 'default', type = 'button', ...props },
  ref,
): JSX.Element {
  return <button ref={ref} type={type} className={cn(base, variants[variant], sizes[size], className)} {...props} />;
});

Button.displayName = 'Button';
