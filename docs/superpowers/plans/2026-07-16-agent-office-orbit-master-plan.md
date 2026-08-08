# Agent Office Control Center — ORBIT Master Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `subagent-driven-development` or `executing-plans` only after a workstream-specific plan is approved. Every worktree has one writer; review and verification workers are read-only.

**Goal:** Safely evolve Admin V2 into a human-approved operational center where agents observe, prepare and explain work without changing production autonomously.

**Architecture:** Admin V2 remains the browser control plane; Cloud Functions own policy, data access, audit and Telegram approvals; a later Windows Local Companion prepares approved code changes in isolated worktrees. Legacy remains functional throughout migration.

**Tech Stack:** Admin V2 vanilla JS, Firebase Authentication/Firestore/Cloud Functions, Telegram Bot API, existing analytics/support/audit callables, Jest/Playwright, Git worktrees.

---

## ORBIT operating rules

| Rule | Decision |
|---|---|
| Worker creation | No worker exists until the owner explicitly issues `ORBIT WORKER EXECUTE`, `VERIFY`, `REVIEW`, `CRITICAL`, or `REDTEAM`. |
| Model truth | The current task model does not change. A worker model is recorded only after a separate user-visible task has actually been created. |
| Branching | Each implementation workstream gets a fresh `codex/agent-office-<scope>` branch and isolated worktree created from its reviewed base commit. |
| Writers | Exactly one writer per worktree. Reviewers and verifiers are read-only and never repair source. |
| Merge gate | No merge without focused automated checks, diff review, affected-contract review, and an explicit owner decision. |
| Production | No deploy, secret mutation, user message, role/access, price, Remote Config, migration or Firestore Rules change belongs to this master plan without a dedicated critical workstream. |
| Cost | Terra Medium for ordinary bounded implementation; Luna Medium for deterministic verification; Sol High for security/privacy/permissions and substantive design review. Sol XHigh is reserved for a real P0/P1 or unresolved critical conflict. |

## Immutable product and safety constraints

- Human-in-the-loop: agents only observe, prepare, explain and queue; the owner approves consequential actions.
- Admin V2 is the primary interface; Telegram is for short alerts and approval navigation, never a source of secrets or raw database content.
- Legacy features cannot be removed, hidden or bypassed until a replacement is verified and recorded in the migration matrix.
- External sources begin read-only. Secrets stay in server-side secret storage; browser, Git, docs, local files and Telegram never receive them.
- Shared knowledge consists of approved product facts, decisions, support tone and privacy-preserving summaries. Raw PII is accessed only for an active case through a server-side policy gate and audit trail.
- Phraseman Codex API firewall remains in force: no local Codex use of project OpenAI API keys for chat, analysis, research, judging, generation or embeddings.

## Workstream sequence

### W0 — Security and data-contract gate

**Purpose:** Define the smallest safe foundation before any agent queue, memory or connector is built.

**Required inspection:** `firestore.rules`, `functions/src/admin_audit_log.ts`, existing admin-role helpers, `functions/src/admin_alerts.ts`, `functions/src/support_inbox.ts`, `functions/src/telegram_support.ts`, `functions/src/index.ts`, related tests and Firebase indexes/config.

**Deliverables:**

1. A short threat model covering role escalation, Telegram impersonation/replay, prompt injection from emails/reports, PII disclosure, secret leakage, malformed approvals, connector failures and audit tampering.
2. A versioned `AgentCase`, `AgentRecommendation`, `AgentApproval`, `AgentTask` and `AgentAuditEvent` contract, including allowed status transitions and TTL/retention fields.
3. A policy table: each role, field class, actor, allowed read/write, approval requirement and audit event.
4. A decision on permitted model provider/data-processing path. No model call implementation before this decision.

**ORBIT routing:** `ORBIT WORKER CRITICAL` → Sol High, read-only design/security review. No writer branch until the owner accepts the contract.

**Acceptance gate:** The review names each Firestore path and callable needed later, proves least-privilege access, and rejects any design that gives raw PII to every agent permanently.

### W1 — Read-only case and decision ledger

**Purpose:** Add an auditable, server-owned record of observations and owner decisions without external agent execution.

**Expected implementation boundary:** new isolated `functions/src/agent_office/` modules plus tests; additive `functions/src/index.ts` exports; Admin V2 action bindings and a narrow page module. Do not fold logic into the 388 KB `admin-core.js` monolith.

**Required tasks in the later implementation plan:**

1. RED tests for parsing, allowed state transitions, idempotency, role checks, cursor pagination, PII redaction and audit projection.
2. Minimal Cloud Function callables for listing a case, listing recommendations, creating an owner-only approval/decline, and querying the audit trail.
3. Server-side transaction semantics: approval must name the exact recommendation revision; duplicates are idempotent; a stale revision cannot become approved.
4. Admin V2 page module and route that display source health, evidence, confidence, status and owner decision. It may not publish Remote Config or call delivery endpoints.
5. Focused Jest/contract tests and local E2E fixture coverage.

**ORBIT routing:** `ORBIT WORKER EXECUTE` → Terra Medium, one writer. After code is committed, `ORBIT WORKER VERIFY` → Luna Medium, read-only. `ORBIT WORKER REVIEW` → Sol High for permission/audit review.

**Acceptance gate:** A user can read a safe decision card, approve or decline it as owner, see an immutable audit event, and no agent action is executed from that approval.

### W2 — Read-only analytics and report triage pilot

**Purpose:** Convert existing Phraseman signals into evidence-backed recommendations while preserving the current analytics and support workflows.

**Existing integration seams:** `adminGetAnalyticsSnapshot`, product/subscription analytics, `adminMonthlyDecisionPack`, report-center callables, `adminListAuditLog`, `adminAlertOnUserReport`, and `adminAlertOnCriticalError`.

**Required tasks in the later implementation plan:**

1. Adapters translate existing source-health/truncation semantics into standard case evidence; missing or truncated source data is never interpreted as zero.
2. Deterministic rules create cases for a limited approved set of signals before any model-assisted analysis.
3. Deduplicate related user reports into one incident with a count and bounded sample of evidence.
4. Add a daily digest that names evidence freshness, cost and no more than one recommended action; it remains a draft/observation.
5. Add test fixtures for complete, partial, error and truncated sources.

**ORBIT routing:** `ORBIT WORKER EXECUTE` → Terra Medium. `ORBIT WORKER VERIFY` → Luna Medium. Review with Sol High only if new user-data paths or permissions are introduced.

**Acceptance gate:** During a 2–3 week observation pilot, cards identify a real signal or explicitly report insufficient evidence; they do not mutate user data, send external messages or change production configuration.

### W3 — Telegram approvals and safe delivery

**Purpose:** Deliver short, redacted cards to the owner and route approval back to the server-owned ledger.

**Existing integration seams:** `functions/src/admin_alerts.ts`, `functions/src/telegram_support.ts`, existing Telegram admin identity/configuration, and `admin_log`.

**Required tasks in the later implementation plan:**

1. Owner allowlist and callback authentication; callbacks carry opaque IDs, never PII, source text or secrets.
2. Signed/expiring approval token bound to case ID, recommendation revision, owner ID and permitted verb.
3. Idempotent callback handling; expired, replayed, malformed or unauthorized callbacks create safe audit events and do nothing else.
4. Global kill switch read before delivery, callback handling and task enqueue.
5. Tests for all allow/deny, expiry, replay, redaction and kill-switch states.

**ORBIT routing:** `ORBIT WORKER CRITICAL` → Sol High for implementation because it touches auth, permissions and external command execution. `ORBIT WORKER REDTEAM` → Sol XHigh only if the critical reviewer finds an unresolved privilege-escalation or data-exfiltration path.

**Acceptance gate:** Telegram can approve/decline only an existing current revision for the owner; it cannot execute a production mutation and cannot disclose protected data.

### W4 — Support and report preparation

**Purpose:** Let agents prepare consistent support/reply and engineering-task drafts; sending remains manual.

**Existing integration seams:** `functions/src/support_inbox.ts`, report reply contracts, support audit helpers and Admin V2 support routes.

**Required tasks in the later implementation plan:**

1. Reuse existing draft/prepare/dispatch state distinctions; do not introduce a parallel mail-delivery path.
2. Store a support case summary, relevant history reference and approved tone rules separately from raw mail body.
3. Show a human-readable reason and evidence on every draft; require manual dispatch through the existing authorized workflow.
4. Verify sign-out/account-switch isolation for case summaries and every account-scoped record.

**ORBIT routing:** `ORBIT WORKER EXECUTE` → Terra Medium; `ORBIT WORKER REVIEW` → Sol High if data processing or send permissions change; `ORBIT WORKER VERIFY` → Luna Medium.

**Acceptance gate:** Drafts improve the current support flow without auto-sending a user message or expanding who can read full mailbox content.

### W5 — Windows Local Companion

**Purpose:** Prepare approved code changes on the owner’s computer without granting cloud agents a repository shell or deploy authority.

**Preconditions:** W0–W4 are verified; the owner has explicitly approved the companion’s local trust model; a separate design covers Windows installation, updates, process lifetime and local credential boundaries.

**Required tasks in the later implementation plan:**

1. Poll/claim only server-created, owner-approved, expiring developer tasks using a signed task envelope.
2. Require a clean dedicated worktree; create `codex/agent-office-<case-id>` from a recorded base SHA; never touch the user’s active worktree.
3. Apply only an explicit task payload, run allowlisted narrow checks, attach diff/stat/check result, and never deploy, push, merge or alter secrets.
4. Recheck kill switch and task expiry before each privileged local operation.
5. Record every command class and result; redact arguments/output that can contain secrets.

**ORBIT routing:** `ORBIT WORKER CRITICAL` → Sol High. A Luna verifier validates deterministic task envelope/worktree/kill-switch tests. No generic multi-agent worker gets local shell access.

**Acceptance gate:** With the computer off, tasks remain pending. With it on, an approved task creates only an isolated branch/worktree and returns a test report; production and the active user worktree remain untouched.

### W6 — External connector expansion and controlled autonomy

**Purpose:** Add external read-only sources and, only after measured pilot success, one narrowly scoped automatic action at a time.

**Connector order:** source inventory/credentials/privacy review → Firebase/RevenueCat/GitHub → support/Gmail → store consoles → Meta/Instagram/YouTube/Figma/Stripe/PayPal. The product request includes all sources, but each connector is independently gated because credential, API, privacy and rate-limit contracts differ.

**Controlled-autonomy rule:** FAQ auto-replies are considered only after W4 evidence, with an approved class allowlist, sampling review, immediate disable control and no financial/access/security content.

**ORBIT routing:** one dedicated workstream and branch per connector. Terra Medium only for a non-sensitive read-only connector; Sol High for payment, access, identity, privacy or action-bearing connector work.

**Acceptance gate:** Each connector proves read-only scope, rate limits, error isolation, redaction, cost attribution and clean disable/rollback before it appears in the daily digest.

## Branch and routing receipt template

Use this receipt only after a real user-visible worker task has been created:

```text
ORBIT receipt
worker task id: <returned task id>
role: <execute | verify | review | critical | redteam>
model/reasoning: <returned explicit values>
branch/worktree: codex/agent-office-<scope> / <absolute path>
base commit: <SHA>
allowed files: <exact paths>
acceptance gate: <focused commands and expected result>
handoff: <commit SHA + report path>
```

## Skills loaded by phase

| Moment | Skill | Why it is loaded then, not globally |
|---|---|---|
| Design/routing | `orbit`, `writing-plans`, `smart-explore` | Bounded work routing and context-efficient inspection. |
| W0/W3/W5/security connector | `security-threat-model`, `verification-before-completion` | Critical access, privacy and command surfaces. |
| W1/W2/W4 | `test-driven-development`, `systematic-debugging`, `e2e-testing` | Write focused regression tests, diagnose contracts, verify a real route. |
| Admin V2 UI | `ui-ux-pro-max`, `rn-accessibility-audit` only where applicable | Preserve the Admin UI Bible; do not load design material into backend tasks. |
| Parallel execution | `subagent-driven-development`, `requesting-code-review` | Separate writer/reviewer/verifier only when a workstream starts. |

## Master readiness checklist

- [ ] W0 security/data contract approved by owner.
- [ ] W1 decision ledger passes focused contract tests and owner-only approval gate.
- [ ] W2 observation pilot has run for 2–3 weeks without unintended mutation.
- [ ] W3 Telegram approval is authenticated, idempotent, redacted and kill-switch protected.
- [ ] W4 adds drafts only; existing manual delivery remains authoritative.
- [ ] W5 Local Companion cannot touch active worktrees, secrets, deploys or production.
- [ ] Each W6 connector independently passes its own permission/privacy/rate-limit review.
