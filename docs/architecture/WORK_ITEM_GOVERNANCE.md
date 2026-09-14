# Phraseman work-item and architecture governance

## Purpose

Phraseman has enough product breadth that a flat task list hides dependency, risk, and debt. This model keeps planning proportional: strategy is explicit once, implementation is scoped per task, and high-risk work gains evidence before it gains code.

## The hierarchy

| Level | Use it when | Required output |
|---|---|---|
| PRD / initiative | Several outcomes must move together | problem, users, outcomes, non-goals, metrics, constraints, rollout |
| Epic | A coherent outcome can be accepted independently | outcome, KPI, acceptance boundary, dependencies |
| Architecture enabler | Delivery needs a reusable capability or a material risk retired | target boundary, consumers, migration/compatibility, proof |
| User story | One actor receives observable value | story, acceptance criteria, analytics/a11y/error states |
| Task | One bounded implementation or investigation unit | task packet, exact scope, verification, debt decision |
| Subtask | Work has a distinct owner, dependency, or verification gate | a checkable result; otherwise keep it inside the task |

An enabler is not a dumping ground for “technical work.” It must unlock named epics, lower a measured risk, or retire named debt. A refactor without a consumer, exit condition, or metric stays in the debt register rather than entering delivery.

## Mandatory task packet

Every substantive change request starts from [TASK_PACKET_TEMPLATE.md](../work/tasks/TASK_PACKET_TEMPLATE.md). Before implementation it must answer:

1. What observable outcome is required?
2. What is explicitly inside and outside scope?
3. Which boundary or invariant changes?
4. What security/privacy exposure exists?
5. Which debt is paid, contained, or accepted?
6. What deterministic evidence proves completion?
7. How is the change rolled back or recovered?

The packet is intentionally shorter than a design document. Add an ADR when a decision is costly to reverse, changes a cross-module contract, introduces a new source of truth, or has competing viable designs.

## Hook enforcement

The project-level Claude configuration implements two gates:

- `UserPromptSubmit` detects a substantive change request, creates a session-specific governance ID in ignored `.codex-tmp/task-governance/`, and adds the packet requirement to agent context.
- `PreToolUse` allows writing the task packet, but denies other `Write`/`Edit` operations until a packet with the same governance ID has all required sections.

The state is per session, so parallel work cannot satisfy another session's gate. Only a SHA-256 prompt digest is retained; the prompt itself is not stored. Read-only questions are not armed. Existing repository guardrails remain independent and continue to run after this gate.

This gate governs Claude Code because that runtime exposes the required lifecycle hooks. Other agents and humans must follow the same template through repository instructions and review; a later enabler may add CI traceability once the current multi-session working tree has a safe adoption path.

## Technical-debt policy

Debt is managed as a portfolio, not a guilt tax on every feature.

- Reserve 20% of normal engineering capacity for enablers, debt retirement, and reliability until the red risks in the platform audit are below threshold.
- Use a debt record with: symptom, affected outcome, principal, interest signal, containment, owner, review date, and exit criterion.
- Apply the “boy scout” rule only inside the task's tested boundary. Adjacent cleanup needs its own task; it must not silently expand scope.
- Prefer ratchets over rewrites: prevent new violations first, then reduce the baseline in measured slices.
- Escalate debt to an epic when it crosses a trust boundary, blocks multiple product epics, causes repeated incidents, or consumes more than two feature cycles of recurring work.

## Definition of ready

A task is ready when its packet is complete, dependencies and owner decisions are known, acceptance is testable, and the debt disposition is explicit. Security-, privacy-, money-, identity-, migration-, or release-sensitive work additionally needs independent review before mutation.

## Definition of done

The outcome works in the intended environment; focused automated checks pass; accessibility, failure, empty/loading, and recovery states are covered where relevant; telemetry is privacy-conscious; documentation/contracts are current; no unowned debt was created; and rollout/rollback evidence is retained.
