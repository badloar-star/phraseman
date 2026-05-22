# GUSTAV Algorithm Audit 34

Date: 2026-05-19

Scope: P1A core contract specification.

## Verdict

Gustav remains `HOLD`.

The first executable implementation slice now has a precise contract for the production `StudyTarget` model and target-safe storage key builder. This prevents the next approved work from inventing target semantics while editing product files.

## What Changed

- Added `scripts/gustav_p1a_core_contract_spec_audit.ts`.
- Generated:
  - `docs/gustav/runs/2026-05-19_fr_inventory_v0a1/audits/p1a_core_contract_spec.json`
  - `docs/gustav/runs/2026-05-19_fr_inventory_v0a1/audits/p1a_core_contract_spec.md`
- Updated `scripts/gustav_readiness_gate.ts` with `RDY-088`.
- Updated `scripts/gustav_validate_run.ts` to validate the P1A core contract spec.

## Contract Result

- Status: `PASS`
- Study targets: `2`
- Source locales: `2`
- Public APIs: `7`
- Domain contracts: `14`
- Allowed target domains: `10`
- Blocked domains: `1`
- Storage shapes: `36`
- First slice files: `4`
- First slice dirty overlaps: `0`
- Test assertions: `6`
- Blockers: `0`
- Warnings: `0`

## Study Target Rules

- Production `StudyTarget` values are `en` and `fr`.
- Default target remains `en` for compatibility.
- Requested new target is `fr`.
- `sourceLocale` remains only the explanation/interface language: `ru` or `uk`.
- Switching source locale must not change the study target.
- Dev-only `StudyTargetLang` values such as `es` must not drive production French.

## Key Builder Rules

The first implementation slice must define these APIs before storage migration work continues:

- `isStudyTarget(value: unknown): value is StudyTarget`
- `assertStudyTarget(value: unknown): StudyTarget`
- `defaultStudyTarget(): 'en'`
- `targetKey(domain: TargetKeyDomain, studyTarget: StudyTarget, id?: string | number): string`
- `sourceTargetKey(domain: SourceTargetKeyDomain, studyTarget: StudyTarget, sourceLocale: SourceLocale, id?: string | number): string`
- `legacyEnglishKey(domain: TargetKeyDomain, id?: string | number): string`
- `assertTargetKey(key: string): string`

Allowed target domains are restricted to lesson progress, lesson session local state, lesson rewards, level exams, trainer practice, personal practice, achievements, cloud sync, flashcards and analytics stats.

`unknown_target_storage` is explicitly blocked.

## Test Contract

The first slice must include tests proving:

- `StudyTarget` accepts only `en` and `fr`, rejects `es`, and defaults to `en`.
- Switching `sourceLocale` from `ru` to `uk` does not change `studyTarget=fr`.
- Target keys are distinct for English and French.
- Source-target keys contain both `studyTarget` and `sourceLocale` without swapping them.
- Legacy English keys are migration-only and cannot produce French keys.
- Raw lesson/trainer/quiz/flashcard v1 keys are rejected outside migration adapters.

## Readiness Impact

- Added `RDY-088: P1A core contract is specified`.
- `RDY-088` passes.
- Readiness remains `HOLD`: `25` checks, `15` passed, `10` failed.
- French generation remains blocked.
- Production apply remains blocked until explicit apply-plan approval.

## Safety Rule

No production app files were changed.

No French content was generated.

This audit defines the first approved-work contract only; it does not implement it in the app.
