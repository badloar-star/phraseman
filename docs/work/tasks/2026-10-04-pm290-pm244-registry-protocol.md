# Task packet: PM-290 (money journal removal, planned) and the one-editor protocol (PM-244)

Governance-ID: TG-07AFEFFE9582
Status: In progress
Owner: Claude session «App Check» (82577f25), by coordinator (2026-10-04)
Related epic/enabler: PM-289 follow-up, PM-244 one editor of the canonical branch

## Outcome

PM-290 exists in the registry as a planned task that depends on PM-289 and carries the migration and gate requirements for removing the client shard operation ledger. A written protocol records how parallel sessions commit only their own files without losing work.

## Scope

In scope: registries/tasks.json (new block), requirements.json links, worklog line, docs/phraseman-2.0/SESSION_COMMIT_PROTOCOL.md, a progress note on PM-244.
Out of scope: removing any code, changing statuses of other tasks, accepting PM-244 criteria (owner decision, because its second criterion speaks about isolation while the owner's rule is one shared tree).

## Architecture

Registry bookkeeping through the repository tools; the protocol is a document.

## Security and privacy

None: documentation and registry data only.

## Technical debt

- Contain: the protocol is a convention, not an enforced hook; existing hooks already block extra working copies and hidden change storage.

## Verification

The registry validator reports no error for PM-290 and PM-244.

## Rollback

Revert the commit.
