# Admin 2 Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make modular Admin 2 the only destination for new admin development, move detailed analytics into it, and preserve legacy only as a temporary separate fallback.

**Architecture:** Start from the current product baseline in an isolated worktree. Restore only the consolidated Admin 2 file surface from `codex/admin-language-factory`, then integrate the current detailed analytics and admin-only callable contracts. Keep legacy unchanged at `/legacy.html`; make the hosting root a small Admin 2 entry point.

**Tech Stack:** Static HTML/CSS/ES modules, Firebase Auth/Hosting/Cloud Functions v2, TypeScript/Jest, Node audit scripts.

---

### Task 1: Truthful Admin 2 boundary contract

**Files:**
- Create: `tests/admin2_primary_boundary_contract.test.ts`

- [ ] Write a failing contract requiring `admin/v2/index.html`, seven routes, a root Admin 2 entry point, a separate legacy entry, and no detailed analytics mounts/scripts in legacy.
- [ ] Run `node C:/appsprojects/phraseman/node_modules/jest/bin/jest.js tests/admin2_primary_boundary_contract.test.ts --runInBand` and confirm RED because the modular shell and legacy boundary are absent.
- [ ] Record the exact failure as baseline evidence.

### Task 2: Restore the modular Admin 2 shell only

**Files:**
- Restore: `admin/v2/**` from `codex/admin-language-factory`
- Restore: related `tests/admin_v2_*` and `scripts/admin-v2-*` required by the shell
- Modify: `admin/v2/index.html`

- [ ] Transfer only the Admin 2 paths from the consolidated branch; do not merge unrelated Language Factory runtime/content files.
- [ ] Normalize hosting paths to `/v2/...`.
- [ ] Verify the shell exposes exactly `overview`, `application`, `users`, `money`, `content`, `community`, `diagnostics`.
- [ ] Run the boundary contract and the restored shell contracts.

### Task 3: Make Admin 2 primary and preserve legacy

**Files:**
- Move: `admin/index.html` -> `admin/legacy.html`
- Create: `admin/index.html`
- Modify: `admin/v2/index.html`
- Test: `tests/admin2_primary_boundary_contract.test.ts`

- [ ] Extend the failing contract so root points to `/v2/` while `/legacy.html` remains available.
- [ ] Move the untouched legacy file to the flat fallback path so relative assets keep the same base directory.
- [ ] Create a minimal accessible root redirect preserving the URL hash.
- [ ] Add a clearly labelled legacy link only in Diagnostics or migration coverage, not first-level navigation.
- [ ] Run the boundary and route tests.

### Task 4: Move detailed analytics into Admin 2

**Files:**
- Create/modify: `admin/v2/scripts/pages/product-analytics.js`
- Create/modify: `admin/v2/scripts/pages/product-sessions.js`
- Create/modify: `admin/v2/scripts/pages/learning-diagnostics.js`
- Create/modify: `admin/v2/scripts/pages/conversion-diagnostics.js`
- Create/modify: `admin/v2/scripts/pages/retention-diagnostics.js`
- Create/modify: `admin/v2/scripts/pages/subscription-analytics.js`
- Create/modify: `admin/v2/scripts/components/analytics-language.js`
- Modify: `admin/v2/scripts/admin-core.js`
- Modify: `admin/v2/scripts/admin-firebase.js`
- Test: `tests/admin_v2_plain_language_contract.test.ts`
- Test: `tests/admin_product_analytics_contract.test.ts`
- Test: `tests/admin_subscription_analytics_contract.test.ts`

- [ ] Write failing Admin 2 contracts requiring all detailed analytics mounts and renderers under `admin/v2`, and forbidding their mounts/includes in `admin/legacy.html`.
- [ ] Transfer the existing renderers into the modular page/component directories and change only their mounting/bridge layer.
- [ ] Connect admin-only `adminProductAnalytics` and `adminSubscriptionAnalytics` callables through `admin-firebase.js`.
- [ ] Preserve consent, installation-not-person, last-observed-not-uninstall and RevenueCat server-truth wording.
- [ ] Run focused analytics tests, language audit and `node --check`.

### Task 5: Restore truthful migration and operational audits

**Files:**
- Modify: `scripts/admin-v2-smoke.mjs`
- Modify: `scripts/admin-v2-runtime-state-audit.mjs`
- Modify: `scripts/admin-v2-visible-text-audit.mjs`
- Modify: `scripts/admin-v2-language-audit.mjs`
- Modify/Create: `docs/admin/ADMIN_V2_MIGRATION_COVERAGE.json`
- Test: `tests/admin_v2_migration_coverage.test.ts`

- [ ] Write failing assertions that every current capability is `native`, `workflow`, or `fallback` based on an existing route and handler.
- [ ] Remove stale assumptions such as `0 fallback` when the function is not actually native.
- [ ] Point all audits at the restored modular shell and make missing files a clear failure.
- [ ] Run all four audits and require zero unmapped capabilities.

### Task 6: Complete the Application vertical slice

**Files:**
- Modify: `admin/v2/scripts/admin-core.js`
- Modify: `admin/v2/scripts/admin-firebase.js`
- Test: `tests/admin_v2_release_maintenance_contract.test.ts`
- Test: `tests/admin_v2_promo_banner_contract.test.ts`
- Test: `tests/admin_v2_app_messages_contract.test.ts`

- [ ] Verify RED for any missing maintenance, update or banner workflow on the current product baseline.
- [ ] Restore and reconcile existing Admin 2 workflows from the consolidated branch.
- [ ] Ensure maintenance uses preview, admin permission, reason, confirmation, server command, audit result and rollback/off action.
- [ ] Keep higher-risk money, moderation and bulk actions guarded or fallback.
- [ ] Run focused callable, contract and permission tests.

### Task 7: Integrated verification and review

**Files:**
- Verify only; no new behavior.

- [ ] Run focused root Jest suites for Admin 2, analytics and Application.
- [ ] Run focused Functions tests/build for connected admin callables.
- [ ] Run `node --check` for all Admin 2 modules.
- [ ] Run Admin 2 smoke, runtime-state, visible-text, language, migration, route and action audits.
- [ ] Run browser checks at 375/768/1024/1440 px when a local static server is available.
- [ ] Confirm `admin/legacy.html` contains no new analytics mounts or script includes and remains functionally unchanged apart from its path.
- [ ] Submit the final diff and evidence to Advisor; completion requires `DECISION: APPROVED`.
