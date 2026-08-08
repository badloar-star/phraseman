# Admin Content Factory — Release 11C, Arena wave 1 evidence

Date: 2026-07-13  
Scope: Arena shadow-first convergence, telemetry, compatibility and kill switch  
Deployment: not performed

## Delivered

- Arena-only parity comparator for identity, item count, single-correct answer, semantic option set, source evidence, QA outcome and terminal error semantics.
- Immutable, idempotent comparison receipts partitioned by comparator version and configuration revision.
- Evidence metrics count unique Arena units, use only the latest retry attempt, preserve a separately bounded revision history and fail closed on partial current-revision reads. Historical partialness is shown separately and cannot contaminate the current GO gate. Failed generations remain terminal telemetry but never count as successful semantic evidence.
- Readiness blockers enforce at least 200 unique comparisons, 20 jobs, seven days, all A1/A2/B1/B2 levels, configured locale pairs, zero critical mismatches, 100% identity/schema/correctness/QA/evidence agreement, at least 99.5% terminal agreement and at least 98% semantic coverage.
- New Arena jobs persist immutable engine provenance. Old jobs and releases without provenance resolve to legacy.
- Shadow comparison is derived from the same accepted legacy artifact and records zero additional provider requests. It never changes the authoritative unit outcome.
- Missing or failed shadow telemetry cannot fail a successful legacy generation.
- Compare receipts cover successful and terminal failed attempts; retries cannot inflate the readiness sample. Receipt identity includes configuration revision and attempt, so a new rollout window cannot collide with old evidence.
- CAS-protected `legacy|shadow` configuration, explicit required locale pairs, audit log and immediate legacy kill switch. Stage/canary execution remains disabled in this wave.
- Release sealing and runtime reads use stored provenance, not the current global switch. Old releases remain readable; mismatched stage provenance fails closed.
- Admin v2 exposes current metrics, revision history, blockers, shadow enable and permission-gated legacy rollback. It exposes no stage cutover button.
- No Quiz, Challenge, Lesson or Flashcard routing was changed by this wave.

## Verification

- Focused Functions: 19 suites / 93 tests passed.
- Functions TypeScript build passed.
- Root Admin UI contract: 1 suite / 12 tests passed.
- Admin Playwright smoke: 7 / 7 passed, including 375, 768, 1024 and 1440 px.
- Firestore Emulator: 2 / 2 passed for CAS config update, audit creation, stale-revision rejection, idempotent receipt persistence, authoritative unit immutability and current-revision filtered unit/receipt queries after more than 500 historical Arena records.
- Focused `git diff --check` passed; only existing line-ending conversion warnings were emitted.

## Safety and rollout state

- No project OpenAI API key, external generation provider or second model request was used.
- No production Firestore write, deployment, publication, commit or push was performed.
- Production routing remains legacy-authoritative. Shadow must be enabled explicitly by an authorized administrator.
- Canary and stage execution are intentionally unavailable until the minimum evidence window is collected and a separate reviewed release wave approves cutover.
- Existing accepted drafts, release pointers, rollback behavior and non-Arena surfaces are preserved.
