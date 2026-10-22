import { AnimatePresence, motion } from 'motion/react';
import { IconCirclePlus, IconX } from '@tabler/icons-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { DragEvent } from 'react';
import { Button } from '@/components/ui/button';
import { AddColumn, BoardColumn } from './components/BoardColumn';
import { BoardStats } from './components/BoardStats';
import { BoardTransfer } from './components/BoardTransfer';
import type { TransferResult } from './components/BoardTransfer';
import type { MoveDirection } from './components/KanbanCard';
import { StorageNotice } from './components/StorageNotice';
import { TopBar } from './components/TopBar';
import { useKanbanBoard } from './hooks/useKanbanBoard';
import { useMotionTransition } from './hooks/useMotionTransition';
import { computeAnalytics } from './lib/analytics';
import { adjacentColumnOf, addCard as addCardToBoard, isColumnAtLimit, moveCard, moveCardsInto, moveCardToAdjacentColumn, moveCardWithinColumn, moveColumnToAdjacent, pruneRemovedIds, removeCard, removeCards, resolveInsertAfter, updateCard } from './lib/board';
import { getDoneColumn } from './lib/done';
import { isViewActive, visibleByColumn as computeVisibleByColumn } from './lib/filter';
import type { FilterCriteria } from './lib/filter';
import { sortCardIds } from './lib/sort';
import { makeId } from './lib/ids';
import { normalizeCardDraft } from './lib/validation';
import { loadCollapsedIds, saveCollapsedIds } from './lib/layout-prefs';
import type { BoardState, CardDraft, CardItem, ColumnItem, DropTarget, PriorityFilter, SortMode } from './types/kanban';

/** At most one card form is open at a time: a column's file-card form, or one card's edit form. */
type CardFormTarget = { kind: 'file'; columnId: string } | { kind: 'edit'; cardId: string };

/**
 * The board's one notice. A plain message announces an outcome; a deletion
 * additionally carries the board snapshot it produced, so the Undo control is
 * shown only while the board is still exactly that snapshot.
 */
interface BoardNotice {
  message: string;
  snapshot?: BoardState;
}

/** Half of the sticky band, in pixels, around a tile's midpoint while aiming a drop. */
const INSERT_BAND = 6;

export default function KanbanBoard(): JSX.Element {
  const { board, mutate: updateBoard, undo, redo, canUndo, canRedo, replaceBoard, storageWarning, dismissStorageWarning, externalUpdateCount } = useKanbanBoard();
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
  const [filedWithinDays, setFiledWithinDays] = useState<number | null>(null);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => new Set());
  const [cardForm, setCardForm] = useState<CardFormTarget | null>(null);
  const [addingColumn, setAddingColumn] = useState(false);
  const [newColumnTitle, setNewColumnTitle] = useState('');
  const [renamingColumn, setRenamingColumn] = useState<string | null>(null);
  const [limitingColumn, setLimitingColumn] = useState<string | null>(null);
  const [limitValue, setLimitValue] = useState('');
  const [renameValue, setRenameValue] = useState('');
  const [draggedCardId, setDraggedCardId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<DropTarget | null>(null);
  const [columnNotice, setColumnNotice] = useState<BoardNotice | null>(null);
  const editingCardId = cardForm?.kind === 'edit' ? cardForm.cardId : null;
  const newColumnRef = useRef<HTMLInputElement>(null);
  const transition = useMotionTransition();

  /**
   * A control that unmounts — the delete button on the card it deletes, a save
   * button inside a form — takes the focus with it unless something claims it
   * back. Handlers park a lookup here; the effect runs once the board has
   * rendered its replacement, so the target exists by the time it is focused.
   * Lookups are by data attribute rather than CSS-escaped id, so an id is never
   * interpreted as a selector.
   */
  const pendingFocus = useRef<(() => HTMLElement | null) | null>(null);
  const focusTimer = useRef<number | null>(null);
  useEffect(() => {
    const find = pendingFocus.current;
    if (!find) return;
    pendingFocus.current = null;
    // After the current key event, not during it. A button focused inside an
    // Enter keydown still receives the rest of that key press, so the gauge
    // button focused after saving a limit was immediately clicked and reopened
    // the editor it had just closed.
    if (focusTimer.current !== null) window.clearTimeout(focusTimer.current);
    focusTimer.current = window.setTimeout(() => {
      focusTimer.current = null;
      find()?.focus();
    }, 0);
  });
  // A queued focus must not land on a later board after this one is gone.
  useEffect(() => () => {
    if (focusTimer.current !== null) window.clearTimeout(focusTimer.current);
  }, []);
  const cardElement = (cardId: string): HTMLElement | null =>
    Array.from(document.querySelectorAll<HTMLElement>('[data-card-id]')).find((element) => element.dataset.cardId === cardId) ?? null;
  const columnElement = (columnId: string): HTMLElement | null =>
    Array.from(document.querySelectorAll<HTMLElement>('[data-column-id]')).find((element) => element.dataset.columnId === columnId) ?? null;
  const focusCard = (cardId: string | undefined) => {
    if (!cardId) return;
    pendingFocus.current = () => cardElement(cardId)?.querySelector<HTMLElement>('[aria-label^="Select "]') ?? null;
  };
  const focusFileCard = (columnId: string) => {
    pendingFocus.current = () => {
      const column = columnElement(columnId);
      // A collapsed lane has no File card trigger; its header is the nearest
      // surviving control, so focus stays in the lane instead of the body.
      return column?.querySelector<HTMLElement>('[data-file-card]') ?? column?.querySelector<HTMLElement>('button[aria-label^="Rename "]') ?? null;
    };
  };
  const focusColumnTitle = (columnId: string) => {
    pendingFocus.current = () => columnElement(columnId)?.querySelector<HTMLElement>('button[aria-label^="Rename "]') ?? null;
  };
  const focusColumnLimit = (columnId: string) => {
    pendingFocus.current = () => columnElement(columnId)?.querySelector<HTMLElement>('button[aria-label^="Set Work In Progress limit"]') ?? null;
  };
  const focusAddColumn = () => {
    pendingFocus.current = () => document.querySelector<HTMLElement>('button[data-add-column], input[aria-label="New column name"]');
  };

  /**
   * A board can change without the person touching this tab: an undo, an import,
   * or another tab's write. Selection, expansion, and the open form all name
   * entities by id, so an id that is gone must leave the view state too. Without
   * this, a selected card that no longer exists still counts as "arriving" and a
   * move is refused with a limit message about a card that is not there.
   */
  useEffect(() => {
    const knownCards = new Set(Object.keys(board.cards));
    const knownColumns = new Set(board.columns.map((column) => column.id));
    const pruneMissingCards = (current: ReadonlySet<string>): Set<string> | null => {
      let next: Set<string> | null = null;
      for (const id of current) {
        if (!knownCards.has(id)) {
          next ??= new Set(current);
          next.delete(id);
        }
      }
      return next;
    };
    setSelectedIds((current) => pruneMissingCards(current) ?? current);
    setExpandedIds((current) => pruneMissingCards(current) ?? current);
    setCardForm((current) => current && (current.kind === 'file' ? knownColumns.has(current.columnId) : knownCards.has(current.cardId)) ? current : null);
    setRenamingColumn((current) => current && !knownColumns.has(current) ? null : current);
    setLimitingColumn((current) => current && !knownColumns.has(current) ? null : current);
    setDraggedCardId((current) => current && !knownCards.has(current) ? null : current);
    setDropTarget((current) => {
      if (!current) return current;
      if (!knownColumns.has(current.columnId)) return null;
      if (current.cardId && !knownCards.has(current.cardId)) return { columnId: current.columnId };
      return current;
    });
  }, [board]);

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
    () => ({ query: search, priority: priorityFilter, overdueOnly, dueWithinDays, columnTitle, filedWithinDays }),
    [search, priorityFilter, overdueOnly, dueWithinDays, columnTitle, filedWithinDays],
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
  // Search stays in the bar and has its own clear control, so the count and the
  // reset cover the dimensions that live behind the Filters trigger.
  const filterCount = [priorityFilter !== 'all', overdueOnly, dueWithinDays !== null, columnTitle.trim() !== '', filedWithinDays !== null, sort !== 'manual'].filter(Boolean).length;
  const resetFilters = () => {
    setPriorityFilter('all');
    setOverdueOnly(false);
    setDueWithinDays(null);
    setColumnTitle('');
    setFiledWithinDays(null);
    setSort('manual');
  };

  const saveColumn = () => {
    const title = newColumnTitle.trim();
    if (!title) return;
    updateBoard((current) => ({ ...current, columns: [...current.columns, { id: makeId('column'), title, cardIds: [] }] }));
    setNewColumnTitle('');
    setAddingColumn(false);
  };
  const saveRename = (restoreFocus = false) => {
    if (!renamingColumn) return;
    const columnId = renamingColumn;
    const title = renameValue.trim();
    // Renaming to the same title is not a mutation: recording it would put an
    // empty step in the history and make Undo appear to do nothing.
    if (title) {
      updateBoard((current) => {
        const column = current.columns.find((item) => item.id === columnId);
        if (!column || column.title === title) return current;
        return { ...current, columns: current.columns.map((item) => item.id === columnId ? { ...item, title } : item) };
      });
    }
    setRenamingColumn(null);
    setRenameValue('');
    // A blur belongs to a click somewhere else; restoring focus then would steal
    // it from the control the person actually chose. Only Enter puts it back.
    if (restoreFocus) focusColumnTitle(columnId);
  };
  const cancelRename = () => {
    const columnId = renamingColumn;
    setRenamingColumn(null);
    setRenameValue('');
    if (columnId) focusColumnTitle(columnId);
  };
  const deleteCard = (cardId: string) => {
    const card = board.cards[cardId];
    if (!card) return;
    const column = board.columns.find((item) => item.cardIds.includes(cardId));
    // Focus the next card the person can actually see, not the next stored card:
    // under a filter the stored neighbour may be hidden, and focusing nothing is
    // how focus used to fall to the document body.
    const visible = column ? renderedByColumn[column.id] : [];
    const index = visible.indexOf(cardId);
    const neighbourId = index >= 0 ? visible[index + 1] ?? visible[index - 1] : undefined;
    const removed = removeCard(board, cardId);
    if (removed === board) return;
    updateBoard(() => removed);
    pruneViewStateFor([cardId]);
    setColumnNotice({ message: `Deleted ${card.title}.`, snapshot: removed });
    if (neighbourId) focusCard(neighbourId);
    else if (column) focusFileCard(column.id);
  };
  // A removed card must vanish from every piece of view state that referred to
  // it, or the board holds a selection, an expansion, or a drag for a card that
  // no longer exists.
  const pruneViewStateFor = (removedIds: string[]) => {
    const doomed = new Set(removedIds);
    setSelectedIds((current) => {
      let next: Set<string> | null = null;
      for (const id of doomed) {
        if ((next ?? current).has(id)) {
          next ??= new Set(current);
          next.delete(id);
        }
      }
      return next ?? current;
    });
    setExpandedIds((current) => pruneRemovedIds(current, doomed));
    setDraggedCardId((current) => (current && doomed.has(current) ? null : current));
    setDropTarget((current) => (current?.cardId && doomed.has(current.cardId) ? { columnId: current.columnId } : current));
  };
  // Selection is explicit intent, so no confirmation is asked for: the group
  // leaves as one recorded mutation and one undo brings it all back.
  const deleteSelected = () => {
    const ids = [...selectedIds];
    if (ids.length === 0) return;
    const removed = removeCards(board, ids);
    if (removed === board) {
      announce(null);
      setSelectedIds(new Set());
      return;
    }
    // The first affected lane and a card that survives there are the anchor for
    // focus once the selection bar and the deleted tiles are gone.
    const affected = board.columns.find((column) => column.cardIds.some((id) => selectedIds.has(id)));
    const survivorId = affected ? renderedByColumn[affected.id]?.find((id) => !selectedIds.has(id)) : undefined;
    const names = ids.map((id) => board.cards[id]?.title).filter(Boolean);
    const message = ids.length === 1 && names[0] ? `Deleted ${names[0]}.` : `Deleted ${ids.length} cards.`;
    updateBoard(() => removed);
    pruneViewStateFor(ids);
    setColumnNotice({ message, snapshot: removed });
    if (survivorId) focusCard(survivorId);
    else if (affected) focusFileCard(affected.id);
  };
  // Clearing acts on the whole column, never on the visible subset: under a
  // filter, removing only what is shown would leave hidden cards to reappear
  // the moment the filter is lifted.
  const clearDoneColumn = () => {
    const done = getDoneColumn(board);
    if (!done || done.cardIds.length === 0) return;
    const count = done.cardIds.length;
    const cleared = removeCards(board, done.cardIds);
    if (cleared === board) return;
    const message = count === 1 ? 'Cleared 1 finished card.' : `Cleared ${count} finished cards.`;
    updateBoard(() => cleared);
    pruneViewStateFor(done.cardIds);
    setColumnNotice({ message, snapshot: cleared });
    // The Clear button is gone with the cards; keep focus in the lane rather than
    // dropping it to the body.
    focusFileCard(done.id);
  };
  // Every outcome is announced through the board's one existing notice channel, so
  // a move, a refusal, and a limit all reach assistive technology the same way and
  // the board never grows a second live region.
  const announce = (message: string | null | undefined) => { setColumnNotice(message ? { message } : null); };
  // An adopted board is a real event, but not a local one. It uses the same one
  // notice channel so it cannot be missed, and mentions the other tab so the
  // change is not mistaken for a glitch.
  useEffect(() => {
    if (externalUpdateCount > 0) announce('Board updated from another tab.');
  }, [externalUpdateCount]);
  // Undo is the existing history restore, not a second mechanism: pressing it
  // reverts the deletion the notice claims, then closes the notice.
  const undoDeletion = () => { undo(); setColumnNotice(null); };
  // A limit that silently refused would be worse than no limit, so the refusal is
  // explained rather than ignored. The enforcement itself lives in the transition,
  // so this only decides what the person is told.
  const limitRefusal = (column: ColumnItem): string => `${column.title} is at its Work In Progress limit of ${column.limit}. Move or delete a card, or raise the limit, before moving one in.`;
  // A bulk move is a sequence of the existing single-card move, so it cannot diverge
  // from single behaviour, cannot bypass the limit, and cannot bypass the
  // filtered-reorder rule. The whole group is refused or none of it is: a partial
  // move would leave the board holding some of what was asked for and none of the rest.
  const moveSelectedInto = (targetColumnId: string) => {
    // A selected id can outlive its card for one render after an undo or import;
    // it is not work and must not count toward the limit or the announcement.
    const ids = [...selectedIds].filter((id) => Object.hasOwn(board.cards, id));
    const target = board.columns.find((column) => column.id === targetColumnId);
    if (!target) return;
    const arriving = ids.filter((id) => !target.cardIds.includes(id));
    if (isColumnAtLimit(target, arriving.length)) {
      announce(limitRefusal(target));
      return;
    }
    if (arriving.length === 0) {
      // Nothing is moving, so there is nothing to announce. Saying "Moved 0 cards"
      // would be a claim about work that did not happen.
      announce(null);
      setSelectedIds(new Set());
      return;
    }
    // Announced off the resulting board, and only for cards that actually moved.
    const moved = moveCardsInto(board, ids, targetColumnId);
    const names = arriving.map((id) => board.cards[id]?.title).filter(Boolean);
    announce(
      moved === board
        ? 'Nothing moved.'
        : `Moved ${arriving.length} card${arriving.length === 1 ? '' : 's'} to ${target.title}: ${names.join(', ')}.`,
    );
    updateBoard((current) => moveCardsInto(current, ids, targetColumnId));
    setSelectedIds(new Set());
    focusColumnTitle(targetColumnId);
  };
  // Clearing the selection removes the bar's own button, so focus moves to the
  // first card that was selected rather than to the body.
  const clearSelection = () => {
    const first = [...selectedIds][0];
    setSelectedIds(new Set());
    if (first) focusCard(first);
  };
  const addCard = (columnId: string, draft: CardDraft) => {
    const result = normalizeCardDraft(draft);
    if (!result.ok) return;
    const value = result.value.draft;
    const card: CardItem = {
      id: makeId('card'),
      title: value.title,
      priority: value.priority,
      createdAt: Date.now(),
      ...(value.description ? { description: value.description } : {}),
      ...(value.dueDate ? { dueDate: value.dueDate } : {}),
    };
    updateBoard((current) => addCardToBoard(current, columnId, card));
    setCardForm(null);
    // The form's submit button is gone; return focus to the lane's File card
    // trigger so the keyboard flow stays in the same column.
    focusFileCard(columnId);
  };
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
    if (moved === board) {
      // The transition declined, so there is nothing to announce: claiming a move that
      // did not happen is worse than saying nothing.
      announce(null);
      return;
    }
    announce(describeMove(board, moved, cardId, direction));
    updateBoard(() => moved);
  };
  const beginEditCard = (cardId: string) => { setCardForm({ kind: 'edit', cardId }); setAddingColumn(false); };
  const saveEditedCard = (cardId: string, draft: CardDraft) => {
    updateBoard((current) => updateCard(current, cardId, draft));
    setCardForm(null);
    focusCard(cardId);
  };
  const cancelEditCard = () => {
    const cardId = cardForm?.kind === 'edit' ? cardForm.cardId : null;
    setCardForm(null);
    if (cardId) focusCard(cardId);
  };
  const moveColumnTo = (columnId: string, direction: 'left' | 'right') => updateBoard((current) => moveColumnToAdjacent(current, columnId, direction));
  const beginLimit = (column: ColumnItem) => { setLimitingColumn(column.id); setLimitValue(column.limit === undefined ? '' : String(column.limit)); };
  // An empty or unusable value clears the limit, so a stale number is never permanent.
  // Clearing is expressed by dropping the key rather than rebuilding the column, so a
  // field added to a column later is not silently discarded here.
  const saveLimit = (restoreFocus = false) => {
    if (!limitingColumn) return;
    const columnId = limitingColumn;
    const parsed = Number(limitValue);
    const limit = Number.isInteger(parsed) && parsed >= 0 && limitValue.trim() !== '' ? parsed : undefined;
    // Setting the limit it already has is not a mutation, for the same reason a
    // no-op rename is not: history must not record a step that changed nothing.
    updateBoard((current) => {
      const column = current.columns.find((item) => item.id === columnId);
      if (!column || column.limit === limit) return current;
      return {
        ...current,
        columns: current.columns.map((item) => {
          if (item.id !== columnId) return item;
          if (limit !== undefined) return { ...item, limit };
          const { limit: _removed, ...rest } = item;
          return rest;
        }),
      };
    });
    setLimitingColumn(null);
    if (restoreFocus) focusColumnLimit(columnId);
  };
  const cancelLimit = () => {
    const columnId = limitingColumn;
    setLimitingColumn(null);
    if (columnId) focusColumnLimit(columnId);
  };
  // Routed through the board's one existing notice channel rather than a second
  // live region, so an import outcome is announced the same way a limit refusal
  // is and the board never has two competing status regions.
  const reportTransfer = (result: TransferResult) => {
    if (result === 'replaced') announce('Board imported.');
    else if (result === 'invalid') announce('That file is not a board, so nothing was changed.');
    else announce('That file could not be read as JSON, so nothing was changed.');
  };
  // Dragging onto a collapsed column is refused rather than accepted into a hidden
  // body, where the card would arrive invisibly and the drop would look like it worked.
  const refuseDropOntoCollapsed = (columnId: string): boolean => {
    if (!collapsedIds.has(columnId)) return false;
    const column = board.columns.find((item) => item.id === columnId);
    announce(`${column?.title ?? 'That column'} is collapsed. Expand it before dropping a card in.`);
    return true;
  };
  const refuseIfAtLimit = (cardId: string, target: ColumnItem | undefined): boolean => {
    if (!target || !isColumnAtLimit(target)) return false;
    if (target.cardIds.includes(cardId)) return false;
    announce(limitRefusal(target));
    return true;
  };
  const requestDeleteColumn = (column: ColumnItem) => {
    if (column.cardIds.length > 0) {
      setColumnNotice({ message: `${column.title} still has ${column.cardIds.length} card${column.cardIds.length === 1 ? '' : 's'}. Move or delete them before removing the column.` });
      return;
    }
    const index = board.columns.findIndex((item) => item.id === column.id);
    const remaining = board.columns[index + 1] ?? board.columns[index - 1];
    updateBoard((current) => ({ ...current, columns: current.columns.filter((item) => item.id !== column.id) }));
    // A column disappearing is an outcome too: without this the control vanished
    // and the removal happened in silence.
    setColumnNotice({ message: `Deleted ${column.title} column.` });
    if (remaining) focusColumnTitle(remaining.id);
    else focusAddColumn();
  };
  const clearDrag = () => { setDraggedCardId(null); updateDropTarget(null); };
  /**
   * Drop targets only change when the resolved slot actually changes. A dragover
   * that stays within the same slot must not re-render the board — with a fresh
   * object per event it did, dozens of times a second, which is what made a
   * reorder drag stutter. What changes is then animated, not snapped: one clean
   * transition per real slot change.
   */
  const updateDropTarget = (next: DropTarget | null) => setDropTarget((current) => {
    if (current === next) return current;
    if (current && next && current.columnId === next.columnId && current.cardId === next.cardId && Boolean(current.insertAfter) === Boolean(next.insertAfter)) return current;
    return next;
  });
  /**
   * The placeholder's side of a tile is sticky inside a small band around the
   * midpoint, so a hand jittering there cannot flip the slot — and its animation —
   * back and forth. Only a deliberate crossing moves the placeholder.
   */
  const aimAt = (columnId: string, cardId: string, clientY: number, rect: { top: number; height: number }) => setDropTarget((current) => {
    const sticky = current && current.columnId === columnId && current.cardId === cardId ? Boolean(current.insertAfter) : undefined;
    const band = sticky === undefined ? 0 : sticky ? INSERT_BAND : -INSERT_BAND;
    const insertAfter = resolveInsertAfter(clientY + band, rect.top, rect.height);
    if (current && current.columnId === columnId && current.cardId === cardId && Boolean(current.insertAfter) === insertAfter) return current;
    return { columnId, cardId, insertAfter };
  });
  const handleDragStart = (event: DragEvent<HTMLElement>, cardId: string) => {
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', cardId);
    setDraggedCardId(cardId);
  };
  const handleDragOver = (event: DragEvent<HTMLElement>, columnId: string, cardId?: string) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    if (!positionalEnabled || !cardId) { updateDropTarget({ columnId }); return; }
    const rect = event.currentTarget.getBoundingClientRect();
    aimAt(columnId, cardId, event.clientY, rect);
  };
  const handleDragLeave = (event: DragEvent<HTMLElement>) => {
    // Chrome reports no relatedTarget for drag events, so a leave cannot be told
    // from an interior crossing by target alone. Interior crossings must not clear
    // the target: clearing and re-aiming on every tile-to-gap step unmounts and
    // remounts the placeholder, which reads as a stutter under the cursor. The
    // target only clears when the pointer is genuinely outside the lane.
    const rect = event.currentTarget.getBoundingClientRect();
    if (event.clientX >= rect.left && event.clientX <= rect.right && event.clientY >= rect.top && event.clientY <= rect.bottom) return;
    const related = event.relatedTarget;
    if (related instanceof Node && event.currentTarget.contains(related)) return;
    updateDropTarget(null);
  };
  // A dropped card is announced exactly like an arrow-key move, because a drag is a
  // move and a person who cannot see the drop happening needs the same confirmation.
  const handleDrop = (event: DragEvent<HTMLElement>, columnId: string, cardId?: string) => {
    event.preventDefault();
    const id = event.dataTransfer.getData('text/plain');
    if (id && board.cards[id]) {
      if (refuseDropOntoCollapsed(columnId)) { clearDrag(); return; }
      if (refuseIfAtLimit(id, board.columns.find((column) => column.id === columnId))) { clearDrag(); return; }
      // The card lands exactly where the placeholder showed: the slot resolved by
      // the last dragover is the source of truth, and the raw event is only the
      // fallback for a drop that arrives with no preceding dragover.
      const anchored = positionalEnabled && dropTarget && dropTarget.columnId === columnId && dropTarget.cardId && board.cards[dropTarget.cardId] ? dropTarget : null;
      const anchorId = anchored ? anchored.cardId : positionalEnabled ? cardId : undefined;
      let insertAfter = false;
      if (anchorId) {
        const rect = event.currentTarget.getBoundingClientRect();
        insertAfter = anchored ? Boolean(anchored.insertAfter) : resolveInsertAfter(event.clientY, rect.top, rect.height);
      }
      const moved = moveCard(board, id, columnId, anchorId, insertAfter, { positional: positionalEnabled });
      // A drop that changes nothing (onto itself, or inside its own lane under a
      // filter or sort) must not announce a move that never happened.
      if (moved === board) {
        announce(null);
        clearDrag();
        return;
      }
      const landed = moved.columns.find((column) => column.cardIds.includes(id));
      const card = board.cards[id];
      announce(landed && card ? `Moved ${card.title} to ${landed.title}, position ${landed.cardIds.indexOf(id) + 1} of ${landed.cardIds.length}.` : null);
      updateBoard(() => moved);
    }
    clearDrag();
  };
  // Hovering the lane's own space — a gap between tiles, the header, above the
  // first tile or below the last — anchors to the nearest tile instead of yanking
  // the placeholder to the top of the lane and shifting every tile for an 8px gap.
  const handleColumnDragOver = (event: DragEvent<HTMLElement>, columnId: string) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    const tiles = positionalEnabled
      ? Array.from(event.currentTarget.querySelectorAll<HTMLElement>('[data-card-id]')).filter((tile) => Boolean(tile.dataset.cardId))
      : [];
    if (tiles.length === 0) { updateDropTarget({ columnId }); return; }
    let anchor = tiles[0];
    let anchorRect = anchor.getBoundingClientRect();
    for (const tile of tiles) {
      const rect = tile.getBoundingClientRect();
      if (event.clientY >= rect.top + rect.height / 2) { anchor = tile; anchorRect = rect; }
    }
    aimAt(columnId, anchor.dataset.cardId as string, event.clientY, anchorRect);
  };
  // Renaming closes a file-card form, as it always has, but never an open edit
  // form: an edit is work in progress and renaming a column must not discard it.
  const beginRename = (column: ColumnItem) => {
    setRenamingColumn(column.id);
    setRenameValue(column.title);
    setCardForm((current) => (current?.kind === 'file' ? null : current));
  };

  // The bulk bar appears in its own strip below the top bar only while cards are
  // selected, so it cannot be a second permanent toolbar. Every column is offered,
  // including the last — clearing a queue usually means emptying it into the final
  // column, so the destination a person actually wants must not be the one control
  // they cannot press.
  const selectionBar = selectedIds.size > 0 ? (
    <div className="rise-in border-b border-line bg-surface">
      <div className="mx-auto flex max-w-[1600px] flex-wrap items-center gap-2 px-4 py-2 sm:px-6 lg:px-10">
        <span className="font-mono text-[11px] uppercase tracking-wide text-muted">{selectedIds.size} selected</span>
        <span className="flex flex-wrap items-center gap-1.5">
          {board.columns.map((column) => (
            <Button
              key={column.id}
              variant="outline"
              size="sm"
              onClick={() => moveSelectedInto(column.id)}
              aria-label={`Move ${selectedIds.size} selected card${selectedIds.size === 1 ? '' : 's'} to ${column.title}`}
              className="font-mono text-[11px] uppercase tracking-wide"
            >
              {column.title}
            </Button>
          ))}
        </span>
        <Button variant="destructive" size="sm" onClick={deleteSelected} aria-label={`Delete ${selectedIds.size} selected card${selectedIds.size === 1 ? '' : 's'}`} className="ml-auto font-mono text-[11px] uppercase tracking-wide">
          Delete
        </Button>
        <Button variant="ghost" size="sm" onClick={clearSelection} aria-label="Clear selection" className="font-mono text-[11px] uppercase tracking-wide">
          Clear
        </Button>
      </div>
    </div>
  ) : null;

  return <div className="min-h-screen min-w-0 overflow-x-hidden bg-base text-ink">
    <TopBar
      search={search}
      priorityFilter={priorityFilter}
      onSearchChange={setSearch}
      onPriorityChange={setPriorityFilter}
      overdueOnly={overdueOnly}
      onOverdueOnlyChange={setOverdueOnly}
      dueWithinDays={dueWithinDays}
      onDueWithinChange={setDueWithinDays}
      columnTitle={columnTitle}
      onColumnTitleChange={setColumnTitle}
      filedWithinDays={filedWithinDays}
      onFiledWithinChange={setFiledWithinDays}
      sort={sort}
      onSortChange={setSort}
      filterCount={filterCount}
      onResetFilters={resetFilters}
      canUndo={canUndo}
      canRedo={canRedo}
      onUndo={undo}
      onRedo={redo}
      transfer={<BoardTransfer board={board} onReplace={replaceBoard} onResult={reportTransfer} />}
      stats={<BoardStats {...analytics} />}
    />
    {selectionBar}
    <main className="mx-auto min-w-0 max-w-[1600px] px-4 py-5 sm:px-6 lg:px-10">
      <StorageNotice warning={storageWarning} onDismiss={dismissStorageWarning} />
      {columnNotice && (!columnNotice.snapshot || columnNotice.snapshot === board) && <div role="status" aria-live="polite" className="rise-in mb-4 flex items-center justify-between gap-3 rounded-ui border border-line bg-surface px-3 py-2 text-xs text-muted shadow-sm"><span className="min-w-0 flex-1 leading-5">{columnNotice.message}</span>{columnNotice.snapshot && <Button variant="ghost" size="sm" onClick={undoDeletion} aria-label="Undo deletion" className="shrink-0 font-mono text-[11px] uppercase tracking-wide">Undo</Button>}<Button variant="ghost" size="icon" onClick={() => setColumnNotice(null)} aria-label="Dismiss column notice" className="h-6 w-6"><IconX size={13} stroke={1.5} /></Button></div>}
      <motion.div layout transition={transition} className="min-w-0 overflow-x-auto" onDragLeave={handleDragLeave}>
        <div className="flex min-w-0 flex-col gap-3 lg:flex-row lg:gap-4">
          <AnimatePresence initial={false}>
            {board.columns.map((column, index) => <BoardColumn
              key={column.id}
              column={column}
              cards={renderedByColumn[column.id].map((id) => board.cards[id]).filter((card): card is NonNullable<typeof card> => Boolean(card))}
              activeForm={cardForm?.kind === 'file' && cardForm.columnId === column.id}
              renaming={renamingColumn === column.id}
              renameValue={renameValue}
              draggedCardId={draggedCardId}
              dropTarget={dropTarget}
              positionalEnabled={positionalEnabled}
              canMoveLeft={index > 0}
              canMoveRight={index < board.columns.length - 1}
              onStartCardForm={() => { setCardForm({ kind: 'file', columnId: column.id }); setAddingColumn(false); }}
              onSaveCard={(draft) => addCard(column.id, draft)}
              onCancelCardForm={() => { setCardForm(null); focusFileCard(column.id); }}
              onBeginRename={() => beginRename(column)}
              onRenameChange={setRenameValue}
              onSaveRename={saveRename}
              onCancelRename={cancelRename}
              onDeleteColumn={() => requestDeleteColumn(column)}
              onClearDoneColumn={column.id === getDoneColumn(board)?.id && column.cardIds.length > 0 ? clearDoneColumn : undefined}
              onDeleteCard={deleteCard}
              onEditCard={beginEditCard}
              editingCardId={editingCardId}
              onSaveCardDraft={saveEditedCard}
              onCancelEditCard={cancelEditCard}
              onMoveColumn={(direction) => moveColumnTo(column.id, direction)}
              selectedIds={selectedIds}
              onToggleSelected={toggleSelected}
              collapsed={collapsedIds.has(column.id)}
              onToggleCollapsed={() => toggleCollapsed(column.id)}
              settingLimit={limitingColumn === column.id}
              limitValue={limitValue}
              onStartLimit={() => beginLimit(column)}
              onLimitChange={setLimitValue}
              onSaveLimit={saveLimit}
              onCancelLimit={cancelLimit}
              onMove={moveCardTo}
              expandedIds={expandedIds}
              onToggleExpanded={(id) => setExpandedIds((current) => {
                const next = new Set(current);
                if (next.has(id)) next.delete(id);
                else next.add(id);
                return next;
              })}
              onDragStart={handleDragStart}
              onDragEnd={clearDrag}
              onDragOver={(event, id) => id ? handleDragOver(event, column.id, id) : handleColumnDragOver(event, column.id)}
              onDragEnter={(event, id) => id ? handleDragOver(event, column.id, id) : handleColumnDragOver(event, column.id)}
              onDragLeave={handleDragLeave}
              onDrop={(event, id) => handleDrop(event, column.id, id)}
            />)}
            {addingColumn
              ? <AddColumn value={newColumnTitle} inputRef={newColumnRef} onChange={setNewColumnTitle} onSave={saveColumn} onCancel={() => { setAddingColumn(false); setNewColumnTitle(''); }} />
              : <Button
                variant="ghost"
                data-add-column
                onClick={() => { setAddingColumn(true); setCardForm((current) => (current?.kind === 'file' ? null : current)); }}
                className="h-11 w-full shrink-0 justify-start rounded-ui border border-dashed border-line-strong px-3 text-[12px] font-medium text-muted hover:border-accent hover:bg-transparent hover:text-accent lg:w-44"
              >
                <IconCirclePlus size={15} stroke={1.5} /> Add column
              </Button>}
          </AnimatePresence>
        </div>
      </motion.div>
    </main>
  </div>;
}
