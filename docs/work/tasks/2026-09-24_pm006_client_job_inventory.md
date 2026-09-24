# Task packet: PM-006-A1 — client-side background job/subscription inventory

Governance-ID: TG-B08D6ACD9EB2
Status: Planned
Owner: Claude (read-only inventory session)
Related epic/enabler: PM-006 (PhraseMan 2.0 simplification — background load audit)

## Outcome

A filled `docs/phraseman-2.0/registries/job_inventory.json` that lists every
client-side background job, timer, realtime subscription, and OS-level
background task found in `app/`, `components/`, `modules/` (server cron in
`functions/` explicitly out of scope, only names listed for reference). Each
entry records trigger, ownership, cancellation/retry behaviour, and a
keep/remove-with-feature/unknown decision so a later session can decide what
to delete alongside arena/spins/gifts/XP/level/themes/league without
re-discovering the same jobs from scratch. Beneficiary: the owner and the
next implementation session doing the actual removal work.

## Scope

In scope: read-only grep/read investigation of `app/_layout.tsx` bootstrap,
`app/app_resume_policy.ts` and its callers, `setInterval`/`setTimeout` forming
cycles, `AppState.addEventListener`, `onSnapshot`, `NetInfo.addEventListener`,
`TaskManager`/`expo-background-task` usage, `scheduleNotificationAsync`, and
prefetch/prewarm/warmup/preload call sites. Writing ONLY to
`docs/phraseman-2.0/registries/job_inventory.json` (and this task packet,
required by the governance hook).

Out of scope: any application code change, running tests/build/jest/tsc,
deep audit of `functions/` scheduled cron internals (PM-007), infinite UI
animations (Animated.loop/Reanimated withRepeat).

## Architecture

No architecture change. This is a documentation/inventory task only — it
records the current state of background work, it does not alter any boundary,
data flow, or invariant.

## Security and privacy

No security or privacy impact. No code changes, no data collection changes.
The inventory file explicitly avoids recording customer data, per its own
"purpose" field.

## Technical debt

Not applicable — no code is modified. The inventory itself documents existing
debt (e.g. jobs without cancellation, prefetches that run unconditionally on
every cold start) for a future session to pay down; each such finding is
marked with its own decision/evidence inside the JSON rather than silently
deferred.

## Verification

- `python -c "import json;json.load(open('docs/phraseman-2.0/registries/job_inventory.json',encoding='utf-8'))"` must succeed (valid JSON).
- Manual check that `status` is no longer `NOT_YET_AUDITED` and `entries` is non-empty.
- No other tracked file modified except this task packet and the registry file.

## Rollback

Revert the two touched files with `git checkout -- docs/phraseman-2.0/registries/job_inventory.json docs/work/tasks/2026-09-24_pm006_client_job_inventory.md`. No runtime or user-facing effect to roll back since no application code changed.
