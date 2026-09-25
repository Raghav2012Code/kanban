import type { BoardState, CardItem, PriorityFilter } from '../types/kanban';

export interface MoveCardOptions {
  positional?: boolean;
}

export function moveCard(state: BoardState, cardId: string, targetColumnId: string, targetCardId?: string, insertAfter = false, options: MoveCardOptions = {}): BoardState {
  const sourceColumn = state.columns.find((column) => column.cardIds.includes(cardId));
  const targetColumn = state.columns.find((column) => column.id === targetColumnId);
  if (!sourceColumn || !targetColumn) return state;

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

export function moveCardWithinColumn(state: BoardState, cardId: string, direction: 'up' | 'down'): BoardState {
  const column = state.columns.find((item) => item.cardIds.includes(cardId));
  if (!column) return state;
  const index = column.cardIds.indexOf(cardId);
  const targetIndex = direction === 'up' ? index - 1 : index + 1;
  if (targetIndex < 0 || targetIndex >= column.cardIds.length) return state;
  return moveCard(state, cardId, column.id, column.cardIds[targetIndex], direction === 'down');
}

export function moveCardToAdjacentColumn(state: BoardState, cardId: string, direction: 'left' | 'right'): BoardState {
  const columnIndex = state.columns.findIndex((column) => column.cardIds.includes(cardId));
  if (columnIndex < 0) return state;
  const targetIndex = direction === 'left' ? columnIndex - 1 : columnIndex + 1;
  if (targetIndex < 0 || targetIndex >= state.columns.length) return state;
  return moveCard(state, cardId, state.columns[targetIndex].id);
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
