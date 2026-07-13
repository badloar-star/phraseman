# Phraseman Admin v2 handover — native Diagnostics

## Continue here

- Repository: `C:\appsprojects\phraseman`
- Active worktree: `C:\Users\badlo\.config\superpowers\worktrees\phraseman\admin-language-factory`
- Branch: `codex/admin-language-factory`
- Deployed baseline before this package: `eebc1cefcbb1bf5d17305a571854f9100d8c114e`
- Active goal stays open. Do not mark it complete: after this package 20 fallback capabilities will still remain.
- Language generation remains paused by the user. Work only on the admin migration.
- Do not ask the user questions. Continue autonomously.

## Production state already proven

Safety & Moderation is deployed and verified at:

- `https://phraseman-ea0b3.web.app/v2/index.html#safety-moderation`

Released functions:

- `helpBoardAdminModerate`
- `adminGetSafetyModerationWorkspace`
- `adminGetSafetyModerationSensitiveDetail`
- `adminPreviewSafetyModerationMutation`
- `adminRequestSafetyModerationApproval`
- `adminListSafetyModerationApprovals`
- `adminListSafetyModerationHistory`
- `adminApproveSafetyModerationMutation`
- `adminApplySafetyModerationMutation`
- `adminResumeSafetyModerationBulk`

Evidence from the release:

- root Safety contracts: 5 suites / 35 tests passed;
- Functions units: 4 suites / 41 tests passed;
- Firestore emulator transactions: 12/12 passed;
- TypeScript passed;
- Firestore dry-run passed;
- local and live Admin v2 smoke passed at 59 total / 36 native / 23 fallback;
- unauthenticated production callable probes returned 401;
- final Advisor review returned `DECISION: APPROVED`.

Do not redeploy or refactor Safety as part of Diagnostics.

## Current package

Migrate these three legacy fallbacks into the existing native `diagnostics` route:

- `app-health`
- `archive`
- `changelog-0608`

Target migration truth: 59 total / 39 native / 20 fallback.

The approved design and plan are:

- `docs/superpowers/specs/2026-07-13-admin-diagnostics-native-design.md`
- `docs/superpowers/plans/2026-07-13-admin-diagnostics-native.md`

Advisor planning verdict: `APPROVED_PLAN`.

Important Advisor refinement: reuse `adminUpdateReportStatus` for App Health mutations; do not create a second status mutation path.

## Legacy parity map

App Health must preserve:

- periods 1h / 6h / 24h / 7d;
- severity, status, feature, and search filters;
- GREEN/YELLOW/RED rules:
  - RED when critical > 0 or affected users >= 10;
  - YELLOW when warnings >= 5 or affected users >= 3;
  - GREEN otherwise;
- Critical, Warnings, Affected users, Top repeat KPIs;
- repeat grouping by fingerprint, falling back to context;
- bounded older-page loading;
- lazy `app_activity`;
- bounded detail;
- AI report copy and safe raw JSON copy;
- status actions Reviewed / Fixed / Known.

Archive must preserve:

- `user_reports` statuses `archived` and `banned`;
- `error_reports` statuses `fixed` and `archived`;
- type filter;
- descending date order;
- bounded details for report/error, user-learning metadata, app/device/version, comment and category;
- identity removal/masking when the role lacks `users.read`;
- truthful truncation/source-health indicators.

The 8 June archive must be an exact, scriptless, hash-locked static extraction loaded in a sandboxed frame.

## Files already added/changed for this package

Added:

- `docs/superpowers/specs/2026-07-13-admin-diagnostics-native-design.md`
- `docs/superpowers/plans/2026-07-13-admin-diagnostics-native.md`
- `tests/admin_v2_diagnostics_native_contract.test.ts`
- `tests/admin_legacy_diagnostics_archive_contract.test.ts`
- this handover.

Changed:

- `tests/admin_v2_native_capability_routing.test.ts` — expected 39 native and exact diagnostics routes.
- `tests/admin_v2_migration_coverage.test.ts` — expected 39 guarded / 20 fallback.

These are intentional red TDD contracts. No production implementation for Diagnostics has been added yet.

## Agent incident

The backend worker `019f5a93-bc5f-7ee3-a21f-0dc2b0f3ea0c` disconnected before completion. It changed no backend files. Do not wait for or reuse it.

## Backend work to implement

Create:

- `functions/src/admin_app_health.ts`
- `functions/src/admin_app_health.test.ts`
- `functions/src/admin_diagnostics_archive.ts`
- `functions/src/admin_diagnostics_archive.test.ts`

Export from `functions/src/index.ts`:

- `adminListAppHealth`
- `adminListAppActivity`
- `adminGetAppHealthDetail`
- `adminExportAppHealth`
- `adminListDiagnosticsArchive`
- `adminGetDiagnosticsArchiveDetail`

All callables: `us-central1`, strict App Check, admin authentication, `diagnostics.read`, bounded input/output, no compound index dependency, identity gated by `users.read`.

Extend `functions/src/admin_reports_center.ts` and its tests:

- App Health writes keep using `adminUpdateReportStatus`;
- permission `diagnostics.status.write`;
- only UI statuses Reviewed / Fixed / Known;
- required human reason and server-validated confirmation;
- expected status, stable idempotency key, request ID;
- transaction stale-state check;
- idempotent replay/conflict;
- legacy `reviewedAt` / `reviewedBy` plus modern metadata;
- structured `admin_log` in the same transaction.

## Frontend work to implement

Create:

- `admin/v2/scripts/admin-diagnostics-state.js`
- `admin/v2/scripts/admin-diagnostics-controller.js`
- `admin/v2/scripts/admin-diagnostics-view.js`
- `admin/v2/data/changelog-0608.html`
- `scripts/admin-v2-extract-changelog-0608.mjs`

Modify:

- `admin/v2/scripts/admin-firebase.js`
- `admin/v2/scripts/admin-core.js`
- `admin/v2/scripts/admin-capabilities.js`
- `admin/v2/styles/admin.css`
- `admin/index.html`
- migration boards/docs generated from the capability registry.

Keep `admin-core.js` changes to integration hooks. UI stays compact, accessible, tooltip-rich, responsive, and uses lime only for primary actions with dark foreground.

Legacy cutover:

- normal old hashes redirect to exact v2 capability hashes;
- `?legacyArchive=1` keeps markup but prevents live App Health/Archive reads and every App Health write/copy entry point;
- June 8 static content remains readable;
- do not delete legacy source.

## Test-runner note

Two attempts to run root Jest from the long worktree path returned “No tests found” before executing any test. Jest produced a mixed-slash absolute `testMatch`:

`C:/Users/badlo\.config/superpowers/worktrees/phraseman/admin-language-factory/tests/**/*.test.ts`

This is a worktree-path/Jest discovery issue, not a product test failure. Resolve it before claiming verification (for example run through a short junction path or an explicit temporary Jest config with a forward-slash root). Do not weaken or delete tests. Tests must remain read-only guards.

The expected first successful run is red because implementation files do not exist yet.

## Required verification before deployment

Focused Functions tests:

`npm --prefix functions test -- --runInBand src/admin_app_health.test.ts src/admin_diagnostics_archive.test.ts src/admin_reports_center.test.ts`

Focused root contracts:

`tests/admin_v2_diagnostics_native_contract.test.ts`
`tests/admin_legacy_diagnostics_archive_contract.test.ts`
`tests/admin_v2_native_capability_routing.test.ts`
`tests/admin_v2_migration_coverage.test.ts`
`tests/admin_v2_complete_capability_registry.test.ts`
`tests/admin_v2_safety_moderation_contract.test.ts`
`tests/admin_v2_safety_moderation_queue_contract.test.ts`
`tests/admin_legacy_safety_archive_contract.test.ts`

Then:

- node syntax checks for new Admin modules and touched core/firebase modules;
- TypeScript build/check without leaving generated `functions/lib` changes;
- changelog extraction `--check`;
- migration board `--check`;
- language, visible-text, runtime-state audits;
- local Admin v2 smoke;
- browser widths 375 / 768 / 1024 / 1440;
- final Advisor review of the actual diff and evidence, requiring `DECISION: APPROVED`.

Only after approval deploy the six new read callables, the updated `adminUpdateReportStatus`, and Admin Hosting. Then run live smoke and unauthenticated 401 probes.

## Safety around build/deploy

The worktree does not retain Functions email environment files. For a targeted deploy, copy `functions/.env` and `.env.phraseman-ea0b3` from the main workspace without printing values, deploy, then remove them from the worktree.

`npm --prefix functions run build` generates many tracked/untracked `functions/lib` changes. After verification/deploy, clean only generated output safely with `git stash-real`; never use destructive reset/checkout and never expose environment values.

## Start command for the next session

“Continue the active Admin v2 goal from `docs/superpowers/handoffs/2026-07-13-admin-diagnostics-native-handover.md` in worktree `C:\Users\badlo\.config\superpowers\worktrees\phraseman\admin-language-factory`. Implement and deploy the approved native Diagnostics package. Do not revisit finished Safety work and do not work on language generation.”

## Находки и предложения

- Resolve the root Jest mixed-slash worktree discovery issue first so the red-green TDD history is trustworthy.
- Show truncation next to the GREEN/YELLOW/RED health result; a limited sample must never look conclusively healthy.
- Keep the six diagnostics reads separate from the general report queue because that queue starts with `reports.read`, which would incorrectly exclude diagnostics-only roles.
