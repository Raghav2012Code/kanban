# DESIGN.md - Docket

## Context (from discovery)

- Artifact type: Kanban / project tool delivered as a SaaS application surface.
- Positioning: commercial, precise, minimal.
- Audience: an individual running their own work, technically comfortable. Single-user, local-first, and every feature serves one person on one device: the board lives in browser storage, nothing is sent anywhere, and no action is attributed to anyone because there is nobody else. Primary action: keep personal work flowing and see its true state.
- Adjectives: precise, quiet, professional, legible, purposeful.
- Visual word translations:
  - precise -> hairline tile edges, strict column lanes, tabular figures, one 8px radius
  - quiet -> a cool near-white canvas, near-zero chroma in the neutrals, one indigo accent, shadows only on surfaces that float
  - professional -> compact density, monospace for every figure, one slim top bar owning all chrome
  - legible -> 11px floor, 14px UI, 16px inputs, hierarchy from weight and tone rather than colour
  - purposeful -> motion only for state and drag; no hover lift, no decoration
- Aesthetic essence (3 words): precision, clarity, control.
- Single-minded proposition: the board reads like a well-run desk for your own work — every card filed, numbered, and answerable — not a dark instrument panel and not a generic task app. One person, one device, no account: nothing is sent anywhere and no action is attributed to anyone, because there is nobody else.
- Name: **Docket** — the list of items to be dealt with. The product's own microcopy ("File card", "filed date") is the filing metaphor made literal, so the name and the language agree.
- Archetype: Sage, tempered by the Ruler.
- References: admire Linear- and Attio-grade precision tools (hairline tiles, quiet canvases, popovers over permanent chrome) and Swiss timetable discipline (strict grid, rules over cards, one restrained accent); avoid the dark-instrument identity this product retired, and avoid playful kanban (confetti, avatars, pastel priority pills, indigo gradients for their own sake).
- Mode: light only, deliberately. Density: compact.
- Constraints: React 18, Tailwind 3, local-first, and the persisted board shape fixed. Accessibility bar WCAG 2.2 AA. Must preserve the board-state behavior (ADR-0001..0007 remain in force), and the whole existing test suite must keep passing.

## Aesthetic

- Direction: bespoke **Precision Neutral**. A cool near-white canvas; white tiles with hairline edges; one indigo accent reserved for action, selection and focus.
- Defining trait: work items are **tiles** that carry the surface, sitting in **column lanes** that carry the space. A lane is a header plus a stack; a tile is one border and one soft shadow. The board never becomes a grid of heavy cards, and a lane never becomes a filled panel behind the tiles.
- Signature moves: the **tile** itself (hairline border, 8px radius, `shadow-sm`, deepening to `shadow-md` on hover); monospace **reference** figures (the 4-character tail number, dates, counts) as the system's voice; the **three-bar priority meter** echoing the brand mark; and a single **slim top bar** that owns brand, search, filters, actions and totals, so the board gets the page.

## Typography

- Display and body: **Geist** | source: Google Fonts | license: OFL
- Mono: **Geist Mono** (figures, dates, counts, references, labels) | source: Google Fonts | license: OFL
- The pairing works because one neutral grotesque does the whole voice: Geist holds a 15px wordmark, 14px card titles and 11px meta without turning cold or decorative, and Geist Mono carries every figure at a legibility floor that survives dense columns. The previous three-face pairing (a semi-condensed signage display plus a body grotesque plus an aviation mono) belonged to the retired instrument identity; a commercial surface wants one voice, not a poster and a caption.
- Only the weights actually used are requested: Geist 400/500/600 and Geist Mono 400/500 — five files, none unused.
- Scale: ratio 1.2 minor third (dense tool), base 16px:
  | step | size | line-height | use |
  |------|------|-------------|-----|
  | wordmark | 15px | 1.2 | the product name in the top bar (600) |
  | body | 14px | 1.4 (20px) | card titles, buttons, notices |
  | small | 12px | 1.4 | panel labels, "File card", empty states |
  | micro | 11px | 1.4 | all mono labels, counts, dates, references |
  | input | 16px | 1.4 | form controls (prevents iOS zoom) |
- Weights: 400 / 500 / 600. Tracking: wordmark tight (-0.01em), mono labels wide (0.07-0.18em). Figures are tabular wherever numbers can move.

## Color

- Strategy: a quiet near-white ground, ink-neutral structure, and a single indigo accent used only where action or selection lives. State colours are deep enough to pass AA as text on white, because on a light ground red and green must be read, not vibed.
- Distribution: 70 neutral surfaces / 20 structure and type / 10 accent.
- Palette (role -> OKLCH | hex). The hex is **computed from** the OKLCH, never authored beside it, and the contrast table below is measured from the rendered values:
  - bg (canvas): oklch(0.968 0.002 275) | #f4f4f6
  - surface (tiles): oklch(1 0 0) | #ffffff
  - surface-2 (raised): oklch(0.985 0.003 275) | #f9fafc
  - fg (ink): oklch(0.26 0.012 275) | #22242a
  - muted: oklch(0.505 0.014 275) | #62646d
  - faint: oklch(0.54 0.012 275) | #6c6e76
  - border: rgb(23 24 27 / 0.12) — translucent ink, decorative
  - border-control: rgb(23 24 27 / 0.5) — translucent ink, control boundaries
  - border-strong: rgb(23 24 27 / 0.66) — translucent ink, emphasis
  - accent (indigo): oklch(0.51 0.21 277) | #4f4cda
  - accent-strong (hover): oklch(0.45 0.21 277) | #4137c5
  - accent-soft (selected tile ground): oklch(0.968 0.015 277) | #f2f4ff
  - accent-fg: oklch(1 0 0) | #ffffff
  - hold (overdue/destructive): oklch(0.55 0.19 27) | #c9302d
  - cleared (done): oklch(0.52 0.12 160) | #007d50
  - warn: oklch(0.52 0.11 70) | #915c08
  - priority meter uses ink (filled) and border-strong (empty); priority is never carried by hue.
- **Borders are translucent ink, not opaque grey.** One hairline token has to sit on the canvas, the tile and the raised surface and stay correct on all three; an opaque grey tuned for white vanishes on the canvas. Consequence: opacity modifiers are invalid on these tokens and must not be reintroduced.
- **A refused opacity modifier is a bug, and it was one.** In this Tailwind 3 adapter, `border-warn/40` or `bg-warn/10` emit **nothing at all** — the class silently disappears from the stylesheet. The retired warning banner carried both and rendered borderless and untinted for its whole life; the rework replaced it with solid tokens (`border-warn` on a `surface` fill). Never write an opacity modifier against a token colour; if a softer tone is needed, declare a soft token.
- **The ladder is split by purpose, not by taste.** WCAG 1.4.11 asks 3:1 of boundaries needed to *identify a control*; it does not ask it of decorative rules. So three tokens, each measured on all three grounds:
  - `border` 0.12 — **1.28:1** on base. Decorative: tile edges, row separators, the bar rule.
  - `border-control` 0.50 — **3.31:1** on base. Input, select and textarea edges. These sit on `bg-base` or `bg-surface`, so the border is the only thing defining them, which is exactly the case the criterion is about.
  - `border-strong` 0.66 — **5.48:1** on base. Outline buttons, dashed affordances (File card, Add column) and the drop placeholder, all of which identify an interactive affordance.
- Verified contrast, measured from the rendered OKLCH rather than the fallback hex: ink/base **14.18**, ink/surface **15.55**, ink/surface-2 **14.89**, muted/base **5.36**, muted/surface **5.88**, muted/surface-2 **5.63**, faint/base **4.62**, faint/surface **5.07**, faint/surface-2 **4.85**, accent/base **5.66**, accent/surface **6.21**, accent/surface-2 **5.95**, hold/base **4.87**, hold/surface **5.34**, cleared/base **4.71**, cleared/surface **5.17**, warn/base **5.14**, warn/surface **5.65**, accent-fg/accent **6.21**. Tightest pair is faint on base at 4.62, which still clears AA for body text. Every figure in this paragraph is recomputed and compared by the token guard, so the table cannot drift from the tokens it describes.
- Known and deliberately unchanged: decorative hairlines sit at 1.28:1, well below the 3:1 non-text bar. They are structural rhythm, not the means of identifying a control, and the criterion does not reach them. Lifting every hairline to 3:1 would turn the board into a wireframe and satisfy nothing extra.

## Spacing, radius, shadow

- Spacing base: 4px, scale 1/1.5/2/2.5/3/4/5/6 (Tailwind). Tight inside a tile (p-2.5, gap-2), generous between sections (py-5, px-10 at lg), rules and py-5 between board sections.
- Radius: one 8px token (`rounded-ui`) on tiles, fields, buttons and floating panels. Full pill reserved for counters, the saturation badge and meter bars. Nothing else.
- Shadow approach: **borders define, shadows float.** A tile carries one hairline border and one `shadow-sm`, deepening to `shadow-md` on hover; a floating panel (popover, import confirmation) carries `shadow-lg`. Flat rows and dividers take no shadow. Never a border plus `shadow-lg`, never elevation shadows on static chrome.

## Layout and composition

- One slim sticky **top bar**: brand, search, the Filters popover, the board actions (undo, redo, export, import) and the totals. Everything that used to be permanent header chrome now lives behind one trigger, so the board itself owns the page.
- Board: **column lanes** in one flex row at `lg`, stacked with the same gap below it. Lanes are transparent — the tiles carry the surface — so the canvas shows through the board and the columns read as one document.
- Spacing rhythm: tight-within (tile internals) / loose-between (lanes and sections).
- **Transient panels reserve the footprint of the control that opens them.** The add-column form occupies the same `lg:w-44` as the collapsed trigger, so opening it cannot take width from the lanes. The trigger and the panel are held to the same declared width by a test.
- **Supported widths, and what this suite cannot check.** The board is supported from **320px** wide, where the lanes stack, and reaches its intended multi-lane row at **1024px** (the `lg` breakpoint). Page-level horizontal scrolling is prevented structurally rather than by a minimum-width floor: the document root clips its own overflow and the lane row is the only horizontal scroll container, so the board scrolls sideways inside itself instead of dragging the page. The ordinary test suite runs with **no layout engine**, so it **cannot** measure whether a change introduces page-level overflow: a width assertion there would pass regardless of the CSS. Verifying it for real needs a **headless browser**, which is the available alternative and is **deliberately not taken** in the suite. The gap is recorded rather than papered over with an assertion that cannot fail.
- Signature layout move: **tiles on lanes** — lane headers are monospace rules with a count, tiles are bordered white with one soft shadow; a divided panel of ruled rows is exactly the skeleton this system retired.
- Density: compact | Scanning: F pattern within each lane; header top-left, controls top-right.
- Responsive: desktop-first dense tool; lanes stack below `lg`, strip controls move from a hover overlay (mouse) to an always-visible in-flow row (touch, via `@media (hover:none)`).

## Components and states

- Button hierarchy: one primary (accent fill, "Save card"), secondary outline (light fill with a control border — undo/redo, filters, import confirmation), tertiary ghost (move/edit/delete/rename), destructive is a quiet ghost that turns red on hover, not a red fill. The accent fill is reserved for the single primary per view.
- **Editing is named, never implied.** The card form carries a monospace uppercase caption: "File card" when creating, "Edit card" when correcting. The form renders in place of the card it is editing, so the caption and the primary label are the only things distinguishing the two paths — without them an edit reads as a second card being filed, which is how duplicates get created.
- **Column header reads: title, count and limit, collapse, move, delete.** The count answers how full the lane is before the controls answer what can be done to it, keeping the destructive action rightmost and visually separated. The outer columns' outward control is disabled rather than hidden, so the boundary is visible instead of silently absent.
- **The limit readout is a fraction, and saturation is a word.** A column with a limit shows `visible/limit`; without one it shows the bare count. Over-limit is stated as the word "Over" in a bordered badge beside the count, never by colour alone, so it survives greyscale and colour blindness. The limit is set from a small gauge control in the header that swaps to a numeric field on Enter/Escape, mirroring the rename flow; emptying the field clears the limit. A refused move is explained in the board notice.
- **The filters live behind one trigger.** Search stays visible in the bar; priority, due window, filed window, sort, column title and the overdue toggle live in the **Filters popover** — a native popover, so the top layer and Escape/outside-click dismissal come from the platform, with the position set from script rather than CSS anchor positioning. The trigger reports how many dimensions are active as a count badge and in its accessible name (`Filters, 2 active`), and carries one "Reset filters" action, so a filter can never be silently forgotten. The overdue toggle's state is in `aria-pressed` and in the accessible name, never in styling alone.
- States: every button has hover, active (motion-safe scale 0.98), focus (accent box-shadow ring, 2px offset) and disabled (opacity 40).
- Inputs: visible mono uppercase labels, 16px text, 36px height, control-grade borders, accent focus border and 1px ring, no placeholder-as-label.
- Tables: n/a.
- Overlays: no modals. The only floating surfaces are the Filters popover, the strip controls cluster (a lightweight absolute cluster on pointer devices) and the import confirmation panel; none needs a focus trap.
- Empty / loading / error: a lane with no tiles teaches the first action ("No cards in this column. File the first card."); a filtered lane with no matches says so distinctly; storage failures and corrupt data surface a dismissible inline notice and never dead-end.
- **Focus ring: `ring-2 ring-accent ring-offset-2 ring-offset-base` via box-shadow (follows radius).
- **Undo and redo live in the top bar.** Two outline icon buttons, disabled when there is nothing to undo or redo. Ctrl+Z undoes and Ctrl+Shift+Z (or Ctrl+Y) redoes, but the shortcut is deliberately ignored while focus is in a field: inside a text input Ctrl+Z means "undo my typing". History is a bounded linear stack held with the board in the persistence hook; a new mutation after an undo discards the redo tail; a restore is refused rather than applied if the snapshot no longer validates.
- **Export and import sit in the top bar, beside undo and redo.** Two outline icon buttons. Export serialises the whole board to readable, indented JSON as `docket-board.json`; import reads a chosen file and runs it through the board's own validity check before anything is written. A file that passes asks before it replaces anything, in an inline confirmation panel rather than a modal. Import is a recorded mutation, so a mistaken import is one undo away.
- **Selection is a checkbox, and the word Selected beside it.** A square checkbox leads the tile. It is a 28px button wrapping a 16px box, so the hit area meets the control target floor, and it is not hidden below `lg`: selection has to work on touch. A selected tile takes `accent-soft` and an accent border as secondary cues, but the checked box and the monospace word "Selected" are what carry the state, so it survives greyscale and colour blindness. Selection is view state and never reaches saved data.
- **The bulk bar appears as its own strip below the top bar while cards are selected.** It is not a second permanent toolbar and does not replace the filters: it shows the count, offers one small button per lane, and ends with Clear. It appears in the flow rather than floating over the board, because a floating bar would obscure the tiles it is about. Every lane is offered, including the last — clearing a queue usually means emptying it into the final column.
- **A collapsed lane keeps its header, and refuses drops.** Collapse hides the tiles and the file-card button, never the header, so the count, the fraction and the Over badge all stay readable. The state lives in `aria-expanded` with an explicit "Collapse X column" / "Expand X column" accessible name, and it is stored under its own browser-storage key, separate from the board.
- **The filed date rides with the due date in the metadata row.** Rendered absolutely (YYYY-MM-DD) rather than with the board's relative due-date treatment: "+7D" is useful for a deadline and meaningless as a filing time.
- **Every outcome is announced through the board's one notice channel.** A completed move names the card, its direction or destination, and the position it ended at — read off the resulting board, not predicted. A drag is a move, so a drop is announced exactly as an arrow-key move is. A refusal names the reason. A bulk move names each card, and announces nothing at all when every selected card is already in the target. Import and export report their outcome the same way. There is one polite live region for all of it, absent from the document entirely when there is nothing to say. The totals in the top bar are deliberately **not** a live region: the numbers change on every move, and announcing each recomputation would drown the one notice channel.

## Motion

- Duration scale: fast 130ms, normal 180ms.
- Easing: `--ease-out: cubic-bezier(0.23, 1, 0.32, 1)` for enter; everything uses it.
- One transition for the whole board: a short tween, never a spring. A panel arrives in under 200ms and stops; nothing bounces, because a precision tool should not wobble.
- What animates: transform and opacity only. A lane enters on a short `y` settle so a new lane reads as arriving; tiles and drop placeholders settle on the same transition, during a drag as much as after it — the aim carries a sticky band around each midpoint, so the slot changes only on a deliberate crossing and every change is one clean glide, never a snapped jump. Tiles deliberately have **no mount animation**: a landed card appears where its ghost was, because materialising it would read as lag. Removals stay instant, so clearing a filter feels like a cut rather than an exit parade; a deleted lane leaves on a short fade.
- The Filters popover and the inline confirm panels settle in on the same ease through CSS alone — `@starting-style` plus discrete `display`/`overlay` transitions — and the status strips rise on mount. No JavaScript drives these, so nothing can drop a frame while a drag or a filter change is in flight.
- Reduced motion: `useReducedMotion` swaps the tween for a zero-duration transition; the CSS settles are disabled under `prefers-reduced-motion`; `motion-safe:active:` gates press scale.

## Iconography

- Set: Tabler Icons | grid: 24px | stroke: 1.5px | caps/joins: round | radius match: yes (8px UI).
- Only used where it adds meaning: grip, search, trash, plus, chevrons, gauge, alert, check, download/upload, adjust. The priority indicator and the done check are drawn shapes, not icons. No emoji.

## Imagery and illustration

- Mode: none. This is a data tool; the only graphic device is the brand mark, reused as the priority meter's form.
- Brand mark: three ascending bars on a common baseline, in a 32-unit box. Bars are 6.5 units wide with 3.5-unit gaps, spanning 83% of the box width, with a 2-unit corner radius. The ramp runs faint **4.62**, muted **5.36**, accent **5.66** against base, so the accent sits only on the leading bar, the ascending heights carry the progression, and every bar clears 3:1 — the ramp is a *tonal* decision rather than a contrast one: three steps of a single hue would read as a scale rather than a mark.
- The mark is drawn from the token variables rather than literal hex, so it themes with the board. The favicon is the same geometry with the tokens flattened, on a white tile with a hairline ring so it reads on both light and dark browser chrome; the apple touch icon is full-bleed with no corner radius, because iOS applies its own mask.
- The priority meter keeps `ink` and `border-strong` only. It shares the mark's *form*, never its colour, because priority must never be carried by hue.

## Light mode

- Base canvas: oklch(0.968 0.002 275) — a cool near-white, never `#fff` under a wall of text; tiles are the only pure white, so they rise.
- Elevation ramp: canvas 0.968 -> raised 0.985 -> surface 1.0 (closer to the user is lighter; the adapter exposes `surface-2` as `raised`). Steps are narrow but sufficient because borders, not shadows, do the separating.
- The accent is a mid-chroma indigo (0.51 / 0.21 / 277): dark enough to carry white text at 6.21:1 and to read as text itself at 5.66:1 on the canvas, which is what lets one token serve both roles.
- No glow, no gradients; the only light is the canvas itself.

## Accessibility

- Contrast: AA verified for every text/surface pair above, in the only mode (light).
- Focus: accent ring via box-shadow on every interactive element.
- Keyboard: fully operable. Cards carry explicit up/down/left/right move buttons (not only drag); rename is Enter/Escape; forms submit on Enter; the Filters popover closes on Escape; undo/redo are focusable controls.
- Targets: 28px minimum for tile controls, 32-36px for bar and primary controls (meets WCAG 2.2 24px minimum; desktop-first tool, touch controls are 28px).
- Color independence: priority is bars + text label; overdue is alert icon + "LATE" text; done is a strikethrough + a check glyph + position; saturation is the word "Over". Passes in grayscale.
- Reduced motion: honored. Notes: `aria-live` on notices; icon-only buttons named; closing the Filters popover returns focus to its trigger when focus was inside the panel.

## Tokens (source of truth)

```css
:root {
  color-scheme: light;

  --font-display: "Geist", ui-sans-serif, system-ui, sans-serif;
  --font-body: "Geist", ui-sans-serif, system-ui, sans-serif;
  --font-mono: "Geist Mono", ui-monospace, SFMono-Regular, Menlo, monospace;

  --color-bg: #f4f4f6;
  --color-bg: oklch(0.968 0.002 275);
  --color-surface: #ffffff;
  --color-surface: oklch(1 0 0);
  --color-surface-2: #f9fafc;
  --color-surface-2: oklch(0.985 0.003 275);
  --color-fg: #22242a;
  --color-fg: oklch(0.26 0.012 275);
  --color-muted: #62646d;
  --color-muted: oklch(0.505 0.014 275);
  --color-faint: #6c6e76;
  --color-faint: oklch(0.54 0.012 275);
  --color-border: rgb(23 24 27 / 0.12); /* purpose: decorative */
  --color-border-control: rgb(23 24 27 / 0.5); /* purpose: control */
  --color-border-strong: rgb(23 24 27 / 0.66); /* purpose: emphasis */
  --color-accent: #4f4cda;
  --color-accent: oklch(0.51 0.21 277);
  --color-accent-strong: #4137c5;
  --color-accent-strong: oklch(0.45 0.21 277);
  --color-accent-soft: #f2f4ff;
  --color-accent-soft: oklch(0.968 0.015 277);
  --color-accent-fg: #ffffff;
  --color-accent-fg: oklch(1 0 0);
  --color-hold: #c9302d;
  --color-hold: oklch(0.55 0.19 27);
  --color-cleared: #007d50;
  --color-cleared: oklch(0.52 0.12 160);
  --color-warn: #915c08;
  --color-warn: oklch(0.52 0.11 70);

  --duration-fast: 130ms;
  --duration-normal: 180ms;
  --ease-out: cubic-bezier(0.23, 1, 0.32, 1);
}
```

- Adapter: Tailwind 3. Semantic CSS variables in `src/styles/index.css` mapped to utility names in `tailwind.config.ts` (`bg-base`, `text-ink`, `border-line`, `text-accent`, `font-display`, ...). `borderRadius.ui` = 8px.

## Cards and surfaces

- Cards/surfaces: a tile is one hairline border plus one soft shadow on the white surface. Lanes take no fill; the canvas is the lane's background. Fields and buttons use a border, never a heavy shadow. Radius 8px everywhere. No cards-in-cards. Floating panels (filters, import confirmation, hover controls) use the white surface with `shadow-lg` and a hairline border — the one place a border and a large shadow coexist, because a floating surface must separate from tiles beneath it.
- Nesting invariant: exactly one border per level. A bordered element is never also given a background *and* an inner border on the same child row.

## Slop audit

- Date: 2026-10-16 | Result: full rework to Precision Neutral, pass.
- Tells caught and corrected in this rework: the retired dark-instrument identity shipped as the product's face on a brief that asked for commercial and minimal; a permanent five-control filter cluster in the header competing with the board; a fixed analytics footer duplicating numbers that belonged in the bar; an oversized display title as the loudest element on a tool that should be quiet; aviation jargon (bays, strips) that no longer matched the product; a warning banner whose border and tint silently emitted nothing because they were written as opacity modifiers on token colours; a favicon carrying literal hex from a palette no browser showed.
- Craft and accessibility: state matrix on every control, focus via accent box-shadow, keyboard/touch move path intact, empty and filtered-empty states designed, icons one set at 1.5px, all contrast pairs pass AA, reduced motion honored.
- Bare-structure check: tile colour/type removed, the skeleton is bordered tiles on open lanes in one document with a single top bar, not ruled rows inside filled panels and not equal columns of stacked cards. Distinct from the category default.
- History: 2026-09-25 initial Flight Strip system; 2026-09-26 bounded bays, mark redraw, type re-pairing, border ladder split, instrument black; 2026-09-28 bulk move, collapse, announcements, filed date, filters/sorts widened, WIP limits, undo/redo. **2026-10-16: the identity was retired whole** — see the changelog; the guard tests were re-pointed at the new system rather than weakened.

## Changelog

- 2026-10-16: drag feel, corrected. The earlier drag fix stopped the re-render churn but over-corrected: positions snapped instantly during a drag, which read as a stutter of hard jumps. Now every slot change glides on the house tween, during the drag as much as after it — made affordable by the churn fix, not by the snap. Three further corrections ride with it: the placeholder's side of a tile is sticky inside a 6px band around the midpoint, so a hand jittering there cannot flip the slot and its animation back and forth; hovering a lane's own space — a gap between tiles, the header, above the first tile or below the last — anchors to the nearest tile instead of yanking the placeholder to the top and shifting every tile for an 8px gap; and a drop lands exactly where the placeholder showed, because the last resolved slot is the source of truth. The placeholder no longer unmounts and remounts while the pointer moves inside a lane, because a `dragleave` with a null `relatedTarget` (which is what Chrome reports) is now told from a genuine exit by coordinates. Cards no longer rise on mount: a landed card appears where its ghost was. Measured on the production bundle at 4x CPU throttle: 240 dragover events in 2.5s, 10ms median frame, zero long tasks; the worst-case alternating flip runs 2.7s at a 20ms p95. All 234 tests pass.
- 2026-10-16: smoothing pass for shipping. Lanes settle on entry; a deleted lane leaves on a short fade; the Filters popover and inline confirm panels settle in through CSS `@starting-style` and discrete `display`/`overlay` transitions with zero JavaScript; the selection bar and the two notice strips rise on mount. Removals stay instant by decision, so clearing a filter or collapsing a lane is a cut, not a ceremony. Closing the popover returns focus to its trigger.
- 2026-10-16: full rework, **Noir Board -> Docket**, dark instrument -> light precision. The board was renamed and every visual layer rebuilt: a cool near-white canvas with white tiles in open lanes replaces ruled strips in filled bays; a single slim top bar (brand, search, Filters popover, actions, totals) replaces the header control cluster and the fixed analytics footer; the type pairing is now one voice (Geist + Geist Mono) instead of a signage trio; the palette is a new cool-neutral ramp with one indigo accent, every figure re-measured and republished, and the token guard recomputes the new table rather than trusting it. Storage keys moved to the new name with a one-time read of the legacy keys, so an existing board and its collapse preferences load unchanged and are thereafter written under the new name. Defects fixed on the way: the warning banner's border and tint were opacity modifiers on token colours, which this adapter emits as nothing — it rendered bare and is now solid-token; the favicon carried literal hexes from a palette no browser showed and is redrawn from the tokens; the drop placeholders now match tile height instead of the retired strip height. Behaviour contracts were preserved whole: Done identity on the stable column id, positional drops disabled under any active view, sorts never written back, bulk moves as sequences of single moves, one announcement channel, bounded linear undo.
