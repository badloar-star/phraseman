# Personal Plans Killer Feature Audit

Date: 2026-05-31

## Implementation update 2026-06-03 - Runtime `plan_phrase_build` mode

Status: completed.

### Route decision

The best next route was to stop writing more non-live day material and make the core plan exercise mode playable. `phrase_build` was already present in authoring contracts, renderer contracts, and canonical Gavan week 1, but runtime still deferred it. That meant the plan could describe daily phrase-building tasks without actually running them.

### What changed

- `plan_phrase_build` is now a supported runtime exercise type.
- Runtime items now carry:
  - `wordTiles`;
  - `distractorTiles`;
  - `targetTokenCount`.
- Phrase-build items no longer expose the correct answer as a normal multiple-choice option.
- Phrase-build display text now shows blank slots instead of revealing the English answer.
- Runtime validation now blocks:
  - phrase-build items with answer choices;
  - missing tiles;
  - wrong target token counts;
  - duplicate target/distractor tiles;
  - distractors that duplicate target words.
- Gavan week 1 canonical runtime bridge now converts canonical `phrase_build` blocks into live `plan_phrase_build` bundles instead of deferring them.
- DEV runtime screen now renders a minimal working word-tile builder for phrase-build tasks.

### Product meaning

This closes the biggest gap between "the plan says there is a phrase task" and "the user can actually do the phrase task". The mode now follows the same product rule as lessons: the learner assembles words, progress is correct-only, and wrong answers return through the existing recovery loop.

### Quality gate

RED confirmed the old runtime rejected `plan_phrase_build` and the canonical bridge deferred it.

Passed:

```powershell
npm test -- --runTestsByPath tests/personal_plan_exercise_runtime.test.ts tests/personal_plan_exercise_runtime_view_model.test.ts tests/personal_plan_gavan_week1_runtime_bridge.test.ts tests/personal_plan_runtime_dev_screen_contract.test.ts tests/personal_plan_exercise_runtime_session.test.ts tests/personal_plan_day_runtime_loop_coordinator.test.ts --runInBand
```

Result: 6 suites, 30 tests passed.

Passed:

```powershell
npx tsc --noEmit --pretty false
```

### Updated implementation map

Next P0:

1. Add the next real renderer mode: `plan_listening_choice` with honest asset states and no fake audio.
2. Add final day-quiz runtime route for canonical day quiz intents: exactly 10 questions per day.
3. Add after-answer explanation cards into runtime view model so phrase-build/missing-word/natural-choice can show grounded explanations after each answer.
4. Replace the minimal DEV phrase-build tile renderer with the real lesson-shell-derived renderer.
5. Restore/check the big Home plan card only after runtime source remains stable.

## Implementation update 2026-06-03 - Canonical Gavan week 1 route after reset

Status: completed.

### Route decision

The project had too many non-live candidates, approval packets, and reports. The optimal route is to stop treating every small artifact as a separate destination and create one canonical product week that implementation can bridge into runtime.

The new source of truth for the next implementation phase is:

- `app/personal_plan_gavan_week1_canonical_plan.ts`

### What changed

- Added a canonical `Гавань · неделя 1` plan layer.
- Added a strict focused test for the canonical week.
- Added a report:
  - `docs/reports/personal-plans-canonical-week1-2026-06-03.md`

### Canonical week contents

The week now has:

- 7 days;
- 28 broad everyday phrases;
- 10 exercise types:
  - lesson bridge;
  - phrase build;
  - missing word;
  - natural choice;
  - listening choice;
  - phrase recall;
  - quick reply;
  - mistake repair;
  - micro dialogue;
  - pronunciation shadow;
- load profiles for exactly 5, 10, 15, and 20 minutes;
- 10 quiz questions per day;
- explanation cards for every new word and first-seen construction;
- a 24-step implementation queue.

### Product reset rules

The week explicitly avoids:

- name drills;
- phone/email/private-data drills;
- apartment/rent/viewing anchors;
- doctor/bank/passport-number anchors in week 1;
- robotic developer copy;
- fake audio readiness;
- fake pronunciation scoring;
- explanations that pretend to know which wrong option the user selected.

### Quality gate

Passed:

```powershell
npm test -- --runTestsByPath tests/personal_plan_gavan_week1_canonical_plan.test.ts --runInBand
```

Result: 1 suite, 5 tests passed.

### Updated implementation map

P0 next:

1. Bridge canonical week 1 into `personal_plan_day_runtime_assembler`.
2. Replace old day-1-only DEV runtime source with canonical day selection.
3. Keep existing onboarding, paywall, Home, and old screens unchanged.
4. Add runtime tests for day 1 and day 2 selection.
5. Preserve correct-only progress and recovery queue for all bridged blocks.
6. Restore the big Home route card only after runtime source is stable.

P1 after P0:

1. Write final daily quizzes from canonical quiz intent.
2. Generate and approve real audio assets for listening blocks.
3. Build pronunciation shadow MVP without fake scoring.
4. Add Maestro smoke for canonical day navigation and progress.

## Implementation update 2026-06-03 - Canonical week 1 runtime bridge

Status: completed.

### Route decision

After the canonical week was created, the highest-value route was to connect it to runtime instead of producing more disconnected materials. The bridge is honest: it opens all seven days with currently supported runtime modes and explicitly marks future modes as deferred.

### What changed

- Added `app/personal_plan_gavan_week1_runtime_bridge.ts`.
- Added `tests/personal_plan_gavan_week1_runtime_bridge.test.ts`.
- Updated `app/personal_plan_runtime_dev.tsx`.
- Updated `tests/personal_plan_runtime_dev_screen_contract.test.ts`.
- Added report:
  - `docs/reports/personal-plans-canonical-runtime-bridge-2026-06-03.md`

### Runtime result

DEV runtime now uses:

- `buildGavanWeek1CanonicalRuntimeBridge`;
- `buildGavanWeek1CanonicalRuntimeBundles`;
- day selector for days 1-7;
- scoped day instance ids: `dev-runtime-gavan-week1-day{N}-v1`;
- existing minute choices: 5, 10, 15, 20.

Supported runtime modes live now:

- `plan_choose_natural_phrase`;
- `plan_missing_word`;
- `plan_phrase_recall`.

Deferred modes are visible as future work rather than fake readiness:

- linked lesson route;
- phrase build;
- listening;
- quick reply;
- mistake repair;
- micro dialogue;
- pronunciation shadow.

### Quality gate

Passed:

```powershell
npm test -- --runTestsByPath tests/personal_plan_gavan_week1_canonical_plan.test.ts tests/personal_plan_gavan_week1_runtime_bridge.test.ts tests/personal_plan_runtime_dev_screen_contract.test.ts tests/personal_plan_day_runtime_assembler.test.ts tests/personal_plan_exercise_runtime.test.ts tests/personal_plan_exercise_runtime_session.test.ts --runInBand
```

Result: 6 suites, 28 tests passed.

Passed:

```powershell
npx tsc --noEmit --pretty false
```

### Updated implementation map

Next P0 is `plan_phrase_build` renderer. This must be implemented before more final content is written, because plan phrase tasks must behave like lessons: exact word count, ordered tiles, wrong attempts tracked, correct-only progress, and errors returning to recall/trainer.

## Implementation update 2026-06-01 - P3.31 Listening authoring requirements

Status: completed.

What changed:
- Completed the existing `Gavan` day 1 listening authoring layer instead of adding a duplicate model.
- `GavanDay1ListeningAuthoringPlan` declares planned listening prompts for all five clean day 1 candidate phrases.
- Every prompt is grounded in a candidate phrase id and exact target text.
- Placeholder audio remains valid for authoring and blocked for production.
- Release evidence switches to `hold` when listening is attached as required while audio is still placeholder.
- Default candidate release still treats audio as honestly `not_required` until listening is explicitly required.
- Added a stricter gate that rejects `generated` or `approved` audio status inside authoring-only requirements.

Why this matters:
- Listening can become a premium feature only if the app never lies about media readiness.
- The next audio pipeline now has deterministic input: exact phrase ids and exact English target text.
- Required listening blocks cannot ship until real approved playable audio exists.

Research synthesis:
- Duolingo's public research emphasizes recall, progression, and large-scale learning data; for Phraseman this means listening prompts should be tied to exact content ids.
- Duolingo's review-exercise writeup supports reinforcing taught material later, which matches listening over already-authored day phrases.
- ELSA-style speech products show that speech/audio features need real media and precise feedback before they should look production-ready.

Files:
- `app/personal_plan_gavan_day1_listening_authoring.ts`
- `tests/personal_plan_gavan_day1_listening_authoring.test.ts`
- `docs/reports/personal-plans-p331-listening-authoring-requirements-2026-06-01.md`

Quality gate:
- Focused listening authoring tests passed: 1 suite, 6 tests.
- Focused audio/package/bridge/release/listening tests passed: 5 suites, 48 tests.
- Full Personal Plans suite passed: 65 suites, 379 tests.
- TypeScript passed: `npx tsc --noEmit --pretty false`.
- Targeted source guard found no UI/storage/live catalog/live quiz registry imports in listening authoring.
- Targeted encoding guard found no literal mojibake markers in changed P3.31 files.

Updated roadmap:
1. P3.32 prepare pronunciation authoring requirements for clean Gavan day 1 without fake scoring.
2. P3.33 create the first combined authoring readiness bundle for Gavan day 1.
3. P3.34 map audio/pronunciation authoring metadata into future exercise renderer requirements.

## Implementation update 2026-06-01 - P3.30 Release evidence output

Status: completed.

What changed:
- Added `buildGavanDay1ReleaseEvidence`.
- Release evidence now exposes a reviewer-friendly pure object for candidate `Gavan` day 1.
- Evidence includes:
  - day id;
  - live integration flag;
  - go/hold decision;
  - blocked sections;
  - accepted `not_required` sections;
  - candidate phrase count;
  - quiz item/choice/explanation counts;
  - task reason copy count;
  - content quality status;
  - section status and issue codes.
- Evidence covers all sections:
  - content;
  - package;
  - quiz;
  - copy;
  - audio;
  - pronunciation.
- Evidence includes safe copy preview from task reason copy, so DEV/review surfaces can inspect wording without pulling UI.
- Blocked evidence shows exact issue codes for quiz/copy/package failures.

Why this matters:
- This turns release review from a vague "looks okay" into an inspectable go/hold artifact.
- It helps future DEV screens show quality state without importing live catalog or quiz registry.
- It keeps audio and pronunciation honest: `not_required` is visible, while fake readiness stays blocked.

Research synthesis:
- Release-readiness guidance consistently favors explicit checklist evidence, section owners/status, and go/no-go decisions.
- For language-learning content, this is especially important because weak copy, fake personalization, and fake media readiness are product-trust failures.

Files:
- `app/personal_plan_gavan_day1_release_fixture.ts`
- `tests/personal_plan_gavan_day1_release_fixture.test.ts`

Quality gate:
- Focused release fixture/evidence tests passed: 1 suite, 9 tests.
- Full Personal Plans suite passed: 64 suites, 373 tests.
- TypeScript passed: `npx tsc --noEmit --pretty false`.
- Targeted source guard found no live catalog/quiz registry imports in the release fixture.
- Targeted encoding guard found no literal mojibake markers in changed release fixture files.

Updated roadmap:
1. P3.31 prepare honest audio/listening authoring requirements for clean day 1.
2. P3.32 add pronunciation authoring requirements without fake scoring.
3. P3.33 design first polished DEV/reviewer presentation using release evidence.

## Implementation update 2026-06-01 - P3.29 Gavan day 1 candidate rewrite

Status: completed.

What changed:
- Rewrote `Gavan` day 1 candidate phrases in clean Russian.
- Day 1 now uses universal-first phrases:
  - `I'm here.`
  - `I need a minute.`
  - `Could you repeat that?`
  - `I don't understand yet.`
  - `Can you help me?`
- Removed the rejected day 1 direction from candidate content:
  - no name drills;
  - no phone/email/address/private-data drills;
  - no apartment/viewing/doctor/bank narrow content;
  - no developer wording.
- Rewrote candidate quiz copy into clean user-facing Russian.
- Kept candidate quiz as 10 questions over the five candidate phrases.
- Rewrote task reason copy so task cards no longer carry corrupted Russian.
- Added tests for universal day-one content, clean quiz prompts, grounded explanations, and mojibake-free task reason copy.
- Preserved legacy fallback targets needed by attempt events, weak-spot analytics, and explanation cards.

Why this matters:
- This is the first candidate day after the reset that behaves like a product surface instead of an authoring artifact.
- The content is broad enough for many relocation/everyday situations without forcing private-data scripts.
- The quiz and reason-copy layers now match the same clean-copy standard as the content layer.

Research synthesis:
- Competitor complaints cluster around repetitive tasks, weak explanations, ads/upsells, speech-recognition frustration, and content that feels disconnected from real use.
- Strong learning loops combine active recall, spaced repetition, short feedback, and a clear reason for each task.
- For Phraseman, the winning path is not more screens first; it is a trustworthy daily loop where every card feels intentional and useful.

Files:
- `app/personal_plan_gavan_day1_content_candidate.ts`
- `app/personal_plan_gavan_day1_quiz_draft.ts`
- `app/personal_plan_task_reason_copy.ts`
- `tests/personal_plan_gavan_day1_content_candidate.test.ts`
- `tests/personal_plan_gavan_day1_quiz_draft.test.ts`
- `tests/personal_plan_task_reason_copy.test.ts`

Quality gate:
- Focused content/quiz/copy/release tests passed: 4 suites, 37 tests.
- Full Personal Plans suite passed: 64 suites, 370 tests.
- TypeScript passed: `npx tsc --noEmit --pretty false`.
- Targeted source guard found no live catalog/quiz registry imports.
- Targeted encoding guard found no literal mojibake markers in changed source/test files.

Updated roadmap:
1. P3.30 add reviewer-friendly release evidence output for the candidate day.
2. P3.31 start audio/listening prompt requirements for this clean day without fake generated audio.
3. P3.32 design first UI renderer polish pass using the clean candidate data.

## Implementation update 2026-06-01 - P3.28 Corrupted-copy gates

Status: completed.

What changed:
- Added `corrupted_copy` to `PersonalPlanContentQualityIssueCode`.
- Content quality now rejects mojibake/corrupted Cyrillic markers in phrase text, translations, explanations, options, words, and constructions.
- Added `candidate_quiz_corrupted_copy` to candidate quiz validation.
- Candidate quiz prompts, choices, and explanation notes now reject mojibake/corrupted Cyrillic markers.
- Added `corrupted_copy` to task reason copy validation.
- Task reason labels and bodies now reject mojibake/corrupted Cyrillic markers before future UI can render them.
- Release fixture now fails when candidate content contains corrupted copy.
- Test fixtures use Unicode escapes for intentional mojibake samples, so source files stay clean while runtime validation remains real.

Why this matters:
- This closes the biggest content-safety hole before final `Gavan` day 1 rewriting.
- The product can no longer pass release gates with visually broken Russian text.
- It prevents the exact failure mode seen earlier when Russian copy was corrupted by tooling.

Research synthesis:
- Mojibake research shows UTF-8/Windows codepage confusion is common and hard to repair after the fact.
- Localization QA guidance treats garbled text as a release-blocking bug, not a cosmetic issue.
- For a premium learning product, broken copy immediately destroys trust, especially inside explanations and task cards.

Files:
- `app/personal_plan_content_quality_contract.ts`
- `app/personal_plan_gavan_day1_quiz_draft.ts`
- `app/personal_plan_task_reason_copy.ts`
- `tests/personal_plan_content_quality_contract.test.ts`
- `tests/personal_plan_gavan_day1_quiz_draft.test.ts`
- `tests/personal_plan_task_reason_copy.test.ts`
- `tests/personal_plan_gavan_day1_release_fixture.test.ts`

Quality gate:
- RED confirmed content, quiz, task reason copy, and release fixture previously allowed corrupted copy.
- Focused content/quiz/copy/release tests passed: 4 suites, 35 tests.
- Full Personal Plans suite passed: 64 suites, 367 tests.
- TypeScript passed: `npx tsc --noEmit --pretty false`.
- Targeted source guard found no live catalog/quiz registry imports.
- Targeted encoding guard found no literal mojibake markers in changed source/test files.

Updated roadmap:
1. P3.29 rewrite `Gavan` day 1 candidate content in clean Russian using the universal-first phrase strategy.
2. P3.30 rewrite candidate quiz prompts/notes into final user-facing Russian without developer phrasing.
3. P3.31 add release fixture evidence snapshots for reviewer-friendly DEV reports.

## Implementation update 2026-06-01 - P3.27 Candidate release fixture

Status: completed.

What changed:
- Added a pure `GavanDay1ReleaseFixture` for candidate release gating.
- The fixture builds candidate content, non-production package draft, and production bridge with explicit content approval.
- The fixture stays marked as `candidate_release_gate` and `liveIntegration: false`.
- It exposes every release section:
  - `content`
  - `package`
  - `quiz`
  - `copy`
  - `audio`
  - `pronunciation`
- It exposes `productionCanRelease`, blocked sections, and accepted `not_required` sections.
- Added `validateGavanDay1ReleaseFixture`.
- Validation fails if candidate content is invalid.
- Validation fails if package, quiz, copy, audio, or pronunciation readiness fails.
- The fixture remains outside live catalog and live quiz registry.

Why this matters:
- This is the first one-object release gate for a Personal Plan day.
- It proves the system can evaluate all production readiness sections together without shipping the candidate to users.
- It gives future content work a clear target: a day is not "good" until the release fixture stays clean.

Research synthesis:
- Competitor research keeps pointing to the same product rule: users forgive small tasks, but not broken trust.
- Duolingo-style retention depends on reliable loops; Phraseman needs release gates that prevent weak loops from shipping.
- Speaking/listening competitors show high upside, but only when audio, pronunciation, feedback, and content are checked together.

Files:
- `app/personal_plan_gavan_day1_release_fixture.ts`
- `tests/personal_plan_gavan_day1_release_fixture.test.ts`

Quality gate:
- RED confirmed the fixture module did not exist.
- Focused fixture test passed: 1 suite, 5 tests.
- Focused fixture/package/bridge/content/quiz tests passed: 5 suites, 59 tests.
- Full Personal Plans suite passed: 64 suites, 363 tests.
- TypeScript passed: `npx tsc --noEmit --pretty false`.
- Targeted source guard found no live catalog/quiz registry imports.
- Targeted encoding guard found no mojibake markers in the new release fixture files.

Updated roadmap:
1. P3.28 start the new universal-first `Gavan` day 1 content pass using the release fixture.
2. P3.29 add content/copy mojibake guard to prevent corrupted Russian text from passing future release gates.
3. P3.30 prepare first UI-facing release-readiness summary for the future internal DEV checklist, not user UI.

## Implementation update 2026-06-01 - P3.26 Pronunciation readiness metadata

Status: completed.

What changed:
- Added `PlanPronunciationScoringRequirement` as a pure readiness contract.
- Pronunciation scoring now has honest states:
  - `not_required` when no pronunciation task is attached to the day;
  - `blocked` when pronunciation is required but scoring is not ready;
  - `ready` only when scorer/provider/version/result fields/minimum confidence/final readiness are present.
- Added `validatePlanPronunciationScoringRequirement`.
- Added `buildBlockedPlanPronunciationScoringRequirement` for authoring-safe blocked pronunciation tasks.
- `GavanDay1ProductionBridge.pronunciation` now reports requirement count, scoring availability, final scoring claims, and concrete issue codes.
- Fake final pronunciation claims are now limited to blocked requirements or package-level media claims.
- Ready pronunciation scoring metadata is no longer treated as fake just because `finalScoringReady` is true.
- Fixed the Russian exact-scoring claim gate so real Russian copy such as "точную оценку" and "в процентах" is blocked, not only corrupted text.

Why this matters:
- Pronunciation is one of the highest-trust premium features: if scoring is unreliable or fake, users notice immediately.
- This step lets Phraseman design pronunciation tasks without promising microphone/scoring behavior before the engine exists.
- Future UI can show pronunciation as pending, blocked, or ready without inventing capability.

Research synthesis:
- Busuu positions speaking practice as realistic conversation with AI feedback, but user complaints show recognition/scoring mistakes quickly damage trust.
- ELSA-style products win on specific speech feedback, which means Phraseman needs explicit scorer metadata before making premium scoring claims.
- Duolingo speaking complaints reinforce the same rule: if recognition is unavailable or inconsistent, the app must avoid punishing progress.

Files:
- `app/personal_plan_pronunciation_readiness.ts`
- `app/personal_plan_pronunciation_attempt.ts`
- `app/personal_plan_gavan_day1_production_bridge.ts`
- `app/personal_plan_harbor_week1_package_readiness.ts`
- `tests/personal_plan_pronunciation_readiness.test.ts`
- `tests/personal_plan_pronunciation_attempt.test.ts`
- `tests/personal_plan_gavan_day1_production_bridge.test.ts`
- `tests/personal_plan_harbor_week1_package_readiness.test.ts`

Quality gate:
- RED confirmed the old system had no scoring readiness module and the bridge lacked pronunciation issue details.
- Focused pronunciation/package/bridge tests passed: 4 suites, 39 tests.
- Full Personal Plans suite passed: 63 suites, 358 tests.
- TypeScript passed: `npx tsc --noEmit --pretty false`.
- Targeted source guard found no live catalog/quiz registry imports.
- Targeted encoding guard found no mojibake markers in changed pronunciation files.

Updated roadmap:
1. P3.27 create a candidate day 1 release/approval fixture that uses explicit content, package, quiz, copy, audio, and pronunciation readiness.
2. P3.28 start the new universal-first `Gavan` day 1 content pass.
3. P3.29 add renderer/view-model preparation for pronunciation only after the readiness contract is stable.

## Implementation update 2026-06-01 - P3.25 Audio/listening readiness metadata

Status: completed with one external TypeScript blocker noted.

What changed:
- Prepared audio/listening readiness for candidate `Gavan` day 1 without generating or pretending to have audio files.
- `GavanDay1ProductionBridge.audio` now distinguishes:
  - `not_required` when the day has no listening requirement;
  - `blocked` when a listening requirement exists only as placeholder metadata;
  - `ready` when an approved audio asset has concrete id, URI, target text, duration, voice id/provider, and final readiness.
- Placeholder audio remains valid for authoring, but blocks production release when it becomes a real listening requirement.
- Approved audio metadata is no longer misclassified as a fake final claim.
- Fake final claims are now limited to unapproved assets or package-level media claims.
- Audio section issues now include `audio_not_production_ready` when the section is blocked because required audio is not final.
- Week 1 package readiness now validates listening audio through `PlanAudioAsset` instead of a loose `status: ready` boolean.

Why this matters:
- Listening can become a high-value plan mode later without lowering honesty standards now.
- The system can represent future audio assets precisely while refusing to ship placeholders.
- This protects the premium promise: no invisible fake audio, no vague "ready" state, no accidental release.

Research synthesis:
- Duolingo separates practice into focused modes such as Listen, Speak, Mistakes, Stories, Radio, and Words; Phraseman should also treat listening as a first-class readiness area, not a generic task label.
- User complaints around broken speaking/listening practice show that audio modes are trust-sensitive: if they exist, they must work reliably or stay blocked.
- ELSA-style pronunciation products show that audio/speech can be a premium anchor, but only when asset/scoring readiness is explicit.

Files:
- `app/personal_plan_gavan_day1_production_bridge.ts`
- `app/personal_plan_harbor_week1_package_readiness.ts`
- `tests/personal_plan_gavan_day1_production_bridge.test.ts`
- `tests/personal_plan_harbor_week1_package_readiness.test.ts`

Quality gate:
- RED confirmed the old logic failed on approved audio and missing section issues.
- Focused audio/package/bridge tests passed: 3 suites, 29 tests.
- Full Personal Plans suite passed: 62 suites, 349 tests.
- Targeted source guard found no live catalog/quiz registry imports.
- Targeted encoding guard found no mojibake markers in changed files.
- `npx tsc --noEmit --pretty false` is currently blocked by unrelated `components/onboarding.tsx` style/type errors, not by the changed Personal Plans files.

Updated roadmap:
1. P3.26 prepare pronunciation practice readiness without fake scoring.
2. P3.27 create a candidate day 1 content approval fixture only after pronunciation readiness is honest.
3. P3.28 begin the new universal-first `Gavan` day 1 content pass with audio/pronunciation gates available.

## Implementation update 2026-06-01 - P3.24 Explicit production release criteria

Status: completed.

What changed:
- Added explicit `production` readiness to `GavanDay1ProductionBridge`.
- Bridge now exposes `production.canRelease`.
- Bridge now exposes required ready sections: `content`, `package`, `quiz`, `copy`.
- Bridge now exposes accepted `not_required` sections: `audio`, `pronunciation`.
- Bridge now exposes concrete criteria:
  - `contentApproved`
  - `packageReady`
  - `quizReady`
  - `copyReady`
  - `audioAcceptable`
  - `pronunciationAcceptable`
- Content approval alone is not enough if package, quiz, copy, audio, or pronunciation readiness fails.
- Audio/pronunciation `not_required` is accepted only when there are no requirements and no fake final claims.
- Fake final audio/pronunciation claims now block their own bridge sections instead of hiding behind package failure.

Why this matters:
- This is the first true release checklist for a Personal Plan day.
- It separates authoring quality, human approval, and production readiness.
- It prevents a premium feature from shipping because one boolean was flipped while another section was still weak.

Research synthesis:
- Duolingo's practice model shows the value of clear practice categories; Phraseman now mirrors that with explicit release criteria per section.
- Memrise difficult-word practice reinforces that evidence and targeting must remain concrete before review modes are trusted.
- Busuu study plans show habit framing, but Phraseman's release bridge now ensures the daily habit cannot ship with broken reinforcement.

Files:
- `app/personal_plan_gavan_day1_production_bridge.ts`
- `tests/personal_plan_gavan_day1_production_bridge.test.ts`

Quality gate:
- Focused bridge/package/quiz tests passed: 3 suites, 42 tests.
- Full Personal Plans suite passed: 62 suites, 345 tests.
- TypeScript passed: `npx tsc --noEmit --pretty false`.
- Targeted source guard found no live catalog/quiz registry imports.
- Targeted encoding guard found no mojibake markers in changed bridge test/source files.

Updated roadmap:
1. P3.25 prepare audio/listening readiness for candidate day 1 without fake generated audio.
2. P3.26 prepare pronunciation practice readiness without fake scoring.
3. P3.27 add a final day 1 approval fixture only after content, quiz, package, copy, audio, and pronunciation have explicit readiness states.

## Implementation update 2026-06-01 - P3.23 Production bridge quiz readiness

Status: completed.

What changed:
- Added `quiz` as a named section in `GavanDay1ProductionBridge`.
- Added `quiz_gate_failed` bridge issue code.
- Bridge summary now includes `quiz` in either `ready` or `blockers`.
- The quiz section reports item count, choice count, explanation requirement count, status, and issue codes.
- Candidate packages validate quiz readiness through candidate content phrases and candidate copy gate.
- Content approval remains separate: a good quiz can be ready while content approval still blocks production.
- A broken candidate quiz now blocks the bridge as `section: quiz`.
- Live catalog and live quiz registry remain untouched.

Why this matters:
- Production readiness can no longer silently ignore quiz quality.
- This makes the bridge closer to a real release checklist: content, package, quiz, copy, audio, pronunciation.
- It protects against a common product failure: approving nice phrases while shipping weak or mismatched reinforcement.

Research synthesis:
- Duolingo-style practice works because practice areas are explicit; this bridge now treats quiz as its own readiness area.
- Memrise-style difficult-item practice depends on exact item linkage; the quiz section keeps source alignment visible.
- Busuu study-plan habit loops need reliable daily tasks; quiz readiness prevents the daily plan from becoming unchecked filler.

Files:
- `app/personal_plan_gavan_day1_production_bridge.ts`
- `tests/personal_plan_gavan_day1_production_bridge.test.ts`

Quality gate:
- Focused bridge/package/quiz tests passed: 3 suites, 39 tests.
- Full Personal Plans suite passed: 62 suites, 342 tests.
- TypeScript passed: `npx tsc --noEmit --pretty false`.
- Targeted source guard found no live catalog/quiz registry imports.
- Targeted encoding guard found no mojibake markers in changed bridge/package/quiz files.

Updated roadmap:
1. P3.24 add explicit production approval/readiness input that can only report ready when content, package, quiz, copy, audio, and pronunciation are green or honestly not required.
2. P3.25 prepare audio/listening readiness for candidate day 1 without fake generated audio.
3. P3.26 prepare pronunciation practice readiness without fake scoring.

## Implementation update 2026-06-01 - P3.22 Candidate quiz copy honesty gate

Status: completed.

What changed:
- Extended `validateGavanDay1QuizDraft` with a candidate copy gate.
- Added candidate-specific issue codes:
  - `candidate_quiz_developer_copy`
  - `candidate_quiz_authoring_instruction`
  - `candidate_quiz_ungrounded_explanation_target`
  - `candidate_quiz_prompt_too_short`
- The gate blocks developer/internal terms in candidate prompts and explanation notes.
- The gate blocks authoring instructions such as `Explain that`.
- The gate blocks explanation targets that are not grounded in candidate phrase text, meaning, context, new words, or first-seen constructions.
- The gate blocks too-short prompts that do not clearly tell the learner what to do.
- Existing wrong-answer honesty still blocks feedback that pretends to know the selected wrong option without runtime context.
- `buildGavanDay1PackageDraft({ contentCandidate })` now validates the attached candidate quiz through the copy gate.
- Live catalog and live quiz registry remain untouched.

Why this matters:
- This turns the user's content standards into executable protection, not a memo.
- It prevents future regressions where polished candidate work is replaced by robotic authoring notes.
- It keeps the quiz product-ready: short, understandable, grounded, and honest.
- It protects the premium feeling before UI polish, because bad copy can make even expensive UI feel cheap.

Research synthesis:
- Duolingo's practice model is useful because practice modes have specific purposes; Phraseman now makes quiz purpose explicit through grounded targets.
- User complaints around personalized practice often mention repetitive, stale, or poorly targeted work; the target gate prevents quiz items from drifting away from real source phrases.
- Memrise-style difficult-word practice only works if the difficult item is concrete; grounded explanation targets keep that link.
- Busuu's study-plan framing supports regular habit loops, but Phraseman must avoid vague filler by enforcing prompt clarity.

Files:
- `app/personal_plan_gavan_day1_quiz_draft.ts`
- `app/personal_plan_gavan_day1_package_draft.ts`
- `tests/personal_plan_gavan_day1_quiz_draft.test.ts`

Quality gate:
- Focused quiz/package tests passed: 2 suites, 29 tests.
- Full Personal Plans suite passed: 62 suites, 339 tests.
- TypeScript passed: `npx tsc --noEmit --pretty false`.
- Targeted source guard found no live catalog/quiz registry imports.
- Targeted encoding guard found no mojibake markers in changed quiz/package files.

Updated roadmap:
1. P3.23 add candidate quiz readiness as a named section in the production bridge.
2. P3.24 make production readiness require candidate content approval plus candidate quiz readiness.
3. P3.25 begin the first audio/listening readiness bridge for the same day without fake generated audio.

## Implementation update 2026-06-01 - P3.21 Gavan day 1 quiz candidate integration

Status: completed.

What changed:
- `buildGavanDay1QuizDraft` can now accept a `GavanDay1ContentCandidate`.
- Candidate-based quiz drafts use the new candidate phrase ids:
  - `gavan-day1-final-p1`
  - `gavan-day1-final-p2`
  - `gavan-day1-final-p3`
  - `gavan-day1-final-p4`
  - `gavan-day1-final-p5`
- The candidate quiz still has exactly 10 questions.
- Each candidate phrase receives two quiz items.
- Quiz explanation targets are limited to candidate meanings, phrase text, new words, first-seen constructions, or context.
- Candidate-facing prompts and notes avoid developer instructions such as `Explain that`.
- Wrong-choice feedback still cannot pretend to know the selected wrong answer unless runtime context is explicitly declared.
- `buildGavanDay1PackageDraft({ contentCandidate })` now attaches a candidate-aligned quiz.
- Live quiz registry and live plan catalog remain untouched.

Why this matters:
- Day 1 no longer has a package/content mismatch.
- The quiz now reinforces the same five broad human phrases that the reset selected.
- This directly addresses the earlier product issue: no old identity/contact/address leftovers and no narrow apartment-specific quiz.
- The work stays reviewable because live registry integration is still gated.

Research synthesis:
- Duolingo's Practice Tab separates mistakes, listening, speaking, words, and story/radio practice; Phraseman mirrors the useful idea by giving the quiz a specific reinforcement role instead of a generic test.
- Memrise Difficult Words and wordlists reinforce that difficult material should return with clear targeting; quiz explanation targets now point to concrete phrase-level learning objects.
- Busuu Study Plan reinforces habit structure; Phraseman adds stronger quality gates so the habit does not become repetitive filler.
- ELSA-style pronunciation remains separate and gated; this quiz step does not fake speech scoring or audio readiness.

Files:
- `app/personal_plan_gavan_day1_quiz_draft.ts`
- `app/personal_plan_gavan_day1_package_draft.ts`
- `tests/personal_plan_gavan_day1_quiz_draft.test.ts`
- `tests/personal_plan_gavan_day1_package_draft.test.ts`

Quality gate:
- Focused quiz/package tests passed: 2 suites, 24 tests.
- Full Personal Plans suite passed: 62 suites, 334 tests.
- TypeScript passed: `npx tsc --noEmit --pretty false`.
- Targeted source guard found no live catalog/quiz registry imports.
- Targeted encoding guard found no mojibake markers in the changed quiz/package files.

Updated roadmap:
1. P3.22 add a stricter quiz copy and explanation quality gate so candidate quiz text cannot regress.
2. P3.23 add candidate quiz coverage into the production bridge as a named section.
3. P3.24 prepare explicit approval wiring only after content, quiz, package, copy, audio, and pronunciation gates are all visible.

## Implementation update 2026-06-01 - P3.20 Gavan day 1 package candidate integration

Status: completed.

What changed:
- The non-production `GavanDay1PackageDraft` can now accept a `GavanDay1ContentCandidate`.
- Package content now exposes its source: `blueprint_draft` or `candidate`.
- Candidate phrase ids are carried inside `draft.content.phrases`.
- Explanation requirements are built from the candidate's new words and first-seen constructions when candidate content is attached.
- Package summary now reports `contentPhrases`.
- Invalid candidate content blocks the package with `invalid_content_candidate`.
- The day 1 quiz draft remains separate, draft-only, and not pushed into the live quiz registry.
- The production bridge still blocks until explicit content approval.
- Source guards still prevent live catalog and live quiz registry imports.

Why this matters:
- This is the first safe bridge from reset content into the plan package without shipping it.
- It lets the team validate day content, explanations, quiz, copy, audio, and pronunciation as one package.
- It preserves the product rule: good content can move forward through gates, but nothing goes live by accident.

Research synthesis:
- Duolingo's official practice surfaces reinforce the need for separated practice purposes and mistake review, not one generic repeat bucket.
- Memrise's public positioning around spaced repetition and authentic clips reinforces candidate-first content plus later audio/listening layers.
- Busuu's study-plan model supports regular habit framing, but Phraseman must avoid calendar promises and keep daily work evidence-backed.
- ELSA-style pronunciation value should remain behind honest readiness gates until scoring confidence is real.

Files:
- `app/personal_plan_gavan_day1_package_draft.ts`
- `tests/personal_plan_gavan_day1_package_draft.test.ts`

Quality gate:
- Focused package/candidate/bridge tests passed: 3 suites, 27 tests.
- Full Personal Plans suite passed: 62 suites, 330 tests.
- TypeScript passed: `npx tsc --noEmit --pretty false`.

Updated roadmap:
1. P3.21 update the non-production day 1 quiz draft to use candidate phrase ids and explanation targets, still outside the live quiz registry.
2. P3.22 add a stricter quiz prompt/copy honesty gate for candidate-based quiz items.
3. P3.23 only after all gates are green, prepare an explicit approval switch for the production bridge.

## Implementation update 2026-06-01 - P3.19 Gavan day 1 content candidate

Status: completed.

What changed:
- Added a pure `GavanDay1ContentCandidate`.
- The candidate contains five broad day-one phrases:
  - `I'm here.`
  - `I need a minute.`
  - `Could you repeat that?`
  - `I don't understand yet.`
  - `Can you help me?`
- Each phrase includes new-word and first-seen-construction explanation coverage.
- The candidate stays outside UI, onboarding, Premium, Home, live catalog, live quiz registry, and storage writes.
- Production bridge remains blocked until content approval is explicit.

Why this matters:
- The reset needs a high-quality content atom before UI polish or live integration.
- This directly fixes the earlier content problem: no names, no phone/email, no apartment-only day 1, no fake specificity.
- The phrases are socially safe, short, broadly useful, and reusable across relocation, travel, work, service, and everyday uncertainty.

Research synthesis:
- Duolingo's Practice Hub separates mistakes, listening, speaking, words, stories, and radio; the useful idea is variety, but the content must still be simple and purpose-led.
- Memrise spaced repetition reinforces that wrong items should return on a schedule, not disappear into generic repetition.
- Busuu methodology emphasizes useful chunks that learners can immediately use in controlled and freer practice.
- Busuu Conversations reinforces that scenario practice should complement already-learned grammar and vocabulary.
- ELSA and speech-review research reinforce that speaking features must not overpromise scoring before the scoring layer is reliable.

Files:
- `app/personal_plan_gavan_day1_content_candidate.ts`
- `tests/personal_plan_gavan_day1_content_candidate.test.ts`

Quality gate:
- Focused content candidate tests passed: 1 suite, 6 tests.
- Full Personal Plans suite passed: 62 suites, 325 tests.
- TypeScript passed: `npx tsc --noEmit --pretty false`.

Updated roadmap:
1. P3.20 connect the approved candidate into the non-production package draft only, then rerun the production bridge.
2. P3.21 update the draft quiz requirement to use the approved candidate phrases without touching live quiz registry.
3. P3.22 prepare live catalog integration only after bridge status can become green through explicit approval.

## Implementation update 2026-06-01 - P3.18 Gavan day 1 production bridge

Status: completed.

What changed:
- Added a pure `GavanDay1ProductionBridge`.
- The bridge keeps authoring readiness separate from production readiness.
- Gavan day 1 now reports `blocked` while content remains draft/scaffold-only.
- The bridge exposes package, copy, audio, and pronunciation readiness in one object.
- Audio status can be `not_required` without claiming fake final audio.
- Pronunciation status can be `not_required` without claiming fake scoring.
- Broken package/copy/audio/pronunciation gates become explicit blockers.
- The bridge source is guarded from live catalog and live quiz registry imports.

Why this matters:
- This prevents accidental shipping of draft content just because lower-level authoring gates pass.
- The product now has a single integration checkpoint before live catalog changes.
- It gives future UI/integration work a clean readiness summary instead of scattered booleans.

Files:
- `app/personal_plan_gavan_day1_production_bridge.ts`
- `tests/personal_plan_gavan_day1_production_bridge.test.ts`

Quality gate:
- Focused production bridge tests passed: 1 suite, 7 tests.
- Full Personal Plans suite passed: 61 suites, 319 tests.
- TypeScript passed: `npx tsc --noEmit --pretty false`.

Updated roadmap:
1. P3.19 start final Gavan day 1 content replacement using reset rules and this bridge as the final gate.
2. P3.20 connect approved day 1 content into draft package outputs while still avoiding live catalog edits until all gates pass.
3. P3.21 prepare the first live catalog/quiz registry integration only after approved content has a green bridge.

## Implementation update 2026-06-01 - P3.17 pronunciation attempt contract

Status: completed.

What changed:
- Added a pure `PlanPronunciationAttempt` contract.
- Pronunciation now has explicit modes: `practice` and `scored`.
- Practice attempts can store recording metadata and count completion without requiring a score.
- Scored attempts require a real scoring provider, scoring version, recognition confidence, and score.
- Low recognition confidence cannot penalize progress.
- UI copy claims can be validated so the app does not promise exact pronunciation scoring before scoring is available.
- Empty and failed recordings must include explicit failure reasons.
- Pronunciation attempt payloads reuse sensitive-data sanitization before storage.

Why this matters:
- Speaking practice is a premium-feeling feature only if it is honest.
- Negative review research shows users lose trust when speech recognition marks correct speech wrong or punishes technical failure.
- This contract lets Phraseman add speaking practice gradually: first safe practice, then scored mode only when the scoring engine is real.

Files:
- `app/personal_plan_pronunciation_attempt.ts`
- `tests/personal_plan_pronunciation_attempt.test.ts`

Research synthesis:
- ELSA reviews and speech-recognition complaint scans show that pronunciation products are trusted when feedback is clear and distrusted when scoring feels random.
- Duolingo speaking complaints show the same failure mode: users may enjoy speaking tasks, but broken recognition quickly turns into frustration.
- The product rule for Phraseman: recording and retry can be friendly; scoring and penalties require reliable confidence.

Quality gate:
- Focused pronunciation contract tests passed: 1 suite, 6 tests.
- Full Personal Plans suite passed: 60 suites, 312 tests.
- TypeScript passed: `npx tsc --noEmit --pretty false`.

Updated roadmap:
1. P3.18 add guarded production adapter/readiness bridge for Gavan day 1 only after copy/audio/pronunciation gates pass.
2. P3.19 start final Gavan day 1 content replacement with the new reset rules.
3. P3.20 begin Gavan week 1 content blocks after day 1 is quality-gated.

## Implementation update 2026-06-01 - P3.16 audio asset readiness

Status: completed.

What changed:
- Added a pure `PlanAudioAsset` readiness contract.
- Audio assets now have status, block id, content unit ids, target text, locale, optional asset id, URI, duration, voice id, provider, and final readiness.
- Placeholder audio is valid for authoring but not production-ready.
- Approved audio is production-ready only when all final metadata exists.
- Fake final audio claims on placeholder/generated assets are blocked.
- Failed assets must include a failure reason.
- Gavan week 1 package readiness now validates listening blocks through the audio asset contract.
- Listening placeholder assets are built from the week blueprint phrase text instead of empty flags.

Why this matters:
- Listening tasks can now be designed before the audio pipeline exists without lying to the user.
- Future UI can distinguish "reserved listening task" from "real playable audio".
- This avoids the common language-app trust failure where audio/speech features appear ready but are broken or generic.

Files:
- `app/personal_plan_audio_asset_readiness.ts`
- `tests/personal_plan_audio_asset_readiness.test.ts`
- `app/personal_plan_harbor_week1_package_readiness.ts`
- `tests/personal_plan_harbor_week1_package_readiness.test.ts`

Quality gate:
- Focused audio/package tests passed: 2 suites, 12 tests.
- Full Personal Plans suite passed: 59 suites, 306 tests.
- TypeScript passed: `npx tsc --noEmit --pretty false`.

Updated roadmap:
1. P3.17 design pronunciation attempt/scoring contract honestly.
2. P3.18 add guarded production adapter for Gavan day 1 only after copy/audio/pronunciation gates pass.
3. P3.19 start final Gavan day 1 content replacement with the new gates.

## Implementation update 2026-06-01 - P3.15 task reason copy

Status: completed.

What changed:
- Added a pure copy adapter for task-selection reasons.
- Every `PlanTaskSelectionReasonCode` now has short production copy.
- Copy is kept out of UI and out of the engine's selection logic.
- The adapter blocks developer/internal terms such as `block`, `contentUnit`, `weakSpot`, `renderer`, `destination`, and `active recall`.
- The adapter blocks banned user-facing wording such as `сцена`, `маршрут`, `плановый`, and `применяем конструкцию`.
- Weak-spot recovery copy is blocked without concrete weak-spot evidence.
- Recall/trainer/mistake-review copy is blocked without real due counts.
- A bundle builder converts task-selection readiness into `copiesByBlockId` for future UI.
- The non-production `Gavan` day 1 package draft now exposes `personalization.taskReasonCopy`.

Why this matters:
- Future plan cards can explain why a task exists without showing robotic/dev text.
- The copy layer prevents fake personalization: the system cannot say "we brought this back for you" unless evidence exists.
- This protects the premium feel before visual UI polish starts.

Files:
- `app/personal_plan_task_reason_copy.ts`
- `tests/personal_plan_task_reason_copy.test.ts`
- `app/personal_plan_task_selection_reasons.ts`
- `app/personal_plan_gavan_day1_package_draft.ts`
- `tests/personal_plan_gavan_day1_package_draft.test.ts`

Quality gate:
- Focused task reason copy tests passed: 1 suite, 5 tests.
- Focused package/selection/copy tests passed: 3 suites, 18 tests.
- Full Personal Plans suite passed: 58 suites, 300 tests.
- TypeScript passed: `npx tsc --noEmit --pretty false`.

Updated roadmap:
1. P3.16 add audio asset readiness contract for listening tasks.
2. P3.17 design pronunciation attempt/scoring contract honestly.
3. P3.18 add guarded production adapter for Gavan day 1 only after copy/audio/pronunciation gates pass.
4. P3.19 then start replacing draft content with first truly approved Gavan day 1 content.

## Implementation update 2026-06-01 - P3.14 task-selection reasons

Status: completed.

What changed:
- Added a pure task-selection reason readiness module.
- Every exercise block now gets a structural reason such as lesson foundation, new phrase practice, natural choice practice, listening practice, quiz check, or recall.
- Weak-spot recovery reasons are added only when the weak-spot summary references content units that are actually inside the block.
- Recall/trainer/mistake due counts can be attached from the weak-spot summary.
- The validator blocks missing task reasons, weak-spot reasons without weak-spot ids, and due reasons without due counts.
- The non-production `Gavan` day 1 package draft now exposes personalization readiness with weak-spot summary and task-selection reasons.
- Package summary now includes weak-spot count, task-selection reason count, and weak-spot task-selection reason count.

Why this matters:
- This is the bridge from "we detected a weak spot" to "the learner can understand why this task exists".
- It prevents fake personalization: a task cannot claim recovery/personal value unless there is concrete evidence.
- It prepares P3.15, where these semantic reason codes can become warm user-facing copy without letting robotic/dev text reach the UI.

Research synthesis:
- Duolingo's official Practice tab separates mistakes, listening, speaking, stories, radio, and words; the useful lesson is that practice needs explicit purpose, not one generic repeat bucket.
- Duolingo's spaced repetition write-up says personalized practice uses spacing plus accuracy; Phraseman now has the evidence path needed to avoid random repeats.
- Memrise Difficult Words marks words as difficult from past wrong answers; Phraseman mirrors the useful part but keeps content-unit evidence visible.
- Busuu's methodology emphasizes useful chunks and controlled/free practice; Phraseman keeps each plan block tied to a purpose before UI.

Files:
- `app/personal_plan_task_selection_reasons.ts`
- `tests/personal_plan_task_selection_reasons.test.ts`
- `app/personal_plan_gavan_day1_package_draft.ts`
- `tests/personal_plan_gavan_day1_package_draft.test.ts`

Quality gate:
- Focused task-selection tests passed: 1 suite, 4 tests.
- Focused package/weak-summary tests passed: 3 suites, 16 tests.
- Full Personal Plans suite passed: 57 suites, 294 tests.
- TypeScript passed: `npx tsc --noEmit --pretty false`.

Updated roadmap:
1. P3.15 turn semantic task-selection reasons into user-facing copy keys/text with anti-robotic gates.
2. P3.16 add audio asset readiness for listening tasks.
3. P3.17 design pronunciation attempt/scoring contract honestly.
4. P3.18 add guarded production adapter for Gavan day 1 only after copy/audio gates pass.

## Implementation update 2026-06-01 - P3.13 weak-spot summary

Status: completed.

What changed:
- Added a pure weak-spot/recovery summary module.
- The summary consumes `PlanAttemptEvent[]` and `PlanRecoveryCandidate[]`.
- It counts attempts by result.
- It counts due work for recall, trainer, and mistake analytics.
- It groups weak spots by grammar, vocabulary, and mistake tags.
- It preserves plan instance, block, day, and content unit references.
- It supports current plan instance filtering.
- It excludes payload and sensitive values from output.

Why this matters:
- Personal Plans now have an explainable bridge from mistakes to tomorrow's tasks.
- This avoids the competitor failure mode where "personalized practice" feels random or stuck on irrelevant words.
- It gives future UI the data needed to say, in friendly copy, why a task was selected.

Quality gate:
- Focused weak-spot summary tests passed: 1 suite, 4 tests.
- Full Personal Plans suite passed: 56 suites, 289 tests.
- TypeScript passed: `npx tsc --noEmit --pretty false`.

Updated roadmap:
1. P3.14 attach weak-spot summary to day/package readiness.
2. P3.15 generate task-selection reasons from summary without robotic copy.
3. P3.16 wire audio asset requirements for listening tasks.
4. P3.17 design pronunciation attempt contract honestly.
5. P3.18 prepare guarded catalog adapter for Gavan day 1.

## Implementation update 2026-06-01 - P3.12 attempt-event adapter

Status: completed.

What changed:
- Added a pure adapter that builds Personal Plan attempt events from quiz and phrase answers.
- Quiz attempts use item + chosen choice.
- Phrase attempts use expected/selected answer.
- Correct quiz attempts can count toward progress.
- Wrong quiz and phrase attempts cannot count toward progress.
- Wrong attempts produce recovery candidates through existing recovery policy.
- Sensitive payload values are sanitized by the existing attempt event factory.
- Unknown choices, wrong block type, missing correct choices, and content-unit mismatches are blocked.

Why this matters:
- This is the first real bridge from "learner answered something" to "the plan can adapt".
- It makes future weak spots, recall, trainer tasks, and analytics data-driven instead of decorative.
- It also protects trust: the system records selected answers only when it actually has selected answer text.

Quality gate:
- Focused attempt adapter tests passed: 1 suite, 5 tests.
- Full Personal Plans suite passed: 55 suites, 285 tests.
- TypeScript passed: `npx tsc --noEmit --pretty false`.

Updated roadmap:
1. P3.13 summarize attempt/recovery output into weak-spot signals.
2. P3.14 connect weak-spot summary to day/package quality.
3. P3.15 start audio asset requirement wiring for listening tasks.
4. P3.16 add pronunciation attempt contract after audio/scoring requirements are honest.
5. P3.17 prepare guarded catalog adapter for Gavan day 1 only after all gates pass.

## Implementation update 2026-06-01 - P3.11 explanation-card adapter

Status: completed.

What changed:
- Added a pure Personal Plans explanation-card adapter.
- The adapter converts quiz explanation requirements into `PlanExplanationCard` models.
- Correct feedback uses supportive tone.
- Wrong feedback uses correction tone.
- Authoring markers such as `Explain that` are stripped before UI output.
- Selected-answer-aware feedback is blocked unless runtime provides the selected choice.
- Wrong-answer copy that claims an unknown selected option is blocked.
- Developer/placeholder copy is blocked.

Why this matters:
- This closes the gap between "we have explanation requirements" and "the learner sees a trustworthy explanation".
- It directly addresses the earlier product complaint: explanations must not describe imaginary options or sound like developer drafts.
- It prepares one reusable path for plan phrase build, missing-word tasks, and plan quizzes.

Quality gate:
- Focused explanation adapter tests passed: 1 suite, 6 tests.
- Full Personal Plans suite passed: 54 suites, 280 tests.
- TypeScript passed: `npx tsc --noEmit --pretty false`.

Updated roadmap:
1. P3.12 convert explanation/quiz/phrase answers into analytics-ready attempt events.
2. P3.13 feed wrong attempts into recovery candidates for recall, trainer, and mistake analytics.
3. P3.14 connect explanation cards to day package draft summaries.
4. P3.15 start audio asset requirement wiring for listening tasks.
5. P3.16 prepare guarded catalog adapter for Gavan day 1 only after all gates pass.

## Implementation update 2026-06-01 - P3.10 package owns quiz draft

Status: completed.

What changed:
- Connected the P3.9 Gavan day 1 quiz draft to the Gavan day 1 package draft.
- The package now exposes `quizDraft`.
- The package summary now includes `quizItems` and `quizExplanationRequirements`.
- The package validator now runs `validateGavanDay1QuizDraft`.
- If the quiz draft is invalid, the package emits `invalid_day1_quiz_draft`.
- The package quiz requirement must match the attached quiz draft item count.

Quality gate:
- Focused package draft tests passed: 1 suite, 7 tests.
- Combined day 1 package + quiz draft tests passed: 2 suites, 13 tests.
- Full Personal Plans suite passed: 53 suites, 275 tests.
- TypeScript passed: `npx tsc --noEmit --pretty false`.

Why this matters:
- Before P3.10, the day could claim it needed a 10-question quiz, while the real draft quiz lived separately.
- Now the day package behaves like a coherent authoring unit: tasks, quiz, explanations, and readiness are checked together.
- This is a direct protection against weak content entering production through a partial gate.

Updated roadmap:
1. P3.11 create runtime explanation-card adapter for correct/wrong feedback.
2. P3.12 turn quiz/phrase attempts into analytics-ready attempt events.
3. P3.13 attach weak-spot/recovery policy to wrong quiz choices.
4. P3.14 start audio asset requirement wiring for listening tasks.
5. P3.15 only then prepare a guarded catalog adapter for Gavan day 1.

## Current Decision

The previous `Gavan` day 1 and day 2 content is rejected and must not be used as the product standard.

Reset rules:

- Do not start the plan with narrow identity/contact/address/apartment content.
- Do not force names, phone numbers, email, specific addresses, apartment numbers, or fake personal details into early plan phrases.
- Do not make days feel like fixed school topics such as "Day 1: who I am".
- Do not reuse one daily template forever.
- Do not explain wrong answers by inventing choices the learner may not have selected.
- Do not ship plan content until it passes a human-quality content gate, not only parser checks.

Code status after reset:

- `Gavan` no longer activates the rejected certified day 1/day 2 content.
- `gavan_identity_day1`, `gavan_address_day2`, `gavan_day1_identity`, and `gavan_day2_address` are blocked from product APIs.
- The plan system mechanics remain available: plan routing, plan task ids, `planInstanceId`, recall mode, mistake context, trainer context, and teaching-note UI wiring.

## Competitor Research Notes

Sources:

- Duolingo spaced repetition: https://blog.duolingo.com/spaced-repetition-for-learning/
- Duolingo Practice tab: https://blog.duolingo.com/guide-to-duolingo-practice-hub/
- Memrise product page: https://www.memrise.com/
- Busuu press PDF: https://www.busuu.com/press/_03-links/all-about-busuu.pdf
- ELSA Speak feedback docs: https://elsanow.freshdesk.com/en/support/solutions/articles/31000177480-feedback

### What To Take

Duolingo:

- Short daily loops with immediate feedback.
- Mistake review at the end of lessons.
- Spaced repetition that uses both timing and accuracy.
- Separate practice entry points: mistakes, words, speaking, listening.
- Clear progress pressure without heavy explanation on every screen.

Memrise:

- Phrases selected by user reason, not abstract textbook units.
- Real voice/audio feeling: natural speed, accents, rhythm, emotion.
- Practice modes include pronunciation, sentence building, listening, and AI speaking.
- Product promise is "sound natural, not textbook".

Busuu:

- Structured curriculum with small, incremental difficulty.
- Microlearning: one task or concept at a time.
- Meaningful chunks of 2-5 words.
- Review split between vocabulary and grammar.
- Community/feedback mindset: learner feels corrected by a helpful human, not punished by a machine.

ELSA:

- Pronunciation must be scored on multiple dimensions, not just "right/wrong".
- Useful feedback buckets: pronunciation, intonation, fluency, grammar, vocabulary.
- Learner should be able to compare target audio with their own recording.
- Highlighted text/word feedback is important for making speech correction understandable.

## Phraseman App Atlas

Already present:

- Existing lesson engine with phrase building and word distractors.
- Plan task routing into lessons and plan phrase modes.
- Quiz engine with plan quiz support.
- Active recall and trainer queues.
- Mistake log with token/category metadata.
- Personal trainer store with due items, weak spots, phrase/word queues.
- Flashcards and audio flashcards.
- Home plan card and plan progress state.
- Premium/onboarding plan context pieces.
- Cloud sync keys for personal plan state.
- Teaching-note UI after answering.

Major gaps:

- No approved plan content strategy after reset.
- No varied daily workout model; generated days still behave like a scaffold.
- No real generated listening audio asset pipeline; current audio is mainly speech/TTS style.
- No full pronunciation mechanism for plan tasks.
- No content unit model that separates universal phrases, plan flavor, lesson prerequisites, audio, explanation, and analytics.
- No quality gate for social acceptability, broad usefulness, natural English, exercise variety, and explanation honesty.
- No "answer-level explanation contract" that prevents invented wrong-choice feedback.

## New Product Direction

Personal Plans should be adaptive daily workouts, not a calendar of narrow topics.

The route can have a theme (`Gavan`, `Voyazh`, `Mitap`, `Impuls`, `Echo`), but the first week should teach universal communication moves that almost everyone accepts as useful:

- ask for help;
- say you do not understand;
- ask someone to repeat;
- say you need a minute;
- confirm what you heard;
- ask where to go;
- say something works / does not work;
- say you are looking for something;
- say you want to check one detail;
- answer briefly without panic.

The route flavor changes examples later, but early phrases must be broad and socially safe.

## Daily Workout Model

The four onboarding time choices stay fixed:

- 5 min: 1 high-value task.
- 10 min: 2 tasks.
- 15 min: 3 tasks.
- 20 min: 4 tasks.

Daily task variety must rotate. A week should not repeat the same pattern every day.

Candidate exercise types:

- Lesson slice: existing lesson phrases, only if prerequisites match.
- Phrase build: same core as lessons, but with plan-owned phrases.
- Missing word: one blank, common phrase, low friction.
- Choose natural phrase: pick the phrase a real person would say.
- Listen and choose: generated audio, no text first.
- Listen and build: audio first, assemble phrase.
- Listen and type: short phrase, forgiving punctuation.
- Pronunciation repeat: record, compare, score.
- Quick reply: choose or say a short response under light time pressure.
- Error repair: fix a phrase the learner previously missed.
- Active recall: no hints, missed items return later.
- Card sprint: only if enough due cards exist.
- Trainer weak spot: only if real trainer queue has enough due content.
- Micro-dialogue: 2-3 turns, no "scene" wording.

## Explanation Contract

Correct answer:

- Explain why the phrase works.
- Keep it short and human.
- Explain new words the first time they appear.

Wrong answer:

- Explain the target idea and the correct phrase.
- Mention the selected wrong option only if the app knows the exact selected option.
- Never describe imaginary alternatives.
- Never say "you chose X" unless the code actually has X.
- Never use technical copy such as source, destination, route counter, construction, dev, active recall.

Example standard:

- Good: "Use `I need help` when the main idea is simple: you need help. It is direct and polite enough for a shop, office, airport, or street."
- Bad: "You chose `You're help`, so..." unless `You're help` is the actual selected choice.

## Pronunciation Mechanism Target

Plan pronunciation tasks need a real loop:

1. Play target audio generated as a natural spoken clip.
2. Learner records their version.
3. App transcribes or aligns the recording.
4. Score is split into understandable buckets:
   - words captured;
   - stressed word;
   - rhythm/pace;
   - hard sound;
   - confidence / hesitation.
5. Feedback is specific but kind.
6. Missed words/sounds become trainer or recall items.
7. User can retry or continue.

Minimum viable version:

- Use generated target audio assets per phrase.
- Record user audio.
- Compare transcript to target phrase.
- Store attempt, score, weak word/sound.
- Add failed phrase to plan recall and trainer.

Later version:

- Phoneme-level feedback.
- Native-like rhythm comparison.
- Target accent variants.
- Before/after progress chart.

## Generated Audio Target

Listening tasks should not rely on generic device TTS for the premium plan feel.

Audio asset requirements:

- One canonical natural clip per phrase.
- Optional variants: slower, natural, noisy/background, different speaker.
- Asset metadata: phrase id, speaker style, speed, accent, duration, transcript, plan id, day id, exercise type.
- Listening tasks must be able to hide text first.
- Audio failures need fallback to existing speech system without breaking the task.

## Content Quality Gate

Every authored plan day must pass:

- Has no rejected narrow personal data in early universal days.
- Uses socially normal English.
- Uses common, reusable phrases.
- Has no textbook-stiff phrases unless explicitly teaching formal register.
- Has no plan/dev/internal copy.
- Uses only grammar already introduced or includes a micro-explanation before/after.
- Every new word has a learner-friendly note.
- Wrong-answer feedback does not hallucinate choices.
- Includes enough variety for the selected time budget.
- Has clear analytics mapping: phrase id, grammar tag, vocabulary tag, skill, mistake category.
- Has a recovery rule: wrong items return through recall/trainer.
- Has a clear completion rule: finished day unlocks tomorrow after date/day transition.

## First Implementation Map

P0 reset:

- Keep rejected Gavan day 1/day 2 out of active product APIs.
- Stop treating old Gavan content as certified.
- Update docs and tests so future work cannot accidentally revive it.

P1 product spec:

- Define `PlanContentUnit`, `PlanExerciseType`, `PlanWorkoutBlock`, `PlanAudioAsset`, `PlanPronunciationAttempt`, `PlanExplanationCard`.
- Define daily workout templates for 5/10/15/20 minutes.
- Define explanation contract in code and docs.
- Define content lint gates for naturalness and forbidden patterns.

P2 mechanics:

- Add varied plan exercise renderer.
- Add missing-word and choose-natural-phrase modes.
- Add listening task shell with generated audio asset lookup and TTS fallback.
- Add pronunciation task shell with record/transcript/score storage.
- Connect wrong plan attempts to mistake log, trainer, active recall, and analytics.

P3 content:

- Write `Gavan` week 1 from scratch using universal-first phrases.
- Do not write 18 weeks yet.
- Treat week 1 as the standard pack: content, audio metadata, explanations, quiz, recall, QA passport.

## Audit 2: Exercise Mechanics Map

Research basis:

- Duolingo: short mixed exercises, Practice Hub, mistake review, spaced repetition.
- Memrise: authentic/native video and audio, sentence building, listening, pronunciation, AI speaking.
- Busuu: structured grammar/vocabulary review, level-appropriate AI conversations, feedback on grammar and word choice.
- ELSA: pronunciation scoring, speech feedback, intonation/fluency/pronunciation buckets.
- Simpler/EWA: bite-sized grammar drills, associative vocabulary, stories/dialogues, native-voiced phrases, movie/book snippets.

Main conclusion:

Personal Plans should become a daily workout engine. A day is not a topic page. A day is a small set of exercise blocks selected by level, time budget, previous mistakes, due review, plan goal, and available app content.

### Exercise Type 1: Phrase Build

Competitor pattern:

- Duolingo uses word ordering because it is fast, low-friction, and gives immediate success/failure.
- Simpler uses sentence completion and translation drills for grammar structure.

Trains:

- Word order.
- Basic grammar pattern.
- Phrase memory.
- Confidence that the learner can produce the phrase, not only recognize it.

Why it retains:

- Quick visible progress.
- Easy to understand.
- Works well on mobile.
- Learner feels "I made a sentence myself".

Phraseman adaptation:

- Reuse the existing lesson phrase-building core.
- Plan phrase build must use plan-owned `PlanContentUnit`, not random scenario text.
- Early phrases must be broad and reusable: help, repeat, wait, check, understand, find, confirm.
- Wrong answers go to plan recall, trainer, mistake analytics.

Needed data:

- `contentUnitId`
- phrase id
- token rows
- distractors
- grammar tags
- vocabulary tags
- prerequisite lesson ids
- explanation cards
- mistake category per token

Mistakes not to repeat:

- Do not use narrow personal data early.
- Do not use fake names/phone/email/address unless the day explicitly teaches that and user context needs it.
- Do not create phrases with grammar the learner has not seen.
- Do not highlight correct words in strict recall mode.

First MVP:

- Add a neutral `plan_phrase_build` exercise type using the lesson builder.
- Create 8-12 universal phrase units, but only after the new gates exist.

### Exercise Type 2: Missing Word

Competitor pattern:

- Duolingo and Simpler use fill-the-gap because it isolates one decision.
- It feels easier than full phrase assembly but still trains grammar/vocabulary.

Trains:

- One target word.
- Preposition, pronoun, auxiliary, or core verb choice.
- Recognition under light pressure.

Why it retains:

- Fast win.
- Good for 5-minute users.
- Helps learners see one problem clearly.

Phraseman adaptation:

- Use it after a phrase has appeared once in build/listen mode.
- Pick one target token, not random blanks.
- The explanation must describe the target word and meaning, not imaginary wrong options.

Needed data:

- phrase id
- blank token index
- accepted answers
- distractor pool
- token explanation
- first-seen flag
- wrong attempt count

Mistakes not to repeat:

- Do not blank obscure words before explaining them.
- Do not use several blanks in one item at A1/A2.
- Do not punish capitalization/punctuation.

First MVP:

- Build `plan_missing_word` as a simple card: Russian/English context, one blank, 3-4 options.

### Exercise Type 3: Choose Natural Phrase

Competitor pattern:

- Duolingo uses multiple choice for meaning.
- Busuu uses level-appropriate choices and grammar/vocabulary review.
- Memrise emphasizes "real people speak this way".

Trains:

- Naturalness.
- Register.
- Meaning.
- Avoiding textbook phrases.

Why it retains:

- Learner gets the feeling of taste: "this sounds normal".
- It is easier than typing, but more useful than passive reading.

Phraseman adaptation:

- Show a short Russian prompt and 3-4 English choices.
- One choice is the best natural phrase.
- Wrong explanations can mention the selected choice only if the selected choice is known in state.

Needed data:

- prompt
- correct choice
- distractor choices
- naturalness reason
- register tag: casual, neutral, polite, formal
- exact selected answer in attempt event

Mistakes not to repeat:

- Do not make all wrong options absurd.
- Do not make the "correct" answer stiff.
- Do not invent why the learner chose something.

First MVP:

- Implement as a plan quiz sub-mode with answer-specific explanation only after `selectedChoice` is stored.

### Exercise Type 4: Listen And Choose

Competitor pattern:

- Memrise uses real/native clips to train real accents and rhythm.
- Duolingo uses listening recognition as a core short exercise.
- EWA uses media snippets to make language feel alive.

Trains:

- Listening comprehension.
- Phrase recognition.
- Natural rhythm and reductions.

Why it retains:

- Premium feeling is much higher when audio feels real.
- Users feel practical progress quickly: they can recognize phrases outside the app.

Phraseman adaptation:

- Use generated audio assets, not generic device speech, for premium plan tasks.
- Text is hidden first.
- After answer, show transcript and short explanation.
- Offer slow replay and natural replay.

Needed data:

- `audioAssetId`
- phrase id
- speaker style
- accent
- speed
- transcript
- duration
- fallback TTS flag
- listening difficulty

Mistakes not to repeat:

- Do not use robotic audio as the premium experience.
- Do not test rare vocabulary without a first exposure.
- Do not make the learner fail because of audio quality.

First MVP:

- Add audio asset lookup to plan content.
- If missing, fallback to existing speech hook but mark the asset missing in the quality passport.

### Exercise Type 5: Listen And Build

Competitor pattern:

- Duolingo mixes listening with word ordering.
- Memrise uses listening to connect real speech with phrase production.

Trains:

- Audio-to-production bridge.
- Word order from memory.
- Recognizing contractions/reductions.

Why it retains:

- Feels more advanced than a normal multiple-choice task.
- Gives strong "I understood it" reward.

Phraseman adaptation:

- Play phrase audio first.
- Learner builds the phrase from word tiles.
- After answer, show transcript and explanation of the hardest word/reduction.

Needed data:

- audio asset
- token rows
- allowed alternatives
- distractors
- reduction notes
- attempt result

Mistakes not to repeat:

- Do not show text before audio unless user taps help.
- Do not overload with long phrases.
- Do not use contractions before they are explained.

First MVP:

- Add `audioFirst: true` to phrase build mode.

### Exercise Type 6: Pronunciation Repeat

Competitor pattern:

- ELSA differentiates pronunciation, intonation, fluency and gives immediate AI feedback.
- Memrise includes pronunciation/speech recognition practice.
- Busuu AI Conversations give feedback on grammar and word choice after speaking.

Trains:

- Speaking confidence.
- Pronunciation.
- Rhythm.
- Fluency.
- Recall under voice pressure.

Why it retains:

- User feels progress physically: "I can say it now".
- High premium value.
- Creates strong before/after satisfaction.

Phraseman adaptation:

- Target audio plays.
- User records.
- App evaluates transcript match first.
- Later add pronunciation/intonation/fluency scoring.
- Failed words go into trainer and recall.

Needed data:

- target phrase
- target audio asset
- recording uri
- transcript
- word match score
- pronunciation score
- fluency score
- hard word/sound
- retry count
- privacy/storage policy

Mistakes not to repeat:

- Do not claim phoneme-level scoring until implemented.
- Do not mark accent as wrong if meaning is clear.
- Do not advance conversation when speech recognition clearly failed.
- Do not make speech mandatory if microphone permission is denied.

First MVP:

- Record audio, transcribe/compare target words, store a simple score, add weak phrase to recall if failed.

### Exercise Type 7: Quick Reply

Competitor pattern:

- Duolingo conversation challenges and Busuu AI Conversations push response, not only recognition.
- Memrise AI speaking addresses the "confidence gap".

Trains:

- Fast response.
- Short useful replies.
- Conversational readiness.

Why it retains:

- Feels close to real life.
- Light time pressure makes success memorable.

Phraseman adaptation:

- Show/hear a prompt.
- Learner picks or says one short reply.
- Replies must be level-appropriate and built from learned material.

Needed data:

- prompt
- accepted replies
- reply intent
- level
- source phrases
- response time
- selected/spoken attempt

Mistakes not to repeat:

- Do not create open-ended AI chat too early.
- Do not accept nonsense as success.
- Do not punish valid short alternatives.

First MVP:

- Multiple-choice quick reply with 3 accepted natural variants.

### Exercise Type 8: Error Repair

Competitor pattern:

- Duolingo Practice Hub and Busuu Review pull errors back.
- Spaced repetition works best when timing and accuracy both matter.

Trains:

- Fixing personal weak spots.
- Preventing fossilized errors.
- Active recall.

Why it retains:

- User feels the plan is personal, not generic.
- The app remembers what went wrong.

Phraseman adaptation:

- Use existing mistake log/trainer.
- A plan day can include an error-repair block only if enough real mistakes exist.
- If no mistakes exist, replace with a neutral review block.

Needed data:

- mistake id
- phrase id
- token index
- picked token if available
- expected token
- category
- plan id
- task id
- due date
- prior wrong count

Mistakes not to repeat:

- Do not fake personalization.
- Do not show "error repair" when there are no real errors.
- Do not repeat one item forever without spacing logic.

First MVP:

- Add `plan_error_repair` that pulls 3-5 due trainer/mistake items.

### Exercise Type 9: Card Sprint

Competitor pattern:

- Simpler uses associative word learning and flashcards.
- Busuu has vocabulary review.
- EWA uses flashcards from media/books.

Trains:

- Vocabulary recall.
- Fast recognition.
- Long-term memory.

Why it retains:

- Small collectible progress.
- Good filler for short sessions.

Phraseman adaptation:

- Only appear if user has enough due cards.
- Use saved cards, plan words, and previous misses.
- Plan day should not invent a flashcard task with no content.

Needed data:

- due card ids
- word/phrase tags
- plan relevance
- interval
- last review result

Mistakes not to repeat:

- Do not make cards mandatory if there are fewer than the required due items.
- Do not use random unrelated words.

First MVP:

- Add optional `plan_card_sprint` block gated by due count.

### Exercise Type 10: Micro Grammar Card

Competitor pattern:

- Simpler succeeds by breaking grammar into short simple topics with drills.
- Busuu is stronger than pure gamified apps when grammar is structured.

Trains:

- One grammar idea.
- Why a phrase is built that way.
- Transfer to new phrases.

Why it retains:

- Learner stops feeling confused.
- Makes the plan feel smart, not random.

Phraseman adaptation:

- One screen, one idea, two examples, one instant check.
- Must be connected to the same day’s phrases.
- No technical grammar wall.

Needed data:

- grammar point id
- prerequisite lesson
- examples
- explanation
- check question
- linked phrase ids

Mistakes not to repeat:

- Do not explain grammar that is not used today.
- Do not write long textbook theory.
- Do not use words like "construction" in user copy.

First MVP:

- Add micro-card inside explanation system before a new pattern appears in plan tasks.

### Exercise Type 11: Micro Dialogue

Competitor pattern:

- Busuu conversations are goal-based and level-appropriate.
- EWA uses stories/dialogues for engagement.
- Memrise uses communication-ready scenarios.

Trains:

- Turn-taking.
- Understanding prompt and response.
- Context.

Why it retains:

- Feels like real use, but safer than open chat.
- Adds variety to the day.

Phraseman adaptation:

- 2-3 turns max.
- Use "dialogue", "conversation", or "exchange"; do not call it a scene.
- At A1/A2, choices are constrained.
- Later, AI can play the other speaker.

Needed data:

- dialogue id
- turns
- expected intent
- accepted replies
- audio per turn
- grammar/vocab prerequisites

Mistakes not to repeat:

- Do not open an unbounded chatbot early.
- Do not use advanced vocabulary just because the situation is interesting.
- Do not make the user type long freeform answers at low levels.

First MVP:

- Fixed 2-turn dialogue with choose-reply and audio playback.

### Exercise Type 12: Media/Story Clip

Competitor pattern:

- EWA uses books, movies, and TV snippets.
- Simpler uses detective stories.
- Memrise uses authentic video.

Trains:

- Motivation.
- Contextual vocabulary.
- Listening/reading in a meaningful mini-story.

Why it retains:

- Feels less like drills.
- Creates curiosity and emotional memory.

Phraseman adaptation:

- Use short original mini-clips, not copyrighted media.
- For plans, use tiny "everyday moment" clips with universal phrases.
- Add tap-to-save phrase and short comprehension question.

Needed data:

- clip id
- text/audio/video asset
- phrase anchors
- comprehension question
- vocabulary notes
- rights/source metadata

Mistakes not to repeat:

- Do not use copyrighted movie clips without rights.
- Do not make clips too long.
- Do not hide the learning objective.

First MVP:

- Audio-only original 10-15 second mini-story generated for one plan day.

## Audit 2: Ranked MVP Order

1. `plan_phrase_build`
2. `plan_missing_word`
3. `plan_choose_natural`
4. `plan_listen_choose` with generated audio asset lookup and TTS fallback
5. `plan_error_repair` from real mistakes/trainer
6. `plan_listen_build`
7. `plan_pronunciation_repeat` with record/transcript/word-match MVP
8. `plan_micro_grammar_card`
9. `plan_card_sprint`
10. `plan_micro_dialogue`
11. `plan_media_clip`

This order gives the product variety quickly without pretending that full AI pronunciation, media generation, and open conversations are already solved.

## Audit 2: Updated Implementation Map

P1A exercise taxonomy:

- Add `PlanExerciseType`.
- Add `PlanExerciseBlock`.
- Add `PlanContentUnit`.
- Add `PlanAttemptEvent`.
- Add `PlanExplanationCard`.

P1B content gates:

- Gate for broad/socially safe early phrases.
- Gate for exercise variety per week.
- Gate for no invented wrong-answer explanations.
- Gate for no unsupported audio/pronunciation promises.
- Gate for no plan task without source/evidence.

P2A first exercise renderers:

- Build `plan_phrase_build` from existing lesson engine.
- Build `plan_missing_word`.
- Build `plan_choose_natural`.

P2B review/personalization:

- Build `plan_error_repair` from real mistake/trainer data.
- Store exact selected choice or typed answer for honest feedback.
- Feed failed attempts into active recall and trainer.

P2C audio/speech:

- Add `PlanAudioAsset` lookup.
- Add generated-audio missing asset report.
- Add TTS fallback only as fallback.
- Add pronunciation recording MVP.

P3 week 1 content:

- Write `Gavan` week 1 only after P1A/P1B are in place.
- Week 1 must include at least 5 exercise types.
- Day 1 must be universal-first, not identity/contact/address.
- No day ships until passport says ready.

## Audit 3: Data Model After Reset

Current problem:

- `PlanDailyTask` mostly describes a card and destination.
- `PlanTaskDestination` describes where to navigate, but not what is being trained.
- `PlanDay` mixes copy, curriculum, tasks, recall schedule, and quality status.
- Quizzes, plan phrase lessons, lesson slices, trainer tasks, and cards are separate islands.
- Audio, pronunciation, explanations, attempts, and quality evidence are not first-class plan data.

New direction:

The plan must be driven by content units and exercise blocks. Navigation becomes an output, not the source of truth.

### Entity 1: `PlanExerciseType`

Purpose:

Defines what kind of learning action happens.

Recommended union:

- `phrase_build`
- `missing_word`
- `choose_natural`
- `listen_choose`
- `listen_build`
- `listen_type`
- `pronunciation_repeat`
- `quick_reply`
- `error_repair`
- `card_sprint`
- `micro_grammar`
- `micro_dialogue`
- `media_clip`
- `trainer_due`
- `active_recall`

Why needed:

- Replaces vague task kinds like `plan_phrase_lesson` and `plan_quiz`.
- Lets the plan enforce variety.
- Lets UI choose the right renderer.
- Lets analytics compare which formats help the learner most.

Old fields to replace:

- `PlanTaskKind`
- parts of `PlanTaskDestination.type`

Connections:

- Lesson engine: `phrase_build`, `missing_word`, `listen_build`.
- Quiz engine: `choose_natural`, `quick_reply`, `listen_choose`.
- Trainer: `error_repair`, `trainer_due`.
- Flashcards: `card_sprint`.
- Audio/pronunciation: `listen_*`, `pronunciation_repeat`.

Quality gates:

- Every exercise type must have a renderer or approved fallback.
- Every week must include enough type variety.
- Speech/audio exercise types must declare fallback behavior.

### Entity 2: `PlanContentUnit`

Purpose:

The reusable learning object: phrase, micro grammar idea, dialogue turn, listening clip, or review set.

Recommended fields:

- `id`
- `planId`
- `unitKind`: `phrase`, `grammar`, `dialogue`, `audio_clip`, `review_set`
- `level`
- `text.en`
- `text.ru`
- `text.uk`
- `alternatives`
- `tokens`
- `distractors`
- `grammarTags`
- `vocabTags`
- `skillTags`: listening, speaking, reading, recall, grammar, vocabulary
- `register`: casual, neutral, polite, formal
- `universality`: universal, plan-flavored, niche
- `prerequisiteLessonIds`
- `sourceLessonPhraseIds`
- `audioAssetIds`
- `explanationCardIds`
- `blockedBeforeLessonIds`
- `qualityStatus`

Why needed:

- Prevents days from being hardcoded around narrow topics.
- Lets the same phrase appear in build, listen, recall, quiz, and pronunciation.
- Makes "new word needs explanation" enforceable.
- Makes plan content reusable without duplicating phrases.

Old fields to replace:

- `PERSONAL_PLAN_PHRASE_LESSONS`
- loose quiz phrase objects for plan quizzes
- `recallSchedule.phraseIds`
- day-level phrase-only assumptions

Connections:

- Lessons: can reference existing `lesson_phrase_*`.
- Quizzes: use content units as source.
- Trainer/mistakes: failed unit id and token id go into queues.
- Cards: saved plan phrases can create flashcards.
- Analytics: aggregate by unit, token, grammar tag, vocab tag, exercise type.

Quality gates:

- No unit without source language and target language.
- No phrase unit without tokens/distractors when used in build modes.
- No new vocabulary without explanation.
- No unsupported grammar before prerequisite lesson.
- Early-week universal units cannot contain narrow personal data unless explicitly approved.
- No unit with "scene", "route counter", "source", "destination", "dev" user copy.

### Entity 3: `PlanExerciseBlock`

Purpose:

The actual task shown in a day. It points to content units and declares how the learner practices them.

Recommended fields:

- `id`
- `planId`
- `dayIndex`
- `weekIndex`
- `order`
- `exerciseType`
- `title`
- `subtitle`
- `cta`
- `estimatedMinutes`
- `requiredForMinutes`: 5, 10, 15, 20
- `contentUnitIds`
- `sourceRefs`
- `renderer`
- `completionRule`
- `carryoverPolicy`
- `adaptivePolicy`
- `fallbackPolicy`
- `premiumRequired`

Why needed:

- Separates daily UI/task logic from content.
- Allows the same content unit to appear in different formats.
- Allows dynamic blocks: mistake repair only if real mistakes exist.

Old fields to replace:

- `PlanDailyTask`
- most of `PlanTaskDestination`

Connections:

- Navigation adapter converts block to existing route while migration happens.
- Completion calls `markPersonalPlanTaskCompleted`.
- Attempt events reference `exerciseBlockId`.

Quality gates:

- Every block has at least one content source or evidence source.
- Every block has a completion rule.
- Every required block has material for the selected minute budget.
- Optional trainer/card blocks must be gated by due material.

### Entity 4: `PlanAttemptEvent`

Purpose:

The exact learner attempt. This is the missing center of honest explanations and real personalization.

Recommended fields:

- `id`
- `userId`
- `planInstanceId`
- `planId`
- `dayIndex`
- `exerciseBlockId`
- `exerciseType`
- `contentUnitId`
- `tokenId`
- `startedAt`
- `answeredAt`
- `isRight`
- `answerMode`: choice, build, type, speech, listen
- `prompt`
- `expectedAnswer`
- `selectedChoice`
- `typedAnswer`
- `builtTokens`
- `speechTranscript`
- `audioAssetId`
- `mistakeCategory`
- `grammarTag`
- `vocabTag`
- `responseTimeMs`
- `attemptNumber`
- `feedbackShownId`

Why needed:

- Wrong feedback can only mention what the user actually selected.
- Mistakes become precise enough for trainer and analytics.
- Plan progress can be based on real correctness, not task opening.

Old fields to replace:

- ad hoc quiz `results: boolean[]`
- task-only completion
- token meta without plan exercise context

Connections:

- Mistake log uses `expectedAnswer`, `selectedChoice`, `tokenId`, `mistakeCategory`.
- Trainer uses failed phrase/token and due date.
- Analytics uses exercise type success rate and response time.
- Explanations use `feedbackShownId`.

Quality gates:

- Every wrong answer must store enough data to explain honestly.
- Choice exercises must store `selectedChoice`.
- Build exercises must store `builtTokens`.
- Speech exercises must store transcript or failure reason.
- Completion cannot be based on opening the task.

### Entity 5: `PlanAudioAsset`

Purpose:

A first-class audio object for premium listening and speaking tasks.

Recommended fields:

- `id`
- `contentUnitId`
- `planId`
- `voiceStyle`
- `speakerLabel`
- `accent`
- `speed`: slow, natural, fast
- `durationMs`
- `transcript`
- `assetUri`
- `generatedBy`
- `generationPromptId`
- `qualityStatus`
- `fallbackText`
- `copyrightStatus`

Why needed:

- Listening tasks need real assets, not invisible TTS calls.
- Pronunciation needs a stable target.
- Quality gates can detect missing audio.

Old fields to replace:

- direct `useAudio().speak(answer)` as the premium plan default

Connections:

- `listen_choose`, `listen_build`, `listen_type`, `pronunciation_repeat`.
- Audio flashcards can reuse approved assets.
- Analytics tracks listens, replays, failures.

Quality gates:

- Audio exercise cannot be certified without an asset or explicit fallback.
- Transcript must match target phrase.
- Asset must have rights/source metadata.
- Duration must fit the exercise.

### Entity 6: `PlanPronunciationAttempt`

Purpose:

Speech-practice result separate from generic attempts because it needs audio, transcript, and scoring.

Recommended fields:

- `id`
- `attemptEventId`
- `planInstanceId`
- `contentUnitId`
- `targetAudioAssetId`
- `recordingUri`
- `recordingDurationMs`
- `transcript`
- `wordMatchScore`
- `pronunciationScore`
- `fluencyScore`
- `intonationScore`
- `hardWords`
- `hardSounds`
- `recognitionStatus`
- `retryCount`
- `privacyStatus`

Why needed:

- Speech tasks cannot be honest with only right/wrong.
- Future ELSA-style feedback needs stable data.
- MVP can start with transcript match and later add deeper scoring.

Old fields to replace:

- no current equivalent

Connections:

- Mistake log gets failed words.
- Trainer gets phrase/sound review.
- Analytics gets before/after speaking progress.
- Plan day completion can require one accepted speech attempt or allow fallback.

Quality gates:

- Do not claim phoneme feedback unless `hardSounds` exists from a real scoring step.
- Must handle microphone denied.
- Must store recognition failure separately from learner failure.
- Must not block the day forever if speech system fails.

### Entity 7: `PlanExplanationCard`

Purpose:

Human-quality explanation attached to a unit/token/exercise.

Recommended fields:

- `id`
- `contentUnitId`
- `tokenId`
- `trigger`: first_seen, correct, wrong, repeated_wrong, listen_reveal, pronunciation_feedback
- `tone`: correct, wrong, neutral, encouragement
- `title.ru`
- `body.ru`
- `body.uk`
- `body.es`
- `targetConcept`
- `allowedMentionSelectedAnswer`
- `forbiddenMentions`
- `newWordIds`
- `qualityStatus`

Why needed:

- Stops hallucinated wrong-choice explanations.
- Makes "every new word explained" enforceable.
- Lets explanations feel written by a human, not generated blindly.

Old fields to replace:

- per-choice quiz explanations as the only explanation model
- `LessonTeachingNote` can remain as the lower-level lesson implementation, but plan explanations should wrap it with trigger and quality metadata.

Connections:

- Lesson result UI.
- Quiz result UI.
- Listening transcript reveal.
- Pronunciation feedback.
- Attempt event stores `feedbackShownId`.

Quality gates:

- Wrong explanation cannot mention selected answer unless `selectedChoice` exists.
- Every first-seen non-basic word needs an explanation.
- No technical copy.
- No invented options.
- No shaming language.

### Entity 8: `PlanDayPassport`

Purpose:

A complete quality report for a day.

Recommended fields:

- `standardVersion`
- `planId`
- `dayIndex`
- `weekIndex`
- `ready`
- `status`
- `exerciseTypes`
- `contentUnitIds`
- `requiredBlocksByMinutes`
- `estimatedMinutesByChoice`
- `sourceCoverage`
- `audioCoverage`
- `pronunciationCoverage`
- `explanationCoverage`
- `mistakeRoutingCoverage`
- `trainerEvidenceCoverage`
- `cardEvidenceCoverage`
- `grammarPrerequisiteCoverage`
- `copyQualityIssues`
- `varietyIssues`
- `accessibilityIssues`
- `issues`

Why needed:

- Prevents "looks done" content from shipping.
- Lets DEV surface show why a day is not ready.
- Gives the content pipeline a checklist it cannot bypass.

Old fields to replace:

- current `PersonalPlanDayPassport` should evolve into this.

Connections:

- DEV plan calendar.
- Test suite.
- Content generator.
- QA reports.
- Release gate.

Quality gates:

- Day is not ready if any required block lacks content units.
- Day is not ready if quiz/listening/pronunciation lacks source coverage.
- Day is not ready if early content is too niche.
- Day is not ready if exercise variety is below week target.
- Day is not ready if wrong feedback can hallucinate.

## Audit 3: Migration Strategy

Step 1: Add new types without deleting current navigation.

- Create `personal_plan_content_types.ts`.
- Keep `PlanDailyTask` temporarily as a UI/navigation adapter.
- Add converters from `PlanExerciseBlock` to current destinations.

Step 2: Add attempt events.

- Store attempt events locally first.
- Include `planInstanceId`.
- Feed wrong attempts into mistake log and trainer.

Step 3: Replace content source.

- Stop writing plan-owned phrases directly into old quiz/lesson registries.
- Write `PlanContentUnit` first.
- Generate exercise blocks from content units.

Step 4: Expand quality passport.

- Keep current hard gates.
- Add gates for content units, exercise variety, audio assets, pronunciation, and explanation honesty.

Step 5: Author `Gavan` week 1.

- Only after model/gates are in place.
- Week 1 becomes the canonical pack.

## Audit 3: Updated Implementation Map

P1A data foundation:

- Add `PlanExerciseType`.
- Add `PlanContentUnit`.
- Add `PlanExerciseBlock`.
- Add `PlanAttemptEvent`.
- Add `PlanExplanationCard`.
- Add `PlanAudioAsset`.
- Add `PlanPronunciationAttempt`.
- Expand `PlanDayPassport`.

P1B compatibility:

- Add adapter from new blocks to old task destinations.
- Keep existing Home/Plan UI working during migration.
- Keep old lesson/quiz routes as renderers.

P1C gates:

- Add content unit coverage gate.
- Add no-invented-feedback gate.
- Add exercise variety gate.
- Add audio asset gate.
- Add pronunciation fallback gate.
- Add personalization evidence gate.

P2 renderers:

- Implement `phrase_build`, `missing_word`, `choose_natural`.
- Add attempt event logging to each.
- Add exact selected answer / built tokens / typed answer storage.

P3 audio and speech:

- Implement `PlanAudioAsset` lookup and fallback.
- Implement pronunciation MVP after attempt events exist.

P4 content:

- Write universal-first `Gavan` week 1.
- Require at least 5 exercise types in week 1.
- Certify days only through expanded passport.

## Audit 4: Quality Gates And Test Strategy

Principle:

Personal Plans should fail closed. If a day, block, explanation, audio asset, or personalization link is not good enough, it must stay `scaffold` or `needs_review`. The app can still show DEV preview, but production must not present it as a premium-quality plan day.

### Gate 1: `missing_content_unit`

Checks:

- Every required `PlanExerciseBlock` references at least one existing `PlanContentUnit`.
- Dynamic blocks can reference an evidence source instead of fixed units.

Reads:

- `PlanExerciseBlock.contentUnitIds`
- `PlanContentUnit.id`
- `requiredForMinutes`
- `adaptivePolicy`

Error code:

- `missing_content_unit`

Good example:

- A `phrase_build` block references `gavan_universal_help_001`, `gavan_repeat_001`, `gavan_wait_001`.

Bad example:

- A `phrase_build` block has only title/subtitle and opens a hardcoded route.

First test:

- `personal_plan_content_unit_gate.test.ts` rejects a required block with no content units.

### Gate 2: `unsupported_exercise_renderer`

Checks:

- Every `PlanExerciseType` used by a production day has a renderer or approved route adapter.

Reads:

- `PlanExerciseBlock.exerciseType`
- renderer registry
- adapter registry

Error code:

- `unsupported_exercise_renderer`

Good example:

- `missing_word` maps to `PlanMissingWordScreen`.

Bad example:

- `pronunciation_repeat` is used before recording/transcript fallback exists.

First test:

- A day with unknown `exerciseType: 'magic_voice_test'` is not ready.

### Gate 3: `low_week_exercise_variety`

Checks:

- A certified week contains enough different exercise types.
- Week 1 target: at least 5 types across the week, at least 2 types in a 15-minute day.

Reads:

- week days
- exercise block types
- minute budget

Error code:

- `low_week_exercise_variety`

Good example:

- Week includes phrase build, missing word, choose natural, listen choose, error repair, micro grammar.

Bad example:

- Seven days all contain lesson slice + plan phrase build + quiz.

First test:

- Week passport rejects seven repeated days with identical exercise types.

### Gate 4: `early_content_too_niche`

Checks:

- Early universal days do not overfit to apartment, phone, email, doctor, bank, office, or other narrow contexts.
- Specific plan flavor appears later or as optional context, not as day 1 foundation.

Reads:

- `PlanContentUnit.universality`
- `vocabTags`
- phrase text
- day/week index

Error code:

- `early_content_too_niche`

Good example:

- "I need help", "Can you repeat that?", "I don't understand yet."

Bad example:

- "My phone number is 087...", "I'm here for the viewing", "My address is 14 King Street."

First test:

- `Gavan` day 1 rejects content units tagged `address`, `phone`, `apartment`, `appointment`.

### Gate 5: `unsupported_grammar_prerequisite`

Checks:

- Content does not use grammar before the user has seen it in lesson or micro grammar.

Reads:

- `PlanContentUnit.grammarTags`
- `prerequisiteLessonIds`
- day curriculum
- completed lesson slice ids
- micro grammar blocks earlier in the day

Error code:

- `unsupported_grammar_prerequisite`

Good example:

- A phrase using `can_request` appears after a micro grammar card or lesson slice that introduces "Can you...?"

Bad example:

- A day asks "Could you tell me..." before any modal/request explanation.

First test:

- A block with `grammarTags: ['can_request']` fails when no prerequisite exists.

### Gate 6: `missing_new_word_explanation`

Checks:

- Every first-seen meaningful word has a learner-friendly explanation card.

Reads:

- content unit tokens
- `vocabTags`
- first-seen vocabulary index
- `PlanExplanationCard.newWordIds`

Error code:

- `missing_new_word_explanation`

Good example:

- First use of "repeat" has a short explanation: "repeat = say it again."

Bad example:

- Learner sees "available", "receipt", "appointment" without explanation.

First test:

- A content unit with a new `vocabTag` and no explanation card fails.

### Gate 7: `invented_wrong_feedback`

Checks:

- Wrong-answer feedback never mentions options the app does not know the learner selected.

Reads:

- `PlanExplanationCard.allowedMentionSelectedAnswer`
- `PlanAttemptEvent.selectedChoice`
- `typedAnswer`
- `builtTokens`
- explanation body

Error code:

- `invented_wrong_feedback`

Good example:

- "Use `I need help` when the main idea is simple: you need help."

Bad example:

- "You're changes the person..." when the learner may not have selected `You're`.

First test:

- A wrong explanation with specific wrong option text fails unless the attempt stores that exact selected choice.

### Gate 8: `missing_audio_asset`

Checks:

- Listening and pronunciation blocks have generated audio assets or an explicit fallback.

Reads:

- `PlanExerciseBlock.exerciseType`
- `PlanAudioAsset`
- `fallbackPolicy`

Error code:

- `missing_audio_asset`

Good example:

- `listen_choose` references `audio_gavan_help_001_natural`.

Bad example:

- `listen_choose` silently uses device TTS as if it were premium audio.

First test:

- A certified listening block without `audioAssetId` and without fallback fails.

### Gate 9: `audio_transcript_mismatch`

Checks:

- Audio transcript matches the target phrase or approved variant.

Reads:

- `PlanAudioAsset.transcript`
- `PlanContentUnit.text.en`
- `alternatives`

Error code:

- `audio_transcript_mismatch`

Good example:

- Audio transcript: "Can you repeat that?" target phrase same.

Bad example:

- Asset transcript says "Could you repeat it?" while target expects "Can you repeat that?" without variant approval.

First test:

- Audio asset with mismatched transcript fails the day passport.

### Gate 10: `pronunciation_without_fallback`

Checks:

- Pronunciation tasks do not block users forever if mic permission or recognition fails.

Reads:

- `PlanExerciseBlock.exerciseType`
- `fallbackPolicy`
- `completionRule`
- permission handling

Error code:

- `pronunciation_without_fallback`

Good example:

- User can switch to listen/build fallback if microphone denied.

Bad example:

- Day completion requires speech recording with no alternative.

First test:

- Pronunciation block with `completionRule: speech_required` and no fallback fails.

### Gate 11: `fake_personalization`

Checks:

- Trainer, card, weak spot, and mistake repair blocks only appear when real evidence exists.

Reads:

- due trainer count
- due practice count
- saved card count
- mistake log
- `adaptivePolicy.minEvidenceCount`

Error code:

- `fake_personalization`

Good example:

- Error repair appears because there are 3 due mistakes with plan context.

Bad example:

- Card sprint appears when the user has 0 saved/due cards.

First test:

- A plan day with `card_sprint` and no due cards replaces the block or fails readiness depending on required/optional status.

### Gate 12: `missing_mistake_routing`

Checks:

- Every wrong attempt in plan exercises can route to mistake log, trainer, active recall, or an approved ignore reason.

Reads:

- `PlanAttemptEvent`
- `contentUnitId`
- `tokenId`
- `mistakeCategory`
- routing config

Error code:

- `missing_mistake_routing`

Good example:

- Wrong token in `missing_word` writes token category and phrase id to trainer.

Bad example:

- Wrong answer only changes UI color and disappears.

First test:

- A wrong attempt from `choose_natural` produces a mistake event with plan context.

### Gate 13: `completion_not_correctness_based`

Checks:

- Plan progress only advances from correct answers or explicitly completed non-scored tasks.

Reads:

- `PlanAttemptEvent.isRight`
- `PlanExerciseBlock.completionRule`
- completed task records

Error code:

- `completion_not_correctness_based`

Good example:

- Phrase build counts only correct phrases.

Bad example:

- Opening a lesson or answering incorrectly increments plan phrase count.

First test:

- A plan phrase task with 4 wrong and 1 correct attempt counts as 1/required, not 5/required.

### Gate 14: `carryover_broken`

Checks:

- Unfinished required blocks stay visible tomorrow before new day tasks.

Reads:

- `PersonalPlanState.currentDayIndex`
- completed task records keyed by `planInstanceId`
- day runtime builder
- local date

Error code:

- `carryover_broken`

Good example:

- User completed 1/3 tasks yesterday; today still shows remaining 2 tasks.

Bad example:

- App jumps to day 2 while day 1 has unfinished required work.

First test:

- Existing carryover test should be expanded to exercise blocks and attempt events.

### Gate 15: `plan_instance_leak`

Checks:

- Completed tasks and attempts from a previous plan instance do not count for a restarted plan.

Reads:

- `planInstanceId`
- completion keys
- attempt events
- state id

Error code:

- `plan_instance_leak`

Good example:

- Restarting `Gavan` creates a new instance and starts progress clean.

Bad example:

- Old completed day 1 tasks remain completed after reset.

First test:

- Existing `planInstanceId` completion test should also cover attempt events.

### Gate 16: `quiz_source_uncovered`

Checks:

- Every quiz item points to content units or lesson phrases already trained that day/week.

Reads:

- quiz block source refs
- `contentUnitIds`
- lesson slice ids
- quiz item source refs

Error code:

- `quiz_source_uncovered`

Good example:

- A quiz question checks a phrase from the same day or spaced review.

Bad example:

- Quiz asks To Be questions before the day included that lesson/micro grammar.

First test:

- Quiz with 10 questions fails if any question has no covered source.

### Gate 17: `analytics_context_missing`

Checks:

- Attempt, mistake, trainer, and progress events include enough plan context for analytics.

Reads:

- `PlanAttemptEvent`
- mistake log meta
- trainer item context
- completion records

Error code:

- `analytics_context_missing`

Good example:

- Event contains `planId`, `planInstanceId`, `dayIndex`, `exerciseBlockId`, `exerciseType`, `contentUnitId`.

Bad example:

- Trainer item only stores phrase text and no plan source.

First test:

- Wrong plan attempt creates mistake/trainer data with full plan context.

### Gate 18: `copy_quality_failed`

Checks:

- User-facing copy is clear, friendly, non-technical, and not developer text.

Reads:

- day copy
- block titles/subtitles/CTA
- explanation cards
- quiz instructions

Error code:

- `copy_quality_failed`

Good example:

- "Потренируем короткий ответ."

Bad example:

- "Пройдите нужное количество фраз в destination source."

First test:

- Forbidden pattern list rejects `dev`, `source`, `destination`, `конструкция`, `актив рекол`, `сцена`, `обычный урок` in user copy.

## Audit 4: Test Layers

Unit tests:

- Validate individual gates against small fixtures.
- Keep these fast and deterministic.

Contract tests:

- Validate public APIs: content registry, block adapter, attempt logger, passport builder.
- Protect against accidental old-content revival.

Integration tests:

- Run a full day: open block, answer right/wrong, log attempt, complete task, update progress, carryover.

UI tests:

- Verify user sees only production copy.
- Verify DEV surfaces can show gate issues.
- Verify audio/pronunciation fallback states.

Data migration tests:

- Old `PlanDailyTask` still opens current routes.
- New `PlanExerciseBlock` adapts to old routes until renderers exist.
- Old completed tasks do not leak across `planInstanceId`.

## Audit 4: Updated Implementation Map

P1 gate framework:

- Add `PersonalPlanQualityIssueCode` for new gates.
- Add `validatePlanContentUnit`.
- Add `validatePlanExerciseBlock`.
- Add `validatePlanExplanationCard`.
- Add `validatePlanAudioAsset`.
- Add `buildExpandedPlanDayPassport`.

P2 first tests:

- `missing_content_unit`
- `unsupported_exercise_renderer`
- `early_content_too_niche`
- `invented_wrong_feedback`
- `completion_not_correctness_based`
- `plan_instance_leak`

P3 attempt/routing tests:

- Attempt event stores selected choice / built tokens / typed answer.
- Wrong attempt routes to mistake log and trainer with plan context.
- Carryover reads attempt/completion state correctly.

P4 audio/speech tests:

- Listening task requires audio asset or fallback.
- Transcript must match phrase.
- Pronunciation task requires fallback and recognition failure state.

P5 production certification:

- A day cannot be `certified` unless all required gates pass.
- DEV can display gate failures.
- Home/Plan screen must not label scaffold content as ready.

## Audit 5: Gavan Week 1 Content Strategy

Scope:

This is not final content. This is the strategy and acceptance frame for writing `Gavan` week 1 after reset.

Core decision:

`Gavan` week 1 must not begin with apartment, address, phone, email, form, doctor, bank, or documents. Those are later plan flavors. Week 1 should teach universal everyday survival moves that work in many relocation situations without making the plan feel narrow or awkward.

### Week 1 Product Goal

By the end of week 1, the learner should be able to:

- ask for help;
- say they do not understand;
- ask someone to repeat or slow down;
- say they need a minute;
- confirm a simple detail;
- say something is okay / not okay;
- ask where something is;
- say they are looking for something;
- use a short polite request;
- recover from confusion without freezing.

This is the foundation for relocation. It helps with rent, documents, doctor, school, bank, city services, transport, and shops later, but it does not start with those narrow contexts.

### Week 1 Tone

Allowed tone:

- calm;
- direct;
- human;
- friendly;
- slightly warm;
- practical;
- not childish;
- not corporate;
- not textbook-formal.

Forbidden tone:

- developer copy;
- fake humor;
- "победить анкету";
- "обычный урок";
- "конструкция";
- "маршрутный счётчик";
- "сцена";
- "source/destination";
- long motivational speeches.

### Allowed Phrase Families

These are categories, not final exercise text.

Help:

- need help;
- ask for help;
- ask if someone can help.

Understanding:

- do not understand;
- not sure;
- need a minute;
- can check.

Repeat/slow down:

- repeat that;
- say it again;
- slower please.

Confirm:

- is that right;
- yes, that works;
- no, not that one;
- one more time.

Find/place:

- looking for;
- where is;
- here/there;
- this/that.

Polite request:

- can I...;
- can you...;
- please;
- thank you.

Repair:

- sorry;
- I mean...;
- one second;
- let me try again.

### Forbidden Phrase Families For Week 1

Hard forbidden in week 1 foundation:

- names as required content;
- phone numbers;
- emails;
- exact addresses;
- apartment/flat numbers;
- postcode;
- rent deposit;
- bank card problem;
- doctor appointment;
- school forms;
- city service office;
- job/office-specific identity;
- fake personal facts;
- any phrase that asks the learner to pretend to be a specific person with specific data.

Allowed later:

- These topics can appear from week 2 onward as plan flavor, after universal survival phrases and grammar are established.

### Grammar Prerequisites

Week 1 can use only grammar that is either:

- already in existing lessons;
- introduced by a micro grammar card before practice;
- so formulaic that it is taught as a phrase chunk.

Allowed early grammar:

- `I need...`
- `I don't understand...`
- `Can you...?`
- `Can I...?`
- `Where is...?`
- `This is...`
- `That is...`
- `It is...`
- `I am...` only if not used for forced names/contact identity.

Blocked until explicitly introduced:

- complex conditionals;
- past/future tenses;
- long indirect questions;
- multi-clause explanations;
- formal bureaucratic requests;
- address/contact formats;
- "Could you possibly..." style politeness;
- long freeform speaking.

Micro grammar cards needed:

- `I need` as a simple need/request chunk.
- `Can you` for asking another person.
- `Can I` for asking permission/action.
- `Where is` for finding a place.
- `I don't` for "I do not understand".

### Required Exercise Variety

Week 1 must contain at least 6 exercise types:

- `phrase_build`
- `missing_word`
- `choose_natural`
- `listen_choose`
- `listen_build`
- `quick_reply`
- `error_repair` when evidence exists
- `micro_grammar`
- `pronunciation_repeat` as optional/fallback-safe

Minimum per day:

- 5 min: 1 focused block.
- 10 min: 2 blocks.
- 15 min: 3 blocks.
- 20 min: 4 blocks.

Week-level rule:

- No two consecutive days should have the exact same exercise pattern.
- A 15-minute user should see at least 5 exercise types across the week.
- A 5-minute user should still see at least 3 exercise types across the week.

### Day Roles Without Final Exercises

Day 1 role:

- Ask for help and recover politely.
- Focus: universal help phrase family.
- No names, contacts, apartment, address, or appointment.

Day 2 role:

- Understand and ask to repeat.
- Focus: repeat/slow down/one more time.

Day 3 role:

- Ask simple `Can you...?` and `Can I...?` requests.
- Focus: polite request without formal language.

Day 4 role:

- Find something or ask where something is.
- Focus: `where`, `this`, `that`, `here`, `there`.

Day 5 role:

- Confirm and correct simple details.
- Focus: right/not right/works/does not work.

Day 6 role:

- Quick replies and short recovery.
- Focus: answer without freezing.

Day 7 role:

- Review week through mixed recall, listening, and mistake repair.
- Focus: active recall and confidence check.

### Load Rules By Time Choice

5 minutes:

- One block only.
- Prefer phrase build, missing word, choose natural, or listening choose.
- No required speech.
- No long quiz.

10 minutes:

- Main block plus reinforcement.
- Usually phrase build + missing word/listen choose.
- Error repair can replace reinforcement if enough mistakes exist.

15 minutes:

- Main block, reinforcement, and recall/review.
- This is the default product feel.
- Include listening or quick reply most days.

20 minutes:

- Full daily workout.
- Add optional deeper block: pronunciation, micro dialogue, card sprint, or quiz.
- Must not feel like extra busywork; the fourth block should be meaningfully different.

### New Word Explanation Targets

Words/chunks that require explanation when first used:

- `need`
- `help`
- `repeat`
- `slowly`
- `understand`
- `minute`
- `again`
- `where`
- `this`
- `that`
- `here`
- `there`
- `right`
- `works`
- `mean`
- `try`

Explanation style:

- one short idea;
- why this word works here;
- one simple example;
- no grammar lectures;
- no invented wrong choices.

### Audio Strategy For Week 1

Required audio:

- One natural clip for each core phrase unit.
- Natural speed plus optional slow version for first exposure.
- Audio should sound like a real calm speaker, not dramatic acting.

Listening blocks:

- Hide English text first.
- Reveal transcript after answer.
- Allow replay.
- Show one short note for new word or reduced sound.

Fallback:

- If generated asset is missing, TTS can be used only as fallback and the day cannot be fully certified unless fallback is explicitly approved.

### Pronunciation Strategy For Week 1

Required:

- No mandatory pronunciation in 5-minute path.
- Pronunciation can appear in 15/20-minute paths only if fallback exists.
- First scoring MVP should be word-match/transcript-based, not fake phoneme scoring.

Good week 1 pronunciation targets:

- short phrase;
- no rare words;
- no long address/number/email;
- clear rhythm;
- useful in many situations.

Feedback:

- "The key words came through."
- "Try again with the short word in the middle."
- "Recognition failed, not your fault. You can replay or switch to build mode."

### Personalization Strategy

Allowed personalization in week 1:

- carryover unfinished blocks;
- mistake repair if enough real mistakes exist;
- trainer due block if enough due content exists;
- card sprint if enough saved/due cards exist;
- adjust reinforcement block based on wrong attempts.

Forbidden personalization:

- fake weak spot copy without evidence;
- showing "your mistakes" if there are none;
- forcing plan-specific narrow tasks before user has any history.

### Week 1 Passport Expectations

Week 1 can be considered ready only when:

- all 7 days have content units;
- all required blocks have exercise types and renderers/adapters;
- every day has a valid 5/10/15/20 load path;
- at least 6 exercise types appear across the week;
- early content is universal-first;
- forbidden narrow phrase families are absent;
- every new meaningful word has explanation coverage;
- every listening block has audio asset or approved fallback;
- every pronunciation block has fallback;
- every wrong-answer path can log attempt and route mistakes;
- carryover works;
- `planInstanceId` isolation works;
- no user-facing copy contains developer language.

### Week 1 Non-Goals

Do not do yet:

- write all 18 weeks;
- write final phrase list before data model/gates;
- implement open AI chat;
- promise phoneme-level pronunciation;
- use apartment/address/doctor/bank as the foundation;
- generate UI art before the content model is stable.

## Audit 5: Updated Implementation Map

P1 content strategy locked:

- Week 1 universal goal map.
- Allowed/forbidden phrase families.
- Grammar prerequisite list.
- New-word explanation list.
- Exercise variety target.

P2 gates before content:

- `early_content_too_niche`
- `missing_new_word_explanation`
- `unsupported_grammar_prerequisite`
- `low_week_exercise_variety`
- `missing_audio_asset`
- `pronunciation_without_fallback`

P3 data before content:

- `PlanContentUnit`
- `PlanExerciseBlock`
- `PlanExplanationCard`
- `PlanAudioAsset`
- `PlanAttemptEvent`

P4 then author content:

- Write day 1 only.
- Certify day 1.
- Use day 1 as quality sample.
- Then write days 2-7.

P5 then UI polish:

- Only after content/gates are real.
- UI should display exercise variety and progress clearly.
- No DEV-looking placeholders in production.

## Audit 6: Practical Implementation Roadmap

This roadmap turns audits 1-5 into a build order. The rule is simple: first create the engine that can reject bad plan content, then connect attempts/progress, then add only the first three exercise renderers, then create audio/pronunciation foundations, and only after that write `Гавань` day 1.

Current code state found during local audit:

- `app/personal_plan_catalog.ts` still owns old `PlanDay`, `PlanDailyTask`, `PlanTaskDestination`, and generated scaffold days.
- `app/personal_plan_state.ts` already has `planInstanceId`, carryover, day progress, and next-day advance logic.
- `app/personal_plan_progress.ts` stores completed tasks by `planInstanceId::taskId`.
- `app/personal_plan_quality.ts` has the first passport/gate model, but it is still tied to old task kinds and old phrase/quiz registries.
- `app/personal_plan_navigation.ts` adapts old task destinations to existing lesson, quiz, trainer, flashcard, and practice routes.
- `app/personal_plan_phrase_lessons.ts` and `app/personal_plan_quizzes.ts` are intentionally empty after reset.
- Existing tests under `tests/personal_plan_*` already guard reset behavior, task completion, cloud sync contract, premium activation, route card layout, recall, quiz screen, mistake analytics, and hard gates.

### Stage 1: Data Types Foundation

Goal:

- Add the new content model without changing UI, onboarding, Premium, or active routes.
- Keep old `PlanDay`/`PlanDailyTask` working while the new model is introduced beside it.

Files:

- Create `app/personal_plan_content_types.ts`.
- Modify `app/personal_plan_quality.ts` only to import/read the new types when present.
- Do not modify `app/personal_plan.tsx`, home screen, onboarding screens, paywall screens, or lesson UI in this stage.

Types to add:

- `PlanExerciseType`
- `PlanContentUnit`
- `PlanExerciseBlock`
- `PlanAttemptEvent`
- `PlanAudioAsset`
- `PlanPronunciationAttempt`
- `PlanExplanationCard`
- expanded `PlanDayPassport`

Compatibility rule:

- `PlanDay` remains the route/calendar wrapper for now.
- `PlanContentUnit` becomes the source of truth for product-quality content.
- `PlanDailyTask` can point to a `contentUnitId` later, but not in this stage unless tests require it.

Tests:

- Create `tests/personal_plan_content_types_contract.test.ts`.
- Assert all exercise types are explicit string literals, not open arbitrary strings.
- Assert every `PlanExerciseBlock` requires `id`, `type`, `title`, `estimatedMinutes`, `contentUnitId`, and `completionPolicy`.
- Assert `PlanAttemptEvent` can store `selectedChoiceIds`, `builtTokenIds`, `isRight`, `mistakeTags`, `planInstanceId`, `planTaskId`, and `exerciseBlockId`.
- Assert `PlanDayPassport` can report `ready`, `status`, `issues`, `exerciseTypes`, `audioAssetIds`, `explanationCardIds`, and `contentUnitIds`.

Risks:

- If new types are wired into production too early, scaffold days can start pretending to be real content.
- If types duplicate old fields too loosely, adapters become confusing.

Acceptance criteria:

- `npx jest tests/personal_plan_content_types_contract.test.ts --runInBand` passes.
- `npx tsc --noEmit --pretty false` passes.
- Existing `tests/personal_plan_*` still pass.
- No user-visible behavior changes.

Do not touch:

- perfected onboarding screens;
- Premium/paywall visuals;
- Home route card;
- existing lesson flow;
- old route destinations;
- any generated art assets.

### Stage 2: Quality Gates Framework

Goal:

- Move from a few old day checks to a gate system that can reject bad content before it reaches production.
- Keep DEV preview possible, but mark bad days as `scaffold` or `needs_review`.

Files:

- Create `app/personal_plan_quality_gates.ts`.
- Modify `app/personal_plan_quality.ts` to delegate new checks to `personal_plan_quality_gates.ts`.
- Keep existing exported functions from `personal_plan_quality.ts` stable for tests and screens.

First gates to implement:

- `missing_content_unit`
- `unsupported_exercise_renderer`
- `low_week_exercise_variety`
- `early_content_too_niche`
- `unsupported_grammar_prerequisite`
- `missing_new_word_explanation`
- `invented_wrong_feedback`
- `missing_audio_asset`
- `pronunciation_without_fallback`
- `completion_not_correctness_based`

Tests:

- Create or extend `tests/personal_plan_quality_gates_contract.test.ts`.
- For each first gate, include one good sample and one bad sample.
- Add a regression test that rejected `Гавань` day 1/day 2 content patterns cannot pass.
- Keep `tests/personal_plan_day_quality_gate.test.ts` passing for old passport callers.

Risks:

- Over-strict gates can block useful DEV iteration.
- Under-strict gates allow developer copy, fake personalization, or unsupported grammar back into Premium content.

Acceptance criteria:

- Bad content fails with stable error codes.
- Scaffold days are not production-ready.
- A synthetic good day can pass gates without touching real `Гавань` content yet.
- Gate output is readable enough to use as a content checklist.

Do not touch:

- lesson phrase rendering;
- quiz UI;
- app navigation;
- cloud sync;
- pricing/paywall logic.

### Stage 3: Attempt Events And Honest Progress

Goal:

- Make progress, mistakes, recall, analytics, and personalization depend on real attempts, not only task completion.
- Store enough data to know what user actually did without inventing wrong-choice explanations.

Files:

- Create `app/personal_plan_attempts.ts`.
- Modify `app/personal_plan_progress.ts` only if a completion helper needs to read aggregated correct attempts.
- Modify `app/personal_plan_mistake_context.ts` only to normalize new attempt context.
- Later integration into `app/lesson1.tsx` and `app/(tabs)/quizzes.tsx` happens after tests pass.

Attempt model rules:

- `isRight` is the only source for correctness-based phrase count.
- Wrong attempts log the actual wrong token/choice ids when known.
- If the UI cannot know what was selected, feedback must stay generic and must not describe imaginary options.
- Every attempt must include `planInstanceId` when it belongs to a plan.

Tests:

- Create `tests/personal_plan_attempt_events_contract.test.ts`.
- Assert correct phrase count ignores wrong attempts.
- Assert repeated wrong attempts can schedule recall.
- Assert name/contact flexible-answer categories do not pollute grammar analytics.
- Assert attempts from an old `planInstanceId` do not count for a restarted plan.

Risks:

- Double-counting if lesson completion and attempt events both increment progress.
- Privacy/noise risk if raw freeform speech text is stored too aggressively.

Acceptance criteria:

- Plan phrase progress is strictly correctness-based.
- Wrong attempts can feed mistake tags and recall queue.
- Completed task storage remains backward-compatible.
- Existing completion tests still pass.

Do not touch:

- scoring visuals;
- XP/energy economics;
- global lesson completion rules outside plan context;
- old completed task storage key shape except additive fields.

### Stage 4: Adapter For Old Routes

Goal:

- Let new `PlanExerciseBlock` content open old app surfaces safely while new renderers are being built.
- Preserve current route behavior for lesson, quiz, trainer, flashcards, and practice.

Files:

- Create `app/personal_plan_route_adapter.ts`.
- Modify `app/personal_plan_navigation.ts` to call the adapter when a task has a new exercise block reference.
- Keep `openPersonalPlanTask` signature backward-compatible.

Adapter behavior:

- `plan_phrase_build` can open `/lesson1` with plan params until native renderer exists.
- `plan_missing_word` should open a new renderer only after Stage 5.
- `plan_choose_natural` should open a new renderer only after Stage 5.
- `plan_quiz` opens `/quizzes_screen` with a real plan quiz id.
- trainer/card/practice blocks open current app routes only when due data exists.

Tests:

- Extend `tests/personal_plan_screen_contract.test.ts`.
- Extend `tests/personal_plan_quiz_screen_contract.test.ts`.
- Add `tests/personal_plan_route_adapter_contract.test.ts`.
- Assert old `PlanTaskDestination` tasks still route exactly as before.
- Assert unknown new exercise type fails closed with `unsupported_exercise_renderer`.

Risks:

- Breaking the current plan screen while adding new block types.
- Accidentally showing unsupported block types as clickable production tasks.

Acceptance criteria:

- Existing route tests pass.
- New blocks can resolve to supported destinations only.
- Unsupported new blocks are visible only as DEV/needs-review data, not production CTAs.

Do not touch:

- Expo route names unless the renderer stage creates a new screen;
- onboarding;
- paywall;
- Home card layout that user already marked as acceptable.

### Stage 5: First Three Exercise Renderers

Goal:

- Build the smallest real exercise set that gives variety without pretending to be the whole product.
- First renderers: `plan_phrase_build`, `plan_missing_word`, `plan_choose_natural`.

Files:

- Create `app/personal_plan_exercise_types.ts` if Stage 1 types need runtime constants.
- Create `app/personal_plan_exercise_runner.tsx`.
- Create `app/personal_plan_exercise_phrase_build.tsx`.
- Create `app/personal_plan_exercise_missing_word.tsx`.
- Create `app/personal_plan_exercise_choose_natural.tsx`.
- Add route screen only if needed, for example `app/personal_plan_exercise.tsx`.
- Reuse styling patterns from `app/lesson1.tsx` where interaction should feel familiar.

Renderer rules:

- `plan_phrase_build`: same mental model as lessons, but powered by `PlanContentUnit`.
- `plan_missing_word`: user fills one missing chunk, not a full sentence puzzle.
- `plan_choose_natural`: user chooses the most natural phrase from 3-4 options.
- No highlighted correct words before answer in plan practice.
- After wrong answer, explain only the target phrase and the known rule, not imaginary selected variants.
- After correct answer, show short reinforcement only if it teaches a new word/chunk.

Tests:

- Create `tests/personal_plan_exercise_renderer_contract.test.ts`.
- Assert unsupported exercise types do not render production buttons.
- Assert wrong attempt emits `PlanAttemptEvent` with `isRight: false`.
- Assert correct attempt emits `PlanAttemptEvent` with `isRight: true`.
- Assert explanation cards appear for first-use words.
- Add a lightweight component/snapshot contract only for structure, not brittle visuals.

Risks:

- Rebuilding too much of `lesson1.tsx` instead of extracting only the needed behavior.
- UI becoming another DEV-looking list instead of a clean exercise runner.

Acceptance criteria:

- Three exercise types work from synthetic content units.
- Attempt events are emitted.
- Correctness-based progress can consume attempts.
- The runner can return to the plan day after a block is complete.

Do not touch:

- existing lesson phrases;
- existing lesson intro screens;
- global quiz renderer;
- task art generation;
- day 1 final content.

### Stage 6: Audio Asset Pipeline

Goal:

- Prepare listening exercises and generated audio assets without blocking day 1 text work on production audio generation.
- Make missing audio visible to quality gates.

Files:

- Create `app/personal_plan_audio_assets.ts`.
- Extend `app/personal_plan_content_types.ts` with stable audio asset references if not already done.
- Modify `app/personal_plan_quality_gates.ts` to read audio asset requirements.
- Use `hooks/use-audio.ts` only when renderer integration starts.

Audio asset rules:

- Every generated audio asset has `id`, `contentUnitId`, `voice`, `transcript`, `durationMs`, `source`, `status`, and `fallbackAllowed`.
- `source` can be `openai_generated`, `tts_fallback`, or `manual`.
- A listening block can be DEV-previewed with fallback, but certified content needs approved assets or an explicit fallback waiver.
- Transcript mismatch fails the passport.

Tests:

- Create `tests/personal_plan_audio_assets_contract.test.ts`.
- Assert listening block without audio fails `missing_audio_asset`.
- Assert audio transcript mismatch fails `audio_transcript_mismatch`.
- Assert fallback audio marks the passport as not fully certified unless waiver is present.

Risks:

- Shipping synthetic TTS where user expects high-quality generated audio.
- Asset ids drifting when content text changes.

Acceptance criteria:

- Audio dependencies are declared in content, not hidden inside UI.
- Quality gate can tell ready audio from missing/fallback audio.
- No production listening block can pass without audio coverage.

Do not touch:

- existing lesson audio generation scripts;
- global audio hooks except read-only inspection;
- app store assets;
- DALL-E/UI art pipeline.

### Stage 7: Pronunciation MVP

Goal:

- Add a truthful pronunciation foundation without fake phoneme-level promises.
- First MVP is transcript/keyword/rhythm confidence, with fallback to non-speech mode.

Files:

- Create `app/personal_plan_pronunciation.ts`.
- Extend `app/personal_plan_attempts.ts` to support `PlanPronunciationAttempt`.
- Modify quality gates for `pronunciation_without_fallback`.
- Add renderer later only after data contracts pass.

Pronunciation MVP rules:

- Store expected phrase, recognized transcript if available, matched keywords, confidence bucket, and fallback reason.
- Never claim phoneme-level scoring unless a real phoneme evaluator exists.
- User can always switch to build/choose mode.
- Pronunciation blocks are optional for 5-minute path.

Tests:

- Create `tests/personal_plan_pronunciation_contract.test.ts`.
- Assert missing fallback fails gate.
- Assert transcript match can create a pass attempt.
- Assert low confidence creates a supportive retry state, not a hard fail.
- Assert no raw audio path is required in analytics events.

Risks:

- Overpromising speech quality.
- Blocking users with device microphone or recognition issues.

Acceptance criteria:

- Pronunciation data model exists.
- Quality gate protects against unsupported speech blocks.
- MVP can be wired later without rewriting content model.

Do not touch:

- microphone permissions in onboarding;
- native audio recording permissions;
- global analytics schema beyond additive plan attempt fields.

### Stage 8: `Гавань` Day 1

Goal:

- Write one excellent certified day as the quality sample for all future plan content.
- Do not write all week 1 until day 1 passes gates and feels right in product.

Files:

- Create `app/personal_plan_content_gavan_week1.ts`.
- Modify `app/personal_plan_catalog.ts` only to reference the day 1 content unit through the new adapter.
- Add plan quiz data only if day 1 contains a quiz block after the first three renderers are stable.
- Keep `app/personal_plan_phrase_lessons.ts` and `app/personal_plan_quizzes.ts` empty unless adapters still require legacy registries.

Content rules:

- No forced names, phone, email, address, apartment viewing, rent, doctor, bank, or narrow relocation bureaucracy in day 1.
- Day 1 is universal survival foundation: ask for help, say you do not understand, ask to repeat, ask for a minute, confirm simply.
- Phrases must be socially normal, common, and useful outside one niche situation.
- Every new meaningful word has a `PlanExplanationCard`.
- Wrong-answer explanations never mention a selected wrong option unless the attempt event knows it.

Tests:

- Create `tests/personal_plan_gavan_day1_contract.test.ts`.
- Assert day 1 passes all content gates.
- Assert day 1 uses only allowed grammar prerequisites.
- Assert day 1 has 5/10/15/20 load paths.
- Assert day 1 contains at least the first three exercise types if time choice allows.
- Assert no rejected content patterns return.

Risks:

- Writing content before the engine can verify it.
- Making day 1 too narrow again.
- Adding a beautiful screen over weak pedagogy.

Acceptance criteria:

- Day 1 has a ready passport.
- 5-minute path is useful alone.
- 15-minute path feels like a complete daily workout.
- Attempts, mistakes, explanations, and progress all connect.
- User copy contains no developer language.

Do not touch:

- all 18 weeks;
- day 2-7 final content;
- onboarding/paywall visuals;
- Home card design;
- generated route art unless a separate design task is opened.

## Audit 6: Final Implementation Map

P0 guardrails already done:

- Rejected `Гавань` day 1/day 2 content removed from active registries.
- Old plan phrase lessons and quizzes are empty after reset.
- Tests protect reset behavior and old bad ids.

P1 build the engine:

- Stage 1: data types foundation.
- Stage 2: quality gates framework.
- Stage 3: attempt events and honest progress.

P2 bridge old app surfaces:

- Stage 4: adapter for old routes.
- Keep old lesson/quiz/trainer/card/practice paths working.
- Fail closed for unsupported new exercise blocks.

P3 create first real variety:

- Stage 5: `plan_phrase_build`.
- Stage 5: `plan_missing_word`.
- Stage 5: `plan_choose_natural`.

P4 prepare skill depth:

- Stage 6: audio asset pipeline.
- Stage 7: pronunciation MVP.

P5 author only one premium-quality sample:

- Stage 8: `Гавань` day 1.
- Certify with `PlanDayPassport`.
- Use it as the template for week 1.

P6 after day 1 is accepted:

- Write `Гавань` days 2-7.
- Add listening and pronunciation renderers.
- Add mistake repair and card sprint blocks.
- Then extend to other plans.

Hard no-touch list during roadmap execution:

- Do not alter the finished onboarding screens unless a task explicitly says to connect an existing screen to the new engine.
- Do not redesign the Home plan card unless explicitly requested.
- Do not change Premium pricing, store products, or unlock rules.
- Do not reintroduce forced identity/contact/address/apartment content into week 1.
- Do not claim pronunciation precision the app cannot measure.
- Do not mark scaffold content as production-ready.

## Audit 7: UI/UX Flow For Personal Plans Exercise Runner

This audit defines how the new Personal Plans runner should feel before implementation. The goal is not another developer calendar screen. The goal is a premium daily workout: obvious next action, clean progress, varied exercises, helpful explanations, and zero fake complexity.

Local UI context:

- Home plan card should not be changed unless explicitly requested.
- `app/personal_plan.tsx` is the current plan screen.
- `app/lesson1.tsx` is the closest interaction reference for phrase build behavior.
- `app/personal_plan_navigation.ts` currently opens old routes from plan tasks.
- The new runner should reuse the app's theme accents, not introduce random green/blue/red mixes.

Design direction:

- Product type: mobile language learning tool for adults, not a kids game.
- Style: dark premium, tactile, large clear controls, restrained liquid glass/volume.
- Interaction: one primary action per block, large buttons, minimal copy, strong state feedback.
- Accessibility: touch targets at least 44px; contrast must pass; progress cannot depend on color alone.
- Animation: 150-300ms, transform/opacity only, reduced-motion support.

Design anti-patterns to avoid:

- fake buttons or decorative controls that do nothing;
- tiny status chips with technical labels;
- repeating `DEV`, `source`, `destination`, `route`, `active recall`, or implementation words in production UI;
- mixed plan accents that clash with the selected app theme;
- long text inside buttons;
- explaining wrong answers by inventing options the user may not have selected;
- showing a task as available when its renderer, content, audio, or fallback is not certified.

### Screen 1: Plan Day Overview

Purpose:

- Show today's workout and the order of blocks.
- Make the next action obvious.
- Let DEV inspect all days without leaking DEV UI into production.

Data required:

- `PersonalPlanState.planInstanceId`
- `PlanDayRuntime`
- `PlanDayPassport`
- `PlanContentUnit[]`
- completed/carryover status
- selected minutes: 5/10/15/20
- theme accent tokens

Production UI:

- Header: back button, plan/day label, day title, overall progress percent.
- Day progress: one clear progress bar or vertical step rail, not both if the screen becomes noisy.
- Task list: large tactile blocks with icon/art, title, one short subtitle, estimated time, primary action.
- Completed block: calm check state, button says `Повторить` only if replay is allowed.
- Next block: visually strongest card and primary CTA.
- Locked/unsupported block: hidden in production unless it is required to explain why the day is not ready.

Recommended copy shape:

- Title: action result, not technical source.
- Subtitle: one human sentence.
- CTA: `Начать`, `Открыть`, `Повторить`, `Продолжить`.

Forbidden copy:

- `Задание дня`
- `Нужная часть урока выполнена`
- `Применяем в маршруте`
- `обычный урок`
- `количество фраз`
- `DEV`
- `source`
- `destination`

Quality gates:

- `ui_no_dev_copy`
- `ui_single_primary_action`
- `ui_touch_targets_valid`
- `ui_theme_accent_consistent`
- `ui_task_state_clear`

### Screen 2: Transition Into Exercise

Purpose:

- Move from plan block into exercise without making the user feel they left the plan.

Data required:

- block id;
- exercise type;
- content unit id;
- plan/day/task context;
- continuation state if user returns mid-block.

Production UI:

- Keep a small plan context label in the runner: plan name + short day title.
- Show progress for the current block, not a noisy global dashboard.
- Back action should return to the day overview and preserve attempt state.

Behavior:

- If the exercise is a linked old lesson slice, use adapter and show plan context only where existing lesson UI can safely support it.
- If native renderer exists, open `personal_plan_exercise` with block context.
- If renderer is missing, production must not open it.

Quality gates:

- `ui_context_preserved`
- `ui_back_state_preserved`
- `unsupported_exercise_renderer`

### Screen 3: Exercise Idle State

Purpose:

- Let the user understand what to do in under two seconds.

Data required:

- prompt;
- answer options/tokens;
- optional audio asset;
- explanation cards for new words/chunks;
- attempt state.

Production UI:

- Top: compact progress, not a bulky status card.
- Middle: prompt and interaction area.
- Bottom: large action/answer controls.
- Primary action stays in the thumb zone.

Exercise-specific rules:

- `plan_phrase_build`: same familiar build model as lessons, but no pre-highlighted correct words.
- `plan_missing_word`: one missing chunk, clear blank, options close to the prompt.
- `plan_choose_natural`: choices are full phrase options; the task asks for the natural phrase, not a grammar exam.

Copy rule:

- The instruction should be one line when possible.
- If the UI itself explains the action, do not add an instruction sentence.

Quality gates:

- `ui_instruction_short`
- `ui_no_answer_leak`
- `ui_options_fit_screen`
- `ui_answer_area_not_empty`

### Screen 4: Correct Answer State

Purpose:

- Reinforce confidence and teach only when useful.

Data required:

- `PlanAttemptEvent.isRight = true`
- explanation card id if this word/chunk is first-use or important;
- next item/block progress.

Production UI:

- Correct state tint uses the current theme accent and success contrast.
- Show the answer clearly.
- If explanation exists, show one concise card in the middle empty space.
- Bottom CTA: `Дальше`.

Explanation tone:

- Warm, specific, not childish.
- One idea per card.
- Example: `I need` is a calm way to say what you need right now. It is shorter and safer than trying to build a long sentence.

Do not:

- celebrate every correct tap with a modal;
- show long grammar tables;
- explain things already mastered unless the passport marks first-use/review.

Quality gates:

- `ui_explanation_not_overlong`
- `ui_correct_feedback_has_next_action`
- `ui_no_modal_spam`

### Screen 5: Wrong Answer State

Purpose:

- Help user recover without shame and without invented explanations.

Data required:

- actual selected token ids or choice ids when available;
- target answer;
- known explanation card;
- mistake tags.

Production UI:

- Wrong state uses a restrained error tint.
- Show target answer or the corrected chunk.
- Explanation appears in the middle space, but only talks about the target phrase and known rule.
- Bottom CTA: `Попробовать ещё` or `Дальше`, depending on exercise policy.

Explanation rule:

- If selected wrong option is unknown, do not say why a specific wrong option is wrong.
- Say what to look for next time.

Good wrong-answer style:

- `Тут лучше I need help. Так ты сразу называешь просьбу: мне нужна помощь. Без длинного вступления, всё понятно.`

Bad wrong-answer style:

- `You chose appointment, but viewing means apartment visit.`
- This is bad because the app may not know what user chose and the content is too narrow for week 1.

Quality gates:

- `invented_wrong_feedback`
- `ui_wrong_feedback_supportive`
- `ui_retry_policy_clear`
- `attempt_selected_ids_required_when_specific_feedback`

### Screen 6: Explanation Cards

Purpose:

- Teach new words/chunks at the exact moment they matter.

Data required:

- `PlanExplanationCard`
- trigger: first-use, wrong attempt, correct reinforcement, review;
- linked content unit/block.

Card structure:

- `title`: the chunk or word.
- `body`: one plain-language explanation.
- `example`: one short example if needed.
- `tone`: `correct`, `wrong`, `neutral`, or `review`.

Placement:

- Middle of exercise screen where empty space already exists.
- Not a blocking modal unless the concept is required before moving on.

Style:

- glass surface;
- soft border;
- theme accent only for the key word/chunk;
- no dense paragraphs.

Quality gates:

- `missing_new_word_explanation`
- `ui_explanation_trigger_valid`
- `ui_explanation_readable_length`
- `ui_explanation_no_grammar_dump`

### Screen 7: Block Complete

Purpose:

- Close one block cleanly and return user to the plan or continue naturally.

Data required:

- block completion policy;
- correct attempts count;
- required correct count;
- carryover/remedial mistakes;
- next block id.

Production UI:

- No bulky modal for every micro-completion if the user is in flow.
- For first MVP, use a bottom sheet only at the end of a block.
- Title should be natural: `Блок готов`, `Есть`, `Отлично, идём дальше`.
- CTA primary: `К заданиям` or `Следующий блок`.
- Secondary: `Повторить` only when useful.

Forbidden copy:

- `Нужные фразы засчитаны`
- `Можно вернуться к маршруту`
- `часть маршрута готова`

Quality gates:

- `ui_completion_copy_human`
- `ui_completion_not_every_phrase`
- `completion_not_correctness_based`

### Screen 8: Return To Plan

Purpose:

- Show visible progress after a block is done.

Data required:

- updated completed tasks;
- attempt summary;
- day progress;
- next available block.

Production UI:

- Completed card visibly changes state.
- Next card becomes the strongest CTA.
- Day progress updates immediately.
- If day complete, show a calm end-of-day state.

End-of-day copy:

- `На сегодня готово. Можно выдохнуть.`
- `Хочешь ещё — потренируй карточки или зайди в уроки самостоятельно.`
- `Если хватит на сегодня, это тоже нормальный ход.`

Quality gates:

- `ui_progress_updates_after_completion`
- `ui_next_action_visible`
- `ui_day_done_state_present`

### Screen 9: Carryover State

Purpose:

- If a user did not finish yesterday, keep the right unfinished blocks without guilt.

Data required:

- unfinished blocks from previous days;
- current date;
- plan instance;
- selected minutes.

Production UI:

- Do not shame the user.
- Show a simple label: `Продолжаем с прошлого раза`.
- The carried block appears first.
- New day does not advance until required blocks are complete.

Forbidden copy:

- `Ты отстал`
- `Просрочено`
- `Долг`
- any punishment language.

Quality gates:

- `carryover_broken`
- `ui_carryover_no_shame_copy`
- `ui_carryover_first_in_order`

### Screen 10: DEV And Production Modes

Purpose:

- Let developers inspect plans without polluting user UI.

DEV mode can show:

- passport status;
- gate issues;
- content unit ids;
- exercise type ids;
- all days and all plans;
- missing renderer/audio/explanation warnings.

Production mode must show:

- only ready/certified content;
- human task names;
- clean progress;
- no technical ids;
- no fake locked premium content inside active paid plan.

Quality gates:

- `ui_dev_copy_hidden_in_production`
- `ui_scaffold_hidden_in_production`
- `ui_certified_content_required`

### UI Acceptance Criteria For First Runner MVP

The first MVP is acceptable only when:

- a user can open a day, start the next block, answer, see helpful feedback, complete the block, and return with progress updated;
- wrong answers log attempts and do not trigger fake explanations;
- first-use words/chunks can show explanation cards;
- the three first exercise types share one visual language;
- unsupported exercise types fail closed;
- production UI has no DEV copy;
- all touch targets are large enough;
- the screen works at common mobile sizes without text overlap;
- Home plan card remains untouched unless a separate task says otherwise.

## Audit 7: Updated Implementation Map

P1 engine still comes first:

- data types;
- quality gates;
- attempt events;
- route adapter.

P2 UI runner foundation:

- `personal_plan_exercise_runner.tsx`
- shared progress/header;
- shared explanation card;
- shared completion bottom sheet;
- shared attempt emission.

P3 first renderers:

- phrase build;
- missing word;
- choose natural.

P4 UI gates:

- no DEV copy in production;
- no answer leak;
- explanation length/readability;
- touch targets;
- context preserved;
- progress updates after completion.

P5 then content:

- write `Гавань` day 1 only after runner contracts exist.
- certify day 1 through content gates and UI gates.

## Audit 8: Content Authoring Playbook After Reset

This playbook is the writing contract for all future Personal Plans content. It exists because weak content cannot be fixed by better UI. If the phrases are narrow, stiff, fake-personal, or over-specific, the plan stops feeling like a premium feature.

Core principle:

- A plan day is a daily workout, not a topic essay.
- A phrase is accepted only if a real adult could say it today without sounding like a textbook.
- A block teaches one useful behavior at a time.
- Every explanation must feel hand-written and must answer a real learner question.

### Authoring Pipeline

Every day must be written in this order:

1. Define the learner behavior.
2. Check grammar prerequisites.
3. Pick exercise block mix for 5/10/15/20 minutes.
4. Write candidate phrases.
5. Remove narrow or fake-personal phrases.
6. Write explanations for new chunks and words.
7. Write answer options and distractors.
8. Write audio script and pronunciation targets.
9. Write quiz only from already exposed material.
10. Run human quality checklist.
11. Run automated quality gates.
12. Only then mark the day ready.

Do not start with a topic title like `doctor`, `bank`, or `apartment`. Start with behavior:

- ask for help;
- recover when you did not understand;
- ask someone to repeat;
- confirm a detail;
- say what you need;
- answer briefly;
- choose a natural phrase;
- repair a mistake.

### Phrase Writing Rules

Good phrase traits:

- short enough to remember;
- useful outside one tiny situation;
- common in modern spoken English;
- does not require fake user facts;
- contains only grammar already introduced or explained that day;
- has one clear reason to exist;
- can be heard, built, recognized, and reused.

Bad phrase traits:

- too formal for everyday speech;
- only useful for one bureaucratic niche;
- built around forced name/phone/email/address;
- asks user to pretend facts the app does not know;
- includes a word that needs context but has no explanation;
- sounds like a phrasebook from another century;
- exists only because a topic list needed more items.

Good examples for early universal foundation:

- `I need help.`
- `I don't understand.`
- `Can you repeat that?`
- `Can you say that slowly?`
- `Just a minute, please.`
- `Where is this?`
- `Is this right?`
- `That works for me.`

Rejected early examples:

- `My phone number is 087...`
- `My email is alex at mail dot com.`
- `I am here for the apartment viewing.`
- `I have an appointment under my name.`
- `Please find enclosed my documents.`
- `Could you kindly provide the relevant form?`

Reason:

- These may be useful later, but they are too narrow or too identity/contact-heavy for the first universal foundation week.

### The "Alive Or 1800 Textbook" Test

Before accepting a phrase, ask:

- Would someone say this in a real small interaction today?
- Is there a shorter natural version?
- Does it sound calm rather than ceremonial?
- Can a beginner use it without building a long sentence?
- Does it avoid fake specifics?
- Would it still be useful in three different contexts?

If the phrase fails two or more checks, reject it or rewrite it.

Examples:

- Stiff: `I would like to inquire about the location of the office.`
- Alive: `Where is the office?`
- Stiff: `I am unable to comprehend your statement.`
- Alive: `I don't understand.`
- Stiff: `Could you repeat the information one more time for me?`
- Alive: `Can you repeat that?`

### Anti-Niche Rule

A week can have a plan identity, but early content must stay broad.

For `Гавань`, the plan identity is relocation and everyday life. Week 1 should not immediately become apartment forms, deposits, clinics, bank cards, and addresses. First it teaches survival behaviors that help everywhere.

Allowed early context:

- asking for help;
- asking to repeat;
- saying you do not understand;
- finding something;
- confirming simple details;
- saying what you need;
- short polite recovery.

Delayed context:

- rent/deposit;
- exact address/postcode;
- phone/email spelling;
- doctor appointment;
- bank account/card problem;
- documents/forms;
- school/city services.

Gate:

- If a day 1-3 phrase only works in one narrow institution, it fails `early_content_too_niche`.

### Explanation Card Rules

Explanation cards are not grammar lectures. They are small moments of clarity.

Each explanation card must contain:

- the chunk or word being explained;
- why it works here;
- what learner should notice next time;
- one simple example only if it helps.

Correct-answer tone:

- calm confirmation;
- reinforces what the user did right;
- no over-celebration;
- no long theory.

Wrong-answer tone:

- supportive;
- explains the target phrase;
- does not shame;
- does not invent the wrong choice if the attempt does not store it.

Good correct explanation:

- `I need` is a simple way to say what you need right now. After it, add the thing: `I need help`, `I need a minute`.

Good wrong explanation:

- `I need help` works because the request comes right after `need`. Short, direct, and easy to understand.

Bad explanation:

- `You picked appointment, but viewing is for apartments.`

Reason:

- It assumes a selected option and uses narrow vocabulary that may not belong in early week 1.

Forbidden explanation patterns:

- explaining a wrong option that was not actually selected;
- grammar tables in a small feedback card;
- jokes that obscure the point;
- "this construction is used in the route";
- "the required amount is counted";
- any developer wording.

### Answer Options And Distractors

Distractors must teach discrimination, not create random noise.

For phrase build:

- distractors should be plausible within the same grammar neighborhood;
- avoid random words from unrelated situations;
- avoid options that make the answer impossible to understand why;
- do not pre-highlight correct words in plan practice.

For missing word:

- options should test one decision;
- one option is clearly correct after understanding the phrase;
- wrong options should reveal a common confusion.

For choose natural:

- wrong choices can be grammatically possible but less natural;
- at least one wrong choice can be too formal or too literal;
- explanations should say why the correct one is safer/natural.

Bad distractor set:

- target: `I need help`
- options: `apple`, `viewing`, `postcode`, `dragon`

Good distractor set:

- target: `I need help`
- options: `need`, `am`, `can`, `have`

Why:

- The user is deciding how to express need, not guessing from nonsense.

### Quiz Rules

Plan quizzes are not generic grammar quizzes.

Rules:

- exactly 10 questions when a quiz block exists;
- every question points to content already introduced that day or earlier;
- no new grammar appears first in the quiz;
- quiz copy must tell user what to do in plain language;
- answer explanations follow the same explanation card rules;
- questions cover meaning, naturalness, recall, and listening where possible.

Question mix for a day quiz:

- 3 recognition questions;
- 2 natural phrase choices;
- 2 missing chunk questions;
- 2 meaning/listening questions if audio exists;
- 1 repair or review question from mistakes if data exists.

Forbidden:

- To Be question forms if the day has not introduced them;
- random quiz items from unrelated lessons;
- fake personalization like "your weak spot" without evidence;
- hidden new vocabulary in wrong answers.

### Audio Script Rules

Audio is content, not decoration.

Every audio script must include:

- exact transcript;
- natural speed version;
- optional slow version for first exposure;
- voice/tone direction;
- noise/background rule;
- allowed fallback state.

Voice direction:

- calm adult speaker;
- normal pace, not theatrical;
- clear but not robotic;
- no exaggerated acting;
- no noisy cafe/airport bed in MVP unless listening goal requires it.

Listening exercise rule:

- first play can hide English transcript;
- replay is allowed;
- transcript reveals after answer;
- explanation focuses on the word/chunk that makes meaning clear.

Gate:

- audio block without approved asset or explicit fallback fails `missing_audio_asset`.

### Pronunciation Target Rules

Pronunciation blocks must be honest.

Good first targets:

- short phrase;
- high usefulness;
- clear rhythm;
- no numbers, addresses, names, or email;
- contains words already explained.

Bad first targets:

- long bureaucratic sentence;
- phrase with many proper nouns;
- exact phone/email/address;
- rare word that has not been explained.

Feedback rules:

- evaluate what the system can actually measure;
- do not claim phoneme-level precision without real phoneme scoring;
- include fallback to build/choose mode;
- support retry without making the user feel blocked.

Good feedback:

- `The key words came through. Try it once more with a shorter pause after I.`

Bad feedback:

- `Your pronunciation is wrong.`

### Daily Workout Block Rules

A day is not a repeated set of four identical cards.

Good daily mix:

- one main learning block;
- one recognition or build block;
- one recall/review block;
- optional listening/pronunciation/quiz for longer time choices.

5 minutes:

- one useful block;
- no mandatory speech;
- no long quiz.

10 minutes:

- two blocks;
- main plus reinforcement.

15 minutes:

- three blocks;
- main, reinforcement, recall/listening.

20 minutes:

- four blocks;
- add speech, quiz, card sprint, or micro dialogue only if meaningful.

Gate:

- a week needs variety across days, not the same "lesson, phrase, recall, quiz" rhythm every day.

### Forbidden Patterns

Global forbidden content:

- forced user name, phone, email, address, postcode, or exact appointment details in early foundation;
- fake facts about user;
- over-specific relocation bureaucracy before foundation is built;
- "scene" naming;
- "route", "apply in route", "active recall", "generated day", "source", "destination" in production copy;
- formal letter language in spoken practice;
- jokes that require cultural decoding;
- shame language for carryover;
- "learn English in 30 days" promises;
- fake AI/personalization claims.

Forbidden phrase families for `Гавань` week 1 foundation:

- apartment viewing;
- deposit/rent/bills;
- clinic/doctor symptoms;
- bank card/account;
- document/form submission;
- school/city services;
- exact contact exchange.

Allowed later:

- These can return after prerequisites exist and after the user has broad survival phrases.

### Human Quality Checklist

Before a content unit can enter gates, a human/agent review must answer yes to all:

- I can imagine a real person saying this phrase today.
- The phrase is useful in more than one context, unless the day is intentionally advanced/niche.
- The grammar was already introduced or is explained in this block.
- No fake user data is required.
- Every important word has an explanation card.
- Wrong feedback does not invent a selected wrong option.
- Distractors test a real confusion.
- Audio transcript matches phrase text.
- Pronunciation target is short and measurable.
- Quiz questions do not introduce new grammar.
- UI copy sounds like product copy, not developer notes.

If any answer is no, the unit stays `needs_review`.

### Preparing Content For Gates

Every `PlanContentUnit` should ship with:

- `contentUnitId`;
- plan id;
- day index;
- behavior goal;
- grammar prerequisites;
- phrase list;
- exercise blocks;
- explanation card ids;
- audio asset ids;
- pronunciation target ids;
- quiz source coverage;
- forbidden-pattern scan result;
- human quality checklist result.

Every phrase should include:

- target text;
- user-language meaning;
- allowed grammar tags;
- new word/chunk tags;
- distractor rationale;
- explanation card references;
- audio reference if used;
- analytics tags.

Every exercise block should include:

- exercise type;
- completion policy;
- required correct count;
- retry policy;
- attempt event shape;
- fallback path;
- UI state copy.

### Authoring Acceptance Criteria

The playbook is satisfied when:

- content can be rejected before UI work begins;
- a future agent can write a day without reintroducing old rejected patterns;
- gates can check phrase scope, grammar prerequisites, explanations, audio, quiz coverage, and UI copy;
- day content can support multiple exercise types without changing the phrase meaning;
- `Гавань` day 1 can be written as a premium sample, not a test placeholder.

## Audit 8: Updated Implementation Map

P1 content authoring contract:

- Add authoring rules to future gates.
- Keep this playbook as the source for phrase/explanation/distractor review.

P2 data needs:

- `PlanContentUnit` must store behavior goal, grammar prerequisites, phrase metadata, explanations, audio, pronunciation, and quiz coverage.
- `PlanExplanationCard` must store trigger and tone.
- `PlanAttemptEvent` must store actual selected ids before any specific wrong feedback is allowed.

P3 gate additions:

- `phrase_not_modern_spoken`
- `phrase_too_niche_for_week`
- `fake_user_fact_required`
- `missing_distractor_rationale`
- `quiz_introduces_new_material`
- `audio_script_missing`
- `pronunciation_target_too_complex`
- `human_quality_check_failed`

P4 implementation order:

- Build data model.
- Build gates.
- Build attempt events.
- Build first renderers.
- Then author `Гавань` day 1 with this playbook.

## Audit 9: Analytics And Personalization Model

Personalization must be earned by data. The app should never say "your weak spot" or "personal recommendation" unless it can point to real attempts, mistakes, due reviews, quiz results, lesson progress, card activity, trainer queues, audio/listening attempts, or pronunciation attempts.

Local code context:

- `app/personal_plan_generator.ts` already reads lessons, quizzes, mistakes, cards, resolved trainings, trainer dashboard, and activity.
- `app/trainer_store.ts` already supports `planId`, `planInstanceId`, `planTaskId`, `planDayIndex`, and `planPhraseLessonId` on trainer items.
- `app/active_recall.ts` already stores due phrases with source, error word, category, grammar tag, interval, ease factor, and due date.
- `app/personal_plan_progress.ts` stores task completion by `planInstanceId::taskId`.
- `app/personal_plan_mistake_context.ts` already compacts plan mistake context and skips flexible name categories.
- Missing layer: a clean `PlanAttemptEvent` stream that connects all exercise attempts to personalization without fake claims.

### Event Sources

Personal Plans should collect signals from:

- plan exercise attempts;
- linked lesson slices;
- daily plan quizzes;
- normal quizzes when relevant to plan content;
- lesson phrase progress;
- mistake log;
- active recall due/completed items;
- trainer due/completed items;
- flashcards saved/reviewed;
- audio listening attempts;
- pronunciation attempts;
- practice sessions;
- activity/streak consistency.

Events should be additive. Existing storage should not be rewritten just to make the plan work.

### Core Event Types

`plan_attempt_recorded`:

- source: plan exercise runner;
- fields: `planInstanceId`, `planId`, `dayIndex`, `taskId`, `contentUnitId`, `exerciseBlockId`, `exerciseType`, `phraseId`, `isRight`, `attemptIndex`, `selectedChoiceIds`, `builtTokenIds`, `mistakeTags`, `createdAt`.

`plan_block_completed`:

- source: runner or route adapter;
- fields: `planInstanceId`, `taskId`, `exerciseBlockId`, `requiredCorrect`, `correctCount`, `wrongCount`, `completedAt`.

`plan_quiz_completed`:

- source: plan quiz;
- fields: `planInstanceId`, `quizId`, `questionCount`, `correctCount`, `wrongQuestionIds`, `coverageSourceIds`, `completedAt`.

`plan_audio_attempted`:

- source: listening block;
- fields: `audioAssetId`, `listenedCount`, `replayCount`, `answerRevealed`, `isRight`, `transcriptShownAt`.

`plan_pronunciation_attempted`:

- source: pronunciation block;
- fields: `targetPhraseId`, `recognizedTranscript`, `matchedKeywords`, `confidenceBucket`, `fallbackUsed`, `isAccepted`.

`plan_review_item_due`:

- source: active recall/trainer queue;
- fields: `itemId`, `source`, `dueAt`, `errorCount`, `grammarTag`, `category`, `planContext`.

`plan_recommendation_rendered`:

- source: day generator;
- fields: `reasonCode`, `evidenceIds`, `blockId`, `shownAt`.

This last event is important because recommendations need auditability.

### Signals To Derive

Weak spots:

- repeated wrong attempts on same phrase;
- repeated wrong attempts on same word/chunk/category;
- trainer item due with plan context;
- active recall item due with grammar tag;
- quiz question wrong twice or more;
- pronunciation low confidence on same phrase;
- listening replay count high plus wrong answer.

Carryover:

- required block not completed;
- required correct count not reached;
- user exits before completion;
- app closes mid-block;
- speech/listening fallback fails and no alternative completed.

Review queue:

- wrong plan phrase returns soon;
- wrong word/chunk gets a small repair block;
- wrong quiz item can become a recognition or missing-word block;
- repeated lesson mistake can become trainer/practice block if enough material exists.

Next-day block selection:

- unfinished carryover blocks always first;
- due trainer/practice block only if enough material exists;
- weak spot block only if evidence count is enough;
- new learning block only after prerequisites;
- listening/speech only if audio/fallback requirements pass;
- optional fourth block only for 20-minute users.

Progress score:

- task completion;
- correct attempts;
- plan content unit completion;
- general lesson progress;
- quiz success;
- review completion;
- trainer/practice completion;
- consistency/activity.

Progress must never increase from wrong phrase attempts alone.

### Weak Spot Model

Recommended type:

- `id`
- `planInstanceId`
- `source`
- `tag`
- `label`
- `evidenceIds`
- `weight`
- `firstSeenAt`
- `lastSeenAt`
- `status`: `active`, `cooling_down`, `resolved`
- `cooldownUntil`

Weight formula:

- wrong phrase attempt: +3;
- wrong quiz item: +2;
- wrong listening item: +2;
- pronunciation low confidence: +1;
- due trainer item: +2;
- due active recall item: +2;
- correct repair: -2;
- two correct repairs in a row: mark `cooling_down`;
- resolved after enough correct repairs or trainer archive.

Gate:

- If evidenceIds are empty, do not show personalized copy.

### Review Queue Model

Review items should come from:

- plan attempts;
- active recall;
- trainer queue;
- quiz mistakes;
- flashcards due;
- pronunciation retries.

Recommended item fields:

- `id`
- `planInstanceId`
- `source`
- `contentUnitId`
- `phraseId`
- `wordOrChunk`
- `grammarTag`
- `category`
- `dueAt`
- `priority`
- `attemptCount`
- `wrongCount`
- `correctStreak`
- `recommendedExerciseType`

Selection order:

1. Carryover required blocks.
2. Due review with highest priority.
3. Current day prerequisite reinforcement.
4. New content block.
5. Optional enrichment block.

### Next-Day Personalization Rules

The day generator can say:

- `Продолжаем с прошлого раза` when carryover exists.
- `Вернём одну фразу, которая вчера мешала` when there is a real wrong attempt.
- `Добавим короткое повторение` when active recall/trainer has due items.
- `Сегодня без лишнего: один важный блок` for 5-minute users.

The day generator cannot say:

- `Твоё слабое место` with no repeated evidence.
- `Мы заметили проблему с speaking` from one failed recognition event.
- `Персонально для тебя` when the block is just default content.
- `Ты отстал`, `долг`, `просрочено`.

### Progress Score

Use two separate progress values:

- day progress;
- plan progress.

Day progress:

- based on required blocks for selected minutes;
- block complete only when completion policy passes;
- phrase block complete only from correct attempts;
- optional extra blocks do not block day completion.

Plan progress:

- 50% from completed plan required blocks;
- 20% from correct plan attempts and recall completion;
- 15% from linked lesson progress relevant to plan prerequisites;
- 10% from quiz completion/success;
- 5% from trainer/card/practice support work.

Why not 100% tasks:

- The plan should respect general app progress, but not let unrelated activity fully replace plan work.

Gate:

- progress must be explainable in DEV mode with source counts.

### Personalization Inputs By Product Area

Lessons:

- completed lesson ids;
- phrase ids correctly completed;
- repeated lessons;
- prerequisite grammar covered;
- plan linked lesson slices completed.

Quizzes:

- plan quiz ids;
- question ids;
- correct/wrong;
- coverage source ids;
- level;
- attempt count.

Mistakes:

- phrase;
- expected token;
- selected token when known;
- category;
- grammar tag;
- plan context.

Cards:

- saved cards;
- reviewed cards;
- due cards;
- source ids;
- plan tags when available.

Trainer:

- due count;
- queue type;
- hardest category;
- plan context;
- archived/resolved state.

Audio:

- listen count;
- replay count;
- answer correctness;
- transcript reveal;
- audio asset id.

Pronunciation:

- target phrase;
- recognized transcript if available;
- matched keywords;
- confidence bucket;
- fallback used.

Activity:

- active days;
- current streak;
- missed days;
- session length;
- plan day completion consistency.

### Data Not To Collect Or Show

Do not store:

- raw microphone audio in plan analytics by default;
- sensitive personal details from user speech;
- exact address, phone, email, medical details, bank details;
- freeform text beyond what is needed for immediate feedback unless user explicitly saves it;
- personally identifying onboarding answers beyond plan selection/minutes/level unless product already stores them safely.

Do not show:

- private mistake details as shame copy;
- "you failed" language;
- detailed hidden scoring;
- confidence percentages for speech if the system cannot support them;
- fake precision like "87% pronunciation" in MVP.

### Avoiding Fake Personalization

Every personalized block needs:

- reason code;
- evidence ids;
- minimum evidence threshold;
- fallback generic copy.

Minimum thresholds:

- one carryover block is enough for carryover copy;
- two wrong attempts on same tag or one wrong + due recall for weak spot copy;
- at least 3 due practice phrases or 5 due words before adding `Моя практика`;
- at least 5 saved/due cards before adding card block;
- at least one real trainer due item before trainer block;
- pronunciation block personalization requires at least two speech attempts or one user-selected speech goal.

Generic fallback:

- Use "короткое повторение" instead of "твоё слабое место" when evidence is weak.

### Quality Gates

`personalization_without_evidence`:

- checks that recommendation reason has evidence ids.

`weak_spot_threshold_not_met`:

- checks repeated evidence before weak-spot copy.

`practice_block_without_material`:

- checks minimum 3 phrases or 5 words.

`flashcard_block_without_due_cards`:

- checks enough cards exist.

`trainer_block_without_due_items`:

- checks trainer dashboard has due items.

`progress_from_wrong_attempts`:

- blocks progress increments from wrong phrase attempts.

`plan_instance_analytics_leak`:

- old instance events cannot affect current plan.

`sensitive_data_in_event`:

- blocks phone/email/address/medical/bank text in plan analytics event payloads.

`fake_speech_precision`:

- blocks unsupported speech percentage/phoneme copy.

`recommendation_reason_missing`:

- every personalized block must declare why it appeared.

### First Test Strategy

Unit tests:

- derive weak spots from attempt events;
- reject fake personalization without evidence;
- progress ignores wrong attempts;
- old `planInstanceId` events are ignored;
- carryover outranks new content;
- practice/trainer/card blocks require enough material.

Integration tests:

- wrong plan exercise attempt creates review item;
- completed repair reduces weak spot weight;
- plan quiz wrong question becomes review candidate;
- trainer due item can become plan block only with real due data;
- day progress updates after correct block completion.

Privacy tests:

- event sanitizer removes or rejects sensitive fields;
- pronunciation attempt does not require raw audio storage;
- recommendation copy does not expose raw wrong answer text unless safe.

UI contract tests:

- no personalized copy appears when evidence threshold is not met;
- carryover copy is neutral;
- DEV mode can show reason codes, production cannot show technical ids.

### Analytics Acceptance Criteria

This system is ready when:

- every recommendation has a reason and evidence;
- weak spots are computed from real attempts/mistakes/due items;
- progress is correctness-based where correctness matters;
- carryover always wins over new content;
- trainer/practice/cards appear only when enough material exists;
- privacy-sensitive data is not stored in plan analytics;
- the user-facing copy feels helpful, not surveillance-heavy;
- DEV can audit why a block appeared.

## Audit 9: Updated Implementation Map

P1 event layer:

- add `PlanAttemptEvent` storage;
- add event sanitizer;
- include `planInstanceId` everywhere.

P2 derivation layer:

- derive weak spots;
- derive review queue;
- derive progress score;
- derive recommendation reasons.

P3 generator layer:

- choose carryover first;
- then due review;
- then new content;
- then optional enrichment for longer time choices.

P4 gates:

- evidence required for personalization;
- no progress from wrong attempts;
- no old instance leakage;
- no sensitive payloads;
- no fake speech precision.

P5 UI:

- production shows human reason copy only;
- DEV shows reason codes and evidence ids.

## Audit 10: Final Master Implementation Plan

### Decision

We have enough audit information to start implementation. More competitor research is no longer the best next step.

The winning route is a vertical engine slice before content:

1. Lock the new data model and attempt event contract.
2. Add gates that block bad content and fake personalization.
3. Build the first three exercise renderers against the contract.
4. Only then author `Gavan` week 1.

This is the safest path because the biggest historical failure was not lack of phrase ideas. The failure was that content could enter the product before the engine could prove it was broad, natural, explainable, measurable, and recoverable.

### Hard Gate

Do not write final `Gavan` day 1 content until these are true:

- `PlanContentUnit` exists and can represent phrase, vocabulary, grammar prerequisite, explanation, audio target, analytics tags, and recovery behavior.
- `PlanExerciseBlock` exists and can represent at least:
  - `plan_phrase_build`;
  - `plan_missing_word`;
  - `plan_choose_natural_phrase`.
- `PlanAttemptEvent` exists and stores exact answer data only when known.
- Wrong attempts can create recall/trainer/mistake candidates without increasing progress.
- The day passport can fail a day for:
  - narrow personal-data content;
  - forbidden copy;
  - missing explanations;
  - missing quiz coverage;
  - unsupported grammar;
  - fake personalization;
  - progress from wrong answers.
- The first renderer tests pass for correct answer, wrong answer, explanation, progress, and recovery event.

If any item above is missing, `Gavan` content must stay scaffold-only.

### What Must Be Implemented Before Content

P1.1 Data contracts:

- `PlanContentUnit`
- `PlanExerciseType`
- `PlanExerciseBlock`
- `PlanAttemptEvent`
- `PlanExplanationCard`
- `PlanDayPassport`

P1.2 Quality gates:

- content naturalness/forbidden patterns;
- explanation honesty;
- prerequisite grammar;
- exercise variety;
- progress correctness;
- personalization evidence;
- sensitive data sanitizer.

P1.3 Attempt event pipeline:

- correct/wrong event creation;
- selected answer only when known;
- token-level metadata when available;
- `planInstanceId` required;
- old instance isolation.

P1.4 First renderers:

- phrase build using the existing lesson-style builder core;
- missing word;
- choose natural phrase.

P1.5 Adapters:

- old `PlanDailyTask` routes can map into new `PlanExerciseBlock`;
- current DEV calendar can show passports;
- existing lesson/quiz/trainer/card systems remain untouched unless a typed adapter is needed.

### What Can Wait

These are important, but not blockers for the first stable slice:

- full generated audio production pipeline;
- phoneme-level pronunciation scoring;
- all 18 weeks of route content;
- premium bitmap icon set for every exercise subtype;
- advanced animation polish;
- full cloud migration for every new event field;
- multi-plan content generation beyond `Gavan` week 1.

They must remain represented in the model so they do not require a rewrite later.

### First Files To Create Or Extend

Preferred new files:

- `app/personal_plan_content_units.ts`
- `app/personal_plan_exercise_types.ts`
- `app/personal_plan_attempt_events.ts`
- `app/personal_plan_day_passport.ts`

Likely extensions:

- `app/personal_plan_quality.ts`
- `app/personal_plan_generator.ts`
- `app/personal_plan_progress.ts`
- `app/personal_plan_mistake_context.ts`
- `app/personal_plan_phrase_lessons.ts`

First tests:

- `tests/personal_plan_content_units_contract.test.ts`
- `tests/personal_plan_attempt_events_contract.test.ts`
- `tests/personal_plan_progress_correctness_contract.test.ts`
- `tests/personal_plan_explanation_contract.test.ts`
- extend `tests/personal_plan_day_quality_gate.test.ts`

### One To Two Week Implementation Order

Week 1:

1. Add data contracts and tests.
2. Add event sanitizer and progress correctness tests.
3. Add explanation card contract.
4. Extend day passport with new gate codes.
5. Add adapter from existing `PlanDailyTask` to `PlanExerciseBlock`.
6. Keep rejected `Gavan` day 1/day 2 blocked.

Week 2:

1. Add `plan_phrase_build` renderer contract using existing lesson builder behavior.
2. Add `plan_missing_word` renderer contract.
3. Add `plan_choose_natural_phrase` renderer contract.
4. Connect wrong attempts to recall/trainer/mistake candidates.
5. Add DEV-only passport diagnostics for exercise blocks.
6. Start drafting `Gavan` week 1 only after gates pass.

### Acceptance Criteria

The engine slice is ready for content when:

- tests prove wrong attempts do not increment plan progress;
- every exercise block has a content unit, explanation card, tags, and recovery rule;
- every personalized recommendation has evidence ids or uses generic copy;
- `planInstanceId` is required for completion/attempt state;
- old rejected content cannot become ready through generator output;
- DEV can show why a day failed;
- production copy contains no internal terms.

### Not To Touch

Do not change:

- existing onboarding screens and copy;
- existing premium/paywall behavior except typed plan-flow adapters;
- current lesson engine UX;
- current quiz engine UX;
- current Home route card unless a test requires a typed adapter;
- store purchase logic;
- auth flow.

### Final Route

Start implementation now with P1.1:

Create the new typed content/exercise/attempt contracts and tests first. Do not write final `Gavan` day 1 phrases in the same step.

## Final Implementation Map

P0: reset old content.

- Done conceptually: rejected `Gavan` day 1/day 2 must stay blocked.

P1: engine contracts.

- Started on 2026-06-01.
- Output: typed units, exercise blocks, attempt events, explanation cards, day passport fields.
- Current files:
  - `app/personal_plan_engine_contracts.ts`
  - `tests/personal_plan_engine_contracts.test.ts`
- Current gate:
  - wrong attempts cannot affect progress;
  - `planInstanceId` is required;
  - sensitive attempt payloads are rejected;
  - wrong-answer explanation cards cannot invent selected options;
  - exercise blocks need content units unless they are linked lesson slices.
- P1.1b adapter status:
  - existing `PlanDailyTask` / `PlanDay` can map into `PlanExerciseBlock`;
  - linked lesson slices map to `linked_lesson_slice`;
  - plan phrase lesson tasks map to `plan_phrase_build`;
  - active recall tasks map to `plan_phrase_recall`;
  - quiz tasks map to `plan_quiz`;
  - rejected `Gavan` scaffold remains not ready.
- Verification:
  - `npx jest --runTestsByPath tests/personal_plan_engine_contracts.test.ts --no-cache --runInBand`
  - `npx jest --runTestsByPath tests/personal_plan_day_quality_gate.test.ts tests/personal_plan_engine_contracts.test.ts --no-cache --runInBand`

P2: gates and progress safety.

- Output: correctness-based progress, no fake personalization, sensitive data sanitizer, no unsupported grammar.
- Started on 2026-06-01 as P1.2 gate slice.
- Current files:
  - `app/personal_plan_engine_contracts.ts`
  - `tests/personal_plan_engine_contracts.test.ts`
- Current gate:
  - aggregate `validatePlanEngineQuality` reports block, attempt, and explanation issues together;
  - blocks missing content units;
  - blocks invalid estimated minutes;
  - blocks recall without recovery policy;
  - blocks wrong/skipped attempts marked progress-eligible;
  - blocks missing `planInstanceId`;
  - blocks selected-answer claims without selected answer value;
  - blocks sensitive payload;
  - blocks attempts that reference missing blocks;
  - blocks attempt/block type mismatch;
  - blocks hallucination-prone wrong-answer explanation cards;
  - blocks technical copy in explanation cards.
- Verification:
  - `npx jest --runTestsByPath tests/personal_plan_engine_contracts.test.ts --no-cache --runInBand`
  - `npx jest --runTestsByPath tests/personal_plan_day_quality_gate.test.ts tests/personal_plan_engine_contracts.test.ts --no-cache --runInBand`

P1.3 attempt event factory:

- Started on 2026-06-01.
- Current files:
  - `app/personal_plan_engine_contracts.ts`
  - `tests/personal_plan_engine_contracts.test.ts`
- Current behavior:
  - `createPlanAttemptEvent` builds attempts from `PlanExerciseBlock`;
  - `planInstanceId` is trimmed and required by the validator;
  - `progressEligible` is derived from block policy and result;
  - `correct_only` counts only `correct`;
  - `completion_only` counts only `completed`;
  - `diagnostic_only` never affects progress;
  - `selectedAnswerKnown` is true only when a real selected answer exists;
  - `sanitizePlanAttemptPayload` removes sensitive values and sensitive keys.
- Verification:
  - `npx jest --runTestsByPath tests/personal_plan_engine_contracts.test.ts --no-cache --runInBand`
  - `npx jest --runTestsByPath tests/personal_plan_day_quality_gate.test.ts tests/personal_plan_engine_contracts.test.ts --no-cache --runInBand`

P3: first exercise renderers.

- Output: phrase build, missing word, choose natural phrase.

P4: recovery loop.

- Output: wrong attempts create recall/trainer/mistake candidates.

P5: `Gavan` week 1 content.

- Output: universal-first week, not niche identity/address content.

P6: audio and pronunciation MVP.

- Output: generated audio metadata shell, record/transcript MVP, no fake precision.

P7: other routes.

- Output: `Voyazh`, `Mitap`, `Impuls`, `Echo` inherit the same engine and gates.

## Product Excellence Layer

See `docs/personal-plans-product-excellence-audit.md`.

New product rule:

- every implementation step must improve or protect one of these outcomes:
  - real learning value;
  - human explanations;
  - recovery from mistakes;
  - exercise variety;
  - premium-feeling UI;
  - honest personalization;
  - no fake precision.

P1.4 recovery candidates status:

- Implemented on 2026-06-01 in `app/personal_plan_engine_contracts.ts`.
- Added `PlanRecoveryCandidateTarget` and `PlanRecoveryCandidate`.
- Added `planRecoveryCandidatesForAttempt(block, event)`.
- Wrong/skipped attempts can now produce:
  - `recall` candidates;
  - `trainer` candidates;
  - `mistake_analytics` candidates.
- Candidate creation is controlled by `PlanExerciseRecoveryPolicy`.
- Correct/completed attempts create no recovery candidates.
- Blocks with `recoveryPolicy: none` create no recovery candidates.
- Mismatched block/type/content unit attempts create no recovery candidates.
- Recovery candidates never make progress eligible.
- `selectedAnswer` is carried only when the event really knows it.
- Verification:
  - `npx jest --runTestsByPath tests/personal_plan_engine_contracts.test.ts tests/personal_plan_day_quality_gate.test.ts tests/personal_plan_recall_contract.test.ts tests/personal_plan_mistake_analytics_contract.test.ts --no-cache --runInBand`
  - Result: 4 suites passed, 29 tests passed.

P1.5 attempt event storage status:

- Implemented on 2026-06-01 in `app/personal_plan_attempt_events.ts`.
- Added `personalPlanAttemptEventsStorageKey()`.
- Added `appendPersonalPlanAttemptEvent(event)`.
- Added `listPersonalPlanAttemptEvents(planInstanceId)`.
- Added `clearPersonalPlanAttemptEvents(planInstanceId)`.
- Storage is isolated by `planInstanceId`, so old attempt data cannot leak into a restarted plan.
- Wrong attempts are stored as evidence but still do not count as progress.
- Sensitive payload is sanitized before storage.
- Invalid events are rejected before writing.
- Verification:
  - `npx jest --runTestsByPath tests/personal_plan_attempt_events_storage.test.ts tests/personal_plan_engine_contracts.test.ts tests/personal_plan_state.test.ts tests/personal_plan_cloud_sync_contract.test.ts --no-cache --runInBand`
  - Result: 4 suites passed, 31 tests passed.

P1.6 dry-run recovery actions status:

- Implemented in `app/personal_plan_recovery_actions.ts`.
- Added `PlanRecoveryAction` as a dry-run contract.
- Added `buildPlanRecoveryActions(block, event, options)`.
- Wrong/skipped attempts can now become explicit dry-run actions for:
  - `recall`;
  - `trainer`;
  - `mistake_analytics`.
- The adapter rejects cross-instance events when `currentPlanInstanceId` is provided.
- Correct attempts and `recoveryPolicy: none` create no actions.
- Unknown selected answers are not copied into actions.
- Name-only grammar analytics is skipped while recall/trainer recovery remains available.
- No UI, onboarding, premium, cloud sync, content, or legacy storage writes were changed.
- Verification:
  - `npx jest --runTestsByPath tests/personal_plan_recovery_actions.test.ts tests/personal_plan_attempt_events_storage.test.ts tests/personal_plan_engine_contracts.test.ts tests/personal_plan_mistake_analytics_contract.test.ts --no-cache --runInBand`
  - Result: 4 suites passed, 29 tests passed.
- TypeScript gate:
  - `npx tsc --noEmit --pretty false` was attempted twice after Jest, but shell failed with `windows sandbox failed: spawn setup refresh`.
  - Re-run TypeScript as the first command in the next environment/tool cycle.

P1.7 recovery write adapter status:

- Implemented in `app/personal_plan_recovery_write_adapter.ts`.
- Added `PlanRecoveryWriteMode`: `dry_run` and `apply`.
- Added `writePlanRecoveryActions(actions, options)`.
- `dry_run` is the default and never calls write handlers.
- `apply` calls only explicit handlers for `recall`, `trainer`, and `mistake_analytics`.
- Idempotency is enforced by action id inside the batch and with `appliedActionIds`.
- Cross-instance writes are skipped when `currentPlanInstanceId` is provided.
- Missing handlers are skipped, not guessed.
- No progress writes, UI, onboarding, premium, cloud sync, or plan content changed.
- Verification:
  - `npx jest --runTestsByPath tests/personal_plan_recovery_write_adapter.test.ts tests/personal_plan_recovery_actions.test.ts tests/personal_plan_attempt_events_storage.test.ts tests/personal_plan_engine_contracts.test.ts --no-cache --runInBand`
  - Result: 4 suites passed, 31 tests passed.
- TypeScript gate:
  - `npx tsc --noEmit --pretty false` was attempted before and after implementation, but shell failed with `windows sandbox failed: spawn setup refresh`.
  - Re-run TypeScript as the first command in the next environment/tool cycle.

P1.8 persistent applied-action registry status:

- Implemented in `app/personal_plan_recovery_applied_registry.ts`.
- Added `personalPlanRecoveryAppliedActionsStorageKey()`.
- Added `listAppliedPlanRecoveryActionIds(planInstanceId)`.
- Added `addAppliedPlanRecoveryActionIds(planInstanceId, actionIds)`.
- Added `clearAppliedPlanRecoveryActionIds(planInstanceId)`.
- Added `writePlanRecoveryActionsWithRegistry(planInstanceId, actions, options)`.
- Applied action ids are stored separately from attempt events.
- Registry is isolated by `planInstanceId`.
- Clearing one plan instance does not clear another.
- `dry_run` does not persist applied ids.
- `apply` persists only actions with status `applied`.
- Persisted ids are passed into `writePlanRecoveryActions`, so duplicate writes can be skipped after app restart.
- Verification:
  - `npx jest --runTestsByPath tests/personal_plan_recovery_applied_registry.test.ts tests/personal_plan_recovery_write_adapter.test.ts tests/personal_plan_recovery_actions.test.ts tests/personal_plan_attempt_events_storage.test.ts tests/personal_plan_engine_contracts.test.ts --no-cache --runInBand`
  - Result: 5 suites passed, 37 tests passed.
- TypeScript gate:
  - `npx tsc --noEmit --pretty false` was attempted before implementation and after Jest, but shell failed with `windows sandbox failed: spawn setup refresh`.
  - Re-run TypeScript as the first command in the next environment/tool cycle.

P1.9 legacy handler bridge status:

- Implemented in `app/personal_plan_recovery_legacy_handlers.ts`.
- Added `PlanRecoveryLegacyPayload`.
- Added `PlanRecoveryLegacyWriters`.
- Added `createPlanRecoveryLegacyHandlers(writers)`.
- Handlers convert `PlanRecoveryAction` into safe legacy payloads.
- Payloads include:
  - action id;
  - plan instance;
  - plan id;
  - day/block/content unit;
  - phrase;
  - expected answer;
  - selected answer only when known;
  - grammar/vocabulary/mistake tags;
  - compact plan context.
- The bridge is registry-protected when used through `writePlanRecoveryActionsWithRegistry`.
- `dry_run` causes no legacy writes.
- `apply` writes through explicit writer functions only.
- Duplicate apply after registry writes nothing.
- Unknown selected answer is not stored in payload.
- Name-only attempts stay out of mistake analytics.
- No UI, onboarding, premium, cloud sync, progress, or content changed.
- Verification:
  - `npx jest --runTestsByPath tests/personal_plan_recovery_legacy_handlers.test.ts tests/personal_plan_recovery_applied_registry.test.ts tests/personal_plan_recovery_write_adapter.test.ts tests/personal_plan_recovery_actions.test.ts tests/personal_plan_attempt_events_storage.test.ts tests/personal_plan_engine_contracts.test.ts --no-cache --runInBand`
  - Result: 6 suites passed, 42 tests passed.
- TypeScript gate:
  - `npx tsc --noEmit --pretty false` was attempted before implementation and after Jest, but shell failed with `windows sandbox failed: spawn setup refresh`.
  - Re-run TypeScript as the first command in the next environment/tool cycle.

P1.10 apply readiness gate status:

- Direct legacy imports were not added because shell could not read `trainer_store.ts`, `mistake_log.ts`, or `active_recall.ts`.
- Implemented the safe P1.10 gate layer instead in `app/personal_plan_recovery_apply_gate.ts`.
- Added `validatePlanRecoveryApplyGate(input)`.
- The gate reports:
  - `empty_actions`;
  - `wrong_plan_instance`;
  - `duplicate_action`;
  - `missing_handler`.
- This prevents future `apply` wiring from silently skipping targets or writing cross-instance data.
- Verification:
  - `npx jest --runTestsByPath tests/personal_plan_recovery_apply_gate.test.ts tests/personal_plan_recovery_legacy_handlers.test.ts tests/personal_plan_recovery_applied_registry.test.ts tests/personal_plan_recovery_write_adapter.test.ts tests/personal_plan_recovery_actions.test.ts tests/personal_plan_attempt_events_storage.test.ts tests/personal_plan_engine_contracts.test.ts --no-cache --runInBand`
  - Result: 7 suites passed, 47 tests passed.
- TypeScript gate:
  - `npx tsc --noEmit --pretty false` was attempted before implementation and after Jest, but shell failed with `windows sandbox failed: spawn setup refresh`.

P1.11 blocker and P2.1 renderer contract start:

- Direct legacy integration remains blocked because shell still cannot read exact `trainer_store`, `mistake_log`, or `active_recall` signatures.
- Blocker report created:
  - `docs/reports/personal-plans-recovery-integration-blocker-2026-06-01.md`
- No blind legacy imports were added.
- Started the next safe layer: renderer contracts for the first plan exercise types.
- Implemented in `app/personal_plan_exercise_renderer_contracts.ts`.
- Added contracts for:
  - `plan_phrase_build`;
  - `plan_missing_word`;
  - `plan_choose_natural_phrase`.
- Renderer contract rules:
  - content units are required;
  - progress is `correct_only`;
  - recovery policy must return wrong answers to recall or recall+trainer;
  - explanations are required;
  - correct-word highlighting is not allowed during plan practice;
  - unsupported exercise types do not pretend to have renderers.
- Verification:
  - `npx jest --runTestsByPath tests/personal_plan_exercise_renderer_contracts.test.ts tests/personal_plan_recovery_apply_gate.test.ts tests/personal_plan_recovery_legacy_handlers.test.ts tests/personal_plan_recovery_applied_registry.test.ts tests/personal_plan_recovery_write_adapter.test.ts tests/personal_plan_recovery_actions.test.ts tests/personal_plan_attempt_events_storage.test.ts tests/personal_plan_engine_contracts.test.ts --no-cache --runInBand`
  - Result: 8 suites passed, 53 tests passed.
- TypeScript gate:
  - `npx tsc --noEmit --pretty false` was attempted before implementation and after Jest, but shell failed with `windows sandbox failed: spawn setup refresh`.

P2.2 renderer session contract status:

- Implemented in `app/personal_plan_exercise_session.ts`.
- Added `startPlanExerciseSession(block, input)`.
- Added `submitPlanExerciseAnswer(session, input)`.
- Session start is blocked when renderer contract validation fails.
- Answer submission creates `PlanAttemptEvent` through the existing factory.
- Correct answers are progress-eligible only through existing `canPlanAttemptAffectProgress`.
- Wrong answers are not progress-eligible and build recovery actions.
- Explanation trigger is selected from answer result.
- `selectedAnswerKnown` remains false when there is no real selected answer.
- No UI, onboarding, premium, cloud sync, legacy write, or content changed.
- Verification:
  - `npx jest --runTestsByPath tests/personal_plan_exercise_session.test.ts tests/personal_plan_exercise_renderer_contracts.test.ts tests/personal_plan_recovery_apply_gate.test.ts tests/personal_plan_recovery_legacy_handlers.test.ts tests/personal_plan_recovery_applied_registry.test.ts tests/personal_plan_recovery_write_adapter.test.ts tests/personal_plan_recovery_actions.test.ts tests/personal_plan_attempt_events_storage.test.ts tests/personal_plan_engine_contracts.test.ts --no-cache --runInBand`
  - Result: 9 suites passed, 58 tests passed.
- TypeScript gate:
  - `npx tsc --noEmit --pretty false` was attempted before implementation and after Jest, but shell failed with `windows sandbox failed: spawn setup refresh`.

P2.3 renderer submission persistence status:

- Implemented in `app/personal_plan_exercise_submission_store.ts`.
- Added `submitAndStorePlanExerciseAnswer(session, input)`.
- The function:
  - submits the answer through `submitPlanExerciseAnswer`;
  - stores the generated `PlanAttemptEvent` through `appendPersonalPlanAttemptEvent`;
  - returns a stable future-UI result with `stored: true`.
- Correct attempts are stored and can count progress.
- Wrong attempts are stored, do not count progress, and return recovery actions.
- Attempt storage remains isolated by `planInstanceId`.
- Wrong submission does not apply recovery writes or touch applied-action registry.
- Invalid attempt events are rejected before storage.
- `selectedAnswerKnown` remains honest after storage.
- No UI, onboarding, premium, legacy writes, cloud sync, or content changed.
- Verification:
  - `npx jest --runTestsByPath tests/personal_plan_exercise_submission_store.test.ts tests/personal_plan_exercise_session.test.ts tests/personal_plan_exercise_renderer_contracts.test.ts tests/personal_plan_recovery_apply_gate.test.ts tests/personal_plan_recovery_legacy_handlers.test.ts tests/personal_plan_recovery_applied_registry.test.ts tests/personal_plan_recovery_write_adapter.test.ts tests/personal_plan_recovery_actions.test.ts tests/personal_plan_attempt_events_storage.test.ts tests/personal_plan_engine_contracts.test.ts --no-cache --runInBand`
  - Result: 10 suites passed, 63 tests passed.
- TypeScript gate:
  - `npx tsc --noEmit --pretty false` was attempted before implementation and after Jest, but shell failed with `windows sandbox failed: spawn setup refresh`.

P2.4 submission view-model contract status:

- Implemented in `app/personal_plan_exercise_submission_view_model.ts`.
- Added `buildPlanExerciseSubmissionViewModel(result)`.
- The view model exposes stable semantic fields for future UI:
  - `status`;
  - `primaryState`;
  - `shouldShowExplanation`;
  - `explanationTrigger`;
  - `progressEligible`;
  - `recoveryTargets`;
  - `stored`;
  - `selectedAnswerKnown`;
  - `nextAction`.
- No user-facing copy is generated in this layer.
- Correct answers produce success/progress semantics.
- Wrong answers produce recovery semantics.
- Skipped answers produce explanation/no-progress semantics.
- Recovery targets are unique.
- No UI, onboarding, premium, legacy writes, cloud sync, or content changed.
- Verification:
  - `npx jest --runTestsByPath tests/personal_plan_exercise_submission_view_model.test.ts tests/personal_plan_exercise_submission_store.test.ts tests/personal_plan_exercise_session.test.ts tests/personal_plan_exercise_renderer_contracts.test.ts tests/personal_plan_recovery_apply_gate.test.ts tests/personal_plan_recovery_legacy_handlers.test.ts tests/personal_plan_recovery_applied_registry.test.ts tests/personal_plan_recovery_write_adapter.test.ts tests/personal_plan_recovery_actions.test.ts tests/personal_plan_attempt_events_storage.test.ts tests/personal_plan_engine_contracts.test.ts --no-cache --runInBand`
  - Result: 11 suites passed, 67 tests passed.
- TypeScript gate:
  - `npx tsc --noEmit --pretty false` was attempted before implementation and after Jest, but shell failed with `windows sandbox failed: spawn setup refresh`.

P2.5 block progress reducer status:

- Implemented in `app/personal_plan_exercise_block_progress.ts`.
- Added `buildPlanExerciseBlockProgress(block, attemptsOrResults)`.
- The reducer computes:
  - required count;
  - completed count;
  - wrong count;
  - skipped count;
  - completed flag;
  - percent;
  - completed content unit ids;
  - remaining content unit ids.
- Progress uses only `canPlanAttemptAffectProgress`.
- Duplicate correct attempts for the same content unit count once.
- Wrong/skipped attempts never increment progress.
- Unsupported content unit ids and other block ids are ignored.
- Accepts raw `PlanAttemptEvent`, session submit result, and stored submit result.
- No UI, onboarding, premium, legacy writes, cloud sync, or content changed.
- Verification:
  - `npx jest --runTestsByPath tests/personal_plan_exercise_block_progress.test.ts tests/personal_plan_exercise_submission_view_model.test.ts tests/personal_plan_exercise_submission_store.test.ts tests/personal_plan_exercise_session.test.ts tests/personal_plan_exercise_renderer_contracts.test.ts tests/personal_plan_recovery_apply_gate.test.ts tests/personal_plan_recovery_legacy_handlers.test.ts tests/personal_plan_recovery_applied_registry.test.ts tests/personal_plan_recovery_write_adapter.test.ts tests/personal_plan_recovery_actions.test.ts tests/personal_plan_attempt_events_storage.test.ts tests/personal_plan_engine_contracts.test.ts --no-cache --runInBand`
  - Result: 12 suites passed, 72 tests passed.
- TypeScript gate:
  - `npx tsc --noEmit --pretty false` was attempted before implementation and after Jest, but shell failed with `windows sandbox failed: spawn setup refresh`.

P2.6 day progress reducer status:

- Implemented in `app/personal_plan_exercise_day_progress.ts`.
- Added `buildPlanExerciseDayProgress(blocks, inputs)`.
- The reducer aggregates:
  - total blocks;
  - completed blocks;
  - total required units;
  - completed units;
  - wrong count;
  - skipped count;
  - percent;
  - completed flag;
  - per-block progress.
- Day completion is true only when all blocks are completed.
- Duplicate correct attempts stay stable.
- Wrong/skipped attempts aggregate counts but never increase progress.
- Empty day blocks are safe.
- No UI, onboarding, premium, legacy writes, cloud sync, or content changed.
- Verification:
  - `npx jest --runTestsByPath tests/personal_plan_exercise_day_progress.test.ts tests/personal_plan_exercise_block_progress.test.ts tests/personal_plan_exercise_submission_view_model.test.ts tests/personal_plan_exercise_submission_store.test.ts tests/personal_plan_exercise_session.test.ts tests/personal_plan_exercise_renderer_contracts.test.ts tests/personal_plan_recovery_apply_gate.test.ts tests/personal_plan_recovery_legacy_handlers.test.ts tests/personal_plan_recovery_applied_registry.test.ts tests/personal_plan_recovery_write_adapter.test.ts tests/personal_plan_recovery_actions.test.ts tests/personal_plan_attempt_events_storage.test.ts tests/personal_plan_engine_contracts.test.ts --no-cache --runInBand`
  - Result: 13 suites passed, 77 tests passed.
- TypeScript gate:
  - `npx tsc --noEmit --pretty false` was attempted before implementation and after Jest, but shell failed with `windows sandbox failed: spawn setup refresh`.

P2.7 day view-model contract status:

- Implemented in `app/personal_plan_exercise_day_view_model.ts`.
- Added `buildPlanExerciseDayViewModel(blocks, inputs)`.
- The view model exposes stable semantic fields:
  - `primaryState`;
  - `percent`;
  - `totalBlocks`;
  - `completedBlocks`;
  - `wrongCount`;
  - `skippedCount`;
  - `nextBlockId`;
  - `completedBlockIds`;
  - `remainingBlockIds`;
  - `shouldShowRestState`;
  - raw `progress`.
- No user-facing copy is generated.
- Completed day enables rest state.
- Errors/skips with no progress create `needs_attention`.
- Empty day is safe.
- No UI, onboarding, premium, legacy writes, cloud sync, or content changed.
- Verification:
  - `npx jest --runTestsByPath tests/personal_plan_exercise_day_view_model.test.ts tests/personal_plan_exercise_day_progress.test.ts tests/personal_plan_exercise_block_progress.test.ts tests/personal_plan_exercise_submission_view_model.test.ts tests/personal_plan_exercise_submission_store.test.ts tests/personal_plan_exercise_session.test.ts tests/personal_plan_exercise_renderer_contracts.test.ts tests/personal_plan_recovery_apply_gate.test.ts tests/personal_plan_recovery_legacy_handlers.test.ts tests/personal_plan_recovery_applied_registry.test.ts tests/personal_plan_recovery_write_adapter.test.ts tests/personal_plan_recovery_actions.test.ts tests/personal_plan_attempt_events_storage.test.ts tests/personal_plan_engine_contracts.test.ts --no-cache --runInBand`
  - Result: 14 suites passed, 82 tests passed.
- TypeScript gate:
  - `npx tsc --noEmit --pretty false` was attempted before implementation and after Jest, but shell failed with `windows sandbox failed: spawn setup refresh`.

P2.8 catalog day adapter status:

- Implemented in `app/personal_plan_day_exercise_view_model.ts`.
- Added `buildPersonalPlanDayExerciseViewModel(plan, day, inputs)`.
- The adapter:
  - maps existing catalog day tasks through `planExerciseBlocksForDay`;
  - builds the new exercise day view model;
  - exposes plan id, day index, block count, and block ids;
  - includes current day passport readiness without changing passport behavior.
- Existing rejected `Gavan` scaffold remains not product-ready.
- No UI, onboarding, premium, legacy writes, cloud sync, or content changed.
- Verification:
  - `npx jest --runTestsByPath tests/personal_plan_day_exercise_view_model.test.ts tests/personal_plan_exercise_day_view_model.test.ts tests/personal_plan_exercise_day_progress.test.ts tests/personal_plan_exercise_block_progress.test.ts tests/personal_plan_exercise_submission_view_model.test.ts tests/personal_plan_exercise_submission_store.test.ts tests/personal_plan_exercise_session.test.ts tests/personal_plan_exercise_renderer_contracts.test.ts tests/personal_plan_recovery_apply_gate.test.ts tests/personal_plan_recovery_legacy_handlers.test.ts tests/personal_plan_recovery_applied_registry.test.ts tests/personal_plan_recovery_write_adapter.test.ts tests/personal_plan_recovery_actions.test.ts tests/personal_plan_attempt_events_storage.test.ts tests/personal_plan_engine_contracts.test.ts tests/personal_plan_day_quality_gate.test.ts --no-cache --runInBand`
  - Result: 16 suites passed, 90 tests passed.
- TypeScript gate:
  - `npx tsc --noEmit --pretty false` was attempted before implementation and after Jest, but shell failed with `windows sandbox failed: spawn setup refresh`.

P2.9 phrase build shell contract status:

- Direct lesson shell bridge remains blocked because shell cannot read `lesson1.tsx`, `lesson_screen_bootstrap.ts`, or `personal_plan_navigation.ts`.
- Blocker report created:
  - `docs/reports/personal-plans-lesson-shell-bridge-blocker-2026-06-01.md`
- No lesson imports or UI files were changed.
- Implemented safe pure contract in `app/personal_plan_phrase_build_shell_contract.ts`.
- Added `buildPlanPhraseBuildShellParams(block, planInstanceId)`.
- Contract params include:
  - `planInstanceId`;
  - `planId`;
  - `dayIndex`;
  - `blockId`;
  - `contentUnitIds`;
  - required content unit count;
  - plan source/mode keys;
  - recovery and recall flags;
  - `allowCorrectWordHighlighting: false`.
- Wrong exercise type, missing content units, and missing instance id are blocked.
- No UI, onboarding, premium, legacy writes, cloud sync, or content changed.
- Verification:
  - `npx jest --runTestsByPath tests/personal_plan_phrase_build_shell_contract.test.ts tests/personal_plan_day_exercise_view_model.test.ts tests/personal_plan_exercise_day_view_model.test.ts tests/personal_plan_exercise_day_progress.test.ts tests/personal_plan_exercise_block_progress.test.ts tests/personal_plan_exercise_submission_view_model.test.ts tests/personal_plan_exercise_submission_store.test.ts tests/personal_plan_exercise_session.test.ts tests/personal_plan_exercise_renderer_contracts.test.ts tests/personal_plan_recovery_apply_gate.test.ts tests/personal_plan_recovery_legacy_handlers.test.ts tests/personal_plan_recovery_applied_registry.test.ts tests/personal_plan_recovery_write_adapter.test.ts tests/personal_plan_recovery_actions.test.ts tests/personal_plan_attempt_events_storage.test.ts tests/personal_plan_engine_contracts.test.ts tests/personal_plan_day_quality_gate.test.ts --no-cache --runInBand`
  - Result: 17 suites passed, 95 tests passed.
- TypeScript gate:
  - `npx tsc --noEmit --pretty false` was attempted before implementation and after Jest, but shell failed with `windows sandbox failed: spawn setup refresh`.

P2.10 missing-word and choose-natural renderer params status:

- Implemented in `app/personal_plan_renderer_params_contracts.ts`.
- Added:
  - `buildPlanMissingWordRendererParams(block, planInstanceId)`;
  - `buildPlanChooseNaturalPhraseRendererParams(block, planInstanceId)`.
- Params include:
  - `planInstanceId`;
  - plan/block/day ids;
  - content unit ids;
  - answer kind;
  - required content unit count;
  - explanation requirement;
  - recovery flag;
  - `allowCorrectWordHighlighting: false`.
- Wrong exercise type, missing content units, and missing instance id are blocked.
- No UI copy, UI, onboarding, premium, legacy writes, cloud sync, or content changed.
- Verification:
  - `npx jest --runTestsByPath tests/personal_plan_renderer_params_contracts.test.ts tests/personal_plan_phrase_build_shell_contract.test.ts tests/personal_plan_day_exercise_view_model.test.ts tests/personal_plan_exercise_day_view_model.test.ts tests/personal_plan_exercise_day_progress.test.ts tests/personal_plan_exercise_block_progress.test.ts tests/personal_plan_exercise_submission_view_model.test.ts tests/personal_plan_exercise_submission_store.test.ts tests/personal_plan_exercise_session.test.ts tests/personal_plan_exercise_renderer_contracts.test.ts tests/personal_plan_recovery_apply_gate.test.ts tests/personal_plan_recovery_legacy_handlers.test.ts tests/personal_plan_recovery_applied_registry.test.ts tests/personal_plan_recovery_write_adapter.test.ts tests/personal_plan_recovery_actions.test.ts tests/personal_plan_attempt_events_storage.test.ts tests/personal_plan_engine_contracts.test.ts tests/personal_plan_day_quality_gate.test.ts --no-cache --runInBand`
  - Result: 18 suites passed, 101 tests passed.
- TypeScript gate:
  - `npx tsc --noEmit --pretty false` was attempted before implementation and after Jest, but shell failed with `windows sandbox failed: spawn setup refresh`.

Current best next path is P2.11: add unified renderer params builder for the first three supported exercise renderer types.

## Next Implementation Prompt

Authoritative current prompt, UTF-8 clean:

```text
Продолжай implementation P2.11 для Personal Plans: добавь unified renderer params builder для первых трёх exercise types без UI. Сначала запусти `npx tsc --noEmit --pretty false`. Затем используй buildPlanPhraseBuildShellParams, buildPlanMissingWordRendererParams, buildPlanChooseNaturalPhraseRendererParams. Нужно создать buildPlanExerciseRendererParams(block, planInstanceId), который маршрутизирует по block.type и возвращает общий result с params или issues. Rules: supports plan_phrase_build, plan_missing_word, plan_choose_natural_phrase; unsupported type -> missing_renderer_contract or wrong_exercise_type style issue; no lesson imports; no UI/onboarding/premium/content. Tests: routes all three supported types, rejects unsupported listen type, preserves no correct-word highlighting, preserves recovery/explanation flags.
```

Current prompt:

Продолжай implementation P1.4 для Personal Plans: добавь recovery candidates из wrong PlanAttemptEvent. Сначала изучи app/personal_plan_engine_contracts.ts, app/personal_plan_mistake_context.ts, app/trainer_store.ts и active recall/recall-related файлы. Затем добавь чистую функцию, которая по PlanExerciseBlock + PlanAttemptEvent возвращает кандидаты для recall/trainer/mistake analytics только когда recoveryPolicy это требует и attempt wrong/skipped. Нельзя увеличивать progress, нельзя писать UI, onboarding, premium или финальный контент Гавань. Напиши contract-тесты, проверь существующие personal_plan tests, обнови docs/personal-plans-killer-feature-audit.md и следующий prompt.

Superseded prompt:

Продолжай implementation P1.3 для Personal Plans: создай безопасную factory/sanitizer для PlanAttemptEvent. Сначала изучи app/personal_plan_engine_contracts.ts и существующие progress/mistake файлы, затем добавь функцию создания attempt event из PlanExerciseBlock с обязательным planInstanceId, correct-only progressEligibility, selectedAnswerKnown только при реальном selectedAnswer, sanitization payload без email/phone/address/bank/medical данных. Напиши contract-тесты и не меняй UI, onboarding, premium, Гавань-контент. После зелёных тестов обнови docs/personal-plans-killer-feature-audit.md и следующий prompt.

Superseded prompt:

Продолжай implementation P1.2 для Personal Plans: расширь quality gates вокруг новых PlanExerciseBlock и PlanAttemptEvent. Сначала изучи app/personal_plan_quality.ts и app/personal_plan_engine_contracts.ts, затем добавь проверки/тесты для missing content units, wrong progress eligibility, selected-answer honesty, sensitive payload, unsupported exercise type и recovery policy для recall. Не меняй UI, onboarding, premium и не пиши финальный контент Гавань. После зелёных тестов обнови docs/personal-plans-killer-feature-audit.md и следующий prompt.

Superseded prompt:

Продолжай implementation P1.1b для Personal Plans: изучи app/personal_plan_catalog.ts, app/personal_plan_quality.ts и новый app/personal_plan_engine_contracts.ts, добавь безопасный adapter из существующего PlanDailyTask/PlanDay в PlanExerciseBlock без изменения UI и без финального контента Гавань. Напиши contract-тесты, что linked lesson, plan phrase build, recall и quiz задачи мапятся в новые exercise blocks, wrong progress остаётся correct-only, rejected Gavan scaffold остаётся not ready, затем обнови docs/personal-plans-killer-feature-audit.md и следующий prompt.

Superseded prompt:

Начинай implementation P1.1 для Personal Plans: создай typed contracts для PlanContentUnit, PlanExerciseType, PlanExerciseBlock, PlanAttemptEvent, PlanExplanationCard и PlanDayPassport без написания финального контента Гавань. Сначала изучи существующие app/personal_plan_* файлы и тесты, затем добавь минимальные типы/адаптеры в новых или существующих файлах, напиши contract-тесты, проверь что старый rejected Gavan content остаётся blocked, и обнови docs/personal-plans-killer-feature-audit.md статусом P1.1.

Superseded prompt:

Продолжай аудит 10: собери финальный внедренческий master plan из аудитов 1-9. Нужно определить, достаточно ли информации для начала реализации, какие пункты обязательны перед контентом, какие можно отложить, какие файлы создавать первыми, какие тесты писать первыми, какой порядок внедрения на 1-2 недели, и где будет gate "не писать Гавань day 1, пока engine не готов". Сохрани результат новым разделом в `docs/personal-plans-killer-feature-audit.md`, обнови финальную карту внедрения и в конце дай короткое решение: начинаем implementation или нужен ещё один аудит.

Superseded prompt:

Продолжай аудит 9: спроектируй аналитику и персонализацию Personal Plans. Нужно описать какие события собирать из упражнений, уроков, квизов, карточек, тренера, ошибок, аудио и произношения; как превращать их в weak spots, carryover, review queue, next-day block selection и progress score; какие данные нельзя собирать или показывать; как избежать fake personalization; какие quality gates и тесты нужны. Сохрани результат новым разделом в `docs/personal-plans-killer-feature-audit.md` и обнови финальную карту внедрения.

Superseded prompt:

Продолжай аудит 8: спроектируй content authoring playbook для Personal Plans после reset. Нужно описать правила написания фраз, объяснений, вариантов ответа, дистракторов, аудио-скриптов, произносительных целей, квизов и daily workout блоков. Отдельно зафиксируй forbidden patterns, human quality checklist, как проверять "живая фраза или учебник 1800 года", как не делать слишком нишево, и как готовить контент для gates. Сохрани результат новым разделом в `docs/personal-plans-killer-feature-audit.md` и обнови финальную карту внедрения.

Superseded prompt:

Продолжай аудит 7: спроектируй UI/UX-поток нового Personal Plans exercise runner после roadmap. Нужно описать экран задания дня, переход в упражнение, состояния правильного/неправильного ответа, объяснения в середине экрана, завершение блока, возвращение в план, carryover, и DEV/production режимы. Для каждого состояния укажи какие данные нужны, какие элементы показывать, какие тексты запрещены, как сохранить стиль приложения без DEV-плашек, и какие UI quality gates нужны. Сохрани результат новым разделом в `docs/personal-plans-killer-feature-audit.md` и обнови финальную карту внедрения.

Superseded prompt:

Продолжай аудит 6: собери из аудитов 1-5 практический implementation roadmap для внедрения новой Personal Plans системы. Разбей на этапы: типы данных, quality gates, attempt events, адаптер старых routes, первые 3 exercise renderers, audio asset pipeline, pronunciation MVP, затем Гавань day 1. Для каждого этапа дай файлы, тесты, риски, acceptance criteria и что нельзя трогать. Сохрани результат новым разделом в `docs/personal-plans-killer-feature-audit.md` и обнови финальную карту внедрения.

Superseded prompt:

Продолжай аудит 5: спроектируй контентную стратегию для `Гавань · неделя 1` после reset, но пока не пиши финальные упражнения. Нужно определить универсальные цели недели, какие фразы допустимы/запрещены, какие грамматические prerequisites нужны, какие 5+ типов упражнений войдут в неделю, как распределять нагрузку для 5/10/15/20 минут, какие слова требуют объяснений, какие аудио/произносительные задания нужны, и как неделя должна выглядеть в паспорте качества. Сохрани результат новым разделом в `docs/personal-plans-killer-feature-audit.md` и обнови карту внедрения.

Superseded prompt:

Продолжай аудит 4: спроектируй quality gates и тестовую стратегию для новой системы Personal Plans. Нужны gates для контента, упражнений, объяснений, аудио, произношения, персонализации, прогресса, carryover, связи с уроками/квизами/тренером/карточками/ошибками/аналитикой. Для каждого gate опиши: что проверяет, какие данные читает, какой код ошибки даёт, как выглядит хороший/плохой пример, какой тест нужен первым. Сохрани результат новым разделом в `docs/personal-plans-killer-feature-audit.md` и обнови карту внедрения.

Superseded prompt:

Продолжай аудит 2: разложи Duolingo, Memrise, Busuu, ELSA и Simpler/EWA по конкретным типам упражнений. Для каждого типа упражнения напиши: что оно тренирует, почему удерживает пользователя, как адаптировать это в Phraseman, какие данные нужны, какие ошибки нельзя повторять, какой минимальный рабочий вариант внедрить первым. Сохрани результат в `docs/personal-plans-killer-feature-audit.md` новым разделом и обнови карту внедрения.
## Implementation update 2026-06-01 - P2.11 unified renderer params builder

Status: completed.

What changed:
- Added a separate unified routing contract for the first three Personal Plans exercise renderers.
- `plan_phrase_build` now routes to the existing lesson-shell params contract.
- `plan_missing_word` and `plan_choose_natural_phrase` route to their dedicated renderer params contracts.
- Unsupported exercise types return `missing_renderer_contract` instead of silently pretending they can open.
- The no-correct-word-highlighting rule and recovery flags are preserved through the unified builder.

Files:
- `app/personal_plan_exercise_renderer_params_builder.ts`
- `tests/personal_plan_exercise_renderer_params_builder.test.ts`

Quality gate:
- Passed focused Personal Plans suite: 19 test suites, 106 tests.
- `npx tsc --noEmit --pretty false` could not start because the Windows sandbox returned `spawn setup refresh`.

Next implementation route:
P2.12 should add a day-level renderer params adapter:
- build params for every block in a day through `buildPlanExerciseRendererParams`;
- return supported openable blocks separately from blocked blocks;
- expose quality issues per block for UI/dev diagnostics;
- do not import UI, onboarding, premium, or legacy lesson code yet.
## Implementation update 2026-06-01 - P2.12 day renderer params adapter

Status: completed.

What changed:
- Added a day-level renderer params adapter for Personal Plans exercise blocks.
- The adapter separates day blocks into `openableBlocks` and `blockedBlocks`.
- Supported blocks keep ready-to-open params from the unified renderer builder.
- Unsupported future modes are blocked with explicit diagnostics instead of producing broken UI actions.
- Empty days now return a stable empty result.
- The no-correct-word-highlighting rule is preserved inside every openable block params object.

Files:
- `app/personal_plan_day_renderer_params_adapter.ts`
- `tests/personal_plan_day_renderer_params_adapter.test.ts`

Quality gate:
- Passed focused Personal Plans suite: 20 test suites, 110 tests.
- `npx tsc --noEmit --pretty false` was attempted before and after implementation, but the Windows sandbox returned `spawn setup refresh`.

Next implementation route:
P2.13 should add a pure day open-action contract:
- convert openable renderer params into semantic actions such as `open_lesson_shell`, `open_plan_renderer`, and `blocked`;
- keep the action payload UI-agnostic;
- expose product-safe labels from existing block data without adding new copy;
- keep onboarding, paywall, home UI, and Harbor content untouched.
## Implementation update 2026-06-01 - P2.13 day open actions

Status: completed.

What changed:
- Added a UI-agnostic day open-action contract above renderer params.
- `plan_phrase_build` becomes `open_lesson_shell`.
- `plan_missing_word` and `plan_choose_natural_phrase` become `open_plan_renderer`.
- Unsupported or invalid blocks become `blocked` actions with explicit issues.
- The original task order is preserved.
- The no-correct-word-highlighting rule remains inside action params.

Files:
- `app/personal_plan_day_open_actions.ts`
- `tests/personal_plan_day_open_actions.test.ts`

Quality gate:
- Passed focused Personal Plans suite: 21 test suites, 114 tests.
- `npx tsc --noEmit --pretty false` was attempted before and after implementation, but the Windows sandbox returned `spawn setup refresh`.

Next implementation route:
P2.14 should build a pure day task surface model:
- merge block progress, day progress, and open actions into one UI-ready-but-UI-free model;
- expose task states such as `available`, `completed`, `blocked`, and `needs_retry`;
- keep action payloads semantic;
- do not touch visual design, onboarding, premium, or content yet.
## Implementation update 2026-06-01 - P2.14 day task surface model

Status: completed.

What changed:
- Added a pure day task surface model for Personal Plans.
- The model merges block progress and open actions into ordered task items.
- Each task now has a semantic state: `available`, `completed`, `needs_retry`, or `blocked`.
- The model preserves the authored order of tasks.
- Action payloads remain UI-agnostic and keep no-correct-word-highlighting params.

Files:
- `app/personal_plan_day_task_surface_model.ts`
- `tests/personal_plan_day_task_surface_model.test.ts`

Quality gate:
- Passed focused Personal Plans suite: 22 test suites, 119 tests.
- The first test run caught an incomplete test attempt-event shape; the test data was corrected to include the real event fields such as `occurredAt`, `result`, `progressEligible`, and `selectedAnswerKnown`.
- `npx tsc --noEmit --pretty false` was attempted before and after implementation, but the Windows sandbox returned `spawn setup refresh`.

Next implementation route:
P2.15 should add a day readiness gate for the UI surface:
- validate that every task item has a state, action, title, estimated minutes, and progress;
- fail if an open action lacks params or a blocked action lacks issues;
- fail if action order diverges from block order;
- keep the gate pure and UI-free.
## Implementation update 2026-06-01 - P2.15 task surface readiness gate

Status: completed.

What changed:
- Added a pure readiness gate for the day task surface model.
- The gate validates task identity, title, estimated minutes, progress, action shape, open-action params, blocked-action issues, count consistency, and duplicate block ids.
- Negative fixtures intentionally corrupt task surface data to prove the gate catches broken UI inputs before they reach the interface.

Files:
- `app/personal_plan_day_task_surface_gate.ts`
- `tests/personal_plan_day_task_surface_gate.test.ts`

Quality gate:
- Passed focused Personal Plans suite: 23 test suites, 125 tests.
- The first test run caught a TypeScript issue in a negative fixture; it was corrected with an explicit `unknown` cast because the test intentionally creates an invalid action.
- `npx tsc --noEmit --pretty false` was attempted before and after implementation, but the Windows sandbox returned `spawn setup refresh`.

Next implementation route:
P2.16 should add a task surface bundle builder:
- build the day task surface model;
- immediately run `validatePlanDayTaskSurfaceModel`;
- return `{ model, readiness }` together;
- this gives future UI one safe entry point and one gate result.
## Implementation update 2026-06-01 - P2.16 task surface bundle builder

Status: completed.

What changed:
- Added one safe entry point for future Personal Plans day UI.
- The bundle builder creates the task surface model, runs the readiness gate, and returns `{ model, readiness, canRender }`.
- A correctly described blocked task is renderable, because the UI can show a clean blocked/dev state instead of breaking.
- The builder supports an injected validator for negative tests and future stricter gates.

Files:
- `app/personal_plan_day_task_surface_bundle.ts`
- `tests/personal_plan_day_task_surface_bundle.test.ts`

Quality gate:
- Passed focused Personal Plans suite: 24 test suites, 130 tests.
- `npx tsc --noEmit --pretty false` was attempted before and after implementation, but the Windows sandbox returned `spawn setup refresh`.

Next implementation route:
P2.17 should identify and document the safest production integration point:
- inspect the existing plan screen/dev plan UI/home entry points when shell access is available;
- do not edit onboarding or premium screens;
- wire only a read-only consumer of `buildPlanDayTaskSurfaceBundle` if the integration point is clear;
- otherwise write an integration blocker report with exact missing files and the intended adapter shape.
## Implementation update 2026-06-01 - P2.17 integration discovery

Status: blocked for production wiring; blocker report created.

What happened:
- Attempted to locate the safest production integration point for `buildPlanDayTaskSurfaceBundle`.
- `rg` searches failed with `windows sandbox: spawn setup refresh`.
- A fallback file listing partially succeeded and revealed likely candidates:
  - `app/personal_plan.tsx`
  - `app/(tabs)/home.tsx`
  - `app/personal_plan_catalog.ts`
  - `app/personal_plan_activation.ts`
  - `app/personal_plan_attempt_events.ts`
- Reading the candidate files failed with the same sandbox spawn error.

Why no UI code was changed:
- The relevant UI files could not be inspected.
- The project rules forbid blind edits to existing UI/flows.
- Onboarding, premium flow, home card, and dev controls must not be touched accidentally.

Files:
- `docs/reports/personal-plans-task-surface-integration-blocker-2026-06-01.md`

Quality gate:
- Passed focused Personal Plans suite: 24 test suites, 130 tests.
- `npx tsc --noEmit --pretty false` was attempted but the Windows sandbox returned `spawn setup refresh`.

Next implementation route:
Retry integration only when candidate files can be read. If file access stays unstable, continue with non-UI engine work: add a pure input resolver contract documenting what the UI must provide to `buildPlanDayTaskSurfaceBundle`.
## Implementation update 2026-06-01 - P2.18 input resolver fallback

Status: completed.

What changed:
- Retried reading production integration files, but shell access to `app/personal_plan.tsx`, `app/personal_plan_catalog.ts`, and `app/personal_plan_attempt_events.ts` was blocked by `windows sandbox: spawn setup refresh`.
- Instead of editing UI blindly, added a pure input resolver contract for the future task surface bundle integration.
- The resolver validates the exact inputs the UI/integration layer must provide: `blocks`, `planInstanceId`, and `attemptEvents`.
- It also catches duplicate block ids, attempts from another plan instance, and attempts for blocks not present in the day input.

Files:
- `app/personal_plan_day_task_surface_input_resolver.ts`
- `tests/personal_plan_day_task_surface_input_resolver.test.ts`

Quality gate:
- Passed focused Personal Plans suite: 25 test suites, 135 tests.
- `npx tsc --noEmit --pretty false` was attempted before and after implementation, but the Windows sandbox returned `spawn setup refresh`.

Next implementation route:
P2.19 should combine the input resolver and bundle builder:
- accept unresolved input from UI;
- run `resolvePlanDayTaskSurfaceInput`;
- if input is ready, build `buildPlanDayTaskSurfaceBundle`;
- return `{ inputReadiness, bundle, canRender }`;
- keep the contract pure and UI-free.
## Implementation update 2026-06-01 - P2.19 unresolved input entrypoint

Status: completed.

What changed:
- Added a combined unresolved-input-to-bundle entry point.
- The entry point accepts raw task surface input, runs `resolvePlanDayTaskSurfaceInput`, and only builds the bundle if input is ready.
- Invalid input returns `canRender: false` with no bundle.
- Valid blocked tasks remain renderable when they are correctly described.
- The no-correct-word-highlighting rule is preserved through the final entry point.

Files:
- `app/personal_plan_day_task_surface_entrypoint.ts`
- `tests/personal_plan_day_task_surface_entrypoint.test.ts`

Quality gate:
- Passed focused Personal Plans suite: 26 test suites, 140 tests.
- `npx tsc --noEmit --pretty false` was attempted before and after implementation, but the Windows sandbox returned `spawn setup refresh`.

Next implementation route:
P2.20 should expose a small public task-surface API module:
- export only the intended integration entry point and necessary public types;
- prevent future UI from importing lower-level internals directly;
- document the import path and usage recipe;
- keep it pure and UI-free.
## Implementation update 2026-06-01 - P2.20 public task surface API

Status: completed.

What changed:
- Added a public task-surface API module for future Personal Plans UI integration.
- UI should import from `app/personal_plan_task_surface_api.ts` instead of lower-level resolver/model/gate/renderer modules.
- The API exposes `buildPlanDayTaskSurfaceFromInput` plus public result/input/action/state/issue types.
- Low-level behavior remains protected behind the entry point and readiness flow.

Import recipe:

```ts
import {
  buildPlanDayTaskSurfaceFromInput,
  type PlanDayTaskSurfaceInput,
} from './personal_plan_task_surface_api';
```

Files:
- `app/personal_plan_task_surface_api.ts`
- `tests/personal_plan_task_surface_api.test.ts`

Quality gate:
- Passed focused Personal Plans suite: 27 test suites, 144 tests.
- `npx tsc --noEmit --pretty false` was attempted before and after implementation, but the Windows sandbox returned `spawn setup refresh`.

Next implementation route:
P2.21 should retry production UI integration through the public API only:
- inspect `app/personal_plan.tsx`, `app/personal_plan_catalog.ts`, and `app/personal_plan_attempt_events.ts`;
- if the data flow is clear, connect `buildPlanDayTaskSurfaceFromInput` read-only;
- if not, keep UI unchanged and update the integration blocker.
## Implementation update 2026-06-01 - P2.21 public API integration retry

Status: blocked for UI wiring; blocker report updated.

What happened:
- Retried production UI integration through the new public API only.
- Attempted to read `app/personal_plan.tsx`, `app/personal_plan_catalog.ts`, and `app/personal_plan_attempt_events.ts`.
- All candidate file reads failed with `windows sandbox: spawn setup refresh`.
- No UI files were edited.

Files:
- `docs/reports/personal-plans-task-surface-integration-blocker-2026-06-01.md`

Quality gate:
- Passed focused Personal Plans suite: 27 test suites, 144 tests.

Next implementation route:
Because UI integration is blocked by file access, move to the next independent high-value track: P3.1 content reset rules for Harbor/week 1.
- define strict phrase selection rules;
- ban overly narrow phrases such as names, exact phone numbers, apartment-only wording, and context that feels too niche for day 1;
- require universal, socially normal, modern phrases;
- require explanations that never invent unseen wrong options;
- keep it as a pure content quality contract before touching catalog files.
## Implementation update 2026-06-01 - P3.1 content reset quality contract

Status: completed.

What changed:
- Added a pure content quality contract for Personal Plans phrase drafts.
- The gate accepts universal, modern, socially normal first-day phrases.
- It rejects exact personal data, too-narrow day-one situations, overformal textbook phrases, and developer/robotic copy.
- It rejects explanations that mention wrong options the learner did not see.
- It requires explanations for new words and first-seen constructions.

Files:
- `app/personal_plan_content_quality_contract.ts`
- `tests/personal_plan_content_quality_contract.test.ts`

Quality gate:
- Passed focused Personal Plans suite: 28 test suites, 150 tests.
- `npx tsc --noEmit --pretty false` was attempted before and after implementation, but the Windows sandbox returned `spawn setup refresh`.

Next implementation route:
P3.2 should add a day-level content quality gate:
- validate all phrase drafts in a day through `validatePersonalPlanContentQuality`;
- fail if day 1 has too many narrow/personal-data phrases;
- fail if any required explanation is missing;
- produce day-level issue summaries before catalog content is edited.
## Implementation update 2026-06-01 - P3.2 day-level content quality gate

Status: completed.

What changed:
- Added a pure day-level content quality gate for Personal Plans.
- The gate validates every phrase through the phrase-level content contract.
- It returns `summary`, `issuesByPhrase`, and `dayIssueCodes`.
- Empty days fail.
- Day 1 fails if it contains exact personal data or too-narrow phrases.
- Missing new-word or first-seen construction explanations are surfaced as day-level failures.

Files:
- `app/personal_plan_day_content_quality_gate.ts`
- `tests/personal_plan_day_content_quality_gate.test.ts`

Quality gate:
- Passed focused Personal Plans suite: 29 test suites, 155 tests.
- `npx tsc --noEmit --pretty false` was attempted before and after implementation, but the Windows sandbox returned `spawn setup refresh`.

Next implementation route:
P3.3 should add a week-level Harbor content blueprint gate:
- validate seven day drafts through the day-level gate;
- require day 1 to be universal-start only;
- require variety of exercise/content goals across the week;
- require no repeated narrow scenario overload;
- keep it pure and do not edit `personal_plan_catalog.ts` until it can be inspected.
## Implementation update 2026-06-01 - P3.3 week-level Harbor content blueprint gate

Status: completed.

What changed:
- Added a pure week-level content quality gate.
- The gate validates seven day drafts through the day-level content gate.
- It requires exactly 7 days.
- It requires day 1 to be `universal_start`.
- It fails if any day fails day-level content quality.
- It requires at least 5 unique focus/exercise goals across the week.
- It fails if the same narrow scenario tag repeats more than 2 times.

Files:
- `app/personal_plan_week_content_quality_gate.ts`
- `tests/personal_plan_week_content_quality_gate.test.ts`

Quality gate:
- Initial focused Personal Plans suite passed: 30 test suites, 161 tests.
- Hardening pass added missing week identity, duplicate day ids, duplicate day indexes, invalid day order, plan ownership mismatch, and narrow overload inside exercise goals.
- Current focused Personal Plans suite passed: 46 test suites, 228 tests.
- Current TypeScript gate passed: `npx tsc --noEmit --pretty false`.

Next implementation route:
P3.4 should create a non-production Harbor week 1 blueprint draft fixture and run it through the week gate:
- keep it outside the live catalog until `personal_plan_catalog.ts` can be inspected;
- use universal, modern phrases;
- ensure day 1 is broad and not apartment/phone/name-heavy;
- cover at least 5 different exercise/focus goals.
## Implementation update 2026-06-01 - P3.4 Harbor week 1 blueprint draft validation

Status: completed.

What changed:
- Added/validated a non-production Harbor/Gavan week 1 blueprint draft.
- The draft is kept outside the live catalog and is tested through the week-level content gate.
- The week starts with a `universal_start` day.
- The draft avoids exact personal data and day-one narrow-content issues.
- The week keeps narrow scenario tags below overload threshold.
- The week keeps enough focus/exercise variety.

Files:
- `app/personal_plan_harbor_week1_blueprint_draft.ts`
- `tests/personal_plan_harbor_week1_blueprint_draft.test.ts`

Quality gate:
- Focused blueprint/content tests passed: 4 suites, 25 tests.
- Full Personal Plans focused suite passed: 47 suites, 234 tests.
- TypeScript passed: `npx tsc --noEmit --pretty false`.

Next implementation route:
P3.5 should add a non-production authoring passport for the Harbor/Gavan week 1 blueprint before catalog edits:
- define day-by-day learning outcomes;
- define exercise mix per day, not only phrases;
- define 5/10/15/20 minute load;
- define which blocks are phrase build, missing word, choose natural phrase, listen, recall, quiz, and later pronunciation;
- define audio/pronunciation placeholders without pretending final assets exist;
- keep the live catalog unchanged until this passport passes tests.
## Implementation update 2026-06-01 - P3.5 Harbor week 1 authoring passport

Status: completed.

What changed:
- Added a non-production authoring passport for the Harbor/Gavan week 1 blueprint.
- The passport defines learning outcomes, exercise mix, and 5/10/15/20 minute load.
- The exercise mix includes phrase build, missing word, choose natural phrase, listening placeholders, recall, quiz, and pronunciation placeholder.
- The validator rejects missing days, unknown day ids, missing outcomes, unsupported exercise types, invalid minute choices, too-thin load, narrow day-one scenario tags, and fake final audio/pronunciation claims.
- Live catalog, UI, onboarding, and premium flow were not changed.

Files:
- `app/personal_plan_harbor_week1_authoring_passport.ts`
- `tests/personal_plan_harbor_week1_authoring_passport.test.ts`

Quality gate:
- Focused authoring tests passed: 2 suites, 13 tests.
- Full Personal Plans suite passed: 48 suites, 241 tests.
- TypeScript passed: `npx tsc --noEmit --pretty false`.

Next implementation route:
P3.6 should convert the non-production blueprint + passport into draft `PlanExerciseBlock` candidates:
- create pure conversion only, no live catalog edit;
- every draft block must reference an existing blueprint day and known authoring exercise;
- draft block types must be supported by current `PlanExerciseType` or explicitly blocked;
- generated block load must match 5/10/15/20 passport load;
- draft blocks must pass `validatePlanExerciseBlockContract` / `validatePlanEngineQuality`;
- audio/pronunciation placeholders must remain blocked or metadata-only until real assets/scoring exist.

## Implementation update 2026-06-01 - P3.6 draft exercise blocks

Status: completed.

What changed:
- Added a pure converter from the non-production Harbor/Gavan week 1 blueprint plus authoring passport into draft `PlanExerciseBlock` candidates.
- Generated block ids are deterministic: `dayId:exerciseId`.
- Generated blocks preserve day order and authoring order.
- `requiredFor` now reflects the exact 5/10/15/20 minute load membership.
- Blueprint phrase ids become block `contentUnitIds`, so engine gates can verify that tasks are not empty.
- Pronunciation placeholders are not converted into fake production blocks.
- Unknown exercise ids in minute loads fail before any catalog integration.

Files:
- `app/personal_plan_harbor_week1_draft_blocks.ts`
- `tests/personal_plan_harbor_week1_draft_blocks.test.ts`
- `tests/personal_plan_harbor_week1_authoring_passport.test.ts`

Quality gate:
- Full Personal Plans suite passed: 50 suites, 256 tests.
- TypeScript passed: `npx tsc --noEmit --pretty false`.

Research synthesis:
- Duolingo's Practice Hub pattern supports explicit mistake/review loops, but Phraseman must avoid repeated generic practice by keeping `contentUnitIds`, attempt events, and recovery policies tied to each block.
- Memrise's useful edge is natural media; therefore listening blocks must become asset-backed requirements, not generic TTS promises.
- Busuu's useful edge is structured progression; therefore every block must stay connected to prerequisites and day outcomes.
- ELSA's useful edge is transparent speech feedback; therefore pronunciation remains blocked until scoring and feedback are real.

Next implementation route:
P3.7 should create a non-production package readiness gate:
- inspect every draft block from P3.6;
- require `plan_quiz` blocks to declare a 10-question draft quiz requirement;
- require listening blocks to declare audio asset requirements;
- require excluded pronunciation placeholders to remain visible as blocked future work;
- require every block to have renderer readiness metadata;
- produce a day/week readiness summary for the future catalog adapter.

## Implementation update 2026-06-01 - P3.7 package readiness

Status: completed.

What changed:
- Added a pure readiness gate above the Harbor/Gavan week 1 draft blocks.
- The gate checks package-level completeness before any production catalog edit.
- Every block must have renderer readiness metadata.
- Blocked renderers must explain why they are blocked.
- `plan_quiz` blocks must declare exactly 10 draft questions.
- `plan_listen_choose` and `plan_listen_build` blocks must declare audio requirements.
- Audio can be placeholder-only at this stage; fake final audio readiness fails.
- Excluded pronunciation placeholders must be represented as blocked future work.
- Fake final pronunciation/scoring readiness fails.
- Empty generated days fail.

Files:
- `app/personal_plan_harbor_week1_package_readiness.ts`
- `tests/personal_plan_harbor_week1_package_readiness.test.ts`

Quality gate:
- Full Personal Plans suite passed: 51 suites, 262 tests.
- TypeScript passed: `npx tsc --noEmit --pretty false`.

Design implication:
- Future UI should consume readiness as product truth:
  - ready blocks get a clear primary action;
  - blocked draft blocks can appear only in dev/authoring mode;
  - production user mode must not show fake buttons or vague "coming soon" tasks.
- The visual system should stay premium and simple: large cards, clear progress, no cramped controls, no random plan colors, no developer copy.

Next implementation route:
P3.8 should create the first non-production Gavan day 1 package draft:
- include day 1 block ids from the draft converter;
- add quiz requirement details for the day 1 `plan_quiz`;
- add renderer readiness details per block;
- add explanation-card requirements for phrase/new-word teaching;
- define what is ready vs blocked for authoring review;
- still keep it outside `personal_plan_catalog.ts`.

## Implementation update 2026-06-01 - P3.8 Gavan day 1 package draft

Status: completed.

What changed:
- Added a pure non-production day 1 package draft for Gavan.
- The package pulls day 1 blocks from the P3.6 draft converter.
- The package reuses P3.7 readiness input instead of inventing another readiness model.
- The package requires the day 1 quiz block to stay at exactly 10 draft questions.
- The package declares explanation requirements for:
  - `here`;
  - `I'm`;
  - `need`;
  - `minute`;
  - `I need`.
- The validator fails missing explanation coverage.
- The validator fails fake final audio or pronunciation/scoring claims.
- The live catalog and live quiz registry remain untouched.

Files:
- `app/personal_plan_gavan_day1_package_draft.ts`
- `tests/personal_plan_gavan_day1_package_draft.test.ts`

Quality gate:
- Full Personal Plans suite passed: 52 suites, 267 tests.
- TypeScript command was attempted after P3.8, but the shell failed with `windows sandbox: spawn setup refresh`.

Next implementation route:
P3.9 should design the draft day 1 quiz requirement model:
- 10 items;
- item ids;
- source phrase ids;
- prompt text;
- choices;
- correct answer id;
- per-choice explanation requirement;
- no hallucinated wrong-option feedback;
- still outside the production quiz registry.
## Implementation update 2026-06-01 - P3.9 Gavan day 1 quiz draft model

Status: completed.

What changed:
- Added a pure non-production quiz draft model for Gavan day 1.
- The model describes 10 quiz items, stable item ids, source phrase ids, prompts, choices, and explanation requirements.
- The model stays outside the production `app/personal_plan_quizzes.ts` registry.
- The validator rejects:
  - item count other than 10;
  - unknown source phrase ids;
  - missing user-facing prompts;
  - choice counts outside 3-4;
  - duplicate item or choice ids;
  - missing correct answer;
  - multiple correct answers;
  - missing per-choice explanation requirements;
  - wrong-choice explanation text that pretends to know the selected answer without runtime context.

Why this matters:
- The old risk was "we know a quiz must have 10 questions" but had no enforceable structure for quality.
- This closes that gap before any live quiz registry edit.
- It also protects the product voice: quiz feedback must teach the phrase, not invent what the user selected.

Competitor audit tie-in:
- Duolingo: keep short diagnostic loops and repetition, but avoid blind repetition by tying every item to a source phrase.
- Memrise: explanations should support word meaning and memory, not just mark right/wrong.
- Busuu: each check should follow a taught phrase and stay connected to a clear lesson outcome.
- ELSA: feedback quality matters; the same precision rule now applies to phrase-choice explanations before pronunciation scoring exists.

Files:
- `app/personal_plan_gavan_day1_quiz_draft.ts`
- `tests/personal_plan_gavan_day1_quiz_draft.test.ts`

Quality gate:
- Focused quiz draft tests passed: 1 suite, 6 tests.
- Full Personal Plans suite passed: 53 suites, 273 tests.
- TypeScript passed: `npx tsc --noEmit --pretty false`.

Updated roadmap:
1. P3.10 connect the quiz draft into `GavanDay1PackageDraft` readiness, still non-production.
2. P3.11 build a runtime explanation-card adapter that can render correct/wrong tone without hallucinating selected answers.
3. P3.12 add attempt-event taxonomy for quiz choices so wrong choices can feed analytics, weak spots, and personal practice.
4. P3.13 start audio asset requirements for listening tasks without fake TTS claims.
5. P3.14 only then consider a guarded production adapter for day 1.

## Implementation update 2026-06-01 - P3.31 listening authoring requirements

Status: completed.

What changed:
- Added a pure authoring contract for Gavan day 1 listening prompts.
- The contract declares five planned `listen_choose` prompts, one per clean candidate phrase.
- Every prompt is grounded in the current candidate phrase id and exact English target text.
- The authoring plan creates a placeholder `PlanAudioAsset`; it is valid for authoring, but not production-ready.
- The release evidence can now simulate the future listening requirement: if attached to the draft, audio becomes required and the release decision correctly changes to `hold`.
- Default day 1 release remains unchanged: audio is `not_required` until listening is explicitly attached.
- No fake generated audio, no fake approved audio, no live catalog edit, no live quiz registry edit.

Files:
- `app/personal_plan_gavan_day1_listening_authoring.ts`
- `tests/personal_plan_gavan_day1_listening_authoring.test.ts`

Quality gate:
- Focused listening authoring tests passed: 1 suite, 5 tests.
- Focused audio/package/bridge/release/listening tests passed: 5 suites, 52 tests.
- Full Personal Plans suite passed: 65 suites, 379 tests.
- TypeScript passed: `npx tsc --noEmit --pretty false`.
- Source and encoding guards passed.

Research synthesis:
- Duolingo's listening design starts with scaffolded audio exercises and gradually removes text support; Phraseman should therefore store listening prompts separately from final audio assets and let each day declare what it is preparing to train.
- Memrise's public positioning around authentic, useful, personalized learning reinforces that listening should not be a generic TTS promise; each planned prompt must point to a concrete phrase.
- Busuu's speaking/listening direction combines low-pressure practice with feedback; Phraseman should keep placeholder audio honest and block production until the feedback/media path is real.

Next implementation route:
P3.32 should prepare pronunciation authoring requirements for clean Gavan day 1:
- define target phrases for future pronunciation practice;
- keep scoring blocked until a real scorer contract exists;
- validate phrase id and target text grounding;
- connect the requirement to release evidence only as an optional authoring simulation;
- still do not edit UI, onboarding, Premium, Home, catalog, or live quiz registry.

## Implementation update 2026-06-01 - P3.32 pronunciation authoring requirements

Status: completed.

What changed:
- Added a pure authoring contract for future Gavan day 1 pronunciation practice.
- The contract declares five planned pronunciation targets, one per clean candidate phrase.
- Every target is grounded in the current candidate phrase id and exact English target text.
- The authoring plan creates a blocked `PlanPronunciationScoringRequirement`; it is valid for authoring, but not production-ready.
- The release evidence can now simulate the future pronunciation requirement: if attached to the draft, pronunciation becomes required and the release decision correctly changes to `hold`.
- Default day 1 release remains unchanged: pronunciation is `not_required` until pronunciation authoring is explicitly attached.
- No fake microphone flow, no fake scorer, no fake score fields, no live catalog edit, no live quiz registry edit.

Files:
- `app/personal_plan_gavan_day1_pronunciation_authoring.ts`
- `tests/personal_plan_gavan_day1_pronunciation_authoring.test.ts`

Quality gate:
- Red test first failed on the missing authoring module.
- Focused pronunciation authoring tests passed: 1 suite, 7 tests.
- Focused pronunciation/readiness/bridge/release tests passed: 4 suites, 39 tests.
- Full Personal Plans suite passed: 66 suites, 386 tests.
- TypeScript passed: `npx tsc --noEmit --pretty false`.
- Production source guard passed for the new app module.
- Encoding guard passed for the new P3.32 files.

Product decision:
- Pronunciation is now represented honestly as a planned training capability, not as a fake scoring feature.
- This keeps the future UX powerful without creating the exact user disappointment seen in weak language apps: "the app says it checks my speaking, but the feedback is fake or vague."
- The next useful step is not UI polish. It is a combined reviewer bundle that shows content, quiz, explanations, listening, pronunciation, and release evidence in one place.

Next implementation route:
P3.33 should create the first combined authoring readiness bundle for clean Gavan day 1:
- content candidate summary;
- quiz draft summary;
- explanation requirements summary;
- listening authoring summary;
- pronunciation authoring summary;
- release evidence decision;
- one quality-gate object that lets us review the whole day before any live integration.

## Implementation update 2026-06-01 - P3.33 combined authoring readiness bundle

Status: completed.

What changed:
- Added a single reviewer-facing bundle for clean Gavan day 1.
- The bundle collects content quality, package readiness, quiz readiness, explanation coverage, listening authoring, pronunciation authoring, release evidence, and a compact reviewer checklist.
- Default media behavior stays honest: listening and pronunciation are planned, but not required for release unless explicitly attached.
- Optional media attachment mode shows the real blockers:
  - listening attached means audio blocks production until approved audio exists;
  - pronunciation attached means scoring blocks production until real scorer metadata exists.
- The bundle stays pure metadata: no UI, no storage, no live catalog, no live quiz registry.

Files:
- `app/personal_plan_gavan_day1_authoring_bundle.ts`
- `tests/personal_plan_gavan_day1_authoring_bundle.test.ts`

Quality gate:
- Red test first failed on the missing authoring bundle module.
- Focused authoring bundle tests passed: 1 suite, 6 tests.
- Focused bundle/listening/pronunciation/release tests passed: 4 suites, 28 tests.
- Full Personal Plans suite passed: 67 suites, 392 tests.
- TypeScript passed: `npx tsc --noEmit --pretty false`.
- Production source guard passed for the new app module.
- Encoding guard passed for the new P3.33 files.

Product decision:
- The project now has a real "day review table" before live integration.
- This reduces the risk of shipping scattered parts that each pass alone but fail as a complete learning day.
- The bundle is also the right base for future dev/reviewer surfaces, because it can show "planned", "ready", and "blocked" without pretending unfinished media is production-ready.

Next implementation route:
P3.34 should define a production-safe adapter plan from the day 1 authoring bundle to future reviewer/dev surfaces:
- keep it read-only;
- show bundle checklist and release evidence;
- do not edit Home, onboarding, Premium, catalog, or quiz registry;
- do not create a polished user UI yet;
- design how a dev/reviewer screen could consume the bundle later.

## Implementation update 2026-06-01 - P3.34 authoring display adapter

Status: completed.

What changed:
- Added a production-safe display adapter for the Gavan day 1 authoring bundle.
- The adapter converts `GavanDay1AuthoringBundle` into stable reviewer cards.
- Cards cover content, package, quiz, explanations, listening, pronunciation, and release.
- Every card exposes id, label, status, count summary, issue codes, and safe reviewer copy.
- Planned media rows stay visibly planned.
- Attached audio/pronunciation blockers surface exact issue codes.
- Release card exposes blocked release sections.
- The adapter is pure metadata: no UI, no storage, no live catalog, no live quiz registry.

Files:
- `app/personal_plan_gavan_day1_authoring_display_adapter.ts`
- `tests/personal_plan_gavan_day1_authoring_display_adapter.test.ts`

Quality gate:
- Red test first failed on the missing display adapter module.
- Focused display adapter tests passed: 1 suite, 6 tests.
- Focused display adapter + bundle tests passed: 2 suites, 12 tests.
- Full Personal Plans suite passed: 68 suites, 398 tests.
- TypeScript passed: `npx tsc --noEmit --pretty false`.
- Production source guard passed for the new app module.
- Encoding guard passed for the new P3.34 files.

Product decision:
- The internal reviewer/dev surface now has a safe data contract before any screen work.
- This prevents a common product failure: building UI first and only later discovering that statuses, blockers, and copy are inconsistent.
- The adapter keeps "planned", "ready", and "blocked" separate, which is essential for honest Personal Plans development.

Next implementation route:
P3.35 should start the clean Gavan day 1 content QA pass:
- audit all candidate phrase explanations;
- audit all candidate quiz prompts and notes;
- replace remaining robotic or corrupted copy;
- keep the work outside live catalog/quiz registry;
- add quality gates before any user-facing renderer work.

## Implementation update 2026-06-01 - P3.35 content QA pass

Status: completed.

What changed:
- Added a stronger quality gate for Gavan day 1 candidate explanation cards.
- Explanation cards now must read like two or three short human sentences, not a cramped note or a long wall of text.
- Added a quiz note style gate against repetitive confirmation formulas such as `Да:`.
- Added useful-length checks for quiz notes.
- Rewrote candidate quiz notes that started with `Да:`.
- Expanded the short `Need` note so it explains both the word and the phrase purpose.
- Kept phrase ids, quiz item ids, and structural contracts unchanged.
- Did not edit live catalog or live quiz registry.

Files:
- `app/personal_plan_gavan_day1_quiz_draft.ts`
- `tests/personal_plan_gavan_day1_content_candidate.test.ts`
- `tests/personal_plan_gavan_day1_quiz_draft.test.ts`

Quality gate:
- Focused content/quiz tests passed: 2 suites, 27 tests.
- Focused content/quiz/bundle/display tests passed: 4 suites, 39 tests.
- Full Personal Plans suite passed: 68 suites, 400 tests.
- TypeScript passed: `npx tsc --noEmit --pretty false`.
- Production source guard passed for changed app files.
- App-level encoding guard passed for changed content/quiz app files.
- `Да:` guard passed for candidate quiz draft.

Product decision:
- The system already had structure; this step improves the perceived quality of the learning experience.
- Small repetitive formulas make an app feel generated. Removing them is necessary before any premium-quality UI renderer work.
- The next useful step is a reviewer export fixture that shows exact snippets requiring manual approval.

Next implementation route:
P3.36 should create a compact reviewer export fixture:
- include display adapter cards;
- include exact candidate phrase explanations;
- include exact quiz prompts and notes;
- mark all snippets as manual-review candidates;
- stay outside live integration.

## Implementation update 2026-06-01 - P3.36 reviewer export fixture

Status: completed.

What changed:
- Added a compact reviewer export fixture for clean Gavan day 1.
- The fixture combines authoring display cards, release decision, phrase explanation snippets, quiz prompts, and quiz choice notes.
- Every content snippet is explicitly marked `needs_manual_review`.
- The fixture summary exposes the review workload: 7 display cards, 5 phrase explanations, 10 quiz prompts, 30 quiz notes, 45 snippets needing manual review, and 0 approved snippets.
- Validation fails if snippets are accidentally marked approved, contain developer wording, contain mojibake, start with repetitive confirmation formulas, or pretend to know a selected answer without runtime context.
- The fixture remains pure metadata: no UI, no storage, no live catalog, no live quiz registry, no fake audio, no fake pronunciation scoring.

Files:
- `app/personal_plan_gavan_day1_reviewer_export_fixture.ts`
- `tests/personal_plan_gavan_day1_reviewer_export_fixture.test.ts`

Quality gate:
- Red test first failed on the missing reviewer export fixture module.
- Focused reviewer export tests passed: 1 suite, 6 tests.
- Focused reviewer/content/quiz/display tests passed: 4 suites, 39 tests.
- Full Personal Plans suite passed: 69 suites, 406 tests.
- TypeScript passed: `npx tsc --noEmit --pretty false`.
- Production source guard passed for the new app module.
- Encoding guard passed for the new P3.36 app/test files.
- `Да:` guard passed for the new P3.36 app/test files.

Product decision:
- This step adds a human-review checkpoint before production integration.
- It directly protects the plan from shipping text that merely passes structure tests but still feels machine-made.
- The right next step is not UI yet. The next bottleneck is approval logic: approved content must be explicit, traceable, and impossible to confuse with unreviewed candidate text.

Next implementation route:
P3.37 should add an automated reviewer approval gate around the export fixture:
- require explicit approval records for every snippet;
- fail partial approval;
- keep approved data outside live registries until a later bridge step;
- preserve all no-UI/no-storage/no-live-registry constraints for this phase.

## Implementation update 2026-06-01 - P3.37 reviewer approval gate

Status: completed.

What changed:
- Added an automated approval gate around the Gavan day 1 reviewer export fixture.
- Added approval records that must reference exact snippet ids from the fixture.
- Every approval record carries reviewer id, ISO approval timestamp, snippet kind, snippet id, and deterministic text checksum.
- The gate fails partial approval, unknown snippet ids, invalid reviewer metadata, kind mismatch, and text drift after approval.
- Added an approved export builder that converts reviewed snippets from `needs_manual_review` to `approved`.
- Added an approved export validator that rejects any pending snippet inside approved output.
- The approval layer remains pure metadata: no UI, no storage, no live catalog, no live quiz registry, no fake audio, and no fake scoring.

Files:
- `app/personal_plan_gavan_day1_reviewer_approval_gate.ts`
- `tests/personal_plan_gavan_day1_reviewer_approval_gate.test.ts`

Quality gate:
- Red test first failed on the missing reviewer approval gate module.
- Focused approval gate tests passed: 1 suite, 6 tests.
- Focused approval/reviewer/content/quiz/display tests passed: 5 suites, 45 tests.
- Full Personal Plans suite passed: 70 suites, 412 tests.
- TypeScript passed: `npx tsc --noEmit --pretty false`.
- Production source guard passed for the new app module.
- Encoding guard passed for the new P3.37 app/test files.
- `Да:` guard passed for the new P3.37 app/test files.

Product decision:
- Manual review is now enforceable, not just documented.
- A reviewer cannot partially approve the day and accidentally let the rest through.
- If text changes after approval, the checksum breaks and the day must be reviewed again.
- This is the right guard before any exported report, internal reviewer UI, or production bridge.

Next implementation route:
P3.38 should create a reviewer-facing approved export JSON/report builder:
- consume `GavanDay1ApprovedReviewerExport`;
- show exact approved text and approval metadata;
- include release/display summary;
- stay outside live catalog and live quiz registry;
- keep it inspectable by humans before any production bridge.

## Implementation update 2026-06-01 - P3.38 approved export report builder

Status: completed.

What changed:
- Added a reviewer-facing approved export report builder for clean Gavan day 1.
- The report consumes `GavanDay1ApprovedReviewerExport`.
- The report includes release decision and display card summary.
- Approved rows are grouped into phrase explanations, quiz prompts, and quiz notes.
- Every row includes snippet id, snippet kind, exact text, review status, reviewer id, approval timestamp, and checksum.
- Validation rejects missing approval metadata, checksum mismatch, pending snippets, and mismatched human-review totals.
- The report builder remains pure metadata: no UI, no storage, no live catalog, no live quiz registry, no fake audio, and no fake scoring.

Files:
- `app/personal_plan_gavan_day1_approved_export_report.ts`
- `tests/personal_plan_gavan_day1_approved_export_report.test.ts`

Quality gate:
- Red test first failed on the missing approved export report module.
- Focused approved report tests passed: 1 suite, 7 tests.
- Focused report/approval/reviewer export tests passed: 3 suites, 19 tests.
- Full Personal Plans suite passed: 71 suites, 419 tests.
- TypeScript passed: `npx tsc --noEmit --pretty false`.
- Production source guard passed for the new app module.
- Encoding guard passed for the new P3.38 app/test files.
- `Да:` guard passed for the new P3.38 app/test files.

Product decision:
- The pipeline now has a human-readable approved artifact before production bridging.
- This makes content review auditable by exact text, reviewer, timestamp, and checksum.
- The next step can serialize this report for humans without touching live product data.

Next implementation route:
P3.39 should add a non-production artifact writer:
- write approved report JSON under `.codex-tmp` or `docs/reports`;
- keep it deterministic and testable;
- do not write into live app source or production registries;
- do not introduce storage, UI, or navigation.

## Implementation update 2026-06-01 - P3.39 approved report artifact writer

Status: completed.

What changed:
- Added a non-production artifact writer for clean Gavan day 1 approved report JSON.
- The writer lives in `tools` instead of `app`, so Node filesystem code stays out of app runtime.
- The writer serializes deterministic pretty JSON for human inspection.
- The writer only allows targets under `.codex-tmp` or `docs/reports`.
- The writer rejects source/tooling targets, including `app`, `tools`, `tests`, and root config files.
- The writer validates the report before writing and fails invalid reports without creating a file.
- The writer remains outside UI, storage, live catalog, live quiz registry, fake audio, and fake scoring.

Files:
- `tools/personal_plan_gavan_day1_approved_report_artifact.ts`
- `tests/personal_plan_gavan_day1_approved_report_artifact.test.ts`

Quality gate:
- Red test first failed on the missing approved report artifact module.
- Focused artifact writer tests passed: 1 suite, 6 tests.
- Focused artifact/report/approval/reviewer export tests passed: 4 suites, 25 tests.
- Full Personal Plans suite passed: 72 suites, 425 tests.
- TypeScript passed: `npx tsc --noEmit --pretty false`.
- Source guard passed for the new tool module.
- Encoding guard passed for the new P3.39 tool/test files.
- `Да:` guard passed for the new P3.39 tool/test files.

Product decision:
- The pipeline can now produce a deterministic inspection artifact without touching production data.
- This is the correct bridge between internal approval and future manual review of the final artifact.
- The next step should generate one actual `.codex-tmp` artifact and audit it for readability and completeness.

Next implementation route:
P3.40 should generate the first approved-report JSON artifact:
- use the existing writer;
- save under `.codex-tmp`;
- audit the generated JSON for readability and completeness;
- do not integrate with live catalog or quiz registry.

## Implementation update 2026-06-01 - P3.40 generated approved artifact

Status: completed.

What changed:
- Added a non-production generator for the clean Gavan day 1 approved report artifact.
- The generator builds the full chain: reviewer export fixture -> approval input -> approved export -> approved report -> JSON artifact.
- The default artifact path is `.codex-tmp/personal-plans/gavan-day1-approved-report.json`.
- Added an artifact audit that checks kind, day id, `liveIntegration: false`, row groups, totals, exact text, reviewer metadata, and checksums.
- The artifact is now a real file that can be opened and inspected by a human before any production bridge.
- The generator remains pure tooling: no UI, no storage, no navigation, no live catalog, no live quiz registry, no fake audio, and no fake scoring.

Files:
- `tools/personal_plan_gavan_day1_generated_artifact.ts`
- `tests/personal_plan_gavan_day1_generated_artifact.test.ts`
- `.codex-tmp/personal-plans/gavan-day1-approved-report.json`

Quality gate:
- Red test first failed on the missing generated artifact module.
- Focused generated artifact tests passed: 1 suite, 6 tests.
- Focused generated-artifact/artifact-writer/report/approval tests passed: 5 suites, 31 tests.
- Full Personal Plans suite passed: 73 suites, 431 tests.
- TypeScript passed: `npx tsc --noEmit --pretty false`.
- Source guard passed for the new tool module.
- Encoding guard passed for the new P3.40 tool/test files and generated artifact.
- `Да:` guard passed for the new P3.40 tool/test files and generated artifact.
- Generated artifact exists and is 25,631 bytes.

Product decision:
- The pipeline now has an actual deterministic approved artifact, not only code that could generate one.
- This is still not production content; it is the last inspection layer before a stricter product-copy gate and future production bridge.
- The next step should judge the approved artifact as product copy, not just as valid data.

Next implementation route:
P3.41 should add a stricter product-copy audit gate against generated approved artifact rows:
- reject robotic or developer-like wording;
- reject mojibake and corrupted Russian;
- reject repetitive formulas and fake selected-answer context;
- require useful explanation density for phrase explanations and quiz notes;
- keep the gate outside UI, storage, live catalog, live quiz registry, audio, and scoring.

## Implementation update 2026-06-01 - P3.41 product-copy artifact gate

Status: completed.

What changed:
- Added a stricter product-copy audit gate for the generated clean Gavan day 1 approved artifact.
- The gate reads artifact/report rows and judges them as learner-facing product copy.
- It checks row group counts, approved status, mojibake markers, developer/placeholder wording, fake selected-answer context, repetitive formula starts, short explanation rows, and technical target tails.
- Every issue includes issue code, row group, snippet id, exact text excerpt, and detail.
- The gate intentionally blocks the current generated artifact because phrase explanation `exactText` includes technical covered-target tails such as trailing target words after the actual explanation.
- The gate remains pure tooling: no UI, no storage, no navigation, no live catalog, no live quiz registry, no fake audio, and no fake scoring.

Files:
- `tools/personal_plan_gavan_day1_artifact_copy_audit.ts`
- `tests/personal_plan_gavan_day1_artifact_copy_audit.test.ts`

Quality gate:
- Red test first failed on the missing copy audit module.
- Focused copy-audit tests passed: 1 suite, 5 tests.
- Focused copy-audit/generated-artifact/artifact-writer/report/approval tests passed: 6 suites, 36 tests.
- Full Personal Plans suite passed: 74 suites, 436 tests.
- TypeScript passed: `npx tsc --noEmit --pretty false`.
- Source guard passed for the new tool module.
- Encoding guard passed for the new P3.41 tool/test/report files.

Product decision:
- Gavan day 1 is not ready for production bridge yet.
- The blocker is not the core phrase choice; it is the report/export assembly that mixes learner-facing text with technical `coveredTargets`.
- This is exactly why the product-copy gate is useful: structurally valid content can still produce an unpolished learner-facing artifact.

Next implementation route:
P3.42 should rewrite approved report exactText assembly:
- phrase explanation `exactText` must contain only learner-facing phrase, translation, title, and explanation body;
- technical targets must move to metadata, not copy;
- approval/checksum logic must stay deterministic;
- product-copy gate should then be expected to pass for the clean artifact;
- still no live catalog, quiz registry, UI, storage, audio, or scoring changes.

## Implementation update 2026-06-01 - P3.42 exactText assembly cleanup

Status: completed.

What changed:
- Cleaned the approved report phrase explanation `exactText` contract.
- Phrase explanation rows now keep learner-facing text separate from technical target metadata.
- `exactText` includes phrase, translation, title, and explanation body only.
- `coveredTargets` are exposed separately on phrase explanation rows.
- Reviewer approval checksum visible text now matches the learner-facing exact text contract.
- Reviewer export fixture visible text also excludes technical targets from copy validation.
- The generated `.codex-tmp` artifact was regenerated.
- The product-copy gate now passes for the clean generated artifact.

Files:
- `app/personal_plan_gavan_day1_approved_export_report.ts`
- `app/personal_plan_gavan_day1_reviewer_approval_gate.ts`
- `app/personal_plan_gavan_day1_reviewer_export_fixture.ts`
- `tests/personal_plan_gavan_day1_approved_export_report.test.ts`
- `tests/personal_plan_gavan_day1_generated_artifact.test.ts`
- `tests/personal_plan_gavan_day1_artifact_copy_audit.test.ts`
- `.codex-tmp/personal-plans/gavan-day1-approved-report.json`

Quality gate:
- Red tests first failed because phrase explanation rows still appended target words and copy audit still failed.
- Focused report/copy-audit/generated-artifact/approval tests passed: 5 suites, 32 tests.
- Full Personal Plans suite passed: 74 suites, 438 tests.
- TypeScript passed: `npx tsc --noEmit --pretty false`.
- Source guard passed for changed P3.42 app/tool files.
- Encoding guard passed for changed P3.42 app/tool/test/report files and regenerated artifact.
- Regenerated artifact first phrase `exactText` no longer ends with `here I'm`.
- Regenerated artifact keeps `coveredTargets: ["here", "I'm"]` as metadata.

Product decision:
- The artifact is now closer to a production bridge candidate because learner-facing copy and internal metadata are separated.
- This fixes the specific product-quality blocker from P3.41.
- The next gate should still prevent live registry edits until structural validation, artifact validation, and copy audit all pass together.

Next implementation route:
P3.43 should add a non-live production bridge draft readiness gate:
- require approved report validation;
- require generated artifact validation;
- require product-copy audit passing;
- report exact blockers before any live registry edit is allowed;
- still do not edit live catalog, quiz registry, UI, storage, onboarding, Premium, Home, audio, or scoring.

## Implementation update 2026-06-01 - P3.43 non-live production bridge readiness

Status: completed.

What changed:
- Added a non-live readiness gate before any production bridge draft or live registry edit.
- The gate requires three stages to pass: approved report validation, approved artifact validation, and product-copy audit.
- The readiness result exposes stage-level status, issue count, issues, blockers, and summary.
- The gate accepts the regenerated clean artifact from P3.42.
- The gate rejects invalid report checksums, invalid artifact shape, `liveIntegration: true`, and product-copy failures.
- The gate remains pure tooling: no UI, no storage, no navigation, no live catalog, no live quiz registry, no fake audio, and no fake scoring.
- Cleaned copy-audit tooling source to avoid raw Cyrillic/smart punctuation in regex and excerpts.

Files:
- `tools/personal_plan_gavan_day1_production_bridge_readiness.ts`
- `tests/personal_plan_gavan_day1_production_bridge_readiness.test.ts`
- `tools/personal_plan_gavan_day1_artifact_copy_audit.ts`

Quality gate:
- Red test first failed on the missing readiness module.
- Focused readiness tests passed: 1 suite, 6 tests.
- Focused readiness/report/copy-audit/generated-artifact tests passed: 5 suites, 32 tests.
- Full Personal Plans suite passed: 75 suites, 444 tests.
- TypeScript passed: `npx tsc --noEmit --pretty false`.
- Source guard passed for P3.43 tooling files.
- Encoding guard passed for P3.43 tool/test/report files.

Product decision:
- Clean Gavan day 1 now has a non-live gate that can say whether a production bridge draft is allowed.
- This prevents accidental jumps from "artifact looks good" to live registry editing.
- The next step can safely create a dry-run manifest because readiness now has a single accountable result.

Next implementation route:
P3.44 should prepare a dry-run production bridge manifest:
- write only under `.codex-tmp` or `docs/reports`;
- describe exact future catalog and quiz additions;
- include readiness result;
- include no source edits to live catalog or live quiz registry.

## Implementation update 2026-06-02 - P3.44 dry-run bridge manifest

Status: completed.

What changed:
- Added a deterministic dry-run production bridge manifest for clean Gavan day 1.
- The manifest is built only from a readiness-ready artifact.
- It embeds the P3.43 readiness result.
- It lists future file targets without importing or editing live registries.
- It lists 5 proposed catalog unit ids.
- It lists quiz id `gavan-week1-day1-quiz`, 10 item ids, 10 prompt snippet ids, and 30 note snippet ids.
- It writes only under `.codex-tmp` or `docs/reports`.
- It rejects source/tooling/test output targets.
- It generated `.codex-tmp/personal-plans/gavan-day1-dry-run-bridge-manifest.json`.

Files:
- `tools/personal_plan_gavan_day1_dry_run_bridge_manifest.ts`
- `tests/personal_plan_gavan_day1_dry_run_bridge_manifest.test.ts`
- `.codex-tmp/personal-plans/gavan-day1-dry-run-bridge-manifest.json`

Quality gate:
- Red test first failed on the missing manifest module.
- Focused manifest tests passed: 1 suite, 6 tests.
- Focused manifest/readiness/generated-artifact tests passed: 4 suites, 24 tests.
- Full Personal Plans suite passed: 76 suites, 450 tests.
- TypeScript passed: `npx tsc --noEmit --pretty false`.
- Source guard passed for P3.44 tooling file.
- Encoding guard passed for P3.44 tool/test/report files and generated manifest.

Product decision:
- The pipeline now has a safe dry-run artifact that describes future production additions without mutating live source.
- This is the right artifact before any real live bridge because it makes the proposed catalog/quiz additions reviewable.
- The next step should compare this manifest against the actual live catalog/quiz file shape and produce a non-applied implementation diff plan.

Next implementation route:
P3.45 should audit the dry-run manifest against real live file shape:
- inspect `app/personal_plan_catalog.ts`;
- inspect `app/personal_plan_quizzes.ts`;
- do not edit them;
- produce a precise non-applied diff plan under `.codex-tmp` or `docs/reports`.

## Implementation update 2026-06-02 - P3.45 non-applied bridge diff plan

Status: completed.

What changed:
- Added a non-applied implementation diff plan for clean Gavan day 1.
- The plan reads the P3.44 dry-run manifest and live file source text as input.
- The plan recognizes the current catalog shape without importing or mutating it.
- The plan recognizes the current quiz registry shape without importing or mutating it.
- The plan maps 5 proposed catalog unit ids to a future catalog insertion point.
- The plan maps `gavan-week1-day1-quiz` to future quiz registry insertion points.
- Every future edit is marked `not_applied` and `applied: false`.
- The writer only allows `.codex-tmp` and `docs/reports`.
- It generated `.codex-tmp/personal-plans/gavan-day1-bridge-diff-plan.json`.

Files:
- `tools/personal_plan_gavan_day1_bridge_diff_plan.ts`
- `tests/personal_plan_gavan_day1_bridge_diff_plan.test.ts`
- `.codex-tmp/personal-plans/gavan-day1-bridge-diff-plan.json`

Quality gate:
- Red test first failed on the missing diff-plan module.
- Focused diff-plan tests passed: 1 suite, 6 tests.
- Focused diff-plan/manifest/readiness tests passed: 3 suites, 18 tests.
- Full Personal Plans suite passed: 77 suites, 456 tests.
- TypeScript passed: `npx tsc --noEmit --pretty false`.
- Source guard passed for P3.45 tooling file.
- Encoding guard passed for P3.45 tool/test/report files and generated diff plan.

Product decision:
- The future bridge now has a precise, reviewable, non-applied implementation plan.
- This keeps live files protected while making the next real implementation step concrete.
- The live catalog file currently contains old mojibake content, but P3.45 did not edit it; that should be handled only in an explicit cleanup task.

Next implementation route:
P3.46 should prepare guarded implementation tests for the future live bridge:
- tests should describe expected live behavior after a future explicit bridge;
- tests must not edit live files by themselves;
- live source edits still require explicit approval.

## Implementation update 2026-06-02 - P3.46 future bridge guard report

Status: completed as dry guard tooling. Live bridge not applied.

What changed:
- Added a future bridge guard report for clean Gavan day 1.
- The report converts the P3.45 non-applied diff plan into a concrete implementation checklist.
- It blocks any `applied` bridge state unless explicit approval metadata exists.
- It validates the 5 required Gavan day 1 catalog unit ids.
- It validates quiz id `gavan-week1-day1-quiz`.
- It validates the future quiz registry target includes `PLAN_QUIZZES`, `PLAN_QUIZ_COVERAGE`, and `PLAN_QUIZ_TASK_COPY`.
- It records `sourceWritesUsed: false` and `phaseWriteTargets: []`.
- It writes only to `.codex-tmp` or `docs/reports`.

Files:
- `tools/personal_plan_gavan_day1_future_bridge_guard.ts`
- `tests/personal_plan_gavan_day1_future_bridge_guard.test.ts`
- `.codex-tmp/personal-plans/gavan-day1-future-bridge-guard-report.json`

Quality gate:
- Red test first failed on the missing future-bridge guard module.
- Focused future-bridge guard tests passed: 1 suite, 7 tests.
- Focused future-bridge/diff-plan/manifest tests passed: 3 suites, 19 tests.
- Full Personal Plans suite passed: 78 suites, 463 tests.
- TypeScript passed: `npx tsc --noEmit --pretty false`.
- Source guard passed for P3.46 tooling file.
- Encoding guard passed for P3.46 tool/test/report files and generated guard report.

Product decision:
- The system now has a second safety rail between approved content and live integration.
- The next implementation step can be tested before source files are touched.
- Applying the bridge to live catalog/quiz files remains explicitly out of scope until approved.

Next implementation route:
P3.47 should start only after explicit approval:
- connect certified Gavan day 1 units to the live catalog;
- connect `gavan-week1-day1-quiz` to the live quiz registries;
- keep existing quality gates and add regression tests before source edits.

## Implementation update 2026-06-02 - P3.47 read-only live bridge preflight

Status: completed as read-only preflight. Live bridge not applied.

What changed:
- Added a live bridge preflight report for clean Gavan day 1.
- The preflight reads current live catalog/quiz source text as input only.
- It confirms certified ids are not already present in live source.
- It confirms the future diff still matches the certified Gavan day 1 ids.
- It confirms the future guard still blocks application without approval metadata.
- It records `liveBridgeCanApplyNow: false`.
- It records `approvalMetadataPresent: false`.
- It records `sourceWritesUsed: false` and `phaseWriteTargets: []`.

Files:
- `tools/personal_plan_gavan_day1_live_bridge_preflight.ts`
- `tests/personal_plan_gavan_day1_live_bridge_preflight.test.ts`
- `.codex-tmp/personal-plans/gavan-day1-live-bridge-preflight-report.json`

Quality gate:
- Red test first failed on the missing live-bridge preflight module.
- Focused live-bridge preflight tests passed: 1 suite, 7 tests.
- Focused live-bridge/preflight/guard/diff/manifest tests passed: 4 suites, 26 tests.
- Full Personal Plans suite passed: 79 suites, 470 tests.
- TypeScript passed: `npx tsc --noEmit --pretty false`.
- Source guard passed for P3.47 tooling file.
- Encoding guard passed for P3.47 tool/test/report files and generated preflight report.

Product decision:
- Because there was no explicit approval to edit `app/personal_plan_catalog.ts` and `app/personal_plan_quizzes.ts`, P3.47 stayed read-only.
- The live bridge is now ready for an approval decision, not silently applied.

Next implementation route:
- If approval is given: add tests first, then apply the smallest possible catalog/quiz bridge.
- If approval is not given: continue product/content expansion without live source edits.

## Implementation update 2026-06-02 - P3.48 Gavan week 1 expansion standards

Status: completed as non-live standards. No final exercises written.

What changed:
- Added a standards artifact for Gavan week 1 days 2-7.
- The artifact is explicitly `liveIntegration: false`.
- The artifact is explicitly `standards_only_not_final_exercises`.
- Days 2-7 now have daily roles, allowed situation families, exercise slots, load maps, explanation policy, audio policy, pronunciation policy, and prerequisite policy.
- The standards forbid exact names, phone numbers, email addresses, apartment viewing, rent/documents, doctor appointments, and bank card problems by default.
- The standards require universal public everyday safety and avoidance of personal identity data.
- The standards require varied exercise formats across the week.
- The standards use only the four onboarding minute choices: 5, 10, 15, 20.
- Audio is required but marked `not_generated`.
- Pronunciation is required but scoring is marked `not_built`.

Files:
- `tools/personal_plan_gavan_week1_expansion_standards.ts`
- `tests/personal_plan_gavan_week1_expansion_standards.test.ts`
- `.codex-tmp/personal-plans/gavan-week1-days2-7-expansion-standards.json`

Quality gate:
- Red test first failed on the missing expansion standards module.
- Focused Gavan week 1 expansion standards tests passed: 1 suite, 10 tests.
- Full Personal Plans suite passed: 80 suites, 480 tests.
- TypeScript passed: `npx tsc --noEmit --pretty false`.
- Source guard passed for P3.48 tooling file.
- Encoding guard passed for P3.48 tool/test/report files and generated standards artifact.

Product decision:
- Since live bridge approval was not given, the best next move was to make content generation safer before writing more exercises.
- This directly addresses the user's correction: future days must be universal, socially safe, varied, and not built around names, phone numbers, apartments, or documents by default.

Next implementation route:
- P3.49 should convert these standards into a non-live day 2 content blueprint candidate.
- Day 2 should still avoid final audio/pronunciation claims and should not be registered in live catalog/quiz routes.

## Implementation update 2026-06-02 - P3.49 Gavan day 2 blueprint candidate

Status: completed as non-live blueprint candidate. Not registered in live routes.

What changed:
- Added a Gavan week 1 day 2 blueprint candidate.
- The candidate is explicitly `liveIntegration: false`.
- The candidate is explicitly `blueprint_candidate_not_final_exercises`.
- It contains 4 universal phrase candidates:
  - `Sorry, could you say that again?`
  - `Could you say it a bit slower?`
  - `I didn't catch that.`
  - `One more time, please.`
- It includes natural choice, listening choice, phrase build, and active recall exercise blueprints.
- It requires explanations for every new word and first-seen construction.
- It blocks wrong-answer explanations from inventing unseen options.
- It keeps audio `not_generated` and pronunciation scoring `not_built`.

Files:
- `tools/personal_plan_gavan_week1_day2_blueprint_candidate.ts`
- `tests/personal_plan_gavan_week1_day2_blueprint_candidate.test.ts`
- `.codex-tmp/personal-plans/gavan-week1-day2-blueprint-candidate.json`

Quality gate:
- Red test first failed on the missing day 2 blueprint candidate module.
- Focused Gavan week 1 day 2 blueprint candidate tests passed: 1 suite, 11 tests.
- Focused day 2 candidate plus expansion standards tests passed: 2 suites, 21 tests.
- Full Personal Plans suite passed: 81 suites, 491 tests.
- TypeScript passed: `npx tsc --noEmit --pretty false`.
- Source guard passed for P3.49 tooling file.
- Encoding guard passed for P3.49 tool/test/report files and generated day 2 candidate artifact.

Product decision:
- Day 2 now follows the user's corrected direction: common, socially safe phrases for repetition and understanding.
- It avoids names, phone numbers, apartments, documents, doctor, bank, and other narrow anchors.
- It is still not a final playable lesson; it is ready for a reviewer/export gate.

Next implementation route:
- P3.50 should prepare a reviewer/export quality gate for day 2, or use this same pattern to convert day 3 standards into a blueprint candidate.

## Implementation update 2026-06-02 - P3.50 Gavan day 2 reviewer export gate

Status: completed as non-live reviewer export. Not approved and not registered in live routes.

What changed:
- Added a reviewer/export gate for the Gavan week 1 day 2 blueprint candidate.
- The export is explicitly `liveIntegration: false`.
- Every content unit, explanation card, and exercise blueprint is exported as a review row.
- Every row is marked `needs_manual_review`.
- The export proves audio is `not_generated` and pronunciation scoring is `not_built`.
- The export proves there are no final audio or pronunciation claims.
- The export checks visible reviewer copy for forbidden personal and narrow anchors.
- The export includes exercise coverage for natural choice, listening choice, phrase build, and active recall.

Files:
- `tools/personal_plan_gavan_week1_day2_reviewer_export.ts`
- `tests/personal_plan_gavan_week1_day2_reviewer_export.test.ts`
- `.codex-tmp/personal-plans/gavan-week1-day2-reviewer-export.json`

Quality gate:
- Red test first failed on the missing day 2 reviewer export module.
- Focused Gavan week 1 day 2 reviewer export tests passed: 1 suite, 8 tests.

Product decision:
- Day 2 should not move toward production until a reviewer can inspect all copy and exercise blueprints in one stable artifact.
- The export is intentionally not an approval. It creates the human review surface and keeps the reset pipeline honest.

Next implementation route:
- P3.51 should either create a day 2 reviewer approval gate or convert day 3 standards into a blueprint candidate after verification stays green.

## Implementation update 2026-06-02 - P3.51 Gavan day 2 reviewer approval gate

Status: completed as non-live approved reviewer export. Not registered in live routes.

What changed:
- Added an explicit approval gate for the Gavan week 1 day 2 reviewer export.
- The gate builds approval records for every reviewer row: content units, explanation cards, and exercise blueprints.
- Each approval record includes reviewer id, approved timestamp, row kind, row id, and text checksum.
- The gate rejects partial approval.
- The gate rejects changed copy through checksum mismatch.
- The gate rejects unsafe reviewer exports before approval, including fake audio readiness and forbidden anchors.
- The approved artifact remains `liveIntegration: false`.

Files:
- `tools/personal_plan_gavan_week1_day2_reviewer_approval_gate.ts`
- `tests/personal_plan_gavan_week1_day2_reviewer_approval_gate.test.ts`
- `.codex-tmp/personal-plans/gavan-week1-day2-approved-reviewer-export.json`

Quality gate:
- Red test first failed on the missing day 2 reviewer approval gate module.
- Focused Gavan week 1 day 2 reviewer approval gate tests passed: 1 suite, 7 tests.

Product decision:
- Day 2 now has a clear transition from reviewer export to approved reviewer export without becoming production content.
- This keeps the content pipeline auditable: blueprint candidate -> reviewer export -> approved reviewer export -> later production bridge only with explicit approval.

Next implementation route:
- P3.52 should convert Gavan week 1 day 3 standards into a non-live blueprint candidate, unless explicit approval is given for a live bridge.

## Implementation update 2026-06-02 - P3.52 Gavan day 3 blueprint candidate

Status: completed as non-live blueprint candidate. Not registered in live routes.

What changed:
- Added a Gavan week 1 day 3 blueprint candidate.
- The candidate is explicitly `liveIntegration: false`.
- The candidate is explicitly `blueprint_candidate_not_final_exercises`.
- It contains 4 universal phrase candidates:
  - `Sorry, I didn't catch that.`
  - `Could you speak a little slower?`
  - `What does that mean?`
  - `Could you show me?`
- It includes missing word, micro dialogue, listening choice, and active recall exercise blueprints.
- It requires explanations for every new word and first-seen construction.
- It blocks wrong-answer explanations from inventing unseen options.
- It keeps audio `not_generated` and pronunciation scoring `not_built`.

Files:
- `tools/personal_plan_gavan_week1_day3_blueprint_candidate.ts`
- `tests/personal_plan_gavan_week1_day3_blueprint_candidate.test.ts`
- `.codex-tmp/personal-plans/gavan-week1-day3-blueprint-candidate.json`

Quality gate:
- Red test first failed on the missing day 3 blueprint candidate module.
- Focused Gavan week 1 day 3 blueprint candidate tests passed: 1 suite, 11 tests.

Product decision:
- Day 3 expands the route from repetition requests into understanding and pace control.
- The content remains universal and socially safe, with no personal data or narrow relocation bureaucracy.
- The candidate is still not a final playable lesson; it needs reviewer/export and approval gates before any production bridge.

Next implementation route:
- P3.53 should prepare a reviewer/export quality gate for day 3, unless explicit approval is given for a live bridge.

## Implementation update 2026-06-02 - P3.53 Gavan day 3 reviewer export gate

Status: completed as non-live reviewer export. Not approved and not registered in live routes.

What changed:
- Added a reviewer/export gate for the Gavan week 1 day 3 blueprint candidate.
- The export is explicitly `liveIntegration: false`.
- Every content unit, explanation card, and exercise blueprint is exported as a review row.
- Every row is marked `needs_manual_review`.
- The export proves audio is `not_generated` and pronunciation scoring is `not_built`.
- The export proves there are no final audio or pronunciation claims.
- The export checks visible reviewer copy for forbidden anchors and corrupted copy.
- The export includes exercise coverage for missing word, micro dialogue, listening choice, and active recall.

Files:
- `tools/personal_plan_gavan_week1_day3_reviewer_export.ts`
- `tests/personal_plan_gavan_week1_day3_reviewer_export.test.ts`
- `.codex-tmp/personal-plans/gavan-week1-day3-reviewer-export.json`

Quality gate:
- Red test first failed on the missing day 3 reviewer export module.
- Focused Gavan week 1 day 3 reviewer export tests passed: 1 suite, 8 tests.

Product decision:
- Day 3 now has a stable review artifact, but it is intentionally not approved.
- This repeats the day 2 safety pattern and keeps the pipeline auditable before any production bridge.

Next implementation route:
- P3.54 should create a day 3 reviewer approval gate, unless explicit approval is given for a live bridge.

## Implementation update 2026-06-02 - P3.54 Gavan day 3 reviewer approval gate

### Route chosen

P3.54 closes the day 3 review loop with a non-live approval gate. This is the correct next route because day 3 already has a blueprint candidate and reviewer export, but it still needs an explicit quality barrier before any later production bridge can even be considered.

### What changed

- Added `tools/personal_plan_gavan_week1_day3_reviewer_approval_gate.ts`.
- Added `tests/personal_plan_gavan_week1_day3_reviewer_approval_gate.test.ts`.
- Generated `.codex-tmp/personal-plans/gavan-week1-day3-approved-reviewer-export.json`.
- Created `docs/reports/personal-plans-p354-gavan-day3-reviewer-approval-gate-2026-06-02.md`.
- Updated `.codex-tmp/codex-next-prompt.txt` to route the next step to P3.55.

### Quality gate added

- Every exported content unit, explanation card, and exercise blueprint must have an explicit approval record.
- Each approval record stores reviewer id, approval timestamp, row kind, row id, and a checksum of the visible reviewer text.
- The gate rejects changed copy after approval.
- The gate rejects partial approval, duplicate approval rows, unknown rows, missing reviewer id, invalid timestamps, and row kind mismatches.
- The gate rejects reviewer exports with forbidden anchors, fake final audio readiness, or fake pronunciation scoring readiness.
- The approved export remains non-live and can write only under `.codex-tmp` or `docs/reports`.
- The tooling does not import live Personal Plan catalog, quiz, UI, storage, audio, pronunciation, or navigation modules.

### Product meaning

This keeps the reset pipeline honest: content can move from candidate to reviewer export to approved export, but still cannot silently become a live user-facing route. The approval artifact is useful for future release bridges because it carries review metadata and copy checksums instead of relying on memory.

### Remaining gap

Day 3 is approved as a non-live artifact only. It is not playable, not registered in the catalog, and not connected to quizzes, audio, pronunciation scoring, onboarding, Premium, Home, or storage.

### Updated implementation map

- P3.54 complete: day 3 non-live approval gate.
- P3.55 next: create Gavan week 1 day 4 blueprint candidate from the existing expansion standards.
- Continue preserving the rule: no live bridge without explicit approval.

## Implementation update 2026-06-02 - P3.55 Gavan day 4 blueprint candidate

### Route chosen

P3.55 continues the safest product path: expand Gavan week 1 one day at a time as non-live candidate material. The chosen day 4 skill is universal visible-help language, not narrow relocation copy.

### What changed

- Added `tools/personal_plan_gavan_week1_day4_blueprint_candidate.ts`.
- Added `tests/personal_plan_gavan_week1_day4_blueprint_candidate.test.ts`.
- Generated `.codex-tmp/personal-plans/gavan-week1-day4-blueprint-candidate.json`.
- Created `docs/reports/personal-plans-p355-gavan-day4-blueprint-candidate-2026-06-02.md`.
- Updated `.codex-tmp/codex-next-prompt.txt` to route the next step to P3.56.

### Day 4 product direction

Day 4 trains a broad, socially safe everyday skill: ask for help with something visible, say you are not sure, check if you are in the right place, and ask to be pointed in the right direction. This avoids the earlier problem of over-specific apartment, bank, phone, email, or identity-heavy content.

### Candidate content

- `Could you help me with this?`
- `I'm not sure what to do.`
- `Is this the right place?`
- `Could you point me in the right direction?`

### Quality gates added

- Candidate must remain `liveIntegration: false`.
- Candidate cannot claim final audio or final pronunciation scoring.
- Candidate cannot contain forbidden narrow anchors or corrupted copy.
- Every new word and first-seen construction needs explanation coverage.
- Wrong-answer policy must not invent unseen options.
- Exercise variety must include `phrase_build`, `natural_choice`, `pronunciation_shadow`, and `active_recall`.
- Writes are restricted to `.codex-tmp` and `docs/reports`.

### Remaining gap

Day 4 is a candidate only. It still needs a reviewer/export gate, reviewer approval gate, and later an explicitly approved live bridge before becoming user-facing.

## Implementation update 2026-06-02 - P3.56 Gavan day 4 reviewer export gate

### Route chosen

P3.56 turns the day 4 candidate into a reviewer export, still non-live. This creates the manual-review surface needed before any approval artifact or production bridge.

### What changed

- Added `tools/personal_plan_gavan_week1_day4_reviewer_export.ts`.
- Added `tests/personal_plan_gavan_week1_day4_reviewer_export.test.ts`.
- Generated `.codex-tmp/personal-plans/gavan-week1-day4-reviewer-export.json`.
- Created `docs/reports/personal-plans-p356-gavan-day4-reviewer-export-2026-06-02.md`.
- Updated `.codex-tmp/codex-next-prompt.txt` to route the next step to P3.57.

### Quality gate added

- Every day 4 content unit is exported as a reviewer row.
- Every explanation card is exported as a reviewer row.
- Every exercise blueprint is exported as a reviewer row.
- All rows remain `needs_manual_review`.
- Exercise coverage requires `phrase_build`, `natural_choice`, `pronunciation_shadow`, and `active_recall`.
- The export rejects forbidden anchors, fake final audio, fake pronunciation scoring, and missing rows.
- The writer is restricted to `.codex-tmp` and `docs/reports`.

### Product meaning

Day 4 now has a clean reviewable surface. This matters because day 4 includes `pronunciation_shadow`; the export keeps it honest by making it a future exercise blueprint, not a fake playable pronunciation-scoring feature.

### Remaining gap

Day 4 is reviewer-exported only. It still needs explicit reviewer approval and then a separate live bridge with release gates before it can become user-facing.

## Implementation update 2026-06-02 - P3.57 Gavan day 4 reviewer approval gate

### Route chosen

P3.57 closes the day 4 review loop with a non-live approval gate. This is the correct next step after P3.56 because the reviewer export needs explicit approval records and text checksums before any future bridge can be discussed.

### What changed

- Added `tools/personal_plan_gavan_week1_day4_reviewer_approval_gate.ts`.
- Added `tests/personal_plan_gavan_week1_day4_reviewer_approval_gate.test.ts`.
- Generated `.codex-tmp/personal-plans/gavan-week1-day4-approved-reviewer-export.json`.
- Created `docs/reports/personal-plans-p357-gavan-day4-reviewer-approval-gate-2026-06-02.md`.
- Updated `.codex-tmp/codex-next-prompt.txt` to route the next step to P3.58.

### Quality gate added

- Approval must cover all content unit rows, explanation rows, and exercise blueprint rows.
- Approval metadata includes reviewer id, approval timestamp, row id, row kind, and visible-text checksum.
- Changed visible copy fails with `text_checksum_mismatch`.
- Partial approval, invalid metadata, forbidden anchors, fake final audio, and fake pronunciation scoring fail.
- The approved artifact remains `liveIntegration: false` and writes only under `.codex-tmp` or `docs/reports`.

### Product meaning

Day 4 is now review-approved as a controlled artifact, not as a live product surface. This preserves the important distinction between "content has passed review" and "content is safe to ship in the app."

### Remaining gap

Day 4 is approved only as a non-live artifact. It is not playable, not registered in production routes, and still requires a separate explicit live bridge task if the user wants to ship it.

## Implementation update 2026-06-02 - P3.58 Gavan day 5 blueprint candidate

### Route chosen

P3.58 converts the day 5 standards into a non-live candidate only. This is the correct next step because day 5 needs the same candidate -> reviewer export -> approval -> explicit live bridge chain as days 2-4.

### What changed

- Added `tools/personal_plan_gavan_week1_day5_blueprint_candidate.ts`.
- Added `tests/personal_plan_gavan_week1_day5_blueprint_candidate.test.ts`.
- Generated `.codex-tmp/personal-plans/gavan-week1-day5-blueprint-candidate.json`.
- Created `docs/reports/personal-plans-p358-gavan-day5-blueprint-candidate-2026-06-02.md`.
- Updated `.codex-tmp/codex-next-prompt.txt` to route the next step to P3.59.

### Candidate phrase direction

- `Is this the right way?`
- `What should I do next?`
- `Do I need to wait here?`
- `Is it okay like this?`

These are broad public-safe phrases: no names, phone numbers, email, apartment viewing, rent, documents, doctor, or bank anchors.

### Quality gates added

- Candidate must remain `liveIntegration: false`.
- Candidate cannot claim final audio or final pronunciation scoring.
- Candidate cannot contain forbidden narrow anchors or corrupted copy.
- Every new word and first-seen construction needs explanation coverage.
- Wrong-answer policy must not invent unseen options.
- Exercise variety must include `micro_dialogue`, `missing_word`, `active_recall`, and `natural_choice`.
- Writes are restricted to `.codex-tmp` and `docs/reports`.

### Remaining gap

Day 5 is a candidate only. It still needs a reviewer/export gate, reviewer approval gate, and later an explicitly approved live bridge before becoming user-facing.

## Implementation update 2026-06-02 - P3.59 Gavan day 5 reviewer export gate

### Route chosen

P3.59 turns the day 5 candidate into a reviewer export, still non-live. This is the next required quality step before approval because the content needs a clear manual-review surface for phrases, explanation cards, and exercise blueprints.

### What changed

- Added `tools/personal_plan_gavan_week1_day5_reviewer_export.ts`.
- Added `tests/personal_plan_gavan_week1_day5_reviewer_export.test.ts`.
- Generated `.codex-tmp/personal-plans/gavan-week1-day5-reviewer-export.json`.
- Created `docs/reports/personal-plans-p359-gavan-day5-reviewer-export-2026-06-02.md`.
- Updated `.codex-tmp/codex-next-prompt.txt` to route the next step to P3.60.

### Quality gate added

- Every day 5 content unit is exported as a reviewer row.
- Every explanation card is exported as a reviewer row.
- Every exercise blueprint is exported as a reviewer row.
- All rows remain `needs_manual_review`.
- Exercise coverage requires `micro_dialogue`, `missing_word`, `active_recall`, and `natural_choice`.
- The export rejects forbidden anchors, corrupted copy, fake final audio, fake pronunciation scoring, and missing rows.
- The writer is restricted to `.codex-tmp` and `docs/reports`.

### Product meaning

Day 5 now has a reviewable editorial surface. This keeps the route from becoming another generated content dump: each phrase, teaching note, and exercise plan must be visible before approval.

### Remaining gap

Day 5 is reviewer-exported only. It still needs explicit reviewer approval and then a separate live bridge with release gates before it can become user-facing.

## Implementation update 2026-06-02 - P3.60 Gavan day 5 reviewer approval gate

### Route chosen

P3.60 closes the day 5 non-live review loop with explicit approval records and checksum protection. This is the right quality step after P3.59 because reviewer export rows must be approved row-by-row before any future bridge is considered.

### What changed

- Added `tools/personal_plan_gavan_week1_day5_reviewer_approval_gate.ts`.
- Added `tests/personal_plan_gavan_week1_day5_reviewer_approval_gate.test.ts`.
- Generated `.codex-tmp/personal-plans/gavan-week1-day5-approved-reviewer-export.json`.
- Created `docs/reports/personal-plans-p360-gavan-day5-reviewer-approval-gate-2026-06-02.md`.
- Updated `.codex-tmp/codex-next-prompt.txt` to route the next step to P3.61.

### Quality gate added

- Approval must cover all 16 day 5 reviewer rows.
- Approval metadata includes reviewer id, approval timestamp, row id, row kind, and visible-text checksum.
- Changed visible copy fails with `text_checksum_mismatch`.
- Partial approval, invalid metadata, forbidden anchors, fake final audio, and fake pronunciation scoring fail.
- The approved artifact remains `liveIntegration: false`.
- Writes are restricted to `.codex-tmp` and `docs/reports`.

### Product meaning

Day 5 is now review-approved as a controlled artifact. This means the day can move forward in the editorial pipeline without pretending it is ready for users.

### Remaining gap

Day 5 is approved only as a non-live artifact. It is not playable, not registered in production routes, and still requires a separate explicit live bridge task if the user wants to ship it.

## Implementation update 2026-06-03 - P3.61 Gavan day 6 blueprint candidate

### Route chosen

P3.61 converts the day 6 standards into a non-live candidate only. This keeps the week moving forward while preserving the candidate -> reviewer export -> approval -> explicit live bridge chain.

### What changed

- Added `tools/personal_plan_gavan_week1_day6_blueprint_candidate.ts`.
- Added `tests/personal_plan_gavan_week1_day6_blueprint_candidate.test.ts`.
- Generated `.codex-tmp/personal-plans/gavan-week1-day6-blueprint-candidate.json`.
- Created `docs/reports/personal-plans-p361-gavan-day6-blueprint-candidate-2026-06-03.md`.
- Updated `.codex-tmp/codex-next-prompt.txt` to route the next step to P3.62.

### Candidate phrase direction

- `Let me think for a second.`
- `That works for me.`
- `I'm not sure yet.`
- `Could we decide later?`

These phrases teach pausing, agreeing, uncertainty, and delaying a decision without using private identity data or narrow relocation chores.

### Quality gates added

- Candidate must remain `liveIntegration: false`.
- Candidate cannot claim final audio or final pronunciation scoring.
- Candidate cannot contain forbidden narrow anchors or corrupted copy.
- Every new word and first-seen construction needs explanation coverage.
- Wrong-answer policy must not invent unseen options.
- Exercise variety must include `active_recall`, `error_repair`, `pronunciation_shadow`, and `natural_choice`.
- Writes are restricted to `.codex-tmp` and `docs/reports`.

### Remaining gap

Day 6 is a candidate only. It still needs a reviewer/export gate, reviewer approval gate, and later an explicitly approved live bridge before becoming user-facing.

## Implementation update 2026-06-03 - P3.62 Gavan day 6 reviewer export gate

### Route chosen

P3.62 turns the day 6 candidate into a reviewer export, still non-live. This is the next required quality step before approval because the content needs a clear manual-review surface for phrases, explanation cards, and exercise blueprints.

### What changed

- Added `tools/personal_plan_gavan_week1_day6_reviewer_export.ts`.
- Added `tests/personal_plan_gavan_week1_day6_reviewer_export.test.ts`.
- Generated `.codex-tmp/personal-plans/gavan-week1-day6-reviewer-export.json`.
- Created `docs/reports/personal-plans-p362-gavan-day6-reviewer-export-2026-06-03.md`.
- Updated `.codex-tmp/codex-next-prompt.txt` to route the next step to P3.63.

### Quality gate added

- Every day 6 content unit is exported as a reviewer row.
- Every explanation card is exported as a reviewer row.
- Every exercise blueprint is exported as a reviewer row.
- All rows remain `needs_manual_review`.
- Exercise coverage requires `active_recall`, `error_repair`, `pronunciation_shadow`, and `natural_choice`.
- The export rejects forbidden anchors, corrupted copy, fake final audio, fake pronunciation scoring, and missing rows.
- The writer is restricted to `.codex-tmp` and `docs/reports`.

### Product meaning

Day 6 now has a reviewable editorial surface. This is especially useful because day 6 contains `error_repair` and `pronunciation_shadow`; both must stay explicit future blueprints until final exercise copy, audio, and scoring exist.

### Remaining gap

Day 6 is reviewer-exported only. It still needs explicit reviewer approval and then a separate live bridge with release gates before it can become user-facing.

## Implementation update 2026-06-03 - P3.63 Gavan day 6 reviewer approval gate

### Route chosen

P3.63 approves the day 6 reviewer export as a non-live artifact only. This keeps the reset pipeline strict: generated candidate, reviewer export, explicit reviewer approval, then a separate live bridge only after approval.

### What changed

- Added `tools/personal_plan_gavan_week1_day6_reviewer_approval_gate.ts`.
- Added `tests/personal_plan_gavan_week1_day6_reviewer_approval_gate.test.ts`.
- Generated `.codex-tmp/personal-plans/gavan-week1-day6-approved-reviewer-export.json`.
- Created `docs/reports/personal-plans-p363-gavan-day6-reviewer-approval-gate-2026-06-03.md`.
- Updated `.codex-tmp/codex-next-prompt.txt` to route the next step to P3.64.

### Approval gate added

- Every content unit, explanation card, and exercise blueprint needs an explicit approval record.
- Each approval record carries reviewer id, approved timestamp, row id, row kind, and visible-text checksum.
- Changed copy fails with `text_checksum_mismatch`.
- Partial approval fails with `missing_approval_record`.
- Unknown rows, duplicate rows, missing reviewer id, invalid timestamps, and row kind mismatches fail.
- Reviewer exports with forbidden anchors, fake final audio, or fake pronunciation scoring fail.
- The approved artifact remains `liveIntegration: false`.
- Writes are restricted to `.codex-tmp` and `docs/reports`.

### Product meaning

Day 6 can now move forward as editorially locked source material without pretending it is playable. This protects the premium plan from silent copy drift while keeping audio, pronunciation, UI, and live route work as separate release tasks.

### Remaining gap

Day 6 is approved only as a non-live artifact. It is not registered in production routes, not playable, and still requires a separate explicit live bridge with quality gates before any user-facing release.

## Implementation update 2026-06-03 - P3.64 Gavan day 7 blueprint candidate

### Route chosen

P3.64 converts day 7 standards into a non-live candidate only. The route closes week 1 with review, confidence, and one simple next action instead of adding another narrow relocation chore.

### What changed

- Added `tools/personal_plan_gavan_week1_day7_blueprint_candidate.ts`.
- Added `tests/personal_plan_gavan_week1_day7_blueprint_candidate.test.ts`.
- Generated `.codex-tmp/personal-plans/gavan-week1-day7-blueprint-candidate.json`.
- Created `docs/reports/personal-plans-p364-gavan-day7-blueprint-candidate-2026-06-03.md`.
- Updated `.codex-tmp/codex-next-prompt.txt` to route the next step to P3.65.

### Candidate phrase direction

- `I need a moment.`
- `Could you say that again?`
- `What should I do next?`
- `I'll check and come back.`

These phrases review week 1 skills without asking for private identity data and without narrowing the plan into apartment, document, doctor, bank, phone, or email scenarios.

### Quality gates added

- Candidate must remain `liveIntegration: false`.
- Candidate cannot claim final audio or final pronunciation scoring.
- Candidate cannot contain forbidden narrow anchors, visible numbers, or corrupted copy.
- Every new word and first-seen construction needs explanation coverage.
- Wrong-answer policy must not invent unseen options.
- Exercise variety must include `active_recall`, `listening_choice`, `natural_choice`, and `micro_dialogue`.
- Writes are restricted to `.codex-tmp` and `docs/reports`.

### Remaining gap

Day 7 is a candidate only. It still needs reviewer/export, reviewer approval, and then a separately approved live bridge before it can become user-facing.

## Implementation update 2026-06-03 - P3.65 Gavan day 7 reviewer export gate

### Route chosen

P3.65 turns the day 7 candidate into a reviewer export, still non-live. This creates a manual-review surface for the week-closing phrases, explanation cards, and exercise blueprints before approval.

### What changed

- Added `tools/personal_plan_gavan_week1_day7_reviewer_export.ts`.
- Added `tests/personal_plan_gavan_week1_day7_reviewer_export.test.ts`.
- Generated `.codex-tmp/personal-plans/gavan-week1-day7-reviewer-export.json`.
- Created `docs/reports/personal-plans-p365-gavan-day7-reviewer-export-2026-06-03.md`.
- Updated `.codex-tmp/codex-next-prompt.txt` to route the next step to P3.66.

### Quality gate added

- Every day 7 content unit is exported as a reviewer row.
- Every explanation card is exported as a reviewer row.
- Every exercise blueprint is exported as a reviewer row.
- All rows remain `needs_manual_review`.
- Exercise coverage requires `active_recall`, `listening_choice`, `natural_choice`, and `micro_dialogue`.
- The export rejects missing rows, forbidden anchors, visible numbers, corrupted copy, fake final audio, and fake pronunciation scoring.
- The writer is restricted to `.codex-tmp` and `docs/reports`.

### Product meaning

Day 7 now has a reviewable editorial surface. This protects the week-closing lesson from becoming a generic quiz dump or silently drifting into narrow private-data scenarios.

### Remaining gap

Day 7 is reviewer-exported only. It still needs explicit reviewer approval and then a separate live bridge with release gates before it can become user-facing.

## Implementation update 2026-06-03 - P3.66 Gavan day 7 reviewer approval gate

### Route chosen

P3.66 approves the day 7 reviewer export as a non-live artifact only. This completes the candidate -> reviewer export -> approval chain for the week-closing day without making it playable.

### What changed

- Added `tools/personal_plan_gavan_week1_day7_reviewer_approval_gate.ts`.
- Added `tests/personal_plan_gavan_week1_day7_reviewer_approval_gate.test.ts`.
- Generated `.codex-tmp/personal-plans/gavan-week1-day7-approved-reviewer-export.json`.
- Created `docs/reports/personal-plans-p366-gavan-day7-reviewer-approval-gate-2026-06-03.md`.
- Updated `.codex-tmp/codex-next-prompt.txt` to route the next step to P3.67.

### Approval gate added

- Every content unit, explanation card, and exercise blueprint needs an explicit approval record.
- Each approval record carries reviewer id, approved timestamp, row id, row kind, and visible-text checksum.
- Changed copy fails with `text_checksum_mismatch`.
- Partial approval fails with `missing_approval_record`.
- Unknown rows, duplicate rows, missing reviewer id, invalid timestamps, and row kind mismatches fail.
- Reviewer exports with forbidden anchors, visible numbers, fake final audio, or fake pronunciation scoring fail.
- The approved artifact remains `liveIntegration: false`.
- Writes are restricted to `.codex-tmp` and `docs/reports`.

### Product meaning

Day 7 is now editorially locked as a non-live artifact. The full Gavan week 1 expansion can move toward a week-level readiness manifest instead of silently drifting into production files.

### Remaining gap

Day 7 is approved only as a non-live artifact. It is not registered in production routes, not playable, and still requires a separate explicit live bridge with release gates before any user-facing release.

## Implementation update 2026-06-03 - P3.67 Gavan week 1 approval/readiness manifest

### Route chosen

P3.67 aggregates the approved non-live artifacts for days 2-7 into a week-level readiness manifest. This is not a live bridge. It is a map of what is approved, what is still blocked, and why the week is not playable yet.

### What changed

- Added `tools/personal_plan_gavan_week1_approval_readiness_manifest.ts`.
- Added `tests/personal_plan_gavan_week1_approval_readiness_manifest.test.ts`.
- Generated `.codex-tmp/personal-plans/gavan-week1-approval-readiness-manifest.json`.
- Created `docs/reports/personal-plans-p367-gavan-week1-approval-readiness-manifest-2026-06-03.md`.
- Updated `.codex-tmp/codex-next-prompt.txt` to route the next step to P3.68.

### Readiness gate added

- Manifest covers days 2, 3, 4, 5, 6, and 7.
- Each day points to its approved reviewer export artifact.
- Each day summary includes content units, explanation cards, exercise blueprints, total approved rows, and `liveIntegration: false`.
- Week status is `approved_non_live_not_playable`.
- Release blockers are explicit: no final audio, no final pronunciation scoring, no live catalog route, no production quiz route, no UI route, and no cloud sync bridge.
- Writes are restricted to `.codex-tmp` and `docs/reports`.

### Product meaning

Gavan week 1 now has a single non-live readiness map. This makes the pipeline easier to reason about: content can be editorially approved while still honestly blocked from release.

### Remaining gap

The week is not playable. The next safe step is a non-live bridge diff/preflight plan, not direct edits to production files.

## Implementation update 2026-06-03 - P3.68 Gavan week 1 bridge diff/preflight plan

### Route chosen

P3.68 compares the approved non-live week 1 manifest against production-facing surfaces without applying any bridge. This is the safest next route because the content is approved, but the product still needs real catalog, quiz, UI, audio, pronunciation, and sync connections before users can touch it.

### What changed

- Added `tools/personal_plan_gavan_week1_bridge_diff_preflight_plan.ts`.
- Added `tests/personal_plan_gavan_week1_bridge_diff_preflight_plan.test.ts`.
- Generated `.codex-tmp/personal-plans/gavan-week1-bridge-diff-preflight-plan.json`.
- Created `docs/reports/personal-plans-p368-gavan-week1-bridge-diff-preflight-plan-2026-06-03.md`.
- Updated `.codex-tmp/codex-next-prompt.txt` to route the next step to P3.69.

### Preflight result

The approved week contains 6 approved non-live days and 98 approved rows. The bridge plan preserves every release blocker and marks these production surfaces as `missing_or_not_connected` until real routes are proven:

- catalog route;
- quiz route;
- UI route;
- audio pipeline;
- pronunciation scoring;
- cloud sync bridge.

### Product meaning

This moves Gavan week 1 from "approved content exists" to "we know exactly why it is not playable yet." That is the right premium-product posture: do not ship fake readiness, do not silently wire content into production, and do not lose the blockers that still matter for user trust.

### Remaining gap

The week is still not playable. P3.69 should define the explicit future live-bridge approval contract and acceptance criteria, still without editing production files unless live bridge approval is given.

## Implementation update 2026-06-03 - P3.69 Gavan week 1 future bridge approval contract

### Route chosen

P3.69 turns the P3.68 preflight into an approval contract. This is still non-live. The contract defines who must sign off, what each surface must prove, and why production edits remain blocked until a separate implementation task is opened.

### What changed

- Added `tools/personal_plan_gavan_week1_future_bridge_approval_contract.ts`.
- Added `tests/personal_plan_gavan_week1_future_bridge_approval_contract.test.ts`.
- Generated `.codex-tmp/personal-plans/gavan-week1-future-bridge-approval-contract.json`.
- Created `docs/reports/personal-plans-p369-gavan-week1-future-bridge-approval-contract-2026-06-03.md`.
- Updated `.codex-tmp/codex-next-prompt.txt` to route the next step to P3.70.

### Approval areas

- `catalog_route`: engineering release owner.
- `quiz_route`: learning engine owner.
- `ui_route`: product design owner.
- `audio_pipeline`: audio pipeline owner.
- `pronunciation_scoring`: pronunciation owner.
- `cloud_sync_bridge`: sync owner.
- `product_copy`: content quality owner.

Each area has concrete acceptance criteria. The current artifact has all signatures missing and all required production surfaces still not connected, so `canOpenLiveBridgeImplementationTask` is `false`.

### Product meaning

This is a release-governance step. It prevents the premium plan from becoming live just because approved content exists. The product can only move toward a live bridge after real routes, media, scoring, sync, UI, and copy approval are all visible.

### Remaining gap

The week is still not playable. P3.70 should build a future bridge guard report from this contract, still without production edits, and should keep the bridge blocked until all approval areas and surfaces are complete.

## Implementation update 2026-06-03 - P3.70 Gavan week 1 future bridge guard report

### Route chosen

P3.70 turns the approval contract into a blocked guard report. This still does not apply a live bridge. It makes the blocked state explicit by separating blockers into missing signatures, missing production surfaces, and preserved release blockers.

### What changed

- Added `tools/personal_plan_gavan_week1_future_bridge_guard_report.ts`.
- Added `tests/personal_plan_gavan_week1_future_bridge_guard_report.test.ts`.
- Generated `.codex-tmp/personal-plans/gavan-week1-future-bridge-guard-report.json`.
- Created `docs/reports/personal-plans-p370-gavan-week1-future-bridge-guard-report-2026-06-03.md`.
- Updated `.codex-tmp/codex-next-prompt.txt` to route the next step to P3.71.

### Guard result

The current report has 19 blockers:

- 7 missing approval signatures;
- 6 missing production surfaces;
- 6 preserved release blockers.

The report keeps `implementationTaskAllowed: false`, `sourceWritesUsed: false`, and `phaseWriteTargets: []`.

### Product meaning

This is the first week-level release stop-state that is readable by both product and engineering. It prevents a common failure mode: approved content silently becoming a broken premium feature because release blockers were spread across separate artifacts.

### Remaining gap

The week is still not playable. P3.71 should turn these blockers into an ordered non-live resolution roadmap, so future work can start resolving the safest production surfaces first without mutating production files accidentally.

## Implementation update 2026-06-03 - P3.71 Gavan week 1 blocker resolution roadmap

### Route chosen

P3.71 turns the P3.70 blocked guard report into a practical work order. This still does not apply a live bridge. The purpose is to prevent "just connect it" work: every unresolved blocker is mapped to a named package with dependencies, acceptance criteria, and a clear non-live state.

### What changed

- Added `tools/personal_plan_gavan_week1_blocker_resolution_roadmap.ts`.
- Added `tests/personal_plan_gavan_week1_blocker_resolution_roadmap.test.ts`.
- Generated `.codex-tmp/personal-plans/gavan-week1-blocker-resolution-roadmap.json`.
- Created `docs/reports/personal-plans-p371-gavan-week1-blocker-resolution-roadmap-2026-06-03.md`.
- Updated `.codex-tmp/codex-next-prompt.txt` to route the next step to P3.72.

### Work packages

The roadmap keeps all packages `not_started` and `liveEditsAllowed: false`:

- `product_copy_review`;
- `catalog_route_plan`;
- `quiz_route_plan`;
- `ui_route_plan`;
- `audio_pipeline_plan`;
- `pronunciation_policy_plan`;
- `cloud_sync_bridge_plan`;
- `final_release_approval`.

### Product meaning

This is the point where the plan system becomes manageable instead of vague. Gavan week 1 still is not playable, but now the blocked state has a release sequence: first prove the copy is acceptable, then plan catalog/quiz routes, then UI, media, pronunciation, sync, and only then open a live bridge task.

### Remaining gap

P3.72 should build the non-live product copy approval packet first. That packet should decide whether the approved week text is broad, social, non-robotic, and safe enough to become the copy baseline before any production route work begins.

## Implementation update 2026-06-03 - P3.72 Gavan week 1 product copy approval packet

### Route chosen

P3.72 audits the approved Gavan week 1 day artifacts through the first P3.71 work package: `product_copy_review`. This still does not apply a live bridge and does not sign the content. It only creates a non-live evidence packet for the future content-quality owner approval.

### What changed

- Added `tools/personal_plan_gavan_week1_product_copy_approval_packet.ts`.
- Added `tests/personal_plan_gavan_week1_product_copy_approval_packet.test.ts`.
- Generated `.codex-tmp/personal-plans/gavan-week1-product-copy-approval-packet.json`.
- Created `docs/reports/personal-plans-p372-gavan-week1-product-copy-approval-packet-2026-06-03.md`.
- Updated `.codex-tmp/codex-next-prompt.txt` to route the next step to P3.73.

### Copy gate result

The packet checks:

- broad social usefulness;
- no narrow name, phone, email, or apartment anchors;
- no developer or robotic wording;
- no fake "selected answer" explanations;
- wrong-answer-safe explanation cards;
- no forbidden user-facing `scene`, `scenario`, or `route` wording;
- explanation coverage for new words and constructions.

Current approved days 2-7 pass these copy checks:

- 6 days checked;
- 6 days passing;
- 0 copy issues.

The packet still keeps `signatureStatus: missing` and `approvalReady: false`, because the required `content_quality_owner` signature has not been provided.

### Product meaning

This is a good sign for content quality, but it is not release readiness. The product can now say: "the approved week copy passed the automated product copy packet, but we still need an explicit content-quality signature before route planning can be treated as unblocked."

### Remaining gap

P3.73 should prepare a non-live product copy signature request packet. It should not sign anything itself. It should make the evidence easy to inspect and keep catalog route planning blocked until the signature is present.

## Implementation update 2026-06-03 - P3.73 Gavan week 1 product copy signature request packet

### Route chosen

P3.73 turns the P3.72 copy evidence into a signature request packet. This still does not sign the content and does not unblock catalog route planning. It only proves that the request is ready to send to the `content_quality_owner`.

### What changed

- Added `tools/personal_plan_gavan_week1_product_copy_signature_request_packet.ts`.
- Added `tests/personal_plan_gavan_week1_product_copy_signature_request_packet.test.ts`.
- Generated `.codex-tmp/personal-plans/gavan-week1-product-copy-signature-request-packet.json`.
- Created `docs/reports/personal-plans-p373-gavan-week1-product-copy-signature-request-packet-2026-06-03.md`.
- Updated `.codex-tmp/codex-next-prompt.txt` to route the next step to P3.74.

### Request result

The request packet shows:

- `readyToRequestSignature: true`;
- `signatureStatus: missing`;
- `signatureMayBeInferred: false`;
- `catalogRoutePlanningBlocked: true`;
- blocker still open: `missing_signature:product_copy`;
- required owner role: `content_quality_owner`.

### Product meaning

This is the clean handoff point between automated quality checks and human/product approval. The system can now say: "copy evidence is ready for signature," while still refusing to pretend that approval has happened.

### Remaining gap

P3.74 should build a non-live catalog route preflight that reads this signature request and stays blocked by the missing product-copy signature. That lets route planning become explicit without accidentally opening a production bridge.

## Implementation update 2026-06-03 - P3.74 Gavan week 1 catalog route preflight

### Route chosen

P3.74 builds the first catalog-facing preflight for Gavan week 1, but keeps it blocked by `missing_signature:product_copy`. This still does not edit the production catalog and does not register any routes.

### What changed

- Added `tools/personal_plan_gavan_week1_catalog_route_preflight.ts`.
- Added `tests/personal_plan_gavan_week1_catalog_route_preflight.test.ts`.
- Generated `.codex-tmp/personal-plans/gavan-week1-catalog-route-preflight.json`.
- Created `docs/reports/personal-plans-p374-gavan-week1-catalog-route-preflight-2026-06-03.md`.
- Updated `.codex-tmp/codex-next-prompt.txt` to route the next step to P3.75.

### Preflight result

The preflight lists six proposed day routes from the approved manifest:

- days 2-7;
- 98 total approved rows;
- every route is `blocked_not_registered`;
- every route keeps `productionRouteRegistered: false`;
- every route keeps `playable: false`.

The catalog route remains blocked:

- `catalogRoutePlanningBlocked: true`;
- `canOpenCatalogRouteTask: false`;
- blocker: `missing_signature:product_copy`.

### Product meaning

This makes the future catalog route concrete without lying about release state. The system knows exactly which approved day artifacts would be routed, but it refuses to treat them as playable while the product-copy signature is missing.

### Remaining gap

P3.75 should inspect the catalog source in read-only mode and build a catalog source inventory for the future route. That can identify the safest integration shape without editing `app/personal_plan_catalog.ts`.

## Implementation update 2026-06-03 - P3.75 Gavan week 1 catalog source inventory

### Route chosen

P3.75 inspects the production catalog source as text only and creates a blocked inventory for the future Gavan week 1 route. It still does not edit `app/personal_plan_catalog.ts`, does not register routes, and does not make the approved days playable.

### What changed

- Added `tools/personal_plan_gavan_week1_catalog_source_inventory.ts`.
- Added `tests/personal_plan_gavan_week1_catalog_source_inventory.test.ts`.
- Generated `.codex-tmp/personal-plans/gavan-week1-catalog-source-inventory.json`.
- Created `docs/reports/personal-plans-p375-gavan-week1-catalog-source-inventory-2026-06-03.md`.
- Updated `.codex-tmp/codex-next-prompt.txt` to route the next step to P3.76.

### Inventory result

The inventory confirms:

- status is `catalog_source_inventory_blocked_not_applied`;
- `catalogRoutePlanningBlocked: true`;
- `canOpenCatalogRouteTask: false`;
- blocker remains `missing_signature:product_copy`;
- `sourceWritesUsed: false`;
- `phaseWriteTargets: []`;
- `catalogSourceEdited: false`.

Catalog source findings:

- the Gavan plan definition is present;
- the generated day factory is present;
- the minute-load helper is present;
- the catalog export surface is present;
- day and task destination models are present;
- the six proposed approved week 1 day ids are missing from the current source;
- the current catalog source does not contain broken encoding markers.

### Product meaning

This turns the next live-catalog problem into an explicit adapter problem. The project now knows the future route cannot simply be assumed: the approved day ids are not present in the catalog, and the current Gavan plan still uses generated scaffold days. That is useful, but still blocked until product-copy signature approval exists.

### Remaining gap

P3.76 should build a non-live catalog adapter design from this inventory. It should define the future route shape and compatibility risks without editing production files or opening the route.

## Implementation update 2026-06-03 - P3.76 Gavan week 1 catalog adapter design

### Route chosen

P3.76 turns the P3.75 catalog source inventory into a non-live adapter design. It does not edit the catalog, does not register routes, and does not make approved days playable. The design exists to make the future live task precise after signature approval.

### What changed

- Added `tools/personal_plan_gavan_week1_catalog_adapter_design.ts`.
- Added `tests/personal_plan_gavan_week1_catalog_adapter_design.test.ts`.
- Generated `.codex-tmp/personal-plans/gavan-week1-catalog-adapter-design.json`.
- Created `docs/reports/personal-plans-p376-gavan-week1-catalog-adapter-design-2026-06-03.md`.
- Updated `.codex-tmp/codex-next-prompt.txt` to route the next step to P3.77.

### Adapter design result

The design keeps:

- status `catalog_adapter_design_blocked_not_applied`;
- `catalogRoutePlanningBlocked: true`;
- `canOpenCatalogRouteTask: false`;
- `routeRegistrationAllowed: false`;
- blocker `missing_signature:product_copy`;
- `sourceWritesUsed: false`;
- `phaseWriteTargets: []`;
- `catalogSourceEdited: false`.

The six approved week 1 day mappings are described as future actions only:

- every day id is currently `missing`;
- every future route action is `replace_scaffold_day_after_signature`;
- every mapping is `not_allowed_until_signature`;
- every mapping keeps `productionRouteRegistered: false`;
- every mapping keeps `playable: false`.

### Compatibility risks captured

- Current generated scaffold must not disappear silently.
- 5, 10, 15, and 20 minute loads must keep working.
- Task destinations must still open existing lessons, quizzes, or plan exercises correctly.
- Existing self-guided and old generated catalog paths need regression coverage.

### Product meaning

This is the right middle step between "we know the catalog shape" and "we edit the catalog." The live work is now describable without being allowed. That keeps the premium plan pipeline honest and prevents accidental route activation before content-quality signature approval.

### Remaining gap

P3.77 should inspect quiz route/source shape in read-only mode. The future plan will need dedicated quiz routes, but they must stay non-live and blocked until product-copy signature and route approval exist.

## Implementation update 2026-06-03 - P3.77 Gavan week 1 quiz source inventory

### Route chosen

P3.77 inspects the production quiz source as text only and creates a blocked inventory for future Gavan week 1 quiz routes. It does not edit `app/personal_plan_quizzes.ts`, does not register quiz routes, and does not make any quiz playable.

### What changed

- Added `tools/personal_plan_gavan_week1_quiz_source_inventory.ts`.
- Added `tests/personal_plan_gavan_week1_quiz_source_inventory.test.ts`.
- Generated `.codex-tmp/personal-plans/gavan-week1-quiz-source-inventory.json`.
- Created `docs/reports/personal-plans-p377-gavan-week1-quiz-source-inventory-2026-06-03.md`.
- Updated `.codex-tmp/codex-next-prompt.txt` to route the next step to P3.78.

### Inventory result

The inventory keeps:

- status `quiz_source_inventory_blocked_not_applied`;
- blocker `missing_signature:product_copy`;
- `routeRegistrationAllowed: false`;
- `quizRouteRegistrationAllowed: false`;
- `sourceWritesUsed: false`;
- `phaseWriteTargets: []`;
- `quizSourceEdited: false`.

Quiz source findings:

- future dedicated quiz ids `gavan-week1-day2-quiz` through `gavan-week1-day7-quiz` are missing;
- quiz factory, registry, coverage registry, task copy registry, and getter surfaces are present;
- legacy `gavan_day1_identity` and `gavan_day2_address` exceptions are present;
- legacy exceptions must not become the new Gavan week 1 quiz route;
- each future day quiz must be a dedicated 10-question quiz after approval.

### Product meaning

This prevents the plan pipeline from pretending day quizzes already exist. It also catches a real risk: old Gavan quiz exceptions are still in the source and should not be reused for the reset week. The new week needs its own dedicated quiz ids and 10-question quiz contracts.

### Remaining gap

P3.78 should turn this inventory into a non-live quiz adapter design. It should define the future per-day quiz route shape and copy/coverage requirements without editing production files.

## Implementation update 2026-06-03 - P3.78 Gavan week 1 quiz adapter design

### Route chosen

P3.78 turns the P3.77 quiz source inventory into a non-live quiz adapter design. It does not edit `app/personal_plan_quizzes.ts`, does not register quiz routes, and does not create quiz content yet. It defines the future contract that live quiz routes must satisfy after approval.

### What changed

- Added `tools/personal_plan_gavan_week1_quiz_adapter_design.ts`.
- Added `tests/personal_plan_gavan_week1_quiz_adapter_design.test.ts`.
- Generated `.codex-tmp/personal-plans/gavan-week1-quiz-adapter-design.json`.
- Created `docs/reports/personal-plans-p378-gavan-week1-quiz-adapter-design-2026-06-03.md`.
- Updated `.codex-tmp/codex-next-prompt.txt` to route the next step to P3.79.

### Adapter design result

The design keeps:

- status `quiz_adapter_design_blocked_not_applied`;
- blocker `missing_signature:product_copy`;
- `routeRegistrationAllowed: false`;
- `quizRouteRegistrationAllowed: false`;
- `sourceWritesUsed: false`;
- `phaseWriteTargets: []`;
- `quizSourceEdited: false`.

The future quiz contract now requires:

- six per-day quiz route designs;
- one dedicated quiz id per day;
- exactly 10 questions per quiz;
- coverage links to approved day phrases;
- task copy for `choice` and `typing` modes;
- copy language slots for `ru`, `uk`, and `es`;
- legacy `gavan_day1_identity` and `gavan_day2_address` exceptions isolated from the new route;
- every live acceptance criterion blocked until signature approval.

### Product meaning

The future quiz system is now shaped as a premium-grade route contract rather than a quick source patch. This matters because the plan should not reuse stale quiz exceptions or generic leftovers. Each day needs its own quiz, coverage, and task copy.

### Remaining gap

P3.79 should inspect UI route/source surfaces in read-only mode. The plan still needs a future entrypoint from the user-facing task flow, but that must stay non-live until signature and route approval exist.

## Implementation update 2026-06-03 - P3.79 Gavan week 1 UI route source inventory

### Route chosen

P3.79 inspects existing UI route source surfaces as text only. It does not edit Home, onboarding, Premium, lesson, quiz, or plan screens. It creates a blocked source inventory for the future user-facing route adapter.

### What changed

- Added `tools/personal_plan_gavan_week1_ui_route_source_inventory.ts`.
- Added `tests/personal_plan_gavan_week1_ui_route_source_inventory.test.ts`.
- Generated `.codex-tmp/personal-plans/gavan-week1-ui-route-source-inventory.json`.
- Created `docs/reports/personal-plans-p379-gavan-week1-ui-route-source-inventory-2026-06-03.md`.
- Updated `.codex-tmp/codex-next-prompt.txt` to route the next step to P3.80.

### Inventory result

The inventory keeps:

- status `ui_route_source_inventory_blocked_not_applied`;
- blocker `missing_signature:product_copy`;
- `routeRegistrationAllowed: false`;
- `uiRouteRegistrationAllowed: false`;
- `liveEditsAllowed: false`;
- `sourceWritesUsed: false`;
- `phaseWriteTargets: []`;
- `uiSourceEdited: false`.

Detected UI surfaces:

- Home route card;
- plan screen;
- task open helper;
- day open actions;
- task surface entrypoint;
- task surface bundle;
- task surface API.

Detected route abilities:

- open plan screen;
- open development plan screen;
- open lesson menu;
- open plan phrase lesson;
- open quiz screen with plan quiz id;
- open plan renderer;
- open lesson shell.

### Product meaning

The future UI route can now be designed from actual source surfaces instead of guesses. This is still intentionally blocked: the plan should not become live until copy, route, and quality gates agree.

### Remaining gap

P3.80 should turn this source inventory into a non-live UI route adapter design. It should describe the future opening contract for lessons, quizzes, and plan renderers while preserving Home, onboarding, Premium, and self-guided paths.

## Implementation update 2026-06-03 - P3.80 Gavan week 1 UI route adapter design

### Route chosen

P3.80 turns the P3.79 UI route source inventory into a non-live adapter design. It does not edit UI, register routes, open a live bridge, or make plan tasks playable.

### What changed

- Added `tools/personal_plan_gavan_week1_ui_route_adapter_design.ts`.
- Added `tests/personal_plan_gavan_week1_ui_route_adapter_design.test.ts`.
- Generated `.codex-tmp/personal-plans/gavan-week1-ui-route-adapter-design.json`.
- Created `docs/reports/personal-plans-p380-gavan-week1-ui-route-adapter-design-2026-06-03.md`.
- Updated `.codex-tmp/codex-next-prompt.txt` to route the next step to P3.81.

### Adapter design result

The design keeps:

- status `ui_route_adapter_design_blocked_not_applied`;
- blocker `missing_signature:product_copy`;
- `sourceWritesUsed: false`;
- `phaseWriteTargets: []`;
- `uiSourceEdited: false`;
- `routeRegistrationAllowed: false`;
- `uiRouteRegistrationAllowed: false`;
- `liveEditsAllowed: false`.

Future opening contracts:

- lesson task opening;
- plan phrase task opening;
- dedicated quiz task opening;
- plan renderer task opening;
- lesson shell task opening.

Regression gates:

- Home entrypoint preserved;
- onboarding flow preserved;
- Premium flow preserved;
- self-guided lessons preserved;
- self-guided quizzes preserved;
- plan task carryover preserved;
- completed-day state preserved.

### Product meaning

The future UI route is now a product contract instead of a UI patch. That matters because the plan feature must open the right thing from the right task type without breaking old app paths.

### Remaining gap

P3.81 should aggregate catalog, quiz, and UI adapter designs into one live-route readiness gate. It should prove that the contracts agree and keep the whole route blocked until signature approval exists.

## Implementation update 2026-06-03 - P3.81 Gavan week 1 aggregate route readiness gate

### Route chosen

P3.81 combines catalog, quiz, and UI adapter designs into one aggregate readiness gate. It does not edit production files, register routes, or make anything playable.

### What changed

- Added `tools/personal_plan_gavan_week1_aggregate_route_readiness_gate.ts`.
- Added `tests/personal_plan_gavan_week1_aggregate_route_readiness_gate.test.ts`.
- Generated `.codex-tmp/personal-plans/gavan-week1-aggregate-route-readiness-gate.json`.
- Created `docs/reports/personal-plans-p381-gavan-week1-aggregate-route-readiness-gate-2026-06-03.md`.
- Updated `.codex-tmp/codex-next-prompt.txt` to route the next step to P3.82.

### Gate result

The gate keeps:

- status `aggregate_route_readiness_blocked_not_applied`;
- blocker `missing_signature:product_copy`;
- `readyForLive: false`;
- `sourceWritesUsed: false`;
- `phaseWriteTargets: []`;
- `liveEditsAllowed: false`;
- all route registration flags false.

Readiness matrix:

- catalog: 6 day mappings, 6 blocked, 0 registered, 0 playable;
- quiz: 6 quiz designs, 6 ten-question quizzes, 0 registered, 0 playable;
- UI: 5 opening contracts, 5 covered, 7 regression gates, all blocked.

### Product meaning

The route pipeline now has a single source of truth for "not ready yet, but structurally aligned." This prevents a future live task from enabling only catalog, only quiz, or only UI work while the other pieces lag behind.

### Remaining gap

P3.82 should build a route signature request packet from this aggregate gate. It should package the exact evidence a human reviewer needs while keeping the system blocked until approval is explicit.

## Implementation update 2026-06-03 - P3.82 Gavan week 1 route signature request packet

### Route chosen

P3.82 turns the aggregate readiness gate into an unsigned route signature request packet. It does not approve, register, or enable any route.

### What changed

- Added `tools/personal_plan_gavan_week1_route_signature_request_packet.ts`.
- Added `tests/personal_plan_gavan_week1_route_signature_request_packet.test.ts`.
- Generated `.codex-tmp/personal-plans/gavan-week1-route-signature-request-packet.json`.
- Created `docs/reports/personal-plans-p382-gavan-week1-route-signature-request-packet-2026-06-03.md`.
- Updated `.codex-tmp/codex-next-prompt.txt` to route the next step to P3.83.

### Request packet result

The request keeps:

- status `route_signature_request_blocked_not_signed`;
- blocker `missing_signature:product_copy`;
- `signatureStatus: missing`;
- `readyForLive: false`;
- `sourceWritesUsed: false`;
- `phaseWriteTargets: []`;
- `liveEditsAllowed: false`;
- all route registration flags false;
- `signatureMayBeInferred: false`.

The request gives the reviewer:

- catalog summary;
- quiz summary;
- UI summary;
- regression summary;
- route blockers;
- live acceptance criteria;
- exact evidence file paths;
- a required reviewer decision field that remains `approved: false`.

### Product meaning

This creates a clean handoff point for human approval. The system can now ask for a route signature without pretending the signature exists.

### Remaining gap

P3.83 should build a route approval packet guard. It should validate the unsigned request and define the signed approval shape, but still refuse to approve anything unless explicit reviewer metadata is supplied.

## Implementation update 2026-06-03 - P3.83 Gavan week 1 route approval guard

### Route chosen

P3.83 builds a guard for future route approval. It defines the required signed approval metadata shape but does not approve routes, register routes, or edit production files.

### What changed

- Added `tools/personal_plan_gavan_week1_route_approval_guard.ts`.
- Added `tests/personal_plan_gavan_week1_route_approval_guard.test.ts`.
- Generated `.codex-tmp/personal-plans/gavan-week1-route-approval-guard.json`.
- Created `docs/reports/personal-plans-p383-gavan-week1-route-approval-guard-2026-06-03.md`.
- Updated `.codex-tmp/codex-next-prompt.txt` to route the next step to P3.84.

### Guard result

The guard keeps:

- status `route_approval_guard_blocked_unsigned`;
- blocker `missing_signature:product_copy`;
- `approved: false`;
- `readyForLive: false`;
- `signatureStatus: missing`;
- `sourceWritesUsed: false`;
- `phaseWriteTargets: []`;
- `liveEditsAllowed: false`;
- all route registration flags false;
- `approvalMayBeInferred: false`;
- `signedApprovalAcceptedInThisPass: false`.

The guard defines required signed metadata:

- reviewer name;
- reviewer role `route_quality_owner`;
- ISO approval timestamp;
- approval scope `full_route_bundle`;
- all four evidence file paths;
- full regression scope;
- decision text.

### Product meaning

The plan route pipeline now has a clear approval boundary. A future live task cannot claim "reviewed" unless a separate explicit signature artifact covers the entire route bundle.

### Remaining gap

P3.84 should build a live-route implementation preflight from this unsigned guard. It should describe what production files would be touched after approval while keeping the current pass blocked.

## Implementation update 2026-06-03 - P3.84 Gavan week 1 live route implementation preflight

### Route chosen

P3.84 builds the final dry-run preflight before any live route implementation. It reads the unsigned approval guard, lists the production touchpoints that would matter after approval, and keeps every source edit blocked.

### What changed

- Added `tools/personal_plan_gavan_week1_live_route_implementation_preflight.ts`.
- Added `tests/personal_plan_gavan_week1_live_route_implementation_preflight.test.ts`.
- Generated `.codex-tmp/personal-plans/gavan-week1-live-route-implementation-preflight.json`.
- Created `docs/reports/personal-plans-p384-gavan-week1-live-route-implementation-preflight-2026-06-03.md`.
- Updated `.codex-tmp/codex-next-prompt.txt` to route the next step to P3.85 content authoring seed.

### Preflight result

The preflight keeps:

- status `live_route_preflight_blocked_unsigned`;
- blocker `missing_signature:product_copy`;
- `approved: false`;
- `readyForLive: false`;
- `sourceWritesUsed: false`;
- `phaseWriteTargets: []`;
- `liveEditsAllowed: false`;
- all route registration flags false.

It lists four future live source areas without editing them:

- catalog week 1 day registration;
- dedicated day quiz registration;
- plan task opening helper;
- day open actions.

It also lists the regression suites and emulator checks that would be mandatory after signed approval.

### Product meaning

This closes the route-planning safety loop. The system now knows exactly what would need implementation later, but it cannot drift into production source without explicit approval and fresh regression evidence.

### Remaining gap

P3.85 should stop adding approval gates and start the reset content authoring seed for Gavan week 1. The next pass should create broad, socially safe, non-narrow materials as artifacts only, with no route registration and no production edits.

## Implementation update 2026-06-03 - P3.85 Gavan week 1 content authoring seed

### Route chosen

P3.85 starts materials after the reset, but keeps them as non-live artifacts. The purpose is to replace the old narrow direction with a broad week seed before writing any production content.

### What changed

- Added `tools/personal_plan_gavan_week1_content_authoring_seed.ts`.
- Added `tests/personal_plan_gavan_week1_content_authoring_seed.test.ts`.
- Generated `.codex-tmp/personal-plans/gavan-week1-content-authoring-seed.json`.
- Created `docs/reports/personal-plans-p385-gavan-week1-content-authoring-seed-2026-06-03.md`.
- Updated `.codex-tmp/codex-next-prompt.txt` to route the next step to P3.86.

### Seed result

The seed keeps:

- status `content_authoring_seed_not_live`;
- `liveIntegration: false`;
- `sourceWritesUsed: false`;
- `phaseWriteTargets: []`.

The seed includes:

- exactly 7 days;
- 28 broad everyday phrase candidates;
- 5/10/15/20 minute load contracts for every day;
- lesson bridge, exercise blocks, phrase bank, explanation cards, quiz intent, recall plan, and honest media claims for every day;
- varied exercise formats across the week;
- a reset policy that treats old narrow artifacts as non-canonical evidence.

### Product meaning

This is the first actual materials step after the reset. It moves away from narrow identity or apartment-style anchors and toward a week that teaches broadly useful communication: say where you are, ask to repeat, ask for help, check understanding, ask for simpler wording, answer briefly, and combine the week.

### Remaining gap

P3.86 should build a concrete day 1 exercise material candidate from this seed. It should still stay non-live, but it should move from weekly seed into the actual exercise material shape for the first day.

## Implementation update 2026-06-03 - P3.86 Gavan week 1 day 1 material candidate

### Route chosen

P3.86 turns the reset week seed into a concrete day 1 material candidate. This is still not live and does not register routes or quizzes.

### What changed

- Added `tools/personal_plan_gavan_week1_day1_material_candidate.ts`.
- Added `tests/personal_plan_gavan_week1_day1_material_candidate.test.ts`.
- Generated `.codex-tmp/personal-plans/gavan-week1-day1-material-candidate.json`.
- Created `docs/reports/personal-plans-p386-gavan-week1-day1-material-candidate-2026-06-03.md`.
- Updated `.codex-tmp/codex-next-prompt.txt` to route the next step to P3.87.

### Material result

The candidate keeps:

- status `day1_material_candidate_not_live`;
- source seed status `content_authoring_seed_not_live`;
- `liveIntegration: false`;
- `sourceWritesUsed: false`;
- `phaseWriteTargets: []`.

The candidate includes:

- lesson bridge block;
- phrase build block;
- natural choice block;
- active recall block;
- day quiz intent block;
- word tiles with target token counts;
- safe distractor tiles;
- after-answer explanations;
- active recall without correct-word highlighting or hints;
- 10 planned quiz question blueprints, not written or registered.

### Product meaning

This is the first concrete material shape for the reset plan. It moves from "week idea" to "what the user would actually do on day 1" while preserving the no-production safety boundary.

### Remaining gap

P3.87 should build a day 1 material quality/export packet. The day 1 shape should be reviewed before using it as a template for day 2 and the rest of the week.

## Implementation update 2026-06-03 - P3.87 Gavan week 1 day 1 material export packet

### Route chosen

P3.87 reviews the day 1 material shape before expanding it to day 2. It builds a compact reviewer packet and quality gate result from the P3.86 candidate.

### What changed

- Added `tools/personal_plan_gavan_week1_day1_material_export_packet.ts`.
- Added `tests/personal_plan_gavan_week1_day1_material_export_packet.test.ts`.
- Generated `.codex-tmp/personal-plans/gavan-week1-day1-material-export-packet.json`.
- Created `docs/reports/personal-plans-p387-gavan-week1-day1-material-export-packet-2026-06-03.md`.
- Updated `.codex-tmp/codex-next-prompt.txt` to route the next step to P3.88.

### Export result

The packet keeps:

- status `day1_material_export_not_live`;
- source candidate status `day1_material_candidate_not_live`;
- `exportApproved: false`;
- `liveIntegration: false`;
- `sourceWritesUsed: false`;
- `phaseWriteTargets: []`.

The packet includes:

- reviewer summary;
- compact day 1 preview;
- quality gates for broadness, word tile counts, distractor safety, explanation coverage, no recall highlighting, quiz count, media honesty, and no production writes.

### Product meaning

This creates a fast review surface for day 1. The team can now inspect the first concrete material shape without digging through the full candidate JSON.

### Remaining gap

P3.88 should build the day 2 material candidate using the reviewed day 1 shape. Day 2 should stay broad and focus on calm repetition/understanding rather than personal data.

## Implementation update 2026-06-03 - P3.88 Gavan week 1 day 2 material candidate

### Route chosen

P3.88 expands the reviewed day 1 material shape into a concrete day 2 material candidate. The pass stays non-live and focuses on calm repetition and understanding: asking someone to repeat, slow down, or say something again.

### What changed

- Added `tools/personal_plan_gavan_week1_day2_material_candidate.ts`.
- Added `tests/personal_plan_gavan_week1_day2_material_candidate.test.ts`.
- Generated `.codex-tmp/personal-plans/gavan-week1-day2-material-candidate.json`.
- Created `docs/reports/personal-plans-p388-gavan-week1-day2-material-candidate-2026-06-03.md`.
- Updated `.codex-tmp/codex-next-prompt.txt` to route the next step to P3.89.

### Material result

The candidate keeps:

- status `day2_material_candidate_not_live`;
- source seed status `content_authoring_seed_not_live`;
- source day 1 export status `day1_material_export_not_live`;
- `liveIntegration: false`;
- `sourceWritesUsed: false`;
- `phaseWriteTargets: []`.

The candidate includes:

- lesson bridge block;
- listening choice block with placeholders only;
- active recall block;
- phrase build block;
- day quiz intent block;
- word tiles with exact target token counts;
- safe distractor tiles;
- after-answer explanations;
- active recall without correct-word highlighting or hints;
- 10 planned quiz question blueprints, not written or registered;
- honest media state: no generated audio and no pronunciation scoring.

### Product meaning

This is the first reset material pass that includes listening preparation without pretending audio exists. It keeps the learner-facing idea broad and useful: "I missed that, please repeat or slow down" instead of narrow personal-data tasks.

### Remaining gap

P3.89 should build a day 2 material export/quality packet. Day 2 should be reviewed before day 3 starts, especially for listening placeholder quality, explanation clarity, recall safety, and quiz intent.

## Implementation update 2026-06-03 - P3.89 Gavan week 1 day 2 material export packet

### Route chosen

P3.89 reviews the day 2 material candidate before moving to day 3. It creates a compact quality/export packet with a listening-specific honesty gate because day 2 introduced audio placeholders.

### What changed

- Added `tools/personal_plan_gavan_week1_day2_material_export_packet.ts`.
- Added `tests/personal_plan_gavan_week1_day2_material_export_packet.test.ts`.
- Generated `.codex-tmp/personal-plans/gavan-week1-day2-material-export-packet.json`.
- Created `docs/reports/personal-plans-p389-gavan-week1-day2-material-export-packet-2026-06-03.md`.
- Updated `.codex-tmp/codex-next-prompt.txt` to route the next step to P3.90.

### Export result

The packet keeps:

- status `day2_material_export_not_live`;
- source candidate status `day2_material_candidate_not_live`;
- `exportApproved: false`;
- `liveIntegration: false`;
- `sourceWritesUsed: false`;
- `phaseWriteTargets: []`.

The packet includes:

- reviewer summary;
- compact day 2 preview;
- quality gates for broadness, word tile counts, distractor safety, explanation coverage, listening placeholder honesty, no recall highlighting, quiz count, media honesty, and no production writes.

### Product meaning

This makes the first listening-oriented reset day inspectable without turning placeholders into fake assets. It preserves the product promise: if audio is not generated, the system says so clearly.

### Remaining gap

P3.90 should build the day 3 material candidate using the reviewed day 2 export shape. Day 3 should introduce a different exercise rhythm and stay broad, not narrow.

## Implementation update 2026-06-03 - P3.90 Gavan week 1 day 3 material candidate

### Route chosen

P3.90 turns the reviewed day 2 export shape into a concrete day 3 material candidate. The day introduces a different rhythm from day 2 by adding missing-word practice around broad `I need...` phrases.

### What changed

- Added `tools/personal_plan_gavan_week1_day3_material_candidate.ts`.
- Added `tests/personal_plan_gavan_week1_day3_material_candidate.test.ts`.
- Generated `.codex-tmp/personal-plans/gavan-week1-day3-material-candidate.json`.
- Created `docs/reports/personal-plans-p390-gavan-week1-day3-material-candidate-2026-06-03.md`.
- Updated `.codex-tmp/codex-next-prompt.txt` to route the next step to P3.91.

### Material result

The candidate keeps:

- status `day3_material_candidate_not_live`;
- source seed status `content_authoring_seed_not_live`;
- source day 2 export status `day2_material_export_not_live`;
- `liveIntegration: false`;
- `sourceWritesUsed: false`;
- `phaseWriteTargets: []`.

The candidate includes:

- lesson bridge block;
- phrase build block;
- missing word block;
- active recall block;
- day quiz intent block;
- word tiles with exact target token counts;
- missing-word slots with one blank;
- safe distractor tiles;
- after-answer explanations;
- active recall without correct-word highlighting or hints;
- 10 planned quiz question blueprints, not written or registered;
- honest media state: no generated audio and no pronunciation scoring.

### Product meaning

Day 3 moves the week from "ask to repeat" into "say what you need" without falling back into narrow identity or apartment tasks. The missing-word mode gives variety and starts testing key words rather than only full phrase assembly.

### Remaining gap

P3.91 should build a day 3 material export/quality packet before day 4 starts.

## Implementation update 2026-06-03 - P3.91 Gavan week 1 day 3 material export packet

### Route chosen

P3.91 reviews the day 3 material candidate before moving to day 4. It creates a compact quality/export packet with a missing-word-specific gate because day 3 introduced blank-slot practice.

### What changed

- Added `tools/personal_plan_gavan_week1_day3_material_export_packet.ts`.
- Added `tests/personal_plan_gavan_week1_day3_material_export_packet.test.ts`.
- Generated `.codex-tmp/personal-plans/gavan-week1-day3-material-export-packet.json`.
- Created `docs/reports/personal-plans-p391-gavan-week1-day3-material-export-packet-2026-06-03.md`.
- Updated `.codex-tmp/codex-next-prompt.txt` to route the next step to P3.92.

### Export result

The packet keeps:

- status `day3_material_export_not_live`;
- source candidate status `day3_material_candidate_not_live`;
- `exportApproved: false`;
- `liveIntegration: false`;
- `sourceWritesUsed: false`;
- `phaseWriteTargets: []`.

The packet includes:

- reviewer summary;
- compact day 3 preview;
- quality gates for broadness, word tile counts, distractor safety, explanation coverage, missing-word slot quality, no recall highlighting, quiz count, media honesty, and no production writes.

### Product meaning

This prevents missing-word practice from becoming a loose UI idea. The packet checks that blanks are exact, there is only one missing slot per item, distractors are safe, and recall still avoids highlighted answers.

### Remaining gap

P3.92 should build the day 4 material candidate using the reviewed day 3 export shape. Day 4 should practice short broad questions and use a different rhythm from day 3.

## Implementation update 2026-06-03 - P3.92 Gavan week 1 day 4 material candidate

### Route chosen

P3.92 continues the reset material chain instead of returning to old narrow day 4 blueprints. It builds day 4 from the reset seed and the reviewed day 3 export packet.

### What changed

- Added `tools/personal_plan_gavan_week1_day4_material_candidate.ts`.
- Added `tests/personal_plan_gavan_week1_day4_material_candidate.test.ts`.
- Generated `.codex-tmp/personal-plans/gavan-week1-day4-material-candidate.json`.
- Created `docs/reports/personal-plans-p392-gavan-week1-day4-material-candidate-2026-06-03.md`.
- Updated `.codex-tmp/codex-next-prompt.txt` to route the next step to P3.93.

### Material result

The candidate keeps:

- status `day4_material_candidate_not_live`;
- source seed status `content_authoring_seed_not_live`;
- source day 3 export status `day3_material_export_not_live`;
- `liveIntegration: false`;
- `sourceWritesUsed: false`;
- `phaseWriteTargets: []`.

The candidate includes:

- lesson bridge block;
- natural choice block;
- mistake repair block;
- quick reply block;
- active recall block;
- day quiz intent block;
- natural-choice and quick-reply options with exact counts;
- repair tiles with exact target token counts;
- safe distractor tiles;
- after-answer explanations;
- active recall without correct-word highlighting or hints;
- 10 planned quiz question blueprints, not written or registered;
- honest media state: no generated audio and no pronunciation scoring.

### Product meaning

Day 4 now practices broad short questions instead of narrow help/direction content from old blueprints. It adds variety with natural choice, mistake repair, and quick reply, while still staying non-live.

### Remaining gap

P3.93 should build a day 4 material export/quality packet before day 5 starts. The packet should add choice-option and repair-tile gates.

## Implementation update 2026-06-03 - P3.93 Gavan week 1 day 4 material export packet

### Route chosen

P3.93 reviews day 4 before moving to day 5. This is the safest route because day 4 introduced natural choice, mistake repair, and quick reply, each with its own possible failure mode.

### What changed

- Added `tools/personal_plan_gavan_week1_day4_material_export_packet.ts`.
- Added `tests/personal_plan_gavan_week1_day4_material_export_packet.test.ts`.
- Generated `.codex-tmp/personal-plans/gavan-week1-day4-material-export-packet.json`.
- Created `docs/reports/personal-plans-p393-gavan-week1-day4-material-export-packet-2026-06-03.md`.
- Updated `.codex-tmp/codex-next-prompt.txt` to route the next step to P3.94.

### Export result

The packet keeps:

- status `day4_material_export_not_live`;
- source candidate status `day4_material_candidate_not_live`;
- `exportApproved: false`;
- `liveIntegration: false`;
- `sourceWritesUsed: false`;
- `phaseWriteTargets: []`.

The packet includes:

- reviewer summary;
- compact day 4 preview;
- quality gates for broadness, choice option counts, repair tile counts, distractor safety, explanation coverage, no recall highlighting, quiz count, media honesty, and no production writes.

### Product meaning

This makes day 4 inspectable as a product-quality unit. The packet prevents broken option counts, loose repair tiles, highlighted recall answers, fake media claims, or accidental production writes from passing silently.

### Remaining gap

P3.94 should build the day 5 material candidate using the reviewed day 4 export shape. Day 5 should practice asking for simpler explanations or written/showed help without claiming final audio.

## Implementation update 2026-06-03 - P3.94 Gavan week 1 day 5 material candidate

### Route chosen

P3.94 continues the reset material chain after the reviewed day 4 export packet. It creates a concrete non-live day 5 candidate focused on asking for a simpler format: explain simply, show, write down, and use simple words.

### What changed

- Added `tools/personal_plan_gavan_week1_day5_material_candidate.ts`.
- Added `tests/personal_plan_gavan_week1_day5_material_candidate.test.ts`.
- Generated `.codex-tmp/personal-plans/gavan-week1-day5-material-candidate.json`.
- Created `docs/reports/personal-plans-p394-gavan-week1-day5-material-candidate-2026-06-03.md`.
- Updated `.codex-tmp/codex-next-prompt.txt` to route the next step to P3.95.

### Material result

The candidate keeps:

- status `day5_material_candidate_not_live`;
- source seed status `content_authoring_seed_not_live`;
- source day 4 export status `day4_material_export_not_live`;
- `liveIntegration: false`;
- `sourceWritesUsed: false`;
- `phaseWriteTargets: []`.

The candidate includes:

- lesson bridge block;
- phrase build block;
- listening choice placeholder block;
- natural choice block;
- active recall block;
- day quiz intent block;
- phrase tiles with exact target token counts;
- safe distractor tiles;
- listening placeholders with `assetStatus: not_generated`;
- natural-choice items with exact option counts;
- after-answer explanations;
- active recall without correct-word highlighting or hints;
- 10 planned quiz question blueprints, not written or registered;
- honest media state: no generated audio and no pronunciation scoring.

### Product meaning

Day 5 gives learners useful broad phrases for lowering the complexity of a conversation without needing personal data or narrow relocation situations. It keeps listening as a future-ready placeholder instead of pretending audio exists.

### Remaining gap

P3.95 should build the day 5 material export/quality packet. It should include word tile, listening placeholder honesty, choice option count, recall, quiz, media, and production-write gates.

## Implementation update 2026-06-03 - P3.95 Gavan week 1 day 5 material export packet

### Route chosen

P3.95 reviews day 5 before moving to day 6. This is the safest route because day 5 introduced two high-risk future-facing formats: phrase build with exact word tiles and listening placeholders that must not pretend audio already exists.

### What changed

- Added `tools/personal_plan_gavan_week1_day5_material_export_packet.ts`.
- Added `tests/personal_plan_gavan_week1_day5_material_export_packet.test.ts`.
- Generated `.codex-tmp/personal-plans/gavan-week1-day5-material-export-packet.json`.
- Created `docs/reports/personal-plans-p395-gavan-week1-day5-material-export-packet-2026-06-03.md`.
- Updated `.codex-tmp/codex-next-prompt.txt` to route the next step to P3.96.

### Export result

The packet keeps:

- status `day5_material_export_not_live`;
- source candidate status `day5_material_candidate_not_live`;
- `exportApproved: false`;
- `liveIntegration: false`;
- `sourceWritesUsed: false`;
- `phaseWriteTargets: []`.

The packet includes:

- reviewer summary;
- compact day 5 preview;
- quality gates for broadness, word tile counts, distractor safety, choice option counts, listening placeholder honesty, explanation coverage, no recall highlighting, quiz count, media honesty, and no production writes.

### Product meaning

This turns day 5 into an inspectable product-quality unit before day 6 starts. The packet prevents broken word-tile tasks, unsafe distractors, fake listening claims, highlighted recall answers, loose quiz counts, or accidental production writes from slipping into the route.

### Remaining gap

P3.96 should build the day 6 material candidate using the reviewed day 5 export packet. The next day must keep the reset approach: broad social utility, varied exercise rhythm, honest media state, and no production integration.

## Implementation update 2026-06-03 - P3.96 Gavan week 1 day 6 material candidate

### Route chosen

P3.96 continues the reset week by building day 6 as a concrete but non-live material candidate after the reviewed day 5 export. The day focuses on broadly useful short replies instead of names, phones, apartments, appointments, or narrow relocation anchors.

### What changed

- Added `tools/personal_plan_gavan_week1_day6_material_candidate.ts`.
- Added `tests/personal_plan_gavan_week1_day6_material_candidate.test.ts`.
- Generated `.codex-tmp/personal-plans/gavan-week1-day6-material-candidate.json`.
- Created `docs/reports/personal-plans-p396-gavan-week1-day6-material-candidate-2026-06-03.md`.
- Updated `.codex-tmp/codex-next-prompt.txt` to route the next step to P3.97.

### Material result

The candidate keeps:

- status `day6_material_candidate_not_live`;
- source seed status `content_authoring_seed_not_live`;
- source day 5 export status `day5_material_export_not_live`;
- `liveIntegration: false`;
- `sourceWritesUsed: false`;
- `phaseWriteTargets: []`.

The candidate includes:

- lesson bridge block;
- quick reply block;
- missing word block;
- mistake repair block;
- pronunciation shadow placeholder block;
- active recall block;
- day quiz intent block;
- quick-reply items with exact option counts;
- missing-word items with visible blanks and exact option counts;
- repair items with exact target tile counts;
- safe distractor tiles;
- pronunciation placeholders with `finalScoringReady: false`;
- after-answer explanations;
- active recall without correct-word highlighting or hints;
- 10 planned quiz question blueprints, not written or registered;
- honest media state: no generated audio and no pronunciation scoring.

### Product meaning

Day 6 gives learners safe, reusable conversational control: accept something, say what they can do, say what they cannot do today, and delay politely while they check. This is more useful for a broad product than forcing personal data or one narrow relocation situation.

### Remaining gap

P3.97 should build the day 6 material export/quality packet. It should verify quick-reply options, missing-word blanks, repair tile integrity, pronunciation placeholder honesty, explanation coverage, recall safety, quiz count, media honesty, and production-write safety before day 7 material starts.

## Implementation update 2026-06-03 - P3.97 Gavan week 1 day 6 material export packet

### Route chosen

P3.97 reviews day 6 before expanding the reset material shape to day 7. This is the right safety point because day 6 combines quick replies, missing-word tasks, repair tiles, pronunciation placeholders, active recall, and quiz intent.

### What changed

- Added `tools/personal_plan_gavan_week1_day6_material_export_packet.ts`.
- Added `tests/personal_plan_gavan_week1_day6_material_export_packet.test.ts`.
- Generated `.codex-tmp/personal-plans/gavan-week1-day6-material-export-packet.json`.
- Created `docs/reports/personal-plans-p397-gavan-week1-day6-material-export-packet-2026-06-03.md`.

### Export result

The packet keeps:

- status `day6_material_export_not_live`;
- source candidate status `day6_material_candidate_not_live`;
- `exportApproved: false`;
- `liveIntegration: false`;
- `sourceWritesUsed: false`;
- `phaseWriteTargets: []`.

### Quality gates

The export packet now checks:

- broadness;
- quick-reply option counts;
- missing-word visible blanks and option counts;
- repair tile integrity;
- pronunciation placeholder honesty;
- explanation coverage;
- no recall highlighting or hints;
- exact 10-question quiz intent;
- honest media state;
- no production writes.

### Product meaning

Day 6 is now an inspectable non-live product unit. It can be reviewed as a real learning day without pretending that pronunciation scoring, final quiz registration, approved audio, catalog integration, or live UI readiness already exist.

### Verification note

Focused P3.97 and the related day 1-6 material-chain tests passed. TypeScript passed. The broad `personal_plan` Jest suite is still not green in this workspace because of unrelated prerequisite-artifact and runtime/UI contract failures; those are logged in the P3.97 report instead of being hidden.

### Remaining gap

P3.98 should build the Gavan week 1 day 7 material candidate using the reviewed day 6 export packet. A separate cleanup pass should restore the broad personal_plan suite by rebuilding required temp artifacts or fixing the existing runtime/UI contract drift.

## Implementation update 2026-06-03 - linked_lesson_slice runtime shell

### Route chosen

The next practical route was to finish `linked_lesson_slice` before adding more plan content. This mode is the first task of a plan day: it opens the normal lesson shell, but the plan counts only the required lesson slice and only correct answers.

### What changed

- Added `app/personal_plan_linked_lesson_slice_shell_contract.ts`.
- Routed `linked_lesson_slice` through `buildPlanExerciseRendererParams`.
- Routed `linked_lesson_slice` to `open_lesson_shell` in day open actions.
- Connected canonical Gavan `lesson_bridge` blocks to `linkedLessonBlocks`.
- Removed `lesson_bridge` from deferred runtime blocks.
- Removed the stale validation rule that required deferred blocks even when a bridge has nothing left to defer.

### Quality gates added

- A linked lesson slice needs a real lesson destination.
- A linked lesson slice needs a real lesson id.
- A linked lesson slice needs a positive required phrase count.
- A linked lesson slice needs exact required phrase ids.
- A linked lesson slice needs a plan instance id.
- A linked lesson slice must stay `correct_only`.
- The Gavan runtime bridge must not defer `lesson_bridge`.

### Verification

- `npx jest --runTestsByPath tests\personal_plan_linked_lesson_slice_shell_contract.test.ts tests\personal_plan_exercise_renderer_params_builder.test.ts tests\personal_plan_day_open_actions.test.ts tests\personal_plan_gavan_week1_runtime_bridge.test.ts tests\personal_plan_lesson_progress_contract.test.ts --no-cache --runInBand`
- `npx tsc --noEmit --pretty false`

### Product meaning

The plan can now start a day with a normal lesson slice without fake routing. This preserves the existing lesson experience, keeps plan progress honest, and prevents vague lesson tasks from opening without exact requirements.

### Remaining gap

The next mode should be `plan_listen_choose`: it must stay blocked without approved audio, clean mojibake fallback copy, and expose a user-friendly locked state instead of pretending listening is ready.
## Implementation update 2026-06-03 - P3.99 Gavan week 1 day 7 material export packet

- Built the day 7 material export/quality packet from the approved day 7 material candidate.
- The Gavan week 1 material candidate/export packet chain is now complete as non-live reviewer artifacts for days 1-7.
- This is still not killer-feature release readiness because live catalog integration, final quizzes, approved audio, real pronunciation scoring, and UI/runtime production smoke remain open.
- The next high-leverage pass should move from material packets to production blockers, starting with live catalog integration or final quiz registration.

## Implementation update 2026-06-04 - P3.101 Gavan week 1 signed approval handoff packet

- Built a signed-approval handoff packet for human route review.
- The packet combines the unsigned route approval guard, live-route preflight, and 7/7 non-live material export evidence.
- This is intentionally not a signed approval and not live-route readiness.
- The packet keeps `approvalStillMissing: true`, `readyForLive: false`, and all catalog/quiz/UI route registration disabled.
- It gives the reviewer the required evidence paths and checklist for full route bundle scope, material evidence, regression scope, no live edits before signature, and separate audio/pronunciation blockers.
- The next killer-feature step should build final quiz route candidates or obtain explicit signed approval before any production route edit.

## Implementation update 2026-06-04 - P3.102 Gavan week 1 final quiz candidate packet

- Built a non-live final quiz candidate packet for Gavan week 1.
- The packet creates seven quiz candidates and 70 total candidate questions from material export evidence.
- Every quiz candidate keeps choice and typing modes, material phrase coverage, and RU/UK/ES task-copy readiness.
- No quiz is registered, playable, or written into `app/personal_plan_quizzes.ts`.
- The packet rejects partial material exports and live-ready/approved handoff inputs.
- This moves final quizzes closer to production without bypassing the missing signed route approval.

## Implementation update 2026-06-04 - P3.103 Final quiz evidence in route preflight and handoff

- Extended the live-route preflight with final quiz candidate evidence.
- The preflight now records 7 expected quiz candidates, 70 candidate questions, 7 ten-question quizzes, zero registered quizzes, zero playable quizzes, and 7 coverage-ready quizzes.
- Extended signed approval handoff with `finalQuizCandidateEvidence`.
- Added the final quiz candidate packet to the required evidence paths.
- Added a reviewer checklist item for final quiz candidate evidence.
- Handoff readiness is now blocked if final quiz candidate evidence is absent or incomplete.
- This keeps quiz readiness visible to human review without registering production quiz routes.

## Implementation update 2026-06-04 - P3.104 Audio approval evidence packet

- Added `tools/personal_plan_gavan_week1_audio_approval_evidence_packet.ts`.
- Added `tests/personal_plan_gavan_week1_audio_approval_evidence_packet.test.ts`.
- The packet ties the existing Gavan week 1 audio generation plan to generated-asset validation and approval-report evidence.
- Current evidence is intentionally blocked: 10 expected generation jobs, 0 generated assets, 10 missing generated-file blockers, 0 approved audio assets, and 0 production-ready audio assets.
- The packet keeps `readyForLive`, `audioProductionReady`, `audioApprovalReady`, asset registration, and pronunciation inference disabled.
- Fake final audio claims are rejected; approved/final audio can only come from explicit approval records after real generated assets exist.
- This moves audio approval from a vague blocker into a concrete reviewer artifact without changing live runtime, UI, storage, navigation, scoring, or asset files.
