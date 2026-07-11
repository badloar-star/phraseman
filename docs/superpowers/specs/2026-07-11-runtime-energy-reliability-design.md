# Phraseman Runtime Energy Reliability Design

**Status:** Design approved in conversation; awaiting review of this written specification before implementation planning.

## Goal

Remove avoidable background CPU, network, animation, timer, and subscription work while preserving every existing feature and all wall-clock behavior. A hidden or backgrounded screen must stop presentation-only work, but matches, deadlines, campaign expiry, lesson timing, and search state must remain correct when the user returns.

## Core Principle

Business time and visible UI time are separate concerns:

- Business state uses absolute timestamps such as `startedAt`, `deadlineAt`, `rangeExpandAt`, and `timeoutAt`.
- UI clocks update only while their owner is actually visible and the app is active.
- On activation, the UI immediately derives the current value from `Date.now()` before starting a visible tick.
- Time spent hidden or in background is never subtracted from a real deadline.
- Expiry, timeout, range expansion, and match-found transitions are idempotent and execute at most once.

This is the conservative option selected by the user. Pausing real time or changing existing product limits is out of scope.

## Constraints

- Do not remove, hide, bypass, or weaken Arena, lessons, diagnostics, leaderboards, offers, notifications, remote config, or offline feedback.
- Matchmaking must continue to discover a match when Arena is covered, another tab is active, or the app temporarily backgrounds.
- `MatchFoundToast` must retain its current behavior and must not flicker inside the visible lobby.
- Existing public context fields, including `elapsedMs`, remain compatible during migration.
- Custom-tab visibility requires both navigation focus and the active tab index; neither signal is sufficient alone.
- AppState does not prove that a screen is visible beneath another root-stack screen.
- No new native dependency is required for the initial network fix.
- The current worktree is dirty. Every phase must preserve unrelated changes and inspect its exact per-file diff before staging.
- Runtime improvements must be measured in a release build; static inspection is evidence of lifecycle correctness, not proof of thermal or battery impact.

## Considered Approaches

### Minimal lifecycle guards

Add focus and AppState conditions around existing intervals and animations. This has a small diff, but leaves business deadlines coupled to UI ticks and can miss timeout or range expansion after backgrounding. It is acceptable only as a temporary containment patch.

### Separate control clocks and UI clocks — selected

Keep authoritative state on absolute timestamps and run presentation ticks only while visible. Reconcile once on foreground/focus. This preserves behavior while removing hidden work and allows independent tests for business events and rendering cadence.

### Central application scheduler

Move all deadlines and intervals into a single runtime service. This could become a later architectural improvement, but its blast radius is too large for the current reliability task.

## Phase 0: Restore a Trustworthy Runtime Baseline

Classify every current failure in `tests/owner_direction_runtime_contract.test.ts` as one of:

- real runtime regression;
- stale expectation after an intentional move;
- missing or renamed source;
- justified call site requiring an explicit lifecycle owner and frequency.

Do not create placeholder files such as `functions/src/compass.ts`. Do not update allowlists mechanically to match current counts. Each allowed timer, listener, force-sync, or snapshot must state why it exists, who stops it, and how frequently it runs.

Phase 0 is complete only when the focused runtime ratchet has a clean, meaningful baseline.

## Phase 1: Shared Runtime Visibility

Introduce a small runtime-visibility boundary whose effective state is:

```text
runtimeActive = screenFocused && appActive && ownerVisible
```

`ownerVisible` is supplied by the owning custom tab, screen, or modal. Nested components must not guess whether a custom tab is active.

App foreground state is exposed by one module-level AppState store backed by a single native listener and consumed through `useSyncExternalStore`. Components must not attach additional AppState listeners for the migrated runtime-visibility behavior.

Add a wall-clock UI helper with these semantics:

- accepts an absolute start or deadline;
- computes its value immediately on activation;
- starts at most one interval while `runtimeActive`;
- stops the interval on blur, owner invisibility, background, or unmount;
- reconciles an expired deadline exactly once;
- does not restart one-shot entrance or reward animations.

The helper must remain small and must not become a general scheduler.

## Phase 2: Arena and Matchmaking

### Work that remains authoritative outside the visible lobby

- the matchmaking session;
- the minimum subscription needed to discover a found match;
- bot fallback;
- search timeout;
- search-range expansion;
- persisted resume state.

When Arena is covered by a root-stack screen or another custom tab is active, the minimum match-found listener remains attached so discovery and global toast behavior do not regress. When the whole application enters background, that listener is removed to avoid maintaining client realtime work. The server-side queue and search continue. Foreground reconciliation first reads the authoritative session, queue, and match state and reattaches the listener before evaluating any locally overdue transition.

### Work that stops when the lobby is covered, the tab changes, or the app backgrounds

- radar, pulse, shimmer, and decorative loops;
- idle hints;
- the visible elapsed-time tick;
- throne and feature-flag polling used only by the lobby;
- lobby-only friend, invite, queue-count, and related Firestore subscriptions.

The Arena tab's real visibility is:

```text
screenFocused && appActive && (!isTab || activeIdx === 2)
```

That value drives `setLobbyActive` so global match-found presentation remains correct.

### Matchmaking clock migration

`searchStartedAt` remains the source of truth. Replace the provider's repeating elapsed interval with absolute one-shot deadlines for range expansion and overall timeout. On foreground or resume, call one idempotent reconciliation with the current wall clock.

Foreground reconciliation order is mandatory:

1. read the authoritative match and search state;
2. if a match exists, accept that state and suppress local timeout, range expansion, and bot fallback;
3. if no match exists, evaluate overdue range expansion, bot fallback, and search timeout in the existing product order;
4. publish one reconciled context snapshot and restart only the required visible UI clock.

The same ordering applies when a listener callback and a local deadline arrive concurrently. Match-found wins over client-derived transitions.

Required compatibility details:

- preserve the initial search start while expanding the queue range;
- protect expansion and timeout with explicit idempotency state;
- add a dedicated `searchActiveRef` rather than using the existence of an interval as the duplicate-start guard;
- inventory and migrate every `elapsedMs` consumer before removing the provider interval;
- retain `elapsedMs` as a deprecated snapshot updated only at search start, explicit reconcile/resume, and terminal status transition;
- no consumer may treat `elapsedMs` as a live clock after migration; visible elapsed time is always derived from `searchStartedAt` plus the local visible-second tick;
- keep exactly one visible-second clock locally in visible Arena UI.

## Phase 3: Network Backoff

Retain the current passive signals and manual retry behavior. Without adding NetInfo, change the probe policy to:

```text
first offline retry: 10 seconds
later retries: 30, 60, 120, 300 seconds
online safety probe: no more than once per 5 minutes
background or zero subscribers: zero probes
```

Success resets the backoff. An immediate automatic probe is considered only on the subscriber transition from zero to one and only when the cached result is absent or stale; later subscribers do not trigger another probe. Unsubscribe/resubscribe does not reset backoff or cooldown, preventing a probe storm. Manual retry is an explicit exception: while the app is active it may request one immediate coordinated probe even with zero subscribers. `reportNetworkSuccess` and `reportNetworkFailure` remain immediate inputs.

All probe entry points, including `checkOnlineNow`, share the same in-flight coordinator so no parallel probes exist. A later NetInfo migration is a separate decision because it changes native dependencies and can introduce its own reachability checks.

## Phase 4: Infinite Animations

Apply runtime visibility to repeating motion in:

- Home;
- `lesson1`;
- lesson intro;
- lesson completion;
- pack opening;
- `WeeklyReviewCard`.

Each repeating effect follows the same lifecycle:

```text
inactive: stop the existing loop and do not create another
active: create and start one loop
cleanup: stop the loop
```

Reset an `Animated.Value` only where the existing visual contract requires a known resting state. Focus return must not replay completed entrance, reward, or transition animations. `WeeklyReviewCard` receives an explicit active value from its owner.

## Phase 5: Remaining Timers and PromoBanner

For streak statistics, diagnostics, and the Arena leaderboard:

- move UI ticks behind runtime visibility;
- retain an absolute start or deadline;
- reconcile immediately on return;
- execute an expired transition at most once.

For `PromoBanner`:

- remove the minute interval;
- refresh on mount, foreground, remote-config change, language change, and premium-state change;
- schedule a bounded timeout toward the campaign's absolute `until` value, using chunks no longer than 24 hours so the delay never approaches the platform's signed 32-bit timer limit;
- on each chunk, recompute the remaining delay from `Date.now()` rather than subtracting the previous chunk;
- cancel the timeout in background and recompute it from absolute `until` on foreground;
- cancel and recompute that timeout when configuration changes;
- prevent an older asynchronous refresh from overwriting newer state with a generation token or cancellation guard.

## Verification Contracts

Focused automated coverage must prove:

- covering Arena with a root-stack screen stops lobby-only intervals and listeners;
- changing the custom tab stops Home and Arena presentation work;
- background stops all UI clocks and repeating animations;
- returning after 37 seconds shows wall-clock time with at most one second of error;
- an expired deadline executes exactly once;
- matchmaking range expansion and total timeout execute once after resume;
- authoritative match-found wins races against timeout, range expansion, and bot fallback;
- match discovery continues outside visible Arena;
- background detaches the minimum match listener, and foreground reads authoritative state before applying overdue local transitions;
- `MatchFoundToast` appears outside the visible lobby without flicker inside it;
- provider context does not commit every second;
- all migrated consumers derive live elapsed display from `searchStartedAt`, not stale `elapsedMs`;
- at most one visible matchmaking tick exists;
- network probes never overlap and do not run in background;
- offline backoff follows the configured sequence;
- `PromoBanner` expires at its absolute `until` without polling;
- a campaign more than 24.8 days away uses bounded timer chunks and still expires correctly after background/foreground.

Extend `tests/perf_freeze_contract.test.ts` to cover `Animated.loop`, not only `withRepeat(..., -1)`. The contract must validate use of the approved runtime-active pattern; the mere presence of the word `AppState` elsewhere in a file is insufficient. The legacy allowlist should shrink as guarded files migrate.

## Rollout and Rollback

Phase 0 is a prerequisite and is not a rollout slice. After it is green, ship four ordered slices:

1. runtime visibility helper and contracts;
2. Arena and matchmaking behind a temporary static feature flag;
3. animations, remaining timers, and `PromoBanner`;
4. network backoff.

After each slice, run focused Jest, existing performance/navigation guards, exact-diff inspection, and release profiling on an Android Go or old Android device plus a representative mid-range device.

The manual scenario is 20–30 minutes:

```text
Arena → root overlay → another tab → background → poor/offline network → foreground → Arena return
```

Runtime acceptance gates:

- zero hidden UI interval callbacks;
- zero active infinite loops on blur or background;
- zero lobby-only Firestore listeners under an overlay;
- zero network probes in background;
- at most one network probe in flight;
- no second-based provider context commits;
- wall-clock UI returns within one second of the authoritative value.

Rollback is phase-specific but dependency-ordered. Downstream slices are rolled back before their runtime-helper dependency. Phase 1 can be removed only after all consumers introduced by Phases 2–4 have been removed or restored to their previous lifecycle behavior. Roll back Arena/matchmaking immediately for a missed match-found event, duplicate timeout or range expansion, stuck search, incorrect lobby toast, or failure to resume. Roll back network backoff if the offline banner remains stale after foreground or manual retry.

## Risks and Mitigations

- A removed Firestore listener can miss intermediate events. Resubscription must read the latest authoritative snapshot rather than depend on event history.
- Timeout and foreground reconciliation can race. Both paths must share one idempotent transition function.
- A match-found callback can race timeout, range expansion, or bot fallback. The authoritative read and match-wins ordering are mandatory, with a separate test for each race.
- Asynchronous lobby visibility may briefly misclassify `MatchFoundToast`. Navigation tests must cover overlay transitions.
- Stopping an animation without a defined resting state can leave an intermediate frame. Each migrated animation must document whether it resumes or resets.
- Removing the provider interval without a dedicated search-active guard can permit duplicate searches.
- Slowing timers without absolute timestamps would incorrectly pause real time and is prohibited.

## Non-Goals

- No removal of existing features or UI.
- No change to Arena time limits, lesson deadlines, offer duration, or matchmaking rules.
- No broad navigation rewrite.
- No central scheduler migration.
- No native NetInfo dependency in this work.
- No claim of thermal or battery improvement without release-device measurements.

## Self-Review

- No placeholders, TODOs, or unresolved architectural choices remain.
- Business deadlines, UI clocks, subscriptions, and animations have distinct owners.
- Every rollout slice is independently testable, and rollback dependencies are explicit.
- Public matchmaking compatibility and match-found behavior are explicitly preserved.
- Static lifecycle correctness is separated from runtime performance claims.
- The design does not authorize deletion or weakening of any feature.
