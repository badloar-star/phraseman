# GUSTAV Algorithm Audit 18

Status: `HOLD`

Scope: migration adapter implementation strategy for the highest-risk PhraseMan surfaces.

## 1. What improved

Gustav now has an executable migration adapter plan generator:

```text
scripts/gustav_migration_adapter_plan.ts
```

It reads:

```text
docs/gustav/runs/2026-05-19_fr_inventory_v0a1/inputs/storage_key_inventory.json
docs/gustav/runs/2026-05-19_fr_inventory_v0a1/audits/surface_route_inventory.json
docs/gustav/runs/2026-05-19_fr_inventory_v0a1/audits/target_key_integration_plan.json
docs/gustav/runs/2026-05-19_fr_inventory_v0a1/audits/cloud_sync_mapping.json
docs/gustav/runs/2026-05-19_fr_inventory_v0a1/audits/local_cloud_decision_table.json
```

It writes:

```text
docs/gustav/runs/2026-05-19_fr_inventory_v0a1/audits/migration_adapter_plan.json
docs/gustav/runs/2026-05-19_fr_inventory_v0a1/audits/migration_adapter_plan.md
```

The run validator now checks this artifact structurally:

- schema version;
- run id;
- status;
- summary counts;
- phases;
- adapter ids;
- adapter dependencies;
- owner areas;
- product modules;
- source files;
- storage keys;
- implementation steps;
- tests required;
- rollback notes;
- no `PASS` while blocker adapters remain.

## 2. Migration adapter result

Command:

```text
node /private/tmp/gustav-build/gustav_migration_adapter_plan.js --run docs/gustav/runs/2026-05-19_fr_inventory_v0a1
```

Result:

```text
Status: HOLD
Phases: 6
Adapters: 16
Blocker adapters: 16
Product modules: 35
Source files covered: 61
Storage keys covered: 99
Target storage records: 348
Surface blockers: 92
Cloud target mappings: 42
Local/cloud decisions: 28
Can start French generation after this plan only: no
```

## 3. Adapter phases

### P1: Production target identity and key builder

Adapters:

```text
production_study_target
target_storage_key_builder
```

Purpose:

- introduce production `StudyTarget`;
- keep it separate from `sourceLocale`;
- isolate dev `StudyTargetLang`;
- create target-aware key builder.

### P2: Legacy English compatibility

Adapter:

```text
legacy_english_compat
```

Purpose:

- copy legacy flat English state to `en`;
- never hydrate `fr` from legacy English keys;
- preserve rollback keys.

### P3: Target local stores for learning surfaces

Adapters:

```text
lesson_progress_store
lesson_session_store
lesson_reward_idempotency
level_exam_certificate_store
quiz_progress_store
trainer_practice_store
personal_practice_store
flashcards_target_store
```

Purpose:

- move lesson, quiz, trainer, My Practice and flashcard state behind target-aware APIs;
- stop direct screen-level storage access from mixing targets;
- add route-level en/fr switching tests.

### P4: Cloud, achievements and stats split

Adapters:

```text
achievement_progress_store
target_stats_store
cloud_sync_target_buckets
```

Purpose:

- split global and target achievements;
- split global engagement and target learning stats;
- make cloud restore target-bucket aware.

### P5: Surface integration and guards

Adapters:

```text
route_surface_integration
raw_storage_guard
```

Purpose:

- inject production studyTarget into user-facing learning routes;
- block new raw target-sensitive AsyncStorage keys outside migration adapters;
- make readiness gate able to turn `GO` only after implementation evidence exists.

## 4. New blocker

### GVA-060: migration adapters are planned but not implemented

The plan is now concrete, but planning is not implementation.

French remains blocked until the adapters exist in product code and tests prove:

- English legacy progress migrates to `en` only;
- French never reads English flat keys;
- `sourceLocale=ru/uk` changes copy only, not target progress;
- lessons, quizzes, trainer, flashcards and My Practice are target-scoped;
- cloud restore does not hydrate `fr` from legacy English cloud state;
- raw target-sensitive storage is blocked outside migration adapters.

## 5. Readiness result

After adding the migration adapter plan, readiness changed from:

```text
12 checks, 1 passed
```

to:

```text
13 checks, 2 passed
```

Generation remains blocked:

```text
Decision: HOLD
Generation blockers: 9
Apply blockers: 11
```

## 6. Validator result

Command:

```text
node /private/tmp/gustav-build/gustav_validate_run.js --run docs/gustav/runs/2026-05-19_fr_inventory_v0a1
```

Result:

```text
PASS
Checks: 5389
Blockers: 0
Warnings: 0
```

This validates Gustav artifacts only. It does not approve French generation.

## 7. Current stage

Gustav stage:

```text
architecture work: allowed
French generation: blocked
production apply: blocked
```

Progress state:

```text
source discovery: partial
storage/cloud risk map: created
surface risk map: created
readiness gate: created
migration adapter strategy: created
adapter implementation: not started
source graph extraction: not complete
```

Next concrete work:

```text
source graph extractor for the English base
```

Reason:

Even if target storage becomes safe, French content cannot be generated from the English base until the English lessons, phrases, quizzes, flashcards and practice seeds are extracted into a stable source graph.
