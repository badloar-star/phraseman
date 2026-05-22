# GUSTAV Source Graph Source-Truth Policy

Status: `HOLD`

Purpose: prevent generated ES/runtime files from becoming accidental source truth for French.

## 1. Definitions

`canonical source` means manually maintained English base content that Gustav may use as source truth after quality approval.

`runtime evidence` means product files Gustav may read to understand what the app currently ships, but must not copy into a new target language without a source-truth decision.

`generated runtime file` means a checked-in generated file such as:

```text
app/lesson_data_1_8_phrases_es.gen.ts
app/lesson_data_9_16_phrases_es.gen.ts
app/lesson_intro_screens_es_l2.ts
app/quiz_data_es_l2.ts
app/lesson_prepositions_es_segment01.ts
app/lesson_prepositions_es_segment02.ts
app/lesson_prepositions_es_segment03.ts
```

## 2. Rules

Generated runtime files are allowed as extraction evidence.

Generated runtime files are not allowed as French source truth by default.

French generation must use only approved source graph nodes.

Spanish L2 support files must never define French lesson order, grammar scope, quiz design or preposition packs unless the target-language architecture explicitly maps the concept for French.

`sourceLocale` prompts (`ru`, `uk`) are input copy. They must stay separate from `studyTarget=fr` output and progress state.

## 3. Required Before Approval

Before source graph can become `PASS`, Gustav must record one of these decisions for every generated runtime dependency:

- canonical non-generated source exists and is used instead;
- generated runtime file is approved as read-only English evidence for this run;
- generated runtime file is excluded from French source truth and replaced by target-specific design.

The source graph quality audit must report:

```text
blockers: 0
high risks: 0
canApproveForFrenchGeneration: true
```

Only then can the readiness gate consider French generation.
