import type { HTMLAttributes } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva('inline-flex items-center rounded border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider', {
  variants: {
    variant: {
      default: 'border-zinc-700 bg-zinc-900 text-zinc-300',
      low: 'border-emerald-900/80 bg-emerald-950/50 text-emerald-400',
      medium: 'border-amber-900/80 bg-amber-950/50 text-amber-400',
      high: 'border-rose-900/80 bg-rose-950/50 text-rose-400',
    },
  },
  defaultVariants: { variant: 'default' },
});

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement>, VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps): JSX.Element {
  return <span className={cn(badgeVariants({ variant, className }))} {...props} />;
}
