interface BrandMarkProps {
  className?: string;
}

/**
 * Three ascending bars on a common baseline: the light-ground redraw of the
 * board's mark. The ramp runs faint, muted, accent so the accent sits only on
 * the leading bar and the three heights carry the progression.
 */
export function BrandMark({ className }: BrandMarkProps): JSX.Element {
  return (
    <svg viewBox="0 0 32 32" fill="none" aria-hidden="true" focusable="false" className={className}>
      <rect x="2.75" y="17" width="6.5" height="9" rx="2" fill="var(--color-faint)" />
      <rect x="12.75" y="11.5" width="6.5" height="14.5" rx="2" fill="var(--color-muted)" />
      <rect x="22.75" y="6" width="6.5" height="20" rx="2" fill="var(--color-accent)" />
    </svg>
  );
}
