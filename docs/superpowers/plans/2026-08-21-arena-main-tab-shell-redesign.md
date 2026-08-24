# Arena Main Tab Shell Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Arena a real main-tab page with a dense hub, one centered Play entry point, an overflow sheet for secondary destinations, direct match-review navigation, the existing Season Pass, and complete rank-up/rank-down presentation without regressing Arena warm loading.

**Architecture:** Move the URL-transparent `/arena` route from the root stack into the existing `(tabs)` group and add Arena to the five-page tab model. Keep match, matchmaking, results, ranks, tops, history, review, wallet, and Season Pass as pushed full-screen routes. Extract the Arena hub into a focused surface that owns its existing warm snapshot/hydration behavior and opens two bottom sheets: match modes and secondary destinations.

**Tech Stack:** Expo Router, React Native, TypeScript, React Native Reanimated, Jest, React Native Testing Library, existing Arena client/cache/rank modules.

---

## Scope and file responsibilities

- `app/(tabs)/_layout.tsx`: five-page swipe/tab shell, deferred Arena page, runtime ownership, background premount.
- `app/tab_page_model.ts`: canonical `home → lessons → arena → friends → settings` index model.
- `app/(tabs)/arena.tsx`: thin URL-transparent `/arena` route wrapper.
- `components/arena/ArenaHubSurface.tsx`: Arena hub orchestration, warm data, dense content, mode sheet, overflow sheet.
- `components/arena/ArenaHubSummary.tsx`: presentational current-rank and real-stat summary.
- `components/arena/ArenaHubOverflowSheet.tsx`: accessible secondary-action bottom sheet.
- `modules/arena/hub_nav.ts`: pure mode action and overflow destination models; no private Arena tabs.
- `app/arena_ranks.tsx`: personal progression only.
- `app/arena_tops.tsx`: friend comparison and percentile only.
- `app/arena_history.tsx`: receipt list with exact-review navigation.
- `app/arena_season_pass.tsx`: compatibility redirect to `/season_pass`.
- `modules/arena/result_view.ts`: trustworthy before/after rank transition model.
- `components/arena/ArenaRankHybrid.tsx`: unified four-event rank transition presentation using current rank visuals.
- `app/arena_results.tsx`: mount the correct transition for all four rank events.
- `docs/arena/OWNER_DECISIONS.md`: record the owner-approved navigation and rank-animation decision.

The checkout is intentionally not moved to a worktree because project rules forbid a new branch/worktree without an explicit owner request. Existing user edits in protected Arena files must be preserved. Implementation commits are optional checkpoints only after reviewing staged hunks; never commit unrelated staged Avatar DNA work.

### Task 1: Make Arena a canonical fifth main tab

**Files:**
- Modify: `app/tab_page_model.ts`
- Modify: `tests/tab_page_model.test.ts`
- Modify: `tests/perf_freeze_contract.test.ts`
- Create: `tests/arena_main_tab_shell_contract.test.ts`
- Modify: `app/(tabs)/_layout.tsx`
- Create: `app/(tabs)/arena.tsx`
- Delete after the route move: `app/arena.tsx`

- [ ] **Step 1: Write the failing tab-model tests**

Assert the exact page identity and reversible index mapping:

```ts
expect(LOGICAL_TAB_IDS).toEqual(['home', 'lessons', 'arena', 'friends', 'settings']);
expect(PHYSICAL_PAGE_IDS).toEqual(LOGICAL_TAB_IDS);
for (const index of [0, 1, 2, 3, 4]) {
  expect(physicalPageToLogicalTab(logicalTabToPhysicalPage(index))).toBe(index);
}
expect(physicalPageToRuntimeOwner(2)).toBe('arena');
expect(() => logicalTabToPhysicalPage(5)).toThrow(RangeError);
```

Add a source contract that requires a deferred Arena loader, an actual Arena page in `tabScreens`, `/arena` path mapping, and no external `logicalIdx: -1` Arena entry:

```ts
expect(layout).toContain("const loadArenaTabModule = () => import('./arena')");
expect(layout).toContain("arena: '/arena'");
expect(layout).toContain("runtimeOwnerId === 'arena'");
expect(layout).not.toMatch(/id:\s*'arena'[\s\S]{0,220}logicalIdx:\s*-1/);
expect(fs.existsSync(path.join(ROOT, 'app/(tabs)/arena.tsx'))).toBe(true);
```

- [ ] **Step 2: Run the red tests**

Run:

```powershell
npx jest --runInBand --no-cache --runTestsByPath tests/tab_page_model.test.ts tests/perf_freeze_contract.test.ts tests/arena_main_tab_shell_contract.test.ts
```

Expected: FAIL because Arena is still an external tabbar entry and the tab model has four pages.

- [ ] **Step 3: Extend the pure tab model**

Use one source of truth and inferred numeric index unions:

```ts
export const LOGICAL_TAB_IDS = ['home', 'lessons', 'arena', 'friends', 'settings'] as const;
export const PHYSICAL_PAGE_IDS = [...LOGICAL_TAB_IDS] as const;
export type LogicalTabIndex = 0 | 1 | 2 | 3 | 4;
export type PhysicalPageIndex = 0 | 1 | 2 | 3 | 4;
```

- [ ] **Step 4: Convert the tab shell to five real pages**

In `app/(tabs)/_layout.tsx`:

```ts
const loadArenaTabModule = () => import('./arena');
const DeferredArenaScreen = React.lazy(loadArenaTabModule);

const BACKGROUND_TAB_PREMOUNT_ORDER = [1, 2, 3, 4] as const;

const SEGMENT_TO_TAB_IDX: Record<string, number> = {
  home: 0,
  lessons: 1,
  arena: 2,
  friends: 3,
  settings: 4,
};
```

Insert Arena as the middle item of `TABS`, derive `TAB_BAR_TABS` directly from `TABS`, and remove the synthetic external Arena insertion and its `route`/`center` branch. Shift friends/settings pages to indices 3/4. Add a deferred Arena page whose owner gate is explicit:

```tsx
<DeferredTabPage visible={runtimeOwnerId === 'arena'}>
  <DeferredArenaScreen ownerVisible={runtimeOwnerId === 'arena'} />
</DeferredTabPage>
```

Keep `TabSlider`, `react-freeze`, deferred loading, and background premount intact.

- [ ] **Step 5: Move `/arena` into the tab route group**

Create a thin route:

```tsx
import React from 'react';
import { useTabNav } from './_layout';
import { ArenaHubSurface } from '../../components/arena/ArenaHubSurface';

export default function ArenaTabRoute() {
  const { runtimeOwnerId } = useTabNav();
  return <ArenaHubSurface ownerVisible={runtimeOwnerId === 'arena'} />;
}
```

Move the current hub implementation out of `app/arena.tsx` into `ArenaHubSurface` in Task 2, then delete `app/arena.tsx`. Expo Router groups are URL-transparent, so `/arena` remains the public URL and no redirect route is needed.

- [ ] **Step 6: Run the tab-shell tests**

Run the command from Step 2.

Expected: PASS; Arena is page index 2, five pages are mapped, and the runtime owner is `arena` only on the Arena page.

- [ ] **Step 7: Checkpoint only owned hunks**

Review:

```powershell
git diff -- app/tab_page_model.ts 'app/(tabs)/_layout.tsx' 'app/(tabs)/arena.tsx' tests/tab_page_model.test.ts tests/perf_freeze_contract.test.ts tests/arena_main_tab_shell_contract.test.ts
```

Expected: only the five-tab conversion and its tests. Do not commit if the diff includes pre-existing user hunks that cannot be isolated safely.

### Task 2: Extract the warm Arena hub and build dense layout C

**Files:**
- Create: `components/arena/ArenaHubSurface.tsx`
- Create: `components/arena/ArenaHubSummary.tsx`
- Create: `components/arena/ArenaHubOverflowSheet.tsx`
- Modify: `components/arena/ArenaModeSheet.tsx`
- Modify: `modules/arena/hub_nav.ts`
- Modify: `tests/arena_screen_offline_first.test.ts`
- Create: `tests/arena_hub_surface_contract.test.ts`
- Modify: `tests/arena_hub_nav.test.ts`

- [ ] **Step 1: Write failing pure navigation tests**

Replace private-tab expectations with these invariants:

```ts
expect(arenaHubOverflowChoices('m-42')).toEqual([
  expect.objectContaining({ key: 'ranks', route: '/arena_ranks' }),
  expect.objectContaining({ key: 'tops', route: '/arena_tops' }),
  expect.objectContaining({ key: 'season', route: '/season_pass' }),
  expect.objectContaining({ key: 'history', route: '/arena_history' }),
  expect.objectContaining({ key: 'review', route: { pathname: '/arena_review', params: { matchId: 'm-42' } } }),
  expect.objectContaining({ key: 'wallet', route: '/arena_star_wallet' }),
]);
expect(arenaHubOverflowChoices(null).find((row) => row.key === 'review')?.disabled).toBe(true);
```

Keep existing `arenaMatchButtonAction` tests for resume-match, resume-queue, and open-mode-sheet precedence.

- [ ] **Step 2: Run the red hub tests**

Run:

```powershell
npx jest --runInBand --no-cache --runTestsByPath tests/arena_hub_nav.test.ts tests/arena_hub_surface_contract.test.ts tests/arena_screen_offline_first.test.ts
```

Expected: FAIL because private tabs still own the mode sheet and no overflow model/surface exists.

- [ ] **Step 3: Replace private-tab navigation with a pure overflow model**

Keep `arenaModeChoices`, `arenaMatchButtonAction`, and request parameters. Remove `ARENA_HUB_ROUTES`, `ARENA_HUB_TAB_CHOICES`, `arenaHubTabForRoute`, and private-tab padding. Add:

```ts
export type ArenaOverflowKey = 'ranks' | 'tops' | 'season' | 'history' | 'review' | 'wallet';

export function arenaHubOverflowChoices(latestMatchId: string | null) {
  return [
    { key: 'ranks', icon: 'podium-outline', label: 'ranks', route: '/arena_ranks', disabled: false },
    { key: 'tops', icon: 'trophy-outline', label: 'topsTab', route: '/arena_tops', disabled: false },
    { key: 'season', icon: 'star-outline', label: 'season', route: '/season_pass', disabled: false },
    { key: 'history', icon: 'time-outline', label: 'historyTab', route: '/arena_history', disabled: false },
    {
      key: 'review', icon: 'search-outline', label: 'reviewTitle',
      route: latestMatchId ? { pathname: '/arena_review', params: { matchId: latestMatchId } } : null,
      disabled: !latestMatchId,
    },
    { key: 'wallet', icon: 'sparkles-outline', label: 'starWalletTitle', route: '/arena_star_wallet', disabled: false },
  ] as const;
}
```

- [ ] **Step 4: Make enabled mode rows title-only**

Change `ArenaModeOption.body` to optional and render/accessibility-concatenate it only when truthy:

```tsx
{option.body ? <Text style={[styles.body, bodyLine, { color: P.muted }]}>{option.body}</Text> : null}
```

For enabled modes pass no body. For disabled modes pass only the truthful `modeArenaOff` or `modeOff` reason. Keep the mode badge/cost and the existing animated close contract.

- [ ] **Step 5: Build a generic-looking but Arena-owned overflow sheet**

`ArenaHubOverflowSheet` must use an RN `Modal`, the same mounted-until-exit pattern as `ArenaModeSheet`, `useReduceMotion`, a maximum width of 620, safe-area padding, and 44-point minimum rows. Its public props are:

```ts
type ArenaHubOverflowSheetProps = Readonly<{
  visible: boolean;
  latestMatchId: string | null;
  onNavigate: (target: string | { pathname: string; params: { matchId: string } }) => void;
  onClose: () => void;
}>;
```

Disabled latest-review rows remain visible and explain that no match review is available; enabled rows contain only icon and title.

- [ ] **Step 6: Extract current hub orchestration without changing its data lifecycle**

Move the state/effects/rendering from the current `app/arena.tsx` into:

```ts
export function ArenaHubSurface({ ownerVisible }: Readonly<{ ownerVisible: boolean }>) {
  const runtimeActive = useRuntimeActive(ownerVisible);
  // Preserve arenaPeekHomeWarm → arenaLoadHomeWarm → silent arenaV2Home refresh.
  // Preserve one-shot history/friends loading, outbox flush, intro, offline state,
  // active match/queue resume, Arena Today, daily goals, and expansion wallet state.
}
```

Every network effect that currently checks `runtimeActive` must continue to do so. Do not add intervals, listeners, duplicate `arenaV2Home` calls, or a second history fetch. Derive `latestMatchId` from the already loaded newest history receipt.

- [ ] **Step 7: Build dense summary and central Play layout**

`ArenaHubSummary` receives only display data:

```ts
type ArenaHubSummaryProps = Readonly<{
  rank: ArenaRankView | null;
  wins: number | null;
  losses: number | null;
  streak: number | null;
  winRate: number | null;
}>;
```

Render current rank prominently, then a compact two-column/four-cell stat grid using only real loaded values; unknown values are `—`, never zero. On the hub, keep Arena Today and daily goals, remove the duplicate Quick Match card, add a top-right accessible `⋯` button, and place one large centered `Играть` button. Accent green uses dark text/icon.

- [ ] **Step 8: Wire Play and overflow actions**

On Play, call `arenaMatchButtonAction` first. Resume active match/queue immediately; otherwise open `ArenaModeSheet`. On overflow navigation, close the sheet before `router.push`. Use the latest loaded history receipt for `/arena_review?matchId=...`.

- [ ] **Step 9: Run hub tests**

Run the command from Step 2.

Expected: PASS, including offline-first warm render, one home request while active, title-only enabled modes, no duplicate Quick card, and exact latest-review routing.

### Task 3: Remove the Arena-private tabbar while preserving pushed screens

**Files:**
- Delete: `components/arena/ArenaTabBar.tsx`
- Delete: `components/arena/ArenaHubChrome.tsx`
- Modify: `app/arena_ranks.tsx`
- Modify: `app/arena_tops.tsx`
- Modify: `app/arena_history.tsx`
- Modify: `app/arena_star_wallet.tsx`
- Modify: `app/arena_season_pass.tsx`
- Modify: `tests/arena_chrome_layout.test.ts`
- Modify: `tests/arena_hub_chrome_fetch.test.ts`
- Modify: `tests/arena_owner_requested_ui_contract.test.ts`

- [ ] **Step 1: Replace old chrome tests with absence contracts**

Assert pushed routes do not mount the main tabbar or the removed private chrome:

```ts
for (const route of ['app/arena_ranks.tsx', 'app/arena_tops.tsx', 'app/arena_history.tsx', 'app/arena_star_wallet.tsx']) {
  const source = read(route);
  expect(source).not.toContain('ArenaHubChrome');
  expect(source).not.toContain('ArenaTabBar');
}
expect(fs.existsSync(path.join(ROOT, 'components/arena/ArenaTabBar.tsx'))).toBe(false);
```

- [ ] **Step 2: Run the red chrome tests**

Run:

```powershell
npx jest --runInBand --no-cache --runTestsByPath tests/arena_chrome_layout.test.ts tests/arena_hub_chrome_fetch.test.ts tests/arena_owner_requested_ui_contract.test.ts
```

Expected: FAIL because the private chrome and tabbar still exist.

- [ ] **Step 3: Unwrap pushed screens and restore local safe-area ownership**

Remove `ArenaHubChrome` imports/wrappers from the four pushed screens. Each screen keeps its existing background, `ArenaScreen`, scroll behavior, back button, loading/failure state, and data request. Replace `useArenaChromeInset()` with `Math.max(insets.bottom, 16)` where a bottom content inset is required.

- [ ] **Step 4: Delete obsolete private chrome components**

Delete `ArenaTabBar.tsx` and `ArenaHubChrome.tsx` only after all imports are gone:

```powershell
rg -n "ArenaHubChrome|ArenaTabBar" app components modules tests -g "*.ts" -g "*.tsx"
```

Expected: matches only in deliberate negative test strings; no runtime import.

- [ ] **Step 5: Run the chrome tests**

Run the command from Step 2.

Expected: PASS; only the hub has the main tabbar, while pushed Arena routes remain full-screen.

### Task 4: Separate Ranks from Tops and make every history row reviewable

**Files:**
- Modify: `app/arena_ranks.tsx`
- Modify: `app/arena_history.tsx`
- Modify: `tests/arena_rank_view.test.ts`
- Modify: `tests/arena_load_state.test.ts`
- Create: `tests/arena_history_review_navigation.test.ts`

- [ ] **Step 1: Write failing responsibility/navigation tests**

```ts
const ranks = read('app/arena_ranks.tsx');
expect(ranks).not.toContain('arenaFetchFriendsLeaderboard');
expect(ranks).not.toContain('friends.map');

const history = read('app/arena_history.tsx');
expect(history).toContain("pathname: '/arena_review'");
expect(history).toContain('params: { matchId: row.matchId }');
expect(history).toContain("accessibilityRole=\"button\"");
```

- [ ] **Step 2: Run the red focused tests**

Run:

```powershell
npx jest --runInBand --no-cache --runTestsByPath tests/arena_rank_view.test.ts tests/arena_load_state.test.ts tests/arena_history_review_navigation.test.ts
```

Expected: FAIL because Ranks still fetches friends and history cards are not pressable.

- [ ] **Step 3: Remove friend comparison from Ranks only**

Delete the friends fetch/state/table from `app/arena_ranks.tsx`. Preserve personal current rank, ladder, progress, season-best data, warm-home behavior, error state, and rank assets. Do not change `app/arena_tops.tsx`; it remains the sole friend comparison/percentile screen.

- [ ] **Step 4: Route each history receipt to its exact review**

Wrap each history card with a 44-point `PressableHybrid` or `Pressable`:

```tsx
onPress={() => router.push({
  pathname: '/arena_review',
  params: { matchId: row.matchId },
} as never)}
accessibilityRole="button"
accessibilityLabel={`${row.opponentName}. ${row.resultLabel}`}
```

Do not change the history default limit of 30 or the lab storage collection. The review remains one document per match and expires according to the server TTL.

- [ ] **Step 5: Run the focused tests**

Run the command from Step 2.

Expected: PASS; Ranks is personal-only and every history row opens its own review.

### Task 5: Route Arena Season to the existing Season Pass

**Files:**
- Modify: `app/arena_season_pass.tsx`
- Modify: `modules/arena/hub_nav.ts`
- Modify: `tests/arena_expansion_state.test.ts`
- Modify: `tests/arena_v2_integration_contract.test.ts`
- Create: `tests/arena_season_pass_route.test.ts`

- [ ] **Step 1: Write the failing redirect test**

```ts
const source = read('app/arena_season_pass.tsx');
expect(source).toContain("<Redirect href=\"/season_pass\"");
expect(source).not.toContain('arenaClaimSeasonReward');
expect(arenaHubOverflowChoices(null).find((row) => row.key === 'season')?.route).toBe('/season_pass');
```

- [ ] **Step 2: Run the red season tests**

Run:

```powershell
npx jest --runInBand --no-cache --runTestsByPath tests/arena_expansion_state.test.ts tests/arena_v2_integration_contract.test.ts tests/arena_season_pass_route.test.ts
```

Expected: FAIL because the Arena-specific season screen still owns reward UI.

- [ ] **Step 3: Replace the obsolete surface with a compatibility redirect**

```tsx
import React from 'react';
import { Redirect } from 'expo-router';

export default function ArenaSeasonPassCompatibilityRoute() {
  return <Redirect href="/season_pass" />;
}
```

This preserves old deep links while removing duplicate season behavior. Remove tests that asserted Arena-specific claiming UI; retain tests for the underlying expansion client/state modules if they are used elsewhere.

- [ ] **Step 4: Run the season tests**

Run the command from Step 2.

Expected: PASS; menu and legacy deep link both land on the existing Season Pass.

### Task 6: Build a trustworthy before/after rank transition model

**Files:**
- Modify: `modules/arena/result_view.ts`
- Modify: `tests/arena_result_view.test.ts`

- [ ] **Step 1: Write failing four-event transition tests**

Add `ratingAfter` to the reward fixture and assert exact views:

```ts
const up = arenaResultAnnounce(reward({ rankEvent: 'rank_up', ratingAfter: 300, ratingDelta: 20 }));
expect(up.rank).toMatchObject({
  kind: 'rank_up',
  before: { rankIndex: 2, division: 1 },
  after: { rankIndex: 3, division: 3 },
});

const down = arenaResultAnnounce(reward({ rankEvent: 'rank_down', ratingAfter: 299, ratingDelta: -20 }));
expect(down.rank).toMatchObject({
  kind: 'rank_down',
  before: { rankIndex: 3, division: 3 },
  after: { rankIndex: 2, division: 1 },
});
```

Add equivalent `tier_up` and `tier_down` cases and require `{ kind: 'none' }` when `ratingAfter` is missing/non-finite or the claimed event disagrees with the derived direction.

- [ ] **Step 2: Run the red result-model tests**

Run:

```powershell
npx jest --runInBand --no-cache --runTestsByPath tests/arena_result_view.test.ts
```

Expected: FAIL because rank events currently carry no before/after rank views.

- [ ] **Step 3: Derive both endpoints from authoritative reward numbers**

Define:

```ts
export type ArenaRankTransition = Readonly<{
  kind: 'rank_up' | 'rank_down' | 'tier_up' | 'tier_down';
  before: ArenaRankView;
  after: ArenaRankView;
}>;

function rankTransition(row: Record<string, unknown>): ArenaRankTransition | null {
  if (typeof row.ratingAfter !== 'number' || !Number.isFinite(row.ratingAfter)) return null;
  if (typeof row.ratingDelta !== 'number' || !Number.isFinite(row.ratingDelta)) return null;
  const after = arenaRankView(row.ratingAfter);
  const before = arenaRankView(row.ratingAfter - row.ratingDelta);
  const derived = after.tierIndex > before.tierIndex ? 'tier_up'
    : after.tierIndex < before.tierIndex ? 'tier_down'
    : after.rankIndex > before.rankIndex ? 'rank_up'
    : after.rankIndex < before.rankIndex ? 'rank_down'
    : null;
  return derived && row.rankEvent === derived ? { kind: derived, before, after } : null;
}
```

Use this result for `rank`; never invent an endpoint from `rankTierBefore`/`rankTierAfter` alone.

- [ ] **Step 4: Run the result-model tests**

Run the command from Step 2.

Expected: PASS for all four transitions and fail-closed malformed rewards.

### Task 7: Restore rank-up and rank-down choreography for all four events

**Files:**
- Modify: `components/arena/ArenaRankHybrid.tsx`
- Modify: `app/arena_results.tsx`
- Modify: `modules/arena/copy.ts`
- Modify: `tests/arena_owner_requested_ui_contract.test.ts`
- Create: `tests/arena_rank_transition_ui.test.ts`

- [ ] **Step 1: Write failing UI contracts**

```ts
const results = read('app/arena_results.tsx');
for (const kind of ['rank_up', 'rank_down', 'tier_up', 'tier_down']) {
  expect(results).toContain(`announce.rank.kind === '${kind}'`);
}

const motion = read('components/arena/ArenaRankHybrid.tsx');
expect(motion).toContain('useReduceMotion');
expect(motion).not.toContain('Math.random');
expect(motion).not.toMatch(/[😀-🙏🌀-🫿]/u);
expect(motion).toContain('ARENA_TIER_KEYS');
```

Also assert eight-locale keys exist for promotion and demotion titles/body text.

- [ ] **Step 2: Run the red rank UI tests**

Run:

```powershell
npx jest --runInBand --no-cache --runTestsByPath tests/arena_rank_transition_ui.test.ts tests/arena_owner_requested_ui_contract.test.ts tests/arena_result_view.test.ts
```

Expected: FAIL because results mount full presentation only for tier events.

- [ ] **Step 3: Normalize the hybrid component around one transition prop**

Expose:

```ts
export type ArenaRankChangeHybridProps = Readonly<{
  transition: ArenaRankTransition;
  starsAwarded: number;
  chestUnlocked: boolean;
  onDone?: () => void;
}>;
```

Use `transition.before` and `transition.after` for tier/division labels. Keep current `RankShield`, palette, sound hooks, haptics, deterministic `DUST_INDICES`, and cancel animations on unmount. Promotion uses staged halo/card entry, upward particles, success sound/haptic, and a bright resolve. Demotion uses a short settle/downward particle pass, warning haptic, no triumphant fanfare, and neutral retry copy. Division transitions are smaller than tier transitions.

- [ ] **Step 4: Make reduced motion explicit**

Call `useReduceMotion()` inside the public component and make reduced motion immediately reveal the final card state with no delayed particle travel. Do not use repeating ambient loops. All accent-filled CTAs use the palette's dark accent foreground.

- [ ] **Step 5: Add localized copy**

Add the same semantic keys for all eight Arena locales: rank gained, rank lost, tier gained, tier lost, before/after separator, continue/retry. Reuse tier names and Roman divisions from current rank copy rather than hardcoded English names.

- [ ] **Step 6: Mount the unified component on results**

```tsx
{announce.rank.kind !== 'none' ? (
  <ArenaRankChangeHybrid
    transition={announce.rank}
    starsAwarded={announce.starsEarned}
    chestUnlocked={announce.unlockedItemIds.length > 0}
  />
) : null}
```

Remove the older results-only tier branching and text-only rank branching. Preserve result reporting, rewards, sound delivery, match score, and navigation buttons.

- [ ] **Step 7: Run the rank UI tests**

Run the command from Step 2.

Expected: PASS; all four events use one truthful before/after transition and reduced motion has an immediate final state.

### Task 8: Update owner records and run deterministic Arena gates

**Files:**
- Modify: `docs/arena/OWNER_DECISIONS.md`
- Modify if required by route assertions: `tests/navigation_back.test.ts`
- Modify if required by route registry: `tests/product_analytics_screen_registry.test.ts`

- [ ] **Step 1: Record the owner decision**

Append a dated decision stating:

```md
- Arena is the center page of the main five-tab shell at `/arena`.
- The main tabbar is visible only on the Arena hub; matchmaking, match, results,
  ranks, tops, history, review, wallet, and Season Pass are pushed full-screen.
- The hub has one centered Play CTA and one top-right overflow sheet.
- Ranks means personal progression; Tops means friend comparison/percentile.
- The Arena-specific season UI is retired in favor of `/season_pass`.
- Every history receipt opens its own stored review; the latest-review shortcut
  uses the newest already-loaded receipt. Match labs retain the existing 30-day TTL.
- All four rank events use current rank data/assets and accessible reduced motion.
```

- [ ] **Step 2: Update navigation fallback expectations**

Keep `/arena` as the fallback for Arena detail routes and ensure back from `/arena` returns naturally through the main tabs. Do not add `/arena_season_pass` as a primary destination; it is only a redirect compatibility route.

- [ ] **Step 3: Run focused functional tests**

Run:

```powershell
npx jest --runInBand --no-cache --runTestsByPath tests/tab_page_model.test.ts tests/perf_freeze_contract.test.ts tests/arena_main_tab_shell_contract.test.ts tests/arena_hub_nav.test.ts tests/arena_hub_surface_contract.test.ts tests/arena_screen_offline_first.test.ts tests/arena_history_review_navigation.test.ts tests/arena_rank_view.test.ts tests/arena_load_state.test.ts tests/arena_season_pass_route.test.ts tests/arena_result_view.test.ts tests/arena_rank_transition_ui.test.ts tests/navigation_back.test.ts
```

Expected: all suites PASS with zero leaked handles.

- [ ] **Step 4: Run the Arena regression set**

Run:

```powershell
npx jest --runInBand --no-cache --testPathPattern="tests/arena_"
```

Expected: all Arena suites PASS. If a legacy source contract encodes the removed private tabbar or Arena-specific season screen, update that contract to the approved owner decision; do not weaken data, economy, offline, or matchmaking assertions.

- [ ] **Step 5: Run scoped lint/type checks**

Run:

```powershell
npx eslint 'app/(tabs)/_layout.tsx' 'app/(tabs)/arena.tsx' app/arena_history.tsx app/arena_ranks.tsx app/arena_results.tsx app/arena_season_pass.tsx components/arena/ArenaHubSurface.tsx components/arena/ArenaHubSummary.tsx components/arena/ArenaHubOverflowSheet.tsx components/arena/ArenaModeSheet.tsx components/arena/ArenaRankHybrid.tsx modules/arena/hub_nav.ts modules/arena/result_view.ts
npx tsc --noEmit --pretty false
```

Expected: exit code 0. If the whole-project typecheck reports unrelated pre-existing failures, save the full log under `.codex-tmp/arena-main-tab/typecheck.log` and report only failures in changed files.

- [ ] **Step 6: Verify protected-file and deletion boundaries**

Run:

```powershell
rg -n "ArenaHubChrome|ArenaTabBar" app components modules -g "*.ts" -g "*.tsx"
rg -n "arenaV2Home\(|setInterval|forceRemote" components/arena/ArenaHubSurface.tsx
git diff --check
git status --short
```

Expected: no runtime private-tab imports; hub contains the existing bounded home refresh and no interval; `git diff --check` exits 0; unrelated user changes remain present and unmodified.

- [ ] **Step 7: Manual smoke test in the running app**

Verify at `http://localhost:54002/` or the active native target:

1. Main tabs show Home, Lessons, Arena, Friends, Settings; Arena is centered and selected without a root-stack jump.
2. Switching away freezes/stops Arena refresh work; returning paints warm data before silent refresh.
3. Hub shows rank, real stats, Arena Today, goals, one Play CTA, and `⋯`; no Quick Match duplicate or private Arena tabbar exists.
4. Play resumes an active match/queue before offering modes; enabled rows have no explanatory subtitle.
5. Overflow opens Ranks, Tops, existing Season Pass, History, latest Review, and wallet/spin.
6. Matchmaking, match, results, and detail screens are full-screen without the main tabbar.
7. A history row opens its own review.
8. Rank up, rank down, tier up, and tier down show correct before/after labels; Reduce Motion removes travel/particle animation.

Expected: every item behaves as described and no duplicate network request appears in the console.

## Self-review result

- Spec coverage: main-tab ownership, cache/performance preservation, dense layout C, one Play CTA, overflow destinations, existing Season Pass, Ranks/Tops separation, exact review navigation/storage truth, and four rank transitions are each mapped to a task.
- Placeholder scan: no deferred implementation markers or unspecified error-handling steps remain.
- Type consistency: `ArenaOverflowKey`, `arenaHubOverflowChoices`, `ArenaRankTransition`, `ArenaHubSurface.ownerVisible`, and the unified rank component names are consistent across tasks.
- Router correction: the plan explicitly moves, rather than duplicates, `/arena` because route groups do not alter the URL.
