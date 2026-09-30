# PM-202 — client network boundary inventory (2026-09-27)

## Scope

Read-only source inventory of direct `httpsCallable` and Firestore `.get()` usage in `app/`, `components/`, and `modules/`. This is an audit artifact, not app acceptance.

## Retained by the owner boundary

- `app/progress_events_client.ts` — progress event sync and durable outbox.
- `app/cloud_sync.ts` — account/progress synchronization, account deletion, and compatibility cleanup.
- `app/app_messages.ts` / `app/user_notifications.ts` — notification delivery and acknowledgement.
- `components/PremiumContext.tsx` / `app/revenuecat_projection_sync.ts` — subscription entitlement projection.
- `app/video_*`, `app/youtube_catalog_client.ts` — video/catalog delivery.
- learning session completion/submission sync clients — progress persistence only.

## Non-persistent reads already bounded

- `app/remote_config_client.ts` no longer exposes a live Firestore stream; its compatibility subscription returns a no-op and the active path is a bounded foreground refresh.
- `app/friends_account_store.ts` delegates to a one-shot/cache-TTL read; no direct UI `subscribeToFriends` calls remain.

## Remaining server-backed product surfaces requiring separate retirement decisions

The inventory still finds callable/read paths for AI/dialogue, Arena/Spire, community/social writes, economy settlement, reports, surveys, onboarding, and account/auth repair. They are not silently reclassified as “progress sync”; each needs a product-specific removal/replacement contract before destructive edits. No production deploy or remote deletion was performed.

## Evidence

- `tests/friends_auth_link_subscription_gate_contract.test.ts` PASS.
- `tests/friends_realtime_d66_contract.test.ts` PASS.
- `tests/phone_state_firebase_quiet_contract.test.ts` PASS (5/5).
- Source scan command: `rg -n "httpsCallable|functions\\(\\)|collection\\([^)]*\\)\\.doc\\([^)]*\\)\\.get|\\.get\\(\\)" app components modules`.
