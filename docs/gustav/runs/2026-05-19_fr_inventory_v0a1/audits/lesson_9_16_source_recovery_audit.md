# GUSTAV Lesson 9-16 Source Recovery Audit

Run: `2026-05-19_fr_inventory_v0a1`

Status: `HOLD`

Generated at: 2026-05-19T18:39:34.299Z

## Summary

- Current generated phrase count: 400
- Historical commits checked: 5
- Inline source candidates: 2
- Generated-import-only candidates: 3
- Best candidate commit: `18a666c`
- Best candidate phrase count: 400
- Best candidate id overlap: 200
- Best candidate English exact matches by id: 0
- Best candidate English text overlap: 3
- Best candidate current-only ids: 200
- Best candidate-only ids: 200
- Best candidate mismatched ids: 200
- Blockers: 2
- High risks: 0
- Recovery candidate written: yes
- Can promote to canonical without review: no

## Findings

### L916-003: Historical source candidate does not exactly match current runtime

Severity: `blocker`

Best candidate 18a666c has 400 phrases, 200 id overlaps, 0 exact English matches by id and 3 English text overlaps. It is useful recovery evidence, but cannot be promoted automatically.

Files:
- `app/lesson_data_9_16.ts`
- `app/lesson_data_9_16_phrases_es.gen.ts`

### L916-005: Recovered candidate requires explicit source-truth approval

Severity: `blocker`

Even if a historical candidate is strong, Gustav must not treat it as canonical source truth until a review artifact approves the diff against current runtime and English base intent.

Files:
- `app/lesson_data_9_16.ts`
- `app/lesson_data_9_16_phrases_es.gen.ts`

## Candidate Comparison

### 18a666c

- Status: `inline_source_found`
- Phrase count: 400
- Lessons: 9, 10, 11, 12, 13, 14, 15, 16
- Has generated import: no
- Id overlap: 200
- English exact matches by id: 0
- English text overlap: 3
- Current-only ids: 200 (40 shown)
- Candidate-only ids: 200 (40 shown)
- Mismatched ids: 200 (40 shown)
- Score: 806
- Notes:
  - Historical inline LESSON_9_PHRASES through LESSON_16_PHRASES arrays were found in this git blob.
  - 200 current runtime ids are missing from this candidate.
  - 200 candidate ids are not present in current runtime.
  - 200 overlapping ids have different English text.

### e61e990

- Status: `inline_source_found`
- Phrase count: 400
- Lessons: 9, 10, 11, 12, 13, 14, 15, 16
- Has generated import: no
- Id overlap: 200
- English exact matches by id: 0
- English text overlap: 3
- Current-only ids: 200 (40 shown)
- Candidate-only ids: 200 (40 shown)
- Mismatched ids: 200 (40 shown)
- Score: 806
- Notes:
  - Historical inline LESSON_9_PHRASES through LESSON_16_PHRASES arrays were found in this git blob.
  - 200 current runtime ids are missing from this candidate.
  - 200 candidate ids are not present in current runtime.
  - 200 overlapping ids have different English text.

### 20ee88c

- Status: `generated_import_only`
- Phrase count: 0
- Lessons: none
- Has generated import: yes
- Id overlap: 0
- English exact matches by id: 0
- English text overlap: 0
- Current-only ids: 400 (40 shown)
- Candidate-only ids: 0 (0 shown)
- Mismatched ids: 0 (0 shown)
- Score: -1200
- Notes:
  - This blob imports generated runtime data and cannot be canonical by itself.
  - 400 current runtime ids are missing from this candidate.

### b35c93e

- Status: `generated_import_only`
- Phrase count: 0
- Lessons: none
- Has generated import: yes
- Id overlap: 0
- English exact matches by id: 0
- English text overlap: 0
- Current-only ids: 400 (40 shown)
- Candidate-only ids: 0 (0 shown)
- Mismatched ids: 0 (0 shown)
- Score: -1200
- Notes:
  - This blob imports generated runtime data and cannot be canonical by itself.
  - 400 current runtime ids are missing from this candidate.

### 6ca36b8

- Status: `generated_import_only`
- Phrase count: 0
- Lessons: none
- Has generated import: yes
- Id overlap: 0
- English exact matches by id: 0
- English text overlap: 0
- Current-only ids: 400 (40 shown)
- Candidate-only ids: 0 (0 shown)
- Mismatched ids: 0 (0 shown)
- Score: -1200
- Notes:
  - This blob imports generated runtime data and cannot be canonical by itself.
  - 400 current runtime ids are missing from this candidate.

## Required Before French Generation

- Review the historical recovery candidate against current runtime and source graph phrase intent.
- Decide whether to extract a canonical non-generated lesson 9-16 source file from git history.
- If approved, rerun source graph extraction, source graph quality audit, generated source-truth audit, validator and readiness gate.
- Do not use generated Spanish runtime tokens as French curriculum source truth.

## Notes

- This script reads git history and writes recovery evidence only under the Gustav run folder.
- It does not modify production lesson files.
- A recovery candidate can reduce ambiguity, but explicit approval is still required before French generation.
