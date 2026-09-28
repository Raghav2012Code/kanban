import { beforeEach, describe, expect, it } from 'vitest';
import { createLocalBoardStore } from '../board-store';
import { STORAGE_KEY } from '../constants';
import { createSeedState, isValidBoard } from '../persistence';

/**
 * The seam's contract, held against the local implementation. A remote
 * implementation has to satisfy the same three questions, so the contract is stated
 * here rather than left implicit in one implementation.
 */
describe('the Board Store seam', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('reports an empty board when nothing has been saved, and that board is valid', () => {
    const { status } = createLocalBoardStore().read();
    expect(status).toBe('empty');
    // A brand-new board must still be a board the board would accept.
    const board = createSeedState();
    expect(isValidBoard(board)).toBe(true);
  });

  it('round-trips a board through write then read, unchanged', () => {
    const store = createLocalBoardStore();
    const board = createSeedState(new Date(2026, 8, 25));

    expect(store.write(board)).toEqual({ ok: true });
    expect(store.read().status).toBe('loaded');
    expect(store.read().board).toEqual(board);
  });

  it('reports a write that could not happen rather than pretending it did', () => {
    const store = createLocalBoardStore();
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = function setItem() {
      const error = new Error('full');
      error.name = 'QuotaExceededError';
      throw error;
    };
    try {
      expect(store.write(createSeedState())).toEqual({ ok: false, reason: 'quota' });
    } finally {
      Storage.prototype.setItem = original;
    }
  });

  it('surfaces corrupt saved data as unreadable rather than as an empty board', () => {
    window.localStorage.setItem(STORAGE_KEY, '{not json');
    const { status } = createLocalBoardStore().read();
    // The distinction matters: a refusal to read is not the same as nothing saved.
    expect(status).toBe('corrupt');
  });
});
