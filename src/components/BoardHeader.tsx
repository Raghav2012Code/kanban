import { Search } from 'lucide-react';
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
  return <header className="border-b border-zinc-800 bg-[#09090b] px-4 py-5 sm:px-6 lg:px-10"><div className="mx-auto flex max-w-[1600px] flex-col gap-5 lg:flex-row lg:items-end lg:justify-between"><div><div className="mb-2 flex items-center gap-2 text-zinc-400"><BoardMark className="h-4 w-4" /><span className="text-[10px] font-semibold uppercase tracking-[0.25em]">Personal workspace</span></div><h1 className="text-2xl font-semibold tracking-tight text-zinc-50 sm:text-3xl">Noir Board</h1><p className="mt-1 text-sm text-zinc-400">A quiet system for moving important work forward.</p></div><div className="flex flex-col gap-2 sm:flex-row"><label className="relative"><Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-zinc-600" /><Input value={search} onChange={(event) => onSearchChange(event.target.value)} placeholder="Search titles and descriptions" aria-label="Search cards by title or description" className="h-10 w-full pl-9 sm:w-56" /></label><Select value={priorityFilter} onChange={(event) => onPriorityChange(event.target.value as PriorityFilter)} aria-label="Filter by priority" className="h-10"><option value="all">All priorities</option><option value="low">Low priority</option><option value="medium">Medium priority</option><option value="high">High priority</option></Select></div></div></header>;
}
