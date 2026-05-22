# GUSTAV Apply Gate

Status: draft contract v0

Purpose: define the only safe path from isolated Gustav artifacts into production PhraseMan files.

This document does not approve any app changes. It defines the gate that must exist before app changes are allowed.

## 1. Core rule

Gustav has two separate worlds:

```text
generation world -> docs/gustav/runs/<runId>/
production world -> app, constants, scripts, tests, admin, config
```

Generation world cannot write to production world.

Production world can be changed only by an explicit `apply` step after an approved apply plan.

## 2. Apply prerequisites

Apply is blocked unless all are true:

- run manifest exists;
- run verdict is `PASS`;
- source graph verdict is `PASS`;
- generated content audit verdict is `PASS`;
- runtime isolation audit verdict is `PASS`;
- target/source architecture gate is `PASS`;
- storage plan exists if any learning state changes;
- migration plan exists if storage changes;
- rollback plan exists;
- exact file list exists;
- tests are listed;
- explicit approval is recorded.

## 3. Apply plan required files

An apply-ready run must contain:

```text
docs/gustav/runs/<runId>/apply_plan/
  APPLY_PLAN.md
  file_changes.json
  migration_plan.md
  rollback_plan.md
  tests_required.md
  heisenberg_impact.md
  english_regression_risk.md
```

## 4. `file_changes.json` contract

```ts
type GustavApplyFileChanges = {
  schemaVersion: 'gustav-apply-file-changes-v0';
  sourceRunId: string;
  approvalStatus: 'not_requested' | 'approved' | 'rejected';
  approvedBy?: string;
  approvedAt?: string;
  files: {
    path: string;
    action: 'add' | 'modify' | 'delete';
    reason: string;
    sourceArtifactPath: string;
    ownerArea:
      | 'course'
      | 'quiz'
      | 'source_locale'
      | 'study_target'
      | 'trainer'
      | 'personal_practice'
      | 'storage'
      | 'ui'
      | 'heisenberg'
      | 'tests'
      | 'admin'
      | 'unknown';
    risk: 'low' | 'medium' | 'high' | 'blocker';
    testsRequired: string[];
    rollbackAction: string;
  }[];
};
```

Any file with `ownerArea='unknown'` blocks apply.

## 5. Dirty worktree rule

PhraseMan may already have user changes.

Before apply, Gustav must record:

- pre-existing modified files;
- pre-existing untracked files;
- files Gustav plans to touch;
- overlap between pre-existing dirty files and Gustav target files.

If overlap exists:

- Gustav must inspect the file;
- Gustav must not revert user changes;
- apply plan must explain how it will preserve existing changes;
- if preservation is uncertain, apply is blocked.

## 6. Approval rule

Approval must be explicit.

Acceptable approval record:

```text
User approved apply plan <runId> on <date>.
Approved file list: <file_changes.json>.
```

Not acceptable:

- "continue";
- "looks good" without identifying the apply plan;
- approval of generation interpreted as approval of production write;
- approval from an agent that generated the content.

## 7. Scope lock

During apply, Gustav may touch only files listed in `file_changes.json`.

If a new required file is discovered:

1. stop apply;
2. update apply plan;
3. rerun review;
4. get approval again.

## 8. Storage and migration lock

If apply touches learning state, the apply plan must include:

- old storage keys;
- new storage keys;
- migration function plan;
- rollback behavior;
- what happens on partial migration;
- cloud sync impact;
- test plan.

No storage change can be "small" by assumption. It is high risk until proven otherwise.

## 9. Heisenberg lock

If apply touches Heisenberg files:

- `docs/HEISENBERG_LOCALIZATION_PIPELINE.md`;
- `scripts/heisenberg_pipeline.cjs`;
- `scripts/lib/heisenberg_core.cjs`;
- Heisenberg audits or tests;
- source locale registry used by Heisenberg;

then apply requires a Heisenberg compatibility report.

Default target-language work should not touch Heisenberg.

## 10. English regression lock

Every apply plan must state expected impact on existing English learning:

```text
englishFlowImpact = none | low | medium | high | blocker
```

If impact is not `none`, the plan must include English regression tests and manual QA notes.

## 11. Test requirements

Minimum apply test list depends on touched area:

- TypeScript contracts: `npx tsc --noEmit --pretty false`
- Heisenberg impact: `npm run heisenberg:gate`
- personal practice impact: `npm run training:personal:check`
- lessons impact: `npm run audit:lessons`
- translations/source locale impact: `npm run audit:translations`
- broad release impact: `npm run audit:pre-release`

These are examples from current package scripts. The apply plan must choose the actual required set based on touched files.

## 12. Post-apply verification

After apply:

- list actual changed files;
- compare actual changed files to approved list;
- run required tests;
- record failed/skipped tests;
- update run verdict;
- create follow-up blockers if needed.

If actual changed files exceed approved list, apply fails even if tests pass.

## 13. Rollback requirement

Every file change needs a rollback action:

- remove added file;
- restore previous export shape;
- reverse migration;
- disable feature flag;
- remove target registry entry;
- revert generated content import.

Rollback must not require destructive git commands.

## 14. Hard fail rules

Apply fails if:

- no explicit approval;
- missing `file_changes.json`;
- touching unlisted file;
- dirty-worktree overlap unresolved;
- storage change lacks migration plan;
- no rollback plan;
- Heisenberg impact not reviewed;
- English regression risk not reviewed;
- tests are skipped without reason;
- generated content came from a run with `HOLD` or `BLOCK`.

