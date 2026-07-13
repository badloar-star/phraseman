# Admin v2: native diagnostics workspace

## Scope

This package migrates the three remaining diagnostics fallbacks into Admin v2:

- `app-health` — current app errors, activity, filtering, safe exports, and status workflow;
- `archive` — archived user reports and resolved error reports with bounded detail;
- `changelog-0608` — the exact read-only audit archive from 8 June 2026.

Language generation is deliberately out of scope. Existing audit log, ops log, daily briefing, and budget panels remain unchanged.

## Information architecture

The existing `diagnostics` route stays the single navigation destination. A dedicated diagnostics state/view/controller module selects one of four internal views: overview, App Health, Archive, or 8 June archive. This avoids another top-level menu item while keeping each workflow addressable through its legacy capability hash.

App Health uses progressive disclosure: filters and KPI summary first, health events second, activity on demand, and mutation preview only after an action is selected. Archive uses a compact list and an accessible detail panel. The 8 June archive is an immutable same-origin snapshot, visually framed by the native shell.

UI rules:

- the lime accent is reserved for the primary action and always uses dark text;
- controls are at least 44px high and retain visible focus states;
- every icon is SVG, every non-obvious control has a tooltip, and no emoji is used as an icon;
- loading, empty, partial, truncated, stale, and error states are distinct;
- mobile layouts stack filters and turn dense rows into labelled cards.

## Server boundary

The browser never reads or writes Firestore directly for these views.

`adminGetDiagnosticsWorkspace` accepts a bounded view request:

- App Health: period `1|6|24|168`, severity, status, feature, query, page size, cursor, and `includeActivity`;
- Archive: type (`all|user|error`) and a bounded result limit.

It requires App Check and `diagnostics.read`. Identifiers and user profile fields are returned in full only when the role also has `users.read`; otherwise they are masked. Text, stack traces, tags, and nested metadata use explicit allowlists and length/depth caps. Every source returns its own health state and truncation signal.

App Health status changes use two callables:

- `adminPreviewAppHealthStatus` validates target, status (`reviewed|fixed|known`), reason, and current document version, then stores a short-lived actor-bound preview with an exact confirmation phrase;
- `adminApplyAppHealthStatus` requires the preview, exact confirmation, an idempotency key, `diagnostics.status.write`, and an unchanged target version. It updates only status/review metadata and writes a structured `admin_log` record with before/after and reason.

The apply transaction fails closed for expired/used previews, stale target state, actor mismatch, duplicate conflicting idempotency keys, or missing permission.

## App Health parity

The native view preserves:

- periods 1h, 6h, 24h, and 7d;
- severity, status, feature, and text search filters;
- GREEN/YELLOW/RED status and Critical, Warnings, Affected users, Top repeat KPIs;
- bounded pagination for older health events;
- lazy recent activity;
- safe AI-oriented report and safe raw JSON copy actions;
- status transitions to Reviewed, Fixed, and Known through preview/apply.

Exports are generated only from the sanitized server projection. They must never recreate hidden fields or unmasked identities.

## Archive parity

The native archive preserves the old source rules:

- `user_reports`: `archived` and `banned`;
- `error_reports`: `fixed` and `archived`.

It preserves type filtering and the meaningful old detail fields, including report reason/screen/status/timestamps and bounded error content, comment, category, device, app version, and user-learning metadata. The response reports source caps rather than pretending to be complete.

## 8 June audit archive

The exact legacy markup is extracted into `admin/v2/changelog-0608.html` with a small standalone shell. It is static, has no Firebase imports, no form controls that mutate data, and is linked/embedded from the native diagnostics view. A content hash contract guards accidental loss or truncation.

## Legacy cutover

The old `app-health`, `archive`, and `changelog-0608` tabs redirect to their exact Admin v2 capability hashes by default. `?legacyArchive=1` keeps an emergency comparison surface, disables all App Health and Archive controls, replaces their loaders with read-only notices, and fail-closes `markAppHealthStatus`. The static changelog remains readable.

## Acceptance criteria

- All three capabilities are mapped to native `diagnostics` and migration totals become 39 native / 20 fallback.
- No new diagnostics browser module contains Firestore collection/read/write calls.
- App Health and Archive parity items above are present and tested.
- Status apply is App-Check protected, RBAC guarded, previewed, idempotent, stale-safe, and audited.
- The legacy emergency surface cannot load live diagnostics data or mutate status.
- Focused unit/contracts, TypeScript, Admin v2 smoke, and live unauthenticated probes pass before release.
