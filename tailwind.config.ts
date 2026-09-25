import type { Config } from 'tailwindcss';

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
        'line-strong': 'var(--color-border-strong)',
        accent: 'var(--color-accent)',
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
        strip: '2px',
      },
      transitionTimingFunction: {
        out: 'var(--ease-out)',
      },
    },
  },
  plugins: [],
} satisfies Config;
