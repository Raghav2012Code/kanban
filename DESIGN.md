# DESIGN.md - Noir Board

## Context (from discovery)

- Artifact type: Kanban / project tool delivered as a SaaS application surface.
- Positioning: utilitarian, technical, instrument-like.
- Audience: an individual running their own work, technically comfortable. Single-user, local-first. Primary action: keep personal work flowing and see its true state.
- Adjectives: exacting, quiet, instrument-like, legible, purposeful.
- Visual word translations:
  - exacting -> hairline rules, strict bay grid, monospace and tabular figures, 2px radius
  - quiet -> instrument black, near-zero chroma, one accent used sparingly, no shadows
  - instrument-like -> status rail, tail-number gutter, priority meter, density
  - legible -> 11px floor, 14px UI, 16px inputs, hierarchy from size and weight, not color
  - purposeful -> motion only for state and drag; no hover lift, no decoration
- Aesthetic essence (3 words): precision, flow, control.
- Single-minded proposition: the board reads like a working control surface for your own work, not a generic task app.
- Archetype: Sage, tempered by the Outlaw.
- References: admire air-traffic-control flight progress strips (bays, strips, status marks, monospace tails) and Swiss timetable discipline (strict grid, rules over cards, one restrained accent); avoid the dark-SaaS median (rounded zinc cards, three pastel priority pills, indigo gradients).
- Mode: dark only, deliberately. Density: dense.
- Constraints: React 18, Tailwind 3, local-first, no schema change. Accessibility bar WCAG 2.2 AA. Must preserve the board-state behavior and its 72 tests.

## Aesthetic

- Direction: bespoke **Flight Strip**. Industrial/utilitarian base with Swiss grid discipline, borrowed from the ATC flight progress strip board.
- Defining trait: work items are horizontal **strips** ruled inside a bounded **bay** panel. Bays are surfaces with a defined edge; strips inside them stay hairline-separated rows, so the board never becomes a grid of rounded cards.
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

- Strategy: instrument black with a single aviation-amber accent. The ground is a true `#000`; every visible edge is a hairline; the amber is the only light source in the composition. Deliberately outside the indigo/violet band (H 78). No gradients, no glow.
- Distribution: 60 neutral surfaces / 30 structure and type / 10 accent.
- Palette (role -> OKLCH | hex). The hex is **computed from** the OKLCH, never authored beside it — the previous warm palette carried hex values that were several steps lighter than their OKLCH twins, so modern browsers and the documented fallbacks were showing different products.
  - bg: oklch(0 0 0) | #000000
  - surface: oklch(0.19 0.003 250) | #131415
  - surface-2: oklch(0.24 0.003 250) | #1e1f21
  - fg (ink): oklch(0.93 0.002 250) | #e7e8e9
  - muted: oklch(0.74 0.003 250) | #a9abad
  - faint: oklch(0.63 0.003 250) | #88898b
  - border: rgb(255 255 255 / 0.18) — translucent
  - border-strong: rgb(255 255 255 / 0.24) — translucent
  - accent (amber): oklch(0.79 0.15 78) | #efad32
  - accent-fg: oklch(0 0 0) | #000000
  - hold (overdue/destructive): oklch(0.68 0.16 25) | #ea6a64
  - cleared (done): oklch(0.75 0.1 160) | #72c298
  - warn: oklch(0.79 0.15 78) | #efad32
  - priority meter uses ink (filled) and border-strong (empty); priority is never carried by hue.
- **Borders are translucent, not opaque.** A hairline token has to sit on `base`, `surface` and `surface-2` and stay correct on all three; an opaque grey cannot, because a value that reads on a near-black ground disappears on a lighter one. Consequence: opacity modifiers (`border-line/70`) are invalid on these tokens and must not be reintroduced.
- **The ladder is split by purpose, not by taste.** WCAG 1.4.11 asks 3:1 of boundaries needed to *identify a control*; it does not ask it of decorative row rules. So three tokens, each measured on all three grounds:
  - `border` 0.18 — **1.55:1** on base. Decorative: strip row separators, bay panel frames, the footer rule.
  - `border-control` 0.36 — **3.14:1** on base. Input, select and textarea edges. These sit on `bg-base`, so the border is the only thing defining them, which is exactly the case the criterion is about.
  - `border-strong` 0.42 — **3.94:1** on base. Outline buttons and the drop placeholder, both of which identify an interactive affordance.
  Lifting *every* hairline to 3:1 would have satisfied nothing extra and turned the board into a wireframe, because most of its rules are decorative.
- The hue moved from warm (75) to cool (250) at near-zero chroma, so the neutrals read as unlit and the amber reads as illumination. `hold` and `cleared` are desaturated from their originals because saturated red and green vibrate against a near-black ground.
- Verified contrast, measured from the rendered OKLCH rather than the fallback hex: ink/base **17.12**, muted/base **9.12**, faint/base **6.00**, accent/base **10.69**, hold/base **6.74**, cleared/base **9.89**, accent-fg/accent **10.69**, muted/surface **8.01**, faint/surface **5.27**, muted/surface-2 **7.16**, faint/surface-2 **4.71**, ink/surface-2 **13.44**. Tightest pair is faint on surface-2 at 4.71, which still clears AA for body text.
- Known and deliberately unchanged: decorative hairlines sit at 1.55:1, well below the 3:1 non-text bar, as they always have. They are structural rhythm, not the means of identifying a control, and the criterion does not reach them.

## Spacing, radius, shadow

- Spacing base: 4px, scale 1/1.5/2/2.5/3/4/5/6 (Tailwind). Tight inside a strip (gap 1.5), generous between bays (px-5, py-3), rules and py-5 between board sections.
- Radius: 2px (`rounded-sm` / `rounded-strip`) on strips, fields and buttons; full pill reserved for the status rail and meter bars. Nothing else.
- Shadow approach: **defined edges only.** One hairline border or a surface step, never both a border and a drop shadow on one element. No elevation shadows; depth is lightness (base < surface < raised).

## Layout and composition

- Grid: bounded bays. One flex row of 4-5 bay panels separated by a gap (`gap-3`, `gap-4` at `lg`) on desktop; stacked with the same gap on mobile. No cards wrapping columns, and no shared divider rules between panels.
- Spacing rhythm: tight-within (strip internals) / loose-between (bays and sections).
- **Transient panels reserve the footprint of the control that opens them.** The add-bay form occupies the same `lg:w-44` as the collapsed trigger, so opening it cannot take width from the bays. An earlier `flex-1` form was a `lg:flex-1` sibling in the same flex row, which meant all four bays silently resized from 280px to 259px every time the form opened, reflowing every card on the board. Any future panel that appears *in the row* rather than *inside a bay* owes the row the same reservation.
- Signature layout move: columns rendered as **bay panels** — one border plus a surface fill, never a border plus a shadow. Strips inside are ruled rows, never nested cards.
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
- What animates: transform and opacity only. A bay enters on a short `y` settle (14px) so a newly bounded panel reads as arriving; strips settle and drop placeholders scale in on the same transition. `whileHover` lift removed (it communicated nothing). Layout animation is limited to reorder and add/remove.
- Reduced motion: `useReducedMotion` swaps the spring for a zero-duration transition; `motion-safe:active:` gates press scale.

## Iconography

- Set: Tabler Icons | grid: 24px | stroke: 1.5px (moved off the 2px shadcn/Lucide default) | caps/joins: round | radius match: yes (2px UI).
- Only used where it adds meaning: grip, search, trash, plus, chevrons, alert, clipboard. The priority indicator and status are drawn shapes, not icons. No emoji.

## Imagery and illustration

- Mode: none. This is a data tool; the only graphic device is the brand mark, reused as the priority meter. Avoid stock, blobs, and mascots.
- Brand mark: three ascending bars on a common baseline, in a 32-unit box. Bars are 6.5 units wide with 3.5-unit gaps, spanning 83% of the box width, with a 2-unit corner radius. The ramp runs `faint` → `muted` → `accent`, so the accent sits only on the leading bar and the ascending heights carry the progression. Every bar clears 3:1 against `base` (5.25 / 7.77 / 7.89), which is why `border-strong` is not used here — at 1.93:1 it cannot carry a mark.
- The mark is drawn from the token variables rather than literal hex, so it themes with the board. The favicon is the same geometry with the tokens flattened, plus a `base` tile with a `border-strong` hairline so the icon reads on both light and dark browser chrome. The apple touch icon is full-bleed with no corner radius, because iOS applies its own mask.
- The priority meter keeps `ink` and `border-strong` only. It shares the mark's *form*, never its colour, because priority must never be carried by hue.

## Dark mode

- Base bg: oklch(0 0 0) — true black. fg: off-white 0.93, never `#fff`, which vibrates on a pure black ground.
- Elevation ramp: base 0.0 -> surface 0.19 -> raised 0.24 (closer to the user is lighter). Steps are wide because black gives no room for a subtle lift.
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
  --color-bg: oklch(0 0 0);
  --color-surface: oklch(0.19 0.003 250);
  --color-surface-2: oklch(0.24 0.003 250);
  --color-fg: oklch(0.93 0.002 250);
  --color-muted: oklch(0.74 0.003 250);
  --color-faint: oklch(0.63 0.003 250);
  --color-border: rgb(255 255 255 / 0.18);
  --color-border-control: rgb(255 255 255 / 0.36);
  --color-border-strong: rgb(255 255 255 / 0.42);
  --color-accent: oklch(0.79 0.15 78);
  --color-accent-fg: oklch(0 0 0);
  --color-hold: oklch(0.68 0.16 25);
  --color-cleared: oklch(0.75 0.1 160);
  --color-warn: oklch(0.79 0.15 78);
  --duration-fast: 150ms;
  --duration-normal: 200ms;
  --ease-out: cubic-bezier(0.23, 1, 0.32, 1);
}

- Adapter: Tailwind 3. Semantic CSS variables in `src/styles/index.css` mapped to utility names in `tailwind.config.ts` (`bg-base`, `text-ink`, `border-line`, `text-accent`, `font-display`, ...). `borderRadius.strip` = 2px.

## Cards and surfaces

- Cards/surfaces: a bay is one border plus one surface fill. Inside it, strips are hairline-separated rows (`border-b`, last child none) carrying the status rail; they never take their own border or background. Fields and buttons use a border, never a shadow. Radius 2px everywhere. No cards-in-cards. Overlays (strip controls) use a raised surface with a border, no shadow.
- Nesting invariant: exactly one border per level. A bordered element is never also given a background *and* an inner border on the same child row.

## Slop audit

- Date: 2026-09-25 | Result: fixed 16 tells, pass.
- Tells caught and corrected: Inter-only type, no display/body pairing; 10px text below the legibility floor; raw ISO dates in proportional figures; 3-4 line card titles in narrow columns; pure `#000`; no brand accent (white primary button); zero design tokens; full-width "Add column" competing with columns; generic eyebrow+title+search header; no empty state; 24px targets; neutral focus ring; truncated search placeholder; unmodified Lucide set; hover-lift on every card; undeclared dark-only mode.
- Craft and accessibility: state matrix on every control, focus via accent box-shadow, keyboard/touch move path intact, empty and filtered-empty states designed, icons one set at 1.5px, all contrast pairs pass AA, reduced motion honored.
- Bare-structure check: strip color/type removed, the skeleton is strips ruled inside bounded bay panels, not equal columns of stacked cards. Distinct from the category default.
- 2026-09-26 (amendment): the ground was moved to true black, reversing the earlier "deliberately not `#000`" decision. The rejected tell was never *black* — it was the cheap `#000` / mid-grey-border / `#fff`-text combination, where a pure-black ground is paired with opaque grey chrome and pure white type. That is not what shipped. The ground is `#000`, but the surfaces stay near-black (0.19 / 0.24) rather than jumping to grey cards, the borders are translucent white so one token works across the whole ramp, the foreground is off-white `0.93` and never `#fff`, and the amber is the only illumination. The tell list stands; this entry records that the item was re-examined rather than forgotten.
- 2026-09-26 (amendment): the palette's hex fallbacks were found to disagree with their own OKLCH values — the declared `oklch(0.17 0.008 75)` actually renders as `#110f0c`, not the documented `#1b1916`, so the documented contrast table described a colour no browser was showing. Hex values are now computed from OKLCH, and the contrast table is measured from the rendered values. The previous audit's own accent (`#dda43c`) was likewise not the amber the app painted (`#efad32`), which is why the brand mark and the UI accent had drifted apart.

- Date: 2026-09-26 | Result: bounded-bay revision, pass.
- Change: bays became individually bordered panels on a gap, replacing the borderless ruled-region skeleton. Strips remain hairline-separated rows inside them.
- Tells checked and deliberately **not** reintroduced: rounded zinc cards (radius stays 2px via `rounded-strip`), sub-11px type (the 10px count badge is gone; mono labels hold the 11px floor), the unmodified Lucide set (Tabler at 1.5px), hardcoded hex instead of tokens (`#09090b`/`zinc-*` replaced by `bg-surface`/`border-line`), and a missing type pairing.
- Invariant added: one border per nesting level; a bordered bay never also carries a drop shadow, and strips inside never take their own border.
- Craft and accessibility: an explicit `Done` marker (`role="img"`) now names the state for assistive tech, so completion no longer depends on perceiving strikethrough or the rail hue. Behavior held: Done identity stays on the stable column id, and positional moves stay disabled under an active filter.

## Changelog

- 2026-09-26: bays became bounded panels (one border + surface fill) on a gap; strips stay ruled rows inside them; drop placeholders are dashed rows at strip height; added an accessible `Done` marker; added component-level regression tests for Done identity, filtered-move safety, and reduced-motion wiring.
- 2026-09-26: redrew the brand mark and favicon. The previous mark used the rejected zinc palette, had a tile that vanished against dark chrome, and at 16px its three 5-unit pill bars degraded into a grey smudge. Bars are now 6.5 units wide on 3.5-unit gaps filling 83% of the box, coloured `faint`/`muted`/`accent` so the accent marks the leading bar, all clearing 3:1. Mark-equals-meter is preserved as form only; the meter keeps its greyscale.
- 2026-09-26: fixed two defects. Opening the add-bay form resized all four bays from 280px to 259px because the form was a `flex-1` sibling in the same flex row; it now reserves the trigger's exact `lg:w-44` footprint, with its input and buttons stacked to fit. And the border ladder was split by purpose, so input, select and textarea edges meet 3:1 (3.14:1) while decorative rules stay subtle at 1.55:1 — WCAG 1.4.11 asks 3:1 of control boundaries, not of decoration, and lifting every hairline would have satisfied nothing extra.
- 2026-09-26: ground moved to instrument black. Base is `oklch(0 0 0)`; surfaces stepped to 0.19 / 0.24; neutrals moved from warm (75) to cool (250) at near-zero chroma; borders became translucent white so one token composites across the ramp, replacing an opacity modifier that could no longer be used; `hold` and `cleared` desaturated to stop them vibrating on black; hex fallbacks recomputed from OKLCH; favicon tile, theme-color and mark contrast all re-derived and re-verified.
- 2026-09-25: initial Flight Strip system. Replaced the zinc card grid with ruled bays and strips; B612 / IBM Plex Sans / B612 Mono; OKLCH warm near-black + amber accent; priority meter and tail number; Tabler icons at 1.5px; empty states; tokenized Tailwind 3.
