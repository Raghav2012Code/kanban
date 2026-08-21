import type { BoardState } from '../types/kanban';

export function moveCard(state: BoardState, cardId: string, targetColumnId: string, targetCardId?: string, insertAfter = false): BoardState {
  const sourceColumn = state.columns.find((column) => column.cardIds.includes(cardId));
  const targetColumn = state.columns.find((column) => column.id === targetColumnId);
  if (!sourceColumn || !targetColumn || targetCardId === cardId) return state;

  const sourceIds = sourceColumn.cardIds.filter((id) => id !== cardId);
  const targetIds = targetColumn.id === sourceColumn.id ? sourceIds.slice() : targetColumn.cardIds.filter((id) => id !== cardId);
  const targetIndex = targetCardId ? targetIds.indexOf(targetCardId) : -1;
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
