# In-app Support Reports and Reward Bundle — Implementation Plan

> **Execution:** follow `executing-plans` and strict TDD. Keep one writer, preserve unrelated dirty-tree changes, and run only focused gates under the repository semaphore.

**Goal:** Replace the Settings mailto support flow with an in-app report form, let admins draft/edit/send a severity-based three-currency reward, and deliver replies through a per-item unread notification plus a dismissible home banner and premium claim celebration.

**Architecture:** Reuse `error_reports` for intake and the existing `report_reply` message/notification path. Add a versioned `rewardBundle` contract (`spins`, `runes`, `pearls`, `severity`) while parsing legacy `coins` replies. Server send and claim remain idempotent; client claim uses a durable bundle intent and deterministic per-lane credit IDs, resumes interrupted claims, and only celebrates after every lane succeeds.

**Reward tiers:** `minor = 1 / 300 / 1`, `serious = 2 / 600 / 5`, `critical = 3 / 1000 / 10` (spins / runes / pearls). A non-`confirmed_fixed` resolution has a zero bundle.

---

### Task 1: Lock the reward-bundle contract with server tests

**Files:**
- Modify: `functions/src/report_replies.test.ts` (or create focused test if absent)
- Modify: `functions/src/report_replies.ts`
- Modify: `functions/src/admin_reports_center.test.ts`
- Modify: `functions/src/admin_reports_center.ts`

1. Add failing table tests for the three exact tiers, zero reward for non-fixed outcomes, rejection of mixed/custom quantities, and legacy `coins: 1` normalization.
2. Add `REPORT_REWARD_TIERS`, `ReportRewardSeverity`, `ReportRewardBundle`, and `normalizeReportReplyReward()` returning `{ resolution, rewardBundle }`.
3. Require `confirmed_fixed` and a server-fixed report before any non-zero bundle can be sent.
4. Project `rewardBundle` in report-center rows and update the export instructions so the LLM proposes one exact tier while the administrator remains the final sender.
5. Run focused function tests and confirm RED → GREEN.

### Task 2: Persist and claim one immutable server bundle

**Files:**
- Modify: `functions/src/report_replies.ts`
- Modify: `functions/src/user_notifications.ts`
- Modify/create focused tests under `functions/src/*report*test.ts`
- Modify: `tests/economy_constitution_contract.test.ts`

1. Add failing tests for notification/message payloads containing the versioned bundle, repeat-send rejection, repeat-claim replay, and claim receipt equality.
2. On send, store the same frozen bundle in `user_messages`, the notification payload, the report archive, and audit log.
3. On claim, append one immutable external `report_reward_bundle` event keyed by the message ID and return the same receipt on retry. Do not write `users/{uid}.shards` or any balance snapshot.
4. Preserve legacy one-pearl claims without converting historical documents in place.
5. Run focused server and economy-constitution tests.

### Task 3: Add the in-app support form

**Files:**
- Modify: `app/error_report.ts`
- Create: `app/support_report.tsx`
- Modify: `app/(tabs)/settings.tsx`
- Create/modify focused tests under `tests/*support*test.ts` and `tests/client_reports_contract.test.ts`

1. Add failing tests proving support submission uses `screen: settings_support`, includes automatic account/app/device context, does not request nickname, and does not grant the old submit-time XP.
2. Add an opt-out for submission XP to `submitErrorReport`, defaulting to the existing behavior for all old report buttons.
3. Build a keyboard-safe screen/modal with heading, concise explanatory copy, multiline input, validation, pending/error/success states, close/back controls, and a single submit action.
4. Replace only the Settings support row’s mailto modal with navigation to the form. Remove the two explicitly rejected texts about automatic account/version data and duplicate submissions.
5. Verify accessibility labels, 44px targets, keyboard dismissal, retry behavior, and double-tap protection.

### Task 4: Add deterministic local credits for all three reward lanes

**Files:**
- Modify: `app/level_spin_credit_ids.ts`
- Modify: `app/local_level_spins.ts`
- Modify: `app/level_spin_star_grants.ts`
- Modify: `app/phone_state_economy_bridge.ts`
- Modify: `modules/phone-state/domains/economy.ts`
- Modify: `app/shards_system.ts` only if a reusable external-credit adapter is missing
- Add focused tests for each changed domain

1. Write failing tests for report-specific deterministic credit IDs and idempotent retry for spins, runes, and pearls.
2. Add report-reward credit IDs derived from `messageId`; reject malformed or negative quantities.
3. Add exact rune and spin credit adapters that accept the account transition lock lease and do not depend on server balance state.
4. Reuse the existing confirmed external pearl event path.
5. Verify duplicate calls cannot credit a lane twice.

### Task 5: Build the durable client bundle-claim coordinator

**Files:**
- Modify: `app/app_messages.ts`
- Modify: `app/user_notifications.ts`
- Add/modify: `tests/app_messages_report_reward_bundle.test.ts`

1. Add failing tests for new-bundle parsing, legacy parsing, prepared claim persistence, failure after each lane, resume, duplicate claim, and no celebration before full completion.
2. Store one account-scoped pending intent containing message ID, bundle, receipt and completed lanes.
3. Call the server claim once idempotently, credit each local lane with deterministic IDs under the account transition lock, persist progress after every lane, and mark committed only when all three are complete.
4. Resume pending claims on account startup and return a typed `claimed | already_claimed | pending` result.
5. Keep legacy one-pearl replies claimable.

### Task 6: Fix per-notification unread semantics and bell motion

**Files:**
- Modify: `components/NotificationCenterButton.tsx`
- Modify: `app/user_notifications.ts`
- Modify: `tests/report_reply_notification_center_contract.test.ts`

1. Add failing tests proving opening the list does not mark all rows read and opening one row marks only that notification read.
2. Move `markUserNotificationsRead` from panel-open to exact row-open.
3. Keep report replies unread until their own modal opens; refresh the unread count after the exact update.
4. Add restrained repeating bell attention while unread exists, stop it when count reaches zero/unmounts, and provide a reduced-motion/static-dot path.
5. Ensure old notification types preserve navigation behavior.

### Task 7: Add the home reply banner and direct modal handoff

**Files:**
- Create: `components/ReportReplyHomeBanner.tsx`
- Modify: `app/(tabs)/home.tsx`
- Modify: `app/user_notifications.ts`
- Add: `tests/report_reply_home_banner_contract.test.ts`

1. Add failing tests for choosing the latest unread report reply, permanent per-notification dismissal, tap-to-open, and X-dismiss without marking read.
2. Render the banner directly under the last-lesson card, with exact copy `Команда ответила на ваше обращение` (localized), accessible button semantics, and a separate close target.
3. On banner tap, hide it immediately, mark/open only the corresponding notification, and invoke the same reply modal used by the bell.
4. Persist manual/tap dismissal by notification ID so the banner does not reappear, while preserving the bell entry after X-dismiss.

### Task 8: Build the reply modal and premium finite celebration

**Files:**
- Create: `components/ReportReplyRewardModal.tsx`
- Modify: `components/NotificationCenterButton.tsx`
- Modify: `components/ReportReplyHomeBanner.tsx`
- Add focused component/contract tests

1. Add failing tests for admin answer text, exact three reward amounts, CTA text exactly `Получить`, claimed title exactly `Награда получена`, and absence of `Вас ждёт приятный бонус` / `уже на счету`.
2. Centralize the modal so bell and home banner open the identical state machine.
3. Implement finite choreography: spring gift reveal, bounded shine/particles, sequential reward rows, claim action, then success state. Keep lime surfaces on dark foreground.
4. Disable claim while pending, show recoverable error, and never play success until the durable coordinator reports committed.
5. Add reduced-motion behavior and screen-reader announcements.

### Task 9: Upgrade the live Reports admin UI and LLM instructions

**Files:**
- Read fully before editing: `docs/design/ADMIN_UI_BIBLE.md`
- Modify only: `admin/v2/legacy.html`
- Modify: `tests/admin_report_reply_preview_contract.test.ts`
- Modify/add focused admin surface tests

1. Add failing contract tests for severity controls, exact tier values, editable draft, manual-send-only behavior, and the new callable payload.
2. Update report reply modal controls to choose `minor | serious | critical | none`; fill exact locked tier quantities while allowing the administrator to change the tier before send.
3. Update prepared-reply parsing to accept `rewardBundle` and preserve old `{shards}` entries.
4. Update the visible copy/export prompt and AI draft prompt: propose a tier only for confirmed+fixed, never promise concrete reward contents in the user-facing reply, and never auto-send.
5. Keep the live admin surface simple, accessible, icon-supported and tooltip-rich; do not touch frozen admin files or enable App Check.

### Task 10: Update Firestore/Jarvis contracts

**Files:**
- Inspect/modify as applicable: `firestore.rules`
- Inspect/modify: `functions/src/jarvis/*_firestore_fetcher.ts`
- Modify: `functions/src/jarvis/jarvis_data_contract_guard.test.ts`
- Modify focused rules tests if the existing notification update rule needs field protection

1. Add failing contract assertions for every new collection/field read by Jarvis and for safe client read-state updates.
2. Update Jarvis report projections to read `rewardBundle` without silently returning legacy-only zeros.
3. Ensure Rules allow a user to mark only their notification read, not alter reply/reward fields; server-only collections/events remain server-only.
4. Run focused Jarvis and Rules tests.

### Task 11: End-to-end focused verification

**Files:** all above, plus existing focused tests.

1. Acquire the shared heavy-process semaphore using the repo script from Git Bash.
2. Run only focused Jest/function/type gates for report replies, notification center, support form, economy bundle, admin surface, Rules, and Jarvis. Save bulky logs outside the conversation.
3. Run formatting/lint/type checks limited to changed files where available.
4. Inspect the local app at `http://localhost:54731/`: submit form, admin draft/edit/send path (with mocks/local backend only), home banner tap/X, bell per-item unread, reward modal, claim, balances, retry.
5. Run `verification-before-completion`; report exact commands, pass/fail evidence, and any environment-only limitation.

