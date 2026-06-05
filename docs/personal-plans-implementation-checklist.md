# Personal Plans Implementation Checklist

Last updated: 2026-06-01

This checklist is the implementation companion to `docs/lesson-teaching-notes-audit.md`
and `docs/personal-plans-killer-feature-audit.md`.
Audits stay as research and reasoning. This file tracks what has actually been wired into
the product.

## 2026-05-31 Content Reset

`Gavan` day 1 and day 2 content was rejected after review. The old identity/contact/address
pack must not be treated as product quality or used as the standard for future plan content.

- [x] Remove rejected `Gavan` day 1/day 2 from active plan generation.
- [x] Block `gavan_identity_day1` and `gavan_address_day2` from phrase lesson product API.
- [x] Block `gavan_day1_identity` and `gavan_day2_address` from plan quiz product API.
- [x] Replace day 1/day 2 quality tests with reset guards.
- [x] Keep plan mechanics tests for routing, recall, `planInstanceId`, mistake analytics, and teaching notes.
- [ ] Rewrite `Gavan` week 1 from scratch using the new universal-first content strategy.
- [ ] Add content gates for social acceptability, broad usefulness, exercise variety, audio, pronunciation, and explanation honesty.

## Legend

- `[x]` implemented and covered by tests
- `[~]` implemented partially or needs hardening
- `[ ]` not implemented yet

## Phase 1 - Hard Quality Gates

### 1. Exact Lesson Slices

- [x] Add `requiredPhraseIds` to linked lesson destinations.
- [x] Store exact lesson phrase ids on `Гавань · день 1`.
- [x] Pass `requiredPhraseIds` from plan task navigation into `/lesson_menu`.
- [x] Forward `requiredPhraseIds` from `/lesson_menu` into `/lesson1`.
- [x] Filter plan lesson mode to the required phrase ids.
- [x] Count plan lesson progress only after `isRight` and only for allowed phrase ids.
- [x] Gate: `missing_required_phrase_ids` rejects linked lesson tasks without exact phrase ids.
- [x] Tests: `personal_plan_hard_gates_contract`, `personal_plan_lesson_progress_contract`.

### 2. Authored vs Scaffold Days

- [x] Add `PlanDay.status`.
- [x] Mark `Гавань · день 1` as `certified`.
- [x] Mark generated future days as `scaffold`.
- [x] Gate: `scaffold_day` prevents scaffold days from reporting `ready`.
- [x] Tests: day 2 currently returns `ready=false` because it is scaffold.

### 3. Meaning Contract

- [x] Add `lifeOutcome` to `PlanDay`.
- [x] Gate: `missing_life_outcome` rejects days without a real-world outcome.
- [x] `Гавань · день 1` outcome: introduce yourself, say why you came, name the booking/viewing calmly.

### 4. Curriculum Passport

- [x] Add day-level `curriculum` metadata with prerequisites, allowed grammar, and blocked grammar.
- [x] Add `curriculum` section to `PersonalPlanDayPassport`.
- [x] Gate: `missing_curriculum` rejects days without prerequisite/grammar metadata.
- [x] Add `phraseGrammarTags` to `PersonalPlanDayPassport`.
- [x] Gate: `blocked_grammar_tag` rejects days where actual lesson/plan phrases use blocked grammar.

### 5. Coverage Passport

- [x] Add `coverage` section to `PersonalPlanDayPassport`.
- [x] Passport now lists exact lesson phrase ids.
- [x] Passport now lists plan phrase lesson ids.
- [x] Passport now lists recall phrase lesson ids.
- [x] Passport now lists daily quiz ids.
- [x] Passport now lists quiz item -> exact source phrase coverage matrix.
- [x] Gate: `uncovered_quiz_item` rejects quiz questions without a source in the day's lesson slice or plan phrases.
- [x] Gate: `missing_quiz_coverage` rejects plan quizzes without source metadata.

### 6. Load Passport

- [x] Add `load.byMinutes` to `PersonalPlanDayPassport`.
- [x] Passport checks only the four onboarding choices: `5`, `10`, `15`, `20`.
- [x] Tests confirm task counts for all four choices on `Гавань · день 1`.
- [~] Still needed: richer allowed-overrun policy and skipped-task reasons.

### 7. Quiz Explanation Gate

- [x] Gate: `quiz_explanations_count` rejects plan quiz items without per-choice explanations.
- [x] Block rejected `gavan_day1_identity` from the product API.
- [ ] New quiz explanations must follow the honesty contract: no invented wrong-option descriptions.
- [~] Still needed: deeper copy-quality scoring for quiz explanations.

## Phase 2 - Next Implementation Queue

### 8. Exact Quiz Coverage

- [x] Add quiz item source metadata in `personal_plan_quizzes`.
- [x] Reject quiz questions that are not covered by linked lesson phrases or plan phrases.
- [x] Reset rejected day 1/day 2 quiz coverage out of active product API.
- [ ] Rebuild exact quiz coverage after the new week 1 content model is approved.

### 9. Gavan Week 1 Content

- [x] Reject old day 1/day 2 as a product direction.
- [ ] Define universal-first `Gavan` week 1 structure.
- [ ] Add varied task formats for week 1 instead of repeating one daily template.
- [ ] Add generated audio requirements for listening tasks.
- [ ] Add pronunciation task requirements and storage.
- [ ] Write day 1 after the new gates are in place.
- [ ] Repeat for days 2-7 only after day 1 passes the new gates.

### 10. Personalization Evidence

- [x] Add pure recovery candidates from wrong/skipped plan attempts.
- [x] Gate recovery through `PlanExerciseRecoveryPolicy`.
- [x] Keep recovery candidates separate from progress counting.
- [x] Store attempt events locally by `planInstanceId`.
- [x] Clear/reset attempt events by `planInstanceId` without cross-instance bleed.
- [x] Sanitize attempt payload before local storage.
- [x] Map stored wrong/skipped attempts to dry-run recovery actions.
- [x] Keep dry-run recovery actions separate from legacy storage writes.
- [x] Skip name-only grammar analytics while preserving recall/trainer recovery.
- [x] Add recovery write adapter with `dry_run` default and explicit `apply`.
- [x] Enforce idempotency for recovery writes by action id.
- [x] Skip cross-instance recovery writes.
- [x] Add persistent applied-action registry by `planInstanceId`.
- [x] Keep applied action ids separate from attempt events.
- [x] Persist only successfully applied recovery actions.
- [x] Add legacy handler bridge for recall/trainer/mistake payloads.
- [x] Keep direct legacy API imports blocked until exact signatures are audited.
- [x] Protect legacy bridge with registry idempotency.
- [x] Add apply-readiness gate before direct legacy writes.
- [x] Gate missing handlers, duplicate actions, empty batches, and cross-instance writes.
- [x] Add recovery integration blocker report when legacy signatures cannot be read.
- [x] Add renderer contracts for first plan exercise types.
- [x] Add renderer session contracts for start and answer submission.
- [x] Create attempt events and recovery actions from renderer session submissions.
- [x] Persist renderer session submissions through attempt-event storage.
- [x] Keep persisted submissions isolated by `planInstanceId`.
- [x] Add UI-ready view-model contracts for stored exercise submissions.
- [x] Add block progress reducer for renderer sessions.
- [x] Add day progress reducer for daily plan screen data.
- [x] Add day view-model contract for future daily plan screen.
- [x] Add adapter from existing catalog day to exercise day view model.
- [x] Add blocker report for lesson shell bridge when lesson files cannot be read.
- [x] Add pure phrase-build shell params contract.
- [x] Add pure missing-word and choose-natural renderer params contracts.
- [ ] Add evidence IDs to personalized trainer/practice/card tasks.
- [ ] Gate personalized tasks without evidence.
- [ ] Pass plan context into trainer/practice/flashcards routes.
- [ ] Add task reason copy for user-facing explanation.

## Current Verification

Command run:

```powershell
npx jest tests/personal_plan_* --runInBand
```

Result: 17 test suites passed, 69 tests passed.

Additional checks:

```powershell
npx tsc --noEmit --pretty false
```

Result: TypeScript check passed.

UTF-8 guard:

- targeted Personal Plan files: no replacement characters and no mojibake markers;
- `app/lesson1.tsx` contains one legitimate Spanish `Ñ` in a regex, not corrupted Cyrillic.
## Update 2026-06-01

- [x] P3.20 Connect `GavanDay1ContentCandidate` into the non-production package draft.
- [x] P3.20 Expose package content source as `blueprint_draft` or `candidate`.
- [x] P3.20 Build day 1 explanation requirements from candidate new words and first-seen constructions.
- [x] P3.20 Add package summary `contentPhrases`.
- [x] P3.20 Block invalid candidate content with `invalid_content_candidate`.
- [x] P3.20 Keep day 1 quiz draft separate and draft-only.
- [x] P3.20 Keep production bridge blocked without explicit content approval.
- [x] P3.20 Guard package draft against live catalog and live quiz registry imports.
- [x] P3.21 Update the non-production day 1 quiz draft to candidate phrase ids and explanation targets.
- [x] P3.21 Keep candidate quiz draft outside live catalog and live quiz registry.
- [x] P3.21 Keep candidate quiz at exactly 10 questions.
- [x] P3.21 Cover all five candidate phrases with quiz source ids.
- [x] P3.21 Require candidate quiz explanation targets to match candidate phrase/meaning/word/construction/context.
- [x] P3.21 Keep wrong-answer feedback honest without invented selected-option descriptions.
- [x] P3.21 Attach candidate-aligned quiz when package draft receives `contentCandidate`.
- [x] P3.22 Add stricter candidate quiz prompt/copy honesty gate.
- [x] P3.22 Block developer/internal terms in candidate prompts and explanation notes.
- [x] P3.22 Block authoring instructions such as `Explain that`.
- [x] P3.22 Block ungrounded candidate explanation targets.
- [x] P3.22 Block too-short candidate prompts.
- [x] P3.22 Validate package-attached candidate quiz through the copy gate.
- [x] P3.23 Add candidate quiz readiness as a named section in the production bridge.
- [x] P3.23 Add `quiz_gate_failed` production bridge issue code.
- [x] P3.23 Include `quiz` in bridge summary `ready` or `blockers`.
- [x] P3.23 Keep content approval separate from quiz readiness.
- [x] P3.23 Block production bridge when candidate quiz validation fails.
- [x] P3.24 Add explicit production approval/readiness input for all bridge sections.
- [x] P3.24 Add `production.canRelease`.
- [x] P3.24 Require content approval plus ready package, quiz, and copy.
- [x] P3.24 Accept audio/pronunciation as `not_required` only without fake final claims.
- [x] P3.24 Block release when approval is present but quiz/package/copy/audio/pronunciation fails.
- [x] P3.25 Prepare audio/listening readiness for candidate day 1 without fake generated audio.
- [x] P3.26 Prepare pronunciation practice readiness without fake scoring.
- [x] P3.27 Create candidate day 1 release/approval fixture after all readiness sections are explicit.
- [x] P3.28 Add corrupted-copy/mojibake gates before final Gavan content writing.
- [x] P3.29 Rewrite Gavan day 1 candidate content in clean universal-first Russian copy.
- [x] P3.30 Add reviewer-friendly release evidence output for the candidate day.

- [x] P2.11 Add a unified renderer params builder for `plan_phrase_build`, `plan_missing_word`, and `plan_choose_natural_phrase`.
- [x] P2.11 Preserve no correct-word highlighting through the unified route.
- [x] P2.11 Preserve recovery/explanation readiness flags from routed contracts.
- [x] P2.11 Reject unsupported exercise types with `missing_renderer_contract`.
- [x] P2.11 Cover the builder with focused Jest tests.
- [ ] P2.12 Add a day-level renderer params adapter that prepares openable/blocked blocks for the future UI.
## Update 2026-06-01 - P2.12

- [x] Add day-level renderer params adapter.
- [x] Split day blocks into `openableBlocks` and `blockedBlocks`.
- [x] Preserve block id/type/issues for blocked diagnostics.
- [x] Preserve no correct-word highlighting inside openable params.
- [x] Keep empty day handling stable.
- [x] Cover adapter with focused Jest tests.
- [ ] P2.13 Add a UI-agnostic day open-action contract above renderer params.
## Update 2026-06-01 - P2.13

- [x] Add UI-agnostic day open-action contract.
- [x] Route `plan_phrase_build` to `open_lesson_shell`.
- [x] Route `plan_missing_word` and `plan_choose_natural_phrase` to `open_plan_renderer`.
- [x] Route unsupported types to `blocked` with issues.
- [x] Preserve task order.
- [x] Preserve no correct-word highlighting in action params.
- [ ] P2.14 Merge day progress and open actions into one task surface model.
## Update 2026-06-01 - P2.14

- [x] Add pure day task surface model.
- [x] Merge block progress and open actions.
- [x] Expose task states: `available`, `completed`, `needs_retry`, `blocked`.
- [x] Preserve authored task order.
- [x] Preserve no correct-word highlighting in action params.
- [x] Cover completed, retry, available, blocked, and order cases with Jest.
- [ ] P2.15 Add task surface readiness gate before UI integration.
## Update 2026-06-01 - P2.15

- [x] Add task surface readiness gate.
- [x] Validate task identity/title/minutes/progress/action.
- [x] Validate open actions have params.
- [x] Validate blocked actions have issues.
- [x] Validate counts against task states.
- [x] Validate duplicate block ids.
- [x] Cover valid and corrupted surface models with Jest.
- [ ] P2.16 Add one bundle builder that returns surface model plus readiness result.
## Update 2026-06-01 - P2.16

- [x] Add task surface bundle builder.
- [x] Return `{ model, readiness, canRender }`.
- [x] Keep correctly described blocked tasks renderable.
- [x] Support injected validator for negative tests and stricter future gates.
- [x] Preserve authored task order.
- [x] Preserve no correct-word highlighting through bundled action params.
- [ ] P2.17 Find the safest production integration point for the task surface bundle.
## Update 2026-06-01 - P2.17

- [x] Attempt TypeScript gate before integration discovery.
- [x] Attempt `rg` search for Personal Plan integration points.
- [x] Identify candidate files from fallback listing.
- [x] Avoid blind UI edits when candidate files cannot be read.
- [x] Create integration blocker report with exact commands and retry checklist.
- [x] Re-run focused Personal Plans suite.
- [ ] Retry production integration when `app/personal_plan.tsx` and related files can be inspected.
## Update 2026-06-01 - P2.18

- [x] Retry reading production integration files.
- [x] Avoid blind UI edits when file access is blocked.
- [x] Add task surface input resolver.
- [x] Validate required inputs: `blocks`, `planInstanceId`, `attemptEvents`.
- [x] Validate duplicate block ids.
- [x] Validate attempt events belong to the current plan instance.
- [x] Validate attempt events point to blocks present in the day input.
- [x] Cover resolver with Jest.
- [ ] P2.19 Add combined unresolved-input-to-bundle entry point.
## Update 2026-06-01 - P2.19

- [x] Add unresolved-input-to-bundle entry point.
- [x] Run input resolver before bundle creation.
- [x] Return no bundle when input is invalid.
- [x] Return bundle and `canRender` when input is valid.
- [x] Preserve renderable blocked task behavior.
- [x] Preserve no correct-word highlighting through final entry point.
- [x] Cover entry point with Jest.
- [ ] P2.20 Add a public task-surface API module for future UI imports.
## Update 2026-06-01 - P2.20

- [x] Add public task surface API module.
- [x] Export `buildPlanDayTaskSurfaceFromInput`.
- [x] Export public input/result/issue/action/state types.
- [x] Keep UI-facing import path separate from lower-level internals.
- [x] Cover public API behavior with Jest.
- [ ] P2.21 Retry production UI integration through `personal_plan_task_surface_api`.
## Update 2026-06-01 - P2.21

- [x] Retry production UI integration through public API.
- [x] Confirm UI file reads are still blocked by sandbox.
- [x] Avoid blind edits to `app/personal_plan.tsx`.
- [x] Update integration blocker report.
- [x] Re-run focused Personal Plans suite.
- [ ] P3.1 Add pure content reset rules for Harbor/week 1 before editing catalog content.
## Update 2026-06-01 - P3.1

- [x] Add pure content quality contract for Personal Plans phrases.
- [x] Accept universal modern first-day phrases.
- [x] Reject exact phone/name/email style personal data.
- [x] Reject apartment-only and too-narrow day-one situations.
- [x] Reject overformal textbook copy.
- [x] Reject developer/robotic copy.
- [x] Reject explanations that mention unseen wrong options.
- [x] Require explanations for new words and first-seen constructions.
- [ ] P3.2 Add day-level content quality gate before catalog edits.
## Update 2026-06-01 - P3.2

- [x] Add day-level content quality gate.
- [x] Validate every phrase through phrase-level content contract.
- [x] Return summary counts.
- [x] Return issues grouped by phrase.
- [x] Fail empty days.
- [x] Fail day 1 for exact personal data.
- [x] Fail day 1 for too-narrow phrases.
- [x] Surface missing explanation issues at day level.
- [ ] P3.3 Add week-level Harbor content blueprint gate.
## Update 2026-06-01 - P3.3

- [x] Add week-level Harbor content blueprint gate.
- [x] Require exactly seven days.
- [x] Require day 1 to be `universal_start`.
- [x] Fail week when any day fails day-level content quality.
- [x] Require at least 5 unique focus/exercise goals.
- [x] Fail repeated narrow scenario overload.
- [x] Fail missing week identity.
- [x] Fail duplicate day ids and duplicate day indexes.
- [x] Fail invalid day order.
- [x] Fail day drafts owned by another plan id.
- [x] Count narrow overload in both focus tags and exercise goals.
- [x] Cover valid and invalid week blueprints with Jest.
- [ ] P3.4 Create non-production Harbor week 1 blueprint draft fixture and validate it.
## Update 2026-06-01 - P3.4

- [x] Add non-production Harbor/Gavan week 1 blueprint draft fixture.
- [x] Keep fixture outside `personal_plan_catalog.ts`.
- [x] Use 7 days with day 1 as `universal_start`.
- [x] Avoid exact names, phone numbers, email, address, passport, bank, and apartment-first content.
- [x] Use universal modern phrase goals: arrival, pause, repeat, understanding, help, confirmation, short answer, review.
- [x] Add explanations for new words and first-seen constructions.
- [x] Validate fixture through week-level content quality gate.
- [x] Add negative regression for personal data plus repeated narrow scenario overload.
- [x] Full Personal Plans suite passed: 47 suites, 234 tests.
- [x] TypeScript passed: `npx tsc --noEmit --pretty false`.
- [ ] P3.5 Add non-production authoring passport for week 1 exercise mix and 5/10/15/20 minute load before catalog edits.
## Update 2026-06-01 - P3.4

- [x] Validate non-production Harbor/Gavan week 1 blueprint draft.
- [x] Keep draft outside live catalog.
- [x] Ensure day 1 is `universal_start`.
- [x] Ensure no exact personal data/day-one narrow-content issues.
- [x] Ensure enough weekly focus/exercise variety.
- [x] Ensure narrow scenario tags stay below overload threshold.
- [x] Run full Personal Plans focused suite.
- [ ] P3.5 Add non-production authoring passport for week 1 exercise mix and 5/10/15/20 minute load before catalog edits.
## Update 2026-06-01 - P3.5

- [x] Add non-production Harbor/Gavan week 1 authoring passport.
- [x] Keep passport outside `personal_plan_catalog.ts`.
- [x] Define learning outcome for each of 7 days.
- [x] Define exercise mix for each day.
- [x] Cover phrase build, missing word, choose natural phrase, listening placeholders, recall, quiz, and pronunciation placeholder.
- [x] Define load by the four onboarding choices: 5/10/15/20 minutes.
- [x] Gate unsupported exercise types.
- [x] Gate invalid minute choices.
- [x] Gate missing or too-thin load.
- [x] Gate day-one narrow scenario exercise tags.
- [x] Gate fake final audio/pronunciation asset or scoring claims.
- [x] Full Personal Plans suite passed: 48 suites, 241 tests.
- [x] TypeScript passed: `npx tsc --noEmit --pretty false`.
- [x] P3.6 Convert blueprint + authoring passport into non-production draft `PlanExerciseBlock` candidates and validate them.

## Update 2026-06-01 - P3.6

- [x] Restore TypeScript baseline after the old Harbor authoring test drifted from the current passport contract.
- [x] Add non-production Harbor/Gavan week 1 draft block converter.
- [x] Keep converter outside `personal_plan_catalog.ts`.
- [x] Convert authoring exercise types into engine `PlanExerciseBlock` types.
- [x] Preserve deterministic ids as `dayId:exerciseId`.
- [x] Map `requiredFor` from the four onboarding minute choices: 5/10/15/20.
- [x] Use blueprint phrase ids as `contentUnitIds`.
- [x] Reject unknown load exercise ids.
- [x] Exclude pronunciation placeholders instead of creating fake production blocks.
- [x] Reject fake final pronunciation placeholders.
- [x] Validate generated blocks through `validatePlanExerciseBlockContract` and `validatePlanEngineQuality`.
- [x] Full Personal Plans suite passed: 50 suites, 256 tests.
- [x] TypeScript passed: `npx tsc --noEmit --pretty false`.
- [x] P3.7 Add a non-production package readiness gate for quiz/audio/listening/pronunciation requirements before any live catalog edit.

## Update 2026-06-01 - P3.7

- [x] Add non-production Harbor/Gavan week 1 package readiness gate.
- [x] Keep package readiness outside `personal_plan_catalog.ts`.
- [x] Require renderer readiness metadata for every generated block.
- [x] Allow unsupported renderers only when explicitly blocked with a reason.
- [x] Require every `plan_quiz` block to declare a 10-question draft quiz requirement.
- [x] Require every `plan_listen_choose` / `plan_listen_build` block to declare an audio asset requirement.
- [x] Keep audio as placeholder-only; reject fake final audio claims.
- [x] Require excluded pronunciation placeholders to remain visible as blocked future work.
- [x] Reject fake final pronunciation/scoring claims.
- [x] Fail generated empty days.
- [x] Full Personal Plans suite passed: 51 suites, 262 tests.
- [x] TypeScript passed: `npx tsc --noEmit --pretty false`.
- [ ] P3.8 Create the first non-production Gavan day 1 package draft with quiz/audio/renderer/explanation requirements, still outside the live catalog.

## Update 2026-06-01 - P3.8

- [x] Add non-production Gavan day 1 package draft.
- [x] Keep package draft outside `personal_plan_catalog.ts`.
- [x] Include day 1 block ids from the P3.6 draft converter.
- [x] Reuse P3.7 package readiness input for day 1.
- [x] Require day 1 quiz block to have exactly 10 draft questions.
- [x] Add explanation requirements for every day 1 new word and first-seen construction.
- [x] Gate missing explanation requirements.
- [x] Gate fake final audio and pronunciation/scoring claims.
- [x] Focused day 1 package draft tests passed: 1 suite, 5 tests.
- [x] Full Personal Plans suite passed: 52 suites, 267 tests.
- [~] TypeScript command attempted after P3.8 but blocked by `windows sandbox: spawn setup refresh`; rerun `npx tsc --noEmit --pretty false` next.
- [ ] P3.9 Design the draft quiz requirement shape for day 1 with human task instructions and per-choice explanation requirements, still outside the live quiz registry.

## Update 2026-06-01 - P3.9

- [x] Rerun TypeScript baseline after the P3.8 shell issue.
- [x] Inspect the day 1 package draft, week blueprint, content quality contract, and live quiz registry shape.
- [x] Add a non-production Gavan day 1 quiz draft module.
- [x] Keep the quiz draft outside `app/personal_plan_quizzes.ts`.
- [x] Require exactly 10 draft quiz items.
- [x] Require every quiz item to reference a day 1 source phrase id.
- [x] Require every quiz item to have a user-facing prompt.
- [x] Require 3-4 choices per item.
- [x] Require exactly one correct choice per item.
- [x] Require an explanation requirement for every choice, including wrong choices.
- [x] Reject authored wrong-choice feedback that pretends to know what the user selected without runtime context.
- [x] Add negative gates for unknown source phrase ids, missing explanations, missing/multiple correct answers, duplicate ids, and bad choice counts.
- [x] Focused day 1 quiz draft tests passed: 1 suite, 6 tests.
- [x] Full Personal Plans suite passed: 53 suites, 273 tests.
- [x] TypeScript passed: `npx tsc --noEmit --pretty false`.
- [ ] P3.10 Connect the P3.9 quiz draft into the day 1 package draft readiness summary without editing the live quiz registry.

## Update 2026-06-01 - P3.10

- [x] Add package-level tests that require the day 1 package to expose the P3.9 quiz draft.
- [x] Include the quiz draft in `GavanDay1PackageDraft`.
- [x] Add package summary fields for quiz item count and quiz explanation requirement count.
- [x] Require package quiz requirement count to match the attached quiz draft.
- [x] Validate the attached quiz draft through `validateGavanDay1QuizDraft`.
- [x] Add package issue `invalid_day1_quiz_draft`.
- [x] Keep all integration outside `app/personal_plan_quizzes.ts` and `personal_plan_catalog.ts`.
- [x] Focused day 1 package draft tests passed: 1 suite, 7 tests.
- [x] Combined day 1 package + quiz draft tests passed: 2 suites, 13 tests.
- [x] Full Personal Plans suite passed: 53 suites, 275 tests.
- [x] TypeScript passed: `npx tsc --noEmit --pretty false`.
- [ ] P3.11 Create the runtime explanation-card adapter for quiz/phrase feedback without hallucinating selected answers.

## Update 2026-06-01 - P3.11

- [x] Audit existing lesson teaching notes and plan explanation-card contracts.
- [x] Research competitor feedback patterns for mistake explanations and word information.
- [x] Add a pure runtime explanation-card adapter.
- [x] Keep adapter outside UI, onboarding, Premium, live catalog, and live quiz registry.
- [x] Render correct-answer cards with supportive tone.
- [x] Render wrong-answer cards with correction tone.
- [x] Strip authoring instructions such as `Explain that` before UI output.
- [x] Block selected-answer-aware explanations when runtime selected choice is missing.
- [x] Allow selected-answer-aware explanations only when `selectedChoiceText` is present.
- [x] Block developer/placeholder copy before it reaches UI.
- [x] Block wrong-answer copy that claims a selected option without runtime context.
- [x] Focused explanation adapter tests passed: 1 suite, 6 tests.
- [x] Full Personal Plans suite passed: 54 suites, 280 tests.
- [x] TypeScript passed: `npx tsc --noEmit --pretty false`.
- [ ] P3.12 Turn quiz/phrase attempts into analytics-ready attempt events for weak spots, recovery, trainer, and progress.

## Update 2026-06-01 - P3.12

- [x] Audit existing attempt event, recovery, storage, and quiz draft contracts.
- [x] Research competitor review loops: accuracy, spaced repetition, difficult words, vocabulary/grammar review.
- [x] Add a pure attempt-event adapter for Personal Plans.
- [x] Keep adapter outside UI, onboarding, Premium, live catalog, live quiz registry, and AsyncStorage writes.
- [x] Build quiz attempt events from quiz item + chosen choice.
- [x] Build phrase attempt events from expected/selected answer.
- [x] Mark result as correct only when chosen quiz choice is correct.
- [x] Keep wrong attempts not progress eligible.
- [x] Set `expectedAnswer` from the correct quiz choice or phrase input.
- [x] Set `selectedAnswerKnown` only when selected text exists.
- [x] Derive grammar, vocabulary, and mistake tags from quiz skill, source phrase, and explanation target.
- [x] Sanitize sensitive payload through existing attempt event factory.
- [x] Return recovery candidates for wrong attempts via existing recovery policy.
- [x] Block unknown quiz choices, wrong block type, missing correct choice, and content-unit mismatch.
- [x] Focused attempt adapter tests passed: 1 suite, 5 tests.
- [x] Full Personal Plans suite passed: 55 suites, 285 tests.
- [x] TypeScript passed: `npx tsc --noEmit --pretty false`.
- [ ] P3.13 Connect attempt-event output to weak-spot/recovery summaries for day/package quality.

## Update 2026-06-01 - P3.13

- [x] Audit attempt adapter, recovery actions, mistake analytics tests, and engine contracts.
- [x] Research competitor weak-word/review loops and common failure modes.
- [x] Add a pure weak-spot/recovery summary module.
- [x] Keep summary outside UI, onboarding, Premium, live catalog, live quiz registry, and storage writes.
- [x] Count attempts by correct, wrong, skipped, and completed.
- [x] Count recovery candidates by recall, trainer, and mistake analytics.
- [x] Group weak spots by grammar, vocabulary, and mistake tags.
- [x] Ignore correct attempts when building weak-spot counts.
- [x] Preserve plan instance, block, day, and content unit references.
- [x] Support filtering by current `planInstanceId`.
- [x] Avoid exposing payload or sensitive values in the summary.
- [x] Focused weak-spot summary tests passed: 1 suite, 4 tests.
- [x] Full Personal Plans suite passed: 56 suites, 289 tests.
- [x] TypeScript passed: `npx tsc --noEmit --pretty false`.
- [ ] P3.14 Connect weak-spot summary into day/package readiness so the package can explain why tasks are selected.

## Update 2026-06-01 - P3.14

- [x] Add pure task-selection reason readiness layer.
- [x] Give every plan exercise block at least one selection reason.
- [x] Attach weak-spot recovery reasons only when weak-spot content units match the block.
- [x] Attach recall/trainer/mistake due counts from weak-spot summary without inventing UI copy.
- [x] Gate missing task-selection reasons.
- [x] Gate weak-spot recovery reasons without concrete weak-spot evidence.
- [x] Gate due reasons from weak-spot summary without due counts.
- [x] Connect task-selection readiness into the non-production Gavan day 1 package draft.
- [x] Expose package summary fields for weak spots, task-selection reasons, and weak-spot task-selection reasons.
- [x] Keep the change outside live UI, onboarding, Premium, live catalog, and live quiz registry.
- [x] Focused task-selection tests passed: 1 suite, 4 tests.
- [x] Focused package/weak-summary tests passed: 3 suites, 16 tests.
- [x] Full Personal Plans suite passed: 57 suites, 294 tests.
- [x] TypeScript passed: `npx tsc --noEmit --pretty false`.
- [ ] P3.15 Generate user-facing task reason copy from reason codes with strict anti-robotic copy gates.

## Update 2026-06-01 - P3.15

- [x] Add pure user-facing task reason copy adapter.
- [x] Keep copy outside UI, onboarding, Premium, live catalog, and live quiz registry.
- [x] Cover every `PlanTaskSelectionReasonCode` with production copy.
- [x] Keep labels short enough for task cards.
- [x] Keep body text short enough for compact task cards.
- [x] Block developer/internal terms such as `block`, `contentUnit`, `weakSpot`, `renderer`, `destination`, and `active recall`.
- [x] Block banned user-facing wording such as `сцена`, `маршрут`, `плановый`, and `применяем конструкцию`.
- [x] Require real evidence for `weak_spot_recovery` copy.
- [x] Require real due counts for recall/trainer/mistake-review copy.
- [x] Add copy bundle builder from task-selection readiness.
- [x] Connect task reason copy bundle into the non-production Gavan day 1 package draft.
- [x] Gate invalid task reason copy through the package validator.
- [x] Focused task reason copy tests passed: 1 suite, 5 tests.
- [x] Focused package/selection/copy tests passed: 3 suites, 18 tests.
- [x] Full Personal Plans suite passed: 58 suites, 300 tests.
- [x] TypeScript passed: `npx tsc --noEmit --pretty false`.
- [ ] P3.16 Add audio asset readiness contract for listening tasks before any generated audio enters production.

## Update 2026-06-01 - P3.16

- [x] Add pure `PlanAudioAsset` readiness contract.
- [x] Support audio statuses: `placeholder`, `requested`, `generated`, `approved`, `failed`.
- [x] Allow placeholder audio for authoring while keeping it out of production-ready state.
- [x] Require approved audio to include stable asset id, target text, content units, URI, duration, voice id, provider, and `finalAssetReady`.
- [x] Block fake final audio claims on placeholder/generated assets.
- [x] Block approved audio missing final metadata.
- [x] Block audio requirements without target text or content units.
- [x] Connect audio readiness into Gavan week 1 package readiness.
- [x] Build listening placeholder assets from the week blueprint phrase text.
- [x] Keep real generated audio files out of this step.
- [x] Focused audio/package tests passed: 2 suites, 12 tests.
- [x] Full Personal Plans suite passed: 59 suites, 306 tests.
- [x] TypeScript passed: `npx tsc --noEmit --pretty false`.
- [x] P3.17 Add pronunciation attempt/scoring contract with honest confidence and no fake scoring claims.

## Update 2026-06-01 - P3.17

- [x] Add pure `PlanPronunciationAttempt` contract.
- [x] Keep pronunciation attempts outside UI, onboarding, Premium, Home, live catalog, live quiz registry, and storage writes.
- [x] Separate practice mode from scored mode.
- [x] Allow practice mode to store recording metadata without score.
- [x] Require scored mode to include scoring provider, scoring version, recognition confidence, and score.
- [x] Block progress penalties when recognition confidence is below `0.75`.
- [x] Block UI claims that promise exact pronunciation scoring before scoring is actually available.
- [x] Require failed and empty recordings to include explicit failure reasons.
- [x] Sanitize sensitive payload values before they can be stored on pronunciation attempts.
- [x] Research speech-recognition complaint patterns and encode the trust rule: no punishment for low-confidence recognition.
- [x] Focused pronunciation contract tests passed: 1 suite, 6 tests.
- [x] Full Personal Plans suite passed: 60 suites, 312 tests.
- [x] TypeScript passed: `npx tsc --noEmit --pretty false`.
- [x] P3.18 Add guarded production adapter/readiness bridge for Gavan day 1 only after copy/audio/pronunciation gates are green.

## Update 2026-06-01 - P3.18

- [x] Add pure `GavanDay1ProductionBridge`.
- [x] Keep bridge outside UI, onboarding, Premium, Home, live catalog, live quiz registry, and storage writes.
- [x] Report day 1 as blocked while content is still draft/scaffold-only.
- [x] Expose package gate status.
- [x] Expose task reason copy gate status.
- [x] Expose audio readiness status without fake final audio claims.
- [x] Expose pronunciation readiness status without fake scoring claims.
- [x] Produce one concise readiness summary with `blockers` and `ready` sections.
- [x] Fail if package/copy/audio/pronunciation gates are broken.
- [x] Source guard confirms the bridge does not import live catalog or live quiz registry.
- [x] Focused production bridge tests passed: 1 suite, 7 tests.
- [x] Full Personal Plans suite passed: 61 suites, 319 tests.
- [x] TypeScript passed: `npx tsc --noEmit --pretty false`.
- [x] P3.19 Start final Gavan day 1 content replacement using the reset rules, with the production bridge as the quality gate.

## Update 2026-06-01 - P3.19

- [x] Run competitor/product research before choosing the next implementation step.
- [x] Confirm best next path: content quality before live UI/catalog integration.
- [x] Add pure `GavanDay1ContentCandidate`.
- [x] Keep candidate outside UI, onboarding, Premium, Home, live catalog, live quiz registry, and storage writes.
- [x] Use five broad day-one phrases: `I'm here.`, `I need a minute.`, `Could you repeat that?`, `I don't understand yet.`, `Can you help me?`.
- [x] Avoid names, phone numbers, emails, addresses, exact personal data, apartment/bank/doctor/passport niche content.
- [x] Require every new word to be covered by explanation text.
- [x] Require every first-seen construction to be covered by explanation text.
- [x] Block wrong-answer explanations that mention unseen selected options.
- [x] Keep production bridge blocked until explicit content approval.
- [x] Source guard confirms the candidate does not import live catalog or live quiz registry.
- [x] Focused content candidate tests passed: 1 suite, 6 tests.
- [x] Full Personal Plans suite passed: 62 suites, 325 tests.
- [x] TypeScript passed: `npx tsc --noEmit --pretty false`.
- [x] P3.20 Connect approved Gavan day 1 content candidate into the non-production package draft, then rerun bridge and keep live integration gated.

## Update 2026-06-01 - P3.20

- [x] Run competitor/product audit before choosing the next implementation step.
- [x] Confirm best next path: package candidate integration before quiz/live integration.
- [x] Add optional `contentCandidate` input to `buildGavanDay1PackageDraft`.
- [x] Expose `draft.content.source` as `blueprint_draft` or `candidate`.
- [x] Clone candidate phrases into the non-production package draft.
- [x] Build explanation requirements from candidate new words and first-seen constructions.
- [x] Add `summary.contentPhrases`.
- [x] Add `invalid_content_candidate` package issue.
- [x] Keep day 1 quiz draft separate and draft-only.
- [x] Keep production bridge blocked until explicit content approval.
- [x] Source guard confirms package draft does not import live catalog or live quiz registry.
- [x] Focused package test passed: 1 suite, 14 tests.
- [x] Focused package/candidate/bridge tests passed: 3 suites, 27 tests.
- [x] Full Personal Plans suite passed: 62 suites, 330 tests.
- [x] TypeScript passed: `npx tsc --noEmit --pretty false`.
- [x] P3.21 Update the non-production day 1 quiz draft to candidate phrase ids and explanation targets.

## Update 2026-06-01 - P3.21

- [x] Add optional `contentCandidate` input to `buildGavanDay1QuizDraft`.
- [x] Add optional candidate/content phrase validation input to `validateGavanDay1QuizDraft`.
- [x] Build candidate quiz from five reset day 1 phrases.
- [x] Keep candidate quiz status as `draft`.
- [x] Keep candidate quiz at exactly 10 questions.
- [x] Add two quiz items per candidate phrase.
- [x] Use candidate phrase ids as quiz source phrase ids.
- [x] Limit candidate explanation targets to phrase text, meaning, context, new words, and first-seen constructions.
- [x] Remove candidate-facing authoring instructions such as `Explain that`.
- [x] Keep package candidate quiz aligned with package candidate content.
- [x] Source guard confirms quiz/package draft do not import live catalog or live quiz registry.
- [x] Targeted changed-file guard found no mojibake markers.
- [x] Focused quiz/package tests passed: 2 suites, 24 tests.
- [x] Full Personal Plans suite passed: 62 suites, 334 tests.
- [x] TypeScript passed: `npx tsc --noEmit --pretty false`.
- [x] P3.22 Add stricter candidate quiz prompt/copy honesty gate.

## Update 2026-06-01 - P3.22

- [x] Run competitor/product audit before choosing the next implementation step.
- [x] Confirm best next path: reusable quiz copy gate before production bridge expansion.
- [x] Add candidate copy gate to `validateGavanDay1QuizDraft`.
- [x] Add `candidate_quiz_developer_copy`.
- [x] Add `candidate_quiz_authoring_instruction`.
- [x] Add `candidate_quiz_ungrounded_explanation_target`.
- [x] Add `candidate_quiz_prompt_too_short`.
- [x] Keep current candidate quiz passing the new gate.
- [x] Block developer/internal terms in candidate prompts and explanation notes.
- [x] Block authoring instructions such as `Explain that`.
- [x] Block ungrounded explanation targets.
- [x] Block too-short prompts.
- [x] Keep wrong-answer selected-option honesty enforced.
- [x] Run package candidate quiz validation through the candidate copy gate.
- [x] Source guard confirms quiz/package draft do not import live catalog or live quiz registry.
- [x] Targeted changed-file guard found no mojibake markers.
- [x] Focused quiz/package tests passed: 2 suites, 29 tests.
- [x] Full Personal Plans suite passed: 62 suites, 339 tests.
- [x] TypeScript passed: `npx tsc --noEmit --pretty false`.
- [x] P3.23 Add candidate quiz readiness as a named section in the production bridge.

## Update 2026-06-01 - P3.23

- [x] Run competitor/product audit before choosing the next implementation step.
- [x] Confirm best next path: production bridge quiz section before approval wiring.
- [x] Add `quiz` section to `GavanDay1ProductionBridge`.
- [x] Add `quiz_gate_failed` bridge issue code.
- [x] Report quiz items, choices, explanation requirements, status, and issue codes.
- [x] Validate candidate package quiz through candidate phrases and candidate copy gate.
- [x] Keep content approval separate from quiz readiness.
- [x] Add `quiz` to bridge summary `ready` or `blockers`.
- [x] Block bridge quiz section when candidate quiz validation fails.
- [x] Source guard confirms bridge/package/quiz draft do not import live catalog or live quiz registry.
- [x] Targeted changed-file guard found no mojibake markers.
- [x] Focused bridge/package/quiz tests passed: 3 suites, 39 tests.
- [x] Full Personal Plans suite passed: 62 suites, 342 tests.
- [x] TypeScript passed: `npx tsc --noEmit --pretty false`.
- [x] P3.24 Add explicit production approval/readiness input for all bridge sections.

## Update 2026-06-01 - P3.24

- [x] Run competitor/product audit before choosing the next implementation step.
- [x] Confirm best next path: explicit release criteria before audio/listening expansion.
- [x] Add `production` readiness section to `GavanDay1ProductionBridge`.
- [x] Add `production.canRelease`.
- [x] Add required ready sections: `content`, `package`, `quiz`, `copy`.
- [x] Add accepted `not_required` sections: `audio`, `pronunciation`.
- [x] Add release criteria flags for content/package/quiz/copy/audio/pronunciation.
- [x] Keep content approval separate from package/quiz/copy readiness.
- [x] Block release when content approval is present but quiz readiness fails.
- [x] Accept audio/pronunciation as `not_required` only with no requirements and no fake final claims.
- [x] Fake final audio/pronunciation claims now block their own sections.
- [x] Source guard confirms bridge/package/quiz draft do not import live catalog or live quiz registry.
- [x] Targeted changed-file guard found no mojibake markers.
- [x] Focused bridge/package/quiz tests passed: 3 suites, 42 tests.
- [x] Full Personal Plans suite passed: 62 suites, 345 tests.
- [x] TypeScript passed: `npx tsc --noEmit --pretty false`.
- [x] P3.25 Prepare audio/listening readiness for candidate day 1 without fake generated audio.

## Update 2026-06-01 - P3.25

- [x] Run competitor/product audit before choosing the next implementation step.
- [x] Confirm best next path: audio/listening readiness metadata before pronunciation scoring.
- [x] Keep candidate day 1 with `audio.status = not_required` when no listening requirement exists.
- [x] Add bridge behavior for placeholder listening audio: valid for authoring but blocked for production.
- [x] Add bridge behavior for approved listening audio metadata with asset id, URI, target text, duration, voice id/provider, and final readiness.
- [x] Stop treating approved final audio as a fake claim.
- [x] Keep fake final audio blocking for placeholders and package-level media claims.
- [x] Add `audio_not_production_ready` to audio section issues when required audio is not final.
- [x] Validate week 1 listening requirements through `PlanAudioAsset`.
- [x] Source guard confirms bridge/package/quiz draft do not import live catalog or live quiz registry.
- [x] Targeted changed-file guard found no mojibake markers.
- [x] Focused audio/package/bridge tests passed: 3 suites, 29 tests.
- [x] Full Personal Plans suite passed: 62 suites, 349 tests.
- [~] TypeScript full check is blocked by unrelated `components/onboarding.tsx` style/type errors.
- [x] P3.26 Prepare pronunciation practice readiness without fake scoring.

## Update 2026-06-01 - P3.26

- [x] Run competitor/product audit before choosing the next implementation step.
- [x] Confirm best next path: pronunciation readiness metadata before any microphone/scoring UI.
- [x] Add pure `PlanPronunciationScoringRequirement` contract.
- [x] Add `buildBlockedPlanPronunciationScoringRequirement`.
- [x] Add `validatePlanPronunciationScoringRequirement`.
- [x] Keep pronunciation `not_required` on candidate day 1 when no pronunciation requirement exists.
- [x] Block production when pronunciation is required but scoring is not ready.
- [x] Allow future ready scoring only with scorer id, provider, version, result fields, minimum confidence, and final readiness.
- [x] Stop treating complete ready pronunciation scoring as fake.
- [x] Keep fake final scoring blocked for blocked requirements and package-level media claims.
- [x] Surface pronunciation issue codes on the production bridge.
- [x] Fix real Russian exact-scoring claim detection for pronunciation copy.
- [x] Source guard confirms bridge/package/quiz draft do not import live catalog or live quiz registry.
- [x] Targeted changed-file guard found no mojibake markers.
- [x] Focused pronunciation/package/bridge tests passed: 4 suites, 39 tests.
- [x] Full Personal Plans suite passed: 63 suites, 358 tests.
- [x] TypeScript passed: `npx tsc --noEmit --pretty false`.
- [x] P3.27 Create candidate day 1 release/approval fixture after all readiness sections are explicit.

## Update 2026-06-01 - P3.27

- [x] Run competitor/product audit before choosing the next implementation step.
- [x] Confirm best next path: candidate release fixture before new content authoring.
- [x] Add pure `GavanDay1ReleaseFixture`.
- [x] Mark fixture as `candidate_release_gate`.
- [x] Keep fixture `liveIntegration: false`.
- [x] Build fixture from candidate content, package draft, and production bridge.
- [x] Approve content explicitly inside the release fixture.
- [x] Expose all release sections: content, package, quiz, copy, audio, pronunciation.
- [x] Expose `productionCanRelease`.
- [x] Expose blocked sections and accepted `not_required` sections.
- [x] Add `validateGavanDay1ReleaseFixture`.
- [x] Fail release fixture when candidate content is invalid.
- [x] Fail release fixture when package, quiz, copy, audio, or pronunciation gates fail.
- [x] Keep release fixture outside live catalog and live quiz registry.
- [x] Focused release fixture test passed: 1 suite, 5 tests.
- [x] Focused fixture/package/bridge/content/quiz tests passed: 5 suites, 59 tests.
- [x] Full Personal Plans suite passed: 64 suites, 363 tests.
- [x] TypeScript passed: `npx tsc --noEmit --pretty false`.
- [x] Source guard confirms bridge/package/quiz/release fixture do not import live catalog or live quiz registry.
- [x] Targeted changed-file guard found no mojibake markers in release fixture files.
- [x] P3.28 Add corrupted-copy/mojibake gates before final Gavan content writing.

## Update 2026-06-01 - P3.28

- [x] Run encoding/localization/product audit before choosing the next implementation step.
- [x] Confirm best next path: corrupted-copy gates before final content rewriting.
- [x] Add `corrupted_copy` to content quality validation.
- [x] Reject corrupted copy in phrase text, translations, explanations, visible options, new words, and constructions.
- [x] Add `candidate_quiz_corrupted_copy`.
- [x] Reject corrupted copy in candidate quiz prompts, choices, and explanation notes.
- [x] Add `corrupted_copy` to task reason copy validation.
- [x] Reject corrupted copy in task reason labels and bodies.
- [x] Release fixture fails when candidate content contains corrupted copy.
- [x] Keep intentional mojibake test samples as Unicode escapes so source files remain clean.
- [x] Focused content/quiz/copy/release tests passed: 4 suites, 35 tests.
- [x] Full Personal Plans suite passed: 64 suites, 367 tests.
- [x] TypeScript passed: `npx tsc --noEmit --pretty false`.
- [x] Source guard confirms target files do not import live catalog or live quiz registry.
- [x] Targeted changed-file guard found no literal mojibake markers.
- [x] P3.29 Rewrite Gavan day 1 candidate content in clean universal-first Russian copy.

## Update 2026-06-01 - P3.29

- [x] Run competitor/product audit before choosing the next implementation step.
- [x] Confirm best next path: candidate content rewrite before UI/render polish.
- [x] Rewrite `Gavan` day 1 candidate phrases in clean Russian.
- [x] Use universal-first phrase set: arrival, pause, repeat request, understanding, help.
- [x] Keep rejected day 1/day 2 direction out of candidate content.
- [x] Add tests blocking private-data and narrow day-one content.
- [x] Add tests for clean user-facing candidate quiz prompts.
- [x] Add tests for readable grounded explanations.
- [x] Rewrite candidate quiz copy without authoring instructions or mojibake.
- [x] Rewrite task reason copy without corrupted Russian.
- [x] Preserve legacy fallback target tags for attempt events, weak spots, and explanation cards.
- [x] Focused content/quiz/copy/release tests passed: 4 suites, 37 tests.
- [x] Full Personal Plans suite passed: 64 suites, 370 tests.
- [x] TypeScript passed: `npx tsc --noEmit --pretty false`.
- [x] Source guard confirms target files do not import live catalog or live quiz registry.
- [x] Targeted changed-file guard found no literal mojibake markers.
- [x] P3.30 Add reviewer-friendly release evidence output for the candidate day.

## Update 2026-06-01 - P3.30

- [x] Run release-readiness/product audit before choosing the next implementation step.
- [x] Confirm best next path: evidence output before audio/listening expansion.
- [x] Add `GavanDay1ReleaseEvidence` types.
- [x] Add `buildGavanDay1ReleaseEvidence`.
- [x] Evidence includes day id and `liveIntegration: false`.
- [x] Evidence includes go/hold decision.
- [x] Evidence lists blocked and accepted `not_required` sections.
- [x] Evidence lists content/package/quiz/copy/audio/pronunciation sections.
- [x] Evidence includes section status, required flag, accepted-not-required flag, issue codes, and counts.
- [x] Evidence includes candidate phrase count, quiz count, and task reason copy count.
- [x] Evidence includes safe task reason copy preview.
- [x] Blocked evidence exposes exact issue codes for quiz and copy failures.
- [x] Focused release fixture/evidence tests passed: 1 suite, 9 tests.
- [x] Full Personal Plans suite passed: 64 suites, 373 tests.
- [x] TypeScript passed: `npx tsc --noEmit --pretty false`.
- [x] Source guard confirms release fixture does not import live catalog or live quiz registry.
- [x] Targeted changed-file guard found no literal mojibake markers.
- [x] P3.31 Prepare honest audio/listening authoring requirements for clean Gavan day 1.

## Update 2026-06-01 - P3.31

- [x] Run local audio/listening gate audit before implementation.
- [x] Run competitor research for listening/scaffold direction.
- [x] Confirm best next path: listening authoring metadata before final audio generation.
- [x] Add `GavanDay1ListeningAuthoringPlan`.
- [x] Add planned listening prompts for all five clean day 1 candidate phrases.
- [x] Ground every listening prompt in a candidate phrase id and exact target text.
- [x] Add placeholder `PlanAudioAsset` that is valid for authoring and not production-ready.
- [x] Add `validateGavanDay1ListeningAuthoringPlan`.
- [x] Fail listening authoring when a prompt references unknown candidate content.
- [x] Fail listening authoring when prompt text drifts from candidate phrase text.
- [x] Fail fake final audio claims through the existing `PlanAudioAsset` gate.
- [x] Add `attachGavanDay1ListeningAuthoringToDraft` for release-gate simulation.
- [x] Release evidence changes to `hold` when listening is required but audio is still placeholder.
- [x] Keep default day 1 candidate release at `go` with audio accepted as `not_required`.
- [x] Reject `generated` or `approved` audio status inside authoring-only listening requirements.
- [x] No UI imports, storage writes, live catalog edits, or live quiz registry edits.
- [x] Focused listening authoring tests passed: 1 suite, 6 tests.
- [x] Focused audio/package/bridge/release/listening tests passed: 5 suites, 48 tests.
- [x] Full Personal Plans suite passed: 65 suites, 379 tests.
- [x] TypeScript passed: `npx tsc --noEmit --pretty false`.
- [x] Source and encoding guards passed for changed P3.31 files.
- [x] P3.32 Prepare pronunciation authoring requirements for clean Gavan day 1 without fake scoring.

## Update 2026-06-01 - P3.32

- [x] Run local pronunciation/readiness/bridge/release audit before implementation.
- [x] Confirm best next path: pronunciation authoring metadata before any microphone UI or scoring work.
- [x] Add `GavanDay1PronunciationAuthoringPlan`.
- [x] Add planned pronunciation targets for all five clean day 1 candidate phrases.
- [x] Ground every pronunciation target in a candidate phrase id and exact target text.
- [x] Add blocked `PlanPronunciationScoringRequirement` that is valid for authoring and not production-ready.
- [x] Add `validateGavanDay1PronunciationAuthoringPlan`.
- [x] Fail pronunciation authoring when a target references unknown candidate content.
- [x] Fail pronunciation authoring when target text drifts from candidate phrase text.
- [x] Fail authoring-only metadata if it claims `ready` scoring.
- [x] Fail fake final pronunciation scoring claims.
- [x] Add `attachGavanDay1PronunciationAuthoringToDraft` for release-gate simulation.
- [x] Release evidence changes to `hold` when pronunciation is required but scoring is not final.
- [x] Keep default day 1 candidate release at `go` with pronunciation accepted as `not_required`.
- [x] No UI imports, storage writes, live catalog edits, or live quiz registry edits.
- [x] Red test failed first because `personal_plan_gavan_day1_pronunciation_authoring` did not exist.
- [x] Focused pronunciation authoring tests passed: 1 suite, 7 tests.
- [x] Focused pronunciation/readiness/bridge/release tests passed: 4 suites, 39 tests.
- [x] Full Personal Plans suite passed: 66 suites, 386 tests.
- [x] TypeScript passed: `npx tsc --noEmit --pretty false`.
- [x] Production source guard passed for `app/personal_plan_gavan_day1_pronunciation_authoring.ts`.
- [x] Encoding guard passed for new P3.32 app/test files.
- [x] P3.33 Create combined authoring readiness bundle for clean Gavan day 1.

## Update 2026-06-01 - P3.33

- [x] Run local bundle/release/listening/pronunciation audit before implementation.
- [x] Confirm best next path: reviewer-facing combined bundle before any UI or live integration.
- [x] Add `GavanDay1AuthoringBundle`.
- [x] Bundle includes `dayId` and `liveIntegration: false`.
- [x] Bundle includes content candidate summary and quality result.
- [x] Bundle includes package block count and explanation requirement count.
- [x] Bundle includes quiz item count, choice count, explanation requirement count, and validation result.
- [x] Bundle includes explanation coverage summary.
- [x] Bundle includes listening authoring summary.
- [x] Bundle keeps listening planned but not release-required by default.
- [x] Bundle can attach listening to release evidence and expose audio blockers.
- [x] Bundle includes pronunciation authoring summary.
- [x] Bundle keeps pronunciation planned but not release-required by default.
- [x] Bundle can attach pronunciation to release evidence and expose scoring blockers.
- [x] Bundle includes release evidence decision.
- [x] Bundle includes compact reviewer checklist.
- [x] Add `validateGavanDay1AuthoringBundle`.
- [x] Fail validation if the bundle claims live integration.
- [x] Fail validation if release evidence hides attached media blockers.
- [x] No UI imports, storage writes, live catalog edits, or live quiz registry edits.
- [x] Red test failed first because `personal_plan_gavan_day1_authoring_bundle` did not exist.
- [x] Focused authoring bundle tests passed: 1 suite, 6 tests.
- [x] Focused bundle/listening/pronunciation/release tests passed: 4 suites, 28 tests.
- [x] Full Personal Plans suite passed: 67 suites, 392 tests.
- [x] TypeScript passed: `npx tsc --noEmit --pretty false`.
- [x] Production source guard passed for `app/personal_plan_gavan_day1_authoring_bundle.ts`.
- [x] Encoding guard passed for new P3.33 app/test files.
- [x] P3.34 Define production-safe adapter plan from the day 1 authoring bundle to future reviewer/dev surfaces.

## Update 2026-06-01 - P3.34

- [x] Run local display adapter/bundle audit before implementation.
- [x] Confirm best next path: display-ready metadata before any UI.
- [x] Add `GavanDay1AuthoringDisplayModel`.
- [x] Add `buildGavanDay1AuthoringDisplayModel`.
- [x] Add `validateGavanDay1AuthoringDisplayModel`.
- [x] Adapter consumes `GavanDay1AuthoringBundle`.
- [x] Adapter emits stable reviewer cards for content, package, quiz, explanations, listening, pronunciation, and release.
- [x] Every card has id, label, status, count summary, issue codes, and reviewer copy.
- [x] Planned media rows stay visibly `planned`, not ready.
- [x] Attached media blockers show exact blocker codes.
- [x] Release card exposes blocked sections.
- [x] Reviewer copy gate rejects developer wording and fake media claims.
- [x] Display output keeps `liveIntegration: false`.
- [x] No React, React Native, storage, navigation, live catalog, or live quiz registry dependencies.
- [x] Red test failed first because `personal_plan_gavan_day1_authoring_display_adapter` did not exist.
- [x] Focused display adapter tests passed: 1 suite, 6 tests.
- [x] Focused display adapter + bundle tests passed: 2 suites, 12 tests.
- [x] Full Personal Plans suite passed: 68 suites, 398 tests.
- [x] TypeScript passed: `npx tsc --noEmit --pretty false`.
- [x] Production source guard passed for `app/personal_plan_gavan_day1_authoring_display_adapter.ts`.
- [x] Encoding guard passed for new P3.34 app/test files.
- [x] P3.35 Start clean Gavan day 1 content QA pass for explanation texts and quiz copy.

## Update 2026-06-01 - P3.35

- [x] Run local content/quiz QA audit before implementation.
- [x] Confirm best next path: copy quality pass before any user-facing renderer work.
- [x] Add style gate for candidate explanation cards: two or three short human sentences.
- [x] Add useful-length gate for explanation cards.
- [x] Add quiz note style gate against repetitive `Да:` confirmation formulas.
- [x] Add quiz note useful-length gate.
- [x] Keep candidate phrase ids and quiz item ids unchanged.
- [x] Remove repetitive `Да:` starts from candidate quiz notes.
- [x] Expand short `Need` quiz note so it explains the word and phrase purpose.
- [x] Preserve no-live-registry rule for content and quiz draft.
- [x] Preserve no UI/storage/audio/pronunciation changes.
- [x] Focused content/quiz tests passed: 2 suites, 27 tests.
- [x] Focused content/quiz/bundle/display tests passed: 4 suites, 39 tests.
- [x] Full Personal Plans suite passed: 68 suites, 400 tests.
- [x] TypeScript passed: `npx tsc --noEmit --pretty false`.
- [x] Production source guard passed for changed app files.
- [x] App-level encoding guard passed for changed content/quiz app files.
- [x] `Да:` guard passed for candidate quiz draft.
- [x] P3.36 Create reviewer export fixture with display adapter output and exact content/quiz snippets for manual approval.

## Update 2026-06-01 - P3.36

- [x] Run local reviewer-export/display/content/quiz audit before implementation.
- [x] Confirm best next path: manual-review fixture before any user-facing renderer or live registry work.
- [x] Add `GavanDay1ReviewerExportFixture`.
- [x] Add `buildGavanDay1ReviewerExportFixture`.
- [x] Add `validateGavanDay1ReviewerExportFixture`.
- [x] Fixture includes `kind`, `dayId`, and `liveIntegration: false`.
- [x] Fixture includes display adapter cards and release decision.
- [x] Fixture exports exact phrase explanation snippets with phrase ids and covered targets.
- [x] Fixture exports exact quiz prompt snippets with item ids.
- [x] Fixture exports exact quiz note snippets with item ids and choice ids.
- [x] Every snippet is marked `needs_manual_review`.
- [x] Validation rejects approved snippets, unsafe developer copy, mojibake, repetitive confirmation starts, and fake selected-answer context.
- [x] Keep fixture pure metadata: no UI, storage, navigation, live catalog, live quiz registry, audio generation, or scoring.
- [x] Red test failed first because `personal_plan_gavan_day1_reviewer_export_fixture` did not exist.
- [x] Focused reviewer export tests passed: 1 suite, 6 tests.
- [x] Focused reviewer/content/quiz/display tests passed: 4 suites, 39 tests.
- [x] Full Personal Plans suite passed: 69 suites, 406 tests.
- [x] TypeScript passed: `npx tsc --noEmit --pretty false`.
- [x] Source guard passed for `app/personal_plan_gavan_day1_reviewer_export_fixture.ts`.
- [x] Encoding guard passed for new P3.36 app/test files.
- [x] `Да:` guard passed for new P3.36 app/test files.
- [x] P3.37 Add automated reviewer approval gate around the export fixture while still requiring explicit manual approval before production integration.

## Update 2026-06-01 - P3.37

- [x] Run local approval/reviewer-export/content/quiz/display audit before implementation.
- [x] Confirm best next path: approval gate before any renderer, JSON report, or production bridge.
- [x] Add `GavanDay1ReviewerApprovalRecord`.
- [x] Add `GavanDay1ReviewerApprovalInput`.
- [x] Add `GavanDay1ApprovedReviewerExport`.
- [x] Add deterministic `checksumGavanDay1ReviewerSnippet`.
- [x] Add `buildGavanDay1ReviewerApprovalInput`.
- [x] Add `validateGavanDay1ReviewerApprovalGate`.
- [x] Add `approveGavanDay1ReviewerExportFixture`.
- [x] Add `validateGavanDay1ApprovedReviewerExport`.
- [x] Approval input references only snippet ids from the reviewer export fixture.
- [x] Every snippet requires reviewer id, approvedAt ISO timestamp, snippet kind, snippet id, and text checksum.
- [x] Gate fails partial approval.
- [x] Gate fails unknown snippet ids.
- [x] Gate fails invalid reviewer metadata.
- [x] Gate fails changed text checksum after approval.
- [x] Approved export rejects pending snippets.
- [x] Approval result exposes approved counts by snippet kind.
- [x] Keep approval gate pure metadata: no UI, storage, navigation, live catalog, live quiz registry, audio generation, or scoring.
- [x] Red test failed first because `personal_plan_gavan_day1_reviewer_approval_gate` did not exist.
- [x] Focused approval gate tests passed: 1 suite, 6 tests.
- [x] Focused approval/reviewer/content/quiz/display tests passed: 5 suites, 45 tests.
- [x] Full Personal Plans suite passed: 70 suites, 412 tests.
- [x] TypeScript passed: `npx tsc --noEmit --pretty false`.
- [x] Source guard passed for `app/personal_plan_gavan_day1_reviewer_approval_gate.ts`.
- [x] Encoding guard passed for new P3.37 app/test files.
- [x] `Да:` guard passed for new P3.37 app/test files.
- [x] P3.38 Create reviewer-facing approved export JSON/report builder while still keeping Gavan day 1 outside production integration.

## Update 2026-06-01 - P3.38

- [x] Run local report/approval/reviewer-export audit before implementation.
- [x] Confirm best next path: human-readable approved report before any file writer or production bridge.
- [x] Add `GavanDay1ApprovedExportReport`.
- [x] Add `GavanDay1ApprovedExportReportRow`.
- [x] Add `buildGavanDay1ApprovedExportReport`.
- [x] Add `validateGavanDay1ApprovedExportReport`.
- [x] Report includes `kind`, `dayId`, and `liveIntegration: false`.
- [x] Report includes release decision.
- [x] Report includes display card summary with ready/planned/blocked counts.
- [x] Report groups approved rows into phrase explanations, quiz prompts, and quiz notes.
- [x] Every row includes snippet id, snippet kind, exact text, review status, reviewer id, approvedAt, and checksum.
- [x] Report exposes human-review totals.
- [x] Validation fails missing approval metadata.
- [x] Validation fails checksum mismatch against exact text.
- [x] Validation fails pending snippets inside approved report.
- [x] Keep report builder pure metadata: no UI, storage, navigation, live catalog, live quiz registry, audio generation, or scoring.
- [x] Red test failed first because `personal_plan_gavan_day1_approved_export_report` did not exist.
- [x] Focused approved report tests passed: 1 suite, 7 tests.
- [x] Focused report/approval/reviewer export tests passed: 3 suites, 19 tests.
- [x] Full Personal Plans suite passed: 71 suites, 419 tests.
- [x] TypeScript passed: `npx tsc --noEmit --pretty false`.
- [x] Source guard passed for `app/personal_plan_gavan_day1_approved_export_report.ts`.
- [x] Encoding guard passed for new P3.38 app/test files.
- [x] `Да:` guard passed for new P3.38 app/test files.
- [x] P3.39 Add a non-production artifact writer for approved report JSON under `.codex-tmp` or `docs/reports`, still not live-integrated.

## Update 2026-06-01 - P3.39

- [x] Run local artifact/report/approval/reviewer-export audit before implementation.
- [x] Confirm best next path: writer in `tools`, not `app`, to avoid Node `fs` in app runtime.
- [x] Add `GavanDay1ApprovedReportArtifact`.
- [x] Add `serializeGavanDay1ApprovedReportArtifact`.
- [x] Add `writeGavanDay1ApprovedReportArtifact`.
- [x] Add `isGavanDay1ApprovedReportArtifactTargetAllowed`.
- [x] Writer accepts approved export report and target path.
- [x] Writer allows only `.codex-tmp` and `docs/reports` targets.
- [x] Writer rejects source/tooling targets such as `app`, `tools`, `tests`, and root config targets.
- [x] Writer serializes deterministic pretty JSON.
- [x] Artifact includes generatedAt, report kind, day id, liveIntegration false, totals, and grouped rows.
- [x] Writer validates report before writing.
- [x] Writer fails invalid report before creating the file.
- [x] Keep writer outside UI, storage, navigation, live catalog, live quiz registry, audio generation, and scoring.
- [x] Red test failed first because `tools/personal_plan_gavan_day1_approved_report_artifact` did not exist.
- [x] Focused artifact writer tests passed: 1 suite, 6 tests.
- [x] Focused artifact/report/approval/reviewer export tests passed: 4 suites, 25 tests.
- [x] Full Personal Plans suite passed: 72 suites, 425 tests.
- [x] TypeScript passed: `npx tsc --noEmit --pretty false`.
- [x] Source guard passed for `tools/personal_plan_gavan_day1_approved_report_artifact.ts`.
- [x] Encoding guard passed for new P3.39 tool/test files.
- [x] `Да:` guard passed for new P3.39 tool/test files.
- [x] P3.40 Generate the first approved-report JSON artifact under `.codex-tmp` for human inspection and audit readability/completeness.

## Update 2026-06-01 - P3.40

- [x] Run local generated-artifact/artifact-writer/report/approval audit before implementation.
- [x] Confirm best next path: generate a real inspection artifact under `.codex-tmp`, not a production bridge.
- [x] Add `GAVAN_DAY1_APPROVED_REPORT_ARTIFACT_PATH`.
- [x] Add `buildCleanGavanDay1ApprovedReport`.
- [x] Add `auditGavanDay1ApprovedReportArtifact`.
- [x] Add `generateGavanDay1ApprovedReportArtifact`.
- [x] Generate `.codex-tmp/personal-plans/gavan-day1-approved-report.json`.
- [x] Artifact includes `generatedAt`, report kind, day id, and `liveIntegration: false`.
- [x] Artifact includes 5 phrase explanation rows, 10 quiz prompt rows, and 30 quiz note rows.
- [x] Artifact totals match 45 approved rows.
- [x] Every exported row includes exact text, reviewer id, approval timestamp, and checksum.
- [x] Generated artifact parses back and validates as an approved export report.
- [x] Artifact audit returns readability and completeness summary.
- [x] Keep generator and artifact pure tooling: no UI, storage, navigation, live catalog, live quiz registry, audio generation, or scoring.
- [x] Red test failed first because `tools/personal_plan_gavan_day1_generated_artifact` did not exist.
- [x] Focused generated artifact tests passed: 1 suite, 6 tests.
- [x] Focused generated-artifact/artifact-writer/report/approval tests passed: 5 suites, 31 tests.
- [x] Full Personal Plans suite passed: 73 suites, 431 tests.
- [x] TypeScript passed: `npx tsc --noEmit --pretty false`.
- [x] Source guard passed for `tools/personal_plan_gavan_day1_generated_artifact.ts`.
- [x] Encoding guard passed for new P3.40 tool/test files and generated artifact.
- [x] `Да:` guard passed for new P3.40 tool/test files and generated artifact.
- [x] Artifact exists at 25,631 bytes.
- [x] P3.41 Add stricter product-copy audit gate against generated approved artifact rows before production bridge.

## Update 2026-06-01 - P3.41

- [x] Run local generated-artifact/report/approval audit before implementation.
- [x] Confirm best next path: add a blocking product-copy gate before any production bridge.
- [x] Add `GavanDay1ArtifactCopyAuditIssueCode`.
- [x] Add `GavanDay1ArtifactCopyAuditIssue`.
- [x] Add `GavanDay1ArtifactCopyAuditSummary`.
- [x] Add `auditGavanDay1ApprovedArtifactCopy`.
- [x] Gate reads generated approved artifact/report rows.
- [x] Gate checks expected row groups: 5 phrase explanations, 10 quiz prompts, 30 quiz notes.
- [x] Gate rejects non-approved rows.
- [x] Gate rejects mojibake/replacement characters.
- [x] Gate rejects developer, placeholder, or robotic wording.
- [x] Gate rejects fake selected-answer context.
- [x] Gate rejects repetitive formula starts such as `Да:`.
- [x] Gate rejects too-short phrase explanations and quiz notes.
- [x] Gate rejects technical target tails in phrase explanation `exactText`.
- [x] Gate returns issue code, row group, snippet id, excerpt, and detail.
- [x] Current generated artifact is intentionally blocked by the gate because phrase explanation `exactText` includes technical covered-target tails.
- [x] Keep copy audit pure tooling: no UI, storage, navigation, live catalog, live quiz registry, audio generation, or scoring.
- [x] Red test failed first because `tools/personal_plan_gavan_day1_artifact_copy_audit` did not exist.
- [x] Focused copy-audit tests passed: 1 suite, 5 tests.
- [x] Focused copy-audit/generated-artifact/artifact-writer/report/approval tests passed: 6 suites, 36 tests.
- [x] Full Personal Plans suite passed: 74 suites, 436 tests.
- [x] TypeScript passed: `npx tsc --noEmit --pretty false`.
- [x] Source guard passed for `tools/personal_plan_gavan_day1_artifact_copy_audit.ts`.
- [x] Encoding guard passed for new P3.41 tool/test/report files.
- [x] P3.42 Rewrite approved report exactText assembly so learner-facing rows do not include technical covered-target tails, then require product-copy gate to pass.

## Update 2026-06-01 - P3.42

- [x] Run local report/copy-audit/generated-artifact audit before implementation.
- [x] Confirm best next path: fix `exactText` assembly, not UI or live integration.
- [x] Add tests first requiring phrase explanation `exactText` to exclude technical covered-target tails.
- [x] Add tests requiring phrase explanation rows to expose `coveredTargets` separately as metadata.
- [x] Add tests requiring checksum validation to catch changed learner-facing phrase explanation text.
- [x] Add tests requiring generated artifact to pass `auditGavanDay1ApprovedArtifactCopy`.
- [x] Update `GavanDay1ApprovedExportReportRow` with optional `coveredTargets`.
- [x] Update approved report phrase explanation `exactText` to include only phrase, translation, title, and explanation body.
- [x] Keep `coveredTargets` as metadata on phrase explanation rows.
- [x] Update reviewer approval checksum visible text to match learner-facing exact text.
- [x] Update reviewer export fixture visible text to keep technical targets out of copy validation.
- [x] Regenerate `.codex-tmp/personal-plans/gavan-day1-approved-report.json`.
- [x] Confirm regenerated artifact first phrase row no longer ends with `here I'm`.
- [x] Confirm regenerated artifact keeps `coveredTargets: ["here", "I'm"]`.
- [x] Focused report/copy-audit/generated-artifact/approval tests passed: 5 suites, 32 tests.
- [x] Full Personal Plans suite passed: 74 suites, 438 tests.
- [x] TypeScript passed: `npx tsc --noEmit --pretty false`.
- [x] Source guard passed for changed P3.42 app/tool files.
- [x] Encoding guard passed for changed P3.42 app/tool/test/report files and regenerated artifact.
- [x] P3.43 Add a non-live production bridge draft readiness gate requiring structural validation, generated artifact validation, and product-copy audit all passing before live registry edits.

## Update 2026-06-01 - P3.43

- [x] Run local readiness/report/artifact/copy audit before implementation.
- [x] Confirm best next path: readiness gate only, no live registry edits.
- [x] Add `GavanDay1ProductionBridgeReadinessStageId`.
- [x] Add `GavanDay1ProductionBridgeReadinessIssue`.
- [x] Add `GavanDay1ProductionBridgeReadinessStage`.
- [x] Add `GavanDay1ProductionBridgeReadinessResult`.
- [x] Add `buildGavanDay1ProductionBridgeReadiness`.
- [x] Readiness gate accepts regenerated clean approved artifact.
- [x] Readiness gate rejects invalid approved report rows.
- [x] Readiness gate rejects invalid artifact kind and `liveIntegration: true`.
- [x] Readiness gate rejects product-copy failures even when report checksums match.
- [x] Readiness result exposes stage-level statuses, issue counts, blockers, and summary.
- [x] Keep readiness gate pure tooling: no UI, storage, navigation, live catalog, live quiz registry, audio generation, or scoring.
- [x] Clean copy-audit source regex/ellipsis to avoid raw Cyrillic/smart punctuation in tooling source.
- [x] Red test failed first because `tools/personal_plan_gavan_day1_production_bridge_readiness` did not exist.
- [x] Focused readiness tests passed: 1 suite, 6 tests.
- [x] Focused readiness/report/copy-audit/generated-artifact tests passed: 5 suites, 32 tests.
- [x] Full Personal Plans suite passed: 75 suites, 444 tests.
- [x] TypeScript passed: `npx tsc --noEmit --pretty false`.
- [x] Source guard passed for P3.43 tooling files.
- [x] Encoding guard passed for P3.43 tool/test/report files.
- [x] P3.44 Prepare a dry-run production bridge manifest under `.codex-tmp` or `docs/reports` describing exact future live catalog/quiz additions without editing live files.

## Update 2026-06-02 - P3.44

- [x] Run local manifest/readiness/generated-artifact audit before implementation.
- [x] Confirm best next path: dry-run manifest only, no live source edits.
- [x] Add `GAVAN_DAY1_DRY_RUN_BRIDGE_MANIFEST_PATH`.
- [x] Add `GavanDay1DryRunBridgeManifest`.
- [x] Add `GavanDay1DryRunBridgeManifestCatalogUnit`.
- [x] Add `GavanDay1DryRunBridgeManifestQuiz`.
- [x] Add `buildGavanDay1DryRunBridgeManifest`.
- [x] Add `writeGavanDay1DryRunBridgeManifest`.
- [x] Add allowed-root guard for `.codex-tmp` and `docs/reports`.
- [x] Manifest builds only from readiness-ready artifact.
- [x] Manifest includes readiness result.
- [x] Manifest lists proposed future files without importing live registries.
- [x] Manifest lists 5 proposed catalog unit ids.
- [x] Manifest lists quiz id `gavan-week1-day1-quiz` and 10 item ids.
- [x] Manifest lists 10 prompt snippet ids and 30 note snippet ids.
- [x] Manifest writer rejects `app`, `tools`, and `tests` targets.
- [x] Manifest written to `.codex-tmp/personal-plans/gavan-day1-dry-run-bridge-manifest.json`.
- [x] Red test failed first because `tools/personal_plan_gavan_day1_dry_run_bridge_manifest` did not exist.
- [x] Focused manifest tests passed: 1 suite, 6 tests.
- [x] Focused manifest/readiness/generated-artifact tests passed: 4 suites, 24 tests.
- [x] Full Personal Plans suite passed: 76 suites, 450 tests.
- [x] TypeScript passed: `npx tsc --noEmit --pretty false`.
- [x] Source guard passed for P3.44 tooling file.
- [x] Encoding guard passed for P3.44 tool/test/report files and generated manifest.
- [x] P3.45 Audit the dry-run manifest against actual live catalog/quiz file shape and create a precise non-applied implementation diff plan.

## Update 2026-06-02 - P3.45

- [x] Inspect dry-run manifest read-only.
- [x] Inspect `app/personal_plan_catalog.ts` read-only.
- [x] Inspect `app/personal_plan_quizzes.ts` read-only.
- [x] Confirm best next path: non-applied diff plan, no live file edits.
- [x] Add `GAVAN_DAY1_BRIDGE_DIFF_PLAN_PATH`.
- [x] Add `GavanDay1BridgeDiffPlanSourceShape`.
- [x] Add `GavanDay1BridgeDiffPlanFutureEdit`.
- [x] Add `GavanDay1BridgeDiffPlan`.
- [x] Add `buildGavanDay1BridgeDiffPlan`.
- [x] Add `writeGavanDay1BridgeDiffPlan`.
- [x] Diff plan recognizes catalog export, Gavan definition, and Gavan `generateDays` call.
- [x] Diff plan recognizes quiz registries: `PLAN_QUIZZES`, `PLAN_QUIZ_COVERAGE`, `PLAN_QUIZ_TASK_COPY`.
- [x] Diff plan maps 5 catalog unit ids to catalog insertion point.
- [x] Diff plan maps quiz id to quiz registry insertion point.
- [x] Future edits are all `not_applied` and `applied: false`.
- [x] Writer allows only `.codex-tmp` and `docs/reports`.
- [x] Writer rejects `app`, `tools`, and `tests` targets.
- [x] Diff plan written to `.codex-tmp/personal-plans/gavan-day1-bridge-diff-plan.json`.
- [x] Red test failed first because `tools/personal_plan_gavan_day1_bridge_diff_plan` did not exist.
- [x] Focused diff-plan tests passed: 1 suite, 6 tests.
- [x] Focused diff-plan/manifest/readiness tests passed: 3 suites, 18 tests.
- [x] Full Personal Plans suite passed: 77 suites, 456 tests.
- [x] TypeScript passed: `npx tsc --noEmit --pretty false`.
- [x] Source guard passed for P3.45 tooling file.
- [x] Encoding guard passed for P3.45 tool/test/report files and generated diff plan.
- [x] P3.46 Use the non-applied diff plan to prepare guarded implementation tests for the future live bridge while still avoiding live file edits until explicitly approved.

## Update 2026-06-02 - P3.46

- [x] Inspect P3.45 non-applied diff plan.
- [x] Confirm best next path: guarded dry implementation checklist, no live file edits.
- [x] Add `GAVAN_DAY1_FUTURE_BRIDGE_GUARD_REPORT_PATH`.
- [x] Add `GavanDay1FutureBridgeGuardApproval`.
- [x] Add `GavanDay1FutureBridgeGuardChecklistItem`.
- [x] Add `GavanDay1FutureBridgeGuardReport`.
- [x] Add `buildGavanDay1FutureBridgeGuardReport`.
- [x] Add `writeGavanDay1FutureBridgeGuardReport`.
- [x] Guard report requires explicit approval before any future applied state.
- [x] Guard report validates 5 required Gavan day 1 catalog unit ids.
- [x] Guard report validates quiz id `gavan-week1-day1-quiz`.
- [x] Guard report validates quiz registry targets: `PLAN_QUIZZES`, `PLAN_QUIZ_COVERAGE`, `PLAN_QUIZ_TASK_COPY`.
- [x] Guard report states `sourceWritesUsed: false`.
- [x] Guard report states `phaseWriteTargets: []`.
- [x] Writer allows only `.codex-tmp` and `docs/reports`.
- [x] Writer rejects `app`, `tools`, and `tests` targets.
- [x] Guard report written to `.codex-tmp/personal-plans/gavan-day1-future-bridge-guard-report.json`.
- [x] Red test failed first because `tools/personal_plan_gavan_day1_future_bridge_guard` did not exist.
- [x] Focused future-bridge guard tests passed: 1 suite, 7 tests.
- [x] Focused future-bridge/diff-plan/manifest tests passed: 3 suites, 19 tests.
- [x] Full Personal Plans suite passed: 78 suites, 463 tests.
- [x] TypeScript passed: `npx tsc --noEmit --pretty false`.
- [x] Source guard passed for P3.46 tooling file.
- [x] Encoding guard passed for P3.46 tool/test/report files and generated guard report.
- [x] P3.47 Without explicit live-edit approval, run read-only live-bridge preflight and keep catalog/quiz untouched.

## Update 2026-06-02 - P3.47

- [x] Inspect P3.45 non-applied diff plan.
- [x] Inspect P3.46 future bridge guard report.
- [x] Confirm no explicit approval was given to edit live catalog/quiz files.
- [x] Confirm best next path: read-only live-bridge preflight, no source edits.
- [x] Add `GAVAN_DAY1_LIVE_BRIDGE_PREFLIGHT_REPORT_PATH`.
- [x] Add `GavanDay1LiveBridgePreflightReport`.
- [x] Add `buildGavanDay1LiveBridgePreflightReport`.
- [x] Add `writeGavanDay1LiveBridgePreflightReport`.
- [x] Preflight confirms `liveBridgeCanApplyNow: false`.
- [x] Preflight confirms `approvalMetadataPresent: false`.
- [x] Preflight confirms `liveFilesContainCertifiedIds: false`.
- [x] Preflight confirms `futureDiffStable: true`.
- [x] Preflight confirms `sourceWritesUsed: false`.
- [x] Preflight confirms `phaseWriteTargets: []`.
- [x] Preflight checks read-only files: `app/personal_plan_catalog.ts`, `app/personal_plan_quizzes.ts`.
- [x] Writer allows only `.codex-tmp` and `docs/reports`.
- [x] Writer rejects `app`, `tools`, and `tests` targets.
- [x] Preflight report written to `.codex-tmp/personal-plans/gavan-day1-live-bridge-preflight-report.json`.
- [x] Red test failed first because `tools/personal_plan_gavan_day1_live_bridge_preflight` did not exist.
- [x] Focused live-bridge preflight tests passed: 1 suite, 7 tests.
- [x] Focused live-bridge/preflight/guard/diff/manifest tests passed: 4 suites, 26 tests.
- [x] Full Personal Plans suite passed: 79 suites, 470 tests.
- [x] TypeScript passed: `npx tsc --noEmit --pretty false`.
- [x] Source guard passed for P3.47 tooling file.
- [x] Encoding guard passed for P3.47 tool/test/report files and generated preflight report.
- [x] P3.48 Continue without live approval by creating non-live Gavan week 1 days 2-7 expansion standards.

## Update 2026-06-02 - P3.48

- [x] Inspect P3.48 handoff and confirm no explicit live bridge approval.
- [x] Inspect existing week blueprint pattern read-only.
- [x] Choose non-live content/product route.
- [x] Add `GAVAN_WEEK1_EXPANSION_STANDARDS_PATH`.
- [x] Add `GavanWeek1ExpansionStandards`.
- [x] Add `GavanWeek1ExpansionDayStandards`.
- [x] Add `buildGavanWeek1ExpansionStandards`.
- [x] Add `validateGavanWeek1ExpansionStandards`.
- [x] Add `writeGavanWeek1ExpansionStandards`.
- [x] Standards cover Gavan week 1 days 2-7.
- [x] Standards are marked `liveIntegration: false`.
- [x] Standards are marked `standards_only_not_final_exercises`.
- [x] Standards forbid exact names, phone numbers, emails, apartment viewing, rent/documents, doctor appointments, and bank card problems by default.
- [x] Standards require universal public everyday safety.
- [x] Standards require exercise variety across at least 7 exercise types.
- [x] Standards support only onboarding minute choices: 5, 10, 15, 20.
- [x] Standards mark audio as required but `not_generated`.
- [x] Standards mark pronunciation as required but scoring `not_built`.
- [x] Standards require explanation cards for every new word and first-seen construction.
- [x] Writer allows only `.codex-tmp` and `docs/reports`.
- [x] Writer rejects `app`, `tools`, and `tests` targets.
- [x] Standards written to `.codex-tmp/personal-plans/gavan-week1-days2-7-expansion-standards.json`.
- [x] Red test failed first because `tools/personal_plan_gavan_week1_expansion_standards` did not exist.
- [x] Focused Gavan week 1 expansion standards tests passed: 1 suite, 10 tests.
- [x] Full Personal Plans suite passed: 80 suites, 480 tests.
- [x] TypeScript passed: `npx tsc --noEmit --pretty false`.
- [x] Source guard passed for P3.48 tooling file.
- [x] Encoding guard passed for P3.48 tool/test/report files and generated standards artifact.
- [x] P3.49 Convert the standards into a day 2 content blueprint candidate, still non-live, with no final audio/pronunciation claims.

## Update 2026-06-02 - P3.49

- [x] Inspect P3.49 handoff and confirm no explicit live bridge approval.
- [x] Inspect P3.48 expansion standards.
- [x] Inspect Gavan day 1 candidate/package boundaries read-only.
- [x] Add `GAVAN_WEEK1_DAY2_BLUEPRINT_CANDIDATE_PATH`.
- [x] Add `GavanWeek1Day2BlueprintCandidate`.
- [x] Add `GavanWeek1Day2ContentUnit`.
- [x] Add `GavanWeek1Day2ExerciseBlueprint`.
- [x] Add `buildGavanWeek1Day2BlueprintCandidate`.
- [x] Add `validateGavanWeek1Day2BlueprintCandidate`.
- [x] Add `writeGavanWeek1Day2BlueprintCandidate`.
- [x] Candidate is day 2 only.
- [x] Candidate is marked `liveIntegration: false`.
- [x] Candidate is marked `blueprint_candidate_not_final_exercises`.
- [x] Candidate includes 4 universal phrase candidates for repetition/understanding.
- [x] Candidate avoids exact names, phone numbers, emails, apartment viewing, rent/documents, doctor appointments, and bank card problems.
- [x] Candidate includes required exercise formats: natural choice, listening choice, phrase build, active recall.
- [x] Candidate requires explanation coverage for every new word and first-seen construction.
- [x] Candidate blocks wrong-answer explanations that invent unseen options.
- [x] Candidate supports only 5, 10, 15, and 20 minute loads.
- [x] Candidate marks audio as `not_generated`.
- [x] Candidate marks pronunciation scoring as `not_built`.
- [x] Writer allows only `.codex-tmp` and `docs/reports`.
- [x] Writer rejects `app`, `tools`, and `tests` targets.
- [x] Candidate written to `.codex-tmp/personal-plans/gavan-week1-day2-blueprint-candidate.json`.
- [x] Red test failed first because `tools/personal_plan_gavan_week1_day2_blueprint_candidate` did not exist.
- [x] Focused Gavan week 1 day 2 blueprint candidate tests passed: 1 suite, 11 tests.
- [x] Focused day 2 candidate plus expansion standards tests passed: 2 suites, 21 tests.
- [x] Full Personal Plans suite passed: 81 suites, 491 tests.
- [x] TypeScript passed: `npx tsc --noEmit --pretty false`.
- [x] Source guard passed for P3.49 tooling file.
- [x] Encoding guard passed for P3.49 tool/test/report files and generated day 2 candidate artifact.
- [x] P3.50 Prepare day 2 reviewer/export quality gate.

## Update 2026-06-02 - P3.50

- [x] Inspect P3.50 handoff and confirm no live bridge approval.
- [x] Inspect day 1 reviewer/export pattern read-only.
- [x] Choose day 2 reviewer/export gate before day 3 expansion.
- [x] Add `GAVAN_WEEK1_DAY2_REVIEWER_EXPORT_PATH`.
- [x] Add `GavanWeek1Day2ReviewerExport`.
- [x] Add `buildGavanWeek1Day2ReviewerExport`.
- [x] Add `validateGavanWeek1Day2ReviewerExport`.
- [x] Add `writeGavanWeek1Day2ReviewerExport`.
- [x] Export includes every day 2 content unit.
- [x] Export includes every day 2 explanation card.
- [x] Export includes every day 2 exercise blueprint.
- [x] Export marks every row `needs_manual_review`.
- [x] Export proves `liveIntegration: false`.
- [x] Export proves audio is `not_generated`.
- [x] Export proves pronunciation scoring is `not_built`.
- [x] Export proves no final audio or pronunciation claims.
- [x] Export checks visible reviewer copy for forbidden personal/narrow anchors.
- [x] Export includes required exercise coverage: natural choice, listening choice, phrase build, active recall.
- [x] Writer allows only `.codex-tmp` and `docs/reports`.
- [x] Writer rejects `app`, `tools`, and `tests` targets.
- [x] Reviewer export written to `.codex-tmp/personal-plans/gavan-week1-day2-reviewer-export.json`.
- [x] Red test failed first because `tools/personal_plan_gavan_week1_day2_reviewer_export` did not exist.
- [x] Focused Gavan week 1 day 2 reviewer export tests passed: 1 suite, 8 tests.
- [x] Focused P3.50 tests passed: 1 suite, 8 tests.
- [x] Focused P3.50/P3.49/P3.48 tests passed: 3 suites, 29 tests.
- [x] Full Personal Plans suite passed: 82 suites, 499 tests.
- [x] TypeScript passed: `npx tsc --noEmit --pretty false`.
- [x] Source guard passed for P3.50 tooling file.
- [x] Encoding guard passed for P3.50 tool/test/report files and generated reviewer export.
- [x] P3.51 Create a day 2 reviewer approval gate.

## Update 2026-06-02 - P3.51

- [x] Inspect P3.51 handoff and confirm no live bridge approval.
- [x] Inspect P3.50 reviewer export pattern and P3.50 artifact.
- [x] Inspect day 1 reviewer approval gate read-only.
- [x] Choose day 2 approval gate before day 3 expansion.
- [x] Add `GAVAN_WEEK1_DAY2_APPROVED_REVIEWER_EXPORT_PATH`.
- [x] Add `GavanWeek1Day2ReviewerApprovalInput`.
- [x] Add `GavanWeek1Day2ReviewerApprovalRecord`.
- [x] Add `GavanWeek1Day2ApprovedReviewerExport`.
- [x] Add `checksumGavanWeek1Day2ReviewerRow`.
- [x] Add `buildGavanWeek1Day2ReviewerApprovalInput`.
- [x] Add `validateGavanWeek1Day2ReviewerApprovalGate`.
- [x] Add `approveGavanWeek1Day2ReviewerExport`.
- [x] Add `validateGavanWeek1Day2ApprovedReviewerExport`.
- [x] Add `writeGavanWeek1Day2ApprovedReviewerExport`.
- [x] Approval requires all 4 content unit rows.
- [x] Approval requires all 10 explanation rows.
- [x] Approval requires all 4 exercise blueprint rows.
- [x] Approval rejects changed copy through checksum mismatch.
- [x] Approval rejects fake audio readiness through reviewer export preflight.
- [x] Approval rejects forbidden anchors through reviewer export preflight.
- [x] Approved export remains `liveIntegration: false`.
- [x] Writer allows only `.codex-tmp` and `docs/reports`.
- [x] Writer rejects `app`, `tools`, and `tests` targets.
- [x] Approved reviewer export written to `.codex-tmp/personal-plans/gavan-week1-day2-approved-reviewer-export.json`.
- [x] Red test failed first because `tools/personal_plan_gavan_week1_day2_reviewer_approval_gate` did not exist.
- [x] Focused Gavan week 1 day 2 reviewer approval gate tests passed: 1 suite, 7 tests.
- [x] Focused P3.51 tests passed: 1 suite, 7 tests.
- [x] Focused P3.51/P3.50/P3.49/P3.48 tests passed: 4 suites, 36 tests.
- [x] Full Personal Plans suite passed: 83 suites, 506 tests.
- [x] TypeScript passed: `npx tsc --noEmit --pretty false`.
- [x] Source guard passed for P3.51 tooling file.
- [x] Encoding guard passed for P3.51 tool/test/report files and generated approved export.
- [x] P3.52 Convert Gavan week 1 day 3 standards into a non-live blueprint candidate.

## Update 2026-06-02 - P3.52

- [x] Inspect P3.52 handoff and confirm no live bridge approval.
- [x] Inspect P3.48 day 3 standards.
- [x] Inspect P3.49 day 2 blueprint pattern read-only.
- [x] Choose non-live day 3 blueprint candidate before any live bridge.
- [x] Add `GAVAN_WEEK1_DAY3_BLUEPRINT_CANDIDATE_PATH`.
- [x] Add `GavanWeek1Day3BlueprintCandidate`.
- [x] Add `GavanWeek1Day3ContentUnit`.
- [x] Add `GavanWeek1Day3ExerciseBlueprint`.
- [x] Add `buildGavanWeek1Day3BlueprintCandidate`.
- [x] Add `validateGavanWeek1Day3BlueprintCandidate`.
- [x] Add `writeGavanWeek1Day3BlueprintCandidate`.
- [x] Candidate is day 3 only.
- [x] Candidate is marked `liveIntegration: false`.
- [x] Candidate is marked `blueprint_candidate_not_final_exercises`.
- [x] Candidate includes 4 universal phrase candidates for understanding and pace control.
- [x] Candidate avoids exact names, phone numbers, emails, apartment viewing, rent/documents, doctor appointments, and bank card problems.
- [x] Candidate includes required exercise formats: missing word, micro dialogue, listening choice, active recall.
- [x] Candidate requires explanation coverage for every new word and first-seen construction.
- [x] Candidate blocks wrong-answer explanations that invent unseen options.
- [x] Candidate supports only 5, 10, 15, and 20 minute loads.
- [x] Candidate marks audio as `not_generated`.
- [x] Candidate marks pronunciation scoring as `not_built`.
- [x] Writer allows only `.codex-tmp` and `docs/reports`.
- [x] Writer rejects `app`, `tools`, and `tests` targets.
- [x] Candidate written to `.codex-tmp/personal-plans/gavan-week1-day3-blueprint-candidate.json`.
- [x] Red test failed first because `tools/personal_plan_gavan_week1_day3_blueprint_candidate` did not exist.
- [x] Focused Gavan week 1 day 3 blueprint candidate tests passed: 1 suite, 11 tests.
- [x] Focused P3.52 tests passed: 1 suite, 11 tests.
- [x] Focused P3.52/P3.51/P3.50/P3.49/P3.48 tests passed: 5 suites, 47 tests.
- [x] Full Personal Plans suite passed: 84 suites, 517 tests.
- [x] TypeScript passed: `npx tsc --noEmit --pretty false`.
- [x] Source guard passed for P3.52 tooling file.
- [x] Encoding guard passed for P3.52 tool/test/report files and generated candidate artifact.
- [x] P3.53 Prepare a day 3 reviewer/export quality gate.

## Update 2026-06-02 - P3.53

- [x] Inspect P3.53 handoff and confirm no live bridge approval.
- [x] Inspect P3.52 day 3 blueprint candidate.
- [x] Inspect P3.50 day 2 reviewer/export pattern read-only.
- [x] Choose day 3 reviewer/export gate before approval or live bridge.
- [x] Add `GAVAN_WEEK1_DAY3_REVIEWER_EXPORT_PATH`.
- [x] Add `GavanWeek1Day3ReviewerExport`.
- [x] Add `buildGavanWeek1Day3ReviewerExport`.
- [x] Add `validateGavanWeek1Day3ReviewerExport`.
- [x] Add `writeGavanWeek1Day3ReviewerExport`.
- [x] Export includes every day 3 content unit.
- [x] Export includes every day 3 explanation card.
- [x] Export includes every day 3 exercise blueprint.
- [x] Export marks every row `needs_manual_review`.
- [x] Export proves `liveIntegration: false`.
- [x] Export proves audio is `not_generated`.
- [x] Export proves pronunciation scoring is `not_built`.
- [x] Export proves no final audio or pronunciation claims.
- [x] Export checks visible reviewer copy for forbidden personal/narrow anchors and corrupted copy.
- [x] Export includes required exercise coverage: missing word, micro dialogue, listening choice, active recall.
- [x] Writer allows only `.codex-tmp` and `docs/reports`.
- [x] Writer rejects `app`, `tools`, and `tests` targets.
- [x] Reviewer export written to `.codex-tmp/personal-plans/gavan-week1-day3-reviewer-export.json`.
- [x] Red test failed first because `tools/personal_plan_gavan_week1_day3_reviewer_export` did not exist.
- [x] Focused Gavan week 1 day 3 reviewer export tests passed: 1 suite, 8 tests.
- [x] Focused P3.53 tests passed: 1 suite, 8 tests.
- [x] Focused P3.53/P3.52/P3.51/P3.50/P3.49/P3.48 tests passed: 6 suites, 55 tests.
- [x] Full Personal Plans suite passed: 85 suites, 525 tests.
- [x] TypeScript passed: `npx tsc --noEmit --pretty false`.
- [x] Source guard passed for P3.53 tooling file.
- [x] Encoding guard passed for P3.53 tool/test/report files and generated reviewer export.
- [x] P3.54 Create a day 3 reviewer approval gate, unless explicit approval is given for a live bridge.

## Update 2026-06-02 - P3.54

- [x] Inspect P3.54 handoff and confirm no live bridge approval.
- [x] Keep the route scoped to non-live reviewer approval only.
- [x] Add a TDD test for day 3 approval records across content units, explanation cards, and exercise blueprints.
- [x] Verify the red phase: the first focused run failed because `tools/personal_plan_gavan_week1_day3_reviewer_approval_gate` did not exist.
- [x] Implement `tools/personal_plan_gavan_week1_day3_reviewer_approval_gate.ts`.
- [x] Require explicit approval records for all 18 reviewer rows.
- [x] Add stable checksums for visible reviewer text so copy cannot change after approval without failing the gate.
- [x] Reject partial approval, duplicate rows, unknown rows, invalid reviewer metadata, changed copy, forbidden anchors, fake audio readiness, and fake pronunciation readiness.
- [x] Keep approved exports `liveIntegration: false`.
- [x] Restrict approved export writes to `.codex-tmp` and `docs/reports`.
- [x] Confirm the approval tooling does not import live catalog, quiz, UI, storage, audio, pronunciation, or navigation modules.
- [x] Generate `.codex-tmp/personal-plans/gavan-week1-day3-approved-reviewer-export.json`.
- [x] Focused P3.54 tests passed: 1 suite, 7 tests.
- [x] Run focused P3.54/P3.53/P3.52/P3.51/P3.50/P3.49/P3.48 tests.
- [x] Run full Personal Plans suite.
- [x] Run TypeScript compile check.
- [x] Run source guard for P3.54 tooling.
- [x] Run encoding guard for P3.54 tool/test/report files and generated approved reviewer export.
- [x] Re-run pending P3.54 verification after shell command execution recovers from `windows sandbox: spawn setup refresh`.
- [x] P3.55 Convert Gavan week 1 day 4 standards into a non-live blueprint candidate, unless explicit approval is given for a live bridge.

## Update 2026-06-02 - P3.55

- [x] Inspect P3.55 handoff and confirm no live bridge approval.
- [x] Keep the route scoped to non-live day 4 candidate tooling only.
- [x] Add TDD tests for a day 4 blueprint candidate before implementation.
- [x] Verify the red phase: the focused test failed because `tools/personal_plan_gavan_week1_day4_blueprint_candidate` did not exist.
- [x] Implement `tools/personal_plan_gavan_week1_day4_blueprint_candidate.ts`.
- [x] Keep day 4 universal and socially safe: simple visible-help phrases, no names, phone, email, apartment, rent, documents, doctor, or bank anchors.
- [x] Add 4 content units: `Could you help me with this?`, `I'm not sure what to do.`, `Is this the right place?`, `Could you point me in the right direction?`.
- [x] Require explanation coverage for every new word and every first-seen construction.
- [x] Add varied exercise blueprints: `phrase_build`, `natural_choice`, `pronunciation_shadow`, and `active_recall`.
- [x] Keep final exercises unbuilt and final copy unapproved.
- [x] Keep audio `not_generated` and pronunciation scoring `not_built`.
- [x] Restrict candidate writes to `.codex-tmp` and `docs/reports`.
- [x] Generate `.codex-tmp/personal-plans/gavan-week1-day4-blueprint-candidate.json`.
- [x] Focused P3.55 tests passed: 1 suite, 11 tests.
- [x] Run focused P3.55/P3.54/P3.53/P3.52/P3.51/P3.50/P3.49/P3.48 tests.
- [x] Run full Personal Plans suite.
- [x] Run TypeScript compile check.
- [x] Encoding guard passed for P3.55 tool/test/artifact files.
- [x] Run source guard for P3.55 tooling.
- [x] P3.56 Prepare a day 4 reviewer/export quality gate, unless explicit approval is given for a live bridge.

## Update 2026-06-02 - P3.56

- [x] Inspect P3.56 handoff and confirm no live bridge approval.
- [x] Keep the route scoped to non-live day 4 reviewer/export tooling only.
- [x] Add TDD tests for a day 4 reviewer/export gate before implementation.
- [x] Verify the red phase: the focused test failed because `tools/personal_plan_gavan_week1_day4_reviewer_export` did not exist.
- [x] Implement `tools/personal_plan_gavan_week1_day4_reviewer_export.ts`.
- [x] Export every day 4 content unit row for manual review.
- [x] Export every day 4 explanation card row for manual review.
- [x] Export every day 4 exercise blueprint row for manual review.
- [x] Keep every exported row `needs_manual_review`.
- [x] Validate exercise coverage for `phrase_build`, `natural_choice`, `pronunciation_shadow`, and `active_recall`.
- [x] Reject missing rows, forbidden anchors, fake final audio claims, and fake pronunciation scoring claims.
- [x] Keep reviewer export `liveIntegration: false`.
- [x] Restrict reviewer export writes to `.codex-tmp` and `docs/reports`.
- [x] Generate `.codex-tmp/personal-plans/gavan-week1-day4-reviewer-export.json`.
- [x] Focused P3.56 tests passed: 1 suite, 8 tests.
- [x] Run focused P3.56/P3.55/P3.54/P3.53/P3.52/P3.51/P3.50/P3.49/P3.48 tests.
- [x] Run full Personal Plans suite.
- [x] Run TypeScript compile check.
- [x] Run source guard for P3.56 tooling.
- [x] Run encoding guard for P3.56 tool/test/report files and generated reviewer export.
- [x] P3.57 Create a day 4 reviewer approval gate, unless explicit approval is given for a live bridge.

## Update 2026-06-02 - P3.57

- [x] Inspect P3.57 handoff and confirm no live bridge approval.
- [x] Keep the route scoped to non-live day 4 reviewer approval tooling only.
- [x] Add TDD tests for a day 4 reviewer approval gate before implementation.
- [x] Verify the red phase: the focused test failed because `tools/personal_plan_gavan_week1_day4_reviewer_approval_gate` did not exist.
- [x] Implement `tools/personal_plan_gavan_week1_day4_reviewer_approval_gate.ts`.
- [x] Require explicit approval records for all 18 day 4 reviewer rows.
- [x] Add stable checksums for visible reviewer text so copy cannot change after approval without failing the gate.
- [x] Reject partial approval, invalid reviewer metadata, changed copy, forbidden anchors, fake audio readiness, and fake pronunciation readiness.
- [x] Keep approved exports `liveIntegration: false`.
- [x] Restrict approved export writes to `.codex-tmp` and `docs/reports`.
- [x] Generate `.codex-tmp/personal-plans/gavan-week1-day4-approved-reviewer-export.json`.
- [x] Focused P3.57 tests passed: 1 suite, 7 tests.
- [x] Run focused P3.57/P3.56/P3.55/P3.54/P3.53/P3.52/P3.51/P3.50/P3.49/P3.48 tests.
- [x] Run full Personal Plans suite.
- [x] Run TypeScript compile check.
- [x] Run source guard for P3.57 tooling.
- [x] Run encoding guard for P3.57 tool/test/report files and generated approved reviewer export.
- [x] P3.58 Convert Gavan week 1 day 5 standards into a non-live blueprint candidate, unless explicit approval is given for a live bridge.

## Update 2026-06-02 - P3.58

- [x] Inspect P3.58 handoff and confirm no live bridge approval.
- [x] Keep the route scoped to non-live day 5 candidate tooling only.
- [x] Add TDD tests for a day 5 blueprint candidate before implementation.
- [x] Verify the red phase: the focused test failed because `tools/personal_plan_gavan_week1_day5_blueprint_candidate` did not exist.
- [x] Implement `tools/personal_plan_gavan_week1_day5_blueprint_candidate.ts`.
- [x] Keep day 5 universal and socially safe: direction check, next-step check, waiting check, and correctness check.
- [x] Add 4 content units: `Is this the right way?`, `What should I do next?`, `Do I need to wait here?`, `Is it okay like this?`.
- [x] Require explanation coverage for every new word and every first-seen construction.
- [x] Add varied exercise blueprints: `micro_dialogue`, `missing_word`, `active_recall`, and `natural_choice`.
- [x] Keep final exercises unbuilt and final copy unapproved.
- [x] Keep audio `not_generated` and pronunciation scoring `not_built`.
- [x] Restrict candidate writes to `.codex-tmp` and `docs/reports`.
- [x] Generate `.codex-tmp/personal-plans/gavan-week1-day5-blueprint-candidate.json`.
- [x] Focused P3.58 tests passed: 1 suite, 11 tests.
- [x] Run focused P3.58/P3.57/P3.56/P3.55/P3.54/P3.53/P3.52/P3.51/P3.50/P3.49/P3.48 tests: 11 suites, 99 tests.
- [x] Run full Personal Plans suite: 90 suites, 569 tests.
- [x] Run TypeScript compile check: `npx tsc --noEmit --pretty false` exited with code 0.
- [x] Run source guard for P3.58 tooling.
- [x] Run encoding guard for P3.58 tool/test/report files and generated candidate.
- [x] P3.59 Prepare a day 5 reviewer/export quality gate, unless explicit approval is given for a live bridge.

## Update 2026-06-02 - P3.59

- [x] Inspect P3.59 handoff and confirm no live bridge approval.
- [x] Keep the route scoped to non-live day 5 reviewer/export tooling only.
- [x] Add TDD tests for a day 5 reviewer/export gate before implementation.
- [x] Verify the red phase: the focused test failed because `tools/personal_plan_gavan_week1_day5_reviewer_export` did not exist.
- [x] Implement `tools/personal_plan_gavan_week1_day5_reviewer_export.ts`.
- [x] Export every day 5 content unit row for manual review.
- [x] Export every day 5 explanation card row for manual review.
- [x] Export every day 5 exercise blueprint row for manual review.
- [x] Keep every exported row `needs_manual_review`.
- [x] Validate exercise coverage for `micro_dialogue`, `missing_word`, `active_recall`, and `natural_choice`.
- [x] Reject missing rows, forbidden anchors, fake final audio claims, and fake pronunciation scoring claims.
- [x] Keep reviewer export `liveIntegration: false`.
- [x] Restrict reviewer export writes to `.codex-tmp` and `docs/reports`.
- [x] Generate `.codex-tmp/personal-plans/gavan-week1-day5-reviewer-export.json`.
- [x] Focused P3.59 tests passed: 1 suite, 8 tests.
- [x] Run focused P3.59/P3.58/P3.57/P3.56/P3.55/P3.54/P3.53/P3.52/P3.51/P3.50/P3.49/P3.48 tests: 12 suites, 107 tests.
- [x] Run full Personal Plans suite: 91 suites, 577 tests.
- [x] Run TypeScript compile check: `npx tsc --noEmit --pretty false` exited with code 0.
- [x] Run source guard for P3.59 tooling.
- [x] Run encoding guard for P3.59 tool/test/report files and generated reviewer export.
- [x] P3.60 Create a day 5 reviewer approval gate, unless explicit approval is given for a live bridge.

## Update 2026-06-02 - P3.60

- [x] Inspect P3.60 handoff and confirm no live bridge approval.
- [x] Keep the route scoped to non-live day 5 reviewer approval tooling only.
- [x] Add TDD tests for a day 5 reviewer approval gate before implementation.
- [x] Verify the red phase: the focused test failed because `tools/personal_plan_gavan_week1_day5_reviewer_approval_gate` did not exist.
- [x] Implement `tools/personal_plan_gavan_week1_day5_reviewer_approval_gate.ts`.
- [x] Require explicit approval records for all 16 day 5 reviewer rows.
- [x] Add stable checksums for visible reviewer text so copy cannot change after approval without failing the gate.
- [x] Reject partial approval, invalid reviewer metadata, changed copy, forbidden anchors, fake audio readiness, and fake pronunciation readiness.
- [x] Keep approved exports `liveIntegration: false`.
- [x] Restrict approved export writes to `.codex-tmp` and `docs/reports`.
- [x] Generate `.codex-tmp/personal-plans/gavan-week1-day5-approved-reviewer-export.json`.
- [x] Focused P3.60 tests passed: 1 suite, 7 tests.
- [x] Run focused P3.60/P3.59/P3.58/P3.57/P3.56/P3.55/P3.54/P3.53/P3.52/P3.51/P3.50/P3.49/P3.48 tests: 13 suites, 114 tests.
- [x] Run full Personal Plans suite: 92 suites, 584 tests.
- [x] Run TypeScript compile check: `npx tsc --noEmit --pretty false` exited with code 0.
- [x] Run source guard for P3.60 tooling.
- [x] Run encoding guard for P3.60 tool/test/report files and generated approved reviewer export.
- [x] P3.61 Convert Gavan week 1 day 6 standards into a non-live blueprint candidate, unless explicit approval is given for a live bridge.

## Update 2026-06-03 - P3.61

- [x] Inspect P3.61 handoff and confirm no live bridge approval.
- [x] Keep the route scoped to non-live day 6 candidate tooling only.
- [x] Add TDD tests for a day 6 blueprint candidate before implementation.
- [x] Verify the red phase: the focused test failed because `tools/personal_plan_gavan_week1_day6_blueprint_candidate` did not exist.
- [x] Implement `tools/personal_plan_gavan_week1_day6_blueprint_candidate.ts`.
- [x] Keep day 6 universal and socially safe: pause, agree, say not sure yet, or delay a decision.
- [x] Add 4 content units: `Let me think for a second.`, `That works for me.`, `I'm not sure yet.`, `Could we decide later?`.
- [x] Require explanation coverage for every new word and every first-seen construction.
- [x] Add varied exercise blueprints: `active_recall`, `error_repair`, `pronunciation_shadow`, and `natural_choice`.
- [x] Keep final exercises unbuilt and final copy unapproved.
- [x] Keep audio `not_generated` and pronunciation scoring `not_built`.
- [x] Restrict candidate writes to `.codex-tmp` and `docs/reports`.
- [x] Generate `.codex-tmp/personal-plans/gavan-week1-day6-blueprint-candidate.json`.
- [x] Focused P3.61 tests passed: 1 suite, 11 tests.
- [x] Run focused P3.61/P3.60/P3.59/P3.58/P3.57/P3.56/P3.55/P3.54/P3.53/P3.52/P3.51/P3.50/P3.49/P3.48 tests: 14 suites, 125 tests.
- [x] Run full Personal Plans suite: 93 suites, 595 tests.
- [x] Run TypeScript compile check: `npx tsc --noEmit --pretty false` exited with code 0.
- [x] Run source guard for P3.61 tooling.
- [x] Run encoding guard for P3.61 tool/test/report files and generated candidate.
- [x] P3.62 Prepare a day 6 reviewer/export quality gate, unless explicit approval is given for a live bridge.

## Update 2026-06-03 - P3.62

- [x] Inspect P3.62 handoff and confirm no live bridge approval.
- [x] Keep the route scoped to non-live day 6 reviewer/export tooling only.
- [x] Add TDD tests for a day 6 reviewer/export gate before implementation.
- [x] Verify the red phase: the focused test failed because `tools/personal_plan_gavan_week1_day6_reviewer_export` did not exist.
- [x] Implement `tools/personal_plan_gavan_week1_day6_reviewer_export.ts`.
- [x] Export every day 6 content unit row for manual review.
- [x] Export every day 6 explanation card row for manual review.
- [x] Export every day 6 exercise blueprint row for manual review.
- [x] Keep every exported row `needs_manual_review`.
- [x] Validate exercise coverage for `active_recall`, `error_repair`, `pronunciation_shadow`, and `natural_choice`.
- [x] Reject missing rows, forbidden anchors, fake final audio claims, and fake pronunciation scoring claims.
- [x] Keep reviewer export `liveIntegration: false`.
- [x] Restrict reviewer export writes to `.codex-tmp` and `docs/reports`.
- [x] Generate `.codex-tmp/personal-plans/gavan-week1-day6-reviewer-export.json`.
- [x] Focused P3.62 tests passed: 1 suite, 8 tests.
- [x] Run focused P3.62/P3.61/P3.60/P3.59/P3.58/P3.57/P3.56/P3.55/P3.54/P3.53/P3.52/P3.51/P3.50/P3.49/P3.48 tests: 15 suites, 133 tests.
- [x] Run full Personal Plans suite: 94 suites, 603 tests.
- [x] Run TypeScript compile check: `npx tsc --noEmit --pretty false` exited with code 0.
- [x] Run source guard for P3.62 tooling.
- [x] Run encoding guard for P3.62 tool/test/report files and generated reviewer export.
- [x] P3.63 Create a day 6 reviewer approval gate, unless explicit approval is given for a live bridge.

## Update 2026-06-03 - P3.63

- [x] Inspect P3.63 handoff and confirm no live bridge approval.
- [x] Keep the route scoped to non-live day 6 reviewer approval tooling only.
- [x] Add TDD tests for a day 6 reviewer approval gate before implementation.
- [x] Verify the red phase: the focused test failed because `tools/personal_plan_gavan_week1_day6_reviewer_approval_gate` did not exist.
- [x] Implement `tools/personal_plan_gavan_week1_day6_reviewer_approval_gate.ts`.
- [x] Require explicit approval records for all 16 day 6 reviewer rows.
- [x] Add stable checksums for visible reviewer text so copy cannot change after approval without failing the gate.
- [x] Reject partial approval, invalid reviewer metadata, changed copy, forbidden anchors, fake audio readiness, and fake pronunciation readiness.
- [x] Keep approved exports `liveIntegration: false`.
- [x] Restrict approved export writes to `.codex-tmp` and `docs/reports`.
- [x] Generate `.codex-tmp/personal-plans/gavan-week1-day6-approved-reviewer-export.json`.
- [x] Focused P3.63 tests passed: 1 suite, 7 tests.
- [x] Run focused P3.63/P3.62/P3.61/P3.60/P3.59/P3.58/P3.57/P3.56/P3.55/P3.54/P3.53/P3.52/P3.51/P3.50/P3.49/P3.48 tests: 16 suites, 140 tests.
- [x] Run full Personal Plans suite: 95 suites, 610 tests.
- [x] Run TypeScript compile check: `npx tsc --noEmit --pretty false` exited with code 0.
- [x] Run source guard for P3.63 tooling.
- [x] Run encoding guard for P3.63 tool/test/report files and generated approved reviewer export.
- [x] P3.64 Convert Gavan week 1 day 7 standards into a non-live blueprint candidate, unless explicit approval is given for a live bridge.

## Update 2026-06-03 - P3.64

- [x] Inspect P3.64 handoff and confirm no live bridge approval.
- [x] Keep the route scoped to non-live day 7 candidate tooling only.
- [x] Add TDD tests for a day 7 blueprint candidate before implementation.
- [x] Verify the red phase: the focused test failed because `tools/personal_plan_gavan_week1_day7_blueprint_candidate` did not exist.
- [x] Implement `tools/personal_plan_gavan_week1_day7_blueprint_candidate.ts`.
- [x] Keep day 7 universal and socially safe: week review, asking again, asking what to do next, and returning after checking.
- [x] Add 4 content units: `I need a moment.`, `Could you say that again?`, `What should I do next?`, `I'll check and come back.`.
- [x] Require explanation coverage for every new word and every first-seen construction.
- [x] Add varied exercise blueprints: `active_recall`, `listening_choice`, `natural_choice`, and `micro_dialogue`.
- [x] Keep final exercises unbuilt and final copy unapproved.
- [x] Keep audio `not_generated` and pronunciation scoring `not_built`.
- [x] Restrict candidate writes to `.codex-tmp` and `docs/reports`.
- [x] Generate `.codex-tmp/personal-plans/gavan-week1-day7-blueprint-candidate.json`.
- [x] Focused P3.64 tests passed: 1 suite, 11 tests.
- [x] Run focused P3.64/P3.63/P3.62/P3.61/P3.60/P3.59/P3.58/P3.57/P3.56/P3.55/P3.54/P3.53/P3.52/P3.51/P3.50/P3.49/P3.48 tests: 17 suites, 151 tests.
- [x] Run full Personal Plans suite: 96 suites, 621 tests.
- [x] Run TypeScript compile check: `npx tsc --noEmit --pretty false` exited with code 0.
- [x] Run source guard for P3.64 tooling.
- [x] Run encoding guard for P3.64 tool/test/report files and generated candidate.
- [x] P3.65 Prepare a day 7 reviewer/export quality gate, unless explicit approval is given for a live bridge.

## Update 2026-06-03 - P3.65

- [x] Inspect P3.65 handoff and confirm no live bridge approval.
- [x] Keep the route scoped to non-live day 7 reviewer/export tooling only.
- [x] Add TDD tests for a day 7 reviewer/export gate before implementation.
- [x] Verify the red phase: the focused test failed because `tools/personal_plan_gavan_week1_day7_reviewer_export` did not exist.
- [x] Implement `tools/personal_plan_gavan_week1_day7_reviewer_export.ts`.
- [x] Export every day 7 content unit row for manual review.
- [x] Export every day 7 explanation card row for manual review.
- [x] Export every day 7 exercise blueprint row for manual review.
- [x] Keep every exported row `needs_manual_review`.
- [x] Validate exercise coverage for `active_recall`, `listening_choice`, `natural_choice`, and `micro_dialogue`.
- [x] Reject missing rows, forbidden anchors, visible numbers, corrupted copy, fake final audio claims, and fake pronunciation scoring claims.
- [x] Keep reviewer export `liveIntegration: false`.
- [x] Restrict reviewer export writes to `.codex-tmp` and `docs/reports`.
- [x] Generate `.codex-tmp/personal-plans/gavan-week1-day7-reviewer-export.json`.
- [x] Focused P3.65 tests passed: 1 suite, 8 tests.
- [x] Run focused P3.65/P3.64/P3.63/P3.62/P3.61/P3.60/P3.59/P3.58/P3.57/P3.56/P3.55/P3.54/P3.53/P3.52/P3.51/P3.50/P3.49/P3.48 tests: 18 suites, 159 tests.
- [x] Run full Personal Plans suite: 97 suites, 629 tests.
- [x] Run TypeScript compile check: `npx tsc --noEmit --pretty false` exited with code 0.
- [x] Run source guard for P3.65 tooling.
- [x] Run encoding guard for P3.65 tool/test/report files and generated reviewer export.
- [x] P3.66 Create a day 7 reviewer approval gate, unless explicit approval is given for a live bridge.

## Update 2026-06-03 - P3.66

- [x] Inspect P3.66 handoff and confirm no live bridge approval.
- [x] Keep the route scoped to non-live day 7 reviewer approval tooling only.
- [x] Add TDD tests for a day 7 reviewer approval gate before implementation.
- [x] Verify the red phase: the focused test failed because `tools/personal_plan_gavan_week1_day7_reviewer_approval_gate` did not exist.
- [x] Implement `tools/personal_plan_gavan_week1_day7_reviewer_approval_gate.ts`.
- [x] Require explicit approval records for all 16 day 7 reviewer rows.
- [x] Add stable checksums for visible reviewer text so copy cannot change after approval without failing the gate.
- [x] Reject partial approval, invalid reviewer metadata, changed copy, forbidden anchors, visible numbers, fake audio readiness, and fake pronunciation readiness.
- [x] Keep approved exports `liveIntegration: false`.
- [x] Restrict approved export writes to `.codex-tmp` and `docs/reports`.
- [x] Generate `.codex-tmp/personal-plans/gavan-week1-day7-approved-reviewer-export.json`.
- [x] Focused P3.66 tests passed: 1 suite, 7 tests.
- [x] Run focused P3.66/P3.65/P3.64/P3.63/P3.62/P3.61/P3.60/P3.59/P3.58/P3.57/P3.56/P3.55/P3.54/P3.53/P3.52/P3.51/P3.50/P3.49/P3.48 tests: 19 suites, 166 tests.
- [x] Run full Personal Plans suite: 98 suites, 636 tests.
- [x] Run TypeScript compile check: `npx tsc --noEmit --pretty false` exited with code 0.
- [x] Run source guard for P3.66 tooling.
- [x] Run encoding guard for P3.66 tool/test/report files and generated approved reviewer export.
- [x] P3.67 Build a non-live Gavan week 1 approval/readiness manifest, unless explicit approval is given for a live bridge.

## Update 2026-06-03 - P3.67

- [x] Inspect P3.67 handoff and confirm no live bridge approval.
- [x] Keep the route scoped to a non-live Gavan week 1 approval/readiness manifest only.
- [x] Add TDD tests for the week 1 readiness manifest before implementation.
- [x] Verify the red phase: the focused test failed because `tools/personal_plan_gavan_week1_approval_readiness_manifest` did not exist.
- [x] Implement `tools/personal_plan_gavan_week1_approval_readiness_manifest.ts`.
- [x] Cover Gavan week 1 days 2, 3, 4, 5, 6, and 7.
- [x] Point each day to its approved reviewer export artifact path.
- [x] Summarize content unit count, explanation card count, exercise blueprint count, total approved count, and `liveIntegration: false`.
- [x] Mark the week as `approved_non_live_not_playable`.
- [x] List release blockers: no final audio, no final pronunciation scoring, no live catalog route, no production quiz route, no UI route, and no cloud sync bridge.
- [x] Keep manifest writes restricted to `.codex-tmp` and `docs/reports`.
- [x] Generate `.codex-tmp/personal-plans/gavan-week1-approval-readiness-manifest.json`.
- [x] Focused P3.67 tests passed: 1 suite, 7 tests.
- [x] Run focused P3.67/P3.66/P3.65/P3.64/P3.63/P3.62/P3.61/P3.60/P3.59/P3.58/P3.57/P3.56/P3.55/P3.54/P3.53/P3.52/P3.51/P3.50/P3.49/P3.48 tests: 20 suites, 173 tests.
- [x] Run full Personal Plans suite: 99 suites, 643 tests.
- [x] Run TypeScript compile check: `npx tsc --noEmit --pretty false` exited with code 0.
- [x] Run source guard for P3.67 tooling.
- [x] Run encoding guard for P3.67 tool/test/report files and generated manifest.
- [x] P3.68 Build a non-live Gavan week 1 bridge diff/preflight plan, unless explicit approval is given for a live bridge.

## Update 2026-06-03 - P3.68

- [x] Inspect P3.68 handoff and confirm no live bridge approval.
- [x] Read the week 1 approval/readiness manifest and production catalog/quiz surfaces in read-only mode.
- [x] Add TDD tests for a non-live bridge diff/preflight plan before implementation.
- [x] Verify the red phase: the focused test failed because `tools/personal_plan_gavan_week1_bridge_diff_preflight_plan` did not exist.
- [x] Implement `tools/personal_plan_gavan_week1_bridge_diff_preflight_plan.ts`.
- [x] Preserve week status `approved_non_live_not_playable`.
- [x] Keep output status `bridge_plan_only_not_applied`.
- [x] Keep `liveIntegration: false` and `applied: false`.
- [x] Report required production surfaces: catalog route, quiz route, UI route, audio pipeline, pronunciation scoring, and cloud sync bridge.
- [x] Mark production surfaces `missing_or_not_connected` unless metadata proves a real route exists.
- [x] Preserve release blockers from the readiness manifest.
- [x] Include source findings for existing catalog/quiz route visibility without mutating production source.
- [x] Restrict writes to `.codex-tmp` and `docs/reports`.
- [x] Generate `.codex-tmp/personal-plans/gavan-week1-bridge-diff-preflight-plan.json`.
- [x] Focused P3.68 tests passed: 1 suite, 6 tests.
- [x] Run focused P3.68/P3.67/P3.66/P3.65/P3.64/P3.63/P3.62/P3.61/P3.60/P3.59/P3.58/P3.57/P3.56/P3.55/P3.54/P3.53/P3.52/P3.51/P3.50/P3.49/P3.48 tests: 21 suites, 179 tests.
- [x] Run full Personal Plans suite: 100 suites, 649 tests.
- [x] Run TypeScript compile check: `npx tsc --noEmit --pretty false` exited with code 0.
- [x] Run source guard for P3.68 tooling.
- [x] Run encoding guard for P3.68 tool/test/report files and generated preflight plan.
- [x] P3.69 Prepare a future live bridge approval contract for Gavan week 1 without editing production files.

## Update 2026-06-03 - P3.69

- [x] Inspect P3.69 handoff and confirm no live bridge approval.
- [x] Read P3.68 bridge diff/preflight plan and day 1 future bridge guard patterns.
- [x] Add TDD tests for a non-live future live-bridge approval contract before implementation.
- [x] Verify the red phase: the focused test failed because `tools/personal_plan_gavan_week1_future_bridge_approval_contract` did not exist.
- [x] Implement `tools/personal_plan_gavan_week1_future_bridge_approval_contract.ts`.
- [x] Keep output status `future_bridge_contract_only_not_applied`.
- [x] Keep `liveIntegration: false`, `applied: false`, `sourceWritesUsed: false`, and `phaseWriteTargets: []`.
- [x] Require approval areas for catalog route, quiz route, UI route, audio pipeline, pronunciation scoring, cloud sync bridge, and product copy.
- [x] Assign required roles: engineering release, learning engine, product design, audio pipeline, pronunciation, sync, and content quality owners.
- [x] Add at least three acceptance criteria for every approval area.
- [x] Preserve P3.68 required surfaces and P3.67 release blockers.
- [x] Keep `canOpenLiveBridgeImplementationTask: false` for the current artifact because required surfaces and signatures are missing.
- [x] Restrict contract writes to `.codex-tmp` and `docs/reports`.
- [x] Generate `.codex-tmp/personal-plans/gavan-week1-future-bridge-approval-contract.json`.
- [x] Focused P3.69 tests passed: 1 suite, 8 tests.
- [x] Run focused P3.69/P3.68/P3.67/P3.66/P3.65/P3.64/P3.63/P3.62/P3.61/P3.60/P3.59/P3.58/P3.57/P3.56/P3.55/P3.54/P3.53/P3.52/P3.51/P3.50/P3.49/P3.48 tests: 22 suites, 187 tests.
- [x] Run full Personal Plans suite: 101 suites, 657 tests.
- [x] Run TypeScript compile check: `npx tsc --noEmit --pretty false` exited with code 0.
- [x] Run source guard for P3.69 tooling.
- [x] Run encoding guard for P3.69 tool/test/report files and generated contract.
- [x] P3.70 Build a future bridge guard report from the P3.69 contract without editing production files.

## Update 2026-06-03 - P3.70

- [x] Inspect P3.70 handoff and confirm no live bridge approval.
- [x] Read P3.69 approval contract and day 1 future bridge guard patterns.
- [x] Add TDD tests for a non-live future bridge guard report before implementation.
- [x] Verify the red phase: the focused test failed because `tools/personal_plan_gavan_week1_future_bridge_guard_report` did not exist.
- [x] Implement `tools/personal_plan_gavan_week1_future_bridge_guard_report.ts`.
- [x] Keep output status `future_bridge_guard_blocked_not_applied`.
- [x] Keep `sourceWritesUsed: false` and `phaseWriteTargets: []`.
- [x] Report blocker categories: missing signature, missing production surface, and preserved release blocker.
- [x] Preserve every P3.69 approval area blocker.
- [x] Preserve every P3.68 production surface blocker.
- [x] Preserve every P3.67 release blocker.
- [x] Reject applied/live contracts while signatures and surfaces are incomplete.
- [x] Restrict guard report writes to `.codex-tmp` and `docs/reports`.
- [x] Generate `.codex-tmp/personal-plans/gavan-week1-future-bridge-guard-report.json`.
- [x] Focused P3.70 tests passed: 1 suite, 8 tests.
- [x] Run focused P3.70/P3.69/P3.68/P3.67/P3.66/P3.65/P3.64/P3.63/P3.62/P3.61/P3.60/P3.59/P3.58/P3.57/P3.56/P3.55/P3.54/P3.53/P3.52/P3.51/P3.50/P3.49/P3.48 tests: 23 suites, 195 tests.
- [x] Run full Personal Plans suite: 102 suites, 665 tests.
- [x] Run TypeScript compile check: `npx tsc --noEmit --pretty false` exited with code 0.
- [x] Run source guard for P3.70 tooling.
- [x] Run encoding guard for P3.70 tool/test/report files and generated guard report.
- [x] P3.71 Build a non-live blocker resolution roadmap from the P3.70 guard report.

## Update 2026-06-03 - P3.71

- [x] Inspect P3.71 handoff and confirm no live bridge approval.
- [x] Read P3.70 future bridge guard report.
- [x] Add TDD tests for a non-live blocker resolution roadmap before implementation.
- [x] Verify the red phase: the focused test failed because `tools/personal_plan_gavan_week1_blocker_resolution_roadmap` did not exist.
- [x] Implement `tools/personal_plan_gavan_week1_blocker_resolution_roadmap.ts`.
- [x] Keep output status `blocker_resolution_roadmap_only_not_applied`.
- [x] Keep `sourceWritesUsed: false`, `phaseWriteTargets: []`, and `implementationTaskAllowed: false`.
- [x] Group the 19 P3.70 blockers into 8 ordered work packages.
- [x] Keep every work package `not_started` and `liveEditsAllowed: false`.
- [x] Order work packages conservatively: product copy, catalog route, quiz route, UI route, audio pipeline, pronunciation policy, cloud sync, final release approval.
- [x] Preserve blocker ids for every work package instead of flattening them into notes.
- [x] Reject unsafe guard input if it already allows implementation or contains source write targets.
- [x] Restrict roadmap writes to `.codex-tmp` and `docs/reports`.
- [x] Generate `.codex-tmp/personal-plans/gavan-week1-blocker-resolution-roadmap.json`.
- [x] Focused P3.71 tests passed: 1 suite, 8 tests.
- [x] Run related Gavan day/week Personal Plan tests: 44 suites, 367 tests.
- [x] Run full Personal Plans suite: 103 suites, 673 tests.
- [x] Run TypeScript compile check: `npx tsc --noEmit --pretty false` exited with code 0.
- [x] Run source guard for P3.71 tooling.
- [x] Run encoding guard for P3.71 tool/test/report files and generated roadmap.
- [x] P3.72 Build a non-live product copy approval packet for Gavan week 1 before any route planning.

## Update 2026-06-03 - P3.72

- [x] Inspect P3.72 handoff and confirm no live bridge approval.
- [x] Read P3.71 blocker resolution roadmap.
- [x] Read P3.67 approval readiness manifest and approved Gavan week 1 day artifacts in read-only mode.
- [x] Add TDD tests for a non-live product copy approval packet before implementation.
- [x] Verify the red phase: the focused test failed because `tools/personal_plan_gavan_week1_product_copy_approval_packet` did not exist.
- [x] Implement `tools/personal_plan_gavan_week1_product_copy_approval_packet.ts`.
- [x] Keep output status `product_copy_approval_packet_only_not_applied`.
- [x] Target only `product_copy_review` and blocker `missing_signature:product_copy`.
- [x] Keep `signatureStatus: missing`, `approvalReady: false`, `sourceWritesUsed: false`, and `phaseWriteTargets: []`.
- [x] Check product copy dimensions: broad social usefulness, no narrow anchors, no developer wording, no fake selected-answer context, wrong-answer-safe explanations, no forbidden user-facing terms, and explanation coverage.
- [x] Keep the output clean by sanitizing issue excerpts instead of copying corrupted text markers into the packet.
- [x] Confirm current approved days 2-7 pass copy checks: 6 days passing, 0 copy issues.
- [x] Preserve the release stop: product copy still lacks the required `content_quality_owner` signature.
- [x] Restrict packet writes to `.codex-tmp` and `docs/reports`.
- [x] Generate `.codex-tmp/personal-plans/gavan-week1-product-copy-approval-packet.json`.
- [x] Focused P3.72 tests passed: 1 suite, 7 tests.
- [x] Run related Gavan day/week Personal Plan tests: 45 suites, 374 tests.
- [x] Run full Personal Plans suite: 104 suites, 680 tests.
- [x] Run TypeScript compile check: `npx tsc --noEmit --pretty false` exited with code 0.
- [x] Run source guard for P3.72 tooling.
- [x] Run encoding guard for P3.72 tool/test/report files and generated packet.
- [x] P3.73 Build a non-live product copy signature request packet before any catalog route planning.

## Update 2026-06-03 - P3.73

- [x] Inspect P3.73 handoff and confirm no live bridge approval.
- [x] Read P3.72 product copy approval packet.
- [x] Add TDD tests for a non-live product copy signature request packet before implementation.
- [x] Verify the red phase: the focused test failed because `tools/personal_plan_gavan_week1_product_copy_signature_request_packet` did not exist.
- [x] Implement `tools/personal_plan_gavan_week1_product_copy_signature_request_packet.ts`.
- [x] Keep output status `product_copy_signature_request_only_not_signed`.
- [x] Keep `signatureStatus: missing`, `signatureMayBeInferred: false`, and blocker `missing_signature:product_copy`.
- [x] Expose `readyToRequestSignature: true` because P3.72 copy checks pass and source writes are false.
- [x] Keep `catalogRoutePlanningBlocked: true` until a real signature or approved exception exists.
- [x] Keep `sourceWritesUsed: false`, `phaseWriteTargets: []`, and `liveEditsAllowed: false`.
- [x] Include evidence summary for the `content_quality_owner`.
- [x] Reject source-writing packets and already-signed packets instead of inferring approval.
- [x] Restrict request writes to `.codex-tmp` and `docs/reports`.
- [x] Generate `.codex-tmp/personal-plans/gavan-week1-product-copy-signature-request-packet.json`.
- [x] Focused P3.73 tests passed: 1 suite, 7 tests.
- [x] Run related Gavan day/week Personal Plan tests: 46 suites, 381 tests.
- [x] Run full Personal Plans suite: 105 suites, 687 tests.
- [x] Run TypeScript compile check: `npx tsc --noEmit --pretty false` exited with code 0.
- [x] Run source guard for P3.73 tooling.
- [x] Run encoding guard for P3.73 tool/test/report files and generated request.
- [x] P3.74 Build a non-live catalog route preflight that stays blocked by the missing product-copy signature.

## Update 2026-06-03 - P3.74

- [x] Inspect P3.74 handoff and confirm no content-quality signature or live bridge approval.
- [x] Read P3.73 product copy signature request packet.
- [x] Read P3.67 approval readiness manifest.
- [x] Add TDD tests for a non-live catalog route preflight before implementation.
- [x] Verify the red phase: the focused test failed because `tools/personal_plan_gavan_week1_catalog_route_preflight` did not exist.
- [x] Implement `tools/personal_plan_gavan_week1_catalog_route_preflight.ts`.
- [x] Keep output status `catalog_route_preflight_blocked_by_product_copy_signature_not_applied`.
- [x] Keep `catalogRoutePlanningBlocked: true`, `canOpenCatalogRouteTask: false`, and blocker `missing_signature:product_copy`.
- [x] Keep `sourceWritesUsed: false`, `phaseWriteTargets: []`, `liveEditsAllowed: false`, and `catalogSourceEdited: false`.
- [x] List six proposed day routes from the approved manifest without registering them.
- [x] Mark every proposed route `blocked_not_registered`, `productionRouteRegistered: false`, and `playable: false`.
- [x] Reject signed, unsafe, or wrong-shape inputs instead of unblocking catalog routes.
- [x] Restrict preflight writes to `.codex-tmp` and `docs/reports`.
- [x] Generate `.codex-tmp/personal-plans/gavan-week1-catalog-route-preflight.json`.
- [x] Focused P3.74 tests passed: 1 suite, 7 tests.
- [x] Run related Gavan day/week Personal Plan tests: 47 suites, 388 tests.
- [x] Run full Personal Plans suite: 106 suites, 694 tests.
- [x] Run TypeScript compile check: `npx tsc --noEmit --pretty false` exited with code 0.
- [x] Run source guard for P3.74 tooling.
- [x] Run encoding guard for P3.74 tool/test/report files and generated preflight.
- [x] P3.75 Build a read-only catalog source inventory for the future Gavan week 1 route without editing production files.

## Update 2026-06-03 - P3.75

- [x] Inspect P3.75 handoff and confirm the catalog route is still blocked by missing product-copy signature.
- [x] Read P3.74 catalog route preflight in read-only mode.
- [x] Inspect `app/personal_plan_catalog.ts` without editing it.
- [x] Add TDD tests for a read-only catalog source inventory before implementation.
- [x] Verify the red phase: the focused test failed because `tools/personal_plan_gavan_week1_catalog_source_inventory` did not exist.
- [x] Implement `tools/personal_plan_gavan_week1_catalog_source_inventory.ts`.
- [x] Keep output status `catalog_source_inventory_blocked_not_applied`.
- [x] Keep `catalogRoutePlanningBlocked: true`, `canOpenCatalogRouteTask: false`, and blocker `missing_signature:product_copy`.
- [x] Keep `sourceWritesUsed: false`, `phaseWriteTargets: []`, `liveEditsAllowed: false`, and `catalogSourceEdited: false`.
- [x] Report that the six proposed week 1 day ids are missing from the current catalog source.
- [x] Report read-only adapter surfaces: catalog export, Gavan plan definition, generated days call, day model, task destination model, and minute-load helper.
- [x] Report that the current catalog source contains generated scaffold for Gavan.
- [x] Report that the current catalog source does not contain broken encoding markers.
- [x] Add a synthetic test proving broken encoding markers would be detected without copying bad source text into output.
- [x] Restrict inventory writes to `.codex-tmp` and `docs/reports`.
- [x] Generate `.codex-tmp/personal-plans/gavan-week1-catalog-source-inventory.json`.
- [x] Focused P3.75 tests passed: 1 suite, 8 tests.
- [x] Run related Gavan day/week Personal Plan tests: 48 suites, 396 tests.
- [x] Run full Personal Plans suite: 107 suites, 702 tests.
- [x] Run TypeScript compile check: `npx tsc --noEmit --pretty false` exited with code 0.
- [x] Run source guard for P3.75 tooling.
- [x] Run encoding guard for P3.75 tool/test/report files, generated inventory, and next prompt.
- [x] P3.76 Build a non-live catalog adapter design from the P3.75 inventory without editing production files.

## Update 2026-06-03 - P3.76

- [x] Inspect P3.76 handoff and confirm no content-quality signature or live bridge approval.
- [x] Read P3.75 catalog source inventory.
- [x] Inspect catalog model surfaces in `app/personal_plan_catalog.ts` without editing it.
- [x] Add TDD tests for a non-live catalog adapter design before implementation.
- [x] Verify the red phase: the focused test failed because `tools/personal_plan_gavan_week1_catalog_adapter_design` did not exist.
- [x] Implement `tools/personal_plan_gavan_week1_catalog_adapter_design.ts`.
- [x] Keep output status `catalog_adapter_design_blocked_not_applied`.
- [x] Keep `catalogRoutePlanningBlocked: true`, `canOpenCatalogRouteTask: false`, and blocker `missing_signature:product_copy`.
- [x] Keep `sourceWritesUsed: false`, `phaseWriteTargets: []`, `liveEditsAllowed: false`, `routeRegistrationAllowed: false`, and `catalogSourceEdited: false`.
- [x] Map approved day ids `gavan-week1-day2` through `gavan-week1-day7` as missing from the current catalog.
- [x] Mark every day mapping `not_allowed_until_signature`, `productionRouteRegistered: false`, and `playable: false`.
- [x] Record compatibility findings for generated scaffold preservation, minute-load behavior, task destination behavior, and old-catalog regression risk.
- [x] Define future live-route acceptance criteria and keep every item `not_allowed_until_signature`.
- [x] Restrict adapter design writes to `.codex-tmp` and `docs/reports`.
- [x] Generate `.codex-tmp/personal-plans/gavan-week1-catalog-adapter-design.json`.
- [x] Focused P3.76 tests passed: 1 suite, 8 tests.
- [x] Run related Gavan day/week Personal Plan tests: 49 suites, 404 tests.
- [x] Run full Personal Plans suite: 108 suites, 710 tests.
- [x] Run TypeScript compile check: `npx tsc --noEmit --pretty false` exited with code 0.
- [x] Run source guard for P3.76 tooling.
- [x] Run encoding guard for P3.76 tool/test/report files, generated design, and next prompt.
- [x] P3.77 Build a read-only quiz source inventory for future Gavan week 1 quiz routes without editing production files.

## Update 2026-06-03 - P3.77

- [x] Inspect P3.77 handoff and confirm no content-quality signature or live bridge approval.
- [x] Read P3.76 catalog adapter design.
- [x] Inspect `app/personal_plan_quizzes.ts` as source text without editing it.
- [x] Add TDD tests for a read-only quiz source inventory before implementation.
- [x] Verify the red phase: the focused test failed because `tools/personal_plan_gavan_week1_quiz_source_inventory` did not exist.
- [x] Implement `tools/personal_plan_gavan_week1_quiz_source_inventory.ts`.
- [x] Keep output status `quiz_source_inventory_blocked_not_applied`.
- [x] Keep blocker `missing_signature:product_copy`.
- [x] Keep `sourceWritesUsed: false`, `phaseWriteTargets: []`, `liveEditsAllowed: false`, `routeRegistrationAllowed: false`, `quizRouteRegistrationAllowed: false`, and `quizSourceEdited: false`.
- [x] Report proposed dedicated quiz ids `gavan-week1-day2-quiz` through `gavan-week1-day7-quiz`.
- [x] Report that all proposed quiz ids are missing from current quiz source.
- [x] Detect quiz source surfaces: quiz factory, quiz registry, coverage registry, task copy registry, phrase getter, coverage getter, and task copy getter.
- [x] Detect legacy Gavan quiz exceptions and mark them as not reusable for the new week 1 route.
- [x] Require each future day quiz to be a dedicated 10-question quiz.
- [x] Mark every proposed quiz route `not_allowed_until_signature`, `routeRegistered: false`, and `playable: false`.
- [x] Restrict quiz inventory writes to `.codex-tmp` and `docs/reports`.
- [x] Generate `.codex-tmp/personal-plans/gavan-week1-quiz-source-inventory.json`.
- [x] Focused P3.77 tests passed: 1 suite, 8 tests.
- [x] Run related Gavan day/week Personal Plan tests: 50 suites, 412 tests.
- [x] Run full Personal Plans suite: 109 suites, 718 tests.
- [x] Run TypeScript compile check: `npx tsc --noEmit --pretty false` exited with code 0.
- [x] Run source guard for P3.77 tooling.
- [x] Run encoding guard for P3.77 tool/test/report files, generated inventory, and next prompt.
- [x] P3.78 Build a non-live quiz adapter design from the P3.77 inventory without editing production files.

## Update 2026-06-03 - P3.78

- [x] Inspect P3.78 handoff and confirm no content-quality signature or live bridge approval.
- [x] Read P3.77 quiz source inventory.
- [x] Add TDD tests for a non-live quiz adapter design before implementation.
- [x] Verify the red phase: the focused test failed because `tools/personal_plan_gavan_week1_quiz_adapter_design` did not exist.
- [x] Implement `tools/personal_plan_gavan_week1_quiz_adapter_design.ts`.
- [x] Keep output status `quiz_adapter_design_blocked_not_applied`.
- [x] Keep blocker `missing_signature:product_copy`.
- [x] Keep `sourceWritesUsed: false`, `phaseWriteTargets: []`, `liveEditsAllowed: false`, `routeRegistrationAllowed: false`, `quizRouteRegistrationAllowed: false`, and `quizSourceEdited: false`.
- [x] Define six future per-day quiz route designs for `gavan-week1-day2-quiz` through `gavan-week1-day7-quiz`.
- [x] Require exactly 10 questions for each future day quiz.
- [x] Require coverage links to approved day phrases for each future quiz.
- [x] Require task copy for `choice` and `typing` modes across `ru`, `uk`, and `es`.
- [x] Require legacy Gavan exceptions to remain isolated and not reused.
- [x] Define future live quiz acceptance criteria and keep every item `not_allowed_until_signature`.
- [x] Restrict quiz adapter design writes to `.codex-tmp` and `docs/reports`.
- [x] Generate `.codex-tmp/personal-plans/gavan-week1-quiz-adapter-design.json`.
- [x] Focused P3.78 tests passed: 1 suite, 8 tests.
- [x] Run related Gavan day/week Personal Plan tests: 51 suites, 420 tests.
- [x] Run full Personal Plans suite: 110 suites, 726 tests.
- [x] Run TypeScript compile check: `npx tsc --noEmit --pretty false` exited with code 0.
- [x] Run source guard for P3.78 tooling.
- [x] Run encoding guard for P3.78 tool/test/report files, generated design, and next prompt.
- [x] P3.79 Build a read-only UI route source inventory for future Gavan week 1 plan entrypoints without editing production UI.

## Update 2026-06-03 - P3.79

- [x] Inspect P3.79 handoff and confirm no content-quality signature or live UI route approval.
- [x] Read P3.78 quiz adapter design.
- [x] Inspect Home card, plan screen, task open helper, day open actions, task surface entrypoint, task surface bundle, and task surface API as source text only.
- [x] Add TDD tests for a read-only UI route source inventory before implementation.
- [x] Verify the red phase: the focused test failed because `tools/personal_plan_gavan_week1_ui_route_source_inventory` did not exist.
- [x] Implement `tools/personal_plan_gavan_week1_ui_route_source_inventory.ts`.
- [x] Keep output status `ui_route_source_inventory_blocked_not_applied`.
- [x] Keep blocker `missing_signature:product_copy`.
- [x] Keep `routeRegistrationAllowed: false`, `uiRouteRegistrationAllowed: false`, `liveEditsAllowed: false`, `sourceWritesUsed: false`, `phaseWriteTargets: []`, and `uiSourceEdited: false`.
- [x] Report UI source surfaces for Home, plan screen, task opening, day actions, task surface entrypoint, task surface bundle, and task surface API.
- [x] Report route abilities for plan screen, development plan screen, lesson menu, plan phrase lesson, quiz screen, plan renderer, and lesson shell without registering anything.
- [x] Report preservation risks for Home, onboarding, Premium, and self-guided paths.
- [x] Confirm inspected UI route source files contain no visible broken encoding markers.
- [x] Restrict UI route inventory writes to `.codex-tmp` and `docs/reports`.
- [x] Generate `.codex-tmp/personal-plans/gavan-week1-ui-route-source-inventory.json`.
- [x] Focused P3.79 tests passed: 1 suite, 9 tests.
- [x] Run related Gavan day/week Personal Plan tests: 52 suites, 429 tests.
- [x] Run full Personal Plans suite: 111 suites, 735 tests.
- [x] Run TypeScript compile check: `npx tsc --noEmit --pretty false` exited with code 0.
- [x] Run source guard for P3.79 tooling.
- [x] Run encoding guard for P3.79 tool/test/report files, generated inventory, and next prompt.
- [x] P3.80 Build a non-live UI route adapter design from the P3.79 inventory without editing production UI.

## Update 2026-06-03 - P3.80

- [x] Inspect P3.80 handoff and confirm no content-quality signature or live UI route approval.
- [x] Read P3.79 UI route source inventory, P3.76 catalog adapter design, and P3.78 quiz adapter design.
- [x] Add TDD tests for a non-live UI route adapter design before implementation.
- [x] Verify the red phase: the focused test failed because `tools/personal_plan_gavan_week1_ui_route_adapter_design` did not exist.
- [x] Implement `tools/personal_plan_gavan_week1_ui_route_adapter_design.ts`.
- [x] Keep output status `ui_route_adapter_design_blocked_not_applied`.
- [x] Keep blocker `missing_signature:product_copy`.
- [x] Keep `sourceWritesUsed: false`, `phaseWriteTargets: []`, `uiSourceEdited: false`, `routeRegistrationAllowed: false`, `uiRouteRegistrationAllowed: false`, and `liveEditsAllowed: false`.
- [x] Define future opening contracts for lesson task, plan phrase task, dedicated quiz task, plan renderer task, and lesson shell task.
- [x] Link every opening contract to detected P3.79 source surfaces and route abilities.
- [x] Require six dedicated quiz route designs and 10 questions for dedicated quiz opening.
- [x] Define regression gates for Home, onboarding, Premium, self-guided lessons, self-guided quizzes, plan task carryover, and completed-day state.
- [x] Mark every live acceptance criterion `not_allowed_until_signature`.
- [x] Restrict UI route adapter design writes to `.codex-tmp` and `docs/reports`.
- [x] Generate `.codex-tmp/personal-plans/gavan-week1-ui-route-adapter-design.json`.
- [x] Focused P3.80 tests passed: 1 suite, 9 tests.
- [x] Run related Gavan day/week Personal Plan tests: 53 suites, 438 tests.
- [x] Run full Personal Plans suite: 112 suites, 744 tests.
- [x] Run TypeScript compile check: `npx tsc --noEmit --pretty false` exited with code 0.
- [x] Run source guard for P3.80 tooling.
- [x] Run encoding guard for P3.80 tool/test/report files, generated design, and next prompt.
- [x] P3.81 Build an aggregate live-route readiness gate from catalog, quiz, and UI adapter designs without editing production files.

## Update 2026-06-03 - P3.81

- [x] Inspect P3.81 handoff and confirm no content-quality signature or live route approval.
- [x] Read P3.76 catalog adapter design, P3.78 quiz adapter design, and P3.80 UI route adapter design.
- [x] Add TDD tests for an aggregate live-route readiness gate before implementation.
- [x] Verify the red phase: the focused test failed because `tools/personal_plan_gavan_week1_aggregate_route_readiness_gate` did not exist.
- [x] Implement `tools/personal_plan_gavan_week1_aggregate_route_readiness_gate.ts`.
- [x] Keep output status `aggregate_route_readiness_blocked_not_applied`.
- [x] Keep blocker `missing_signature:product_copy`.
- [x] Keep `sourceWritesUsed: false`, `phaseWriteTargets: []`, `liveEditsAllowed: false`, and all route registration flags false.
- [x] Check catalog day ids count is 6 and every mapping is blocked, not registered, and not playable.
- [x] Check quiz route designs count is 6, every quiz has 10 questions, and every quiz is blocked, not registered, and not playable.
- [x] Check UI opening contracts cover lesson, plan phrase, quiz, plan renderer, and lesson shell.
- [x] Check regression gates include Home, onboarding, Premium, self-guided lessons, self-guided quizzes, carryover, and completed-day state.
- [x] Produce a readiness matrix with `readyForLive: false`.
- [x] Mark every route blocker and live acceptance criterion `not_allowed_until_signature`.
- [x] Restrict aggregate readiness writes to `.codex-tmp` and `docs/reports`.
- [x] Generate `.codex-tmp/personal-plans/gavan-week1-aggregate-route-readiness-gate.json`.
- [x] Focused P3.81 tests passed: 1 suite, 9 tests.
- [x] Run related Gavan day/week Personal Plan tests: 54 suites, 447 tests.
- [x] Run full Personal Plans suite: 113 suites, 753 tests.
- [x] Run TypeScript compile check: `npx tsc --noEmit --pretty false` exited with code 0.
- [x] Run source guard for P3.81 tooling.
- [x] Run encoding guard for P3.81 tool/test/report files, generated gate, and next prompt.
- [x] P3.82 Build a route signature request packet from the aggregate readiness gate without editing production files.

## Update 2026-06-03 - P3.82

- [x] Inspect P3.82 handoff and confirm no explicit route approval or live route signature.
- [x] Read P3.81 aggregate route readiness gate.
- [x] Inspect existing product-copy signature request patterns for consistency.
- [x] Add TDD tests for a route signature request packet before implementation.
- [x] Verify the red phase: the focused test failed because `tools/personal_plan_gavan_week1_route_signature_request_packet` did not exist.
- [x] Implement `tools/personal_plan_gavan_week1_route_signature_request_packet.ts`.
- [x] Keep output status `route_signature_request_blocked_not_signed`.
- [x] Keep blocker `missing_signature:product_copy`.
- [x] Keep `readyForLive: false`, `sourceWritesUsed: false`, `phaseWriteTargets: []`, `liveEditsAllowed: false`, and all route registration flags false.
- [x] Include reviewer summary for catalog, quiz, UI, regression, blockers, and live acceptance criteria.
- [x] Include exact evidence file paths for catalog adapter, quiz adapter, UI route adapter, and aggregate readiness gate.
- [x] Include reviewer decision field with `approved: false` and `status: not_reviewed`.
- [x] Prevent signature inference from unsafe or live-ready gates.
- [x] Restrict route signature request writes to `.codex-tmp` and `docs/reports`.
- [x] Generate `.codex-tmp/personal-plans/gavan-week1-route-signature-request-packet.json`.
- [x] Focused P3.82 tests passed: 1 suite, 8 tests.
- [x] Run related Gavan day/week Personal Plan tests: 55 suites, 455 tests.
- [x] Run full Personal Plans suite: 114 suites, 761 tests.
- [x] Run TypeScript compile check: `npx tsc --noEmit --pretty false` exited with code 0.
- [x] Run source guard for P3.82 tooling.
- [x] Run encoding guard for P3.82 tool/test/report files, generated request, and next prompt.
- [x] P3.83 Build a route approval packet guard from the unsigned request without approving live routes.

## Update 2026-06-03 - P3.83

- [x] Inspect P3.83 handoff and confirm no explicit signed route approval metadata.
- [x] Read P3.82 unsigned route signature request packet.
- [x] Inspect existing approval packet patterns for consistency.
- [x] Add TDD tests for a route approval packet guard before implementation.
- [x] Verify the red phase: the focused test failed because `tools/personal_plan_gavan_week1_route_approval_guard` did not exist.
- [x] Implement `tools/personal_plan_gavan_week1_route_approval_guard.ts`.
- [x] Keep output status `route_approval_guard_blocked_unsigned`.
- [x] Keep blocker `missing_signature:product_copy`.
- [x] Keep `approved: false`, `readyForLive: false`, `sourceWritesUsed: false`, `phaseWriteTargets: []`, `liveEditsAllowed: false`, and all route registration flags false.
- [x] Define required signed approval metadata shape.
- [x] Reject missing reviewer name, missing approval timestamp, incomplete evidence paths, partial route approval, and missing decision text.
- [x] Reject unsafe signed or already-approved requests instead of opening routes.
- [x] Restrict route approval guard writes to `.codex-tmp` and `docs/reports`.
- [x] Generate `.codex-tmp/personal-plans/gavan-week1-route-approval-guard.json`.
- [x] Focused P3.83 tests passed: 1 suite, 7 tests.
- [x] Run related Gavan day/week Personal Plan tests: 56 suites, 462 tests.
- [x] Run full Personal Plans suite: 115 suites, 768 tests.
- [x] Run TypeScript compile check: `npx tsc --noEmit --pretty false` exited with code 0.
- [x] Run source guard for P3.83 tooling.
- [x] Run encoding guard for P3.83 tool/test/report files, generated guard, and next prompt.
- [x] P3.84 Build a live-route implementation preflight from the unsigned approval guard without editing production files.

## Update 2026-06-03 - P3.84

- [x] Inspect P3.84 handoff and confirm no explicit signed route approval metadata.
- [x] Read P3.83 unsigned route approval guard.
- [x] Add TDD tests for a live-route implementation preflight before implementation.
- [x] Verify the red phase: the focused test failed because `tools/personal_plan_gavan_week1_live_route_implementation_preflight` did not exist.
- [x] Implement `tools/personal_plan_gavan_week1_live_route_implementation_preflight.ts`.
- [x] Keep output status `live_route_preflight_blocked_unsigned`.
- [x] Keep blocker `missing_signature:product_copy`.
- [x] Keep `approved: false`, `readyForLive: false`, `sourceWritesUsed: false`, `phaseWriteTargets: []`, `liveEditsAllowed: false`, and all route registration flags false.
- [x] List future production source edit targets for catalog days, dedicated day quizzes, task opening helper, and day open actions.
- [x] Mark every proposed source edit `blocked_not_allowed` and `writeActionAllowed: false`.
- [x] List required regression suites for catalog, quiz, UI routing, Home, quiz screen, lesson progress, and Premium activation.
- [x] List blocked emulator checks for Home plan entry, lesson task opening, dedicated quiz opening, plan renderer opening, self-guided lessons, self-guided quizzes, and completed-day behavior.
- [x] Keep future live pass policy dependent on signed approval, full route bundle scope, and regression evidence.
- [x] Restrict live-route preflight writes to `.codex-tmp` and `docs/reports`.
- [x] Generate `.codex-tmp/personal-plans/gavan-week1-live-route-implementation-preflight.json`.
- [x] Focused P3.84 tests passed: 1 suite, 7 tests.
- [x] Run related Gavan day/week Personal Plan tests: 57 suites, 469 tests.
- [x] Run full Personal Plans suite: 116 suites, 775 tests.
- [x] Run TypeScript compile check: `npx tsc --noEmit --pretty false` exited with code 0.
- [x] Run source guard for P3.84 tooling.
- [x] Run encoding guard for P3.84 tool/test/report files, generated preflight, and next prompt.
- [x] P3.85 Start Gavan week 1 content authoring seed after reset as artifacts only, with broad human phrases and varied exercise formats.

## Update 2026-06-03 - P3.85

- [x] Inspect P3.85 handoff, P3.84 live-route preflight, and existing Gavan week 1 reset context.
- [x] Add TDD tests for a non-live Gavan week 1 content authoring seed before implementation.
- [x] Verify the red phase: the focused test failed because `tools/personal_plan_gavan_week1_content_authoring_seed` did not exist.
- [x] Implement `tools/personal_plan_gavan_week1_content_authoring_seed.ts`.
- [x] Keep output status `content_authoring_seed_not_live`.
- [x] Keep `liveIntegration: false`, `sourceWritesUsed: false`, and `phaseWriteTargets: []`.
- [x] Generate exactly 7 days for Gavan week 1.
- [x] Treat old narrow day artifacts as `non_canonical_reset_evidence`.
- [x] Add broad everyday phrase banks without required name, phone, email, apartment, rent, landlord, viewing, Alex, or Beta anchors.
- [x] Add 5/10/15/20 minute load contracts for every day.
- [x] Add lesson bridge, exercise blocks, phrase bank, explanation cards, quiz intent, recall plan, and honest media claims for every day.
- [x] Require explanation coverage for every new word and first-seen construction.
- [x] Require wrong-answer feedback to explain the correct idea without inventing unseen wrong choices.
- [x] Include varied exercise types across the week: lesson bridge, phrase build, missing word, natural choice, listening choice, active recall, quick reply, mistake repair, micro dialogue, and pronunciation shadow.
- [x] Keep audio and pronunciation as not generated / not built.
- [x] Restrict content seed writes to `.codex-tmp` and `docs/reports`.
- [x] Generate `.codex-tmp/personal-plans/gavan-week1-content-authoring-seed.json`.
- [x] Focused P3.85 tests passed: 1 suite, 9 tests.
- [x] Run related Gavan day/week Personal Plan tests: 58 suites, 478 tests.
- [x] Run full Personal Plans suite: 117 suites, 784 tests.
- [x] Run TypeScript compile check: `npx tsc --noEmit --pretty false` exited with code 0.
- [x] Run source guard for P3.85 tooling.
- [x] Run encoding guard for P3.85 tool/test/report files, generated seed, and next prompt.
- [x] P3.86 Build Gavan week 1 day 1 concrete exercise material candidate from the reset content seed as artifacts only.

## Update 2026-06-03 - P3.86

- [x] Inspect P3.86 handoff and P3.85 content authoring seed.
- [x] Add TDD tests for a non-live Gavan week 1 day 1 material candidate before implementation.
- [x] Verify the red phase: the focused test failed because `tools/personal_plan_gavan_week1_day1_material_candidate` did not exist.
- [x] Implement `tools/personal_plan_gavan_week1_day1_material_candidate.ts`.
- [x] Keep output status `day1_material_candidate_not_live`.
- [x] Keep source seed status `content_authoring_seed_not_live`.
- [x] Keep `liveIntegration: false`, `sourceWritesUsed: false`, and `phaseWriteTargets: []`.
- [x] Build concrete day 1 material blocks for lesson bridge, phrase build, natural choice, active recall, and day quiz intent.
- [x] Build phrase-build word tiles with target token counts matching target phrases.
- [x] Add safe distractor tiles that do not duplicate target words.
- [x] Keep plan recall without correct-word highlighting and without hints.
- [x] Preserve error carryover in active recall.
- [x] Add after-answer explanations covering every new word and first-seen construction.
- [x] Keep wrong feedback safe: explain the correct idea only, without inventing unseen wrong choices.
- [x] Plan exactly 10 day quiz questions without writing or registering the quiz.
- [x] Keep audio and pronunciation as not generated / not built.
- [x] Restrict material candidate writes to `.codex-tmp` and `docs/reports`.
- [x] Generate `.codex-tmp/personal-plans/gavan-week1-day1-material-candidate.json`.
- [x] Focused P3.86 tests passed: 1 suite, 11 tests.
- [x] Run related Gavan day/week Personal Plan tests: 59 suites, 489 tests.
- [x] Run full Personal Plans suite: 118 suites, 795 tests.
- [x] Run TypeScript compile check: `npx tsc --noEmit --pretty false` exited with code 0.
- [x] Run source guard for P3.86 tooling.
- [x] Run encoding guard for P3.86 tool/test/report files, generated candidate, and next prompt.
- [x] P3.87 Build a Gavan week 1 day 1 material quality/export packet before expanding the same material shape to day 2.

## Update 2026-06-03 - P3.87

- [x] Inspect P3.87 handoff, P3.86 day 1 material candidate, and P3.85 content seed.
- [x] Add TDD tests for a non-live Gavan week 1 day 1 material export packet before implementation.
- [x] Verify the red phase: the focused test failed because `tools/personal_plan_gavan_week1_day1_material_export_packet` did not exist.
- [x] Implement `tools/personal_plan_gavan_week1_day1_material_export_packet.ts`.
- [x] Keep output status `day1_material_export_not_live` for a valid candidate.
- [x] Keep source candidate status `day1_material_candidate_not_live`.
- [x] Keep `exportApproved: false`, `liveIntegration: false`, `sourceWritesUsed: false`, and `phaseWriteTargets: []`.
- [x] Add reviewer summary for blocks, phrases, word tiles, distractors, explanations, recall, and quiz intent.
- [x] Add quality gates for broadness, word tile counts, distractor safety, explanation coverage, no recall highlighting, quiz count, media honesty, and no production writes.
- [x] Make failed gates produce `day1_material_export_blocked` instead of approval.
- [x] Add compact human-readable day 1 preview.
- [x] Restrict export packet writes to `.codex-tmp` and `docs/reports`.
- [x] Generate `.codex-tmp/personal-plans/gavan-week1-day1-material-export-packet.json`.
- [x] Focused P3.87 tests passed: 1 suite, 8 tests.
- [x] Run related Gavan day/week Personal Plan tests: 60 suites, 497 tests.
- [x] Run full Personal Plans suite: 119 suites, 803 tests.
- [x] Run TypeScript compile check: `npx tsc --noEmit --pretty false` exited with code 0.
- [x] Run source guard for P3.87 tooling.
- [x] Run encoding guard for P3.87 tool/test/report files, generated export, and next prompt.
- [x] P3.88 Build Gavan week 1 day 2 concrete exercise material candidate using the reviewed day 1 shape.

## Update 2026-06-03 - P3.88

- [x] Inspect P3.88 handoff, P3.85 content authoring seed, and P3.87 day 1 material export packet.
- [x] Add TDD tests for a non-live Gavan week 1 day 2 material candidate before implementation.
- [x] Verify the red phase: the focused test failed because `tools/personal_plan_gavan_week1_day2_material_candidate` did not exist.
- [x] Implement `tools/personal_plan_gavan_week1_day2_material_candidate.ts`.
- [x] Keep output status `day2_material_candidate_not_live`.
- [x] Keep source seed status `content_authoring_seed_not_live`.
- [x] Require source day 1 export status `day1_material_export_not_live`.
- [x] Keep `liveIntegration: false`, `sourceWritesUsed: false`, and `phaseWriteTargets: []`.
- [x] Build concrete day 2 material blocks for lesson bridge, listening choice, active recall, phrase build, and day quiz intent.
- [x] Build phrase-build word tiles with target token counts matching target phrases.
- [x] Add safe distractor tiles that do not duplicate target words.
- [x] Add listening placeholders only, with no generated audio claim.
- [x] Keep plan recall without correct-word highlighting and without hints.
- [x] Preserve error carryover in active recall.
- [x] Add after-answer explanations covering every new word and first-seen construction.
- [x] Keep wrong feedback safe: explain the correct idea only, without pretending to know the selected wrong option.
- [x] Plan exactly 10 day quiz questions without writing or registering the quiz.
- [x] Keep audio and pronunciation as not generated / not built.
- [x] Restrict material candidate writes to `.codex-tmp` and `docs/reports`.
- [x] Generate `.codex-tmp/personal-plans/gavan-week1-day2-material-candidate.json`.
- [x] Focused P3.88 tests passed: 1 suite, 12 tests.
- [x] Run related Gavan day/week Personal Plan tests: 61 suites, 509 tests.
- [x] Run full Personal Plans suite: 120 suites, 815 tests.
- [x] Run TypeScript compile check: `npx tsc --noEmit --pretty false` exited with code 0.
- [x] Run source guard for P3.88 tooling.
- [x] Run encoding guard for P3.88 tool/test/report files, generated candidate, and next prompt.
- [x] P3.89 Build a Gavan week 1 day 2 material quality/export packet before expanding the same material shape to day 3.

## Update 2026-06-03 - P3.89

- [x] Inspect P3.89 handoff, P3.88 day 2 material candidate, and P3.87 day 1 material export packet.
- [x] Add TDD tests for a non-live Gavan week 1 day 2 material export packet before implementation.
- [x] Verify the red phase: the focused test failed because `tools/personal_plan_gavan_week1_day2_material_export_packet` did not exist.
- [x] Implement `tools/personal_plan_gavan_week1_day2_material_export_packet.ts`.
- [x] Keep output status `day2_material_export_not_live` for a valid candidate.
- [x] Keep source candidate status `day2_material_candidate_not_live`.
- [x] Keep `exportApproved: false`, `liveIntegration: false`, `sourceWritesUsed: false`, and `phaseWriteTargets: []`.
- [x] Add reviewer summary for blocks, phrases, word tiles, listening placeholders, recall, and quiz intent.
- [x] Add quality gates for broadness, word tile counts, distractor safety, explanation coverage, listening placeholder honesty, no recall highlighting, quiz count, media honesty, and no production writes.
- [x] Make failed gates produce `day2_material_export_blocked` instead of approval.
- [x] Add compact human-readable day 2 preview, including listening placeholder, recall, and quiz lines.
- [x] Restrict export packet writes to `.codex-tmp` and `docs/reports`.
- [x] Generate `.codex-tmp/personal-plans/gavan-week1-day2-material-export-packet.json`.
- [x] Focused P3.89 tests passed: 1 suite, 8 tests.
- [x] Run related Gavan day/week Personal Plan tests: 62 suites, 517 tests.
- [x] Run full Personal Plans suite: 121 suites, 823 tests.
- [x] Run TypeScript compile check: `npx tsc --noEmit --pretty false` exited with code 0.
- [x] Run source guard for P3.89 tooling.
- [x] Run encoding guard for P3.89 tool/test/report files, generated export, and next prompt.
- [x] P3.90 Build Gavan week 1 day 3 concrete exercise material candidate using the reviewed day 2 export shape.

## Update 2026-06-03 - P3.90

- [x] Inspect P3.90 handoff, P3.89 day 2 material export packet, and P3.85 content authoring seed.
- [x] Add TDD tests for a non-live Gavan week 1 day 3 material candidate before implementation.
- [x] Verify the red phase: the focused test failed because `tools/personal_plan_gavan_week1_day3_material_candidate` did not exist.
- [x] Implement `tools/personal_plan_gavan_week1_day3_material_candidate.ts`.
- [x] Keep output status `day3_material_candidate_not_live`.
- [x] Keep source seed status `content_authoring_seed_not_live`.
- [x] Require source day 2 export status `day2_material_export_not_live`.
- [x] Keep `liveIntegration: false`, `sourceWritesUsed: false`, and `phaseWriteTargets: []`.
- [x] Build concrete day 3 material blocks for lesson bridge, phrase build, missing word, active recall, and day quiz intent.
- [x] Build phrase-build word tiles with target token counts matching target phrases.
- [x] Add missing-word items with one blank and exact token counts.
- [x] Add safe distractor tiles that do not duplicate target words or missing-word answers.
- [x] Keep plan recall without correct-word highlighting and without hints.
- [x] Preserve error carryover in active recall.
- [x] Add after-answer explanations covering every new word and first-seen construction.
- [x] Keep wrong feedback safe: explain the correct idea only, without pretending to know the selected wrong option.
- [x] Plan exactly 10 day quiz questions without writing or registering the quiz.
- [x] Keep audio and pronunciation as not generated / not built.
- [x] Restrict material candidate writes to `.codex-tmp` and `docs/reports`.
- [x] Generate `.codex-tmp/personal-plans/gavan-week1-day3-material-candidate.json`.
- [x] Focused P3.90 tests passed: 1 suite, 12 tests.
- [x] Run related Gavan day/week Personal Plan tests: 63 suites, 529 tests.
- [x] Run full Personal Plans suite: 121 suites and 834 tests passed; 1 suite failed on existing onboarding Premium activation contract expecting an `OnboardingStepKey` string without `planPaywall`.
- [x] Run TypeScript compile check: `npx tsc --noEmit --pretty false` exited with code 0.
- [x] Run source guard for P3.90 tooling.
- [x] Run encoding guard for P3.90 tool/test/report files, generated candidate, and next prompt.
- [x] P3.91 Build a Gavan week 1 day 3 material quality/export packet before expanding the same material shape to day 4.

## Update 2026-06-03 - P3.91

- [x] Inspect P3.91 handoff, P3.90 day 3 material candidate, and P3.89 day 2 material export packet.
- [x] Add TDD tests for a non-live Gavan week 1 day 3 material export packet before implementation.
- [x] Verify the red phase: the focused test failed because `tools/personal_plan_gavan_week1_day3_material_export_packet` did not exist.
- [x] Implement `tools/personal_plan_gavan_week1_day3_material_export_packet.ts`.
- [x] Keep output status `day3_material_export_not_live` for a valid candidate.
- [x] Keep source candidate status `day3_material_candidate_not_live`.
- [x] Keep `exportApproved: false`, `liveIntegration: false`, `sourceWritesUsed: false`, and `phaseWriteTargets: []`.
- [x] Add reviewer summary for blocks, phrases, phrase-build items, missing-word items, recall, and quiz intent.
- [x] Add quality gates for broadness, word tile counts, distractor safety, explanation coverage, missing-word slot quality, no recall highlighting, quiz count, media honesty, and no production writes.
- [x] Make failed gates produce `day3_material_export_blocked` instead of approval.
- [x] Add compact human-readable day 3 preview, including phrase tiles, missing-word, recall, and quiz lines.
- [x] Restrict export packet writes to `.codex-tmp` and `docs/reports`.
- [x] Generate `.codex-tmp/personal-plans/gavan-week1-day3-material-export-packet.json`.
- [x] Focused P3.91 tests passed: 1 suite, 8 tests.
- [x] Run related Gavan day/week Personal Plan tests: 64 suites, 537 tests.
- [x] Run full Personal Plans suite: 123 suites, 843 tests.
- [x] Run TypeScript compile check: `npx tsc --noEmit --pretty false` exited with code 0.
- [x] Run source guard for P3.91 tooling.
- [x] Run encoding guard for P3.91 tool/test/report files, generated export, and next prompt.
- [x] P3.92 Build Gavan week 1 day 4 concrete exercise material candidate using the reviewed day 3 export shape.

## Update 2026-06-03 - P3.92

- [x] Inspect P3.92 handoff, P3.91 day 3 material export packet, and reset week 1 content seed.
- [x] Add TDD tests for a non-live Gavan week 1 day 4 material candidate before implementation.
- [x] Verify the red phase: the focused test failed because `tools/personal_plan_gavan_week1_day4_material_candidate` did not exist.
- [x] Implement `tools/personal_plan_gavan_week1_day4_material_candidate.ts`.
- [x] Keep output status `day4_material_candidate_not_live`.
- [x] Keep source seed status `content_authoring_seed_not_live`.
- [x] Require source day 3 export status `day3_material_export_not_live`.
- [x] Keep `liveIntegration: false`, `sourceWritesUsed: false`, and `phaseWriteTargets: []`.
- [x] Use only reset day 4 seed phrases: `Is this right?`, `Is it here?`, `Is that okay?`, `Do I need anything else?`.
- [x] Build concrete day 4 blocks for lesson bridge, natural choice, mistake repair, quick reply, active recall, and day quiz intent.
- [x] Build natural-choice and quick-reply items with exact option counts and unique options.
- [x] Build repair items with exact target token counts and safe distractor tiles.
- [x] Keep plan recall without correct-word highlighting and without hints.
- [x] Preserve error carryover in active recall.
- [x] Add after-answer explanations covering every new word and first-seen construction.
- [x] Keep wrong feedback safe: explain the correct idea only, without pretending to know the selected wrong option.
- [x] Plan exactly 10 day quiz questions without writing or registering the quiz.
- [x] Keep audio and pronunciation as not generated / not built.
- [x] Restrict material candidate writes to `.codex-tmp` and `docs/reports`.
- [x] Generate `.codex-tmp/personal-plans/gavan-week1-day4-material-candidate.json`.
- [x] Focused P3.92 tests passed: 1 suite, 13 tests.
- [x] Run related Gavan day/week Personal Plan tests: 65 suites, 550 tests.
- [x] Run full Personal Plans suite: 124 suites, 856 tests.
- [x] Run TypeScript compile check: `npx tsc --noEmit --pretty false` exited with code 0.
- [x] Run source guard for P3.92 tooling.
- [x] Run encoding guard for P3.92 tool/test/report files, generated candidate, and next prompt.
- [x] P3.93 Build a Gavan week 1 day 4 material quality/export packet before expanding the same material shape to day 5.

## Update 2026-06-03 - P3.93

- [x] Inspect P3.93 handoff, P3.92 day 4 material candidate, and P3.91 day 3 material export packet.
- [x] Add TDD tests for a non-live Gavan week 1 day 4 material export packet before implementation.
- [x] Verify the red phase: the focused test failed because `tools/personal_plan_gavan_week1_day4_material_export_packet` did not exist.
- [x] Implement `tools/personal_plan_gavan_week1_day4_material_export_packet.ts`.
- [x] Keep output status `day4_material_export_not_live` for a valid candidate.
- [x] Keep source candidate status `day4_material_candidate_not_live`.
- [x] Keep `exportApproved: false`, `liveIntegration: false`, `sourceWritesUsed: false`, and `phaseWriteTargets: []`.
- [x] Add reviewer summary for blocks, phrases, natural-choice items, repair items, quick-reply items, recall, and quiz intent.
- [x] Add quality gates for broadness, choice option counts, repair tile counts, distractor safety, explanation coverage, no recall highlighting, quiz count, media honesty, and no production writes.
- [x] Make failed gates produce `day4_material_export_blocked` instead of approval.
- [x] Add compact human-readable day 4 preview, including natural choice, repair, quick reply, recall, and quiz lines.
- [x] Restrict export packet writes to `.codex-tmp` and `docs/reports`.
- [x] Generate `.codex-tmp/personal-plans/gavan-week1-day4-material-export-packet.json`.
- [x] Focused P3.93 tests passed: 1 suite, 8 tests.
- [x] Run related Gavan day/week Personal Plan tests: 66 suites, 558 tests.
- [x] Run full Personal Plans suite: 125 suites, 864 tests.
- [x] Run TypeScript compile check: `npx tsc --noEmit --pretty false` exited with code 0.
- [x] Run source guard for P3.93 tooling.
- [x] Run encoding guard for P3.93 tool/test/report files, generated export, and next prompt.
- [x] P3.94 Build Gavan week 1 day 5 concrete exercise material candidate using the reviewed day 4 export shape.

## Update 2026-06-03 - P3.94

- [x] Inspect P3.94 handoff, P3.93 day 4 material export packet, and reset week 1 content seed.
- [x] Add TDD tests for a non-live Gavan week 1 day 5 material candidate before implementation.
- [x] Verify the red phase: the focused test failed because `tools/personal_plan_gavan_week1_day5_material_candidate` did not exist.
- [x] Implement `tools/personal_plan_gavan_week1_day5_material_candidate.ts`.
- [x] Keep output status `day5_material_candidate_not_live`.
- [x] Keep source seed status `content_authoring_seed_not_live`.
- [x] Require source day 4 export status `day4_material_export_not_live`.
- [x] Keep `liveIntegration: false`, `sourceWritesUsed: false`, and `phaseWriteTargets: []`.
- [x] Use only reset day 5 seed phrases: `Could you explain it simply?`, `Could you show me?`, `Can you write it down?`, `Please use simple words.`
- [x] Build concrete day 5 blocks for lesson bridge, phrase build, listening choice, natural choice, active recall, and day quiz intent.
- [x] Build phrase-build items with exact target token counts and safe distractor tiles.
- [x] Build listening placeholders only, with no generated audio claim.
- [x] Build natural-choice items with exact option counts and unique options.
- [x] Keep plan recall without correct-word highlighting and without hints.
- [x] Preserve error carryover in active recall.
- [x] Add after-answer explanations covering every new word and first-seen construction.
- [x] Keep wrong feedback safe: explain the correct idea only, without pretending to know the selected wrong option.
- [x] Plan exactly 10 day quiz questions without writing or registering the quiz.
- [x] Keep audio and pronunciation as not generated / not built.
- [x] Restrict material candidate writes to `.codex-tmp` and `docs/reports`.
- [x] Generate `.codex-tmp/personal-plans/gavan-week1-day5-material-candidate.json`.
- [x] Focused P3.94 tests passed: 1 suite, 13 tests.
- [x] Run related Gavan day/week Personal Plan tests: 67 suites, 571 tests.
- [x] Run full Personal Plans suite: 126 suites, 877 tests.
- [x] Run TypeScript compile check: `npx tsc --noEmit --pretty false` exited with code 0.
- [x] Run source guard for P3.94 tooling.
- [x] Run encoding guard for P3.94 tool/test/report files, generated candidate, and next prompt.
- [x] P3.95 Build a Gavan week 1 day 5 material quality/export packet before expanding the same material shape to day 6.

## Update 2026-06-03 - P3.95

- [x] Inspect P3.95 handoff, P3.94 day 5 material candidate, and P3.93/P3.94 implementation pattern.
- [x] Add TDD tests for a non-live Gavan week 1 day 5 material export packet before implementation.
- [x] Verify the red phase: the focused test failed because `tools/personal_plan_gavan_week1_day5_material_export_packet` did not exist.
- [x] Implement `tools/personal_plan_gavan_week1_day5_material_export_packet.ts`.
- [x] Keep output status `day5_material_export_not_live` for a valid candidate.
- [x] Keep source candidate status `day5_material_candidate_not_live`.
- [x] Keep `exportApproved: false`, `liveIntegration: false`, `sourceWritesUsed: false`, and `phaseWriteTargets: []`.
- [x] Add reviewer summary for blocks, phrases, phrase-build items, listening placeholders, natural-choice items, recall, and quiz intent.
- [x] Add quality gates for broadness, word tile counts, distractor safety, choice option counts, listening placeholder honesty, explanation coverage, no recall highlighting, quiz count, media honesty, and no production writes.
- [x] Make failed gates produce `day5_material_export_blocked` instead of approval.
- [x] Add compact human-readable day 5 preview, including phrase tile, listening placeholder, natural choice, recall, and quiz lines.
- [x] Restrict export packet writes to `.codex-tmp` and `docs/reports`.
- [x] Generate `.codex-tmp/personal-plans/gavan-week1-day5-material-export-packet.json`.
- [x] Focused P3.95 tests passed: 1 suite, 8 tests.
- [x] Run related Gavan day/week Personal Plan tests: 68 suites, 579 tests.
- [x] Run full Personal Plans suite: 127 suites, 885 tests.
- [x] Run TypeScript compile check: `npx tsc --noEmit --pretty false` exited with code 0.
- [x] Run source guard for P3.95 tooling.
- [x] Run encoding guard for P3.95 tool/test/report files, generated export, and next prompt.
- [x] P3.96 Build Gavan week 1 day 6 concrete exercise material candidate using the reviewed day 5 export shape.

## Update 2026-06-03 - P3.96

- [x] Inspect P3.96 handoff, P3.95 day 5 material export packet, and reset week 1 content seed.
- [x] Add TDD tests for a non-live Gavan week 1 day 6 material candidate before implementation.
- [x] Verify the red phase: the focused test failed because `tools/personal_plan_gavan_week1_day6_material_candidate` did not exist.
- [x] Implement `tools/personal_plan_gavan_week1_day6_material_candidate.ts`.
- [x] Keep output status `day6_material_candidate_not_live`.
- [x] Keep source seed status `content_authoring_seed_not_live`.
- [x] Require source day 5 export status `day5_material_export_not_live`.
- [x] Keep `liveIntegration: false`, `sourceWritesUsed: false`, and `phaseWriteTargets: []`.
- [x] Use only reset day 6 seed phrases: `That works for me.`, `I can do that.`, `I can't do that today.`, `I'll check and come back.`
- [x] Build concrete day 6 blocks for lesson bridge, quick reply, missing word, mistake repair, pronunciation shadow placeholder, active recall, and day quiz intent.
- [x] Build quick-reply items with exact option counts and unique options.
- [x] Build missing-word items with a visible blank, exact option counts, and the correct token included.
- [x] Build repair items with exact target tile counts and safe distractor tiles.
- [x] Keep pronunciation as placeholders only, with no scoring claim.
- [x] Keep plan recall without correct-word highlighting and without hints.
- [x] Preserve error carryover in active recall.
- [x] Add after-answer explanations covering every new word and first-seen construction.
- [x] Keep wrong feedback safe: explain the correct idea only, without pretending to know the selected wrong option.
- [x] Plan exactly 10 day quiz question blueprints without writing or registering the quiz.
- [x] Keep audio and pronunciation media as not generated / not built.
- [x] Restrict material candidate writes to `.codex-tmp` and `docs/reports`.
- [x] Generate `.codex-tmp/personal-plans/gavan-week1-day6-material-candidate.json`.
- [x] Focused P3.96 tests passed: 1 suite, 13 tests.
- [x] Restore cleaned `.codex-tmp` prerequisite artifacts through existing guard-test writer chain before the related verification pass.
- [x] Run related Gavan day/week Personal Plan tests: 69 suites, 592 tests.
- [x] Run full Personal Plans suite: 128 suites, 899 tests.
- [x] Run TypeScript compile check: `npx tsc --noEmit --pretty false` exited with code 0.
- [x] Run source guard for P3.96 tooling.
- [x] Run encoding guard for P3.96 tool/test/report files, generated candidate, and next prompt.
- [x] P3.97 Build a Gavan week 1 day 6 material quality/export packet before expanding the same material shape to day 7.

## Update 2026-06-03 - P3.97

- [x] Inspect P3.97 handoff, P3.96 day 6 material candidate, P3.95 day 5 material export packet, and reset week 1 content seed.
- [x] Add TDD tests for a non-live Gavan week 1 day 6 material export packet before implementation.
- [x] Verify the red phase: the focused test failed because `tools/personal_plan_gavan_week1_day6_material_export_packet` did not exist.
- [x] Implement `tools/personal_plan_gavan_week1_day6_material_export_packet.ts`.
- [x] Keep output status `day6_material_export_not_live`.
- [x] Keep source candidate status `day6_material_candidate_not_live`.
- [x] Keep `exportApproved: false`, `liveIntegration: false`, `sourceWritesUsed: false`, and `phaseWriteTargets: []`.
- [x] Summarize day 6 block count, phrase count, quick replies, missing-word items, repair items, pronunciation placeholders, recall flags, quiz count, and exercise type order.
- [x] Add export quality gates for broadness, quick-reply option counts, missing-word blanks, repair tile counts, pronunciation placeholder honesty, explanation coverage, recall safety, quiz count, media honesty, and no production writes.
- [x] Block broken candidates instead of approving them.
- [x] Generate `.codex-tmp/personal-plans/gavan-week1-day6-material-export-packet.json`.
- [x] Restrict export packet writes to `.codex-tmp` and `docs/reports`.
- [x] Focused P3.97 tests passed: 1 suite, 8 tests.
- [x] Run related material-chain Personal Plan tests: 7 suites, 61 tests.
- [ ] Full `personal_plan` Jest suite is not green in the current workspace: 25 suites failed, 154 passed, 179 total. Failures are outside P3.97 and include missing `.codex-tmp` prerequisite JSON artifacts plus existing runtime/UI contract mismatches.
- [x] Run TypeScript compile check: `npx tsc --noEmit --pretty false` exited with code 0.
- [x] Run source guard for P3.97 tooling.
- [x] Run encoding guard for P3.97 tool/test/generated export files.
- [x] P3.97R Start release-blocker cleanup for broad `personal_plan` Jest by removing temp-artifact dependency from three route-chain suites.

## Update 2026-06-03 - P3.97R broad verification blocker cleanup

- [x] Reproduce broad `personal_plan` suite failure after P3.97.
- [x] Confirm root cause group: several route-chain tests read `.codex-tmp/personal-plans/*.json` as prerequisite fixtures, but `.codex-tmp` is ephemeral and Jest does not guarantee suite dependency order.
- [x] Convert `tests/personal_plan_gavan_week1_ui_route_source_inventory.test.ts` to use in-memory quiz adapter fixtures instead of requiring `gavan-week1-quiz-adapter-design.json`.
- [x] Convert `tests/personal_plan_gavan_week1_ui_route_adapter_design.test.ts` to use in-memory UI/catalog/quiz fixtures instead of requiring route-chain JSON artifacts.
- [x] Convert `tests/personal_plan_gavan_week1_aggregate_route_readiness_gate.test.ts` to use in-memory catalog/quiz/UI fixtures instead of requiring route-chain JSON artifacts.
- [x] Focused route-chain verification passed: 3 suites, 27 tests.
- [x] Run TypeScript compile check: `npx tsc --noEmit --pretty false` exited with code 0.
- [ ] Broad `personal_plan` Jest is still not green. Remaining failures include upstream route-chain tests that still read temp artifacts: future bridge guard report, blocker resolution roadmap, product copy signature request, catalog source inventory, catalog adapter design, and quiz source inventory.
- [ ] Continue P3.97R by making the remaining upstream route-chain tests self-contained or by adding a read-only test fixture builder that does not depend on `.codex-tmp`.
- [x] P3.98 Build a Gavan week 1 day 7 material candidate using the reviewed day 6 export shape.

## Update 2026-06-03 - P3.97R continuation

- [x] Add shared blocked route-chain fixtures for guard report, blocker roadmap, product copy approval, catalog preflight/source inventory/adapter, and approved product-copy artifacts.
- [x] Convert upstream route-chain suites away from `.codex-tmp` prerequisite JSON dependencies:
  - `personal_plan_gavan_week1_blocker_resolution_roadmap`
  - `personal_plan_gavan_week1_product_copy_approval_packet`
  - `personal_plan_gavan_week1_product_copy_signature_request_packet`
  - `personal_plan_gavan_week1_catalog_source_inventory`
  - `personal_plan_gavan_week1_catalog_adapter_design`
  - `personal_plan_gavan_week1_quiz_source_inventory`
- [x] Preserve non-live blocked semantics in fixtures: no source writes, no phase write targets, no inferred signatures, no live route registration.
- [x] Focused upstream route-chain tests passed: 4 suites, 31 tests.
- [x] Focused guard/approval route-chain tests passed: 2 suites, 15 tests.
- [x] Related route-chain tests passed: 9 suites, 73 tests.
- [x] Run TypeScript compile check: `npx tsc --noEmit --pretty false` exited with code 0.
- [x] Broad `personal_plan` no longer has route-chain ENOENT failures.
- [ ] Broad `personal_plan` Jest is still not green: 170 suites passed, 9 failed, 179 total; 1113 tests passed, 10 failed, 1123 total.
- [ ] Remaining failures are behavioral/runtime contract mismatches around task surface listen blocks, recall routing, explanation/reviewer copy, passport readiness, and task visuals.
- [ ] Next step: resolve the remaining behavioral contract mismatches with focused TDD before claiming broad verification readiness.
- [x] P3.98 Build a Gavan week 1 day 7 material candidate using the reviewed day 6 export shape.

## Update 2026-06-03 - P3.97S runtime contract verification cleanup

- [x] Re-analyze the remaining broad `personal_plan` failures after P3.97R.
- [x] Confirm failures are behavioral/runtime contract drift, not temp-artifact ENOENT.
- [x] Update task surface and renderer-param tests so `plan_listen_choose` is openable through the existing renderer contract.
- [x] Update recall contract tests to match standalone `/personal_plan_exercise` routing with `rendererType: 'plan_phrase_recall'`.
- [x] Update day exercise view-model tests so certified Gavan day 1 is passport-ready while generated scaffold days remain blocked.
- [x] Update task visual contract for the current Gavan day 1 missing-word task visual source.
- [x] Keep wrong-answer explanation guard intact while removing brittle case sensitivity.
- [x] Strengthen the short `Can you help me?` explanation so reviewer export snippets meet the useful-copy length gate.
- [x] Fix unrelated TypeScript blocker in `premium_guard.test.ts` mock typing.
- [x] Focused runtime/UI Personal Plans tests passed: 9 suites, 46 tests.
- [x] Focused premium guard tests passed: 1 suite, 16 tests.
- [x] Broad `personal_plan` Jest passed: 179 suites, 1124 tests.
- [x] Run TypeScript compile check: `npx tsc --noEmit --pretty false` exited with code 0.
- [x] P3.98 Build a Gavan week 1 day 7 material candidate using the reviewed day 6 export shape.

## Update 2026-06-03 - P3.98 Gavan week 1 day 7 material candidate

- [x] Add TDD contract for a non-live Gavan week 1 day 7 material candidate before implementation.
- [x] Build `tools/personal_plan_gavan_week1_day7_material_candidate.ts` from approved day 7 reviewer rows and the reviewed day 6 material export.
- [x] Preserve approval lineage: only approved day 7 content units/explanations are promoted into material phrases.
- [x] Add concrete non-live day 7 material blocks for lesson bridge, active recall, listening choice, natural choice, micro-dialogue, and day quiz intent.
- [x] Add day 7 listening-choice, natural-choice, and micro-dialogue item contracts with safe option counts and no generated audio claim.
- [x] Keep active recall free of hints/highlighting and keep mistakes returning later.
- [x] Keep the day 7 quiz as exactly 10 planned questions without final quiz writing or route registration.
- [x] Restrict day 7 material candidate writes to `.codex-tmp` and `docs/reports`.
- [x] Update the Gavan week 1 material product snapshot so all seven days now summarize as material candidates.
- [x] Focused day 7 material candidate tests passed: 1 suite, 12 tests.
- [x] Focused material product snapshot tests passed: 1 suite, 3 tests.
- [x] Related Gavan week 1 material-chain tests passed: 14 suites, 139 tests.
- [x] Run TypeScript compile check: `npx tsc --noEmit --pretty false` exited with code 0.
- [x] Broad `personal_plan` Jest passed: 180 suites, 1136 tests.
- [x] Final TypeScript compile check after broad verification: `npx tsc --noEmit --pretty false` exited with code 0.
- [x] Day 7 material export packet is built as a non-live reviewer quality packet.
- [ ] Audio approval remains blocked until real generated and approved audio assets exist.
- [ ] Pronunciation readiness remains blocked until real scoring exists.
- [x] P3.99 Build the Gavan week 1 day 7 material export packet and keep broad `personal_plan` + TypeScript verification green.

## Update 2026-06-03 - P3.99 Gavan week 1 day 7 material export packet

- [x] Add TDD contract for a non-live Gavan week 1 day 7 material export packet before implementation.
- [x] Build `tools/personal_plan_gavan_week1_day7_material_export_packet.ts` from the P3.98 day 7 material candidate, approved reviewer export, and reviewed day 6 material export.
- [x] Add reviewer summary for day 7 blocks, phrases, listening-choice items, natural-choice items, micro-dialogue items, approved source row counts, recall safety, and quiz intent.
- [x] Add quality gates for broadness, listening-choice option counts, listening audio honesty, natural-choice option counts, micro-dialogue option counts, explanation coverage, recall safety, quiz count, media honesty, and production-write safety.
- [x] Add compact human-readable preview for day 7 phrases, blocks, listening choices, natural choices, micro-dialogues, recall, and quiz intent.
- [x] Block export packet writes when candidate quality gates fail.
- [x] Restrict day 7 material export packet writes to `.codex-tmp` and `docs/reports`.
- [x] Fix unrelated TypeScript blocker in `app/premium_modal.tsx` by aligning Compass gradient token names with `constants/compassTheme.ts` and using a valid `compassShadow` level.
- [x] Focused day 7 material export packet tests passed: 1 suite, 8 tests.
- [x] Related Gavan week 1 material-chain tests passed: 15 suites, 147 tests.
- [x] Broad `personal_plan` Jest passed: 181 suites, 1144 tests.
- [x] Final TypeScript compile check: `npx tsc --noEmit --pretty false` exited with code 0.
- [ ] Gavan week 1 material candidates/export packets are now 7/7 inspectable and non-live, but not production-ready.
- [ ] Audio approval remains blocked until real generated and approved audio assets exist.
- [ ] Pronunciation readiness remains blocked until real scoring exists.
- [ ] Next best step: move back to higher-priority release/live readiness by selecting the next blocker among live catalog integration, final quiz registration, audio approval, pronunciation scoring, runtime/UI integration, and Maestro smoke.

## Update 2026-06-03 - P3.100 Live route preflight material evidence

- [x] Re-analyze the post-P3.99 production blockers after Gavan week 1 material export packets reached 7/7.
- [x] Confirm live catalog integration is still blocked by missing signed product-copy/route approval; no approval was inferred.
- [x] Add TDD coverage for material export packet evidence inside the existing Gavan week 1 live-route implementation preflight.
- [x] Extend `tools/personal_plan_gavan_week1_live_route_implementation_preflight.ts` with optional `materialExportPackets` input and `materialExportEvidence` output.
- [x] Record full material evidence when all seven day export packets are present and non-live.
- [x] Record partial evidence as not ready for route review when a day export packet is missing.
- [x] Keep `readyForLive: false`, `liveEditsAllowed: false`, catalog/quiz/UI route registration disabled, and `blockerStillOpen: missing_signature:product_copy`.
- [x] Update future source edit copy from six to seven dedicated day quiz ids.
- [x] Focused preflight evidence tests passed: 1 suite, 2 tests.
- [x] Focused existing + evidence preflight tests passed: 2 suites, 10 tests.
- [x] Related route-chain tests passed: 11 suites, 84 tests.
- [x] TypeScript compile check passed: `npx tsc --noEmit --pretty false` exited with code 0.
- [x] Broad `personal_plan` Jest passed: 182 suites, 1147 tests.
- [x] Final TypeScript compile check passed: `npx tsc --noEmit --pretty false` exited with code 0.
- [ ] Live catalog integration remains blocked until explicit signed approval exists.
- [ ] Final quiz registration remains blocked until live route approval and final quiz content are production-registered.
- [ ] Next best step: either create the signed-approval handoff package for human review, or build final quiz content/registration candidates while keeping them non-live until approval.

## Update 2026-06-04 - P3.101 Signed approval handoff packet

- [x] Re-analyze the post-P3.100 live-route blocker state.
- [x] Confirm the highest-priority live catalog blocker is still missing explicit signed product-copy/route approval.
- [x] Add TDD coverage for a signed-approval handoff packet before implementation.
- [x] Build `tools/personal_plan_gavan_week1_signed_approval_handoff_packet.ts`.
- [x] Package the unsigned route approval guard, live-route implementation preflight, and 7/7 material export evidence for human review.
- [x] Keep `approvalStillMissing: true`, `signatureStatus: missing`, `approvalMayBeInferred: false`, and `signedApprovalAcceptedInThisPass: false`.
- [x] Keep `readyForLive: false`, `liveEditsAllowed: false`, and catalog/quiz/UI route registration disabled.
- [x] Add reviewer checklist items for full route bundle scope, material evidence, regression scope, no live edits before signature, and audio/pronunciation blockers.
- [x] Require a separate signed approval artifact instead of treating the handoff as approval.
- [x] Reject incomplete material route evidence.
- [x] Reject approved or live-ready guard/preflight inputs instead of opening routes.
- [x] Restrict handoff writes to `.codex-tmp` and `docs/reports`.
- [x] Focused handoff tests passed: 1 suite, 7 tests.
- [x] Related route-chain tests passed: 9 suites, 66 tests.
- [ ] Live catalog integration remains blocked until explicit signed approval exists.
- [ ] Final quiz registration remains blocked until live route approval and final quiz content are production-registered.
- [ ] Audio approval remains blocked until real generated and approved assets exist.
- [ ] Pronunciation readiness remains blocked until real scoring exists.
- [ ] Next best step: build final quiz content/registration candidates as non-live route evidence while production route edits remain blocked by the missing signature.

## Update 2026-06-04 - P3.102 Final quiz candidate packet

- [x] Re-analyze the post-P3.101 blocker state and select final quiz candidates as the next highest-priority non-live evidence step.
- [x] Confirm live quiz registration remains blocked by missing signed approval.
- [x] Add TDD coverage for a Gavan week 1 final quiz candidate packet before implementation.
- [x] Build `tools/personal_plan_gavan_week1_final_quiz_candidate_packet.ts`.
- [x] Generate seven final quiz candidates from material export packet inputs.
- [x] Require exactly 10 candidate questions per day, for 70 total candidate questions.
- [x] Require material phrase coverage for every candidate quiz.
- [x] Require choice and typing input modes plus RU/UK/ES task-copy readiness.
- [x] Keep all candidates non-live: `routeRegistered: false`, `playable: false`, and `quizSourceEdited: false`.
- [x] Keep `readyForLive: false`, `liveEditsAllowed: false`, `quizRouteRegistrationAllowed: false`, `routeRegistrationAllowed: false`, and blocker `missing_signature:product_copy`.
- [x] Reject partial material export inputs.
- [x] Reject approved/live-ready handoff inputs instead of opening quiz routes.
- [x] Restrict final quiz candidate packet writes to `.codex-tmp` and `docs/reports`.
- [x] Focused final quiz candidate tests passed: 1 suite, 7 tests.
- [x] Related quiz/route/handoff tests passed after producer artifact refresh: 8 suites, 62 tests.
- [ ] Live quiz registration remains blocked until explicit signed approval and a separate source-registration task exist.
- [ ] Audio approval remains blocked until real generated and approved assets exist.
- [ ] Pronunciation readiness remains blocked until real scoring exists.
- [ ] Next best step: extend route preflight/handoff evidence to include the final quiz candidate packet, or move to audio approval evidence if signed approval is still absent.

## Update 2026-06-04 - P3.103 Final quiz evidence in route preflight and handoff

- [x] Re-analyze P3.102 and confirm the handoff still lacked final quiz candidate evidence.
- [x] Add TDD coverage for final quiz candidate evidence inside the live-route implementation preflight.
- [x] Extend `tools/personal_plan_gavan_week1_live_route_implementation_preflight.ts` with optional `finalQuizCandidatePacket` input.
- [x] Add `finalQuizCandidateEvidence` with expected count, provided count, total questions, ten-question count, registration count, playable count, coverage count, and route-review readiness.
- [x] Keep final quiz evidence non-live: registered/playable counts must stay zero.
- [x] Extend `tools/personal_plan_gavan_week1_signed_approval_handoff_packet.ts` with `finalQuizCandidateEvidence`.
- [x] Add `.codex-tmp/personal-plans/gavan-week1-final-quiz-candidate-packet.json` to handoff required evidence paths.
- [x] Add reviewer checklist item `review_final_quiz_candidate_evidence`.
- [x] Block handoff readiness when final quiz candidate evidence is incomplete.
- [x] Preserve `readyForLive: false`, `liveEditsAllowed: false`, and all route registration flags false.
- [x] Focused preflight + handoff tests passed: 2 suites, 10 tests.
- [x] Related route/quiz/handoff tests passed: 7 suites, 42 tests.
- [ ] Live quiz registration remains blocked until explicit signed approval and a separate source-registration task exist.
- [ ] Audio approval remains blocked until real generated and approved assets exist.
- [ ] Pronunciation readiness remains blocked until real scoring exists.
- [ ] Next best step: move to the next release blocker, likely audio approval evidence, while keeping approval/signature gates strict.

## Update 2026-06-04 - P3.104 Audio approval evidence packet

- [x] Re-analyze the post-P3.103 state and confirm audio approval is still a higher-priority release blocker.
- [x] Add `tests/personal_plan_gavan_week1_audio_approval_evidence_packet.test.ts`.
- [x] Verify the red phase: the focused test failed because `tools/personal_plan_gavan_week1_audio_approval_evidence_packet` did not exist.
- [x] Implement `tools/personal_plan_gavan_week1_audio_approval_evidence_packet.ts`.
- [x] Build a non-live evidence packet from the existing Gavan week 1 audio generation plan plus generated-asset validation.
- [x] Confirm the packet reports 10 expected generation jobs, 0 generated assets, 10 missing generated-file blockers, 0 approved audio assets, and 0 production-ready audio assets.
- [x] Confirm `readyForLive`, `audioProductionReady`, `audioApprovalReady`, `audioAssetRegistrationAllowed`, and `pronunciationReadinessMayBeInferred` stay `false`.
- [x] Add guards against mismatched generated-asset summaries and fake final audio claims.
- [x] Restrict packet writes to `.codex-tmp` and `docs/reports`.
- [x] Generate `.codex-tmp/personal-plans/gavan-week1-audio-approval-evidence-packet.json`.
- [x] Run focused Jest for the new packet.
- [x] Run related audio Jest suites.
- [x] Run `npx tsc --noEmit --pretty false`.
- [ ] Audio approval remains blocked until the 10 expected MP3 assets are generated/provided and explicitly approved.
- [ ] Pronunciation readiness remains blocked until real scoring/recording readiness exists.
- [ ] Next best step: produce or validate real generated audio assets, then run explicit reviewer approval without inferring production readiness.

## Update 2026-06-04 - P3.105 Audio generation handoff packet

- [x] Treat the next Personal Plans sessions as large coherent passes, not microtasks.
- [x] Add `tests/personal_plan_gavan_week1_audio_generation_handoff_packet.test.ts`.
- [x] Verify the red phase: the focused test failed because `tools/personal_plan_gavan_week1_audio_generation_handoff_packet` did not exist.
- [x] Implement `tools/personal_plan_gavan_week1_audio_generation_handoff_packet.ts`.
- [x] Build a non-live generation handoff packet with exact inputs for the 10 expected Gavan week 1 MP3 files.
- [x] Include job id, block id, content unit id, target text, source block text, provider, voice id, expected asset id, output path, file type, split policy, and required post-generation metadata for every request.
- [x] Include approval guardrails: generated files are not approved, approval cannot be inferred, asset registration remains blocked, and pronunciation readiness remains blocked.
- [x] Reject incomplete generation plans instead of handing off vague audio work.
- [x] Restrict packet writes to `.codex-tmp` and `docs/reports`.
- [x] Verify the writer can generate deterministic `.codex-tmp/personal-plans/gavan-week1-audio-generation-handoff-packet.json` output; current temp cleanup may remove the ignored artifact between commands.
- [x] Run focused Jest for the new packet.
- [ ] Audio approval remains blocked until the 10 listed MP3 files exist and pass generated-asset validation.
- [ ] Approved/final audio remains blocked until explicit approval records exist for every generated asset.
- [ ] Pronunciation readiness remains blocked until real scoring/recording readiness exists.
- [ ] Next best big pass: generate/provide the 10 MP3 assets if explicitly allowed or available; otherwise build the generated-file intake/validation report that maps actual files to the P3.105 handoff.

## Update 2026-06-04 - P3.106 Generated audio intake/validation report

- [x] Confirm current P3.105 output paths have no real MP3 files in `assets/audio/personal-plans`.
- [x] Select the non-live intake/validation route because audio generation was not explicitly allowed and real MP3 assets are absent.
- [x] Add `tests/personal_plan_gavan_week1_generated_audio_intake_report.test.ts`.
- [x] Verify the red phase: the focused test failed because `tools/personal_plan_gavan_week1_generated_audio_intake_report` did not exist.
- [x] Implement `tools/personal_plan_gavan_week1_generated_audio_intake_report.ts`.
- [x] Map every P3.105 expected `outputPath` to an intake row with `missing_generated_file`, `invalid_generated_file`, or `valid_generated_file`.
- [x] Reuse generated-asset validation evidence through `buildGeneratedPlanAudioAssets`.
- [x] Keep valid generated files separate from approved/final audio: `approvalStatus: not_approved`, `audioApprovalReady: false`, `audioAssetRegistrationAllowed: false`, and `productionReadyAudioCount: 0`.
- [x] Reject fake approved/final-ready file claims in the intake map.
- [x] Restrict intake report writes to `.codex-tmp` and `docs/reports`.
- [x] Run focused Jest for the new intake report.
- [x] Related audio Jest passed: 10 suites, 39 tests.
- [ ] Broad Personal Plans Jest is still blocked by missing route/signature `.codex-tmp` prerequisite artifacts: 184 suites passed, 5 failed, 1155 tests passed, 33 failed.
- [ ] TypeScript is currently blocked outside this audio pass by missing `themeMode` props in `app/lesson_complete.tsx`.
- [ ] Audio approval remains blocked until every expected MP3 validates and explicit approval records are created.
- [ ] Live audio registry/source edits remain blocked until a separate approved registration pass.
- [ ] Pronunciation readiness remains blocked until real scoring/recording evidence exists.
- [ ] Next best big pass: if MP3 files become available, feed them through P3.106 intake and then build explicit approval records; otherwise restore the missing route/signature `.codex-tmp` prerequisites before attempting the broad Personal Plans gate.

## Update 2026-06-04 - P3.107 Route prerequisite artifact refresh

- [x] Select route/signature prerequisite restoration as the next large pass because P3.106 left broad Personal Plans blocked by missing `.codex-tmp` artifacts.
- [x] Add `tests/personal_plan_gavan_week1_route_prerequisite_artifact_refresh.test.ts`.
- [x] Verify the red phase: the focused test failed because `tools/personal_plan_gavan_week1_route_prerequisite_artifact_refresh` did not exist.
- [x] Implement `tools/personal_plan_gavan_week1_route_prerequisite_artifact_refresh.ts`.
- [x] Refresh the full non-live route prerequisite bundle under `.codex-tmp/personal-plans`, including approval readiness, bridge diff preflight, future bridge contract/guard, product-copy signature request, catalog route preflight, catalog/quiz/UI inventories and designs, aggregate route readiness, route signature request, and route approval guard.
- [x] Keep every refreshed artifact non-live: `readyForLive: false`, `liveEditsAllowed: false`, no source writes, no inferred route approval, and no inferred audio approval.
- [x] Preserve historical broad-gate expectations for approved reviewer export paths and `totalApprovedRows: 98`.
- [x] Previously failing route/signature tests now pass: 5 suites, 38 tests.
- [x] Broad Personal Plans Jest passed: 190 suites, 1192 tests.
- [x] TypeScript passed: `npx tsc --noEmit --pretty false`.
- [ ] Refreshed `.codex-tmp` artifacts are verification prerequisites only; they are not production approval and do not unlock live registration.
- [ ] Audio approval remains blocked until every expected MP3 validates and explicit approval records are created.
- [ ] Next best big pass: either validate/provide the 10 MP3 files and create explicit approval records, or move to a signed-approval intake artifact if a real human approval is available.

## Update 2026-06-04 - P3.108 Pronunciation scoring provider contract

- [x] Select pronunciation scoring provider intake as the next large non-live pass because audio MP3 assets are still absent and generation was not explicitly authorized.
- [x] Confirm the existing pronunciation reference adapter and scoring readiness packet pass focused Jest and still block release without real scoring evidence.
- [x] Add `tests/personal_plan_gavan_week1_pronunciation_scoring_provider_contract.test.ts`.
- [x] Verify the red phase: the focused test failed because `tools/personal_plan_gavan_week1_pronunciation_scoring_provider_contract` did not exist.
- [x] Implement `tools/personal_plan_gavan_week1_pronunciation_scoring_provider_contract.ts`.
- [x] Generate `.codex-tmp/personal-plans/gavan-week1-pronunciation-scoring-provider-contract.json`.
- [x] Map all 4 canonical pronunciation references to `missing_scorer_contract` when no real provider metadata exists.
- [x] Allow complete provider metadata to become `ready_for_scored_attempt_validation` only, while keeping `readyForLive: false`, `pronunciationProductionReady: false`, and `scoringAdapterReady: false`.
- [x] Reject fake provider claims for `productionReady`, `finalScoringReady`, and `liveEditsAllowed`.
- [x] Restrict contract writes to `.codex-tmp` and `docs/reports`.
- [x] Run focused Jest for the new provider contract.
- [ ] Pronunciation production readiness remains blocked until scored attempts with real recording/confidence/score evidence exist and explicit approval records are created.
- [ ] Live scoring adapter, progress penalties, source writes, UI/runtime changes, and storage/navigation changes remain blocked.
- [ ] Audio approval remains blocked until every expected MP3 validates and explicit approval records are created.
- [ ] Next best big pass: build a scored-attempt evidence intake artifact if real recorded attempts/scorer outputs are available; otherwise continue with explicit approval intake/reporting without fake readiness.

## Update 2026-06-04 - P3.109 Browser progress report

- [x] Add a browser-visible progress reporting layer because future prompts should show overall Personal Plans progress, not only terminal summaries.
- [x] Confirm real MP3 assets are still absent from `assets/audio/personal-plans`; audio generation remains unauthorized in this pass.
- [x] Add `tests/personal_plan_progress_browser_report.test.ts`.
- [x] Verify the red phase: the focused test failed because `tools/personal_plan_progress_browser_report` did not exist.
- [x] Implement `tools/personal_plan_progress_browser_report.ts`.
- [x] Generate `docs/reports/personal-plans-progress-browser-report.html`.
- [x] Show current overall progress and layer scores in the browser report: overall 77%, content/reviewer packets 95%, audio approval 58%, pronunciation scoring 62%, verification 99%, live route/UI 59%.
- [x] Keep the report honest: `productionReady: false`, visible "Not production-ready yet" badge, and fake 100% progress claims rejected while blockers remain.
- [x] Include completed pass history from P3.105 through P3.109.
- [x] Include open blockers for missing MP3 assets, missing explicit audio approvals, missing real pronunciation scoring evidence, and missing signed live route approval.
- [x] Restrict report writes to `.codex-tmp` and `docs/reports`.
- [x] Run focused Jest for the browser progress report.
- [ ] Browser report is visibility/reporting only; it is not approval, not generated audio, not live route readiness, and not production readiness.
- [ ] Next prompt should refresh/open `docs/reports/personal-plans-progress-browser-report.html` again after each coherent pass.
- [ ] Next best big pass remains: validate/provide the 10 real MP3 assets if available or explicitly generated; otherwise build the next explicit approval/scored-attempt evidence intake layer without fake readiness.

## Update 2026-06-04 - P3.110 Audio explicit approval intake report

- [x] Confirm real MP3 assets are still absent from `assets/audio/personal-plans`; generation remains unauthorized.
- [x] Select explicit audio approval intake as the next large non-live pass because P3.106 created generated-file intake but there was no Gavan week 1 artifact mapping future approval records back to the 10 expected MP3 rows.
- [x] Add `tests/personal_plan_gavan_week1_audio_explicit_approval_intake_report.test.ts`.
- [x] Verify the red phase: the focused test failed because `tools/personal_plan_gavan_week1_audio_explicit_approval_intake_report` did not exist.
- [x] Implement `tools/personal_plan_gavan_week1_audio_explicit_approval_intake_report.ts`.
- [x] Generate `.codex-tmp/personal-plans/gavan-week1-audio-explicit-approval-intake-report.json`.
- [x] Map the current missing-MP3 state to `blocked_missing_generated_audio`: 10 expected MP3 files, 10 missing generated files, 0 approval records, 0 production-ready audio files.
- [x] Reuse `validatePlanAudioApprovalGate` for future valid generated assets and explicit approval records.
- [x] Keep complete future approval records as `ready_for_final_audio_approval_gate_review` only; do not promote final audio, do not register assets, and do not infer pronunciation readiness.
- [x] Reject unknown approval records instead of inferring readiness.
- [x] Restrict report writes to `.codex-tmp` and `docs/reports`.
- [x] Run focused Jest for the explicit approval intake report.
- [ ] Audio approval remains blocked until every expected MP3 validates and every generated asset has an explicit approval record.
- [ ] Final audio/live registration remains blocked until a separate guarded final approval/registration pass.
- [ ] Pronunciation readiness remains blocked until real recorded attempts and scorer evidence exist.
- [ ] Next best big pass: if real MP3 files become available or generation is explicitly authorized, run P3.106 + P3.110 with the files and approval records; otherwise build the scored-attempt evidence intake layer or signed route approval intake without fake readiness.

## Update 2026-06-04 - P3.111 Pronunciation scored-attempt evidence intake report

- [x] Confirm real MP3 assets are still absent from `assets/audio/personal-plans`; generation remains unauthorized.
- [x] Select pronunciation scored-attempt evidence intake as the next large non-live pass because P3.108 created the provider contract but there was no artifact mapping real recorded/scored attempts back to the 4 pronunciation references.
- [x] Add `tests/personal_plan_gavan_week1_pronunciation_scored_attempt_evidence_intake_report.test.ts`.
- [x] Verify the red phase: the focused test failed because `tools/personal_plan_gavan_week1_pronunciation_scored_attempt_evidence_intake_report` did not exist.
- [x] Implement `tools/personal_plan_gavan_week1_pronunciation_scored_attempt_evidence_intake_report.ts`.
- [x] Generate `.codex-tmp/personal-plans/gavan-week1-pronunciation-scored-attempt-evidence-intake-report.json` through the focused test setup.
- [x] Map the current missing-scorer-contract state to `blocked_missing_scorer_contract`: 4 pronunciation references, 0 provided attempts, 0 valid scored attempts, 4 missing scorer-contract rows, 0 production-ready references.
- [x] Validate future scored attempts with `validatePlanPronunciationAttempt`.
- [x] Keep complete future scored attempts as `ready_for_pronunciation_approval_review` only; do not mark pronunciation production-ready, do not enable live scoring, and do not allow progress penalties.
- [x] Reject invalid scored attempts, including low-confidence progress-penalty attempts.
- [x] Restrict report writes to `.codex-tmp` and `docs/reports`.
- [x] Run focused Jest for the scored-attempt evidence intake report.
- [ ] Pronunciation readiness remains blocked until a real scorer contract, real recorded/scored attempts for all 4 references, and explicit pronunciation approval records exist.
- [ ] Live scoring adapter, source writes, progress penalties, UI/runtime changes, and storage/navigation changes remain blocked.
- [ ] Audio approval remains blocked until every expected MP3 validates and explicit approval records are created.
- [ ] Next best big pass: if real MP3/scored-attempt evidence is still unavailable, build a signed route approval intake/final registration preflight layer without fake readiness.

## Update 2026-06-04 - P3.112 Gavan day 1 visible live modes

- [x] Pivot from non-live approval paperwork to the visible Personal Plans surface after the Gavan day 1 screen showed only the first 3 tasks.
- [x] Add TDD coverage first in `tests/personal_plan_live_vertical_slice.test.ts`, `tests/personal_plan_day_quality_gate.test.ts`, and `tests/personal_plan_engine_contracts.test.ts`; red phase failed because day 1 only exposed `linked_lesson_slice`, `plan_phrase_lesson`, `plan_missing_word`, and `plan_quiz`.
- [x] Expand Gavan day 1 from 4 to 8 visible tasks: linked lesson, phrase lesson, missing word, choose natural phrase, listen choose, listen build, pronunciation repeat, and quiz.
- [x] Expand `tasksForMinutes` load slots so default 15 minutes now shows 7 tasks and 20 minutes shows all 8 tasks.
- [x] Keep pronunciation repeat as `completion_only`, not scored correctness, so pronunciation readiness is not falsely claimed.
- [x] Update runtime state tests so day completion and carryover use `tasksForMinutes(...)` instead of old hardcoded `slice(0, 3/4)` assumptions.
- [x] Add mode-specific visual sources/icons/asset keys for the new cards so they do not collapse into the old generic route/practice visuals.
- [x] Run focused route/renderer/open-action suites for missing word, choose natural phrase, listen choose, listen build, and pronunciation repeat.
- [x] Run TypeScript gate: `npx tsc --noEmit --pretty false`.
- [ ] Broad Personal Plans Jest remains blocked in isolated runs by `.codex-tmp` prerequisite artifact lifecycle/order for older route/signature/bridge report suites. This was reported honestly instead of fake-green readiness.
- [ ] Audio approval remains blocked: 10 expected MP3 assets are still not validated and no explicit approval records exist.
- [ ] Pronunciation production readiness remains blocked: no real scorer contract plus real recorded/scored attempts plus explicit pronunciation approval records.

## Update 2026-06-04 - P3.113 Route prerequisite bootstrap and broad gate recovery

- [x] Confirm real MP3 assets are still unavailable: `assets/audio/personal-plans` does not exist, so no generated or approved audio was registered.
- [x] Select the route/signature/bridge prerequisite bootstrap as the next large pass because P3.112 left broad Personal Plans Jest blocked by missing `.codex-tmp` artifacts in isolated route-chain suites.
- [x] Add TDD coverage in `tests/personal_plan_gavan_week1_route_prerequisite_artifact_refresh.test.ts`.
- [x] Verify the red phase: the focused test failed because `ensureGavanWeek1RoutePrerequisiteArtifacts` was not exported.
- [x] Implement `ensureGavanWeek1RoutePrerequisiteArtifacts` in `tools/personal_plan_gavan_week1_route_prerequisite_artifact_refresh.ts`.
- [x] The ensure API checks all route prerequisite artifact basenames and materializes the full non-live bundle under `.codex-tmp/personal-plans` only when artifacts are missing.
- [x] Wire the ensure API into isolated route-chain consumer suites: catalog route preflight, route approval guard, live route implementation preflight, future bridge approval contract, and future bridge guard report.
- [x] Run focused prerequisite-chain Jest: 6 suites, 43 tests passed.
- [x] Run broad Personal Plans Jest: 194 suites, 1222 tests passed.
- [x] Run TypeScript gate: `npx tsc --noEmit --pretty false`.
- [ ] Refreshed/bootstrapped `.codex-tmp` artifacts are still non-live verification prerequisites only. They are not signed approval, not live route registration, not audio approval, and not production readiness.
- [ ] Audio approval remains blocked until all 10 expected MP3 files validate and every generated asset has an explicit approval record.
- [ ] Pronunciation production readiness remains blocked until real scorer contract, real recorded/scored attempts, and explicit pronunciation approval records exist.

## Update 2026-06-04 - P3.114 Audio evidence chain bootstrap

- [x] Confirm real MP3 assets are still unavailable: `assets/audio/personal-plans` does not exist, so no generation output was promoted or approved.
- [x] Select the next non-live audio evidence layer because P3.106/P3.110 already exist but the handoff -> generated-file intake -> explicit approval intake chain needed one reproducible bootstrap/report entrypoint.
- [x] Add TDD coverage in `tests/personal_plan_gavan_week1_audio_evidence_chain_bootstrap.test.ts`.
- [x] Verify the red phase: the focused test failed because `tools/personal_plan_gavan_week1_audio_evidence_chain_bootstrap` did not exist.
- [x] Implement `tools/personal_plan_gavan_week1_audio_evidence_chain_bootstrap.ts`.
- [x] The bootstrap builds the P3.105 handoff packet, scans exact `outputPath` targets, builds the generated-audio intake report, builds the explicit approval intake report, and writes a single non-live chain report.
- [x] Current chain status is honestly blocked: 10 expected MP3 files, 0 discovered files, 10 missing generated-file blockers, 0 explicit approval records, and 0 production-ready audio assets.
- [x] Restrict all writes to `.codex-tmp` or `docs/reports`; reject root config, source asset, and live audio target paths.
- [x] Keep `readyForLive`, `generatedAudioApproved`, `audioProductionReady`, `audioAssetRegistrationAllowed`, `liveEditsAllowed`, and `sourceWritesUsed` false.
- [x] Run focused bootstrap Jest: 1 suite, 4 tests passed.
- [x] Run related audio chain Jest: 8 suites, 37 tests passed.
- [x] Repair isolated quiz-adapter prerequisite drift without live edits: the suite now restores the missing `.codex-tmp` route bundle before reading quiz inventory, and the adapter tolerates the older non-live inventory shape.
- [x] Run isolated quiz adapter Jest: 1 suite, 8 tests passed.
- [x] Run broad Personal Plans Jest: 195 suites, 1226 tests passed.
- [x] Run TypeScript gate: `npx tsc --noEmit --pretty false`.
- [x] Refresh `docs/reports/personal-plans-progress-browser-report.html` with P3.114 progress: overall 84%, verification 100%, content/reviewer packets 95%, audio approval 62%, pronunciation scoring 65%, live route/UI 74%.
- [ ] Generated audio remains unapproved audio. Live audio asset registration remains blocked until real MP3 validation plus explicit approval records pass in a separate guarded step.
- [ ] Pronunciation production readiness remains blocked until real scoring/recording evidence and explicit approval records exist.

## Update 2026-06-04 - P3.115 Final audio registration preflight

- [x] Confirm real MP3 assets are still unavailable: `assets/audio/personal-plans` does not exist, so no audio generation output was promoted or registered.
- [x] Select the final audio registration preflight as the next large non-live audio layer because P3.114 already bootstraps handoff -> generated-file intake -> explicit approval intake, but runtime registry registration still needed an explicit blocker report.
- [x] Add TDD coverage in `tests/personal_plan_gavan_week1_final_audio_registration_preflight.test.ts`.
- [x] Verify the red phase: the focused test failed because `tools/personal_plan_gavan_week1_final_audio_registration_preflight` did not exist.
- [x] Implement `tools/personal_plan_gavan_week1_final_audio_registration_preflight.ts`.
- [x] The preflight consumes the P3.114 audio evidence chain and maps every expected asset to registration status.
- [x] Current registration preflight status is honestly blocked: 10 expected MP3 files, 0 discovered files, 10 missing generated-file blockers, 0 explicit approval records, 0 approved/final audio assets, and 0 registry-ready assets.
- [x] Restrict writes to `.codex-tmp` or `docs/reports`; reject runtime registry source targets, audio asset targets, and root config targets.
- [x] Keep `readyForLive`, `audioProductionReady`, `audioAssetRegistrationAllowed`, `liveEditsAllowed`, `registryWritesUsed`, `sourceWritesUsed`, and `audioFilesWritten` false.
- [x] Run focused final audio registration preflight Jest: 1 suite, 4 tests passed.
- [x] Run related audio/live-listening chain Jest: 11 suites, 55 tests passed.
- [x] Write canonical `.codex-tmp/personal-plans/gavan-week1-final-audio-registration-preflight.json`.
- [x] Run broad Personal Plans Jest: 196 suites, 1230 tests passed.
- [x] Run TypeScript gate: `npx tsc --noEmit --pretty false`.
- [x] Refresh `docs/reports/personal-plans-progress-browser-report.html` with P3.115 progress: overall 86%, verification 100%, content/reviewer packets 95%, audio approval/registration 66%, pronunciation scoring 65%, live route/UI 74%.
- [ ] This is a preflight only. It does not register live audio assets, does not approve audio, and does not promote generated audio to final.
- [ ] Live audio asset registration remains blocked until real MP3 validation, explicit approval records, final audio promotion, and a separate guarded registry pass.
- [ ] Pronunciation production readiness remains blocked until real scoring/recording evidence and explicit approval records exist.

## Update 2026-06-04 - P3.116 Audio approval-record packet

- [x] Confirm real MP3 assets are still unavailable: `assets/audio/personal-plans` does not exist, so no generated-file checksum can be treated as ready.
- [x] Select the approval-record packet as the next non-live audio layer because P3.115 blocks registry writes, while human reviewers still need a deterministic packet showing why approval records cannot yet be created.
- [x] Add TDD coverage in `tests/personal_plan_gavan_week1_audio_approval_record_packet.test.ts`.
- [x] Verify the red phase: the focused test failed because `tools/personal_plan_gavan_week1_audio_approval_record_packet` did not exist.
- [x] Implement `tools/personal_plan_gavan_week1_audio_approval_record_packet.ts`.
- [x] The packet consumes the P3.115 final audio registration preflight and maps every expected asset to approval-record template status and checksum status.
- [x] Current packet status is honestly blocked: 10 expected MP3 files, 0 eligible approval-record rows, 10 blocked-before-approval rows, 0 checksum-ready rows, 0 approval records, and 0 production-ready audio assets.
- [x] Restrict writes to `.codex-tmp` or `docs/reports`; reject approval runtime source targets, audio asset targets, and root config targets.
- [x] Keep `approvalRecordsCreated`, `approvalMayBeInferred`, `audioAssetRegistrationAllowed`, `registryWritesUsed`, `sourceWritesUsed`, `liveEditsAllowed`, and `audioFilesWritten` false.
- [x] Run focused audio approval-record packet Jest: 1 suite, 4 tests passed.
- [x] Run related audio approval/registration chain Jest: 12 suites, 59 tests passed.
- [x] Write canonical `.codex-tmp/personal-plans/gavan-week1-audio-approval-record-packet.json`.
- [x] Run broad Personal Plans Jest: 197 suites, 1234 tests passed.
- [x] Run TypeScript gate: `npx tsc --noEmit --pretty false`.
- [x] Refresh `docs/reports/personal-plans-progress-browser-report.html` with P3.116 progress: overall 87%, verification 100%, content/reviewer packets 95%, audio approval/registration 68%, pronunciation scoring 65%, live route/UI 74%.
- [ ] This packet is not an approval record and cannot supply `audioChecksum` until a real generated file validates.
- [ ] Generated audio remains unapproved audio; live registry remains blocked until explicit records and final promotion pass.

## Update 2026-06-04 - P3.117 Audio production readiness gate

- [x] Confirm real MP3 assets are still unavailable: `assets/audio/personal-plans` does not exist, and generation was not explicitly authorized in this pass.
- [x] Select an audio production readiness gate as the next coherent non-live layer because P3.116 prepares reviewer packet structure, while the release still needs one deterministic go/hold decision before any live audio registration can be considered.
- [x] Add TDD coverage in `tests/personal_plan_gavan_week1_audio_production_readiness_gate.test.ts`.
- [x] Verify the red phase: the focused test failed because `tools/personal_plan_gavan_week1_audio_production_readiness_gate` did not exist.
- [x] Implement `tools/personal_plan_gavan_week1_audio_production_readiness_gate.ts`.
- [x] The gate consumes the P3.116 approval-record packet and aggregates the generated-file, checksum, explicit approval, final promotion, and live registry blockers.
- [x] Current gate status is honestly blocked: `hold_missing_generated_audio`, release decision `hold`, 10 expected MP3 files, 0 discovered files, 10 missing files, 0 checksum-ready rows, 0 approval records, 0 final audio assets, 0 registry-ready assets, and 5 blockers.
- [x] Restrict writes to `.codex-tmp` or `docs/reports`; reject runtime registry source targets, audio asset targets, and root config targets.
- [x] Keep `productionReady`, `readyForLive`, `audioProductionReady`, `audioApprovalReady`, `audioAssetRegistrationAllowed`, `liveEditsAllowed`, `sourceWritesUsed`, `registryWritesUsed`, `audioFilesWritten`, `approvalRecordsCreated`, and pronunciation inference false.
- [x] Run focused audio production readiness gate Jest: 1 suite, 4 tests passed.
- [x] Run related audio production chain Jest: 13 suites, 63 tests passed.
- [x] Write canonical `.codex-tmp/personal-plans/gavan-week1-audio-production-readiness-gate.json`.
- [x] Run broad Personal Plans Jest: 198 suites, 1238 tests passed.
- [x] Run TypeScript gate: `npx tsc --noEmit --pretty false`.
- [ ] This gate is a release hold artifact only; it does not create MP3 files, checksums, approval records, final promoted audio, live registry entries, route approval, or pronunciation readiness.

## Update 2026-06-04 - P3.118 Pronunciation production readiness gate

- [x] Confirm real MP3 assets are still unavailable: `assets/audio/personal-plans` does not exist, and generation was not explicitly authorized in this pass.
- [x] Select a pronunciation production readiness gate as the next coherent non-live layer because audio is blocked by missing MP3 evidence, while pronunciation still lacked one release-level hold decision over scorer/recording/approval/final/live-adapter blockers.
- [x] Add TDD coverage in `tests/personal_plan_gavan_week1_pronunciation_production_readiness_gate.test.ts`.
- [x] Verify the red phase: the focused test failed because `tools/personal_plan_gavan_week1_pronunciation_production_readiness_gate` did not exist.
- [x] Implement `tools/personal_plan_gavan_week1_pronunciation_production_readiness_gate.ts`.
- [x] The gate consumes the P3.111 scored-attempt evidence intake report and aggregates scorer provider, real scored attempt, explicit approval, final scorer promotion, live adapter, and progress-penalty blockers.
- [x] Current gate status is honestly blocked: `hold_missing_scorer_provider`, release decision `hold`, 4 pronunciation references, 0 scorer-contract-ready rows, 0 valid scored attempts, 4 missing scorer-contract rows, 0 explicit approval records, 0 final scorer rows, 0 live adapter rows, and 6 blockers.
- [x] Restrict writes to `.codex-tmp` or `docs/reports`; reject runtime pronunciation source targets, audio asset targets, and root config targets.
- [x] Keep `productionReady`, `readyForLive`, `pronunciationProductionReady`, `explicitApprovalReady`, `finalScorerReady`, `liveScoringAdapterAllowed`, `progressPenaltyAllowed`, `approvalRecordsCreated`, `sourceWritesUsed`, `liveEditsAllowed`, `recordingFilesWritten`, `scoringFilesWritten`, and audio-readiness inference false.
- [x] Run focused pronunciation production readiness gate Jest: 1 suite, 5 tests passed.
- [x] Run related pronunciation chain Jest: 8 suites, 44 tests passed.
- [x] Write canonical `.codex-tmp/personal-plans/gavan-week1-pronunciation-production-readiness-gate.json`.
- [x] Run broad Personal Plans Jest: 199 suites, 1243 tests passed.
- [x] Run TypeScript gate: `npx tsc --noEmit --pretty false`.
- [ ] This gate is a release hold artifact only; it does not attach a scorer provider, create recordings, score attempts, create approval records, promote a final scorer, enable live scoring adapters, enable progress penalties, infer audio readiness, or mark pronunciation production-ready.

## Update 2026-06-04 - P3.119 Final audio approval workflow audit

- [x] Confirm real MP3 assets are still unavailable: `assets/audio/personal-plans` does not exist, and generation was not explicitly authorized in this pass.
- [x] Select a final audio approval workflow audit as the next coherent non-live layer because P3.117 blocks release, while reviewers still need a deterministic stage-by-stage workflow showing exactly why signoff cannot begin.
- [x] Add TDD coverage in `tests/personal_plan_gavan_week1_final_audio_approval_workflow_audit.test.ts`.
- [x] Verify the red phase: the focused test failed because `tools/personal_plan_gavan_week1_final_audio_approval_workflow_audit` did not exist.
- [x] Implement `tools/personal_plan_gavan_week1_final_audio_approval_workflow_audit.ts`.
- [x] The audit consumes the P3.116 approval-record packet and P3.117 audio production readiness gate and maps every expected MP3 row through generated-file validation, checksum evidence, reviewer signoff, final promotion, and live registry stages.
- [x] Current audit status is honestly blocked: `blocked_before_generated_file_validation`, release decision `hold`, 10 expected MP3 files, 0 generated-file-validated rows, 0 checksum-ready rows, 0 reviewer-signoff-ready rows, 0 explicit approval records, 0 final-promotion-ready rows, 0 registry-ready rows, 10 blocked workflow rows, and 5 blockers.
- [x] Restrict writes to `.codex-tmp` or `docs/reports`; reject live approval source targets, registry source targets, audio asset targets, and root config targets.
- [x] Keep `productionReady`, `readyForLive`, `finalApprovalWorkflowReady`, `reviewerSignoffAllowed`, `approvalRecordsCreated`, `finalPromotionAllowed`, `registryWriteAllowed`, `liveEditsAllowed`, `sourceWritesUsed`, `audioFilesWritten`, `registryWritesUsed`, and pronunciation inference false.
- [x] Run focused final audio approval workflow audit Jest: 1 suite, 5 tests passed.
- [x] Run related audio approval/readiness chain Jest: 14 suites, 68 tests passed.
- [x] Write canonical `.codex-tmp/personal-plans/gavan-week1-final-audio-approval-workflow-audit.json`.
- [x] Run broad Personal Plans Jest: 200 suites, 1248 tests passed.
- [x] Run TypeScript gate: `npx tsc --noEmit --pretty false`.
- [ ] This audit is not reviewer approval, not approval records, not final audio promotion, not live registry registration, and not production readiness.

## Update 2026-06-04 - P3.120 Pronunciation approval workflow audit

- [x] Confirm real MP3 assets are still unavailable: `assets/audio/personal-plans` does not exist, and generation was not explicitly authorized in this pass.
- [x] Select a pronunciation approval workflow audit as the next coherent non-live layer because P3.118 blocks release, while reviewers still need a deterministic stage-by-stage workflow showing why pronunciation signoff cannot begin.
- [x] Add TDD coverage in `tests/personal_plan_gavan_week1_pronunciation_approval_workflow_audit.test.ts`.
- [x] Verify the red phase: the focused test failed because `tools/personal_plan_gavan_week1_pronunciation_approval_workflow_audit` did not exist.
- [x] Implement `tools/personal_plan_gavan_week1_pronunciation_approval_workflow_audit.ts`.
- [x] The audit consumes the P3.111 scored-attempt evidence intake report and P3.118 pronunciation production readiness gate and maps every reference through scorer provider, recording evidence, scored attempt evidence, reviewer signoff, final scorer promotion, live adapter, and progress penalty stages.
- [x] Current audit status is honestly blocked: `blocked_before_scorer_provider_contract`, release decision `hold`, 4 references, 0 scorer-provider-ready rows, 0 recording-evidence-ready rows, 0 scored-attempt-ready rows, 0 reviewer-signoff-ready rows, 0 explicit approval records, 0 final-scorer-ready rows, 0 live-adapter-ready rows, 0 progress-penalty-ready rows, 4 blocked workflow rows, and 7 blockers.
- [x] Restrict writes to `.codex-tmp` or `docs/reports`; reject runtime pronunciation source targets, recording/scoring targets, audio asset targets, and root config targets.
- [x] Keep `productionReady`, `readyForLive`, `pronunciationApprovalWorkflowReady`, `reviewerSignoffAllowed`, `approvalRecordsCreated`, `finalScorerPromotionAllowed`, `liveAdapterAllowed`, `progressPenaltyAllowed`, `sourceWritesUsed`, `liveEditsAllowed`, `recordingFilesWritten`, `scoringFilesWritten`, and audio inference false.
- [x] Run focused pronunciation approval workflow audit Jest: 1 suite, 5 tests passed.
- [x] Run related pronunciation chain Jest: 9 suites, 49 tests passed.
- [x] Write canonical `.codex-tmp/personal-plans/gavan-week1-pronunciation-approval-workflow-audit.json`.
- [x] Run broad Personal Plans Jest: 201 suites, 1253 tests passed.
- [x] Run TypeScript gate: `npx tsc --noEmit --pretty false`.
- [ ] This audit is not reviewer approval, not approval records, not scorer attachment, not recording/scored-attempt evidence, not final scorer promotion, not live adapter enablement, not progress penalty enablement, and not production readiness.

## Update 2026-06-04 - P3.121 Route live-release workflow audit

- [x] Confirm real MP3 assets are still unavailable: `assets/audio/personal-plans` does not exist, and generation was not explicitly authorized in this pass.
- [x] Select a route live-release workflow audit as the next coherent non-live layer because audio/pronunciation remain evidence-blocked, while route/UI still needed one final reviewer workflow over signature, approval, route registration, regression, and device verification blockers.
- [x] Add TDD coverage in `tests/personal_plan_gavan_week1_route_live_release_workflow_audit.test.ts`.
- [x] Verify the red phase: the focused test failed because `tools/personal_plan_gavan_week1_route_live_release_workflow_audit` did not exist.
- [x] Implement `tools/personal_plan_gavan_week1_route_live_release_workflow_audit.ts`.
- [x] The audit consumes the route prerequisite artifact refresh layer and maps the release through product-copy signature, route signature request, route approval guard, catalog route registration, quiz route registration, UI route registration, live route regression, and device route opening verification stages.
- [x] Current audit status is honestly blocked: `blocked_before_product_copy_signature`, release decision `hold`, 17 prerequisite artifacts, 17 non-live artifacts, 0 live artifacts, 5 route blockers, 4 live acceptance criteria, 8 workflow stages, 8 blocked stages, and 8 blockers.
- [x] Restrict writes to `.codex-tmp` or `docs/reports`; reject runtime route source targets, storage/navigation-like targets, audio asset targets, and root config targets.
- [x] Keep `productionReady`, `readyForLive`, `routeLiveReleaseReady`, `productCopySignatureReady`, `routeSignatureReady`, `routeApprovalReady`, `liveImplementationAllowed`, route registration flags, regression/device verification flags, `sourceWritesUsed`, and `liveEditsAllowed` false.
- [x] Run focused route live-release workflow audit Jest: 1 suite, 5 tests passed.
- [x] Run related route/signature/bridge chain Jest: 12 suites, 88 tests passed.
- [x] Write canonical `.codex-tmp/personal-plans/gavan-week1-route-live-release-workflow-audit.json`.
- [x] Run broad Personal Plans Jest: 202 suites, 1258 tests passed.
- [x] Run TypeScript gate: `npx tsc --noEmit --pretty false`.
- [ ] This audit is not product-copy signature, not route approval, not source route registration, not live regression, not device verification, and not production readiness.

## Update 2026-06-04 - P3.122 Master production readiness matrix

- [x] Confirm real MP3 assets are still unavailable for this pass and generation was not explicitly authorized.
- [x] Select a master production readiness matrix as the next coherent non-live layer because audio, pronunciation, and route/UI each have their own hold gates, but reviewers still need one final cross-layer go/no-go artifact.
- [x] Add TDD coverage in `tests/personal_plan_gavan_week1_master_production_readiness_matrix.test.ts`.
- [x] Verify the red phase: the focused test failed because `tools/personal_plan_gavan_week1_master_production_readiness_matrix` did not exist.
- [x] Implement `tools/personal_plan_gavan_week1_master_production_readiness_matrix.ts`.
- [x] The matrix consumes the final audio approval workflow audit, pronunciation approval workflow audit, and route live-release workflow audit without touching runtime route, storage, audio registration, or navigation modules.
- [x] Current matrix status is honestly blocked: `hold_audio_pronunciation_route_blocked`, release decision `hold`, 3 layers, 3 hold layers, 0 production-ready layers, 20 total blockers, 10 expected MP3 assets, 0 approved final audio assets, 4 pronunciation references, 0 approved pronunciation references, 8 route workflow stages, 8 blocked route stages, and 0 live artifacts.
- [x] Restrict writes to `.codex-tmp` or `docs/reports`; reject runtime route source targets, storage/navigation-like targets, audio asset targets, and root config targets.
- [x] Keep `productionReady`, `readyForLive`, audio/pronunciation/route production flags, explicit approval flags, live asset registration, live route registration, live runtime changes, `sourceWritesUsed`, and `liveEditsAllowed` false.
- [x] Run focused master production readiness matrix Jest: 1 suite, 8 tests passed.
- [x] Run related audio/pronunciation/route/master chain Jest: 9 suites, 49 tests passed.
- [x] Run broad Personal Plans Jest: 203 suites, 1266 tests passed.
- [x] Run TypeScript gate: `npx tsc --noEmit --pretty false`.
- [x] Write canonical `.codex-tmp/personal-plans/gavan-week1-master-production-readiness-matrix.json`.
- [ ] This matrix is not approval, not generated-file validation, not checksum evidence, not pronunciation scoring evidence, not route signature, not live registration, not live regression, not device verification, and not production readiness.

## Update 2026-06-04 - P3.123 Signed route approval intake report

- [x] Confirm real MP3 assets are still unavailable: `assets/audio/personal-plans` does not exist, and generation was not explicitly authorized in this pass.
- [x] Select a signed route approval intake report as the next coherent non-live layer because the route chain has an unsigned handoff, but no separate intake artifact for a future signed approval payload.
- [x] Add TDD coverage in `tests/personal_plan_gavan_week1_signed_route_approval_intake_report.test.ts`.
- [x] Verify the red phase: the focused test failed because `tools/personal_plan_gavan_week1_signed_route_approval_intake_report` did not exist.
- [x] Implement `tools/personal_plan_gavan_week1_signed_route_approval_intake_report.ts`.
- [x] The report consumes the unsigned signed-approval handoff packet and validates reviewer name, reviewer role, approval timestamp, full route-bundle scope, all 13 required evidence paths, full regression scope, and decision text.
- [x] Missing payload status is honestly blocked: `blocked_missing_signed_payload`, release decision `hold`, 7 required fields, 0 valid fields, 7 missing fields, 13 required evidence paths, 0 accepted evidence paths, and 8 blockers.
- [x] Partial payloads are rejected without creating route approval, route registration, regression permission, device verification permission, source writes, or live edits.
- [x] Complete payloads are accepted only as `signed_payload_ready_for_separate_route_approval_review`; they still do not create approval artifacts or unlock live routes.
- [x] Restrict writes to `.codex-tmp` or `docs/reports`; reject runtime route source targets, storage/navigation-like targets, audio asset targets, and root config targets.
- [x] Run focused signed route approval intake Jest: 1 suite, 11 tests passed.
- [x] Restore prerequisite unsigned signed-approval handoff artifact via related Jest: 1 suite, 8 tests passed.
- [x] Run related route/master chain Jest: 6 suites, 47 tests passed.
- [x] Run broad Personal Plans Jest: 204 suites, 1277 tests passed.
- [x] Run TypeScript gate: `npx tsc --noEmit --pretty false`.
- [x] Write canonical `.codex-tmp/personal-plans/gavan-week1-signed-route-approval-intake-report.json`.
- [ ] This report is not route approval, not signed approval artifact creation, not route registration, not live regression, not device verification, not audio/pronunciation readiness, and not production readiness.

## Update 2026-06-04 - P3.124 Signed route approval artifact gate

- [x] Confirm real MP3 assets are still unavailable: `assets/audio/personal-plans` does not exist, and generation was not explicitly authorized in this pass.
- [x] Select a signed route approval artifact gate as the next coherent non-live layer because P3.123 validates future signed payload intake but still needs a separate artifact gate before any route registration can be discussed.
- [x] Add TDD coverage in `tests/personal_plan_gavan_week1_signed_route_approval_artifact_gate.test.ts`.
- [x] Verify the red phase: the focused test failed because `tools/personal_plan_gavan_week1_signed_route_approval_artifact_gate` did not exist.
- [x] Implement `tools/personal_plan_gavan_week1_signed_route_approval_artifact_gate.ts`.
- [x] The gate consumes the signed route approval intake report and blocks artifact creation until the intake status is `signed_payload_ready_for_separate_route_approval_review`.
- [x] Current canonical gate status is honestly blocked: `blocked_before_signed_payload_acceptance`, release decision `hold`, 7 required intake fields, 0 valid intake fields, 0 accepted evidence paths, 13 missing evidence paths, 8 carried intake blockers, and 6 artifact blockers.
- [x] Accepted intake payloads can only produce a non-live signed approval artifact candidate; they still do not create the approval artifact, accept route approval, register routes, allow live regression, allow device verification, write source, or edit live runtime.
- [x] Restrict writes to `.codex-tmp` or `docs/reports`; reject runtime route source targets, storage/navigation-like targets, audio asset targets, and root config targets.
- [x] Run focused signed route approval artifact gate Jest: 1 suite, 11 tests passed.
- [x] Run related route approval chain Jest: 5 suites, 43 tests passed.
- [x] Run broad Personal Plans Jest: 205 suites, 1288 tests passed.
- [x] Run TypeScript gate: `npx tsc --noEmit --pretty false`.
- [x] Write canonical `.codex-tmp/personal-plans/gavan-week1-signed-route-approval-artifact-gate.json`.
- [ ] This gate is not signed approval payload intake, not signed approval artifact creation, not route approval acceptance, not route registration, not live regression, not device verification, not audio/pronunciation readiness, and not production readiness.

## Update 2026-06-04 - P3.125 Route registration implementation preflight v2

- [x] Confirm real MP3 assets are still unavailable: `assets/audio/personal-plans` does not exist, and generation was not explicitly authorized in this pass.
- [x] Select a route registration implementation preflight v2 as the next coherent non-live layer because P3.124 separates signed approval artifact readiness from future source-registration work, but the catalog/quiz/UI route registration implementation pass still needed its own gate.
- [x] Add TDD coverage in `tests/personal_plan_gavan_week1_route_registration_implementation_preflight_v2.test.ts`.
- [x] Verify the red phase: the focused test failed because `tools/personal_plan_gavan_week1_route_registration_implementation_preflight_v2` did not exist.
- [x] Implement `tools/personal_plan_gavan_week1_route_registration_implementation_preflight_v2.ts`.
- [x] The preflight consumes the signed route approval artifact gate and maps the future source-registration pass across catalog route registration, quiz route registration, and UI route registration families.
- [x] Current canonical preflight status is honestly blocked: `blocked_before_signed_approval_artifact_candidate`, release decision `hold`, 3 route families, 3 blocked route families, 7 planned catalog routes, 7 planned quiz routes, 5 planned UI opening contracts, signed approval artifact ready `false`, source registration plan ready `false`, 6 inherited artifact blockers, and 7 implementation blockers.
- [x] If a future artifact gate reaches `signed_approval_artifact_candidate_ready_non_live`, this preflight can only prepare a non-live source-registration plan; it still does not allow catalog/quiz/UI registration, live regression, device verification, source writes, or live edits.
- [x] Restrict writes to `.codex-tmp` or `docs/reports`; reject runtime route source targets, storage/navigation-like targets, audio asset targets, and root config targets.
- [x] Run focused route registration implementation preflight v2 Jest: 1 suite, 11 tests passed.
- [x] Run related route registration chain Jest: 6 suites, 54 tests passed.
- [x] Run broad Personal Plans Jest: 206 suites, 1299 tests passed.
- [x] Run TypeScript gate: `npx tsc --noEmit --pretty false`.
- [x] Write canonical `.codex-tmp/personal-plans/gavan-week1-route-registration-implementation-preflight-v2.json`.
- [ ] This preflight is not signed approval artifact creation, not route approval acceptance, not source registration, not live route regression, not device verification, not audio/pronunciation readiness, and not production readiness.

## Update 2026-06-04 - P3.126 Live route regression evidence preflight

- [x] Confirm real MP3 assets are still unavailable: `assets/audio/personal-plans` does not exist, and generation was not explicitly authorized in this pass.
- [x] Select a live route regression evidence preflight as the next coherent non-live layer because P3.125 maps future route registration, but regression and device evidence still needed their own gate.
- [x] Add TDD coverage in `tests/personal_plan_gavan_week1_live_route_regression_evidence_preflight.test.ts`.
- [x] Verify the red phase: the focused test failed because `tools/personal_plan_gavan_week1_live_route_regression_evidence_preflight` did not exist.
- [x] Implement `tools/personal_plan_gavan_week1_live_route_regression_evidence_preflight.ts`.
- [x] The preflight consumes route registration implementation preflight v2 and maps future route evidence across 7 regression suites and 5 device opening checks.
- [x] Current canonical preflight status is honestly blocked: `blocked_before_source_registration_plan`, release decision `hold`, 7 regression suites, 7 blocked regression suites, 5 device checks, 5 blocked device checks, 3 route families, route registration complete `false`, 7 inherited implementation blockers, and 6 evidence blockers.
- [x] If a future source-registration plan is ready, this preflight can only prepare non-live regression/device evidence checklists; it still does not run regression, verify devices, mark routes live, write source, or edit live runtime.
- [x] Restrict writes to `.codex-tmp` or `docs/reports`; reject runtime route source targets, storage/navigation-like targets, audio asset targets, and root config targets.
- [x] Run focused live route regression evidence preflight Jest: 1 suite, 11 tests passed.
- [x] Run related route evidence chain Jest: 5 suites, 46 tests passed.
- [x] Run broad Personal Plans Jest: 207 suites, 1310 tests passed.
- [x] Run TypeScript gate: `npx tsc --noEmit --pretty false`.
- [x] Write canonical `.codex-tmp/personal-plans/gavan-week1-live-route-regression-evidence-preflight.json`.
- [ ] This preflight is not source registration, not live route regression evidence, not device verification evidence, not audio/pronunciation readiness, and not production readiness.

## Update 2026-06-04 - P3.127 Master final release readiness v2

- [x] Confirm real MP3 assets are still unavailable: `assets/audio/personal-plans` does not exist, and generation was not explicitly authorized in this pass.
- [x] Select master final release readiness v2 as the next coherent non-live layer because P3.126 added route regression/device evidence blockers that the original master matrix did not aggregate.
- [x] Add TDD coverage in `tests/personal_plan_gavan_week1_master_final_release_readiness_v2.test.ts`.
- [x] Verify the red phase: the focused test failed because `tools/personal_plan_gavan_week1_master_final_release_readiness_v2` did not exist.
- [x] Implement `tools/personal_plan_gavan_week1_master_final_release_readiness_v2.ts`.
- [x] The v2 readiness gate consumes the master production readiness matrix and the live route regression evidence preflight.
- [x] Restore the missing `.codex-tmp/personal-plans/gavan-week1-master-production-readiness-matrix.json` prerequisite before writing the v2 canonical artifact.
- [x] Current canonical v2 status is honestly blocked: `hold_audio_pronunciation_route_evidence_blocked`, release decision `hold`, 3 final layers, 0 production-ready layers, 20 master blockers, 6 route evidence blockers, 26 total blockers, 10 expected MP3 assets, 4 pronunciation references, 8 route workflow stages, 7 route regression suites, and 5 route device checks.
- [x] Keep final release, production readiness, ready-for-live, audio readiness, pronunciation readiness, route readiness, regression evidence, device evidence, source writes, and live edits false.
- [x] Restrict writes to `.codex-tmp` or `docs/reports`; reject runtime route source targets, storage/navigation-like targets, audio asset targets, and root config targets.
- [x] Run focused master final release readiness v2 Jest: 1 suite, 11 tests passed.
- [x] Run related final readiness chain Jest: 5 suites, 46 tests passed.
- [x] Run broad Personal Plans Jest: 208 suites, 1321 tests passed.
- [x] Run TypeScript gate: `npx tsc --noEmit --pretty false`.
- [x] Write canonical `.codex-tmp/personal-plans/gavan-week1-master-final-release-readiness-v2.json`.
- [ ] This v2 gate is not audio approval, not pronunciation scoring evidence, not signed route approval, not source registration, not live route regression evidence, not device verification evidence, and not production readiness.

## Update 2026-06-04 - P3.128 Production evidence acquisition packet

- [x] Confirm real MP3 assets are still unavailable: `assets/audio/personal-plans` does not exist, and generation was not explicitly authorized in this pass.
- [x] Select production evidence acquisition packet as the next coherent non-live layer because P3.127 establishes the final go/no-go hold, but the remaining blockers need a concrete external evidence request packet.
- [x] Add TDD coverage in `tests/personal_plan_gavan_week1_production_evidence_acquisition_packet.test.ts`.
- [x] Verify the red phase: the focused test failed because `tools/personal_plan_gavan_week1_production_evidence_acquisition_packet` did not exist.
- [x] Implement `tools/personal_plan_gavan_week1_production_evidence_acquisition_packet.ts`.
- [x] The packet consumes master final release readiness v2 and maps its 26 blockers into 3 acquisition streams: audio, pronunciation, and route.
- [x] Current canonical packet status is honestly blocked: `awaiting_external_production_evidence`, release decision `hold`, 3 streams, 28 evidence requests, 12 audio requests, 6 pronunciation requests, 10 route requests, 0 fulfilled requests, and 28 blocked requests.
- [x] Include the exact 10 expected MP3 output paths under `assets/audio/personal-plans/gavan/week1/day1/gavan_d1_t01.mp3` through `gavan_d1_t10.mp3`.
- [x] Keep production readiness, ready-for-live, evidence acquisition complete, audio evidence complete, pronunciation evidence complete, route evidence complete, source writes, and live edits false.
- [x] Restrict writes to `.codex-tmp` or `docs/reports`; reject runtime route source targets, storage/navigation-like targets, audio asset targets, and root config targets.
- [x] Run focused production evidence acquisition packet Jest: 1 suite, 11 tests passed.
- [x] Run related final evidence acquisition chain Jest: 5 suites, 43 tests passed.
- [x] Run broad Personal Plans Jest: 209 suites, 1332 tests passed.
- [x] Run TypeScript gate: `npx tsc --noEmit --pretty false`.
- [x] Write canonical `.codex-tmp/personal-plans/gavan-week1-production-evidence-acquisition-packet.json`.
- [x] Refresh `docs/reports/personal-plans-progress-browser-report.html` with P3.128 progress: overall 89%, verification 100%, content/reviewer packets 95%, audio approval/registration/readiness 72%, pronunciation scoring 67%, live route/UI 76%.
- [ ] This packet is not external evidence itself, not audio generation, not audio approval, not pronunciation scoring, not signed route approval, not source registration, not regression/device evidence, and not production readiness.

## Update 2026-06-04 - P3.129 Production evidence intake validation report

- [x] Confirm real MP3 assets are still unavailable: `assets/audio/personal-plans` does not exist, and generation was not explicitly authorized in this pass.
- [x] Select production evidence intake validation as the next coherent non-live layer because P3.128 created 28 external evidence requests, but future real files need a strict intake gate before any downstream approval or registration work.
- [x] Add TDD coverage in `tests/personal_plan_gavan_week1_production_evidence_intake_validation_report.test.ts`.
- [x] Verify the red phase: the focused test failed because `tools/personal_plan_gavan_week1_production_evidence_intake_validation_report` did not exist.
- [x] Implement `tools/personal_plan_gavan_week1_production_evidence_intake_validation_report.ts`.
- [x] The report consumes the P3.128 production evidence acquisition packet and maps each request to a filesystem intake row with `missing_expected_file`, `invalid_evidence_file`, or `present_pending_review`.
- [x] Validate future MP3 evidence with MP3 header/size checks and future JSON evidence with JSON parsing plus unsafe production/live claim rejection.
- [x] Keep present files as pending review only; do not approve audio, pronunciation, route source registration, live route regression, device verification, ready-for-live, or production readiness.
- [x] Current canonical report status is honestly blocked: `blocked_missing_external_evidence`, release decision `hold`, 28 intake rows, 0 present evidence files, 28 missing evidence files, 0 invalid evidence files, and 28 blocked requests.
- [x] Restrict writes to `.codex-tmp` or `docs/reports`; reject runtime/source targets, audio asset targets, and root config targets.
- [x] Run focused production evidence intake validation report Jest: 1 suite, 10 tests passed.
- [x] Run related production evidence intake chain Jest: 6 suites, 53 tests passed.
- [x] Run broad Personal Plans Jest: 210 suites, 1342 tests passed.
- [x] Run TypeScript gate: `npx tsc --noEmit --pretty false`.
- [x] Write canonical `.codex-tmp/personal-plans/gavan-week1-production-evidence-intake-validation-report.json`.
- [x] Refresh `docs/reports/personal-plans-progress-browser-report.html` with P3.129 progress: overall 90%, verification 100%, content/reviewer packets 95%, audio approval/registration/readiness 73%, pronunciation scoring 68%, live route/UI 77%.
- [ ] This report is not external evidence itself, not audio approval, not pronunciation scoring, not signed route approval, not source registration, not regression/device evidence, and not production readiness.

## Update 2026-06-05 - P3.130 OpenAI audio generation execution and audio gate refresh

- [x] Treat the user's latest message as explicit authorization to generate the 10 OpenAI MP3 files.
- [x] Confirm `OPENAI_API_KEY` is present in `.env.local` without printing the secret.
- [x] Run the existing OpenAI audio generation worker in execute mode through `tools/personal_plan_gavan_week1_generate_openai_audio.ts`.
- [x] Generate 10/10 Gavan week 1 MP3 files at the exact P3.105 handoff/generation-plan output paths under `assets/audio/personal-plans/gavan/week1/...`.
- [x] Write `.codex-tmp/personal-plans/gavan-week1-openai-audio-generation-execute.json`: 10 jobs, 10 generated, 0 skipped, 0 failed, 0 blocked.
- [x] Run generated audio asset validation through `tools/personal_plan_gavan_week1_generated_audio_assets.ts`: 10 jobs, 10 assets, 0 blockers.
- [x] Write `.codex-tmp/personal-plans/gavan-week1-generated-audio-checksums.json` with SHA-256 evidence for all 10 generated MP3 files.
- [x] Refresh `.codex-tmp/personal-plans/gavan-week1-generated-audio-intake-report.json`: `ready_for_explicit_audio_approval`, 10 provided, 10 valid, 0 invalid, 0 missing.
- [x] Refresh `.codex-tmp/personal-plans/gavan-week1-audio-explicit-approval-intake-report.json`: `blocked_missing_approval_records`, 10 valid generated files, 0 approval records, 10 missing approval records.
- [x] Fix the audio evidence bootstrap duration bridge so real generated files are not marked invalid only because bootstrap does not run a duration probe.
- [x] Fix the audio production readiness summary so discovered MP3 count reflects checksum-ready generated files instead of staying hardcoded at 0.
- [x] Refresh final audio registration, approval-record packet, production readiness gate, and final audio approval workflow audit.
- [x] Current audio production readiness is honestly improved but still blocked: `hold_missing_explicit_approval_records`, 10 discovered MP3 files, 10 valid generated files, 10 checksum-ready files, 0 approval records, 0 final promoted audio files, and 3 blockers.
- [x] Refresh master production readiness matrix: audio layer moved to `blocked_before_reviewer_signoff`, total master blockers reduced from 20 to 18.
- [x] Refresh master final release readiness v2: total final blockers reduced from 26 to 24.
- [x] Run focused audio evidence chain bootstrap Jest after fixing the duration bridge: 1 suite, 5 tests passed.
- [x] Run focused audio production readiness gate Jest after fixing discovered MP3 count: 1 suite, 5 tests passed.
- [x] Run related audio generation/readiness chain Jest: 9 suites, 44 tests passed.
- [x] Run focused updated matrix/intake Jest: 2 suites, 18 tests passed.
- [x] Run broad Personal Plans Jest: 210 suites, 1344 tests passed.
- [x] Run TypeScript gate: `npx tsc --noEmit --pretty false`.
- [x] Refresh `docs/reports/personal-plans-progress-browser-report.html` with P3.130 progress: overall 93%, verification 100%, content/reviewer packets 95%, audio approval/registration/readiness 84%, pronunciation scoring 68%, live route/UI 77%.
- [ ] Generated MP3 files are not approved audio.
- [ ] Live audio registration remains blocked until explicit approval records, final audio promotion, and a guarded registry pass exist.
- [ ] Pronunciation readiness remains separate and still requires real scorer/recording/scored-attempt evidence.

## Update 2026-06-05 - P3.131 Explicit audio approval records and final promotion packet

- [x] Treat the user's "Отличные аудио! дальше" message as the explicit human audio approval signal for the already generated Gavan week 1 MP3 files.
- [x] Add TDD coverage in `tests/personal_plan_gavan_week1_audio_explicit_approval_records_and_promotion.test.ts`.
- [x] Verify the red phase: the focused test failed because `tools/personal_plan_gavan_week1_audio_explicit_approval_records_and_promotion` did not exist.
- [x] Implement `tools/personal_plan_gavan_week1_audio_explicit_approval_records_and_promotion.ts`.
- [x] Reuse the existing audio approval gate to build 10 explicit approval records with reviewer id, ISO timestamp, and checksum-bound asset ids.
- [x] Write canonical `.codex-tmp/personal-plans/gavan-week1-audio-explicit-approval-records.json`: 10 approval records, 10 valid records, 0 invalid records.
- [x] Write canonical `.codex-tmp/personal-plans/gavan-week1-final-audio-promotion-report.json`: `ready_for_guarded_live_audio_registry_preflight`, 10 valid generated files, 10 valid approval records, 10 promoted final audio assets, 0 registry-ready assets, and 1 blocker.
- [x] Refresh `.codex-tmp/personal-plans/gavan-week1-audio-explicit-approval-intake-report.json`: `ready_for_final_audio_approval_gate_review`, 10 valid generated files, 10 valid approval records, 0 missing approval records.
- [x] Keep live registration blocked: the promotion packet does not import runtime registries, does not write `app/`, does not write source registry files, and does not mark `readyForLive`.
- [x] Run focused audio explicit approval records and promotion Jest: 1 suite, 6 tests passed.
- [x] Run related audio approval/readiness chain Jest: 7 suites, 36 tests passed.
- [x] Run broad Personal Plans Jest: 211 suites, 1350 tests passed.
- [x] Run TypeScript gate: `npx tsc --noEmit --pretty false`.
- [x] Refresh `docs/reports/personal-plans-progress-browser-report.html` with P3.131 progress: overall 95%, verification 100%, content/reviewer packets 95%, audio approval/registration/readiness 92%, pronunciation scoring 68%, live route/UI 77%.
- [ ] Final promoted audio is not live registered audio.
- [ ] The next audio pass must be a guarded live audio registry/source-registration preflight that consumes the promotion report and still preserves source/runtime contracts.
- [ ] Pronunciation readiness remains separate and still requires real scorer/recording/scored-attempt evidence.

## Update 2026-06-05 - P3.132 Universal generation matrix and Day 1 content start

- [x] Add TDD coverage in `tests/personal_plan_generation_matrix_and_day1_content.test.ts`.
- [x] Verify the red phase: the focused test failed because `docs/personal-plans-generation-matrix.md` was missing and generated Day 1 content still contained technical placeholder copy.
- [x] Create `docs/personal-plans-generation-matrix.md` as the generator contract for a universal 4-week / 28-day Personal Plans matrix.
- [x] Lock the product rule in documentation: Personal Plans are separate tasks, selected daily time chooses the initial visible workload, and lessons are not plan tasks.
- [x] Define the day-by-day mode progression across `plan_phrase_build`, `plan_missing_word`, `plan_choose_natural_phrase`, `plan_listen_choose`, `plan_listen_build`, `plan_pronunciation_repeat`, `plan_phrase_recall`, and `plan_quiz`.
- [x] Define plan-specific progression for Mitap, Voyazh, Impuls, and Echo.
- [x] Start real generation content with concrete Day 1 phrase packets for `mitap_d001_content_unit`, `voyazh_d001_content_unit`, `impuls_d001_content_unit`, and `echo_d001_content_unit`.
- [x] Remove technical placeholder language from generated phrase teaching notes.
- [x] Keep plan cards plan-native: no `/lesson1`, no `/lesson_menu`, no linked lesson slice as a visible Personal Plan task.
- [x] Superseded by P3.142: selected daily time now changes only the initial visible task count; it still does not delete task types from the full day pool.
- [x] Run focused generation matrix Jest: 1 suite, 3 tests passed.
- [x] Run related Personal Plans routing/screen/hard-gate Jest: 4 suites, 28 tests passed.
- [x] Run TypeScript gate: `npx tsc --noEmit --pretty false`.
- [x] Restore `docs/reports/personal-plans-progress-browser-report.html` with P3.132 progress: overall 96%, content/reviewer packets 96%, audio approval/registration/readiness 92%, pronunciation scoring 68%, verification 100%, live route/UI/generation 82%.
- [ ] Day 2-28 content packets are not fully generated yet.
- [ ] The current matrix is a generator contract and first content batch, not full production readiness.
- [ ] Pronunciation readiness still requires real scorer/recording/scored-attempt evidence.
- [ ] Promoted Gavan audio still needs guarded live registry/source registration before it is live audio.

## Update 2026-06-05 - P3.133 Pre-generation readiness and variable daily task progression

- [x] Add TDD coverage in `tests/personal_plan_pre_generation_readiness_contract.test.ts`.
- [x] Verify the red phase: the focused test failed because `docs/personal-plans-pre-generation-readiness.md` was missing and the browser report still pushed toward Day 2-28 generation.
- [x] Create `docs/personal-plans-pre-generation-readiness.md`.
- [x] Lock the current decision: do not generate Day 2-28 yet.
- [x] Define the concrete pre-generation prerequisites: mode contract, output schema, prompt template, review rubric, fixture gate, and browser report.
- [x] Update the 4-week matrix so different days use different task sets.
- [x] Remove the old "all core modes" progression language.
- [x] Lock the revised rule: generate the maximum day pool and reveal the selected-time slice first.
- [x] Update `docs/reports/personal-plans-progress-browser-report.html` so the visible report shows "finish before generation" instead of treating missing Day 2-28 content as the next immediate task.
- [x] Run focused pre-generation/matrix Jest: 2 suites, 5 tests passed.
- [ ] The next pass should build the mode contract + output schema + fixture gate before generating more content.

## Update 2026-06-05 - P3.134 Generation contract gate

- [x] Add TDD coverage in `tests/personal_plan_generation_contract_gate.test.ts`.
- [x] Verify the red phase: the focused test failed because `app/personal_plan_generation_contract.ts` did not exist.
- [x] Add `app/personal_plan_generation_contract.ts`.
- [x] Define `GENERATION_MODE_CONTRACT` for all plan-native modes.
- [x] Define `GeneratedPersonalPlanDayPacket` as the pre-generation output schema.
- [x] Define `DAILY_TASK_SET_MATRIX` for 28 days with variable daily task sets.
- [x] Define `GENERATION_PROMPT_TEMPLATE` and `GENERATION_REVIEW_RUBRIC`.
- [x] Add `validateGeneratedDayPacket` fixture gate.
- [x] Superseded by P3.142: fixture gate rejects lesson tasks, missing time-tier visible-slice rules, placeholder/internal copy, duplicate phrases, production-ready self-claims, unknown modes, and partial mode pools.
- [x] Update `docs/personal-plans-pre-generation-readiness.md` and browser progress report.
- [x] Run focused generation contract Jest: 1 suite, 4 tests passed.
- [ ] Next pass: reviewer workflow for generated packets, still without generating Day 2-28.

## Update 2026-06-05 - P3.135 Generated packet reviewer workflow

- [x] Add TDD coverage in `tests/personal_plan_generation_review_workflow.test.ts`.
- [x] Verify the red phase: the focused test failed because `app/personal_plan_generation_review_workflow.ts` did not exist.
- [x] Add `app/personal_plan_generation_review_workflow.ts`.
- [x] Build explicit approve/reject review records with reviewer id, ISO timestamp, notes, packet id, and checksum.
- [x] Approve only packets that pass `validateGeneratedDayPacket`.
- [x] Reject invalid packets even when a review input says approve.
- [x] Reject missing reviewer metadata, invalid timestamps, missing records, duplicate records, checksum mismatches, and source/live write attempts.
- [x] Build approval bundle validation for `valid_for_source_intake_preflight`.
- [x] Keep `sourceRuntimeWriteAllowed` and `liveRegistrationAllowed` false throughout the workflow.
- [x] Update pre-generation readiness docs and browser progress report.
- [x] Run focused reviewer workflow Jest: 1 suite, 5 tests passed.
- [ ] Next pass: source-intake preflight for approved generated packets, still without generating Day 2-28 or writing runtime source.

## Update 2026-06-05 - P3.136 Source-intake preflight

- [x] Add TDD coverage in `tests/personal_plan_generation_source_intake_preflight.test.ts`.
- [x] Verify the red phase: the focused test failed because `app/personal_plan_generation_source_intake_preflight.ts` did not exist.
- [x] Add `app/personal_plan_generation_source_intake_preflight.ts`.
- [x] Build source-intake rows from approved generated packet bundles.
- [x] Keep `sourceRuntimeWriteAllowed`, `liveRegistrationAllowed`, and `generatedContentCreationAllowed` false.
- [x] Set successful preflight status to `ready_for_import_format_design`.
- [x] Validate that approved packets can move only to the next non-live step: `content_packet_import_format`.
- [x] Block source writes, live registration, generated content creation, checksum drift, missing rows, and unapproved packets.
- [x] Update pre-generation readiness docs and browser progress report.
- [x] Run focused source-intake Jest: 1 suite, 3 tests passed.
- [ ] Next pass: content packet import format, still without generating Day 2-28 or writing runtime source.

## Update 2026-06-05 - P3.137 Content packet import format

- [x] Add TDD coverage in `tests/personal_plan_generation_import_format.test.ts`.
- [x] Verify the red phase: the focused test failed because `app/personal_plan_generation_import_format.ts` did not exist.
- [x] Add `app/personal_plan_generation_import_format.ts`.
- [x] Convert source-intake preflight rows and approved packet data into a stable non-live import artifact.
- [x] Carry packet checksum, plan/day ids, week role, task modes, phrases, recall links, audio needs, pronunciation needs, and blockers.
- [x] Keep source/runtime writes, live registration, and generated content creation false.
- [x] Block missing days, duplicate day ids, checksum drift, source writes, live registration, and generation attempts.
- [x] Run focused import format Jest: 1 suite, 3 tests passed.

## Update 2026-06-05 - P3.138 Runtime/source write guard

- [x] Add TDD coverage in `tests/personal_plan_generation_runtime_source_write_guard.test.ts`.
- [x] Verify the red phase: the focused test failed because `app/personal_plan_generation_runtime_source_write_guard.ts` did not exist.
- [x] Add `app/personal_plan_generation_runtime_source_write_guard.ts`.
- [x] Guard catalog source, route source, UI surface, storage contract, asset registry, and test fixture source.
- [x] Keep source/runtime writes, live registration, generated content creation, and production readiness false.
- [x] Require a separate future integration pass before any source/runtime write.
- [x] Set next required step to `plan_specific_generation_prompts`.
- [x] Run focused runtime/source write guard Jest: 1 suite, 3 tests passed.
- [ ] Next pass: plan-specific generation prompts, still without generating Day 2-28.

## Update 2026-06-05 - P3.139 Plan-specific generation prompts

- [x] Add TDD coverage in `tests/personal_plan_generation_plan_specific_prompts.test.ts`.
- [x] Verify the red phase: the focused test failed because `app/personal_plan_generation_plan_specific_prompts.ts` did not exist.
- [x] Add `app/personal_plan_generation_plan_specific_prompts.ts`.
- [x] Define separate prompt rules for Gavan, Mitap, Voyazh, Impuls, and Echo.
- [x] Block one generic prompt from being reused for every plan.
- [x] Include fixed rules in every prompt: selected daily time chooses initial visibility, lessons are not plan tasks, every day keeps the maximum mode pool, and blockers are returned instead of fake readiness.
- [x] Define scenario keywords, scenario rules, progression rules, and forbidden patterns for every plan.
- [x] Keep source/runtime writes, live registration, and generated content creation false.
- [x] Update pre-generation readiness docs and browser progress report.
- [x] Run focused plan-specific prompts Jest: 1 suite, 4 tests passed.
- [ ] Next pass: human/content review checklist, still without generating Day 2-28.

## Update 2026-06-05 - P3.140 Recommended human/content review checklist

- [x] Add TDD coverage in `tests/personal_plan_generation_recommended_review_checklist.test.ts`.
- [x] Verify the red phase: the focused test failed because `docs/personal-plans-human-content-review-checklist.md` did not exist.
- [x] Add `docs/personal-plans-human-content-review-checklist.md`.
- [x] Mark the checklist as recommended, non-blocking, not a gate, and not production approval.
- [x] Cover phrase quality, translation quality, teaching notes, daily task set fit, plan-specific fit, and reviewer notes.
- [x] Keep the checklist separate from hard gates and production approval.
- [x] Update pre-generation readiness docs and browser progress report.
- [x] Run focused recommended checklist Jest: 1 suite, 1 test passed.
- [ ] Next pass: dry-run generator harness, still without generating Day 2-28.

## Update 2026-06-05 - P3.142 Time-tier setup, maximum day pool, and add-more guard

- [x] Add TDD coverage for the revised workload rule in `tests/personal_plan_generation_contract_gate.test.ts`, `tests/personal_plan_state.test.ts`, `tests/personal_plan_screen_contract.test.ts`, and `tests/personal_plan_setup_theme_contract.test.ts`.
- [x] Verify the red phase for the add-more guard: the focused screen contract failed while the screen still used only the base `runtime.todayDone` flag.
- [x] Add the plan setup time question with 5/10/15/20 minute choices.
- [x] Store the selected setup minutes in the active Personal Plan state instead of using a plan default.
- [x] Keep every generated day as a maximum mode pool: one task per plan-native mode where content exists.
- [x] Use selected time only for the initial visible slice: 5 minutes = 2-4 tasks, 10 minutes = 3-5, 15 minutes = 4-5, 20 minutes = 5-6.
- [x] Add `allTasksForDay(...)` and `nextTaskAfterVisibleSlice(...)` helpers so the runtime can reveal unrevealed day tasks without changing the source pool.
- [x] Show "Add more task" only after all currently visible tasks are completed, including tasks revealed by earlier add-more clicks.
- [x] Keep lessons separate from Personal Plan tasks and keep source/runtime generation claims non-live.
- [x] Update generator prompt rules, pre-generation docs, final checklist wording, and browser progress report.
- [x] Run focused workload/UI/setup/generation Jest: 4 suites, 30 tests passed.
- [x] Run related Personal Plans generation/review/setup/state Jest: 10 suites, 46 tests passed.
- [x] Run `npx tsc --noEmit --pretty false`: passed.
- [ ] Next pass: internal quality gate over the queued 140 chat-draft candidate days, still without runtime/source import.

## Update 2026-06-05 - P3.143 Internal quality gate over 140 chat-draft candidate days

- [x] Add TDD coverage in `tests/personal_plan_internal_quality_gate.test.ts`.
- [x] Verify the red phase: the focused test failed because `app/personal_plan_internal_quality_gate.ts` did not exist.
- [x] Add `app/personal_plan_internal_quality_gate.ts`.
- [x] Consume the existing bulk generation review queue without writing runtime/source.
- [x] Score all 140 chat-draft candidate days from the completed 28-day base cycle across five plans.
- [x] Mark 134 candidate days as `accepted_for_source_intake_candidate`.
- [x] Mark 6 candidate days as `rework_required`: Voyazh Day 2, Gavan Day 1, Gavan Day 2, Echo Day 2, Gavan Day 3, Echo Day 3.
- [x] Keep blocked days at 0, but keep production readiness, source/runtime writes, live registration, and generated-content creation false.
- [x] Write `.codex-tmp/personal-plans/internal-quality-gate.json`.
- [x] Update pre-generation readiness docs and browser progress report.
- [x] Run focused internal quality gate Jest: 1 suite, 3 tests passed.
- [ ] Next pass: rewrite/rework the 6 lower-quality candidate days, then rerun the internal quality gate before source-intake preflight.

## Update 2026-06-05 - P3.144 Rework resolution for all internal quality rows

- [x] Add TDD coverage in `tests/personal_plan_internal_quality_gate_rework_resolution.test.ts`.
- [x] Verify the red phase: the focused test failed while the internal quality gate still reported 134 accepted and 6 rework rows.
- [x] Rewrite the 6 lower-quality chat-draft candidate rows in `docs/reports/personal-plans-fill-progress-data.json`.
- [x] Rework rows closed: Voyazh Day 2, Gavan Day 1, Gavan Day 2, Echo Day 2, Gavan Day 3, Echo Day 3.
- [x] Rerun the internal quality artifact at `.codex-tmp/personal-plans/internal-quality-gate.json`.
- [x] Internal quality result is now 140 accepted, 0 rework, 0 blocked.
- [x] Keep production readiness, source/runtime writes, live registration, and generated-content creation false.
- [x] Update browser progress report and fill progress fallback.
- [x] Run focused rework/internal quality Jest: 2 suites, 4 tests passed after updating expectations.
- [ ] Next pass: run source-intake preflight over the 140 accepted non-live candidates.

## Update 2026-06-05 - P3.145 Accepted-candidate source-intake preflight

- [x] Add TDD coverage in `tests/personal_plan_accepted_candidate_source_intake_preflight.test.ts`.
- [x] Verify the red phase: the focused test failed because the accepted-candidate source-intake functions did not exist.
- [x] Extend `app/personal_plan_generation_source_intake_preflight.ts` with a non-live preflight for accepted internal-quality candidates.
- [x] Accept 140 candidate rows for `content_packet_import_format`.
- [x] Block fake production readiness, source/runtime writes, live registration, generated-content creation, checksum drift, and non-accepted candidate rows.
- [x] Write `.codex-tmp/personal-plans/accepted-candidate-source-intake-preflight.json`.
- [x] Refresh `docs/reports/personal-plans-progress-browser-report.html` with P3.145 progress.
- [x] Run focused accepted-candidate source-intake Jest: 1 suite, 2 tests passed.
- [x] Restore `docs/reports/personal-plans-fill-progress-data.json` with 140 non-live chat-draft rows so the bulk queue and internal quality gates remain reproducible.
- [x] Update legacy generation-review/import/runtime-write-guard fixtures to the current contract: full maximum mode pool, selected time as initial visible workload, and no fake blocker-based approval.
- [x] Run related pre-generation Jest: 11 suites, 33 tests passed.
- [ ] TypeScript gate is currently blocked outside this pass by `app/club_screen.tsx(1547,28): Cannot find name 'setLeaderboardTopY'`.
- [x] Next pass completed in P3.146: convert accepted source-intake rows into the content packet import format, still without runtime/source writes.

## Update 2026-06-05 - P3.146 Accepted-candidate content packet import format

- [x] Add TDD coverage in `tests/personal_plan_accepted_candidate_content_packet_import_format.test.ts`.
- [x] Verify the red phase: the focused test failed because accepted-candidate content packet import functions did not exist.
- [x] Extend `app/personal_plan_generation_import_format.ts` with a non-live import format for accepted candidate rows.
- [x] Convert 140 accepted source-intake rows into `personal_plan_accepted_candidate_content_packet_import_format`.
- [x] Keep source/runtime writes, live registration, generated-content creation, and production readiness false.
- [x] Validate day coverage, duplicate plan/day rows, checksums, non-accepted candidate rows, and fake readiness flags.
- [x] Write `.codex-tmp/personal-plans/accepted-candidate-content-packet-import-format.json`.
- [x] Refresh `docs/reports/personal-plans-progress-browser-report.html` with P3.146 progress.
- [x] Run focused accepted-candidate content packet import Jest: 1 suite, 3 tests passed.
- [x] Next pass completed in P3.147: build the runtime/source write guard for the 140-row accepted-candidate import format, still without runtime/source writes.

## Update 2026-06-05 - P3.147 Accepted-candidate runtime/source write guard

- [x] Add TDD coverage in `tests/personal_plan_accepted_candidate_runtime_source_write_guard.test.ts`.
- [x] Verify the red phase: the focused test failed because accepted-candidate runtime/source write guard functions did not exist.
- [x] Extend `app/personal_plan_generation_runtime_source_write_guard.ts` with a hold guard for accepted-candidate import format.
- [x] Guard the 140-row import format before any runtime/source integration pass.
- [x] Block catalog source, route source, UI surface, storage contract, asset registry, and test fixture source.
- [x] Keep source/runtime writes, live registration, generated-content creation, and production readiness false.
- [x] Write `.codex-tmp/personal-plans/accepted-candidate-runtime-source-write-guard.json`.
- [x] Refresh `docs/reports/personal-plans-progress-browser-report.html` with P3.147 progress.
- [x] Run focused accepted-candidate runtime/source write guard Jest: 1 suite, 3 tests passed.
- [x] Next pass completed in P3.148: build an explicit integration plan for the 140-row import format without applying source/runtime writes.

## Update 2026-06-05 - P3.148 Accepted-candidate explicit integration plan

- [x] Add TDD coverage in `tests/personal_plan_accepted_candidate_explicit_integration_plan.test.ts`.
- [x] Verify the red phase: the focused test failed because the explicit integration plan module did not exist.
- [x] Add `app/personal_plan_accepted_candidate_explicit_integration_plan.ts`.
- [x] Build a non-live explicit integration plan from the accepted-candidate runtime/source write guard.
- [x] Define 6 planned-only stages: catalog mapping, route mapping, UI surface binding, storage compatibility, asset registry hold, and test fixture plan.
- [x] Require 6 verification gates before any implementation pass.
- [x] Keep source/runtime writes, live registration, generated-content creation, and production readiness false.
- [x] Write `.codex-tmp/personal-plans/accepted-candidate-explicit-integration-plan.json`.
- [x] Refresh `docs/reports/personal-plans-progress-browser-report.html` with P3.148 progress.
- [x] Run focused explicit integration plan Jest: 1 suite, 3 tests passed.
- [x] Run related integration-plan chain Jest: 11 suites, 29 tests passed.
- [x] Run TypeScript gate: `npx tsc --noEmit --pretty false` passed.
- [x] Next pass completed in P3.149: build the integration implementation preflight for the 140-row plan, still without applying source/runtime writes.

## Update 2026-06-05 - P3.149 Accepted-candidate integration implementation preflight

- [x] Add TDD coverage in `tests/personal_plan_accepted_candidate_integration_implementation_preflight.test.ts`.
- [x] Verify the red phase: the focused test failed because the integration implementation preflight module did not exist.
- [x] Add `app/personal_plan_accepted_candidate_integration_implementation_preflight.ts`.
- [x] Build a non-live implementation preflight from the accepted-candidate explicit integration plan.
- [x] Define 6 guarded implementation requests: catalog source, route source, UI surface, storage contract, asset registry, and test fixture source.
- [x] Keep every implementation request at `applyStatus: not_applied`.
- [x] Block invalid explicit integration plans, missing implementation requests, already-applied requests, missing verification, and fake source/live/generated/production claims.
- [x] Write `.codex-tmp/personal-plans/accepted-candidate-integration-implementation-preflight.json`.
- [x] Refresh `docs/reports/personal-plans-progress-browser-report.html` with P3.149 progress.
- [x] Run focused integration implementation preflight Jest: 1 suite, 3 tests passed.
- [x] Next pass completed in P3.150: guarded runtime/source binding for the 140 accepted candidate days.

## Update 2026-06-05 - P3.150 Accepted-candidate guarded runtime/source binding

- [x] Add TDD coverage in `tests/personal_plan_accepted_candidate_guarded_runtime_source.test.ts`.
- [x] Verify the red phase: the focused test failed because `PlanDay.source` did not exist yet.
- [x] Extend `app/personal_plan_catalog.ts` with guarded source metadata for accepted candidate days.
- [x] Bind the first 28 days of each plan into runtime catalog metadata: 5 plans x 28 days = 140 accepted candidate days.
- [x] Preserve the full daily task pool while selected time controls only the initial visible slice.
- [x] Keep live registration, generated-content creation, audio readiness, pronunciation readiness, and production readiness false.
- [x] Add `app/personal_plan_accepted_candidate_guarded_runtime_source.ts`.
- [x] Add TDD coverage in `tests/personal_plan_accepted_candidate_guarded_runtime_source_report.test.ts`.
- [x] Write `.codex-tmp/personal-plans/accepted-candidate-guarded-runtime-source.json`.
- [x] Refresh `docs/reports/personal-plans-progress-browser-report.html` with P3.150 progress.
- [x] Run focused guarded runtime/source Jest: 2 suites, 5 tests passed.
- [x] Next pass completed in P3.151: day surface, route, storage, and add-more regression gate over the bound runtime catalog.

## Update 2026-06-05 - P3.151 Day surface / route / storage regression gate

- [x] Add TDD coverage in `tests/personal_plan_day_surface_route_storage_regression_gate.test.ts`.
- [x] Verify the red phase: the focused test failed because the regression gate module did not exist.
- [x] Add `app/personal_plan_day_surface_route_storage_regression_gate.ts`.
- [x] Check 140 bound accepted candidate days across day surface, route destinations, storage key scoping, and add-more behavior.
- [x] Verify 1139 route destinations and 0 normal lesson route destinations.
- [x] Verify 0 day surface failures, 0 storage scope failures, and 0 add-more failures.
- [x] Keep live registration, generated-content creation, and production readiness false.
- [x] Write `.codex-tmp/personal-plans/personal-plan-day-surface-route-storage-regression-gate.json`.
- [x] Refresh `docs/reports/personal-plans-progress-browser-report.html` with P3.151 progress.
- [x] Run focused day surface / route / storage regression gate Jest: 1 suite, 2 tests passed.
- [x] Next pass completed in P3.152: audio/pronunciation/human-review readiness consolidation without fake production readiness.

## Update 2026-06-05 - P3.152 Audio / pronunciation / final review readiness consolidation

- [x] Add TDD coverage in `tests/personal_plan_audio_pronunciation_human_review_readiness.test.ts`.
- [x] Verify the red phase: the focused test failed because the readiness consolidation module did not exist.
- [x] Add `app/personal_plan_audio_pronunciation_human_review_readiness.ts`.
- [x] Consolidate the remaining post-route blockers after the day surface / route / storage gate.
- [x] Keep generated/promoted audio from being counted as approved live registered audio.
- [x] Keep pronunciation blocked without real scorer, recording, and scored-attempt evidence.
- [x] Mark final human review as pending final user review without treating it as an engineering blocker.
- [x] Keep live registration, generated-content creation, and production readiness false.
- [x] Restore `.codex-tmp/personal-plans/personal-plan-day-surface-route-storage-regression-gate.json`.
- [x] Write `.codex-tmp/personal-plans/personal-plan-audio-pronunciation-human-review-readiness.json`.
- [x] Restore and refresh `docs/reports/personal-plans-progress-browser-report.html` with P3.152 progress.
- [x] Next pass completed in P3.153: audio live registration evidence gate, still without fake live audio readiness.

## Update 2026-06-05 - P3.153 Audio live registration evidence gate

- [x] Add TDD coverage in `tests/personal_plan_audio_live_registration_evidence_gate.test.ts`.
- [x] Verify the red phase: the focused test failed because `app/personal_plan_audio_live_registration_evidence_gate.ts` did not exist.
- [x] Add `app/personal_plan_audio_live_registration_evidence_gate.ts`.
- [x] Keep the current real state blocked: 10 promoted audio assets, 0 approved/final live registered assets.
- [x] Count only approved + final runtime audio assets as live registration evidence.
- [x] Reject generated audio and fake final claims as live registered evidence.
- [x] Keep `liveRegistrationAllowed: false` and `productionReady: false`.
- [x] Write `.codex-tmp/personal-plans/personal-plan-audio-live-registration-evidence-gate.json`.
- [x] Refresh `docs/reports/personal-plans-progress-browser-report.html` with P3.153 progress.
- [ ] Next pass: pronunciation real-evidence gate or actual approved/final audio registration if explicit approval records and live assets are present.

## Update 2026-06-05 - P3.154 Runtime catalog OpenAI audio generation pass

- [x] Add TDD coverage in `tests/personal_plan_runtime_audio_generation_plan.test.ts`.
- [x] Verify the red phase: the focused test failed because `app/personal_plan_runtime_audio_generation_plan.ts` did not exist.
- [x] Add `app/personal_plan_runtime_audio_generation_plan.ts`.
- [x] Build a current-runtime audio generation plan from `PERSONAL_PLAN_CATALOG`, not from the older Gavan week 1 canonical packet.
- [x] Cover all 5 plans and 5,460 listening task references.
- [x] Deduplicate by plan + spoken target text so repeated content ids reuse one generated MP3 instead of creating 2,730 duplicate clips.
- [x] Reduce runtime audio generation to 48 unique OpenAI MP3 jobs with 0 generation-plan blockers.
- [x] Add `tools/personal_plan_runtime_generate_openai_audio.ts`.
- [x] Run runtime audio dry-run: 48 jobs, 48 dry-run, 0 failed, 0 blocked.
- [x] Run runtime OpenAI audio execute: 48 jobs, 38 generated, 10 skipped existing, 0 failed, 0 blocked.
- [x] Add `tools/personal_plan_runtime_generated_audio_assets.ts`.
- [x] Validate runtime generated assets with real files and `ffprobe`: 48 jobs, 48 assets, 0 blockers.
- [x] Write `.codex-tmp/personal-plans/runtime-openai-audio-generation-dry-run.json`.
- [x] Write `.codex-tmp/personal-plans/runtime-openai-audio-generation-execute.json`.
- [x] Write `.codex-tmp/personal-plans/runtime-generated-audio-assets.json`.
- [x] Run focused runtime audio generation Jest: 1 suite, 2 tests passed.
- [x] Run related audio generation/asset/registry Jest: 4 suites, 10 tests passed.
- [x] Run TypeScript gate: `npx tsc --noEmit --pretty false` passed.
- [ ] Runtime generated MP3 files are not explicit approval records.
- [ ] Runtime generated MP3 files are not approved/final/live registered audio.
- [ ] Next pass: runtime generated-audio approval intake plus guarded approved-final registry source registration, then pronunciation real-evidence gate.

## Update 2026-06-05 - P3.155 Runtime audio approval intake and registry source preflight

- [x] Add TDD coverage in `tests/personal_plan_runtime_audio_approval_intake.test.ts`.
- [x] Verify the red phase: the focused test failed because `app/personal_plan_runtime_audio_approval_intake.ts` did not exist.
- [x] Add `app/personal_plan_runtime_audio_approval_intake.ts`.
- [x] Consume generated runtime audio assets through the existing checksum-bound `approvePlanAudioAssets` gate.
- [x] Keep runtime generated MP3 blocked until explicit approval records exist.
- [x] Write `.codex-tmp/personal-plans/runtime-audio-approval-intake.json`: `blocked_missing_approval_records`, 48 generated assets, 0 approval records, 48 missing approval records.
- [x] Add TDD coverage in `tests/personal_plan_runtime_audio_registry_source_registration.test.ts`.
- [x] Verify the red phase: the focused test failed because `app/personal_plan_runtime_audio_registry_source_registration.ts` did not exist.
- [x] Add `app/personal_plan_runtime_audio_registry_source_registration.ts`.
- [x] Map approved/final runtime assets into a guarded registry source plan only when approval intake is ready.
- [x] Write `.codex-tmp/personal-plans/runtime-audio-registry-source-registration.json`: `blocked_before_runtime_audio_approval`, 0 approved/final assets, 0 registry candidates.
- [x] Add `tools/personal_plan_runtime_audio_approval_intake.ts`.
- [x] Add `tools/personal_plan_runtime_audio_registry_source_registration.ts`.
- [x] Run focused runtime audio approval intake Jest: 1 suite, 3 tests passed.
- [x] Run focused runtime audio registry source registration Jest: 1 suite, 2 tests passed.
- [x] Run related runtime audio approval/registry Jest: 5 suites, 13 tests passed.
- [x] Run TypeScript gate: `npx tsc --noEmit --pretty false` passed.
- [ ] Runtime live audio registration remains blocked until 48 explicit approval records are created and a guarded source write is applied.
- [ ] Pronunciation readiness still requires real scorer, recording, scored-attempt evidence, and approval.

## Update 2026-06-05 - P3.156 Runtime audio review packet and OpenAI pronunciation scorer contract

- [x] Add TDD coverage in `tests/personal_plan_runtime_audio_approval_review_packet.test.ts`.
- [x] Verify the red phase: the focused test failed because `app/personal_plan_runtime_audio_approval_review_packet.ts` did not exist.
- [x] Add `app/personal_plan_runtime_audio_approval_review_packet.ts`.
- [x] Build checksum-bound human review rows for generated runtime audio without creating approval records.
- [x] Write `.codex-tmp/personal-plans/runtime-audio-approval-review-packet.json`: `ready_for_human_audio_review`, 48 review rows, 0 invalid generated assets, 0 approval records.
- [x] Add `tools/personal_plan_runtime_audio_approval_review_packet.ts`.
- [x] Add `tools/personal_plan_gavan_week1_refresh_pronunciation_openai_contract.ts`.
- [x] Refresh Gavan week 1 pronunciation provider contract with non-live OpenAI scorer metadata.
- [x] Move pronunciation from `hold_missing_scorer_provider` to `hold_missing_scored_attempt_evidence`.
- [x] Refresh `.codex-tmp/personal-plans/gavan-week1-pronunciation-scoring-provider-contract.json`: `pronunciation_scorer_contract_ready_for_scored_attempt_validation`, 4/4 scorer-contract-ready references.
- [x] Refresh `.codex-tmp/personal-plans/gavan-week1-pronunciation-scored-attempt-evidence-intake-report.json`: `blocked_missing_scored_attempts`, 4 missing scored attempts.
- [x] Refresh `.codex-tmp/personal-plans/gavan-week1-pronunciation-production-readiness-gate.json`: `hold_missing_scored_attempt_evidence`, 4 scorer-contract-ready references, 0 valid scored attempts, 5 blockers.
- [x] Run focused runtime audio review packet Jest: 1 suite, 2 tests passed.
- [x] Run related audio/pronunciation gate Jest: 6 suites, 26 tests passed.
- [x] Run TypeScript gate: `npx tsc --noEmit --pretty false` passed.
- [ ] Audio still needs 48 explicit approval records before guarded registry source write.
- [ ] Pronunciation still needs 4 real recordings/scored attempts, explicit pronunciation approval, final scorer promotion, and live adapter gate.

## Update 2026-06-05 - P3.157 Full daily task pool completion for every plan

- [x] Add a strict accepted-candidate guard so every bound day must expose the full 8-mode runtime task pool.
- [x] Replace the generated-day legacy `active_recall` task with the product contract mode `plan_phrase_recall`.
- [x] Keep selected daily minutes as the initial visible slice only; the full day pool stays available through add-more.
- [x] Add the missing `plan_phrase_recall` task to certified Gavan day 1, bringing it from 7 to 8 plan-native tasks.
- [x] Update plan phrase recall routing so generated and certified recall tasks pass real content-unit ids instead of opening with an empty phrase list.
- [x] Verify the full catalog: 546 total plan days checked, 0 missing task-pool gaps.
- [x] Plan coverage by catalog: `voyazh` 84/84 days, `mitap` 112/112 days, `gavan` 126/126 days, `impuls` 140/140 days, `echo` 84/84 days.
- [x] Run focused Personal Plans Jest: 8 suites, 38 tests passed.
- [x] Run TypeScript gate: `npx tsc --noEmit --pretty false` passed.
- [ ] Audio still needs 48 explicit approval records before guarded registry source write.
- [ ] Pronunciation still needs 4 real recordings/scored attempts, explicit pronunciation approval, final scorer promotion, and live adapter gate.

## Update 2026-06-05 - P3.158 Full catalog task-material completion

- [x] Add `tests/personal_plan_full_catalog_task_materials.test.ts` as a full-catalog guard for launchable task material.
- [x] Verify the red phase: the guard found missing `plan_missing_word` material and missing generated quiz material across the catalog.
- [x] Expand generated `plan_missing_word` source ids from 3 to 5 phrase candidates so quality filtering still leaves enough safe in-phrase blanks.
- [x] Update missing-word target selection to avoid sentence-opening blanks and choose a safe in-phrase target word.
- [x] Add generated Personal Plan quiz banks for catalog quiz ids such as `voyazh_day_1_quiz`, with 10 questions from the same day's phrase lesson.
- [x] Add generated quiz coverage and generic quiz task copy for generated plan-day quizzes.
- [x] Verify full material coverage: 546 days checked, 4,368 tasks checked, 0 material gaps.
- [x] Run focused/related Personal Plans Jest: 9 suites, 37 tests passed.
- [x] Run TypeScript gate: `npx tsc --noEmit --pretty false` passed.
- [ ] Audio still needs 48 explicit approval records before guarded registry source write.
- [ ] Pronunciation still needs 4 real recordings/scored attempts, explicit pronunciation approval, final scorer promotion, and live adapter gate.

## Update 2026-06-05 - P3.159 Runtime audio approval and source registry registration

- [x] Capture explicit user audio review decision: all runtime MP3 sounds are clear.
- [x] Add `app/personal_plan_runtime_audio_human_approval_records.ts`.
- [x] Add `tools/personal_plan_runtime_audio_human_approval_records.ts`.
- [x] Generate `.codex-tmp/personal-plans/runtime-audio-human-approval-records.json`: 48 generated assets, 48 checksum-bound approval records.
- [x] Update runtime audio approval intake to read explicit approval records when present.
- [x] Regenerate `.codex-tmp/personal-plans/runtime-audio-approval-intake.json`: `ready_for_guarded_runtime_audio_registry`, 48/48 approved final assets, 0 missing records, 0 invalid records.
- [x] Regenerate `.codex-tmp/personal-plans/runtime-audio-registry-source-registration.json`: `ready_for_guarded_runtime_registry_source_write`, 48 registry candidates.
- [x] Generate `app/personal_plan_runtime_audio_assets.generated.ts` from the approved runtime audio intake.
- [x] Register generated approved runtime audio as the default source in `app/personal_plan_audio_asset_registry.ts`.
- [x] Verify runtime playback source: 48 approved assets are available and a sample `voyazh` listening task returns `audioReady: true`.
- [x] Run focused audio registry/listening Jest: 4 suites, 17 tests passed.
- [x] Run runtime approval Jest: 3 suites, 6 tests passed.
- [x] Run TypeScript gate: `npx tsc --noEmit --pretty false` passed.
- [ ] Pronunciation still needs 4 real recordings/scored attempts, explicit pronunciation approval, final scorer promotion, and live adapter gate.

### Reusable continuation prompt

```text
Продолжай работу по Personal Plans в Phraseman большим coherent pass, не микрозадачей.

Главная цель: довести Personal Plans до 100% production-ready, не ломая и не удаляя существующую функциональность. Нельзя считать scaffold, draft, candidate, dry-run, preflight, handoff или generated evidence production-ready.

Текущий handover:
- docs/reports/personal-plans-handover-2026-06-04-after-p3104.md
- docs/personal-plans-implementation-checklist.md, раздел P3.105 Audio generation handoff packet

Сначала прочитай только нужные файлы:
- docs/personal-plans-implementation-checklist.md
- tools/personal_plan_gavan_week1_audio_generation_handoff_packet.ts
- tests/personal_plan_gavan_week1_audio_generation_handoff_packet.test.ts
- tools/personal_plan_gavan_week1_audio_approval_evidence_packet.ts
- app/personal_plan_gavan_week1_audio_generation_plan.ts
- app/personal_plan_audio_generated_assets.ts
- app/personal_plan_audio_approval_report.ts
- app/personal_plan_audio_approval_gate.ts
- app/personal_plan_audio_asset_readiness.ts

Приоритет следующего большого прохода:
1. Если реальные 10 MP3 assets доступны или генерация явно разрешена, подготовь/проверь эти файлы по exact outputPath из P3.105, затем запусти generated-asset validation и explicit approval gate.
2. Если реальные MP3 недоступны и генерация не разрешена, создай следующий non-live artifact: generated-file intake/validation report, который мапит expected outputPath -> file status/checklist/blocker и не делает fake readiness.
3. Перед broad gate восстанови/сгенерируй отсутствующие `.codex-tmp` prerequisite artifacts для route/signature/bridge chain или честно отчитай, что broad gate blocked by missing temp artifacts.

Обязательные правила:
- Не делать один маленький шаг; выбирай большой связный слой и доводи его до report/docs + tests.
- TDD: сначала тест/red, потом реализация/green.
- Не считать generated audio approved audio.
- Не считать placeholders production-ready.
- Не регистрировать live audio assets без explicit approval records.
- Не считать pronunciation readiness готовой без real scoring/recording evidence.
- Не менять runtime/UI/navigation/storage/source contracts без отдельной причины и тестов.
- Не удалять существующую функциональность.
- Учитывать грязный git worktree и не затирать чужие изменения.

Проверки после реализации:
- focused Jest по новой области;
- related audio/personal_plan Jest;
- npx jest --runInBand --testPathPattern=tests/personal_plan
- npx tsc --noEmit --pretty false

После прохода обнови:
- docs/personal-plans-implementation-checklist.md;
- docs/personal-plans-killer-feature-audit.md;
- docs/personal-plans-product-excellence-audit.md;
- новый docs/reports report, если окружение сохраняет untracked docs/reports файлы;
- progress graph, если он есть или требуется по handover.

В финальном ответе покажи:
- что сделано;
- какие файлы изменены;
- какие проверки реально запускались;
- какие blockers остались;
- текущие проценты по слоям;
- следующий крупный шаг.
```
