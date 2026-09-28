# 5. Treat an expired session as a state, not an error

- Status: Accepted
- Date: 2026-09-28
- Issue: #4

## Context

The board is local and has no accounts. The moment it becomes remote, the session
becomes something the client does not control: it can end at any moment, on any
request, for reasons that have nothing to do with the person using it.

The obvious implementation treats that as an error — a failed request, a logged
message, a retry. That is wrong in a specific and damaging way. A person whose
session expired mid-edit sees their changes stop saving and concludes the board
is broken, or that they have lost work. Both are wrong, and the second is the one
that costs trust. Session expiry is among the most common events on a web
application, so the experience of it is not an edge case; it is the normal case
for anyone using the board on a laptop they closed yesterday.

## Decision

An expired session is a **first-class state** with its own message and its own
recovery path, not an error.

- The board's existing notice pattern is generalised to carry connectivity,
  conflict, and authorisation states alongside the corruption and quota states it
  already handles. One mechanism, so the person learns it once.
- The message says the session ended and what to do about it. It does not say the
  board is broken, and it does not silently discard whatever was in flight.
- Signing in again restores the session without losing the board.

## Consequences

- The storage notice's state union grows. That is the point: the states a board
  can be in are part of its design, and pretending a session cannot expire is how
  a person ends up not trusting the thing that tells them their work is safe.
- The generalisation is bounded to connectivity, conflict, and authorisation.
  Anything else is a bug, not a state.
- A component that wants to react to expiry does so through the same channel as
  every other board notice, so there is one place to look.
- Expiry is expected during normal use, so it must never be destructive. Work
  queued while offline is flushed on reconnect rather than dropped, and a
  mutation that cannot be sent is surfaced rather than assumed saved.
