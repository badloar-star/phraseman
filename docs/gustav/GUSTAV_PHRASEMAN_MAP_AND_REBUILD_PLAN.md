# GUSTAV for PhraseMan: карта приложения и план перестройки

## 0. Аннулирование старого Gustav

Старый вариант Gustav, придуманный до анализа PhraseMan, больше не является источником решений. Его нельзя использовать как архитектуру, промпт, пайплайн или модель данных.

Причина простая: он был задуман абстрактно, а PhraseMan уже имеет живую учебную систему, English Base, Heisenberg pipeline, персональные тренировки, квизы, уроки, интро-экраны, preposition logic, trainer store, локали и dev-режимы target language.

Дальше Gustav считается только PhraseMan-native системой.

Главное правило: если решение не выведено из реальных файлов PhraseMan, atlas, существующих аудитов или явно утвержденного нового требования, оно считается гипотезой, а не фактом.

## 1. Стоп-правила перед французским

Французский, немецкий, испанский как языки изучения нельзя начинать генерировать сразу.

До генерации нового target language обязателен такой порядок:

1. Построить карту текущей учебной архитектуры PhraseMan.
2. Построить English Base Source Graph из реальных TypeScript-источников.
3. Отделить source/interface language от study target language.
4. Провести аудит English Base на ошибки, кальки, слабые уроки, устаревшие структуры.
5. Спроектировать отдельный target-language контейнер.
6. Спроектировать агентные пайплайны и gates.
7. Только потом запускать пилот по французскому.

Нельзя:

- писать французский контент в поля `ru`, `uk`, `es`;
- считать Heisenberg готовым решением для French-as-study-target;
- смешивать локализацию интерфейса с созданием нового языка изучения;
- менять production course files без read-only inventory, diff-plan и gate;
- считать текущие 32 английских урока универсальным порядком для любого языка;
- переносить английскую грамматику в другой язык без перестройки curriculum order;
- использовать старый standalone Gustav как память, основу или шаблон.

## 2. Что реально происходит в PhraseMan

PhraseMan сейчас не выглядит как простая папка `base/english`. English Base разложена по приложению как TypeScript-код, generated-файлы, lesson modules, quiz modules, source-locale payloads, personal training taxonomy и runtime screens.

Основные слои:

- App shell and routes: `app/_layout.tsx`, `app/(tabs)/_layout.tsx`.
- Lesson spine: `constants/lessons.ts`, `app/lesson_data_all.ts`.
- Lesson content: `app/lesson_data_1_8.ts`, `app/lesson_data_1_8_phrases_source.ts`, `app/lesson_data_1_8_phrases_es.gen.ts`, `app/lesson_data_9_16.ts`, `app/lesson_data_9_16_phrases_es.gen.ts`, `app/lesson_data_17_24.ts`, `app/lesson_data_25_32.ts`.
- Lesson theory and intro screens: `app/lesson_intro_screens_lesson*_v2.ts`, `app/lesson_intro_screens_9_32.ts`, `app/lesson_intro_screens_17_32.ts`, `app/lesson_intro_screens_en_17_32.ts`, `app/lesson_intro_screens_es_l2.ts`.
- Words and vocabulary: `app/lesson_words.tsx`, `app/lesson_words_source_locales.ts`, `app/lesson_words_es_map.ts`, `app/lesson_words_spanish_gloss.ts`.
- Prepositions: `app/preposition_explanations.ts`, `app/preposition_overrides.ts`, `app/preposition_drill.tsx`, `app/lesson_prepositions.ts`, `app/lesson_prepositions_es_*`.
- Quizzes: `app/quiz_data.ts`, `app/quiz_data_es_l2.ts`, `app/quiz_source_locale_payloads.ts`, `app/quizzes/*`.
- Flashcards: `app/flashcards/*`, `app/flashcards/bundles/*`.
- Daily phrase and phrase systems: `app/daily_phrase_system.ts`, `app/idioms_data.ts`.
- My Practice / trainer: `app/trainer_store.ts`, `app/trainer_smart_session.tsx`, `app/trainer_session.ts`, `app/trainer_words_session.tsx`, `app/trainer_phrases_session.tsx`.
- Personal trainings: `app/diagnosis_training_*.ts`, `app/diagnosis_training_engine.ts`, `app/diagnosis_training_types.ts`, `app/personal_training_taxonomy.ts`, `app/personal_training_source_locales.ts`.
- Personal training agent room: `tools/personal_training_agent_room/README.md`, `tools/personal_training_agent_room/ROOM.md`, `tools/personal_training_agent_room/JESSE_PINKMAN.md`.
- Source locale registry: `app/source_locales.ts`.
- Study target dev switch: `app/study_target_lang_dev.ts`.
- Spanish target/dev gate: `app/spanish_content_gate.ts`.
- Existing localization pipeline: `docs/HEISENBERG_LOCALIZATION_PIPELINE.md`, `scripts/heisenberg_pipeline.cjs`, `scripts/lib/heisenberg_core.cjs`.

## 3. Реальная English Base

English Base в PhraseMan - это не один файл и не одна таблица. Это учебный граф.

Gustav должен читать English Base как Source Graph:

- lesson identity;
- lesson order;
- intro/theory screens;
- grammar targets;
- phrase blocks;
- vocabulary;
- preposition packs;
- quiz questions;
- daily phrase surfaces;
- flashcard bundles;
- personal practice links;
- diagnosis-based trainings;
- trainer scheduling behavior;
- source-locale explanations;
- UI surfaces that expose learning content.

Минимальный English Base Source Graph должен содержать:

- `lessonId`;
- `lessonNumber`;
- `currentEnglishTitle`;
- `ruTitle`;
- `ukTitle`;
- `esTitle`, если есть;
- grammar objectives;
- target structures;
- words;
- phrases;
- intro screens;
- quiz references;
- preposition references;
- personal training references;
- source files;
- generated files;
- known QA status;
- known risks.

Важно: Gustav не должен "переводить урок 1 в французский". Он должен сначала понять, чему lesson 1 учит в английском, какие skills открывает, какие ошибки тренирует и можно ли эту позицию урока сохранить для французского.

## 4. Heisenberg не равен Gustav

Heisenberg уже есть и нужен. Но Heisenberg решает другую задачу.

Heisenberg добавляет новый source language для пользователей, которые учат английский со своего языка. Например: Spanish UI/source explanations for learning English.

Gustav должен решать задачу target-language expansion: пользователь учит не English, а French, German, Spanish или другой язык.

Разница критическая:

- Heisenberg: `sourceLocale -> English target`.
- Gustav: `sourceLocale -> selected StudyTarget`.
- Heisenberg меняет язык объяснений и интерфейсные payloads.
- Gustav меняет сам изучаемый язык, grammar progression, фразы, квизы, слова, personal trainings и порядок уроков.

Gustav может переиспользовать от Heisenberg:

- inventory discipline;
- agent board concept;
- generated-output isolation under docs;
- semantic audit mindset;
- activation gates;
- regression test style.

Gustav не может слепо переиспользовать:

- assumption that target stays `en`;
- source-locale maps as target-language content;
- Spanish source payloads as model for French target;
- Heisenberg activation flow as final architecture.

## 5. Новая целевая архитектура Gustav

Gustav должен стать не генератором текстов, а системой расширения PhraseMan по study target languages.

Нужны четыре жестких слоя:

### 5.1 SourceLocale Layer

Это язык, с которого пользователь учится: `ru`, `uk`, позже другие.

Для французского требования сейчас:

- French target must be available from Russian;
- French target must be available from Ukrainian.

То есть Gustav должен создавать:

- French content as study target;
- Russian explanations for French;
- Ukrainian explanations for French;
- separate quiz prompts and feedback for both source locales;
- no mixing with English-learning flow.

### 5.2 StudyTarget Layer

Это язык, который пользователь изучает: сейчас production target effectively `en`, будущий target `fr`.

Study target должен иметь отдельный контейнер:

```text
studyTargets/
  en/
    course graph
    lessons
    quizzes
    practice mappings
  fr/
    course graph
    lessons
    quizzes
    practice mappings
```

Физический путь еще не утвержден. Это концепт контейнера, который надо адаптировать под текущую Expo/TypeScript архитектуру.

### 5.3 Course Source Graph Layer

Read-only слой, который извлекает текущую English Base из существующих файлов и нормализует ее в структуру для аудита.

Этот слой не должен переписывать приложение. Его первая задача - показать правду:

- где лежат уроки;
- где generated content;
- где source content;
- где locale payloads;
- где quiz dependencies;
- где personal practice dependencies;
- где hardcoded English assumptions.

### 5.4 Runtime Adapter Layer

Слой, который потом позволит приложению по кнопке выбрать target language и видеть только его:

- `target=en` shows English course;
- `target=fr` shows French course;
- source language remains separate: `ru` or `uk`;
- trainer queues не смешиваются между targets;
- progress не смешивается между targets;
- quiz history не смешивается между targets;
- personal trainings не смешиваются между targets.

## 6. План перестройки по фазам

### Phase 0. Freeze and reset

Цель: зафиксировать, что старый Gustav недействителен.

Deliverables:

- этот документ;
- правило "no French generation yet";
- список реальных источников English Base;
- список текущих опасных зон.

Gate:

- нет новых French lesson files;
- нет product-code edits;
- нет смешивания source locale и target language.

### Phase 1. App Atlas and Learning Surface Map

Цель: понять все места, где живет учебный контент.

Inputs:

- `docs/atlas/atlas.full.json`;
- `docs/atlas/atlas.critical.md`;
- `docs/atlas/atlas.claude.md`;
- `docs/HEISENBERG_LOCALIZATION_PIPELINE.md`;
- all `app/lesson_*`;
- all `app/quiz_*`;
- all `app/diagnosis_training_*`;
- all `app/flashcards/*`;
- trainer files.

Deliverables:

- `GUSTAV_SURFACE_INVENTORY.md`;
- table of learning surfaces;
- table of hardcoded English assumptions;
- table of source-locale-only assumptions;
- list of files safe to read;
- list of files unsafe to mutate.

Gate:

- every learning surface has owner, source file, runtime usage and risk level.

### Phase 2. English Base Source Graph

Цель: собрать английскую базу не как "тексты", а как учебный граф.

Deliverables:

- source graph schema;
- read-only extractor plan;
- lesson graph dump;
- phrase graph dump;
- quiz graph dump;
- personal training graph dump;
- missing-link report.

Must include:

- lesson order;
- grammar skills;
- phrase sets;
- words;
- intro screens;
- quiz relationships;
- trainer relationships;
- diagnosis training relationships.

Gate:

- if content exists in UI but missing from graph, graph is not accepted;
- if graph cannot explain a lesson's purpose, graph is not accepted.

### Phase 3. English Base Audit

Цель: проверить базу, от которой Gustav будет отталкиваться.

Audit areas:

- grammar correctness;
- unnatural English;
- Russian/Ukrainian calques;
- duplicated phrases;
- wrong CEFR placement;
- quiz answer ambiguity;
- mismatch between lesson theory and exercises;
- mismatch between words and phrases;
- missing personal-practice link;
- stale generated file vs source file;
- old Spanish/source-locale contamination.

Deliverables:

- `GUSTAV_ENGLISH_BASE_AUDIT.md`;
- error list with severity;
- auto-fix candidates;
- manual-review candidates;
- blocker list before target-language generation.

Gate:

- blockers must be fixed or explicitly waived.

### Phase 4. Target Language Curriculum Design

Цель: для French не копировать английские 32 урока blindly.

Gustav must compare:

- English lesson order;
- French grammar acquisition order;
- CEFR progression;
- Russian learner issues;
- Ukrainian learner issues;
- app product constraints;
- best-reference curriculum patterns.

References should be stored as citations/notes in the run artifact, not silently baked into generated content.

Deliverables:

- French curriculum map;
- English-to-French transfer matrix;
- lessons kept;
- lessons split;
- lessons merged;
- lessons reordered;
- lessons added;
- lessons removed;
- reason for every structural change.

Gate:

- no lesson exists only because English had an equivalent lesson;
- every lesson has target-language reason.

### Phase 5. Gustav Agent Office

Цель: не один большой агент пишет все, а отделы проверяют друг друга.

Deliverables:

- agent prompts;
- input/output contracts;
- blocking rules;
- review gates;
- escalation rules.

Gate:

- no generation agent can approve its own work;
- runtime and QA agents can block content agents;
- source evidence agent can block all if references are weak.

### Phase 6. My Practice Redesign for Multi-Target

Цель: "Моя практика" должна быть не переводом английской тренировки, а target-aware системой.

Must handle:

- separate progress per target;
- separate weak skills per target;
- separate spaced repetition queues per target;
- source-locale explanations for same target mistake;
- target-specific grammar diagnostics;
- target-specific phrase correction;
- target-specific vocabulary recall;
- no pollution between English and French practice.

Deliverables:

- personal practice target schema;
- migration strategy from `trainer_store_v1`;
- compatibility plan for existing users;
- per-target diagnosis taxonomy plan;
- agent room extension plan.

Gate:

- switching target language cannot show another target's queue;
- target progress cannot overwrite English progress.

### Phase 7. Isolated French Pilot

Цель: создать French only after phases 1-6 pass.

Deliverables:

- generated artifacts under isolated Gustav run folder;
- no direct product write;
- Russian and Ukrainian explanation packs;
- French lesson pilot;
- quiz pilot;
- trainer pilot;
- personal practice pilot;
- audit report.

Gate:

- content approved by external-reference audit;
- runtime adapter plan approved;
- no app integration before diff review.

### Phase 8. Integration Refactor

Цель: только после успешного pilot встраивать в приложение.

Deliverables:

- target-language registry;
- target-aware lesson loader;
- target-aware quiz loader;
- target-aware trainer store keys;
- target-aware progress keys;
- target-aware UI switch;
- migration tests;
- regression tests.

Gate:

- English learning flow unchanged;
- source locales still work;
- French target appears only when selected;
- no mixed content in UI screenshots.

### Phase 9. Release Gate

Цель: платное приложение не должно выпускать сырой учебный контент.

Required checks:

- TypeScript compile;
- unit tests;
- Heisenberg regression unaffected;
- Gustav graph tests;
- Gustav content lint;
- target isolation tests;
- personal practice target isolation tests;
- screenshot smoke tests for language switch;
- LLM official-source validation signoff.

## 7. Gustav Agent Office

### 7.1 App Cartographer Agent

Mission: строит карту приложения и учебных поверхностей.

Inputs:

- atlas docs;
- `app/*`;
- `constants/*`;
- scripts and tests.

Outputs:

- surface inventory;
- dependency map;
- hardcoded assumptions report.

Blocks if:

- any learning surface has no owner;
- any target-language sensitive file is unknown.

### 7.2 English Base Source Graph Agent

Mission: извлекает English Base из текущего приложения как read-only graph.

Inputs:

- lesson data files;
- intro screens;
- quiz files;
- preposition files;
- flashcards;
- personal trainings.

Outputs:

- normalized source graph;
- missing links;
- graph confidence score.

Blocks if:

- generated/source files conflict;
- lesson purpose cannot be reconstructed;
- quiz references unknown grammar not in lessons.

### 7.3 English Base Audit Agent

Mission: ищет ошибки в текущей базе до использования ее как основы.

Checks:

- grammar;
- phrasing;
- ambiguity;
- CEFR level;
- lesson order;
- phrase naturalness;
- explanation correctness;
- source-locale mismatches.

Outputs:

- fix list;
- risk list;
- "safe as base" decision.

Blocks if:

- high-severity English errors found;
- current lesson teaches wrong rule;
- quiz has ambiguous correct answer.

### 7.4 Heisenberg Compatibility Agent

Mission: защищает существующий Heisenberg от поломки.

Checks:

- Gustav не ломает source-locale pipeline;
- `target=en` behavior unchanged;
- new target architecture does not mutate source-locale maps in place.

Outputs:

- compatibility report;
- reuse recommendations;
- forbidden reuse list.

Blocks if:

- Gustav writes target content into Heisenberg source-locale structures;
- source locale and target language are confused.

### 7.5 Target-Language Architecture Agent

Mission: проектирует containers, loaders, registries and storage boundaries.

Outputs:

- target registry design;
- loader design;
- storage-key design;
- migration plan;
- test plan.

Blocks if:

- target switching can leak content;
- progress or trainer queues share keys between targets.

### 7.6 Curriculum Transfer Agent

Mission: решает, какие английские lessons transfer to French and which must change.

Inputs:

- English Base Source Graph;
- French grammar acquisition references;
- source-locale learner difficulty notes.

Outputs:

- transfer matrix;
- keep/split/merge/reorder/add/remove decision;
- rationale per lesson.

Blocks if:

- French lesson order is copied without justification;
- a French grammar point is missing because English lacks it.

### 7.7 Pedagogy and Grammar Agent

Mission: пишет и проверяет grammar explanations for source locales.

For French from Russian/Ukrainian, it must produce:

- Russian explanations;
- Ukrainian explanations;
- French examples;
- grammar warnings;
- common mistakes;
- mini-drills.

Blocks if:

- explanation is a direct calque;
- source language explanation teaches wrong target-language rule;
- examples are unnatural.

### 7.8 Quiz and Assessment Agent

Mission: строит quizzes from lesson objectives, not from random phrases.

Outputs:

- quiz blueprint;
- correct answer rationale;
- distractor rationale;
- ambiguity report;
- source-locale prompt variants.

Blocks if:

- multiple answers are valid but only one is accepted;
- quiz tests content not taught yet;
- distractors are nonsensical.

### 7.9 SourceLocale UX Agent

Mission: проверяет, как Russian and Ukrainian learners see the same French content.

Checks:

- terminology consistency;
- explanation clarity;
- no Russian text in Ukrainian mode;
- no Ukrainian text in Russian mode;
- UI labels fit existing app patterns.

Blocks if:

- source locales mix;
- grammar terms are inconsistent;
- UI text becomes too long for existing screens.

### 7.10 My Practice Agent

Mission: проектирует serious target-aware "Моя практика".

Must cover:

- weak grammar detection;
- phrase correction;
- vocabulary recall;
- spaced repetition;
- personal training selection;
- per-target progress;
- source-locale feedback.

Outputs:

- practice skill taxonomy;
- target-specific trainer mapping;
- diagnosis-training extension plan;
- exercise generation contract.

Blocks if:

- English practice queues can appear in French;
- French mistakes are diagnosed with English taxonomy;
- trainer storage is not target-aware.

### 7.11 Runtime Integration Agent

Mission: связывает data model with Expo app runtime.

Checks:

- imports;
- bundle size;
- lazy loading;
- route behavior;
- target switch behavior;
- existing English regressions.

Blocks if:

- integration requires unsafe global mutation;
- old screens assume English-only shape.

### 7.12 QA and Release Gate Agent

Mission: final blocking gate.

Requires:

- graph complete;
- audits complete;
- tests green;
- app screenshot smoke clear;
- no mixed language content;
- no production flow regression.

Blocks if:

- any previous blocker unresolved;
- French content lacks source evidence;
- target isolation test fails.

## 8. Gustav Pipelines

### Pipeline A. App Map Pipeline

Purpose: understand PhraseMan before designing anything.

Steps:

1. Read atlas.
2. Read route map.
3. Read lesson data imports.
4. Read quiz imports.
5. Read personal training taxonomy.
6. Read trainer storage.
7. Build surface inventory.
8. Mark target-sensitive files.

Output: `GUSTAV_SURFACE_INVENTORY.md`.

### Pipeline B. English Base Source Graph Pipeline

Purpose: turn scattered TS content into one read-only graph.

Steps:

1. Extract lesson list.
2. Extract lesson intro screens.
3. Extract phrase blocks.
4. Extract word lists.
5. Extract preposition packs.
6. Extract quizzes.
7. Extract personal trainings.
8. Link all by lesson/skill.
9. Report missing links.

Output: `gustav_english_source_graph.json`.

### Pipeline C. English Base Audit Pipeline

Purpose: check the base before using it.

Steps:

1. Run structural consistency checks.
2. Run grammar audit.
3. Run phrase naturalness audit.
4. Run quiz ambiguity audit.
5. Run source-locale consistency audit.
6. Run personal-practice alignment audit.
7. Produce blocker report.

Output: `GUSTAV_ENGLISH_BASE_AUDIT.md`.

### Pipeline D. Target Language Curriculum Pipeline

Purpose: design French as French, not as translated English.

Steps:

1. Load English graph.
2. Load target-language reference notes.
3. Compare grammar order.
4. Build transfer matrix.
5. Draft French lesson order.
6. Review with pedagogy agent.
7. Review with source-locale UX agent.
8. Freeze pilot scope.

Output: `GUSTAV_FR_CURRICULUM_PLAN.md`.

### Pipeline E. Content Generation Pipeline

Purpose: generate only after design is accepted.

Steps:

1. Generate lesson blueprint.
2. Generate intro screens.
3. Generate phrases.
4. Generate vocabulary.
5. Generate quizzes.
6. Generate practice mappings.
7. Run self-check.
8. Send to independent audit agents.

Output: isolated run artifacts, not production files.

### Pipeline F. My Practice Pipeline

Purpose: make personalized lessons serious and target-aware.

Steps:

1. Extract existing diagnosis taxonomy.
2. Identify English-only assumptions.
3. Design French taxonomy.
4. Map lesson skills to practice skills.
5. Design trainer storage separation.
6. Generate practice drills.
7. Audit feedback quality.
8. Test target isolation.

Output: target-aware personal practice spec.

### Pipeline G. Integration Pipeline

Purpose: safely bring approved target content into app.

Steps:

1. Create target registry.
2. Create target-aware loaders.
3. Add target-specific storage keys.
4. Add target switch behavior.
5. Wire lessons.
6. Wire quizzes.
7. Wire trainer.
8. Wire personal practice.
9. Run regression.

Output: product diff.

### Pipeline H. Release Pipeline

Purpose: protect paid-app quality.

Steps:

1. Typecheck.
2. Unit tests.
3. Heisenberg tests.
4. Gustav graph tests.
5. Content lint.
6. Runtime screenshots.
7. Manual language-switch QA.
8. Release signoff.

Output: release decision.

## 9. Первый конкретный backlog

Do first:

1. Create `docs/gustav/GUSTAV_SURFACE_INVENTORY.md`.
2. Create `docs/gustav/GUSTAV_SOURCE_GRAPH_SCHEMA.md`.
3. Create read-only extractor plan for English Base.
4. Create `scripts/gustav_source_graph_*` only after schema is approved.
5. Add tests for graph extraction before any target language generation.
6. Add target-language isolation design before French content.
7. Extend personal training agent room for multi-target work.
8. Only then start French curriculum plan.

Do not do yet:

- no French lessons;
- no French phrases;
- no French quizzes;
- no production integration;
- no direct rewrite of English files;
- no mutation of Heisenberg pipeline without compatibility review.

## 10. Definition of ready for French

French work can start only when all are true:

- Gustav old standalone assumptions are removed from process;
- PhraseMan surface inventory complete;
- English Base Source Graph complete;
- English Base audit complete;
- Heisenberg compatibility clear;
- target-language architecture accepted;
- My Practice target isolation designed;
- agent prompts and gates written;
- no product-code blocker remains.

Until then Gustav is in architecture/audit mode, not generation mode.

