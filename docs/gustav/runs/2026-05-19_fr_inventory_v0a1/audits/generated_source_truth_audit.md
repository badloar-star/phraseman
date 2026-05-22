# GUSTAV Generated Source-Truth Audit

Run: `2026-05-19_fr_inventory_v0a1`

Status: `PASS`

Generated at: 2026-05-19T19:29:58.712Z

## Summary

- Artifacts: 7
- Phrase runtime artifacts: 2
- Support runtime artifacts: 5
- Used as phrase source in graph: 0
- Generated phrase entries: 0
- Canonical source available: 2
- Runtime evidence only: 5
- Blocked missing canonical source: 0
- Blockers: 0
- High risks: 0
- Can approve generated runtime as French source truth: yes

## Findings

### GST-002: Generated support files must remain evidence only

Severity: `medium`

5 generated support file(s) are allowed as runtime evidence but cannot define French curriculum structure.

Files:
- `app/lesson_intro_screens_es_l2.ts`
- `app/quiz_data_es_l2.ts`
- `app/lesson_prepositions_es_segment01.ts`
- `app/lesson_prepositions_es_segment02.ts`
- `app/lesson_prepositions_es_segment03.ts`

## Artifact Decisions

### app/lesson_data_1_8_phrases_es.gen.ts

- Role: `phrase_runtime`
- Generator: `tools/prompt006_es_phrase_words.ts`
- Generator exists: yes
- Source candidates: `app/lesson_data_1_8_phrases_source.ts`
- Existing source candidates: `app/lesson_data_1_8_phrases_source.ts`
- Imports generated runtime: no
- Used as phrase source in graph: no
- Generated phrase entries: 0
- Decision: `canonical_source_available`
- Severity: `medium`

### app/lesson_data_9_16_phrases_es.gen.ts

- Role: `phrase_runtime`
- Generator: `tools/prompt007_es_phrase_words.ts`
- Generator exists: yes
- Source candidates: `app/lesson_data_9_16.ts`
- Existing source candidates: `app/lesson_data_9_16.ts`
- Imports generated runtime: yes
- Used as phrase source in graph: no
- Generated phrase entries: 0
- Decision: `canonical_source_available`
- Severity: `medium`

### app/lesson_intro_screens_es_l2.ts

- Role: `support_runtime`
- Generator: `unknown`
- Generator exists: no
- Source candidates: `app/lesson_intro_screens_9_32.ts`
- Existing source candidates: `app/lesson_intro_screens_9_32.ts`
- Imports generated runtime: no
- Used as phrase source in graph: no
- Generated phrase entries: 0
- Decision: `runtime_evidence_only`
- Severity: `medium`

### app/quiz_data_es_l2.ts

- Role: `support_runtime`
- Generator: `unknown`
- Generator exists: no
- Source candidates: `app/quiz_data.ts`
- Existing source candidates: `app/quiz_data.ts`
- Imports generated runtime: yes
- Used as phrase source in graph: no
- Generated phrase entries: 0
- Decision: `runtime_evidence_only`
- Severity: `medium`

### app/lesson_prepositions_es_segment01.ts

- Role: `support_runtime`
- Generator: `unknown`
- Generator exists: no
- Source candidates: `app/lesson_prepositions.ts`
- Existing source candidates: `app/lesson_prepositions.ts`
- Imports generated runtime: no
- Used as phrase source in graph: no
- Generated phrase entries: 0
- Decision: `runtime_evidence_only`
- Severity: `medium`

### app/lesson_prepositions_es_segment02.ts

- Role: `support_runtime`
- Generator: `unknown`
- Generator exists: no
- Source candidates: `app/lesson_prepositions.ts`
- Existing source candidates: `app/lesson_prepositions.ts`
- Imports generated runtime: no
- Used as phrase source in graph: no
- Generated phrase entries: 0
- Decision: `runtime_evidence_only`
- Severity: `medium`

### app/lesson_prepositions_es_segment03.ts

- Role: `support_runtime`
- Generator: `unknown`
- Generator exists: no
- Source candidates: `app/lesson_prepositions.ts`
- Existing source candidates: `app/lesson_prepositions.ts`
- Imports generated runtime: no
- Used as phrase source in graph: no
- Generated phrase entries: 0
- Decision: `runtime_evidence_only`
- Severity: `medium`

## Policy

Default decision: Generated runtime artifacts are evidence only, never French source truth by default.

Allowed evidence use:
- Read generated runtime files to understand current app behavior.
- Compare generated runtime files against canonical source candidates.
- Use generated runtime files to locate missing source-truth decisions.

Forbidden use:
- Do not copy Spanish L2 tokenization, examples or lesson structure into French.
- Do not treat generated runtime phrase files as canonical unless an explicit approval artifact exists.
- Do not let sourceLocale fields become studyTarget output.

Required before French generation:
- Provide a canonical non-generated source for lessons 9-16 or an explicit read-only evidence approval.
- Exclude ES support files from French target architecture unless mapped by a target-language expert pass.
- Rerun source graph and quality audits after source-truth decisions are recorded.

## Notes

- This audit narrows the generated-file blocker to the files that actually feed source graph phrase nodes.
- Lesson 1-8 generated phrase runtime has a canonical extracted source and is not used as phrase source by the current graph.
- No generated phrase runtime file is currently used as source graph phrase source.
