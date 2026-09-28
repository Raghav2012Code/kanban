import type { BoardState, CardItem, SortMode } from '../types/kanban';
import { dayNumber } from './dates';

/**
 * Sorting is a read of the board, not an edit of it.
 *
 * The order produced here is what gets rendered. Stored column membership is
 * never rewritten, which is what makes a sorted view safe to combine with a
 * filter: looking at the board in a different order cannot change the board.
 */

/**
 * Undated cards are placed consistently rather than left in an incidental order,
 * so a sorted column is reproducible. They sort after every dated card, and ties
 * among them fall back to filed time then identity, so the same board always
 * renders the same way.
 */
function compareBy(criterion: Exclude<SortMode, 'manual'>): (a: CardItem, b: CardItem) => number {
  // A due-date sort measures the deadline, which a card may not have; a filed-date
  // sort measures a value every card has. `null` means "no deadline", and only the
  // due-date sort can produce it.
  const measure = (card: CardItem): number | null =>
    criterion === 'dueDate' ? (card.dueDate ? dayNumber(card.dueDate) : null) : card.createdAt;

  return (a, b) => {
    const left = measure(a);
    const right = measure(b);
    if (left === null && right === null) return tieBreak(a, b);
    if (left === null) return 1;
    if (right === null) return -1;
    if (left !== right) return left - right;
    return tieBreak(a, b);
  };
}

function tieBreak(a: CardItem, b: CardItem): number {
  if (a.createdAt !== b.createdAt) return a.createdAt - b.createdAt;
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
}

/** A sorted view is derived from stored order at render time, and never written back. */
export function sortCardIds(ids: string[], board: BoardState, mode: SortMode): string[] {
  if (mode === 'manual') return ids;
  const compare = compareBy(mode);
  return [...ids].sort((left, right) => {
    const a = board.cards[left];
    const b = board.cards[right];
    if (!a || !b) return 0;
    return compare(a, b);
  });
}

