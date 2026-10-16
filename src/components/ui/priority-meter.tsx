import { cn } from '@/lib/utils';
import type { Priority } from '@/types/kanban';

const level: Record<Priority, number> = { low: 1, medium: 2, high: 3 };
const barHeight = ['h-1', 'h-1.5', 'h-2'];

/**
 * Three ascending bars, drawn like the brand mark's form. Filled slots are ink;
 * unfilled slots sit on the decorative border rung — the same weight as a tile's
 * edge — because they are the metre's structure, not its content. The count is
 * carried by the filled bars and by the label, never by hue alone.
 */
export function PriorityMeter({ priority, className }: { priority: Priority; className?: string }): JSX.Element {
  return <span role="img" aria-label={`Priority: ${priority}`} className={cn('inline-flex items-center gap-1.5', className)}><span aria-hidden="true" className="flex items-end gap-[2px]">{barHeight.map((height, index) => <span key={height} className={cn('w-[3.5px] rounded-[1.5px]', height, index < level[priority] ? 'bg-ink' : 'bg-line')} />)}</span><span aria-hidden="true" className="font-mono text-[11px] uppercase tracking-wide text-muted">{priority}</span></span>;
}
