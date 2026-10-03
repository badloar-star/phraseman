# Task packet: cold-start storage repeats (getAllKeys, empty multiGet, completion scheduler, mistake journal)

Governance-ID: TG-E1B5AB70DE32
Status: In progress
Owner: Claude session «App Check» (82577f25), by coordinator (2026-10-03)
Related epic/enabler: PM-215 / PM-220, E21 performance

## Outcome

On a store-release cold start the weak-profile storage call count drops stably below 450 (gate ceiling 520): AS.getAllKeys scans collapse to one cached call, empty AS.multiGet calls are not issued, the required-session completion scheduler is collapsed or deferred after the first frame, and the remaining mistake_practice journal reads are cut. Sources are identified from the callers= field of the [COLD-START-IO] summary, resolved through the release source map, before any change.

## Scope

In scope: the callers of getAllKeys / empty multiGet / the scheduler / the journal reads; small shared helpers (cached key list, guard for empty key lists); tests; INBOX report.
Out of scope: Account V2 zone (auth_provider.ts, cloud_sync.ts, account_authority*), design-session screens, factory_native/.

## Architecture

Diagnose first: build, run, read callers=. Then per source: share one in-flight/cached result (key list), skip the call when there is nothing to ask, or move non-critical work after the first frame. Every cache is invalidated on writes to the keys it covers and on account change.

## Security and privacy

No new data. Caches are in memory and keyed by account generation.

## Technical debt

- Pay now: repeated full key scans and empty batch reads on every cold start.
- Contain: shared helpers stay small and covered by tests; behaviour of screens unchanged.

## Verification

Device measurement before/after (calls, groups, maxInflight, first frame) with the gate tool; unit tests per fix; type check; related suites.

## Rollback

git revert per fix.

## Дополнение 03.10 (getAllKeys single-flight)
Governance-ID: TG-5C1025510971
Outcome: одновременные getAllKeys склеиваются в один нативный вызов; результат не хранится (ревью Ядра: денежные журналы). Scope: app/async_storage_null_bind_guard.ts + тест. Rollback: git revert коммита.

Governance-ID: TG-C44995E5EE3C
(2026-10-03: чистка MAX из теста идентичности платежей; rollback = git revert.)
