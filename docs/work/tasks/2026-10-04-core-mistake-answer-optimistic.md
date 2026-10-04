# Task packet: "My mistakes" verdict immediately, journal write in background

Governance-ID: TG-6D734EF780C3
Status: In progress
Owner: Claude session «App Check» (82577f25), by coordinator §126 point 3 (2026-10-04)
Related epic/enabler: user reports, 1.6.19: 15-18 s per answer in "Мои ошибки"

## Outcome

After an answer the verdict panel appears without waiting for the journal write; the event is merged into an in-memory journal at once and written in the background through one ordered queue. Success: no storage write on the answer path; no lost or reordered event.

## Scope

In scope: new app/mistake_practice_answer_journal.ts (in-memory journal, ordered write queue, retry, unsaved list); app/mistake_practice_session.tsx submitVerdict, hide/restore and finish paths; tests.
Out of scope: store format, cloud transport, reward rules.

## Architecture

Optimistic update: local journal merge (pure function already used by the store) feeds verdict, status and chain. One queue serialises writes; reads from storage wait for the queue; rewards and the finale wait for the queue (afterWrites). Failure: retry once, keep the event in an unsaved list that rides along with the next write, drop memory so the next read takes storage truth, log every catch. Event ids are deterministic per attempt, so a repeated write is idempotent.

## Security and privacy

No new data; same events, same storage keys.

## Technical debt

- Pay now: blocking storage write on the answer path.
- Contain: queue covered by tests (order, retry, give-up, idle).

## Verification

Unit tests for the module (instant journal, ordered writes, retry then success, give-up keeps unsaved, whenIdle); existing mistake suites; type check.

## Rollback

Revert the commit; the screen goes back to awaiting the write.
