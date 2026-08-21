import { PRIORITY_STYLES } from '../lib/constants';
import type { Priority } from '../types/kanban';

export function PriorityBadge({ priority }: { priority: Priority }): JSX.Element {
  const style = PRIORITY_STYLES[priority];
  return <span className={`inline-flex items-center gap-1.5 rounded border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider ${style.badge}`}><span className={`h-1.5 w-1.5 rounded-full ${style.dot}`} />{style.label}</span>;
}
