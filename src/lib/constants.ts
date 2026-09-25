import type { Priority } from '../types/kanban';

export const STORAGE_KEY = 'noir_kanban_state';
export const CORRUPT_STORAGE_KEY = `${STORAGE_KEY}_corrupt`;
export const DONE_COLUMN_ID = 'column-done';
export const PRIORITIES: Priority[] = ['low', 'medium', 'high'];
