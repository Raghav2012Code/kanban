import { describe, expect, it } from 'vitest';
import { addCard, isFilterActive, moveCard, moveCardToAdjacentColumn, moveCardWithinColumn, pruneExpandedIds, removeCard, resolveInsertAfter } from '../board';
import type { BoardState, CardItem } from '../../types/kanban';

function board(): BoardState {
  return {
    cards: {
      a: { id: 'a', title: 'A', priority: 'low', createdAt: 1 },
      b: { id: 'b', title: 'B', priority: 'low', createdAt: 2 },
      c: { id: 'c', title: 'C', priority: 'low', createdAt: 3 },
      d: { id: 'd', title: 'D', priority: 'low', createdAt: 4 },
      e: { id: 'e', title: 'E', priority: 'low', createdAt: 5 },
    },
    columns: [
      { id: 'col-1', title: 'One', cardIds: ['a', 'b', 'e'] },
      { id: 'col-2', title: 'Two', cardIds: ['c', 'd'] },
    ],
  };
}

const ids = (state: BoardState, columnId: string): string[] => state.columns.find((column) => column.id === columnId)?.cardIds ?? [];

describe('resolveInsertAfter', () => {
  it('splits the target at its vertical midpoint', () => {
    expect(resolveInsertAfter(159, 100, 100)).toBe(true);
    expect(resolveInsertAfter(150, 100, 100)).toBe(true);
    expect(resolveInsertAfter(149, 100, 100)).toBe(false);
    expect(resolveInsertAfter(100, 100, 100)).toBe(false);
  });
});

describe('moveCard', () => {
  it('inserts before or after a target within a column', () => {
    expect(ids(moveCard(board(), 'a', 'col-1', 'b', false), 'col-1')).toEqual(['a', 'b', 'e']);
    expect(ids(moveCard(board(), 'e', 'col-1', 'a', false), 'col-1')).toEqual(['e', 'a', 'b']);
    expect(ids(moveCard(board(), 'a', 'col-1', 'b', true), 'col-1')).toEqual(['b', 'a', 'e']);
  });

  it('appends when moved across columns without a target', () => {
    const moved = moveCard(board(), 'a', 'col-2');
    expect(ids(moved, 'col-1')).toEqual(['b', 'e']);
    expect(ids(moved, 'col-2')).toEqual(['c', 'd', 'a']);
  });

  it('is a no-op when dropped onto itself or into an unknown column', () => {
    const state = board();
    expect(moveCard(state, 'a', 'col-1', 'a')).toBe(state);
    expect(moveCard(state, 'a', 'missing')).toBe(state);
  });

  it('ignores a positional anchor when positional movement is disabled', () => {
    const filtered = { ...board(), cards: { ...board().cards } };
    const moved = moveCard(filtered, 'a', 'col-2', 'c', false, { positional: false });
    expect(ids(moved, 'col-2')).toEqual(['c', 'd', 'a']);
  });
});

describe('moveCardWithinColumn', () => {
  it('moves a card one slot up or down', () => {
    expect(ids(moveCardWithinColumn(board(), 'b', 'up'), 'col-1')).toEqual(['b', 'a', 'e']);
    expect(ids(moveCardWithinColumn(board(), 'b', 'down'), 'col-1')).toEqual(['a', 'e', 'b']);
  });

  it('stays put at the column boundaries', () => {
    const state = board();
    expect(moveCardWithinColumn(state, 'a', 'up')).toBe(state);
    expect(moveCardWithinColumn(state, 'e', 'down')).toBe(state);
  });
});

describe('moveCardToAdjacentColumn', () => {
  it('appends to the neighbouring column', () => {
    const moved = moveCardToAdjacentColumn(board(), 'a', 'right');
    expect(ids(moved, 'col-1')).toEqual(['b', 'e']);
    expect(ids(moved, 'col-2')).toEqual(['c', 'd', 'a']);
  });

  it('stays put at the outer columns', () => {
    const state = board();
    expect(moveCardToAdjacentColumn(state, 'a', 'left')).toBe(state);
    expect(moveCardToAdjacentColumn(state, 'c', 'right')).toBe(state);
  });
});

describe('removeCard', () => {
  it('removes the card and its column membership', () => {
    const removed = removeCard(board(), 'b');
    expect(removed.cards.b).toBeUndefined();
    expect(ids(removed, 'col-1')).toEqual(['a', 'e']);
  });

  it('is a no-op for an unknown card', () => {
    const state = board();
    expect(removeCard(state, 'missing')).toBe(state);
  });
});

describe('addCard', () => {
  const card: CardItem = { id: 'f', title: 'F', priority: 'medium', createdAt: 6 };

  it('adds the card to the requested column', () => {
    const added = addCard(board(), 'col-2', card);
    expect(added.cards.f).toEqual(card);
    expect(ids(added, 'col-2')).toEqual(['c', 'd', 'f']);
  });

  it('is a no-op for a duplicate id or unknown column', () => {
    const state = board();
    expect(addCard(state, 'col-2', { ...card, id: 'a' })).toBe(state);
    expect(addCard(state, 'missing', card)).toBe(state);
  });
});

describe('isFilterActive', () => {
  it('treats a blank query and the all filter as inactive', () => {
    expect(isFilterActive('', 'all')).toBe(false);
    expect(isFilterActive('   ', 'all')).toBe(false);
    expect(isFilterActive('tax', 'all')).toBe(true);
    expect(isFilterActive('', 'high')).toBe(true);
  });
});

describe('pruneExpandedIds', () => {
  it('drops the removed card and preserves the original set otherwise', () => {
    const expanded = new Set(['a', 'b']);
    const pruned = pruneExpandedIds(expanded, 'a');
    expect([...pruned]).toEqual(['b']);
    expect(pruneExpandedIds(expanded, 'missing')).toBe(expanded);
  });
});
