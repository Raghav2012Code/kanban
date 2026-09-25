import { doneCardIds, isDoneCard } from './done';
import { isCardOverdue, localDateString } from './dates';
import type { BoardState } from '../types/kanban';

export interface BoardAnalytics {
  total: number;
  done: number;
  overdue: number;
  completion: number;
}

export function computeAnalytics(board: BoardState, today = localDateString()): BoardAnalytics {
  const cards = Object.values(board.cards);
  const done = doneCardIds(board).length;
  const overdue = cards.filter((card) => isCardOverdue(card, isDoneCard(board, card.id), today)).length;
  return {
    total: cards.length,
    done,
    overdue,
    completion: cards.length ? Math.round((done / cards.length) * 100) : 0,
  };
}
