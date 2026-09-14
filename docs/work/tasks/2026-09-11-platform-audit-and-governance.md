# Task packet: Platform audit and work governance

Governance-ID: MANUAL-2026-09-11-PLATFORM-AUDIT
Status: Complete
Owner: Codex session requested by product owner

## Outcome

Produce an evidence-backed audit and an executable product/engineering program for the Phraseman website, live admin surface, and mobile application. Add repository hooks that require a scoped architecture and technical-debt decision before a substantive editing task begins.

## Scope

In scope: read-only inspection of live and local product surfaces; research against current primary standards; new audit, PRD, architecture-governance, backlog, and task-template documents; project-level Claude hooks and focused hook tests.

Out of scope: product UI or runtime changes, Firebase writes, deployment, branch/worktree creation, migration, remediation of audit findings, and changes to currently dirty product files.

## Architecture

Add a session-scoped governance state machine at the agent boundary: `UserPromptSubmit` classifies substantive change intent and issues a unique governance ID; `PreToolUse` permits the task packet itself but blocks other writes until a valid packet containing that ID exists. The packet is durable evidence in `docs/work/tasks/`; transient session state stays under ignored `.codex-tmp/`.

## Security and privacy

The audit uses public pages and repository-local evidence only. No production data mutation, user record access, secret output, credentials, or project-funded AI API is permitted. Hook state stores a prompt digest and short redacted label, never the full prompt.

## Technical debt

Disposition: pay down governance debt now with a small, zero-dependency hook and template; inventory the larger product debt as prioritized enablers instead of mixing remediation into this audit. The hook must avoid a global shared marker because the repository is used by many concurrent sessions.

## Verification

Completed: `node --test scripts/hooks/task_governance_hook.test.mjs` passed 4/4 for classification, session isolation, denial before planning, and allowance after a valid packet. Both hook files pass `node --check`; `.claude/settings.json` parses; new local Markdown links resolve; `git diff --check` reports no patch errors; and `node scripts/verify_website_surface_contract.mjs --root knowly-www` passes. No broad Jest/typecheck was needed because runtime product code is untouched.

## Rollback

Remove the task-governance hook entries from `.claude/settings.json` and delete the new hook script. The audit and planning documents are inert and can remain. No production or persisted user data requires rollback.
