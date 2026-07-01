# Instant Stable Memory Snapshot Design

Date: 2026-07-01
Status: Draft for review

## Goal

All production user-visible Phraseman screens should open instantly and stay visually stable while data refreshes. The app may show the last known local snapshot immediately, but live data must not cause one-time jumps, empty-list flashes, header/card height changes, or full screen re-layouts.

This covers the five main tabs, normal stack screens, lessons, quizzes, arena, friends, stats, flashcards, trainer, paywalls, account/subscription screens, and user-facing modals. Dev-only/admin lab routes are out of scope for the first pass unless they are reachable by normal users.

## Constraints

- Open screens immediately from memory or bounded local snapshot.
- Do not wait for network before showing the screen, except for flows that are unsafe without live state, such as purchase/account mutation confirmation.
- Do not accumulate unbounded data in memory or AsyncStorage.
- Do not add always-on realtime listeners for every screen.
- Do not remove existing functionality while stabilizing loading.
- Preserve low battery/heat behavior: small caches, TTL, app-state pause, focus-scoped listeners, and batched updates.

## Architecture

### 1. App Snapshot Store

Add a small in-memory snapshot layer, for example `app/app_snapshot_store.ts`.

It stores only screen-ready summaries, not raw Firestore documents:

- profile: user name, avatar, frame, XP, level, premium/VIP flags
- progress: streak, energy, shards, current study target
- lessons: unlock summary, last opened lesson, compact per-lesson score summary
- friends: existing warm friends snapshot and bounded profile cache
- arena: rating/rank summary and current pending room/match state
- settings: user-facing settings already needed for first render
- notifications/overlays: compact pending flags only

The store exposes selector-style hooks so screens subscribe to the smallest slice they need. It also exposes synchronous `peek` functions for route loaders and non-React helpers.

### 2. Boot Snapshot Prime

At app startup, a single coordinator primes memory from AsyncStorage using bounded `multiGet` groups. Existing warm mechanisms remain, but they feed the shared snapshot:

- `friends_tab_swr_warm.ts`
- `lesson_screen_bootstrap.ts`
- existing root hydration in `app/_layout.tsx`
- existing small caches such as arena rating cache and leaderboard cache

The boot prime runs once per app session, not once per screen open. Screens should not repeat the same AsyncStorage reads on every mount if a shared snapshot already has the data.

### 3. Stable Screen Data Hook

Introduce a pattern such as:

```ts
const { data, refreshing, source } = useStableScreenData(sliceSelector, refreshFn);
```

Rules:

- If snapshot data exists, render it immediately and mark `refreshing=true` quietly.
- If snapshot data does not exist, render a fixed-size skeleton that matches the final layout.
- Refresh must never reset visible arrays to `[]`, visible objects to `null`, or loading flags that replace the screen.
- Refresh may update values inside stable containers.
- If item order changes, apply it in a stable batch and avoid moving content under the user while they are reading or scrolling.

### 4. Live Refresh Queue

Live refreshes from Firestore/callables/local mutations should go through a small queue:

- Coalesce multiple updates in the same frame/tick.
- Commit updates as one store patch.
- Skip no-op patches using shallow equality per slice.
- Keep old data visible if refresh fails.
- Surface errors as toast/inline status, not as full-screen resets.

### 5. Resource Budget

Every snapshot slice must have explicit limits:

- max friends/profile cache entries: 240 entries, matching the current pruning direction
- TTL for stale profiles: 30 days
- TTL for list snapshots such as friends/requests/leaderboards: 24 hours unless the domain already has stricter logic
- max recent messages/notifications retained in memory: 60 items per user-facing inbox/surface
- max leaderboard rows held for instant rendering: 100 rows per leaderboard surface
- target serialized app snapshot budget: under 300 KB for normal accounts
- no raw lesson payload duplication in the snapshot store
- no image/audio blobs in snapshot store
- clear account-scoped slices on sign-out/account switch
- pause or detach focus-scoped listeners when screens blur
- do not start new background workers or global listeners for every screen

AsyncStorage writes should be throttled or triggered by meaningful state changes, not every render or every realtime tick.

Battery and heat gates:

- A screen opening must not create duplicate listeners if the same route remounts.
- Background refresh must pause when `AppState` is not active.
- Realtime listeners should be focus-scoped by default; root-level listeners need a named reason.
- Refreshes should have cooldowns for non-critical data, usually 30-60 seconds.
- Cache pruning must happen during reads/writes, not as a permanent interval.

## Data Flow

1. App launch starts `primeAppSnapshotFromStorage()`.
2. Root providers render as soon as required shell data is ready.
3. Each screen reads a memory slice synchronously.
4. Screen starts or joins a scoped refresh.
5. Refresh result patches the snapshot store.
6. Screen updates values in place without changing its layout skeleton.
7. Pruning runs opportunistically on read/write and account switch.

## Screen Migration Rules

For every production screen:

- Replace `loading ? fullScreenLoader : content` with snapshot-first rendering where possible.
- Replace `setItems([])` before refresh with "keep previous items while refreshing".
- Keep header, top cards, tab bars, CTA rows, and list containers at stable dimensions.
- Use fixed-size skeletons only when no snapshot exists.
- Move repeated AsyncStorage reads into boot snapshot or domain adapters.
- Keep Firestore `onSnapshot` listeners focus-scoped unless the app already requires them globally.
- Ensure cache writes are capped and pruned.

## Verification

Add narrow tests and audits instead of one huge suite:

- Contract test that every `SafeAreaProvider` uses stable initial metrics.
- Source audit for production screens that still reset visible data to `[]`/`null` during refresh.
- Contract tests for app snapshot cache limits and TTL pruning.
- Tests for no new unbounded AsyncStorage keys.
- Focus/listener tests for friends, arena, league/chat, and root overlays.
- Manual smoke pass on all production routes: open screen, wait for refresh, confirm no vertical jump or full-content flash.

## Rollout Plan

Implement in phases:

1. Build the shared snapshot store and resource budget primitives.
2. Wire boot prime into root startup using existing caches.
3. Migrate the five main tabs first: home, lessons, arena, friends, settings.
4. Migrate high-traffic stack screens: lesson menu/session/complete, quizzes/results, streak stats, club/league, flashcards, trainer, paywalls.
5. Migrate remaining production screens and modals.
6. Run the route inventory audit and manual visual pass.

This phased rollout still targets all screens, but avoids a risky single mega-edit.

## Open Assumptions

- "All screens" means production user-visible app screens, not hidden dev labs.
- The preferred UX is instant open from memory/local snapshot, not network-blocked freshness.
- Live updates should be visible, but they should not reorder or resize major screen regions without a deliberate user action.
