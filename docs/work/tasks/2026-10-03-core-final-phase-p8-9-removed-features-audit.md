# Task packet: FINAL_PHASE п.8–9 — audit of leftovers of removed 2.0 features (XP, gifts, spins/runes, pearls, old avatars, fanfares, season pass, arena)

Governance-ID: TG-8A2D25725DBA
Status: In progress
Owner: Claude session «App Check» (82577f25), by coordinator (2026-10-03)
Related epic/enabler: PhraseMan 2.0 simplification program (D-decisions), FINAL_PHASE п.8–9

## Outcome

1. A report in docs/phraseman-2.0/INBOX_COORDINATOR_FROM_CORE.md: a list `file:line → what the leftover is → delete / keep (why)` for each removed feature, found by grep over app/, components/, modules/, admin/ (hooks/ and constants/ too).
2. Immediately deleted: only what is client-only, dead (no callers) and in files no other session is editing. Success: typecheck stays clean, ratchets/guards stay green, nothing live is removed.

## Scope

In scope: client code in app/, components/, modules/, hooks/, constants/, admin/ (read-only audit there); tests that pinned deleted code (updated with `// зачем:`).
Out of scope: server functions in functions/ (release 1.6.24 still calls them), Firestore rules, anything with uncommitted edits from another session, anything with live callers, content/data files, auth_provider.ts.

## Architecture

No architecture change; deletion of dead leaves only. Rule per candidate: (a) confirm the owner decision that removed the feature (docs/phraseman-2.0/03_DECISIONS.md), (b) grep every importer and every string reference (incl. tests, registries, deep links, route tables), (c) delete only when zero live importers remain, (d) after each batch: typecheck + tests that mention the removed names.

## Security and privacy

Deleting client code only; no data is read or written differently. Persisted storage keys of removed features are listed but NOT purged by this task (purging touches user data — report only).

## Technical debt

- Pay now: dead client-only leaves in idle files.
- Contain: everything with live callers, server coupling, or storage keys — listed in the report with the exit condition.
- Accept temporarily: files with other sessions' uncommitted edits (owners named in the report).

## Verification

Typecheck clean; ratchet probes (pm229, perf freeze, mass-deletion guard) green; tests that reference removed symbols run before/after; each commit only my paths with the diff size checked right before committing.

## Rollback

Revert the commit(s): pure deletions of unused client code, no data or entitlement impact.
