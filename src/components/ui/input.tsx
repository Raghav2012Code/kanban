import { forwardRef } from 'react';
import type { InputHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(function Input({ className, type = 'text', ...props }, ref): JSX.Element {
  return <input ref={ref} type={type} className={cn('flex h-9 w-full rounded-strip border border-line bg-base px-2.5 py-1.5 text-base text-ink outline-none transition-colors placeholder:text-faint focus:border-accent focus:ring-1 focus:ring-accent disabled:cursor-not-allowed disabled:opacity-40', className)} {...props} />;
});

Input.displayName = 'Input';
