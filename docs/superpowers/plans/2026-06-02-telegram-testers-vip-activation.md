# Telegram Testers VIP Activation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add safe admin activation for Telegram tester records by granting the chosen month/year period through existing VIP access fields.

**Architecture:** The Telegram bot keeps creating intake records in `telegram_premium_orders`. The `admin/testers.html` page lets an admin find the matching `users/{uid}` document by nickname, activate the selected period by writing only `progress.vip_*`, and mark the intake record as activated for admin tracking.

**Tech Stack:** Firebase Hosting, Firestore Web SDK, Firestore security rules, Jest contract tests.

---

### Task 1: Contract Test

**Files:**
- Modify: `tests/telegram_testers_admin_contract.test.ts`

- [x] Add assertions that the testers page contains `activateTesterPeriod`, `buildTesterVipUpdate`, `openFullUserCard`, and `testerActivationStatus`.
- [x] Assert activation writes `progress.vip_active`, `progress.vip_plan`, `progress.vip_from`, `progress.vip_until`, `progress.vip_admin_override`, and `progress.vip_admin_grant_at`.
- [x] Assert activation does not write `progress.premium_plan`, `progress.premium_expiry`, or `premium_rc_*`.
- [x] Assert Firestore rules allow admin update for `telegram_premium_orders` while blocking create/delete.
- [x] Run `npx jest --runTestsByPath tests\telegram_testers_admin_contract.test.ts --no-cache` and confirm the test fails before implementation.

### Task 2: Admin Page Activation

**Files:**
- Modify: `admin/testers.html`

- [x] Import `updateDoc` from the Firestore Web SDK.
- [x] Change nick clicks to open a tester detail panel instead of immediately redirecting.
- [x] Keep a separate `openFullUserCard` button that redirects to `admin/index.html?openUser=<uid>`.
- [x] Add `activationMonthsForPlan(plan)` with `yearly -> 12`, otherwise `1`.
- [x] Add `buildTesterVipUpdate(plan, progress)` that extends from existing active `vip_until` when present.
- [x] Add `activateTesterPeriod(orderId, uid, plan)` to update the user and mark the tester record activated.
- [x] Keep visible page copy free of payment wording.

### Task 3: Firestore Rules

**Files:**
- Modify: `firestore.rules`

- [x] Keep `telegram_premium_orders` readable only by admins.
- [x] Allow `update` only for admins so the admin page can mark activation status.
- [x] Keep `create` and `delete` blocked for clients.

### Task 4: Verification And Deployment

**Files:**
- Verify: `admin/testers.html`
- Verify: `firestore.rules`
- Verify: `tests/telegram_testers_admin_contract.test.ts`

- [x] Run targeted tester contract.
- [x] Run related Premium/VIP and Telegram bot tests.
- [x] Deploy hosting and Firestore rules.
- [x] Re-check live hosting URL if deployment completes.
