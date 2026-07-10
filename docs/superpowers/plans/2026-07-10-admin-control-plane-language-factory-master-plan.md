# Phraseman Admin Control Plane and Language Factory Implementation Plan

> **For agentic workers:** Use isolated worktrees and disjoint write scopes. Do not edit `admin/index.html`, `firestore.rules`, runtime loaders, or generated content from more than one workstream at the same time. Every task must finish with its focused verification before the next dependent task begins.

**Goal:** Build a safe seven-section Phraseman admin control plane and a versioned Language Factory that can generate, review, publish, deliver, and roll back new language packs without an app release.

**Architecture:** Preserve the current admin as an emergency fallback while introducing a modular admin shell. Sensitive writes move behind server commands with RBAC, idempotency, immutable audit, and rollback. Language generation produces immutable draft artifacts and course-pack manifests; runtime loads validated packs by target language. User-adaptive generation is a later, isolated runtime layer and never mutates canonical content.

**Tech Stack:** Existing static admin HTML/JavaScript, Firebase Auth/Firestore/Cloud Functions, React Native/Expo runtime, TypeScript, existing course-pack seams, Jest contract tests, Firestore Emulator, browser smoke tests.

**Design reference:** `docs/superpowers/specs/2026-07-10-admin-control-plane-language-factory-design.md`

---

## Phase 0 — Baseline, inventory, and isolation

### Task 0.1: Create implementation worktree and record baseline

**Files:**
- Read: `AGENTS.md`
- Read: `docs/design/ADMIN_UI_BIBLE.md`
- Read: `docs/superpowers/specs/2026-07-10-admin-control-plane-language-factory-design.md`
- Create: `docs/reports/admin-language-factory-baseline-2026-07-10.md`

- [ ] Verify the current worktree is dirty and record unrelated user changes without reverting them.
- [ ] Create an isolated `codex/` worktree according to the worktree skill and verify its baseline status.
- [ ] Record the actual admin entry point, current `admin/index.html` size, current tab count, static button count, write call sites, and missing `admin/v2` paths.
- [ ] Record the narrow pre-existing test failures separately from new failures.
- [ ] Commit only the baseline report in the implementation worktree.

**Verification:**

Run:

```powershell
git status --short
node scripts/admin-legacy-button-audit.mjs
node scripts/admin-v2-smoke.mjs
```

Expected: baseline report contains the actual failures; no source behavior changes are made.

### Task 0.2: Build migration coverage

**Files:**
- Create: `docs/design/ADMIN_V3_MIGRATION_MATRIX.md`
- Read: `admin/index.html`
- Read: `docs/design/ADMIN_V2_SECTION_ROUTING_AUDIT_2026-06-26.md`
- Read: `docs/design/ADMIN_V2_LEGACY_FUNCTION_TRANSFER_AUDIT_2026-06-27.md`

- [ ] Enumerate every current internal panel and external admin page.
- [ ] Assign each entry to one target section or guarded fallback.
- [ ] Record read sources, write sources, risk, permission, audit requirement, rollback behavior, and target route.
- [ ] Mark entries that must not be direct browser writes.
- [ ] Add a gate that fails if a current entry is missing from the matrix.

**Verification:**

Run the matrix audit and confirm zero unmapped current entries.

---

## Phase 1 — Security and server command foundation

### Task 1.1: Define admin roles and command contracts

**Files:**
- Create: `functions/src/admin/command_contract.ts`
- Create: `functions/src/admin/roles.ts`
- Create: `functions/src/admin/audit_contract.ts`
- Test: `functions/src/admin/command_contract.test.ts`
- Test: `functions/src/admin/roles.test.ts`
- Test: `functions/src/admin/audit_contract.test.ts`

- [ ] Define roles: `owner`, `admin`, `support`, `content_editor`, `moderator`, `analyst`, `developer`.
- [ ] Define command envelopes containing actor, role, reason, canonical target, idempotency key, expected version, and request ID.
- [ ] Define immutable audit records containing before, after, entity, action, actor, role, reason, timestamp, and rollback reference.
- [ ] Define explicit error codes for permission denied, stale version, validation failure, duplicate operation, and server-only boundary.
- [ ] Make the contracts serializable and independent of UI code.

**Verification:** Run the three focused Jest files and TypeScript typecheck for the new files.

### Task 1.2: Remove broad Firestore admin writes

**Files:**
- Modify: `firestore.rules`
- Test: `tests/firestore_rules_security.test.ts`
- Create: `tests/admin_server_only_boundaries.test.ts`

- [ ] Identify the catch-all rule that grants broad access to `admin=true`.
- [ ] Replace it with explicit read paths and server-owned write paths.
- [ ] Preserve required diagnostic reads only where their collection contract permits them.
- [ ] Add emulator coverage for owner, admin, support, moderator, content editor, analyst, developer, and ordinary user.
- [ ] Verify that sensitive writes cannot be performed from a browser-authenticated client.

**Verification:** Run Firestore rules security tests against the emulator. Do not deploy rules from the local Codex session.

### Task 1.3: Implement server commands for the highest-risk mutations

**Files:**
- Create/modify: `functions/src/admin/commands/`
- Modify: `functions/src/index.ts`
- Test: `functions/src/admin/commands/*.test.ts`

- [ ] Implement commands for manual access, economy mutations, ban/unban, account merge, config publish, content publish, and rollback.
- [ ] Make each command idempotent and version-aware.
- [ ] Write the audit record in the same server-side operation as the mutation.
- [ ] Reject client-supplied Store entitlement fields.
- [ ] Return a stable command result with operation ID, new version, audit ID, and rollback reference.

**Verification:** Run command unit tests, emulator tests, and duplicate-request tests.

---

## Phase 2 — Admin shell and operational UI

### Task 2.1: Create modular Admin v2 shell

**Files:**
- Create: `admin/v2/index.html`
- Create: `admin/v2/styles/admin.css`
- Create: `admin/v2/scripts/admin-core.js`
- Create: `admin/v2/scripts/admin-router.js`
- Create: `admin/v2/scripts/admin-auth.js`
- Create: `admin/v2/scripts/admin-state.js`
- Test: `tests/admin_v2_shell_contract.test.ts`

- [ ] Implement seven top-level routes: overview, application, users, money, content, community, diagnostics.
- [ ] Add semantic buttons and links instead of navigation `<div onclick>` elements.
- [ ] Add keyboard navigation, visible focus, loading, empty, stale, permission-denied, and partial-error states.
- [ ] Use one primary action per page and explicit danger styling for destructive actions.
- [ ] Add global search for routes, users, campaign IDs, flag keys, and actions.
- [ ] Keep the old admin untouched as fallback during this task.

**Verification:** Run HTML/JS syntax checks, the shell contract test, and browser smoke at desktop and mobile widths.

### Task 2.2: Build Overview and Diagnostics truth model

**Files:**
- Create: `admin/v2/scripts/pages/overview.js`
- Create: `admin/v2/scripts/pages/diagnostics.js`
- Create: `admin/v2/scripts/components/admin-state.js`
- Test: `tests/admin_overview_truth_contract.test.ts`

- [ ] Separate store truth, behavioral signals, modeled estimates, and unavailable telemetry.
- [ ] Prevent empty or not-yet-loaded sources from rendering green.
- [ ] Add release health, purchase/restore errors, active flags, dangerous recent changes, open reports, and rollback links.
- [ ] Add source freshness and truncation metadata to every KPI.

**Verification:** Test empty, stale, partial, permission-denied, and ready states with fixtures.

### Task 2.3: Build Users 360 and Money surfaces

**Files:**
- Create: `admin/v2/scripts/pages/users.js`
- Create: `admin/v2/scripts/pages/money.js`
- Create: `admin/v2/scripts/components/user-360.js`
- Test: `tests/admin_user_360_contract.test.ts`
- Test: `tests/admin_money_truth_contract.test.ts`

- [ ] Add user search by UID, email, nickname, and canonical identity link.
- [ ] Show platform, version, progress, errors, restore attempts, purchases, Store entitlement, and Manual access separately.
- [ ] Replace direct destructive buttons with guarded server commands.
- [ ] Display modeled MRR only as a labeled estimate, never as store revenue.

**Verification:** Run focused contract tests and browser flows for read-only support and write-authorized roles.

---

## Phase 3 — Language Factory contracts and admin workflow

### Task 3.1: Define pack, lesson, job, source, and QA schemas

**Files:**
- Create: `functions/src/content_factory/contracts.ts`
- Create: `functions/src/content_factory/source_registry.ts`
- Create: `functions/src/content_factory/qa_contract.ts`
- Test: `functions/src/content_factory/contracts.test.ts`
- Test: `functions/src/content_factory/qa_contract.test.ts`

- [ ] Define pack manifest, lesson artifact, generation job, source evidence, QA report, review decision, and publication receipt.
- [ ] Support conditional sections: irregular verbs, prepositions, and other parts-of-speech drills.
- [ ] Require source locale, target language, blueprint version, schema version, content hash, and review state.
- [ ] Define states: queued, running, partial, failed, needs_review, approved, rejected, published, rolled_back.
- [ ] Make one lesson and N lessons use the same job model.

**Verification:** Validate representative English, French, and an unknown-target fixture; unknown targets must fail closed.

### Task 3.2: Add Language Factory admin page

**Files:**
- Create: `admin/v2/scripts/pages/language-factory.js`
- Create: `admin/v2/scripts/pages/content.js`
- Create: `admin/v2/scripts/components/generation-job.js`
- Test: `tests/admin_language_factory_ui_contract.test.ts`

- [ ] Add target-language selection, blueprint version, lesson range, batch size, surface selection, and source registry selection.
- [ ] Show per-lesson and per-component status.
- [ ] Add lesson preview for phrases, vocabulary, drills, quizzes, cards, and arena questions.
- [ ] Add draft creation, QA view, human review, publish, and rollback controls.
- [ ] Keep theory outside the generation publish path.

**Verification:** Browser smoke covers one lesson, a batch job, failed QA, rejected review, publish, and rollback states.

### Task 3.3: Implement generation job orchestration

**Files:**
- Create: `functions/src/content_factory/jobs.ts`
- Create: `functions/src/content_factory/generate_lesson.ts`
- Create: `functions/src/content_factory/generate_curriculum.ts`
- Test: `functions/src/content_factory/jobs.test.ts`
- Test: `functions/src/content_factory/generate_lesson.test.ts`

- [ ] Create idempotent jobs with operation IDs and immutable draft outputs.
- [ ] Generate the curriculum plan before lesson content for a multi-lesson batch.
- [ ] Generate phrase, vocabulary, conditional drill, quiz, card, and arena components from the same lesson blueprint.
- [ ] Store source evidence and QA output with each artifact.
- [ ] Never publish from the generator worker directly.

**Verification:** Re-running the same job does not duplicate artifacts; partial failure is resumable and visible.

---

## Phase 4 — Quality, review, and publishing

### Task 4.1: Implement content QA gates

**Files:**
- Create: `functions/src/content_factory/qa_runner.ts`
- Create: `scripts/content-factory-qa.mjs`
- Test: `functions/src/content_factory/qa_runner.test.ts`
- Test: `tests/content_factory_qa_gate.test.ts`

- [ ] Check counts, duplicates, translations, vocabulary membership, POS, irregular verbs, preposition alignment, level progression, audio metadata, and malformed text.
- [ ] Add source-evidence coverage checks.
- [ ] Fail closed on unknown language, missing source evidence, schema mismatch, and unresolved critical findings.
- [ ] Produce human-readable and machine-readable QA reports.

**Verification:** Run positive fixtures and adversarial fixtures containing duplicates, wrong-language text, malformed drills, and missing sources.

### Task 4.2: Implement review and publication receipts

**Files:**
- Create: `functions/src/content_factory/review.ts`
- Modify: `functions/src/index.ts`
- Test: `functions/src/content_factory/review.test.ts`

- [ ] Require a human reviewer decision before publish.
- [ ] Require content hash and blueprint version match at publish time.
- [ ] Create publication receipt and immutable history entry.
- [ ] Route rollback through the server command layer.

**Verification:** Test stale draft rejection, rejected review, successful publication, and rollback to the previous receipt.

---

## Phase 5 — Runtime course-pack delivery

### Task 5.1: Connect Language Factory output to pack manifests

**Files:**
- Modify: `app/course_pack_manifest.ts`
- Modify: `app/course_pack_registry.ts`
- Modify: `app/course_pack_loader.ts`
- Test: `tests/course_pack_manifest_registry_preflight.test.ts`
- Test: `tests/course_pack_activation_readiness.test.ts`

- [ ] Map published Language Factory artifacts into validated pack manifests.
- [ ] Preserve schema/hash/version/dependency validation.
- [ ] Keep remote loading disabled until the pack passes activation gates.
- [ ] Ensure source locale and target language are part of every identity key.

**Verification:** Run manifest, path-safety, activation, and rollback tests.

### Task 5.2: Add runtime loading and cache states

**Files:**
- Modify: `app/course_pack_runtime.ts`
- Modify: `app/course_pack_cache.ts`
- Modify: `app/plan_content_readiness.ts`
- Test: `tests/course_pack_runtime_contract.test.ts`
- Test: `tests/course_pack_offline_cache_integrity.test.ts`

- [ ] Implement missing/downloading/ready/corrupt/stale/offline_fallback/blocked behavior.
- [ ] Do not download before language selection or block first frame.
- [ ] Do not use English or legacy templates as a silent fallback for unknown target packs.
- [ ] Keep progress and learning storage target-isolated.

**Verification:** Test online, offline, corrupt, stale, wrong-locale, and unknown-target scenarios.

---

## Phase 6 — Additional generated surfaces

### Task 6.1: Add quizzes, cards, and arena question packs

**Files:**
- Modify: `functions/src/content_factory/`
- Modify: `app/quiz_thematic_registry.ts`
- Modify: `app/quiz_phrases_loader.ts`
- Modify: `assets/arena_questions_a1.json` only if the final delivery contract requires bundled compatibility
- Test: existing quiz/arena contract tests plus new target-pack tests

- [ ] Use the same source blueprint, target-language gate, QA report, review receipt, and pack manifest.
- [ ] Keep generated content outside the bundle unless an explicit compatibility artifact is approved.
- [ ] Add duplicate and answer-validity checks for quiz and arena questions.

**Verification:** Run target-language quiz, arena, and card-pack tests with no cross-language leakage.

---

## Phase 7 — Per-user adaptive generation

### Task 7.1: Define bounded adaptive-generation contract

**Files:**
- Create: `functions/src/adaptive_content/contracts.ts`
- Create: `functions/src/adaptive_content/generate_exercise.ts`
- Modify: `app/remote_flags.ts`
- Test: `functions/src/adaptive_content/*.test.ts`

- [ ] Derive input only from the user’s target-isolated progress and mistakes.
- [ ] Add quota, rate limit, TTL, content length, safety, and target-language gates.
- [ ] Store ephemeral output separately from canonical packs.
- [ ] Add kill switch and cost telemetry.

**Verification:** Test quota exhaustion, wrong-target response, unsafe response, cache expiry, and disabled kill switch.

### Task 7.2: Add runtime exercise surface

**Files:**
- Create/modify: focused lesson/practice screen selected after runtime audit
- Test: focused React Native tests and one E2E flow

- [ ] Render adaptive exercises only when a valid course pack is ready.
- [ ] Preserve offline and empty states.
- [ ] Do not alter canonical lesson progress unless the exercise explicitly maps to a valid learning event.

**Verification:** Run the narrow mobile flow with network success, failure, and disabled-generation states.

---

## Phase 8 — Integration and release gate

### Task 8.1: Cross-workstream integration

**Files:**
- Modify only integration manifests/tests; do not reopen unrelated workstream files without ownership transfer.
- Create: `tests/admin_language_factory_integration.test.ts`
- Create: `docs/reports/admin-language-factory-release-readiness.md`

- [ ] Verify admin command → draft job → QA → review → publish → manifest → runtime load → rollback.
- [ ] Verify Store entitlement remains separate from Manual access.
- [ ] Verify audit records exist for every sensitive mutation.
- [ ] Verify old admin fallback still exposes all unmigrated functions.
- [ ] Verify no stale `admin/v2` test references remain unresolved.

### Task 8.2: Final quality review

- [ ] Run `verification-before-completion`.
- [ ] Run focused admin, rules, content-factory, course-pack, and adaptive-generation suites.
- [ ] Run browser smoke on desktop and mobile.
- [ ] Dispatch the mandatory advisor review with the final diff and verification evidence.
- [ ] Do not claim completion unless the advisor returns `DECISION: APPROVED`.

## Execution rules

- No agent may edit generated content, production Firestore, or production secrets.
- No local Codex task may use the project `OPENAI_API_KEY` for generation, judging, research, or embeddings.
- TTS is out of scope unless explicitly requested separately with the project spend guard.
- Every agent must report exact changed paths, tests run, and unresolved risks.
- If two tasks need the same file, they are sequential, not parallel.
- Existing user changes are preserved; no reset, checkout, or broad formatting rewrite is allowed.
