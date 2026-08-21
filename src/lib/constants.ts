import type { Priority } from '../types/kanban';

export const STORAGE_KEY = 'noir_kanban_state';
export const PRIORITIES: Priority[] = ['low', 'medium', 'high'];

export const PRIORITY_STYLES: Record<Priority, { badge: string; dot: string; label: string }> = {
  low: { badge: 'border-emerald-900/80 bg-emerald-950/50 text-emerald-400', dot: 'bg-emerald-400', label: 'Low' },
  medium: { badge: 'border-amber-900/80 bg-amber-950/50 text-amber-400', dot: 'bg-amber-400', label: 'Medium' },
  high: { badge: 'border-rose-900/80 bg-rose-950/50 text-rose-400', dot: 'bg-rose-400', label: 'High' },
};
