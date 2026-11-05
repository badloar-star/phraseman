# Task packet: keeper of MASTER_TASKS (owner's task registry)

Governance-ID: TG-1A30A33FBF2E
Status: In progress (recurring)
Owner: 3 · МАКЕТЫ session (coordinator assignment 05.11)
Related epic/enabler: owner rule "ни одна задача не забыта"

## Outcome
docs/work/release/MASTER_TASKS_2026-11-05.md reflects reality every 30 minutes; rows closed only with evidence; stuck owners pinged; hourly summary to coordinator.

## Scope
In scope: that one markdown file (+ messages). Out of scope: doing the tasks themselves.

## Architecture
No architecture change; documentation.

## Security and privacy
Docs only.

## Technical debt
Contain: session-only cron (dies with the session, 7 days max); exit: coordinator re-assigns keeper if this session ends.

## Verification
Each status change cites commit hash / file path / frame name.

## Rollback
git revert of the registry commit.
