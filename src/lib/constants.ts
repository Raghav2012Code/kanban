import type { Priority } from '../types/kanban';

export const STORAGE_KEY = 'noir_kanban_state';
export const CORRUPT_STORAGE_KEY = `${STORAGE_KEY}_corrupt`;
/**
 * Collapse state is presentation, not domain. It lives in its own key so the board
 * shape is unchanged and a layout preference is never mistaken for board data.
 */
export const COLLAPSED_COLUMNS_KEY = 'noir_kanban_collapsed_columns';
export const DONE_COLUMN_ID = 'column-done';
export const PRIORITIES: Priority[] = ['low', 'medium', 'high'];
