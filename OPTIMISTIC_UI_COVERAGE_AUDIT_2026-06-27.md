# Optimistic UI Coverage Audit - 2026-06-27

## Short Answer

Optimistic UI is not applied "everywhere", and it should not be applied everywhere.

The current product already uses optimistic/local-first behavior in several safe places: lesson progress, XP fallback, arena answers, league group boost UI, boost likes, local shard fallback, and premium delivery after a confirmed RevenueCat signal.

Some flows must stay server-first or confirmation-first: real-money purchases, auth/account deletion, friend gifts, community UGC purchases, public prestige upgrades, admin grants, and App Check protected economy writes. For these, the right UX is fast pending UI, disabled duplicate taps, idempotency, and clear rollback/reconcile, not fake success before authority confirms.

## Owner Principles

- User-visible progress should feel instant when rollback or reconciliation is safe.
- Server writes must be batched/debounced/queued where possible; do not write every small local change.
- XP/progress/streak/shards must not be rolled back by stale server mirrors.
- Money/auth/anti-fraud/other-user effects must not be unlocked locally before authoritative confirmation.
- Any new T0 optimistic mutation needs an idempotency key, monotonic merge or timestamp authority, and focused tests.

## Current Coverage Map

| Flow | Current behavior | Status |
| --- | --- | --- |
| Lesson answer/progress | UI progress is updated locally during the lesson; progress is persisted locally and later synced. | Optimistic/local-first. |
| XP/progress/streak | `registerXP` uses server progress events when available, queues on failure, and continues local fallback. Server mirrors use monotonic merge for total/current-week XP. | Optimistic with protection. |
| Broad cloud sync | `syncToCloud` has `pendingSync`, timer debounce, `deferMs`, and owner-reviewed `forceNow` exceptions. | Cost-safe batching. |
| Shards earn/spend | Tries cloud transaction with timeout, then local fallback if cloud is unavailable; local balance metadata prevents stale server mirrors, core cloud transaction mirrors, account-merge shard writes, daily claim mirrors, one-time award mirrors, and release-wave bonus mirrors from overwriting newer local state. | Bounded optimistic. |
| League group boost buy | UI shows boost immediately, locally mirrors balance, then confirms with server or rolls back on known failure. Server duplicate delivery for the same buyer now replays the active boost instead of returning an error after a successful first commit. Identical in-flight client boost purchases now share one Promise. | Optimistic with rollback and replay protection. |
| League group boost like | Like count and liked state update immediately, then server confirms or UI rolls back. Same-event retry now replays without a second increment, and the league boost cache reconciles replay counts from the server. | Optimistic with rollback and replay protection. |
| Arena answer | `myAnswer` and `hasAnswered` update immediately; real session rolls back if submit fails. Local/private room also scores immediately. | Optimistic with retry protection. |
| Arena bot match result | Result UI can show immediately, while `arenaBotMatchRecord` persists server-owned arena XP/rank/stats. Duplicate delivery of the same `sessionId` now replays from `match_history` without second XP/SR/stat increments. | Server-first persistence with replay protection. |
| AI weekly review / stats insights | Successful server generations now cache the sanitized briefing hash plus generated result in the quota document. Same-briefing retries inside the closed window replay the cached response before rate/OpenAI for weekly review and before rate/global-budget/OpenAI for stats insights. Different briefings remain gated by the window. | Confirmation-first generation with budget-safe replay. |
| AI dialog / explain / compass clients | Identical in-flight Theo send, Theo translate, mistake explain, explain phrase, explain choice, explain quiz, and compass voice requests now share the same client Promise before the callable leaves the device. Server cache/lock/budget protections remain authoritative. | Confirmation-first with client duplicate suppression. |
| Admin OpenAI budget | Admin v2 Diagnostics has an explicit read-only OpenAI budget refresh backed by `openAiBudgetDashboard`. It uses server aggregation instead of browser Firestore scans and keeps model/quota writes in guarded legacy/admin paths. | Cost observability without background polling. |
| Premium purchase | A/B/C paywalls and the onboarding inline paywall show a visible pending state, disable duplicate taps, and do not grant access until `purchasePackage` returns `CustomerInfo`. After confirmation, local premium is persisted and event is emitted immediately. | Confirmation-first with fast pending UI. |
| Premium restore / RevenueCat push | Restore shows a visible pending state and is mutually blocked with purchase. Active entitlement from restore or listener is applied locally immediately; stale local premium has bounded grace to avoid flicker/loss. | Fast confirmed delivery. |
| Friend gift send/thanks | Gift send callable runs first, then sender shard balance is mirrored through the guarded local shard wallet instead of raw `senderBalanceAfter`. Gift rows show a visible spinner while `giftBusyId` is active. Gift send and gift thanks now include idempotency keys; duplicate delivery replays without a second spend, gift write, thanks event, or push. Identical in-flight client requests now share one Promise before a second idempotency key is created. | Server-first, correct for other-user economy/social writes. |
| Friend quest reward | Reward claim callable runs first, then local shards and XP mirror are updated from the server response without lowering local XP. Identical in-flight quest reward claims now share one Promise. | Server-first with duplicate suppression. |
| Promo code redeem | Promo redemption remains server-authoritative with deterministic user redemption docs. Identical normalized promo codes now share one in-flight client Promise. | Server-first with duplicate suppression. |
| League chest reward | Server claim doc remains authoritative, and local reward pack is applied only after callable response. Identical in-flight league chest claims now share one Promise by user/week/group. | Server-first with claim marker and duplicate suppression. |
| Community pack purchase | Callable runs first, then owned-pack state and shard balance are applied. It uses the same shard paywall modal pending indicator as card pack purchase. Server purchase docs use deterministic `buyerStableId__packId`, so repeated purchase attempts return already-owned instead of spending again. Identical in-flight client purchases now share one Promise. | Server-first, correct for UGC/economy. |
| Official card pack purchase | Local/cloud shard spend helper runs, then owned-pack state is added locally. The modal now shows a visible pending indicator while the existing `purchasing` lock is active. | Bounded optimistic after spend success. |
| Daily task reroll | Candidate is chosen, shards are spent, then local task state is replaced. The confirm button now shows a visible spinner while `rerollBusyId` is active. | Mostly confirmation-first, acceptable. |
| Profile card upgrade | Upgrade waits for `upgradeProfileCardLevel()` before applying the new public prestige level. The submit button now shows a visible spinner while `busy` is active. | Server-first/public prestige, correct. |
| Auth/account deletion | Server/provider/account guards run before identity state is trusted. | Server-first, required. |

## Safe Next Improvements

1. Add better pending states to any remaining server-first flows where UI still feels like it is waiting.
2. Extend idempotency keys to other repeatable paid/economy callables where double-tap or retry can happen.
3. Keep expanding timestamp/monotonic mirror rules for any server response that writes local XP/progress/shards.
4. Prefer optimistic "pending card/row/state" for server-first flows, not permanent local unlock before confirmation.

## Do Not Change Without Owner-Approved T0 Plan

- RevenueCat purchase authority.
- Auth/account deletion identity flow.
- Server-owned XP/progress/streak fields.
- Shards authority/rules/ledger model.
- Friend gifts and community UGC purchases.
- Public prestige/profile-card level.
- Admin grants and App Check protected mutations.

## Verification Notes

This started as an audit pass. One narrow runtime UI fix was added after the audit found a disabled pending visual.

Follow-up runtime pass:

- `app/flashcards/CardPackShardPaywallModal.tsx`: enabled the existing pending visual for shard/voucher pack purchase CTAs by replacing dead `false && purchasing` branches with a lightweight `ActivityIndicator`.
- Purchase authority did not change: the modal was already disabled by `purchasing`, and pack ownership still waits for the existing purchase result.
- `tests/owner_direction_runtime_contract.test.ts`: added a guard so the pending visual cannot be silently disabled again.
- `app/(tabs)/friends.tsx` and `app/friends_screen.tsx`: friend gift rows now show a lightweight spinner on the selected gift while the server-first send is in flight.
- Gift authority did not change: `sendFriendGiftWithShards` still runs before balance/receipt UI is applied.
- `app/profile_card_upgrade.tsx`: the profile-card upgrade CTA now shows a spinner while the existing `busy` lock is active.
- Profile-card authority did not change: public prestige still waits for `upgradeProfileCardLevel()` before local state is refreshed.
- `app/daily_tasks_screen.tsx`: the daily-task reroll confirm CTA now shows a spinner while `rerollBusyId` is active.
- Daily reroll authority did not change: the task replacement still waits for `rerollDailyTask(...)`.
- `app/friend_gifts.ts` and `functions/src/friend_gifts.ts`: friend gift sends now carry an idempotency key. The server stores the first successful public result and replays it on duplicate delivery without a second shard spend, gift write, or push.
- `app/friend_gifts.ts` and `functions/src/friend_gifts.ts`: friend gift thanks now also carry an idempotency key. The server replays the same thanks call without creating a second `my_events` thanks document or sending a second push.
- `functions/src/community_packs.ts`: community pack purchase idempotency remains deterministic through `buyerStableId__packId`; the owner guard now locks that contract.
- `functions/src/league_groups.ts`: duplicate delivery of the same buyer's already-active group boost now returns the active boost as success instead of surfacing `already-active` after the first commit.
- Reward-claim audit: daily all-task shards, league chest, collectibles, profile-card upgrade, arena season rewards, promo redemption, and RevenueCat premium/shard webhooks already have deterministic claim/processed markers or level guards. `tests/owner_direction_runtime_contract.test.ts` now locks those markers.
- `components/paywall/PaywallCtaBlock.tsx` and `app/paywall_purchase.ts`: A/B/C premium purchase and restore are now mutually blocked, and restore is disabled while purchase is already pending. Access authority still waits for RevenueCat confirmation.
- `components/onboarding.tsx`: the inline personal-plan paywall now separates purchase pending from restore pending, shows the correct spinner/text for each, disables duplicate taps, and keeps plan switching locked while purchase/restore is in flight.
- `app/personal_plan_state.ts`: `clearPersonalPlanState()` now clears the in-memory cache as well as AsyncStorage, so dev/test clears cannot keep showing an old active plan.
- `tests/premium_modal_locale.test.ts`, `tests/paywall_purchase_activation_contract.test.ts`, and `tests/personal_plan_premium_activation_contract.test.ts`: guards now lock premium pending UI, mutual purchase/restore blocking, and onboarding inline paywall pending states.
- `functions/src/auth_merge.ts`: account merge now stamps merged shard writes with `shards_updated_at_ms`, `shards_updated_op='replace'`, and `shards_updated_reason='account_merge'`, so the merged cloud balance is not treated as unversioned by local wallet sync.
- `functions/src/auth_merge.test.ts` and `tests/owner_direction_runtime_contract.test.ts`: guards now lock account-merge shard freshness metadata.
- `functions/src/friend_activity_likes.ts` and `app/league_group_boosts.ts`: repeat delivery of the same friend activity like now returns `idempotentReplay` without a second counter increment/log, while league boost cache uses the replay count instead of adding another local like.
- `functions/src/friend_activity_likes.test.ts` and `tests/owner_direction_runtime_contract.test.ts`: guards now lock same-event like replay and same-day different-event blocking.
- `functions/src/arena_bot_match.ts` and `app/arena_bot_profile_write.ts`: bot arena match persistence is now idempotent by `sessionId`; duplicate delivery replays from `match_history` and cannot add second XP/SR/stats. `match_history` now also stores `sessionId`, matching account-delete cleanup expectations.
- `functions/src/arena_bot_match.test.ts` and `tests/owner_direction_runtime_contract.test.ts`: guards now lock bot-match duplicate replay and different-session progression.
- `functions/src/weekly_review.ts` and `functions/src/stats_insights.ts`: same sanitized briefing retries now replay cached server results from quota docs before rate/OpenAI for weekly review and before rate/global-budget/OpenAI for stats insights, while different briefings remain gated by the existing window.
- `functions/src/weekly_review.test.ts`, `functions/src/stats_insights.test.ts`, and `tests/owner_direction_runtime_contract.test.ts`: guards now lock AI replay decisions, stored-result shape, and replay-before-limit ordering.
- `functions/src/explain/explain_budget.ts`, `functions/src/explain_phrase.ts`, `functions/src/explain_choice.ts`, `functions/src/explain_quiz.ts`, and `functions/src/compass.ts`: explain-family cache-miss budgets now use reserve/refund; lost cache-lock races and first-provider failures return user/global budget instead of consuming it without generation.
- `functions/src/stats_insights.ts`: stats-insights global budget is refunded when the OpenAI fetch throws or returns non-OK before a usable response.
- `functions/src/explain/explain_budget.test.ts` and `tests/owner_direction_runtime_contract.test.ts`: guards now lock budget refund behavior for no-generation paths.
- `app/explain_phrase_client.ts`, `app/explain_choice_client.ts`, `app/explain_quiz_client.ts`, and `app/compass/compass_voice_client.ts`: identical in-flight AI callable requests are deduped on the client so rapid double taps/remounts share one server request.
- `app/ai_dialog_client.ts` and `app/ai_mistake_explain_client.ts`: Theo send, lazy Theo translation, and mistake explain now use the same client in-flight dedupe pattern for identical requests.
- `app/friend_gifts.ts`, `app/friend_quests.ts`, `app/promo_code_client.ts`, `app/services/league_chest_rewards.ts`, `app/league_group_boosts.ts`, and `app/community_packs/functionsClient.ts`: identical in-flight economy/social callable requests now share one Promise before leaving the device.
- `tests/owner_direction_runtime_contract.test.ts`: guard now locks both the existing server idempotency/claim markers and the new client in-flight duplicate suppression layer for selected economy paths.
- `app/(tabs)/friends.tsx` and `app/friends_screen.tsx`: friend gift send success now re-reads the guarded local shard balance before updating visible UI, so a stale server mirror cannot visually lower a newer local wallet state.
- `tests/owner_direction_runtime_contract.test.ts`: guard now rejects direct `setGiftBalance(res.senderBalanceAfter)` writes in friend gift send handlers.
- `app/release_wave_bonus.ts`: release-wave bonus local balance mirror now goes through `replaceShardsBalanceLocal(...)` instead of direct `shards_balance` storage writes, while keeping the one-time claim marker.
- `tests/owner_direction_runtime_contract.test.ts`: guard now rejects direct release-wave `['shards_balance', String(newBalance)]` writes.
- `app/shards_system.ts`: successful core cloud transaction mirrors for `addShards`, `addShardsRaw`, and `spendShards` now use the shared timestamp guard instead of direct local cloud balance writes.
- `app/shards_system.ts` and `functions/src/daily_tasks_shards.ts`: daily all-task shard claims now carry/use `shardsUpdatedAtMs` and mirror returned balances through `replaceShardsBalanceLocal(...)`.
- `app/shards_system.ts`: cloud-backed one-time awards now keep their one-time marker while guarding the returned balance mirror against stale overwrites.
- `tests/daily_tasks_shards_claim.cloud.test.ts`, `tests/one_time_shards_claim.cloud.test.ts`, and `tests/owner_direction_runtime_contract.test.ts`: guards now lock the core shard lower-overwrite behavior.
- `admin/index.html` and `admin/v2/scripts/admin-firebase.js`: Admin v2 now exposes a read-only OpenAI budget panel in Diagnostics through the admin-only callable; it does not run direct browser billing scans or write model/quota settings.
- `tests/openai_runtime_cost_contract.test.ts`: guards now lock client AI dedupe, current local Theo greetings, current dialog quota/model config, v2 OpenAI budget visibility, and legacy guarded model/quota fallback.

Existing guardrails already cover the important contracts:

- Progress server writes are queued, idempotent, serialized, and XP fallback remains local-first.
- Progress restore/migration is monotonic so late sync cannot roll values back.
- Broad cloud sync remains debounced unless a call site is owner-reviewed for `forceNow`.
- Explicit Firestore writes and live listeners are owner-reviewed.
- Shard server mirrors and account-merge shard writes carry update timestamps for the audited paths.

## Final Closure Note - 2026-06-27

- The owner direction is now locked as a matrix, not as a blind "optimistic everywhere" rule.
- Safe local-first paths stay optimistic.
- Money/auth/other-user/public-prestige/economy-authority paths stay server-first with pending UI, duplicate suppression, idempotency, replay, or guarded mirrors.
- This is the intended final contract for the current readiness pass.
