# GUSTAV Algorithm Audit 08

Date: 2026-05-19

Scope:

- `scripts/gustav_validate_run.ts`;
- validator reports for `docs/gustav/runs/2026-05-19_fr_inventory_v0a1/`;
- `docs/gustav/GUSTAV_ALGORITHM_AUDIT_07.md`.

Verdict: HOLD, validator strengthened.

French generation remains blocked.

## 1. Improvements made after Audit 07

### IMP-020. Produced artifact validation added

Status: PASS for current run.

What improved:

- `scripts/gustav_validate_run.ts` now checks every path listed in `verdict.producedArtifacts`;
- missing produced artifacts become blockers;
- the first inventory run passes this check.

Result:

```text
GUSTAV run validator: PASS
Checks: 58
Blockers: 0
Warnings: 0
```

### IMP-021. Command metadata added to validator report

Status: PASS.

What improved:

- validator report now records command argv;
- cwd is recorded;
- Node version is recorded.

Why it matters:

Later audits can prove how the report was created instead of trusting a floating artifact.

### IMP-022. Validator report regenerated

Status: PASS.

Updated files:

- `docs/gustav/runs/2026-05-19_fr_inventory_v0a1/audits/run_validator_report.json`;
- `docs/gustav/runs/2026-05-19_fr_inventory_v0a1/audits/run_validator_report.md`.

## 2. Current blockers

Still blocking French generation:

- no automated surface inventory;
- no automated storage key inventory;
- no English Source Graph dump;
- no source graph validator;
- no generated/source drift report;
- no English Base audit;
- no French research evidence ledger;
- no French curriculum transfer matrix;
- no target personal practice transfer matrix;
- no runtime target isolation tests.

## 3. Remaining validator gaps

### GVA-047. Manifest agents need stricter output matching

Severity: MEDIUM-HIGH.

Problem:

The validator confirms agent output paths exist, and then validates JSON files found under `audits/agent_verdicts`. It still does not strictly match each manifest agent to its exact agent verdict role.

Required improvement:

For every `manifest.agents[]`:

- output path must exist;
- output JSON must parse;
- `runId` must match;
- `agentRole` should match manifest role/name or an explicit alias map.

### GVA-050. Full JSON Schema validation still missing

Severity: MEDIUM-HIGH.

Problem:

Manual structural validation is useful, but not full schema validation.

Required improvement:

Implement lightweight schema conformance checks or add a justified schema validator dependency later.

### GVA-051. Validator does not inspect git status overlap yet

Severity: MEDIUM.

Problem:

Dirty worktree is recorded manually in manifest, but validator does not yet compare changed files with allowed write zones.

Required improvement:

Add optional `--check-git` mode:

- read `git status --short`;
- list files outside `docs/gustav`;
- warn if current run changed product files;
- block apply if unapproved overlap exists.

## 4. Updated status table

| Area | Status |
|---|---|
| Minimal run validator | PARTIAL PASS |
| Produced artifact checks | PASS |
| Command metadata | PASS |
| Agent verdict basic shape | PASS |
| Full agent-output matching | BLOCKED |
| Full JSON Schema validation | BLOCKED |
| Git overlap protection | BLOCKED |
| Automated surface inventory | BLOCKED |
| Automated storage inventory | BLOCKED |
| English Source Graph | BLOCKED |
| French generation | BLOCKED |

## 5. Next improvement order

Do next:

1. create `GUSTAV_STORAGE_INVENTORY_IMPLEMENTATION_PLAN.md`;
2. implement read-only `scripts/gustav_storage_inventory.ts`;
3. run it against the first inventory run;
4. produce `inputs/storage_key_inventory.json`;
5. Audit 09.

Do not do:

- no French lessons;
- no French quizzes;
- no French words;
- no app runtime edits;
- no storage migrations;
- no Heisenberg edits.

