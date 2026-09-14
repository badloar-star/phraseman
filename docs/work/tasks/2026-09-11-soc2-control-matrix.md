# Task packet: SOC 2 control matrix and evidence calendar

Governance-ID: MANUAL-2026-09-11-SOC2-CONTROL-EVIDENCE
Status: Blocked — local Security + Availability matrix, evidence guide and verifier are complete; formal boundary/control approval, named-human ownership and operating evidence cycles remain PENDING
Owner: Codex critical-security task under product-owner instruction
Related epic/enabler: E7 / Task 2.2

## Outcome

Create a machine-verified internal control matrix for the Security and Availability trust-services categories, plus an evidence collection guide that distinguishes control design from operating evidence. The local result must expose missing formal approvals and operating cycles rather than imply SOC 2 readiness.

## Scope

In scope: `docs/security/SOC2_CONTROL_MATRIX.json`, `docs/security/CONTROL_EVIDENCE_GUIDE.md`, `scripts/verify_control_evidence.mjs`, `scripts/verify_control_evidence.test.mjs`, this task packet, and the minimal Task 2.2 status line in the Platform Trust Program plan.

Out of scope: production/cloud access, secrets, personal data, IAM or application changes, evidence fabrication, formal control approval, additional trust-services categories, auditor representations, deployment, release, and risk acceptance.

## Architecture

The matrix is a documentation and verification layer over the Task 2.1 boundary/risk register and existing repository safeguards. Each control records one primary criterion reference, a role owner, cadence, retention, exception SLA, linked risks and repository evidence sources. The complete inventory records all 33 Security and 3 Availability references with a truthful `Mapped`, `Planned`, `Gap` or `PendingCPA` status and rationale; only genuinely aligned entries claim mapped control IDs. Evidence sources are classified as `planning`, `gap`, `design` or `operating`. Operating evidence must reference a machine-validated JSON manifest whose evidence/control/cycle identifiers match and whose population, performer/system, execution result, exceptions and disposition, revision/checksum and timestamps are complete. A cycle counts only for an approved matrix when every control in the approved required population has valid passing operating evidence for the same cycle and an independent reviewer records a clean decision. A zero-dependency read-only verifier validates schema, bidirectional risk links, criterion coverage semantics, strict dates/enums, uniqueness, implementation/evidence relationships, operating manifests, evidence path containment/existence and freshness.

## Security and privacy

No authentication material, production records, access lists, customer data or secrets are collected. Paths are repository-relative and rejected if absolute or escaping the repository. Missing named-human ownership and unavailable operating evidence remain explicit blockers. Only Security and Availability are in scope; Confidentiality, Processing Integrity and Privacy require an owner/CPA scope decision.

## Technical debt

- Pay now: absent control inventory, full criterion-status inventory, bidirectional risk/control completeness, evidence vocabulary/calendar, deterministic schema validation, machine-readable operating manifests, complete-cycle semantics, duplicate detection and freshness validation.
- Contain: use role ownership with `human_pending` state and Draft matrix status; exit when the product owner assigns named people and records approval.
- Accept temporarily: operating evidence cycle count remains zero. Owner: product owner plus compliance/security. Review date: 2026-09-25. Impact ceiling: internal readiness planning only, with no SOC 2 readiness/compliance claim. Exit condition: at least two independently reviewed clean operating cycles after control owners approve procedures.

## Verification

Completed with test-first fixture coverage under the repository semaphore. Initial RED: `node --test scripts/verify_control_evidence.test.mjs` failed 0/8 because `scripts/verify_control_evidence.mjs` did not exist. First GREEN attempt passed 7/8; the single failure exposed a test-fixture defect that created the file intended to be missing. After correcting only that fixture, the suite passed 8/8. A second fail-closed owner-approval RED passed 8/9 and proved that an `Approved` matrix could be created without a named human; the implementation then required `ownerName` for `assigned` owners and passed 9/9. First spec-review remediation added 22 TDD fixtures; RED failed 0/22 because the prior verifier did not understand the required risk-register input. The first implementation run passed 21/22 and exposed a filename-classification gap between hyphenated and underscored risk-register paths; after tightening that rule, GREEN passed 22/22. Second spec-review remediation added four tests and expanded two existing regressions. RED passed 20/26 with six expected failures: generic/malformed/mismatched operating evidence was accepted, dangling control-to-risk links were not rejected, and criterion coverage semantics were absent. The implementation now rejects those cases and passes 26/26. The real read-only dry run reports `control_evidence_ok controls=17 criteria=36 mapped_criteria=13 planned_criteria=11 gap_criteria=9 pending_cpa_criteria=3 design_sources=8 planning_sources=3 gap_sources=7 operating_sources=0 operating_cycles=0 status=Draft mode=dry-run`; it checks repository evidence structure/existence/freshness only and is not an operating evidence cycle. Manual CPA review remains required for semantic criterion alignment.

## Rollback

Remove only the new Task 2.2 documentation/verifier/test files and revert the single Task 2.2 plan status line. No runtime, user data, entitlement, cloud, audit-period or deployment state changes.
