import { IconSearch } from '@tabler/icons-react';
import type { PriorityFilter } from '@/types/kanban';
import { BoardMark } from '@/components/BoardMark';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';

interface BoardHeaderProps {
  search: string;
  priorityFilter: PriorityFilter;
  onSearchChange: (value: string) => void;
  onPriorityChange: (value: PriorityFilter) => void;
}

export function BoardHeader({ search, priorityFilter, onSearchChange, onPriorityChange }: BoardHeaderProps): JSX.Element {
  return <header className="border-b border-line px-4 py-5 sm:px-6 lg:px-10"><div className="mx-auto flex max-w-[1600px] flex-col gap-5 lg:flex-row lg:items-end lg:justify-between"><div><div className="mb-2 flex items-center gap-2"><BoardMark className="h-4 w-4" /><span className="font-mono text-[11px] uppercase tracking-[0.25em] text-muted">Personal workspace</span></div><h1 className="font-display text-3xl font-bold tracking-tight text-ink sm:text-4xl">Noir Board</h1><p className="mt-1 max-w-md text-sm text-muted">A quiet system for moving important work forward.</p></div><div className="flex flex-col gap-2 sm:flex-row"><label className="relative"><IconSearch size={16} stroke={1.5} aria-hidden="true" className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-faint" /><Input value={search} onChange={(event) => onSearchChange(event.target.value)} placeholder="Search" aria-label="Search cards by title or description" className="h-9 w-full pl-8 sm:w-56" /></label><Select value={priorityFilter} onChange={(event) => onPriorityChange(event.target.value as PriorityFilter)} aria-label="Filter by priority" className="h-9"><option value="all">All priorities</option><option value="low">Low priority</option><option value="medium">Medium priority</option><option value="high">High priority</option></Select></div></div></header>;
}
