# Class Registry: Events, Toasts, Overlays

Дата: 2026-06-26.

Статус: реестр собран без правок runtime-кода. Это первый класс из стартового порядка работы: события/тосты/очередь.

## Scope

Искал носители класса в:

- `app/`
- `components/`
- `contexts/`
- `hooks/`
- `tests/`

Не включал build output, `node_modules`, graphify/cache.

Что искал:

- `emitAppEvent(...)`
- `onAppEvent(...)`
- `useOverlayVisible(...)`
- прямые `DeviceEventEmitter.addListener(...)`
- тесты по `toast`, `overlay`, `event`, `modal`, `arbiter`

## Core files

Главные файлы класса:

- `app/events.ts`: типизированный event bus, `AppEventMap`, `emitAppEvent`, `onAppEvent`, anti-burst для `action_toast`.
- `components/OverlayArbiter.tsx`: runtime provider and `useOverlayVisible`.
- `components/overlay_arbiter_core.ts`: список ключей overlay, приоритеты, native modal handoff, force-evictable toast keys.
- `app/_layout.tsx`: монтирует `OverlayArbiterProvider` и глобальные toast/modal hosts.
- `app/(tabs)/home.tsx`: часть overlay-хостов живёт на главной.

Главные toast hosts:

- `components/ActionToast.tsx`
- `components/AchievementToast.tsx`
- `components/DailyTaskRewardToast.tsx`
- `components/CoachToast.tsx`
- `components/MatchFoundToast.tsx`
- `components/GlobalShardsEarnedHost.tsx`
- `components/StreakRiskToastHost.tsx`
- `components/BillingIssueToastHost.tsx`
- `components/EntitlementExpiredHost.tsx`
- `components/ThemedBlockingAlertHost.tsx`

## Overlay keys

Ключи из `components/overlay_arbiter_core.ts`:

- `onboardingWelcome`
- `update`
- `releaseNotes`
- `broadcast`
- `leagueBonusAvailable`
- `notifNudge`
- `introFullAccess`
- `loyaltyGift`
- `dailyPlan`
- `levelUp`
- `themedAlert`
- `premiumCelebration`
- `vipCelebration`
- `leagueResult`
- `streakRevive`
- `entitlementExpired`
- `referralWelcome`
- `mysteryMondayChest`
- `comebackDay`
- `perfectWeekReward`
- `boonActivated`
- `lessonCompleteNotif`
- `arenaRoomConfirm`
- `shardsEarned`
- `matchFoundToastScreen`
- `matchFoundToast`
- `arenaInvite`
- `achievementToast`
- `dailyTaskRewardToast`
- `coachToast`
- `actionToast`

Observed `useOverlayVisible(...)` owners:

- `achievementToast`: `components/AchievementToast.tsx`
- `actionToast`: `components/ActionToast.tsx`
- `arenaInvite`: `components/ArenaFriendInviteHost.tsx`
- `arenaRoomConfirm`: `app/arena_room.tsx`
- `boonActivated`: `components/BoonActivatedHost.tsx`
- `broadcast`: `app/_layout.tsx`
- `coachToast`: `components/CoachToast.tsx`
- `comebackDay`: `components/ComebackBoonHost.tsx`
- `dailyPlan`: `app/_layout.tsx`
- `dailyTaskRewardToast`: `components/DailyTaskRewardToast.tsx`
- `entitlementExpired`: `components/EntitlementExpiredHost.tsx`
- `introFullAccess`: `app/_layout.tsx`
- `leagueBonusAvailable`: `app/_layout.tsx`
- `leagueResult`: `app/(tabs)/home.tsx`
- `lessonCompleteNotif`: `app/lesson_complete.tsx`
- `levelUp`: `app/_layout.tsx`
- `loyaltyGift`: `app/_layout.tsx`
- `matchFoundToast` / `matchFoundToastScreen`: dynamic key in `components/MatchFoundToast.tsx`
- `mysteryMondayChest`: `components/MysteryMondayHost.tsx`
- `notifNudge`: `app/_layout.tsx`
- `onboardingWelcome`: `components/OnboardingWelcomeHost.tsx`
- `perfectWeekReward`: `components/PerfectWeekHost.tsx`
- `premiumCelebration`: `app/(tabs)/home.tsx`
- `referralWelcome`: `components/ReferralWelcomeHost.tsx`
- `releaseNotes`: `app/_layout.tsx`
- `streakRevive`: `app/(tabs)/home.tsx`
- `themedAlert`: `components/ThemedBlockingAlertHost.tsx`
- `update`: `app/_layout.tsx`, `components/OverlayArbiter.tsx` example/comment path
- `vipCelebration`: `app/(tabs)/home.tsx`

Special note:

- `shardsEarned` is listed as overlay key in the core, but current observed runtime path converts `shards_earned` to `action_toast` through `components/GlobalShardsEarnedHost.tsx`. Do not delete the key without checking old hosts/tests/history.

## Event bus scan

Most important event by volume:

- `action_toast`: 184 literal emitters, 1 direct `onAppEvent` listener: `components/ActionToast.tsx`.

Major `action_toast` emitter zones:

- Arena: `app/arena_game.tsx`, `app/arena_lobby.tsx`, `app/arena_room.tsx`, `app/arena_results.tsx`, `app/arena_join.tsx`, `app/arena_rating.tsx`, `contexts/MatchmakingContext.tsx`
- Daily tasks: `app/daily_tasks.ts`, `app/daily_tasks_screen.tsx`, `app/daily_task_navigation.ts`, `components/DailyTaskRewardToast.tsx`
- Shards/rewards/gifts: `app/shards_shop.tsx`, `app/shards_system.ts`, `components/GlobalShardsEarnedHost.tsx`, `components/GlobalFriendGiftHost.tsx`, `components/EnergyRefillShardModal.tsx`
- Community/flashcards: `app/community_pack_create.tsx`, `app/community_packs/purchaseCommunityPack.ts`, `app/flashcards_collection.tsx`, `app/flashcards/cardPackShardPurchase.ts`
- Subscription/entitlement feedback: `components/BillingIssueToastHost.tsx`, `components/EntitlementExpiredHost.tsx`
- Admin/dev QA: `app/_admin_settings_testers.tsx`, `components/admin_panel/qa_utils.ts`

Other observed events with direct `onAppEvent` listeners:

- `account_deleted`
- `achievement_unlocked`
- `app_first_content_ready`
- `app_messages_local_changed`
- `auth_provider_linked`
- `cloud_profile_hydrated`
- `collectibles_changed`
- `daily_task_completed`
- `daily_task_rerolled`
- `daily_task_reward_claimed`
- `daily_task_reward_toast_preview`
- `dialogs_progress_changed`
- `gold_theme_unlocked`
- `intro_full_access_changed`
- `league_chat_unread_changed`
- `league_crown_updated`
- `league_local_state_updated`
- `lesson_finished_once`
- `level_up_pending`
- `loyalty_gift_changed`
- `notif_permission_nudge`
- `pack_trial_gift_consumed`
- `pack_trial_gift_set`
- `personal_plan_onboarding_nickname_ready`
- `personal_plan_updated`
- `premium_activated`
- `premium_deactivated`
- `remote_config_changed`
- `shards_balance_updated`
- `shards_earned`
- `streak_freeze_updated`
- `streak_revive_offer`
- `streak_revived`
- `vip_activated`
- `vip_deactivated`
- `wager_lost`
- `welcome_closed`
- `xp_changed`
- `xp_updated`

## Direct DeviceEventEmitter listeners

These are real listeners but bypass the typed `onAppEvent(...)` wrapper:

- `components/EnergyContext.tsx`
  - listens to `energy_reload`
  - listens to `premium_activated`
  - listens to `premium_deactivated`
  - listens to `vip_activated`
  - listens to `vip_deactivated`
  - listens to `premium_access_changed`
- `app/(tabs)/settings.tsx`
  - listens to `vip_activated`
  - listens to `premium_access_changed`
  - listens to `auth_provider_linked`
- `components/SaveProgressBanner.tsx`
  - listens to `xp_changed`
  - listens to `xp_updated`
  - listens to `auth_provider_linked`
- `app/(tabs)/home.tsx`
  - listens to `xp_changed`
  - listens directly to `shards_earned`
- `components/StudyTargetContext.tsx`
  - listens to study-target internal events outside `AppEventMap`

Risk:

- typed registry can look incomplete if only `onAppEvent(...)` is scanned;
- future refactors may miss direct listeners;
- direct listeners can drift from `AppEventMap`.

Do not change this automatically. First decide whether direct listeners are intentional for perf/legacy reasons.

## Emitted events needing owner review

These events had literal emitters but no direct `onAppEvent(...)` listener in the first scan:

- `bug_hunt_eligible_check`
- `energy_purchased_shards`
- `energy_reload`
- `lesson_replay_started`
- `premium_access_changed`

After direct-listener search:

- `energy_reload` is handled by `components/EnergyContext.tsx`.
- `premium_access_changed` is handled by `components/EnergyContext.tsx` and `app/(tabs)/settings.tsx`.
- `daily_tasks_set_rerolled` is handled by `app/(tabs)/home.tsx` and refreshes the daily-task summary.
- `lesson_replay_started` is covered by `tests/mastery_replay.test.ts`, but no runtime listener was found in this scan.
- `bug_hunt_eligible_check` and `energy_purchased_shards` need owner review before any removal or behavior change.

Important: "no listener found" is not permission to delete. It may be a future hook, test contract, analytics path, or intentionally dormant event.

### Owner review: `bug_hunt_eligible_check`

Emitter:

- `components/NoEnergyModal.tsx`: after the zero-energy modal opens, it stores `energy_onboarding_shown = 1` and emits `bug_hunt_eligible_check`.

Documented intent:

- `app/events.ts` says this event means the user has seen the meaning of energy, so Home may show a bug-hunt prompt on schedule.

Observed state:

- No `onAppEvent('bug_hunt_eligible_check', ...)` listener found.
- No direct `DeviceEventEmitter.addListener('bug_hunt_eligible_check', ...)` listener found.
- No current `bugHunt`/`bug_hunt` Home UI source was found in `app/(tabs)/home.tsx`.
- `bug_hunt_shown` and `energy_onboarding_shown` are cloud-sync keys in `app/cloud_sync.ts`, but this does not create runtime UI behavior.

Safe decision needed:

- Either implement/restore the Home-side bug-hunt eligibility listener, or explicitly mark the event as a dormant/future hook.
- Do not delete the event without product approval, because `NoEnergyModal` is shared by many screens.

### Resolved owner: `daily_tasks_set_rerolled`

Emitter:

- `app/daily_tasks.ts`: `rerollTodayDailyTaskSet(...)` emits after replacing the full daily-task set and seeding fresh progress rows.

Nearby working pattern:

- `daily_task_rerolled` is the single-task reroll event.
- `app/(tabs)/home.tsx` listens to `daily_task_rerolled` and refreshes the daily-task summary.

Observed state:

- `app/(tabs)/home.tsx` listens to `daily_tasks_set_rerolled` and calls `refreshDailyTaskSummary()`.
- The only caller found is `components/DailyTasksFirstVisitModal.tsx`.
- That modal updates its own local `tasks` and `progress` after reroll.
- Production currently gates the daily-plan modal off: `_layout.tsx` uses `useOverlayVisible('dailyPlan', false)`, and `tests/overlay_daily_plan_slot_release.test.ts` guards this because the disabled modal used to block all toasts.

Current contract:

- Full-set daily-task reroll refreshes the Home daily-task summary the same way as single-task reroll.
- If the daily-plan modal returns to production, keep this listener or replace it with an equivalent summary refresh path.

### Owner review: `energy_purchased_shards`

Emitter:

- `app/energy_shard_refill.ts`: `refillEnergyWithShards(...)` emits `energy_reload` and then `energy_purchased_shards` after spending shards and restoring base energy.

Nearby working pattern:

- `components/EnergyContext.tsx` directly listens to `energy_reload` and reloads energy state.
- `components/EnergyRefillShardModal.tsx` also calls `reload()` after successful refill and shows a success `action_toast`.

Observed state:

- No `onAppEvent('energy_purchased_shards', ...)` listener found.
- No direct `DeviceEventEmitter.addListener('energy_purchased_shards', ...)` listener found.
- `EnergyRefillShardModal` is currently found only in admin/QA preview wiring, not as an obvious production entry point.

Safe decision needed:

- Decide whether this event should power analytics, achievements, stats, or a production UI refresh.
- If it is intentionally unused, document it as fire-and-forget/future hook before removing it from the owner-review allowlist.

### Owner review: `lesson_replay_started`

Emitter:

- `app/mastery.ts`: `executeReplay(...)` emits after validating the lesson was already finished and incrementing replay count.

Documented intent:

- `app/events.ts` says `lesson1.tsx` should reload progress when replay starts.

Observed state:

- No runtime listener found in `lesson1.tsx`, `lesson_menu.tsx`, `components/`, `contexts/`, or `hooks/`.
- No production call site for `executeReplay(...)` was found in `app/` or `components/`.
- `tests/mastery_replay.test.ts` verifies that `executeReplay(...)` is free, preserves lesson progress, increments replay count, and emits `lesson_replay_started`.
- Current lesson-menu replay path opens `/lesson1` with `replayIntro=1` and primes lesson screen from storage; it does not call `executeReplay(...)`.

Safe decision needed:

- Decide whether mastery replay is a dormant legacy contract, or whether a real UI entry point/listener must be restored.
- Because this touches lesson progress semantics, do not add or remove behavior without explicit owner approval.

## Existing tests and guardrails

Directly relevant tests:

- `tests/app_events_overlay_registry.test.ts`
- `tests/overlay_arbiter.test.ts`
- `tests/overlay_daily_plan_slot_release.test.ts`
- `tests/boon_overlay_keys.test.ts`
- `tests/match_found_toast_guards.test.ts`
- `tests/lesson_words_xp_toast_immediate.test.ts`
- `tests/medal_toast_locale_runtime.test.ts`
- `tests/release_update_modals_locale_runtime.test.ts`
- `tests/release_notes_modal.test.ts`
- `tests/global_broadcast_modal_locale_runtime.test.ts`
- `tests/achievements_modal_scroll_contract.test.ts`
- `tests/premium_context_vip_events_contract.test.ts`
- `tests/progress_event_type_contract.test.ts`
- `tests/progress_events_client_queue.test.ts`
- `tests/progress_events_engine.test.ts`

Related modal/notification tests:

- `tests/intro_full_access_modal_contract.test.ts`
- `tests/league_bonus_modal_safe_area.test.ts`
- `tests/level_gift_dual_modal_opacity_contract.test.ts`
- `tests/modal_opaque_surfaces_contract.test.ts`
- `tests/no_energy_modal_locale_runtime.test.ts`
- `tests/notifications_audit_contract.test.ts`
- `tests/notifications_triggers.test.ts`
- `tests/notifications_energy_full.test.ts`
- `tests/notifications_weekly_recap.test.ts`

Observed on 2026-06-26:

- `tests/app_events_overlay_registry.test.ts` passed after `daily_tasks_set_rerolled` was connected to Home summary refresh.
- Focused event/navigation check passed: 4 suites, 22 tests.

## Current risk list

1. `action_toast` is extremely broad.
   - 184 emitters means fixes must be class-wide, not one screen at a time.
   - Any change to payload shape, dedupe, queue length, localization fallback, or animation can affect many flows.

2. Overlay ownership is split between root layout and screens.
   - Root hosts live in `app/_layout.tsx`.
   - Home owns some reward/premium/league/streak overlays.
   - Arena room and lesson complete own their own confirmation/lesson overlay.

3. Direct `DeviceEventEmitter.addListener` creates a second event API.
   - Some direct listeners are probably legacy or convenience.
   - Registry and tests should treat them as first-class carriers.

4. Native modal handoff is fragile.
   - `NATIVE_MODAL_KEYS`, `needsHandoffGap`, and `FORCE_EVICTABLE_KEYS` are central.
   - Do not add a native `Modal` outside the arbiter for global/startup flows.

5. Some events need owner decision.
   - Especially `bug_hunt_eligible_check`, `energy_purchased_shards`, `lesson_replay_started`.
   - The safe action is to document and ask, not remove.

## Acceptance criteria for future fixes

Before closing this class:

- `npm test -- --runTestsByPath tests/app_events_overlay_registry.test.ts --runInBand` is green.
- Every `AppEventMap` event has one of:
  - runtime listener;
  - direct `DeviceEventEmitter` listener documented;
  - explicit "fire-and-forget / future hook / analytics" explanation.
- Every overlay key in `OVERLAY_PRIORITY` has an owner or documented legacy reason.
- New global modals use `useOverlayVisible`.
- Native modals that can overlap use arbiter handoff protection.
- `action_toast` payloads use a consistent helper where practical.
- Tests cover:
  - duplicate toast suppression;
  - queue behavior;
  - stuck overlay slot release;
  - native modal handoff;
  - no accidental starvation of reward/toast overlays.

## Current fix status and remaining plan

Done in this pass:

1. Added `tests/app_events_overlay_registry.test.ts`.
2. The guard extracts `emitAppEvent`, `onAppEvent`, direct `DeviceEventEmitter.addListener`, and `useOverlayVisible`.
3. Connected `daily_tasks_set_rerolled` to the Home daily-task summary refresh path.

Remaining owner decisions:

1. Decide owner status for the three uncertain events:
   - `bug_hunt_eligible_check`
   - `energy_purchased_shards`
   - `lesson_replay_started`
2. If approved, normalize direct event listeners to `onAppEvent` only where safe.
3. If approved, add missing tests around `action_toast` queue/dedupe and overlay starvation.
4. Only after owner decision, touch dormant event behavior.
