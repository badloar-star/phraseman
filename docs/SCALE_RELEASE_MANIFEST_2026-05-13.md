# Scale Release Manifest - 2026-05-13

## Status

Server hardening and Firestore rules have been deployed to Firebase project `phraseman-ea0b3`.

This manifest is the safe allowlist for the 100k/1M readiness work. The repository has many unrelated dirty files, so do not run a production EAS update from the full current working tree unless those unrelated changes are intentionally part of the release.

## Deployed

- Firestore rules:
  - `6b9ffa23-9133-467f-a597-7560b50fe6b4`
  - `fa0c9daf-7801-475e-8b99-0b7df90fb688`
- Cloud Functions:
  - `onMatchmakingWrite`
  - `matchmakingCron`
  - `leaderboardPushMyScore`
  - `leaderboardUpdatePremium`
  - `leaderboardUpdateDailyAnalytics`
  - `leagueJoinOrUpdateGroup`
  - `leagueUpdateMyMember`
  - `leagueSyncMyBoost`

## Required Files For This Release Slice

- `.env.local.template`
- `app/app_activity.ts`
- `app/app_check_init.ts`
- `app/arena_leaderboard_fetch.ts`
- `app/services/arena_db.ts`
- `firestore.rules`
- `functions/src/callable_options.ts`
- `functions/src/index.ts`
- `functions/src/leaderboard.ts`
- `functions/src/league_groups.ts`
- `functions/src/matchmaking.ts`
- `tests/firestore_rules_security.test.ts`
- `docs/SCALE_100K_AUDIT.md`
- `docs/SCALE_RELEASE_MANIFEST_2026-05-13.md`

## Verification

Latest local checks:

- `npx tsc --noEmit --pretty false` passed.
- `cd functions; npm run build` passed.
- `cd functions; npm test -- --runInBand --no-cache` passed: 26 tests.
- `npx jest tests/firestore_rules_security.test.ts --runInBand --no-cache` passed: 34 tests.
- `firebase functions:list --project phraseman-ea0b3` confirms the deployed scale functions are active in `us-central1`.

## Remaining Build Risk

Do not publish a production EAS update directly from this dirty worktree yet.

Reason: the working tree contains many unrelated modified and untracked app files. A production EAS update bundles JavaScript from the current filesystem, so it can ship unrelated in-progress product/content changes together with the scale fixes.

Safe build path:

1. Create a clean release branch/worktree.
2. Apply only the files listed in "Required Files For This Release Slice".
3. Re-run the verification commands.
4. Smoke test on a non-busy emulator.
5. Then run the production build/update.

## Notes

- `card_packs` Firestore access was fixed without opening all marketplace data: clients can read only docs where `status == 'published'`; writes remain admin-only.
- Top-100 no longer fans out into private `users/*` reads from the client.
- App Check enforcement for hot callables is controlled by deploy env `ENFORCE_APP_CHECK=true`; it is not forced on by default.
