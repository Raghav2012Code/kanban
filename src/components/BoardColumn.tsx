import { AnimatePresence, motion } from 'motion/react';
import { IconCheck, IconPlus, IconTrash, IconX } from '@tabler/icons-react';
import { Fragment, useEffect, useRef } from 'react';
import type { DragEvent, KeyboardEvent, RefObject } from 'react';
import { useMotionTransition } from '@/hooks/useMotionTransition';
import { isCardOverdue } from '@/lib/dates';
import { isDoneColumn } from '@/lib/done';
import { cn } from '@/lib/utils';
import type { CardDraft, CardItem, ColumnItem, DropTarget } from '@/types/kanban';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CardForm } from './CardForm';
import { KanbanCard } from './KanbanCard';
import type { MoveDirection } from './KanbanCard';

interface BoardColumnProps {
  column: ColumnItem;
  cards: CardItem[];
  activeForm: boolean;
  renaming: boolean;
  renameValue: string;
  draggedCardId: string | null;
  dropTarget: DropTarget | null;
  positionalEnabled: boolean;
  canMoveLeft: boolean;
  canMoveRight: boolean;
  onStartCardForm: () => void;
  onSaveCard: (draft: CardDraft) => void;
  onCancelCardForm: () => void;
  onBeginRename: () => void;
  onRenameChange: (value: string) => void;
  onSaveRename: () => void;
  onCancelRename: () => void;
  onDeleteColumn: () => void;
  onDeleteCard: (id: string) => void;
  onMove: (id: string, direction: MoveDirection) => void;
  expandedIds: Set<string>;
  onToggleExpanded: (id: string) => void;
  onDragStart: (event: DragEvent<HTMLElement>, id: string) => void;
  onDragEnd: () => void;
  onDragOver: (event: DragEvent<HTMLElement>, cardId?: string) => void;
  onDragEnter: (event: DragEvent<HTMLElement>, cardId?: string) => void;
  onDragLeave: (event: DragEvent<HTMLElement>) => void;
  onDrop: (event: DragEvent<HTMLElement>, cardId?: string) => void;
}

export function BoardColumn({ column, cards, activeForm, renaming, renameValue, draggedCardId, dropTarget, positionalEnabled, canMoveLeft, canMoveRight, onStartCardForm, onSaveCard, onCancelCardForm, onBeginRename, onRenameChange, onSaveRename, onCancelRename, onDeleteColumn, onDeleteCard, onMove, expandedIds, onToggleExpanded, onDragStart, onDragEnd, onDragOver, onDragEnter, onDragLeave, onDrop }: BoardColumnProps): JSX.Element {
  const renameRef = useRef<HTMLInputElement>(null);
  const transition = useMotionTransition();
  useEffect(() => { if (renaming) { renameRef.current?.focus(); renameRef.current?.select(); } }, [renaming]);
  const isDone = isDoneColumn(column);
  const total = column.cardIds.length;
  const showColumnDropIndicator = Boolean(draggedCardId && dropTarget?.columnId === column.id && !dropTarget.cardId);
  return <motion.section layout variants={{ hidden: { opacity: 0 }, visible: { opacity: 1 } }} initial="hidden" animate="visible" transition={transition} className="w-full min-w-0 px-4 py-3 lg:w-0 lg:min-w-[15rem] lg:flex-1 lg:px-5" onDragOver={(event) => onDragOver(event)} onDragEnter={(event) => onDragEnter(event)} onDragLeave={onDragLeave} onDrop={(event) => onDrop(event)} aria-label={`${column.title} column`}>
    <div className="flex items-center gap-2 border-b border-line pb-2">
      {renaming
        ? <Input ref={renameRef} value={renameValue} onChange={(event) => onRenameChange(event.target.value)} onBlur={onSaveRename} onKeyDown={(event: KeyboardEvent<HTMLInputElement>) => { if (event.key === 'Enter') onSaveRename(); if (event.key === 'Escape') onCancelRename(); }} aria-label="Rename column" className="h-7 min-w-0 flex-1 px-2 py-0.5 text-sm" />
        : <Button variant="ghost" onDoubleClick={onBeginRename} className="h-auto min-w-0 flex-1 justify-start px-0 py-0 font-display text-xs font-bold uppercase tracking-[0.12em] text-ink hover:bg-transparent hover:text-accent" title="Double-click to rename">{column.title}</Button>}
      <span title={`${cards.length} of ${total} cards`} className="shrink-0 font-mono text-xs tabular-nums text-muted">{cards.length}</span>
      <Button variant="destructive" size="icon" onClick={onDeleteColumn} aria-label={`Delete ${column.title} column`} title={total > 0 ? 'Only empty columns can be deleted' : 'Delete column'} className="h-7 w-7"><IconTrash size={14} stroke={1.5} /></Button>
    </div>
    <div className="py-1" onDragLeave={onDragLeave}><AnimatePresence initial={false}>{showColumnDropIndicator && <motion.div key="column-drop" initial={{ opacity: 0, scaleX: 0.6 }} animate={{ opacity: 1, scaleX: 1 }} exit={{ opacity: 0, scaleX: 0.6 }} transition={transition} className="my-1 h-0.5 rounded-full bg-accent" aria-hidden="true" />}{cards.map((card) => {
      const index = column.cardIds.indexOf(card.id);
      const canMoveUp = positionalEnabled && index > 0;
      const canMoveDown = positionalEnabled && index >= 0 && index < total - 1;
      const dropBefore = positionalEnabled && Boolean(draggedCardId && dropTarget?.columnId === column.id && dropTarget.cardId === card.id && !dropTarget.insertAfter);
      const dropAfter = positionalEnabled && dropTarget?.columnId === column.id && dropTarget.cardId === card.id && dropTarget.insertAfter;
      return <Fragment key={card.id}><KanbanCard card={card} done={isDone} overdue={isCardOverdue(card, isDone)} expanded={expandedIds.has(card.id)} canMoveUp={canMoveUp} canMoveDown={canMoveDown} canMoveLeft={canMoveLeft} canMoveRight={canMoveRight} onDelete={onDeleteCard} onToggleExpanded={onToggleExpanded} onMove={onMove} onDragStart={onDragStart} onDragEnd={onDragEnd} onDragOver={(event, id) => onDragOver(event, id)} onDragEnter={(event, id) => onDragEnter(event, id)} onDragLeave={onDragLeave} onDrop={(event, id) => onDrop(event, id)} dropIndicator={dropBefore} />{dropAfter && <motion.div initial={{ opacity: 0, scaleX: 0.6 }} animate={{ opacity: 1, scaleX: 1 }} transition={transition} className="my-1 h-0.5 rounded-full bg-accent" aria-hidden="true" />}</Fragment>;
    })}</AnimatePresence>{total === 0 && !activeForm && <p className="px-1 py-4 font-mono text-[11px] uppercase leading-5 tracking-wide text-faint">No strips in this bay. File the first card.</p>}{total > 0 && cards.length === 0 && <p className="px-1 py-4 font-mono text-[11px] uppercase leading-5 tracking-wide text-faint">No strips match the filter.</p>}</div>
    <AnimatePresence initial={false} mode="popLayout">{activeForm ? <CardForm key="form" onSave={onSaveCard} onCancel={onCancelCardForm} /> : <Button key="add" variant="outline" onClick={onStartCardForm} className={cn('mt-2 w-full justify-start border-dashed font-mono text-[11px] uppercase tracking-wide', 'text-muted')}><IconPlus size={13} stroke={1.5} /> File card</Button>}</AnimatePresence>
  </motion.section>;
}

interface AddColumnProps { value: string; inputRef: RefObject<HTMLInputElement>; onChange: (value: string) => void; onSave: () => void; onCancel: () => void; }
export function AddColumn({ value, inputRef, onChange, onSave, onCancel }: AddColumnProps): JSX.Element {
  const transition = useMotionTransition();
  useEffect(() => { inputRef.current?.focus(); }, [inputRef]);
  return <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={transition} className="w-full min-w-0 px-4 py-3 lg:w-56 lg:flex-none lg:self-stretch lg:px-5"><div className="flex gap-2"><Input ref={inputRef} value={value} onChange={(event) => onChange(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') onSave(); if (event.key === 'Escape') onCancel(); }} placeholder="Bay name" aria-label="New column name" className="h-9 min-w-0 flex-1" /><Button variant="default" size="icon" onClick={onSave} aria-label="Save column"><IconCheck size={16} stroke={1.5} /></Button><Button variant="outline" size="icon" onClick={onCancel} aria-label="Cancel adding column"><IconX size={16} stroke={1.5} /></Button></div></motion.div>;
}
