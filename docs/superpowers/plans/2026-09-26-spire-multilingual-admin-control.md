# Spire Multilingual Admin Control Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a safe operational admin surface for the ES/FR/DE Spire content pools.

**Architecture:** Extend the existing `arena-content` tab in place and reuse all existing callable contracts. Keep unique `spire-admin-*` controls inside the existing page and do not modify application runtime or deployment configuration.

**Tech Stack:** Static HTML/CSS/JavaScript, Firebase callable client, Jest static contract test.

---

### Task 1: Lock the admin contract with a failing test

**Files:**
- Create: `tests/spire_multilingual_admin_control.test.ts`
- Test: `tests/spire_multilingual_admin_control.test.ts`

- [x] Assert the tab label/title is `Контент Spire`.
- [x] Assert pack build controls and all four callable names are present.
- [x] Assert force rebuild is confirmation-gated and language changes refresh flags.
- [x] Run the focused Jest test and confirm RED because the controls do not exist.

### Task 2: Implement the control surface

**Files:**
- Modify: `admin/v2/legacy.html`

- [x] Rename the existing navigation/title/copy from Arena to Spire.
- [x] Add responsive tonal sections for pack build and task flags.
- [x] Add `loadSpireTaskFlags`, `buildSpireLanguagePack`,
      `addSpireTaskFlag`, and `removeSpireTaskFlag`.
- [x] Disable controls while requests run, render exact results, and restore
      controls in `finally` branches.
- [x] Require confirmation before force rebuild and flag removal.
- [x] Run focused Jest and confirm GREEN.

### Task 3: Verify integration and presentation

**Files:**
- Modify: `docs/work/tasks/2026-09-26_spire_multilingual_pool_boundary.md`

- [x] Run the focused admin test, existing Spire Functions tests, TypeScript,
      multilingual parity gate, and scoped `git diff --check`.
- [x] Open the local admin HTML through the existing hosted/local preview path
      and inspect desktop and narrow layouts, loading/error/empty states, focus,
      and long task IDs.
- [x] Request independent read-only code reviews and repair all findings.
- [x] Record the implemented UI and verification evidence in the boundary note.
