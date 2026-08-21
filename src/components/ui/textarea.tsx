import type { TextareaHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>): JSX.Element {
  return <textarea className={cn('flex min-h-20 w-full rounded-md border border-zinc-800 bg-zinc-900 px-3 py-2 text-base text-zinc-50 outline-none transition-colors placeholder:text-zinc-600 focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500 disabled:cursor-not-allowed disabled:opacity-50', className)} {...props} />;
}
