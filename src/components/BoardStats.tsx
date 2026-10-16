interface BoardStatsProps {
  total: number;
  overdue: number;
  done: number;
  completion: number;
}

/**
 * The board's totals, folded quietly into the top bar rather than a fixed
 * footer. Deliberately not a live region: the numbers change on every move and
 * announcing each recomputation would drown the board's one notice channel.
 */
export function BoardStats({ total, overdue, done, completion }: BoardStatsProps): JSX.Element {
  return (
    <div className="hidden items-center gap-3 font-mono text-[11px] tabular-nums text-muted xl:flex" aria-label="Board totals" role="group">
      <span><strong className="font-semibold text-ink">{total}</strong> cards</span>
      <span><strong className={overdue > 0 ? 'font-semibold text-hold' : 'font-semibold text-ink'}>{overdue}</strong> overdue</span>
      <span><strong className="font-semibold text-ink">{done}</strong> done</span>
      <span aria-hidden="true" className="text-line-strong">|</span>
      <span><strong className="font-semibold text-ink">{completion}%</strong> complete</span>
    </div>
  );
}
