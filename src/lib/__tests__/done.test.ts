import { describe, expect, it } from 'vitest';
import { doneCardIds, getDoneColumn, isDoneCard, isDoneColumn } from '../done';
import { createSeedState } from '../persistence';

describe('isDoneColumn', () => {
  it('identifies the done column by stable id, not by display title', () => {
    expect(isDoneColumn({ id: 'column-done', title: 'Completed', cardIds: [] })).toBe(true);
    expect(isDoneColumn({ id: 'column-other', title: 'Done', cardIds: [] })).toBe(false);
  });
});

describe('done tracking', () => {
  it('survives renaming the done column', () => {
    const board = createSeedState(new Date(2026, 8, 25));
    const renamed = { ...board, columns: board.columns.map((column) => (column.id === 'column-done' ? { ...column, title: 'Shipped' } : column)) };
    expect(getDoneColumn(renamed)?.title).toBe('Shipped');
    expect(isDoneCard(renamed, 'card-tax')).toBe(true);
    expect(doneCardIds(renamed)).toEqual(['card-tax']);
  });

  it('reports no done cards when the done column is absent', () => {
    const board = createSeedState(new Date(2026, 8, 25));
    const without = { ...board, columns: board.columns.filter((column) => column.id !== 'column-done') };
    expect(getDoneColumn(without)).toBeUndefined();
    expect(isDoneCard(without, 'card-tax')).toBe(false);
    expect(doneCardIds(without)).toEqual([]);
  });
});
