import type { BoardState, CardItem, ColumnItem, PriorityFilter } from '../types/kanban';

export interface FilterCriteria {
  query: string;
  priority: PriorityFilter;
}

export function matchesQuery(card: CardItem, query: string): boolean {
  const needle = query.trim().toLowerCase();
  if (!needle) return true;
  return card.title.toLowerCase().includes(needle) || Boolean(card.description && card.description.toLowerCase().includes(needle));
}

export function isVisibleCard(card: CardItem, criteria: FilterCriteria): boolean {
  return (criteria.priority === 'all' || card.priority === criteria.priority) && matchesQuery(card, criteria.query);
}

export function visibleCardIds(column: ColumnItem, board: BoardState, criteria: FilterCriteria): string[] {
  return column.cardIds.filter((id) => {
    const card = board.cards[id];
    return Boolean(card && isVisibleCard(card, criteria));
  });
}

export function visibleByColumn(board: BoardState, criteria: FilterCriteria): Record<string, string[]> {
  const result: Record<string, string[]> = {};
  for (const column of board.columns) result[column.id] = visibleCardIds(column, board, criteria);
  return result;
}
