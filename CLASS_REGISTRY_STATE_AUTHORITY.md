# Class Registry: State Authority

Дата: 2026-06-26.

Статус: реестр собран read-only. Runtime-код не менялся. Это T0-зона: XP, прогресс, осколки, premium/VIP, auth/account switching и cloud sync нельзя чинить без отдельного решения владельца.

## Owner Direction

Главное правило хозяина: важные показатели не должны откатываться.

Это значит:

- XP, level, streak, weekly XP, shards, rewards, premium/VIP и server progress state нельзя перезаписывать меньшим или более старым значением из позднего sync/cache/restore.
- Если UI показывает optimistic рост, серверный ответ должен либо подтвердить его, либо reconcile без потери уже валидного максимума.
- Для T0 state preferred pattern: server-authoritative event/ledger/idempotency + local mirror, а не разрозненные client writes.

## Scope

Проверял только ключевые носители состояния:

- `app/cloud_sync.ts`
- `app/progress_events_client.ts`
- `functions/src/progress_events.ts`
- `app/xp_manager.ts`
- `app/shards_system.ts`
- `components/EnergyContext.tsx`
- `components/PremiumContext.tsx`
- `app/premium_guard.ts`
- `app/paywall_purchase.ts`
- `app/auth_provider.ts`
- `app/target_storage_keys.ts`
- `firestore.rules`
- узкие тесты по progress events, rules, shards, account/auth contracts

Не делал broad refactor и не запускал полный Jest.

## Simple Rule

В проекте нет одного общего "save everything" источника правды. Данные делятся на классы:

- сервер-авторитетные: клиент может читать/зеркалить, но не должен писать напрямую;
- local-first с последующим sync;
- device-only настройки;
- target-scoped ключи, где English legacy и French scoped живут по разным правилам;
- entitlement/purchase поля, которые обычный клиент не имеет права подделывать.

Перед любой правкой нужно сначала определить класс данных, потом менять только правильного владельца.

## Identity And Account Authority

Owners:

- `app/auth_provider.ts`
- `app/cloud_sync.ts`
- `functions/src/auth_identity.ts`
- `functions/src/auth_merge.ts`
- `firestore.rules`

Rules observed:

- User document identity is tied to Firebase Auth through `firebaseAuthUid`.
- Rules support both old `userId == request.auth.uid` and stable-id ownership through `firebaseAuthUid`.
- Account switch path is intentionally heavy:
  - `forceSyncToCloud()`
  - emergency backup if sync fails
  - `wipeLocalAccountData()`
  - clear stable id in the auth flow
- `wipeLocalAccountData()` preserves device preferences only: `app_theme`, `app_font_size`, `haptics_tap`.
- After linking/sign-in, auth flow restores cloud to local first, then syncs only if local progress is meaningful.
- Shards are pulled separately with `loadShardsFromCloud()` because they live at top-level `users/{uid}.shards`, not inside `progress`.

Do not:

- clear AsyncStorage broadly during account switch except through the existing account-delete flow;
- push empty local state to cloud after sign-in;
- move premium/VIP or shard ownership into generic cloud sync.

## Target-Scoped Storage

Owner:

- `app/target_storage_keys.ts`

Key facts:

- `storageStudyTarget(...)` maps unknown/null runtime target to default English; French is explicit.
- Target domains include lesson progress, lesson session, rewards, level exams, trainer, daily tasks, cloud sync, flashcards, quiz achievements, target stats, achievements.
- English still has legacy raw keys such as `lesson3_progress`.
- French uses scoped keys such as `lesson_progress_v2::fr::3`.
- `assertTargetKey(...)` blocks raw target-sensitive keys when a scoped key should be used.

Important target-sensitive examples:

- `lessonProgressKey(...)`
- `lessonBestScoreKey(...)`
- `lessonPassCountKey(...)`
- `lessonSessionKey(...)`
- `dailyTasksProgressKey(...)`
- `masteryFinishedOnceKey(...)`
- `masteryReplayCountKey(...)`

Risk:

- A fix that writes raw `lessonN_*` keys for French will silently mix languages.
- A fix that blindly converts English legacy keys may break existing installed users.

## Server-Authoritative Progress

Owners:

- server engine: `functions/src/progress_events.ts`
- client queue/mirror: `app/progress_events_client.ts`
- XP routing: `app/xp_manager.ts`
- rules gate: `firestore.rules`

Server-owned progress fields include:

- `user_total_xp`
- `user_prev_xp`
- `user_level`
- `weekly_xp`
- `weekly_xp_period_start`
- `week_points`
- `week_points_v2`
- `streak_count`
- `last_active_date`
- `streak_last_date`
- `unlocked_lessons`
- lesson best score/pass count/progress/cell index
- level exam pct/best pct/passed/pass count/completed_at
- French scoped lesson/exam equivalents

Flow:

1. Client calls `submitProgressEvent(...)`.
2. Client ensures snapshot migration once with `progressMigrateSnapshot`.
3. Client queues failed events in `progress_server_event_queue_v1`.
4. Server normalizes event, checks ledger idempotency, applies XP caps and daily caps.
5. Server writes `users/{stableUid}.progress` and a progress event ledger in one transaction.
6. Client mirrors result back to AsyncStorage with `mirrorProgressResultToLocal(...)`.

Existing tests:

- `tests/progress_event_type_contract.test.ts`
- `tests/progress_events_client_queue.test.ts`
- `tests/progress_events_engine.test.ts`
- `tests/firestore_rules_security.test.ts`

Do not:

- directly write server-owned XP/streak/lesson/exam fields from a generic client sync;
- remove the durable queue;
- change event types only on client or only on server;
- update snapshots from tests or generators.

## XP Manager

Owner:

- `app/xp_manager.ts`

Rules observed:

- `registerXP(...)` serializes calls through `_xpLock`.
- Positive XP sources are mapped to progress event types.
- `wager_bet` is intentionally not a progress event because it is negative/spend-like.
- In cloud builds, positive XP tries server progress first.
- If server is offline/unavailable, XP falls back to local writes and queues server event.
- Level-up side effects are local/UI:
  - avatar/frame update
  - `pending_level_up_queue`
  - `level_up_pending`
  - `energy_reload`
  - `xp_changed`

Risk:

- A "simple XP fix" can easily double-award XP if it writes both server event and local total without respecting `serverAward`.
- Level-up UI depends on local queue/events even when progress is server-authoritative.

## Cloud Sync

Owner:

- `app/cloud_sync.ts`

Rules observed:

- `SYNC_KEYS` is the general local-to-cloud list.
- `getRuntimeSyncKeys(...)` filters that list.
- Outgoing sync filters:
  - premium/VIP progress keys;
  - server-owned progress keys;
  - unchanged fields vs `LAST_SYNC_SNAPSHOT_KEY`.
- Restore compares cloud XP/streak vs local XP/streak before deciding full restore.
- Even when local XP wins, sticky restore still pulls important fields:
  - premium/VIP blocks;
  - missing user name;
  - monotonic counters via max;
  - daily tasks if local missing;
  - league pending result if not consumed;
  - gift entitlement pairs.
- Restore sanitizes every AsyncStorage pair so null/undefined cannot crash native storage.

Critical merge rules:

- Lesson restore merge is not a blind overwrite.
- Monotonic counters use max.
- Streak uses `mergeStreakByActivityDate(...)`.
- Premium/VIP values use presence/strength semantics, not numeric max.
- Daily tasks progress merges by current day and task rows.

Risk:

- Adding a key to `SYNC_KEYS` is not enough. You must decide whether it is outgoing, restore-only, server-owned, monotonic, target-scoped, or device-only.
- Removing a key from `SYNC_KEYS` can break restore/account switching.

## Premium And VIP

Owners:

- `components/PremiumContext.tsx`
- `app/premium_guard.ts`
- `app/paywall_purchase.ts`
- `functions/src/revenuecat_shards.ts`
- `functions/src/auth_merge.ts`
- `firestore.rules`

Rules observed:

- Real Premium is RevenueCat/store-owned.
- VIP/admin grant is server/admin-owned.
- `premium_active` is a local display/cache flag, not the durable source of truth.
- `PremiumProvider` listens to:
  - `premium_activated`
  - `premium_deactivated`
  - `vip_activated`
  - `vip_deactivated`
  - `intro_full_access_changed`
  - `loyalty_gift_changed`
- `premium_access_changed` is emitted to refresh dependent systems like energy.
- Firestore rules block ordinary clients from writing premium/VIP/server-only progress keys.
- Cloud sync explicitly strips premium/VIP keys from outgoing client patch.

Do not:

- make client cloud sync write premium/VIP keys;
- treat `premium_active=true` alone as durable paid entitlement;
- merge premium/VIP by numeric max;
- let tester `tester_no_premium` resurrect premium/VIP from cloud in dev.

## Energy

Owner:

- `components/EnergyContext.tsx`

Rules observed:

- Base energy state lives in AsyncStorage `energy_state`.
- Bonus energy is separate and spent before base energy.
- Max energy is dynamic from XP/level.
- Premium/VIP/tester can make energy unlimited.
- Provider reloads on:
  - app foreground polling;
  - `energy_reload`;
  - premium/VIP activation/deactivation;
  - `premium_access_changed`.
- Spending energy is local and immediate.

Risk:

- Energy is intentionally UI/local runtime state, not server-authoritative progress.
- Changing premium access events can leave EnergyContext stale.
- Bulk storage wipe can remove energy state unless it goes through account-aware cleanup.

## Shards Economy

Owners:

- local/runtime wallet: `app/shards_system.ts`
- RevenueCat shard packs: `functions/src/revenuecat_shards.ts`
- server reward paths: several Cloud Functions, for example daily tasks, profile card upgrade, community packs, league/friend rewards
- rules gate: `firestore.rules`

Observed data:

- Local key: `shards_balance`.
- Local metadata: `shards_balance_meta_v1`.
- Cloud top-level fields:
  - `users/{uid}.shards`
  - `shards_updated_at_ms`
  - `shards_updated_op`
  - `shards_updated_reason`
  - `shards_admin_override_at`
- UI update event: `shards_balance_updated`.
- Earn modal event: `shards_earned`.

Important mixed model:

- Some shard operations are explicitly server/CF-owned. Example: `claimDailyTasksAllShardsRewardDetailed(...)` calls `dailyTasksAllShardsClaim` because Cloud Functions bypass `hasNoShardWrites()`.
- Some shard operations in `app/shards_system.ts` still try client Firestore transactions in `applyShardDeltaToCloud(...)` and `syncShardsToCloud(...)`, then fall back to local state on failure/timeout.
- Tests cover local-vs-cloud reconciliation and timeout fallback:
  - `tests/daily_tasks_shards_claim.cloud.test.ts`
  - `tests/shards_spend_cloud_timeout.test.ts`

T0 owner-review: client shard writes vs Firestore rules

- `firestore.rules` says ordinary clients may not write top-level shard fields.
- `app/shards_system.ts` still contains client-side writes to those top-level shard fields.
- This may be intentional legacy fallback, undeployed-rules tolerance, or an actual production mismatch.
- Do not "fix" by relaxing rules or deleting local fallback.
- Owner decision needed: either route more shard mutations through Cloud Functions, or explicitly document which client shard writes are expected to fail and remain local-first.

## Firestore Rules Authority

Owner:

- `firestore.rules`

Important guards:

- `hasNoShardWrites()`
- `newDocHasNoShardWrites()`
- `blockedPremiumProgressKeys()`
- `progressHasNoPremiumWrites()`
- `newDocHasNoPremiumWrites()`
- `canonicalUserMatchesAuth(...)`

Meaning:

- Client updates to `users/{userId}` must pass ownership checks.
- Client cannot write shard top-level fields.
- Client cannot write premium/VIP/server-only progress fields.
- After progress server cutover, client cannot write server-authoritative XP/streak/progress fields.

Do not:

- treat rules as optional documentation;
- add a client write before confirming the rule path allows it;
- patch cloud sync without checking both update and create guards.

## Existing Narrow Verification

Useful tests for this registry:

- `npm test -- --runTestsByPath tests/owner_direction_runtime_contract.test.ts --runInBand`
- `npm test -- --runTestsByPath tests/progress_event_type_contract.test.ts --runInBand`
- `npm test -- --runTestsByPath tests/progress_events_client_queue.test.ts --runInBand`
- `npm test -- --runTestsByPath tests/progress_events_engine.test.ts --runInBand`
- `npm test -- --runTestsByPath tests/firestore_rules_security.test.ts --runInBand`
- `npm test -- --runTestsByPath tests/daily_tasks_shards_claim.cloud.test.ts --runInBand`
- `npm test -- --runTestsByPath tests/shards_spend_cloud_timeout.test.ts --runInBand`

Observed on 2026-06-26:

- `tests/owner_direction_runtime_contract.test.ts` passed: 20 tests green. It locks fast startup, debounced broad cloud sync, owner-reviewed `forceNow` call sites, owner-reviewed `setInterval` call sites, owner-reviewed Firestore `onSnapshot` call sites, private arena room timer cadence with exact timeout callbacks, arena question timer cadence with exact timeout callbacks, idle boost timer guard, energy recovery polling gate, online presence heartbeat cost cap, arena emoji cooldown timer throttling, league chat undo-hide cadence, arena acceptance/rematch countdown cadence, Home Theo typewriter cadence, paywall urgency storage-light countdown, matchmaking elapsed timer cadence, shared stats boost countdown interval, optimistic/local-first XP fallback through queued progress writes, capped/duplicate-throttled analytics/activity writes, and monotonic restore/migration guardrails.
- `tests/firestore_rules_security.test.ts` passed: 50 tests green.
- `tests/progress_event_type_contract.test.ts` initially failed because it expected literal `type: 'exam_complete'` and `xpDelta: 0` direct event in `app/level_exam.tsx`.
- Current `app/level_exam.tsx` says the old direct `submitProgressEvent` with `xpDelta:0` was intentionally removed, because `registerXP(examXp, 'exam_complete', ...)` sends the server event with the real XP delta.
- The contract test was updated to assert the current path:
  - lesson completion still has direct zero-XP progress event for non-XP lesson fields;
  - level exam completion routes through `registerXP(examXp, 'exam_complete', ...)`;
  - final exam completion routes through `registerXP(xp, 'exam_complete', ...)`.
- After the test update, `tests/progress_event_type_contract.test.ts` passed: 4 tests green.
- `tests/progress_events_client_queue.test.ts` passed: 6 tests green.
- `tests/progress_events_engine.test.ts` passed: 16 tests green.
- `tests/daily_tasks_shards_claim.cloud.test.ts` passed: 8 tests green.
- `tests/shards_spend_cloud_timeout.test.ts` passed: 1 test green.

Owner-review: level exam progress contract

- Current accepted contract: no second zero-XP `exam_complete` event for level exams.
- If a future owner wants a separate non-XP level-exam event, it must use a distinct idempotency plan and update both client and server tests.
- Do not silently add a second `exam_complete` event, because duplicate server events can affect XP/streak/progress ledgers.

## Proposed Next Step, Not Yet Approved

No T0 runtime fixes yet.

Recommended owner decisions before code changes:

1. Decide the shard authority model:
   - all cloud-enabled shard writes via Cloud Functions;
   - or intentionally local-first for some sources with best-effort cloud mirror.
2. Decide whether `SYNC_KEYS` needs a stricter registry/test tying each key to one authority class.
3. Decide whether server-owned progress field lists should be generated from one source or kept duplicated with tests.
4. Decide whether direct `DeviceEventEmitter` listeners in EnergyContext should stay legacy/direct or move to `onAppEvent`.
