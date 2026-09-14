# Community Ideas Compact List Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the stretched community-idea cards with a compact, accessible table-like list while preserving all existing data and actions.

**Architecture:** Keep the existing Firestore loading, filtering, sorting, statistics, modal, and callable handlers unchanged. Add section-scoped CSS and emit semantic row classes from `renderAdminIdeaList`, so the global `.report-card` grid override cannot distort this screen.

**Tech Stack:** Single-file HTML/CSS/JavaScript admin surface, Jest contract tests.

---

### Task 1: Lock the compact-list contract

**Files:**
- Create: `tests/ideas_admin_compact_list_contract.test.cjs`
- Modify: `admin/v2/legacy.html`

- [x] **Step 1: Write the failing contract test**

Add assertions that the live admin source contains `.idea-admin-row`, `.idea-admin-row-main`, `.idea-admin-row-likes`, `.idea-admin-row-status`, section-scoped responsive CSS, and no inline `display:flex` on the generated idea row.

- [x] **Step 2: Run the focused test and verify RED**

Run: `node --test tests/ideas_admin_compact_list_contract.test.cjs`

Expected: FAIL because the compact row classes do not exist yet.

- [x] **Step 3: Add section-scoped compact CSS**

In `admin/v2/legacy.html`, add rules scoped to `#tab-ideas` that create a 40–44 px grid row with columns for index, title/meta, likes, status, and optional inline action. Add hover and `:focus-visible` states. At widths below 760 px, hide the index and place likes/status beneath the title without page-level horizontal scrolling.

- [x] **Step 4: Emit the compact row markup**

Update only the template returned by `renderAdminIdeaList`: replace layout-critical inline styles with the new classes while preserving click, keyboard, author enrichment, report badge, status label, and action handlers.

- [x] **Step 5: Run focused verification**

Run: `node --test tests/ideas_admin_compact_list_contract.test.cjs`

Run the two existing TypeScript contracts only if a `ts-jest` process fits within the shared heavy-process slot; otherwise report the deterministic Node contract and syntax results separately.

Expected: all suites PASS.

- [x] **Step 6: Verify inline JavaScript syntax and whitespace**

Run: `npx jest tests/admin_inline_script_syntax.test.ts --runInBand`

Run: `git diff --check -- admin/v2/legacy.html tests/ideas_admin_compact_list_contract.test.cjs`

Expected: syntax suite PASS and `git diff --check` prints no errors.

- [x] **Step 7: Inspect responsive presentation**

Open the local admin surface or a focused fixture at desktop and narrow viewport. Confirm rows are compact, titles truncate, focus is visible, the full idea still opens, and no horizontal page scroll appears.

- [ ] **Step 8: Commit when repository guards are green**

Stage only `admin/v2/legacy.html`, `tests/ideas_admin_compact_list_contract.test.cjs`, the design spec, and this plan. Commit after unrelated Learning V2 release guards stop blocking the repository; never bypass the guard.
