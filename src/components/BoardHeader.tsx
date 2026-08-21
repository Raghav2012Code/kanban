import { LayoutPanelTop, Search } from 'lucide-react';
import type { PriorityFilter } from '../types/kanban';

interface BoardHeaderProps {
  search: string;
  priorityFilter: PriorityFilter;
  onSearchChange: (value: string) => void;
  onPriorityChange: (value: PriorityFilter) => void;
}

export function BoardHeader({ search, priorityFilter, onSearchChange, onPriorityChange }: BoardHeaderProps): JSX.Element {
  return <header className="border-b border-zinc-800 bg-[#09090b] px-4 py-5 sm:px-6 lg:px-10"><div className="mx-auto flex max-w-[1600px] flex-col gap-5 lg:flex-row lg:items-end lg:justify-between"><div><div className="mb-2 flex items-center gap-2 text-zinc-400"><LayoutPanelTop className="h-4 w-4" /><span className="text-[10px] font-semibold uppercase tracking-[0.25em]">Personal workspace</span></div><h1 className="text-2xl font-semibold tracking-tight text-zinc-50 sm:text-3xl">Noir Board</h1><p className="mt-1 text-sm text-zinc-400">A quiet system for moving important work forward.</p></div><div className="flex flex-col gap-2 sm:flex-row"><label className="relative"><Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-zinc-600" /><input value={search} onChange={(event) => onSearchChange(event.target.value)} placeholder="Search cards" aria-label="Search cards" className="w-full rounded-md border border-zinc-800 bg-zinc-950 py-2 pl-9 pr-3 text-sm text-zinc-200 outline-none transition placeholder:text-zinc-600 focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500 sm:w-56" /></label><select value={priorityFilter} onChange={(event) => onPriorityChange(event.target.value as PriorityFilter)} aria-label="Filter by priority" className="rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-400 outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500"><option value="all">All priorities</option><option value="low">Low priority</option><option value="medium">Medium priority</option><option value="high">High priority</option></select></div></div></header>;
}
