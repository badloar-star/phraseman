# YouTube Catalog Rollout

## Scope

This runbook covers the multichannel YouTube catalog, playlists, upcoming/live premieres, local reminders, and the RSS rollback path. The only supported editor is `admin/v2/legacy.html`. Admin V2 is not part of this rollout.

## Preconditions

- Keep the legacy remote-config fields `youtube_channel_id`, `youtube_channel_handle`, `youtube_channel_name`, `youtube_channel_url`, and `youtube_pinned_videos` during the first release.
- Create the Firebase secret `YOUTUBE_DATA_API_KEY` and restrict it to the YouTube Data API and the production project.
- Confirm the target Firebase project and release owner before any deploy. This document does not authorize a deploy.
- Record the currently active `youtube_catalog/public.activeVersion` before changing configuration.

## Rollout order

1. Deploy the reviewed Firestore Rules for the public manifest and immutable catalog snapshots.
2. Deploy the YouTube catalog callable/scheduled functions and provide `YOUTUBE_DATA_API_KEY` only to server functions.
3. Open the legacy admin YouTube catalog section. If no catalog configuration exists, review the draft bootstrapped from the legacy channel and pinned videos.
4. Add the additional channels, language tags, locale defaults, playlist overrides, and time-bounded premiere overrides.
5. Enter a reason, preview validation, and publish the configuration revision.
6. Run one manual refresh. Confirm the snapshot root is `ready`, its counts are plausible, and `youtube_catalog/public.activeVersion` points to that exact version.
7. Confirm quota diagnostics, last-success time, next-run time, and the absence of a sync error in the legacy admin.
8. Release the mobile client only after the public snapshot is readable on a non-admin account.
9. Monitor sync errors, quota use, stale-catalog notices, reminder failures, and client fallback use for the first release window.

## Smoke checks

- Automatic channel selection follows the app language; manual selection persists and can return to automatic mode.
- Removing a channel safely clears an invalid manual preference.
- Each channel shows Home, Playlists, All videos, and playlist detail.
- Upcoming premieres show a localized countdown at more than one hour, under one hour, and under ten minutes.
- Reminder permission is requested only after tapping the reminder action; blocked permission offers Settings as a separate action.
- A moved premiere reschedules its reminder. Hidden, live, completed, removed, or past premieres cancel it.
- The first live entry shows the premium intro once per video. The second entry is static. Reduced Motion skips decorative motion.
- There is no autoplay. Completed premieres leave the hero and remain in the regular feed.
- Verify light/dark themes, a narrow phone width near 375 px, a wide layout near 768 px, Android/iOS back navigation, offline launch, channel picker, and playlist detail.

## Expected fallback order

1. Fresh public catalog version.
2. Account-scoped local catalog snapshot, with a quiet stale/offline notice.
3. Existing channel RSS merged with legacy pinned videos.
4. Built-in PHRASEMAN English videos for the default channel.

Never clear ready content while a refresh is in flight. An account switch must not expose another account's cache.

## Rollback

1. Set `youtube_catalog/config.enabled` to `false` through the reviewed server/admin path.
2. Leave the legacy remote-config channel and pinned-video fields intact so mobile clients can use RSS fallback.
3. If only the newest snapshot is bad, switch `youtube_catalog/public.activeVersion` to a previously verified `ready` version through a server-side rollback command or reviewed maintenance script. Do not write it from a client.
4. Confirm a failed or partial sync did not modify the public manifest.
5. Confirm clients show the last local catalog or RSS fallback without an empty-state layout jump.
6. Record the rollback reason, actor, old/new version IDs, and verification result.

## Security and operational checks

- Never place the YouTube API key in app, components, shared client code, admin HTML, Firestore documents, logs, screenshots, or this runbook.
- Public clients may read only the public manifest and ready snapshot documents; configuration, sync state, operations, and history remain protected.
- Configuration changes require an authenticated authorized admin, revision match, reason, request ID, idempotency key, audit record, and history entry.
- Keep snapshot bounds and retention enabled. Do not publish a manifest before every required snapshot document is written and verified.

## Verification record

Automated verification is recorded in the implementing commit history. Add release-time device screenshots and production version IDs to the release ticket, not to this repository. No deployment is performed by this runbook.
