import { isValidDateString } from './dates';
import { PRIORITIES, STORAGE_KEY } from './constants';
import type { BoardState } from '../types/kanban';

export function createSeedState(): BoardState {
  const cards = {
    'card-research': { id: 'card-research', title: 'Research personal finance apps', description: 'Compare budgeting workflows and capture the three most useful patterns.', priority: 'medium' as const, dueDate: '2026-08-18', createdAt: 1723987200000 },
    'card-groceries': { id: 'card-groceries', title: 'Plan weekly groceries', description: 'Build a simple meal plan before the weekend shopping trip.', priority: 'low' as const, dueDate: '2026-08-21', createdAt: 1724073600000 },
    'card-portfolio': { id: 'card-portfolio', title: 'Refresh portfolio case study', description: 'Replace old screenshots and tighten the outcome section.', priority: 'high' as const, dueDate: '2026-08-26', createdAt: 1724160000000 },
    'card-dentist': { id: 'card-dentist', title: 'Book dentist appointment', priority: 'high' as const, dueDate: '2026-08-22', createdAt: 1724246400000 },
    'card-backup': { id: 'card-backup', title: 'Set up photo backup', description: 'Choose a provider and configure automatic mobile uploads.', priority: 'medium' as const, dueDate: '2026-08-29', createdAt: 1724332800000 },
    'card-books': { id: 'card-books', title: 'Organize reading list', priority: 'low' as const, createdAt: 1724419200000 },
    'card-laundry': { id: 'card-laundry', title: 'Prepare laundry schedule', priority: 'low' as const, createdAt: 1724505600000 },
    'card-tax': { id: 'card-tax', title: 'Archive tax documents', description: 'Move receipts and statements into the annual archive folder.', priority: 'medium' as const, createdAt: 1724592000000 },
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

export function loadBoardState(): BoardState {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed: unknown = JSON.parse(stored);
      if (isValidBoard(parsed)) return parsed;
    }
  } catch {
  }
  return createSeedState();
}

export function persistBoardState(board: BoardState): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(board));
  } catch {
  }
}
