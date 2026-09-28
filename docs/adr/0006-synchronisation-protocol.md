# 6. Synchronise by polling, apply optimistically, queue offline

- Status: Accepted
- Date: 2026-09-28
- Issue: #4

## Context

Five people share one board. They need to see each other's work within seconds
and must not lose each other's moves. A live transport would be the obvious
choice and is disproportionate: five people on a static front end do not need a
socket, and a socket is a second thing to keep alive, reconnect, and reason about
when it fails.

The failure that matters most is not staleness. It is a person believing their
work was saved when it was not — a failed flush that reports success, or a
rejected mutation that is swallowed. That failure destroys trust faster than any
amount of lag, and it is entirely preventable by being honest at exactly the
moment it is inconvenient.

## Decision

Updates arrive by **short polling**. The client applies a mutation immediately and
**reconciles** when the poll returns.

- A board **revision counter** lets a poll detect that it has nothing new, so the
  common case costs almost nothing.
- Mutation payloads are **idempotent**. A retried send cannot double-apply, which
  is what makes retrying safe and therefore makes a flaky network survivable.
- Work done while disconnected is **queued and flushed on reconnect**. A flush
  failure is **surfaced, never swallowed**.
- Someone looking at an older version of the board can **tell**, so they understand
  why a card looks different from what a teammate described.
- The board is readable while disconnected, and recovers on its own when the
  network returns.

## Consequences

- A person's own changes are instant, because they are applied locally first.
- Convergence is a property of the ordering guarantee (ADR-0004), not of the
  transport. The protocol assumes ranks merge cleanly; it does not reconcile
  conflicts, because ordering is the only conflict that can lose work, and it is
  solved at the data layer.
- Polling costs a request per interval per open board. At five people this is
  negligible, and a live transport would be a large cost for a difference nobody
  can perceive at this size.
- The offline queue is the part that must not be rushed. Losing queued work is
  worse than never queuing it, so the queue holds mutations and reports on them
  rather than dropping either.
