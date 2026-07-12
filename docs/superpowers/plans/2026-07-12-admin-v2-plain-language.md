# Admin v2 Plain Language Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make every visible label in the new Admin v2 analytics area understandable in Russian and explain every metric on hover and keyboard focus.

**Architecture:** Add one shared language/tooltip helper and migrate six analytics modules plus their shell headings to it. Keep API keys, event names, DOM IDs, callable names, and data fields unchanged.

**Tech Stack:** Vanilla JavaScript, HTML, Jest source/runtime contracts, Node audit scripts.

---

### Task 1: Shared analytics language helper

**Files:**
- Create: `admin/v2/analytics-language.js`
- Test: `tests/admin_v2_plain_language_contract.test.ts`

- [ ] Write a failing runtime contract for safe labels, unknown fallback, escaped tooltip text, `tabindex="0"`, and `aria-label`.
- [ ] Run the focused test and confirm RED.
- [ ] Implement label dictionaries and `window.AdminAnalyticsLanguage` helpers.
- [ ] Run the focused test and confirm GREEN.

### Task 2: Product, session, lesson and retention language

**Files:**
- Modify: `admin/v2/product-analytics.js`
- Modify: `admin/v2/product-sessions.js`
- Modify: `admin/v2/learning-diagnostics.js`
- Modify: `admin/v2/retention-diagnostics.js`
- Test: `tests/admin_v2_plain_language_contract.test.ts`

- [ ] Add failing assertions for Russian section names, metric definitions, table tooltips, and Russian loading/empty/error states.
- [ ] Run the focused test and confirm RED.
- [ ] Replace visible technical English while preserving all object keys and DOM IDs.
- [ ] Run Jest and `node --check` for all four modules.

### Task 3: Conversion and subscription language

**Files:**
- Modify: `admin/v2/conversion-diagnostics.js`
- Modify: `admin/v2/subscription-analytics.js`
- Test: `tests/admin_v2_plain_language_contract.test.ts`

- [ ] Add failing assertions for payment funnel, store readiness, failure reasons, RevenueCat lifecycle, reason coverage and tooltip definitions.
- [ ] Run the focused test and confirm RED.
- [ ] Render human labels for context/source/status/reason/store/period and Russian empty/error states.
- [ ] Run Jest and JavaScript syntax checks.

### Task 4: Admin shell headings and filters

**Files:**
- Modify: `admin/index.html`
- Test: `tests/admin_v2_plain_language_contract.test.ts`

- [ ] Add failing assertions for Russian page headings, filter labels, refresh buttons, coverage note and tooltips.
- [ ] Run the focused test and confirm RED.
- [ ] Change visible text/title only; preserve IDs, handlers, callables and data keys.
- [ ] Run the focused contract.

### Task 5: Repair language audit and verify

**Files:**
- Modify: `scripts/admin-v2-language-audit.mjs`
- Modify: `scripts/admin-v2-smoke.mjs`
- Test: `tests/admin_v2_plain_language_contract.test.ts`

- [ ] Make the audit read the current shell and six modules instead of removed prototype paths.
- [ ] Add hard-term checks for the analytics vocabulary migrated in Tasks 2–4.
- [ ] Run audit with `--fail-on-hard-terms`, focused Jest, all `node --check` commands and local smoke.
- [ ] Submit the actual final state to Advisor and require `DECISION: APPROVED`.
