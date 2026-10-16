import type { Priority } from '../types/kanban';

/**
 * Storage keys carry the product's own name. The legacy keys from the Noir Board
 * era are still read once at load, so a board saved before the rename opens
 * unchanged; nothing is ever written under them again.
 */
export const STORAGE_KEY = 'docket_board';
export const LEGACY_STORAGE_KEY = 'noir_kanban_state';
export const CORRUPT_STORAGE_KEY = `${STORAGE_KEY}_corrupt`;
/**
 * Collapse state is presentation, not domain. It lives in its own key so the board
 * shape is unchanged and a layout preference is never mistaken for board data.
 */
export const COLLAPSED_COLUMNS_KEY = 'docket_collapsed_columns';
export const LEGACY_COLLAPSED_COLUMNS_KEY = 'noir_kanban_collapsed_columns';
export const DONE_COLUMN_ID = 'column-done';
export const PRIORITIES: Priority[] = ['low', 'medium', 'high'];
