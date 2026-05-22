# GUSTAV Algorithm Audit 09

Date: 2026-05-19

Scope:

- `GUSTAV_STORAGE_INVENTORY_IMPLEMENTATION_PLAN.md`;
- `scripts/gustav_storage_inventory.ts`;
- storage inventory artifacts in `docs/gustav/runs/2026-05-19_fr_inventory_v0a1/`.

Verdict: HOLD, storage risk is now measurable.

French generation remains blocked.

## 1. Improvements made after Audit 08

### IMP-023. Storage inventory implementation plan added

Status: PASS for planning.

New file:

- `docs/gustav/GUSTAV_STORAGE_INVENTORY_IMPLEMENTATION_PLAN.md`

What improved:

- scan scope is explicit;
- output paths are explicit;
- key classification rules are documented;
- limitations of the first heuristic pass are documented.

### IMP-024. Read-only storage inventory script added

Status: PARTIAL PASS.

New file:

- `scripts/gustav_storage_inventory.ts`

What improved:

- scans `app`, `components`, `constants`, `hooks`, `scripts`, and `tests`;
- detects AsyncStorage operations;
- detects key constants;
- extracts `SYNC_KEYS` from `app/cloud_sync.ts`;
- classifies keys as global/source-locale/legacy-English/dev/admin/unknown;
- writes only to the Gustav run folder.

Remaining weakness:

- scanner is heuristic, not full AST;
- dynamic key expressions remain unresolved;
- some product-economy keys need manual product decisions.

### IMP-025. Automated storage inventory artifact produced

Status: HOLD.

New files:

- `docs/gustav/runs/2026-05-19_fr_inventory_v0a1/inputs/storage_key_inventory.json`;
- `docs/gustav/runs/2026-05-19_fr_inventory_v0a1/audits/storage_inventory_report.md`.

Result:

```text
GUSTAV storage inventory: HOLD
Files scanned: 958
Records: 1731
Unique literal keys: 334
Cloud sync keys observed: 125
Learning-state records: 331
Target namespace required: 328
Blockers: 54
High risks: 302
```

Why HOLD is correct:

The scan found many target-sensitive legacy English keys, especially lesson progress, trainer, quiz/exam and achievement/active-recall related keys. French cannot be added until these are scoped or explicitly excluded.

## 2. Current blockers

Still blocking French generation:

- storage inventory is produced but not resolved;
- target namespace migration plan does not exist;
- no automated surface inventory;
- no English Source Graph dump;
- no source graph validator;
- no generated/source drift report;
- no English Base audit;
- no French research evidence ledger;
- no French curriculum transfer matrix;
- no target personal practice transfer matrix;
- no runtime target isolation tests.

## 3. New findings from Audit 09

### GVA-052. Legacy English lesson progress is a confirmed blocker

Severity: BLOCKER.

Confirmed risk examples:

- `lesson${...}_progress`;
- `lesson${...}_best_score`;
- `lesson${...}_pass_count`;
- `unlocked_lessons`;
- `level_exam_${...}_*`.

Required improvement:

Create a target progress migration plan before app integration.

### GVA-053. Trainer storage is a confirmed blocker

Severity: BLOCKER.

Confirmed key:

- `trainer_store_v1`.

Required improvement:

Design `trainer_store_v2::<studyTarget>` and migration from `trainer_store_v1` to `trainer_store_v2::en`.

### GVA-054. Cloud sync impact is larger than expected

Severity: HIGH.

Confirmed count:

- 125 cloud sync keys observed.

Required improvement:

Create a cloud sync impact report before any target-scoped learning key is added to sync.

### GVA-055. Dynamic keys need AST or targeted resolver

Severity: HIGH.

Problem:

The scanner found many dynamic expressions such as `lessonKeys`, `totalKey`, `key`, and similar computed keys.

Required improvement:

Add targeted resolvers for:

- lesson key arrays;
- quiz total keys;
- achievement key factories;
- preposition drill progress keys;
- flashcard keys.

### GVA-056. Automated surface inventory should reuse storage scan output

Severity: MEDIUM-HIGH.

Problem:

Storage inventory identifies many target-sensitive files. Surface inventory should use those files as inputs instead of starting from scratch.

Required improvement:

Surface inventory script should consume:

```text
inputs/storage_key_inventory.json
```

and mark storage-sensitive surfaces automatically.

## 4. Updated status table

| Area | Status |
|---|---|
| Storage implementation plan | PASS |
| Read-only storage inventory script | PARTIAL PASS |
| Storage inventory artifact | HOLD |
| Storage blocker visibility | PASS |
| Storage blocker resolution | BLOCKED |
| Cloud sync impact report | BLOCKED |
| Automated surface inventory | BLOCKED |
| English Source Graph | BLOCKED |
| French generation | BLOCKED |

## 5. Next improvement order

Do next:

1. create `GUSTAV_TARGET_PROGRESS_MIGRATION_PLAN.md`;
2. create `GUSTAV_CLOUD_SYNC_IMPACT_PLAN.md`;
3. improve storage scanner with targeted resolvers;
4. create automated surface inventory script;
5. Audit 10.

Do not do:

- no French lessons;
- no French quizzes;
- no French words;
- no app runtime edits;
- no storage migrations;
- no Heisenberg edits.

