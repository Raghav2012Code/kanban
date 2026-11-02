import type { BoardState, ColumnItem } from '../types/kanban';

/**
 * Card order is a text rank rather than a position in a list (ADR-0004).
 *
 * A rank is a fraction in (0, 1) written in base 62, so it is compared as plain
 * text: a midpoint between two neighbours always exists and no column ever needs
 * renumbering. Only this alphabet is used, and comparison is code-unit order, so
 * every device sorts the same board the same way. `localeCompare` would not.
 */
const DIGITS = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
const MAX_DIGIT = DIGITS.length - 1;
const MIDDLE_DIGIT = Math.floor(MAX_DIGIT / 2);
const ZERO_DIGIT = DIGITS[0] as string;

/** Strings only, so the same board sorts identically everywhere. */
export function compareRank(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function digitAt(value: string, index: number): number {
  return index < value.length ? DIGITS.indexOf(value[index] as string) : 0;
}

/**
 * A rank strictly above `lower` with no upper bound. Copies the digits it must
 * keep and raises the first digit with room above it; a finite input always ends,
 * so the loop always terminates.
 */
function above(lower: string): string {
  let prefix = '';
  for (let index = 0; ; index += 1) {
    const low = digitAt(lower, index);
    if (low < MAX_DIGIT - 1) return prefix + DIGITS[Math.floor((low + MAX_DIGIT) / 2)];
    prefix += DIGITS[low];
  }
}

/** A rank strictly between two distinct, non-empty ranks. */
function between(lower: string, upper: string): string {
  let prefix = '';
  for (let index = 0; ; index += 1) {
    const low = digitAt(lower, index);
    const high = digitAt(upper, index);
    if (low === high) {
      // Both share this digit, so the difference must be later. Two ranks that
      // differ only by trailing zeroes are the same value; callers compare them
      // first and never reach here with a pair they cannot split.
      if (index >= lower.length && index >= upper.length) {
        throw new RangeError(`Cannot rank between ${lower} and ${upper}`);
      }
      prefix += DIGITS[low];
      continue;
    }
    if (high - low >= 2) return prefix + DIGITS[Math.floor((low + high) / 2)];
    // No digit fits between adjacent ones, so keep the lower digit and go deeper
    // with an open upper bound: prefix + low is still below `upper`.
    return prefix + DIGITS[low] + above(lower.slice(index + 1));
  }
}

/** A rank with the same value and no trailing zeroes. Ranks never end in "0". */
export function canonicalRank(rank: string): string {
  let end = rank.length;
  while (end > 0 && rank[end - 1] === ZERO_DIGIT) end -= 1;
  return rank.slice(0, end);
}

/**
 * A rank between `lower` and `upper`; an absent bound means the start or the end
 * of the column. Equal bounds are a collision: a midpoint does not exist, so the
 * two cards share the rank and identity breaks the tie (ADR-0004).
 */
export function rankBetween(lower?: string, upper?: string): string {
  const low = lower === undefined ? undefined : canonicalRank(lower);
  const high = upper === undefined ? undefined : canonicalRank(upper);
  if (low === '') throw new RangeError('Empty rank cannot bound a new rank');
  if (high === '') throw new RangeError('Empty rank cannot bound a new rank');
  if (low === undefined && high === undefined) return DIGITS[MIDDLE_DIGIT] as string;
  if (low === undefined) return between('', high as string);
  if (high === undefined) return above(low);
  const order = compareRank(low, high);
  if (order === 0) return low;
  if (order > 0) throw new RangeError(`Rank ${low} is not below ${high}`);
  return between(low, high);
}

/**
 * The column's cards in stored order: by rank, then by identity so a collision
 * resolves the same way on every device. A column whose cards have no ranks is
 * read in stored order, which is how a board saved before ranks existed keeps its
 * order until it is normalised.
 */
export function orderCardIds(board: BoardState, column: ColumnItem): string[] {
  const ids = column.cardIds.filter((id) => Boolean(board.cards[id]));
  if (!ids.every((id) => typeof board.cards[id]?.rank === 'string')) return ids;
  return ids.slice().sort((left, right) => {
    const byRank = compareRank(board.cards[left]?.rank as string, board.cards[right]?.rank as string);
    return byRank !== 0 ? byRank : compareRank(left, right);
  });
}

/**
 * Gives every card in a column a rank, deriving one from stored order where it is
 * absent. This is the one-time migration for a board saved before ranks existed,
 * so loading it needs no renumbering and no change to the stored shape.
 */
export function normalizeBoard(board: BoardState): BoardState {
  let cards = board.cards;
  let changed = false;
  const put = (id: string, rank: string): void => {
    if (!changed) {
      cards = { ...cards };
      changed = true;
    }
    cards[id] = { ...cards[id]!, rank };
  };
  for (const column of board.columns) {
    let previous: string | undefined;
    for (const id of column.cardIds) {
      const card = cards[id];
      if (!card) continue;
      const canonical = card.rank === undefined ? '' : canonicalRank(card.rank);
      if (!canonical) {
        const rank = rankBetween(previous, undefined);
        put(id, rank);
        previous = rank;
        continue;
      }
      if (canonical !== card.rank) put(id, canonical);
      previous = canonical;
    }
  }
  return changed ? { ...board, cards } : board;
}
