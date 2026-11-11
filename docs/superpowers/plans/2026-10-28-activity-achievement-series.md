# Activity Achievement Series Implementation Plan

**Goal:** Deliver approved video (10/50/100/200 hours), full Learning V2 lesson per language, old full course, daily all-tasks streak (3/7/30/60/100/200) and submitted-report (10/50/100) achievements using existing collection/history.

**Architecture:** Reuse achievements_v1 and its account queue/restore path. Bounded optional activityEvidence on each series' first catalog row stores monotonic totals or union facts; merge those independently of unlock dates. No currencies or access grants. Pure reducer/evaluator plus source adapters; no curriculum edits.

**Tech Stack:** TypeScript, React Native, AsyncStorage, existing Firebase response receipts, Jest.

Root is the sole writer in the current dirty checkout, per owner instruction. Read-only explorers establish independent source contracts. No worktree/commit/deploy.

- [ ] RED: tests for thresholds, true completed masks, whole-course same-target evidence, daily calendar runs, report idempotency, restore union and stale-account persistence.
- [ ] Pure activity catalog/evidence reducer; active foundation IDs stay limited to foundation achievements; retired daily IDs remain historical.
- [ ] Queue-based persistence and original-date story replay; bounded evidence survives cloud merge without new cloud paths.
- [ ] Video adapter consumes existing totalSeconds and entitlement hours; captures original owner across network. Manual reports consume only successful real collection/id receipts.
- [ ] Daily adapter records nonempty fully completed saved days before rollover and on retry; recover only retained dates.
- [ ] Course adapters read existing completion evidence, ignore placement/opened masks, replay on entry/backfill and completion.
- [ ] Collection progress/copy/art integration; targeted tests, type/lint diagnostics and independent review; report limitations honestly.

Acceptance: each threshold only once; counters never fall on restore; no pause/seek-derived increments outside existing watch authority; auto telemetry and fake receipts excluded; all tasks required for a day; dates count consecutively across month/year/DST; old course must all pass within one language; no stars, opened lessons or placement can impersonate completed V2 sessions. Historical report totals and daily dates older than retained history are unknown, not zero inferred achievements.
