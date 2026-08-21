export type Priority = 'low' | 'medium' | 'high';

export interface CardItem {
  id: string;
  title: string;
  description?: string;
  priority: Priority;
  dueDate?: string;
  createdAt: number;
}

export interface ColumnItem {
  id: string;
  title: string;
  cardIds: string[];
}

export interface BoardState {
  columns: ColumnItem[];
  cards: Record<string, CardItem>;
}

export type PriorityFilter = 'all' | Priority;

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
