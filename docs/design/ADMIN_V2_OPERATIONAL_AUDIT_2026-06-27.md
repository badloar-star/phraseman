# Admin v2 operational audit

Date: 2026-06-27

Status: Admin v2 has a connected operational shell. This document records what is connected, what needs `admin=true`, and what must stay server-side.

## Result

- `40/40` visible `data-action` controls have a handler in v2 scripts.
- `9/9` route targets point to existing v2 pages.
- `28` Firestore collection queries and `1` direct document read are mapped in the UI.
- `0` campus, heartbeat or fake online-presence sources are allowed.
- Diagnostics now includes an `Operational audit` board with sources, behavior and rights per section.

## Rights That Can Block The UI

| Section | Sources | What can fail without rights |
| --- | --- | --- |
| Application | `remote_config/app`, `remote_config_history`, `admin_log` | Publish, disable, approval create and audit writes require Google sign-in with custom claim `admin=true`. |
| Campaigns | `remote_config/app`, `remote_config_history`, `app_messages`, `admin_push_jobs`, `admin_config/alerts`, `admin_log` | Campaign reads and all campaign writes are admin-only. Push delivery writes should remain guarded or server-side. |
| Team | ID token, `admin_team`, `admin_approval_requests`, `admin_scheduled_changes`, `admin_log` | If the signed-in token has no `admin=true`, the screen must show the gap instead of pretending rights exist. Granting roles must be server-side. |
| Users | `users`, user timeline sources, `app_errors` | Exact search works only where rules allow it. Broad user lookup and another user's timeline require admin rights. |
| Money | `remote_config/paywall_ab`, RevenueCat events, `app_activity`, purchases | Refund, VIP grant/revoke and paywall save are high-risk writes and need confirm, permission and audit. Some sources are admin-only. |
| Content | `daily_phrases`, `card_packs`, explain reports/cache, error/community reports | Reads are connected. Publish, reorder and cache reset require admin rights; generated cache content is server-owned. |
| Community | UGC, league and arena collections | Reads are connected. Approve/reject, bans, room close and force-finish require admin rights or Cloud Functions depending on collection rules. |
| Diagnostics | `app_errors`, `admin_log`, `error_reports`, `user_reports`, `remote_config_history` | These are admin-only diagnostic sources. `permission-denied` means the account lacks the required claim; `failed-precondition` means an index/rules contract must be fixed. |

## Server-Side Only Boundaries

These must not be solved by direct browser writes:

- granting or revoking admin permissions;
- force-finishing live arena/session state when rules say Cloud Function/Admin SDK owns the write;
- creating generated explain/cache content;
- payment/refund/provider reconciliation;
- broad moderation actions that need rollback records.

Admin v2 can show these workflows and collect safe input, but the final write should go through a Cloud Function or an audited server-side flow when Firestore rules do not allow a browser client write.

## UI State Requirements

Every connected section must show one of these states:

- not signed in;
- signed in without `admin=true`;
- loading;
- empty source;
- partial source failure;
- permission denied;
- index/rules failure;
- ready;
- guarded write with confirm/audit path.

No section should show fake counters, fake online users or silent fallback data.
