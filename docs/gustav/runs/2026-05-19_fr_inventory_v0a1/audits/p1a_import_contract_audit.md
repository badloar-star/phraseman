# GUSTAV P1A Import Contract Audit

Run: `2026-05-19_fr_inventory_v0a1`

Status: `PASS`

Generated at: 2026-05-19T21:21:42.400Z

## Summary

- Planned modules: 2
- Planned test files: 2
- Import edges: 3
- Dependency cycles: 0
- Forbidden cycles: 0
- Route shim contracts: 2
- Probe files: 4
- Compile commands: 1
- Compile passed: yes
- Jest import path compatible: yes
- Import safe after approval: yes
- Blockers: 0
- Warnings: 0
- May start French generation: no
- May modify production app files: no

## Module Contracts

### app/study_target.ts

- Role: `study_target_model`
- Imports from: `none`
- Exports: `StudyTarget`, `SourceLocale`, `STUDY_TARGETS`, `SOURCE_LOCALES`, `DEFAULT_STUDY_TARGET`, `STUDY_TARGET_STORAGE_KEY`, `isStudyTarget`, `assertStudyTarget`, `defaultStudyTarget`
- Default route shim: `__StudyTargetRouteShim`
- Forbidden imports: `@react-native-async-storage/async-storage`, `react`, `react-native`, `expo-router`, `./target_storage_keys`

### app/target_storage_keys.ts

- Role: `target_key_builder`
- Imports from: `./study_target`
- Exports: `TargetKeyDomain`, `SourceTargetKeyDomain`, `TARGET_KEY_DOMAINS`, `SOURCE_TARGET_KEY_DOMAINS`, `isStudyTarget`, `assertStudyTarget`, `defaultStudyTarget`, `targetKey`, `sourceTargetKey`, `legacyEnglishKey`, `assertTargetKey`
- Default route shim: `__TargetStorageKeysRouteShim`
- Forbidden imports: `@react-native-async-storage/async-storage`, `react`, `react-native`, `expo-router`, `./study_target_lang_dev`

## Test Import Contracts

- `tests/gustav_surface_target_switch.test.ts` imports `../app/study_target`
  - names: `DEFAULT_STUDY_TARGET`, `SOURCE_LOCALES`, `STUDY_TARGETS`, `STUDY_TARGET_STORAGE_KEY`, `assertStudyTarget`, `defaultStudyTarget`, `isStudyTarget`
  - types: `SourceLocale`, `StudyTarget`
  - must not import: `../app/study_target_lang_dev`, `../app/target_storage_keys`
- `tests/gustav_target_storage_keys.test.ts` imports `../app/target_storage_keys`
  - names: `assertTargetKey`, `legacyEnglishKey`, `sourceTargetKey`, `targetKey`
  - types: `SourceTargetKeyDomain`, `TargetKeyDomain`
  - must not import: `../app/study_target_lang_dev`

## Dependency Edges

- `app/target_storage_keys.ts` -> `app/study_target.ts` (runtime_import)
- `tests/gustav_surface_target_switch.test.ts` -> `app/study_target.ts` (test_import)
- `tests/gustav_target_storage_keys.test.ts` -> `app/target_storage_keys.ts` (test_import)

## Compile Probe

- Dir: `docs/gustav/runs/2026-05-19_fr_inventory_v0a1/audits/p1a_import_contract_probe`
- Exit code: `0`
- Log: `docs/gustav/runs/2026-05-19_fr_inventory_v0a1/audits/p1a_import_contract_probe/compile.log`
- Command: `node_modules/.bin/tsc --target es2018 --module commonjs --moduleResolution node --strict --esModuleInterop --skipLibCheck --noEmit /Users/maksymbabiev/Documents/phraseman/docs/gustav/runs/2026-05-19_fr_inventory_v0a1/audits/p1a_import_contract_probe/app/study_target.ts /Users/maksymbabiev/Documents/phraseman/docs/gustav/runs/2026-05-19_fr_inventory_v0a1/audits/p1a_import_contract_probe/app/target_storage_keys.ts /Users/maksymbabiev/Documents/phraseman/docs/gustav/runs/2026-05-19_fr_inventory_v0a1/audits/p1a_import_contract_probe/tests/gustav_surface_target_switch.test.ts /Users/maksymbabiev/Documents/phraseman/docs/gustav/runs/2026-05-19_fr_inventory_v0a1/audits/p1a_import_contract_probe/tests/gustav_target_storage_keys.test.ts`

Files:
- `docs/gustav/runs/2026-05-19_fr_inventory_v0a1/audits/p1a_import_contract_probe/app/study_target.ts`
- `docs/gustav/runs/2026-05-19_fr_inventory_v0a1/audits/p1a_import_contract_probe/app/target_storage_keys.ts`
- `docs/gustav/runs/2026-05-19_fr_inventory_v0a1/audits/p1a_import_contract_probe/tests/gustav_surface_target_switch.test.ts`
- `docs/gustav/runs/2026-05-19_fr_inventory_v0a1/audits/p1a_import_contract_probe/tests/gustav_target_storage_keys.test.ts`

## Findings

No findings.

## Notes

- This audit compiles only synthetic probe files inside docs/gustav/runs; it does not create app or test files.
- The approved P1A implementation must keep app/study_target.ts dependency-free and app/target_storage_keys.ts dependent only on ./study_target.
- P1A tests must import production contracts through ../app/study_target and ../app/target_storage_keys, never through the dev StudyTargetLang module.
- French generation remains blocked until target isolation and generated-content gates pass.
