# 7. Scope undo to the person who made the change

- Status: Accepted
- Date: 2026-09-29
- Issue: #11
- Parent: #4

## Context

Undo today is a bounded linear stack of whole-board snapshots in the
persistence hook: fifty `BoardState` values, the oldest discarded, restored by
replacing the board wholesale. It is held in memory, so it does not survive a
reload. It carries no actor, no timestamp, and no per-change record, because
none of that is needed while one person is the only writer.

A snapshot restore is a total operation, and on a shared board a total
operation is the wrong shape. Undoing to a snapshot taken before a teammate's
change reverts that teammate's change along with the actor's, silently. The
shared-board specification names this as the reason to settle undo before
synchronisation, and describes it as the case where one person undoes another
person's work with no warning.

The specification does not say what undo should *become* once five people can
write, and it does not place undo out of scope. This record decides it.

The two obvious alternatives. Keeping the shared snapshot stack is the failure
itself, unchanged. Dropping undo on the shared board discards a capability the
board already has and makes the team strictly worse off than the single person
it replaces, in exchange for a problem that scoping solves.

## Decision

Undo is **scoped to the acting person**, and the scope changes the mechanism
rather than only the label.

- A history entry is **attributed to the person who made the change**. The
  history offered to a person holds only their own entries, so a teammate's
  change can never enter it and so can never be reverted by pressing undo.
- Undo reverts **through the board transitions**, as the inverse of one
  recorded change, rather than by restoring a snapshot. A whole-board restore
  is precisely what reverts other people, so it cannot remain the mechanism
  even with a filter in front of it. Filtering a stack of snapshots still
  restores a snapshot; the unit of undo has to shrink.
- A change a **teammate has touched since the entry was made is refused and
  explained**, not applied. Silently reverting a colleague's newer work is the
  same class of defect as a lost move, which is the single failure this whole
  body of work exists to prevent.
- The existing **bound of fifty entries is kept**, counted per person rather
  than per board.

## Consequences

- **The undo already built for the local board is unchanged, and must not be
  changed yet.** A one-person board has exactly one actor, so "only my own
  changes" covers every change, and the current snapshot behaviour already
  satisfies the rule. The refactor to attributed, transition-based entries
  belongs to the cutover, and is not a reason to disturb a working local board
  now.
- **A signed-out visitor keeps undo in full.** Their board is their own local
  copy, there is one actor, and nobody else can reach it, so the rule is
  satisfied trivially. This is consistent with #19, which requires a
  signed-out visitor to have a working board.
- Undo becomes **a mutation like any other**: attributed in the activity
  record, and travelling the same optimistic, queued, reconciled path as every
  other change. #34 is updated to carry this.
- Because undo is applied optimistically, a **refused undo arrives as a state
  to reconcile and surface**, through the same mechanism as any other rejected
  change, and is never swallowed.
- The **conflict check runs when the undo is committed, not when it is
  pressed.** An undo queued while disconnected is applied on reconnect against
  a board that has moved on, so whether a teammate has touched the target
  since cannot be answered at the moment the key is pressed.
- Undo is **no longer a uniform action**, because it can refuse. The control
  needs to be able to say why, through the same board notice that the Work In
  Progress limit and the filtered-reorder rule already report through.
- **Undo history is still lost on reload, and that is not decided here.** The
  stack lives in memory. Whether a shared board retains a person's history
  across a browser restart is a real question, adjacent to #19's "stay signed
  in", and it is left open rather than answered in passing.
