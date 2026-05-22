# GUSTAV Target Storage Plan

Status: draft contract v0

Purpose: define how PhraseMan must separate user state for multiple study targets before Gustav can add French or any other target language.

This document is a design contract only. It does not authorize storage migration or app code changes.

## 1. Core rule

Any state that depends on what language the user is learning must be scoped by `studyTarget`.

Any state that depends on what language explanations are shown in must be scoped by `sourceLocale`.

Any state that depends on both must be scoped by both.

If a key cannot be classified, Gustav must mark it `unknown` and block apply.

## 2. Storage classes

```ts
type StorageScope =
  | 'global'
  | 'source_locale'
  | 'study_target'
  | 'source_locale_and_study_target'
  | 'legacy_english'
  | 'dev_only'
  | 'admin_or_qa'
  | 'unknown';
```

Definitions:

- `global`: user/account/app-wide state that should survive target switching.
- `source_locale`: UI/explanation language state.
- `study_target`: learning state tied to English/French/etc.
- `source_locale_and_study_target`: state where feedback/explanations are stored together with target progress.
- `legacy_english`: old unscoped key that currently means English learning.
- `dev_only`: debug/test switch, not production multi-target.
- `admin_or_qa`: tester/admin state, not user learning product state.
- `unknown`: blocks Gustav apply.

## 3. Required future key pattern

Target-specific learning keys should use a target namespace.

Recommended shape:

```text
<key>_v2::<studyTarget>
```

For source+target-specific state:

```text
<key>_v2::<studyTarget>::<sourceLocale>
```

Examples:

```text
trainer_store_v2::en
trainer_store_v2::fr
lesson_progress_v2::en::lesson1
lesson_progress_v2::fr::lesson1
quiz_history_v2::fr::ru
personal_practice_v2::fr::ru
personal_practice_v2::fr::uk
```

Do not reuse unscoped `v1` keys for multi-target learning state.

## 4. Current high-risk keys observed

This is not a full inventory. It is the initial risk map from current app reads.

### Trainer

Current:

- `trainer_store_v1` in `app/trainer_store.ts`.

Classification:

- current scope: `legacy_english`;
- future scope: `study_target`;
- risk: blocker for French.

Reason:

Trainer items store English keys, translations, lesson ids, queues, mistake counts, spaced repetition and archive state. French must not share this queue.

Required future:

```text
trainer_store_v2::<studyTarget>
```

Migration:

- existing `trainer_store_v1` migrates to `trainer_store_v2::en`;
- do not delete `trainer_store_v1` until rollback plan exists;
- French starts empty unless imported from an approved French practice graph.

### Lesson progress

Observed patterns:

- `lesson${i}_progress`;
- `lesson${i}_best_score`;
- `lesson${i}_pass_count`;
- `unlocked_lessons`;
- lesson tab loads these in `app/lessons_tab_state.ts`.

Classification:

- current scope: `legacy_english`;
- future scope: `study_target`;
- risk: blocker for French.

Required future:

```text
lesson_progress_v2::<studyTarget>::lesson<id>
lesson_best_score_v2::<studyTarget>::lesson<id>
lesson_pass_count_v2::<studyTarget>::lesson<id>
unlocked_lessons_v2::<studyTarget>
```

Migration:

- current keys migrate to `::<en>`;
- French starts with its own unlock rules.

### Level exams

Observed patterns:

- `level_exam_A1_passed`;
- `level_exam_A1_pct`;
- `level_exam_A1_best_pct`;
- `level_exam_A1_pass_count`;
- same for A2/B1/B2.

Classification:

- current scope: `legacy_english`;
- future scope: `study_target`;
- risk: high.

Reason:

An A1 English exam is not an A1 French exam.

Required future:

```text
level_exam_v2::<studyTarget>::A1::passed
level_exam_v2::<studyTarget>::A1::pct
level_exam_v2::<studyTarget>::A1::best_pct
level_exam_v2::<studyTarget>::A1::pass_count
```

### Preposition drill

Observed patterns:

- `progressKey` inside `app/preposition_drill.tsx`;
- `prep_drill_perfect_${lessonId}`.

Classification:

- current scope: likely `legacy_english`;
- future scope: `study_target`;
- risk: high.

Reason:

Preposition drills differ by target language. French prepositions cannot share English completion or perfect-award state.

Required future:

```text
preposition_drill_progress_v2::<studyTarget>::lesson<id>
prep_drill_perfect_v2::<studyTarget>::lesson<id>
```

### Quiz and exam history

Observed surfaces:

- `app/quiz_data.ts`;
- `app/quiz_data_es_l2.ts`;
- `app/quiz_source_locale_payloads.ts`;
- `app/exam.tsx`;
- `app/level_exam.tsx`.

Classification:

- current exact keys require full inventory;
- future scope: `study_target` or `source_locale_and_study_target`;
- risk: high.

Rule:

Any score/result for learning content must be target-scoped.

### Source/interface language

Observed:

- `lang`;
- `app_lang`;
- `app/source_locales.ts`.

Classification:

- current scope: `source_locale` or global preference;
- future scope: source locale preference, not study target.

Rule:

Changing `lang` or `app_lang` must not change `studyTarget`.

### Dev study target

Observed:

- `dev_study_target_lang` in `app/study_target_lang_dev.ts`.

Classification:

- current scope: `dev_only`.

Rule:

This key must not become production multi-target state. It can inform migration design, but not serve as final storage.

### Account and entitlement state

Observed examples:

- `user_name`;
- `user_avatar`;
- `premium_plan`;
- `premium_active`;
- `premium_expiry`;
- `had_premium_ever`;
- `admin_premium_override`.

Classification:

- current/future scope: `global`.

Rule:

Premium status and identity should not be duplicated per target unless a product decision says otherwise.

### XP, streak, achievements, league

Observed examples:

- `user_total_xp`;
- `weekly_xp`;
- `week_points_v2`;
- `streak_count`;
- `daily_stats`;
- `achievements_state`;
- achievement counters;
- `league_state_v3`;
- `league_result_pending`.

Classification:

- likely `global` for product economy and profile;
- some achievement counters may be `study_target` if they are based on target-language learning content.

Risk:

Medium-high. Product decision required.

Rule:

Gustav cannot assume all XP/streak/achievement keys are target-specific or global. Surface inventory must classify each one.

### Flashcards

Observed:

- `flashcards`;
- `flashcards_v1`;
- `achievement_flashcards_*`.

Classification:

- content cards: likely `study_target` or `source_locale_and_study_target`;
- marketplace/unlock state: possibly global;
- achievement counters: product decision.

Rule:

A saved English flashcard cannot appear as French learning content.

### Daily tasks and login bonus

Observed:

- `daily_tasks_progress`;
- `login_bonus_v1`;
- daily rewards.

Classification:

- product economy may be global;
- tasks that refer to learning content may be `study_target`.

Rule:

Daily tasks must declare whether they count any target or selected target only.

## 5. Migration strategy

Migration must be additive first.

Phase A:

- keep legacy keys;
- read legacy keys as English only;
- write new target-scoped keys for new architecture;
- no destructive deletion.

Phase B:

- migrate English learning state from legacy keys to `::<en>`;
- mark migration completed with a migration version key;
- keep rollback path.

Phase C:

- after stable release, optionally stop reading legacy keys;
- deletion only with explicit cleanup plan.

## 6. Migration metadata

Required migration marker:

```text
gustav_storage_migration_v1
```

Example shape:

```json
{
  "schemaVersion": "gustav-storage-migration-v1",
  "migratedAt": "2026-05-19T00:00:00.000Z",
  "from": "legacy_english",
  "to": "target_scoped_v2",
  "targetsMigrated": ["en"],
  "status": "partial"
}
```

## 7. Cloud sync rule

Cloud sync must not upload mixed target state.

Before any target-scoped key is synced:

- cloud schema impact must be documented;
- merge behavior must be target-aware;
- restore behavior must not overwrite local target state;
- tests must cover local vs cloud conflicts.

Existing `SYNC_KEYS` in `app/cloud_sync.ts` includes many legacy English learning keys. Gustav apply cannot change this list without a cloud sync impact report.

## 8. Rollback rule

Rollback must:

- leave legacy English user data readable;
- disable new target without deleting user state;
- avoid destructive git commands;
- avoid bulk clearing AsyncStorage;
- preserve premium/account state.

## 9. Target storage gate

French integration is blocked until:

- all learning-state keys are inventoried;
- every key has a storage class;
- every `unknown` learning key is resolved;
- migration plan exists;
- rollback plan exists;
- cloud sync impact is reviewed;
- tests are listed.

## 10. Hard fail rules

Storage plan fails if:

- French uses `trainer_store_v1`;
- French writes to `lesson${i}_progress`;
- French writes to `unlocked_lessons`;
- French writes exam progress into unscoped `level_exam_*`;
- a target-specific key omits `studyTarget`;
- app changes `lang` or `app_lang` to switch target language;
- cloud sync stores target-specific data without target namespace.
