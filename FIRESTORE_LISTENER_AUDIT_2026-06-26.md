# Firestore Listener Audit - 2026-06-26

Цель: понять, какие Firestore `onSnapshot` listeners должны быть live, а какие можно позже перевести на cache-first/SWR/polling только после owner decision.

Runtime в этом этапе не менялся.

## Общий счетчик

Текущий owner-reviewed allowlist содержит 33 `onSnapshot` call sites:

- `components/PremiumContext.tsx`: 1
- `app/remote_config_client.ts`: 1
- `app/app_messages.ts`: 2
- `app/daily_phrase_system.ts`: 1
- `app/firestore_friend_requests.ts`: 2
- `app/firestore_league_chat.ts`: 1
- `app/firestore_leagues.ts`: 2
- `app/league_group_boosts.ts`: 2
- `app/services/league_chest_rewards.ts`: 3
- `hooks/use-arena-rank.ts`: 1
- arena services/screens: 17 total

## Must-live / Do Not Change Silently

These are high-risk for product correctness. Any runtime change needs owner approval.

- `components/PremiumContext.tsx`
  - Listener: `users/{uid}`
  - Why live: VIP/admin grant/premium access can change while app is open.
  - Risk if changed: paywall/access can become stale.

- `app/remote_config_client.ts`
  - Listener: `remote_config/app`
  - Why live: admin flags, maintenance/update/config can change while app is open.
  - Risk if changed: admin actions propagate slower or not at all.

- Arena active session/room listeners:
  - `app/services/arena_db.ts`: session, players, matchmaking queue, room
  - `app/services/arena_rooms_live.ts`: room doc, members, runs, chat
  - `app/arena_results.tsx`: server result doc
  - `app/arena_lobby.tsx`, `app/arena_friend_room_guest.ts`, `app/services/arena_invites.ts`
  - Why live: active multiplayer UX needs immediate updates.
  - Risk if changed: missed match, stale room state, wrong result.

## Screen-Bound And Acceptable If Cleanup Stays Correct

These can stay as live listeners while the relevant screen/panel is mounted.

- `components/AppMessagesInbox.tsx` via `subscribeUserAppMessages`
  - Cache already exists.
  - Current behavior is Home/inbox freshness.
  - Future candidate: subscribe only when inbox is visible/open if product accepts slower badge freshness.

- `components/DailyPhraseCard.tsx` via `subscribeTodayPhraseForTarget`
  - Current behavior is same-day phrase live update.
  - Future candidate: cache-first + foreground refresh or low-frequency polling.
  - Needs owner/product decision because admin-updated phrase freshness changes.

- Friends:
  - `app/firestore_friend_requests.ts`: friends and incoming requests.
  - Used by friends screens, arena invite selection, profile modal.
  - Future candidate: screen-only subscription plus cache-first for profile modal.

- League chat:
  - `app/firestore_league_chat.ts`
  - Live is correct while chat panel is open.
  - Keep cleanup strict.

- League members/boosts:
  - `app/firestore_leagues.ts`
  - `app/league_group_boosts.ts`
  - Used by club/league surfaces.
  - Future candidate: cache-first for Home previews, live only on club screen.

- Arena rank:
  - `hooks/use-arena-rank.ts`
  - Used by arena leaderboard/game/lobby.
  - Future candidate: cache-first profile + live only inside arena screens.

## Cost Candidates For Owner Decision

These are not safe to rewrite automatically, but they are the best future savings targets.

1. `app/services/league_chest_rewards.ts`
   - Current: 3 live listeners for group, arena event, claim doc.
   - Why expensive: one feature opens multiple documents at once.
   - Possible future path: cache-first + one-shot check on foreground/club open; live only when bonus UI is visible.

2. `components/AppMessagesInbox.tsx`
   - Current: two listeners, global messages + per-user states.
   - Possible future path: cached unread preview on Home, live subscribe only when inbox panel is open.

3. `components/DailyPhraseCard.tsx`
   - Current: live same-day phrase query.
   - Possible future path: one-shot fetch with cache and daily TTL.

4. League Home previews
   - Current: some league/group data can become live outside the full club screen.
   - Possible future path: SWR preview on Home, live only inside Club.

## Dormant / Low Usage Candidates

Targeted search found exported listener helpers with no obvious production caller:

- `app/services/arena_db.ts`: `subscribeArenaProfile`
- `app/services/arena_db.ts`: `subscribeRoom`
- `app/services/arena_pulse.ts`: `subscribeArenaPulseEvents`

Do not delete automatically. Under project rules, deletion/removal needs explicit owner decision because these may be future hooks or admin/test hooks.

## Guardrails

- `tests/owner_direction_runtime_contract.test.ts` already locks all current `onSnapshot` call sites.
- Any new live listener must update the owner-reviewed allowlist intentionally.
- Any conversion from live listener to cache/SWR must document freshness tradeoff and add a focused guardrail.

## Next Safe Step

No listener runtime change in this pass.

Recommended next step: server write policy audit (`writeToFirestore: true`, direct Firestore writes, callable writes), still without changing T0 behavior.
