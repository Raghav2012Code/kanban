import { describe, expect, it } from 'vitest';
import { normalizeCardDraft, validateDueDate } from '../validation';
import type { CardDraft } from '../../types/kanban';

const draft: CardDraft = { title: '  Task  ', priority: 'medium', dueDate: '', description: '  notes  ' };

describe('validateDueDate', () => {
  it('classifies empty, invalid, past, and future values', () => {
    expect(validateDueDate('', '2026-09-25')).toBe('empty');
    expect(validateDueDate('2026-02-30', '2026-09-25')).toBe('invalid');
    expect(validateDueDate('not-a-date', '2026-09-25')).toBe('invalid');
    expect(validateDueDate('2026-09-24', '2026-09-25')).toBe('past');
    expect(validateDueDate('2026-09-25', '2026-09-25')).toBe('valid');
    expect(validateDueDate('2026-12-01', '2026-09-25')).toBe('valid');
  });
});

describe('normalizeCardDraft', () => {
  it('keeps a blank due date dateless and trims text', () => {
    const result = normalizeCardDraft(draft, '2026-09-25');
    expect(result).toEqual({ ok: true, value: { draft: { ...draft, title: 'Task', description: 'notes' }, requiresPastConfirmation: false } });
  });

  it('accepts a future due date without confirmation', () => {
    const result = normalizeCardDraft({ ...draft, dueDate: '2026-12-01' }, '2026-09-25');
    expect(result.ok && result.value.requiresPastConfirmation).toBe(false);
  });

  it('flags a past due date for explicit confirmation', () => {
    const result = normalizeCardDraft({ ...draft, dueDate: '2026-01-01' }, '2026-09-25');
    expect(result.ok && result.value.requiresPastConfirmation).toBe(true);
  });

  it('rejects an invalid due date', () => {
    expect(normalizeCardDraft({ ...draft, dueDate: '2026-02-30' }, '2026-09-25')).toEqual({ ok: false, error: 'invalid-due-date' });
  });
});
