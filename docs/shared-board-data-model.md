# Shared board data model

- Status: Proposed, pending the backend choice in #14
- Date: 2026-09-28
- Issue: #4

A shape rather than a decision: this is what the tables are, not why this shape
over an alternative. The decisions that *do* have rejected alternatives worth
writing down are in ADR-0004 (ordering), ADR-0005 (session expiry), and ADR-0006
(synchronisation).

The backend is not chosen yet, and this shape inherits that choice. Everything here
is expressible in a relational database with row-level security, which is the
requirement that actually constrains it.

## Tables

| Table | Carries |
|---|---|
| `boards` | one row per board; exists so the other tables can reference one |
| `columns` | board reference, title, order, deletion marker |
| `cards` | board reference, column reference, title, description, priority, due date, optional assignee, rank, filed and updated timestamps, deletion marker |
| `board_memberships` | board reference, person, role |
| `activity` | board reference, person, action, target, time |

**Every table carries a board reference, even though there is one board.** The
product exposes a single board and multi-board support is out of scope. The
reference is there so that supporting more than one later is a data problem
rather than a redesign: adding a second board must not mean revisiting every
query.

## Two choices worth stating

**Soft deletion.** Cards and Columns carry a deletion marker rather than
disappearing. This is what allows a deleted Card's activity to stay meaningful —
otherwise the history develops holes exactly where someone goes looking — and it
allows a restore without a separate backup mechanism. The Board filters marked
rows out of normal view; nothing else has to know.

**Rank as text, order on Columns.** Card order is a per-Card rank rather than a
position, which is the subject of ADR-0004. Columns keep a plain order because
there are five of them per board and they are reordered as a whole; the expensive
part is Card order, where two people collide.

## Trust model

Five known people. Every member may read and write the whole Board. There is no
per-Card or per-Column permission, because that complexity is not justified at
this size, and a half-built permission model is worse than none.

Enforcement is server-side. A non-member is refused by the database itself, not by
the absence of a control in the interface — a client-side check proves nothing
about security, and hiding a control is not access control. Every request is
checked against the server, so a revoked membership stops working immediately
rather than whenever the client next happens to re-read.

Invitations are in scope. Deciding what each member may do beyond membership is
not.

## Conflicts that are deliberately not solved

Two people editing different fields of one Card converge on one value. Two people
deleting one Card is idempotent. Generated identities do not collide. All are
last-write-wins **per Card**, and none is destructive.

Ordering is the only conflict that can lose work, and it is the only one solved
properly. Editing a Card a teammate has changed underneath the editor is surfaced
to the editor rather than silently resolved, because a silent resolution here
means someone's work disappears without either of them noticing.
