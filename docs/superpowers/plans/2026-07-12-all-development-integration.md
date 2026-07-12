# All Development Branches Integration Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Assemble all safe committed development work into one local integration branch for a later release without disturbing source branches or uncommitted user work.

**Architecture:** Start from clean local `master` in an isolated worktree. Audit ancestry and patch equivalence, merge related branches in dependency groups with `--no-ff`, and verify each group before continuing. Exclude special-purpose refs and pause on destructive functionality or functionality that exists only as uncommitted work.

**Tech Stack:** Git worktrees and merge history, React Native/TypeScript, Firebase Functions, Jest contract tests.

---

### Task 1: Establish the integration baseline

**Files:**
- Create: `docs/superpowers/plans/2026-07-12-all-development-integration.md`

- [ ] Confirm `codex/all-development-integration` starts at local `master` commit `7cf1d69d5`.
- [ ] Confirm the integration worktree is clean.
- [ ] Commit this integration plan as the first branch-only checkpoint.

### Task 2: Audit branch dependencies

**Files:**
- No product files changed.

- [ ] Compare merge bases, unique patches, merge commits, and changed paths for every unmerged branch.
- [ ] Exclude `gh-pages`, backup/stash refs, already merged branches, and uncommitted worktree state.
- [ ] Order branches by ancestry and functional dependency rather than branch age.

### Task 3: Merge administrative branches

**Files:**
- Merge-owned paths under `admin/`, `functions/src/admin*`, `scripts/admin*`, and their focused tests.

- [ ] Merge the most foundational admin branch first.
- [ ] Merge newer admin integration and digest branches without whole-branch `ours` or `theirs` strategies.
- [ ] Run Admin v2 capability, navigation, language, and focused backend contracts.
- [ ] Stop if a conflict changes permissions, destructive actions, or publication behavior without a clear contract.

### Task 4: Merge identity and access branches

**Files:**
- Merge-owned auth/account files, Firestore rules, callables, and required tests.

- [ ] Merge the consolidated auth integration branch before any remaining auth delta.
- [ ] Preserve the account deletion and identity invariants from `AGENTS.md`.
- [ ] Run the five mandatory auth/account tests.

### Task 5: Merge premium, referral, learning, and progression branches

**Files:**
- Merge-owned premium/referral, social-learning, speaking, weekly-review, XP, and streak paths.

- [ ] Merge each independent branch with a checkpoint commit.
- [ ] Resolve overlaps by preserving both user-visible capabilities.
- [ ] Run focused tests after each functional group.
- [ ] Record dirty worktree changes as excluded; do not commit them implicitly.

### Task 6: Gate destructive branches

**Files:**
- Potential constellation screens, services, tests, routes, and specs.

- [ ] Audit `codex/remove-constellations` and list every removed capability.
- [ ] Do not merge it without explicit user authorization to remove those exact capabilities.

### Task 7: Run the release integration gate

**Files:**
- No additional product changes unless a verified integration defect requires a focused fix.

- [ ] Confirm no conflict markers, secrets, accidental generated output, or unexpected binaries.
- [ ] Run the focused aggregate suite for every merged domain.
- [ ] Confirm a clean worktree and inspect the complete diff from the starting `master`.
- [ ] Obtain final advisor approval before reporting the branch ready.
- [ ] Do not push or move `master`; preserve the integration branch for later release work.
