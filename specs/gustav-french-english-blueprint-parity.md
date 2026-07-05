# Gustav French English Blueprint Parity Spec

## Objective

Bring `studyTarget=fr` into the same PhraseMan product shape as the English course while rebuilding the language content natively for French.

French must not be a literal translation of English. It must inherit the English application's blueprint: level structure, lesson count, data fields, exercise shapes, theory surfaces, vocabulary behavior, drills, quizzes, AI prompt surfaces, admin/server/runtime/storage/cloud isolation, review gates, and activation gates.

## Source-Of-Truth Files Inspected

- `app/course_levels.ts`
- `constants/lessons.ts`
- `app/(tabs)/lessons.tsx`
- `app/achievements.ts`
- `app/achievements_screen.tsx`
- `app/ai_dialog_session.tsx`
- `app/ai_dialog_scenarios.ts`
- `app/cloud_sync.ts`
- `docs/gustav/GUSTAV_FRENCH_CURRICULUM_CONTRACT.md`
- `docs/gustav/GUSTAV_ENGLISH_FEATURE_PARITY_CONTRACT.md`
- `docs/gustav/GUSTAV_PHRASEMAN_MAP_AND_REBUILD_PLAN.md`
- `docs/gustav/generated/fr/core_lessons_32/fr_lesson_builder_inputs_v1.json`
- `docs/gustav/generated/fr/lessons/lesson*_row_ledger.json`
- `docs/gustav/generated/fr/reviewer/fr_lesson_llm_review_decision_progress_gate_audit_v1.json`
- `docs/gustav/generated/fr/activation/fr_activation_completion_audit_v2.json`

## English Blueprint Facts

1. PhraseMan app-facing course levels are exactly `A1`, `A2`, `B1`, `B2`.
2. `app/course_levels.ts` maps:
   - `A1`: lessons 1-8
   - `A2`: lessons 9-18
   - `B1`: lessons 19-28
   - `B2`: lessons 29-32
3. Achievements, exams, cloud restore, level locks, medals, and admin tester flows refer to `A1/A2/B1/B2`.
4. Lesson content is 32 lessons with 50 phrase rows per lesson.
5. English lesson data is not only phrases. Its blueprint includes:
   - phrase rows
   - answer blanks
   - correct answers
   - distractors
   - grammar categories
   - lesson theory
   - lesson intro screens
   - vocabulary/word training surfaces
   - preposition drills
   - irregular verb or language-equivalent drills
   - quiz and arena surfaces
   - active recall/personal practice
   - AI dialogue/prompt surfaces
   - audio references
   - progress, exam, achievement, storage, cloud, and admin surfaces

## Current French Facts

1. French has generated 32 lesson ledgers and 1600 candidate rows.
2. The candidate rows include French phrases, RU/UK meanings, `wordsFr`, correct answer, distractors, categories, evidence ids, and activation metadata.
3. Current LLM review progress is partial, not complete.
4. Current activation audit is HOLD and `activationApproved=false`.
5. Current French curriculum labels are internal bands such as `A1.1`, `A1.2`, `A2.1`, `A2.2`.
6. This is not enough for production parity because the app/product contract expects `A1/A2/B1/B2`.

## Gap List

### GAP-001 App-Level CEFR Parity

French currently presents the core lesson plan as `A1.1-A2.2`. It must map to PhraseMan's app-facing `A1/A2/B1/B2` structure:

- `A1`: lessons 1-8
- `A2`: lessons 9-18
- `B1`: lessons 19-28
- `B2`: lessons 29-32

Internal French pedagogy sublevels may remain as metadata, but cannot replace app-level parity.

### GAP-002 English Blueprint Inventory

Gustav must fully inventory English lesson data, theory, vocabulary, quizzes, drills, prompts, and admin/runtime surfaces before claiming French parity.

### GAP-003 French Native Curriculum Fit

French lessons must cover the same app-level progression density as English, but with French-native sequencing. If lessons 29-32 are app `B2`, they need appropriate advanced French content for that product tier, not merely `A2.2` labels.

### GAP-004 Feature Surface Parity

French must have equivalent outputs for all English-backed surfaces:

- core lessons
- theory
- intro screens
- vocabulary/word training
- preposition drills
- irregular verb or French-equivalent conjugation/verb drills
- quizzes
- arena questions
- personal practice
- active recall
- flashcards
- collection cards
- AI dialogue / mistake explanation / weekly review / stats insight / premium dialog prompts
- audio/TTS
- server packs
- runtime download
- admin/index surfaces
- storage/cloud isolation
- rollback and activation gates

### GAP-005 Review And Evidence

Human review is removed. LLM review must perform quality review using trusted source evidence. Grammar/curriculum claims must cite official/trusted sources.

## Requirements

### REQ-001 App Level Mapping Gate

Add a Gustav gate that fails production unless French has an explicit app-level mapping:

```json
{
  "studyTarget": "fr",
  "appLevels": {
    "A1": [1, 8],
    "A2": [9, 18],
    "B1": [19, 28],
    "B2": [29, 32]
  }
}
```

The gate must allow internal sublevels only as secondary metadata.

### REQ-002 English Blueprint Extractor

Add or extend a Gustav extractor that maps English surfaces into a source graph:

- lesson rows and fields
- phrase counts
- blank/correct/distractor principles
- grammar category principles
- theory files and section shapes
- vocabulary/word training data source
- preposition drill source and rules
- irregular verb or equivalent drill source and rules
- quizzes and arena question counts
- personal practice nodes
- flashcards and collection-card surfaces
- AI prompt surfaces
- audio and server/runtime pack surfaces
- admin/index write and read surfaces

Output must be a versioned artifact under `docs/gustav/generated/fr/english_blueprint/`.

### REQ-003 French Blueprint Plan

Create a French blueprint plan that maps every English feature surface to a French-native equivalent:

- copy field/data shape when it is a product contract
- rebuild content when it is language-specific
- mark "not applicable" only with source-backed explanation and replacement behavior

### REQ-004 Lesson Reclassification

Update French lesson metadata so every lesson has:

- `appCourseLevel`: `A1 | A2 | B1 | B2`
- `appLevelRange`: source from `app/course_levels.ts`
- `internalFrenchBand`: optional, such as `A1.1`, `A1.2`, `B1.1`
- `cefrEvidence`: trusted evidence ids
- `blueprintParityStatus`

### REQ-005 Advanced French Coverage

Review lessons 19-32 against the app-level `B1/B2` expectation. If existing content is too low, mark affected lessons for rebuild/regeneration before production.

### REQ-006 Distractor Principle Audit

For English and French, document distractor principles:

- same grammatical slot
- plausible learner confusion
- same part of speech or conjugation family
- no impossible nonsense distractors
- no language mixing
- no duplicate correct answer
- no distractor that is also correct in the phrase context

Add a gate that checks these principles for French rows.

### REQ-007 Theory Parity

For all 32 French lessons, create theory content with the same product shape as English theory:

- title/topic
- short explanation
- examples
- common mistakes
- practice link or lesson reference where applicable

French theory must explain French grammar, not translated English grammar.

### REQ-008 Vocabulary And Drill Parity

Map English vocabulary/word-training behavior and implement French equivalents:

- words must come from French lessons and relevant French feature banks
- conjugation/irregular-verb section must become French-appropriate verb/conjugation training if English irregular verbs do not map directly
- preposition drills must use French preposition behavior and contractions

### REQ-009 AI Prompt Parity

Every English AI prompt surface must have French-specific target-language prompt contracts:

- target language is French
- UI/source locale is not confused with study target
- prompt/cache keys include study target
- rejected fresh AI text cannot be returned live
- mistake explanations, weekly review, stats insights, premium dialog, dialogues, and practice prompts must be isolated

### REQ-010 Server Pack And Runtime Parity

French content must be delivered as server/downloadable packs, not as direct app bundle production content, until an explicit architecture spec says otherwise.

### REQ-011 Activation Block

`activationApproved=true` is forbidden until:

- all 1600 rows are reviewed
- non-accepted rows are routed and resolved
- theory/vocab/quiz/drill/AI/admin/server/runtime/storage/cloud parity passes
- audio and server pack manifests pass
- runtime delivery passes
- rollback gates pass
- final activation audit passes

## Edge Cases

- French internal CEFR bands can be more granular than app levels, but app levels must remain `A1/A2/B1/B2`.
- A French concept may not have an English one-to-one equivalent; the replacement must preserve app feature intent.
- Some English advanced grammar may map differently in French; use trusted French sources and mark the mapping.
- A row can be linguistically correct but still fail product blueprint parity.
- A gate can pass technically while production remains HOLD due to missing feature parity.

## Required Gates And Tests

Add or update tests for:

- `gustav_fr_app_level_parity_gate`
- `gustav_english_blueprint_extractor`
- `gustav_fr_blueprint_surface_parity`
- `gustav_fr_lesson_cefr_reclassification`
- `gustav_fr_distractor_principle_gate`
- `gustav_fr_theory_parity_gate`
- `gustav_fr_vocab_drill_parity_gate`
- `gustav_fr_ai_prompt_parity_gate`
- `gustav_fr_activation_completion_audit_v2`

Existing tests that must continue passing:

- `tests/gustav_trusted_brain_contract.test.ts`
- `tests/gustav_fr_lesson_llm_review_requests.test.ts`
- `tests/gustav_fr_lesson_llm_review_execution_runner.test.ts`
- `tests/gustav_fr_lesson_llm_review_decision_progress_gate.test.ts`
- `tests/gustav_fr_lesson_llm_review_partial_quarantine_gate.test.ts`
- `tests/gustav_fr_lesson_llm_review_batch_plan.test.ts`
- `tests/gustav_fr_lesson_llm_review_live_handoff.test.ts`
- `tests/gustav_fr_activation_completion_audit_v2.test.ts`
- `tests/gustav_fr_lesson_decision_staging_gate.test.ts`
- `tests/gustav_fr_lesson_decision_import_source_gate.test.ts`

## Files And Scripts To Touch Next

- `docs/gustav/GUSTAV_FRENCH_CURRICULUM_CONTRACT.md`
- `docs/gustav/GUSTAV_ENGLISH_FEATURE_PARITY_CONTRACT.md`
- `docs/gustav/state.json`
- `scripts/gustav_build_fr_activation_completion_audit_v2.mjs`
- new `scripts/gustav_build_english_blueprint_inventory.mjs`
- new `scripts/gustav_build_fr_app_level_parity_gate.mjs`
- new `scripts/gustav_build_fr_blueprint_surface_parity_gate.mjs`
- new tests matching those scripts

## Definition Of Done

This spec is done only when current evidence proves:

- French maps to app `A1/A2/B1/B2`.
- Every English course feature surface has a French-native equivalent or a source-backed replacement.
- Every French lesson has app-level and internal pedagogy metadata.
- French rows, distractors, theory, vocabulary/drills, quizzes, prompts, packs, runtime, storage/cloud, admin, and rollback gates pass.
- LLM review plus trusted source evidence replaces human review.
- `activationApproved=true` is set only after the final activation audit passes.

## Production Status

Current status must remain HOLD. The current French course is not production-ready until this spec is built and reviewed.

## Build Handoff

Next `/build` target:

`specs/gustav-french-english-blueprint-parity.md`

First build step:

Create the app-level French parity gate and English blueprint inventory artifacts before changing content rows.
