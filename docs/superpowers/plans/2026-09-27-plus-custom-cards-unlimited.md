# Plus Custom Cards Unlimited Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:test-driven-development and superpowers:verification-before-completion. This plan is executed inline by the assigned sole writer; do not create a worktree, delegate, commit, deploy, or send Telegram messages.

**Goal:** Keep Free creation capped at 50 cards, make Plus-authored/custom cards truly unlimited, and silently enqueue one durable owner Telegram alert per account and study language when the library reaches 1,500 cards without ever turning alert failure into a user save failure.

**Architecture:** Preserve every existing caller by changing the shared Plus comparison value to the non-serialized in-memory sentinel `Number.POSITIVE_INFINITY`; the three Learning V2 consumers therefore become unlimited without subsystem edits. The shared custom-card store observes committed/read counts and hands a privacy-minimal milestone to an account-scoped local outbox. The attempt sends `{ count, language, expectedOwnerUid }`; the UID is captured before card I/O, is never stored, and lets the server reject a delayed A→B-authenticated call before any write. The authenticated callable persists only `{ count, language }` in a deterministic event in the existing server-only `admin_alert_events` collection, whose existing trigger/recovery worker owns Telegram delivery and retries.

**Tech Stack:** TypeScript, React Native AsyncStorage, Firebase callable functions, Firestore Admin SDK transactions, existing admin-alert outbox/Telegram dispatcher, focused `tsx` and Functions Jest tests.

---

### Task 1: Lock the access contract with a failing focused gate

**Files:**
- Create: `app/flashcards/custom_card_access.ts`
- Create: `tests/plus_custom_cards_unlimited_gate.ts`
- Modify: `app/flashcards/custom_cards_store.ts`
- Modify: `app/flashcards_card_editor.tsx`
- Modify: `app/creator_access.ts`

- [ ] Write a focused gate that requires `FREE_CUSTOM_CARD_LIMIT === 50`, permits Plus creation at counts 1,499, 1,500, and 1,501, rejects Free creation at 50, and proves the editor retains only the Free guard.
- [ ] Run `npx tsx tests/plus_custom_cards_unlimited_gate.ts`; expect RED because the shared Plus cap is still 1,500 and the editor still throws `custom_card_limit_reached`.
- [ ] Add a pure shared access policy whose Plus comparison value is `Number.POSITIVE_INFINITY`; re-export it from `custom_cards_store.ts` so existing Learning V2 imports remain compatible and edit no Learning V2 files.
- [ ] Remove only the active Plus guard from the editor, retain the Free-50 guard, and update stale creator-access documentation.
- [ ] Re-run the focused gate; expect PASS.

### Task 2: Add the account/language-scoped fail-open milestone outbox

**Files:**
- Create: `app/flashcards/custom_card_milestone.ts`
- Create: `app/flashcards/custom_card_milestone_outbox.ts`
- Modify: `app/flashcards/custom_cards_store.ts`
- Modify: `app/cloud_sync.ts`
- Extend: `tests/plus_custom_cards_unlimited_gate.ts`

- [ ] Add RED tests for 1,499→1,500 enqueue, 1,500→1,501 dedupe/retry, alert failure not rejecting the saved-card path, and separation by account plus language.
- [ ] Implement a bounded AsyncStorage outbox keyed by stable account and study language. Persist only schema version, account scope, language, milestone, count, and timestamp; never card text, contact data, or bot credentials.
- [ ] Wire observation after the local card commit and after a qualifying library read so accounts already at or above 1,500 are eligible. Queue/flush failures must be caught and must not reject or delay the authoritative card save/read.
- [ ] Add the outbox prefix to `ACCOUNT_LOCAL_KEY_PREFIXES` so account switch, backup, wipe, and residue checks keep it with its owner.
- [ ] Re-run the focused gate; expect PASS.

### Task 3: Reuse the existing durable Telegram owner-alert path

**Files:**
- Create: `functions/src/custom_card_milestone.ts`
- Create: `functions/src/custom_card_milestone.test.ts`
- Modify: `functions/src/admin_alert_catalog.ts`
- Modify: `functions/src/admin_alert_privacy.ts`
- Modify: `functions/src/admin_alert_templates.ts`
- Modify: `functions/src/index.ts`
- Modify: `functions/src/jarvis/jarvis_data_contract_guard.test.ts`

- [ ] Write RED tests requiring authentication, `en|es|fr|de` language validation, count ≥1,500, exact captured-UID binding, deterministic account+language milestone identity, atomic duplicate suppression, and payload sanitization to count+language only.
- [ ] Implement `customCardMilestoneNotify` as an authenticated callable. Reject an `expectedOwnerUid` mismatch before any write, hash the authenticated Firebase UID into the deterministic source id, and atomically create the existing `admin_alert_events` document only when absent. Never send Telegram from the callable or persist the UID binder.
- [ ] Add the typed alert catalog/privacy/template entries and export the callable. Update the Jarvis contract writer inventory because this file becomes another writer to the existing server-only collection; no Rules change is needed because `admin_alert_events/{document=**}` is already deny-only for every client.
- [ ] Run only `functions/src/custom_card_milestone.test.ts` plus the existing focused admin-alert catalog/privacy tests selected by filename; expect PASS. Do not deploy.

### Task 4: Update the approved review prototype and verify final scope

**Files:**
- Modify: `C:/Users/badlo/Documents/Codex/2026-09-26/new-chat-2/outputs/PhraseMan-Liquid-Glass/paywall-review-data.js`
- Modify: `C:/Users/badlo/Documents/Codex/2026-09-26/new-chat-2/outputs/PhraseMan-Liquid-Glass/paywall-review-notes.md`

- [x] Change the Plus own-card row to `Безлимит` and the created-context subtitle to `В Plus — без ограничения числа собственных карточек`.
- [ ] After code verification, update notes to distinguish the approved new contract from deployment state and list the exact callable/Functions deployment requirement.
- [ ] Run fresh focused client and Functions gates, inspect the final diff for unrelated changes, and report RED/GREEN commands, deployment requirement, and residual uncertainty. Do not run broad Jest, full TypeScript, build, emulator, network sends, commit, push, or deploy.

## Self-review

- Spec coverage: Plus unlimited, Free 50, editor/indirect Learning V2 creation, pre-existing ≥1,500 libraries, account/language dedupe, fail-open save, durable server retry, privacy, and deployment honesty are each assigned above.
- No new client-writable Firestore collection is introduced. Existing rules already deny all client access to `admin_alert_events`; the callable uses Admin SDK.
- The local `Infinity` sentinel is comparison-only and is not written to AsyncStorage, Firestore, callable payloads, analytics, or JSON.
- No placeholders, unrelated feature cleanup, payment/training/AI quota changes, release, or rollback steps are included.

## Execution note — 2026-09-27

- Focused client and backend `tsx` gates are GREEN; the backend files also pass a targeted no-emit TypeScript check. Broad Jest/build/emulator gates were intentionally not run under the active process load.
- The local/editor policy and owner-alert pipeline in this plan are implemented but not deployed. The new callable therefore requires a Functions deployment before real owner alerts can occur.
- A follow-up blocker was found during the required persistence audit: `custom_flashcards_v2` is still stored as one string in `users/{stableId}.progress`, while the existing `flashcard_pages` offload handles only saved `flashcards_v1`. Large custom libraries can exceed Firestore's 1 MiB document limit, so end-to-end cloud-preserved “true unlimited” remains incomplete until custom cards receive bounded paged upload/restore and migration coverage.
