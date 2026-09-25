import type { SelectHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export function Select({ className, ...props }: SelectHTMLAttributes<HTMLSelectElement>): JSX.Element {
  return <select className={cn('flex h-9 w-full rounded-strip border border-line bg-base px-2.5 py-1.5 text-base text-ink outline-none transition-colors focus:border-accent focus:ring-1 focus:ring-accent disabled:cursor-not-allowed disabled:opacity-40', className)} {...props} />;
}
