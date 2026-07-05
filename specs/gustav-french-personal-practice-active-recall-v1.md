# Gustav French Personal Practice / Active Recall V1 Spec

## Objective

Close the French `studyTarget=fr` Personal Practice / Active Recall readiness section without audio and without production activation. The build must prove English blueprint parity by surface shape, French target isolation, server-pack/runtime/admin/storage gates, focused tests, and a final readiness handoff with `activationApproved=false`.

## Source-Of-Truth Files Inspected

- `.agents/skills/gustav-build/references/phrase-man-french-blueprint.md`
- `specs/gustav-french-english-blueprint-parity.md`
- `docs/gustav/state.json`
- `app/personal_practice_training_ids.ts`
- `app/diagnosis_trainings.ts`
- `app/personal_practice_lesson_router.ts`
- `app/personal_practice_target_gate.ts`
- `app/active_recall.ts`
- `app/review.tsx`
- `app/trainer_store.ts`
- `app/trainer_practice_prefetch.ts`
- `app/trainer_target_gate.ts`
- `app/french_personal_practice_remote_runtime.ts`
- `app/french_target_remote_registration.ts`
- `app/course_pack_manifest.ts`
- `app/target_storage_keys.ts`
- `app/cloud_sync.ts`
- `app/_admin_settings_testers.tsx`
- `admin/personal-trainings.js`
- `tests/gustav_personal_practice_target_isolation.test.ts`
- `tests/gustav_srs_review_target_isolation.test.ts`
- `tests/gustav_french_trainer_target_gate.test.ts`
- `tests/study_target_server_prefetch_contract.test.ts`

## English Blueprint Facts

- English personal practice uses `DIAGNOSIS_TRAINING_IDS` and hard-coded `diagnosis_training_*` modules through `app/diagnosis_trainings.ts`.
- English `/problem_coach` can resolve diagnosis trainings through `getDiagnosisTrainingForTarget(id, 'en')`.
- Active Recall/SRS stores repeated mistakes in `active_recall_items` and feeds `/review` and trainer sessions.
- Trainer practice uses local mistake queues, SRS timing, dashboard counts, smart mix, and POS/mistake analytics.
- Admin/tester tools can seed or inspect English diagnosis and trainer state.

## Current French Facts

- `getDiagnosisTrainingForTarget(id, 'fr')` returns `null`; `getAllDiagnosisTrainingsForTarget('fr')` returns `[]`.
- `personalPracticeCoachGateForTarget('fr')` is closed with reason `french_personal_training_source_gate` and route `/problem_coach` blocked.
- French SRS/Trainer reads are open only through target-isolated state and remote `personal_practice` payloads, not English diagnosis lessons.
- `french_personal_practice_remote_runtime.ts` accepts only payloads with `studyTarget='fr'`, `surface='personal_practice'`, source locale `ru|uk`, and target-language answers in French.
- French storage keys are target-scoped for trainer/recall/mistakes and source-locale-scoped for personal practice.
- `cloud_sync.ts` includes French Active Recall and source-locale personal-practice keys.
- `course_pack_manifest.ts` and `french_target_remote_registration.ts` include the `personal_practice` surface under `course-packs/fr/{ru|uk}/personal_practice/...`.

## Gap List

- There is no dedicated French Personal Practice / Active Recall readiness artifact tying together English blueprint facts, runtime gates, server-pack gates, admin/storage gates, and production HOLD.
- Existing tests cover isolation and runtime behavior, but no single Gustav handoff proves this section is closed as a no-audio readiness package.
- French diagnosis coach banks are not production materialized; this must stay a named HOLD instead of being hidden behind a green summary.

## Requirements

### FR-PPAR-001 English Blueprint Parity Audit

Create a generated audit proving:

- English diagnosis training count is read from `DIAGNOSIS_TRAINING_IDS`.
- French does not reuse English diagnosis trainings.
- French has the same product surfaces by shape: diagnosis coach gate, Active Recall/SRS, trainer queues, mistake analytics, POS profile, cloud sync, admin/tester gate, and server-pack surface.

### FR-PPAR-002 Runtime Gate

Create a generated runtime gate proving:

- Active Recall uses `activeRecallItemsKey(studyTarget)`.
- `/review` passes `studyTarget` into due-item reads, trainer reads, mistake logs, and `markReviewed`.
- French Active Recall skips legacy English correction rewrites.
- French trainer reads merge `getCachedFrenchRemotePersonalPractice`.
- French remote personal-practice runtime validates `studyTarget`, `sourceLocale`, `surface`, and `targetLanguageAnswerRequired`.

### FR-PPAR-003 Server-Pack Gate

Create a generated server-pack gate proving:

- `personal_practice` is in `COURSE_PACK_SURFACES`.
- `personal_practice` is in `FRENCH_TARGET_REMOTE_SURFACES`.
- Registration paths are source-locale scoped under `course-packs/fr/ru|uk/personal_practice/`.
- Payload hash verification is required before runtime accepts a remote payload.
- No upload/apply/activation is performed.

### FR-PPAR-004 Admin / Storage / Cloud Gate

Create a generated admin/storage/cloud gate proving:

- French `/problem_coach` stays blocked in admin/tester routing until required evidence exists.
- English admin personal trainings remain English-only and must not become a French write path.
- French Active Recall, trainer store, mistake log, POS mastery, personal practice progress/free-access/resolved-training keys are scoped by target and source locale as applicable.
- French cloud sync includes Active Recall and source-locale personal-practice keys.

### FR-PPAR-005 Final Readiness Handoff

Create a final handoff artifact with:

- `activationApproved: false`
- `productionReady: false`
- `serverUploadAllowed: false`
- `runtimeApplyAllowed: false`
- `adminWritesOpened: false`
- `audioRequired: false`
- PASS/HOLD requirement matrix
- exact tests to run
- exact blockers that keep production on HOLD

## Edge Cases

- French `studyTarget=fr` must not read English legacy keys such as `active_recall_items`, `trainer_store_v1`, `mistake_log_v1`, or `diagnosis_training_progress_v1:<id>`.
- RU and UK personal-practice state must not share one key.
- Unsupported source locales must not produce French server-pack registrations.
- Server in-pack paths must not escape the source-locale pack container.
- English dev seeds must not seed French Active Recall or trainer queues.

## Gates / Tests

Build:

```bash
node scripts/gustav_build_fr_personal_practice_active_recall_v1.mjs
```

Focused verification:

```bash
npx jest --runTestsByPath tests/gustav_fr_personal_practice_active_recall_v1.test.ts tests/gustav_personal_practice_target_isolation.test.ts tests/gustav_srs_review_target_isolation.test.ts tests/gustav_french_trainer_target_gate.test.ts tests/study_target_server_prefetch_contract.test.ts --no-cache --runInBand
```

## Files / Scripts / Docs To Edit

- `specs/gustav-french-personal-practice-active-recall-v1.md`
- `scripts/gustav_build_fr_personal_practice_active_recall_v1.mjs`
- `tests/gustav_fr_personal_practice_active_recall_v1.test.ts`
- generated artifacts under `docs/gustav/generated/fr/personal_practice/`

Do not edit French lesson files for this spec.

## Definition Of Done

- Spec exists and names exact source files and gates.
- Builder emits all required artifacts under `docs/gustav/generated/fr/personal_practice/`.
- Artifacts prove English blueprint shape parity, French runtime isolation, server-pack path/hash gates, admin/storage/cloud gates, and final HOLD readiness.
- Focused Jest suite passes.
- `activationApproved=true` appears nowhere in generated Personal Practice / Active Recall artifacts.
- No audio generation, lesson mutation, upload, app apply, admin write opening, or production activation is performed.

## Production HOLD Blockers

- `french_personal_practice_training_bank` is still required before `/problem_coach` can open.
- `french_personal_practice_mistake_taxonomy_review` is still required before coach diagnosis is production-ready.
- `french_pos_workout_profile_review` is still required before POS-driven practice is production-ready.
- `ru_uk_personal_practice_prompt_review` is still required before source-locale prompts can be production-ready.
- Server upload and activation require the broader Gustav production approval chain.

## Build Handoff

Next `/build` target: `fr_personal_practice_active_recall_v1`.

First command:

```bash
node scripts/gustav_build_fr_personal_practice_active_recall_v1.mjs
```
