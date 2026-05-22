# GUSTAV Lesson 9-16 Reconciliation Audit

Run: `2026-05-19_fr_inventory_v0a1`

Status: `HOLD`

Generated at: 2026-05-19T18:48:22.705Z

## Summary

- Current phrase count: 400
- Candidate phrase count: 400
- Lessons compared: 8
- Total id overlap: 200
- Total exact English matches by id: 0
- Same-lesson English text overlap: 3
- Current-only ids: 200
- Candidate-only ids: 200
- Candidate missing ids: 150
- Candidate legacy ids: 50
- Candidate duplicate ids: 0
- Candidate invalid canonical ids: 200
- Blocker lessons: 8
- High-risk lessons: 0
- Blockers: 4
- High risks: 0
- Can auto-promote historical candidate: no
- Recommended policy: `do_not_auto_merge`

## Findings

### L916R-001: Historical candidate has zero exact English matches by id

Severity: `blocker`

The recovered historical candidate cannot be treated as the source for current runtime because no overlapping id has the same English text.

Files:
- `docs/gustav/runs/2026-05-19_fr_inventory_v0a1/source_graph/source_graph.json`
- `docs/gustav/runs/2026-05-19_fr_inventory_v0a1/source_graph/recovery/lesson_9_16_historical_recovery_candidate.json`

### L916R-002: Historical candidate has invalid or missing phrase ids

Severity: `blocker`

200 candidate entries do not match the current canonical lessonN_phrase_M id pattern. This includes 150 missing ids and 50 legacy ids.

Files:
- `docs/gustav/runs/2026-05-19_fr_inventory_v0a1/source_graph/recovery/lesson_9_16_historical_recovery_candidate.json`

### L916R-003: Every lesson 9-16 needs manual source reconciliation

Severity: `blocker`

8 lessons have blocker-level divergence between the historical candidate and current runtime.

Files:
- `app/lesson_data_9_16.ts`
- `app/lesson_data_9_16_phrases_es.gen.ts`

### L916R-004: Automatic source promotion is forbidden

Severity: `blocker`

The safe policy is do_not_auto_merge: either approve a reviewed canonical extraction or keep current generated runtime as read-only evidence with explicit source-truth decision.

Files:
- `docs/gustav/runs/2026-05-19_fr_inventory_v0a1/audits/lesson_9_16_source_recovery_audit.md`

## Lesson Breakdown

### Lesson 9

- Risk: `blocker`
- Current/candidate count: 50/50
- Id overlap: 50
- Exact English matches by id: 0
- Same-lesson text overlap: 0
- Current-only ids: 0
- Candidate-only ids: 0
- Missing ids: 0
- Legacy ids: 0
- Duplicate ids: 0
- Invalid canonical ids: 0
- Recommendation: Do not auto-promote this lesson. It needs source-truth review against current runtime and lesson intent.

### Lesson 10

- Risk: `blocker`
- Current/candidate count: 50/50
- Id overlap: 50
- Exact English matches by id: 0
- Same-lesson text overlap: 0
- Current-only ids: 0
- Candidate-only ids: 0
- Missing ids: 0
- Legacy ids: 0
- Duplicate ids: 0
- Invalid canonical ids: 0
- Recommendation: Do not auto-promote this lesson. It needs source-truth review against current runtime and lesson intent.

### Lesson 11

- Risk: `blocker`
- Current/candidate count: 50/50
- Id overlap: 50
- Exact English matches by id: 0
- Same-lesson text overlap: 0
- Current-only ids: 0
- Candidate-only ids: 0
- Missing ids: 0
- Legacy ids: 0
- Duplicate ids: 0
- Invalid canonical ids: 0
- Recommendation: Do not auto-promote this lesson. It needs source-truth review against current runtime and lesson intent.

### Lesson 12

- Risk: `blocker`
- Current/candidate count: 50/50
- Id overlap: 50
- Exact English matches by id: 0
- Same-lesson text overlap: 0
- Current-only ids: 0
- Candidate-only ids: 0
- Missing ids: 0
- Legacy ids: 0
- Duplicate ids: 0
- Invalid canonical ids: 0
- Recommendation: Do not auto-promote this lesson. It needs source-truth review against current runtime and lesson intent.

### Lesson 13

- Risk: `blocker`
- Current/candidate count: 50/50
- Id overlap: 0
- Exact English matches by id: 0
- Same-lesson text overlap: 1
- Current-only ids: 50
- Candidate-only ids: 50
- Missing ids: 50
- Legacy ids: 0
- Duplicate ids: 0
- Invalid canonical ids: 50
- Recommendation: Do not auto-promote this lesson. It needs source-truth review against current runtime and lesson intent.

### Lesson 14

- Risk: `blocker`
- Current/candidate count: 50/50
- Id overlap: 0
- Exact English matches by id: 0
- Same-lesson text overlap: 2
- Current-only ids: 50
- Candidate-only ids: 50
- Missing ids: 50
- Legacy ids: 0
- Duplicate ids: 0
- Invalid canonical ids: 50
- Recommendation: Do not auto-promote this lesson. It needs source-truth review against current runtime and lesson intent.

### Lesson 15

- Risk: `blocker`
- Current/candidate count: 50/50
- Id overlap: 0
- Exact English matches by id: 0
- Same-lesson text overlap: 0
- Current-only ids: 50
- Candidate-only ids: 50
- Missing ids: 50
- Legacy ids: 0
- Duplicate ids: 0
- Invalid canonical ids: 50
- Recommendation: Do not auto-promote this lesson. It needs source-truth review against current runtime and lesson intent.

### Lesson 16

- Risk: `blocker`
- Current/candidate count: 50/50
- Id overlap: 0
- Exact English matches by id: 0
- Same-lesson text overlap: 0
- Current-only ids: 50
- Candidate-only ids: 50
- Missing ids: 0
- Legacy ids: 50
- Duplicate ids: 0
- Invalid canonical ids: 50
- Recommendation: Do not auto-promote this lesson. It needs source-truth review against current runtime and lesson intent.

## Required Before French Generation

- Choose a lesson 9-16 source-truth policy: reviewed canonical extraction or explicit read-only runtime evidence approval.
- If canonical extraction is chosen, create a non-generated source with stable current ids and current English/RU/UK prompts.
- Rerun source graph, source graph quality, generated source-truth, reconciliation, validator and readiness gates.

## Notes

- This audit explains why the historical recovery candidate is useful evidence but unsafe as direct source truth.
- It does not write to app files.
