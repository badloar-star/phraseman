# Task packet: §78 — friends test mocks, Home first-frame release marker, auth_provider getters

Governance-ID: TG-C9BBE556639F
Status: Done (1, 2) · (3) waiting — auth_provider.ts has another session's uncommitted edits
Owner: Claude session «App Check» (82577f25), by coordinator §78 (2026-10-02)
Related epic/enabler: PM-229 / startup performance (Q53 → §66/§67/§70)

## Outcome

1. Three red suites (firestore_friend_requests, friend_name_lookup_timeout, auth_recovery_boot_gate)
   pass again: their `../app/cloud_sync` mocks gain `ensureStableAuthLinkForStableIdDetailed`;
   product behaviour unchanged. Success: the three suites green, no change outside tests.
2. Release builds log one line when Home paints its first frame: milliseconds since process
   start. Success: the line appears once per cold start in release logcat, so Home regressions
   can be measured with 10+ starts instead of uiautomator polling (±1 s; §70 showed 1.9 s / 41 MB noise).
3. auth_provider.ts Auth/Firestore getters via `rnfbInstance` — ONLY when the file has no
   other session's uncommitted edits (dirty now → deferred, reported).

## Scope

In scope: tests/firestore_friend_requests.test.ts, tests/friend_name_lookup_timeout.test.ts,
tests/auth_recovery_boot_gate.test.ts (mocks only); app/(tabs)/home.tsx (one call) plus a tiny
helper module for the marker; app/auth_provider.ts (2 getters) only when clean.

Out of scope: friends product logic, Home layout/visuals, other startup work, auth flows.

## Architecture

No architecture change. The marker is a one-shot, release-safe log fired after Home's first
commit (requestAnimationFrame after mount), measured from the native process start time when
available, otherwise from JS bundle start. It never sets state or causes a re-render.

## Security and privacy

No personal data in the marker (a number of ms and a label). Test mocks do not touch
production. Getter swap keeps the same Firebase instance; no auth/authorization change.

## Technical debt

- Pay now: stale mocks in three suites.
- Contain: Home timing noise — the marker gives a deterministic signal; exit when a 10+-start
  Home baseline is recorded in the inbox.
- Accept temporarily: auth_provider.ts getters (owner: this session; review: when the file is
  clean; impact: ~1 deprecated call per start in dev, 0 in release since §66).

## Verification

- The test runner on the three suites → green; typecheck clean.
- Release build on the weak-profile emulator: the Home marker appears exactly once per cold start.
- Each commit only with my paths, diff size checked right before committing.

## Rollback

Revert the commits — tests and one log line (getters later); no data, no entitlements.

## Result (2026-10-02)

- (1) dd8e17b7e — friends suites 54/54 together with the core fix 27f4b6be2.
- (2) 031d6ef70 + 3cd296873 — [HOME-PAINT] marker; release console.log is stripped, so console.warn. Baseline (release, 2 cores / 2 GB, 12 cold starts): median 1715 ms, p90 2155 ms, range 1353-2290 ms; exactly one marker per start. Exit condition of the Contain item met.
- (3) not started — file still dirty.
