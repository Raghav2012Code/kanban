import { motion } from 'motion/react';
import { IconAlertTriangle, IconArrowDown, IconArrowLeft, IconArrowRight, IconArrowUp, IconChevronDown, IconChevronUp, IconGripVertical, IconTrash } from '@tabler/icons-react';
import type { DragEvent } from 'react';
import { useMotionTransition } from '@/hooks/useMotionTransition';
import { formatDueDate } from '@/lib/dates';
import { tailNumber } from '@/lib/ids';
import { cn } from '@/lib/utils';
import type { CardItem } from '@/types/kanban';
import { Button } from '@/components/ui/button';
import { PriorityMeter } from '@/components/ui/priority-meter';

export type MoveDirection = 'up' | 'down' | 'left' | 'right';

interface KanbanCardProps {
  card: CardItem;
  done: boolean;
  overdue: boolean;
  expanded: boolean;
  canMoveUp: boolean;
  canMoveDown: boolean;
  canMoveLeft: boolean;
  canMoveRight: boolean;
  onDelete: (id: string) => void;
  onToggleExpanded: (id: string) => void;
  onMove: (id: string, direction: MoveDirection) => void;
  onDragStart: (event: DragEvent<HTMLElement>, id: string) => void;
  onDragEnd: () => void;
  onDragOver: (event: DragEvent<HTMLElement>, id: string) => void;
  onDragEnter: (event: DragEvent<HTMLElement>, id: string) => void;
  onDragLeave: (event: DragEvent<HTMLElement>) => void;
  onDrop: (event: DragEvent<HTMLElement>, id: string) => void;
  dropIndicator: boolean;
}

const revealControl = 'opacity-100 [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100 [@media(hover:hover)]:group-focus-within:opacity-100 [@media(hover:hover)]:pointer-events-none [@media(hover:hover)]:group-hover:pointer-events-auto [@media(hover:hover)]:group-focus-within:pointer-events-auto';

/** Shared drop target: a dashed row at strip height, so a drop reads as "a strip lands here". */
export const dropPlaceholderClass = 'h-9 rounded-strip border border-dashed border-line-strong bg-raised';

const moveControls: { direction: MoveDirection; label: string; Icon: typeof IconArrowUp; can: keyof Pick<KanbanCardProps, 'canMoveUp' | 'canMoveDown' | 'canMoveLeft' | 'canMoveRight'> }[] = [
  { direction: 'up', label: 'up', Icon: IconArrowUp, can: 'canMoveUp' },
  { direction: 'down', label: 'down', Icon: IconArrowDown, can: 'canMoveDown' },
  { direction: 'left', label: 'to the previous column', Icon: IconArrowLeft, can: 'canMoveLeft' },
  { direction: 'right', label: 'to the next column', Icon: IconArrowRight, can: 'canMoveRight' },
];

export function KanbanCard({ card, done, overdue, expanded, canMoveUp, canMoveDown, canMoveLeft, canMoveRight, onDelete, onToggleExpanded, onMove, onDragStart, onDragEnd, onDragOver, onDragEnter, onDragLeave, onDrop, dropIndicator }: KanbanCardProps): JSX.Element {
  const transition = useMotionTransition();
  const canMove = { canMoveUp, canMoveDown, canMoveLeft, canMoveRight };
  const rail = done ? 'bg-cleared' : overdue ? 'bg-hold' : 'bg-line-strong';
  return <>
    {dropIndicator && <motion.div initial={{ opacity: 0, scaleY: 0.6 }} animate={{ opacity: 1, scaleY: 1 }} transition={transition} className={dropPlaceholderClass} aria-hidden="true" />}
    <motion.div layout transition={transition} draggable onDragStart={(event) => onDragStart(event as unknown as DragEvent<HTMLElement>, card.id)} onDragEnd={onDragEnd} onDragOver={(event) => { event.stopPropagation(); onDragOver(event, card.id); }} onDragEnter={(event) => { event.stopPropagation(); onDragEnter(event, card.id); }} onDragLeave={onDragLeave} onDrop={(event) => { event.stopPropagation(); onDrop(event, card.id); }} role="group" aria-label={card.title} className="group relative flex flex-col gap-1.5 border-b border-line/70 px-1 py-2.5 last:border-b-0">
      <div className="flex items-stretch gap-2.5">
        <span aria-hidden="true" className="mt-0.5 hidden w-3 shrink-0 cursor-grab text-faint transition-colors group-hover:text-muted lg:block"><IconGripVertical size={14} stroke={1.5} /></span>
        <span aria-hidden="true" className={cn('mt-0.5 w-1 shrink-0 rounded-full', rail)} />
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-2">
            <h3 className={cn('min-w-0 flex-1 line-clamp-2 font-body text-sm font-medium leading-5', done ? 'text-muted line-through' : 'text-ink')}>{card.title}</h3>
            <span aria-hidden="true" className="shrink-0 font-mono text-[11px] tracking-wide text-faint">{tailNumber(card.id)}</span>
          </div>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1">
            <PriorityMeter priority={card.priority} />
            {done && <span role="img" aria-label="Done" className="sr-only">Done</span>}
            {card.dueDate && (overdue
              ? <span role="img" aria-label="Overdue" title={card.dueDate} className="inline-flex items-center gap-1 font-mono text-[11px] uppercase tracking-wide text-hold"><IconAlertTriangle size={12} stroke={1.5} aria-hidden="true" />{formatDueDate(card.dueDate)}</span>
              : <span title={card.dueDate} className="font-mono text-[11px] tabular-nums text-muted">{formatDueDate(card.dueDate)}</span>)}
          </div>
          {card.description && <>
            <Button variant="ghost" size="sm" onClick={() => onToggleExpanded(card.id)} aria-expanded={expanded} className="mt-1.5 h-auto px-0 py-0 font-mono text-[11px] uppercase tracking-wide text-muted hover:bg-transparent hover:text-ink">{expanded ? <IconChevronUp size={12} stroke={1.5} /> : <IconChevronDown size={12} stroke={1.5} />} {expanded ? 'Hide details' : 'Show details'}</Button>
            {expanded && <motion.p initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} transition={transition} className="mt-1.5 overflow-hidden text-xs leading-5 text-muted">{card.description}</motion.p>}
          </>}
        </div>
      </div>
      <div className={cn('flex items-center justify-end gap-0.5', '[@media(hover:hover)]:absolute [@media(hover:hover)]:right-1.5 [@media(hover:hover)]:top-1.5 [@media(hover:hover)]:rounded-strip [@media(hover:hover)]:border [@media(hover:hover)]:border-line [@media(hover:hover)]:bg-raised [@media(hover:hover)]:px-0.5', revealControl)}>
        {moveControls.map(({ direction, label, Icon, can }) => <Button key={direction} variant="ghost" size="icon" onClick={() => onMove(card.id, direction)} disabled={!canMove[can]} aria-label={`Move ${card.title} ${label}`} className="h-7 w-7 text-faint"><Icon size={14} stroke={1.5} /></Button>)}
        <Button variant="destructive" size="icon" onClick={() => onDelete(card.id)} aria-label={`Delete ${card.title}`} className="h-7 w-7"><IconTrash size={14} stroke={1.5} /></Button>
      </div>
    </motion.div>
  </>;
}
