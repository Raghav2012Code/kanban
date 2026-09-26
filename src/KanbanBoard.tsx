import { AnimatePresence, motion } from 'motion/react';
import { IconCirclePlus, IconX } from '@tabler/icons-react';
import { useMemo, useRef, useState } from 'react';
import type { DragEvent } from 'react';
import { Button } from '@/components/ui/button';
import { AnalyticsBar } from './components/AnalyticsBar';
import { AddColumn, BoardColumn } from './components/BoardColumn';
import { BoardHeader } from './components/BoardHeader';
import type { MoveDirection } from './components/KanbanCard';
import { StorageNotice } from './components/StorageNotice';
import { useKanbanBoard } from './hooks/useKanbanBoard';
import { useMotionTransition } from './hooks/useMotionTransition';
import { computeAnalytics } from './lib/analytics';
import { addCard as addCardToBoard, isFilterActive, moveCard, moveCardToAdjacentColumn, moveCardWithinColumn, pruneExpandedIds, removeCard, resolveInsertAfter } from './lib/board';
import { visibleByColumn as computeVisibleByColumn } from './lib/filter';
import { makeId } from './lib/ids';
import { normalizeCardDraft } from './lib/validation';
import type { BoardState, CardDraft, CardItem, ColumnItem, DropTarget, PriorityFilter } from './types/kanban';

export default function KanbanBoard(): JSX.Element {
  const { board, setBoard, storageWarning, dismissStorageWarning } = useKanbanBoard();
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
  const [columnNotice, setColumnNotice] = useState<string | null>(null);
  const newColumnRef = useRef<HTMLInputElement>(null);
  const transition = useMotionTransition();

  const criteria = useMemo(() => ({ query: search, priority: priorityFilter }), [search, priorityFilter]);
  const positionalEnabled = !isFilterActive(search, priorityFilter);
  const visibleByColumn = useMemo(() => computeVisibleByColumn(board, criteria), [board, criteria]);
  const analytics = useMemo(() => computeAnalytics(board), [board]);

  const updateBoard = (updater: (current: BoardState) => BoardState) => setBoard(updater);
  const saveColumn = () => { const title = newColumnTitle.trim(); if (!title) return; updateBoard((current) => ({ ...current, columns: [...current.columns, { id: makeId('column'), title, cardIds: [] }] })); setNewColumnTitle(''); setAddingColumn(false); };
  const saveRename = () => { if (!renamingColumn) return; const title = renameValue.trim(); if (title) updateBoard((current) => ({ ...current, columns: current.columns.map((column) => column.id === renamingColumn ? { ...column, title } : column) })); setRenamingColumn(null); setRenameValue(''); };
  const deleteCard = (cardId: string) => { updateBoard((current) => removeCard(current, cardId)); setExpandedIds((current) => pruneExpandedIds(current, cardId)); setDropTarget((current) => (current?.cardId === cardId ? { columnId: current.columnId } : current)); setDraggedCardId((current) => (current === cardId ? null : current)); };
  const addCard = (columnId: string, draft: CardDraft) => { const result = normalizeCardDraft(draft); if (!result.ok) return; const value = result.value.draft; const card: CardItem = { id: makeId('card'), title: value.title, priority: value.priority, createdAt: Date.now(), ...(value.description ? { description: value.description } : {}), ...(value.dueDate ? { dueDate: value.dueDate } : {}) }; updateBoard((current) => addCardToBoard(current, columnId, card)); setActiveFormColumn(null); };
  const moveCardTo = (cardId: string, direction: MoveDirection) => { updateBoard((current) => (direction === 'up' || direction === 'down' ? moveCardWithinColumn(current, cardId, direction) : moveCardToAdjacentColumn(current, cardId, direction))); };
  const requestDeleteColumn = (column: ColumnItem) => { if (column.cardIds.length > 0) { setColumnNotice(`${column.title} still has ${column.cardIds.length} card${column.cardIds.length === 1 ? '' : 's'}. Move or delete them before removing the column.`); return; } setColumnNotice(null); updateBoard((current) => ({ ...current, columns: current.columns.filter((item) => item.id !== column.id) })); };
  const clearDrag = () => { setDraggedCardId(null); setDropTarget(null); };
  const handleDragStart = (event: DragEvent<HTMLElement>, cardId: string) => { event.dataTransfer.effectAllowed = 'move'; event.dataTransfer.setData('text/plain', cardId); setDraggedCardId(cardId); };
  const handleDragOver = (event: DragEvent<HTMLElement>, columnId: string, cardId?: string) => { event.preventDefault(); event.dataTransfer.dropEffect = 'move'; if (!positionalEnabled || !cardId) { setDropTarget({ columnId }); return; } const rect = event.currentTarget.getBoundingClientRect(); setDropTarget({ columnId, cardId, insertAfter: resolveInsertAfter(event.clientY, rect.top, rect.height) }); };
  const handleDragLeave = (event: DragEvent<HTMLElement>) => { const related = event.relatedTarget; if (!(related instanceof Node) || !event.currentTarget.contains(related)) setDropTarget(null); };
  const handleDrop = (event: DragEvent<HTMLElement>, columnId: string, cardId?: string) => { event.preventDefault(); const id = event.dataTransfer.getData('text/plain'); if (id && board.cards[id]) { const anchorId = positionalEnabled ? cardId : undefined; let insertAfter = false; if (anchorId) { const rect = event.currentTarget.getBoundingClientRect(); insertAfter = resolveInsertAfter(event.clientY, rect.top, rect.height); } updateBoard((current) => moveCard(current, id, columnId, anchorId, insertAfter)); } clearDrag(); };
  const handleColumnDragOver = (event: DragEvent<HTMLElement>, columnId: string) => handleDragOver(event, columnId);
  const beginRename = (column: ColumnItem) => { setRenamingColumn(column.id); setRenameValue(column.title); setActiveFormColumn(null); };

  return <div className="min-h-screen min-w-0 overflow-x-hidden bg-base pb-16 text-ink"><BoardHeader search={search} priorityFilter={priorityFilter} onSearchChange={setSearch} onPriorityChange={setPriorityFilter} /><main className="mx-auto min-w-0 max-w-[1600px] px-4 py-5 sm:px-6 lg:px-10"><StorageNotice warning={storageWarning} onDismiss={dismissStorageWarning} />{columnNotice && <div role="status" aria-live="polite" className="mb-4 flex items-center justify-between gap-3 rounded-strip border border-line-strong bg-raised px-3 py-2 text-xs text-muted"><span className="min-w-0 flex-1 leading-5">{columnNotice}</span><Button variant="ghost" size="icon" onClick={() => setColumnNotice(null)} aria-label="Dismiss column notice" className="h-6 w-6"><IconX size={12} stroke={1.5} /></Button></div>}<motion.div layout transition={transition} className="min-w-0 overflow-x-auto" onDragLeave={handleDragLeave}><div className="flex min-w-0 flex-col gap-3 lg:flex-row lg:gap-4"><AnimatePresence initial={false}>{board.columns.map((column, index) => <BoardColumn key={column.id} column={column} cards={visibleByColumn[column.id].map((id) => board.cards[id]).filter((card): card is NonNullable<typeof card> => Boolean(card))} activeForm={activeFormColumn === column.id} renaming={renamingColumn === column.id} renameValue={renameValue} draggedCardId={draggedCardId} dropTarget={dropTarget} positionalEnabled={positionalEnabled} canMoveLeft={index > 0} canMoveRight={index < board.columns.length - 1} onStartCardForm={() => { setActiveFormColumn(column.id); setAddingColumn(false); }} onSaveCard={(draft) => addCard(column.id, draft)} onCancelCardForm={() => setActiveFormColumn(null)} onBeginRename={() => beginRename(column)} onRenameChange={setRenameValue} onSaveRename={saveRename} onCancelRename={() => setRenamingColumn(null)} onDeleteColumn={() => requestDeleteColumn(column)} onDeleteCard={deleteCard} onMove={moveCardTo} expandedIds={expandedIds} onToggleExpanded={(id) => setExpandedIds((current) => { const next = new Set(current); if (next.has(id)) next.delete(id); else next.add(id); return next; })} onDragStart={handleDragStart} onDragEnd={clearDrag} onDragOver={(event, id) => id ? handleDragOver(event, column.id, id) : handleColumnDragOver(event, column.id)} onDragEnter={(event, id) => id ? handleDragOver(event, column.id, id) : handleColumnDragOver(event, column.id)} onDragLeave={handleDragLeave} onDrop={(event, id) => handleDrop(event, column.id, id)} />)}{addingColumn ? <AddColumn value={newColumnTitle} inputRef={newColumnRef} onChange={setNewColumnTitle} onSave={saveColumn} onCancel={() => { setAddingColumn(false); setNewColumnTitle(''); }} /> : <Button variant="ghost" onClick={() => { setAddingColumn(true); setActiveFormColumn(null); }} className="w-full shrink-0 justify-start rounded-none px-4 py-4 font-mono text-[11px] uppercase tracking-wide text-muted lg:w-44 lg:px-5 lg:py-3"><IconCirclePlus size={14} stroke={1.5} /> Add bay</Button>}</AnimatePresence></div></motion.div></main><AnalyticsBar {...analytics} /></div>;
}
