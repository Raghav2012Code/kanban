import { motion } from 'motion/react';
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, ChevronDown, ChevronUp, GripVertical, Trash2 } from 'lucide-react';
import type { DragEvent } from 'react';
import { useMotionTransition } from '@/hooks/useMotionTransition';
import type { CardItem } from '@/types/kanban';
import { PriorityBadge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

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

const revealControl = 'opacity-100 transition-opacity [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100 [@media(hover:hover)]:focus-within:opacity-100';

const moveControls: { direction: MoveDirection; label: string; Icon: typeof ArrowUp; can: keyof Pick<KanbanCardProps, 'canMoveUp' | 'canMoveDown' | 'canMoveLeft' | 'canMoveRight'> }[] = [
  { direction: 'up', label: 'up', Icon: ArrowUp, can: 'canMoveUp' },
  { direction: 'down', label: 'down', Icon: ArrowDown, can: 'canMoveDown' },
  { direction: 'left', label: 'to the previous column', Icon: ArrowLeft, can: 'canMoveLeft' },
  { direction: 'right', label: 'to the next column', Icon: ArrowRight, can: 'canMoveRight' },
];

export function KanbanCard({ card, done, overdue, expanded, canMoveUp, canMoveDown, canMoveLeft, canMoveRight, onDelete, onToggleExpanded, onMove, onDragStart, onDragEnd, onDragOver, onDragEnter, onDragLeave, onDrop, dropIndicator }: KanbanCardProps): JSX.Element {
  const transition = useMotionTransition();
  const canMove = { canMoveUp, canMoveDown, canMoveLeft, canMoveRight };
  return <>
    {dropIndicator && <motion.div initial={{ opacity: 0, scaleY: 0.6 }} animate={{ opacity: 1, scaleY: 1 }} transition={transition} className="h-8 rounded-lg border border-dashed border-zinc-600 bg-zinc-900/40" aria-hidden="true" />}
    <motion.div layout transition={transition} whileHover={{ y: -1 }} whileTap={{ scale: 0.995 }} draggable onDragStart={(event) => onDragStart(event as unknown as DragEvent<HTMLElement>, card.id)} onDragEnd={onDragEnd} onDragOver={(event) => { event.stopPropagation(); onDragOver(event, card.id); }} onDragEnter={(event) => { event.stopPropagation(); onDragEnter(event, card.id); }} onDragLeave={onDragLeave} onDrop={(event) => { event.stopPropagation(); onDrop(event, card.id); }} role="group" aria-label={card.title} className="group relative rounded-lg border border-zinc-800 bg-zinc-900/80 p-3 transition-colors hover:border-zinc-700 focus-within:border-zinc-600">
      <div className="flex items-start gap-2"><GripVertical aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 cursor-grab text-zinc-700 transition-colors group-hover:text-zinc-500" /><div className="min-w-0 flex-1"><div className="flex items-start justify-between gap-2"><h2 className={`text-sm font-medium leading-5 ${done ? 'text-zinc-400 line-through' : 'text-zinc-100'}`}>{card.title}</h2><div className={`-mr-1 -mt-1 flex shrink-0 items-center gap-0.5 ${revealControl}`}>{moveControls.map(({ direction, label, Icon, can }) => <Button key={direction} variant="ghost" size="icon" onClick={() => onMove(card.id, direction)} disabled={!canMove[can]} aria-label={`Move ${card.title} ${label}`} className="h-6 w-6 text-zinc-500"><Icon className="h-3 w-3" /></Button>)}<Button variant="destructive" size="icon" onClick={() => onDelete(card.id)} aria-label={`Delete ${card.title}`} className="h-6 w-6"><Trash2 className="h-3.5 w-3.5" /></Button></div></div><div className="mt-2 flex flex-wrap items-center gap-2"><PriorityBadge priority={card.priority} />{card.dueDate && <span className={`text-[10px] ${overdue ? 'text-rose-400' : 'text-zinc-400'}`}>{overdue && <span className="mr-1" role="img" aria-label="Overdue">⚠️</span>}{card.dueDate}</span>}</div>{card.description && <><Button variant="ghost" size="sm" onClick={() => onToggleExpanded(card.id)} aria-expanded={expanded} className="mt-3 h-auto px-0 py-0 text-[11px] text-zinc-400 hover:bg-transparent hover:text-zinc-300">{expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />} {expanded ? 'Hide details' : 'Show details'}</Button>{expanded && <motion.p initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} transition={transition} className="mt-2 overflow-hidden text-xs leading-5 text-zinc-400">{card.description}</motion.p>}</>}</div></div>
    </motion.div>
  </>;
}
