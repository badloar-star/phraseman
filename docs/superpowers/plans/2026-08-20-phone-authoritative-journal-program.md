# Phone-Authoritative Journal Program Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace ordinary personal snapshot/server authority with a durable phone-authoritative journal while preserving account security, multi-device convergence, and bounded Firebase cost.

**Architecture:** The program is split into five independently gated implementation plans. SQLCipher-backed `PhoneStateStore` lands first with no production authority, immutable segment transport lands second, legacy data is imported and compared in shadow mode third, core progress cuts over fourth, and the remaining portable domains retire generic snapshot sync fifth.

**Tech Stack:** React Native 0.81, Expo SDK 54, TypeScript 5.9, `expo-sqlite`/SQLCipher, SecureStore, Firebase Firestore, Jest, Firebase Rules contract tests

---

## Source of truth

Design: `docs/superpowers/specs/2026-08-20-phone-authoritative-universal-journal-design.md`

This program supersedes the rollout direction in `docs/superpowers/specs/2026-06-13-server-authoritative-progress-direct-cutover-design.md`. Old clients remain supported during the compatibility horizon, but no new implementation may extend server authority over ordinary personal progress.

## Plans and hard ordering

1. `2026-08-20-phone-authoritative-journal-01-local-core.md`
   - Delivers encrypted local WAL storage, immutable operations, projections, reducers, fault injection, and account isolation.
   - Production authority remains legacy/off.
2. `2026-08-20-phone-authoritative-journal-02-segment-sync.md`
   - Delivers immutable Firestore segments, per-device cursors, checkpoints, durable retries, Rules, indexes, and Jarvis contract updates.
   - Runs only with synthetic/internal data until Plan 1 gates are green.
3. `2026-08-20-phone-authoritative-journal-03-legacy-shadow.md`
   - Delivers complete legacy-key inventory, idempotent opening checkpoint, shadow dual-recording, comparison telemetry, account lifecycle integration, and rollback mirror.
   - UI still reads legacy state.
4. `2026-08-20-phone-authoritative-journal-04-core-cutover-rollout.md`
   - Cuts over XP/streak/lessons/exams, disables per-answer progress callables for the cohort, removes ordinary sync errors, fixes the proven Firebase cost hot spots, and performs 1% → 100% rollout.
   - Legacy authority is removed only after two stable 100% releases.
5. `2026-08-20-phone-authoritative-journal-05-portable-domains.md`
   - Moves preferences, cards/decks, personal plans, mistake practice, ordinary economy, and existing personal outboxes onto domain reducers and the shared coordinator.
   - Retires generic giant snapshot sync only after the inventory proves every portable key has an owner.

Portable domains discovered by the inventory but not named in Plan 5 receive a small domain-specific addendum before their cutover. The inventory gate must name the exact writers/readers first; no bulk monkey-patching of AsyncStorage is allowed.

## Program stop gates

- [ ] No source implementation begins before Plan 1 test list and native-build gate are accepted.
- [ ] Plan 2 cannot write production user segments before SQLCipher device verification passes on iOS and Android.
- [ ] Plan 3 cannot enable shadow mode before Rules, Jarvis, and account-isolation tests pass.
- [ ] Plan 4 cannot enable 1% cutover while any unexplained shadow mismatch exists.
- [ ] Generic snapshot retirement cannot begin before Plan 5 reports zero unowned portable keys and writers.
- [ ] No cohort increase occurs with a lost operation, duplicate result, orphan debit, downgrade, account leak, or visible ordinary sync error.
- [ ] No legacy removal occurs before two stable production releases at 100%.

## Required review points

- [ ] Security review after Plan 1 Task 3 (SQLCipher key lifecycle).
- [ ] Firestore Rules and Jarvis review after Plan 2 Task 4.
- [ ] Migration fixture review after Plan 3 Task 4.
- [ ] Economy Constitution review before Plan 4 cohort rollout.
- [ ] Release/rollback review before 1%, 10%, 50%, and 100% changes.

## Design coverage matrix

| Design requirement | Owning plan |
|---|---|
| SQLCipher/WAL, atomic operation + projection + outbox | Plan 1 Tasks 1–6 |
| Counter/set/register/tombstone/streak/economy reducers | Plan 1 Task 7 |
| 50-op/64-KiB segments and no per-answer callable | Plan 2 Tasks 1–2, Plan 4 Task 2 |
| Durable retry, lifecycle triggers, cursors and checkpoints | Plan 2 Tasks 5–8 |
| Server-confirmed external event isolation | Plan 2 Task 4, Plan 5 Task 5 |
| Full legacy inventory and opening checkpoint | Plan 3 Tasks 1–3 |
| Identity/account switch/delete isolation | Plan 3 Task 4 |
| Shadow mode, one-way mirror and rollout flags | Plan 3 Tasks 5–7 |
| Core XP/streak/lesson/exam authority cutover | Plan 4 Tasks 1–4 |
| Silent ordinary sync UX and local-disk recovery | Plan 4 Task 5 |
| Firebase read/write cost contracts | Plan 4 Tasks 6–7 |
| Stop gates, cohorts and compatibility retirement | Plan 4 Tasks 8–9 |
| Preferences, cards, practice, economy and L2 migration | Plan 5 Tasks 1–5 |
| Giant generic snapshot retirement | Plan 5 Task 6 |

## Program verification command

Each plan defines narrow commands. Before any production cohort change, run the accumulated gate without broad project tests:

```powershell
npx jest --runInBand --runTestsByPath `
  tests/phone_state_native_config_contract.test.ts `
  tests/phone_state_store_transaction.test.ts `
  tests/phone_state_reducer_algebra.test.ts `
  tests/phone_state_account_isolation.test.ts `
  tests/phone_state_segments.test.ts `
  tests/phone_state_sync_coordinator.test.ts `
  tests/phone_state_legacy_inventory.test.ts `
  tests/phone_state_legacy_import.test.ts `
  tests/phone_state_shadow_compare.test.ts `
  tests/phone_state_progress_cutover.test.ts `
  tests/phone_state_cost_contract.test.ts `
  tests/phone_state_ordinary_error_contract.test.ts `
  tests/phone_state_local_durability_recovery.test.ts `
  tests/phone_state_preferences.test.ts `
  tests/phone_state_cards_merge.test.ts `
  tests/phone_state_practice_merge.test.ts `
  tests/phone_state_existing_journal_adapters.test.ts `
  tests/phone_state_generic_sync_retirement.test.ts `
  tests/firestore_rules_security.test.ts `
  tests/economy_constitution_contract.test.ts `
  functions/src/jarvis/jarvis_data_contract_guard.test.ts
```

Expected: all named suites pass; no process-force-exit warning caused by a live sync timer.
