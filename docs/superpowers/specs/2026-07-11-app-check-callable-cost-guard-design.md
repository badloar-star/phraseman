# App Check callable cost guard design

Date: 2026-07-11

## Objective

Stop clients that cannot mint a valid Firebase App Check JWT from repeatedly invoking production hot-callable functions, while preserving offline progress and avoiding a breaking server-wide App Check enforcement rollout.

## Confirmed problem

Production logs for 2026-07-11 show 530 invalid-App-Check warnings in a 107-minute sample. The largest sources are `progressSubmitEvent`, `leagueJoinOrUpdateGroup`, and `shardsApplyDelta`.

`initFirebaseAppCheckIfAvailable()` returns `false` when attestation is unavailable, but current callers generally ignore that result and invoke the production callable anyway. Failed initialization also clears the shared promise, allowing repeated token-mint attempts.

## Design

### Readiness and cooldown

Extend the App Check initialization module with a cached readiness result and a bounded failure cooldown. A successful JWT remains ready. A failed attempt records the failure time and returns `false` without retrying token mint on every user action. App foreground or an explicit forced retry may attempt again after the cooldown.

No token value is logged or persisted by application code.

### Hot callable guard

Before invoking production hot-callables, require App Check readiness:

- progress migration and `progressSubmitEvent`;
- `shardsApplyDelta` queue flush;
- league join/update/boost synchronization callables;
- stable identity-link callable used as a prerequisite for these flows.

If readiness is false:

- progress and shard events remain in their existing local queues;
- migration remains pending;
- league background synchronization returns through its existing fallback/no-op path;
- identity linking reports `source: 'unavailable'` without calling production;
- no Critical App Health error is created for this expected local condition.

User-triggered destructive or purchase operations are outside this change and must not be silently discarded.

### Build policy

- Store builds use Play Integrity on Android and App Attest with DeviceCheck fallback on Apple.
- Dev/preview builds may call production only when an App Check debug provider/token is explicitly configured.
- Expo Go and cloud-sync-disabled modes retain their current local behavior.

### Server rollout

Do not enable global `ENFORCE_APP_CHECK` in this change. First ship and observe the guarded client. Server enforcement requires a separate staged rollout after valid-token metrics show that supported store versions are ready.

## Compatibility and data safety

- Existing progress/shard idempotency keys and queues remain unchanged.
- A failed App Check attempt must not remove a queued event.
- App Check recovery must allow queued work to flush later.
- No account, authentication, Firestore schema, security rule, or Cloud Function API contract is removed.
- Existing non-hot callables are not broadly refactored in this first cost-control change.

## Tests

Use test-first coverage for:

1. failed App Check readiness enters cooldown and does not remint immediately;
2. forced/expired-cooldown retry can recover to ready;
3. progress migration/submission does not call Firebase when unready and retains its queue;
4. shard delta flush does not call Firebase when unready and retains pending deltas;
5. league background synchronization takes its fallback path when unready;
6. stable identity linking does not invoke its callable when unready;
7. valid readiness preserves current callable behavior;
8. existing auth, progress, shards, and league focused tests remain green.

## Rollout and measurement

Ship as a client change; do not deploy server functions for this guard. Compare invalid-App-Check warning rate and callable invocation/billed-duration metrics after the updated client is installed. Old clients may continue producing warnings until they age out.

## Out of scope

- Immediate global App Check enforcement.
- Deleting callable functions.
- Discarding queued user progress or shard operations.
- Project OpenAI API use.
