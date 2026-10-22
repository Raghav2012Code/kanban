import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import { HISTORY_LIMIT, useKanbanBoard } from '../useKanbanBoard';
import { addCard, removeCard, updateCard } from '../../lib/board';
import { STORAGE_KEY } from '../../lib/constants';
import { createSeedState } from '../../lib/persistence';
import type { CardDraft } from '../../types/kanban';

const draft: CardDraft = { title: 'Renamed', priority: 'low', dueDate: '', description: '' };

afterEach(() => {
  vi.restoreAllMocks();
  window.localStorage.clear();
});

describe('useKanbanBoard storage warnings', () => {
  it('surfaces a quota warning when persistence fails', async () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      const error = new Error('full');
      error.name = 'QuotaExceededError';
      throw error;
    });
    const { result } = renderHook(() => useKanbanBoard());
    await waitFor(() => expect(result.current.storageWarning).toEqual({ kind: 'quota' }));
  });

  it('does not warn when persistence succeeds', () => {
    const { result } = renderHook(() => useKanbanBoard());
    expect(result.current.storageWarning).toBeNull();
  });
});

describe('useKanbanBoard storage warning recovery', () => {
  const quotaError = (): Error => {
    const error = new Error('full');
    error.name = 'QuotaExceededError';
    return error;
  };

  it('clears a write warning once writing succeeds again', async () => {
    const original = Storage.prototype.setItem;
    const quota = quotaError();
    let full = true;
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (this: Storage, key: string, value: string) {
      if (full) throw quota;
      original.call(this, key, value);
    });
    const { result } = renderHook(() => useKanbanBoard());
    await waitFor(() => expect(result.current.storageWarning).toEqual({ kind: 'quota' }));

    full = false;
    act(() => result.current.mutate((board) => addCard(board, board.columns[0]!.id, { id: 'recovered', title: 'Recovered', priority: 'low', createdAt: 0 })));
    await waitFor(() => expect(result.current.storageWarning).toBeNull());
  });

  it('warns again after a dismissed failure once a later write fails too', async () => {
    const original = Storage.prototype.setItem;
    const quota = quotaError();
    let full = true;
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (this: Storage, key: string, value: string) {
      if (full) throw quota;
      original.call(this, key, value);
    });
    const { result } = renderHook(() => useKanbanBoard());
    await waitFor(() => expect(result.current.storageWarning).toEqual({ kind: 'quota' }));

    act(() => result.current.dismissStorageWarning());
    expect(result.current.storageWarning).toBeNull();

    // A successful write proves the failure is over, so the dismissal is spent.
    full = false;
    act(() => result.current.mutate((board) => addCard(board, board.columns[0]!.id, { id: 'recovered', title: 'Recovered', priority: 'low', createdAt: 0 })));
    await waitFor(() => expect(result.current.storageWarning).toBeNull());

    // The next failure is a new fact and must not stay silenced.
    full = true;
    act(() => result.current.mutate((board) => addCard(board, board.columns[0]!.id, { id: 'failed-again', title: 'Failed again', priority: 'low', createdAt: 0 })));
    await waitFor(() => expect(result.current.storageWarning).toEqual({ kind: 'quota' }));
  });
});

describe('useKanbanBoard cross-tab adoption', () => {
  const incomingBoard = (board: ReturnType<typeof useKanbanBoard>['board']) => ({
    ...board,
    cards: { ...board.cards, 'card-tax': { ...board.cards['card-tax']!, title: 'From the other tab' } },
  });

  it('adopts another tab board, clears history, and reports the update once', () => {
    const { result } = renderHook(() => useKanbanBoard());
    act(() => result.current.mutate((board) => addCard(board, board.columns[0]!.id, { id: 'mine', title: 'Mine', priority: 'low', createdAt: 0 })));
    expect(result.current.canUndo).toBe(true);

    const incoming = incomingBoard(result.current.board);
    const newValue = JSON.stringify(incoming);
    act(() => {
      window.dispatchEvent(new StorageEvent('storage', { key: STORAGE_KEY, newValue }));
    });

    expect(result.current.board.cards['card-tax']?.title).toBe('From the other tab');
    // Undo belongs to this tab's work; it must not unmake another tab's.
    expect(result.current.canUndo).toBe(false);
    expect(result.current.externalUpdateCount).toBe(1);

    // An echo of the value the tab just adopted is not a new update.
    act(() => {
      window.dispatchEvent(new StorageEvent('storage', { key: STORAGE_KEY, newValue }));
    });
    expect(result.current.externalUpdateCount).toBe(1);
  });

  it('ignores an invalid or unrelated storage event', () => {
    const { result } = renderHook(() => useKanbanBoard());
    const before = result.current.board;

    act(() => {
      window.dispatchEvent(new StorageEvent('storage', { key: STORAGE_KEY, newValue: '{not json' }));
      window.dispatchEvent(new StorageEvent('storage', { key: STORAGE_KEY, newValue: JSON.stringify({ foo: 1 }) }));
      window.dispatchEvent(new StorageEvent('storage', { key: 'something_else', newValue: JSON.stringify(createSeedState()) }));
    });

    expect(result.current.board).toBe(before);
    expect(result.current.externalUpdateCount).toBe(0);
  });
});

describe('useKanbanBoard history', () => {
  it('starts with nothing to undo or redo', () => {
    const { result } = renderHook(() => useKanbanBoard());
    expect(result.current.canUndo).toBe(false);
    expect(result.current.canRedo).toBe(false);
  });

  it('does not record loading the board as a mutation', () => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ cards: {}, columns: [] }));
    // A saved board that fails validation is the case that would prove the point;
    // a valid one simply must not appear in the history.
    const { result } = renderHook(() => useKanbanBoard());
    expect(result.current.canUndo).toBe(false);
  });

  it('undoes and redoes a move through the board transitions', () => {
    const { result } = renderHook(() => useKanbanBoard());
    const first = result.current.board.columns[0];
    const cardId = first?.cardIds[0];
    if (!first || !cardId) throw new Error('seed produced no cards');

    act(() => result.current.mutate((board) => addCard(board, first.id, { id: 'new', title: 'New', priority: 'low', createdAt: 0 })));
    expect(result.current.board.cards.new).toBeDefined();
    expect(result.current.canUndo).toBe(true);

    act(() => result.current.undo());
    expect(result.current.board.cards.new).toBeUndefined();
    expect(result.current.canRedo).toBe(true);

    act(() => result.current.redo());
    expect(result.current.board.cards.new).toBeDefined();
  });

  it('restores a deletion exactly, every field included', () => {
    const { result } = renderHook(() => useKanbanBoard());
    const first = result.current.board.columns[0];
    const cardId = first?.cardIds[0];
    const before = cardId ? result.current.board.cards[cardId] : undefined;
    if (!cardId || !before) throw new Error('seed produced no cards');

    act(() => result.current.mutate((board) => removeCard(board, cardId)));
    expect(result.current.board.cards[cardId]).toBeUndefined();

    act(() => result.current.undo());
    expect(result.current.board.cards[cardId]).toEqual(before);
    expect(result.current.board.columns[0]?.cardIds).toContain(cardId);
  });

  it('discards the redo tail once a new mutation is recorded', () => {
    const { result } = renderHook(() => useKanbanBoard());
    const first = result.current.board.columns[0];
    if (!first) throw new Error('seed produced no columns');

    act(() => result.current.mutate((board) => addCard(board, first.id, { id: 'a1', title: 'A', priority: 'low', createdAt: 0 })));
    act(() => result.current.undo());
    expect(result.current.canRedo).toBe(true);

    act(() => result.current.mutate((board) => addCard(board, first.id, { id: 'a2', title: 'B', priority: 'low', createdAt: 0 })));
    expect(result.current.canRedo).toBe(false);
    expect(result.current.board.cards.a2).toBeDefined();
  });

  it('treats a transition that changes nothing as no mutation at all', () => {
    const { result } = renderHook(() => useKanbanBoard());
    act(() => result.current.mutate(() => result.current.board));
    expect(result.current.canUndo).toBe(false);
  });

  it('bounds the history depth', () => {
    const { result } = renderHook(() => useKanbanBoard());
    act(() => {
      for (let index = 0; index < HISTORY_LIMIT + 10; index += 1) {
        result.current.mutate((board) => updateCard(board, 'card-tax', { ...draft, title: `Edit ${index}` }));
      }
    });
    let remaining = 0;
    while (result.current.canUndo) {
      act(() => result.current.undo());
      remaining += 1;
      if (remaining > HISTORY_LIMIT + 20) break;
    }
    expect(remaining).toBe(HISTORY_LIMIT);
  });

  it('refuses a mutation that would leave the board invalid', () => {
    const { result } = renderHook(() => useKanbanBoard());
    act(() => result.current.mutate((board) => ({ ...board, cards: {} })));
    expect(result.current.board.columns.flatMap((column) => column.cardIds).length).toBeGreaterThan(0);
    expect(result.current.canUndo).toBe(false);
  });

  it('refuses a restore that would load a board which no longer validates', () => {
    const { result } = renderHook(() => useKanbanBoard());
    act(() => result.current.mutate((board) => ({ ...board, cards: { ...board.cards, 'card-tax': { id: 'card-tax', title: '', priority: 'low', createdAt: 1 } } })));
    // The invalid board never lands, so there is nothing to undo and nothing poisoned.
    expect(result.current.canUndo).toBe(false);
    expect(result.current.board.cards['card-tax']?.title).toBe('Archive tax documents');
  });
});
