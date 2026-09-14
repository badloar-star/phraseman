# Telegram Owner Alerts Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver the 47 owner-selected application events to one Telegram bot with safe payloads, configurable instant/digest modes, durable retries, and a mandatory new-user alert.

**Architecture:** Producers emit immutable, idempotently keyed `admin_alert_events` documents. A single dispatcher applies the shared compile-time catalog and privacy formatter before Telegram delivery, while scheduled recovery and digest builders handle retries and noisy sources. The existing admin alert tab is upgraded in `admin/v2/legacy.html`; direct legacy sends are migrated without enabling admin App Check.

**Tech Stack:** TypeScript, Firebase Functions v2, Firestore, Telegram Bot API, Jest/ts-jest, Firestore Rules, single-file HTML admin UI.

---

## Repository constraints

- Work in the current checkout: project policy forbids a branch or worktree without an explicit owner request.
- Preserve concurrent changes already present in `admin/v2/legacy.html`, `firestore.rules`, `functions/src/admin_alerts.ts`, `functions/src/feedback_entries.ts`, and `functions/src/index.ts`.
- Never enable App Check for admin functions.
- Before each Jest/build command acquire the shared semaphore with Git Bash and release it in `finally`/after the command.
- Do not bypass failing hooks or guards. Commit only owned paths; if the unrelated Learning V2 hook remains red, leave changes uncommitted and report it.

## Planned file structure

New focused modules:

- `functions/src/admin_alert_catalog.ts` — the single catalog of 47 selected types plus legacy aliases.
- `functions/src/admin_alert_privacy.ts` — typed safe payloads, masking, escaping, and Telegram message rendering.
- `functions/src/admin_alert_outbox.ts` — stable keys and idempotent event creation.
- `functions/src/admin_alert_dispatcher.ts` — delivery state machine, Telegram response classification, retry and recovery.
- `functions/src/admin_alert_sources_people.ts` — user/referral/ban producers.
- `functions/src/admin_alert_sources_learning.ts` — selected feedback producers.
- `functions/src/admin_alert_sources_revenue.ts` — RevenueCat/Web/Stars/UGC/promo/gift producers.
- `functions/src/admin_alert_sources_reports.ts` — selected report/inbox/community/error producers.
- `functions/src/admin_alert_sources_ops.ts` — cron, audit, push, App Message, compliance and Jarvis producers.
- `functions/src/admin_alert_digests.ts` — hourly/daily digest window documents.
- matching `*.test.ts` files beside each module.

Existing integration files:

- `functions/src/admin_config_controls.ts` — validate the shared catalog and preserve config revisions/audit.
- `functions/src/admin_alerts.ts` — migrate legacy sends onto the outbox while retaining exported function names.
- `functions/src/users_write_router.ts` — add the new-user producer without a second users trigger.
- `functions/src/referral.ts`, `functions/src/revenuecat_shards.ts`, `functions/src/web_checkout.ts`, `functions/src/telegram_premium_bot.ts` — emit stable source events at authoritative commit points where collection triggers cannot express the contract safely.
- `functions/src/index.ts` — export dispatcher, recovery, source triggers and digests.
- `firestore.rules` — server-only outbox/receipt rules and callable-only alert config writes.
- `functions/src/jarvis/jarvis_data_contract_guard.test.ts` and applicable Jarvis fetchers — keep the data contract honest if Jarvis reads the new collections.
- `admin/v2/legacy.html` — six-category 47-event settings UI and queue diagnostics.
- focused admin DOM/contract tests under `tests/`.

### Task 1: Shared event catalog and config contract

**Files:**
- Create: `functions/src/admin_alert_catalog.ts`
- Create: `functions/src/admin_alert_catalog.test.ts`
- Modify: `functions/src/admin_config_controls.ts`
- Test: `functions/src/admin_alert_catalog.test.ts`

- [x] **Step 1: Write the failing catalog tests**

Define assertions that `ADMIN_ALERT_CATALOG` has 47 unique IDs, `newUser` is `required: true`, `maxRating` and `dailyPhraseSaved` are absent, every item has `instant` or `digest`, and every UI-config key is accepted by `normalizeAdminAlertsConfigInput()`.

```ts
expect(ADMIN_ALERT_CATALOG).toHaveLength(47);
expect(new Set(ADMIN_ALERT_CATALOG.map((item) => item.id)).size).toBe(47);
expect(adminAlertDefinition('newUser')).toMatchObject({ required: true, mode: 'instant' });
expect(ADMIN_ALERT_IDS).not.toContain('maxRating');
expect(ADMIN_ALERT_IDS).not.toContain('dailyPhraseSaved');
```

- [x] **Step 2: Run RED**

Run from `functions/` with the shared semaphore:

```powershell
& 'C:\Program Files\Git\bin\bash.exe' ../.claude/semaphore/slot.sh acquire 'jest telegram alert catalog'
npx jest --runInBand src/admin_alert_catalog.test.ts
& 'C:\Program Files\Git\bin\bash.exe' ../.claude/semaphore/slot.sh release
```

Expected: FAIL because `admin_alert_catalog.ts` does not exist.

- [x] **Step 3: Implement the immutable catalog**

Use a literal `as const satisfies readonly AdminAlertDefinition[]` catalog. Each definition contains `id`, `category`, `mode`, `required`, `defaultEnabled`, and Russian admin label. Export `ADMIN_ALERT_IDS`, `AdminAlertType`, `adminAlertDefinition()` and `isAdminAlertType()`.

- [x] **Step 4: Replace the five-item config whitelist**

Import `ADMIN_ALERT_IDS` in `admin_config_controls.ts`. Normalize only known keys, force `newUser: true`, preserve explicit false for optional types, and set `schemaVersion: 2`.

- [x] **Step 5: Run GREEN and the existing config tests**

Run the focused catalog and `admin_config_controls` tests. Expected: PASS and no `unknown alert type` for any of the 47 keys.

### Task 2: Privacy formatter

**Files:**
- Create: `functions/src/admin_alert_privacy.ts`
- Create: `functions/src/admin_alert_privacy.test.ts`

- [x] **Step 1: Write failing privacy tests**

Test safe new-user, rating, report and payment payloads. Include nested full UID, email, activation code, Telegram ID, transaction ID, stack and arbitrary text fixtures and assert none appears in rendered output.

```ts
const text = renderAdminAlertMessage({
  eventType: 'premiumPurchase',
  occurredAtMs: 1_725_000_000_000,
  payload: { provider: 'app_store', product: 'yearly', amount: 39.99, currency: 'EUR', uidLast4: '8F2A' },
});
expect(text).toContain('Новая покупка Premium');
expect(text).not.toMatch(/@|transaction|activation|uid_[a-z0-9]{8}/i);
```

- [x] **Step 2: Run RED**

Expected: FAIL because the formatter module does not exist.

- [x] **Step 3: Implement safe typed payloads**

Implement `maskId()`, `escapeTelegramHtml()`, `sanitizePublicNickname()` and `renderAdminAlertMessage()`. Render only switch branches declared for each `AdminAlertType`; do not accept or spread arbitrary objects into message text.

- [x] **Step 4: Run GREEN**

Expected: all privacy fixtures pass, including nested malicious strings.

### Task 3: Idempotent outbox writer

**Files:**
- Create: `functions/src/admin_alert_outbox.ts`
- Create: `functions/src/admin_alert_outbox.test.ts`

- [x] **Step 1: Write failing stable-key and create tests**

Cover canonical key normalization, rejection of empty/oversized keys, one create for two identical calls, and immutable safe payload storage.

```ts
expect(adminAlertEventId('user.created', 'uid-123')).toBe('user.created:uid-123');
await enqueueAdminAlert(db, event);
await enqueueAdminAlert(db, event);
expect(await countOutboxDocs(db)).toBe(1);
```

- [x] **Step 2: Run RED**

Expected: FAIL because outbox writer is missing.

- [x] **Step 3: Implement `enqueueAdminAlert()`**

Use `docRef.create()` and treat `already-exists` as an idempotent replay. Store `status: 'pending'`, `attempts: 0`, timestamps and the typed safe payload. Never write raw source documents.

- [x] **Step 4: Run GREEN**

Expected: stable-key, replay and validation tests pass.

### Task 4: Dispatcher, retry and recovery

**Files:**
- Create: `functions/src/admin_alert_dispatcher.ts`
- Create: `functions/src/admin_alert_dispatcher.test.ts`

- [x] **Step 1: Write failing state-machine tests**

Cover master disabled, optional type disabled, mandatory new user, success, network error, 429 `retry_after`, 5xx, permanent 4xx, expired lease and the send-success/status-write failure window.

- [x] **Step 2: Run RED**

Expected: FAIL because dispatcher exports do not exist.

- [x] **Step 3: Implement response classification and leases**

Export pure `classifyTelegramResponse()` and `nextRetryAtMs()` helpers. Implement a transaction that leases pending/due documents, increments attempts and records `leaseUntil` before sending.

- [x] **Step 4: Implement delivery functions**

Create `adminAlertDispatchOnCreate` with `ADMIN_ALERT_BOT_TOKEN`, and `adminAlertRecoveryCron` every minute. Success records `sentAt` and `telegramMessageId`; retryable failures record `nextAttemptAt`; permanent failures record `deadLetterAt` and a bounded error code.

- [x] **Step 5: Run GREEN**

Expected: all state-machine tests pass without real network calls.

### Task 5: Migrate the nine legacy alerts

**Files:**
- Modify: `functions/src/admin_alerts.ts`
- Modify: `functions/src/user_idea_reports.ts`
- Modify: `functions/src/explain/explain_reports.ts`
- Modify: `functions/src/ai_safety.ts`
- Test: `functions/src/admin_alerts.test.ts`
- Test: `functions/src/admin_alerts_auth_spike.test.ts`

- [x] **Step 1: Add failing compatibility tests**

Assert the existing exported Cloud Function names remain, but their committed event path calls the outbox producer. Assert arbitrary nickname/stack/context no longer reaches a Telegram renderer.

- [x] **Step 2: Run RED**

Expected: privacy/producer assertions fail against direct `sendTelegramAlert()` paths.

- [x] **Step 3: Route legacy types through outbox**

Preserve existing thresholds, dedupe windows, exports and bookkeeping. Replace only final direct admin delivery with `enqueueAdminAlert()`. Keep a narrow direct helper solely for config test ping until the dispatcher test event is wired.

- [x] **Step 4: Run GREEN**

Expected: legacy behavior tests and new compatibility tests pass.

### Task 6: Mandatory users and referral lifecycle

**Files:**
- Create: `functions/src/admin_alert_sources_people.ts`
- Create: `functions/src/admin_alert_sources_people.test.ts`
- Modify: `functions/src/users_write_router.ts`
- Modify: `functions/src/referral.ts`

- [x] **Step 1: Write failing source tests**

Test that only `before.exists === false` with a genuine profile creation produces `newUser`; updates and migrations do not. Test stable keys for attribution, first launch, qualification, reward and ban changes.

- [x] **Step 2: Run RED**

Expected: FAIL because people producers are absent.

- [x] **Step 3: Add the new-user handler to the existing router**

Export a pure `newUserAlertFromWrite()` and invoke its effect from `users_write_router.ts`. Do not add a second `users/{uid}` trigger.

- [x] **Step 4: Add referral events at authoritative transitions**

Emit separate events for attribution created, authenticated first launch receipt, qualification and reward. The first-launch receipt must validate the existing attribution and be idempotent per referred user.

- [x] **Step 5: Run GREEN**

Expected: one event per lifecycle transition and exact terminology tests pass.

### Task 7: Selected learning ratings

**Files:**
- Create: `functions/src/admin_alert_sources_learning.ts`
- Create: `functions/src/admin_alert_sources_learning.test.ts`
- Modify: `functions/src/feedback_entries.ts`

- [x] **Step 1: Write failing selection tests**

Cover `lesson`, `vocab`, `dialogue`, `arena_blitz`, `arena_rating`; explicitly assert MAX voice feedback and daily phrase saves produce no alert.

- [x] **Step 2: Run RED**

Expected: FAIL because the feedback-to-alert mapping does not exist.

- [x] **Step 3: Implement the mapping and producer**

Use the immutable feedback receipt ID as the outbox source key. Payload contains source, lesson/activity reference, numeric stars and masked user reference only.

- [x] **Step 4: Run GREEN**

Expected: all selected sources map once and excluded sources remain absent.

### Task 8: Purchases, trials and subscription lifecycle

**Files:**
- Create: `functions/src/admin_alert_sources_revenue.ts`
- Create: `functions/src/admin_alert_sources_revenue.test.ts`
- Modify: `functions/src/revenuecat_shards.ts`
- Modify: `functions/src/web_checkout.ts`
- Modify: `functions/src/telegram_premium_bot.ts`
- Modify: `functions/src/community_packs.ts`

- [x] **Step 1: Write failing lifecycle tests**

Map RevenueCat trial, initial purchase, non-renewing purchase, renewal, cancellation, uncancellation, product change, expiration, billing issue, refund and extension. Add Web and Stars paid-order replay tests and UGC purchase/refund tests.

- [x] **Step 2: Run RED**

Expected: FAIL because unified mappings do not exist and legacy Web/Stars messages contain PII.

- [x] **Step 3: Implement authoritative mappings**

Use the durable RevenueCat event ID, Web order ID and Telegram charge receipt as stable keys. Render provider/product/environment/amount/currency only. Keep customer-facing purchase confirmations untouched.

- [x] **Step 4: Remove only duplicate direct admin sends**

Replace Web and Stars owner-notification calls with outbox emission. Do not remove order activation, customer messages, retries or purchase entitlements.

- [x] **Step 5: Run GREEN**

Expected: lifecycle and replay tests pass; fixtures prove email, activation code and charge IDs are absent.

### Task 9: Reports, inbox and community producers

**Files:**
- Create: `functions/src/admin_alert_sources_reports.ts`
- Create: `functions/src/admin_alert_sources_reports.test.ts`
- Modify only authoritative commit points when no existing Firestore receipt is available.

- [x] **Step 1: Write failing source-map tests**

Cover `error_reports`, `user_reports`, idea reports, `explain_report_entries`, `community_pack_reports`, `community_pack_submissions`, `website_contact_inbox`, support email receipts, ideas and cancellation survey categories.

- [x] **Step 2: Run RED**

Expected: FAIL because the unified mapping is missing.

- [x] **Step 3: Implement bounded triggers/producers**

Every report message contains category, severity, masked reference and admin route only. Free text remains in the protected admin. Preserve existing immediate-cap/hourly-overflow behavior for noisy content reports.

- [x] **Step 4: Run GREEN**

Expected: source routing, redaction and dedupe tests pass.

### Task 10: Operational producers

**Files:**
- Create: `functions/src/admin_alert_sources_ops.ts`
- Create: `functions/src/admin_alert_sources_ops.test.ts`

- [x] **Step 1: Write failing transition tests**

Cover cron unhealthy/recovered changes, payment webhook dead letter, admin audit actions, push job terminal states, App Message publish/pause, new high-severity compliance issue and high-severity Jarvis finding.

- [x] **Step 2: Run RED**

Expected: FAIL because operational mappings are absent.

- [x] **Step 3: Implement transition filters**

Emit only meaningful state changes. Prevent double notification when an audit row and a subject-specific producer describe the same operation by sharing the admin operation id in the stable key.

- [x] **Step 4: Run GREEN**

Expected: unchanged snapshots emit nothing; one meaningful transition emits one event.

### Task 11: Digests and privacy-conscious aggregates

**Files:**
- Create: `functions/src/admin_alert_digests.ts`
- Create: `functions/src/admin_alert_digests.test.ts`

- [x] **Step 1: Write failing window tests**

Cover hourly App Errors and content overflow; daily lesson completions, revenue, surveys, App Message reactions, Card Packs, activity, paywall and owner summary. Assert a rerun uses the same digest key.

- [x] **Step 2: Run RED**

Expected: FAIL because digest builders are absent.

- [x] **Step 3: Implement deterministic digest builders**

Use UTC window IDs and aggregated counts only. Mark activity data `estimated` until completeness checks pass. Do not include per-user lists in digest payloads.

- [x] **Step 4: Run GREEN**

Expected: reruns are idempotent and empty windows emit no alert.

### Task 12: Firestore rules and Jarvis contract

**Files:**
- Modify: `firestore.rules`
- Modify: `functions/src/jarvis/jarvis_data_contract_guard.test.ts`
- Modify applicable Jarvis fetcher only if it reads the new data.
- Test: add focused Rules contract test.

- [x] **Step 1: Write failing rule/contract tests**

Assert clients cannot create/read/update/delete outbox or first-launch receipt documents. Assert direct browser writes to `admin_config/alerts` are denied while server/callable behavior remains valid.

- [x] **Step 2: Run RED**

Expected: direct admin alert config update remains allowed by current rules.

- [x] **Step 3: Tighten exact rule matches**

Deny client access to server-only collections and remove direct alert-config updates without changing unrelated admin config access. Update Jarvis guard only for collections/fields Jarvis actually reads.

- [x] **Step 4: Run GREEN**

Expected: focused Rules and Jarvis contract tests pass.

### Task 13: Canonical admin UI

**Files:**
- Modify: `admin/v2/legacy.html`
- Create: `tests/admin_telegram_owner_alerts_contract.test.ts`
- Test: `tests/admin_single_surface_contract.test.ts`

- [x] **Step 1: Write failing DOM contract tests**

Assert six categories, 47 known IDs, locked checked `newUser`, two excluded IDs absent, mode badges, preview, diagnostics states, 44px controls and use of the callable save flow.

- [x] **Step 2: Run RED**

Expected: existing nine-toggle UI fails the new contract.

- [x] **Step 3: Upgrade only the existing alert section**

Port the approved light, categorized interaction into `legacy.html` while fitting the Admin UI Bible and existing admin shell. Generate rows from a local catalog mirror and keep one save CTA. Remove the unsafe `getUpdates` token-in-URL instruction.

- [x] **Step 4: Wire load/save and diagnostics**

Load schema v2, preserve legacy explicit false values, force `newUser`, save through `adminPublishAlertsConfig`, and show pending/retrying/sent/dead-letter aggregate counts without exposing payloads.

- [x] **Step 5: Run GREEN**

Expected: focused DOM contract and single-surface contract pass.

### Task 14: Exports, deployment manifests and compatibility

**Files:**
- Modify: `functions/src/index.ts`
- Modify: `functions/package.json`
- Test: add focused source-coverage/export contract if required by existing gates.

- [x] **Step 1: Write failing export coverage test**

Assert dispatcher, recovery, new source triggers and digest schedules are exported exactly once.

- [x] **Step 2: Run RED**

Expected: new functions are not exported.

- [ ] **Step 3: Add exports and narrow deployment script**

Exports are complete. The deploy script is intentionally deferred because
`functions/package.json` already contains unrelated concurrent edits; release
must use an explicit one-off target list rather than overwrite that shared file.

Export every new Cloud Function and add a named `deploy:admin-owner-alerts` script containing only the affected functions plus `firestore:rules` and `hosting:admin`.

- [x] **Step 4: Run GREEN**

Expected: source coverage/export contract passes.

### Task 15: Focused verification and release handoff

**Files:**
- Verify all owned files; no new implementation file.

- [x] **Step 1: Run focused Jest groups under one semaphore slot**

Run only the alert catalog/privacy/outbox/dispatcher/source/digest tests and admin DOM contracts with `--runInBand`. Save bulky output under `.codex-tmp/telegram-alerts/` and report decisive summaries.

- [x] **Step 2: Run focused TypeScript compilation**

Use the project build only after acquiring a heavy slot. If unrelated existing compile errors occur, prove whether owned files introduce any new diagnostic before changing source.

- [x] **Step 3: Run guards**

Run Firestore Rules tests, Jarvis data-contract guard, admin single-surface contract, functions source coverage and `git diff --check` on owned files.

- [x] **Step 4: Review privacy and money paths**

Inspect final diffs for arbitrary payload spreading, PII, duplicate admin sends, entitlement changes, App Check changes and direct balance writes. None are allowed.

- [x] **Step 5: Prepare release without deploying**

List exact function/rules/hosting targets and test evidence. Deployment changes production and remains a separate release action after verified implementation.

## Self-review

- Spec coverage: all 47 selected events map to Tasks 6–11; the two exclusions are asserted in Tasks 1, 7 and 13.
- Reliability/privacy/config: Tasks 1–5 and 12 cover the identified P1 blockers.
- UI: Task 13 targets only the canonical admin surface and uses the approved six-category design.
- Data contracts: Task 12 covers Rules and conditional Jarvis updates.
- Release: Task 15 verifies without silently deploying.
- Placeholder scan: the plan contains no deferred implementation marker; each task names its exact behavior, files, RED command and GREEN outcome.
