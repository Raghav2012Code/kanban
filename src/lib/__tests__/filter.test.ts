import { describe, expect, it } from 'vitest';
import { isVisibleCard, matchesQuery, visibleByColumn, visibleCardIds } from '../filter';
import type { BoardState } from '../../types/kanban';

function board(): BoardState {
  return {
    cards: {
      a: { id: 'a', title: 'Read journal', description: 'about design', priority: 'low', createdAt: 1 },
      b: { id: 'b', title: 'Ship feature', description: 'write tests', priority: 'high', createdAt: 2 },
      c: { id: 'c', title: 'Book flight', priority: 'medium', createdAt: 3 },
      d: { id: 'd', title: 'Draft notes', description: 'Book club agenda', priority: 'high', createdAt: 4 },
    },
    columns: [
      { id: 'col-1', title: 'One', cardIds: ['a', 'b'] },
      { id: 'col-2', title: 'Two', cardIds: ['c', 'd'] },
    ],
  };
}

describe('matchesQuery', () => {
  it('matches title or description case-insensitively and treats blank as all', () => {
    expect(matchesQuery(board().cards.a, 'read')).toBe(true);
    expect(matchesQuery(board().cards.a, 'design')).toBe(true);
    expect(matchesQuery(board().cards.a, 'DESIGN')).toBe(true);
    expect(matchesQuery(board().cards.a, '')).toBe(true);
    expect(matchesQuery(board().cards.a, 'missing')).toBe(false);
  });
});

describe('isVisibleCard', () => {
  it('combines the priority filter with the search query', () => {
    const criteria = { query: 'book', priority: 'all' as const };
    expect(isVisibleCard(board().cards.c, criteria)).toBe(true);
    expect(isVisibleCard(board().cards.d, criteria)).toBe(true);
    expect(isVisibleCard(board().cards.a, criteria)).toBe(false);
    expect(isVisibleCard(board().cards.c, { query: '', priority: 'high' })).toBe(false);
    expect(isVisibleCard(board().cards.b, { query: '', priority: 'high' })).toBe(true);
  });
});

describe('visibleByColumn', () => {
  it('returns the visible ids per column so counts match the filtered view', () => {
    const visible = visibleByColumn(board(), { query: 'book', priority: 'all' });
    expect(visible['col-1']).toEqual([]);
    expect(visible['col-2']).toEqual(['c', 'd']);
  });

  it('scopes visible ids to the given column', () => {
    const state = board();
    const column = state.columns[1];
    expect(visibleCardIds(column, state, { query: '', priority: 'high' })).toEqual(['d']);
  });
});
