import { describe, expect, it } from 'vitest';
import { computeAnalytics } from '../analytics';
import type { BoardState } from '../../types/kanban';

function board(): BoardState {
  return {
    cards: {
      a: { id: 'a', title: 'Past open', priority: 'low', dueDate: '2026-09-01', createdAt: 1 },
      b: { id: 'b', title: 'Future open', priority: 'low', dueDate: '2026-10-01', createdAt: 2 },
      c: { id: 'c', title: 'Past done', priority: 'low', dueDate: '2026-09-01', createdAt: 3 },
      d: { id: 'd', title: 'No due', priority: 'low', createdAt: 4 },
    },
    columns: [
      { id: 'column-todo', title: 'To Do', cardIds: ['a', 'b', 'd'] },
      { id: 'column-done', title: 'Done', cardIds: ['c'] },
    ],
  };
}

describe('computeAnalytics', () => {
  it('counts totals, done, completion, and overdue excluding the done column', () => {
    expect(computeAnalytics(board(), '2026-09-25')).toEqual({ total: 4, done: 1, overdue: 1, completion: 25 });
  });

  it('keeps done and strikethrough using the same column identity after a rename', () => {
    const state = board();
    const renamed = { ...state, columns: state.columns.map((column) => (column.id === 'column-done' ? { ...column, title: 'Shipped' } : column)) };
    expect(computeAnalytics(renamed, '2026-09-25')).toEqual({ total: 4, done: 1, overdue: 1, completion: 25 });
  });

  it('reports zero completion for an empty board', () => {
    expect(computeAnalytics({ cards: {}, columns: [] }, '2026-09-25')).toEqual({ total: 0, done: 0, overdue: 0, completion: 0 });
  });
});
