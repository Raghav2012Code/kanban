import { useEffect, useMemo, useRef, useState } from 'react';
import type { DragEvent, FormEvent, KeyboardEvent } from 'react';
import {
  Archive,
  Check,
  ChevronDown,
  ChevronUp,
  CirclePlus,
  ClipboardList,
  GripVertical,
  LayoutPanelTop,
  Plus,
  Search,
  Trash2,
  X,
} from 'lucide-react';

export type Priority = 'low' | 'medium' | 'high';

export interface CardItem {
  id: string;
  title: string;
  description?: string;
  priority: Priority;
  dueDate?: string;
  createdAt: number;
}

export interface ColumnItem {
  id: string;
  title: string;
  cardIds: string[];
}

export interface BoardState {
  columns: ColumnItem[];
  cards: Record<string, CardItem>;
}

const STORAGE_KEY = 'noir_kanban_state';
const priorities: Priority[] = ['low', 'medium', 'high'];
let idSequence = 0;

type PriorityFilter = 'all' | Priority;
type DropTarget = { columnId: string; cardId?: string };

type Draft = {
  title: string;
  priority: Priority;
  dueDate: string;
  description: string;
};

const priorityStyles: Record<Priority, { badge: string; dot: string; label: string }> = {
  low: { badge: 'border-emerald-900/80 bg-emerald-950/50 text-emerald-400', dot: 'bg-emerald-400', label: 'Low' },
  medium: { badge: 'border-amber-900/80 bg-amber-950/50 text-amber-400', dot: 'bg-amber-400', label: 'Medium' },
  high: { badge: 'border-rose-900/80 bg-rose-950/50 text-rose-400', dot: 'bg-rose-400', label: 'High' },
};

function makeId(prefix: string): string {
  idSequence += 1;
  return `${prefix}-${Date.now().toString(36)}-${idSequence.toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function localDateString(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function isValidDateString(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
}

function isValidBoard(value: unknown): value is BoardState {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as { columns?: unknown; cards?: unknown };
  if (!Array.isArray(candidate.columns) || !candidate.cards || typeof candidate.cards !== 'object' || Array.isArray(candidate.cards)) return false;

  const columns = candidate.columns as unknown[];
  const cards = candidate.cards as Record<string, unknown>;
  const columnIds = new Set<string>();
  const referencedCards = new Set<string>();

  for (const column of columns) {
    if (!column || typeof column !== 'object') return false;
    const item = column as { id?: unknown; title?: unknown; cardIds?: unknown };
    if (typeof item.id !== 'string' || !item.id.trim() || columnIds.has(item.id) || typeof item.title !== 'string' || !item.title.trim() || !Array.isArray(item.cardIds)) return false;
    columnIds.add(item.id);
    for (const cardId of item.cardIds) {
      if (typeof cardId !== 'string' || !cards[cardId] || referencedCards.has(cardId)) return false;
      referencedCards.add(cardId);
    }
  }

  for (const [id, card] of Object.entries(cards)) {
    if (!card || typeof card !== 'object') return false;
    const item = card as { id?: unknown; title?: unknown; priority?: unknown; dueDate?: unknown; description?: unknown; createdAt?: unknown };
    if (item.id !== id || typeof item.title !== 'string' || !item.title.trim() || !priorities.includes(item.priority as Priority) || typeof item.createdAt !== 'number' || !Number.isFinite(item.createdAt) || (item.description !== undefined && typeof item.description !== 'string') || (item.dueDate !== undefined && !isValidDateString(item.dueDate))) return false;
    if (!referencedCards.has(id)) return false;
  }
  return true;
}

function createSeedState(): BoardState {
  const cards: Record<string, CardItem> = {
    'card-research': { id: 'card-research', title: 'Research personal finance apps', description: 'Compare budgeting workflows and capture the three most useful patterns.', priority: 'medium', dueDate: '2026-08-18', createdAt: 1723987200000 },
    'card-groceries': { id: 'card-groceries', title: 'Plan weekly groceries', description: 'Build a simple meal plan before the weekend shopping trip.', priority: 'low', dueDate: localDateString(), createdAt: 1724073600000 },
    'card-portfolio': { id: 'card-portfolio', title: 'Refresh portfolio case study', description: 'Replace old screenshots and tighten the outcome section.', priority: 'high', dueDate: '2026-08-26', createdAt: 1724160000000 },
    'card-dentist': { id: 'card-dentist', title: 'Book dentist appointment', priority: 'high', dueDate: '2026-08-22', createdAt: 1724246400000 },
    'card-backup': { id: 'card-backup', title: 'Set up photo backup', description: 'Choose a provider and configure automatic mobile uploads.', priority: 'medium', dueDate: '2026-08-29', createdAt: 1724332800000 },
    'card-books': { id: 'card-books', title: 'Organize reading list', priority: 'low', createdAt: 1724419200000 },
    'card-laundry': { id: 'card-laundry', title: 'Prepare laundry schedule', priority: 'low', createdAt: 1724505600000 },
    'card-tax': { id: 'card-tax', title: 'Archive tax documents', description: 'Move receipts and statements into the annual archive folder.', priority: 'medium', createdAt: 1724592000000 },
  };
  return {
    cards,
    columns: [
      { id: 'column-backlog', title: 'Backlog', cardIds: ['card-research', 'card-backup'] },
      { id: 'column-todo', title: 'To Do', cardIds: ['card-groceries', 'card-dentist', 'card-books'] },
      { id: 'column-progress', title: 'In Progress', cardIds: ['card-portfolio', 'card-laundry'] },
      { id: 'column-done', title: 'Done', cardIds: ['card-tax'] },
    ],
  };
}

function loadBoardState(): BoardState {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed: unknown = JSON.parse(stored);
      if (isValidBoard(parsed)) return parsed;
    }
  } catch {
  }
  return createSeedState();
}

function isOverdue(card: CardItem, today: string): boolean {
  return Boolean(card.dueDate && card.dueDate < today);
}

function moveCard(state: BoardState, cardId: string, targetColumnId: string, targetCardId?: string): BoardState {
  const sourceColumn = state.columns.find((column) => column.cardIds.includes(cardId));
  const targetColumn = state.columns.find((column) => column.id === targetColumnId);
  if (!sourceColumn || !targetColumn || (targetCardId && targetCardId === cardId)) return state;

  const sourceIds = sourceColumn.cardIds.filter((id) => id !== cardId);
  const targetIds = targetColumn.id === sourceColumn.id ? sourceIds.slice() : targetColumn.cardIds.filter((id) => id !== cardId);
  let insertAt = targetIds.length;
  if (targetCardId) {
    const targetIndex = targetIds.indexOf(targetCardId);
    if (targetIndex >= 0) insertAt = targetIndex;
  }
  targetIds.splice(insertAt, 0, cardId);

  return {
    ...state,
    columns: state.columns.map((column) => {
      if (column.id === sourceColumn.id && column.id === targetColumn.id) return { ...column, cardIds: targetIds };
      if (column.id === sourceColumn.id) return { ...column, cardIds: sourceIds };
      if (column.id === targetColumn.id) return { ...column, cardIds: targetIds };
      return column;
    }),
  };
}

function PriorityBadge({ priority }: { priority: Priority }): JSX.Element {
  const style = priorityStyles[priority];
  return <span className={`inline-flex items-center gap-1.5 rounded border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider ${style.badge}`}><span className={`h-1.5 w-1.5 rounded-full ${style.dot}`} />{style.label}</span>;
}

function CardForm({ initial, onSave, onCancel }: { initial?: Draft; onSave: (draft: Draft) => void; onCancel: () => void }): JSX.Element {
  const [draft, setDraft] = useState<Draft>(initial ?? { title: '', priority: 'medium', dueDate: '', description: '' });
  const titleRef = useRef<HTMLInputElement>(null);
  useEffect(() => { titleRef.current?.focus(); }, []);
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (draft.title.trim()) onSave({ ...draft, title: draft.title.trim(), description: draft.description.trim() });
  };
  return <form onSubmit={submit} className="space-y-3 rounded-lg border border-zinc-800 bg-zinc-950 p-3" onKeyDown={(event: KeyboardEvent<HTMLFormElement>) => { if (event.key === 'Escape') onCancel(); }}>
    <input ref={titleRef} value={draft.title} onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))} placeholder="Card title" aria-label="Card title" className="w-full rounded border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-50 outline-none transition placeholder:text-zinc-600 focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500" />
    <div className="grid grid-cols-2 gap-2">
      <select value={draft.priority} onChange={(event) => setDraft((current) => ({ ...current, priority: event.target.value as Priority }))} aria-label="Priority" className="rounded border border-zinc-800 bg-zinc-900 px-2 py-2 text-xs text-zinc-300 outline-none focus:border-zinc-500"><option value="low">Low priority</option><option value="medium">Medium priority</option><option value="high">High priority</option></select>
      <input type="date" value={draft.dueDate} onChange={(event) => setDraft((current) => ({ ...current, dueDate: event.target.value }))} aria-label="Due date" className="min-w-0 rounded border border-zinc-800 bg-zinc-900 px-2 py-2 text-xs text-zinc-300 outline-none focus:border-zinc-500" />
    </div>
    <textarea value={draft.description} onChange={(event) => setDraft((current) => ({ ...current, description: event.target.value }))} placeholder="Description (optional)" aria-label="Description" rows={3} className="w-full resize-none rounded border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs text-zinc-300 outline-none placeholder:text-zinc-600 focus:border-zinc-500" />
    <div className="flex justify-end gap-2"><button type="button" onClick={onCancel} className="rounded px-2.5 py-1.5 text-xs text-zinc-500 transition hover:bg-zinc-900 hover:text-zinc-300 focus:outline-none focus:ring-2 focus:ring-zinc-500">Cancel</button><button type="submit" className="rounded bg-zinc-100 px-3 py-1.5 text-xs font-medium text-zinc-950 transition hover:bg-white focus:outline-none focus:ring-2 focus:ring-zinc-400">Save card</button></div>
  </form>;
}

function KanbanCard({ card, done, visibleCardIds, onDelete, onToggleExpanded, expanded, onDragStart, onDragEnd, onDrop, onDragOver }: { card: CardItem; done: boolean; visibleCardIds: string[]; onDelete: (id: string) => void; onToggleExpanded: (id: string) => void; expanded: boolean; onDragStart: (event: DragEvent<HTMLDivElement>, id: string) => void; onDragEnd: () => void; onDrop: (event: DragEvent<HTMLDivElement>, cardId: string) => void; onDragOver: (event: DragEvent<HTMLDivElement>, cardId: string) => void }): JSX.Element {
  const today = localDateString();
  const overdue = isOverdue(card, today);
  return <div draggable onDragStart={(event) => onDragStart(event, card.id)} onDragEnd={onDragEnd} onDragOver={(event) => onDragOver(event, card.id)} onDrop={(event) => onDrop(event, card.id)} className="group relative rounded-lg border border-zinc-800 bg-zinc-900/80 p-3 transition hover:border-zinc-700 focus-within:border-zinc-600">
    <div className="flex items-start gap-2"><GripVertical aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 cursor-grab text-zinc-700 transition group-hover:text-zinc-500" /><div className="min-w-0 flex-1"><div className="flex items-start justify-between gap-2"><h3 className={`text-sm font-medium leading-5 ${done ? 'text-zinc-600 line-through' : 'text-zinc-100'}`}>{card.title}</h3><button type="button" onClick={() => onDelete(card.id)} aria-label={`Delete ${card.title}`} className="-mr-1 -mt-1 rounded p-1 text-zinc-600 opacity-0 transition hover:bg-zinc-800 hover:text-rose-400 focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-zinc-500 group-hover:opacity-100"><Trash2 className="h-3.5 w-3.5" /></button></div><div className="mt-2 flex flex-wrap items-center gap-2"><PriorityBadge priority={card.priority} />{card.dueDate && <span className={`text-[10px] ${overdue ? 'text-rose-400' : 'text-zinc-500'}`}>{overdue && <span className="mr-1" aria-label="Overdue">⚠️</span>}{card.dueDate}</span>}</div>{card.description && <><button type="button" onClick={() => onToggleExpanded(card.id)} aria-expanded={expanded} className="mt-3 flex items-center gap-1 text-[11px] text-zinc-500 transition hover:text-zinc-300 focus:outline-none focus:ring-2 focus:ring-zinc-600">{expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />} {expanded ? 'Hide details' : 'Show details'}</button>{expanded && <p className="mt-2 text-xs leading-5 text-zinc-500">{card.description}</p>}</>}</div></div>
    {visibleCardIds.includes(card.id) && <span className="sr-only">Draggable card</span>}
  </div>;
}

export default function KanbanBoard(): JSX.Element {
  const [board, setBoard] = useState<BoardState>(loadBoardState);
  const [search, setSearch] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>('all');
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());
  const [activeFormColumn, setActiveFormColumn] = useState<string | null>(null);
  const [addingColumn, setAddingColumn] = useState(false);
  const [newColumnTitle, setNewColumnTitle] = useState('');
  const [renamingColumn, setRenamingColumn] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [draggedCardId, setDraggedCardId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<DropTarget | null>(null);
  const newColumnRef = useRef<HTMLInputElement>(null);
  const renameRef = useRef<HTMLInputElement>(null);

  useEffect(() => { try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(board)); } catch { } }, [board]);
  useEffect(() => { if (addingColumn) newColumnRef.current?.focus(); }, [addingColumn]);
  useEffect(() => { if (renamingColumn) { renameRef.current?.focus(); renameRef.current?.select(); } }, [renamingColumn]);

  const visibleByColumn = useMemo(() => {
    const query = search.trim().toLowerCase();
    const result: Record<string, string[]> = {};
    for (const column of board.columns) result[column.id] = column.cardIds.filter((id) => { const card = board.cards[id]; return Boolean(card && (!query || card.title.toLowerCase().includes(query)) && (priorityFilter === 'all' || card.priority === priorityFilter)); });
    return result;
  }, [board, priorityFilter, search]);

  const analytics = useMemo(() => {
    const cards = Object.values(board.cards);
    const doneColumn = board.columns.find((column) => column.id === 'column-done' || column.title.toLowerCase() === 'done');
    const done = doneColumn ? doneColumn.cardIds.filter((id) => board.cards[id]).length : 0;
    const overdue = cards.filter((card) => isOverdue(card, localDateString())).length;
    return { total: cards.length, done, overdue, completion: cards.length ? Math.round((done / cards.length) * 100) : 0 };
  }, [board]);

  const updateBoard = (updater: (current: BoardState) => BoardState) => setBoard(updater);
  const saveColumn = () => { const title = newColumnTitle.trim(); if (!title) return; updateBoard((current) => ({ ...current, columns: [...current.columns, { id: makeId('column'), title, cardIds: [] }] })); setNewColumnTitle(''); setAddingColumn(false); };
  const saveRename = () => { if (!renamingColumn) return; const title = renameValue.trim(); if (title) updateBoard((current) => ({ ...current, columns: current.columns.map((column) => column.id === renamingColumn ? { ...column, title } : column) })); setRenamingColumn(null); setRenameValue(''); };
  const deleteCard = (cardId: string) => updateBoard((current) => { const nextCards = { ...current.cards }; delete nextCards[cardId]; return { cards: nextCards, columns: current.columns.map((column) => ({ ...column, cardIds: column.cardIds.filter((id) => id !== cardId) })) }; });
  const addCard = (columnId: string, draft: Draft) => { const card: CardItem = { id: makeId('card'), title: draft.title.trim(), priority: draft.priority, createdAt: Date.now(), ...(draft.description.trim() ? { description: draft.description.trim() } : {}), ...(draft.dueDate ? { dueDate: draft.dueDate } : {}) }; updateBoard((current) => ({ cards: { ...current.cards, [card.id]: card }, columns: current.columns.map((column) => column.id === columnId ? { ...column, cardIds: [...column.cardIds, card.id] } : column) })); setActiveFormColumn(null); };
  const beginRename = (column: ColumnItem) => { setRenamingColumn(column.id); setRenameValue(column.title); setActiveFormColumn(null); };
  const handleDragStart = (event: DragEvent<HTMLDivElement>, cardId: string) => { event.dataTransfer.effectAllowed = 'move'; event.dataTransfer.setData('text/plain', cardId); setDraggedCardId(cardId); };
  const clearDrag = () => { setDraggedCardId(null); setDropTarget(null); };
  const handleDragOver = (event: DragEvent<HTMLDivElement>, columnId: string, cardId?: string) => { event.preventDefault(); event.dataTransfer.dropEffect = 'move'; setDropTarget((current) => current?.columnId === columnId && current.cardId === cardId ? current : { columnId, cardId }); };
  const handleDragLeave = (event: DragEvent<HTMLDivElement>) => { const related = event.relatedTarget; if (!(related instanceof Node) || !event.currentTarget.contains(related)) setDropTarget(null); };
  const handleDrop = (event: DragEvent<HTMLDivElement>, columnId: string, cardId?: string) => { event.preventDefault(); const id = event.dataTransfer.getData('text/plain'); if (id && board.cards[id]) updateBoard((current) => moveCard(current, id, columnId, cardId)); clearDrag(); };

  return <div className="min-h-screen bg-black pb-16 text-zinc-50 selection:bg-zinc-700/60">
    <header className="border-b border-zinc-800 bg-[#09090b] px-4 py-5 sm:px-6 lg:px-10"><div className="mx-auto flex max-w-[1600px] flex-col gap-5 lg:flex-row lg:items-end lg:justify-between"><div><div className="mb-2 flex items-center gap-2 text-zinc-500"><LayoutPanelTop className="h-4 w-4" /><span className="text-[10px] font-semibold uppercase tracking-[0.25em]">Personal workspace</span></div><h1 className="text-2xl font-semibold tracking-tight text-zinc-50 sm:text-3xl">Noir Board</h1><p className="mt-1 text-sm text-zinc-500">A quiet system for moving important work forward.</p></div><div className="flex flex-col gap-2 sm:flex-row"><label className="relative"><Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-zinc-600" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search cards" aria-label="Search cards" className="w-full rounded-md border border-zinc-800 bg-zinc-950 py-2 pl-9 pr-3 text-sm text-zinc-200 outline-none transition placeholder:text-zinc-600 focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500 sm:w-56" /></label><select value={priorityFilter} onChange={(event) => setPriorityFilter(event.target.value as PriorityFilter)} aria-label="Filter by priority" className="rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-400 outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500"><option value="all">All priorities</option><option value="low">Low priority</option><option value="medium">Medium priority</option><option value="high">High priority</option></select></div></div></header>
    <main className="mx-auto max-w-[1600px] px-4 py-6 sm:px-6 lg:px-10"><div className="flex min-w-max items-start gap-4 overflow-x-auto pb-5" onDragLeave={handleDragLeave}>{board.columns.map((column) => <section key={column.id} className="w-[290px] shrink-0 rounded-xl border border-zinc-800 bg-[#09090b] p-3 sm:w-[320px]" onDragOver={(event) => handleDragOver(event, column.id)} onDragEnter={(event) => handleDragOver(event, column.id)} onDragLeave={handleDragLeave} onDrop={(event) => handleDrop(event, column.id)} aria-label={`${column.title} column`}><div className="mb-3 flex items-center gap-2 px-1"><Archive className="h-4 w-4 text-zinc-600" />{renamingColumn === column.id ? <input ref={renameRef} value={renameValue} onChange={(event) => setRenameValue(event.target.value)} onBlur={saveRename} onKeyDown={(event) => { if (event.key === 'Enter') saveRename(); if (event.key === 'Escape') setRenamingColumn(null); }} aria-label="Rename column" className="min-w-0 flex-1 rounded border border-zinc-700 bg-zinc-900 px-2 py-1 text-sm text-zinc-100 outline-none" /> : <button type="button" onDoubleClick={() => beginRename(column)} className="flex-1 text-left text-sm font-semibold text-zinc-200 focus:outline-none focus:ring-2 focus:ring-zinc-600" title="Double-click to rename">{column.title}</button>}<span className="rounded bg-zinc-900 px-1.5 py-0.5 text-[10px] text-zinc-600">{column.cardIds.length}</span><button type="button" onClick={() => column.cardIds.length === 0 && updateBoard((current) => ({ ...current, columns: current.columns.filter((item) => item.id !== column.id) }))} disabled={column.cardIds.length > 0} aria-label={`Delete ${column.title} column`} title={column.cardIds.length > 0 ? 'Only empty columns can be deleted' : 'Delete column'} className="rounded p-1 text-zinc-700 transition hover:bg-zinc-900 hover:text-rose-400 focus:outline-none focus:ring-2 focus:ring-zinc-600 disabled:cursor-not-allowed disabled:opacity-30"><Trash2 className="h-3.5 w-3.5" /></button></div><div className="space-y-2" onDragLeave={handleDragLeave}>{visibleByColumn[column.id].map((cardId) => { const card = board.cards[cardId]; return card ? <KanbanCard key={card.id} card={card} done={column.title.toLowerCase() === 'done'} visibleCardIds={visibleByColumn[column.id]} expanded={expanded.has(card.id)} onToggleExpanded={(id) => setExpanded((current) => { const next = new Set(current); if (next.has(id)) next.delete(id); else next.add(id); return next; })} onDelete={deleteCard} onDragStart={handleDragStart} onDragEnd={clearDrag} onDragOver={(event, id) => handleDragOver(event, column.id, id)} onDrop={(event, id) => handleDrop(event, column.id, id)} /> : null; })}{draggedCardId && dropTarget?.columnId === column.id && <div className="h-8 rounded-lg border border-dashed border-zinc-600 bg-zinc-900/40" aria-hidden="true" />}</div>{activeFormColumn === column.id ? <div className="mt-3"><CardForm onSave={(draft) => addCard(column.id, draft)} onCancel={() => setActiveFormColumn(null)} /></div> : <button type="button" onClick={() => { setActiveFormColumn(column.id); setAddingColumn(false); }} className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-md border border-dashed border-zinc-800 py-2 text-xs text-zinc-600 transition hover:border-zinc-700 hover:bg-zinc-900 hover:text-zinc-300 focus:outline-none focus:ring-2 focus:ring-zinc-600"><Plus className="h-3.5 w-3.5" /> Add card</button>}</section>)}{addingColumn ? <div className="w-[290px] shrink-0 rounded-xl border border-zinc-800 bg-[#09090b] p-3 sm:w-[320px]"><div className="flex gap-2"><input ref={newColumnRef} value={newColumnTitle} onChange={(event) => setNewColumnTitle(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') saveColumn(); if (event.key === 'Escape') { setAddingColumn(false); setNewColumnTitle(''); } }} placeholder="Column name" aria-label="New column name" className="min-w-0 flex-1 rounded border border-zinc-800 bg-zinc-900 px-2.5 py-2 text-sm text-zinc-200 outline-none focus:border-zinc-500" /><button type="button" onClick={saveColumn} aria-label="Save column" className="rounded bg-zinc-100 px-2 text-zinc-950 hover:bg-white"><Check className="h-4 w-4" /></button><button type="button" onClick={() => { setAddingColumn(false); setNewColumnTitle(''); }} aria-label="Cancel adding column" className="rounded border border-zinc-800 px-2 text-zinc-500 hover:text-zinc-200"><X className="h-4 w-4" /></button></div></div> : <button type="button" onClick={() => { setAddingColumn(true); setActiveFormColumn(null); }} className="flex h-12 w-[290px] shrink-0 items-center justify-center gap-2 rounded-xl border border-dashed border-zinc-800 text-xs text-zinc-600 transition hover:border-zinc-700 hover:bg-zinc-950 hover:text-zinc-300 focus:outline-none focus:ring-2 focus:ring-zinc-600 sm:w-[320px]"><CirclePlus className="h-4 w-4" /> Add column</button>}</div></main>
    <footer className="fixed inset-x-0 bottom-0 z-10 border-t border-zinc-800 bg-[#09090b] px-4 py-3 sm:px-6 lg:px-10"><div className="mx-auto flex max-w-[1600px] items-center justify-between gap-4 overflow-x-auto text-[10px] font-medium uppercase tracking-wider text-zinc-500"><div className="flex min-w-max items-center gap-5"><span><strong className="text-zinc-200">{analytics.total}</strong> Total cards</span><span><strong className="text-rose-400">{analytics.overdue}</strong> Overdue</span><span><strong className="text-emerald-400">{analytics.done}</strong> Done</span></div><span className="flex min-w-max items-center gap-2"><ClipboardList className="h-3.5 w-3.5" /><strong className="text-zinc-200">{analytics.completion}%</strong> complete</span></div></footer>
  </div>;
}
