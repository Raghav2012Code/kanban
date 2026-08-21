import { ChevronDown, ChevronUp, GripVertical, Trash2 } from 'lucide-react';
import type { DragEvent } from 'react';
import { isOverdue, localDateString } from '../lib/dates';
import type { CardItem } from '../types/kanban';
import { PriorityBadge } from './PriorityBadge';

interface KanbanCardProps {
  card: CardItem;
  done: boolean;
  expanded: boolean;
  onDelete: (id: string) => void;
  onToggleExpanded: (id: string) => void;
  onDragStart: (event: DragEvent<HTMLElement>, id: string) => void;
  onDragEnd: () => void;
  onDragOver: (event: DragEvent<HTMLElement>, id: string) => void;
  onDragEnter: (event: DragEvent<HTMLElement>, id: string) => void;
  onDragLeave: (event: DragEvent<HTMLElement>) => void;
  onDrop: (event: DragEvent<HTMLElement>, id: string) => void;
  dropIndicator: boolean;
}

export function KanbanCard({ card, done, expanded, onDelete, onToggleExpanded, onDragStart, onDragEnd, onDragOver, onDragEnter, onDragLeave, onDrop, dropIndicator }: KanbanCardProps): JSX.Element {
  const overdue = isOverdue(card, localDateString());
  return <>
    {dropIndicator && <div className="h-8 rounded-lg border border-dashed border-zinc-600 bg-zinc-900/40" aria-hidden="true" />}
    <div draggable onDragStart={(event) => onDragStart(event, card.id)} onDragEnd={onDragEnd} onDragOver={(event) => { event.stopPropagation(); onDragOver(event, card.id); }} onDragEnter={(event) => { event.stopPropagation(); onDragEnter(event, card.id); }} onDragLeave={onDragLeave} onDrop={(event) => { event.stopPropagation(); onDrop(event, card.id); }} className="group relative rounded-lg border border-zinc-800 bg-zinc-900/80 p-3 transition hover:border-zinc-700 focus-within:border-zinc-600">
    <div className="flex items-start gap-2"><GripVertical aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 cursor-grab text-zinc-700 transition group-hover:text-zinc-500" /><div className="min-w-0 flex-1"><div className="flex items-start justify-between gap-2"><h2 className={`text-sm font-medium leading-5 ${done ? 'text-zinc-400 line-through' : 'text-zinc-100'}`}>{card.title}</h2><button type="button" onClick={() => onDelete(card.id)} aria-label={`Delete ${card.title}`} className="-mr-1 -mt-1 rounded p-1 text-zinc-600 opacity-0 transition hover:bg-zinc-800 hover:text-rose-400 focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-zinc-500 group-hover:opacity-100"><Trash2 className="h-3.5 w-3.5" /></button></div><div className="mt-2 flex flex-wrap items-center gap-2"><PriorityBadge priority={card.priority} />{card.dueDate && <span className={`text-[10px] ${overdue ? 'text-rose-400' : 'text-zinc-400'}`}>{overdue && <span className="mr-1" role="img" aria-label="Overdue">⚠️</span>}{card.dueDate}</span>}</div>{card.description && <><button type="button" onClick={() => onToggleExpanded(card.id)} aria-expanded={expanded} className="mt-3 flex items-center gap-1 text-[11px] text-zinc-400 transition hover:text-zinc-300 focus:outline-none focus:ring-2 focus:ring-zinc-600">{expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />} {expanded ? 'Hide details' : 'Show details'}</button>{expanded && <p className="mt-2 text-xs leading-5 text-zinc-400">{card.description}</p>}</>}</div></div>
    </div>
  </>;
}
