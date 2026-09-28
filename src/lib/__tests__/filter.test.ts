import { describe, expect, it } from 'vitest';
import { isDueWithin, isViewActive, isVisibleCard, matchesColumnTitle, matchesQuery, NO_FILTERS, visibleByColumn, visibleCardIds } from '../filter';
import type { BoardState, CardItem } from '../../types/kanban';
import type { FilterCriteria } from '../filter';

const TODAY = '2026-09-25';

function criteria(patch: Partial<FilterCriteria> = {}): FilterCriteria {
  return { ...NO_FILTERS, ...patch };
}

function card(patch: Partial<CardItem> = {}): CardItem {
  return { id: 'x', title: 'X', priority: 'medium', createdAt: 1, ...patch };
}

function board(): BoardState {
  return {
    cards: {
      a: { id: 'a', title: 'Read journal', description: 'about design', priority: 'low', createdAt: 1 },
      b: { id: 'b', title: 'Ship feature', description: 'write tests', priority: 'high', createdAt: 2, dueDate: '2026-09-20' },
      c: { id: 'c', title: 'Book flight', priority: 'medium', createdAt: 3, dueDate: '2026-09-28' },
      d: { id: 'd', title: 'Draft notes', description: 'Book club agenda', priority: 'high', createdAt: 4, dueDate: '2026-10-30' },
      e: { id: 'e', title: 'Undated work', priority: 'medium', createdAt: 5 },
      tax: { id: 'tax', title: 'Filed long ago', priority: 'low', createdAt: 6, dueDate: '2020-01-01' },
    },
    columns: [
      { id: 'col-1', title: 'One', cardIds: ['a', 'b'] },
      { id: 'col-2', title: 'Two', cardIds: ['c', 'd', 'e'] },
      { id: 'column-done', title: 'Done', cardIds: ['tax'] },
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

describe('matchesColumnTitle', () => {
  it('matches a stage name, case-insensitively, and treats blank as all', () => {
    const column = board().columns[0];
    if (!column) throw new Error('fixture has no columns');
    expect(matchesColumnTitle(column, 'one')).toBe(true);
    expect(matchesColumnTitle(column, 'ON')).toBe(true);
    expect(matchesColumnTitle(column, '')).toBe(true);
    expect(matchesColumnTitle(column, 'two')).toBe(false);
  });
});

describe('isDueWithin', () => {
  it('admits work due inside the window, counting from today', () => {
    expect(isDueWithin(card({ dueDate: TODAY }), 7, TODAY)).toBe(true);
    expect(isDueWithin(card({ dueDate: '2026-10-02' }), 7, TODAY)).toBe(true);
    expect(isDueWithin(card({ dueDate: '2026-10-03' }), 7, TODAY)).toBe(false);
  });

  it('excludes undated work rather than lumping it in with work due soon', () => {
    expect(isDueWithin(card(), 7, TODAY)).toBe(false);
  });
});

describe('isVisibleCard', () => {
  it('still combines the priority filter with the search query', () => {
    const query = criteria({ query: 'book' });
    expect(isVisibleCard(board().cards.c, query)).toBe(true);
    expect(isVisibleCard(board().cards.d, query)).toBe(true);
    expect(isVisibleCard(board().cards.a, query)).toBe(false);
    expect(isVisibleCard(board().cards.c, criteria({ priority: 'high' }))).toBe(false);
    expect(isVisibleCard(board().cards.b, criteria({ priority: 'high' }))).toBe(true);
  });

  it('admits only overdue cards when the overdue dimension is set', () => {
    const overdue = criteria({ overdueOnly: true });
    expect(isVisibleCard(board().cards.b, overdue, { today: TODAY })).toBe(true);
    expect(isVisibleCard(board().cards.c, overdue, { today: TODAY })).toBe(false);
  });

  it('never calls a card in Done overdue, matching the completion rule', () => {
    expect(isVisibleCard(board().cards.tax, criteria({ overdueOnly: true }), { done: true, today: TODAY })).toBe(false);
  });

  it('admits only work due inside the chosen window', () => {
    const window = criteria({ dueWithinDays: 7 });
    expect(isVisibleCard(board().cards.c, window, { today: TODAY })).toBe(true);
    expect(isVisibleCard(board().cards.d, window, { today: TODAY })).toBe(false);
    expect(isVisibleCard(board().cards.e, window, { today: TODAY })).toBe(false);
  });

  it('admits only work filed inside the chosen window', () => {
    // "Today" here is a fixed date, so the fixture dates are built relative to it
    // rather than to the machine's clock, which the test does not control.
    const sixHoursAgo = new Date(2026, 8, 25, 6).getTime();
    const longAgo = new Date(2026, 7, 1).getTime();
    const recent = criteria({ filedWithinDays: 7 });
    expect(isVisibleCard(card({ id: 'fresh', createdAt: sixHoursAgo }), recent, { today: TODAY })).toBe(true);
    expect(isVisibleCard(card({ id: 'stale', createdAt: longAgo }), recent, { today: TODAY })).toBe(false);
    // A card filed in the future is not "filed recently"; it is a clock problem.
    const future = new Date(2026, 8, 30).getTime();
    expect(isVisibleCard(card({ id: 'future', createdAt: future }), recent, { today: TODAY })).toBe(false);
  });

  it('treats an unset dimension as no filter at all', () => {
    expect(isVisibleCard(board().cards.a, NO_FILTERS)).toBe(true);
    expect(isVisibleCard(board().cards.e, NO_FILTERS)).toBe(true);
  });
});

describe('visibleByColumn', () => {
  it('returns the visible ids per column so counts match the filtered view', () => {
    const visible = visibleByColumn(board(), criteria({ query: 'book' }), TODAY);
    expect(visible['col-1']).toEqual([]);
    expect(visible['col-2']).toEqual(['c', 'd']);
  });

  it('scopes visible ids to the given column', () => {
    const state = board();
    const column = state.columns[1];
    if (!column) throw new Error('fixture has no columns');
    expect(visibleCardIds(column, state, criteria({ priority: 'high' }), TODAY)).toEqual(['d']);
  });

  it('finds a column by its title, so searching a stage name finds it', () => {
    const visible = visibleByColumn(board(), criteria({ columnTitle: 'two' }), TODAY);
    expect(visible['col-1']).toEqual([]);
    expect(visible['col-2']).toEqual(['c', 'd', 'e']);
  });

  it('never reports an overdue card inside Done', () => {
    const visible = visibleByColumn(board(), criteria({ overdueOnly: true }), TODAY);
    expect(visible['column-done']).toEqual([]);
  });
});

describe('isViewActive', () => {
  it('is inactive when nothing is filtered and the order is manual', () => {
    expect(isViewActive(NO_FILTERS, 'manual')).toBe(false);
  });

  it('is active for a text query, a priority, or a sort', () => {
    expect(isViewActive(criteria({ query: 'x' }), 'manual')).toBe(true);
    expect(isViewActive(criteria({ priority: 'high' }), 'manual')).toBe(true);
    expect(isViewActive(NO_FILTERS, 'dueDate')).toBe(true);
    expect(isViewActive(NO_FILTERS, 'filedDate')).toBe(true);
  });

  // A non-query dimension is the case the old guard never exercised. Without it a
  // gate that ignored the new dimensions would stay green while the scramble is back.
  it('is active for every non-query dimension, which is what the old guard missed', () => {
    expect(isViewActive(criteria({ overdueOnly: true }), 'manual')).toBe(true);
    expect(isViewActive(criteria({ dueWithinDays: 7 }), 'manual')).toBe(true);
    expect(isViewActive(criteria({ columnTitle: 'todo' }), 'manual')).toBe(true);
    expect(isViewActive(criteria({ filedWithinDays: 7 }), 'manual')).toBe(true);
  });

  // A dimension registered in the criteria but not in the gate would leave
  // positional reordering enabled over a view that does not match stored order, and
  // nothing else would notice. So the gate is checked against the criteria's own keys.
  it('knows about every dimension the criteria declares', () => {
    const declared = Object.keys(NO_FILTERS).filter((key) => key !== 'sort') as Array<keyof FilterCriteria>;
    for (const key of declared) {
      // A value that is "set" for this dimension, so the gate has to notice it.
      const set: FilterCriteria = { ...NO_FILTERS, [key]: key === 'priority' ? 'high' : key === 'overdueOnly' ? true : key === 'query' || key === 'columnTitle' ? 'x' : 7 } as FilterCriteria;
      expect(isViewActive(set, 'manual'), `${key} is a dimension the gate ignores`).toBe(true);
    }
  });
});
