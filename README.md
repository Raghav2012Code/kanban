# Docket

A local-first personal Kanban board built with React, TypeScript, Vite, Tailwind CSS, and native HTML5 drag and drop. A cool near-white canvas, white tiles in open lanes, one indigo accent, and a single slim top bar that owns the chrome.

## Commands

```bash
npm install
npm run dev
```

```bash
npm run check
npm run preview
```

`npm run check` is the single gate — it runs the type checker, the test suite, and the production build. CI runs exactly that script rather than restating its steps, so a green local run and a green pipeline mean the same thing.

The board persists its state in `localStorage` under `docket_board`. A board saved under the previous name (`noir_kanban_state`) is read once at load and thereafter written under the current key, so the rename lost no work. There is no backend: nothing is sent anywhere, and no action is attributed to anyone because there is nobody else. Which columns are collapsed is presentation rather than work, so it lives under `docket_collapsed_columns` (legacy `noir_kanban_collapsed_columns` is read the same way) and never touches the saved board.

## Design

`DESIGN.md` is the source of truth for the visual system: the palette and its measured contrast table, the type pairing, motion, and the accessibility bar. Change the tokens in `src/styles/index.css` rather than the components, and keep the hex fallback derived from the OKLCH value beside it.

A test suite keeps the palette, the border ladder, and those documented figures honest against the tokens themselves, so the document cannot drift from what a browser renders. Where a test belongs is stated in `src/test/setup.ts`, and it is worth reading before adding one. One rule the tests cannot see and reviews must: never write an opacity modifier against a token colour (`border-warn/40`), because this Tailwind adapter emits nothing for it and the class silently disappears — declare a soft token instead.

## Environment

A change to `tailwind.config.js` does not reliably rebuild the dev server. Restart `npm run dev` after editing it, or a correct change can appear not to have applied.

## Browser baseline

Current evergreen browsers. The Filters panel uses the native Popover API; where it is missing the trigger stays collapsed rather than throwing, so the board remains usable but the panel cannot open. Generated ids prefer `crypto.randomUUID()` and fall back to `crypto.getRandomValues()`, so filing cards and adding columns work over plain HTTP as well as localhost.

## Planning

Issues and specs live in GitHub Issues. See `docs/agents/issue-tracker.md` for the `gh` conventions and `docs/agents/triage-labels.md` for the triage vocabulary. Architecture decisions live in `docs/adr/`.
