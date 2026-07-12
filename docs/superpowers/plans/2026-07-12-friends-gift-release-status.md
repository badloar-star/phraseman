# Friends Gift Release Status Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Integrate the Friends gift modal fix and add an explicit post-commit release-ancestry status.

**Architecture:** Apply a minimal modal state-machine patch on a clean branch from `codex/all-development-integration`. Add a read-only Node status command and connect it to the existing managed hook installer; integrate only reviewed atomic commits.

**Tech Stack:** React Native, TypeScript, Node.js ESM, Git hooks, Jest.

---

### Task 1: Friends gift modal sequencing

**Files:**
- Modify: `app/(tabs)/friends.tsx`
- Modify: `tests/friends_tab_gift_interaction_contract.test.ts`

- [ ] Add a failing contract for response-before-close and close-before-response sequencing.
- [ ] Confirm the focused test fails before the production patch.
- [ ] Add native receipt visibility tracking, pending quest promotion, unified close handling, and modal guard coverage.
- [ ] Run the Friends interaction and owner runtime contracts.
- [ ] Commit only these two files with `fix: prevent friends gift modal touch wedge`.

### Task 2: Release ancestry status hook

**Files:**
- Create: `scripts/release_branch_status.mjs`
- Modify: `scripts/install-git-hooks.mjs`
- Create: `tests/release_branch_status.test.ts`

- [ ] Add failing tests for integrated, pending, missing-branch, and explicit-commit status.
- [ ] Implement a dependency-free read-only ancestry check with `PHRASEMAN_RELEASE_BRANCH` override and canonical default.
- [ ] Add a managed `post-commit` hook that invokes the script without blocking commits.
- [ ] Run hook tests, install hooks, and exercise both integrated and pending output.
- [ ] Commit only hook files with `chore: show release integration status after commits`.

### Task 3: Integrate and verify

**Files:**
- No new files.

- [ ] Run focused tests, staged secret scan, and `git diff --check`.
- [ ] Merge the feature branch into `codex/all-development-integration` from its clean worktree.
- [ ] Re-run focused verification on the final integration commit.
- [ ] Confirm both feature commits are ancestors of `codex/all-development-integration` and the original dirty worktree status is unchanged.
