# Task packet: PM-171 — hide "Ideas" section and remove its runtime warm-up

Governance-ID: TG-1F89C5868888
Governance-ID: TG-3610401D354E
Governance-ID: TG-1FF932BEB949
Status: In progress
Owner: Claude session (PM-171 executor)
Related epic/enabler: E16, PM-171 (docs/phraseman-2.0/tasks/PM-171.md)

## Outcome

The "Ideas" (`Идеи`) feature is fully hidden from users: no entry point (settings row,
feature-intro card, cancel-flow support redirect, dev showcase) can reach it, and no
runtime code prefetches/warms it on app start or on any screen open. Owner instruction:
«раздел идеи тоже мы скрываем» (PM-171, sources/01_original_message.txt). Success
measure: grep for `ideas_catalog`/`ideas_submit`/`prefetchPublicUserIdeas` in `app/` and
`components/` returns no live route registration or entry point; the two route files no
longer exist under `app/`.

## Scope

In scope:
- Client entry points: `app/(tabs)/settings.tsx` (Ideas row + prefetch + dead remote-flag
  listener), `app/feature_intro_sections_copy.ts` (`ideas_first_visit` card),
  `app/manage_subscription.tsx` and `app/_dev_cancel_flow_preview.tsx` (cancel-flow
  "support" redirect currently pointing at `/ideas_submit`, redirected to
  `/support_report`), `app/navigation_back.ts` (dead `/ideas_submit` pathname branch),
  `app/survey_client.ts` + `functions/src/shard_survey_core.ts` (drop `/ideas_catalog`
  from the allowed survey app-route union — client and server copies kept in sync),
  `components/dev/motion_showcase/**` (remove the dev-showcase tile pointing at
  `/ideas_submit`).
- Route removal: delete `app/ideas_catalog.tsx`, `app/ideas_submit.tsx`,
  `app/ideas_client.ts`, `app/ideas_types.ts` (client-only modules exclusively feeding
  those two screens — confirmed via grep, no other importers) and their
  `<Stack.Screen>` registrations in `app/_layout.tsx`.
- Registry bookkeeping: `docs/phraseman-2.0/registries/screen_inventory.json` — mark the
  `ideas_catalog`/`ideas_submit` route entries `decision: "remove"`.
- Tests: update/remove contract tests that assert the now-removed entry points or route
  exist (`tests/feature_intro_real_wiring.test.cjs`, `tests/feature_intro_variants_mock.test.cjs`,
  `tests/five_section_intros.test.cjs`, `tests/navigation_back_underlay_contract.test.ts`,
  `tests/survey_sheet_modal.test.tsx`, `functions/src/shard_survey_core.test.ts`,
  `tests/manage_subscription_save_offer.test.ts`, `tests/ideas_client_cache.test.ts`,
  `tests/ideas_public_contract.test.ts`) — these guarded behaviour PM-171 intentionally
  cancels, per BIBLE guidance to rewrite/delete tests for a cancelled rule rather than
  keep them red.

Out of scope (explicitly NOT touched):
- Server-side Cloud Functions (`functions/src/user_ideas.ts`, `user_idea_likes.ts`,
  `user_idea_reports.ts`, their `exports.*` in `functions/src/index.ts`) — deletion of
  server functions/data requires a separate owner-approved decision per PM-171's
  acceptance criterion A1 ("data is not destroyed without a separate decision") and the
  task's own instruction to only list them in the report.
- Admin panel (`admin/v2/legacy.html`) — the admin Ideas moderation tab keeps reading the
  still-live backend; not a user-facing entry point.
- `app/(tabs)/_layout.tsx`, `app/(tabs)/home.tsx` — reserved for other sessions per the
  task's file restrictions.
- Any Firestore schema, security rules, or data migration.

## Architecture

Current boundary: three client-only modules (`ideas_catalog.tsx` screen,
`ideas_submit.tsx` screen, `ideas_client.ts` data/cache layer, `ideas_types.ts` types)
sit behind Expo Router routes `/ideas_catalog` and `/ideas_submit`, reachable from one
settings row (itself gated by a remote flag `ideas_enabled`, already `false` by default),
a first-visit feature-intro card, a subscription-cancel "contact support" shortcut, a
dev-only showcase tile, and a shared survey app-route union consumed by both client and
a Cloud Function (`shard_survey_core.ts`) that must stay in sync.

Intended boundary: the two screens and their exclusive client modules are deleted
outright (BIBLE: "consolidation = source demonstrably not imported and not shipped";
a bare `enabled=false` flag is explicitly insufficient and is being replaced, not kept
alongside dead code). All call sites that could navigate to them are updated to either
disappear (settings row, feature-intro card, dev showcase tile) or redirect to an
already-existing, still-shipped screen (`/support_report` for the two "contact support"
shortcuts). The survey app-route union loses the `/ideas_catalog` member on both the
client type and the server Cloud Function's runtime allow-list, kept identical between
the two copies as the file's own module doc requires ("client mirrors server").

No change to Firestore documents, security rules, or the server Ideas Cloud Functions —
the backend and admin surface for them stay exactly as they are; only the app's ability
to reach them is removed.

## Security and privacy

No new data collection, no new permission, no new third-party service. The change is a
pure reduction of a client surface. `ideas_client.ts` (deleted) contained an App Check
warm-up call and Firestore reads/writes gated by `IS_EXPO_GO`/`CLOUD_SYNC_ENABLED`; all
of that call surface disappears from the client, so the deletion strictly reduces attack
surface and network calls. Server callables and their auth/rate-limit checks are
untouched, so no security regression on the parts left running for admin use. No PII
handling changes.

## Technical debt

- Pay now: dead entry points (settings row, feature-intro card, dev showcase tile, the
  `/ideas_submit` navigation_back branch, the remote-flag change listener that existed
  only to refresh the Ideas row) are removed in this same change, not deferred.
- Contain: server Cloud Functions `submitUserIdea`, `updateUserIdea`,
  `listPublicUserIdeas`, `getPublicUserIdea`, `likeUserIdea`, `unlikeUserIdea`,
  `reportUserIdea`, and the `adminListUserIdeas`/`adminDeleteUserIdea`/
  `adminSetUserIdeaStatus`/`adminDecideUserIdea`/`adminDraftIdeaDecision`/
  `adminRestoreUserIdea`/`adminSetIdeaSubmissionRestriction`/
  `adminAlertOnUserIdeaReport` family in `functions/src/index.ts` keep running with zero
  client traffic reaching them (client can no longer call `submitUserIdea` etc.).
  Exit condition: owner decides whether to also retire/undeploy them — flagged in this
  report for that explicit decision, per PM-171's own instruction not to delete server
  functions without owner consent.
- Contain: Firestore collections backing ideas (e.g. `idea_likes_sent` subcollection,
  the ideas documents themselves) are left as-is; no data deleted. Exit condition: same
  owner decision as above.

## Verification

- `grep -rn "ideas_catalog\|ideas_submit\|prefetchPublicUserIdeas" app components` shows
  no remaining live route registration, entry point, or prefetch call (only comments
  documenting the removal and the untouched server/admin files stay).
- `app/ideas_catalog.tsx`, `app/ideas_submit.tsx`, `app/ideas_client.ts`,
  `app/ideas_types.ts` no longer exist.
- `app/_layout.tsx` no longer registers `<Stack.Screen name="ideas_catalog" .../>` or
  `name="ideas_submit"`.
- Updated/removed unit tests run individually via
  `npm run test:one -- tests/<file>` (one file at a time, under the project semaphore)
  for every test file touched in Scope; each run's final PASS/FAIL line captured in the
  execution report.
- `docs/phraseman-2.0/registries/screen_inventory.json` remains valid JSON (`python -m
  json.tool` or equivalent parse check) after the two route entries are marked
  `decision: "remove"`.
- Manual read-through of `functions/src/index.ts` and `functions/src/user_ideas*.ts` /
  `user_idea_likes.ts` / `user_idea_reports.ts` confirms zero lines changed there.

## Rollback

Pure client-side route/UI removal with no data migration: revert the commit(s) touching
`app/(tabs)/settings.tsx`, `app/feature_intro_sections_copy.ts`,
`app/manage_subscription.tsx`, `app/_dev_cancel_flow_preview.tsx`,
`app/navigation_back.ts`, `app/survey_client.ts`,
`functions/src/shard_survey_core.ts`, `components/dev/motion_showcase/**`,
`app/_layout.tsx`, and restore the deleted `app/ideas_catalog.tsx` /
`app/ideas_submit.tsx` / `app/ideas_client.ts` / `app/ideas_types.ts` files from git
history to fully re-enable the section. No entitlement, purchase, or user-owned data is
touched, so rollback carries no data-loss or compensation risk. Server functions and
Firestore data were never modified, so nothing needs restoring on that side regardless
of client rollback.
