interface BoardMarkProps {
  className?: string;
}

export function BoardMark({ className }: BoardMarkProps): JSX.Element {
  return (
    <svg viewBox="0 0 32 32" fill="none" aria-hidden="true" focusable="false" className={className}>
      <rect x="6.5" y="14.5" width="5" height="11" rx="2.5" fill="currentColor" opacity="0.4" />
      <rect x="13.5" y="10.5" width="5" height="15" rx="2.5" fill="currentColor" opacity="0.65" />
      <rect x="20.5" y="6.5" width="5" height="19" rx="2.5" fill="currentColor" />
    </svg>
  );
}
