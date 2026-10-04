# Task packet: "Мои ошибки" list opens from the hub snapshot

Governance-ID: TG-68E08DDA3473
Status: In progress
Owner: Claude session «App Check» (82577f25), by coordinator (2026-10-04)
Related epic/enabler: owner rule "every section opens instantly"

## Outcome

The mistakes list screen draws its rows from the snapshot the hub already holds in memory instead of five skeleton rows on every open; the fetch still runs in the background.

## Scope

In scope: app/mistakes_hub.tsx (export the existing peek), app/mistakes_list.tsx (seed the first render).
Out of scope: the other audit rows.

## Architecture

Reuse of the existing module-level peek keyed by study target and language; the list keeps its own load and replaces the seeded items when the fresh snapshot arrives.

## Security and privacy

None: same local data, same account scope (the peek key includes target and language and is cleared with the module on account switch restart of the screen state).

## Technical debt

- Contain: the peek is module memory only; a disk snapshot would also cover a cold start.

## Verification

Source contract; type check.

## Rollback

Revert the commit.
