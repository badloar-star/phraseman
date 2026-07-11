# Firebase cron cost reduction design

Date: 2026-07-10

## Objective

Reduce idle Firebase Cloud Functions and Firestore cost without removing account deletion or administrative push functionality.

## Scope

The change affects only three scheduled functions:

- `constellationCron`
- `accountDeleteRetryCron`
- `adminPushJobsCron`

No callable, Firestore trigger, queue contract, account-deletion behavior, or immediate push delivery is removed.

## Design

### Constellations

Remove the scheduled `constellationCron` export from the deployed function surface while the Constellations mode is not launched. The existing Firestore queue trigger and Constellations implementation remain intact. Re-enabling the cron later requires an explicit code change and deployment, preventing an accidental always-on scheduler.

Expected result: eliminate 1,440 scheduled invocations per day plus the empty-run configuration read, queue read, watchdog work, aggregate count, and `app_meta/constellation_searching` write.

### Account deletion retry

Keep `accountDeleteWorker` unchanged at 1 GiB and 540 seconds because a real deletion can be expensive. Change only `accountDeleteRetryCron`:

- schedule: every 30 minutes;
- memory: 256 MiB;
- timeout: 60 seconds;
- retain three scheduler retries.

The retry cron remains a bounded recovery scanner. It can process at most the existing query limits. If focused tests show that the scanner may synchronously perform a full deletion beyond the new resource envelope, separate dispatch from execution before applying the lower limits; do not weaken deletion reliability.

### Administrative push recovery

Change `adminPushJobsCron` from every 30 minutes to every 6 hours. Keep its current 512 MiB and 540-second limits because a legitimate scheduled broadcast may process many recipients. Keep `adminPushJobCreated` unchanged so newly created immediate jobs still start without waiting for the recovery cron.

The six-hour cron continues to recover `pending`/`processing` jobs and deliver `scheduled` jobs. This deliberately means scheduled push delivery may be up to six hours late; the project currently has no evidence of scheduled jobs being processed in the observed production window.

## Safety and compatibility

- Do not delete Constellations code, data, flags, or UI.
- Do not remove the account deletion worker, retry collections, tombstones, leases, or retention cleanup.
- Do not remove immediate admin push processing.
- Do not deploy unrelated dirty-worktree changes.
- Deploy only the three affected function names, and verify the resulting production configuration.
- Preserve a rollback path by recording the previous schedules and resource limits in this specification.

Previous production configuration:

- `constellationCron`: every 1 minute, 256 MiB, 60 seconds.
- `accountDeleteRetryCron`: every 5 minutes, 1 GiB, 540 seconds.
- `adminPushJobsCron`: every 30 minutes, 512 MiB, 540 seconds.

## Tests and verification

Use test-first contract coverage to require:

1. `constellationCron` is absent from the exported deployment surface.
2. `accountDeleteRetryCron` uses 30 minutes, 256 MiB, 60 seconds, and keeps three retries.
3. `accountDeleteWorker` remains 1 GiB and 540 seconds.
4. `adminPushJobsCron` uses a six-hour schedule.
5. Immediate `adminPushJobCreated` remains exported.
6. Existing focused account deletion and push-job tests pass.
7. The Functions TypeScript build succeeds.

After deployment, verify with the production function list that `constellationCron` is absent and the other two functions have the intended configuration. Compare Cloud Functions and Firestore cost after 24 hours; do not claim savings before billing data arrives.

## Out of scope

- App Check rollout.
- Callable traffic reduction.
- Changes to other scheduled functions.
- Firestore schema or security-rule changes.
- OpenAI API usage.
