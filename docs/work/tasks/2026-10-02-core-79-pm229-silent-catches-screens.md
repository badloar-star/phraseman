# Task packet: PM-229 — silent catches on screens nobody is editing (batch by screen)

Governance-ID: TG-ED4ED322842C
Status: In progress
Owner: Claude session «App Check» (82577f25), by coordinator (2026-10-02, after §78)
Related epic/enabler: PM-229 (A1 «no silent error suppression»)

## Outcome

Every silent handler (`catch {}`, `catch (e) {}`, `.catch(() => {})`, `.catch(() => null|false|[]|…)`)
in the chosen files writes its reason to the journal through app/swallow_log.ts with an area-prefixed
tag (`<module>:<operation>`), while returning exactly the same fallback as before. Success: the
PM-229 ratchet (tests/pm229_silent_catch.probe.ts) BASELINE drops by the number of rewritten
handlers per file, the probe passes, typecheck is clean, related suites stay as green as before.
Also: auth_provider.ts getters via rnfbInstance if the file becomes clean (it is dirty now).

## Scope

In scope: BASELINE files from the ratchet that have no uncommitted edits (git status) and no
commits from other sessions in the last hours — checked right before each file; the ratchet file.
Out of scope: files another session is working on (FINAL_PHASE п.7: flashcards_*, friends,
settings, home), app/_layout.tsx, auth_provider.ts (dirty), account_switch_quarantine.ts,
intentional chain breaks (debug-logger queue, keyed_exclusive_transaction, account_detach_latch),
any behaviour change.

## Architecture

No architecture change. Mechanical, AST-located rewrite: empty catch block → `noteSwallowed(tag, error)`;
silent arrow handler → `noteSwallowedHandler(tag)` or `noteSwallowedAs(tag, <same value>)`.
Fallback values, control flow and return types stay identical. noteSwallowed never throws.

## Security and privacy

Logged data = tag + error message, written to the existing local debug journal (dedup, batched).
No new data leaves the device beyond what reportSwallowed already does; no personal fields are
added to tags.

## Technical debt

- Pay now: silent handlers in the chosen files (ratchet lowered per file).
- Accept temporarily: remaining files owned by other active sessions (owners: those sessions;
  review: next coordinator round; exit: ratchet entry reaches 0 or a documented intentional break).

## Verification

- Ratchet probe passes with the lowered BASELINE.
- Typecheck clean; the test suites that touch the edited files are no redder than before.
- Each commit contains only my paths; diff size checked right before committing.

## Rollback

Revert the commits — logging-only changes, identical fallbacks; no data or entitlement impact.
