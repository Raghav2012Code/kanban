import type { BoardState, CardDraft, CardItem, ColumnItem, PriorityFilter } from '../types/kanban';

export interface MoveCardOptions {
  positional?: boolean;
}

/**
 * Whether a column cannot take `incoming` more cards.
 *
 * Named for the question it answers rather than for the state it detects, because
 * there are two closely related questions and conflating them inverts a check:
 * `isColumnAtLimit` asks whether a move would exceed the limit, while
 * `isColumnOverLimit` asks whether the column already is over it.
 */
export function isColumnAtLimit(column: ColumnItem, incoming = 1): boolean {
  return column.limit !== undefined && column.cardIds.length + incoming > column.limit;
}

/**
 * Whether a column's count exceeds its limit. The caller passes the count it is
 * displaying, so a filtered view cannot show a count and a saturation marker that
 * disagree. Defaults to full membership for the unfiltered case.
 */
export function isColumnOverLimit(column: ColumnItem, visibleCount: number = column.cardIds.length): boolean {
  return column.limit !== undefined && visibleCount > column.limit;
}

export function moveCard(state: BoardState, cardId: string, targetColumnId: string, targetCardId?: string, insertAfter = false, options: MoveCardOptions = {}): BoardState {
  const sourceColumn = state.columns.find((column) => column.cardIds.includes(cardId));
  const targetColumn = state.columns.find((column) => column.id === targetColumnId);
  if (!sourceColumn || !targetColumn) return state;

  // A Work In Progress limit is enforced here rather than in the component, so no
  // caller can route around it: a cross-column move into a saturated column is
  // refused. Reordering inside a column does not change the count, so it is never
  // refused. The caller asks isColumnAtLimit first, purely so it can explain the
  // refusal, because a limit that silently refused would be worse than no limit.
  if (sourceColumn.id !== targetColumn.id && isColumnAtLimit(targetColumn)) return state;

  const positional = options.positional !== false;
  const anchorId = positional ? targetCardId : undefined;
  if (anchorId === cardId) return state;

  const sourceIds = sourceColumn.cardIds.filter((id) => id !== cardId);
  const targetIds = sourceColumn.id === targetColumn.id ? sourceIds.slice() : targetColumn.cardIds.filter((id) => id !== cardId);
  const targetIndex = anchorId ? targetIds.indexOf(anchorId) : -1;
  const insertAt = targetIndex < 0 ? targetIds.length : targetIndex + (insertAfter ? 1 : 0);
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

/**
 * Moves several cards into one column as a sequence of the single-card move, so
 * bulk cannot diverge from single behaviour, cannot bypass the filtered-reorder
 * rule, and cannot bypass a Work In Progress limit.
 *
 * The limit is checked up front for the whole group, because a partial move would
 * be worse than a refusal: the board would end up holding some of what was asked
 * for and none of the rest, with no way for the person to tell which.
 *
 * The relative order of the moved cards is preserved, so clearing a queue does not
 * scramble the meaning of the queue.
 */
export function moveCardsInto(state: BoardState, cardIds: string[], targetColumnId: string): BoardState {
  if (cardIds.length === 0) return state;
  const target = state.columns.find((column) => column.id === targetColumnId);
  if (!target) return state;

  // Only cards that are actually moving count against the limit, and only those
  // are moved. Re-issuing the move for a card already in the target would append
  // it to its own column and quietly reorder work that was never asked to move.
  const arriving = cardIds.filter((id) => !target.cardIds.includes(id));
  if (isColumnAtLimit(target, arriving.length)) return state;

  return arriving.reduce((current, cardId) => moveCard(current, cardId, targetColumnId), state);
}

/** The index one slot in `direction`, or undefined at the outer boundary. */
function adjacentIndex(count: number, index: number, direction: 'left' | 'right'): number | undefined {
  const target = direction === 'left' ? index - 1 : index + 1;
  return target < 0 || target >= count ? undefined : target;
}

/** The column a card would land in, so a caller can explain a refusal before attempting it. */
export function adjacentColumnOf(state: BoardState, cardId: string, direction: 'left' | 'right'): ColumnItem | undefined {
  const index = state.columns.findIndex((column) => column.cardIds.includes(cardId));
  if (index < 0) return undefined;
  const target = adjacentIndex(state.columns.length, index, direction);
  return target === undefined ? undefined : state.columns[target];
}

export function moveCardWithinColumn(state: BoardState, cardId: string, direction: 'up' | 'down'): BoardState {  const column = state.columns.find((item) => item.cardIds.includes(cardId));
  if (!column) return state;
  const index = column.cardIds.indexOf(cardId);
  const targetIndex = direction === 'up' ? index - 1 : index + 1;
  if (targetIndex < 0 || targetIndex >= column.cardIds.length) return state;
  return moveCard(state, cardId, column.id, column.cardIds[targetIndex], direction === 'down');
}

export function moveCardToAdjacentColumn(state: BoardState, cardId: string, direction: 'left' | 'right'): BoardState {
  const columnIndex = state.columns.findIndex((column) => column.cardIds.includes(cardId));
  if (columnIndex < 0) return state;
  const targetIndex = adjacentIndex(state.columns.length, columnIndex, direction);
  if (targetIndex === undefined) return state;
  const targetColumn = state.columns[targetIndex];
  return targetColumn ? moveCard(state, cardId, targetColumn.id) : state;
}

export function removeCard(state: BoardState, cardId: string): BoardState {
  if (!state.cards[cardId]) return state;
  const cards = { ...state.cards };
  delete cards[cardId];
  return { cards, columns: state.columns.map((column) => (column.cardIds.includes(cardId) ? { ...column, cardIds: column.cardIds.filter((id) => id !== cardId) } : column)) };
}

export function addCard(state: BoardState, columnId: string, card: CardItem): BoardState {
  if (state.cards[card.id] || !state.columns.some((column) => column.id === columnId)) return state;
  return { cards: { ...state.cards, [card.id]: card }, columns: state.columns.map((column) => (column.id === columnId ? { ...column, cardIds: [...column.cardIds, card.id] } : column)) };
}

/**
 * Editing shares the draft type, the normalisation, and the validation with
 * creation, so the two paths cannot drift. Only the content changes: identity,
 * column membership, position, and the filed date are all carried across, so
 * correcting a card never falsifies its history or quietly reorders the board.
 */
export function updateCard(state: BoardState, cardId: string, draft: CardDraft): BoardState {
  const existing = state.cards[cardId];
  if (!existing) return state;
  const updated: CardItem = {
    id: existing.id,
    title: draft.title,
    priority: draft.priority,
    createdAt: existing.createdAt,
    ...(draft.description ? { description: draft.description } : {}),
    ...(draft.dueDate ? { dueDate: draft.dueDate } : {}),
  };
  return { ...state, cards: { ...state.cards, [cardId]: updated } };
}

/**
 * Column order is board structure rather than a card concern, so it is its own
 * transition rather than an option on the card move. The column's cards travel
 * with it untouched: reordering a column is not secretly a bulk move.
 */
export function moveColumnToAdjacent(state: BoardState, columnId: string, direction: 'left' | 'right'): BoardState {
  const index = state.columns.findIndex((column) => column.id === columnId);
  if (index < 0) return state;
  const target = adjacentIndex(state.columns.length, index, direction);
  if (target === undefined) return state;

  const columns = state.columns.slice();
  const [moved] = columns.splice(index, 1);
  if (!moved) return state;
  columns.splice(target, 0, moved);
  return { ...state, columns };
}

export function resolveInsertAfter(clientY: number, top: number, height: number): boolean {
  return clientY >= top + height / 2;
}

export function isFilterActive(query: string, priority: PriorityFilter): boolean {
  return query.trim().length > 0 || priority !== 'all';
}

export function pruneExpandedIds(expandedIds: Set<string>, removedCardId: string): Set<string> {
  if (!expandedIds.has(removedCardId)) return expandedIds;
  const next = new Set(expandedIds);
  next.delete(removedCardId);
  return next;
}
