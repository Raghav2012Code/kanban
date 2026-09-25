import { describe, expect, it } from 'vitest';
import { addDays, formatDueDate, isCardOverdue, isValidDateString, localDateString } from '../dates';
import type { CardItem } from '../../types/kanban';

const card: CardItem = { id: 'card', title: 'Card', priority: 'low', dueDate: '2026-09-24', createdAt: 0 };

describe('localDateString', () => {
  it('formats a local date as YYYY-MM-DD', () => {
    expect(localDateString(new Date(2026, 8, 25))).toBe('2026-09-25');
  });
});

describe('isValidDateString', () => {
  it('accepts real dates and rejects malformed or impossible values', () => {
    expect(isValidDateString('2026-02-28')).toBe(true);
    expect(isValidDateString('2026-02-30')).toBe(false);
    expect(isValidDateString('2026-2-3')).toBe(false);
    expect(isValidDateString('')).toBe(false);
    expect(isValidDateString(undefined)).toBe(false);
  });
});

describe('addDays', () => {
  it('crosses month boundaries and stays at local midnight', () => {
    expect(localDateString(addDays(new Date(2026, 0, 31), 1))).toBe('2026-02-01');
    expect(localDateString(addDays(new Date(2026, 11, 31), 1))).toBe('2027-01-01');
    expect(localDateString(addDays(new Date(2026, 0, 1), -1))).toBe('2025-12-31');
  });
});

describe('formatDueDate', () => {
  it('renders a compact relative label around a reference day', () => {
    expect(formatDueDate('2026-09-25', '2026-09-25')).toBe('TODAY');
    expect(formatDueDate('2026-09-26', '2026-09-25')).toBe('TMRW');
    expect(formatDueDate('2026-10-02', '2026-09-25')).toBe('+7D');
    expect(formatDueDate('2026-09-24', '2026-09-25')).toBe('1D LATE');
    expect(formatDueDate('2026-09-20', '2026-09-25')).toBe('5D LATE');
  });

  it('returns the raw value when either date is unparseable', () => {
    expect(formatDueDate('not-a-date', '2026-09-25')).toBe('not-a-date');
    expect(formatDueDate('2026-10-02', 'nope')).toBe('2026-10-02');
  });
});

describe('isCardOverdue', () => {
  it('is true for a past due date that is not done', () => {
    expect(isCardOverdue(card, false, '2026-09-25')).toBe(true);
  });

  it('is false when the card is done', () => {
    expect(isCardOverdue(card, true, '2026-09-25')).toBe(false);
  });

  it('is false without a due date, on the due date, or before it', () => {
    expect(isCardOverdue({ ...card, dueDate: undefined }, false, '2026-09-25')).toBe(false);
    expect(isCardOverdue(card, false, '2026-09-24')).toBe(false);
    expect(isCardOverdue(card, false, '2026-09-23')).toBe(false);
  });
});
