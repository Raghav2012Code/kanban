import { isValidDateString, localDateString } from './dates';
import type { CardDraft, CardItem } from '../types/kanban';

export type DueDateStatus = 'valid' | 'empty' | 'invalid' | 'past';

export function validateDueDate(value: string, today = localDateString()): DueDateStatus {
  if (!value) return 'empty';
  if (!isValidDateString(value)) return 'invalid';
  return value < today ? 'past' : 'valid';
}

export interface NormalizedCardDraft {
  draft: CardDraft;
  requiresPastConfirmation: boolean;
}

export type NormalizeDraftResult = { ok: true; value: NormalizedCardDraft } | { ok: false; error: 'invalid-due-date' };

export function normalizeCardDraft(draft: CardDraft, today = localDateString()): NormalizeDraftResult {
  const status = validateDueDate(draft.dueDate, today);
  if (status === 'invalid') return { ok: false, error: 'invalid-due-date' };
  return {
    ok: true,
    value: {
      draft: { ...draft, title: draft.title.trim(), description: draft.description.trim() },
      requiresPastConfirmation: status === 'past',
    },
  };
}

/** The inverse of normalisation: opens an edit pre-filled with the card's truth, not a blank. */
export function cardToDraft(card: CardItem): CardDraft {
  return {
    title: card.title,
    priority: card.priority,
    dueDate: card.dueDate ?? '',
    description: card.description ?? '',
  };
}
