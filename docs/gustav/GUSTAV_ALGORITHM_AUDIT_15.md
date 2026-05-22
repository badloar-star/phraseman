# GUSTAV Algorithm Audit 15

Status: `HOLD`

Scope: production `StudyTarget` and target-aware key-builder integration plan for PhraseMan.

## 1. What improved

Gustav now has an executable integration-plan generator:

```text
scripts/gustav_target_key_integration_plan.ts
```

It reads:

```text
docs/gustav/runs/2026-05-19_fr_inventory_v0a1/inputs/storage_key_inventory.json
docs/gustav/runs/2026-05-19_fr_inventory_v0a1/audits/cloud_sync_mapping.json
docs/gustav/runs/2026-05-19_fr_inventory_v0a1/audits/local_cloud_decision_table.json
docs/gustav/runs/2026-05-19_fr_inventory_v0a1/audits/achievement_taxonomy.json
```

It writes:

```text
docs/gustav/runs/2026-05-19_fr_inventory_v0a1/audits/target_key_integration_plan.json
docs/gustav/runs/2026-05-19_fr_inventory_v0a1/audits/target_key_integration_plan.md
```

The run validator now checks this artifact structurally:

- schema version;
- run id;
- status;
- summary counts;
- phase list;
- domain list;
- proposed API arrays;
- storage-shape arrays;
- file touchpoints;
- existing dev `StudyTargetLang` warning;
- no `PASS` while blocker domains remain.

## 2. Integration plan result

Command:

```text
npx tsx scripts/gustav_target_key_integration_plan.ts --run docs/gustav/runs/2026-05-19_fr_inventory_v0a1
```

Result:

```text
Status: HOLD
Domains: 14
Files with target storage touchpoints: 52
Raw target storage records: 348
Cloud target mappings: 46
Local/cloud decisions: 28
Blocker domains: 14
Blockers: 20
```

## 3. Confirmed architecture risk

PhraseMan already has:

```text
app/study_target_lang_dev.ts
components/StudyTargetContext.tsx
```

This is dev-only `StudyTargetLang = en | es` logic, tied to Spanish experiments.

Gustav must not reuse it as the production model for French.

Required before French:

- define production `StudyTarget = en | fr`;
- keep `sourceLocale` separate from `studyTarget`;
- rename, remove or isolate the dev Spanish target path;
- audit all imports of `StudyTargetLang`;
- prove `sourceLocale=ru/uk` never changes `studyTarget=fr`.

## 4. Required integration domains

The plan now names the product modules Gustav expects before French can be applied:

- `app/study_target.ts`
- `app/target_storage_keys.ts`
- `app/lesson_progress_store.ts`
- `app/lesson_session_store.ts`
- `app/reward_idempotency_store.ts`
- `app/level_exam_store.ts`
- `app/target_practice_store.ts`
- `app/personal_practice_store.ts`
- `app/achievement_progress_store.ts`
- `app/cloud_sync.ts`
- `app/flashcards/target_storage.ts`
- `app/target_stats_store.ts`
- `components/LangContext.tsx`
- `app/source_locales.ts`

These are plan targets only. This audit does not modify product runtime code.

## 5. Domain blockers

### 5.1 Production StudyTarget

Current target logic is dev-only and cannot safely represent French.

### 5.2 Target key builder

There is no single app-level key builder. The inventory still sees 348 raw target-sensitive records.

Required future shape:

```text
<domain>_v2::{studyTarget}
<domain>_v2::{studyTarget}::{id}
<domain>_v2::{studyTarget}::{sourceLocale}::{id}
```

### 5.3 Lesson and exam progress

Lesson progress, words, unlocks, pass counts, level exams and certificates must move to target buckets.

Legacy values map to English only.

### 5.4 Trainer and My Practice

`trainer_store_v1`, `mistake_log_v1`, active recall, diagnostics and personal recommendations must become target-aware.

Diagnosis ids must be prefixed:

```text
en:<id>
fr:<id>
```

Localized Russian/Ukrainian feedback is source-locale data, not target progress.

### 5.5 Achievements, cloud and stats

Flat achievements and mixed stats payloads remain blocked until global versus target policy is resolved.

Cloud restore must hydrate only the selected target bucket.

## 6. Validator result

Command:

```text
npx tsx scripts/gustav_validate_run.ts --run docs/gustav/runs/2026-05-19_fr_inventory_v0a1
```

Result:

```text
PASS
Checks: 3015
Blockers: 0
Warnings: 0
```

This validates Gustav artifacts only. It does not approve French generation.

## 7. Current verdict

French remains blocked.

Reason:

- production `StudyTarget` does not exist;
- target key builder does not exist;
- 348 target-sensitive storage records still need migration or wrappers;
- cloud restore is not target-safe;
- My Practice and trainer stores are not target-scoped;
- dev Spanish `StudyTargetLang` can be confused with production target unless isolated.

Allowed next work:

- route/surface inventory scanner;
- target key builder implementation plan with exact migration adapters;
- trainer/mistake-log migration plan;
- My Practice personalization storage plan;
- cloud restore split plan.

Blocked:

- French content generation;
- product apply;
- storage/cloud migration implementation without reviewed tests.
