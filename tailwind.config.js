export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        base: 'var(--color-bg)',
        surface: 'var(--color-surface)',
        raised: 'var(--color-surface-2)',
        ink: 'var(--color-fg)',
        muted: 'var(--color-muted)',
        faint: 'var(--color-faint)',
        line: 'var(--color-border)',
        'line-control': 'var(--color-border-control)',
        'line-strong': 'var(--color-border-strong)',
        accent: 'var(--color-accent)',
        'accent-strong': 'var(--color-accent-strong)',
        'accent-soft': 'var(--color-accent-soft)',
        'accent-fg': 'var(--color-accent-fg)',
        hold: 'var(--color-hold)',
        cleared: 'var(--color-cleared)',
        warn: 'var(--color-warn)',
      },
      fontFamily: {
        display: 'var(--font-display)',
        body: 'var(--font-body)',
        mono: 'var(--font-mono)',
      },
      borderRadius: {
        ui: '8px',
      },
      transitionTimingFunction: {
        out: 'var(--ease-out)',
      },
    },
  },
  plugins: [],
};
