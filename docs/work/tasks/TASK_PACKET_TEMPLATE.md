# Task packet: <short outcome>

Governance-ID: <ID supplied by the task-governance hook>
Status: Planned
Owner: <person or session>
Related epic/enabler: <ID or none>

## Outcome

Describe the observable result, the user or operator who benefits, and the success measure. A task is not “done” merely because files changed.

## Scope

In scope: name the flows, modules, data contracts, and files expected to change.

Out of scope: name adjacent work that this task deliberately will not absorb.

## Architecture

State the current boundary, the intended boundary, data/control flow, invariants, and any architecture decision. Write “No architecture change” only with a reason.

## Security and privacy

Identify authentication, authorization, input/output, secrets, personal data, child safety, abuse, and compliance impact. State why none applies when that is the case.

## Technical debt

Choose one disposition for every known debt item:

- Pay now: eliminate it inside this scope.
- Contain: add a boundary, test, metric, or ratchet and name the exit condition.
- Accept temporarily: name the owner, review date, impact ceiling, and linked enabler.

Do not create silent debt. “Later” without an owner and exit condition is not a decision.

## Verification

List deterministic acceptance checks, test commands, manual journeys, observability evidence, and the evidence artifact to retain. Include accessibility and rollback checks when applicable.

## Rollback

Explain how to disable or reverse the change without losing user data or violating an already-granted entitlement. For irreversible migrations, describe forward recovery instead.
