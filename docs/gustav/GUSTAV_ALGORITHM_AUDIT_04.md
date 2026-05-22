# GUSTAV Algorithm Audit 04

Date: 2026-05-19

Scope:

- all Gustav docs created through Audit 03;
- `GUSTAV_TARGET_STORAGE_PLAN.md`;
- `GUSTAV_PERSONAL_PRACTICE_TARGET_PLAN.md`;
- `GUSTAV_SURFACE_INVENTORY.md`;
- JSON templates under `docs/gustav/templates/`.

Verdict: HOLD, stronger.

French generation remains blocked.

## 1. Improvements made after Audit 03

### IMP-007. Target storage plan added

Status: PARTIAL PASS.

New file:

- `docs/gustav/GUSTAV_TARGET_STORAGE_PLAN.md`

What improved:

- Gustav now classifies storage by `global`, `source_locale`, `study_target`, `source_locale_and_study_target`, `legacy_english`, `dev_only`, `admin_or_qa`, `unknown`;
- high-risk keys such as `trainer_store_v1`, `lesson*_progress`, `lesson*_best_score`, `unlocked_lessons`, `level_exam_*`, preposition drill keys and flashcards are called out;
- cloud sync and migration are explicitly gated;
- French is forbidden from using English legacy keys.

Remaining weakness:

- storage inventory is not exhaustive;
- no migration code exists;
- no storage validator exists.

Decision:

GVA-025 moves from `BLOCKER: no storage plan` to `HIGH: storage plan exists, full inventory/validator missing`.

### IMP-008. Personal Practice target plan added

Status: PARTIAL PASS.

New file:

- `docs/gustav/GUSTAV_PERSONAL_PRACTICE_TARGET_PLAN.md`

What improved:

- English diagnosis ids cannot be reused directly for French;
- target diagnosis ids require a `fr:` namespace;
- transfer decisions are defined;
- RU/UK feedback separation is required;
- trainer integration must be target-aware.

Remaining weakness:

- no French practice taxonomy exists;
- no transfer matrix exists;
- no target practice tests exist.

Decision:

GVA-026 moves from `BLOCKER: no plan` to `HIGH: plan exists, taxonomy/transfer missing`.

### IMP-009. Surface inventory v0 added

Status: PARTIAL PASS.

New file:

- `docs/gustav/GUSTAV_SURFACE_INVENTORY.md`

What improved:

- major learning surfaces are now mapped with owner areas and target/source sensitivity;
- storage-sensitive surfaces are called out;
- current unknowns are explicit blockers.

Remaining weakness:

- inventory is manual v0;
- no script has verified completeness;
- several surfaces remain unknown.

Decision:

GVA-028 moves from `HIGH: no inventory` to `HIGH: inventory v0 exists, verification missing`.

### IMP-010. JSON templates added

Status: PARTIAL PASS.

New files:

- `docs/gustav/templates/run_manifest.template.json`;
- `docs/gustav/templates/run_verdict.template.json`;
- `docs/gustav/templates/source_graph_minimal.template.json`;
- `docs/gustav/templates/agent_verdict.template.json`;
- `docs/gustav/templates/evidence_ledger.template.json`;
- `docs/gustav/templates/apply_file_changes.template.json`.

What improved:

- future scripts now have concrete machine-readable starting shapes;
- first run cannot invent its own manifest/verdict format as easily.

Remaining weakness:

- templates are not schemas;
- no validator script exists;
- no real run has been created.

Decision:

GVA-027 moves from `HIGH: templates missing` to `MEDIUM-HIGH: templates exist, validation missing`.

## 2. Current blockers

Still blocking French generation:

- no actual English Source Graph dump;
- no source graph validator;
- no run validator;
- no full storage key inventory;
- no storage migration plan;
- no cloud sync impact report;
- no French research evidence ledger;
- no French curriculum transfer matrix;
- no target personal practice taxonomy;
- no target isolation tests;
- no source/generated drift script.

## 3. New findings from Audit 04

### GVA-031. Validator scripts are now the main missing enforcement layer

Severity: BLOCKER.

Problem:

Gustav now has many contracts and templates, but no script enforces them.

Risk:

- a future run can ignore the contracts;
- a malformed manifest can pass by human inspection;
- content generation can start before gates are truly passed.

Required improvement:

Create script plans before code:

- `GUSTAV_VALIDATOR_PLAN.md`;
- `GUSTAV_SOURCE_GRAPH_EXTRACTOR_PLAN.md`.

Then implement later:

- `scripts/gustav_validate_run.ts`;
- `scripts/gustav_validate_source_graph.ts`;
- `scripts/gustav_surface_inventory.ts`;
- `scripts/gustav_source_graph_dump.ts`.

### GVA-032. Surface inventory needs automated completeness check

Severity: HIGH.

Problem:

Manual inventory can miss routes and data files.

Required improvement:

Surface inventory script must compare:

- atlas route files;
- files importing AsyncStorage;
- files under `app/lesson*`;
- files under `app/quiz*`;
- diagnosis training files;
- flashcards;
- Heisenberg surfaces;
- cloud sync keys.

### GVA-033. Storage plan needs key extraction, not just examples

Severity: HIGH.

Problem:

The storage plan calls out high-risk keys, but the app has many more AsyncStorage keys.

Required improvement:

Build storage key inventory:

```text
docs/gustav/runs/<runId>/inputs/storage_key_inventory.json
```

Each key needs:

- source file;
- line;
- scope classification;
- learning-state flag;
- target namespace requirement;
- cloud sync status.

### GVA-034. Personal practice needs a real transfer matrix

Severity: HIGH.

Problem:

The plan defines how to transfer practice, but does not decide anything yet.

Required improvement:

Create later:

```text
docs/gustav/runs/<runId>/curriculum/personal_practice_transfer_matrix.csv
```

No French practice can be generated before that.

### GVA-035. Templates should be backed by JSON Schema

Severity: MEDIUM-HIGH.

Problem:

Template JSON files help, but validators need JSON Schema or equivalent runtime validation.

Required improvement:

Add later:

- `docs/gustav/schemas/run_manifest.schema.json`;
- `docs/gustav/schemas/run_verdict.schema.json`;
- `docs/gustav/schemas/agent_verdict.schema.json`;
- `docs/gustav/schemas/evidence_ledger.schema.json`;
- `docs/gustav/schemas/apply_file_changes.schema.json`.

## 4. Updated status table

| Area | Status |
|---|---|
| Old Gustav reset | PASS |
| PhraseMan grounding | PASS |
| Source Graph schema | PARTIAL PASS |
| Run isolation | PARTIAL PASS |
| Target architecture | PARTIAL PASS |
| Apply gate | PARTIAL PASS |
| Evidence policy | PARTIAL PASS |
| Agent contracts | PARTIAL PASS |
| Target storage plan | PARTIAL PASS |
| Personal practice target plan | PARTIAL PASS |
| Surface inventory | PARTIAL PASS |
| JSON templates | PARTIAL PASS |
| Validators | BLOCKED |
| Actual source graph | BLOCKED |
| French research | BLOCKED |
| French generation | BLOCKED |

## 5. Next improvement order

Do next:

1. `GUSTAV_VALIDATOR_PLAN.md`
2. `GUSTAV_SOURCE_GRAPH_EXTRACTOR_PLAN.md`
3. JSON Schema files or equivalent schema plan
4. first isolated inventory run folder
5. read-only storage key inventory
6. Audit 05

Do not do:

- no French lessons;
- no French quizzes;
- no French words;
- no app code edits;
- no storage migrations;
- no Heisenberg edits.

