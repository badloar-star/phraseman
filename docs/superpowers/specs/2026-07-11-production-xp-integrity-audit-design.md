# Production XP Integrity Audit Design

Date: 2026-07-11
Status: approved for specification; production audit not yet executed

## Objective

Run a production-wide, strictly read-only audit that identifies accounts whose lifetime XP may have been inflated by the historical XP formula migration or by invalid achievement rewards. The audit must quantify confidence and evidence without changing Firestore, notifying users, or exposing personal data.

## Known calibration case

The owner-provided control account previously exhibited visible level jumps up to level 50 and now shows the expected level near 8. Prior read-only forensics established two relevant defect families:

1. A client XP formula migration could re-apply and inflate local XP during application startup.
2. The historical server achievement path accepted semantically impossible achievement claims and could pay an achievement again after an account alias merge.

The control account is used only as a private calibration input. Its email, UID, nickname, and raw event documents must not appear in the shareable report.

## Scope

The audit reads only the data required to evaluate XP integrity:

- canonical `users/{stableUid}` progress and migration/cutover markers;
- `users/{stableUid}/progress_events` immutable XP ledger;
- identity metadata needed to locate canonical and historical alias documents;
- historical alias progress ledgers when an authenticated merge is proven;
- XP mirrors in `leaderboard`, `arena_profiles`, and current `league_groups`;
- current server achievement reward catalog and level formula from repository source.

The audit does not write Firestore, repair XP, delete or rewrite ledger events, notify users, award currency, deploy code, or modify report status.

## Evidence model

Each scanned account receives evidence checks in five independent dimensions:

1. **Ledger continuity:** compare current canonical lifetime XP with the sum of accepted canonical progress events, accounting for documented cutover/migration baselines.
2. **Achievement validity:** validate official achievement IDs, canonical reward amounts, threshold conditions at pre-event authoritative totals, and first-earned semantics.
3. **Alias duplication:** detect the same semantic achievement reward across a canonical account and proven historical merge aliases.
4. **Migration inflation:** inspect migration markers and discontinuities consistent with the historical 250-to-400 formula restore or repeated startup migration.
5. **Projection drift:** compare canonical XP with leaderboard, arena, and league mirrors. Mirror drift is reported separately and is never treated as proof of inflated canonical XP.

## Classification

Accounts are classified without automated punishment:

- **Confirmed damaged:** an exact invalid amount is supported by immutable events or a deterministic migration discontinuity.
- **Probable damaged:** multiple independent indicators support inflation, but the exact correction cannot be proven from retained history.
- **Indeterminate:** the current total is suspicious but retained evidence is insufficient to distinguish legitimate XP from inflation.
- **Consistent:** no integrity violation is detected within the available evidence window.

An account may also carry a separate `projection_drift` flag.

## Proposed correction calculation

The audit may calculate a proposed XP value only for `confirmed damaged` accounts. It must preserve every legitimate accepted event and subtract only amounts whose invalidity is proven by the historical rules and event ordering. It must not infer a replacement value from current level, playtime, streak, lesson count, or population averages.

Probable and indeterminate accounts receive no proposed automatic correction.

## Data flow and operational safety

1. Resolve the configured Firebase project and credentials without printing credential material.
2. Load the repository-owned achievement catalog and XP level formula.
3. Page through `users` in stable document order with bounded concurrency.
4. Read only relevant ledgers and proven aliases for each account.
5. Compute per-account evidence in memory; do not persist raw identifiers or raw event payloads.
6. Aggregate counts, XP ranges, confidence classes, reason codes, and mirror drift.
7. Write machine-readable and human-readable aggregate reports under an ignored `.codex-tmp/xp-integrity-audit/` directory.

The runner must reject write-oriented flags such as `--apply`, contain no Firestore mutation calls, and identify itself as dry-run in its output. Query failures must be counted and surfaced; partial coverage must never be presented as a complete scan.

## Privacy requirements

The shareable reports must contain no email, display name, nickname, raw stable UID, Firebase Auth UID, provider UID, free-form user content, or raw event ID. If internal grouping needs a stable key, use a run-local salted hash that cannot be reused across audit runs.

## Validation

Before the full scan:

- verify pure classification logic with synthetic fixtures for valid rewards, impossible threshold rewards, alias duplicates, migration inflation, incomplete history, and mirror-only drift;
- run a private calibration check against the known control account;
- confirm that the control account resolves to the expected current XP/level neighborhood and that its known historical indicators are detected;
- verify through source inspection and a runtime guard that the audit path performs zero writes.

After the scan:

- report scanned user count, skipped/error count, coverage dates, evidence completeness, and Firestore read count where available;
- separate confirmed, probable, indeterminate, consistent, and projection-drift totals;
- have the final report reviewed by the configured Advisor before any completion claim.

## Deliverables

- a read-only audit runner and pure analysis module;
- focused tests for classification and privacy guarantees;
- an aggregate JSON report for machine analysis;
- a concise Russian Markdown decision report explaining whether exact mass correction is possible;
- no production mutations.

## Acceptance criteria

- All reachable production users are scanned or exclusions are explicitly quantified.
- The known control case is detected without exposing its identity.
- Confirmed inflation is separated from probable and indeterminate cases.
- Projection drift is not conflated with canonical XP inflation.
- Proposed XP is emitted only when exact invalid amounts are supported by evidence.
- Reports contain no direct identifiers or personal content.
- Tooling and logs demonstrate zero Firestore writes.
- Any later correction remains a separate, reviewed, explicitly authorized operation.

