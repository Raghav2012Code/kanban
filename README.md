# Noir Board

A local-first personal Kanban board built with React, TypeScript, Vite, Tailwind CSS, and native HTML5 drag and drop.

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

The board persists its state in `localStorage` under `noir_kanban_state`. There is no backend: nothing is sent anywhere, and no action is attributed to anyone because there is nobody else. Which columns are collapsed is presentation rather than work, so it lives under `noir_kanban_collapsed_columns` and never touches the saved board.

## Design

`DESIGN.md` is the source of truth for the visual system: the palette and its measured contrast table, the type pairing, motion, and the accessibility bar. Change the tokens in `src/styles/index.css` rather than the components, and keep the hex fallback derived from the OKLCH value beside it.

A test suite keeps the palette, the border ladder, and those documented figures honest against the tokens themselves, so the document cannot drift from what a browser renders. Where a test belongs is stated in `src/test/setup.ts`, and it is worth reading before adding one.

## Environment

A change to `tailwind.config.ts` does not reliably rebuild the dev server. Restart `npm run dev` after editing it, or a correct change can appear not to have applied.

## Planning

Issues and specs live in GitHub Issues. See `docs/agents/issue-tracker.md` for the `gh` conventions and `docs/agents/triage-labels.md` for the triage vocabulary. Architecture decisions live in `docs/adr/`.
