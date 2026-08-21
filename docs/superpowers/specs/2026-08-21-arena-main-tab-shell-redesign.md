# Arena as a first-class main tab — design

Date: 2026-08-21  
Status: owner-approved design

## Goal

Make Arena feel like a native part of the app's primary navigation while
preserving its existing warm-cache, silent refresh, match entry, and immersive
gameplay behavior.

The Arena hub becomes the fifth real page of the main tab shell. The main app
tab bar remains visible on the hub. Matchmaking, the match itself, and results
remain full-screen routes without any tab bar.

## Owner-approved outcomes

- Use the dense dashboard direction (visual option C).
- Keep current rank, Arena Today, daily goals, and a large central `Играть`
  action visible on the hub.
- Remove Arena's separate bottom tab bar.
- Remove the duplicate `Быстрый матч` row from the hub.
- Remove secondary mode descriptions such as opponent-level and no-reward
  explanations. A disabled mode may still show the truthful reason it is
  unavailable.
- Move Arena navigation into a top-right `⋯` bottom sheet.
- Replace Arena's separate season screen with the existing app Season Pass.
- Restore the old Arena rank-change choreography, adapted to the current rank
  model and current safety/accessibility requirements.

## Navigation architecture

### Main tab shell

Arena becomes a real logical and physical page in `app/(tabs)/_layout.tsx` and
`app/tab_page_model.ts`. The target order is:

1. Home
2. Lessons
3. Arena
4. Friends
5. Settings

The center Arena button no longer pushes `/arena`. It selects the Arena page
in the existing `TabSlider`, receives normal selected-tab semantics, and uses
the same highlight and press motion as the other tabs.

The Arena module participates in the existing deferred module loading,
background pre-mount, visited-page lifetime, and `react-freeze` policy. It must
not create a second tab shell or independently reproduce the main tab bar.

The old `/arena` route remains as a compatibility redirect to
`/(tabs)/arena`. Existing notifications, deep links, and older callers must not
land on a missing route.

### Full-screen Arena routes

These flows remain outside the tab page and hide the main tab bar:

- matchmaking;
- friend-duel rendezvous;
- match;
- results;
- rank-change presentation shown from results.

Rank, Tops, Season Pass, History, and Review are normal push routes with a back
action that returns to the Arena hub. They do not render `ArenaTabBar`.

## Hub layout

The hub follows the selected dense dashboard direction while using only values
the client can source truthfully.

### Header

- Title: `Арена` in the active locale.
- Top-right icon-only `⋯` button with a minimum 44×44 touch target,
  accessibility label, pressed state, and stable reserved geometry.
- The existing Arena wallet header control is folded into the overflow sheet
  so the header has one clear secondary action.

### Rank summary

The first compact row shows:

- current tier and division;
- current rating;
- rating remaining to the next division, or the truthful top-rank state;
- current win count and streak only when those values are known.

Unknown values are not replaced with zero or a default Bronze rank. Warm data
may render immediately; otherwise the final geometry is reserved without a
visible loading label.

### Primary action

A large centered `Играть` button opens the existing Arena mode bottom sheet.
Its action retains the current resume priority:

1. resume an active match;
2. resume an active queue;
3. otherwise open mode selection.

The separate hub row for `Быстрый матч` is removed.

The mode sheet keeps Quick, Ranked, and Friend Duel. Each option shows its
name, icon, and task-count badge. Ordinary explanatory body text is removed.
If a mode is disabled, the row stays visible and replaces the missing body with
the truthful unavailable reason.

### Daily content

Arena Today and daily goals remain visible below the primary action. Existing
state, progress, continuation behavior, reward claims, offline handling, and
sound hooks are preserved.

An available Spin remains reachable from the overflow sheet rather than
creating another primary hub row.

## Overflow menu

The top-right `⋯` opens one accessible bottom sheet with these destinations:

1. `Ранги`
2. `Топы`
3. `Season Pass`
4. `История матчей`
5. `Разбор последнего матча`
6. Arena wallet
7. available Spin, when present

`Разбор последнего матча` uses the newest already-loaded history receipt. It
does not add a second history request. If there is no eligible match, the item
is disabled with a truthful empty-state reason.

The menu uses one icon family, minimum 44-point rows, visible pressed states,
and no explanatory paragraphs under enabled items.

## Rank and Tops semantics

The two destinations must no longer duplicate one another:

- `Ранги` is personal progression: current tier/division, rating progress,
  season/lifetime best, tier ladder, shields, and tier rewards.
- `Топы` is comparison: friends leaderboard and the player's percentile.

The friends leaderboard is removed from `arena_ranks.tsx`; it remains owned by
`arena_tops.tsx`.

## Season Pass cutover

The Arena-specific season screen is retired. Every current Arena menu entry
for season progression navigates to the existing `/season_pass` screen.

`/arena_season_pass` remains only as a compatibility redirect to
`/season_pass`; it contains no independent season UI, data fetch, wallet, or
claim behavior.

No Season Pass economy or data schema changes are part of this work.

## History and match reviews

Current storage behavior remains authoritative:

- history reads up to 30 recent `arena_v2_receipts` documents;
- every settled match stores its caller-private review at
  `users/{uid}/arena_v2_match_labs/{matchId}`;
- review documents expire after 30 days (`ARENA_LAB_TTL_MS`);
- this is one review per match, not one review total.

Each history row becomes a button that opens `/arena_review` with its own
`matchId`. Review loading keeps the memory/disk warm snapshot, account scope,
and bounded one-retry race handling already present.

## Rank-change presentation

### Source direction

Use the choreography of the deleted legacy
`app/components/RankChangeModal.tsx` (available before commit
`285ac732c7ff0049c7a8efaf8846670e2a0c4d6f`) as the visual reference:

- staged modal entrance;
- rotating/radiating rank halo;
- emblem reveal;
- rising energy shards for promotion;
- descending muted shards and a short controlled shake for demotion;
- decisive title, new rank label, and a single close action.

Do not restore the deleted source verbatim. It hard-coded a Gold image, used
random values during render, embedded emoji UI, and relied on obsolete
animation patterns.

### Current contract

The replacement consumes the current result reward:

- `ratingAfter` is the actual new rating;
- `ratingDelta` derives the actual previous rating;
- the existing rank engine derives before/after tier and division;
- `rankEvent` identifies `rank_up`, `rank_down`, `tier_up`, or `tier_down`.

All four transitions receive a visual scene. No rank or direction is guessed
when required server fields are absent.

The scene uses the real current rank asset rather than a fixed Gold asset,
keeps `rankUp`/`rankDown` sounds and success/warning haptics, supports all eight
UI locales, and exposes a clear accessibility announcement.

Particles are deterministic. Continuous work stops when the scene closes.
Animation uses transform and opacity. Reduced Motion shows the same result and
new rank with a short fade and no orbit, burst, shake, or particle travel.

The current `ArenaRankHybrid` result scenes are replaced by this unified
rank-change presentation rather than layered beneath it.

## Performance and data flow

The redesign must preserve the current hub hydration order:

1. synchronous in-memory warm snapshot;
2. reserved final geometry;
3. asynchronous disk warm snapshot only if it is better than current state;
4. silent network refresh when the Arena tab becomes runtime-active;
5. one-shot history and friends reads on activation, never a polling loop.

Background pre-mount loads and commits the Arena module but must not trigger
network work while the tab is inactive. `useRuntimeActive` continues to gate
refresh and outbox handling. Leaving the tab freezes its React subtree under
the same distance policy as other main tabs.

The layout reserves the main tab overlay height through the existing tab-shell
mechanism. Arena's removed private-tab inset must not leave a blank band or
allow content to sit behind the primary tab bar.

## Failure behavior

- Warm data survives a refresh failure.
- Offline and server-unavailable notices remain visible without replacing
  valid cached content.
- A blocked report still explains why starting another match is unavailable.
- Active match and queue resumption always outrank opening a new mode sheet.
- A missing latest review disables that menu item; it never routes to a review
  screen without a `matchId`.
- Compatibility routes redirect and never show duplicate UI.

## Accessibility and visual rules

- Icon-only controls have explicit accessibility labels.
- All touch targets are at least 44×44 points.
- Dynamic type must not overlap or hide primary actions.
- Lime/accent-filled surfaces use dark foreground text and icons.
- Color is not the only signal for rank direction or disabled state.
- The main tab button reports selected state while the Arena hub is active.
- Reduced Motion is respected by both tab transitions and rank scenes.
- Existing Phraseman palette, typography, and motion constants remain the
  source of truth; the redesign does not introduce a parallel design system.

## Expected implementation surfaces

The plan may refine this list after reading each current file, but the design
expects changes around:

- `app/(tabs)/_layout.tsx`
- `app/(tabs)/arena.tsx`
- `app/tab_page_model.ts`
- `app/arena.tsx`
- `app/arena_history.tsx`
- `app/arena_ranks.tsx`
- `app/arena_results.tsx`
- `app/arena_season_pass.tsx`
- `components/arena/ArenaHubChrome.tsx`
- `components/arena/ArenaTabBar.tsx`
- `components/arena/ArenaModeSheet.tsx`
- `components/arena/ArenaRankHybrid.tsx` or its replacement
- `modules/arena/hub_nav.ts`
- `modules/arena/result_view.ts`
- Arena navigation, cache, history, result, accessibility, and motion tests
- `docs/arena/OWNER_DECISIONS.md`

No backend schema, Firestore Rules, economy, matchmaking, scoring, task,
settlement, or reward change is authorized by this design.

## Acceptance criteria

1. Tapping the center main-tab button shows Arena with the same main tab bar
   still mounted and Arena selected.
2. Returning between primary tabs preserves Arena hub state and does not start
   background polling.
3. Matchmaking, match, and results remain full-screen without a tab bar.
4. The Arena hub has one primary `Играть` action and no duplicate Quick row.
5. `Играть` resumes active work before allowing a new mode choice.
6. Enabled mode rows contain no secondary promotional/explanatory copy.
7. `⋯` exposes the approved destinations and does not issue duplicate reads.
8. Rank and Tops have distinct, non-duplicated responsibilities.
9. Every history row opens the review for that exact match.
10. Existing reviews remain available for 30 days, one per settled match.
11. Arena season navigation lands on the existing Season Pass.
12. Rank up/down and tier up/down each show the restored choreography with
    accurate before/after rank data.
13. Reduced Motion, dynamic type, 44-point targets, eight locales, and lime
    contrast requirements pass focused checks.
14. Existing Arena warm-cache, outbox, entry, matchmaking, and match gates stay
    green.

