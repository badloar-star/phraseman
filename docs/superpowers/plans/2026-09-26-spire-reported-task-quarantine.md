# Spire Reported Task Quarantine — Implementation Plan

**Design:** `docs/superpowers/specs/2026-09-26-spire-reported-task-quarantine-design.md`

## Phase 1 — Contracts and RED tests

- Add failing tests for the structured Spire report payload and strict pack-membership validation.
- Add failing tests for one-report quarantine, pre-download reservation/idempotent retry, stale-week replay, recomputed pack hash, and preservation of the exact v1 flag schema.
- Add canonical incident tests for 101+ reports, response-loss replay, and reopen → restore revision changes.
- Add failing tests for atomic admin restore/reopen and audit writes.
- Add failing admin contracts for the two review surfaces, plain-language controls, shared state, and the copied LLM instruction.
- Add a Firestore Rules regression test proving direct writes to Spire flag documents are denied.

## Phase 2 — Server quarantine boundary

- Add a dedicated `spire_task_report` kind to the app/server report contract.
- Validate the published pack and exact task membership server-side.
- Extract a server-only quarantine service reused by report acceptance and existing admin flag management.
- Store structured Spire provenance on the report while keeping the flag document schema unchanged.
- Reserve and rate-limit before Storage, finalize report/receipt/incident/flag atomically, and return accepted replays before Storage download.
- Persist and compare the canonical request fingerprint on every finalized replay; changed payload under the same key must fail before Storage.
- Store bounded lifecycle truth in `spire_task_incidents/{lang__taskId}` and keep duplicate reports as immutable evidence.

## Phase 3 — Protected resolution workflow

- Add an admin callable that resolves or reopens a Spire incident.
- On resolve/reopen, atomically advance incident revision/state, strict flag, audit, and revision-derived operation receipt without scanning historical reports.
- Preserve historical manual-hold provenance and an explicit current `manualHoldActive` projection in the incident. Resolve closes the complaint without removing an independently owned flag; a later manual unflag atomically clears the flag plus current projection, advances revision, and audits the change.
- Require the existing admin permission and write an audit record.
- Deny direct browser writes to flags, incidents, reservations, and Spire-scoped report update/delete paths; block manual flag bypasses from canonical incident state.

## Phase 4 — App report integration

- Add a typed Spire report submission helper with a stable idempotency key.
- Wire the standard flag action into the Spire task renderer when that renderer is present.
- Remove the submitted task from the reporter's remaining local run immediately.
- Preserve reports in an account-bound durable outbox until server confirmation without pretending an unconfirmed quarantine succeeded globally.
- Remove the local task only after durable enqueue or server success; drain the bounded owner queue on auth-ready startup and foreground, with no timer.
- Use the native Firebase Auth observer for readiness; remove immediately and exactly once after durable enqueue, otherwise only after server confirmation.

## Phase 5 — Live admin UI

- In `admin/v2/legacy.html`, add the compact `На проверке` subsection under `Контент Spire`.
- Hydrate `Ошибки контента` Spire cards from canonical incident state; remove direct delete/status actions.
- Hydrate server filters/LLM exports and browser cards in chunks of at most 100; restored incidents are not unresolved, and exact-loaded historical reports join the same canonical action collection.
- Authorize common-queue hydration with `reports.read`, fail softly by browser chunk, and persist selected source-report fixed/open status inside the protected incident transaction for reply/reward compatibility.
- Query `Контент Spire` server-side by language plus `state == quarantined`, with deterministic composite-indexed ordering and a strictly decoded opaque value cursor sized for the maximum 200-character task id, so restored history cannot hide new work.
- Keep technical details collapsed; use clear labels, tooltips, confirmations, and loading/empty/error/success states.
- Update the copied LLM instruction with restore-to-pool, untrusted-input, privacy, verification, and no-direct-write rules.

## Phase 6 — Verification and reviews

- Run focused unit/contract tests under the shared heavy-process semaphore.
- Run narrow type/lint/build checks for changed surfaces.
- Run admin language/action/single-surface guards.
- Run Firestore Rules and Jarvis data-contract guards affected by the schema extension.
- Perform a fresh security/cross-contract review, repair findings, then run an independent deterministic verification pass.
- Do not deploy until every required gate is green and the final diff contains only intended files.
