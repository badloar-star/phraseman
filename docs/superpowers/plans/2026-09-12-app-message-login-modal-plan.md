# Общие уведомления: модал при входе Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Показывать новые общие Inbox-уведомления один раз при входе в приложении через анимированный `UpdateModal`, сохраняя их в колокольчике до отдельного dismiss.

**Architecture:** Cloud Function помечает новые Inbox-сообщения `showOnNextLoginModal: true`. Клиент хранит отдельный account-scoped acknowledgement в `app_message_states`, не смешивая его с `dismissedAtMs`; root layout показывает очередь неподтверждённых сообщений через тонкую обёртку над `UpdateModal`.

**Tech Stack:** React Native, Expo Router, AsyncStorage, Firebase Firestore, Firebase callable functions, Jest contract tests.

---

### Task 1: Add the durable global modal acknowledgement contract

**Files:**
- Modify: `app/app_messages.ts`
- Test: `tests/app_messages_visibility_behavior.test.ts`

- [ ] **Step 1: Write tests for account isolation and modal selection.**

  Add coverage for a new global Inbox message with `showOnNextLoginModal: true`: it is selected before acknowledgement, remains in the snapshot after acknowledgement, becomes unselectable after applying the pending acknowledgement, and an acknowledgement stored for account A is invisible to account B.

- [ ] **Step 2: Run the focused test and verify the new assertions fail.**

  Run `npm test -- --runInBand tests/app_messages_visibility_behavior.test.ts`.

- [ ] **Step 3: Implement the minimal client contract.**

  Add typed `showOnNextLoginModal` and `appMessageModalAcknowledgedAtMs` fields, an account-scoped outbox parallel to the existing personal-modal outbox, merge/apply/flush helpers, `pickNextLoginAppMessage`, and `acknowledgeAppMessageModal`. Apply pending acknowledgements in cached and realtime snapshots, while leaving `dismissAppMessage` unchanged.

- [ ] **Step 4: Run the focused test and verify it passes.**

  Run `npm test -- --runInBand tests/app_messages_visibility_behavior.test.ts` and confirm zero failures.

### Task 2: Let admin-created Inbox messages opt into the first-login modal automatically

**Files:**
- Modify: `functions/src/admin_app_messages.ts`
- Modify: `admin/v2/legacy.html`
- Test: `functions/src/admin_app_messages.test.ts`

- [ ] **Step 1: Add normalizer tests.**

  Assert a live Inbox message has `showOnNextLoginModal: true`, a settings message has it false, and a draft Inbox message keeps it true for later publication.

- [ ] **Step 2: Run the focused function test and verify failure.**

  Run `npm test -- --runInBand functions/src/admin_app_messages.test.ts`.

- [ ] **Step 3: Add the field server-side and explain it in the live admin surface.**

  Set the field in `normalizeAppMessageCreateInput`; include a short form hint and history chip so the admin can see that Inbox sends open once on next login and remain in the bell. Do not change callable names or the frozen admin copies.

- [ ] **Step 4: Run focused function and admin contract tests.**

  Run `npm test -- --runInBand functions/src/admin_app_messages.test.ts tests/admin_single_surface_contract.test.ts tests/admin_inline_script_syntax.test.ts`.

### Task 3: Reuse the animated UpdateModal visual for team messages

**Files:**
- Modify: `components/UpdateModal.tsx`
- Create: `components/AppMessageAnnouncementModal.tsx`
- Test: `tests/app_message_login_modal_contract.test.ts`

- [ ] **Step 1: Add source contract tests.**

  Verify the wrapper reads localized app-message title/body, renders `UpdateModal`, uses a localized acknowledgement CTA, and has no dismiss call.

- [ ] **Step 2: Run the contract test and verify failure.**

  Run `npm test -- --runInBand tests/app_message_login_modal_contract.test.ts`.

- [ ] **Step 3: Extend UpdateModal with custom title, CTA, and primary action slots.**

  Preserve existing update behavior by default. When the announcement wrapper supplies a primary action and no store URL, keep the same frame/background/animation and render one acknowledgement button without a secondary “later” action.

- [ ] **Step 4: Run the contract test and a component-focused existing modal test.**

  Run `npm test -- --runInBand tests/app_message_login_modal_contract.test.ts tests/manual_update_modal_persistence.test.ts`.

### Task 4: Queue global announcement modals at app entry

**Files:**
- Modify: `app/_layout.tsx`
- Test: `tests/app_message_login_modal_contract.test.ts`

- [ ] **Step 1: Add root-layout contract assertions.**

  Assert the layout refreshes the app-message snapshot at account entry, selects global messages, registers a dedicated overlay key, renders the announcement modal, and acknowledges rather than dismisses it.

- [ ] **Step 2: Implement one-at-a-time queueing.**

  Keep the existing personal flow intact. Add account-generation-safe global modal queue state, select audience-eligible messages in priority/date order, and remove only the acknowledged message from the queue so later new messages can follow.

- [ ] **Step 3: Run all focused contracts.**

  Run `npm test -- --runInBand tests/app_message_login_modal_contract.test.ts tests/app_messages_visibility_behavior.test.ts tests/app_messages_read_persistence_ui_contract.test.ts`.

### Task 5: Verification before handoff

**Files:**
- Modify: none

- [ ] **Step 1: Check changed-file scope.**

  Run `git diff --check` and inspect only the feature paths; confirm unrelated dirty files remain untouched.

- [ ] **Step 2: Run the narrow TypeScript/test gate with the repository semaphore.**

  Acquire a slot with `bash .claude/semaphore/slot.sh acquire "app message login modal focused verification"`, run the smallest relevant Jest/TypeScript command, then release it with `bash .claude/semaphore/slot.sh release`.

- [ ] **Step 3: Re-read the acceptance criteria.**

  Confirm: new Inbox send → one modal; acknowledgement → read state only; bell row remains; dismiss still removes it; settings/personal/legacy messages preserve prior behavior; offline acknowledgement stays account-scoped.
