import { addDays, isValidDateString, localDateString } from './dates';
import { CORRUPT_STORAGE_KEY, PRIORITIES, STORAGE_KEY } from './constants';
import type { BoardState, CardItem } from '../types/kanban';

const DAY_MS = 86_400_000;

export function createSeedState(today = new Date()): BoardState {
  const base = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  const due = (days: number): string => localDateString(addDays(new Date(base), days));
  const createdAt = (index: number): number => base - (8 - index) * DAY_MS;

  const cards: Record<string, CardItem> = {
    'card-research': { id: 'card-research', title: 'Research personal finance apps', description: 'Compare budgeting workflows and capture the three most useful patterns.', priority: 'medium', dueDate: due(7), createdAt: createdAt(0) },
    'card-groceries': { id: 'card-groceries', title: 'Plan weekly groceries', description: 'Build a simple meal plan before the weekend shopping trip.', priority: 'low', dueDate: due(10), createdAt: createdAt(1) },
    'card-portfolio': { id: 'card-portfolio', title: 'Refresh portfolio case study', description: 'Replace old screenshots and tighten the outcome section.', priority: 'high', dueDate: due(21), createdAt: createdAt(2) },
    'card-dentist': { id: 'card-dentist', title: 'Book dentist appointment', priority: 'high', dueDate: due(14), createdAt: createdAt(3) },
    'card-backup': { id: 'card-backup', title: 'Set up photo backup', description: 'Choose a provider and configure automatic mobile uploads.', priority: 'medium', dueDate: due(28), createdAt: createdAt(4) },
    'card-books': { id: 'card-books', title: 'Organize reading list', priority: 'low', createdAt: createdAt(5) },
    'card-laundry': { id: 'card-laundry', title: 'Prepare laundry schedule', priority: 'low', createdAt: createdAt(6) },
    'card-tax': { id: 'card-tax', title: 'Archive tax documents', description: 'Move receipts and statements into the annual archive folder.', priority: 'medium', createdAt: createdAt(7) },
  };
  return { cards, columns: [
    { id: 'column-backlog', title: 'Backlog', cardIds: ['card-research', 'card-backup'] },
    { id: 'column-todo', title: 'To Do', cardIds: ['card-groceries', 'card-dentist', 'card-books'] },
    { id: 'column-progress', title: 'In Progress', cardIds: ['card-portfolio', 'card-laundry'] },
    { id: 'column-done', title: 'Done', cardIds: ['card-tax'] },
  ] };
}

export function isValidBoard(value: unknown): value is BoardState {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as { columns?: unknown; cards?: unknown };
  if (!Array.isArray(candidate.columns) || !candidate.cards || typeof candidate.cards !== 'object' || Array.isArray(candidate.cards)) return false;
  const cards = candidate.cards as Record<string, unknown>;
  const columnIds = new Set<string>();
  const referencedCards = new Set<string>();
  for (const column of candidate.columns) {
    if (!column || typeof column !== 'object') return false;
    const item = column as { id?: unknown; title?: unknown; cardIds?: unknown };
    if (typeof item.id !== 'string' || !item.id.trim() || columnIds.has(item.id) || typeof item.title !== 'string' || !item.title.trim() || !Array.isArray(item.cardIds)) return false;
    columnIds.add(item.id);
    for (const cardId of item.cardIds) {
      if (typeof cardId !== 'string' || !cards[cardId] || referencedCards.has(cardId)) return false;
      referencedCards.add(cardId);
    }
  }
  for (const [id, card] of Object.entries(cards)) {
    if (!card || typeof card !== 'object') return false;
    const item = card as { id?: unknown; title?: unknown; priority?: unknown; dueDate?: unknown; description?: unknown; createdAt?: unknown };
    if (item.id !== id || typeof item.title !== 'string' || !item.title.trim() || !PRIORITIES.includes(item.priority as typeof PRIORITIES[number]) || typeof item.createdAt !== 'number' || !Number.isFinite(item.createdAt) || (item.description !== undefined && typeof item.description !== 'string') || (item.dueDate !== undefined && !isValidDateString(item.dueDate)) || !referencedCards.has(id)) return false;
  }
  return true;
}

export function getStorage(): Storage | null {
  try {
    if (typeof window === 'undefined') return null;
    return window.localStorage ?? null;
  } catch {
    return null;
  }
}

export type LoadStatus = 'loaded' | 'empty' | 'corrupt' | 'unavailable';

export interface LoadBoardResult {
  board: BoardState;
  status: LoadStatus;
}

function preserveCorruptPayload(storage: Storage, payload: string): void {
  try {
    storage.setItem(CORRUPT_STORAGE_KEY, payload);
  } catch {
    return;
  }
}

export function loadBoardState(storage: Storage | null = getStorage()): LoadBoardResult {
  if (!storage) return { board: createSeedState(), status: 'unavailable' };

  let stored: string | null;
  try {
    stored = storage.getItem(STORAGE_KEY);
  } catch {
    return { board: createSeedState(), status: 'unavailable' };
  }
  if (!stored) return { board: createSeedState(), status: 'empty' };

  let parsed: unknown;
  try {
    parsed = JSON.parse(stored);
  } catch {
    parsed = undefined;
  }
  if (isValidBoard(parsed)) return { board: parsed, status: 'loaded' };

  preserveCorruptPayload(storage, stored);
  return { board: createSeedState(), status: 'corrupt' };
}

export type PersistFailureReason = 'quota' | 'unavailable' | 'unknown';

export type PersistResult = { ok: true } | { ok: false; reason: PersistFailureReason };

function isQuotaError(error: unknown): boolean {
  if (typeof DOMException !== 'undefined' && error instanceof DOMException) {
    return error.name === 'QuotaExceededError' || error.name === 'NS_ERROR_DOM_QUOTA_REACHED';
  }
  if (error && typeof error === 'object' && 'name' in error) {
    const name = (error as { name?: unknown }).name;
    return name === 'QuotaExceededError' || name === 'NS_ERROR_DOM_QUOTA_REACHED';
  }
  return false;
}

export function persistBoardState(board: BoardState, storage: Storage | null = getStorage()): PersistResult {
  if (!storage) return { ok: false, reason: 'unavailable' };
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(board));
    return { ok: true };
  } catch (error) {
    return { ok: false, reason: isQuotaError(error) ? 'quota' : 'unknown' };
  }
}
