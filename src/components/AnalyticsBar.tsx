import { ClipboardList } from 'lucide-react';

interface AnalyticsBarProps { total: number; overdue: number; done: number; completion: number; }

export function AnalyticsBar({ total, overdue, done, completion }: AnalyticsBarProps): JSX.Element {
  return <footer className="fixed inset-x-0 bottom-0 z-10 border-t border-zinc-800 bg-[#09090b] px-4 py-3 sm:px-6 lg:px-10"><div className="mx-auto flex max-w-[1600px] items-center justify-between gap-4 overflow-x-auto text-[10px] font-medium uppercase tracking-wider text-zinc-500"><div className="flex min-w-max items-center gap-5"><span><strong className="text-zinc-200">{total}</strong> Total cards</span><span><strong className="text-rose-400">{overdue}</strong> Overdue</span><span><strong className="text-emerald-400">{done}</strong> Done</span></div><span className="flex min-w-max items-center gap-2"><ClipboardList className="h-3.5 w-3.5" /><strong className="text-zinc-200">{completion}%</strong> complete</span></div></footer>;
}
