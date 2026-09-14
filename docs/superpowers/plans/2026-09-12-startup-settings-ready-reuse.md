# Startup settings ready-result reuse — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use executing-plans in this session. No new branch, worktree, delegated session, commit, or release is authorized.

**Goal:** Remove the second native settings read only when a completed successful result is still valid, without joining pending reads or deferring existing startup work.

**Architecture:** One boot-scoped raw-result container, invalidated by a settings mutation revision and exact account-generation checks. Writers announce mutation before memory publication/native dispatch and finish in `finally`; normal screen readers remain independent. This is an operation-count optimization, not proof of a 500 ms launch or timing equivalence.

**Tech Stack:** Existing TypeScript, AsyncStorage and Jest. No added dependency.

## Approved specification

Owner approved the design in this conversation with “ДАВАЙ”. Scope: `user_settings`, two existing startup consumers only. No progress, splash, audio preload, screen preload, navigation, storage schema, network authority, migration algorithm or UI changes.

- Store at most one successful nonempty JSON settings object as its original string. Do not retain parsed mutable objects, failures, missing data, arrays or JSON primitives.
- `peek()` returns a ready valid string synchronously or `null`; never a pending promise.
- `beginRead()` captures mutation revision, absence of active writes and account validity. Its completion callback may remember data only if all remain valid. Parsing/normalization stay in the existing settings store.
- A mutation increments the revision before dispatch, tracks overlapping writes, and invalidates again on settlement, including failure. A scope created during a write cannot seed/reuse that read.
- Exact account-generation validity is injected by the root; the helper imports no auth, native or React module.
- Close on hydration settlement, effect disposal or bootstrap replacement. The 350 ms race is not hydration completion.
- Mutation coverage: direct settings saves, both cloud restore batch branches, both emergency-backup batch branches, account wipe. Account clear must also be fenced; if its existing generation boundary cannot prove this, do not enable reuse until covered.
- Fail admission for an uncovered writer or a regression; do not weaken existing guards.

## Task 1 — Test the isolated policy before integration

**Files:** create `lib/startup_settings_read_scope.ts`, `tests/startup_settings_read_scope.test.ts`.

- [x] Write failing behavior tests: completed result reused; unfinished reads independent; failure followed by retry; mutation before/during read; overlapping mutations; failed mutation; A→B→A generation; closed/replaced scope. Malformed/missing values are tested at the real store boundary in Task 2.
- [x] Run RED using the existing isolated Jest transform, one worker, shared semaphore.
- [x] Implement the minimal policy API:

```ts
interface SettingsBootReadScope {
  peek(): string | null;
  beginRead(): (raw: string) => void;
  close(): void;
}
// createSettingsBootReadScope(isAccountCurrent: () => boolean)
// beginSettingsStorageMutation(): () => void
```

- [x] Run GREEN. No queues, timers, locks, storage access or account imports added to this helper.

## Task 2 — Writer coverage and store behavior

**Files:** `app/user_settings_store.ts`, `app/cloud_sync.ts`, `app/account_switch_backup_restore.ts`; focused new settings integration tests. Auth source only if the existing clear boundary is insufficient.

- [x] Add tests of actual store hydration, normalization, local memory publication before native settlement, unchanged independent `loadSettings`, and write failure/retry.
- [x] Add source/call-boundary guards for restored settings and wipe; review generic batch writers, not only literal-key matches.
- [x] Run RED, then integrate optional scope and mutation notifications. Keep native operations and errors intact:

```ts
const finishMutation = beginSettingsStorageMutation();
try {
  // Existing memory publication and existing native write, unchanged.
} finally {
  finishMutation();
}
```

- [x] Run focused behavioral and existing restore/account guards. All observed settings write paths covered, including both native clear sites; these checks passed. An uncovered writer would block Task 3.

## Task 3 — Boot-only integration and admission

**Files:** `app/_layout.tsx`, `app/app_snapshot_bootstrap.ts`, focused bootstrap contracts.

- [x] Add a failing integration test for the two startup consumers and unchanged independent reads.
- [x] Pass the optional scope at existing call sites; preserve ordering, readiness conditions and 350 ms race. Close the captured scope after full hydration settles, not after its race.
- [x] Check changed TypeScript files and run the narrow settings/bootstrap/account gates with the shared semaphore. Baseline failures recorded separately; this is not an all-green acceptance claim.
- [x] Review this turn's diff against pre-edit snapshots; preserve all unrelated dirty changes. No release/build/device timing claim.
- [x] Record exact tests, counts, scope and remaining uncertainty in `docs/reports/STARTUP_SETTINGS_READY_REUSE_2026-09-12.md`.
- [ ] Unconditional final/release admission: not granted. Wider checks have existing failures and a broken test fixture; no native release timing or independent review was performed.

## Verification commands

Shared lock owner: `codex-startup-settings-20260912`. Use Git Bash `-lc`, acquire `.claude/semaphore/slot.sh`, and release with an EXIT trap.

```sh
node --max-old-space-size=768 node_modules/jest/bin/jest.js --config .codex-tmp/startup-proof/jest-home-progress.config.cjs --runInBand --runTestsByPath tests/startup_settings_read_scope.test.ts
```

Use the same command with explicit additional test paths for each focused gate. Do not run whole-repository Jest or typecheck. Tests are read-only and retain the existing source-write guard.
