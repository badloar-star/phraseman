# Jarvis V2 Analytics Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give Jarvis reliable cohort retention, scalable daily metrics, release-aware quality signals, explicit safety evidence, source-health visibility, and safe automated follow-up tasks.

**Architecture:** Write server-owned aggregate documents from trusted event paths. Jarvis reads aggregates rather than scanning raw user data, attaches explicit freshness/completeness, and writes only idempotent owner tasks for confirmed incidents. No automated user-facing, payment, or moderation mutation is introduced.

**Tech Stack:** Firebase Cloud Functions v2, Firestore, TypeScript, Jest.

---

### Task 1: Server-owned learning events and cohort retention

**Files:** Create `functions/src/jarvis/learning_metrics.ts`, `functions/src/jarvis/cohort_retention_department.ts`; modify `functions/src/progress_events.ts`, `functions/src/jarvis/all_departments_callables.ts`; test `functions/src/jarvis/learning_metrics.test.ts` and `functions/src/jarvis/cohort_retention_department.test.ts`.

- [ ] Write RED tests for an idempotent completion event and a D1/D7 cohort rate.
- [ ] Implement a transaction that writes only hashed/stable aggregate keys and daily cohort counters.
- [ ] Implement a decision that reports cohort size, returning users and rate; return insufficient evidence for a cohort below the minimum sample.
- [ ] Run focused Jest and `npx tsc --noEmit`.

### Task 2: Daily growth aggregates

**Files:** Create `functions/src/jarvis/daily_metrics.ts`; modify `functions/src/jarvis/growth_firestore_fetcher.ts`, `functions/src/jarvis/growth_department.ts`; tests `daily_metrics.test.ts`, `growth_firestore_fetcher.test.ts`.

- [ ] Write RED tests for one daily document per UTC day and duplicate-safe user registration counting.
- [ ] Write the server-owned aggregate on the canonical user-creation path.
- [ ] Prefer the aggregate reader; preserve the full-scan reader only as explicit degraded evidence until backfill completes.
- [ ] Run focused Jest and typecheck.

### Task 3: Release-aware quality aggregates

**Files:** Create `functions/src/jarvis/quality_metrics.ts`; modify `quality_firestore_fetcher.ts`, `quality_source_reader.ts`, `quality_department.ts`; tests `quality_metrics.test.ts`, `quality_department.test.ts`.

- [ ] Write RED tests for per-build/per-platform counts and deduplicated affected-user buckets with no raw identifier in evidence.
- [ ] Implement daily aggregate updates from app errors and human report writers.
- [ ] Change findings to distinguish total events from unique affected users and name the build only when evidence is complete.
- [ ] Run focused Jest and typecheck.

### Task 4: Safety evidence policy

**Files:** Create `functions/src/jarvis/safety_evidence_policy.ts`; modify `ai_safety.ts`, `safety_firestore_fetcher.ts`, `safety_department.ts`; tests `safety_evidence_policy.test.ts`, `safety_department.test.ts`.

- [ ] Write RED tests proving age is unknown unless a server-authoritative consent record supports it.
- [ ] Implement an explicit evidence state (`confirmed_adult`, `age_unverified`, `unavailable`); do not infer minor status from client input.
- [ ] Keep confirmed safety incidents actionable through owner tasks, while age-unverified incidents remain evidence-limited.
- [ ] Run focused Jest and typecheck.

### Task 5: Data-health department

**Files:** Create `functions/src/jarvis/data_health_department.ts`, `data_health_snapshot.ts`; modify `all_departments_snapshot.ts`, `telegram_digest.ts`; tests `data_health_department.test.ts`, `data_health_snapshot.test.ts`.

- [ ] Write RED tests for stale, partial, truncated and error evidence.
- [ ] Aggregate source freshness, completeness, page/read cost and last success into a dedicated decision.
- [ ] Render one short Data Health section before operational recommendations.
- [ ] Run focused Jest and typecheck.

### Task 6: Safe automatic follow-up tasks

**Files:** Create `functions/src/jarvis/automatic_followups.ts`; modify `jarvis_crons.ts`, `jarvis_plans_store.ts`; tests `automatic_followups.test.ts`.

- [ ] Write RED tests for idempotent task creation, maximum retries and no user-facing mutation.
- [ ] Create only owner-visible tasks for `confirmed_action` decisions; exclude `insufficient_evidence` and `evidence_only` decisions.
- [ ] Add a scheduled retry for failed owner task delivery, with audit metadata and rollback by disabling the feature flag.
- [ ] Run focused Jest, full Jarvis suite, typecheck and review.

### Verification

- [ ] `npm test -- --runInBand --runTestsByPath ...` passes for every touched suite.
- [ ] `npx tsc --noEmit` passes.
- [ ] `git diff --check` has no errors.
- [ ] Fresh TypeScript/security review finds no blocker.
