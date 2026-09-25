import { describe, expect, it } from 'vitest';
import { computeAnalytics } from '../analytics';
import { CORRUPT_STORAGE_KEY, STORAGE_KEY } from '../constants';
import { createSeedState, isValidBoard, loadBoardState, persistBoardState } from '../persistence';
import type { BoardState } from '../../types/kanban';

function memoryStorage(initial: Record<string, string> = {}): Storage {
  const store = new Map<string, string>(Object.entries(initial));
  return {
    get length() {
      return store.size;
    },
    clear: () => store.clear(),
    getItem: (key: string) => store.get(key) ?? null,
    key: (index: number) => Array.from(store.keys())[index] ?? null,
    removeItem: (key: string) => {
      store.delete(key);
    },
    setItem: (key: string, value: string) => {
      store.set(key, value);
    },
  } as Storage;
}

function failingStorage(error: Error): Storage {
  return {
    ...memoryStorage(),
    setItem: () => {
      throw error;
    },
  } as Storage;
}

const TODAY = '2026-09-25';

describe('createSeedState', () => {
  it('produces a valid board with no overdue cards on day one', () => {
    const seed = createSeedState(new Date(2026, 8, 25));
    expect(isValidBoard(seed)).toBe(true);
    expect(computeAnalytics(seed, TODAY).overdue).toBe(0);
    expect(Object.values(seed.cards).some((card) => Boolean(card.dueDate))).toBe(true);
  });

  it('generates future due dates and past, monotonic creation timestamps', () => {
    const seed = createSeedState(new Date(2026, 8, 25));
    const cards = Object.values(seed.cards);
    const base = new Date(2026, 8, 25).getTime();
    for (const card of cards) {
      expect(card.createdAt).toBeLessThanOrEqual(base);
      if (card.dueDate) expect(card.dueDate >= TODAY).toBe(true);
    }
    const timestamps = cards.map((card) => card.createdAt);
    expect([...timestamps].sort((a, b) => a - b)).toEqual(timestamps);
  });
});

describe('loadBoardState', () => {
  it('falls back to a fresh seed when storage is empty', () => {
    const result = loadBoardState(memoryStorage());
    expect(result.status).toBe('empty');
    expect(isValidBoard(result.board)).toBe(true);
  });

  it('falls back safely and flags corrupt payloads while preserving them', () => {
    const storage = memoryStorage({ [STORAGE_KEY]: '{not json' });
    const result = loadBoardState(storage);
    expect(result.status).toBe('corrupt');
    expect(isValidBoard(result.board)).toBe(true);
    expect(storage.getItem(CORRUPT_STORAGE_KEY)).toBe('{not json');
  });

  it('flags well-formed JSON that is not a valid board', () => {
    expect(loadBoardState(memoryStorage({ [STORAGE_KEY]: '{"foo":1}' })).status).toBe('corrupt');
  });

  it('reports unavailable storage without throwing', () => {
    const result = loadBoardState(null);
    expect(result.status).toBe('unavailable');
    expect(isValidBoard(result.board)).toBe(true);
  });

  it('loads an existing valid board unchanged', () => {
    const seed = createSeedState(new Date(2026, 8, 25));
    const storage = memoryStorage();
    storage.setItem(STORAGE_KEY, JSON.stringify(seed));
    const result = loadBoardState(storage);
    expect(result.status).toBe('loaded');
    expect(result.board).toEqual(seed);
  });
});

describe('persistBoardState', () => {
  it('writes the board and reports success', () => {
    const storage = memoryStorage();
    const board: BoardState = createSeedState(new Date(2026, 8, 25));
    expect(persistBoardState(board, storage)).toEqual({ ok: true });
    expect(storage.getItem(STORAGE_KEY)).toBe(JSON.stringify(board));
  });

  it('reports unavailable storage', () => {
    expect(persistBoardState(createSeedState(), null)).toEqual({ ok: false, reason: 'unavailable' });
  });

  it('distinguishes a full store from an unknown failure', () => {
    const quota = new Error('full');
    quota.name = 'QuotaExceededError';
    expect(persistBoardState(createSeedState(), failingStorage(quota))).toEqual({ ok: false, reason: 'quota' });
    expect(persistBoardState(createSeedState(), failingStorage(new Error('boom')))).toEqual({ ok: false, reason: 'unknown' });
  });
});
