# Full XP and Associated Systems Removal Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `subagent-driven-development` or `executing-plans` task-by-task. Each task has a TDD gate and must not deploy or delete production data.

**Goal:** Remove XP and every XP-dependent feature from PhraseMan, including levels, league bonuses, Season Pass, rewards, purchases, persistence, synchronization, backend contracts and UI.

**Architecture:** Client code must stop producing, reading or presenting XP before server contracts are retired. Historical records stay inert and recoverable behind a versioned migration until the owner approves a rollback-tested data deletion. Subscription entitlement remains separate from XP/Season Pass and must not be changed accidentally.

**Tech Stack:** React Native/TypeScript, AsyncStorage, Firebase Functions/Firestore, Jest, ESLint.

---

### Task 1: Freeze all new XP and XP-derived purchases

**Files:** `app/xp_manager.ts`, `app/league_personal_boosts.ts`, `app/league_group_boosts.ts`, `app/shop_catalog.ts`, focused Jest contracts.

- [ ] Write RED contracts proving every public XP award and every XP/league-boost purchase returns a retired result before wallet, AsyncStorage, cloud-sync or callable side effects.
- [ ] Replace producer entry points with fail-closed retired results; do not remove legacy readers or records in this task.
- [ ] Run focused Jest, ESLint and `git diff --check`.

### Task 2: Remove XP/level runtime and UI

**Files:** `app/xp_manager.ts`, `app/statsCache.ts`, `app/streak_stats.tsx`, `app/(tabs)/home.tsx`, profile/lesson screens, XP event consumers and tests found by `rg -l "\\bxp\\b|user_total_xp|level_reached"`.

- [ ] Add RED source/runtime contracts that no remaining production screen imports XP manager, displays XP/level, or subscribes to `xp_changed`.
- [ ] Delete XP state, counters, level crossings, XP achievements, XP notifications and UI projections; retain only non-XP practice completion data.
- [ ] Run all affected component and runtime tests; run typecheck.

### Task 3: Remove League bonuses and chest rewards

**Files:** `app/league_group_boosts.ts`, `app/league_personal_boosts.ts`, `app/services/league_chest_rewards.ts`, `components/league/*`, `app/club_screen.tsx`, `functions/src/league_groups.ts`, `functions/src/league_chest.ts`, corresponding tests.

- [ ] Add RED contracts that no group/personal boost, league chest or XP-derived league reward can be bought, granted, displayed or synced.
- [ ] Remove client entries and server callable producers while keeping read-only migration adapters for existing records.
- [ ] Run client/functions focused suites and verify no wallet debit or callable write remains.

### Task 4: Retire Season Pass end-to-end

**Files:** `app/season_pass*.ts*`, `components/Season*.tsx`, `app/season_reward_apply.ts`, `functions/src/season_pass.ts`, its index export/admin UI/tests.

- [ ] Add RED contracts for absent routes, purchase controls, claims, rewards and scheduled/administrative Season Pass producers.
- [ ] Remove all client presentation and new purchase/claim paths; replace server endpoints with explicit retired responses that do not debit or grant.
- [ ] Preserve existing purchase/claim documents read-only until migration and refund/compensation policy is approved.

### Task 5: Remove XP-derived gifts, friends rewards and notifications

**Files:** friend-gifts/together/chest modules, level gifts, broadcast rewards, notification producers and associated Functions/tests.

- [ ] Add RED contracts for no XP gift/reward creation, ingestion or notification.
- [ ] Remove catalog entries and producer paths; keep account data inert rather than deleting it.
- [ ] Verify non-XP gifts and notification allowlist remain functional.

### Task 6: Remove XP persistence, sync and server schema usage

**Files:** `app/cloud_sync.ts`, profile snapshots, progress-event clients, Firestore Functions, Rules and migration tests.

- [ ] Build a key-by-key inventory for `user_total_xp`, XP ledgers, boosts, level state and Season Pass records, with reader/writer ownership.
- [ ] Introduce a versioned read-only quarantine migration that stops writes and excludes fields from new snapshots without deleting remote data.
- [ ] Test upgrade, two-device restore, idempotency and rollback; do not deploy or purge data.

### Task 7: Remove dead assets, tests, analytics and admin surfaces

**Files:** XP/league/Season Pass assets, analytics registries, admin forms, test fixtures and release graph imports.

- [ ] Add a repository contract proving release source has no production XP/Season Pass/league-bonus imports or routes.
- [ ] Delete unreachable assets and tests only after their consumers are gone; preserve archival assets outside the release graph.
- [ ] Run bundle/typecheck/lint and release-graph checks.

### Task 8: Migration and release gate

**Files:** migration evidence, task registry, rollback runbook and release matrix.

- [ ] Record purchase/entitlement impact, backup location, rollback version and support/compensation decision.
- [ ] Execute emulator/device regression matrix for practice, subscription, progress sync, notifications and offline mode.
- [ ] Require owner approval before deployment, destructive migration or deletion of historical records.

## Coverage review

Tasks 1–5 remove all new runtime paths; task 6 stops persisted/server authority; task 7 removes residual release graph; task 8 protects historical accounts and release safety. No production deployment, data purge, refund or irreversible migration is authorized by this plan.
