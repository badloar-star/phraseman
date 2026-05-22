# GUSTAV Personal Practice Target Plan

Status: draft contract v0

Purpose: define how "Моя практика" and diagnosis-based personal trainings must become target-aware before French can be added.

This document is a design contract only. It does not authorize app code changes or new French practice content.

## 1. Current reality

PhraseMan has an existing English-focused personal training system:

- `app/personal_training_taxonomy.ts`;
- `app/diagnosis_trainings.ts`;
- `app/diagnosis_training_*.ts`;
- `app/diagnosis_training_engine.ts`;
- `app/diagnosis_training_types.ts`;
- `app/personal_training_source_locales.ts`;
- `tools/personal_training_agent_room/README.md`;
- `tools/personal_training_agent_room/ROOM.md`;
- `tools/personal_training_agent_room/JESSE_PINKMAN.md`.

The existing taxonomy is built around English grammar diagnosis ids such as:

- `article_a_an`;
- `verb_present_simple_statement`;
- `word_order_basic_question`;
- `present_perfect_vs_past_simple`;
- `preposition_time_in_on_at`.

These ids cannot be reused for French unless a transfer decision explicitly says they are valid for French.

## 2. Core rule

Personal practice must be scoped by `studyTarget`.

English diagnosis:

```text
studyTarget=en
diagnosisId=verb_present_simple_statement
```

French diagnosis:

```text
studyTarget=fr
diagnosisId=fr:<target-specific-id>
```

Do not use an English diagnosis id as a French diagnosis id.

## 3. Future target diagnosis shape

```ts
type TargetDiagnosisId = `${StudyTargetId}:${string}`;

type TargetPersonalPracticeEntry = {
  id: TargetDiagnosisId;
  studyTarget: StudyTargetId;
  status: 'planned' | 'draft' | 'qa_pending' | 'active' | 'disabled';
  cefrLevel: 'A1' | 'A2' | 'A2+' | 'B1' | 'B1+' | 'unknown';
  prerequisites: TargetDiagnosisId[];
  placementRisk: 'low' | 'medium' | 'high';
  sourceLocaleFeedback: {
    ru?: PersonalPracticeSourceFeedback;
    uk?: PersonalPracticeSourceFeedback;
  };
  linkedTargetLessonIds: string[];
  linkedSourceGraphNodes: string[];
  transferFromEnglish?: EnglishToTargetPracticeTransfer;
  evidenceIds: string[];
  qaStatus: 'not_started' | 'pass' | 'hold' | 'block';
};

type PersonalPracticeSourceFeedback = {
  title: string;
  shortDiagnosis: string;
  explanation: string;
  commonMistakes: string[];
  repairStrategy: string;
};

type EnglishToTargetPracticeTransfer = {
  englishDiagnosisId: string;
  decision: 'reuse_concept' | 'split' | 'merge' | 'replace' | 'not_applicable';
  reason: string;
  evidenceIds: string[];
};
```

## 4. Transfer decision types

`reuse_concept`:

The same broad learning concept exists in French, but examples, rules and feedback are target-specific.

Example:

- "basic word order" may transfer as a concept, not as English sentence rules.

`split`:

One English diagnosis becomes multiple French diagnoses.

Example:

- article logic may need masculine/feminine, elision and partitive distinctions.

`merge`:

Multiple English diagnoses become one French beginner practice skill.

`replace`:

French requires a different diagnosis category.

`not_applicable`:

English concept does not apply to French or is not useful at the same course stage.

## 5. French-specific practice domains to expect

No content is generated here. This is only a planning list of domains Gustav must research before French.

Likely French domains include:

- noun gender and article agreement;
- adjective agreement and placement;
- subject pronouns and verb agreement;
- `être` and `avoir`;
- regular verb groups;
- common irregular verbs;
- negation with `ne ... pas`;
- questions;
- contractions with articles/prepositions;
- partitive articles;
- object pronouns;
- reflexive verbs;
- tense/aspect progression;
- pronunciation-linked spelling traps where relevant.

Each domain needs evidence before becoming a real diagnosis id.

## 6. Source-locale feedback

French practice from Russian and Ukrainian must have separate feedback.

Required:

- Russian feedback;
- Ukrainian feedback;
- separate grammar terms;
- no Russian fallback in Ukrainian mode;
- no Ukrainian fallback in Russian mode;
- warnings for source-specific learner mistakes when evidence exists.

Fallback rule:

If Ukrainian feedback is missing, Gustav must block activation instead of silently showing Russian feedback.

## 7. Trainer integration

Personal practice feeds the trainer. Therefore every practice item must declare:

- `studyTarget`;
- `diagnosisId`;
- `sourceLocale`;
- target phrase or word;
- feedback language;
- queue type;
- lesson link;
- evidence link;
- audit status.

French practice cannot write to English `trainer_store_v1`.

Required future:

```text
personal_practice_v2::<studyTarget>
trainer_store_v2::<studyTarget>
```

## 8. Agent room extension

The existing Jesse room remains valuable, but must not be used unchanged for French.

Required new room mode:

```text
TARGET_PRACTICE_MODE
```

It must add:

- study target id;
- source locale list;
- transfer decision;
- target-specific examples;
- target-specific diagnosis id;
- source-locale feedback review;
- target storage review.

Existing Jesse rules to preserve:

- one diagnosis id per session;
- replacement hygiene;
- marker requirement;
- admin sync/check gates;
- no draft/v2/tmp duplicate files.

New rule:

English `JESSE_REWORKED_PERSONAL_TRAINING` marker does not mean French readiness.

## 9. QA gates

Before French personal practice:

- target diagnosis namespace exists;
- transfer matrix exists;
- source-locale feedback schema exists;
- trainer storage plan exists;
- no English diagnosis id is reused directly;
- evidence ledger supports the diagnosis;
- My Practice agent returns `GO`;
- Storage and Migration Agent returns `GO`;
- QA Gate Agent returns `GO`.

Before app integration:

- tests cover target separation;
- tests cover source-locale feedback separation;
- tests cover missing Ukrainian feedback blocking activation;
- tests cover English trainer unchanged;
- tests cover migration/rollback if storage changes.

## 10. Hard fail rules

Personal practice plan fails if:

- French diagnosis id lacks `fr:` namespace;
- English grammar ids are reused without transfer decision;
- French practice writes to English trainer store;
- Russian and Ukrainian feedback are mixed;
- a French practice item has no evidence;
- practice can activate without target-specific QA;
- app assumes all personal trainings are English.

