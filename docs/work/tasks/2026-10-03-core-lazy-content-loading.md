# Task packet: lazy client-side loading of learning content (PM-216 continuation, [CONTENT-LAZY])

Governance-ID: TG-BDE4062C9EE4
Governance-ID: TG-DE52BCF72011
Status: Done
Owner: Claude session «App Check» (82577f25), by coordinator (2026-10-03)
Related epic/enabler: PM-216 / E21 performance, Performance Bible (lazy content through registry accessors)

## Outcome

Learning content that is about 13 % of the release bundle (Spanish lesson data, idioms, lesson theory, Learning V2 manifests) no longer runs on the cold-start path of a weak Android phone. First measure what is actually required before [HOME-PAINT]; then make only the current user's language/course load, and only when the user enters the section, through lazy require / dynamic import by key, with a [CONTENT-LAZY] log line. No behaviour change.

## Scope

In scope: the content registry accessors and the few call sites that import big content statically on the start path, a small lazy-load helper with logging, tests, measurement notes in evidence.
Out of scope: server-side content delivery, deleting content, Account V2 zone (auth_provider.ts, cloud_sync.ts, account_authority*), design-session screens beyond their imports, deploy.

## Architecture

A tiny helper wraps a loader function per content key (memoized promise, logs [CONTENT-LAZY] once per key with duration and where it was triggered). Callers that were synchronous stay synchronous only where a sync snapshot is already guaranteed by the Performance Bible hydration rules; others get an async accessor plus a ready peek. Static import edges from startup modules are cut, not the content itself.

## Security and privacy

No data collected or sent. Content stays bundled (no network); only the moment of its first execution moves.

## Technical debt

- Pay now: eager evaluation of megabytes of data modules on cold start.
- Contain: any screen that needs the data synchronously on its first frame keeps an explicit warm path (prefetch after first paint) so the first frame never shows a default-then-patch.

## Verification

Before/after: list of content modules statically reachable from the startup closure (graph) and bundle-order evidence; unit tests for the helper and for "start path does not statically import content X"; existing content/lesson/home tests; type check; no change in lesson/dialog behaviour tests.

## Rollback

git revert; content files untouched.
