# GUSTAV P1A Expo Route Safety Audit

Run: `2026-05-19_fr_inventory_v0a1`

Status: `PASS`

Generated at: 2026-05-19T21:07:53.748Z

## Summary

- Planned app utility files: 2
- Route shim required files: 2
- Existing shim evidence files: 2
- Pure module contracts: 2
- Forbidden import rules: 8
- Forbidden pattern rules: 14
- Blockers: 0
- Warnings: 0
- Route safe after approval: yes
- May start French generation: no
- May modify production app files: no

## Existing Shim Evidence

- `app/study_target_lang_dev.ts`: route shim yes, expo-router note yes
- `app/flashcards/storage.ts`: route shim yes, expo-router note yes

## Planned Module Contracts

### app/study_target.ts

- Role: `study_target_model`
- Route shim required: yes
- Default export name: `__StudyTargetRouteShim`
- Pure module required: yes
- Forbidden imports: `@react-native-async-storage/async-storage`, `react`, `react-native`, `expo-router`
- Forbidden patterns: `AsyncStorage.`, `useRouter(`, `<View`, `<Text`, `DeviceEventEmitter`, `ENABLE_DEV_STUDY_TARGET_LANG`, `StudyTargetLang`
- Required named exports: `StudyTarget`, `STUDY_TARGETS`, `DEFAULT_STUDY_TARGET`, `STUDY_TARGET_STORAGE_KEY`, `isStudyTarget`, `assertStudyTarget`, `defaultStudyTarget`

### app/target_storage_keys.ts

- Role: `target_key_builder`
- Route shim required: yes
- Default export name: `__TargetStorageKeysRouteShim`
- Pure module required: yes
- Forbidden imports: `@react-native-async-storage/async-storage`, `react`, `react-native`, `expo-router`
- Forbidden patterns: `AsyncStorage.`, `useRouter(`, `<View`, `<Text`, `DeviceEventEmitter`, `ENABLE_DEV_STUDY_TARGET_LANG`, `StudyTargetLang`
- Required named exports: `TargetKeyDomain`, `SourceTargetKeyDomain`, `isStudyTarget`, `assertStudyTarget`, `defaultStudyTarget`, `targetKey`, `sourceTargetKey`, `legacyEnglishKey`, `assertTargetKey`

## Findings

No findings.

## Notes

- P1A app utility files live under app/, so they must include explicit default route shims.
- P1A core modules must stay pure: no React, React Native, AsyncStorage or expo-router imports.
- StudyTargetContext and dev StudyTargetLang bridging remains deferred to P1B.
- This audit does not create app files or French content.
