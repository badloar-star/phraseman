# GUSTAV P1A Core Contract Spec Audit

Run: `2026-05-19_fr_inventory_v0a1`

Status: `PASS`

Generated at: 2026-05-19T20:33:38.581Z

## Summary

- Study targets: 2
- Source locales: 2
- Public APIs: 7
- Domain contracts: 14
- Allowed target domains: 10
- Blocked domains: 1
- Storage shapes: 36
- First slice files: 4
- First slice dirty overlaps: 0
- Test assertions: 6
- Blockers: 0
- Warnings: 0
- Can implement P1A after approval: yes
- May start French generation: no
- May modify production app files: no

## Study Target Contract

- Type: `StudyTarget`
- Values: `en`, `fr`
- Default: `en`
- Requested target: `fr`
- Storage key: `study_target_v1`
- Must not depend on sourceLocale: yes
- Must not use dev StudyTargetLang: yes

## Key Builder APIs

- `isStudyTarget(value: unknown): value is StudyTarget`: Accept only 'en' and 'fr' production study targets.
- `assertStudyTarget(value: unknown): StudyTarget`: Fail closed when target is missing or unsupported.
- `defaultStudyTarget(): 'en'`: Keep existing English behavior as the default compatibility target.
- `targetKey(domain: TargetKeyDomain, studyTarget: StudyTarget, id?: string | number): string`: Build target-scoped keys for learning state.
- `sourceTargetKey(domain: SourceTargetKeyDomain, studyTarget: StudyTarget, sourceLocale: SourceLocale, id?: string | number): string`: Build keys where feedback/copy state needs both target and sourceLocale dimensions.
- `legacyEnglishKey(domain: TargetKeyDomain, id?: string | number): string`: Name legacy English fallback keys for migration/read-compat modules only.
- `assertTargetKey(key: string): string`: Reject new target-sensitive raw storage keys outside migration adapters.

## Allowed Target Domains

- `lesson_progress`
- `lesson_session_local`
- `lesson_rewards`
- `level_exams`
- `trainer_practice`
- `personal_practice`
- `achievements`
- `cloud_sync`
- `flashcards`
- `analytics_stats`

## Blocked Domains

- `unknown_target_storage`

## First Slice Files

- `app/study_target.ts`
- `app/target_storage_keys.ts`
- `tests/gustav_surface_target_switch.test.ts`
- `tests/gustav_target_storage_keys.test.ts`

## Test Assertions

- `P1A-STUDY-TARGET-VALUES` in `tests/gustav_surface_target_switch.test.ts`: StudyTarget accepts 'en' and 'fr', rejects dev-only 'es', and defaults to 'en'.
- `P1A-SOURCE-LOCALE-SEPARATION` in `tests/gustav_surface_target_switch.test.ts`: Switching sourceLocale ru -> uk does not change studyTarget=fr.
- `P1A-TARGET-KEY-DISTINCTNESS` in `tests/gustav_target_storage_keys.test.ts`: targetKey returns distinct en/fr keys for every allowed target domain.
- `P1A-SOURCE-TARGET-KEY-SHAPE` in `tests/gustav_target_storage_keys.test.ts`: sourceTargetKey includes studyTarget and sourceLocale dimensions without swapping them.
- `P1A-LEGACY-ENGLISH-FALLBACK-LIMIT` in `tests/gustav_target_storage_keys.test.ts`: legacyEnglishKey is English-only migration metadata and never produces a French target key.
- `P1A-RAW-KEY-GUARD` in `tests/gustav_target_storage_keys.test.ts`: assertTargetKey rejects raw lesson/trainer/quiz/flashcard v1 keys.

## Findings

No findings.

## Notes

- This contract spec is a planning artifact only; it does not write product files.
- P1A remains blocked until the apply plan is explicitly approved.
- French generation remains blocked until target-isolation implementation and generated-content audit pass.
