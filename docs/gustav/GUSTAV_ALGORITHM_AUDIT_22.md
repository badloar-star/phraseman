# GUSTAV Algorithm Audit 22

Date: 2026-05-19

Scope: lesson 9-16 source-truth recovery, validator integration, readiness hardening.

## Verdict

Gustav remains `HOLD`.

This audit found useful recovery evidence, but it also proved that lessons 9-16 still cannot be used as approved French source material.

## What Changed

- Added `scripts/gustav_lesson_9_16_source_recovery_audit.ts`.
- The audit reads git history for `app/lesson_data_9_16.ts` and compares historical inline phrase arrays against current generated runtime `app/lesson_data_9_16_phrases_es.gen.ts`.
- Wrote a review-only recovery candidate under the run folder:
  - `docs/gustav/runs/2026-05-19_fr_inventory_v0a1/source_graph/recovery/lesson_9_16_historical_recovery_candidate.json`
  - `docs/gustav/runs/2026-05-19_fr_inventory_v0a1/source_graph/recovery/lesson_9_16_historical_recovery_candidate.md`
- Connected the new audit to `scripts/gustav_validate_run.ts`.
- Added readiness gate `RDY-073` so French generation stays blocked until the lesson 9-16 recovery candidate is reviewed and approved.

## Findings

The recovery audit checked 5 git commits.

It found 2 historical inline candidates:

- `18a666c`
- `e61e990`

Best candidate: `18a666c`.

Comparison against current runtime:

- Current generated lesson 9-16 phrase entries: `400`
- Best candidate phrase entries: `400`
- ID overlap: `200`
- Exact English matches by ID: `0`
- English text overlap: `3`
- Current-only IDs: `200`
- Candidate-only IDs: `200`

This means the old inline source is valuable evidence, but it is not a drop-in canonical source for the current app state.

## Closed Weakness

Before this audit, the blocker was too vague: "lessons 9-16 have generated runtime source only."

Now Gustav has a sharper, safer diagnosis:

- A historical non-generated candidate exists.
- It does not match current runtime closely enough.
- It must be reviewed before any canonical source-truth approval.
- Generated Spanish runtime tokens remain forbidden as French curriculum source truth.

## Gate Results

Recovery audit:

- Status: `HOLD`
- Blockers: `2`
- High risks: `0`

Run validator:

- Status: `PASS`
- Checks: `15541`
- Blockers: `0`
- Warnings: `0`

Readiness gate:

- Decision: `HOLD`
- Checks: `16`
- Passed: `2`
- Failed: `14`
- Generation blockers: `12`
- Apply blockers: `14`

## Current Blockers

French generation remains blocked by:

- target-safe storage and cloud sync migration;
- achievement/global-target split;
- route and surface isolation;
- source graph approval;
- generated source-truth policy;
- lesson 9-16 recovery candidate review and approval;
- absence of generated-content audit and apply plan.

## Next Work

1. Review/reconcile the lesson 9-16 recovery candidate against current runtime and source graph phrase intent.
2. Decide whether to extract an approved canonical lesson 9-16 source file from history or keep the current generated runtime as read-only evidence with explicit approval.
3. Continue production StudyTarget and target-key adapter architecture before French content generation.

## Safety Rule

No production app files were changed by this audit.

Gustav still may work only in architecture, inventory, source graph, English audit and research modes.
