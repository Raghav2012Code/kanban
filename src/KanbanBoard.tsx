import { AnimatePresence, motion } from 'motion/react';
import { IconCirclePlus, IconX } from '@tabler/icons-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { DragEvent } from 'react';
import { Button } from '@/components/ui/button';
import { AnalyticsBar } from './components/AnalyticsBar';
import { AddColumn, BoardColumn } from './components/BoardColumn';
import { BoardHeader } from './components/BoardHeader';
import { BoardTransfer } from './components/BoardTransfer';
import type { TransferResult } from './components/BoardTransfer';
import type { MoveDirection } from './components/KanbanCard';
import { StorageNotice } from './components/StorageNotice';
import { useKanbanBoard } from './hooks/useKanbanBoard';
import { useMotionTransition } from './hooks/useMotionTransition';
import { computeAnalytics } from './lib/analytics';
import { adjacentColumnOf, addCard as addCardToBoard, isColumnAtLimit, moveCard, moveCardsInto, moveCardToAdjacentColumn, moveCardWithinColumn, moveColumnToAdjacent, pruneExpandedIds, removeCard, resolveInsertAfter, updateCard } from './lib/board';
import { isViewActive, visibleByColumn as computeVisibleByColumn } from './lib/filter';
import type { FilterCriteria } from './lib/filter';
import { sortCardIds } from './lib/sort';
import { makeId } from './lib/ids';
import { normalizeCardDraft } from './lib/validation';
import { loadCollapsedIds, saveCollapsedIds } from './lib/layout-prefs';
import type { BoardState, CardDraft, CardItem, ColumnItem, DropTarget, PriorityFilter, SortMode } from './types/kanban';

export default function KanbanBoard(): JSX.Element {
  const { board, mutate: updateBoard, undo, redo, canUndo, canRedo, replaceBoard, storageWarning, dismissStorageWarning } = useKanbanBoard();
  const [search, setSearch] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>('all');
  const [collapsedIds, setCollapsedIds] = useState<ReadonlySet<string>>(() => loadCollapsedIds());
  useEffect(() => saveCollapsedIds(collapsedIds), [collapsedIds]);
  const toggleCollapsed = (columnId: string) => setCollapsedIds((current) => {
    const next = new Set(current);
    if (next.has(columnId)) next.delete(columnId);
    else next.add(columnId);
    return next;
  });
  const [selectedIds, setSelectedIds] = useState<ReadonlySet<string>>(() => new Set());
  const toggleSelected = (cardId: string) => setSelectedIds((current) => {
    const next = new Set(current);
    if (next.has(cardId)) next.delete(cardId);
    else next.add(cardId);
    return next;
  });
  const [sort, setSort] = useState<SortMode>('manual');
  const [overdueOnly, setOverdueOnly] = useState(false);
  const [dueWithinDays, setDueWithinDays] = useState<number | null>(null);
  const [columnTitle, setColumnTitle] = useState('');
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => new Set());
  const [activeFormColumn, setActiveFormColumn] = useState<string | null>(null);
  const [addingColumn, setAddingColumn] = useState(false);
  const [newColumnTitle, setNewColumnTitle] = useState('');
  const [renamingColumn, setRenamingColumn] = useState<string | null>(null);
  const [editingCardId, setEditingCardId] = useState<string | null>(null);
  const [limitingColumn, setLimitingColumn] = useState<string | null>(null);
  const [limitValue, setLimitValue] = useState('');
  const [renameValue, setRenameValue] = useState('');
  const [draggedCardId, setDraggedCardId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<DropTarget | null>(null);
  const [columnNotice, setColumnNotice] = useState<string | null>(null);
  const newColumnRef = useRef<HTMLInputElement>(null);
  const transition = useMotionTransition();

  // Undo is reachable by keyboard, but never by hijacking the browser's own text
  // undo: inside a field, Ctrl+Z means "undo my typing", which is what the person
  // means at that moment.
  useEffect(() => {
    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if (!(event.ctrlKey || event.metaKey)) return;
      const key = event.key.toLowerCase();
      if (key !== 'z' && key !== 'y') return;
      const target = event.target;
      if (target instanceof HTMLElement && (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName))) return;
      event.preventDefault();
      if (key === 'y' || event.shiftKey) redo();
      else undo();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [undo, redo]);

  const criteria = useMemo<FilterCriteria>(
    () => ({ query: search, priority: priorityFilter, overdueOnly, dueWithinDays, columnTitle }),
    [search, priorityFilter, overdueOnly, dueWithinDays, columnTitle],
  );
  // One gate for the positional-reorder rule, and it counts a sort as well as a
  // filter, because a sorted column has the same hazard a filtered one does.
  const positionalEnabled = !isViewActive(criteria, sort);
  const visibleByColumn = useMemo(() => computeVisibleByColumn(board, criteria), [board, criteria]);
  const renderedByColumn = useMemo(
    () => Object.fromEntries(Object.entries(visibleByColumn).map(([id, ids]) => [id, sortCardIds(ids, board, sort)])),
    [visibleByColumn, board, sort],
  );
  const analytics = useMemo(() => computeAnalytics(board), [board]);

  const saveColumn = () => { const title = newColumnTitle.trim(); if (!title) return; updateBoard((current) => ({ ...current, columns: [...current.columns, { id: makeId('column'), title, cardIds: [] }] })); setNewColumnTitle(''); setAddingColumn(false); };
  const saveRename = () => { if (!renamingColumn) return; const title = renameValue.trim(); if (title) updateBoard((current) => ({ ...current, columns: current.columns.map((column) => column.id === renamingColumn ? { ...column, title } : column) })); setRenamingColumn(null); setRenameValue(''); };
  const deleteCard = (cardId: string) => { updateBoard((current) => removeCard(current, cardId)); setExpandedIds((current) => pruneExpandedIds(current, cardId)); setDropTarget((current) => (current?.cardId === cardId ? { columnId: current.columnId } : current)); setDraggedCardId((current) => (current === cardId ? null : current)); setSelectedIds((current) => { if (!current.has(cardId)) return current; const next = new Set(current); next.delete(cardId); return next; }); };
  // A bulk move is a sequence of the existing single-card move, so it cannot diverge
  // from single behaviour, cannot bypass the limit, and cannot bypass the
  // filtered-reorder rule. The whole group is refused or none of it is: a partial
  // move would leave the board holding some of what was asked for and none of the rest.
  const moveSelectedInto = (targetColumnId: string) => {
    const ids = [...selectedIds];
    const target = board.columns.find((column) => column.id === targetColumnId);
    if (!target) return;
    const arriving = ids.filter((id) => !target.cardIds.includes(id));
    if (isColumnAtLimit(target, arriving.length)) {
      announce(limitRefusal(target));
      return;
    }
    // Named explicitly, because "done" is not a confirmation a person can act on.
    const names = ids.map((id) => board.cards[id]?.title).filter(Boolean);
    announce(`Moved ${arriving.length} card${arriving.length === 1 ? '' : 's'} to ${target.title}: ${names.join(', ')}.`);
    updateBoard((current) => moveCardsInto(current, ids, targetColumnId));
    setSelectedIds(new Set());
  };
  const addCard = (columnId: string, draft: CardDraft) => { const result = normalizeCardDraft(draft); if (!result.ok) return; const value = result.value.draft; const card: CardItem = { id: makeId('card'), title: value.title, priority: value.priority, createdAt: Date.now(), ...(value.description ? { description: value.description } : {}), ...(value.dueDate ? { dueDate: value.dueDate } : {}) }; updateBoard((current) => addCardToBoard(current, columnId, card)); setActiveFormColumn(null); };
  // Every outcome is announced through the board's one existing notice channel, so
  // a move, a refusal, and a limit all reach assistive technology the same way and
  // the board never grows a second live region.
  const announce = (message: string | null | undefined) => { setColumnNotice(message ?? null); };
  /** Where the card actually ended up, read off the resulting board rather than predicted. */
  const describeMove = (from: BoardState, to: BoardState, cardId: string, direction: MoveDirection): string | null => {
    const card = from.cards[cardId];
    if (!card) return null;
    const landed = to.columns.find((column) => column.cardIds.includes(cardId));
    if (!landed) return null;
    const position = landed.cardIds.indexOf(cardId) + 1;
    const where = direction === 'up' ? 'up' : direction === 'down' ? 'down' : `to ${landed.title}`;
    return `Moved ${card.title} ${where}, position ${position} of ${landed.cardIds.length}.`;
  };

  const moveCardTo = (cardId: string, direction: MoveDirection) => {
    if (direction === 'left' || direction === 'right') {
      const target = adjacentColumnOf(board, cardId, direction);
      if (target && isColumnAtLimit(target) && !target.cardIds.includes(cardId)) {
        announce(limitRefusal(target));
        return;
      }
    }
    const transition = (current: BoardState) =>
      direction === 'up' || direction === 'down'
        ? moveCardWithinColumn(current, cardId, direction)
        : moveCardToAdjacentColumn(current, cardId, direction);
    const moved = transition(board);
    announce(describeMove(board, moved, cardId, direction));
    updateBoard(transition);
  };
  const beginEditCard = (cardId: string) => { setEditingCardId(cardId); setActiveFormColumn(null); setAddingColumn(false); };
  const saveEditedCard = (cardId: string, draft: CardDraft) => { updateBoard((current) => updateCard(current, cardId, draft)); setEditingCardId(null); };
  const moveColumnTo = (columnId: string, direction: 'left' | 'right') => updateBoard((current) => moveColumnToAdjacent(current, columnId, direction));
  // A limit that silently refused would be worse than no limit, so the refusal is
  // explained rather than ignored. The enforcement itself lives in the transition,
  // so this only decides what the person is told.
  const limitRefusal = (column: ColumnItem): string => `${column.title} is at its Work In Progress limit of ${column.limit}. Move or delete a card, or raise the limit, before moving one in.`;
  const beginLimit = (column: ColumnItem) => { setLimitingColumn(column.id); setLimitValue(column.limit === undefined ? '' : String(column.limit)); };
  // An empty or unusable value clears the limit, so a stale number is never permanent.
  const saveLimit = () => {
    if (!limitingColumn) return;
    const parsed = Number(limitValue);
    const limit = Number.isInteger(parsed) && parsed >= 0 && limitValue.trim() !== '' ? parsed : undefined;
    updateBoard((current) => ({ ...current, columns: current.columns.map((column) => (column.id === limitingColumn ? (limit === undefined ? { id: column.id, title: column.title, cardIds: column.cardIds } : { ...column, limit }) : column)) }));
    setLimitingColumn(null);
  };
  // Routed through the board's one existing notice channel rather than a second
  // live region, so an import outcome is announced the same way a limit refusal
  // is and the board never has two competing status regions.
  const reportTransfer = (result: TransferResult) => {
    if (result === 'replaced') announce('Board imported.');
    else if (result === 'invalid') announce('That file is not a board, so nothing was changed.');
    else announce('That file could not be read as JSON, so nothing was changed.');
  };
  const refuseIfAtLimit = (cardId: string, target: ColumnItem | undefined): boolean => {
    if (!target || !isColumnAtLimit(target)) return false;
    if (target.cardIds.includes(cardId)) return false;
    announce(limitRefusal(target));
    return true;
  };
  const requestDeleteColumn = (column: ColumnItem) => { if (column.cardIds.length > 0) { setColumnNotice(`${column.title} still has ${column.cardIds.length} card${column.cardIds.length === 1 ? '' : 's'}. Move or delete them before removing the column.`); return; } setColumnNotice(null); updateBoard((current) => ({ ...current, columns: current.columns.filter((item) => item.id !== column.id) })); };
  const clearDrag = () => { setDraggedCardId(null); setDropTarget(null); };
  const handleDragStart = (event: DragEvent<HTMLElement>, cardId: string) => { event.dataTransfer.effectAllowed = 'move'; event.dataTransfer.setData('text/plain', cardId); setDraggedCardId(cardId); };
  const handleDragOver = (event: DragEvent<HTMLElement>, columnId: string, cardId?: string) => { event.preventDefault(); event.dataTransfer.dropEffect = 'move'; if (!positionalEnabled || !cardId) { setDropTarget({ columnId }); return; } const rect = event.currentTarget.getBoundingClientRect(); setDropTarget({ columnId, cardId, insertAfter: resolveInsertAfter(event.clientY, rect.top, rect.height) }); };
  const handleDragLeave = (event: DragEvent<HTMLElement>) => { const related = event.relatedTarget; if (!(related instanceof Node) || !event.currentTarget.contains(related)) setDropTarget(null); };
  const handleDrop = (event: DragEvent<HTMLElement>, columnId: string, cardId?: string) => { event.preventDefault(); const id = event.dataTransfer.getData('text/plain'); if (id && board.cards[id]) { if (refuseIfAtLimit(id, board.columns.find((column) => column.id === columnId))) { clearDrag(); return; } const anchorId = positionalEnabled ? cardId : undefined; let insertAfter = false; if (anchorId) { const rect = event.currentTarget.getBoundingClientRect(); insertAfter = resolveInsertAfter(event.clientY, rect.top, rect.height); } updateBoard((current) => moveCard(current, id, columnId, anchorId, insertAfter)); } clearDrag(); };
  const handleColumnDragOver = (event: DragEvent<HTMLElement>, columnId: string) => handleDragOver(event, columnId);
  const beginRename = (column: ColumnItem) => { setRenamingColumn(column.id); setRenameValue(column.title); setActiveFormColumn(null); };

  // A bulk bar replaces the header's filter cluster only while cards are selected,
  // so it cannot be a second permanent toolbar and the filters stay where they were.
  const selectionBar = selectedIds.size > 0 ? (
    <div className="flex items-center gap-1">
      <span className="font-mono text-[11px] uppercase tracking-wide text-muted">{selectedIds.size} selected</span>
      {board.columns.map((column, index) => (
        <Button
          key={column.id}
          variant="outline"
          size="sm"
          onClick={() => moveSelectedInto(column.id)}
          disabled={index === board.columns.length - 1}
          aria-label={`Move ${selectedIds.size} selected cards to ${column.title}`}
          className="h-9 font-mono text-[11px] uppercase tracking-wide"
        >
          {column.title}
        </Button>
      ))}
      <Button variant="ghost" size="sm" onClick={() => setSelectedIds(new Set())} aria-label="Clear selection" className="h-9 font-mono text-[11px] uppercase tracking-wide">
        Clear
      </Button>
    </div>
  ) : null;
  return <div className="min-h-screen min-w-0 overflow-x-hidden bg-base pb-16 text-ink"><BoardHeader search={search} priorityFilter={priorityFilter} onSearchChange={setSearch} onPriorityChange={setPriorityFilter} overdueOnly={overdueOnly} onOverdueOnlyChange={setOverdueOnly} dueWithinDays={dueWithinDays} onDueWithinChange={setDueWithinDays} columnTitle={columnTitle} onColumnTitleChange={setColumnTitle} sort={sort} onSortChange={setSort} canUndo={canUndo} canRedo={canRedo} onUndo={undo} onRedo={redo} transfer={<BoardTransfer board={board} onReplace={replaceBoard} onResult={reportTransfer} />} selectionBar={selectionBar}
 /><main className="mx-auto min-w-0 max-w-[1600px] px-4 py-5 sm:px-6 lg:px-10"><StorageNotice warning={storageWarning} onDismiss={dismissStorageWarning} />{columnNotice && <div role="status" aria-live="polite" className="mb-4 flex items-center justify-between gap-3 rounded-strip border border-line-strong bg-raised px-3 py-2 text-xs text-muted"><span className="min-w-0 flex-1 leading-5">{columnNotice}</span><Button variant="ghost" size="icon" onClick={() => setColumnNotice(null)} aria-label="Dismiss column notice" className="h-6 w-6"><IconX size={12} stroke={1.5} /></Button></div>}<motion.div layout transition={transition} className="min-w-0 overflow-x-auto" onDragLeave={handleDragLeave}><div className="flex min-w-0 flex-col gap-3 lg:flex-row lg:gap-4"><AnimatePresence initial={false}>{board.columns.map((column, index) => <BoardColumn key={column.id} column={column} cards={renderedByColumn[column.id].map((id) => board.cards[id]).filter((card): card is NonNullable<typeof card> => Boolean(card))} activeForm={activeFormColumn === column.id} renaming={renamingColumn === column.id} renameValue={renameValue} draggedCardId={draggedCardId} dropTarget={dropTarget} positionalEnabled={positionalEnabled} canMoveLeft={index > 0} canMoveRight={index < board.columns.length - 1} onStartCardForm={() => { setActiveFormColumn(column.id); setAddingColumn(false); }} onSaveCard={(draft) => addCard(column.id, draft)} onCancelCardForm={() => setActiveFormColumn(null)} onBeginRename={() => beginRename(column)} onRenameChange={setRenameValue} onSaveRename={saveRename} onCancelRename={() => setRenamingColumn(null)} onDeleteColumn={() => requestDeleteColumn(column)} onDeleteCard={deleteCard} onEditCard={beginEditCard} editingCardId={editingCardId} onSaveCardDraft={saveEditedCard} onCancelEditCard={() => setEditingCardId(null)} onMoveColumn={(direction) => moveColumnTo(column.id, direction)} selectedIds={selectedIds} onToggleSelected={toggleSelected} collapsed={collapsedIds.has(column.id)} onToggleCollapsed={() => toggleCollapsed(column.id)} settingLimit={limitingColumn === column.id} limitValue={limitValue} onStartLimit={() => beginLimit(column)} onLimitChange={setLimitValue} onSaveLimit={saveLimit} onCancelLimit={() => setLimitingColumn(null)} onMove={moveCardTo} expandedIds={expandedIds} onToggleExpanded={(id) => setExpandedIds((current) => { const next = new Set(current); if (next.has(id)) next.delete(id); else next.add(id); return next; })} onDragStart={handleDragStart} onDragEnd={clearDrag} onDragOver={(event, id) => id ? handleDragOver(event, column.id, id) : handleColumnDragOver(event, column.id)} onDragEnter={(event, id) => id ? handleDragOver(event, column.id, id) : handleColumnDragOver(event, column.id)} onDragLeave={handleDragLeave} onDrop={(event, id) => handleDrop(event, column.id, id)} />)}{addingColumn ? <AddColumn value={newColumnTitle} inputRef={newColumnRef} onChange={setNewColumnTitle} onSave={saveColumn} onCancel={() => { setAddingColumn(false); setNewColumnTitle(''); }} /> : <Button variant="ghost" onClick={() => { setAddingColumn(true); setActiveFormColumn(null); }} className="w-full shrink-0 justify-start rounded-none px-4 py-4 font-mono text-[11px] uppercase tracking-wide text-muted lg:w-44 lg:px-5 lg:py-3"><IconCirclePlus size={14} stroke={1.5} /> Add bay</Button>}</AnimatePresence></div></motion.div></main><AnalyticsBar {...analytics} /></div>;
}
