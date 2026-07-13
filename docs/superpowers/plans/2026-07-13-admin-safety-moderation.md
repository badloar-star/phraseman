# Admin Safety & Moderation Center Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Перенести жалобы пользователей, safety flags, возраст/согласия, compliance evidence и блокировки в единый безопасный native-раздел Admin v2 без потери существующих функций.

**Architecture:** Чистое TypeScript-ядро формирует allowlist-проекции, агрегаты, fingerprints и CSV; callable-слой выполняет actor-bound snapshots, RBAC и preview/apply/approval. Единый global-ban core устраняет частичные браузерные записи, а frontend state/view/controller подключает семь внутренних представлений без прямого Firestore.

**Tech Stack:** TypeScript, Firebase Functions v2, Firestore transactions/indexes/rules, Firebase Web SDK, vanilla ES modules, Jest.

---

### Task 1: Pure projection and evidence contracts

**Files:**
- Create: `functions/src/admin_safety_moderation_core.ts`
- Create: `functions/src/admin_safety_moderation_core.test.ts`

- [ ] **Step 1: Write failing tests for allowlists and bounded sensitive text**

  Tests construct report/flag/consent/ban documents containing extra secret fields and assert that `projectUserReport`, `projectSafetyFlagSummary`, `projectConsentAggregateInput` and `projectBanSummary` return only declared fields. Safety list projection must expose `textPreview` capped at 120 characters and never return `historyContext`.

- [ ] **Step 2: Run the test and verify RED**

  Run: `cd functions && npm test -- --runInBand src/admin_safety_moderation_core.test.ts`  
  Expected: FAIL because `admin_safety_moderation_core` does not exist.

- [ ] **Step 3: Implement explicit types and allowlist projectors**

  Export `SafetyModerationView`, `SourceState`, `ReportSummary`, `SafetyFlagSummary`, `BanSummary`, `ConsentAggregateInput`, and the four projector functions. Every string passes through a bounded sanitizer; no projector spreads an input document.

- [ ] **Step 4: Add failing tests for filtering, source coverage and evidence**

  Cover legacy report status/reason filters, safety category/open/handled filters, ban search/sort, `ready | partial | error`, and `buildPolicyEvidence`. Assert the evidence output contains no jurisdiction inferred from language and never labels denied analytics consent a violation.

- [ ] **Step 5: Implement filters and evidence aggregation**

  `buildPolicyEvidence` returns counts for age brackets, analytics consent, legal acceptance, platform, stale/invalid/unknown records and explicit `missingEvidence` identifiers. It marks the source `client_reported_legacy_telemetry` and returns no legal verdict.

- [ ] **Step 6: Add and implement CSV formula-injection tests**

  `buildUserReportsCsv` must prefix cells beginning with `=`, `+`, `-`, or `@` with a single quote, quote commas/newlines, preserve legacy columns, and exclude raw safety/consent documents.

- [ ] **Step 7: Verify GREEN**

  Run: `cd functions && npm test -- --runInBand src/admin_safety_moderation_core.test.ts`  
  Expected: PASS with no warnings.

### Task 2: RBAC and immutable read-model snapshots

**Files:**
- Create: `functions/src/admin_safety_moderation.ts`
- Create: `functions/src/admin_safety_moderation.test.ts`
- Modify: `functions/src/admin/permissions.ts`
- Modify: `functions/src/admin/permissions.test.ts`
- Modify: `functions/src/index.ts`
- Modify: `firestore.indexes.json`

- [ ] **Step 1: Write failing permission-matrix tests**

  Add the nine `users.moderation.*` permissions from the design. Assert Support can read reports but not safety raw text, Moderator can read/handle safety and warn, Analyst receives aggregates only, and Admin/Owner have export/identity/ban/approve/restore.

- [ ] **Step 2: Run permission tests and verify RED**

  Run: `cd functions && npm test -- --runInBand src/admin/permissions.test.ts`  
  Expected: FAIL because the moderation permissions are absent.

- [ ] **Step 3: Implement the permission matrix**

  Extend `AdminPermission` and role sets without removing existing permissions. Keep `content_editor` and `developer` without moderation access.

- [ ] **Step 4: Write failing callable tests**

  Tests must prove literal strict App Check, authentication, permission checks per view, actor/scope/filter-bound snapshot reuse, 30-minute TTL, cursor scope rejection, same-snapshot CSV, and truthful partial states when a cap or source error is hit.

- [ ] **Step 5: Implement `adminGetSafetyModerationWorkspace`**

  Read bounded source sets, project through the pure core, store private snapshot docs under `admin_safety_moderation_snapshots`, and return only allowlisted data. Use `onCall({ region: REGION, enforceAppCheck: true })` rather than the optional environment flag.

- [ ] **Step 6: Implement audited sensitive-detail retrieval**

  Add `adminGetSafetyModerationSensitiveDetail`. It requires `users.moderation.sensitive.read`, returns only `userText` and bounded `historyContext` for one flag, and creates an audit entry containing IDs/category only—not raw text.

- [ ] **Step 7: Register exports and indexes**

  Export both callables from `functions/src/index.ts`. Add only required composite indexes for report status/reason/time, flag handled/category/time, bans time/name, consents updated time and moderation approval requests.

- [ ] **Step 8: Verify GREEN and build**

  Run: `cd functions && npm test -- --runInBand src/admin_safety_moderation_core.test.ts src/admin_safety_moderation.test.ts src/admin/permissions.test.ts && npm run build`  
  Expected: PASS and TypeScript build exit 0.

### Task 3: Global ban enforcement core and reconciliation

**Files:**
- Create: `functions/src/admin_global_ban_core.ts`
- Create: `functions/src/admin_global_ban_core.test.ts`
- Modify: `functions/src/admin_user_profile.ts`
- Modify: `functions/src/admin_user_profile.test.ts`

- [ ] **Step 1: Write failing reconciliation tests**

  Cover authoritative `banned_users`, stale `users.banned`, missing/present leaderboard, independent `league_chat_bans`, unavailable reads and `consistent | inconsistent | unavailable` projection states.

- [ ] **Step 2: Run and verify RED**

  Run: `cd functions && npm test -- --runInBand src/admin_global_ban_core.test.ts src/admin_user_profile.test.ts`  
  Expected: FAIL because shared reconciliation is absent.

- [ ] **Step 3: Implement pure reconciliation and transaction builders**

  Export `buildBanReconciliation`, `buildBanWrites`, and `buildUnbanWrites`. Ban writes create the source-of-truth doc, set `users.banned`, capture a private leaderboard before-state and remove leaderboard. Unban never touches `league_chat_bans`; leaderboard restore is emitted only with a valid captured before-state and CAS preconditions.

- [ ] **Step 4: Reuse reconciliation in user profile**

  Replace profile-local ban precedence with the shared projection. Return compact moderation aggregates and `#safety-moderation?view=...&uid=...` deep links without raw safety content.

- [ ] **Step 5: Verify GREEN**

  Run: `cd functions && npm test -- --runInBand src/admin_global_ban_core.test.ts src/admin_user_profile.test.ts`  
  Expected: PASS.

### Task 4: Preview/apply/approval mutation workflow

**Files:**
- Modify: `functions/src/admin_safety_moderation.ts`
- Modify: `functions/src/admin_safety_moderation.test.ts`
- Modify: `functions/src/index.ts`

- [ ] **Step 1: Write failing preview tests**

  Cover `report_set_status`, `report_archive_bulk`, `report_warn`, `report_rename`, `safety_set_disposition`, `safety_handle_bulk`, `user_ban`, `user_unban` and `restore_operation`. Assert mandatory reason, exact confirmation for dangerous operations, source fingerprint, actor binding, expiry and rollback description.

- [ ] **Step 2: Implement `adminPreviewSafetyModerationMutation`**

  Persist private preview docs for 30 minutes. Dangerous identity/ban/unban operations set `requiresApproval: true`; warning is marked irreversible with the current client protocol.

- [ ] **Step 3: Write failing approval tests**

  Assert only `users.moderation.approve` can approve, requester cannot approve their own request, approval is bound to the exact preview fingerprint, and expired/consumed approval fails.

- [ ] **Step 4: Implement request and approve callables**

  Add `adminRequestSafetyModerationApproval` and `adminApproveSafetyModerationMutation` using `admin_approval_requests` with `type: 'safety_moderation'`, actor-bound idempotency and immutable audit records.

- [ ] **Step 5: Write failing apply tests**

  Cover actor-bound replay, same request ID from another actor, stale target drift, warning+reviewed atomicity, nickname collision/reservation, ban+report status atomicity, unban without false leaderboard promise, independent chat-ban preservation and CAS restore.

- [ ] **Step 6: Implement `adminApplySafetyModerationMutation`**

  Re-check role, preview actor/TTL/fingerprint, current target state and approval inside transactions. Persist operation and history records without raw conversation text; replay returns the original result only when actor and request fingerprint match.

- [ ] **Step 7: Implement resumable bounded bulk operations**

  Snapshot at most 400 target IDs, write a server manifest, process transaction-safe chunks and return `completedCount`, `failedCount`, `remainingCount`, `status` and a resume token. Never report complete while remaining targets exist.

- [ ] **Step 8: Register exports and verify GREEN**

  Run: `cd functions && npm test -- --runInBand src/admin_safety_moderation.test.ts src/admin_global_ban_core.test.ts && npm run build`  
  Expected: PASS and build exit 0.

### Task 5: Close Report Center and Help Board bypasses

**Files:**
- Modify: `functions/src/admin_reports_center.ts`
- Modify: `functions/src/admin_reports_center.test.ts`
- Modify: `functions/src/help_board.ts`
- Modify: `functions/src/help_board.test.ts`

- [ ] **Step 1: Write failing bypass tests**

  Assert `adminUpdateReportStatus` rejects `source: 'user_reports'`; its idempotent replay is actor-bound. Assert `helpBoardAdminModerate` rejects `ban_author` with a structured migration error while hide/restore/delete/resolve/restrict/unrestrict remain unchanged.

- [ ] **Step 2: Run and verify RED**

  Run: `cd functions && npm test -- --runInBand src/admin_reports_center.test.ts src/help_board.test.ts`  
  Expected: FAIL on both bypasses.

- [ ] **Step 3: Implement fail-closed compatibility behavior**

  Preserve report replies and non-user-report status updates. Return a machine-readable `safety_moderation_required` detail so Admin v2/legacy can deep-link with UID/source context.

- [ ] **Step 4: Verify GREEN**

  Run: `cd functions && npm test -- --runInBand src/admin_reports_center.test.ts src/help_board.test.ts`  
  Expected: PASS.

### Task 6: Native frontend state, view and controller

**Files:**
- Create: `admin/v2/scripts/admin-safety-moderation-state.js`
- Create: `admin/v2/scripts/admin-safety-moderation-view.js`
- Create: `admin/v2/scripts/admin-safety-moderation-controller.js`
- Create: `tests/admin_v2_safety_moderation_contract.test.ts`
- Modify: `admin/v2/scripts/admin-firebase.js`
- Modify: `admin/v2/scripts/admin-core.js`
- Modify: `admin/v2/styles/admin.css`

- [ ] **Step 1: Write failing frontend contract tests**

  Assert seven views, callable-only access, no Firestore imports, safe detail loading, snapshot pagination/CSV, preview/apply/approval, bulk progress, `loading | empty | ready | partial | error`, tooltips, labels, keyboard focus and compact mobile selector.

- [ ] **Step 2: Run and verify RED**

  Run: `npx jest --runTestsByPath tests/admin_v2_safety_moderation_contract.test.ts --runInBand`  
  Expected: FAIL because the modules do not exist.

- [ ] **Step 3: Implement state module**

  State stores current view/filters/UID, workspace snapshot, source states, pagination, selected rows, sensitive-detail loading, preview/approval/apply state and resumable operation progress. State transitions preserve the current view during quiet refresh.

- [ ] **Step 4: Implement accessible view module**

  Render the seven internal views with one contextual primary action, SVG icons, `title`, `aria-*`, dark text on lime, cards at 375 px and dense tables at larger widths. Compliance copy states facts and missing evidence only.

- [ ] **Step 5: Implement controller and Firebase wrappers**

  Add wrappers for all six moderation callables. Controller parses deep-link context, delegates events, restores focus after panels, downloads snapshot CSV, resumes bulk operations and never invokes direct Firestore.

- [ ] **Step 6: Wire route lifecycle**

  Register the center in `admin-core.js` as a thin route. Existing Report Center renderer is reused in the `other-reports` view rather than duplicated.

- [ ] **Step 7: Verify GREEN and JS syntax**

  Run: `npx jest --runTestsByPath tests/admin_v2_safety_moderation_contract.test.ts --runInBand && node --check admin/v2/scripts/admin-safety-moderation-state.js && node --check admin/v2/scripts/admin-safety-moderation-view.js && node --check admin/v2/scripts/admin-safety-moderation-controller.js`  
  Expected: PASS and all syntax checks exit 0.

### Task 7: Routing, capabilities and migration coverage

**Files:**
- Modify: `admin/v2/scripts/admin-router.js`
- Modify: `admin/v2/scripts/admin-capabilities.js`
- Modify: `tests/admin_v2_native_capability_routing.test.ts`
- Modify: `tests/admin_v2_migration_coverage.test.ts`
- Modify: `tests/admin_v2_complete_capability_registry.test.ts`

- [ ] **Step 1: Write failing route and coverage assertions**

  Assert the five legacy hashes and `reports` aliases map to the correct Safety Center view, all five capabilities are native, no fallback frame is used, and counts are exactly `59/36/23`.

- [ ] **Step 2: Run and verify RED**

  Run: `npx jest --runTestsByPath tests/admin_v2_native_capability_routing.test.ts tests/admin_v2_migration_coverage.test.ts tests/admin_v2_complete_capability_registry.test.ts --runInBand`  
  Expected: FAIL with five fallback capabilities.

- [ ] **Step 3: Implement aliases and native capability mappings**

  Add `safety-moderation` to subroutes, set per-alias view context and update labels so `compliance-radar` becomes «Политика и доказательства», not «Правовые риски».

- [ ] **Step 4: Verify GREEN**

  Run the same three Jest files.  
  Expected: PASS with `59/36/23`.

### Task 8: Legacy static archive and direct-write removal

**Files:**
- Modify: `admin/index.html`
- Modify: `tests/admin_legacy_write_safety_contract.test.ts`
- Create: `tests/admin_legacy_safety_archive_contract.test.ts`

- [ ] **Step 1: Write failing archive contracts**

  Assert the five tabs redirect to native v2 by default, `?legacyArchive=1` renders static notices, controls are disabled, no target loader invokes Firestore, and mutation globals route/fail closed. Assert Help Board ban links to Safety Center instead of calling `ban_author`.

- [ ] **Step 2: Run and verify RED**

  Run: `npx jest --runTestsByPath tests/admin_legacy_safety_archive_contract.test.ts tests/admin_legacy_write_safety_contract.test.ts --runInBand`  
  Expected: FAIL while legacy loaders/mutations remain active.

- [ ] **Step 3: Add the archive cutover block**

  Mirror the established Voice archive approach. Static notices explain that data moved to v2 and include exact native deep links; archive mode does not load sensitive collections.

- [ ] **Step 4: Neutralize duplicate ban loaders and dynamic writes**

  Ensure `loadUserReports`, `loadSafetyFlags`, `loadAgeConsent`, `loadComplianceRadar`, both `loadBanList` definitions, `urAction`, `urBulkAction`, `markSafetyHandled`, `markAllSafetyHandled`, `banByUidPrompt`, `unbanFromList` and Help Board ban cannot perform direct reads/writes for migrated tabs.

- [ ] **Step 5: Verify GREEN and legacy audit**

  Run: `npx jest --runTestsByPath tests/admin_legacy_safety_archive_contract.test.ts tests/admin_legacy_write_safety_contract.test.ts --runInBand && node scripts/admin-legacy-button-audit.mjs`  
  Expected: target tabs have no actionable direct-write controls; unrelated legacy functionality remains unchanged.

### Task 9: Firestore rules and installed-app compatibility

**Files:**
- Modify: `firestore.rules`
- Modify: `tests/firestore_rules_security.test.ts`
- Modify: `tests/admin_server_only_boundaries.test.ts`
- Modify: `tests/user_warning_check.test.ts`

- [ ] **Step 1: Write failing rules tests**

  Assert all new admin collections deny browser read/write, admin browser cannot read/write reports/flags/consents after cutover, foreign users cannot read warnings, server writes remain possible, own-user ban/consent/warning paths retain required app compatibility.

- [ ] **Step 2: Run and verify RED**

  Run: `npx jest --runTestsByPath tests/firestore_rules_security.test.ts tests/admin_server_only_boundaries.test.ts tests/user_warning_check.test.ts --runInBand`  
  Expected: FAIL because warnings are broadly readable and migrated admin reads remain allowed.

- [ ] **Step 3: Apply the narrow rules lockdown**

  Deny client access to moderation snapshots/previews/history/operations. Remove admin browser access from reports/flags/consents. Keep owner consent write until the separate callable adoption gate. Restrict warnings to the owning UID only if the compatibility test proves installed-app identity matching; otherwise retain current read temporarily and record the deferred security migration explicitly in evidence.

- [ ] **Step 4: Verify GREEN**

  Run the same three Jest files.  
  Expected: PASS without breaking the mobile warning/ban/consent contract.

### Task 10: Focused integration, responsive UI and production evidence

**Files:**
- Create: `docs/reports/admin-safety-moderation-verification-2026-07-13.md`
- Modify: `docs/admin-v2-migration-inventory.md`

- [ ] **Step 1: Run focused backend integration**

  Run: `cd functions && npm test -- --runInBand src/admin_safety_moderation_core.test.ts src/admin_safety_moderation.test.ts src/admin_global_ban_core.test.ts src/admin_reports_center.test.ts src/admin_user_profile.test.ts src/help_board.test.ts && npm run build`  
  Expected: PASS and build exit 0.

- [ ] **Step 2: Run focused frontend/rules contracts**

  Run the Safety Center, routing, migration, archive, server-boundary and rules tests from Tasks 6–9 in one `--runInBand` command.  
  Expected: PASS with `59/36/23`.

- [ ] **Step 3: Perform local authenticated visual smoke**

  Inspect 375/768/1024/1440 layouts, all seven views, loading/empty/error/partial, keyboard navigation, detail audit, preview/approval/apply, CSV, UID deep links and double-apply behavior. Save screenshots/IDs under ignored QA artifacts and summarize evidence in the verification report.

- [ ] **Step 4: Run read-only production reconciliation**

  Under an authorized admin session, compare `banned_users`, `users.banned`, leaderboard and chat restrictions without mutating data. Record coverage, mismatches and source errors; do not call project OpenAI APIs.

- [ ] **Step 5: Update inventory and verification report**

  Record exact tests, timestamps, capability counts, known compatibility deferrals, index readiness and smoke audit/operation IDs. Do not claim production completion before deployment evidence exists.

### Task 11: Final review and staged deployment

**Files:**
- No new source files unless review findings require corrections.

- [ ] **Step 1: Request mandatory final advisor review**

  Supply objective, design, plan, final diff, tests, visual evidence, production reconciliation, affected rules/indexes/functions and unresolved compatibility risks. Required result: `DECISION: APPROVED`.

- [ ] **Step 2: Apply any required changes and repeat focused verification**

  If review returns `CHANGES_REQUIRED`, add a failing regression test, implement the correction, rerun the affected focused gate and resubmit the actual final state.

- [ ] **Step 3: Deploy indexes and wait for Ready**

  Deploy only the added indexes and verify console/CLI readiness before functions.

- [ ] **Step 4: Deploy targeted functions and run role canaries**

  Deploy only new/changed moderation, reports, profile and Help Board functions. Smoke Owner, Admin, Moderator, Support and Analyst permissions; verify negative access and App Check.

- [ ] **Step 5: Deploy Admin hosting**

  Run: `npm run hosting:admin`  
  Expected: successful Firebase Hosting `admin` deploy.

- [ ] **Step 6: Verify live UI before rules lockdown**

  Confirm all aliases, seven views, snapshot↔CSV, sensitive-detail audit, preview/approval/apply, double apply, profile links and static legacy archive.

- [ ] **Step 7: Deploy rules separately and repeat negative tests**

  Deploy `firestore.rules`, then prove direct browser SDK reads/writes fail while mobile own-user paths continue to work.

- [ ] **Step 8: Record final release evidence**

  Add release identifiers, URLs, index readiness, function/rules/hosting results and live smoke IDs to the verification report. Only then mark this package complete; the global Admin v2 goal remains active until all remaining fallback capabilities are migrated.
