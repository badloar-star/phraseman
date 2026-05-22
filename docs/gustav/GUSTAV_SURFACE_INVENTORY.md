# GUSTAV Surface Inventory v0

Status: initial manual inventory

Purpose: list PhraseMan learning surfaces that Gustav must understand before any new study target is generated.

This inventory is not complete enough for generation. It is the first owner/risk map.

Verdict: HOLD.

## 1. Inventory rules

Every learning surface must declare:

- owner area;
- key files;
- source-locale sensitivity;
- study-target sensitivity;
- storage sensitivity;
- cloud sensitivity;
- current risk;
- Gustav action before French.

Unknown target-sensitive surface blocks French generation.

## 2. Surface table

| Surface | Owner | Key files | Source-locale sensitive | Study-target sensitive | Storage/cloud sensitive | Risk | Required Gustav action |
|---|---|---|---:|---:|---:|---|---|
| Lesson spine | course | `constants/lessons.ts`, `app/lesson_data_all.ts` | yes | yes | progress | blocker | extract source graph |
| Lesson phrases | course | `app/lesson_data_*`, phrase source/gen files | yes | yes | trainer/progress | blocker | provenance + graph |
| Lesson intro screens | course | `app/lesson_intro_screens*` | yes | yes | no direct | high | link to lessons |
| Lesson words | course | `app/lesson_words.tsx`, `lesson_words_source_locales.ts` | yes | yes | trainer | blocker | target word model |
| Preposition drills | course/trainer | `app/preposition_drill.tsx`, `app/lesson_prepositions.ts`, `app/preposition_*` | yes | yes | progress/xp | high | target namespace |
| Quizzes | quiz | `app/quiz_data.ts`, `quiz_data_es_l2.ts`, `quiz_source_locale_payloads.ts`, `app/quizzes/*` | yes | yes | quiz/exam state | blocker | ambiguity audit |
| Level exams | exam | `app/level_exam.tsx`, `app/exam.tsx` | yes | yes | exam keys/cloud | blocker | target exam design |
| Trainer store | trainer | `app/trainer_store.ts` | yes | yes | `trainer_store_v1` | blocker | target storage v2 |
| Trainer sessions | trainer | `app/trainer_smart_session.tsx`, `trainer_session.ts`, `trainer_words_session.tsx`, `trainer_phrases_session.tsx` | yes | yes | trainer store | blocker | context-aware sessions |
| Phrase analytics | trainer | `app/phrase_analytics.ts`, `phrase_analytics_screen.tsx`, `phrase_analytics_navigation.ts` | yes | yes | likely progress | high | classify storage |
| Personal trainings | personal_practice | `app/diagnosis_training_*.ts`, `diagnosis_trainings.ts`, `personal_training_taxonomy.ts` | yes | yes | trainer/admin | blocker | target practice plan |
| Personal training room | personal_practice | `tools/personal_training_agent_room/*` | yes | yes | admin sync | high | target room mode |
| Flashcards | flashcards | `app/flashcards/*`, `app/flashcards/bundles/*` | yes | yes | saved cards/cloud | high | target/source split |
| Daily phrase | daily_phrase | `app/daily_phrase_system.ts`, `app/idioms_data.ts` | yes | yes | maybe streak/tasks | high | inventory ids |
| Arena | arena | `app/arena_room.tsx`, trainer arena queue, leaderboard files | yes | yes | arena/trainer/cloud | high | decide target scope |
| Progress/lessons tab | progress | `app/lessons_tab_state.ts`, lesson score/progress keys | no/indirect | yes | cloud | blocker | target progress keys |
| Cloud sync | storage | `app/cloud_sync.ts` | yes/global | yes/global | cloud | blocker | key classification |
| Source locale registry | localization | `app/source_locales.ts` | yes | no | `lang/app_lang` | high | protect from target use |
| Study target dev switch | target_dev | `app/study_target_lang_dev.ts`, `app/spanish_content_gate.ts` | yes | yes | dev key | high | do not use as production |
| Heisenberg | localization | `docs/HEISENBERG_LOCALIZATION_PIPELINE.md`, `scripts/heisenberg*` | yes | no target | generated docs | high | compatibility gate |
| Admin/tester tools | admin | `app/_admin_settings_testers.tsx`, admin manifests | yes | yes | many keys | medium-high | admin sync map |
| XP/streak/achievements | product_economy | `app/xp_manager.ts`, streak/achievement files, tests | mostly global | mixed | cloud | medium-high | product decision |
| Premium/energy gates | monetization | premium/energy files, cloud sync keys | no | no/mixed | cloud | medium | keep global unless target task |
| Public/legal/web | public_web | web/legal screens | yes | low | no | low-medium | check copy only |

## 3. High-risk storage surfaces

Known high-risk keys or patterns:

- `trainer_store_v1`;
- `lesson${i}_progress`;
- `lesson${i}_best_score`;
- `lesson${i}_pass_count`;
- `unlocked_lessons`;
- `level_exam_*`;
- `prep_drill_perfect_${lessonId}`;
- `flashcards`;
- `flashcards_v1`;
- `daily_tasks_progress`;
- `active_recall_items`;
- source/interface keys `lang`, `app_lang`;
- dev-only target key `dev_study_target_lang`.

Action:

All must be classified in `GUSTAV_TARGET_STORAGE_PLAN.md` before apply.

## 4. Current unknowns

Unknowns that block generation:

- exact quiz/exam storage keys beyond visible examples;
- full flashcard storage model and marketplace unlock split;
- arena target-language behavior;
- daily phrase target behavior;
- phrase analytics storage keys;
- full cloud sync impact of target-scoped learning keys;
- admin manifests affected by target-language content.

## 5. Source/generated provenance risk

Known source/generated areas:

- `app/lesson_data_1_8_phrases_source.ts`;
- `app/lesson_data_1_8_phrases_es.gen.ts`;
- `app/lesson_data_9_16_phrases_es.gen.ts`;
- Heisenberg generated artifacts under `docs/heisenberg/*`.

Rule:

Generated files cannot be canonical for Gustav unless provenance and freshness are recorded.

## 6. Owner mapping v0

Initial owner areas:

- course: lessons, intro screens, phrases, words, prepositions;
- quiz: quizzes, exams, assessments;
- trainer: trainer queues, spaced repetition, phrase analytics;
- personal_practice: diagnosis training and My Practice;
- localization: source locales and Heisenberg;
- storage: AsyncStorage and cloud sync;
- flashcards: card bundles, saved cards, marketplace;
- arena: arena gameplay and arena trainer queue;
- product_economy: XP, streak, achievements, daily tasks, league;
- monetization: premium, energy, paid gates;
- admin: admin/tester tools and manifests.

## 7. French generation gate

French generation remains blocked until:

- every blocker surface has a graph node or explicit exclusion;
- every high-risk storage key has target strategy;
- every unknown target-sensitive surface is resolved;
- generated/source provenance is mapped;
- target/source architecture is accepted;
- My Practice target plan is accepted.

