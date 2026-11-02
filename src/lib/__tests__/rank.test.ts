import { describe, expect, it } from 'vitest';
import { canonicalRank, compareRank, normalizeBoard, orderCardIds, rankBetween } from '../rank';
import type { BoardState, CardItem, ColumnItem } from '../../types/kanban';

function card(id: string, rank?: string): CardItem {
  return { id, title: id, priority: 'low', createdAt: 0, ...(rank === undefined ? {} : { rank }) };
}

function boardWith(column: Partial<ColumnItem> & Pick<ColumnItem, 'cardIds'>, cards: CardItem[]): BoardState {
  return {
    cards: Object.fromEntries(cards.map((item) => [item.id, item])),
    columns: [{ id: 'col', title: 'Col', ...column }],
  };
}

describe('rankBetween', () => {
  it('places a rank between two neighbours', () => {
    const middle = rankBetween('A', 'Z');
    expect(compareRank('A', middle)).toBe(-1);
    expect(compareRank(middle, 'Z')).toBe(-1);
  });

  it('places a rank earlier than the first card and later than the last', () => {
    const before = rankBetween(undefined, 'V');
    const after = rankBetween('V', undefined);
    expect(compareRank(before, 'V')).toBe(-1);
    expect(compareRank(after, 'V')).toBe(1);
  });

  it('keeps a midpoint available between adjacent digits', () => {
    const middle = rankBetween('V', 'W');
    expect(compareRank('V', middle)).toBe(-1);
    expect(compareRank(middle, 'W')).toBe(-1);
  });

  it('keeps a midpoint available under a shared prefix', () => {
    const middle = rankBetween('VV', 'W');
    expect(compareRank('VV', middle)).toBe(-1);
    expect(compareRank(middle, 'W')).toBe(-1);
  });

  it('produces a rank between two open ends', () => {
    expect(rankBetween()).toMatch(/^[0-9A-Za-z]$/);
  });

  it('shares a rank when the neighbours collide, because identity breaks the tie', () => {
    expect(rankBetween('V', 'V')).toBe('V');
  });

  it('refuses reversed neighbours rather than inventing an order', () => {
    expect(() => rankBetween('W', 'V')).toThrow(RangeError);
  });

  it('only ever produces ranks from the documented alphabet', () => {
    let lower = rankBetween();
    for (let index = 0; index < 200; index += 1) {
      const next = rankBetween(lower, undefined);
      expect(next).toMatch(/^[0-9A-Za-z]+$/);
      lower = next;
    }
  });

  it('keeps ordering while inserting repeatedly at one slot', () => {
    // The guarantee is by construction, so exercise the shape that stresses it
    // most: the same slot narrowed over and over, then a run at the front.
    let lower = 'A';
    const upper = 'B';
    for (let index = 0; index < 300; index += 1) {
      const next = rankBetween(lower, upper);
      expect(compareRank(lower, next)).toBe(-1);
      expect(compareRank(next, upper)).toBe(-1);
      lower = next;
    }
    let first = rankBetween();
    for (let index = 0; index < 200; index += 1) {
      const next = rankBetween(undefined, first);
      expect(compareRank(next, first)).toBe(-1);
      first = next;
    }
  });
});

describe('canonicalRank', () => {
  it('strips trailing zeroes, which carry no value', () => {
    expect(canonicalRank('V0')).toBe('V');
    expect(canonicalRank('V00')).toBe('V');
    expect(canonicalRank('0V')).toBe('0V');
    expect(canonicalRank('0')).toBe('');
  });
});

describe('orderCardIds', () => {
  it('orders by rank, breaking a collision by identity', () => {
    const state = boardWith({ cardIds: ['x', 'y', 'z'] }, [card('x', 'A'), card('y', 'B'), card('z', 'A')]);
    const column = state.columns[0] as ColumnItem;
    expect(orderCardIds(state, column)).toEqual(['x', 'z', 'y']);
  });

  it('computes the same order whatever order the identities arrive in', () => {
    const forward = boardWith({ cardIds: ['x', 'z'] }, [card('x', 'A'), card('z', 'A')]);
    const backward = boardWith({ cardIds: ['z', 'x'] }, [card('x', 'A'), card('z', 'A')]);
    expect(orderCardIds(forward, forward.columns[0] as ColumnItem)).toEqual(['x', 'z']);
    expect(orderCardIds(backward, backward.columns[0] as ColumnItem)).toEqual(['x', 'z']);
  });

  it('falls back to stored order while a column carries no ranks', () => {
    const state = boardWith({ cardIds: ['b', 'a'] }, [card('a'), card('b')]);
    expect(orderCardIds(state, state.columns[0] as ColumnItem)).toEqual(['b', 'a']);
  });

  it('ignores a reference with no card, as the rest of the board does', () => {
    const state = boardWith({ cardIds: ['a', 'ghost'] }, [card('a', 'A')]);
    expect(orderCardIds(state, state.columns[0] as ColumnItem)).toEqual(['a']);
  });
});

describe('normalizeBoard', () => {
  it('derives a rank for every card from stored order', () => {
    const legacy = boardWith({ cardIds: ['a', 'b', 'c'] }, [card('a'), card('b'), card('c')]);
    const normalized = normalizeBoard(legacy);
    for (const id of ['a', 'b', 'c']) {
      expect(normalized.cards[id]?.rank).toMatch(/^[0-9A-Za-z]+$/);
    }
    expect(orderCardIds(normalized, normalized.columns[0] as ColumnItem)).toEqual(['a', 'b', 'c']);
  });

  it('is deterministic, so two devices derive the same ranks', () => {
    const legacy = boardWith({ cardIds: ['a', 'b'] }, [card('a'), card('b')]);
    expect(normalizeBoard(legacy)).toEqual(normalizeBoard(legacy));
  });

  it('returns the same board when every card is already ranked', () => {
    const state = boardWith({ cardIds: ['a'] }, [card('a', 'V')]);
    expect(normalizeBoard(state)).toBe(state);
  });

  it('canonicalises a rank with trailing zeroes rather than leaving two spellings', () => {
    const state = boardWith({ cardIds: ['a'] }, [card('a', 'V0')]);
    expect(normalizeBoard(state).cards.a?.rank).toBe('V');
  });

  it('keeps existing ranks and only fills the gaps', () => {
    const state = boardWith({ cardIds: ['a', 'b'] }, [card('a', 'V'), card('b')]);
    const normalized = normalizeBoard(state);
    expect(normalized.cards.a?.rank).toBe('V');
    expect(compareRank('V', normalized.cards.b?.rank as string)).toBe(-1);
  });
});
