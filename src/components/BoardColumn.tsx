import { AnimatePresence, motion } from 'motion/react';
import { Archive, Check, Plus, Trash2, X } from 'lucide-react';
import { Fragment, useEffect, useRef } from 'react';
import type { DragEvent, KeyboardEvent, RefObject } from 'react';
import { motionTransition } from '@/lib/motion';
import type { CardDraft, CardItem, ColumnItem, DropTarget } from '@/types/kanban';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CardForm } from './CardForm';
import { KanbanCard } from './KanbanCard';

interface BoardColumnProps {
  column: ColumnItem;
  cards: CardItem[];
  activeForm: boolean;
  renaming: boolean;
  renameValue: string;
  draggedCardId: string | null;
  dropTarget: DropTarget | null;
  onStartCardForm: () => void;
  onSaveCard: (draft: CardDraft) => void;
  onCancelCardForm: () => void;
  onBeginRename: () => void;
  onRenameChange: (value: string) => void;
  onSaveRename: () => void;
  onCancelRename: () => void;
  onDeleteColumn: () => void;
  onDeleteCard: (id: string) => void;
  expandedIds: Set<string>;
  onToggleExpanded: (id: string) => void;
  onDragStart: (event: DragEvent<HTMLElement>, id: string) => void;
  onDragEnd: () => void;
  onDragOver: (event: DragEvent<HTMLElement>, cardId?: string) => void;
  onDragEnter: (event: DragEvent<HTMLElement>, cardId?: string) => void;
  onDragLeave: (event: DragEvent<HTMLElement>) => void;
  onDrop: (event: DragEvent<HTMLElement>, cardId?: string) => void;
}

export function BoardColumn({ column, cards, activeForm, renaming, renameValue, draggedCardId, dropTarget, onStartCardForm, onSaveCard, onCancelCardForm, onBeginRename, onRenameChange, onSaveRename, onCancelRename, onDeleteColumn, onDeleteCard, expandedIds, onToggleExpanded, onDragStart, onDragEnd, onDragOver, onDragEnter, onDragLeave, onDrop }: BoardColumnProps): JSX.Element {
  const renameRef = useRef<HTMLInputElement>(null);
  useEffect(() => { if (renaming) { renameRef.current?.focus(); renameRef.current?.select(); } }, [renaming]);
  const isDone = column.title.toLowerCase() === 'done';
  const showColumnDropIndicator = Boolean(draggedCardId && dropTarget?.columnId === column.id && !dropTarget.cardId);
  return <motion.section layout variants={{ hidden: { opacity: 0, y: 14 }, visible: { opacity: 1, y: 0 } }} initial="hidden" animate="visible" transition={motionTransition} className="w-full min-w-0 shrink-0 rounded-xl border border-zinc-800 bg-[#09090b] p-3 lg:w-0 lg:min-w-0 lg:flex-1" onDragOver={(event) => onDragOver(event)} onDragEnter={(event) => onDragEnter(event)} onDragLeave={onDragLeave} onDrop={(event) => onDrop(event)} aria-label={`${column.title} column`}>
    <div className="mb-3 flex items-center gap-2 px-1"><Archive className="h-4 w-4 text-zinc-600" />{renaming ? <Input ref={renameRef} value={renameValue} onChange={(event) => onRenameChange(event.target.value)} onBlur={onSaveRename} onKeyDown={(event: KeyboardEvent<HTMLInputElement>) => { if (event.key === 'Enter') onSaveRename(); if (event.key === 'Escape') onCancelRename(); }} aria-label="Rename column" className="h-8 min-w-0 flex-1 px-2 py-1 text-sm" /> : <Button variant="ghost" onDoubleClick={onBeginRename} className="h-auto flex-1 justify-start px-0 py-0 text-sm font-semibold text-zinc-200 hover:bg-transparent hover:text-zinc-50" title="Double-click to rename">{column.title}</Button>}<span className="rounded bg-zinc-900 px-1.5 py-0.5 text-[10px] text-zinc-400">{column.cardIds.length}</span><Button variant="destructive" size="icon" onClick={onDeleteColumn} disabled={column.cardIds.length > 0} aria-label={`Delete ${column.title} column`} title={column.cardIds.length > 0 ? 'Only empty columns can be deleted' : 'Delete column'}><Trash2 className="h-3.5 w-3.5" /></Button></div>
    <div className="space-y-2" onDragLeave={onDragLeave}><AnimatePresence initial={false}>{showColumnDropIndicator && <motion.div key="column-drop" initial={{ opacity: 0, scaleY: 0.6 }} animate={{ opacity: 1, scaleY: 1 }} exit={{ opacity: 0, scaleY: 0.6 }} transition={motionTransition} className="h-8 rounded-lg border border-dashed border-zinc-600 bg-zinc-900/40" aria-hidden="true" />}{cards.map((card) => <Fragment key={card.id}><KanbanCard card={card} done={isDone} expanded={expandedIds.has(card.id)} onDelete={onDeleteCard} onToggleExpanded={onToggleExpanded} onDragStart={onDragStart} onDragEnd={onDragEnd} onDragOver={(event, id) => onDragOver(event, id)} onDragEnter={(event, id) => onDragEnter(event, id)} onDragLeave={onDragLeave} onDrop={(event, id) => onDrop(event, id)} dropIndicator={Boolean(draggedCardId && dropTarget?.columnId === column.id && dropTarget.cardId === card.id && !dropTarget.insertAfter)} />{dropTarget?.columnId === column.id && dropTarget.cardId === card.id && dropTarget.insertAfter && <motion.div initial={{ opacity: 0, scaleY: 0.6 }} animate={{ opacity: 1, scaleY: 1 }} transition={motionTransition} className="h-8 rounded-lg border border-dashed border-zinc-600 bg-zinc-900/40" aria-hidden="true" />}</Fragment>)}</AnimatePresence></div>
    <AnimatePresence initial={false} mode="popLayout">{activeForm ? <CardForm key="form" onSave={onSaveCard} onCancel={onCancelCardForm} /> : <Button key="add" variant="outline" onClick={onStartCardForm} className="mt-3 w-full border-dashed text-zinc-400"><Plus className="h-3.5 w-3.5" /> Add card</Button>}</AnimatePresence>
  </motion.section>;
}

interface AddColumnProps { value: string; inputRef: RefObject<HTMLInputElement>; onChange: (value: string) => void; onSave: () => void; onCancel: () => void; }
export function AddColumn({ value, inputRef, onChange, onSave, onCancel }: AddColumnProps): JSX.Element {
  useEffect(() => { inputRef.current?.focus(); }, [inputRef]);
  return <motion.div initial={{ opacity: 0, scale: 0.98, y: 8 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.98, y: 8 }} transition={motionTransition} className="w-full min-w-0 shrink-0 rounded-xl border border-zinc-800 bg-[#09090b] p-3 lg:w-0 lg:min-w-0 lg:flex-1"><div className="flex gap-2"><Input ref={inputRef} value={value} onChange={(event) => onChange(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') onSave(); if (event.key === 'Escape') onCancel(); }} placeholder="Column name" aria-label="New column name" className="h-10 min-w-0 flex-1" /><Button variant="default" size="icon" onClick={onSave} aria-label="Save column"><Check className="h-4 w-4" /></Button><Button variant="outline" size="icon" onClick={onCancel} aria-label="Cancel adding column"><X className="h-4 w-4" /></Button></div></motion.div>;
}
