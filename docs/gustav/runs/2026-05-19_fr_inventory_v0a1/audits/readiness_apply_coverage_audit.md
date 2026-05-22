# GUSTAV Readiness Apply Coverage Audit

Run: `2026-05-19_fr_inventory_v0a1`

Status: `PASS`

Generated at: 2026-05-19T20:09:54.979Z

## Summary

- Failed readiness checks: 10
- Plan-required checks: 7
- Covered checks: 8
- Deferred checks: 2
- Missing checks: 0
- Required adapters: 12
- Covered adapters: 12
- Missing adapters: 0
- Apply-plan files referenced: 78
- Required test evidence: 20
- Covered test evidence: 20
- Missing test evidence: 0
- Required file evidence: 22
- Covered file evidence: 21
- Missing file evidence: 0
- Blockers: 0
- Warnings: 0
- Apply plan covers failed readiness checks: yes
- May start French generation: no
- May modify production app files: no

## Decisions

### RDY-002: Run verdict allows generation

- Coverage: `deferred`
- Policy: `meta_verdict`
- Blocks: `generation`, `apply`
- Covered adapters: `none`
- Apply-plan files: 0
- Note: Run verdict remains HOLD until the concrete readiness blockers are implemented and re-audited.

### RDY-010: Storage is target-safe

- Coverage: `covered`
- Policy: `plan_required`
- Blocks: `generation`, `apply`
- Covered adapters: `target_storage_key_builder`, `legacy_english_compat`, `raw_storage_guard`
- Apply-plan files: 48
- Note: Storage blockers must be covered by target keys, legacy English migration and raw-key guard tests.

### RDY-020: Cloud sync is target-safe

- Coverage: `covered`
- Policy: `plan_required`
- Blocks: `generation`, `apply`
- Covered adapters: `cloud_sync_target_buckets`, `legacy_english_compat`, `target_stats_store`
- Apply-plan files: 32
- Note: Cloud sync blockers require target buckets, legacy hydration rules and target/global stats separation.

### RDY-021: Mixed cloud payloads are split

- Coverage: `covered`
- Policy: `plan_required`
- Blocks: `generation`, `apply`
- Covered adapters: `cloud_sync_target_buckets`, `achievement_progress_store`, `target_stats_store`
- Apply-plan files: 8
- Note: Mixed cloud payloads must be split by achievement/global stats policy before apply.

### RDY-030: Achievements are globally/target classified

- Coverage: `covered`
- Policy: `plan_required`
- Blocks: `generation`, `apply`
- Covered adapters: `achievement_progress_store`
- Apply-plan files: 3
- Note: Achievement taxonomy blockers require target/global achievement state implementation.

### RDY-040: Local-only and cloud-synced target keys are decided

- Coverage: `covered`
- Policy: `plan_required`
- Blocks: `generation`, `apply`
- Covered adapters: `cloud_sync_target_buckets`, `lesson_session_store`, `trainer_practice_store`, `personal_practice_store`, `flashcards_target_store`
- Apply-plan files: 25
- Note: Local/cloud decisions need concrete stores for local-only target state and synced target state.

### RDY-050: Production target key architecture exists

- Coverage: `covered`
- Policy: `plan_required`
- Blocks: `generation`, `apply`
- Covered adapters: `production_study_target`, `target_storage_key_builder`, `legacy_english_compat`, `raw_storage_guard`
- Apply-plan files: 53
- Note: Production target architecture needs a separate StudyTarget model, key builder and guard rails.

### RDY-060: User-facing surfaces are target-safe

- Coverage: `covered`
- Policy: `plan_required`
- Blocks: `generation`, `apply`
- Covered adapters: `route_surface_integration`, `production_study_target`
- Apply-plan files: 41
- Note: User-facing surfaces must receive production studyTarget without confusing it with sourceLocale.

### RDY-080: Generated content audit passed

- Coverage: `deferred`
- Policy: `post_generation`
- Blocks: `apply`
- Covered adapters: `none`
- Apply-plan files: 0
- Missing file evidence: `generated_content_audit`
- Note: Generated content audit is intentionally deferred until after generation; it must block production apply.

### RDY-090: Apply plan is approved

- Coverage: `covered`
- Policy: `approval_required`
- Blocks: `apply`
- Covered adapters: `none`
- Apply-plan files: 0
- Note: Apply approval must stay explicit; coverage can prepare the packet but cannot approve it.

## Findings

No findings.

## Notes

- This audit validates coverage of failed readiness checks by the migration adapter plan and apply plan.
- A PASS here does not approve production writes and does not allow French generation.
- RDY-080 remains intentionally deferred until generated French content exists.
- RDY-090 remains intentionally approval-gated until the user explicitly approves the apply plan.
