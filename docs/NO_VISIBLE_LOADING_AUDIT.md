# No Visible Loading Audit

Date: 2026-05-13

Goal: end users should not see loading spinners, "Loading...", "Загрузка..." states, or empty waiting cards. Data may still load in the background, but the visible UI should render either cached content, stable empty content, the existing screen state, or a disabled action state with the same icon/text.

## Research Baseline

- React Native `ActivityIndicator` is explicitly a visible progress indicator. In product UI it should be treated as a banned end-user element.
- React `Suspense fallback` is also visible replacement UI while waiting. If used later, fallback must be a real stable screen, not a spinner/loading text.
- Expo splash handling is the right place for cold-start waiting: keep native splash/first-frame hold until the app has enough local state, then run remote refreshes in the background.

Reference docs:
- https://reactnative.dev/docs/activityindicator
- https://react.dev/reference/react/Suspense
- https://docs.expo.dev/versions/latest/sdk/splash-screen/
- https://docs.expo.dev/versions/latest/sdk/asset/

## Product-Visible Findings

### League / Weekly League

- `components/LeagueChatPanel.tsx`
  - Initial unresolved room renders a card with only `ActivityIndicator`.
  - Chat message subscription renders `ActivityIndicator` inside the chat body.
  - Send button swaps the send icon for a spinner.
  - Fix: keep the chat card structure visible immediately. If room is unresolved, render the normal unavailable/quiet state. If messages are refreshing, keep old messages or quiet empty copy. For send, keep the send icon and use disabled/opacity while the write is in flight.

- `app/arena_leaderboard.tsx`
  - Initial board load renders a centered large `ActivityIndicator`.
  - "My rank" footer can show a small spinner while fetching personal place.
  - Fix: `loadArenaTop100` already has cache/SWR architecture. Render `FlatList` immediately with cached rows or empty state; remove the top-level `loading ? spinner` branch. In footer, show cached rank or an em dash while refresh runs.

### Friends

- `app/friends_screen.tsx`
  - Full-screen spinner while realtime friends/request subscriptions fire.
  - My code card shows a spinner until invite code exists.
  - Add friend button and gift options show spinners during actions.
  - Fix: render the full screen immediately. Use cached/empty friends and requests while subscriptions attach. In code card, show a stable placeholder such as "------" or keep the card actions disabled. In buttons, keep text/icon and disable/opacity during async work.

- `app/(tabs)/friends.tsx`
  - Multiple button/list spinners, plus one early return spinner.
  - Fix: same pattern as above; no full-screen return for loading. Preserve visible layout and update in background.

- `app/friends_hof_screen.tsx`
  - Large spinner on initial Hall of Fame load.
  - Fix: render cached/empty leaderboard immediately; background-refresh remote data.

### Arena

- `app/arena_game.tsx`
  - Entry/session phases show large spinners.
  - Fix: render a stable arena shell with current opponent/phase copy, or redirect/exit state. Preload questions before navigation where possible.

- `app/arena_join.tsx`
  - Join/acceptance states show large spinners.
  - Fix: keep join screen visible with disabled CTA and room status text.

- `app/arena_rating.tsx`
  - Initial rating screen shows large spinner.
  - Fix: use cached rating rows/place first; remote refresh silently.

- `app/arena_lobby.tsx`
  - Small spinners appear in wager / lobby subcomponents.
  - Fix: retain icons/text and disable affected control while background work runs.

- `app/arena_room.tsx`
  - Join/create buttons swap icons for spinners.
  - Fix: keep `enter-outline` / `add-circle` icons and disable/opacity.

### Learning / Trainer / Quiz

- `app/lesson1.tsx`
  - Fallback text `Loading lesson...`, phrase-level `Загрузка...`, and large ActivityIndicator.
  - Fix: rely on `primeAllLessonsFromStorageOnAppLaunch` / `lesson_screen_bootstrap.ts`; if route is reached before lesson is ready, show the lesson shell with local lesson defaults or navigate back to lesson menu.

- `app/quizzes.tsx`
  - Text fallback `Загрузка...` / `Завантаження...` / `Cargando...`.
  - Fix: quiz phrases are already prefetched from layout; render the quiz shell or a stable empty state until data arrives.

- `app/review.tsx`
  - Text fallback `Загрузка...`.
  - Fix: show review empty/done state while queue hydrates.

- `app/trainer.tsx`
  - Trainer hub card spinner.
  - Fix: render hub with counts as cached/zero, then refresh.

- `app/trainer_smart_session.tsx`
  - Initial session spinner and "impact" spinner.
  - Fix: build queue before navigation where possible; otherwise render session shell/empty state. Keep impact area stable and update score silently.

- `app/trainer_words_session.tsx`, `app/trainer_phrases_session.tsx`, `app/trainer_arena_session.tsx`
  - Loading branches gate the session.
  - Fix: compute queue before route push or render a stable empty/done state.

### Stats / Progress

- `app/streak_stats.tsx`
  - Initial stats/chart loading indicators and localized loading text.
  - Fix: render cached stats immediately; chart cards should keep previous series or show blank axes/locked teaser state while lifetime data refreshes.

- `components/ActivityHeatmap365.tsx`
  - Returns a card with small spinner until analytics is loaded.
  - Fix: render an empty heatmap grid using zero values, then merge analytics when ready.

- `app/phrase_analytics_screen.tsx`
  - Initial analytics spinner.
  - Fix: render cached/empty analytics dashboard immediately.

### Shop / Monetization / Modals

- `app/shards_shop.tsx`
  - Price loading text, market loading spinners, and purchase/action spinners.
  - Fix: show cached price/pack state. If price is not ready, keep CTA disabled with stable label, not "Загрузка цен".

- `app/flashcards_collection.tsx`
  - Has loading state; no `ActivityIndicator` hit in the current grep, but must be checked visually because it gates marketplace/collection state.
  - Fix: keep collection tiles visible using cached packs/cards or empty categories.

- `app/flashcards/CardPackShardPaywallModal.tsx`
  - Purchase buttons show spinners.
  - Fix: keep CTA text stable and disable/opacity during purchase.

- `app/premium_modal.tsx`, `components/MasteryReplayModal.tsx`, `components/StreakReviveModal.tsx`, `components/NoEnergyModal.tsx`, `components/EnergyRefillShardModal.tsx`, `components/ArenaLimitModal.tsx`
  - Action buttons swap to spinners.
  - Fix: keep labels/icons, disable during purchase/spend action, report result via toast/modal state.

- `app/pack_opening.tsx`
  - Has explicit Loading/Error section.
  - Fix: pack opening should not navigate until pack data is resolved, or it should render the pack-opening shell with cached/default pack metadata.

### Auth / Onboarding / Account Actions

- `components/onboarding.tsx`
  - Provider buttons show spinners while auth runs.
  - Fix: keep provider icon/text and disable all auth buttons during provider action.

- `components/AuthProviderButtons.tsx`
  - Same provider-button spinner pattern.
  - Fix: stable provider buttons with disabled/opacity.

- `components/RegistrationPromptModal.tsx`
  - Uses loading provider state; inspect visual render before patching.

- `components/GlobalBroadcastModal.tsx`, `components/ReleaseWaveBonusModal.tsx`, `app/settings_invite_friend.tsx`, `components/ReportUserModal.tsx`, `components/ReportPackModal.tsx`, `components/PlayerProfileModal.tsx`, `components/ui/PrimaryButton.tsx`
  - Action-level spinners.
  - Fix: keep visible command stable while async work runs.

### Main Tabs / Settings / Avatar / Daily

- `app/(tabs)/home.tsx`
  - Large spinner in home modal/subsection.
  - Fix: keep home card visible with cached user state.

- `app/(tabs)/settings.tsx`
  - Large spinner in settings action/subsection.
  - Fix: stable settings screen; disable relevant action.

- `app/avatar_select.tsx`
  - Full-screen spinner while avatar data loads.
  - Fix: render avatar grid immediately with defaults/local cache.

- `app/daily_tasks_screen.tsx`
  - Initial large spinner and claim/action spinners.
  - Fix: show cached/deterministic daily tasks immediately; background-refresh cloud claims.

- `app/community_pack_create.tsx`
  - Editor/submit spinners.
  - Fix: keep editor visible; disable submit action with stable label.

## Dev/Admin-Only Findings

These are visible only to internal/dev surfaces and can be lower priority unless they leak into production navigation:

- `app/_admin_audio_debug.tsx`
- `app/_pos_analytics_audit.tsx`
- `app/_admin_review_test.tsx`
- `app/flashcards_market_dev.tsx`
- `admin/index.html`

## Recommended Implementation Order

1. Patch high-visibility product surfaces: `LeagueChatPanel`, `arena_leaderboard`, `friends_screen`, `app/(tabs)/friends`, `shards_shop`, `streak_stats`.
2. Patch route-gating screens: `lesson1`, `quizzes`, `review`, trainer session files, arena join/game/rating.
3. Patch all action-button spinners by centralizing button behavior in `PrimaryButton` and applying the same stable-command pattern to custom buttons.
4. Add a CI guard: fail on new `ActivityIndicator`, `Loading...`, `Загрузка`, `Завантаження`, `Cargando`, `Suspense fallback` in product files unless allowlisted as admin/dev.

## Safe Rule For Future Work

No product component should return a loading branch as its first visible state. Components should have one of these states instead:

- cached content, then background refresh;
- deterministic empty content, then background fill;
- stable disabled control while action is in flight;
- native splash/first-frame hold only during app startup;
- silent background prefetch before navigating to data-dependent screens.

## Second-Pass Cleanup

After removing `ActivityIndicator`, audit also covered non-spinner loading affordances:

- busy labels in buttons (`...`, "processing", "restoring", "preparing", "activating");
- arena fallback copy such as "loading questions", "connecting", "waiting for opponent";
- profile/settings placeholder ellipses used while remote profile data hydrates;
- purchase/toast copy that told the user work was still happening after confirmation.

Product UI should treat these the same as spinners: keep the command label, cached value, neutral title, or final confirmed state visible while async work continues.
