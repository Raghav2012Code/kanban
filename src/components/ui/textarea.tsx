import type { TextareaHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>): JSX.Element {
  return <textarea className={cn('flex min-h-20 w-full rounded-ui border border-line-control bg-surface px-2.5 py-1.5 text-sm text-ink outline-hidden transition-colors placeholder:text-faint focus:border-accent focus:ring-1 focus:ring-accent disabled:cursor-not-allowed disabled:opacity-40 pointer-coarse:text-base', className)} {...props} />;
}
