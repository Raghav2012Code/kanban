import { DONE_COLUMN_ID } from './constants';
import type { BoardState, ColumnItem } from '../types/kanban';

export function isDoneColumn(column: ColumnItem): boolean {
  return column.id === DONE_COLUMN_ID;
}

export function getDoneColumn(board: BoardState): ColumnItem | undefined {
  return board.columns.find(isDoneColumn);
}

export function doneCardIds(board: BoardState): string[] {
  const column = getDoneColumn(board);
  if (!column) return [];
  return column.cardIds.filter((id) => Boolean(board.cards[id]));
}
