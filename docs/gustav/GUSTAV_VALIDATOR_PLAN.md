# GUSTAV Validator Plan

Status: draft contract v0

Purpose: define the validator layer that must exist before Gustav can run generation or apply modes.

This plan does not implement scripts yet. It defines what the scripts must enforce.

## 1. Core rule

Gustav contracts are not enough unless they are enforced.

Validators must fail closed:

- unknown means `HOLD`;
- malformed means `BLOCK`;
- write-zone violation means `BLOCK`;
- sourceLocale/studyTarget confusion means `BLOCK`;
- French content outside an approved run/apply mode means `BLOCK`.

## 2. Future command names

Reserved future commands:

```text
npm run gustav:validate-run -- --run docs/gustav/runs/<runId>
npm run gustav:validate-source-graph -- --graph docs/gustav/runs/<runId>/source_graph/english_source_graph.json
npm run gustav:inventory -- --run docs/gustav/runs/<runId>
npm run gustav:source-graph -- --run docs/gustav/runs/<runId>
npm run gustav:storage-inventory -- --run docs/gustav/runs/<runId>
npm run gustav:gate -- --run docs/gustav/runs/<runId>
```

No `package.json` scripts should be added until the script contracts are accepted.

## 3. Validator scripts

### 3.1 `scripts/gustav_validate_run.ts`

Inputs:

- run folder path;
- `manifest.json`;
- `verdict.json`;
- schemas under `docs/gustav/schemas/`.

Checks:

- manifest JSON parses;
- verdict JSON parses;
- required folder layout exists;
- run id matches folder name;
- mode is allowed;
- `productWritePermission` is false unless mode is `apply`;
- allowed write zones stay inside run folder unless mode is `apply`;
- forbidden write zones include product areas during non-apply modes;
- every agent has a contract path;
- verdict status is compatible with next modes.

Hard fail:

- missing manifest;
- missing verdict;
- malformed JSON;
- product write permission true in non-apply mode;
- allowed write zone outside run folder;
- `nextAllowedModes` includes `generate` or `apply` while status is `HOLD` or `BLOCK`.

### 3.2 `scripts/gustav_validate_source_graph.ts`

Inputs:

- source graph JSON;
- `docs/gustav/schemas/source_graph.schema.json`;
- `GUSTAV_SOURCE_GRAPH_SCHEMA.md`.

Checks:

- top-level graph shape;
- `baseStudyTarget` is `en`;
- lessons exist;
- source files exist;
- generated files have provenance or are marked unknown;
- unresolved blockers are counted;
- `SourceLocaleId` and `StudyTargetId` are not collapsed;
- every production lesson has source refs;
- every personal practice node has study target.

Hard fail:

- missing lessons;
- generated file used as canonical without provenance;
- French nodes in English graph;
- source-locale text treated as target content;
- validation verdict claims `PASS` while unresolved blockers > 0.

### 3.3 `scripts/gustav_surface_inventory.ts`

Inputs:

- repo root;
- atlas docs;
- `docs/gustav/GUSTAV_SURFACE_INVENTORY.md`.

Checks:

- route files from atlas are represented or explicitly excluded;
- `app/lesson*` files are represented;
- `app/quiz*` files are represented;
- `app/diagnosis_training_*` files are represented;
- `app/flashcards/*` files are represented;
- files importing AsyncStorage are classified if learning-related;
- Heisenberg files are classified.

Outputs:

```text
docs/gustav/runs/<runId>/inputs/file_inventory.json
docs/gustav/runs/<runId>/inputs/surface_inventory_validation.json
```

Hard fail:

- unknown target-sensitive route;
- storage-sensitive file missing classification;
- lesson/quiz/personal practice file missing owner.

### 3.4 `scripts/gustav_storage_inventory.ts`

Inputs:

- repo root;
- files containing `AsyncStorage`;
- `app/cloud_sync.ts`;
- `GUSTAV_TARGET_STORAGE_PLAN.md`.

Outputs:

```text
docs/gustav/runs/<runId>/inputs/storage_key_inventory.json
```

Each key record:

```ts
type GustavStorageKeyRecord = {
  key: string;
  keyPattern?: string;
  sourcePath: string;
  line?: number;
  operation: 'get' | 'set' | 'remove' | 'multiGet' | 'multiSet' | 'multiRemove' | 'unknown';
  scope: 'global' | 'source_locale' | 'study_target' | 'source_locale_and_study_target' | 'legacy_english' | 'dev_only' | 'admin_or_qa' | 'unknown';
  learningState: boolean;
  targetNamespaceRequired: boolean;
  cloudSyncKey: boolean;
  risk: 'low' | 'medium' | 'high' | 'blocker';
  notes: string[];
};
```

Hard fail:

- learning-state key with scope `unknown`;
- target-specific key without namespace;
- French target plan uses legacy English key;
- cloud sync key classified target-specific without cloud impact report.

### 3.5 `scripts/gustav_gate.ts`

Inputs:

- run folder;
- validator outputs;
- agent verdicts;
- run verdict.

Checks:

- all required validators passed;
- all required agents returned `GO`;
- no unresolved blockers;
- generation/apply gates are respected.

Hard fail:

- missing validator output;
- missing required agent verdict;
- any `BLOCK`;
- apply without explicit approval.

## 4. Schema files

Initial schema files:

- `docs/gustav/schemas/run_manifest.schema.json`;
- `docs/gustav/schemas/run_verdict.schema.json`;
- `docs/gustav/schemas/agent_verdict.schema.json`;
- `docs/gustav/schemas/evidence_ledger.schema.json`;
- `docs/gustav/schemas/apply_file_changes.schema.json`;
- `docs/gustav/schemas/source_graph.schema.json`.

Schemas must be checked into docs before scripts rely on them.

## 5. No dependency rule for first validators

First validators should use Node/TypeScript and local code only.

If a JSON Schema validation dependency is added later, it must be justified in the apply plan.

Until then, scripts can implement minimal structural validation manually against the schema files.

## 6. Dirty worktree protection

Every validator must record:

- pre-existing dirty files;
- Gustav touched files;
- overlap;
- whether overlap is allowed.

Validator must not clean or reset the worktree.

## 7. French detection rule

In non-generate and non-apply modes, validators should scan Gustav-controlled paths and product paths for suspicious French target additions:

- `studyTarget=fr`;
- `fr:` diagnosis ids;
- `french`;
- `français`;
- French target registry entries;
- new French lesson files.

This scan is not to forbid architecture docs. It is to detect generated content or product integration happening too early.

Allowed:

- architecture docs discussing French;
- templates using `fr` as placeholder;
- run manifests in architecture/inventory modes.

Blocked:

- generated French lessons outside approved `generated/`;
- product file changes adding French target content before apply approval.

## 8. Read-only default

Validator scripts are read-only except for writing their own reports under:

```text
docs/gustav/runs/<runId>/inputs/
docs/gustav/runs/<runId>/audits/
docs/gustav/runs/<runId>/source_graph/
```

They must not modify app code.

## 9. Validator readiness gate

Gustav cannot generate French until:

- run validator exists;
- source graph validator exists;
- surface inventory script exists;
- storage inventory script exists;
- gate script exists;
- schemas exist;
- first inventory run passes;
- first source graph run passes.

