import { COLLAPSED_COLUMNS_KEY } from './constants';

/**
 * Which columns are collapsed is a presentation preference, so it is stored apart
 * from the board. Keeping it out of BoardState means the board's shape is unchanged
 * and a layout choice is never mistaken for work.
 *
 * Storage is best-effort: an unavailable or corrupt value simply means nothing is
 * collapsed, because a layout preference must never be able to break the board.
 */
export function loadCollapsedIds(storage: Storage | null = getStorage()): Set<string> {
  if (!storage) return new Set();
  try {
    const raw = storage.getItem(COLLAPSED_COLUMNS_KEY);
    if (!raw) return new Set();
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return new Set();
    return new Set(parsed.filter((id): id is string => typeof id === 'string' && id.length > 0));
  } catch {
    return new Set();
  }
}

export function saveCollapsedIds(ids: ReadonlySet<string>, storage: Storage | null = getStorage()): void {
  if (!storage) return;
  try {
    storage.setItem(COLLAPSED_COLUMNS_KEY, JSON.stringify([...ids]));
  } catch {
    return;
  }
}

function getStorage(): Storage | null {
  try {
    return typeof window === 'undefined' ? null : (window.localStorage ?? null);
  } catch {
    return null;
  }
}
