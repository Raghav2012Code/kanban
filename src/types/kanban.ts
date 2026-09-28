export type Priority = 'low' | 'medium' | 'high';

export interface CardItem {
  id: string;
  title: string;
  description?: string;
  priority: Priority;
  dueDate?: string;
  /** When the card was filed. Written on every card and, before this work, never read. */
  createdAt: number;
}

export interface ColumnItem {
  id: string;
  title: string;
  cardIds: string[];
  /** Optional. Absent means unrestricted, so the field is purely additive. */
  limit?: number;
}

export interface BoardState {
  columns: ColumnItem[];
  cards: Record<string, CardItem>;
}

export type PriorityFilter = 'all' | Priority;

/** A sort is a view over stored order; it never rewrites it. */
export type SortMode = 'manual' | 'dueDate' | 'filedDate';

export interface CardDraft {
  title: string;
  priority: Priority;
  dueDate: string;
  description: string;
}

export interface DropTarget {
  columnId: string;
  cardId?: string;
  insertAfter?: boolean;
}
