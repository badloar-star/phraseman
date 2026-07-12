# Report Replies Notifications-Only Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove new and cached report replies from the Messages inbox while preserving their notification-center delivery and reward ledger.

**Architecture:** Keep the existing transactional dual-write and reward claim source unchanged. Add one presentation-boundary sanitizer in `app/app_messages.ts`, use it for merged snapshots and cached snapshots, and prove the behavior with focused tests.

**Tech Stack:** TypeScript, React Native, AsyncStorage, Jest.

---

### Task 1: Exclude report replies from Messages snapshots

**Files:**
- Modify: `tests/report_reply_messages.test.ts`
- Modify: `app/app_messages.ts`

- [ ] **Step 1: Write the failing tests**

Change the merge assertion to require zero visible messages and zero unread count for `kind: report_reply`. Add a sanitizer assertion with a mixed snapshot so the normal message remains visible and the report reply is removed.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest tests/report_reply_messages.test.ts --runInBand`
Expected: FAIL because the current merge returns the report reply.

- [ ] **Step 3: Write minimal implementation**

Export `sanitizeAppMessagesInboxSnapshot(snapshot)`, filter `message.kind !== 'report_reply'`, and recompute `unreadCount`. Apply it to merged snapshots and cached snapshots before pending-claim processing.

- [ ] **Step 4: Run focused verification**

Run: `npx jest tests/report_reply_messages.test.ts tests/report_reply_notification_center_contract.test.ts tests/user_notifications_account_cache.test.ts --runInBand`
Expected: all suites pass.

- [ ] **Step 5: Run safety contracts**

Run: `npx jest tests/shards_system.test.ts tests/firestore_rules_security.test.ts --runInBand`
Expected: all suites pass; server reward and Firestore protections remain unchanged.

- [ ] **Step 6: Commit and merge**

Stage only the plan, test, and application file; commit on the current branch; merge the commit into `codex/all-development-integration` without including unrelated working-tree changes.
