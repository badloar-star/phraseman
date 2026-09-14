# PRD: Phraseman Trust, Quality and Architecture Program

Status: Proposed  
Owner: Product owner  
Horizon: 90-day foundation, then continuous control operation  
Input: [platform full audit](../audits/2026-09-11-platform-full-audit.md)

## Product problem

Phraseman already has a wide learner product, a powerful operational admin and many safety guards. Delivery knowledge, however, is distributed across code, incident comments, tests and owner instructions. The organization cannot quickly answer four basic questions for every change: what outcome is being changed, which architecture boundary owns it, what debt/risk is introduced, and what evidence proves it safe.

This program makes trust a product capability: faster safe changes, understandable operations, measurable learner journeys, recoverable incidents and an eventual SOC 2 audit trail.

## Goals

1. Every substantive change begins with explicit outcome, scope, architecture, debt and verification.
2. Critical learner/admin journeys have owners, SLOs, failure modes and deterministic release evidence.
3. Website and admin meet a measurable WCAG 2.2 AA and web-security baseline.
4. The admin monolith shrinks through compatible seams without replacing the only live admin surface.
5. SOC 2 Security + Availability controls become owned, repeatable and evidence-producing.

## Non-goals

- Rebuild the product or replace Firebase/Expo.
- Restore the retired white Admin V2 or create a second admin surface.
- Freeze feature delivery until compliance is complete.
- Treat a checklist, scanner or compliance vendor as an audit opinion.
- Refactor unrelated code under the label of technical debt.

## Personas

- Learner: needs fast, understandable, private and recoverable learning flows.
- Administrator/owner: needs safe actions, preview, consequence clarity, audit history and rollback.
- Engineer/agent: needs authoritative boundaries, small scopes and fast evidence.
- Support/incident responder: needs diagnosable state and a rehearsed response path.
- Auditor/customer reviewer: needs a coherent system description and operating evidence.

## Success metrics

| Metric | 90-day target |
|---|---:|
| Substantive change tasks with valid task packet | ≥ 95% |
| Critical journeys with owner + SLO + runbook | 100% of agreed Tier 0/1 inventory |
| Critical controls with owner/cadence/evidence | ≥ 90% |
| Expired critical control evidence | 0 |
| Website good-CWV visits | ≥ 75% per metric, mobile and desktop |
| New WCAG AA blockers in governed surfaces | 0 |
| Admin mutation commands mapped to auth/idempotency/audit/rollback | 100% |
| Repeat incidents from an already-known class | 0 |
| Unowned accepted technical-debt items | 0 |

## Delivery model

- Epics express independently valuable outcomes.
- Architecture enablers unlock multiple stories or retire cross-cutting risk.
- Stories express actor value and acceptance criteria.
- Tasks are the unit of implementation and require a task packet.
- Subtasks are used only for distinct ownership, dependency or proof.
- Capacity policy: 60% product/reliability outcomes, 20% architecture enablers, 20% debt/security/control evidence until P1 risks close.

## Epic map

| Epic | Outcome | Primary KPI | Depends on |
|---|---|---|---|
| E1 Work Governance | Changes start with bounded intent and proof | task-packet coverage | — |
| E2 Architecture Atlas | Sources of truth and trust boundaries are visible | critical domains mapped | E1 |
| E3 Unified Quality Gates | Each change type has fast deterministic evidence | change-to-green time, escape rate | E1, E2 |
| E4 Website Trust & Growth | Site is secure, accessible and measurable | CWV, funnel completion | E3 |
| E5 Safe Admin Operations | Admin actions are understandable and recoverable | mapped commands, admin incidents | E2, E3 |
| E6 App Journey Reliability | Critical learner flows have SLOs and recovery | journey success/SLO | E2, E3 |
| E7 Security, Privacy & SOC 2 | Controls operate and produce audit evidence | control evidence freshness | E2, E3 |
| E8 Operational Resilience | Incidents are detected, handled and recovered | MTTD/MTTR, restore proof | E6, E7 |

## E1 — Work Governance

Outcome: each substantial implementation begins from a shared architecture/scope/debt contract.

### EN-1.1 Session-scoped task governance hook

Architecture enabler. A unique task request must not be satisfied by another parallel session's plan.

Acceptance:

- change-intent prompt receives a governance ID;
- Write/Edit is denied until the same ID exists in a valid packet;
- read-only requests remain unblocked;
- full user prompts are not persisted;
- focused tests cover denial, allowance, incomplete packet and session isolation.

### US-1.1 As an engineer, I can see exactly what is in and out of scope

Acceptance: every governed task names in-scope/out-of-scope modules, architecture impact, security/privacy impact, debt disposition, verification and rollback.

Tasks:

- T1.1.1 Publish task hierarchy and Definition of Ready/Done.
- T1.1.2 Publish task packet template.
- T1.1.3 Install UserPromptSubmit and PreToolUse hooks.
- T1.1.4 Add CI traceability design after multi-session adoption review.

### US-1.2 As the owner, I can see technical debt before approving work

Acceptance: debt is marked pay/contain/accept; accepted debt has owner, review date, impact ceiling and exit enabler.

Tasks:

- T1.2.1 Create debt-register schema and severity rubric.
- T1.2.2 Seed it with audit P1/P2 findings.
- T1.2.3 Add monthly debt review and 20% capacity check.

## E2 — Architecture Atlas

Outcome: teams can locate authority, data and failure boundaries without reading the whole repository.

### EN-2.1 C4-lite system and container map

Tasks:

- T2.1.1 Document clients, hosting targets, Firebase projects/codebases, stores and external vendors.
- T2.1.2 Mark trust boundaries, personal-data paths and deploy ownership.
- T2.1.3 Add a freshness owner and quarterly verification date.

### EN-2.2 Critical domain contracts

Create concise contracts for identity/account deletion, learning, economy/entitlements, payments, voice/AI, admin commands, analytics/privacy and release.

Acceptance: each contract states source of truth, authority, invariants, idempotency, offline behavior, privacy, failure recovery and owning tests.

### US-2.1 As an implementer, I can determine the correct module before editing

Acceptance: a new task can link one system map and one domain contract; ambiguous or conflicting ownership creates an ADR before code.

## E3 — Unified Quality Gates

Outcome: verification is proportionate to risk and consistent across delivery paths.

### EN-3.1 Change classification matrix

Classes: docs/content, website, app UI, identity/privacy, economy/purchase, functions/schema, admin mutation, migration, release.

Tasks:

- T3.1.1 Map each class to fast checks, domain tests, independent review and smoke journey.
- T3.1.2 Define evidence filename/retention and failure ownership.
- T3.1.3 Make deterministic failing gates authoritative; prohibit bypass-by-test-removal.

### EN-3.2 Test isolation program

Acceptance: measure suite duration, memory, retries and state leakage; split one domain at a time; preserve behavior before enabling parallelism.

Tasks:

- T3.2.1 Inventory shared globals and module mocks in app Jest.
- T3.2.2 Select first high-value isolated pack.
- T3.2.3 Establish flaky-test quarantine rules with owner and expiry.

### US-3.1 As an engineer, I get fast relevant feedback

Acceptance: a normal UI change does not require unrelated release workflows; a trust-boundary change cannot skip its security/contract pack.

## E4 — Website Trust & Growth

Outcome: visitors can understand, access and reach Phraseman through a fast, secure, measurable site.

### EN-4.1 Header and browser-security baseline

Tasks:

- T4.1.1 Inventory scripts, styles, frames and outbound origins.
- T4.1.2 Deploy CSP report-only and collect violations.
- T4.1.3 Enforce CSP after clean observation; add nosniff, referrer and minimal permissions policy.
- T4.1.4 Add hosting contract tests for headers on primary routes.

### EN-4.2 Field performance telemetry

Acceptance: consent-aware RUM reports LCP/INP/CLS at p75 by route/device, with no raw PII.

### US-4.1 As a keyboard or assistive-tech visitor, I can navigate all primary journeys

Acceptance: skip navigation, visible focus, logical headings, 200/400% zoom, reduced motion, FAQ state and form errors pass WCAG 2.2 AA checks.

### US-4.2 As a prospective learner, I reach the correct next step

Acceptance: app, test, gift, support and download paths have automated status/canonical/locale checks and consented funnel events.

## E5 — Safe Admin Operations

Outcome: every admin action explains impact, is authorized/idempotent/audited and has a recovery path.

### EN-5.1 Admin command registry

For every mutation record command name, actor role, target, preview, validation, idempotency key, audit event, alert, rollback/compensation and owning test.

Tasks:

- T5.1.1 Generate read-only mutation inventory from `legacy.html` and callable exports.
- T5.1.2 Review gaps by risk: money/access, user data, content/config, communication.
- T5.1.3 Add missing contract tests without changing App Check owner policy.

### EN-5.2 Compatible monolith seams

Constraints: `admin/v2/legacy.html` remains the only live surface; only scripts directly loaded by it may exist in `admin/v2/scripts/`; no white V2 restoration.

Tasks:

- T5.2.1 Record current bundle/DOM/API baseline.
- T5.2.2 Extract auth/session shell with byte-level hosting contract.
- T5.2.3 Extract dialog/focus primitives.
- T5.2.4 Extract read models, then mutation command adapters.
- T5.2.5 Ratchet inline code downward and tighten CSP per slice.

### US-5.1 As an administrator, I understand consequences before mutation

Acceptance: high-impact actions show target, effect, validation, preview and explicit confirmation; success/failure is announced and recorded.

### US-5.2 As an administrator, I can recover from a bad change

Acceptance: reversible config/content actions expose history and rollback; irreversible actions expose forward-recovery procedure and approval evidence.

## E6 — App Journey Reliability

Outcome: the learner's core jobs work predictably across cold start, offline, retry and account transitions.

### EN-6.1 Critical journey catalog and SLOs

Tier 0 candidates: sign-in/account recovery, purchase/entitlement, account deletion, learning-session start/completion, progress persistence/sync. Tier 1 candidates: voice/AI, downloads/audio, leagues/arena, gifts and support reports.

Tasks:

- T6.1.1 Name owner and user promise for each journey.
- T6.1.2 Define availability/success/latency/error budget and privacy-safe signals.
- T6.1.3 Define offline, timeout, retry, idempotency and user recovery behavior.

### EN-6.2 Native accessibility matrix

Acceptance: TalkBack/VoiceOver, font scaling, contrast, 44–48 pt targets, focus, reduced motion and orientation/small-screen reachability are tested for Tier 0 journeys.

### US-6.1 As a learner, I never lose a committed result because the network failed

Acceptance: each Tier 0 transaction has explicit local commit, sync, retry and conflict behavior; money/entitlement follows immutable idempotent contracts.

### US-6.2 As a learner, an error tells me what happened and how to continue

Acceptance: errors have stable categories, accessible copy, retry/support path and telemetry without leaking sensitive content.

## E7 — Security, Privacy and SOC 2

Outcome: security and availability controls are both technically effective and auditor-verifiable.

### EN-7.1 System description and control matrix

Tasks:

- T7.1.1 Confirm in-scope services, locations, people, data, vendors and commitments.
- T7.1.2 Map AICPA criteria to control, owner, cadence, evidence, retention and exception SLA.
- T7.1.3 Run a monthly evidence dry-run before observation.

### EN-7.2 Access governance

Acceptance: joiner/mover/leaver, least privilege, MFA, service accounts, break-glass and quarterly review produce retained evidence. Admin App Check remains off until the owner's explicit staged enablement criteria are met.

### EN-7.3 Vulnerability and supply-chain management

Tasks:

- T7.3.1 Add CODEOWNERS, SECURITY policy and private intake.
- T7.3.2 Add dependency inventory/update cadence and severity SLA.
- T7.3.3 Commission scoped external mobile/web/cloud pentest; track remediation evidence.
- T7.3.4 Review CI AI/API secrets and remove workflows that violate current spend/security policy.
- T7.3.5 Triage the 2026-09-11 dependency baseline: root 2 critical/17 high and Functions 4 high; prove reachability, upgrade Functions mail dependencies first, and treat Expo major upgrade as a release migration.

### EN-7.4 Privacy data lifecycle

Acceptance: every data category maps purpose, consent/legal basis, store, vendor, retention, deletion, export/access and child-safety decision.

### US-7.1 As a customer reviewer, I receive truthful security evidence

Acceptance: security claims link to current controls and exceptions; no “SOC 2 compliant” claim appears before the independent report exists.

## E8 — Operational Resilience

Outcome: incidents are detected, contained, communicated and recovered within explicit objectives.

### EN-8.1 Incident response system

Tasks:

- T8.1.1 Define severity, roles, escalation, legal/privacy decision tree and communication templates.
- T8.1.2 Connect alerts to owner and runbook; remove orphan alerts.
- T8.1.3 Run quarterly tabletop and convert lessons into controls/guards.

### EN-8.2 Business continuity and disaster recovery

Tasks:

- T8.2.1 Inventory critical services and dependencies.
- T8.2.2 Approve RTO/RPO and backup/restore ownership.
- T8.2.3 Execute restore test in a safe environment and retain evidence.
- T8.2.4 Publish outage/status and support escalation procedure.

### US-8.1 As the owner, I know whether the product is healthy

Acceptance: one operational view shows Tier 0 SLO status, active incidents, stale evidence, failed backups/restores and owner/action—not decorative real-time noise.

## Prioritization and dependency order

1. E1 immediately: already implemented as a small enabler in this change.
2. E2 + E7 foundations: system boundary, critical domains, controls, risk and vendors.
3. E3 release matrix so subsequent work generates comparable proof.
4. E8 IR/DR and E6 Tier 0 journeys in parallel only where ownership is independent.
5. E4 website hardening as a low-blast-radius proving ground.
6. E5 admin command registry before any structural extraction; then one seam per release.

## Release strategy

No big-bang release. Every enabler is introduced as observe → warn → block where practical. Header work uses report-only before enforcement. Admin extraction preserves the live shell. Control evidence runs internally before an auditor observation window. Any change affecting auth, money, privacy, schema, deletion, migration or release requires independent review and explicit rollback/forward-recovery proof.

## Open owner decisions

1. Which commercial/customer commitment is driving SOC 2, and by what date?
2. Initial categories: Security + Availability only, or add Confidentiality/Privacy?
3. Who owns security/compliance operations and evidence cadence?
4. What are acceptable Tier 0 RTO/RPO and learner-facing SLOs?
5. Which admin commands require two-person approval versus owner-only confirmation?
