# 2. Append drops while a filter is active

- Status: Accepted
- Date: 2026-09-25
- Issue: #2

## Context

When a search query or priority filter is active, the board renders only the matching cards, but reordering still writes into the full, unfiltered column order. A positional drop onto a visible card could land the dragged card at an index that silently repositions cards the user cannot see, silently scrambling hidden cards.

## Decision

While a filter is active, positional (card-level) drops are disabled. A drop only targets a column, and `moveCard` appends the card to the end of the target column's full order (`positional: false` ignores any anchor). The keyboard up/down positional controls are disabled under the same condition; cross-column moves append.

## Consequences

- Hidden cards are never repositioned by a filtered drag; only the dragged card moves.
- Reordering within a column requires clearing the filter. Column-to-column moves still work while filtered.
- `moveCard` owns the enforcement point (`options.positional`), so the rule is testable without a DOM and cannot be bypassed by a stray anchor id.
- Column count badges show the visible (filtered) count, which can differ from full membership; the badge title exposes both numbers.
