# Admin Digest Colored Sections Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Render the owner digest as accessible, restrained color-coded semantic sections without changing digest data or actions.

**Architecture:** Keep the existing digest data contract and add a small escaped-text section parser next to `renderDigestDoc`. Render recognized headings with local CSS modifier classes and preserve all content through a neutral fallback. Guard the presentation contract with the existing focused Jest test.

**Tech Stack:** Static HTML/CSS, browser JavaScript, Jest contract tests.

---

### Task 1: Add the presentation contract

**Files:**
- Modify: `tests/admin_daily_digest_v2_contract.test.ts`
- Modify: `admin/index.html`

- [ ] **Step 1: Write the failing test**

Add assertions for `.dd-summary-sections`, the six semantic modifier classes, `digestParseSummarySections`, escaped section output, and the neutral fallback.

- [ ] **Step 2: Verify the test fails**

Run: `npx jest tests/admin_daily_digest_v2_contract.test.ts --runInBand`

Expected: FAIL because the parser and CSS contract do not exist yet.

- [ ] **Step 3: Add scoped digest styles**

Define local classes for the section stack, base surface, headings, body copy and six color modifiers. Use a solid dark background, a three-pixel left border, restrained tinted surfaces, wrapping safeguards and no gradients.

- [ ] **Step 4: Implement safe parsing and rendering**

Add `digestParseSummarySections(summary)` with case-insensitive heading recognition, optional colons, preservation of preamble text and a neutral fallback. Build section markup only from `escapeHtml` output and replace the existing monolithic summary container.

- [ ] **Step 5: Run focused verification**

Run: `npx jest tests/admin_daily_digest_v2_contract.test.ts --runInBand`

Expected: PASS with zero failed tests.

- [ ] **Step 6: Check syntax and inspect the scoped diff**

Run: `node --check` against the extracted inline script and inspect `git diff -- admin/index.html tests/admin_daily_digest_v2_contract.test.ts`.

Expected: syntax exit code 0; diff contains only digest presentation and its contract.
