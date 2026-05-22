# GUSTAV Source Graph Extractor Plan

Status: draft contract v0

Purpose: define how Gustav will build a read-only English Base Source Graph from the real PhraseMan app.

This plan does not implement extraction yet. It defines extraction order, ownership and failure rules.

## 1. Core rule

The extractor must read PhraseMan as it exists.

It must not:

- generate target-language content;
- fix English content;
- rewrite lesson files;
- treat generated files as canonical without provenance;
- infer missing graph links without marking confidence.

## 2. Output path

Future output:

```text
docs/gustav/runs/<runId>/source_graph/english_source_graph.json
docs/gustav/runs/<runId>/source_graph/validation.json
docs/gustav/runs/<runId>/source_graph/unresolved.md
```

## 3. Extraction order

The extractor must run in this order:

1. Repo and atlas context.
2. Source-locale and study-target architecture.
3. Lesson spine.
4. Lesson data types.
5. Canonical lesson content.
6. Generated derivatives and provenance.
7. Intro screens.
8. Words and vocabulary.
9. Quizzes and exams.
10. Preposition packs and drills.
11. Flashcards and daily phrase surfaces.
12. Personal trainings and taxonomy.
13. Trainer and phrase analytics.
14. Runtime surfaces and routes.
15. Storage/cloud sync keys.
16. Tests and audit scripts.
17. Validation summary.

If a later step reveals a missing earlier dependency, the extractor must add an unresolved node instead of silently patching the graph.

## 4. Step details

### 4.1 Repo and atlas context

Inputs:

- `docs/atlas/atlas.full.json`;
- `docs/atlas/atlas.critical.md`;
- `docs/atlas/atlas.claude.md`;
- `git status --short`;
- package scripts.

Outputs:

- atlas timestamp;
- route count;
- internal import edge summary;
- dirty worktree summary.

### 4.2 Source-locale and study-target architecture

Inputs:

- `app/source_locales.ts`;
- `app/study_target_lang_dev.ts`;
- `app/spanish_content_gate.ts`;
- `docs/HEISENBERG_LOCALIZATION_PIPELINE.md`.

Outputs:

- observed source locales;
- observed study targets;
- dev-only target warnings;
- Heisenberg separation note.

Hard fail:

- source locale and study target represented as one graph dimension.

### 4.3 Lesson spine

Inputs:

- `constants/lessons.ts`;
- `app/lesson_data_all.ts`.

Outputs:

- 32 English lesson nodes;
- current order;
- lesson titles by source locale;
- phrase and intro screen references.

Hard fail:

- lesson id missing;
- duplicate lesson id;
- lesson listed in one spine but missing from another without unresolved node.

### 4.4 Lesson data types

Inputs:

- `app/lesson_data_types.ts`.

Outputs:

- current TypeScript field mapping;
- target/source field risks;
- legacy Spanish dev target notes.

Hard fail:

- target text and source prompt fields cannot be separated.

### 4.5 Canonical lesson content

Inputs:

- `app/lesson_data_1_8_phrases_source.ts`;
- `app/lesson_data_17_24.ts`;
- `app/lesson_data_25_32.ts`;
- other lesson data modules.

Outputs:

- phrase nodes;
- word nodes;
- source prompt maps;
- accepted alternatives;
- lesson links.

Hard fail:

- phrase has no target text;
- source prompt is treated as target text.

### 4.6 Generated derivatives and provenance

Inputs:

- `app/lesson_data_1_8_phrases_es.gen.ts`;
- `app/lesson_data_9_16_phrases_es.gen.ts`;
- any other generated lesson/locale files.

Outputs:

- generated file nodes;
- generatedFrom links when known;
- stale/unknown status.

Rule:

Generated file can feed observed runtime behavior, but cannot become canonical source unless provenance is known.

### 4.7 Intro screens

Inputs:

- `app/lesson_intro_screens_lesson*_v2.ts`;
- `app/lesson_intro_screens_9_32.ts`;
- `app/lesson_intro_screens_17_32.ts`;
- `app/lesson_intro_screens_en_17_32.ts`;
- `app/lesson_intro_screens_es_l2.ts`.

Outputs:

- intro screen nodes;
- examples;
- developer notes;
- source-locale coverage;
- placeholder risks.

### 4.8 Words and vocabulary

Inputs:

- `app/lesson_words.tsx`;
- `app/lesson_words_source_locales.ts`;
- `app/lesson_words_es_map.ts`;
- `app/lesson_words_spanish_gloss.ts`.

Outputs:

- word nodes;
- category/grammar tags;
- distractors;
- source-locale labels;
- Spanish dev target isolation notes.

### 4.9 Quizzes and exams

Inputs:

- `app/quiz_data.ts`;
- `app/quiz_data_es_l2.ts`;
- `app/quiz_source_locale_payloads.ts`;
- `app/quizzes/*`;
- `app/exam.tsx`;
- `app/level_exam.tsx`.

Outputs:

- quiz nodes;
- tested skills when inferable;
- source-locale prompts;
- ambiguity risk;
- exam storage references.

Hard fail:

- quiz linked to target language without lesson/prerequisite and without diagnostic marker.

### 4.10 Prepositions

Inputs:

- `app/preposition_explanations.ts`;
- `app/preposition_overrides.ts`;
- `app/lesson_prepositions.ts`;
- `app/preposition_drill.tsx`;
- `app/lesson_prepositions_es_*`.

Outputs:

- preposition pack nodes;
- drill storage keys;
- target-language risk.

### 4.11 Flashcards and daily phrase

Inputs:

- `app/flashcards/*`;
- `app/flashcards/bundles/*`;
- `app/daily_phrase_system.ts`;
- `app/idioms_data.ts`.

Outputs:

- flashcard nodes;
- daily phrase nodes;
- source-locale maps;
- marketplace/global vs target-specific risk.

### 4.12 Personal trainings

Inputs:

- `app/personal_training_taxonomy.ts`;
- `app/diagnosis_trainings.ts`;
- `app/diagnosis_training_*.ts`;
- `app/personal_training_source_locales.ts`;
- `tools/personal_training_agent_room/*`;
- relevant tests.

Outputs:

- personal practice nodes;
- English diagnosis taxonomy;
- CEFR/prerequisite graph;
- Jesse marker status;
- target transfer blockers.

Hard fail:

- active personal training missing QA metadata;
- diagnosis file not linked to registry;
- French target uses English diagnosis directly.

### 4.13 Trainer and analytics

Inputs:

- `app/trainer_store.ts`;
- `app/trainer_session.ts`;
- `app/trainer_smart_session.tsx`;
- `app/trainer_words_session.tsx`;
- `app/trainer_phrases_session.tsx`;
- `app/phrase_analytics.ts`.

Outputs:

- trainer queue model;
- storage keys;
- target isolation risks;
- source-locale feedback fields.

### 4.14 Runtime surfaces and routes

Inputs:

- atlas routes;
- `app/(tabs)/*`;
- relevant screen components.

Outputs:

- surface nodes;
- route mapping;
- owner mapping;
- target/source sensitivity.

### 4.15 Storage and cloud sync

Inputs:

- all files importing AsyncStorage;
- `app/cloud_sync.ts`;
- tests referencing storage keys.

Outputs:

- storage key inventory;
- cloud sync status;
- learning-state risk classification.

### 4.16 Tests and audit scripts

Inputs:

- package scripts;
- `tests/*`;
- existing audit scripts.

Outputs:

- reusable regression gates;
- missing test list.

## 5. Confidence rules

High confidence:

- direct exported constant or typed structure;
- direct source ref with line;
- exact runtime import path known.

Medium confidence:

- inferred from import graph or repeated naming pattern;
- runtime usage known but source provenance incomplete.

Low confidence:

- text search only;
- generated file without source hash;
- unclear ownership.

Unknown:

- surface found but owner or target/source role not understood.

## 6. Unresolved node rules

Every unresolved node needs:

- id;
- kind;
- title;
- source refs;
- severity;
- owner candidate;
- next action.

Unresolved blocker prevents source graph `PASS`.

## 7. First implementation strategy

First extractor version should be conservative:

- no AST transformation;
- no file writes outside run folder;
- prefer TypeScript imports only where safe under node stubs;
- use text/regex only for inventory and provenance, not semantic truth;
- mark ambiguous as unresolved.

Better to return `HOLD` with honest gaps than produce a fake complete graph.

## 8. Minimum acceptable first graph

First graph can pass only if it includes:

- all 32 lesson nodes;
- phrase counts per lesson;
- intro screen counts per lesson;
- source files for lesson content;
- generated file provenance status;
- personal training taxonomy summary;
- trainer storage key;
- cloud sync key risk summary;
- surface inventory link;
- unresolved list.

If any of these are missing, first graph verdict is `HOLD`.

## 9. French generation remains blocked

The extractor is read-only.

Even a passing English Source Graph does not approve French generation by itself. It only unlocks:

- English Base audit;
- external French research;
- curriculum transfer matrix.

