# 4. Order cards by a rank, not by position

- Status: Accepted
- Date: 2026-09-28
- Issue: #4

## Context

Order is currently array position: each Column holds a list of Card identifiers,
and the list order *is* the order. That is unambiguous for one person on one
device. With five, two people reordering the same Column both send the whole
list, the second write silently overwrites the first, and one person's move
disappears with no error and no warning. On a shared board this is the single
failure most likely to destroy trust in the tool.

The rejected alternatives are the two obvious ones. Whole-list writes lose work
silently, which is the defect itself. A conflict-free replicated type solves a
much harder problem than five people have, and would be wildly disproportionate.

## Decision

Order is a per-Card **rank** rather than a position in a list.

- Inserting between two Cards computes a rank strictly between their ranks. A
  midpoint always exists, so insertion never needs to renumber anything.
- A rank is an arbitrary-precision value **compared as text**. That is what makes
  a midpoint available at all: a fixed-width integer would eventually run out of
  room between neighbours, and a float would lose precision at the same scale.
- Ranks are **never rebalanced**. Rebalancing is the one operation that would
  reintroduce whole-list writes, and it is never needed, because a midpoint
  always exists.
- If two Cards end up with the same rank, the tie is broken by **Card identity**.
  Every device therefore computes the same order from the same data, and two
  people inserting at the same position both keep their Cards.

Existing boards carry no rank. The field is optional, and where it is absent the
stored order derives it, so a saved board is never stranded.

## Consequences

- Two concurrent moves into one Column both survive, and all devices agree on the
  resulting order. This is the guarantee, and it is the thing to test.
- Moving a Card mutates one rank rather than rewriting a list, so an unrelated
  concurrent change cannot be clobbered.
- A rank collision is resolved by identity rather than by last write, so the
  outcome does not depend on arrival order.
- Stored list order is gone as a source of truth. Every read has to derive order
  from rank, and a Card with no rank falls back to its position. That is a real
  cost, and it is the price of never losing a move.
- ADR-0002's rule — positional drops are disabled while a filter or sort is
  active — is unchanged, and is now expressed over ranks rather than indices. The
  existing positions no longer exist to be scrambled, and the rule's reasoning
  still holds: a view that renders in an order other than stored order must not
  be used as a drop anchor.
