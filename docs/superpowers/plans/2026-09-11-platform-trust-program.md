# Platform Trust Program — implementation plan

> Execute one task packet at a time. Do not begin product edits from this program document alone; the session-scoped governance hook requires a current packet with the exact scope and debt decision.

**Goal:** Turn Phraseman's existing technical safeguards into a coherent, measurable architecture and operating-control system across website, admin, app and backend.

**Strategy:** Establish governance and system boundaries first, then make release evidence composable. Use the public website as the first low-risk security/performance slice, inventory admin mutations before decomposing the live monolith, and instrument Tier 0 app journeys before setting SLOs. SOC 2 evidence runs internally before any auditor observation period.

**Stack:** TypeScript/JavaScript, React Native/Expo, Firebase Hosting/Auth/Firestore/Functions, GitHub Actions, Node test/Jest.

## Phase 0 — Work governance enabler

### Task 0.1: Install session-scoped task packet gate

**Files:**

- Create: `scripts/hooks/task_governance_hook.mjs`
- Create: `scripts/hooks/task_governance_hook.test.mjs`
- Create: `docs/work/tasks/TASK_PACKET_TEMPLATE.md`
- Create: `docs/architecture/WORK_ITEM_GOVERNANCE.md`
- Modify: `.claude/settings.json`

**Steps:**

1. Write failing tests for read-only bypass, change-intent blocking, valid packet allowance, incomplete packet denial and session isolation.
2. Run `node --test scripts/hooks/task_governance_hook.test.mjs`; confirm RED because the hook does not exist.
3. Implement zero-dependency prompt classification, per-session ignored state and packet validation.
4. Add `UserPromptSubmit` and first-in-chain `PreToolUse` entries.
5. Run `node --test scripts/hooks/task_governance_hook.test.mjs`; require all tests PASS.
6. Parse `.claude/settings.json` and syntax-check the hook.

Status: complete locally on 2026-09-11; focused hook tests passed 4/4 and the gate is active for future change packets.

### Task 0.2: Establish the technical-debt register

**Files:**

- Create: `docs/architecture/TECH_DEBT_REGISTER.json`
- Create: `scripts/verify_technical_debt.mjs`
- Create: `scripts/verify_technical_debt.test.mjs`

**Steps:**

1. Require pay/contain/accept disposition, owner, review date, impact ceiling and exit enabler.
2. Seed debt from the audit, dependency, admin, telemetry and recovery gaps.
3. Keep accepted debt owner-bound; unknown owners remain blockers.

**Status (2026-09-15):** Five debt items are registered and machine-validated; no item is silently accepted without an owner.

## Phase 1 — Architecture and ownership

### Task 1.1: Publish the system context and service catalog

Status: complete on 2026-09-11; see `docs/work/tasks/2026-09-11-system-context-service-catalog.md`.

**Files:**

- Create: `docs/architecture/SYSTEM_CONTEXT.md`
- Create: `docs/architecture/SERVICE_CATALOG.json`
- Create: `scripts/verify_service_catalog.mjs`
- Create: `scripts/verify_service_catalog.test.mjs`

**TDD steps:**

1. Test that every Firebase hosting target/codebase and every external network host named in canonical configs is represented by a catalog service with owner, data class, criticality and recovery tier.
2. Run `node --test scripts/verify_service_catalog.test.mjs`; require missing-catalog failures.
3. Add the minimal catalog and C4-lite context diagram.
4. Run the focused test; require PASS and zero unowned Tier 0/1 services.

### Task 1.2: Publish critical domain contracts

Status: complete on 2026-09-11; see `docs/work/tasks/2026-09-11-critical-domain-contracts.md`. Learning authority prose drift is tracked by ADR-0001 and remains owner reconciliation debt.

**Files:**

- Create: `docs/architecture/domains/identity.md`
- Create: `docs/architecture/domains/learning.md`
- Create: `docs/architecture/domains/economy-entitlements.md`
- Create: `docs/architecture/domains/voice-ai.md`
- Create: `docs/architecture/domains/admin-commands.md`
- Create: `docs/architecture/domains/telemetry-privacy.md`
- Create: `docs/architecture/domains/release.md`
- Create: `scripts/verify_domain_contracts.mjs`

**Steps:**

1. Make the verifier require owner, source of truth, authority, invariants, idempotency, offline behavior, privacy, recovery and owning tests.
2. Populate contracts from current code and owner constitutions; do not “normalize” conflicting contracts silently.
3. Create an ADR for every unresolved source-of-truth conflict.
4. Run `node scripts/verify_domain_contracts.mjs`; require zero missing required sections.

## Phase 2 — SOC 2 foundation and operational evidence

### Task 2.1: Approve system boundary and risk register

Status: BLOCKED — local readiness boundary, 11-risk register and verifier drafts are complete; Task 2.1 is not approved until the product owner/CPA approve scope and named-human assignments.

**Files:**

- Create: `docs/security/SOC2_SYSTEM_BOUNDARY.md`
- Create: `docs/security/RISK_REGISTER.md`
- Create: `docs/security/RISK_ACCEPTANCE_TEMPLATE.md`
- Create: `scripts/verify_risk_register.mjs`

**Steps:**

1. Write a fixture-based test requiring asset, threat, impact, likelihood, treatment, owner, due/review date and linked control.
2. List in-scope people, systems, data, processes, locations and subservice organizations.
3. Seed all P1/P2 findings from the audit; unresolved fields are explicit blockers, never guessed.
4. Require no expired critical acceptance and no ownerless high risk.

### Task 2.2: Create control matrix and evidence calendar

Status: BLOCKED — local Security + Availability matrix/evidence verifier is complete; named-human owners, formal scope/control approval and operating evidence cycles remain pending.

**Files:**

- Create: `docs/security/SOC2_CONTROL_MATRIX.json`
- Create: `docs/security/CONTROL_EVIDENCE_GUIDE.md`
- Create: `scripts/verify_control_evidence.mjs`
- Create: `scripts/verify_control_evidence.test.mjs`

**Steps:**

1. Test schema and uniqueness for criterion, control ID, description, owner, cadence, evidence source, retention and exception SLA.
2. Map Security and Availability first; add categories only after owner scope decision.
3. Run a dry evidence collection without production mutation.
4. Fail verification for stale evidence, duplicate controls and missing owners.

### Task 2.3: Establish access and vendor governance

Status: complete locally / blocked for operational adoption on 2026-09-11; repository artifacts are draft and no console/IAM evidence was accessed.

**Files:**

- Create: `docs/security/ACCESS_CONTROL_POLICY.md`
- Create: `docs/security/ACCESS_REVIEW_LOG_TEMPLATE.md`
- Create: `docs/security/VENDOR_REGISTER.json`
- Create: `docs/security/VENDOR_REVIEW_TEMPLATE.md`
- Create: `.github/CODEOWNERS`
- Create: `SECURITY.md`
- Create: `.github/dependabot.yml`

**Steps:**

1. Inventory human/admin/service-account access without printing secrets.
2. Define joiner/mover/leaver, MFA, break-glass and quarterly review evidence.
3. Classify vendors by data, criticality, DPA/SOC evidence, renewal and exit dependency.
4. Add owners by trust boundary and dependency updates in small scheduled groups.
5. Run secret scan and configuration syntax validation.

### Task 2.4: Triage and remediate dependency advisories

Status: complete for baseline and Functions mail-chain slice on 2026-09-11; root high/critical and Expo/native remediation remain open in the dependency register and require separate release packets.

**Files:**

- Create: `docs/security/DEPENDENCY_RISK_REGISTER.md`
- Create: `scripts/verify_dependency_risk_register.mjs`
- Modify: `functions/package.json` and `functions/package-lock.json` for the first compatible mail-chain slice
- Modify later under a separate release packet: root `package.json` and `package-lock.json` for Expo/native upgrades

**Steps:**

1. Reproduce the baseline with `npm audit --omit=dev --json` in root and `functions/`; retain only counts, advisory IDs and dependency paths—never registry credentials.
2. For each critical/high item, document runtime/build-only reachability, exposed input, fixed version, owner and deadline.
3. Write focused mail parsing/sending characterization tests before changing direct `mailparser`/`nodemailer` dependencies.
4. Apply the smallest compatible Functions update and run only the affected Functions tests plus typecheck under the repository semaphore.
5. Plan Expo major remediation separately with native build, auth, purchases, notifications, audio and update-channel regression evidence; do not use `npm audit fix --force`.

### Task 2.5: Produce dependency reachability evidence

**Files:**

- Create: `scripts/build_dependency_reachability.mjs`
- Create: `docs/security/DEPENDENCY_REACHABILITY.json`
- Create: `scripts/build_dependency_reachability.test.mjs`

**Steps:**

1. Reproduce dependency paths from the lockfile/npm tree for every open critical/high advisory.
2. Classify runtime/platform versus build/tooling paths without changing severity or claiming exploitability.
3. Keep unknown paths and remediation SLAs open; require a separate package-change packet for each fix.

**Status (2026-09-15):** Reachability report generated for 45 package paths with zero unknown target packages. No advisory was closed or downgraded.

### Task 2.6: Publish privacy data inventory baseline

**Files:**

- Create: `docs/security/PRIVACY_DATA_INVENTORY.json`
- Create: `scripts/verify_privacy_data_inventory.mjs`
- Create: `scripts/verify_privacy_data_inventory.test.mjs`

**Steps:**

1. Map personal and sensitive data categories to purpose, consent/legal basis, store, retention, deletion, vendor, residency and child-data sensitivity.
2. Keep unresolved legal/vendor decisions as explicit `PENDING` blockers.
3. Require every future personal-data field change to update this inventory in the same packet.

**Status (2026-09-15):** Eight data categories are inventoried and machine-validated; the document remains Draft pending privacy/legal/vendor review.

## Phase 3 — Unified quality and release evidence

### Task 3.1: Add change-to-gate classification

Status: complete locally / observe-only on 2026-09-11; blocking remains deferred until the review window.

**Files:**

- Create: `config/change-gate-matrix.json`
- Create: `scripts/select_change_gates.mjs`
- Create: `scripts/select_change_gates.test.mjs`
- Modify: `.github/workflows/source-quality.yml`

**TDD steps:**

1. Add fixtures for website, app UI, auth/privacy, economy, functions/schema, admin mutation and release changes.
2. Require each fixture to select universal checks plus its domain pack; critical paths must select independent review.
3. Implement selection as a read-only plan first and compare against current CI for two weeks.
4. Enable blocking only after false negatives/positives are reviewed.

### Task 3.2: Measure and isolate app tests

Status: complete baseline-only on 2026-09-11; no isolation/config change authorized by evidence yet.

**Files:**

- Create: `scripts/test_suite_metrics.mjs`
- Create: `docs/quality/TEST_ISOLATION_REGISTER.md`
- Modify only selected Jest configuration after a packet names the first domain.

**Steps:**

1. Record duration, peak memory, retries and global/module mutation by suite in ignored artifacts.
2. Select one domain with high coupling and stable contracts.
3. Preserve behavior with characterization tests before changing isolation.
4. Run the old and new packs serially; enable parallelism only with identical deterministic results.

## Phase 4 — Website trust slice

### Task 4.1: Establish security headers

**Files:**

- Modify: `firebase.json`
- Modify: `scripts/verify_website_surface_contract.mjs`
- Create: `tests/website_security_headers_contract.test.mjs`

**Steps:**

1. Test expected CSP report-only, nosniff, referrer and permissions headers for `hosting:knowlywww`.
2. Inventory required origins from `knowly-www/`; make the initial policy explicit and minimal.
3. Prepare the normal guarded hosting path, but do not deploy from Codex; deployment requires explicit owner authorization.
4. Review violations, fix legitimate dependencies, then create a separate packet to enforce CSP.

**Status (2026-09-11):** Report-only policy, origin inventory, guarded `hosting:knowlywww` deployment and post-deploy header checks are complete after explicit owner authorization. CSP enforcement and violation telemetry remain deferred.

### Task 4.2: Add consent-aware CWV RUM

**Files:**

- Create: `knowly-www/assets/js/web-vitals.js`
- Modify: `knowly-www/index.html`
- Modify: `scripts/verify_website_surface_contract.mjs`
- Create: `tests/website_web_vitals_contract.test.mjs`

**Steps:**

1. Test that no metric is sent before analytics consent and no URL query/PII is included.
2. Record LCP, INP and CLS with route template/device class/release only.
3. Validate locally, then deploy only `hosting:knowlywww` through its existing guard.
4. Set alerting only after two weeks of baseline data.

**Status (2026-09-11):** Consent-gated observer is deployed with collection disabled. The current `siteStatsTrack` backend rejects CWV event types; a separately reviewed endpoint/schema packet is required before collection or alerting.

### Task 4.3: Add accessibility journeys

**Files:**

- Create: `tests/website_accessibility_journeys.test.mjs`
- Modify: primary `knowly-www/**/index.html` files only where a failing journey proves a defect.

**Steps:**

1. Test keyboard order, focus visibility, headings, FAQ state, 200/400% zoom layout and reduced motion.
2. Capture one failure at a time, fix minimally, and rerun the affected route plus surface contract.

**Status (2026-09-11):** Static accessibility journey gate is green (3/3), and the authorized production route/ARIA review passed for 12 primary routes. Physical-device VoiceOver/TalkBack evidence remains deferred.

## Phase 5 — Admin safety and decomposition

### Task 5.1: Generate the admin command registry

**Files:**

- Create: `scripts/build_admin_command_registry.mjs`
- Create: `docs/admin/ADMIN_COMMAND_REGISTRY.json`
- Create: `tests/admin_command_registry_contract.test.mjs`

**Steps:**

1. Parse callable references and mutation controls from `admin/v2/legacy.html` and function exports.
2. Require actor/role, input validation, idempotency, preview/confirm, audit event, rollback and test fields.
3. Keep missing fields visible as blockers; do not invent guarantees from naming.

**Status (2026-09-11):** Registry generated for 82 literal callable references from the single live admin surface; all 82 match configured Functions source roots. Every required safety field remains explicitly blocked pending evidence; no admin behavior or deployment changed.

### Task 5.2: Extract the first compatible admin seam

**Files:**

- Read first: `docs/design/ADMIN_UI_BIBLE.md` and `docs/admin/WHITE_ADMIN_V2_RETIRED.md`
- Modify: `admin/v2/legacy.html`
- Create: `admin/v2/scripts/admin-session-shell.js`
- Modify: `tests/admin_single_surface_contract.test.ts`
- Create: `tests/admin_session_shell_contract.test.mjs`

**Steps:**

1. Characterize current login/session DOM, events and error states.
2. Extract without changing IDs, copy, behavior, App Check policy or hosting surface.
3. Require script inclusion from `legacy.html`, no second entrypoint and no restored V2 modules.
4. Run focused admin contracts and read-only live login smoke after guarded hosting deploy.

Repeat extraction with a new packet for dialogs/focus, read models and command adapters; never combine seams in one task.

**Status (2026-09-11):** Current login/session surface characterized by static contract (2/2) and a read-only production smoke of the canonical `legacy.html` surface. No seam extraction or admin mutation was attempted; a separately reviewed packet is required for implementation.

## Phase 6 — App journey reliability

### Task 6.1: Define Tier 0/1 journey contracts and SLOs

**Files:**

- Create: `docs/operations/CRITICAL_JOURNEYS.json`
- Create: `docs/operations/SLO_POLICY.md`
- Create: `scripts/verify_critical_journeys.mjs`
- Create: `scripts/verify_critical_journeys.test.mjs`

**Steps:**

1. Require owner, user promise, success event, latency, error budget, offline/retry behavior, privacy fields and runbook.
2. Populate Tier 0 with auth/recovery, purchase/entitlement, deletion, learning start/completion and progress sync.
3. Instrument missing signals under separate privacy-reviewed packets.
4. Set numeric SLOs from measured baseline plus product promise, not aspiration alone.

**Status (2026-09-11):** Eight Tier 0/1 journey contracts and proposed targets are machine-validated. Status remains `baseline_pending`; no telemetry or alerting was added.

### Task 6.2: Add native accessibility evidence pack

**Files:**

- Create: `docs/quality/NATIVE_ACCESSIBILITY_MATRIX.md`
- Create: `tests/native_accessibility_contract.test.ts`
- Create: `maestro/accessibility/` journeys as individually scoped files.

**Steps:**

1. Cover VoiceOver/TalkBack labels/actions, font scaling, contrast, 44–48 pt targets, focus, reduced motion and small-screen reachability.
2. Run static contracts first; schedule physical-device manual evidence for Tier 0.
3. Remediate one journey per task packet to avoid broad UI regressions.

**Status (2026-09-11):** Native accessibility evidence matrix and static contract added (1/1). VoiceOver/TalkBack and physical-device evidence remain pending.

## Phase 7 — Incident response and recovery

### Task 7.1: Publish and rehearse incident response

**Files:**

- Create: `docs/operations/INCIDENT_RESPONSE.md`
- Create: `docs/operations/INCIDENT_TEMPLATE.md`
- Create: `docs/operations/TABLETOP_LOG.md`
- Create: `scripts/verify_incident_readiness.mjs`

**Steps:**

1. Define severity, commander, technical lead, communications, privacy/legal escalation and evidence preservation.
2. Map every critical alert to an owner and runbook; fail on orphan alerts.
3. Run a no-production-mutation tabletop for account access or entitlement failure.
4. Convert lessons into owned tasks/guards and retain the exercise record.

**Status (2026-09-11):** Incident runbook, record template, tabletop log and orphan-alert gate added. Four alerts are mapped; tabletop remains not run pending owner adoption.

### Task 7.2: Prove backup and recovery

**Files:**

- Create: `docs/operations/BUSINESS_CONTINUITY_DISASTER_RECOVERY.md`
- Create: `docs/operations/RESTORE_TEST_TEMPLATE.md`
- Create: `docs/operations/RESTORE_TEST_LOG.md`

**Steps:**

1. Owner approves RTO/RPO for each Tier 0 service and data store.
2. Document backup source, retention, encryption, access and restoration dependency.
3. Execute a safe non-production restore and verify completeness/integrity.
4. Record timings, exceptions, remediation owner and next test date.

**Status (2026-09-11):** Recovery policy, restore template and log created with explicit pending approvals. No cloud export/restore was executed.

## Program exit criteria

- No P1 audit finding is unowned or lacks a dated treatment.
- Security + Availability control matrix has at least two clean internal evidence cycles.
- Tier 0 journeys have measured SLOs, runbooks and recovery evidence.
- Website header/a11y/CWV baselines operate in production.
- Admin command registry is complete and at least one monolith seam is extracted without a live-surface regression.
- Independent pentest and CPA readiness exceptions are closed or explicitly accepted by the owner before a Type II observation window begins.
