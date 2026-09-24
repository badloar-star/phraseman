# Task packet: PM-067 XP runtime inventory (read-only)

Governance-ID: TG-078128B2BC2A
Status: Planned
Owner: analyst session (read-only)
Related epic/enabler: PM-067 (docs/phraseman-2.0/tasks/PM-067.md), epic E07

## Outcome

Produce a documentation-only inventory of every place in the runtime that awards, reads, stores,
or gates on XP / old account level, so a future implementation task (PM-068) can plan the actual
removal/replacement with coin_rank. No code is changed. The owner benefits from a single accurate
map instead of re-discovering call sites during a risky deletion pass.

## Scope

In scope: read-only grep/read across `app/`, `functions/src/`, `components/` (excluding
`.claude/worktrees/`, `.worktrees/`, `_archive/`, `node_modules/`) for `registerXP`,
`getLevelFromXP`, XP storage keys, and XP-as-access-condition sites. Output is a single new
Markdown file: `docs/phraseman-2.0/docs/XP_RUNTIME_INVENTORY.md`.

Out of scope: any code change, any deletion of XP logic, any decision on D05/PM-014 (dialog
access threshold), any migration design. This task packet exists only to satisfy the
task-governance hook for the write of the inventory document itself.

## Architecture

No architecture change. This is a documentation artifact describing existing architecture
(XP runtime: `app/xp_manager.ts` as the single award entry point, `functions/src/xp_levels.ts`
as the level-formula source, Firestore `progressServerState` as server-authoritative copy).

## Security and privacy

None applies — no data collection, storage, or transfer changes; read-only static analysis of
already-committed source code.

## Technical debt

Contain: the inventory itself documents existing debt (XP used as an access condition in
dialogs, level gifts, arena→league week points, level spins) without resolving it. Exit
condition: owner decision on each item, tracked via PM-068 and PM-014, before any deletion.

## Verification

Deterministic check: the produced file `docs/phraseman-2.0/docs/XP_RUNTIME_INVENTORY.md` exists
and lists file:line references verifiable by grep (e.g. `grep -n "registerXP(" app/lesson1.tsx`).
No test run required — no code changed.

## Rollback

Trivial — delete or revert the single documentation file if inaccurate; no runtime behavior is
affected by its existence.
