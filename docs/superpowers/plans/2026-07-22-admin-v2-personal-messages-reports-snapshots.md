# Admin V2 Personal Messages, Reports, and Snapshots Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver secure personal Admin V2 messages, persistent first-frame Admin V2 snapshots, and a complete report-centre workflow with one-coin rewards.

**Architecture:** Cloud Functions own every write, audit record and idempotency check. The Admin V2 browser renders cached per-admin read models before quiet refresh. The mobile client consumes one shared private-message record for both bell and next-login modal delivery, with a user-owned acknowledgement only for display state.

**Tech Stack:** Firebase Functions v2, Firestore Admin SDK, static Admin V2 JavaScript, React Native/TypeScript, Jest.

---

### Task 1: Map and lock delivery/reward contracts

**Files:**
- Modify: `functions/src/admin/permissions.ts`
- Modify: `functions/src/admin_app_messages.ts`
- Modify: `functions/src/report_replies.ts`
- Modify: `functions/src/index.ts`
- Test: `functions/src/admin_app_messages.test.ts`
- Test: `functions/src/report_replies.test.ts`

- [ ] Write failing tests for a UID-only personal message, valid delivery modes, idempotency replay, and rejection of unknown/foreign recipient.
- [ ] Write failing tests that reject a coin for every resolution except `confirmed_fixed`, reject amounts other than 0/1, and preserve exactly-once issuance.
- [ ] Add server-only normalized message and reply contracts plus least-privilege permissions.
- [ ] Run the two Functions test files and record the result.

### Task 2: Deliver private messages in the app

**Files:**
- Modify: `app/app_messages.ts`
- Modify: `components/AppMessagesInbox.tsx`
- Create: `components/PersonalAdminMessageModal.tsx`
- Modify: `app/_layout.tsx`
- Test: `tests/app_messages_personal_delivery.test.ts`

- [ ] Write failing tests for recipient filtering, once-only modal selection, and acknowledged messages remaining in the bell.
- [ ] Add typed message fields and account-scoped acknowledgement persistence.
- [ ] Render the modal after identity hydration without replacing the first frame; gate it by focus and app state.
- [ ] Run the new test and the focused notifications tests.

### Task 3: Add Admin V2 personal-message compose flow

**Files:**
- Modify: `admin/v2/scripts/admin-firebase.js`
- Modify: `admin/v2/scripts/admin-core.js`
- Modify: `admin/v2/styles/admin.css`
- Test: `tests/admin_v2_personal_message_contract.test.ts`

- [ ] Write a failing UI contract for the profile action, both delivery choices, reason field and callable invocation.
- [ ] Add the profile composer, explicit preview, confirmation and success/error state; no direct Firestore write.
- [ ] Run the focused Admin V2 contract test.

### Task 4: Persist and hydrate Admin V2 route snapshots

**Files:**
- Create: `admin/v2/scripts/admin-route-snapshots.js`
- Modify: `admin/v2/scripts/admin-core.js`
- Modify: `admin/v2/scripts/admin-router.js`
- Test: `tests/admin_v2_route_snapshots.test.mjs`

- [ ] Write failing unit tests for per-admin isolation, TTL expiry, sign-out clearing and stale-first hydration.
- [ ] Implement bounded IndexedDB/local fallback snapshot storage with route schemas and safe serialization.
- [ ] Hydrate before route loading, persist successful responses, and retain geometry/data during refresh or error.
- [ ] Run snapshot and route-refresh contracts.

### Task 5: Complete the report-centre queue and export

**Files:**
- Modify: `functions/src/admin_reports_center.ts`
- Modify: `functions/src/agent_manager/*` only if an existing supported report task contract requires it
- Modify: `admin/v2/scripts/admin-firebase.js`
- Modify: `admin/v2/scripts/admin-core.js`
- Modify: `admin/v2/styles/admin.css`
- Test: `functions/src/admin_reports_center.test.ts`
- Test: `tests/admin_v2_report_center_contract.test.ts`

- [ ] Write failing tests for full unresolved export, archive projection, required metadata and Office task creation.
- [ ] Add server pagination/export APIs that return all matching unresolved documents in capped chunks and a safe Office task request.
- [ ] Add horizontal report cards, archive navigation, copy/export action and individual/batch Office actions.
- [ ] Port and update the prior LLM instructions to the new export path, replacing all shard guidance with the one-coin rule.
- [ ] Run focused Functions and Admin V2 tests.

### Task 6: Integrate replies, archive and one-coin delivery

**Files:**
- Modify: `functions/src/report_replies.ts`
- Modify: `app/app_messages.ts`
- Modify: `components/AppMessagesInbox.tsx`
- Modify: `admin/v2/scripts/admin-core.js`
- Test: `functions/src/report_replies.test.ts`
- Test: `tests/report_reply_notification_center_contract.test.ts`
- Test: `tests/admin_v2_report_center_contract.test.ts`

- [ ] Write failing tests for response generation, manual send, archived response history and one-coin enforcement.
- [ ] Replace report-reply shard fields and UI labels with coin fields while preserving backwards-compatible zero-value reads where required.
- [ ] Require the server-side `confirmed_fixed` verdict before the transaction records the single coin and archive result.
- [ ] Run focused tests.

### Task 7: Verify, audit and document final state

**Files:**
- Modify: `docs/superpowers/specs/2026-07-22-admin-v2-personal-messages-reports-snapshots-design.md`
- Modify: `docs/superpowers/plans/2026-07-22-admin-v2-personal-messages-reports-snapshots.md`

- [ ] Run syntax checks for changed Admin V2 modules.
- [ ] Run all focused root and Functions Jest tests.
- [ ] Review the final diff against the spec and Admin UI Bible.
- [ ] Record any limitations, test output and deployment status in the final report.
