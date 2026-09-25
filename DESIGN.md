# DESIGN.md - Noir Board

## Context (from discovery)

- Artifact type: Kanban / project tool delivered as a SaaS application surface.
- Positioning: utilitarian, technical, instrument-like.
- Audience: an individual running their own work, technically comfortable. Single-user, local-first. Primary action: keep personal work flowing and see its true state.
- Adjectives: exacting, quiet, instrument-like, legible, purposeful.
- Visual word translations:
  - exacting -> hairline rules, strict bay grid, monospace and tabular figures, 2px radius
  - quiet -> warm near-black, low chroma, one accent used sparingly, no shadows
  - instrument-like -> status rail, tail-number gutter, priority meter, density
  - legible -> 11px floor, 14px UI, 16px inputs, hierarchy from size and weight, not color
  - purposeful -> motion only for state and drag; no hover lift, no decoration
- Aesthetic essence (3 words): precision, flow, control.
- Single-minded proposition: the board reads like a working control surface for your own work, not a generic task app.
- Archetype: Sage, tempered by the Outlaw.
- References: admire air-traffic-control flight progress strips (bays, strips, status marks, monospace tails) and Swiss timetable discipline (strict grid, rules over cards, one restrained accent); avoid the dark-SaaS median (rounded zinc cards, three pastel priority pills, indigo gradients).
- Mode: dark only, deliberately. Density: dense.
- Constraints: React 18, Tailwind 3, local-first, no schema change. Accessibility bar WCAG 2.2 AA. Must preserve the board-state behavior and its 69 tests.

## Aesthetic

- Direction: bespoke **Flight Strip**. Industrial/utilitarian base with Swiss grid discipline, borrowed from the ATC flight progress strip board.
- Defining trait: work items are horizontal **strips** laid in **bays** separated by **rules**, not rounded cards with gaps.
- Signature move: the **status rail** (a thin edge bar whose color carries work state) plus a monospace **tail number** in the strip gutter and a **three-bar priority meter** that echoes the brand mark. Bay headers are a departure-board rule with a monospace count.

## Typography

- Display: B612 (Airbus cockpit-legibility typeface) | source: Google Fonts | license: OFL
- Body: IBM Plex Sans | source: Google Fonts | license: OFL
- Mono: B612 Mono (figures, dates, counts, tail numbers, labels) | source: Google Fonts | license: OFL
- Scale: ratio 1.2 minor third (dense tool), base 16px, 6 steps:
  | step | size | line-height | use |
  |------|------|-------------|-----|
  | display | 30-36px | 1.1 | board title |
  | bay | 12px | 1.2 | bay headers, uppercase, tracking 0.12em |
  | body | 14px | 1.4 (20px) | strip titles |
  | small | 12px | 1.4 | notes, notices |
  | micro | 11px | 1.4 | all mono labels, counts, dates |
  | input | 16px | 1.4 | form controls (prevents iOS zoom) |
- Weights: 400 / 500 / 700. Measure: 65-75ch on the subtitle. Tracking: display tight (-0.02em), mono labels wide (0.05-0.12em).

## Color

- Strategy: warm near-black instrument panel with a single aviation-amber accent. Deliberately outside the indigo/violet band (H 78). No gradients, no glow.
- Distribution: 60 neutral surfaces / 30 structure and type / 10 accent.
- Palette (role -> OKLCH | hex):
  - bg: oklch(0.17 0.008 75) | #1b1916
  - surface: oklch(0.205 0.008 75) | #242220
  - surface-2: oklch(0.25 0.008 75) | #2c2a27
  - fg (ink): oklch(0.93 0.012 75) | #edebe7
  - muted: oklch(0.72 0.012 75) | #b0aca6
  - faint: oklch(0.62 0.012 75) | #908c86
  - border: oklch(0.30 0.008 75) | #37342f
  - border-strong: oklch(0.40 0.008 75) | #4c4842
  - accent (amber): oklch(0.79 0.15 78) | #dda43c
  - accent-fg: oklch(0.17 0.02 78) | #1b1916
  - hold (overdue/destructive): oklch(0.66 0.19 25) | #e0575c
  - cleared (done): oklch(0.72 0.12 160) | #46c79e
  - warn: oklch(0.79 0.15 78) | #dda43c
  - priority meter uses ink (filled) and border-strong (empty); priority is never carried by hue.
- Verified contrast (AA): ink/base 15.6, muted/base 7.7, faint/base 5.2, accent/base 9.7, hold/base 5.6, cleared/base 8.2, accent-fg/accent 9.8, muted/surface 7.2, muted/raised 6.5.

## Spacing, radius, shadow

- Spacing base: 4px, scale 1/1.5/2/2.5/3/4/5/6 (Tailwind). Tight inside a strip (gap 1.5), generous between bays (px-5, py-3), rules and py-5 between board sections.
- Radius: 2px (`rounded-sm` / `rounded-strip`) on strips, fields and buttons; full pill reserved for the status rail and meter bars. Nothing else.
- Shadow approach: **defined edges only.** One hairline border or a surface step, never both a border and a drop shadow on one element. No elevation shadows; depth is lightness (base < surface < raised).

## Layout and composition

- Grid: ruled bays. One flex row of 4-5 bays separated by vertical rules on desktop; stacked with horizontal rules on mobile. No cards wrapping columns.
- Spacing rhythm: tight-within (strip internals) / loose-between (bays and sections).
- Signature layout move: columns rendered as **bays** (borderless regions divided by rules), not as bordered cards.
- Density: dense | Scanning: F pattern within each bay; header top-left, controls top-right.
- Responsive: desktop-first dense tool; bays stack below `lg`, controls move from a hover overlay (mouse) to an always-visible in-flow row (touch, via `@media (hover:none)`).

## Components and states

- Button hierarchy: one primary (accent, "Save card"), secondary outline ("File card"), tertiary ghost (move/delete/rename). Destructive is a quiet ghost that turns rose on hover, not a red fill.
- States: every button has hover, active (motion-safe scale 0.98), focus (accent box-shadow ring, 2px offset) and disabled (opacity 40). 
- Inputs: visible mono uppercase labels, 16px text, 36px height, accent focus border and 1px ring, no placeholder-as-label.
- Tables: n/a.
- Overlays: no modals. Strip controls are a lightweight absolute cluster on pointer devices, scaling from the top-right; no focus trap needed.
- Empty / loading / error: a bay with no strips teaches the first action ("No strips in this bay. File the first card."); a filtered bay with no matches says so distinctly; storage failures and corrupt data surface a dismissible inline notice and never dead-end.
- Focus ring: `ring-2 ring-accent ring-offset-2 ring-offset-base` via box-shadow (follows radius).

## Motion

- Duration scale: fast 150ms, normal 200ms.
- Easing: `--ease-out: cubic-bezier(0.23, 1, 0.32, 1)` for enter; the strip settle and drop rules use it.
- What animates: transform and opacity only. `whileHover` lift removed (it communicated nothing). Layout animation is limited to reorder and add/remove.
- Reduced motion: `useReducedMotion` swaps the spring for a zero-duration transition; `motion-safe:active:` gates press scale.

## Iconography

- Set: Tabler Icons | grid: 24px | stroke: 1.5px (moved off the 2px shadcn/Lucide default) | caps/joins: round | radius match: yes (2px UI).
- Only used where it adds meaning: grip, search, trash, plus, chevrons, alert, clipboard. The priority indicator and status are drawn shapes, not icons. No emoji.

## Imagery and illustration

- Mode: none. This is a data tool; the only graphic device is the brand mark (three ascending bars), reused as the priority meter. Avoid stock, blobs, and mascots.

## Dark mode

- Base bg: oklch(0.17 0.008 75), deliberately not `#000`. fg: off-white 0.93.
- Elevation ramp: base 0.17 -> surface 0.205 -> raised 0.25 (closer to the user is lighter).
- Accent (dark): amber 0.79 already a lighter sibling; borders (0.30) are lighter than the base surface. No glow.

## Accessibility

- Contrast: AA verified for every text/surface pair above, in the only mode (dark).
- Focus: accent ring via box-shadow on every interactive element.
- Keyboard: fully operable. Cards carry explicit up/down/left/right move buttons (not only drag); rename is Enter/Escape; forms submit on Enter.
- Targets: 28px minimum for strip controls, 32-36px for primary controls (meets WCAG 2.2 24px minimum; desktop-first tool, touch controls are 28px).
- Color independence: priority is bars + text label; overdue is alert icon + "LATE" text; done is strikethrough + rail + position. Passes in grayscale.
- Reduced motion: honored. Notes: `aria-live` on notices; icon-only buttons named.

## Tokens (source of truth)

```css
:root {
  --font-display: "B612", ui-sans-serif, system-ui, sans-serif;
  --font-body: "IBM Plex Sans", ui-sans-serif, system-ui, sans-serif;
  --font-mono: "B612 Mono", ui-monospace, monospace;
  --color-bg: oklch(0.17 0.008 75);
  --color-surface: oklch(0.205 0.008 75);
  --color-surface-2: oklch(0.25 0.008 75);
  --color-fg: oklch(0.93 0.012 75);
  --color-muted: oklch(0.72 0.012 75);
  --color-faint: oklch(0.62 0.012 75);
  --color-border: oklch(0.30 0.008 75);
  --color-border-strong: oklch(0.40 0.008 75);
  --color-accent: oklch(0.79 0.15 78);
  --color-accent-fg: oklch(0.17 0.02 78);
  --color-hold: oklch(0.66 0.19 25);
  --color-cleared: oklch(0.72 0.12 160);
  --color-warn: oklch(0.79 0.15 78);
  --duration-fast: 150ms;
  --duration-normal: 200ms;
  --ease-out: cubic-bezier(0.23, 1, 0.32, 1);
}

- Adapter: Tailwind 3. Semantic CSS variables in `src/styles/index.css` mapped to utility names in `tailwind.config.ts` (`bg-base`, `text-ink`, `border-line`, `text-accent`, `font-display`, ...). `borderRadius.strip` = 2px.

## Cards and surfaces

- Cards/surfaces: strips use defined edges only (border-bottom rule + status rail); fields and buttons use a border, never a shadow. Radius 2px. No cards-in-cards. Overlays (strip controls) use a raised surface with a border, no shadow.

## Slop audit

- Date: 2026-09-25 | Result: fixed 16 tells, pass.
- Tells caught and corrected: Inter-only type, no display/body pairing; 10px text below the legibility floor; raw ISO dates in proportional figures; 3-4 line card titles in narrow columns; pure `#000`; no brand accent (white primary button); zero design tokens; full-width "Add column" competing with columns; generic eyebrow+title+search header; no empty state; 24px targets; neutral focus ring; truncated search placeholder; unmodified Lucide set; hover-lift on every card; undeclared dark-only mode.
- Craft and accessibility: state matrix on every control, focus via accent box-shadow, keyboard/touch move path intact, empty and filtered-empty states designed, icons one set at 1.5px, all contrast pairs pass AA, reduced motion honored.
- Bare-structure check: strip color/type removed, the skeleton is bays-of-strips on a ruled single surface, not equal bordered columns of cards. Distinct from the category default.

## Changelog

- 2026-09-25: initial Flight Strip system. Replaced the zinc card grid with ruled bays and strips; B612 / IBM Plex Sans / B612 Mono; OKLCH warm near-black + amber accent; priority meter and tail number; Tabler icons at 1.5px; empty states; tokenized Tailwind 3.
