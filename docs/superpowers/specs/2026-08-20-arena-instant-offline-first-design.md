# Arena Instant Offline-First Hub Design

## Goal

The Arena hub must render a complete, stable first frame immediately, including on a cold app start, a first-ever offline visit, an expired or corrupt cache, and a failed network refresh. The hub must never expose `ArenaHubSkeleton` or another loading placeholder while it discovers local or remote data.

## Owner decision

- Use a full neutral Arena interface when no saved data exists.
- Do not invent rank, stars, progress, availability, active matches, or daily results.
- Keep server-dependent actions visible so the feature remains understandable, but disable them until availability is known and explain why.
- A compact offline notice is preferred to replacing the hub with a separate error screen.

## Scope

This change covers the main `/arena` hub only. It does not make online Arena matches playable offline, redesign Arena navigation, change server contracts, change Firestore data, or alter the behavior of Arena subroutes.

## Chosen architecture

The hub uses a three-stage, monotonic presentation pipeline:

1. **Neutral local model, synchronously:** construct a truthful static presentation model before the first render. It contains the real Arena structure and copy, but represents unknown dynamic values explicitly.
2. **Saved snapshot, asynchronously:** read the existing AsyncStorage warm snapshot and merge only usable, sanitized data. This update must not show a loading state or remove already visible structure.
3. **Remote refresh, asynchronously:** request current Arena home and expansion data. Success replaces the corresponding local fields and refreshes the warm snapshot. Failure preserves the best already rendered model and exposes a compact connection notice.

Presentation quality may move only forward: neutral to cached to current. A refresh failure must never clear cached/current content or return the screen to a loading state.

## First-frame contract

The first render always includes `ArenaHubChrome`, `ArenaScreen`, the hub's principal cards, and the visible Arena actions. Unknown dynamic values use a semantic unknown representation such as an em dash or omitted value; they must not fall back to numeric zero when zero would be interpreted as real progress, currency, rating, rank, or availability.

`ArenaHubSkeleton` is not rendered by `/arena` under any state. The skeleton component may remain in the repository if another owned surface needs it; this change removes only the main hub dependency and behavior.

## Data and cache policy

- The current in-memory warm snapshot remains the fastest data source when available.
- The current AsyncStorage snapshot remains the cold-start data source and is loaded without blocking the first frame.
- Existing sanitization continues to remove `activeMatch` and `activeQueue` from persisted home data.
- Daily counters from a different UTC day remain removed.
- The existing 24-hour validity rule remains unchanged. An expired, future-dated, malformed, or incompatible snapshot falls back to the neutral model rather than to a skeleton.
- A successful response for either home half updates that half without erasing the other cached half.
- This design adds no new network requests, timers, subscriptions, Firestore reads, or server writes.

## Availability and actions

Unknown availability is distinct from disabled-by-server availability.

- While availability is unknown, server-dependent actions remain visible and disabled.
- A nearby concise localized notice explains that Arena needs a connection to confirm availability; disabled controls also expose this reason in their accessibility state or label.
- Once current or cached availability is known, existing enablement rules apply.
- A cached value must not resurrect volatile actions such as an old active match or queue.
- Existing retry behavior remains available after a remote failure and runs silently without replacing content with a loading state.

## Error and offline behavior

- No error is announced merely because disk hydration is still pending.
- A compact localized offline/connection notice appears only after the remote request fails with a transport-style failure.
- Server gates such as disabled Arena, incompatible client version, or pending account deletion keep their existing specific state and diagnostic code; they must not be mislabeled as offline.
- A failed disk read, malformed cache, or absent cache is silent because the neutral model already provides the complete first frame.
- Retrying clears or updates the connection notice only according to the retry result; it never clears visible hub content.

## Accessibility and visual stability

- The neutral model uses the final card geometry, so cache and network updates do not move the page structure.
- Unknown values have accessible labels such as “not available” rather than being read as zero.
- The connection notice uses the existing accessible notice/card primitives and a polite live region where appropriate.
- Disabled actions remain discoverable to assistive technology with their disabled reason.
- No new animation constants or motion behavior are introduced.

## Component boundaries

- `app/arena.tsx` owns the hydration stages and selects the visible source.
- A small pure Arena hub presentation policy/model should represent `neutral`, `cached`, and `current` sources without coupling rendering to promise state.
- `modules/arena/home_cache.ts` continues to own snapshot validation and sanitization.
- Existing Arena UI components render explicit unknown values instead of inferring real zeroes from absent data.
- Network clients and server contracts remain unchanged.

## Verification

Focused regression coverage must prove:

1. A cold start with an empty store renders the complete neutral hub on the first render and never renders `arena-hub-skeleton`.
2. A first-ever offline visit settles on the neutral hub plus a connection notice, with no endless loading state.
3. A cold start with a valid disk snapshot renders neutral immediately and then cached data without a skeleton or structural jump.
4. In-memory warm data renders synchronously as it does today.
5. Expired, future-dated, corrupt, and incompatible snapshots render the neutral hub and do not crash.
6. A network refresh failure preserves cached or current content.
7. A retry never reintroduces a skeleton.
8. Missing dynamic numbers are not rendered as factual zeroes.
9. Active match, queue, and stale daily counters remain excluded from persisted presentation.
10. Existing server-gate diagnostics remain distinct from offline failures.

Run only the focused Arena cache/hub contracts and relevant TypeScript diagnostics. No broad project suite is required for this isolated presentation-policy change.

## Rejected alternatives

- **Preload Arena cache during global app startup:** adds startup I/O, couples an unopened feature to boot performance, and still cannot supply truthful data on a first-ever offline visit.
- **Adopt synchronous native storage:** increases native and migration scope for a problem solved by a truthful synchronous neutral model.
- **Keep the skeleton only for empty cache:** preserves the reported regression and can remain indefinitely offline.
- **Use fabricated default progress or currency:** creates a fast but false first frame and is therefore unacceptable.

## Acceptance criteria

- `/arena` has no visible loading or skeleton state.
- Its first frame is complete and truthful with or without memory, disk data, or network.
- Local and remote hydration update the visible data silently and never regress presentation state.
- Offline and server-gated states remain understandable and correctly distinguished.
- No existing Arena capability, route, cache safety rule, or server contract is removed.
