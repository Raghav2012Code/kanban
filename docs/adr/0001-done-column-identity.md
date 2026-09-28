# 1. Identify the Done column by stable column id

- Status: Accepted
- Date: 2026-09-25
- Issue: #2

## Context

Completion was inferred in two different ways: the card renderer matched the column title `done`, while analytics matched either the column id `column-done` or the title. Renaming the Done column therefore broke strikethrough and skewed the completion percentage, and the two views could disagree with each other. Column titles are user-editable display text and are not a stable identity.

## Decision

The Done column is identified solely by its stable id `column-done` (`DONE_COLUMN_ID`). A single predicate, `isDoneColumn`, decides membership, and both `doneCardIds` (analytics) and the card renderer consume it. Titles are never used to infer completion.

## Consequences

- Renaming the Done column does not affect strikethrough, the Done count, or completion.
- A user who deletes the seeded Done column and creates a new one gets a new id, so completion tracking no longer applies. This is accepted; introducing a per-column "kind" would change the persisted schema, which this work explicitly avoids.
- Existing saved boards already store `column-done`, so they need no migration.

## Amendment

2026-09-28: the constraint this record cites has moved. The persisted shape is no
longer held fixed: an optional column limit was added (additive, no migration), and
a shared board is being specified that will change the shape deliberately. The
*decision* is unchanged and still honoured: the Done column is identified solely by
its stable id, and renaming it cannot break completion. A shared board will keep
that id constant rather than introducing a column kind, so this record's substance
survives even though the constraint it leaned on no longer holds. See
`0003-sort-is-a-view-not-an-edit.md` and issue #4.
