# Admin Review Promo and Alerts Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Перенести Plus-опрос и Telegram-алерты в два нативных безопасных Admin v2 workflow без потери legacy-функций.

**Architecture:** Два независимых server-command bounded context: `admin_vip_survey_control.ts` и `admin_alerts_control.ts`. Admin v2 получает отдельные маршруты и использует только callables; legacy-вкладки становятся архивными redirect adapters.

**Tech Stack:** TypeScript, Firebase Functions v2, Firestore transactions, vanilla ES modules Admin v2, Jest, Firebase Rules Emulator.

---

### Task 1: Plus survey server contract

**Files:**
- Create: `functions/src/admin_vip_survey_control.ts`
- Create: `functions/src/admin_vip_survey_control.test.ts`
- Create: `functions/src/admin_vip_survey_control_callable.test.ts`
- Modify: `functions/src/admin/permissions.ts`
- Modify: `functions/src/index.ts`

- [ ] Write failing normalization tests for eight locales, explicit version scope, fixed free audience/reward and bounded filters.
- [ ] Implement pure normalizers and safe projections.
- [ ] Write failing transaction tests for preview/apply/deactivate/replay/CAS.
- [ ] Implement workspace, response list, preview and apply callables with state/history/audit/idempotency.
- [ ] Run `cd functions && npx jest --runInBand admin_vip_survey_control` and expect PASS.

### Task 2: Telegram alert server contract

**Files:**
- Create: `functions/src/admin_alerts_control.ts`
- Create: `functions/src/admin_alerts_control.test.ts`
- Create: `functions/src/admin_alerts_control_callable.test.ts`
- Modify: `functions/src/admin_alerts.ts`
- Modify: `functions/src/index.ts`

- [ ] Write failing allowlist/CAS/redaction tests.
- [ ] Implement workspace, preview/apply, rollback metadata and idempotency.
- [ ] Write failing alert-test claim tests for accepted/rejected/uncertain outcomes.
- [ ] Implement stable test commands without mutating production config.
- [ ] Harden digest accounting so pending reports clear only after provider acceptance.
- [ ] Run focused alert tests and expect PASS.

### Task 3: Native Admin v2 routes

**Files:**
- Modify: `admin/v2/scripts/admin-firebase.js`
- Modify: `admin/v2/scripts/admin-core.js`
- Modify: `admin/v2/scripts/admin-router.js`
- Modify: `admin/v2/scripts/admin-capabilities.js`
- Create: `tests/admin_v2_review_promo_alerts_contract.test.ts`

- [ ] Add failing routing/action/permission/static contracts for 23 native capabilities.
- [ ] Implement `#review-promo` Campaign/Responses UI and exact preview/apply confirmation.
- [ ] Implement `#alerts` config/test/history UI with truthful status wording.
- [ ] Add stable sessionStorage idempotency keys and clear only after success.
- [ ] Verify every button has a handler and tooltip.

### Task 4: Legacy adapters and rules

**Files:**
- Modify: `admin/index.html`
- Modify: `firestore.rules`
- Modify: `tests/firestore_rules_security.test.ts`
- Modify: `functions/src/firestore_cache_rules_emulator.test.ts` or create a focused emulator test.

- [ ] Redirect legacy handlers to native routes before any direct read/write.
- [ ] Deny alert config browser access and survey/control writes while preserving required app reads.
- [ ] Run emulator tests and prove owner/admin browser claims cannot bypass callables.

### Task 5: Coverage, verification and deployment

**Files:**
- Modify: `scripts/admin-v2-smoke.mjs`
- Regenerate: `docs/admin/ADMIN_V2_MIGRATION_COVERAGE.json`
- Regenerate: `admin/v2/data/ADMIN_V2_MIGRATION_COVERAGE.json`

- [ ] Regenerate migration coverage and assert 23 native / 36 fallback.
- [ ] Run Functions build and focused Jest suites.
- [ ] Run root static/rules suites from a clean non-hidden worktree.
- [ ] Run local smoke, syntax, diff check and responsive visual checks.
- [ ] Obtain final Advisor `DECISION: APPROVED`.
- [ ] Deploy selected indexes/functions/triggers, rules and admin Hosting.
- [ ] Run production read-only smoke without campaigns, tests, grants, revokes or generation.

