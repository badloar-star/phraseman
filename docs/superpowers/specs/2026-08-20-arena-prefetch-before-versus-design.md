# Arena Prefetch Before Versus Design

## Goal

After matchmaking finds an opponent, keep the existing search surface and its
animation visible while both clients accept the match and the sealed question
plan is loaded. Show the collision/VS sequence only when the match is fully
ready, then enter the first task without a loading, preparation, or stalled
final frame.

The required visible flow is:

`search animation → collision/VS → 3–2–1 → first task`

There must be no intermediate screen or visible copy such as “Preparing
match”, “Preparing duel”, “Waiting for the second player”, or “Loading”.

## Owner decision

- The matchmaking animation remains on screen after `matchId` is discovered
  until match acceptance and the sealed plan both succeed.
- Match acceptance and question-plan loading happen behind that unchanged
  search surface.
- The VS animation starts only with a validated plan and real opponent data.
- Once the VS animation starts, it must run continuously and be followed
  immediately by the first task.
- Arbitrary fixed delays are forbidden. Readiness, not elapsed presentation
  time, controls the transition.

This supersedes the temporary 2026-08-20 implementation that navigated to the
VS scene immediately and loaded the plan inside it.

## Scope

This design covers quick and ranked matchmaking through
`app/arena_matchmaking.tsx` and entry into `app/arena_match.tsx`.

It does not change:

- matchmaking eligibility, bot timing, ranking, rewards, or economy;
- the sealed-plan schema or server callable contracts;
- friend-invite entry or resume of an already active match;
- Firestore collections, Rules, indexes, or Jarvis data contracts;
- the duration or visual choreography of `ArenaVersusIntro`.

## Chosen architecture

### Shared entry coordinator

A single client-side entry coordinator owns the sequence for each `matchId`:

1. call the existing idempotent `arenaV2MatchAccept`;
2. while the server still reports `accepting`, retry using the existing
   `ARENA_ACCEPT_RETRY_MS` and `ARENA_ACCEPT_WINDOW_MS` policy;
3. when both clients have accepted, request `arenaV2MatchPlan` exactly once;
4. validate the complete sealed plan with the existing closed parser;
5. cache the successful promise/result by `matchId` for the screen transition.

The coordinator is process-local and bounded like the existing plan-request
cache. Calling it from matchmaking and then consuming it from the match screen
must reuse the same promise/result, never issue duplicate accept or plan
requests, and never create a second source of match-entry state.

### Matchmaking ownership

When matchmaking receives a `matchId`, it stops searching for another player
but keeps rendering the same search surface and animation. It starts the shared
entry coordinator instead of navigating immediately.

No new visible “preparing” state is introduced. The search animation is the
continuous visual cover for this short technical entry phase. Cancellation and
back actions are disabled once a real match has been assigned, because the
queue no longer exists and abandoning an assigned ranked match must follow the
existing match/forfeit contract rather than queue cancellation.

On coordinator success, matchmaking navigates to `/arena_match` with the
prepared `matchId`. On failure it uses the existing reason-specific entry
failure model; it must not fall back to generic loading or preparation copy.

### Match-screen ownership

`app/arena_match.tsx` consumes the coordinator's cached validated plan. It may
call the same coordinator as a fallback for direct navigation or process-cache
loss; idempotency guarantees the same logical entry.

For the normal matchmaking path, the local match machine is hydrated before
the VS animation is shown. The full existing countdown budget begins with the
VS sequence, so no preparation time is subtracted and no first-task
reading/answer time is consumed behind another surface.

Resume of an already active match remains snapshot-driven and returns directly
to its current phase without replaying a full VS sequence.

## State flow

The matchmaking presentation uses these semantic states without adding a new
screen:

1. `searching`: queue is active; normal matchmaking calls and animation run.
2. `matched_warming`: `matchId` is final; queue polling and bot fallback stop;
   the same search animation remains visible while the entry coordinator runs.
3. `ready`: a validated plan is cached; navigate once to the match screen.
4. `failed`: show the existing reason-specific failure and valid recovery
   action on the matchmaking surface.

Only `searching` may cancel the queue. `matched_warming` must never restart
matchmaking, assign a second opponent, or send a queue-cancel request.

## Error handling

- A transient accept/plan failure uses the existing retryable entry failure and
  remains on the matchmaking surface.
- A disabled Arena or incompatible client uses the existing gated copy.
- An expired, cancelled, or already-finished match uses the existing terminal
  entry failure and does not restart search automatically.
- A second player who does not accept within the existing window uses the
  existing `no_opponent` recovery path.
- Component unmount/remount must not discard an in-flight successful entry;
  the shared promise remains consumable by the next screen instance.
- No failure may expose a partial or invalid plan to the local match machine.

## Accessibility and motion

- The visible layout does not change between `searching` and `matched_warming`,
  preventing a structural flash.
- The existing search motion and Reduce Motion behavior remain unchanged.
- Assistive technology must not announce a false second search or a loading
  screen. Any status announcement must use existing truthful opponent-found or
  entry-failure semantics without adding visible preparation copy.
- `ArenaVersusIntro` retains its current collision, countdown, haptics, sounds,
  cosmetics, and Reduce Motion timing.

## Verification

Focused tests must prove:

1. discovery of `matchId` starts entry prefetch before navigation;
2. matchmaking remains rendered until the validated plan is ready;
3. queue reconciliation, bot fallback, and queue cancellation stop after a
   real match is assigned;
4. matchmaking and match screen share one accept/plan promise per `matchId`;
5. Strict Mode remount does not duplicate the sealed-plan request;
6. coordinator success navigates exactly once;
7. the match screen receives a validated plan before starting VS;
8. VS is immediately followed by the first task with the full task budget;
9. no match-entry screen renders waiting, preparing, or loading copy;
10. direct navigation and active-match resume preserve their existing recovery
    behavior;
11. transient, gated, terminal, and no-opponent failures retain their distinct
    recovery actions;
12. the complete fresh Arena harness remains green.

## Rejected alternatives

- **Load inside the VS animation:** can stall its final frame and initially
  renders placeholder opponent identity when the plan is slow.
- **Wait a fixed 300–500 ms before VS:** improves the common case but remains
  nondeterministic and can still expose a stall on a slower connection.
- **Pass the full plan through router parameters:** duplicates large sensitive
  data in navigation state and bypasses the existing closed parser/cache
  boundary.
- **Start a second accept/plan flow in each screen:** introduces duplicate
  requests and remount races despite server idempotency.

## Acceptance criteria

- Quick and ranked matches visibly follow only search → VS/countdown → task.
- Match acceptance and plan loading finish behind the search animation.
- VS always starts with real opponent identity and a validated sealed plan.
- VS never waits for network readiness or freezes on its final frame.
- The first task keeps its complete reading and answer budgets.
- No queue operation continues after `matchId` assignment.
- Existing match failures, direct-entry recovery, resume, cosmetics, sounds,
  accessibility, and Reduce Motion behavior are preserved.
