import { describe, expect, it } from 'vitest';
import { COLLAPSED_COLUMNS_KEY } from '../constants';
import { loadCollapsedIds, saveCollapsedIds } from '../layout-prefs';

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

describe('collapsed column preference', () => {
  it('round-trips which columns are collapsed', () => {
    const storage = memoryStorage();
    saveCollapsedIds(new Set(['column-todo', 'column-done']), storage);
    expect([...loadCollapsedIds(storage)]).toEqual(['column-todo', 'column-done']);
  });

  it('lives under its own key, never alongside the board', () => {
    const storage = memoryStorage({ [COLLAPSED_COLUMNS_KEY]: '["column-todo"]' });
    // The board key is untouched by anything this module does.
    expect(storage.getItem('noir_kanban_state')).toBeNull();
  });

  it('treats missing, malformed, and unusable values as nothing collapsed', () => {
    expect([...loadCollapsedIds(memoryStorage())]).toEqual([]);
    expect([...loadCollapsedIds(memoryStorage({ [COLLAPSED_COLUMNS_KEY]: 'not json' }))]).toEqual([]);
    expect([...loadCollapsedIds(memoryStorage({ [COLLAPSED_COLUMNS_KEY]: '{"a":1}' }))]).toEqual([]);
    // A value of the wrong shape is dropped rather than trusted.
    expect([...loadCollapsedIds(memoryStorage({ [COLLAPSED_COLUMNS_KEY]: '[1,null,""]' }))]).toEqual([]);
    expect([...loadCollapsedIds(null)]).toEqual([]);
  });

  it('survives storage that refuses to write', () => {
    const storage = memoryStorage();
    storage.setItem = () => {
      throw new Error('full');
    };
    // A layout preference must never be able to break the board.
    expect(() => saveCollapsedIds(new Set(['column-todo']), storage)).not.toThrow();
  });
});
