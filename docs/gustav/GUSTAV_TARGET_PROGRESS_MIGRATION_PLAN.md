# GUSTAV Target Progress Migration Plan

Status: draft contract v0

Purpose: define how PhraseMan can move from one implicit English progress space to explicit per-target progress without mixing English, French or future study targets.

This document is a design and audit contract only. It does not authorize product code migration.

## 1. Core finding

PhraseMan currently stores many learning-state keys without a study target namespace. In the current product those keys effectively mean English progress.

For French, Gustav must treat every unscoped learning key as `legacy_english` until a migration proves otherwise.

French content generation remains blocked until target-scoped progress has a design, test gates and rollback path.

## 2. Migration principles

1. `sourceLocale` is the language of explanation and interface.
2. `studyTarget` is the language being learned.
3. Switching `sourceLocale` must never switch progress.
4. Switching `studyTarget` must never reuse unscoped English progress.
5. Existing English users must keep their current state.
6. New French users must start with clean French state unless an approved import exists.
7. Cloud restore must not merge English and French target state.
8. Legacy v1 keys must not be deleted until rollback and support windows are defined.

## 3. Target namespace

Recommended storage key shape:

```text
<domain>_v2::<studyTarget>
<domain>_v2::<studyTarget>::<id>
<domain>_v2::<studyTarget>::<sourceLocale>::<id>
```

Examples:

```text
trainer_store_v2::en
trainer_store_v2::fr
lesson_progress_v2::en::lesson1
lesson_progress_v2::fr::lesson1
level_exam_v2::fr::A1::passed
quiz_history_v2::fr::ru
personal_practice_v2::fr::uk
```

## 4. Current legacy English groups

The automated storage inventory currently marks these groups as target-sensitive:

- Lesson progress: `lesson${...}_progress`, `lesson${...}_best_score`, `lesson${...}_pass_count`, `lesson${...}_listening_progress`, `lesson${...}_words`, `lesson${...}_intro_shown`.
- Unlocks: `unlocked_lessons`.
- Exams: `level_exam_${...}_passed`, `level_exam_${...}_pct`, `level_exam_${...}_best_pct`, `level_exam_${...}_pass_count`, `lingman_certificate_v1`.
- Trainer and active recall: `trainer_store_v1`, `active_recall_items`, active recall achievement counters.
- Quizzes: `quiz_nav_level`, `achievement_quiz_total_count`, `quiz_hard_count`, hard/perfect quiz counters.
- Lesson achievements: `achievement_lesson_${...}_perfect_passes_v1` and lesson pass counters.
- Flashcards and lexical practice: `flashcards`, `flashcards_v1`, `custom_flashcards_v2`, `flashcards_progress_v1`, `irregular_verbs_global`.
- Diagnostics and personal practice seed state: `diagnostic_last` and future diagnosis ids.

## 5. Migration phases

### Phase 0: inventory freeze

Before any product migration:

- run `scripts/gustav_storage_inventory.ts`;
- run `scripts/gustav_validate_run.ts`;
- produce a reviewed allowlist of all `legacy_english`, `study_target`, `source_locale`, `source_locale_and_study_target`, `global`, `admin_or_qa` and `unknown` keys;
- no `unknown` app learning keys may remain.

### Phase 1: key builder

Introduce one target-aware key builder in product code, not scattered string templates.

Required API shape:

```ts
type StudyTarget = 'en' | 'fr';
type SourceLocale = 'ru' | 'uk' | 'es';

function targetKey(domain: string, studyTarget: StudyTarget, id?: string): string;
function sourceTargetKey(domain: string, studyTarget: StudyTarget, sourceLocale: SourceLocale, id?: string): string;
```

Rule:

- no new multi-target feature may call raw `AsyncStorage.getItem('lesson...')` directly;
- old raw keys are allowed only inside migration/read-compat modules.

### Phase 2: English compatibility migration

For existing users:

- first app launch after migration reads legacy v1 keys;
- if `v2::en` does not exist, copy legacy English state into `v2::en`;
- future English writes go to `v2::en`;
- legacy v1 keys stay untouched for rollback.

French:

- must not read legacy v1 learning state;
- starts with `v2::fr` namespaces only.

### Phase 3: dual-read window

During the compatibility window:

- English can read `v2::en` first, then legacy v1 fallback.
- French can read only `v2::fr`.
- Writes go only to v2.
- Metrics must count how often legacy fallback is used.

### Phase 4: cloud-safe restore

Cloud sync must migrate after local key design is stable.

Rules:

- a cloud restore may hydrate only the currently selected `studyTarget` or an explicit target bucket;
- cloud merge functions must receive `studyTarget`;
- legacy cloud progress is mapped to `targets.en` only;
- French target buckets are never filled from English cloud progress.

### Phase 5: rollback

Rollback must be possible without data loss:

- keep legacy v1 keys for English until migration confidence is high;
- keep migration stamp keys such as `target_progress_migrated_v2::en`;
- never delete `v2::<target>` buckets during rollback;
- provide a support/debug screen that can export target-separated state.

## 6. Product surfaces that need target-aware progress

- Home progress cards.
- Lessons tab and lesson unlock.
- Lesson runtime and lesson completion.
- Level exams and final certificate.
- Trainer and active recall.
- Quizzes, quiz achievements and quiz navigation.
- Flashcards, packs and lexical progress.
- Achievements and lifetime statistics that depend on target content.
- My Practice diagnosis, recommendations and feedback.
- Cloud sync restore, account merge and local wipe.

## 7. Required tests before French generation

Minimum test matrix:

- Existing English user migrates to `v2::en` without losing lessons, exams, trainer and flashcards.
- Switching `sourceLocale` from Russian to Ukrainian keeps the same `studyTarget=fr` progress.
- Switching `studyTarget` from English to French shows no English lesson completions.
- Cloud restore for English does not populate French.
- Cloud restore for French does not overwrite English.
- Trainer queues are independent for `en` and `fr`.
- My Practice diagnosis ids are target-prefixed and do not collide.
- Legacy fallback metrics are visible in QA.

## 8. Gustav gate

Gustav must block content apply when any of the following is true:

- a learning key is still `unknown`;
- a learning key remains unscoped outside a migration module;
- a cloud-synced learning key has no target bucket mapping;
- a personal-practice diagnosis id lacks target prefix;
- tests do not cover target switching and restore.

