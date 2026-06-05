# Personal Plans Pre-Generation Readiness

Do not import generated Day 2-28 chat drafts into runtime/source yet.

This document lists the generation-readiness prerequisites that keep draft content deterministic, reviewable, and safe before it can move toward source intake. The 28-day chat-draft cycle exists as non-live content, but it is not approved production content.

## Fixed Product Rules

- Personal Plans are separate tasks.
- Lessons are not plan tasks.
- Selected daily time selects only the initial visible workload.
- Every generated day still carries the full maximum task pool.
- Day cards must open plan-native exercises only.
- Different days use different content, recall pressure, and visible progression.
- Include the full maximum mode pool every day where content exists.
- Generated text must never claim production readiness by itself.

## Finish Before Generation

### 1. Mode Contract

Every generator row must map to a known plan-native mode:

- `plan_phrase_build`
- `plan_missing_word`
- `plan_choose_natural_phrase`
- `plan_listen_choose`
- `plan_listen_build`
- `plan_pronunciation_repeat`
- `plan_phrase_recall`
- `plan_quiz`

The mode contract must define which fields each mode needs, which fields are optional, and what blocks the row from being rendered.

The mode contract must also define progression rules: every day gets the full maximum mode pool, while the day role changes phrase count, recall pressure, hints, difficulty, and the initial visible slice.

Status: present in `app/personal_plan_generation_contract.ts` and covered by `tests/personal_plan_generation_contract_gate.test.ts`.

### 2. Output Schema

The generator output schema must define one stable day packet:

- plan id;
- day index;
- day theme;
- week role;
- phrase candidates;
- translations;
- teaching notes;
- task modes;
- recall links;
- audio needs;
- pronunciation needs;
- review status;
- blockers.

The schema must reject missing ids, duplicate phrase text, lesson destinations, time-based deletion of the full day pool, missing visible-slice time rules, and technical placeholder copy.

Status: present as `GeneratedPersonalPlanDayPacket` in `app/personal_plan_generation_contract.ts` and covered by the fixture gate.

### 3. Prompt Template

The prompt template must tell the generator exactly how to build a day:

- use the 4-week matrix;
- vary daily content, recall pressure, hints, and visible progression by role;
- keep the plan scenario specific;
- create plan-native tasks only;
- reuse earlier phrases only when the matrix asks for recall;
- avoid lesson-card language;
- avoid fake readiness;
- return blockers instead of inventing missing evidence.

Status: first template present as `GENERATION_PROMPT_TEMPLATE`.

### 4. Review Rubric

The review rubric must decide whether a generated packet is usable:

- phrases sound alive and practical;
- translations are short and clear;
- every phrase has a useful teaching note;
- task modes cover the full maximum day pool and the content matches the day role;
- review days actually review older phrases;
- listening and pronunciation rows are marked blocked until real audio or scorer evidence exists;
- no generated packet is marked production-ready before approval.

Status: first rubric present as `GENERATION_REVIEW_RUBRIC`.

### 5. Fixture Gate

Before generating Day 2-28, create a fixture gate that can validate a sample packet without writing runtime source:

- one valid sample day;
- one invalid lesson-destination sample;
- one invalid missing time-tier visible-slice sample;
- one invalid placeholder-copy sample;
- one invalid duplicate-phrase sample.

Status: present in `tests/personal_plan_generation_contract_gate.test.ts`.

### 6. Browser Report

The browser report must show pre-generation status clearly:

- what is already locked;
- what must be finished before generation;
- what is still blocked;
- why generated chat drafts are intentionally not runtime/source content yet.

## Readiness Decision

Current decision: `ready_for_internal_quality_gate_non_live`.

Mode contract, output schema, prompt template, review rubric, fixture gate, reviewer workflow, source-intake preflight, content packet import format, runtime/source write guard, plan-specific generation prompts, recommended final-review checklist, browser report, cycle expansion spec, dry-run generator harness, and bulk generation review queue are now present and tested at the pre-generation contract level.

The internal quality gate is now present. It checked all 140 queued chat-draft candidate days: 140 are accepted as non-live source-intake candidates, 0 require rewrite/rework, and 0 are blocked. Human review is reserved for the end, after the full corpus is assembled. This stage still must not write runtime/source, register live assets, or claim production readiness.

The previous 6 rework rows have been rewritten:

- Voyazh Day 2;
- Gavan Day 1;
- Gavan Day 2;
- Echo Day 2;
- Gavan Day 3;
- Echo Day 3.

Source-intake preflight over the 140 accepted non-live candidates is now present and valid. It accepts 140 rows, blocks 0 rows, and still keeps runtime/source writes, live registration, generated-content creation, and production readiness false.

Accepted-candidate content packet import format is now present and valid. It converts 140 accepted rows into 140 non-live import days, blocks 0 rows, and still keeps runtime/source writes, live registration, generated-content creation, and production readiness false.

Accepted-candidate runtime/source write guard is now present and valid. It guards 140 import days and blocks catalog source, route source, UI surface, storage contract, asset registry, and test fixture source until an explicit integration plan exists.

Accepted-candidate explicit integration plan is now present and valid. It defines 6 planned-only stages and 6 required verification gates without applying source/runtime writes.

Current next step: resolve audio live registration evidence or pronunciation real-evidence, depending on available assets/scorer evidence.

## Reviewer Workflow

Status: present in `app/personal_plan_generation_review_workflow.ts` and covered by `tests/personal_plan_generation_review_workflow.test.ts`.

The workflow requires:

- reviewer id;
- ISO review timestamp;
- one review record per packet;
- packet checksum match;
- valid packet gate result;
- explicit approve or reject decision.

Approval means `approved_for_source_intake` only. It does not allow source/runtime writes, live registration, production readiness, audio readiness, or pronunciation readiness.

## Source-Intake Preflight

Status: present in `app/personal_plan_generation_source_intake_preflight.ts` and covered by `tests/personal_plan_generation_source_intake_preflight.test.ts`.

The preflight accepts only approved generated packets and produces `ready_for_import_format_design`.

It still blocks:

- source/runtime writes;
- live registration;
- generated content creation;
- checksum drift;
- unapproved packets;
- direct production readiness.

The next required step is `content_packet_import_format`.

## Content Packet Import Format

Status: present in `app/personal_plan_generation_import_format.ts` and covered by `tests/personal_plan_generation_import_format.test.ts`.

The import format converts accepted source-intake rows plus approved packet data into a stable non-live artifact. It carries plan/day ids, phrase candidates, task modes, recall links, audio needs, pronunciation needs, blockers, and the next required step.

It still blocks source/runtime writes, live registration, and generated content creation.

## Runtime/Source Write Guard

Status: present in `app/personal_plan_generation_runtime_source_write_guard.ts` and covered by `tests/personal_plan_generation_runtime_source_write_guard.test.ts`.

The guard protects:

- catalog source;
- route source;
- UI surface;
- storage contract;
- asset registry;
- test fixture source.

The next required step is `plan_specific_generation_prompts`.

## Plan-Specific Generation Prompts

Status: present in `app/personal_plan_generation_plan_specific_prompts.ts` and covered by `tests/personal_plan_generation_plan_specific_prompts.test.ts`.

Every plan has its own prompt rules:

- Gavan: forms, address, doctor, bank, housing, city services.
- Mitap: meeting, next steps, deadline, owner, blocker.
- Voyazh: travel, airport, hotel, help, transport.
- Impuls: spontaneous speech, short story, because, quick answer.
- Echo: listening, repeat, heard, missed, time/place.

The prompt packet still blocks source/runtime writes, live registration, and generated content creation.

The next required step is `internal_quality_gate`.

## Recommended Final Review Checklist

Status: present in `docs/personal-plans-human-content-review-checklist.md` and covered by `tests/personal_plan_generation_recommended_review_checklist.test.ts`.

This checklist is recommended and non-blocking during generation. It is not a current gate and not production approval.

It helps reviewers look at phrase quality, translation quality, teaching notes, daily task set fit, and plan-specific scenario fit.

The next required engineering step is `dry_run_generator_harness`.

## Dry-Run Generator Harness

Status: present in `app/personal_plan_generation_dry_run_harness.ts` and covered by `tests/personal_plan_generation_dry_run_harness.test.ts`.

The harness proves one sample generated day can move through:

- generated packet validation;
- checksum-bound dry-run review;
- source-intake preflight;
- content packet import format;
- runtime/source write guard.

It keeps:

- `sourceRuntimeWriteAllowed: false`;
- `liveRegistrationAllowed: false`;
- `generatedContentCreationAllowed: false`;
- `productionReady: false`;
- `writtenSourceFamilies: []`.

The next required engineering step is `bulk_generation_review_queue`.

## Bulk Generation Review Queue

Status: present in `app/personal_plan_bulk_generation_review_queue.ts` and covered by `tests/personal_plan_bulk_generation_review_queue.test.ts`.

The queue converts the completed 28-day chat-draft cycle into review candidates:

- 5 plans;
- 28 candidate days per plan;
- 140 total candidate days;
- one queued row per plan/day chat draft.

It keeps:

- `sourceRuntimeWriteAllowed: false`;
- `liveRegistrationAllowed: false`;
- `generatedContentCreationAllowed: false`;
- `productionReady: false`.

The queue blocks incomplete cycle coverage, fake production readiness, source/runtime writes, and live registration.

The next required step is `internal_quality_gate`.

## Accepted-Candidate Content Packet Import Format

Status: present in `app/personal_plan_generation_import_format.ts` and covered by `tests/personal_plan_accepted_candidate_content_packet_import_format.test.ts`.

The format converts the accepted candidate source-intake preflight into non-live import days:

- 5 plans;
- 28 candidate days per plan;
- 140 total import days;
- one import row per accepted plan/day candidate.

It keeps:

- `sourceRuntimeWriteAllowed: false`;
- `liveRegistrationAllowed: false`;
- `generatedContentCreationAllowed: false`;
- `productionReady: false`.

The format blocks missing import days, duplicate plan/day rows, invalid checksums, non-accepted candidate rows, fake source/runtime writes, fake live registration, generated-content creation, and production-ready claims.

The next required step is `runtime_source_write_guard`.

## Accepted-Candidate Runtime/Source Write Guard

Status: present in `app/personal_plan_generation_runtime_source_write_guard.ts` and covered by `tests/personal_plan_accepted_candidate_runtime_source_write_guard.test.ts`.

The guard holds the accepted-candidate content packet import format before implementation:

- 140 import days;
- 6 guarded write families;
- no source/runtime writes;
- no live registration;
- no generated-content creation;
- no production-ready claim.

The guard blocks catalog source, route source, UI surface, storage contract, asset registry, and test fixture source until an explicit integration plan exists.

The next required step is `explicit_integration_plan`.

## Accepted-Candidate Explicit Integration Plan

Status: present in `app/personal_plan_accepted_candidate_explicit_integration_plan.ts` and covered by `tests/personal_plan_accepted_candidate_explicit_integration_plan.test.ts`.

The plan maps the 140-row corpus into planned-only implementation stages:

- catalog mapping design;
- route mapping design;
- UI surface binding design;
- storage contract compatibility design;
- asset registry hold design;
- test fixture plan design.

It requires:

- accepted-candidate import format Jest;
- accepted-candidate runtime/source write guard Jest;
- Personal Plan route opening regression Jest;
- Personal Plan storage contract Jest;
- Personal Plan day surface Jest;
- `typescript_no_emit`.

It keeps source/runtime writes, live registration, generated-content creation, and production readiness false.

The next required step is `integration_implementation_preflight`.

## Accepted-Candidate Integration Implementation Preflight

Status: present in `app/personal_plan_accepted_candidate_integration_implementation_preflight.ts` and covered by `tests/personal_plan_accepted_candidate_integration_implementation_preflight.test.ts`.

The preflight converts the explicit integration plan into guarded implementation requests:

- catalog source;
- route source;
- UI surface;
- storage contract;
- asset registry;
- test fixture source.

It requires every request to remain `not_applied` before the real guarded implementation pass.

It keeps:

- `sourceRuntimeWriteAllowed: false`;
- `liveRegistrationAllowed: false`;
- `generatedContentCreationAllowed: false`;
- `productionReady: false`.

The preflight blocks invalid explicit plans, missing implementation requests, already-applied requests, missing verification, fake source/runtime writes, fake live registration, generated-content creation, and production-ready claims.

The next required step is `guarded_runtime_source_binding`.

## Accepted-Candidate Guarded Runtime/Source Binding

Status: present in `app/personal_plan_catalog.ts` and `app/personal_plan_accepted_candidate_guarded_runtime_source.ts`, covered by `tests/personal_plan_accepted_candidate_guarded_runtime_source.test.ts` and `tests/personal_plan_accepted_candidate_guarded_runtime_source_report.test.ts`.

The binding applies guarded runtime catalog metadata to the accepted candidate cycle:

- 5 plans;
- 28 accepted candidate days per plan;
- 140 accepted candidate days total;
- selected daily time controls only the initial visible task slice;
- the full daily task pool remains available for add-more behavior.

It keeps:

- `liveRegistrationAllowed: false`;
- `generatedContentCreationAllowed: false`;
- `productionReady: false`;
- audio readiness as `not_live_registered`;
- pronunciation readiness as `needs_real_scorer_recording_evidence`.

The binding does not claim human-reviewed production readiness.

The next required step is `day_surface_route_storage_regression_gate`.

## Day Surface / Route / Storage Regression Gate

Status: present in `app/personal_plan_day_surface_route_storage_regression_gate.ts` and covered by `tests/personal_plan_day_surface_route_storage_regression_gate.test.ts`.

The gate proves the guarded runtime/source binding across:

- 140 bound accepted candidate days;
- 1139 route destinations;
- 0 normal lesson route destinations;
- selected-time visible slices;
- add-more behavior after visible completion;
- planInstanceId-scoped completion keys.

It keeps:

- `liveRegistrationAllowed: false`;
- `generatedContentCreationAllowed: false`;
- `productionReady: false`.

The next required step is `audio_pronunciation_and_human_review_readiness`.

## Audio / Pronunciation / Final Review Readiness Consolidation

Status: present in `app/personal_plan_audio_pronunciation_human_review_readiness.ts` and covered by `tests/personal_plan_audio_pronunciation_human_review_readiness.test.ts`.

The consolidation keeps the green route/storage state while summarizing the remaining final evidence:

- audio is blocked until approved live registration records exist;
- generated/promoted audio is not approved audio;
- pronunciation is blocked until real scorer, recording, and scored-attempt evidence exists;
- final human review is pending final user review and does not block engineering progress by itself.

It keeps:

- `liveRegistrationAllowed: false`;
- `generatedContentCreationAllowed: false`;
- `productionReady: false`.

The next required step is `audio_live_registration_evidence_gate`.

## Audio Live Registration Evidence Gate

Status: present in `app/personal_plan_audio_live_registration_evidence_gate.ts` and covered by `tests/personal_plan_audio_live_registration_evidence_gate.test.ts`.

The gate separates audio states that must not be collapsed:

- promoted/generated audio is not live registered audio;
- only approved + final runtime assets count as live registration evidence;
- the current state remains blocked with 10 promoted audio assets and 0 approved/final live registered assets;
- ten approved/final runtime assets can make the audio registration evidence ready, but cannot make the whole product production-ready alone.

It keeps:

- `liveRegistrationAllowed: false`;
- `productionReady: false`.

The next required step is `update_audio_readiness_then_pronunciation_evidence_gate` if approved/final audio exists, otherwise `register_approved_final_audio_assets_or_keep_listening_blocked`.
