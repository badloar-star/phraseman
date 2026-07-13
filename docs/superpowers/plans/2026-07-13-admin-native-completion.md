# Phraseman Admin v2 Native Completion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move the final 20 Admin capabilities from legacy fallback to bounded native Admin v2 workspaces and release 59 native / 0 fallback safely.

**Architecture:** Three package-specific state/controller/view modules call three package-specific server projection/command modules. Reads are bounded server projections; writes use preview, second-admin approval where required, idempotent apply, stale-state checks and same-transaction audit. The final cutover redirects normal legacy entry points and leaves archive mode inert.

**Tech Stack:** Static ES modules/CSS, Firebase Auth and callable Functions, TypeScript, Firestore Admin SDK transactions, Jest contracts/unit tests, Firebase emulator where needed, browser smoke.

**Design reference:** `docs/superpowers/specs/2026-07-13-admin-native-completion-design.md`

---

### Task 1: Lock the 59/0 contract in red tests

**Files:**
- Create: `tests/admin_v2_money_native_contract.test.ts`
- Create: `tests/admin_v2_content_native_contract.test.ts`
- Create: `tests/admin_v2_community_native_contract.test.ts`
- Create: `tests/admin_legacy_native_completion_archive_contract.test.ts`
- Modify: `tests/admin_v2_native_capability_routing.test.ts`
- Modify: `tests/admin_v2_migration_coverage.test.ts`
- Modify: `tests/admin_v2_complete_capability_registry.test.ts`

- [ ] Add exact route, module, callable, permission, state, accessibility and no-client-Firestore contracts for the five Money capabilities.
- [ ] Run the Money contract and confirm it fails because the native package does not exist.
- [ ] Add equivalent exact contracts for the six Content capabilities, including immutable French HOLD flags.
- [ ] Run the Content contract and confirm the expected missing-package failure.
- [ ] Add equivalent exact contracts for the nine Community capabilities, including no read-triggered arena mutation and Safety links for global bans.
- [ ] Run the Community contract and confirm the expected missing-package failure.
- [ ] Add legacy redirect/archive contracts for all four legacy files.
- [ ] Change migration truth expectations to `{ total: 59, guarded: 59, fallback: 0 }` and confirm the focused migration tests fail at 39/20.

### Task 2: Add the shared permission and approval vocabulary

**Files:**
- Modify: `functions/src/admin/permissions.ts`
- Modify: `functions/src/admin/permissions.test.ts`
- Modify: `admin/v2/scripts/admin-core.js`
- Test: `tests/admin_server_only_boundaries.test.ts`

- [ ] Write failing role-matrix tests for every new permission and self-approval rejection.
- [ ] Run focused permission tests and confirm the missing permission failures.
- [ ] Add the new permission literals and exact role grants from the design.
- [ ] Mirror the matrix in Admin v2 and keep unauthorized state fail-closed.
- [ ] Add a contract that rejects Firestore browser imports/calls in Admin v2.
- [ ] Run the focused permission and server-only tests to green.
- [ ] Commit the contract and permission foundation.

### Task 3: Implement Native Money Operations backend with TDD

**Files:**
- Create: `functions/src/admin_money_operations.ts`
- Create: `functions/src/admin_money_operations.test.ts`
- Create: `functions/src/admin_money_operations_transaction.test.ts`
- Modify: `functions/src/index.ts`

- [ ] Write failing pure tests for input bounds, projection, identity masking, provider-refund separation, CSV escaping and pagination.
- [ ] Implement the bounded read/detail projection and run those tests green.
- [ ] Write failing transaction tests for UGC refund, Telegram paid-order activation, web paid-order activation and checkout config mutation.
- [ ] Cover stale preview, changed order, idempotent replay, conflicting key, self-approval and same-transaction audit.
- [ ] Implement preview/request-approval/approve/apply using canonical stored values and the established manual-access domain logic.
- [ ] Export `adminGetMoneyOperationsWorkspace`, `adminGetMoneyOperationDetail`, `adminPreviewMoneyMutation`, `adminRequestMoneyApproval`, `adminApproveMoneyMutation`, and `adminApplyMoneyMutation`.
- [ ] Run focused Money tests and Functions TypeScript.
- [ ] Commit the Money backend.

### Task 4: Implement Native Money Operations frontend with TDD

**Files:**
- Create: `admin/v2/scripts/admin-money-operations-state.js`
- Create: `admin/v2/scripts/admin-money-operations-controller.js`
- Create: `admin/v2/scripts/admin-money-operations-view.js`
- Modify: `admin/v2/scripts/admin-firebase.js`
- Modify: `admin/v2/scripts/admin-core.js`
- Modify: `admin/v2/styles/admin.css`

- [ ] Extend the red Money contract with exact actions and visible consequences.
- [ ] Implement isolated state, controller and view modules with five internal tabs, bounded detail, source health, filters and safe export.
- [ ] Add preview/approval/apply UI with reason, exact confirmation and separate-approver status.
- [ ] Wire only integration hooks in core and callable adapters in Firebase.
- [ ] Run node syntax checks and the Money contract to green.
- [ ] Run responsive Money browser checks at 375/768/1024/1440.
- [ ] Commit the Money frontend.

### Task 5: Implement Native Content Operations backend with TDD

**Files:**
- Create: `functions/src/admin_content_operations.ts`
- Create: `functions/src/admin_content_operations.test.ts`
- Create: `functions/src/admin_content_operations_transaction.test.ts`
- Modify: `functions/src/index.ts`

- [ ] Write failing read-model tests for community packs, card packs, daily phrases, French readiness, explain reports and content telemetry.
- [ ] Implement bounded reads, details, source health, identity masking and range limits.
- [ ] Write failing mutation tests for community moderation/removal, card metadata/publication, daily phrase draft/schedule/reorder/import, French deterministic draft/rollback, and explain report state/bulk actions.
- [ ] Require expected state/revision, reason, idempotency and approval according to the design; preserve French `activationApproved=false` and `productionReady=false`.
- [ ] Implement preview/request-approval/approve/apply without invoking generation or activating a language pack.
- [ ] Export the six Content callables named in the design.
- [ ] Run focused Content tests, existing French workflow contracts and Functions TypeScript.
- [ ] Commit the Content backend.

### Task 6: Implement Native Content Operations frontend with TDD

**Files:**
- Create: `admin/v2/scripts/admin-content-operations-state.js`
- Create: `admin/v2/scripts/admin-content-operations-controller.js`
- Create: `admin/v2/scripts/admin-content-operations-view.js`
- Modify: `admin/v2/scripts/admin-firebase.js`
- Modify: `admin/v2/scripts/admin-core.js`
- Modify: `admin/v2/styles/admin.css`

- [ ] Implement six native internal tabs with compact tables/cards, bounded preview, truthful source state and explicit permissions.
- [ ] Preserve the existing Language Factory screen and do not alter generation handlers.
- [ ] Show French readiness and deterministic draft/rollback as HOLD-only operational controls; do not expose activation.
- [ ] Add guarded preview/approval/apply UI for content changes and link global moderation to Safety where applicable.
- [ ] Run syntax, Content contracts, language audit and responsive browser checks.
- [ ] Commit the Content frontend.

### Task 7: Implement Native Community Operations backend with TDD

**Files:**
- Create: `functions/src/admin_community_operations.ts`
- Create: `functions/src/admin_community_operations.test.ts`
- Create: `functions/src/admin_community_operations_transaction.test.ts`
- Modify: `functions/src/index.ts`

- [ ] Write failing bounded projection tests for all nine Community capabilities.
- [ ] Implement read-only projections with identity gating and no read-triggered mutation.
- [ ] Write failing transaction tests for Help Board, helpers description, league-chat moderation, arena resync, arena cleanup/purge, wager flag and room close/deactivation.
- [ ] Add exact manifest/fingerprint/resume tests for destructive arena bulk operations and prove users/Auth records are never deletion targets.
- [ ] Implement preview/request-approval/approve/apply/resume with Safety as the only global-ban path.
- [ ] Export the seven Community callables named in the design.
- [ ] Run focused Community tests, Help Board tests, Safety regression tests and Functions TypeScript.
- [ ] Commit the Community backend.

### Task 8: Implement Native Community Operations frontend with TDD

**Files:**
- Create: `admin/v2/scripts/admin-community-operations-state.js`
- Create: `admin/v2/scripts/admin-community-operations-controller.js`
- Create: `admin/v2/scripts/admin-community-operations-view.js`
- Modify: `admin/v2/scripts/admin-firebase.js`
- Modify: `admin/v2/scripts/admin-core.js`
- Modify: `admin/v2/styles/admin.css`

- [ ] Implement nine internal views with explicit refresh, no hidden background work and bounded detail.
- [ ] Link user reports/global bans to finished Safety & Moderation instead of duplicating those controls.
- [ ] Implement preview/approval/progress/resume UI for Community mutations.
- [ ] Make arena destructive consequences and exact target counts visible before confirmation.
- [ ] Run syntax, Community contracts, visible-text/runtime-state audits and responsive browser checks.
- [ ] Commit the Community frontend.

### Task 9: Complete routing, migration truth and inert legacy cutover

**Files:**
- Modify: `admin/v2/scripts/admin-capabilities.js`
- Modify: `admin/v2/scripts/admin-router.js`
- Modify: `scripts/admin-v2-build-migration-board.mjs`
- Modify: `docs/admin/ADMIN_V2_MIGRATION_COVERAGE.json`
- Modify: `admin/v2/data/ADMIN_V2_MIGRATION_COVERAGE.json`
- Modify: `admin/index.html`
- Modify: `admin/testers.html`
- Modify: `admin/site.html`
- Modify: `admin/full.html`

- [ ] Map five Money IDs to `money-operations`, six Content IDs to `content-operations`, and nine Community IDs to `community-operations`.
- [ ] Generate the migration board and confirm exactly 59 guarded/native and 0 fallback.
- [ ] Redirect normal legacy hashes/pages to exact v2 hashes.
- [ ] Make `?legacyArchive=1` scriptless or fail-closed before initialization: no live read, listener, export, copy or mutation path.
- [ ] Run the four legacy archive contracts and the full migration contract set to green.
- [ ] Commit the final cutover.

### Task 10: Verify, review and release

**Files:**
- Create: `docs/reports/admin-v2-native-completion-release-readiness-2026-07-13.md`

- [ ] Run all focused Functions suites for Money, Content, Community, permissions, Safety and Diagnostics.
- [ ] Run all focused root Admin v2 contracts and prove 59/0.
- [ ] Run node syntax checks, Functions TypeScript, migration board `--check`, button/function audit, language audit, visible-text audit and runtime-state audit.
- [ ] Run local Admin v2 smoke and visual checks at 375/768/1024/1440 for loading, empty, partial, permission-denied, stale, ready, preview and approval states.
- [ ] Inspect the final diff and record exact verification evidence and unresolved risks.
- [ ] Submit the actual final state to Advisor and require `DECISION: APPROVED`.
- [ ] Copy required Functions environment files without printing values and deploy only the new/updated callables.
- [ ] Probe every deployed callable unauthenticated and require HTTP 401; perform authenticated read-only smoke and no production mutation smoke.
- [ ] Deploy only Firebase Hosting target `admin` and verify all 20 native hashes, 59/0 live capability truth and legacy redirects.
- [ ] Remove temporary environment files and safely clean only generated Functions build output.
- [ ] Mark the active goal complete only after all live checks pass.

