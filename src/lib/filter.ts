import { isFilterActive } from './board';
import { isCardOverdue, isValidDateString, dayNumberFromString, localDateString } from './dates';
import { DONE_COLUMN_ID } from './constants';
// A card's fields. The board, column, and sort types live in ../types/kanban,
// which has no dependency on this module.
import type { BoardState, CardItem, ColumnItem, PriorityFilter, SortMode } from '../types/kanban';

export interface FilterCriteria {
  query: string;
  priority: PriorityFilter;
  overdueOnly: boolean;
  dueWithinDays: number | null;
  columnTitle: string;
}

export const NO_FILTERS: FilterCriteria = {
  query: '',
  priority: 'all',
  overdueOnly: false,
  dueWithinDays: null,
  columnTitle: '',
};

/**
 * Whether a card's due date falls inside the chosen window, counting from today.
 * Undated work is not "due soon", so it is excluded rather than lumped in.
 */
export function isDueWithin(card: CardItem, days: number, today: string): boolean {
  if (!card.dueDate || !isValidDateString(today)) return false;
  const difference = dayNumberFromString(card.dueDate) - dayNumberFromString(today);
  return difference >= 0 && difference <= days;
}

export function matchesQuery(card: CardItem, query: string): boolean {
  const needle = query.trim().toLowerCase();
  if (!needle) return true;
  return card.title.toLowerCase().includes(needle) || Boolean(card.description && card.description.toLowerCase().includes(needle));
}

/** A column title is searchable, so a stage name finds the work sitting in it. */
export function matchesColumnTitle(column: ColumnItem, needle: string): boolean {
  return column.title.toLowerCase().includes(needle.trim().toLowerCase());
}

export function isVisibleCard(card: CardItem, criteria: FilterCriteria, done = false, today = localDateString()): boolean {
  if (criteria.overdueOnly && !isCardOverdue(card, done, today)) return false;
  if (criteria.dueWithinDays !== null && !isDueWithin(card, criteria.dueWithinDays, today)) return false;
  return (criteria.priority === 'all' || card.priority === criteria.priority) && matchesQuery(card, criteria.query);
}

export function visibleCardIds(column: ColumnItem, board: BoardState, criteria: FilterCriteria, today = localDateString()): string[] {
  // A column-title criterion is about the column, not the card, so it is answered
  // once here rather than inside the per-card predicate.
  if (criteria.columnTitle.trim() && !matchesColumnTitle(column, criteria.columnTitle)) return [];
  const done = column.id === DONE_COLUMN_ID;
  return column.cardIds.filter((id) => {
    const card = board.cards[id];
    return Boolean(card && isVisibleCard(card, criteria, done, today));
  });
}

export function visibleByColumn(board: BoardState, criteria: FilterCriteria, today = localDateString()): Record<string, string[]> {
  const result: Record<string, string[]> = {};
  for (const column of board.columns) result[column.id] = visibleCardIds(column, board, criteria, today);
  return result;
}

/**
 * Whether the board is in a view that no longer matches stored order, which is
 * the single gate for ADR-0002's rule. It counts a sort as well as a filter,
 * because a sorted column has the same hazard a filtered one does. One predicate
 * means one place to widen when a new view dimension is added.
 */
export function isViewActive(criteria: FilterCriteria, sort: SortMode): boolean {
  if (criteria.overdueOnly) return true;
  if (criteria.dueWithinDays !== null) return true;
  if (criteria.columnTitle.trim()) return true;
  return isFilterActive(criteria.query, criteria.priority) || sort !== 'manual';
}
