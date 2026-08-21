import type { SelectHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export function Select({ className, ...props }: SelectHTMLAttributes<HTMLSelectElement>): JSX.Element {
  return <select className={cn('flex h-10 w-full rounded-md border border-zinc-800 bg-zinc-900 px-3 py-2 text-base text-zinc-300 outline-none transition-colors focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500 disabled:cursor-not-allowed disabled:opacity-50', className)} {...props} />;
}
