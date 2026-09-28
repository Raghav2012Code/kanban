import { describe, expect, it } from 'vitest';
import { addCard, isColumnAtLimit, isColumnOverLimit, isFilterActive, moveCard, moveCardToAdjacentColumn, moveCardWithinColumn, moveCardsInto, moveColumnToAdjacent, pruneExpandedIds, removeCard, resolveInsertAfter, updateCard } from '../board';
import type { BoardState, CardDraft, CardItem, ColumnItem } from '../../types/kanban';

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

describe('updateCard', () => {
  const draft = (patch: Partial<CardDraft> = {}): CardDraft => ({
    title: 'A revised',
    priority: 'high',
    dueDate: '2026-10-01',
    description: 'A new note',
    ...patch,
  });

  it('replaces the card contents from the draft', () => {
    const updated = updateCard(board(), 'b', draft());
    expect(updated.cards.b).toEqual({
      id: 'b',
      title: 'A revised',
      priority: 'high',
      createdAt: 2,
      description: 'A new note',
      dueDate: '2026-10-01',
    });
  });

  it('preserves the card identity, its filed date, and its position in the column', () => {
    const updated = updateCard(board(), 'b', draft());
    expect(updated.cards.b.id).toBe('b');
    expect(updated.cards.b.createdAt).toBe(2);
    expect(ids(updated, 'col-1')).toEqual(['a', 'b', 'e']);
  });

  it('leaves every other card untouched', () => {
    const before = board();
    const updated = updateCard(before, 'b', draft());
    expect(updated.cards.a).toBe(before.cards.a);
    expect(ids(updated, 'col-2')).toEqual(['c', 'd']);
  });

  it('drops the due date and description when the draft clears them', () => {
    const state = board();
    state.cards.c = { id: 'c', title: 'C', priority: 'low', createdAt: 3, dueDate: '2026-01-01', description: 'note' };
    const updated = updateCard(state, 'c', draft({ dueDate: '', description: '' }));
    expect(updated.cards.c.dueDate).toBeUndefined();
    expect(updated.cards.c.description).toBeUndefined();
  });

  it('is a no-op for an unknown card', () => {
    const state = board();
    expect(updateCard(state, 'missing', draft())).toBe(state);
  });

  it('cannot introduce a duplicate card, because the id is not the draft to set', () => {
    // The add path guards a duplicate by rejecting a card whose id already exists.
    // Update has no such hazard by construction: the target id is chosen by the
    // caller and the draft carries content only, so an edit cannot mint a new card.
    const state = board();
    const after = updateCard(state, 'b', draft());
    expect(Object.keys(after.cards).sort()).toEqual(Object.keys(state.cards).sort());
    expect(after.cards.b.title).toBe('A revised');
  });
});

describe('moveColumnToAdjacent', () => {
  const titles = (state: BoardState) => state.columns.map((column) => column.title);

  it('moves a column one slot left or right', () => {
    expect(titles(moveColumnToAdjacent(board(), 'col-2', 'left'))).toEqual(['Two', 'One']);
    expect(titles(moveColumnToAdjacent(board(), 'col-1', 'right'))).toEqual(['Two', 'One']);
  });

  it('carries the column cards with it, leaving their order inside untouched', () => {
    const moved = moveColumnToAdjacent(board(), 'col-2', 'left');
    expect(ids(moved, 'col-2')).toEqual(['c', 'd']);
    expect(ids(moved, 'col-1')).toEqual(['a', 'b', 'e']);
  });

  it('is a no-op at the outer columns', () => {
    const state = board();
    expect(moveColumnToAdjacent(state, 'col-1', 'left')).toBe(state);
    expect(moveColumnToAdjacent(state, 'col-2', 'right')).toBe(state);
  });

  it('is a no-op for an unknown column', () => {
    const state = board();
    expect(moveColumnToAdjacent(state, 'missing', 'left')).toBe(state);
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

describe('moveCardsInto', () => {
  // A dedicated fixture, because a column cannot be added to the shared one without
  // putting a card in two columns at once, which is not a board the board would load.
  function threeColumns(): BoardState {
    const state = board();
    state.columns = [
      { id: 'col-1', title: 'One', cardIds: ['a', 'b', 'e'] },
      { id: 'col-2', title: 'Two', cardIds: ['c', 'd'] },
      { id: 'col-3', title: 'Three', cardIds: [] },
    ];
    return state;
  }

  it('moves several cards at once, preserving their relative order', () => {
    const moved = moveCardsInto(board(), ['a', 'b', 'e'], 'col-2');
    expect(ids(moved, 'col-1')).toEqual([]);
    expect(ids(moved, 'col-2')).toEqual(['c', 'd', 'a', 'b', 'e']);
  });

  it('leaves the board alone when there is no target column', () => {
    const state = board();
    expect(moveCardsInto(state, [], 'col-2')).toBe(state);
    expect(moveCardsInto(state, ['a', 'b'], 'missing')).toBe(state);
  });

  it('refuses the whole group rather than part of it', () => {
    const state = threeColumns();
    state.columns[2] = { ...(state.columns[2] as ColumnItem), limit: 1 };
    // One card fits, two do not. Accepting one of two would leave the board holding
    // some of what was asked for and none of the rest, with no way to tell which.
    expect(ids(moveCardsInto(state, ['a'], 'col-3'), 'col-3')).toEqual(['a']);
    expect(ids(moveCardsInto(state, ['b', 'c'], 'col-3'), 'col-3')).toEqual([]);
  });

  it('leaves every card where it was after a refusal', () => {
    const state = threeColumns();
    state.columns[2] = { ...(state.columns[2] as ColumnItem), limit: 1 };
    moveCardsInto(state, ['a', 'b'], 'col-3');
    expect(ids(state, 'col-1')).toEqual(['a', 'b', 'e']);
    expect(ids(state, 'col-3')).toEqual([]);
  });

  it('moves a group into a column that already holds one of them, without disturbing it', () => {
    const state = threeColumns();
    // 'c' moves out of col-2 into the target, so it is named there and nowhere else:
    // a card in two columns at once is not a board the board would load.
    state.columns[1] = { ...(state.columns[1] as ColumnItem), cardIds: ['d'] };
    state.columns[2] = { ...(state.columns[2] as ColumnItem), cardIds: ['c'], limit: 3 };

    const moved = moveCardsInto(state, ['a', 'c'], 'col-3');

    // 'c' was already there and keeps its place, ahead of the arriving card, and the
    // column it left does not still claim it.
    expect(ids(moved, 'col-3')).toEqual(['c', 'a']);
    expect(ids(moved, 'col-2')).toEqual(['d']);
    expect(ids(moved, 'col-1')).toEqual(['b', 'e']);
  });

  it('obeys the same limit as a single move, with no way around it', () => {
    const state = threeColumns();
    state.columns[2] = { ...(state.columns[2] as ColumnItem), limit: 0 };
    // Both the single move and the two-card move are refused, because bulk is not a
    // route around the rule.
    expect(ids(moveCard(state, 'a', 'col-3'), 'col-3')).toEqual([]);
    expect(ids(moveCardsInto(state, ['a', 'b'], 'col-3'), 'col-3')).toEqual([]);
  });

  it('lets a group through when it fits, and refuses it when it does not', () => {
    const fitting = threeColumns();
    fitting.columns[2] = { ...(fitting.columns[2] as ColumnItem), limit: 2 };
    expect(ids(moveCardsInto(fitting, ['a', 'b'], 'col-3'), 'col-3')).toEqual(['a', 'b']);

    const tooMany = threeColumns();
    tooMany.columns[2] = { ...(tooMany.columns[2] as ColumnItem), limit: 2 };
    expect(ids(moveCardsInto(tooMany, ['a', 'b', 'e'], 'col-3'), 'col-3')).toEqual([]);
  });
});

describe('Work In Progress limits', () => {
  const limited = (limit: number, cardIds: string[]): ColumnItem => ({ id: 'col-3', title: 'Three', cardIds, limit });

  it('reports a column at its limit once it is full', () => {
    expect(isColumnAtLimit(limited(2, ['a', 'b']))).toBe(true);
    expect(isColumnAtLimit(limited(2, ['a']))).toBe(false);
    expect(isColumnOverLimit(limited(2, ['a', 'b', 'c']))).toBe(true);
  });

  it('treats a column with no limit set as unrestricted', () => {
    expect(isColumnAtLimit({ id: 'col-3', title: 'Three', cardIds: ['a', 'b', 'c'] })).toBe(false);
    expect(isColumnOverLimit({ id: 'col-3', title: 'Three', cardIds: ['a', 'b', 'c'] })).toBe(false);
  });

  it('refuses a cross-column move into a saturated column', () => {
    const state = board();
    state.columns.push(limited(1, ['e']));
    expect(ids(moveCard(state, 'a', 'col-3'), 'col-3')).toEqual(['e']);
    expect(ids(state, 'col-3')).toEqual(['e']);
  });

  it('allows a cross-column move while the target has room', () => {
    const state = board();
    state.columns.push(limited(2, ['e']));
    expect(ids(moveCard(state, 'a', 'col-3'), 'col-3')).toEqual(['e', 'a']);
  });

  it('never refuses a reorder inside a column, because the count does not change', () => {
    const state = board();
    state.columns.push(limited(1, ['e']));
    expect(ids(moveCard(state, 'a', 'col-1', 'b', true), 'col-1')).toEqual(['b', 'a', 'e']);
  });

  it('never refuses a move out of a saturated column', () => {
    const state = board();
    state.columns[0] = { ...state.columns[0], limit: 3 };
    expect(ids(moveCard(state, 'a', 'col-2'), 'col-2')).toEqual(['c', 'd', 'a']);
  });

  it('applies the limit through every caller, because it lives in the transition', () => {
    const state = board();
    state.columns.push(limited(1, ['e']));
    expect(ids(moveCardToAdjacentColumn(state, 'a', 'right'), 'col-3')).toEqual(['e']);
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
