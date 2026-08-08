# Level Exam Audit Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make the new level exam flow correct end-to-end before release.

**Architecture:** Keep the V3 exam blueprint and attempt format, align the server reward contract with V3, persist wrong speed-match attempts as scored failures, and make completion side effects idempotent by finish token. Preserve legacy routes and unrelated worktree changes.

**Tech Stack:** React Native/TypeScript, Jest, Firebase Functions progress events, AsyncStorage.

---

### Task 1: Align exam spin contract

**Files:** `functions/src/progress_events.ts`, `functions/src/progress_events.test.ts`

- [ ] Add a failing test proving a V3 passed English 30-question exam qualifies for first-pass spin.
- [ ] Change the server validator to accept the current V3 blueprint contract and reject unsupported versions.
- [ ] Run progress-event tests.

### Task 2: Make Speed Match score mistakes

**Files:** `components/level-exam/SpeedMatchQuestion.tsx`, `components/level-exam/LevelExamV2.tsx`, `tests/level_exam_scoring.test.ts`

- [ ] Add a failing scoring test showing an incorrect speed-match pair is recorded and scores zero for that unit.
- [ ] Preserve a failed unit in the answer map while allowing the user to continue the board without granting credit.
- [ ] Keep the board completion state deterministic and test scoring.

### Task 3: Recover legacy active attempts safely

**Files:** `app/level_exam_attempts.ts`, `tests/level_exam_attempt_state.test.ts`

- [ ] Add a failing test showing a V2 active snapshot is quarantined without destructive deletion and can surface a recoverable state.
- [ ] Store quarantined snapshots under a versioned recovery key and return no active attempt.
- [ ] Verify old invalid/corrupt snapshots remain fail-closed while users receive recoverable data.

### Task 4: Make completion side effects idempotent

**Files:** `app/medal_utils.ts`, `components/level-exam/LevelExamV2.tsx`, `tests/level_exam_attempts.test.ts`, `tests/level_exam_scoring.test.ts`

- [ ] Add a failing test for repeated completion with the same finish token.
- [ ] Gate exam progress/medal writes with the existing completion marker or add a finish-token marker dedicated to progress.
- [ ] Verify repeated finish does not increment pass count, duplicate unlocks, or duplicate reward state.

### Task 5: Verification

- [ ] Run all exam suites and relevant Functions suites.
- [ ] Run TypeScript check and report unrelated failures separately.
- [ ] Run `git diff --check` and perform a final source audit.
