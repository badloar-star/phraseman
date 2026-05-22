# GUSTAV Post-P1A Readiness Projection Audit

Run: `2026-05-19_fr_inventory_v0a1`

Status: `PASS`

Generated at: 2026-05-20T04:58:28.474Z

## Summary

- Current readiness checks: 40
- Current failed checks: 10
- Current generation blockers: 8
- Current apply blockers: 10
- Projected failed checks after P1A: 10
- Projected generation blockers after P1A: 8
- Projected apply blockers after P1A: 10
- Checks resolved by P1A: 0
- Out-of-scope failed checks: 9
- P1A scope files: 4
- Projection passed: yes
- P1A does not unlock French generation: yes
- P1A does not unlock broad apply: yes
- Can apply now: no
- May start French generation after P1A: no
- May modify production app files: no
- Production files still absent: yes
- Blockers: 0
- Warnings: 0

## Projected Failed Checks

### RDY-002: Run verdict allows generation

- Projected after P1A: `FAIL`
- P1A coverage: `not_applicable`
- Blocks: `generation`, `apply`
- Reason: The run verdict remains HOLD until every generation/apply blocker is cleared; P1A alone does not change the run verdict to PASS.
- Required after P1A:
  - Resolve run verdict blockers or keep working in architecture/research mode.

### RDY-010: Storage is target-safe

- Projected after P1A: `FAIL`
- P1A coverage: `none`
- Blocks: `generation`, `apply`
- Reason: P1A does not migrate lesson, quiz, trainer, flashcard, achievement or stats storage keys; target-sensitive and unknown-scope storage records remain.
- Required after P1A:
  - Introduce production target key builder.
  - Move legacy English learning state into en-only compatibility adapters.
  - Reduce target-sensitive unknown storage records to zero.

### RDY-020: Cloud sync is target-safe

- Projected after P1A: `FAIL`
- P1A coverage: `none`
- Blocks: `generation`, `apply`
- Reason: P1A does not change cloud restore/merge paths or move target-sensitive progress under progress/targets/{studyTarget}.
- Required after P1A:
  - Map cloud learning state under progress/targets/{studyTarget}.
  - Split mixed cloud payloads by field.
  - Prove legacy cloud state hydrates en only.

### RDY-021: Mixed cloud payloads are split

- Projected after P1A: `FAIL`
- P1A coverage: `none`
- Blocks: `generation`, `apply`
- Reason: P1A does not split mixed cloud payload fields for achievements_state, daily_stats, user_stats_v1 or stats_daily_breakdown_v1.
- Required after P1A:
  - Split achievements_state, daily_stats, user_stats_v1 and stats_daily_breakdown_v1 by global/target policy.

### RDY-030: Achievements are globally/target classified

- Projected after P1A: `FAIL`
- P1A coverage: `none`
- Blocks: `generation`, `apply`
- Reason: P1A does not migrate achievement state or resolve mixed/global/target achievement policy decisions.
- Required after P1A:
  - Implement achievement state split or policy decisions before French can affect achievements.

### RDY-040: Local-only and cloud-synced target keys are decided

- Projected after P1A: `FAIL`
- P1A coverage: `none`
- Blocks: `generation`, `apply`
- Reason: P1A does not implement local/cloud sync decisions for the target-sensitive local keys missing from cloud mapping.
- Required after P1A:
  - Implement target-scoped local-only keys and target cloud buckets according to the decision table.

### RDY-050: Production target key architecture exists

- Projected after P1A: `FAIL`
- P1A coverage: `primitive_only`
- Blocks: `generation`, `apply`
- Reason: P1A adds the production StudyTarget and target key primitives, but it does not migrate the 348 raw target-sensitive storage records or wire the primitives into consumers.
- Required after P1A:
  - Create production StudyTarget model.
  - Create target_storage_keys builder.
  - Route highest-risk lesson/trainer/quiz/flashcard stores through target-aware APIs.

### RDY-060: User-facing surfaces are target-safe

- Projected after P1A: `FAIL`
- P1A coverage: `none`
- Blocks: `generation`, `apply`
- Reason: P1A does not modify user-facing routes, lesson runtimes, trainer, flashcards, achievements, progress or My Practice surfaces.
- Required after P1A:
  - Add route-level target-aware adapters for lesson, quiz, trainer, flashcards, achievements and progress surfaces.
  - Isolate dev StudyTargetLang from production StudyTarget.

### RDY-080: Generated content audit passed

- Projected after P1A: `FAIL`
- P1A coverage: `not_applicable`
- Blocks: `apply`
- Reason: P1A is an architecture primitive slice only; it does not generate or audit French content.
- Required after P1A:
  - After generation, audit French content for grammar, sourceLocale coverage, ids, placeholders, lesson order and runtime shape.

### RDY-090: Apply plan is approved

- Projected after P1A: `FAIL`
- P1A coverage: `not_applicable`
- Blocks: `apply`
- Reason: P1A exact approval would authorize only the four-file minimal packet, not the broad 83-file apply plan.
- Required after P1A:
  - Create explicit apply plan and get explicit approval before touching production app files.

## Findings

No findings.

## Notes

- This audit is a projection only; it does not apply P1A and does not write production app/test files.
- P1A is useful as a first target-isolation primitive, but it is not a French generation unlock.
- RDY-050 is intentionally classified as primitive_only after P1A because raw target-sensitive storage consumers still need migration.
- French generation remains blocked after projected P1A.
