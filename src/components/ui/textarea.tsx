import type { TextareaHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>): JSX.Element {
  return <textarea className={cn('flex min-h-20 w-full rounded-strip border border-line-control bg-base px-2.5 py-1.5 text-base text-ink outline-none transition-colors placeholder:text-faint focus:border-accent focus:ring-1 focus:ring-accent disabled:cursor-not-allowed disabled:opacity-40', className)} {...props} />;
}
