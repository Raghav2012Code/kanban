import { motion } from 'motion/react';
import { IconAlertTriangle, IconArrowDown, IconArrowLeft, IconArrowRight, IconArrowUp, IconChevronDown, IconCheck, IconChevronUp, IconCircleCheck, IconGripVertical, IconPencil, IconTrash } from '@tabler/icons-react';
import type { DragEvent } from 'react';
import { useMotionTransition } from '@/hooks/useMotionTransition';
import { formatDueDate, formatFiledDate } from '@/lib/dates';
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
  /** True while any card is being dragged: the tile goes inert and stops animating. */
  dragging?: boolean;
  /** True for the card being dragged: it reads as in flight while its ghost moves. */
  dragged?: boolean;
  canMoveUp: boolean;
  canMoveDown: boolean;
  canMoveLeft: boolean;
  canMoveRight: boolean;
  onDelete: (id: string) => void;
  onEdit: (id: string) => void;
  /** Selection is view state, never board state. */
  selected: boolean;
  onToggleSelected: (id: string) => void;
  onToggleExpanded: (id: string) => void;
  onMove: (id: string, direction: MoveDirection) => void;
  onDragStart: (event: DragEvent<HTMLElement>, id: string) => void;
  onDragEnd: () => void;
  onDragOver: (event: DragEvent<HTMLElement>, id: string) => void;
  onDragEnter: (event: DragEvent<HTMLElement>, id: string) => void;
  onDrop: (event: DragEvent<HTMLElement>, id: string) => void;
  dropIndicator: boolean;
}

const revealControl = 'opacity-100 [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100 [@media(hover:hover)]:group-focus-within:opacity-100 [@media(hover:hover)]:pointer-events-none [@media(hover:hover)]:group-hover:pointer-events-auto [@media(hover:hover)]:group-focus-within:pointer-events-auto';

/** Shared drop target: a dashed tile at card height, so a drop reads as "a card lands here". */
export const dropPlaceholderClass = 'h-16 rounded-ui border border-dashed border-line-strong bg-surface';

const moveControls: { direction: MoveDirection; label: string; Icon: typeof IconArrowUp; can: keyof Pick<KanbanCardProps, 'canMoveUp' | 'canMoveDown' | 'canMoveLeft' | 'canMoveRight'> }[] = [
  { direction: 'up', label: 'up', Icon: IconArrowUp, can: 'canMoveUp' },
  { direction: 'down', label: 'down', Icon: IconArrowDown, can: 'canMoveDown' },
  { direction: 'left', label: 'to the previous column', Icon: IconArrowLeft, can: 'canMoveLeft' },
  { direction: 'right', label: 'to the next column', Icon: IconArrowRight, can: 'canMoveRight' },
];

export function KanbanCard({ card, done, overdue, expanded, dragging = false, dragged = false, canMoveUp, canMoveDown, canMoveLeft, canMoveRight, onDelete, onEdit, selected, onToggleSelected, onToggleExpanded, onMove, onDragStart, onDragEnd, onDragOver, onDragEnter, onDrop, dropIndicator }: KanbanCardProps): JSX.Element {
  // Positions glide on the house tween, during a drag as much as after it. A landed
  // card is deliberately not given an entrance: the browser showed it under the
  // cursor, so there is nothing to introduce — materialising it would read as lag.
  const transition = useMotionTransition();
  const canMove = { canMoveUp, canMoveDown, canMoveLeft, canMoveRight };
  return <>
    {dropIndicator && <motion.div initial={{ opacity: 0, scaleY: 0.8 }} animate={{ opacity: 1, scaleY: 1 }} transition={transition} className={dropPlaceholderClass} aria-hidden="true" />}
    <motion.div layout transition={transition} data-card-id={card.id} draggable onDragStart={(event) => onDragStart(event as unknown as DragEvent<HTMLElement>, card.id)} onDragEnd={onDragEnd} onDragOver={(event) => { event.stopPropagation(); onDragOver(event, card.id); }} onDragEnter={(event) => { event.stopPropagation(); onDragEnter(event, card.id); }} onDrop={(event) => { event.stopPropagation(); onDrop(event, card.id); }} role="group" aria-label={card.title} className={cn('group relative flex flex-col rounded-ui border border-line bg-surface p-2.5 shadow-sm', !dragging && 'transition-shadow hover:shadow-md', dragged && 'opacity-40', selected && 'border-accent bg-accent-soft')}>
      <div className="flex items-start gap-2">
        {/* A 28px button wrapping a visually smaller box, so the hit area meets the
            control target floor rather than shipping a 14px target. It is not hidden
            below lg: selection has to work on touch, where there is no hover to
            reveal it. The checked box and the word Selected carry the meaning, so
            the accent fill is a convenience rather than the signal. */}
        <button
          type="button"
          role="checkbox"
          aria-checked={selected}
          aria-label={`Select ${card.title}`}
          onClick={() => onToggleSelected(card.id)}
          className="flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center"
        >
          <span
            aria-hidden="true"
            className={cn('flex h-4 w-4 items-center justify-center rounded-[4px] border', selected ? 'border-accent bg-accent' : 'border-line-strong bg-surface')}
          >
            {selected && <IconCheck size={11} stroke={2.5} className="text-accent-fg" />}
          </span>
        </button>
        <span aria-hidden="true" className="mt-0.5 hidden w-3 shrink-0 cursor-grab text-line-strong transition-colors group-hover:text-faint lg:block"><IconGripVertical size={14} stroke={1.5} /></span>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-2">
            <h3 className={cn('min-w-0 flex-1 line-clamp-2 font-body text-sm font-medium leading-5', done ? 'text-muted line-through' : 'text-ink')}>{card.title}</h3>
            <span className="flex shrink-0 items-center gap-1.5">
              {done && <IconCircleCheck size={14} stroke={1.5} aria-hidden="true" className="text-cleared" />}
              <span aria-hidden="true" className="font-mono text-[11px] tracking-wide text-faint">{tailNumber(card.id)}</span>
            </span>
          </div>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1">
            <PriorityMeter priority={card.priority} />
            {selected && <span className="font-mono text-[11px] uppercase tracking-wide text-accent">Selected</span>}
            {/* The filed date uses the same monospace treatment as the due date, so a
                card's age reads as part of the system rather than as an addition. It is
                rendered absolutely, because a relative offset is meaningless as a filing
                time — the board's relative treatment is for deadlines, not history. */}
            <span className="font-mono text-[11px] tabular-nums text-faint" title={`Filed ${formatFiledDate(card.createdAt)}`}>
              {formatFiledDate(card.createdAt)}
            </span>
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
      <div className={cn('flex items-center justify-end gap-0.5', !dragging && '[@media(hover:hover)_and_(min-width:768px)]:absolute [@media(hover:hover)_and_(min-width:768px)]:right-1.5 [@media(hover:hover)_and_(min-width:768px)]:top-1.5 [@media(hover:hover)_and_(min-width:768px)]:rounded-ui [@media(hover:hover)_and_(min-width:768px)]:border [@media(hover:hover)_and_(min-width:768px)]:border-line [@media(hover:hover)_and_(min-width:768px)]:bg-surface [@media(hover:hover)_and_(min-width:768px)]:p-0.5 [@media(hover:hover)_and_(min-width:768px)]:shadow-md', dragging ? 'pointer-events-none opacity-0' : revealControl)}>
        {moveControls.map(({ direction, label, Icon, can }) => <Button key={direction} variant="ghost" size="icon" onClick={() => onMove(card.id, direction)} disabled={!canMove[can]} aria-label={`Move ${card.title} ${label}`} title={`Move ${label}`} className="h-7 w-7 text-muted hover:text-ink"><Icon size={14} stroke={1.5} /></Button>)}
        <Button variant="ghost" size="icon" onClick={() => onEdit(card.id)} aria-label={`Edit ${card.title}`} title="Edit card" className="h-7 w-7 text-muted hover:text-ink"><IconPencil size={14} stroke={1.5} /></Button>
        <Button variant="destructive" size="icon" onClick={() => onDelete(card.id)} aria-label={`Delete ${card.title}`} title="Delete card" className="h-7 w-7"><IconTrash size={14} stroke={1.5} /></Button>
      </div>
    </motion.div>
  </>;
}
