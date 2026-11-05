# Task packet: MASTER row 32 — Core finding (owner is an "existing user")

Governance-ID: TG-459A01592FF5
Status: In progress
Owner: 3 · МАКЕТЫ (keeper)

## Outcome
MASTER_TASKS row 32/5 updated with Ядро's finding: remote config has no rank_gates_enabled=false; owner account Nova 95934 (created 2026-10-31) predates the "new users" cutoff (2026-11-05T01:15:50Z, 0917b1f81) so gates are off for it by design; fix = rank_gates_force_new_uid_hash (Моменты code, Ядро value on coordinator's word).
## Scope
Docs only (one registry file).
## Architecture
No architecture change.
## Security and privacy
Docs only; no uids beyond the display name already in owner screens.
## Technical debt
Contain: row stays open until frame of rank 0 on an account that is treated as new.
## Verification
Source: status/01_yadro.md (07:25).
## Rollback
git revert.
