# Admin v2 user-perspective audit

Date: 2026-06-27
Scope: `admin/v2` and deployed root admin shell.

## Verdict

HOLD.

The admin is functionally safer than the old screen, but it is not yet simple enough from the owner's perspective. The largest remaining problem is language: too many labels still sound like developer tools instead of product controls.

## Owner Perspective Problems

1. Some labels are still English or semi-technical: Preview, Query contract, Campaign Wizard, Audit, Reports, Rollback, App Health, Release Health.
2. Technical collection names are still visible in multiple places: `remote_config`, `admin_log`, `app_errors`, `user_reports`, `error_reports`.
3. Empty states often say "not loaded" instead of telling the owner what to do next.
4. Archive links are useful for safety, but they are too visible and make v2 feel unfinished.
5. Diagnostics is too engineer-facing. It needs owner-facing names first and technical source names second.
6. The overview is not yet a true daily cockpit. It should answer: what is on, what is broken, what needs my decision.
7. User reports are back, but they still need filters: new, reviewed, by user, by reason, by date.
8. Some sections still show too many panels even with subsections; "Technical" should hold contracts, migration, function-transfer, and audit internals.

## Engineering Perspective Problems

1. Runtime localization helps, but source strings should also be Russian so regressions are easier to catch.
2. Read/write boundaries are safer now, but many pages are still read-only dashboards rather than complete workflows.
3. Approval and scheduled-change flows exist, but need a full product path: create request, review diff, approve, apply, rollback.
4. Firestore permission/index failures are visible, but each error needs a specific "what to fix" message.
5. Button handlers and route targets currently pass static audit, but dynamic button output needs recurring checks.

## Current Safety Checks

- Button/action audit: all static `data-action` handlers are present.
- Tooltip audit: static buttons/links have tooltip or aria-label.
- Route audit: static `data-route-target` values point to existing pages.
- New language audit script: `node scripts/admin-v2-language-audit.mjs`.

## Next Fix Priority

1. Replace remaining visible English source strings with owner-friendly Russian.
2. Move technical contract blocks into a consistently named "Техническое" subsection.
3. Improve empty states and global alerts to say the next action.
4. Add filters and counters to "Жалобы пользователей".
5. Reduce visible archive buttons to one emergency entry.
