import { describe, expect, it } from 'vitest';
import { sortCardIds } from '../sort';
import type { BoardState } from '../../types/kanban';

/**
 * Sorting is a read of the board. These tests assert what the view shows and,
 * just as importantly, that stored order is never touched by looking at it.
 */

function board(): BoardState {
  return {
    cards: {
      a: { id: 'a', title: 'A', priority: 'medium', createdAt: 300, dueDate: '2026-10-10' },
      b: { id: 'b', title: 'B', priority: 'medium', createdAt: 100, dueDate: '2026-09-20' },
      c: { id: 'c', title: 'C', priority: 'medium', createdAt: 200, dueDate: '2026-09-25' },
      undated: { id: 'undated', title: 'U', priority: 'medium', createdAt: 50 },
      alsoUndated: { id: 'alsoUndated', title: 'U2', priority: 'medium', createdAt: 25 },
      clipped: { id: 'clipped', title: 'X', priority: 'medium', createdAt: 10, dueDate: '2026-01-01' },
    },
    columns: [{ id: 'col-1', title: 'One', cardIds: ['a', 'b', 'c', 'undated', 'alsoUndated', 'clipped'] }],
  };
}

const stored = (): string[] => board().columns[0]?.cardIds ?? [];

describe('sortCardIds', () => {
  it('returns stored order untouched in manual mode', () => {
    expect(sortCardIds(stored(), board(), 'manual')).toEqual(stored());
  });

  it('orders by due date, earliest first', () => {
    expect(sortCardIds(stored(), board(), 'dueDate')).toEqual(['clipped', 'b', 'c', 'a', 'alsoUndated', 'undated']);
  });

  it('places undated cards after every dated one, deterministically', () => {
    const sorted = sortCardIds(stored(), board(), 'dueDate');
    // The two undated cards land last, in a defined order between themselves.
    expect(sorted.slice(-2)).toEqual(['alsoUndated', 'undated']);
    // Reproducible: the same board must render the same way every time, and the
    // result must not depend on the order the ids arrived in.
    expect(sortCardIds(stored(), board(), 'dueDate')).toEqual(sorted);
    expect(sortCardIds([...stored()].reverse(), board(), 'dueDate')).toEqual(sorted);
  });

  // Every card has a filed value, so unlike a due-date sort there are no undated
  // cards to place and the order is a plain oldest-first sequence by createdAt.
  it('orders by filed date, oldest first', () => {
    expect(sortCardIds(stored(), board(), 'filedDate')).toEqual([
      'clipped',
      'alsoUndated',
      'undated',
      'b',
      'c',
      'a',
    ]);
  });

  it('never rewrites stored order, however many times it is asked', () => {
    const state = board();
    const before = state.columns[0]?.cardIds;
    sortCardIds(before ?? [], state, 'dueDate');
    sortCardIds(before ?? [], state, 'filedDate');
    expect(state.columns[0]?.cardIds).toEqual(before);
  });

  it('is stable when two cards share a sort value, falling back to identity', () => {
    const tied: BoardState = {
      cards: {
        first: { id: 'first', title: 'F', priority: 'medium', createdAt: 1, dueDate: '2026-05-05' },
        second: { id: 'second', title: 'S', priority: 'medium', createdAt: 1, dueDate: '2026-05-05' },
      },
      columns: [{ id: 'col-1', title: 'One', cardIds: ['second', 'first'] }],
    };
    expect(sortCardIds(['second', 'first'], tied, 'dueDate')).toEqual(['first', 'second']);
    expect(sortCardIds(['first', 'second'], tied, 'dueDate')).toEqual(['first', 'second']);
  });

  it('tolerates an id with no card behind it, rather than throwing', () => {
    expect(sortCardIds(['a', 'ghost'], board(), 'dueDate')).toEqual(['a', 'ghost']);
  });
});
