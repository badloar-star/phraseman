# Shards Ledger Authority Audit - 2026-06-27

Scope: shard wallet authority, idempotency, stale-response safety, offline fallback and remaining owner decisions.

## Owner Direction

- Do not apply global `Math.max` to shard balances.
- Real spends, insufficient-cloud reconciliation, voucher use and admin corrections must be able to lower local balance.
- Stale server responses must not overwrite newer local/server wallet operations.
- Avoid extra server writes unless they replace a more expensive/unsafe path.

## Current Authority Map

### Shared Client Wallet

- `app/shards_system.ts`
  - `addShards()` and `addShardsRaw()` use cloud transaction when available, local fallback when cloud is unavailable, and timestamp-guarded local mirrors for successful cloud balances.
  - `spendShards()` uses cloud transaction when available, mirrors successful cloud spends through the same timestamp guard, reconciles inflated local balance down on cloud-insufficient, and falls back locally when cloud is unavailable.
  - `syncShardsToCloud()` uses `shards_updated_at_ms` last-write guard.
  - `loadShardsFromCloud()` applies newer cloud values, preserves newer local operations, and gives admin override priority.
  - `replaceShardsBalanceLocal()` is now timestamp-guarded when server responses provide `updatedAtMs`.

### Timestamp-Guarded Cloud Function Mirrors

These server responses now include/pass `shardsUpdatedAtMs`, so a late response cannot overwrite a newer wallet operation:

- `friendSendGift` -> `app/friend_gifts.ts`
- `friendClaimQuestReward` -> `app/friend_quests.ts`
- `communityPurchasePack` -> `app/community_packs/purchaseCommunityPack.ts`
- `leagueActivateGroupBoost` -> `app/league_group_boosts.ts`
- `leagueChestClaim` -> `app/services/league_chest_rewards.ts`
- `collectiblesClaimDrop` -> `app/collectibles/storage.ts`

### Local Direct-Write Bypasses Closed

- `app/level_gift_system.ts`
  - Old isolated-test fallback wrote `AsyncStorage.setItem('shards_balance', ...)`.
  - Now fallback uses `replaceShardsBalanceLocal(..., { op: 'earn', reason: 'level_gift_fallback' })`.

- `app/release_wave_bonus.ts`
  - Cloud-enabled release wave path now writes server `shards_updated_at_ms/op/reason`.
  - Local mirror now goes through `replaceShardsBalanceLocal(...)` and keeps the release claim marker separate.

- `app/shards_system.ts`
  - Daily all-task shard claims mirror returned balances through `replaceShardsBalanceLocal(...)`.
  - Cloud-backed one-time awards keep their local one-time marker but no longer direct-write `shards_balance`.

### Server-Only / Webhook / Admin Writers

Stamped with shard freshness metadata:

- `functions/src/revenuecat_shards.ts`
- `functions/src/admin_grant.ts`
- `functions/src/arena_hill_daily_reward.ts`
- `functions/src/arena_season_rewards.ts`
- `functions/src/daily_tasks_shards.ts`
- `functions/src/profile_card_upgrade.ts`
- `functions/src/collectibles.ts`
- `functions/src/community_packs.ts`
- `functions/src/friend_gifts.ts`
- `functions/src/league_groups.ts`
- `functions/src/league_chest.ts`
- `functions/src/auth_merge.ts` stamps merged shard writes as `replace/account_merge`.

## Idempotency / Duplicate Retry Notes

- Daily tasks all: `users/{uid}/reward_claims/daily_tasks_all_{dayKey}`.
- One-time awards: local one-time marker plus cloud `reward_claims/one_time_{source}`.
- Release wave: local `release_wave_bonus_claimed_v{wave}` plus cloud `reward_claims/release_wave_{wave}`.
- RevenueCat shard purchases: `revenuecat_shard_transactions/{transactionId}`.
- Community pack purchase: purchase document blocks repeat ownership.
- Friend gift send/thanks: client idempotency key plus server replay documents block duplicate spend/event/push.
- Friend activity like: same sender/day/target/event retry returns `idempotentReplay` without another increment/log; a different event on the same day is still blocked by the daily limit.
- Friend quest reward: `rewardClaimedByUid`.
- League chest: local claim key plus server claim document.
- Collectibles: client event id plus server claim document.
- Profile card upgrade: server expected-level/idempotent already-applied guard.
- League group boost: server active boost constraint.

Paths that are intentional actions, not duplicate-proof event grants:

- Admin grant is a manual admin action.
- Generic local fallback `addShardsRaw()`/`spendShards()` depends on caller-specific guards when the source can be repeated.

## Offline Behavior

- Shared wallet helpers retain local fallback and background sync for non-callable paths.
- Cloud Function-only economy actions still require cloud availability.
- Store purchase client does not local-grant production purchases; it waits for server/webhook grant after RevenueCat purchase confirmation.

## Cost Impact

- No new Firestore write path was added.
- Existing writes now carry timestamp/op/reason fields where missing.
- Local-only meta writes add one AsyncStorage key next to an already-existing wallet write.

## Verification

- `tests/shards_system.test.ts`
- `tests/daily_tasks_shards_claim.cloud.test.ts`
- `tests/daily_tasks_shards_claim_outcome.test.ts`
- `tests/one_time_shards_claim.cloud.test.ts`
- `tests/shards_spend_cloud_timeout.test.ts`
- `tests/friend_quests.test.ts`
- `tests/friend_gifts.test.ts`
- `tests/league_chest_goal.test.ts`
- `tests/shards_level_gift.test.ts`
- `tests/owner_direction_runtime_contract.test.ts`
- `functions/src/friend_gifts.test.ts`
- `functions/src/community_packs.test.ts`
- `functions` TypeScript build

## Remaining Decisions

- Decide whether all cloud-enabled local fallback paths should eventually move to callable ledger endpoints.

## Final Closure Note - 2026-06-27

- Current stale-lower-overwrite risks found in the app-level shard mirror audit are guarded locally.
- Known server/callable shard responses either carry freshness metadata, use deterministic claim/replay markers, or are documented as manual/admin or caller-guarded paths.
- Moving every fallback wallet mutation to callable ledger endpoints is a future architecture choice, not a required fix for this local readiness pass.
