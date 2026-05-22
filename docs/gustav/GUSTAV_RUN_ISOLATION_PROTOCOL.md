# GUSTAV Run Isolation Protocol

Status: draft contract v0

Purpose: prevent Gustav from writing generated language content into the app before inventory, audit, review and explicit apply approval.

This protocol exists because Gustav is allowed to inspect PhraseMan, but not allowed to silently reshape PhraseMan.

## 1. Core rule

Every Gustav run must be isolated under:

```text
docs/gustav/runs/<runId>/
```

No generation run may write to:

- `app/*`;
- `constants/*`;
- `scripts/*`;
- `tests/*`;
- `admin/*`;
- root config files;
- Heisenberg files.

Product files may be touched only by a separate apply step, after an explicit apply plan and approval.

## 2. Run folder layout

```text
docs/gustav/runs/<runId>/
  manifest.json
  README.md
  inputs/
    file_inventory.json
    source_refs.json
    command_log.md
  source_graph/
    english_source_graph.json
    validation.json
    unresolved.md
  research/
    evidence_ledger.json
    source_notes.md
  curriculum/
    transfer_matrix.csv
    target_curriculum_plan.md
  generated/
    lessons/
    intro_screens/
    phrases/
    words/
    quizzes/
    personal_practice/
  audits/
    agent_verdicts/
    blockers.md
    content_quality.md
    runtime_isolation.md
  apply_plan/
    APPLY_PLAN.md
    file_changes.json
    migration_plan.md
    rollback_plan.md
  verdict.json
```

Folders can be empty in early phases, but `manifest.json` and `verdict.json` must always exist.

## 3. Run id format

Run id:

```text
YYYY-MM-DD_<studyTarget>_<purpose>_<shortHash>
```

Examples:

```text
2026-05-19_fr_inventory_a1b2c3
2026-05-19_fr_curriculum_d4e5f6
2026-05-19_fr_pilot_lesson01_a8c9d0
```

Rules:

- `studyTarget` means language being learned, not source locale;
- `purpose` must be one of approved run modes;
- `shortHash` should identify input graph or source state.

## 4. Approved run modes

```ts
type GustavRunMode =
  | 'inventory'
  | 'source_graph'
  | 'english_audit'
  | 'architecture'
  | 'research'
  | 'curriculum'
  | 'agent_contract'
  | 'generate'
  | 'audit_generated'
  | 'apply_plan'
  | 'apply';
```

Only `apply` may touch product files.

`apply` is disabled by default.

## 5. Manifest schema

```ts
type GustavRunManifest = {
  schemaVersion: 'gustav-run-manifest-v0';
  runId: string;
  createdAt: string;
  mode: GustavRunMode;
  repoRoot: string;
  inputRef: {
    gitCommit?: string;
    gitStatusSummary: string;
    atlasPath?: string;
    sourceGraphPath?: string;
    sourceGraphHash?: string;
  };
  requestedStudyTarget: StudyTargetId;
  allowedSourceLocales: SourceLocaleId[];
  allowedWriteZones: string[];
  forbiddenWriteZones: string[];
  productWritePermission: boolean;
  explicitApprovalRef?: string;
  agents: {
    name: string;
    contractPath: string;
    outputPath?: string;
  }[];
  gates: {
    gateId: string;
    status: 'pending' | 'pass' | 'hold' | 'block';
    evidencePath?: string;
  }[];
  notes: string[];
};
```

Manifest hard rules:

- `productWritePermission` must be `false` unless `mode` is `apply`;
- `allowedWriteZones` must be inside the run folder unless `mode` is `apply`;
- `requestedStudyTarget` cannot be inferred from `allowedSourceLocales`;
- `allowedSourceLocales` for French pilot must include `ru` and `uk`;
- no agent may run without a contract path.

## 6. Verdict schema

```ts
type GustavRunVerdict = {
  schemaVersion: 'gustav-run-verdict-v0';
  runId: string;
  status: 'PASS' | 'HOLD' | 'BLOCK';
  completedAt?: string;
  blockers: {
    id: string;
    severity: 'high' | 'blocker';
    title: string;
    detail: string;
    ownerAgent?: string;
    artifactPath?: string;
  }[];
  warnings: {
    id: string;
    title: string;
    detail: string;
    artifactPath?: string;
  }[];
  producedArtifacts: string[];
  nextAllowedModes: GustavRunMode[];
};
```

If verdict is `HOLD` or `BLOCK`, `nextAllowedModes` must not include `generate` or `apply`.

## 7. Write permissions by mode

### inventory

Allowed:

- `docs/gustav/runs/<runId>/inputs/*`;
- `docs/gustav/runs/<runId>/audits/*`;
- standalone docs under `docs/gustav/` if they are plans or audits.

Forbidden:

- generated target-language content;
- app code changes.

### source_graph

Allowed:

- `docs/gustav/runs/<runId>/source_graph/*`.

Forbidden:

- app code changes;
- generated target-language content.

### english_audit

Allowed:

- `docs/gustav/runs/<runId>/audits/*`;
- issue lists and blocker reports.

Forbidden:

- auto-fixing English content unless a separate approved apply plan exists.

### research

Allowed:

- `docs/gustav/runs/<runId>/research/*`.

Forbidden:

- uncited curriculum claims;
- copying copyrighted source text beyond short compliant notes.

### curriculum

Allowed:

- `docs/gustav/runs/<runId>/curriculum/*`.

Forbidden:

- final generated lessons;
- production file changes.

### generate

Allowed:

- `docs/gustav/runs/<runId>/generated/*`.

Forbidden:

- `app/*`;
- `constants/*`;
- `scripts/*`;
- `tests/*`;
- `docs/heisenberg/*`;
- any hidden fallback path outside `docs/gustav/runs/<runId>`.

### audit_generated

Allowed:

- `docs/gustav/runs/<runId>/audits/*`;
- `docs/gustav/runs/<runId>/verdict.json`.

Forbidden:

- modifying generated content in place unless audit mode explicitly says repair pass;
- production file changes.

### apply_plan

Allowed:

- `docs/gustav/runs/<runId>/apply_plan/*`.

Forbidden:

- product file changes.

### apply

Allowed only after explicit approval.

Allowed:

- product files listed in `apply_plan/file_changes.json`;
- tests listed in the apply plan.

Forbidden:

- touching files not listed in apply plan;
- changing Heisenberg files unless Heisenberg compatibility gate passes;
- changing storage keys without migration and rollback plan.

## 8. Required gates before generation

Generation mode is blocked unless all are true:

- Surface inventory verdict is `PASS`;
- Source Graph verdict is `PASS`;
- English Base audit has no unresolved blockers;
- target/source type contract exists;
- run manifest exists;
- agent contracts exist;
- evidence policy exists for curriculum claims;
- target storage isolation plan exists;
- My Practice target plan exists or My Practice is explicitly out of pilot scope.

## 9. Required gates before apply

Apply mode is blocked unless all are true:

- generated content audit verdict is `PASS`;
- runtime isolation audit verdict is `PASS`;
- apply plan lists every file to be changed;
- migration plan exists if storage/progress changes;
- rollback plan exists;
- tests are listed;
- explicit user approval is recorded in manifest;
- `productWritePermission` is true only for this apply run.

## 10. Fail-fast checks

A Gustav run must stop immediately if:

- it cannot locate `/Users/maksymbabiev/Documents/phraseman` or the intended repo root;
- it writes outside allowed zones;
- it detects generated French files outside `docs/gustav/runs/*`;
- it detects sourceLocale and studyTarget collapsed into one field;
- it detects missing manifest;
- it detects missing verdict;
- it detects unknown app learning surface with blocker severity.

## 11. Command log requirement

Every run must keep a human-readable command summary:

```text
docs/gustav/runs/<runId>/inputs/command_log.md
```

It should include:

- commands run;
- why they were run;
- whether they were read-only;
- whether they touched files;
- important outputs;
- skipped checks and reason.

## 12. Apply plan file changes schema

```ts
type GustavApplyPlan = {
  schemaVersion: 'gustav-apply-plan-v0';
  sourceRunId: string;
  approvedGeneratedArtifacts: string[];
  fileChanges: {
    path: string;
    action: 'add' | 'modify' | 'delete';
    reason: string;
    sourceArtifact: string;
    owner: string;
    testsRequired: string[];
    rollback: string;
  }[];
  storageMigrations: {
    key: string;
    action: 'add' | 'migrate' | 'deprecate';
    migrationPlanPath: string;
    rollbackPlanPath: string;
  }[];
  heisenbergImpact: 'none' | 'low' | 'medium' | 'high' | 'blocker';
  englishFlowImpact: 'none' | 'low' | 'medium' | 'high' | 'blocker';
};
```

## 13. Current decision

Until this protocol has a validator script, it is a human contract.

After validator exists, every Gustav run must be rejected unless:

- manifest schema validates;
- write zones validate;
- verdict schema validates;
- mode gates validate;
- produced artifacts are inside the run folder.

