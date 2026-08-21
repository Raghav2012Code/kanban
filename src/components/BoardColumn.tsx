import { Archive, Check, Plus, Trash2, X } from 'lucide-react';
import { useEffect, useRef } from 'react';
import type { DragEvent, KeyboardEvent, RefObject } from 'react';
import type { CardDraft, CardItem, ColumnItem, DropTarget } from '../types/kanban';
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
  onDragStart: (event: DragEvent<HTMLDivElement>, id: string) => void;
  onDragEnd: () => void;
  onDragOver: (event: DragEvent<HTMLDivElement>, cardId?: string) => void;
  onDragEnter: (event: DragEvent<HTMLDivElement>, cardId?: string) => void;
  onDragLeave: (event: DragEvent<HTMLDivElement>) => void;
  onDrop: (event: DragEvent<HTMLDivElement>, cardId?: string) => void;
}

export function BoardColumn({ column, cards, activeForm, renaming, renameValue, draggedCardId, dropTarget, onStartCardForm, onSaveCard, onCancelCardForm, onBeginRename, onRenameChange, onSaveRename, onCancelRename, onDeleteColumn, onDeleteCard, expandedIds, onToggleExpanded, onDragStart, onDragEnd, onDragOver, onDragEnter, onDragLeave, onDrop }: BoardColumnProps): JSX.Element {
  const renameRef = useRef<HTMLInputElement>(null);
  useEffect(() => { if (renaming) { renameRef.current?.focus(); renameRef.current?.select(); } }, [renaming]);
  const isDone = column.title.toLowerCase() === 'done';
  const showDropIndicator = Boolean(draggedCardId && dropTarget?.columnId === column.id);
  return <section className="w-[290px] shrink-0 rounded-xl border border-zinc-800 bg-[#09090b] p-3 sm:w-[320px]" onDragOver={(event) => { if (event.target === event.currentTarget) onDragOver(event); }} onDragEnter={(event) => { if (event.target === event.currentTarget) onDragEnter(event); }} onDragLeave={onDragLeave} onDrop={(event) => { if (event.target === event.currentTarget) onDrop(event); }} aria-label={`${column.title} column`}>
    <div className="mb-3 flex items-center gap-2 px-1"><Archive className="h-4 w-4 text-zinc-600" />{renaming ? <input ref={renameRef} value={renameValue} onChange={(event) => onRenameChange(event.target.value)} onBlur={onSaveRename} onKeyDown={(event: KeyboardEvent<HTMLInputElement>) => { if (event.key === 'Enter') onSaveRename(); if (event.key === 'Escape') onCancelRename(); }} aria-label="Rename column" className="min-w-0 flex-1 rounded border border-zinc-700 bg-zinc-900 px-2 py-1 text-sm text-zinc-100 outline-none" /> : <button type="button" onDoubleClick={onBeginRename} className="flex-1 text-left text-sm font-semibold text-zinc-200 focus:outline-none focus:ring-2 focus:ring-zinc-600" title="Double-click to rename">{column.title}</button>}<span className="rounded bg-zinc-900 px-1.5 py-0.5 text-[10px] text-zinc-600">{column.cardIds.length}</span><button type="button" onClick={onDeleteColumn} disabled={column.cardIds.length > 0} aria-label={`Delete ${column.title} column`} title={column.cardIds.length > 0 ? 'Only empty columns can be deleted' : 'Delete column'} className="rounded p-1 text-zinc-700 transition hover:bg-zinc-900 hover:text-rose-400 focus:outline-none focus:ring-2 focus:ring-zinc-600 disabled:cursor-not-allowed disabled:opacity-30"><Trash2 className="h-3.5 w-3.5" /></button></div>
    <div className="space-y-2" onDragLeave={onDragLeave}>{cards.map((card) => <KanbanCard key={card.id} card={card} done={isDone} expanded={expandedIds.has(card.id)} onDelete={onDeleteCard} onToggleExpanded={onToggleExpanded} onDragStart={onDragStart} onDragEnd={onDragEnd} onDragOver={(event, id) => onDragOver(event, id)} onDragEnter={(event, id) => onDragEnter(event, id)} onDragLeave={onDragLeave} onDrop={(event, id) => onDrop(event, id)} />)}{showDropIndicator && <div className="h-8 rounded-lg border border-dashed border-zinc-600 bg-zinc-900/40" aria-hidden="true" />}</div>
    {activeForm ? <div className="mt-3"><CardForm onSave={onSaveCard} onCancel={onCancelCardForm} /></div> : <button type="button" onClick={onStartCardForm} className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-md border border-dashed border-zinc-800 py-2 text-xs text-zinc-600 transition hover:border-zinc-700 hover:bg-zinc-900 hover:text-zinc-300 focus:outline-none focus:ring-2 focus:ring-zinc-600"><Plus className="h-3.5 w-3.5" /> Add card</button>}
  </section>;
}

interface AddColumnProps { value: string; inputRef: RefObject<HTMLInputElement>; onChange: (value: string) => void; onSave: () => void; onCancel: () => void; }
export function AddColumn({ value, inputRef, onChange, onSave, onCancel }: AddColumnProps): JSX.Element {
  useEffect(() => { inputRef.current?.focus(); }, [inputRef]);
  return <div className="w-[290px] shrink-0 rounded-xl border border-zinc-800 bg-[#09090b] p-3 sm:w-[320px]"><div className="flex gap-2"><input ref={inputRef} value={value} onChange={(event) => onChange(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') onSave(); if (event.key === 'Escape') onCancel(); }} placeholder="Column name" aria-label="New column name" className="min-w-0 flex-1 rounded border border-zinc-800 bg-zinc-900 px-2.5 py-2 text-sm text-zinc-200 outline-none focus:border-zinc-500" /><button type="button" onClick={onSave} aria-label="Save column" className="rounded bg-zinc-100 px-2 text-zinc-950 hover:bg-white"><Check className="h-4 w-4" /></button><button type="button" onClick={onCancel} aria-label="Cancel adding column" className="rounded border border-zinc-800 px-2 text-zinc-500 hover:text-zinc-200"><X className="h-4 w-4" /></button></div></div>;
}
