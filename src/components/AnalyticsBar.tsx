import { motion } from 'motion/react';
import { IconClipboardList } from '@tabler/icons-react';
import { useMotionTransition } from '@/hooks/useMotionTransition';

interface AnalyticsBarProps { total: number; overdue: number; done: number; completion: number; }

export function AnalyticsBar({ total, overdue, done, completion }: AnalyticsBarProps): JSX.Element {
  const transition = useMotionTransition();
  return <motion.footer layout className="fixed inset-x-0 bottom-0 z-10 border-t border-line bg-surface px-4 py-3 sm:px-6 lg:px-10"><div className="mx-auto flex max-w-[1600px] flex-wrap items-center justify-between gap-x-4 gap-y-1 font-mono text-[11px] uppercase tracking-wide text-muted"><div className="flex items-center gap-x-4 gap-y-1"><motion.span layout transition={transition}><strong className="tabular-nums text-ink">{total}</strong> Total cards</motion.span><motion.span layout transition={transition}><strong className="tabular-nums text-hold">{overdue}</strong> Overdue</motion.span><motion.span layout transition={transition}><strong className="tabular-nums text-cleared">{done}</strong> Done</motion.span></div><motion.span layout transition={transition} className="flex items-center gap-2"><IconClipboardList size={14} stroke={1.5} aria-hidden="true" /><strong className="tabular-nums text-ink">{completion}%</strong> complete</motion.span></div></motion.footer>;
}
