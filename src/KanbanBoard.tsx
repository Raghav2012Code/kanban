import { CirclePlus } from 'lucide-react';
import { useMemo, useRef, useState } from 'react';
import type { DragEvent } from 'react';
import { AnalyticsBar } from './components/AnalyticsBar';
import { AddColumn, BoardColumn } from './components/BoardColumn';
import { BoardHeader } from './components/BoardHeader';
import { moveCard } from './lib/board';
import { isOverdue } from './lib/dates';
import { makeId } from './lib/ids';
import { useKanbanBoard } from './hooks/useKanbanBoard';
import type { BoardState, CardDraft, ColumnItem, DropTarget, PriorityFilter } from './types/kanban';

export default function KanbanBoard(): JSX.Element {
  const [board, setBoard] = useKanbanBoard();
  const [search, setSearch] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>('all');
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => new Set());
  const [activeFormColumn, setActiveFormColumn] = useState<string | null>(null);
  const [addingColumn, setAddingColumn] = useState(false);
  const [newColumnTitle, setNewColumnTitle] = useState('');
  const [renamingColumn, setRenamingColumn] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [draggedCardId, setDraggedCardId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<DropTarget | null>(null);
  const newColumnRef = useRef<HTMLInputElement>(null);

  const visibleByColumn = useMemo(() => {
    const query = search.trim().toLowerCase();
    const result: Record<string, string[]> = {};
    for (const column of board.columns) result[column.id] = column.cardIds.filter((id) => { const card = board.cards[id]; return Boolean(card && (!query || card.title.toLowerCase().includes(query)) && (priorityFilter === 'all' || card.priority === priorityFilter)); });
    return result;
  }, [board, priorityFilter, search]);
  const analytics = useMemo(() => {
    const cards = Object.values(board.cards);
    const doneColumn = board.columns.find((column) => column.id === 'column-done' || column.title.toLowerCase() === 'done');
    const done = doneColumn?.cardIds.filter((id) => board.cards[id]).length ?? 0;
    const overdue = cards.filter((card) => isOverdue(card)).length;
    return { total: cards.length, done, overdue, completion: cards.length ? Math.round((done / cards.length) * 100) : 0 };
  }, [board]);

  const updateBoard = (updater: (current: BoardState) => BoardState) => setBoard(updater);
  const saveColumn = () => { const title = newColumnTitle.trim(); if (!title) return; updateBoard((current) => ({ ...current, columns: [...current.columns, { id: makeId('column'), title, cardIds: [] }] })); setNewColumnTitle(''); setAddingColumn(false); };
  const saveRename = () => { if (!renamingColumn) return; const title = renameValue.trim(); if (title) updateBoard((current) => ({ ...current, columns: current.columns.map((column) => column.id === renamingColumn ? { ...column, title } : column) })); setRenamingColumn(null); setRenameValue(''); };
  const deleteCard = (cardId: string) => updateBoard((current) => { const cards = { ...current.cards }; delete cards[cardId]; return { cards, columns: current.columns.map((column) => ({ ...column, cardIds: column.cardIds.filter((id) => id !== cardId) })) }; });
  const addCard = (columnId: string, draft: CardDraft) => { const card = { id: makeId('card'), title: draft.title.trim(), priority: draft.priority, createdAt: Date.now(), ...(draft.description.trim() ? { description: draft.description.trim() } : {}), ...(draft.dueDate ? { dueDate: draft.dueDate } : {}) }; updateBoard((current) => ({ cards: { ...current.cards, [card.id]: card }, columns: current.columns.map((column) => column.id === columnId ? { ...column, cardIds: [...column.cardIds, card.id] } : column) })); setActiveFormColumn(null); };
  const clearDrag = () => { setDraggedCardId(null); setDropTarget(null); };
  const handleDragStart = (event: DragEvent<HTMLDivElement>, cardId: string) => { event.dataTransfer.effectAllowed = 'move'; event.dataTransfer.setData('text/plain', cardId); setDraggedCardId(cardId); };
  const handleDragOver = (event: DragEvent<HTMLDivElement>, columnId: string, cardId?: string) => { event.preventDefault(); event.dataTransfer.dropEffect = 'move'; if (!cardId) { setDropTarget({ columnId }); return; } const rect = event.currentTarget.getBoundingClientRect(); setDropTarget({ columnId, cardId, insertAfter: event.clientY >= rect.top + rect.height / 2 }); };
  const handleDragLeave = (event: DragEvent<HTMLDivElement>) => { const related = event.relatedTarget; if (!(related instanceof Node) || !event.currentTarget.contains(related)) setDropTarget(null); };
  const handleDrop = (event: DragEvent<HTMLDivElement>, columnId: string, cardId?: string) => { event.preventDefault(); const id = event.dataTransfer.getData('text/plain'); if (id && board.cards[id]) updateBoard((current) => moveCard(current, id, columnId, cardId, dropTarget?.insertAfter ?? false)); clearDrag(); };
  const handleColumnDragOver = (event: DragEvent<HTMLDivElement>, columnId: string) => handleDragOver(event, columnId);
  const beginRename = (column: ColumnItem) => { setRenamingColumn(column.id); setRenameValue(column.title); setActiveFormColumn(null); };

  return <div className="min-h-screen bg-black pb-16 text-zinc-50 selection:bg-zinc-700/60"><BoardHeader search={search} priorityFilter={priorityFilter} onSearchChange={setSearch} onPriorityChange={setPriorityFilter} /><main className="mx-auto max-w-[1600px] px-4 py-6 sm:px-6 lg:px-10"><div className="flex min-w-max items-start gap-4 overflow-x-auto pb-5" onDragLeave={handleDragLeave}>{board.columns.map((column) => <BoardColumn key={column.id} column={column} cards={visibleByColumn[column.id].map((id) => board.cards[id]).filter((card): card is NonNullable<typeof card> => Boolean(card))} activeForm={activeFormColumn === column.id} renaming={renamingColumn === column.id} renameValue={renameValue} draggedCardId={draggedCardId} dropTarget={dropTarget} onStartCardForm={() => { setActiveFormColumn(column.id); setAddingColumn(false); }} onSaveCard={(draft) => addCard(column.id, draft)} onCancelCardForm={() => setActiveFormColumn(null)} onBeginRename={() => beginRename(column)} onRenameChange={setRenameValue} onSaveRename={saveRename} onCancelRename={() => setRenamingColumn(null)} onDeleteColumn={() => column.cardIds.length === 0 && updateBoard((current) => ({ ...current, columns: current.columns.filter((item) => item.id !== column.id) }))} onDeleteCard={deleteCard} expandedIds={expandedIds} onToggleExpanded={(id) => setExpandedIds((current) => { const next = new Set(current); if (next.has(id)) next.delete(id); else next.add(id); return next; })} onDragStart={handleDragStart} onDragEnd={clearDrag} onDragOver={(event, id) => id ? handleDragOver(event, column.id, id) : handleColumnDragOver(event, column.id)} onDragEnter={(event, id) => id ? handleDragOver(event, column.id, id) : handleColumnDragOver(event, column.id)} onDragLeave={handleDragLeave} onDrop={(event, id) => handleDrop(event, column.id, id)} />)}{addingColumn ? <AddColumn value={newColumnTitle} inputRef={newColumnRef} onChange={setNewColumnTitle} onSave={saveColumn} onCancel={() => { setAddingColumn(false); setNewColumnTitle(''); }} /> : <button type="button" onClick={() => { setAddingColumn(true); setActiveFormColumn(null); }} className="flex h-12 w-[290px] shrink-0 items-center justify-center gap-2 rounded-xl border border-dashed border-zinc-800 text-xs text-zinc-600 transition hover:border-zinc-700 hover:bg-zinc-950 hover:text-zinc-300 focus:outline-none focus:ring-2 focus:ring-zinc-600 sm:w-[320px]"><CirclePlus className="h-4 w-4" /> Add column</button>}</div></main><AnalyticsBar {...analytics} /></div>;
}
