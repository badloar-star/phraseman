# GUSTAV Generated Support Isolation Audit

Run: `2026-05-19_fr_inventory_v0a1`

Status: `PASS`

Generated at: 2026-05-19T19:41:46.643Z

## Summary

- Generated support files: 5
- Referenced in source graph: 0
- Listed as source files: 0
- Isolated support files: 5
- Blockers: 0
- High risks: 0
- Can exclude from French source truth: yes

## Decisions

### app/lesson_intro_screens_es_l2.ts

- Decision: `exclude_from_french_source_truth`
- Severity: `info`
- Isolated from source graph: yes
- Source graph refs: 0
- Listed as source file: no
- Observed as app runtime evidence only; not used by extracted source graph nodes.

### app/quiz_data_es_l2.ts

- Decision: `exclude_from_french_source_truth`
- Severity: `info`
- Isolated from source graph: yes
- Source graph refs: 0
- Listed as source file: no
- Observed as app runtime evidence only; not used by extracted source graph nodes.

### app/lesson_prepositions_es_segment01.ts

- Decision: `exclude_from_french_source_truth`
- Severity: `info`
- Isolated from source graph: yes
- Source graph refs: 0
- Listed as source file: no
- Observed as app runtime evidence only; not used by extracted source graph nodes.

### app/lesson_prepositions_es_segment02.ts

- Decision: `exclude_from_french_source_truth`
- Severity: `info`
- Isolated from source graph: yes
- Source graph refs: 0
- Listed as source file: no
- Observed as app runtime evidence only; not used by extracted source graph nodes.

### app/lesson_prepositions_es_segment03.ts

- Decision: `exclude_from_french_source_truth`
- Severity: `info`
- Isolated from source graph: yes
- Source graph refs: 0
- Listed as source file: no
- Observed as app runtime evidence only; not used by extracted source graph nodes.

## Findings

### GSI-000: Generated support files are isolated

Severity: `info`

5 generated support file(s) are observed only as runtime evidence and are not source graph inputs.

Source refs:
- `app/lesson_intro_screens_es_l2.ts:1` (runtime_generated)
- `app/quiz_data_es_l2.ts:1` (runtime_generated)
- `app/lesson_prepositions_es_segment01.ts:1` (runtime_generated)
- `app/lesson_prepositions_es_segment02.ts:1` (runtime_generated)
- `app/lesson_prepositions_es_segment03.ts:1` (runtime_generated)

## Policy

Allowed use:
- Keep generated ES support files as observed runtime evidence for audits.
- Use them only to prove what must not be copied into French target architecture.

Forbidden use:
- Do not derive French lesson order, intro screens, quizzes or preposition packs from generated ES support files.
- Do not copy ES support text, tokenization or quiz distractors into French output.

Required before French generation:
- Use canonical English source graph nodes for French generation input.
- Design French-specific support content through target-language research and generated-content audit later.

## Notes

- This audit closes the source-graph-specific SG-004 risk only when generated support files are not source graph inputs.
- It does not approve French generation by itself.
