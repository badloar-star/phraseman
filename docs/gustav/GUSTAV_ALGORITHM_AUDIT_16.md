# GUSTAV Algorithm Audit 16

Status: `HOLD`

Scope: route and user-surface inventory for PhraseMan multi-target safety.

## 1. What improved

Gustav now has an executable route/surface scanner:

```text
scripts/gustav_surface_route_inventory.ts
```

It reads:

```text
docs/gustav/runs/2026-05-19_fr_inventory_v0a1/inputs/storage_key_inventory.json
app/_layout.tsx
app/(tabs)/_layout.tsx
```

It writes:

```text
docs/gustav/runs/2026-05-19_fr_inventory_v0a1/audits/surface_route_inventory.json
docs/gustav/runs/2026-05-19_fr_inventory_v0a1/audits/surface_route_inventory.md
```

The run validator now checks this artifact structurally:

- schema version;
- run id;
- summary counts;
- route coverage arrays;
- stack screen list;
- tab screen list;
- surface ids;
- surface kind and domain;
- marker shapes;
- target storage counts;
- blockers;
- required before-French arrays;
- no `PASS` while blocker surfaces remain.

## 2. Surface inventory result

Command:

```text
npx tsx scripts/gustav_surface_route_inventory.ts --run docs/gustav/runs/2026-05-19_fr_inventory_v0a1
```

Result:

```text
Status: HOLD
Surfaces: 129
App TSX files: 93
Stack screens: 54
Tab screens: 5
Target-sensitive surfaces: 52
User-facing target surfaces: 18
Dev StudyTarget surfaces: 9
Direct storage surfaces: 72
Blocker surfaces: 66
Blockers: 92
Route-like without Stack registration: 16
Stack screens without file: 0
```

## 3. Route coverage

Root Stack inventory contains 54 screens, including:

```text
lesson1
lesson_menu
lesson_words
lesson_irregular_verbs
lesson_complete
diagnostic_test
exam
flashcards
flashcards_collection
flashcards_swipe
achievements_screen
level_exam
review
progress_map
quizzes_screen
trainer
trainer_smart_session
trainer_words_session
trainer_phrases_session
trainer_arena_session
phrase_analytics_screen
problem_coach
```

Tab inventory contains:

```text
(tabs)/home
(tabs)/lessons
(tabs)/arena
(tabs)/friends
(tabs)/settings
```

No registered Stack screen is missing a matching app file.

## 4. Confirmed high-risk surfaces

### 4.1 Lesson runtime

Files:

```text
app/lesson1.tsx
app/lesson_menu.tsx
app/lesson_words.tsx
app/lesson_irregular_verbs.tsx
app/preposition_drill.tsx
app/lesson_complete.tsx
```

Risks:

- raw lesson progress keys;
- local session keys;
- reward/idempotency keys;
- dev `StudyTargetLang` and Spanish gates in lesson runtime;
- no production `StudyTarget = en | fr` model.

### 4.2 Quiz surfaces

Files:

```text
app/quizzes.tsx
app/(tabs)/quizzes.tsx
app/daily_tasks_screen.tsx
```

Risks:

- quiz achievement counters;
- `quiz_nav_level`;
- direct storage usage;
- route-like quiz file outside the current five-tab layout.

### 4.3 Trainer and My Practice

Files:

```text
app/trainer.tsx
app/trainer_smart_session.tsx
app/trainer_words_session.tsx
app/trainer_phrases_session.tsx
app/trainer_arena_session.tsx
app/phrase_analytics_screen.tsx
app/problem_coach.tsx
app/diagnostic_test.tsx
app/mistake_log.ts
app/active_recall.ts
app/trainer_store.ts
```

Risks:

- trainer queues can contain target-language material;
- mistake logs can carry target phrases and grammar categories;
- diagnosis ids are not yet guaranteed to be `fr:<id>`;
- Russian/Ukrainian feedback needs sourceLocale separation.

### 4.4 Flashcards

Files:

```text
app/flashcards.tsx
app/flashcards_collection.tsx
app/flashcards_swipe.tsx
app/flashcards/storage.ts
hooks/use-flashcards.ts
```

Risks:

- cards and progress can mix target content;
- sourceLocale copy must be card metadata, not target namespace;
- user-created cards need target metadata.

### 4.5 Achievements, stats and cloud shell

Files:

```text
app/achievements.ts
app/achievements_screen.tsx
app/cloud_sync.ts
app/auth_provider.ts
app/lifetime_profile_stats.ts
app/progress_map.tsx
```

Risks:

- flat achievement state;
- mixed global/target stats;
- cloud restore can hydrate unscoped legacy English state;
- app shell can sync before target-safe migration exists.

## 5. New blocker

### GVA-058: user-facing routes can still expose unscoped target state

French must not be generated or applied while route surfaces can display, resume, restore or reward legacy English target state.

Required before French:

- every user-facing learning route must receive production `studyTarget`;
- every target-sensitive route must use target-aware store APIs;
- dev Spanish `StudyTargetLang` must be isolated from production target;
- `sourceLocale=ru/uk` must change explanations only;
- cloud shell must restore selected target buckets only;
- My Practice must use target-prefixed diagnosis ids.

## 6. Validator result

Command:

```text
npx tsx scripts/gustav_validate_run.ts --run docs/gustav/runs/2026-05-19_fr_inventory_v0a1
```

Result:

```text
PASS
Checks: 4927
Blockers: 0
Warnings: 0
```

This validates Gustav artifacts only. It does not approve French generation.

## 7. Current verdict

French remains blocked.

Reason:

- 66 blocker surfaces remain;
- 18 user-facing target surfaces can expose target-sensitive state;
- 9 surfaces touch dev `StudyTargetLang`;
- 72 surfaces still use direct AsyncStorage;
- route/screen target-switch tests do not exist;
- My Practice, trainer, flashcards and cloud shell are not target-safe.

Allowed next work:

- exact migration adapter plan for the highest-risk route group;
- route-level test matrix;
- My Practice target-prefix contract;
- trainer/mistake-log target store plan;
- source graph extractor for lesson/content ids.

Blocked:

- French content generation;
- product apply;
- cloud/storage migration without route-level tests.
