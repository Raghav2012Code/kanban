import { DONE_COLUMN_ID } from './constants';
import { dayNumber, isCardOverdue, isValidDateString, localDateString } from './dates';
// A card's fields. The board, column, and sort types live in ../types/kanban,
// which has no dependency on this module.
import type { BoardState, CardItem, ColumnItem, PriorityFilter, SortMode } from '../types/kanban';

export interface FilterCriteria {
  query: string;
  priority: PriorityFilter;
  overdueOnly: boolean;
  dueWithinDays: number | null;
  columnTitle: string;
  /** Filed within this many days. Every card has a filed value, so nothing is excluded for want of one. */
  filedWithinDays: number | null;
}

export const NO_FILTERS: FilterCriteria = {
  query: '',
  priority: 'all',
  overdueOnly: false,
  dueWithinDays: null,
  columnTitle: '',
  filedWithinDays: null,
};

/**
 * Every dimension, in one place.
 *
 * A new dimension has to be registered here as well as in the criteria type and the
 * visible-set predicates. A dimension the positional-reorder gate does not know
 * about silently leaves reordering enabled over a view that no longer matches stored
 * order, which is the exact scramble ADR-0002 exists to prevent. Deriving the gate
 * from this table means it cannot be forgotten.
 */
const DIMENSIONS: ReadonlyArray<{
  key: keyof FilterCriteria;
  isSet: (value: FilterCriteria[keyof FilterCriteria]) => boolean;
}> = [
  { key: 'query', isSet: (value) => String(value).trim().length > 0 },
  { key: 'priority', isSet: (value) => value !== 'all' },
  { key: 'overdueOnly', isSet: (value) => value === true },
  { key: 'dueWithinDays', isSet: (value) => value !== null },
  { key: 'columnTitle', isSet: (value) => String(value).trim().length > 0 },
  { key: 'filedWithinDays', isSet: (value) => value !== null },
];

/**
 * Whether a card's due date falls inside the chosen window, counting from today.
 * Undated work is not "due soon", so it is excluded rather than lumped in.
 */
export function isDueWithin(card: CardItem, days: number, today: string): boolean {
  if (!card.dueDate || !isValidDateString(today)) return false;
  const difference = dayNumber(card.dueDate) - dayNumber(today);
  return difference >= 0 && difference <= days;
}

/** Whether a card was filed inside the chosen window, counting back from today. */
export function isFiledWithin(card: CardItem, days: number, today: string): boolean {
  if (!isValidDateString(today)) return false;
  const difference = dayNumber(localDateString(new Date(card.createdAt))) - dayNumber(today);
  return difference <= 0 && difference >= -days;
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

export function isVisibleCard(
  card: CardItem,
  criteria: FilterCriteria,
  { done = false, today = localDateString() }: { done?: boolean; today?: string } = {},
): boolean {
  if (criteria.overdueOnly && !isCardOverdue(card, done, today)) return false;
  if (criteria.dueWithinDays !== null && !isDueWithin(card, criteria.dueWithinDays, today)) return false;
  if (criteria.filedWithinDays !== null && !isFiledWithin(card, criteria.filedWithinDays, today)) return false;
  return (criteria.priority === 'all' || card.priority === criteria.priority) && matchesQuery(card, criteria.query);
}

export function visibleCardIds(column: ColumnItem, board: BoardState, criteria: FilterCriteria, today = localDateString()): string[] {
  // A column-title criterion is about the column, not the card, so it is answered
  // once here rather than inside the per-card predicate.
  if (criteria.columnTitle.trim() && !matchesColumnTitle(column, criteria.columnTitle)) return [];
  const done = column.id === DONE_COLUMN_ID;
  return column.cardIds.filter((id) => {
    const card = board.cards[id];
    return Boolean(card && isVisibleCard(card, criteria, { done, today }));
  });
}

export function visibleByColumn(board: BoardState, criteria: FilterCriteria, today = localDateString()): Record<string, string[]> {
  const result: Record<string, string[]> = {};
  for (const column of board.columns) result[column.id] = visibleCardIds(column, board, criteria, today);
  return result;
}

/**
 * Whether the board is in a view that no longer matches stored order, which is the
 * single gate for ADR-0002's rule. It counts a sort as well as a filter, because a
 * sorted column has the same hazard a filtered one does.
 */
export function isViewActive(criteria: FilterCriteria, sort: SortMode): boolean {
  if (sort !== 'manual') return true;
  return DIMENSIONS.some(({ key, isSet }) => isSet(criteria[key]));
}
