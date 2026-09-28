# 3. Treat an active sort as an active filter for positional reordering

- Status: Accepted
- Date: 2026-09-28
- Issue: #3

## Context

ADR-0002 disabled positional (card-level) drops whenever a filter was active, because a filtered view no longer corresponds to stored positions. A drop anchored to a visible card could land the dragged card at an index that silently repospected cards the user cannot see.

Sorting has the same property and was not covered. A sorted column renders in a different order from the one stored, so a positional drop anchored to a visible card has exactly the same hazard. The specification for sorting (#3) only ever named filters, and the gate that decides whether the board is filtered knew only the text query and the priority. The effect was that selecting a sort order would have quietly reopened the scramble ADR-0002 exists to prevent, with nothing in the suite able to see it: the guard on filtered reordering exercised a text query only.

## Decision

The single gate that decides whether the board is in a view that does not match stored positions counts a sort as well as a filter. While any filter **or any sort** is active, positional drops and the keyboard up/down controls are disabled, and cross-column moves append as they already do. This is one rule with one name rather than two that can drift.

Sorting itself remains a read of the board. A sort affects only the order cards are rendered in, computed during render from stored order as its base, and never rewrites stored column membership.

## Consequences

- A sorted or filtered column cannot be nudged positionally. The user returns to manual order to reorder, which is the state whose positions are real.
- The gate lives with ADR-0002's rule rather than beside it, so there is one predicate to widen when a new view dimension is added and one test to extend.
- The filtered-reorder guard is widened from a text query to a non-query dimension. Without that, a gate that ignores sorts stays green while the scramble is back.
- A future view that renders in an order other than stored order must be added to the same predicate. Anything that rewrites stored order would break the guarantee outright and needs its own record.
