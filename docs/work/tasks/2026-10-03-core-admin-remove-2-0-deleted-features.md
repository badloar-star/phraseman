# Task packet: admin UI — remove everything PhraseMan 2.0 deleted (FINAL_PHASE item 8) + two red guard triages

Governance-ID: TG-D017A841FE18
Governance-ID: TG-312B94F1C16F
Status: Done
Owner: Claude session «App Check» (82577f25), by coordinator (2026-10-03, after §99)
Related epic/enabler: PhraseMan 2.0 FINAL_PHASE п.8 (admin), D02/D09/D10/D70/D101/D102

## Outcome

admin/v2 (the published admin: firebase.json target "admin" -> admin/v2) shows no screens, buttons, filters, labels or dead translation entries for features 2.0 removed (XP, level gifts/spins, runes-as-spin-currency, pearls/Shards, old avatars/auras, streak shield, season pass, Arena, tournaments, leagues/clubs). Server handlers are NOT touched (1.6.24): anything whose id is mirrored by a server contract stays and is reported with the reason. Also: two red guards triaged (home_counters first-frame contract = legitimate shift of an assignment form, energy deep audit probe = home energy removed by the owner 01.10).

## Scope

In scope: admin/v2/legacy.html (only my hunks; it holds another session's uncommitted Spire-content edits, so the commit blob is HEAD + my replacements), admin/v2/tournament_pool.html (orphan page), admin/v2/testers.html (XP display), admin/v2/scripts/components/analytics-language.js (dead event labels), the matching admin/ top-level copies where byte-identical, admin contract tests that list removed kinds, the two guard tests.
Out of scope: functions/, firestore.rules, hosting deploy (the coordinator deploys), real-money history surfaces (RevenueCat Shards transactions/refunds), support reply template cache, Spire content tab (alive), gift certificates (web commerce, alive).

## Architecture

Pure deletion of UI/translation entries and orphan page. No new code paths. Dead translation entries are found mechanically: dictionary key matches removed vocabulary AND the key text occurs nowhere outside its own block.

## Security and privacy

No new data collection; removing admin UI reduces the privileged surface. The page that grants/edits removed economy objects is not reintroduced. No policy change.

## Technical debt

- Pay now: ~120 lines of dead translations, orphan tournament page, arena feedback filters, XP/level display.
- Contain: items mirrored by server contracts (arenaRating alert toggle) stay and are listed in the INBOX with the reason.

## Verification

All tests/admin_* contract tests before/after on the same tree; node parse of the inline script is covered by existing contracts; grep of removed vocabulary in admin/v2 after the change; INBOX report "removed / kept and why".

## Rollback

git revert the commits; nothing deployed by this task.

## Addendum (2026-10-03, coordinator): App Check header diagnostic noise

functions/src/auth_identity.ts (authEnsureStableLink, authStampAnonOwnership) and auth_merge.ts (authMergeStableAccounts) logged `app_check_header_shape` on every call where `request.app` is empty. App Check is sealed forever and the client no longer sends tokens, so that is every call (~200/15 min in prod — log cost and noise). The three warn blocks and the then-dead `describeAppCheckHeader`/`readHeaderValue` helpers are removed. No behaviour change (diagnostic only; no enforcement existed in these callables). Functions type check clean; auth_identity/auth_merge/auth_identity_transaction suites 281/281 green. Needs a functions deploy (coordinator).
