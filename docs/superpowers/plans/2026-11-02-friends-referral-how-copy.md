# Friends Referral How Copy Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the referral ladder “How it works” sheet accurately explain the distinct coin and Plus eligibility rules, and record the owner's assessment-only exclusion in the V2 grandfather-access plan.

**Architecture:** Keep reward logic unchanged. Extend the existing localized string table and row renderer from four to five explanatory rows, with all numbers supplied by the existing server-derived view; separately revise the read-only V2 contract so only course-exercise evidence qualifies.

**Tech Stack:** React Native, TypeScript, Jest, Markdown.

---

### Task 1: Referral ladder explanation

**Files:**
- Modify: `components/referral_ladder_strings.ts`
- Modify: `components/referral_ladder_how_sheet.tsx`
- Modify: `tests/referral_ladder_2026_10_29.test.tsx`

- [x] **Step 1: Write the failing test**

Assert five rendered rows and the exact Russian contract: first lesson rather than registration; conditional 500 coins for both; monthly cap; two different New Course days plus different-device condition; three eligible friends, 14 days, and one grant per 30 days.

- [x] **Step 2: Run test to verify it fails**

Run: `npx jest --no-coverage --runInBand --no-watchman tests/referral_ladder_2026_10_29.test.tsx`

Expected: FAIL because `how5` is absent and the old `how3`/`how4` overpromise unconditional rewards.

- [x] **Step 3: Write minimal implementation**

Add `how5` to all nine locales, rewrite `how1`–`how4` without internal IDs or server jargon, render five rows, and provide `{ coins, cap, days }` from `ReferralLadderView`. Do not change any backend constants or eligibility functions.

- [x] **Step 4: Run focused tests**

Run: `npx jest --no-coverage --runInBand --no-watchman tests/referral_ladder_2026_10_29.test.tsx tests/friends_ladder_empty_2026_10_29.test.tsx tests/referral_invite_share_program.test.ts`

Expected: all suites PASS and every localized string resolves without placeholders.

### Task 2: Assessment-only grandfather exclusion

**Files:**
- Modify: `C:/Users/badlo/Documents/Codex/2026-11-02/x20/outputs/V2-GRANDFATHER-ACCESS-CONTRACT-TEST-PLAN.md`

- [x] **Step 1: Apply the owner decision**

Change the normative predicate to `eligible = courseExerciseEvidence`. Keep chapter-exam and placement evidence classified as `assessment_only`, but explicitly ineligible. Remove the obsolete uncertainty and update deterministic matrix case 11 and the self-review.

- [x] **Step 2: Verify the document**

Run searches confirming the plan contains the owner decision, contains no inclusive assessment predicate, and still says implementation is not authorized by the plan.

Expected: one consistent exclusion policy with no source, route, schema, or deployment authorization.

### Task 3: Final verification

- [x] **Step 1: Run TypeScript and diff checks**

Run root TypeScript with the repository's 8 GB heap command and `git diff --check` on the three referral files.

Expected: TypeScript exit 0 and no whitespace errors.

- [x] **Step 2: Hand off for read-only review**

Provide the exact files, conditions, and test evidence to the existing clean-candidate reviewer. Do not write to that candidate worktree.
