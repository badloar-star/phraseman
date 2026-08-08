# Jarvis Trustworthy Automation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `executing-plans` and apply every task with RED → GREEN verification. The canonical-workspace rule forbids a new worktree; execute only in `C:\appsprojects\phraseman` on `feature/referral-roulette`.

**Goal:** Make all scheduled Jarvis departments automatically collect complete, contract-valid evidence and refuse to publish misleading numbers, narratives, recommendations, or approval buttons when evidence is incomplete.

**Architecture:** Preserve the existing fetcher → snapshot → department → digest pipeline. Strengthen each boundary so required-source failures and truncated/stale evidence propagate as `insufficient_evidence`; replace bounded document scans with Firestore aggregation queries where exact counts are required; keep diagnostic samples separate from authoritative counts. Existing product flows, admin App Check policy, and approval semantics remain intact.

**Tech Stack:** TypeScript, Firebase Cloud Functions v2, Firestore Admin SDK aggregation queries, Jest/ts-jest.

---

### Task 1: Payments and Safety fail closed

**Files:**
- Modify: `functions/src/jarvis/payments_department.ts`
- Modify: `functions/src/jarvis/payments_snapshot.test.ts`
- Modify: `functions/src/jarvis/safety_firestore_fetcher.ts`
- Modify: `functions/src/jarvis/safety_department.ts`
- Modify: `functions/src/jarvis/jarvis_data_contract_guard.test.ts`

- [ ] Add RED tests proving `error + empty` and `empty + error` payment inputs produce one `insufficient_evidence` decision.
- [ ] Make every required payment source trustworthy before an exact zero can be asserted; keep confirmed lost-payment rows visible even if another source fails.
- [ ] Add RED tests proving unsupported or missing age taxonomy cannot produce a trustworthy zero-minor claim.
- [ ] Represent age-unverified safety evidence honestly while preserving general backlog/spike decisions and direct alerts.
- [ ] Replace substring-only contract checks with writer/field assertions tied to the actual `safety_flags` writer.
- [ ] Run: `npx jest --no-coverage --runInBand src/jarvis/payments_snapshot.test.ts src/jarvis/payments_department.test.ts src/jarvis/safety_firestore_fetcher.test.ts src/jarvis/safety_department.test.ts src/jarvis/jarvis_data_contract_guard.test.ts`.

### Task 2: Evidence freshness and truthful actions

**Files:**
- Modify: `functions/src/jarvis/decision.ts`
- Modify: `functions/src/jarvis/decision.test.ts`
- Modify: `functions/src/jarvis/issue_decision_buttons.ts`
- Modify: `functions/src/jarvis/issue_decision_buttons.test.ts`
- Modify: `functions/src/jarvis/telegram_digest.ts`
- Modify: `functions/src/jarvis/telegram_digest.test.ts`
- Modify: `functions/src/jarvis/jarvis_crons.ts`

- [ ] Add RED tests proving evidence older than `MAX_EVIDENCE_AGE_MS` and evidence from the future is untrustworthy.
- [ ] Normalize stale/future evidence to `count:null`, `trustworthy:false`.
- [ ] Add RED test proving Telegram buttons reference the same severity-sorted decisions displayed in the digest.
- [ ] Build one sorted/limited decision list and pass it to both message rendering and button creation.
- [ ] Suppress approval buttons and action recommendations for `insufficient_evidence`; show source-recovery guidance instead.
- [ ] Run focused decision/digest/button/cron tests.

### Task 3: Growth and retention metrics

**Files:**
- Modify: `functions/src/jarvis/growth_firestore_fetcher.ts`
- Modify: `functions/src/jarvis/growth_firestore_fetcher.test.ts`
- Modify: `functions/src/jarvis/growth_department.ts`
- Modify: `functions/src/jarvis/retention_firestore_fetcher.ts`
- Modify: `functions/src/jarvis/retention_firestore_fetcher.test.ts`
- Modify: `functions/src/jarvis/retention_department.ts`
- Modify: `functions/src/jarvis/jarvis_data_contract_guard.test.ts`

- [ ] Add RED tests proving Growth remains exact above 2,000 users and excludes future `created_at` timestamps.
- [ ] Replace document-ID scan with server-side `created_at` count queries bounded by `[now-24h, now]`; invalid aggregate values become `error`, never zero.
- [ ] Add RED tests proving Retention rejects contradictory counts and excludes future activity.
- [ ] Rename the existing ratio in findings to WAU/MAU activity stickiness; do not claim cohort retention.
- [ ] Keep the department silent on healthy scheduled snapshots and explicit on unavailable evidence.
- [ ] Strengthen the data-contract guard for both real writers of `created_at` and `last_active_at`.
- [ ] Run focused Growth/Retention/contract tests.

### Task 4: Support SLA automation

**Files:**
- Modify: `functions/src/jarvis/support_firestore_fetcher.ts`
- Modify: `functions/src/jarvis/support_firestore_fetcher.test.ts`
- Modify: `functions/src/jarvis/support_department.ts`
- Modify: `functions/src/support_inbox.ts`
- Modify: `functions/src/admin_alerts.ts`
- Modify carefully: `functions/src/index.ts` (preserve unrelated dirty edits)

- [ ] Add RED tests proving unresolved mail older than seven days remains counted and oldest age is exact.
- [ ] Use Firestore aggregate counts for the full unresolved queue and an oldest-first single-document query for SLA age; do not report `truncated:false` for bounded scans.
- [ ] Add persistent notification outcome/retry state so Telegram failure is observable and retried idempotently.
- [ ] Wire the existing dispatch sweeper and backend resolve delivery path instead of leaving them unreachable.
- [ ] Schedule Gmail ingestion before the 06:00 Jarvis audit and signal ingestion failure/staleness in evidence.
- [ ] Run focused Support/backend schedule tests.

### Task 5: Quality aggregation

**Files:**
- Modify: `functions/src/jarvis/quality_firestore_fetcher.ts`
- Modify: `functions/src/jarvis/quality_firestore_fetcher.test.ts`
- Modify: `functions/src/jarvis/quality_source_reader.ts`
- Modify: `functions/src/jarvis/quality_department.ts`
- Modify: `functions/src/jarvis/quality_department.test.ts`

- [ ] Add RED tests proving a source with more than 100 daily events cannot publish a sampled bucket count as an exact total.
- [ ] Separate authoritative aggregate counts from bounded diagnostic samples and propagate truncation explicitly.
- [ ] Preserve `uid`, fingerprint/context, severity, status, and build in diagnostic rows; aggregate unique affected users where available.
- [ ] Classify `error_reports` as human reports and `app_errors` as automatic telemetry.
- [ ] Replace “nobody reported” with evidence-backed source-specific language.
- [ ] Run focused Quality tests.

### Task 6: Factory evidence

**Files:**
- Modify: `functions/src/jarvis/content_firestore_fetcher.ts`
- Modify: `functions/src/jarvis/content_firestore_fetcher.test.ts`
- Modify: `functions/src/jarvis/factory_department.ts`
- Modify: `functions/src/jarvis/factory_department.test.ts`

- [ ] Add RED tests proving `lesson_stats` absence means no completions, not a missing lesson.
- [ ] Read and propagate the real source `updatedAt`; stale stats must be untrustworthy.
- [ ] Restrict gap/wall conclusions to observed completion funnels and remove unsupported “write the next lesson” advice.
- [ ] Run focused Content/Factory tests.

### Task 7: Integration, review, and verification

**Files:**
- Verify all changed files and preserve existing dirty worktree changes.

- [ ] Run all focused suites from Tasks 1–6.
- [ ] Run: `npx jest --no-coverage --runInBand src/jarvis --silent` from `functions`.
- [ ] Run the Functions TypeScript build/typecheck command defined by `functions/package.json`.
- [ ] Request a fresh code review of the final diff; fix every Critical/Important finding.
- [ ] Run `git diff --check` and inspect `git status --short`; do not commit, deploy, push, or write production data without a separate explicit request.

