import { describe, expect, it } from 'vitest';
import { computeAnalytics } from '../analytics';
import { CORRUPT_STORAGE_KEY, LEGACY_STORAGE_KEY, STORAGE_KEY } from '../constants';
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

  it('loads a board carrying Work In Progress limits', () => {
    const board = createSeedState();
    const first = board.columns[0];
    if (!first) throw new Error('seed has no columns');
    first.limit = 2;
    const storage = memoryStorage({ [STORAGE_KEY]: JSON.stringify(board) });
    expect(loadBoardState(storage).board.columns[0]?.limit).toBe(2);
  });

  it('loads a board written before limits existed, unchanged and unmigrated', () => {
    const seed = createSeedState(new Date(2026, 8, 25));
    const result = loadBoardState(memoryStorage({ [STORAGE_KEY]: JSON.stringify(seed) }));
    expect(result.status).toBe('loaded');
    expect(result.board).toEqual(seed);
    expect(result.board.columns.every((column) => column.limit === undefined)).toBe(true);
  });

  it('loads a board saved under the legacy name, so the rename loses no work', () => {
    const seed = createSeedState(new Date(2026, 8, 25));
    const result = loadBoardState(memoryStorage({ [LEGACY_STORAGE_KEY]: JSON.stringify(seed) }));
    expect(result.status).toBe('loaded');
    expect(result.board).toEqual(seed);
  });

  it('prefers the current key when a board exists under both names', () => {
    const current = createSeedState(new Date(2026, 8, 25));
    current.cards['card-tax'] = { ...current.cards['card-tax'], title: 'Current board' };
    const legacy = createSeedState(new Date(2026, 8, 25));
    const storage = memoryStorage({ [STORAGE_KEY]: JSON.stringify(current), [LEGACY_STORAGE_KEY]: JSON.stringify(legacy) });
    expect(loadBoardState(storage).board.cards['card-tax']?.title).toBe('Current board');
  });

  it('rejects a malformed limit rather than quietly ignoring it', () => {
    for (const limit of ['two', -1, 1.5, null]) {
      const board = createSeedState();
      const first = board.columns[0];
      if (!first) throw new Error('seed has no columns');
      (first as unknown as { limit: unknown }).limit = limit;
      expect(isValidBoard(JSON.parse(JSON.stringify(board))), `limit ${JSON.stringify(limit)}`).toBe(false);
    }
  });

  it('rejects a card reference that only resolves through Object.prototype', () => {
    // "constructor" is a legal id in principle, but not this one: no card is
    // stored under it, so the column points at a function. Accepting it used to
    // let a hand-edited file reach the renderer and crash on the missing card.
    const board = { cards: {}, columns: [{ id: 'col', title: 'Col', cardIds: ['constructor'] }] };
    expect(isValidBoard(board)).toBe(false);
  });

  it('accepts a card that is genuinely stored under a prototype-looking key', () => {
    // The own-property check must not reject a real card just because its id
    // matches a name every object inherits.
    const board = JSON.parse('{"cards":{"constructor":{"id":"constructor","title":"Own","priority":"low","createdAt":1}},"columns":[{"id":"col","title":"Col","cardIds":["constructor"]}]}');
    expect(isValidBoard(board)).toBe(true);
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
