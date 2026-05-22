# GUSTAV Algorithm Audit 41

Date: 2026-05-19

Scope: P1A target key collision safety.

## Verdict

Gustav remains `HOLD`.

The future P1A `target_storage_keys.ts` implementation now has an explicit key encoding and collision policy. This closes the risk that ids containing separators, URL/path characters or whitespace could create ambiguous storage keys.

## What Changed

- Added `scripts/gustav_p1a_key_collision_audit.ts`.
- Generated:
  - `docs/gustav/runs/2026-05-19_fr_inventory_v0a1/audits/p1a_key_collision_audit.json`
  - `docs/gustav/runs/2026-05-19_fr_inventory_v0a1/audits/p1a_key_collision_audit.md`
- Updated `scripts/gustav_readiness_gate.ts` with `RDY-096`.
- Updated `scripts/gustav_validate_run.ts` to validate the P1A key collision audit.

## Collision Result

- Status: `PASS`
- Target domains: `10`
- Study targets: `2`
- Source locales: `2`
- Sample ids: `8`
- Encoded id samples: `8`
- Generated keys: `252`
- Unique keys: `252`
- Collisions: `0`
- Separator leak checks: `232`
- Separator leaks: `0`
- Reserved patterns: `8`
- Implementation rules: `6`
- Required test additions: `3`
- Blockers: `0`
- Warnings: `0`

## Encoding Policy

P1A key builder must:

- use `::` as the only segment separator
- encode dynamic ids with `encodeURIComponent(String(id))`
- never concatenate raw ids into target-sensitive keys
- treat `undefined` id as omitted
- reject explicit empty-string ids
- keep `StudyTarget` and `sourceLocale` as typed enum segments
- keep `legacyEnglishKey` visibly English-only and migration-only

## Required Test Additions

The P1A storage key test must include:

- `P1A-KEY-ID-ENCODING`
- `P1A-KEY-COLLISION-MATRIX`
- `P1A-KEY-EMPTY-ID-REJECTION`

These extend `tests/gustav_target_storage_keys.test.ts`.

## Readiness Impact

- Added `RDY-096: P1A target keys are collision-safe`.
- `RDY-096` passes.
- Readiness remains `HOLD`: `32` checks, `22` passed, `10` failed.
- French generation remains blocked.
- Production apply remains blocked until explicit approval.

## Safety Rule

No production app files were changed.

No test files were created in `tests/`.

No French content was generated.
