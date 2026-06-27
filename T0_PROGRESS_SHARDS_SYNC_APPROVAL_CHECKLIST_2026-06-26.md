# T0 Progress / Shards / Sync Approval Checklist - 2026-06-26

Этот checklist нужен перед любой runtime-правкой в XP, progress, streak, shards, premium/auth authority или broad cloud sync.

## Before Any Code Change

1. Назвать точную проблему.
   - Что дорого или опасно сейчас?
   - Это server cost, lag, phone heat, stale UI, data loss, duplicate reward, fraud risk?

2. Назвать affected files.
   - Например: `app/xp_manager.ts`, `app/progress_events_client.ts`, `functions/src/progress_events.ts`, `app/shards_system.ts`, `app/cloud_sync.ts`.

3. Назвать current authority.
   - Local-first?
   - Server-first?
   - Mixed fallback?
   - Cloud Function ledger?
   - Firestore direct transaction?

4. Назвать desired authority.
   - Что становится источником правды?
   - Что остается optimistic UI?
   - Что пишется в local mirror?

5. Назвать freshness tradeoff.
   - Что пользователь увидит сразу?
   - Что может догнаться позже?
   - Что делать offline?

## Required Safety Rules

- XP must not go down after late sync.
- Streak must not go down because an older server snapshot arrived later.
- Shards balance must not be overwritten by an older value.
- Earned achievements must not become locked again.
- Best scores/pass counts must not decrease.
- Premium/VIP access must not be removed by stale local state.
- Server retries must be idempotent.
- Duplicate client events must not duplicate rewards.
- Failed server write must stay queued or fall back in a documented way.

## Required Technical Pattern

For T0 mutations, prefer:

- optimistic UI update;
- durable local queue;
- idempotency key;
- Cloud Function or transaction;
- server ledger;
- local mirror update from server result;
- monotonic merge for counters/bests/unlocks;
- focused guardrail test.

## Required Audit Artifacts

Before implementation:

- Current data flow map.
- Call site list.
- Storage keys touched.
- Server collections/functions touched.
- Expected cost impact.
- Expected offline behavior.
- Expected conflict behavior when local and server disagree.

After implementation:

- Diff summary.
- Tests run.
- Known residual risk.
- Roll-forward repair path if production data is inconsistent.

## Tests Required Before Saying Done

Minimum:

- owner runtime contract;
- focused unit test for changed function/module;
- idempotency/duplicate event test if a server mutation changed;
- monotonic merge test if any local/server reconciliation changed;
- queue cap/flush test if batching changed.

Do not run broad suites automatically unless the changed surface is broad enough to justify it.

## Owner Approval Checkpoint

No runtime edit is allowed until the owner-approved scope answers:

- Which user-visible value may change?
- Can any value become smaller?
- What happens offline?
- What happens on duplicate tap/retry?
- What happens if server response arrives after local UI already moved forward?
- What exact test proves the dangerous case is safe?

## Current Status

- No T0 runtime edit was made in this checklist step.
- Current work remains in safe audit/guardrail territory.
- Next actual T0 change needs explicit owner approval for a named scope.

## Owner-Approved Monotonic Mirror Pass - 2026-06-27

Scope: prevent local visible progress from being overwritten downward by a stale or lower server/cloud mirror.

What changed:

- `app/progress_events_client.ts`
  - `mirrorProgressResultToLocal()` now keeps `user_total_xp` monotonic with `Math.max(local, server)`.
  - Current-week XP also stays monotonic only inside the same week. Previous-week local values are not carried into a new server week.
  - Streak mirror keeps using activity-date merge, so a stale server streak cannot lower a fresher local streak.

- `app/cloud_sync.ts`
  - Full cloud restore now unions `unlocked_lessons` and `lesson_progress_v2::fr::unlocked_lessons`.
  - Full cloud restore now keeps stronger level exam progress: boolean fields use OR, numeric progress fields use max, and completed dates prefer the newer ISO day.
  - Existing lesson best score, pass count, lesson progress quality and perfect-pass merge behavior remains intact.

- `app/friend_quests.ts`
  - Friend quest reward XP mirror no longer writes a lower `callerXp` over a higher local `user_total_xp`.

What did not change:

- Server XP ledger and idempotency were not changed.
- Progress event queue shape, cap and flush serialization were not changed.
- Shards spending, admin override, insufficient-cloud reconciliation and shard server authority were not changed.
- Premium/auth authority was not changed.
- No new server write path was added.

Verification:

- `tests/progress_events_client_queue.test.ts`
- `tests/cloud_sync_daily_tasks_merge.test.ts`
- `tests/friend_quests.test.ts`
- `tests/progress_events_engine.test.ts`
- `tests/weekly_xp.test.ts`
- `tests/owner_direction_runtime_contract.test.ts`
- Final focused T0 gate: 11 suites, 130 tests passed.

Residual owner decisions:

- Shards authority is still a mixed model by design. Do not replace shard decreases with global `Math.max`; real spends, insufficient reconciliation and admin override must be able to lower balance.
- Larger server batching and live listener freshness changes remain separate owner decisions.

## Owner-Approved Shards Timestamp Mirror Pass - 2026-06-27

Scope: prevent stale Cloud Function shard balance responses from overwriting a newer local/server wallet operation, without blocking legitimate spends or admin corrections.

What changed:

- `app/shards_system.ts`
  - `replaceShardsBalanceLocal()` now accepts optional `{ updatedAtMs, op, reason }`.
  - If a server response carries `updatedAtMs` older than the current local shard meta, the local mirror is not overwritten.
  - If the server response is newer, it may still lower the balance. This preserves real spend, insufficient-balance reconciliation, voucher use and admin correction semantics.
  - The replace path now uses the existing storage lock before reading meta and writing the balance.

- Cloud Function response contracts now include `shardsUpdatedAtMs` for shard balance mirrors:
  - `friendSendGift`
  - `friendClaimQuestReward`
  - `communityPurchasePack`
  - `leagueActivateGroupBoost`
  - `leagueChestClaim`
  - `collectiblesClaimDrop`

- Client mirror call sites now pass the server timestamp and operation reason:
  - `app/friend_gifts.ts`
  - `app/friend_quests.ts`
  - `app/community_packs/purchaseCommunityPack.ts`
  - `app/league_group_boosts.ts`
  - `app/services/league_chest_rewards.ts`
  - `app/collectibles/storage.ts`

What did not change:

- No global `Math.max` was added for shard balances.
- Local optimistic club boost rollback, admin/tester shard controls and local fallback paths were not converted to server timestamp mode.
- Existing add/spend transaction behavior, offline fallback, cloud insufficient reconciliation, admin override and store-purchased shard achievement exclusion were preserved.
- No new server write path was added; only response payloads were enriched with the timestamp already used by server writes.

Verification:

- `tests/shards_system.test.ts`: stale server replace skipped; newer server spend replace still applies.
- `tests/friend_quests.test.ts`: client passes `shardsUpdatedAtMs` to shard mirror and XP remains monotonic.
- `tests/friend_gifts.test.ts`: client passes `shardsUpdatedAtMs` for spend mirror.
- `tests/owner_direction_runtime_contract.test.ts`: guard locks timestamp-guarded shard mirrors.
- `functions/src/friend_gifts.test.ts`: server returns shard timestamp for gift spend and quest reward.
- `functions/src/community_packs.test.ts`: server returns shard timestamp for pack purchase.
- `functions` TypeScript build passed.

Residual owner decisions:

- Full shard authority remains mixed: direct client transaction/local fallback and Cloud Functions coexist.
- A future full redesign should decide whether every cloud-enabled shard mutation must move to Cloud Function ledger/idempotency.
- App Check provider/enforcement state still needs Firebase Console confirmation.

## Full Shards Ledger Audit Pass - 2026-06-27

Audit artifact:

- `SHARDS_LEDGER_AUTHORITY_AUDIT_2026-06-27.md`

Additional safe fixes after the mirror pass:

- `app/release_wave_bonus.ts`
  - Cloud-enabled release wave grant now writes `shards_updated_at_ms`, `shards_updated_op` and `shards_updated_reason`.
  - Local release wave mirror now writes `shards_balance_meta_v1` together with `shards_balance`.

- `app/level_gift_system.ts`
  - Isolated-test fallback no longer writes raw `AsyncStorage.setItem('shards_balance', ...)`.
  - Fallback now goes through `replaceShardsBalanceLocal(..., { op: 'earn', reason: 'level_gift_fallback' })`.

What stayed unchanged:

- Existing reward amounts and spend costs.
- Release wave local/cloud claim keys.
- `addShardsRaw()` / `spendShards()` offline fallback behavior.
- Friend gift daily limits and spend semantics.
- Admin grant behavior.
- Auth merge behavior.

Remaining owner decisions:

- `functions/src/auth_merge.ts` writes merged shard balance without shard freshness timestamp. This is auth/account territory; change only with auth guard tests.
- Friend gift send may need a client-generated idempotency key if product wants retry-safe "one tap = one gift" semantics beyond current UI lock/daily limits.
- Full migration of local fallback wallet mutations to callable ledger endpoints remains a larger architecture decision.
