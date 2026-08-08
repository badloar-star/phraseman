# Admin Content Factory — R8–R12 final evidence

Date: 2026-07-13  
Scope: mandatory R8–R12 implementation waves and their local quality gates  
Deployment: not performed

## Delivered

- R8A–R8B: guarded concurrent execution, lease/checkpoint correctness, transactional terminal state, artifact reference/orphan retention, bounded queries and truthful rollout metrics.
- R9A–R9B: provider-attempt budgets, context-bound repair, structured-output capability handling, shared deterministic surface QA, stage model policies and resumable 50-phrase assembly with a final whole-artifact gate.
- R10A–R10B: atomic server bulk/range plans, approved dependency catalog, immutable artifact revisions and semantic diffs, review fingerprints, capability-driven modular Admin v2 Content Studio, filters, pagination and accessible responsive review workflows.
- R11A: canonical flashcard semantic registry with shadow verification, bounded backfill/cutover/rollback and backward-compatible rich flashcard runtime fields.
- R11C wave 1: Arena shadow comparison, immutable parity receipts, readiness thresholds, provenance, kill switch and legacy-authoritative rollback. Stage/canary cutover remains intentionally unavailable until evidence thresholds and a separately reviewed rollout wave are satisfied.
- R12A: transactionally audited pause/resume/cancel controls with zero provider-attempt delta and review fingerprints covering every canonical stage kind.
- R12B: reproducible 17-case offline prompt regression corpus and candidate-bound promotion gate. Arena `v5` remains a non-active candidate; production remains on `v4`.
- R12C: disabled-by-default, capped, allowlisted, advisory-only shadow judge. It cannot approve or publish; every result requires human review and stale receipts fail closed.
- R12D: privacy-safe Arena timing aggregation with server-observed timestamps, bounded histograms, p50/p95 and sample/completeness gates. The authoritative 40-second runtime is unchanged and cannot be changed automatically.

The optional R11B Challenge publication consumer remains draft-only because no explicit product decision approved publication. Optional R12.5 provider fallback/new-language rollout was not activated. These are decision gates in the approved plan, not completion requirements for R12 acceptance.

## Final cross-release verification

- Functions non-emulator Content Factory regression: 96 suites / 505 tests passed.
- Firestore Emulator Content Factory regression: 9 suites / 25 tests passed, including concurrency, idempotency and stale-evidence races.
- Prompt regression runner: 17 / 17 expected decisions passed.
  - Manifest: `04ee152017d06205288d60e3fa8f4da6bcc3fc562e898e235391eb190d97642a`
  - Baseline report: `4d1a4922bf39827adf2edd65dd0853c98bc6a40e84f797812f79fbf85ec87e6d`
  - Arena v5 candidate definition: `12679ac2c73e8a69af384647eb1c4fff44378076e908782d5f26b18a7d073b84`
  - Candidate report: `488c6e76556e7e406891c26bb25c83fa63caf72d76eabc3ae392b84ae0f3b097`
- App/Admin focused contracts: 5 suites / 25 tests passed.
- Admin v2 Playwright smoke: 7 / 7 passed, including retry/pause/cancel/review/approval, bulk/dependency/edit flows, keyboard focus and 375/768/1024/1440 px layouts.
- Functions TypeScript build: passed.
- `git diff --check`: passed; only line-ending conversion warnings were emitted.

During the final regression, the R7 permission/audit source contract was updated to follow the R12A separation between the callable permission boundary and `stage_control_repository.ts`. The strengthened contract now requires App Check and permission enforcement at the callable plus `tx.update(stageRef)` and `tx.create(auditRef)` inside the repository transaction. Its focused result is 23 / 23 passed.

The first final Advisor review found that an immutable manual edit inherited the base revision's `judgeReceipt` and `judgeUpdatedAt` even though that receipt was bound to the previous content hash. The edit transaction now removes both fields from the new revision. The emulator fixture starts from an `advisory_pass` base receipt and proves that neither judge field exists on the edited revision. The focused emulator test passed, followed by the complete 96-suite/505-test non-emulator regression, TypeScript build and complete 9-suite/25-test emulator regression.

The first emulator invocation exposed an incomplete local root dependency installation: `firebase-admin` was declared in `package.json` but absent from root `node_modules`. Restoring the already-declared dependency without saving a manifest change made the same emulator suite pass. No production code workaround was introduced.

## Safety and current rollout state

- No project OpenAI API key or real external generation/judge request was used. Provider and judge verification used deterministic fixtures/fakes in accordance with the project firewall.
- No production Firestore data was read or written.
- No Firebase Functions, Hosting, rules or indexes were deployed.
- No content was published, no prompt candidate was activated, and no shadow/canary switch was enabled.
- No commit or push was performed.
- Existing legacy paths remain available; Arena stays legacy-authoritative, Flashcard registry cutover stays inactive and the shadow judge stays disabled by default.

## Review status

- Each completed release wave received Advisor approval after its release-specific verification and any requested corrections.
- Final cross-release Advisor decision after the stale-judge correction: `DECISION: APPROVED`.
