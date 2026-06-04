# Personal Plans Product Excellence Audit

Date: 2026-06-01

## Implementation status 2026-06-01 - P3.31

Completed: listening authoring requirements for clean `Gavan` day 1.

Product value:
- Day 1 now has a precise authoring plan for listening prompts without pretending that audio is already generated.
- Every planned listening prompt points to a clean candidate phrase id and exact English text.
- Placeholder audio is allowed for authoring review only.
- If listening becomes required before a real approved asset exists, release evidence blocks production with `audio_not_production_ready`.
- The validator now rejects `generated` or `approved` audio status inside authoring-only requirements.

Why this improves the product:
- Audio can feel expensive and useful only if it is real, consistent, and approved.
- This step prepares listening tasks while preserving trust: no fake TTS promises, no invisible media assumptions, no user-facing broken audio.
- The future audio pipeline gets clean generation/request inputs instead of guessing from UI copy.

Quality gate so far:
- Focused listening authoring tests passed: 1 suite, 6 tests.
- Focused audio/package/bridge/release/listening tests passed: 5 suites, 48 tests.
- Full Personal Plans suite passed: 65 suites, 379 tests.
- TypeScript passed: `npx tsc --noEmit --pretty false`.
- Source and encoding guards passed for changed P3.31 files.

Research synthesis:
- Duolingo's research stack shows the value of exact learner-data loops and recall signals.
- Duolingo's review-exercise writeup supports reinforcement through later context, which is why listening prompts are grounded in exact day phrases.
- ELSA-style pronunciation systems underline that speech/audio features should not claim readiness until media and feedback are real.

Next best step:
P3.32 should prepare pronunciation authoring requirements for clean `Gavan` day 1 without fake scoring.

## Implementation status 2026-06-01 - P3.30

Completed: release evidence output for the clean `Gavan` day 1 candidate.

Product value:
- The candidate day now has one inspectable evidence object for release review.
- Reviewers can see every section status instead of reading scattered bridge/package values.
- Audio and pronunciation are explicitly shown as `not_required` for this candidate, not silently ignored.
- Blocked states surface exact issue codes, which makes future QA/debug screens clearer.
- Safe task reason copy preview is included for wording review without using user-facing UI components.

Why this improves the product:
- A premium plan system needs disciplined release gates before it needs more visual decoration.
- This artifact is the bridge between engineering gates and product review: it explains why a day is ready or blocked.
- It reduces the chance that fake media readiness, broken copy, or invalid quiz content slips into the app because one section looked green in isolation.

Quality gate so far:
- Focused release fixture/evidence tests passed: 1 suite, 9 tests.
- Full Personal Plans suite passed: 64 suites, 373 tests.
- TypeScript passed: `npx tsc --noEmit --pretty false`.
- Source guard confirms release fixture does not import live catalog or live quiz registry.
- Targeted changed-file guard found no literal mojibake markers.

Research synthesis:
- Release-readiness patterns favor explicit go/no-go decisions, section status, evidence, and issue codes.
- For this product, that translates into content/package/quiz/copy/audio/pronunciation sections with no hidden assumptions.

Next best step:
P3.31 should prepare honest audio/listening authoring requirements for the clean day 1 candidate, without generating fake audio or claiming production readiness.

## Implementation status 2026-06-01 - P3.29

Completed: `Gavan` day 1 candidate content rewrite after reset.

Product value:
- Candidate day 1 now teaches broad survival phrases instead of narrow private-data scripts.
- The phrase set is useful across everyday relocation moments, work reception moments, calls, and small service interactions.
- Candidate quiz copy is clean, direct, and user-facing.
- Task reason copy is now clean Russian and short enough for UI cards.
- Legacy analytics compatibility stayed intact: attempt events, explanation cards, and weak-spot summaries still pass.

Why this improves the product:
- A Personal Plan cannot feel premium if the first day asks for names, phone numbers, addresses, or apartment-specific phrases before the user trusts the product.
- The new day 1 gives the learner immediate agency: arrive, pause, ask to repeat, admit confusion, ask for help.
- This is a better foundation for retention because the user can feel real usefulness after one short session.

Quality gate so far:
- Focused content/quiz/copy/release tests passed: 4 suites, 37 tests.
- Full Personal Plans suite passed: 64 suites, 370 tests.
- TypeScript passed: `npx tsc --noEmit --pretty false`.
- Source guard confirms live catalog and live quiz registry remain untouched.
- Targeted changed-file guard found no literal mojibake markers.

Research synthesis:
- Negative app-review research points to the same product risks: repetitive filler, weak explanations, over-aggressive monetization, and speech features that promise more than they can score.
- Spaced repetition and active recall are still strong, but only when the content itself feels worth repeating.
- The clean day 1 candidate is the first reusable pattern for building plan content that feels human rather than generated.

Next best step:
P3.30 should add reviewer-friendly release evidence output for the candidate day so DEV/debug surfaces can show exactly what passed, what is blocked, and why, without exposing developer copy to users.

## Implementation status 2026-06-01 - P3.28

Completed: corrupted-copy gates for Personal Plans content and release checks.

Product value:
- Broken Russian/mojibake copy now fails content quality, candidate quiz copy, task reason copy, and release fixture validation.
- The release fixture can no longer say a day is releasable while Russian text is visually corrupted.
- Intentional mojibake test samples use Unicode escapes, so source files stay clean.

Why this improves the product:
- A premium language app cannot look expensive if explanations or cards contain garbled text.
- This step protects the exact area that will matter most in content generation: phrase explanations, quiz feedback, and task cards.
- It lets us start rewriting `Gavan` day 1 with a stronger safety net.

Quality gate so far:
- Focused content/quiz/copy/release tests passed: 4 suites, 35 tests.
- Full Personal Plans suite passed: 64 suites, 367 tests.
- TypeScript passed: `npx tsc --noEmit --pretty false`.
- Source guard confirms live catalog and live quiz registry remain untouched.
- Targeted changed-file guard found no literal mojibake markers.

Research synthesis:
- Encoding research shows mojibake is usually a pipeline issue, not a writer issue.
- Localization QA guidance treats garbled text as release-blocking because users experience it as low quality and broken trust.

Next best step:
P3.29 should rewrite `Gavan` day 1 candidate content in clean, universal-first Russian copy and let the release fixture prove that content/package/quiz/copy gates still hold.

## Implementation status 2026-06-01 - P3.27

Completed: candidate day 1 release fixture.

Product value:
- There is now one pure fixture that evaluates whether candidate `Gavan` day 1 can pass all release gates together.
- Content approval is explicit, not accidental.
- Audio and pronunciation can be accepted as `not_required` only when they are honestly not attached.
- Broken package, quiz, copy, audio, or pronunciation readiness blocks the candidate release fixture.
- The fixture is explicitly not live integration.

Why this improves the product:
- A premium Personal Plan day needs a release checklist, not a collection of scattered checks.
- This lets us start content work with a clear bar: a day must pass the fixture before it can be considered for product integration.
- It also makes future DEV tooling easier: show one gate, with exact blocked sections.

Quality gate so far:
- Focused release fixture test passed: 1 suite, 5 tests.
- Focused fixture/package/bridge/content/quiz tests passed: 5 suites, 59 tests.
- Full Personal Plans suite passed: 64 suites, 363 tests.
- TypeScript passed: `npx tsc --noEmit --pretty false`.
- Source guard confirms live catalog and live quiz registry remain untouched.
- Targeted changed-file guard found no mojibake markers in release fixture files.

Research synthesis:
- Competitor analysis keeps validating the same strategy: high-quality learning loops need consistency across content, reinforcement, audio, and feedback.
- The fixture is the product discipline layer that prevents "looks ready" from becoming "shipped too early".

Next best step:
P3.28 should start the new universal-first `Gavan` day 1 content pass using this release fixture, while P3.29 should add a general mojibake/corrupted-copy gate so future Russian copy cannot pass accidentally.

## Implementation status 2026-06-01 - P3.26

Completed: pronunciation readiness metadata without fake scoring.

Product value:
- Pronunciation can now be treated as a premium-quality plan mode without pretending that scoring already exists.
- The bridge can tell future UI and QA whether pronunciation is not required, blocked, or ready.
- Ready scoring must include a real scorer id, provider, scoring version, result fields, minimum confidence, and final readiness.
- Blocked pronunciation tasks can stay visible in authoring without leaking into production.
- Russian UI claims about exact scores and percentages are now blocked when scoring is unavailable.

Why this improves the product:
- Speaking practice is emotionally sensitive: users need to feel the app is fair, not random.
- This prevents a future "big shiny microphone button" from shipping before the engine can support it.
- It protects progress analytics from low-confidence or fake scoring.

Quality gate so far:
- Focused pronunciation/package/bridge tests passed: 4 suites, 39 tests.
- Full Personal Plans suite passed: 63 suites, 358 tests.
- TypeScript passed: `npx tsc --noEmit --pretty false`.
- Source guard confirms live catalog and live quiz registry remain untouched.
- Targeted changed-file guard found no mojibake markers.

Research synthesis:
- Busuu and ELSA both show that speaking feedback can be a premium anchor.
- Negative user feedback around AI speaking tools shows the danger: bad recognition feels unfair, even if the lesson content is good.
- Phraseman's advantage should be clear readiness gates: no scoring promise until scoring metadata and confidence policy exist.

Next best step:
P3.27 should create a candidate day 1 release/approval fixture that proves all release sections can be evaluated together without touching live catalog, live quiz registry, onboarding, Premium, or Home.

## Implementation status 2026-06-01 - P3.25

Completed: audio/listening readiness metadata for candidate `Gavan` day 1.

Product value:
- Listening is now represented as a real product dependency instead of a decorative label.
- If a day has no listening task, audio is honestly `not_required`.
- If a listening task exists but audio is only a placeholder, production is blocked.
- If audio is approved and has full asset metadata, the audio section can become `ready`.
- Approved final audio is no longer treated as fake just because `finalAssetReady` is true.
- Fake final claims still block release when they come from placeholders or package media claims.

Why this improves the product:
- A premium plan should never ship a listening exercise that cannot actually play the right sound.
- The model now supports future OpenAI/manual/store audio pipelines without pretending those assets exist today.
- QA and future UI can show a simple truth: no audio needed, audio pending, or audio ready.

Quality gate so far:
- Focused audio/package/bridge tests passed: 3 suites, 29 tests.
- Full Personal Plans suite passed: 62 suites, 349 tests.
- Source guard confirms live catalog and live quiz registry remain untouched.
- Targeted changed-file guard found no mojibake markers.
- TypeScript full check is blocked by existing onboarding style/type errors in `components/onboarding.tsx`.

Research synthesis:
- Competitor research keeps pointing to trust in focused practice modes.
- Duolingo's separate Listen/Speak/Mistakes/Words style practice supports making audio readiness a named section.
- Negative reports about broken speaking/listening modes reinforce the rule: if the mode is not technically ready, it must stay blocked instead of appearing as a user promise.

Next best step:
P3.26 should prepare pronunciation readiness the same way: no fake scoring, no fake microphone success, clear blocked/ready states, and future-friendly metadata.

## Implementation status 2026-06-01 - P3.24

Completed: explicit production release criteria for Gavan day 1.

Product value:
- The bridge now has a clear release decision: `production.canRelease`.
- Release requires content approval plus ready package, quiz, and copy.
- Audio and pronunciation can be accepted as `not_required`, but only when they truly have no requirements and no fake final claims.
- A broken quiz, package, copy, audio, or pronunciation section blocks release even if content is approved.
- Fake final audio/pronunciation claims now block their own sections.

Why this improves the product:
- Premium plans need a release discipline, not a loose collection of checks.
- This makes the day harder to ship accidentally.
- It also gives future UI/QA a simple yes/no release state plus exact blocked sections.

Quality gate so far:
- Focused bridge/package/quiz tests passed: 3 suites, 42 tests.
- Full Personal Plans suite passed: 62 suites, 345 tests.
- TypeScript passed: `npx tsc --noEmit --pretty false`.
- Source guard confirms live catalog and live quiz registry remain untouched.
- Targeted changed-file guard found no mojibake markers.

Research synthesis:
- Competitor research keeps pointing to trust: users tolerate short practice loops when the app is clear about purpose and reliable about feedback.
- The release criteria are a product trust layer: each part of the learning loop must be ready or explicitly not required.

Next best step:
P3.25 should prepare audio/listening readiness for candidate day 1 without fake generated audio, and expose it as a concrete future requirement only when the content actually needs listening.

## Implementation status 2026-06-01 - P3.23

Completed: production bridge now has a named quiz readiness section.

Product value:
- Production readiness now sees quiz quality as a first-class part of the day.
- A day can no longer be treated as ready only because content/package/copy are okay.
- The bridge exposes quiz item count, choice count, explanation requirement count, and issue codes.
- Content approval remains separate from quiz readiness, which keeps human approval and technical gates clean.
- Candidate quiz failures now become visible blockers.

Why this improves the user experience:
- Learners feel quality through the whole loop: phrase, practice, explanation, quiz, recovery.
- If the quiz is weak or mismatched, the day feels cheap even when the UI is beautiful.
- This step makes the quality loop harder to bypass.

Quality gate so far:
- Focused bridge/package/quiz tests passed: 3 suites, 39 tests.
- Full Personal Plans suite passed: 62 suites, 342 tests.
- TypeScript passed: `npx tsc --noEmit --pretty false`.
- Source guard confirms live catalog and live quiz registry remain untouched.
- Targeted changed-file guard found no mojibake markers.

Research synthesis:
- Competitor practice systems win when reinforcement feels purposeful, not bolted on.
- Duolingo separates practice surfaces; this validates the decision to expose quiz readiness separately.
- Memrise and Busuu reinforce the value of predictable, grounded daily practice, but Phraseman's advantage should be stricter quality gates before anything ships.

Next best step:
P3.24 should add explicit production approval/readiness input: even if content is approved, bridge readiness should require package, quiz, copy, audio, and pronunciation to be ready or honestly not required.

## Implementation status 2026-06-01 - P3.22

Completed: candidate quiz copy honesty gate.

Product value:
- Candidate quiz text now has executable protection against robotic/developer copy.
- The quiz cannot silently accept authoring instructions such as `Explain that`.
- The quiz cannot explain a target that is not grounded in the candidate phrase set.
- The quiz cannot use tiny prompts that leave the learner guessing.
- The package validates candidate quiz copy when candidate content is attached.

Why this improves the product:
- A premium language plan is not only mechanics; it is the feeling that the app speaks clearly and knows why each task exists.
- This gate protects that feeling before screens are polished.
- It also supports future content generation: new quiz items must pass the same standards automatically.

Quality gate so far:
- Focused quiz/package tests passed: 2 suites, 29 tests.
- Full Personal Plans suite passed: 62 suites, 339 tests.
- TypeScript passed: `npx tsc --noEmit --pretty false`.
- Source guard confirms live catalog and live quiz registry remain untouched.
- Targeted changed-file guard found no mojibake markers.

Research synthesis:
- Duolingo's Practice Tab shows that users understand practice better when modes have a clear purpose.
- Memrise difficult-word flows show the value of concrete item-level targeting.
- Busuu study plans show habit framing, but they do not replace the need for high-quality task copy.
- Negative-review patterns around practice apps point to the same trap: repetitive tasks with weak explanations feel like filler. Phraseman now has a gate against that for candidate quiz copy.

Next best step:
P3.23 should add candidate quiz readiness as a named section in the production bridge, so future content approval cannot ignore quiz readiness.

## Implementation status 2026-06-01 - P3.21

Completed: Gavan day 1 quiz draft now follows the reset candidate content.

Product value:
- The quiz no longer reinforces old day-one content.
- Every candidate phrase gets two quiz touches, so day 1 starts to feel like deliberate reinforcement rather than random checking.
- Prompts are short and user-facing.
- Explanation notes avoid developer wording and do not pretend to know the exact wrong option unless runtime data exists.
- Package + quiz are now aligned while still staying outside live registry.

Candidate quiz shape:
- 10 questions total.
- 5 source phrases.
- 2 questions per phrase.
- Skills used: `natural_choice`, `meaning`, `missing_word`, `micro_context`.
- Explanation targets are grounded in candidate phrase text, meaning, words, constructions, or context.

Quality gate so far:
- Focused quiz/package tests passed: 2 suites, 24 tests.
- Full Personal Plans suite passed: 62 suites, 334 tests.
- TypeScript passed: `npx tsc --noEmit --pretty false`.
- Targeted changed-file guard found no mojibake markers.
- Source guard confirms live catalog and live quiz registry remain untouched.

Research synthesis:
- Negative review patterns around personalized practice usually come from repetition without clear reason, stale weak-word logic, or weak feedback. The quiz now has direct phrase targets, which reduces that risk.
- Duolingo's practice categories support separating reinforcement modes; Phraseman should keep quiz, recall, listening, speaking, and weak-spot recovery distinct.
- Memrise-style difficult-word return is useful only when the source item is explicit; candidate phrase ids now give that source.
- Busuu-style study plans help habit formation, but Phraseman's edge should be higher task quality and clearer daily purpose.

Next best step:
P3.22 should add a stricter quiz prompt/copy honesty gate:
- block `Explain that` and similar authoring instructions in candidate-facing quiz copy;
- block developer/internal terms in prompts and explanation notes;
- block copy that references selected wrong answers without runtime context;
- require every candidate quiz item to target either a candidate phrase, meaning, new word, first-seen construction, or context.

## Implementation status 2026-06-01 - P3.20

Completed: Gavan day 1 candidate content connected to the non-production package draft.

Product value:
- The reset content is now usable by the package layer without touching production routes.
- The package can say which content source it uses, so future UI and QA are not guessing.
- Explanation requirements now follow the candidate phrases, not the rejected old day-one blueprint.
- The quiz stays draft-only for now, which prevents a half-updated day from leaking into the learner flow.
- Production remains blocked until explicit approval, so quality control stays human and intentional.

Files:
- `app/personal_plan_gavan_day1_package_draft.ts`
- `tests/personal_plan_gavan_day1_package_draft.test.ts`

Quality gate so far:
- Focused package/candidate/bridge tests passed: 3 suites, 27 tests.
- Full Personal Plans suite passed: 62 suites, 330 tests.
- TypeScript passed: `npx tsc --noEmit --pretty false`.

Research synthesis:
- Competitor research keeps pointing to the same practical rule: every daily item needs a clear purpose, a repeat path, and honest readiness.
- The package now has enough metadata to support that rule: content source, phrase count, explanation requirements, quiz draft, copy readiness, and media readiness.
- The next risk is mismatch: quiz questions still point to old blueprint phrase ids. That is intentionally blocked from production, but it should be the next fix.

Next best step:
P3.21 should update the non-production day 1 quiz draft to use the candidate phrase ids and candidate explanation targets, still without editing the live quiz registry.

## Implementation status 2026-06-01 - P3.19

Completed: Gavan day 1 content candidate after competitor/product audit.

Product value:
- The first content candidate now starts from broad human usefulness, not a narrow apartment/bank/doctor topic.
- It avoids names, phone numbers, emails, addresses, and exact personal data.
- It avoids day-one niche content that could make users feel the plan is irrelevant.
- Each phrase is short, usable, and suitable for multiple everyday situations.
- Each new word and first-seen construction has explanation coverage.
- The bridge still blocks production until explicit approval, so quality stays controlled.

Candidate phrases:
- `I'm here.`
- `I need a minute.`
- `Could you repeat that?`
- `I don't understand yet.`
- `Can you help me?`

Research synthesis:
- Duolingo's useful lesson is practice variety: mistakes, listening, speaking, words, stories, radio. Phraseman should use this as a structure, not copy its pressure loops.
- Memrise's useful lesson is scheduled return of words/phrases; wrong or difficult items should return with a reason.
- Busuu's useful lesson is chunks that can be used immediately, with controlled practice before freer conversation.
- ELSA's useful lesson is that pronunciation can feel premium, but only if feedback is honest and confidence-aware.
- The next content steps should combine these: short useful chunks, varied exercise format, explain-then-practice, recall when needed, no fake personalization.

Files:
- `app/personal_plan_gavan_day1_content_candidate.ts`
- `tests/personal_plan_gavan_day1_content_candidate.test.ts`

Quality gate so far:
- Focused content candidate tests passed: 1 suite, 6 tests.
- Full Personal Plans suite passed: 62 suites, 325 tests.
- TypeScript passed: `npx tsc --noEmit --pretty false`.

Next best step:
P3.20 should connect this content candidate into the non-production package draft, then rerun the production bridge while keeping live catalog and quiz registry untouched.

## Implementation status 2026-06-01 - P3.18

Completed: guarded production bridge for Gavan day 1.

Product value:
- Day 1 now has a single readiness checkpoint before production integration.
- Authoring-ready is no longer confused with production-ready.
- The bridge says exactly why day 1 is blocked: current content is still draft/scaffold-only.
- Package, copy, audio, and pronunciation gates are visible as separate sections.
- Audio and pronunciation can be honestly marked `not_required` instead of pretending final assets/scoring exist.
- This reduces the risk of shipping weak content or fake premium features by accident.

Files:
- `app/personal_plan_gavan_day1_production_bridge.ts`
- `tests/personal_plan_gavan_day1_production_bridge.test.ts`

Quality gate so far:
- Focused production bridge tests passed: 1 suite, 7 tests.
- Full Personal Plans suite passed: 61 suites, 319 tests.
- TypeScript passed: `npx tsc --noEmit --pretty false`.

Next best step:
P3.19 should begin final Gavan day 1 content replacement:
- write approved universal day 1 phrases and explanations;
- keep them broad, socially safe, and useful beyond one apartment/doctor/bank niche;
- avoid names, phone numbers, emails, exact personal data, and fake specificity;
- keep the bridge blocked until the content is explicitly approved.

## Implementation status 2026-06-01 - P3.17

Completed: pronunciation attempt and scoring honesty contract.

Product value:
- Speaking practice can now exist without fake scoring.
- Practice mode records the user attempt and can count completion, but it never pretends to grade pronunciation.
- Scored mode is blocked unless the attempt has a scoring provider, scoring version, confidence, and score.
- Low speech-recognition confidence cannot punish the learner.
- UI claims such as "exact pronunciation score" are blocked until a real scoring system is available.
- Empty or failed recordings must explain what happened, which prepares better retry states.

Files:
- `app/personal_plan_pronunciation_attempt.ts`
- `tests/personal_plan_pronunciation_attempt.test.ts`

Quality gate so far:
- Focused pronunciation contract tests passed: 1 suite, 6 tests.
- Full Personal Plans suite passed: 60 suites, 312 tests.
- TypeScript passed: `npx tsc --noEmit --pretty false`.

Research synthesis:
- Speech-recognition complaints around Duolingo and ELSA consistently point to the same trust break: the learner speaks, the system fails to recognize it, and the app makes the learner feel wrong.
- Phraseman should treat low confidence as a technical uncertainty, not as user failure.
- The first production speaking MVP should be "record, compare, retry gently"; exact scoring comes later behind a readiness gate.

Next best step:
P3.18 should add a guarded production adapter/readiness bridge for Gavan day 1:
- read the new copy, audio, and pronunciation gates;
- expose a single readiness result for day 1 integration;
- keep blocked areas explicit instead of silently shipping placeholders;
- still avoid editing onboarding, Premium, Home, live catalog, and quiz registry.

## Implementation status 2026-06-01 - P3.16

Completed: audio asset readiness contract for listening tasks.

Product value:
- Listening tasks now have honest asset state instead of a loose placeholder flag.
- The system can reserve listening work for the plan without pretending the generated audio already exists.
- Production-ready audio requires concrete metadata: asset id, URI, target text, content units, duration, voice id, provider, and final approval.
- This protects the future premium experience: no silent fake audio, no broken listening task disguised as ready.

Files:
- `app/personal_plan_audio_asset_readiness.ts`
- `tests/personal_plan_audio_asset_readiness.test.ts`
- `app/personal_plan_harbor_week1_package_readiness.ts`
- `tests/personal_plan_harbor_week1_package_readiness.test.ts`

Quality gate so far:
- Focused audio/package tests passed: 2 suites, 12 tests.
- Full Personal Plans suite passed: 59 suites, 306 tests.
- TypeScript passed: `npx tsc --noEmit --pretty false`.

Research synthesis:
- Negative review research showed that unreliable audio/speech features break trust quickly.
- Memrise's useful edge is natural listening material, but Phraseman must connect that material to recall and validation before showing it as ready.
- ELSA's speech focus reinforces the same rule: audio/pronunciation must be honest about confidence and readiness.

Next best step:
P3.17 should add a pronunciation attempt/scoring contract:
- record target text, recording id, transcript, confidence, timing, and result;
- separate practice mode from scored mode;
- block progress penalties when confidence is low;
- block UI copy that promises exact pronunciation scoring before scoring is real.

## Implementation status 2026-06-01 - P3.15

Completed: user-facing copy layer for task-selection reasons.

Product value:
- The plan can now explain task purpose in short human language.
- Copy is generated from semantic reason codes, not scattered through UI components.
- Personalized/recovery copy requires evidence; no fake "we noticed..." messaging.
- Developer words and banned route wording are blocked before future UI can render them.
- This is a direct answer to the earlier product requirement: no robotic text, no developer drafts, no weird metaphors.

Files:
- `app/personal_plan_task_reason_copy.ts`
- `tests/personal_plan_task_reason_copy.test.ts`
- `app/personal_plan_gavan_day1_package_draft.ts`
- `tests/personal_plan_gavan_day1_package_draft.test.ts`

Quality gate so far:
- Focused task reason copy tests passed: 1 suite, 5 tests.
- Focused package/selection/copy tests passed: 3 suites, 18 tests.
- Full Personal Plans suite passed: 58 suites, 300 tests.
- TypeScript passed: `npx tsc --noEmit --pretty false`.

Research synthesis:
- Negative review research showed that users reject repetition when the product cannot explain why it returned.
- Duolingo's practice areas and Memrise's difficult-word behavior validate purpose-based practice, but Phraseman now adds a stricter copy/evidence gate.
- Busuu's controlled-practice style supports short task descriptions that explain the next action without over-teaching on the card.

Next best step:
P3.16 should add audio asset readiness for listening tasks:
- define `PlanAudioAsset` status and metadata;
- require listening blocks to point to asset requirements;
- keep generated audio as placeholder until real asset pipeline exists;
- block UI-ready listening tasks without asset id/text/duration/status;
- do not generate fake audio files.

## Implementation status 2026-06-01 - P3.14

Completed: task-selection reasons connected to package readiness.

Product value:
- Personal Plans can now explain why a task exists before UI copy is written.
- Every block gets a structural reason.
- Recovery/personalized reasons require real weak-spot evidence tied to the block's content units.
- Recall, trainer, and mistake-review due counts come from the weak-spot summary instead of being invented.
- This protects the premium promise: "personal" means data-backed, not decorative.

Files:
- `app/personal_plan_task_selection_reasons.ts`
- `tests/personal_plan_task_selection_reasons.test.ts`
- `app/personal_plan_gavan_day1_package_draft.ts`
- `tests/personal_plan_gavan_day1_package_draft.test.ts`

Quality gate so far:
- Focused task-selection tests passed: 1 suite, 4 tests.
- Focused package/weak-summary tests passed: 3 suites, 16 tests.
- Full Personal Plans suite passed: 57 suites, 294 tests.
- TypeScript passed: `npx tsc --noEmit --pretty false`.

Research synthesis:
- Duolingo Practice Hub shows users need distinct practice purposes: mistakes, listening, speaking, words.
- Duolingo spaced repetition uses accuracy as a selection signal, which validates the attempt-event path.
- Memrise Difficult Words shows the value of surfacing items missed before; Phraseman adds stronger evidence and package gates.
- Busuu's chunk-based methodology supports task reasons tied to controlled practice, not generic calendar topics.

Next best step:
P3.15 should create a user-facing reason-copy layer:
- convert reason codes into short Russian copy;
- keep copy warm, clear, and non-technical;
- block developer phrasing and fake personalization;
- do not put copy directly into the engine;
- test that every reason code has safe production copy.

## Implementation status 2026-06-01 - P3.13

Completed: weak-spot and recovery summary layer.

Product value:
- Attempts and recovery candidates now produce a clean summary that can explain what the learner needs next.
- The summary counts correct, wrong, skipped, and completed attempts.
- It shows recall, trainer, and mistake analytics due counts.
- It groups weak spots by grammar, vocabulary, and mistake tags.
- Correct answers are not treated as weak spots.
- Sensitive payload values are not exposed.
- This is the layer that can later power "why these tasks today" copy without sounding random or robotic.

Files:
- `app/personal_plan_weak_spot_summary.ts`
- `tests/personal_plan_weak_spot_summary.test.ts`

Quality gate so far:
- Focused weak-spot summary tests passed: 1 suite, 4 tests.
- Full Personal Plans suite passed: 56 suites, 289 tests.
- TypeScript passed: `npx tsc --noEmit --pretty false`.

Research synthesis:
- Duolingo says personalized practice uses spaced repetition plus accuracy, but user complaints show weak-word choices feel bad when they are unexplained or repetitive.
- Memrise/Difficult Words and spaced repetition show why due review needs explicit signals.
- Busuu's vocabulary and grammar review supports separating grammar, vocabulary, and mistake tags.

Next best step:
P3.14 should connect this summary into day/package readiness:
- include weak-spot counts in the package draft;
- include recovery due status;
- prepare human-readable reasons for selected tasks;
- still keep everything non-production and outside live UI/catalog.

## Implementation status 2026-06-01 - P3.12

Completed: analytics-ready attempt-event adapter for Personal Plans.

Product value:
- Quiz and phrase answers can now become structured `PlanAttemptEvent` records.
- Correct answers can affect progress.
- Wrong answers cannot count as progress.
- Wrong answers immediately produce recovery candidates for recall, trainer, and mistake analytics when the block policy allows it.
- Expected and selected answers are recorded only when known.
- Sensitive payload data is sanitized through the existing attempt event factory.
- This turns Personal Plans from static daily tasks into a data loop that can power weak spots and personalization.

Files:
- `app/personal_plan_attempt_event_adapter.ts`
- `tests/personal_plan_attempt_event_adapter.test.ts`

Quality gate so far:
- Focused attempt adapter tests passed: 1 suite, 5 tests.
- Full Personal Plans suite passed: 55 suites, 285 tests.
- TypeScript passed: `npx tsc --noEmit --pretty false`.

Research synthesis:
- Duolingo's personalized practice uses repetition plus accuracy, so every answer needs accuracy metadata.
- Memrise review/difficult-word behavior reinforces the need to identify what should come back later.
- Busuu vocabulary/grammar review supports splitting mistake tags into vocabulary, grammar, and recovery signals.

Next best step:
P3.13 should summarize attempt output into weak-spot/recovery readiness:
- count wrong targets;
- group by grammar/vocabulary/mistake tags;
- decide whether recall/trainer/practice should receive the item;
- expose a package/day quality summary without writing to live UI.

## Implementation status 2026-06-01 - P3.11

Completed: runtime explanation-card adapter for Personal Plans.

Product value:
- Plan explanations now have a pure adapter that turns authoring requirements into UI-ready explanation cards.
- Correct answers get supportive tone.
- Wrong answers get correction tone.
- Authoring text like `Explain that` is removed before it can reach the learner.
- The adapter blocks selected-answer-aware explanations unless runtime actually provides `selectedChoiceText`.
- Developer or placeholder copy is blocked before UI.
- The live lesson UI, live quiz registry, onboarding, Premium flow, and Home UI remain untouched.

Files:
- `app/personal_plan_explanation_card_adapter.ts`
- `tests/personal_plan_explanation_card_adapter.test.ts`

Quality gate so far:
- Focused explanation adapter tests passed: 1 suite, 6 tests.
- Full Personal Plans suite passed: 54 suites, 280 tests.
- TypeScript passed: `npx tsc --noEmit --pretty false`.

Research synthesis:
- Duolingo Max's "Explain my Answer" direction confirms that contextual feedback is a premium feature, but bad explanations create trust damage fast.
- Busuu's controlled practice model supports small explanation cards tied to the exact chunk being practiced.
- Memrise's Word Information pattern supports explaining words at the moment the learner meets them.
- ELSA's feedback positioning reinforces the rule: feedback must be specific, actionable, and honest about what it knows.

Next best step:
P3.12 should convert quiz/phrase attempts into analytics-ready attempt events:
- correct/wrong result;
- expected answer;
- selected answer when known;
- grammar/vocabulary/mistake tags;
- recovery targets for recall/trainer;
- no sensitive payload leakage.

## Implementation status 2026-06-01 - P3.10

Completed: Gavan day 1 package now owns and validates its draft quiz.

Product value:
- The day package is now closer to a real product bundle: it contains blocks, readiness, explanation requirements, and the attached quiz draft.
- The package summary exposes quiz item count and quiz explanation requirement count.
- If the quiz draft breaks, the package fails too. This prevents "looks ready" packages with broken diagnostic practice.
- The live quiz registry remains untouched, so this is still a safe authoring gate before production.

Files:
- `app/personal_plan_gavan_day1_package_draft.ts`
- `tests/personal_plan_gavan_day1_package_draft.test.ts`

Quality gate so far:
- Focused package draft tests passed: 1 suite, 7 tests.
- Combined day 1 package + quiz draft tests passed: 2 suites, 13 tests.
- Full Personal Plans suite passed: 53 suites, 275 tests.
- TypeScript passed: `npx tsc --noEmit --pretty false`.

Research synthesis:
- Duolingo's spaced/practice model reinforces the need for every practice task to feed progress and review truth.
- Busuu's chunk-to-practice methodology supports package-level ownership: content, practice, and checks must move as one unit.
- Memrise's contextual practice suggests quiz items should stay tied to the exact phrase units they reinforce.

Next best step:
P3.11 should build the runtime explanation-card adapter:
- correct-answer tone;
- wrong-answer tone;
- selected-answer-aware only when runtime supplies the selected choice;
- no invented wrong-option feedback;
- output that can later be used by lesson phrase build, plan phrase build, and plan quizzes.

## Decision

The best next route is not to write more plan content yet.

The product needs a stable premium daily workout engine first:

1. attempt events;
2. recovery loop;
3. exercise variety;
4. explanation quality;
5. audio/listening shell;
6. pronunciation shell;
7. premium-feeling UI system;
8. only then `Gavan` week 1 content.

The promise is not "we have a plan screen". The promise is: every day the app gives the learner a short, clear workout that feels personal, useful, human, and worth paying for.

## Research Sources

- Duolingo Practice Hub: https://blog.duolingo.com/guide-to-duolingo-practice-hub/
- Duolingo spaced repetition: https://blog.duolingo.com/spaced-repetition-for-learning/
- Memrise product page: https://www.memrise.com/
- Memrise English page: https://www.memrise.com/en/learn-english
- Busuu Conversations support: https://help.busuu.com/hc/en-gb/articles/21862192336402-What-are-Busuu-Conversations-and-how-can-they-help-me-learn-a-language
- Busuu methodology: https://www.busuu.com/en/it-works/busuu-methodology
- ELSA Speech Analyzer: https://elsaspeak.com/en/speech-analyzer
- ELSA feedback docs: https://elsanow.freshdesk.com/en/support/solutions/articles/31000177480-feedback
- EWA product/about pages: https://appewa.com/ and https://appewa.com/about/
- Babbel review/features page: https://www.babbel.com/babbel-review

## Competitor Lessons

### Duolingo

Strengths:

- short loops;
- immediate feedback;
- mistakes practice;
- listening/speaking/words practice hub;
- spaced repetition inside the path.

Weakness to avoid:

- repetitive drills that feel efficient for streaks but not always for real speech;
- weak connection between mistakes and a visible personal reason;
- speaking/listening reliability complaints can break trust fast.

Phraseman move:

- daily workout should combine path + mistakes + plan goal;
- every repeat needs a reason;
- repetition must feel like sharpening, not punishment.

### Memrise

Strengths:

- "real people speak this way";
- authentic video/audio;
- AI speaking partner;
- useful everyday phrase orientation.

Weakness to avoid:

- authenticity can become passive watching if not tied to production;
- videos/audio without structured recall do not guarantee memory.

Phraseman move:

- generated/native-feeling audio and later video snippets should feed phrase build, listening, recall, and speaking;
- every media item must have a recall path.

### Busuu

Strengths:

- structured curriculum;
- grammar/vocabulary before conversation;
- AI conversations that complement learned content;
- feedback after conversation, not constant interruption.

Weakness to avoid:

- conversation can feel scripted or generic if the objective is vague.

Phraseman move:

- every speaking/dialogue task must declare prerequisites and outcome;
- feedback after the task should be kind, precise, and not too long.

### ELSA

Strengths:

- pronunciation, intonation, fluency, grammar, vocabulary feedback buckets;
- speech analyzer gives a professional feeling;
- user understands what to improve.

Weakness to avoid:

- fake precision and harsh scores;
- pronunciation app feeling separate from real communication.

Phraseman move:

- pronunciation MVP should use simple buckets first: words captured, rhythm, stress, confidence;
- no fake percentages until the engine can support them.

### EWA

Strengths:

- memorable media context;
- books, audiobooks, movie snippets;
- tap/translate and playful exercises.

Weakness to avoid:

- entertainment without plan relevance;
- too much media can hide the daily learning objective.

Phraseman move:

- use media-like flavor only when it serves the daily phrase goal;
- plan tasks should stay action-first.

## Current Phraseman Strengths

Already present in the codebase:

- lesson phrase-building engine;
- quiz engine;
- active recall;
- trainer store;
- mistake log with token/category metadata;
- flashcards;
- plan routes, state, progress, DEV calendar;
- plan quality gates;
- `PlanExerciseBlock` / `PlanAttemptEvent` contracts started;
- event factory and sanitizer started.

This is a strong base. The missing piece is orchestration into one premium daily workout.

## Critical Holes

### Hole 1: Wrong answers do not yet become a complete recovery loop

Needed:

- wrong attempt -> recall candidate;
- wrong attempt -> trainer candidate when policy requires;
- wrong attempt -> mistake analytics;
- wrong attempt -> explanation card;
- wrong attempt -> next-day carryover if not repaired.

Status:

- attempt events exist;
- recovery candidate generation is next.

### Hole 2: Exercise variety is still a contract, not a product feel

Needed first renderers:

- phrase build;
- missing word;
- choose natural phrase.

Needed soon after:

- listen and choose;
- listen and build;
- no-hint recall;
- quick reply;
- pronunciation repeat.

### Hole 3: Premium audio is not yet a plan asset pipeline

Needed:

- `PlanAudioAsset`;
- generated clip metadata;
- fallback speech flag;
- listening tasks that can hide text first;
- gate for missing premium audio.

### Hole 4: Pronunciation must not be fake

Needed:

- record attempt;
- transcript/keyword comparison;
- simple buckets;
- no fake `87%` score;
- retry and compare path.

### Hole 5: UX is not yet "expensive"

Needed:

- large clear task blocks;
- less text per card;
- strong visual hierarchy;
- one obvious primary action;
- premium material feeling;
- theme-aware accents only;
- no DEV copy in production;
- no decorative clutter.

### Hole 6: Explanations need a human style standard

Needed:

- short correct feedback;
- supportive wrong feedback;
- explain new words when first seen;
- never explain imaginary selected choices;
- no technical words like route/source/destination/dev/active recall.

### Hole 7: Content must be universal-first

Needed:

- early plan days use broad phrases:
  - ask for help;
  - say you do not understand;
  - ask to repeat;
  - ask for a minute;
  - confirm what you heard;
  - say something works / does not work;
  - ask where to go;
  - explain a simple need.
- no forced names, addresses, phone numbers, email, apartment, bank/doctor specifics in early universal days.

## Ideal Training Mode Portfolio

Every route should draw from the same high-quality exercise engine:

- `plan_phrase_build`: assemble phrase like lessons.
- `plan_missing_word`: one precise missing word.
- `plan_choose_natural_phrase`: choose what real people would say.
- `plan_listen_choose`: audio first, text later.
- `plan_listen_build`: hear it, then build it.
- `plan_phrase_recall`: no hints, missed items return.
- `plan_quick_reply`: choose or say a short response.
- `plan_pronunciation_repeat`: repeat and get simple buckets.
- `plan_micro_dialogue`: 2-3 turns, no "scene" wording.
- `plan_error_repair`: repair real user mistakes.
- `plan_card_sprint`: only with enough due cards.
- `plan_trainer_bridge`: only with real trainer due material.

## Premium UX Direction

The interface should feel:

- expensive;
- calm;
- direct;
- tactile;
- not childish;
- not developer-like;
- not overloaded.

Use:

- existing app theme accents;
- large cards with depth/liquid-glass feel;
- clear daily progress rail;
- big primary buttons;
- fewer labels;
- icons generated or curated by exercise type;
- one card = one decision;
- short human copy.

Avoid:

- fake buttons;
- mixed random colors;
- small crowded cards;
- long subtitles;
- technical labels;
- "route/source/destination/dev" copy;
- overexplaining the UI.

## Product Excellence Gates

Before a plan day can be called ready:

- `engine_ready`: content uses typed exercise blocks and attempt events.
- `recovery_ready`: wrong attempts create recovery candidates.
- `variety_ready`: day is not the same pattern every day.
- `audio_ready`: listening blocks have asset metadata or explicit fallback.
- `pronunciation_honest`: no fake precision or unsupported score.
- `copy_human`: no developer wording, no stiff textbook phrases.
- `universal_safe`: early content avoids narrow personal data.
- `premium_ui_ready`: production UI has clear hierarchy, one primary action, theme-aware depth.
- `evidence_personalization`: personalization has evidence or uses generic copy.
- `completion_honest`: progress increments only when policy allows.

## Best Next Path

P1.4 implementation status:

Recovery candidates from wrong `PlanAttemptEvent` are now implemented.

Why it mattered:

- It closes the most important learning loop.
- It turns mistakes into future value.
- It makes plans actually personal.
- It prevents the product from becoming just a calendar of tasks.
- It supports Duolingo-style mistake review, Busuu-style scaffolded feedback, and ELSA-style targeted improvement without copying their UX.

Verification:

- `npx jest --runTestsByPath tests/personal_plan_engine_contracts.test.ts tests/personal_plan_day_quality_gate.test.ts tests/personal_plan_recall_contract.test.ts tests/personal_plan_mistake_analytics_contract.test.ts --no-cache --runInBand`
- Result: 4 suites passed, 29 tests passed.

P1.5 implementation status:

- Attempt events are now stored locally through `app/personal_plan_attempt_events.ts`.
- Events are isolated by `planInstanceId`.
- Reset can clear one plan instance without touching another.
- Wrong attempts remain learning evidence but do not affect progress.
- Sensitive payload is sanitized before storage.

Verification:

- `npx jest --runTestsByPath tests/personal_plan_attempt_events_storage.test.ts tests/personal_plan_engine_contracts.test.ts tests/personal_plan_state.test.ts tests/personal_plan_cloud_sync_contract.test.ts --no-cache --runInBand`
- Result: 4 suites passed, 31 tests passed.

P1.6 implementation status:

- Dry-run recovery action mapping now exists in `app/personal_plan_recovery_actions.ts`.
- The product can now explain what should happen after a wrong plan answer before the app mutates recall/trainer/mistake storage.
- This keeps the learning loop auditable:
  - attempt event;
  - recovery candidate;
  - dry-run action;
  - later real write.
- Name-only mistakes are kept out of grammar analytics while still allowing recall/trainer reinforcement.
- Focused tests passed:
  - `npx jest --runTestsByPath tests/personal_plan_recovery_actions.test.ts tests/personal_plan_attempt_events_storage.test.ts tests/personal_plan_engine_contracts.test.ts tests/personal_plan_mistake_analytics_contract.test.ts --no-cache --runInBand`
  - Result: 4 suites passed, 29 tests passed.

P1.7 implementation status:

- Recovery write adapter now exists in `app/personal_plan_recovery_write_adapter.ts`.
- `dry_run` remains the default and cannot mutate storage.
- `apply` requires explicit handlers; the system no longer has to guess where to write.
- Duplicate action ids are skipped in the same write batch.
- Existing applied ids can be passed in to prevent repeat writes.
- Cross-instance actions are skipped when a current `planInstanceId` is provided.
- Focused tests passed:
  - `npx jest --runTestsByPath tests/personal_plan_recovery_write_adapter.test.ts tests/personal_plan_recovery_actions.test.ts tests/personal_plan_attempt_events_storage.test.ts tests/personal_plan_engine_contracts.test.ts --no-cache --runInBand`
  - Result: 4 suites passed, 31 tests passed.

P1.8 implementation status:

- Persistent applied-action registry now exists in `app/personal_plan_recovery_applied_registry.ts`.
- Applied recovery ids are stored by `planInstanceId`.
- Restart-safe idempotency is now possible: the write adapter can skip actions already applied in a previous app session.
- `dry_run` remains non-mutating and does not persist ids.
- `apply` persists only successfully applied ids.
- Focused tests passed:
  - `npx jest --runTestsByPath tests/personal_plan_recovery_applied_registry.test.ts tests/personal_plan_recovery_write_adapter.test.ts tests/personal_plan_recovery_actions.test.ts tests/personal_plan_attempt_events_storage.test.ts tests/personal_plan_engine_contracts.test.ts --no-cache --runInBand`
  - Result: 5 suites passed, 37 tests passed.

P1.9 implementation status:

- Legacy handler bridge now exists in `app/personal_plan_recovery_legacy_handlers.ts`.
- It converts recovery actions into safe payloads for recall/trainer/mistake writers.
- It is intentionally dependency-injected, because exact legacy API signatures must be audited before direct imports are added.
- Registry-protected apply mode prevents duplicate writes.
- Focused tests passed:
  - `npx jest --runTestsByPath tests/personal_plan_recovery_legacy_handlers.test.ts tests/personal_plan_recovery_applied_registry.test.ts tests/personal_plan_recovery_write_adapter.test.ts tests/personal_plan_recovery_actions.test.ts tests/personal_plan_attempt_events_storage.test.ts tests/personal_plan_engine_contracts.test.ts --no-cache --runInBand`
  - Result: 6 suites passed, 42 tests passed.

P1.10 implementation status:

- Direct legacy API wiring is intentionally still blocked because shell could not read exact signatures.
- A safe apply-readiness gate now exists in `app/personal_plan_recovery_apply_gate.ts`.
- The gate catches empty apply batches, missing handlers, duplicate actions, and wrong plan instances before real writes.
- Focused tests passed:
  - `npx jest --runTestsByPath tests/personal_plan_recovery_apply_gate.test.ts tests/personal_plan_recovery_legacy_handlers.test.ts tests/personal_plan_recovery_applied_registry.test.ts tests/personal_plan_recovery_write_adapter.test.ts tests/personal_plan_recovery_actions.test.ts tests/personal_plan_attempt_events_storage.test.ts tests/personal_plan_engine_contracts.test.ts --no-cache --runInBand`
  - Result: 7 suites passed, 47 tests passed.

P1.11/P2.1 implementation status:

- Direct legacy API wiring remains blocked by shell access, so no blind imports were added.
- Blocker report created:
  - `docs/reports/personal-plans-recovery-integration-blocker-2026-06-01.md`
- Renderer contracts for the first three plan exercise types now exist in `app/personal_plan_exercise_renderer_contracts.ts`.
- This starts the product-facing exercise layer without building UI prematurely.
- Focused tests passed:
  - `npx jest --runTestsByPath tests/personal_plan_exercise_renderer_contracts.test.ts tests/personal_plan_recovery_apply_gate.test.ts tests/personal_plan_recovery_legacy_handlers.test.ts tests/personal_plan_recovery_applied_registry.test.ts tests/personal_plan_recovery_write_adapter.test.ts tests/personal_plan_recovery_actions.test.ts tests/personal_plan_attempt_events_storage.test.ts tests/personal_plan_engine_contracts.test.ts --no-cache --runInBand`
  - Result: 8 suites passed, 53 tests passed.

P2.2 implementation status:

- Renderer session contracts now exist in `app/personal_plan_exercise_session.ts`.
- A plan exercise can now be started from a validated `PlanExerciseBlock`.
- A submitted answer creates an attempt event, progress flag, explanation trigger, and recovery actions without rendering UI.
- This is the first usable runner contract for future premium exercise screens.
- Focused tests passed:
  - `npx jest --runTestsByPath tests/personal_plan_exercise_session.test.ts tests/personal_plan_exercise_renderer_contracts.test.ts tests/personal_plan_recovery_apply_gate.test.ts tests/personal_plan_recovery_legacy_handlers.test.ts tests/personal_plan_recovery_applied_registry.test.ts tests/personal_plan_recovery_write_adapter.test.ts tests/personal_plan_recovery_actions.test.ts tests/personal_plan_attempt_events_storage.test.ts tests/personal_plan_engine_contracts.test.ts --no-cache --runInBand`
  - Result: 9 suites passed, 58 tests passed.

P2.3 implementation status:

- Renderer session submissions can now be persisted through `app/personal_plan_exercise_submission_store.ts`.
- This creates a clean future UI boundary: answer submission returns a stored attempt, progress flag, explanation trigger, and recovery actions.
- Wrong answers are stored as evidence but do not apply legacy recovery writes yet.
- Focused tests passed:
  - `npx jest --runTestsByPath tests/personal_plan_exercise_submission_store.test.ts tests/personal_plan_exercise_session.test.ts tests/personal_plan_exercise_renderer_contracts.test.ts tests/personal_plan_recovery_apply_gate.test.ts tests/personal_plan_recovery_legacy_handlers.test.ts tests/personal_plan_recovery_applied_registry.test.ts tests/personal_plan_recovery_write_adapter.test.ts tests/personal_plan_recovery_actions.test.ts tests/personal_plan_attempt_events_storage.test.ts tests/personal_plan_engine_contracts.test.ts --no-cache --runInBand`
  - Result: 10 suites passed, 63 tests passed.

P2.4 implementation status:

- UI-ready view-model contracts now exist in `app/personal_plan_exercise_submission_view_model.ts`.
- Future screens can consume semantic result state instead of duplicating progress/recovery logic.
- This preserves the "no robotic UI" goal by keeping copy out of the engine and giving UI clean semantic states to render with product-quality text later.
- Focused tests passed:
  - `npx jest --runTestsByPath tests/personal_plan_exercise_submission_view_model.test.ts tests/personal_plan_exercise_submission_store.test.ts tests/personal_plan_exercise_session.test.ts tests/personal_plan_exercise_renderer_contracts.test.ts tests/personal_plan_recovery_apply_gate.test.ts tests/personal_plan_recovery_legacy_handlers.test.ts tests/personal_plan_recovery_applied_registry.test.ts tests/personal_plan_recovery_write_adapter.test.ts tests/personal_plan_recovery_actions.test.ts tests/personal_plan_attempt_events_storage.test.ts tests/personal_plan_engine_contracts.test.ts --no-cache --runInBand`
  - Result: 11 suites passed, 67 tests passed.

P2.5 implementation status:

- Block progress reducer now exists in `app/personal_plan_exercise_block_progress.ts`.
- Future plan UI can show honest block progress without duplicating attempt/progress rules.
- It deduplicates repeated correct attempts, ignores wrong/skipped for progress, and tracks remaining content units.
- Focused tests passed:
  - `npx jest --runTestsByPath tests/personal_plan_exercise_block_progress.test.ts tests/personal_plan_exercise_submission_view_model.test.ts tests/personal_plan_exercise_submission_store.test.ts tests/personal_plan_exercise_session.test.ts tests/personal_plan_exercise_renderer_contracts.test.ts tests/personal_plan_recovery_apply_gate.test.ts tests/personal_plan_recovery_legacy_handlers.test.ts tests/personal_plan_recovery_applied_registry.test.ts tests/personal_plan_recovery_write_adapter.test.ts tests/personal_plan_recovery_actions.test.ts tests/personal_plan_attempt_events_storage.test.ts tests/personal_plan_engine_contracts.test.ts --no-cache --runInBand`
  - Result: 12 suites passed, 72 tests passed.

P2.6 implementation status:

- Day progress reducer now exists in `app/personal_plan_exercise_day_progress.ts`.
- Future daily plan UI can consume one aggregate progress object instead of recalculating block attempts.
- This is the first solid base for the daily progress rail/card that the user wants to feel clear and expensive.
- Focused tests passed:
  - `npx jest --runTestsByPath tests/personal_plan_exercise_day_progress.test.ts tests/personal_plan_exercise_block_progress.test.ts tests/personal_plan_exercise_submission_view_model.test.ts tests/personal_plan_exercise_submission_store.test.ts tests/personal_plan_exercise_session.test.ts tests/personal_plan_exercise_renderer_contracts.test.ts tests/personal_plan_recovery_apply_gate.test.ts tests/personal_plan_recovery_legacy_handlers.test.ts tests/personal_plan_recovery_applied_registry.test.ts tests/personal_plan_recovery_write_adapter.test.ts tests/personal_plan_recovery_actions.test.ts tests/personal_plan_attempt_events_storage.test.ts tests/personal_plan_engine_contracts.test.ts --no-cache --runInBand`
  - Result: 13 suites passed, 77 tests passed.

P2.7 implementation status:

- Day view-model contract now exists in `app/personal_plan_exercise_day_view_model.ts`.
- Future daily plan screens can consume semantic state without embedding business rules.
- This prepares the premium UI layer while keeping copy and visual design separate.
- Focused tests passed:
  - `npx jest --runTestsByPath tests/personal_plan_exercise_day_view_model.test.ts tests/personal_plan_exercise_day_progress.test.ts tests/personal_plan_exercise_block_progress.test.ts tests/personal_plan_exercise_submission_view_model.test.ts tests/personal_plan_exercise_submission_store.test.ts tests/personal_plan_exercise_session.test.ts tests/personal_plan_exercise_renderer_contracts.test.ts tests/personal_plan_recovery_apply_gate.test.ts tests/personal_plan_recovery_legacy_handlers.test.ts tests/personal_plan_recovery_applied_registry.test.ts tests/personal_plan_recovery_write_adapter.test.ts tests/personal_plan_recovery_actions.test.ts tests/personal_plan_attempt_events_storage.test.ts tests/personal_plan_engine_contracts.test.ts --no-cache --runInBand`
  - Result: 14 suites passed, 82 tests passed.

P2.8 implementation status:

- Existing catalog days can now be mapped into the new exercise day view model through `app/personal_plan_day_exercise_view_model.ts`.
- This connects the engine work back to the current Personal Plans catalog without changing content or UI.
- The rejected Gavan scaffold remains blocked by passport readiness, which is important: the engine is advancing, but bad content is not being certified.
- Focused tests passed:
  - `npx jest --runTestsByPath tests/personal_plan_day_exercise_view_model.test.ts tests/personal_plan_exercise_day_view_model.test.ts tests/personal_plan_exercise_day_progress.test.ts tests/personal_plan_exercise_block_progress.test.ts tests/personal_plan_exercise_submission_view_model.test.ts tests/personal_plan_exercise_submission_store.test.ts tests/personal_plan_exercise_session.test.ts tests/personal_plan_exercise_renderer_contracts.test.ts tests/personal_plan_recovery_apply_gate.test.ts tests/personal_plan_recovery_legacy_handlers.test.ts tests/personal_plan_recovery_applied_registry.test.ts tests/personal_plan_recovery_write_adapter.test.ts tests/personal_plan_recovery_actions.test.ts tests/personal_plan_attempt_events_storage.test.ts tests/personal_plan_engine_contracts.test.ts tests/personal_plan_day_quality_gate.test.ts --no-cache --runInBand`
  - Result: 16 suites passed, 90 tests passed.

P2.9 implementation status:

- Direct lesson shell bridge remains blocked by shell access.
- Safe phrase build shell params contract now exists in `app/personal_plan_phrase_build_shell_contract.ts`.
- This lets future lesson-shell wiring know exactly what must be passed without touching lesson UI prematurely.
- Focused tests passed:
  - `npx jest --runTestsByPath tests/personal_plan_phrase_build_shell_contract.test.ts tests/personal_plan_day_exercise_view_model.test.ts tests/personal_plan_exercise_day_view_model.test.ts tests/personal_plan_exercise_day_progress.test.ts tests/personal_plan_exercise_block_progress.test.ts tests/personal_plan_exercise_submission_view_model.test.ts tests/personal_plan_exercise_submission_store.test.ts tests/personal_plan_exercise_session.test.ts tests/personal_plan_exercise_renderer_contracts.test.ts tests/personal_plan_recovery_apply_gate.test.ts tests/personal_plan_recovery_legacy_handlers.test.ts tests/personal_plan_recovery_applied_registry.test.ts tests/personal_plan_recovery_write_adapter.test.ts tests/personal_plan_recovery_actions.test.ts tests/personal_plan_attempt_events_storage.test.ts tests/personal_plan_engine_contracts.test.ts tests/personal_plan_day_quality_gate.test.ts --no-cache --runInBand`
  - Result: 17 suites passed, 95 tests passed.

P2.10 implementation status:

- Missing-word and choose-natural-phrase renderer params contracts now exist in `app/personal_plan_renderer_params_contracts.ts`.
- The first three renderer types now have pure params contracts before UI work begins.
- Focused tests passed:
  - `npx jest --runTestsByPath tests/personal_plan_renderer_params_contracts.test.ts tests/personal_plan_phrase_build_shell_contract.test.ts tests/personal_plan_day_exercise_view_model.test.ts tests/personal_plan_exercise_day_view_model.test.ts tests/personal_plan_exercise_day_progress.test.ts tests/personal_plan_exercise_block_progress.test.ts tests/personal_plan_exercise_submission_view_model.test.ts tests/personal_plan_exercise_submission_store.test.ts tests/personal_plan_exercise_session.test.ts tests/personal_plan_exercise_renderer_contracts.test.ts tests/personal_plan_recovery_apply_gate.test.ts tests/personal_plan_recovery_legacy_handlers.test.ts tests/personal_plan_recovery_applied_registry.test.ts tests/personal_plan_recovery_write_adapter.test.ts tests/personal_plan_recovery_actions.test.ts tests/personal_plan_attempt_events_storage.test.ts tests/personal_plan_engine_contracts.test.ts tests/personal_plan_day_quality_gate.test.ts --no-cache --runInBand`
  - Result: 18 suites passed, 101 tests passed.

Next:

1. P2.11: unified renderer params builder for the first three exercise types.
2. P2.12: first actual renderer bridge once shell/files are readable.
3. P2.2: explanation card display contract.
4. P2.3: daily workout selector with variety rules.
5. P3.1: premium plan screen UI redesign.
6. P3.2: listening asset shell.
7. P3.3: pronunciation MVP shell.
8. P4: `Gavan` week 1 content.

## Nonstandard Opportunities

- "Proof of progress" daily receipt: after a day, show 2-3 things the learner can now do.
- "Why today" explainer: one sentence explaining why tasks appeared.
- "Real-life unlock": after several days, show a short real situation the learner can now handle.
- "Confidence meter" based on successful recall, not fake AI confidence.
- "Phrase survival kit": each route has 10 phrases that are always available offline.
- "Not today" recovery: if the user is tired, offer a 2-minute save-the-streak workout that still respects learning quality.

## Operating Rule

Do not chase visual polish before the engine can prove learning value.

Do not write content before the gates can reject bad content.

Do not add AI/speech features with fake precision.

Do build one excellent vertical slice that feels human, useful, and premium.
## Implementation status 2026-06-01 - P2.11

Completed: unified renderer params builder for the first three Personal Plans exercise types.

Product value:
- The product can now ask for one generic "open this plan exercise" contract instead of hardcoding renderer-specific branching in future UI.
- Unsupported modes fail loudly with `missing_renderer_contract`, which protects the user experience from dead buttons.
- Plan exercises still keep the strict learning rules: no highlighted correct words, recovery enabled only where allowed, and plan-instance scoped params.

Verification:
- Passed focused Personal Plans gate: 19 suites, 106 tests.
- TypeScript full gate was attempted but blocked by the Windows sandbox process-spawn error.

Next best step:
Create a day-level adapter that turns all blocks for a day into openable renderer params plus blocked-block diagnostics. This prepares the real UI without touching the polished onboarding screens or production premium flow.
## Implementation status 2026-06-01 - P2.12

Completed: day-level renderer params adapter.

Product value:
- A plan day can now clearly tell future UI which tasks are ready to open and which are not implemented yet.
- This prevents the premium plan surface from showing dead buttons or silently routing users into the wrong mode.
- The adapter keeps diagnostics per block, which will help dev mode explain exactly why a future task is blocked.

Verification:
- Passed focused Personal Plans gate: 20 suites, 110 tests.
- Full TypeScript gate was attempted before and after the change, but process launch was blocked by the Windows sandbox.

Next best step:
Add a pure open-action contract above renderer params. The UI should receive a simple semantic action instead of knowing whether a block uses lesson shell, a plan renderer, or is blocked.
## Implementation status 2026-06-01 - P2.13

Completed: UI-agnostic day open-action contract.

Product value:
- Future task cards can receive one simple action instead of knowing renderer internals.
- Supported task types open through the correct system path.
- Unsupported future modes are explicitly blocked, so the app can show a clean dev/diagnostic state instead of a broken user action.
- Task order stays identical to the authored day order.

Verification:
- Passed focused Personal Plans gate: 21 suites, 114 tests.
- Full TypeScript gate was attempted before and after the change, but process launch was blocked by the Windows sandbox.

Next best step:
Build a task surface model that combines progress and open actions. That is the last contract layer before a production-quality plan day UI can consume the system cleanly.
## Implementation status 2026-06-01 - P2.14

Completed: day task surface model.

Product value:
- The future plan-day UI can now consume one clean model instead of manually joining progress, blocked states, and open actions.
- Task cards can be rendered from semantic states: `available`, `completed`, `needs_retry`, and `blocked`.
- This protects the premium experience from robotic/dev-like logic leaking into the interface.

Verification:
- Passed focused Personal Plans gate: 22 suites, 119 tests.
- The first test run exposed an incomplete attempt-event fixture and it was fixed to match the real event contract more closely.
- Full TypeScript gate was attempted before and after the change, but process launch was blocked by the Windows sandbox.

Next best step:
Add a readiness gate for the task surface model before connecting it to UI. This gate should prove every task card has enough safe data to render.
## Implementation status 2026-06-01 - P2.15

Completed: task surface readiness gate.

Product value:
- The future plan interface now has a quality gate before rendering task cards.
- Broken data is caught as explicit product diagnostics instead of leaking as empty buttons, missing titles, or dead actions.
- This is a key step toward making Personal Plans feel premium rather than developer-like.

Verification:
- Passed focused Personal Plans gate: 23 suites, 125 tests.
- A negative test fixture was corrected after TypeScript correctly rejected an impossible action shape.
- Full TypeScript gate was attempted before and after the change, but process launch was blocked by the Windows sandbox.

Next best step:
Wrap the surface model and readiness gate into one bundle builder so UI has exactly one safe entry point.
## Implementation status 2026-06-01 - P2.16

Completed: task surface bundle builder.

Product value:
- Future UI now has one clean entry point: build model, validate readiness, and check `canRender`.
- This reduces duplicated UI logic and keeps product screens from knowing internal engine details.
- Blocked tasks can still be rendered safely when they are correctly described.

Verification:
- Passed focused Personal Plans gate: 24 suites, 130 tests.
- Full TypeScript gate was attempted before and after the change, but process launch was blocked by the Windows sandbox.

Next best step:
Move from pure contracts toward integration discovery. The next pass should inspect where the existing plan/dev screen consumes day tasks and connect the bundle only if the path is clear.
## Implementation status 2026-06-01 - P2.17

Completed: integration discovery attempt and blocker report.

Product value:
- The system did not risk a blind UI edit.
- Likely integration files were identified, but not edited because they could not be read.
- The blocker report records the exact retry path so the next pass can continue cleanly.

Verification:
- Passed focused Personal Plans gate: 24 suites, 130 tests.
- Full TypeScript gate and file searches were blocked by the Windows sandbox process-spawn error.

Next best step:
Retry reading `app/personal_plan.tsx` and `app/personal_plan_catalog.ts`. If access remains blocked, build a pure input resolver contract so the UI integration requirements are explicit before touching screens.
## Implementation status 2026-06-01 - P2.18

Completed: task surface input resolver.

Product value:
- The future UI integration now has a strict contract for what data it must pass into the Personal Plans task surface.
- Bad integration data is rejected before it can produce broken task cards.
- This keeps us moving safely while direct screen-file access is unstable.

Verification:
- Passed focused Personal Plans gate: 25 suites, 135 tests.
- Full TypeScript gate and file reads were blocked by the Windows sandbox process-spawn error.

Next best step:
Add a combined entry point that resolves raw UI input and then builds the task surface bundle only when the input is ready.
## Implementation status 2026-06-01 - P2.19

Completed: unresolved input to task surface bundle entry point.

Product value:
- Future UI can call one safe function with raw integration data.
- Bad input stops before bundle creation.
- Good input produces a renderable task surface bundle.
- This keeps the plan UI path simple and protects it from lower-level engine details.

Verification:
- Passed focused Personal Plans gate: 26 suites, 140 tests.
- Full TypeScript gate was attempted before and after the change, but process launch was blocked by the Windows sandbox.

Next best step:
Create a small public API module for the task surface so future UI imports one stable entry point instead of reaching into internal layers.
## Implementation status 2026-06-01 - P2.20

Completed: public task surface API module.

Product value:
- Future UI now has a single stable import path for Personal Plans task surface data.
- This reduces accidental coupling to internal renderer/progress/gate layers.
- The API keeps the product path clean: raw input in, safe render decision and model out.

Verification:
- Passed focused Personal Plans gate: 27 suites, 144 tests.
- Full TypeScript gate was attempted before and after the change, but process launch was blocked by the Windows sandbox.

Import recipe:

```ts
import { buildPlanDayTaskSurfaceFromInput } from './personal_plan_task_surface_api';
```

Next best step:
Retry production UI integration, but only through the public API module. No lower-level task surface imports should be added to UI screens.
## Implementation status 2026-06-01 - P2.21

Completed: public API integration retry and blocker update.

Product value:
- The codebase avoided another blind UI edit.
- The integration path is now explicit: future UI must use `personal_plan_task_surface_api`.
- Since UI file access is blocked, the best next work should move to content quality rules, where we can keep improving the product without risking screens.

Verification:
- Passed focused Personal Plans gate: 27 suites, 144 tests.
- TypeScript/file-read commands were blocked by the Windows sandbox.

Next best step:
Start P3.1: content reset rules for Harbor/week 1. The product should reject niche, awkward, or over-specific phrases before they enter the plan catalog.
## Implementation status 2026-06-01 - P3.1

Completed: content reset quality contract.

Product value:
- The plan content pipeline can now reject phrases that feel too niche, too personal, too formal, or too developer-like.
- Explanations must teach actual visible material and cannot invent wrong variants the learner did not see.
- This directly addresses the quality reset needed before rewriting Harbor/week 1 content.

Verification:
- Passed focused Personal Plans gate: 28 suites, 150 tests.
- Full TypeScript gate was attempted before and after the change, but process launch was blocked by the Windows sandbox.

Next best step:
Add a day-level content gate, then use it before touching the real catalog.
## Implementation status 2026-06-01 - P3.2

Completed: day-level content quality gate.

Product value:
- A whole plan day can now be rejected before it reaches the catalog.
- Day 1 is protected from narrow, personal-data-heavy content.
- Phrase-level explanation problems are visible in a day summary, which makes content review practical.

Verification:
- Passed focused Personal Plans gate: 29 suites, 155 tests.
- Full TypeScript gate was attempted before and after the change, but process launch was blocked by the Windows sandbox.

Next best step:
Add a week-level Harbor blueprint gate so week 1 has variety, sensible progression, and no repeated narrow scenario overload.
## Implementation status 2026-06-01 - P3.3

Completed: week-level Harbor content blueprint gate.

Product value:
- Harbor week 1 can now be evaluated as a full learning arc instead of disconnected phrases.
- The gate protects against repeated narrow scenarios and low-variety weeks.
- This is the quality layer needed before writing real week content.

Verification:
- Initial focused gate passed: 30 suites, 161 tests.
- Hardening pass added checks for missing week identity, duplicate day ids, duplicate day indexes, invalid day order, plan-id mismatch, and narrow overload hidden in exercise goals.
- Current full Personal Plans gate: 46 suites, 228 tests passed.
- Current TypeScript gate passed: `npx tsc --noEmit --pretty false`.

Next best step:
Create a non-production Harbor week 1 blueprint draft fixture and prove it passes the week gate before touching the live catalog.
## Implementation status 2026-06-01 - P3.4

Completed: non-production Harbor/Gavan week 1 blueprint draft validation.

Product value:
- We now have a safe week-1 content direction outside the live catalog.
- The week starts broad: being here, needing a minute, asking to repeat, saying you do not understand, asking for help, confirming, answering shortly, and reviewing.
- The content avoids the old failure pattern: no exact phone/email/name/address, no apartment-first opening, no narrow personal-data start.
- Every phrase has explanation coverage for new words and first-seen constructions.
- A negative regression proves that a similar week with phone-number content and repeated `rent` overload fails.

Verification:
- Focused blueprint/content tests passed: 4 suites, 25 tests.
- Full Personal Plans suite passed: 47 suites, 234 tests.
- TypeScript passed: `npx tsc --noEmit --pretty false`.

Next best step:
P3.5 should add a non-production authoring passport for week 1: exercise mix, load by 5/10/15/20 minutes, audio/pronunciation placeholders, and day-by-day learning outcomes. Do this before editing `personal_plan_catalog.ts`, because phrase quality alone is not enough to create a premium daily workout.
## Implementation status 2026-06-01 - P3.4

Completed: Harbor week 1 blueprint draft validation.

Product value:
- There is now a tested non-production week 1 draft that behaves like a quality baseline before touching live catalog content.
- The draft proves that week-level gates can accept a broad, modern, non-narrow first week.
- The process caught and fixed a missing explanation for `I need`, which is exactly the kind of content-quality issue the product must catch automatically.

Verification:
- Focused blueprint/content gate: 4 suites, 25 tests.
- Full Personal Plans focused gate: 47 suites, 234 tests.
- Full TypeScript gate was attempted after the change, but process launch was blocked by the Windows sandbox.

Next best step:
Inspect live catalog shape and design the blueprint-to-catalog adapter before replacing any production content.
## Implementation status 2026-06-01 - P3.5

Completed: non-production Harbor/Gavan week 1 authoring passport.

Product value:
- The week is no longer just a phrase list; it now has a tested daily workout shape.
- Each day has a learning outcome, exercise mix, and load for exactly the four onboarding choices: 5, 10, 15, and 20 minutes.
- The passport protects the first day from narrow-scenario exercise tags.
- Listening and pronunciation are represented honestly as placeholders, not as fake final audio assets or fake scoring.
- This is closer to a premium product loop: short task for 5 minutes, fuller workout for 15/20, with variety across build, choose, listen, recall, quiz, and future pronunciation.

Verification:
- Focused authoring tests passed: 2 suites, 13 tests.
- Full Personal Plans suite passed: 48 suites, 241 tests.
- TypeScript passed: `npx tsc --noEmit --pretty false`.

Next best step:
P3.6 should convert the non-production blueprint + authoring passport into draft `PlanExerciseBlock` candidates and validate those candidates through existing engine gates. This still must not edit the live catalog; the goal is to prove the content can become real app tasks before production replacement.

## Implementation status 2026-06-01 - P3.6

Completed: non-production Harbor/Gavan week 1 draft exercise block conversion.

Product value:
- The plan week is now closer to an executable daily workout, not just a phrase document.
- Every convertible authoring block becomes a typed `PlanExerciseBlock` candidate that can be checked by the engine.
- The converter keeps minute-load truth from onboarding: 5, 10, 15, and 20 minutes map to `requiredFor`.
- Pronunciation placeholders stay honest: they are excluded as future requirements and cannot masquerade as production-ready blocks.
- This follows the competitor lesson from Duolingo/Memrise/Busuu/ELSA research: a premium plan needs mixed exercises, honest feedback loops, real media requirements, and no fake readiness.

Files:
- `app/personal_plan_harbor_week1_draft_blocks.ts`
- `tests/personal_plan_harbor_week1_draft_blocks.test.ts`
- `tests/personal_plan_harbor_week1_authoring_passport.test.ts`

Quality gate:
- Focused draft-block tests passed: 1 suite, 6 tests.
- Full Personal Plans suite passed: 50 suites, 256 tests.
- TypeScript passed: `npx tsc --noEmit --pretty false`.

Design/UX note:
- The next UI pass should follow the mobile task-card principles found in the design audit: 44px+ touch targets, clear progress, one obvious primary action, no crowded tap areas, and theme-aware premium depth.

Next best step:
P3.7 should add a package-readiness gate before catalog edits:
- every `plan_quiz` block must point to a draft quiz requirement of 10 questions;
- every listening block must have an audio asset requirement or explicit placeholder;
- every pronunciation placeholder must be listed as intentionally blocked until scoring exists;
- every generated block must have a renderer readiness status;
- no live catalog, onboarding, premium, or UI edits yet.

## Implementation status 2026-06-01 - P3.7

Completed: non-production Harbor/Gavan week 1 package readiness gate.

Product value:
- The system now separates "we have exercise blocks" from "this package is ready to become product content".
- This blocks a major product-quality failure: quiz/listening/pronunciation tasks cannot sneak into the plan as vague promises.
- Quiz blocks must declare 10-question requirements.
- Listening blocks must declare audio requirements, but only as placeholder requirements until real generated audio exists.
- Pronunciation placeholders remain visible as blocked future work and cannot claim scoring readiness.
- Renderer readiness is explicit per block, so future UI can render supported tasks and explain blocked tasks cleanly.

Files:
- `app/personal_plan_harbor_week1_package_readiness.ts`
- `tests/personal_plan_harbor_week1_package_readiness.test.ts`

Quality gate:
- Focused package-readiness tests passed: 1 suite, 6 tests.
- Full Personal Plans suite passed: 51 suites, 262 tests.
- TypeScript passed: `npx tsc --noEmit --pretty false`.

Research/UX note:
- Duolingo's Practice Hub and spaced repetition point toward explicit mistake/review loops, but the package gate keeps Phraseman from becoming generic repetition.
- Memrise's audio/video strength means listening must be asset-backed, not just "we will play something later".
- Busuu's lesson-connected conversations support our rule that advanced tasks need prerequisites and feedback requirements.
- ELSA's pronunciation positioning supports the honesty rule: no fake pronunciation readiness until scoring and feedback are real.
- UI direction remains: large tactile task cards, one primary action, theme-aware glass/depth, 44px+ touch targets, visible daily progress, no clutter.

Next best step:
P3.8 should create the first non-production Gavan day 1 package draft:
- take only day 1 blocks;
- attach quiz draft requirements;
- attach renderer readiness;
- attach explanation-card requirements for every phrase/new word;
- keep listening/pronunciation as explicit future requirements where absent;
- still do not edit live catalog, onboarding, Premium, or Home UI.

## Implementation status 2026-06-01 - P3.8

Completed: first non-production Gavan day 1 package draft.

Product value:
- Day 1 now exists as a package candidate, not just separate phrase/block/readiness pieces.
- The package uses the draft blocks from P3.6 and the readiness gate from P3.7.
- The day 1 quiz block is required to have exactly 10 draft questions.
- Every new word and first-seen construction from day 1 has an explanation requirement.
- Missing explanation coverage fails before content can move toward a live registry.
- Fake final audio/pronunciation claims fail.

Files:
- `app/personal_plan_gavan_day1_package_draft.ts`
- `tests/personal_plan_gavan_day1_package_draft.test.ts`

Quality gate:
- Focused day 1 package draft tests passed: 1 suite, 5 tests.
- Full Personal Plans suite passed: 52 suites, 267 tests.
- TypeScript command was attempted after P3.8, but shell failed with `windows sandbox: spawn setup refresh`; rerun it first in P3.9.

Next best step:
P3.9 should define the day 1 quiz requirement shape in detail:
- 10 draft items;
- user-facing task instruction copy;
- item source phrase ids;
- answer-choice structure;
- per-choice explanation requirements;
- no invented wrong-option explanation;
- still outside `personal_plan_quizzes.ts`.
## Implementation status 2026-06-01 - P3.9

Completed: non-production Gavan day 1 quiz draft requirement model.

Product value:
- Day 1 now has a concrete 10-question quiz draft shape instead of only a vague "quiz required" flag.
- Each item is tied to one of the universal day 1 source phrases, so old narrow identity/address content cannot slip back in.
- Every answer choice carries an explanation requirement, which lets the future UI show helpful feedback without generic or robotic copy.
- Wrong-choice feedback is guarded: authored text cannot claim "you chose..." unless the runtime explanation system explicitly receives selected-answer context.
- The live quiz registry stays untouched until the draft passes the next package integration gate.

Files:
- `app/personal_plan_gavan_day1_quiz_draft.ts`
- `tests/personal_plan_gavan_day1_quiz_draft.test.ts`

Quality gate:
- TypeScript baseline before edits passed: `npx tsc --noEmit --pretty false`.
- Focused quiz-draft tests passed: 1 suite, 6 tests.
- Full Personal Plans suite passed: 53 suites, 273 tests.
- TypeScript after edits passed: `npx tsc --noEmit --pretty false`.

Research synthesis:
- Duolingo's useful pattern is not just repetition; it is short diagnostic loops tied to spaced review.
- Memrise's useful pattern is contextual word information and natural media, so quiz feedback must teach words like `here`, `need`, and `minute` instead of just saying "wrong".
- Busuu's useful pattern is structured practice after explanation, so every quiz item must point back to a taught phrase.
- ELSA's useful pattern is precise feedback; Phraseman should apply that same precision to phrase choice and later to pronunciation.

Next best step:
P3.10 should connect the P3.9 quiz draft into the day 1 package draft:
- package draft exposes quiz item count and explanation-requirement count;
- package gate fails if the draft quiz is invalid;
- still no live registry edit;
- then P3.11 can start the runtime explanation-card adapter for phrase/quiz feedback.

## Implementation status 2026-06-01 - P3.31

Completed: honest listening authoring requirements for clean Gavan day 1.

Product value:
- Listening is now a real planned capability, not a fake media promise.
- Gavan day 1 can declare five future listening prompts tied to the same universal-first phrase set.
- Every listening prompt is grounded in phrase id and exact target text, so future audio generation cannot drift away from authored content.
- Placeholder audio is allowed for authoring only.
- If listening is attached as required, release evidence blocks production until approved audio exists.
- The current default day 1 candidate release still treats audio as `not_required`; no user-facing flow changes yet.

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
- Duolingo listening guidance supports scaffolded listening that starts with text support and gradually removes it.
- Memrise reinforces the need for concrete phrase-level media instead of generic audio decoration.
- Busuu reinforces low-pressure speaking/listening practice with feedback; Phraseman should block production until the actual media and feedback loop exist.

Next best step:
P3.32 should create pronunciation authoring requirements:
- phrase-level pronunciation targets;
- blocked scoring requirement by default;
- no fake microphone scoring;
- optional release-gate simulation only;
- no live UI/catalog/onboarding/Premium edits.

## Implementation status 2026-06-01 - P3.32

Completed: honest pronunciation authoring requirements for clean Gavan day 1.

Product value:
- Pronunciation can now be designed at phrase level without pretending that a final scoring engine already exists.
- Gavan day 1 declares five future pronunciation targets tied to the same universal-first phrase set.
- Every pronunciation target is grounded in phrase id and exact target text, so future microphone/scoring work cannot drift from authored content.
- Blocked scoring is allowed for authoring only.
- If pronunciation is attached as required, release evidence blocks production until real scoring metadata exists.
- The current default day 1 candidate release still treats pronunciation as `not_required`; no user-facing flow changes yet.

Files:
- `app/personal_plan_gavan_day1_pronunciation_authoring.ts`
- `tests/personal_plan_gavan_day1_pronunciation_authoring.test.ts`

Quality gate:
- Red test first failed on the missing module.
- Focused pronunciation authoring tests passed: 1 suite, 7 tests.
- Focused pronunciation/readiness/bridge/release tests passed: 4 suites, 39 tests.
- Full Personal Plans suite passed: 66 suites, 386 tests.
- TypeScript passed: `npx tsc --noEmit --pretty false`.
- Production source guard passed.
- Encoding guard passed.

Research synthesis:
- Duolingo-style speaking practice keeps friction low, but Phraseman should not copy the weakest pattern: scoring that feels arbitrary.
- ELSA's value is perceived precision, so Phraseman must wait for real scorer metadata before promising pronunciation assessment.
- Busuu's useful speaking pattern is guided practice with clear purpose; Phraseman now stores that purpose at phrase level.
- Memrise-style phrase usefulness still matters: pronunciation targets must be the exact phrases a person will actually need, not isolated sound drills.

Next best step:
P3.33 should build a combined day 1 authoring readiness bundle:
- one reviewer-facing object for content, quiz, explanations, listening, pronunciation, release evidence, and current blockers;
- one test suite proving the bundle stays non-production;
- no live UI, catalog, quiz registry, onboarding, Premium, or Home edits.

## Implementation status 2026-06-01 - P3.33

Completed: combined authoring readiness bundle for clean Gavan day 1.

Product value:
- The team can now inspect the whole day as one learning product unit.
- Content, quiz, explanations, listening, pronunciation, and release evidence are no longer scattered across separate checks only.
- The reviewer checklist makes the current state readable: content/package/quiz/explanations can be ready while media authoring can stay planned or blocked.
- This is the correct foundation for a future internal reviewer/dev screen, because it is read-only and does not mutate production routes.

Files:
- `app/personal_plan_gavan_day1_authoring_bundle.ts`
- `tests/personal_plan_gavan_day1_authoring_bundle.test.ts`

Quality gate:
- Red test first failed on the missing module.
- Focused authoring bundle tests passed: 1 suite, 6 tests.
- Focused bundle/listening/pronunciation/release tests passed: 4 suites, 28 tests.
- Full Personal Plans suite passed: 67 suites, 392 tests.
- TypeScript passed: `npx tsc --noEmit --pretty false`.
- Production source guard passed.
- Encoding guard passed.

Research synthesis:
- Strong learning apps keep each day understandable as a product unit, not just as a list of exercises.
- Duolingo's strength is visible progression and clear next action; Phraseman needs that same clarity in internal authoring before exposing anything to users.
- Busuu and ELSA both show that feedback/media features must be trusted; the bundle makes unfinished media blockers explicit.
- Memrise-style usefulness depends on phrase grounding; the bundle keeps media targets tied to the same phrase ids and exact target text.

Next best step:
P3.34 should define a production-safe adapter plan for future reviewer/dev surfaces:
- one read-only adapter from bundle to display-ready rows/cards;
- no user-facing UI yet;
- no Home/onboarding/Premium/catalog/quiz registry changes;
- no fake audio or pronunciation claims.

## Implementation status 2026-06-01 - P3.34

Completed: production-safe authoring display adapter for future reviewer/dev surfaces.

Product value:
- The future internal surface can now render one stable set of cards without reaching into low-level bundle internals.
- Planned media does not look finished.
- Blocked media shows exact blockers instead of vague "not ready" states.
- The release card carries the same release decision that the bundle produced.
- This keeps the product honest while still making the authoring system easier to review.

Files:
- `app/personal_plan_gavan_day1_authoring_display_adapter.ts`
- `tests/personal_plan_gavan_day1_authoring_display_adapter.test.ts`

Quality gate:
- Red test first failed on the missing module.
- Focused display adapter tests passed: 1 suite, 6 tests.
- Focused display adapter + bundle tests passed: 2 suites, 12 tests.
- Full Personal Plans suite passed: 68 suites, 398 tests.
- TypeScript passed: `npx tsc --noEmit --pretty false`.
- Production source guard passed.
- Encoding guard passed.

Research synthesis:
- Strong learning products make progress and blockers legible before they make them decorative.
- Duolingo-like clarity comes from obvious states and next actions; this adapter creates the state model before the visual layer.
- Busuu/ELSA-style trust depends on feedback honesty; the adapter blocks fake audio/scoring claims from becoming visible reviewer copy.
- The next bottleneck is no longer structure. It is human-quality wording in explanations and quiz copy.

Next best step:
P3.35 should run a clean content QA pass for Gavan day 1:
- explanation text quality;
- quiz prompt quality;
- quiz explanation notes;
- no robotic/dev/corrupted copy;
- no invented answer-specific feedback without runtime context.

## Implementation status 2026-06-01 - P3.35

Completed: first clean content QA pass for Gavan day 1 explanation and quiz copy.

Product value:
- Quiz feedback is less formulaic and less obviously generated.
- Explanation cards now have a stronger style contract: enough detail to teach, short enough to read in the exercise flow.
- The QA gate protects future content expansion from drifting back into cramped notes, robotic confirmations, or corrupted copy.
- The day remains non-production and outside live registries.

Files:
- `app/personal_plan_gavan_day1_quiz_draft.ts`
- `tests/personal_plan_gavan_day1_content_candidate.test.ts`
- `tests/personal_plan_gavan_day1_quiz_draft.test.ts`

Quality gate:
- Focused content/quiz tests passed: 2 suites, 27 tests.
- Focused content/quiz/bundle/display tests passed: 4 suites, 39 tests.
- Full Personal Plans suite passed: 68 suites, 400 tests.
- TypeScript passed: `npx tsc --noEmit --pretty false`.
- Production source guard passed.
- App-level encoding guard passed.
- `Да:` guard passed for candidate quiz draft.

Research synthesis:
- Strong language apps feel hand-authored even when content is generated through a pipeline.
- Repetitive feedback formulas are one of the fastest ways to make a premium learning feature feel cheap.
- The Personal Plans pipeline needs gates for tone and usefulness, not only structural correctness.

Next best step:
P3.36 should create a reviewer export fixture:
- cards from the display adapter;
- phrase explanation snippets;
- quiz prompt and note snippets;
- manual review status;
- no live integration.

## Implementation status 2026-06-01 - P3.36

Completed: reviewer export fixture for clean Gavan day 1.

Product value:
- The plan pipeline now has a clear human-review artifact before any learner sees the content.
- Reviewer output includes the exact words that matter: phrase explanations, quiz prompts, and quiz feedback notes.
- Nothing is silently approved. All 45 review snippets stay pending manual review.
- This protects the feature from the exact failure mode identified in the chat: technically valid content that still feels generic, robotic, or poorly authored.
- The fixture can feed a future reviewer/dev surface without coupling that surface to internal package or quiz internals.

Files:
- `app/personal_plan_gavan_day1_reviewer_export_fixture.ts`
- `tests/personal_plan_gavan_day1_reviewer_export_fixture.test.ts`

Quality gate:
- Red test first failed on the missing module.
- Focused reviewer export tests passed: 1 suite, 6 tests.
- Focused reviewer/content/quiz/display tests passed: 4 suites, 39 tests.
- Full Personal Plans suite passed: 69 suites, 406 tests.
- TypeScript passed: `npx tsc --noEmit --pretty false`.
- Source guard passed.
- Encoding guard passed.
- `Да:` guard passed.

Research synthesis:
- Premium learning products need quality checkpoints that feel editorial, not only technical.
- Duolingo-like polish comes from repeatable content gates and consistent feedback behavior.
- Busuu and ELSA-style trust depends on not overstating readiness. This fixture keeps review status explicit and prevents unfinished content from looking approved.
- A strong Personal Plans system should treat content approval as a first-class production step, not an afterthought.

Next best step:
P3.37 should add an approval gate around the reviewer export fixture:
- define approval records;
- require every phrase explanation, quiz prompt, and quiz note to be approved before production bridging;
- fail if any snippet changes after approval;
- stay outside UI, storage, live catalog, and live quiz registry.

## Implementation status 2026-06-01 - P3.37

Completed: approval gate for clean Gavan day 1 reviewer export.

Product value:
- Approval is now a real product-quality checkpoint.
- The system can prove which exact text was reviewed, who reviewed it, and when it was approved.
- The checksum protects against silent post-review edits.
- Partial approval cannot pass.
- Unknown snippets cannot sneak into the approval set.
- Approved export cannot contain pending snippets.
- This makes the Personal Plans pipeline feel closer to an editorial product workflow than a loose generator output.

Files:
- `app/personal_plan_gavan_day1_reviewer_approval_gate.ts`
- `tests/personal_plan_gavan_day1_reviewer_approval_gate.test.ts`

Quality gate:
- Red test first failed on the missing module.
- Focused approval gate tests passed: 1 suite, 6 tests.
- Focused approval/reviewer/content/quiz/display tests passed: 5 suites, 45 tests.
- Full Personal Plans suite passed: 70 suites, 412 tests.
- TypeScript passed: `npx tsc --noEmit --pretty false`.
- Source guard passed.
- Encoding guard passed.
- `Да:` guard passed.

Research synthesis:
- Strong learning products do not only generate content; they preserve trust in content.
- The approval gate closes a common weakness of AI-assisted course pipelines: text can change after review without anyone noticing.
- Competitor-level polish depends on repeatable editorial gates before UI polish.
- For Phraseman, this is especially important because Personal Plans are a premium promise, not a free experimental mode.

Next best step:
P3.38 should build a human-readable approved export report:
- exact approved snippets;
- approval metadata;
- checksum values;
- display/release summary;
- still no production integration.

## Implementation status 2026-06-01 - P3.38

Completed: human-readable approved export report builder for clean Gavan day 1.

Product value:
- Approved content can now be inspected as a coherent report instead of scattered TypeScript objects.
- The report shows exact approved text, reviewer id, approval timestamp, and checksum.
- This is the product-quality bridge between authoring and future production integration.
- It protects against a weak premium experience by making every approved learner-facing line visible and auditable.
- The report still does not publish anything to the app, which keeps the pipeline honest.

Files:
- `app/personal_plan_gavan_day1_approved_export_report.ts`
- `tests/personal_plan_gavan_day1_approved_export_report.test.ts`

Quality gate:
- Red test first failed on the missing module.
- Focused approved report tests passed: 1 suite, 7 tests.
- Focused report/approval/reviewer export tests passed: 3 suites, 19 tests.
- Full Personal Plans suite passed: 71 suites, 419 tests.
- TypeScript passed: `npx tsc --noEmit --pretty false`.
- Source guard passed.
- Encoding guard passed.
- `Да:` guard passed.

Research synthesis:
- Premium education products need editorial visibility, not invisible data pipes.
- A human-readable approved report creates accountability before UI polish and production registry changes.
- This keeps the system from drifting into a generator-first workflow where technically valid content ships without product judgment.

Next best step:
P3.39 should write the approved report to a non-production artifact:
- deterministic JSON;
- saved under `.codex-tmp` or `docs/reports`;
- tested for no live-source writes;
- still no production integration.

## Implementation status 2026-06-01 - P3.39

Completed: non-production approved report artifact writer.

Product value:
- The approved report can now become a real JSON artifact for human inspection.
- The writer is deterministic, so repeated exports are comparable.
- The writer refuses to write into app source, tools, tests, or root config files.
- Report validation happens before any file is created.
- This keeps the premium content pipeline careful: approval first, inspectable artifact second, production bridge later.

Files:
- `tools/personal_plan_gavan_day1_approved_report_artifact.ts`
- `tests/personal_plan_gavan_day1_approved_report_artifact.test.ts`

Quality gate:
- Red test first failed on the missing module.
- Focused artifact writer tests passed: 1 suite, 6 tests.
- Focused artifact/report/approval/reviewer export tests passed: 4 suites, 25 tests.
- Full Personal Plans suite passed: 72 suites, 425 tests.
- TypeScript passed: `npx tsc --noEmit --pretty false`.
- Source guard passed.
- Encoding guard passed.
- `Да:` guard passed.

Research synthesis:
- A premium course pipeline needs a final inspectable artifact before code integration.
- Deterministic JSON makes review repeatable and diffable.
- Keeping the writer outside app runtime avoids mixing authoring tools with learner-facing product code.

Next best step:
P3.40 should generate the first approved-report JSON artifact under `.codex-tmp` and audit it:
- readability;
- grouped rows;
- totals;
- checksum presence;
- no production integration.

## Implementation status 2026-06-01 - P3.40

Completed: generated clean approved-report artifact for Gavan day 1.

Product value:
- The approved day is no longer only an internal TypeScript chain; it now has a real review artifact.
- A human can inspect exact learner-facing rows, reviewer metadata, checksums, totals, and grouped content in one JSON file.
- The artifact proves the pipeline can produce a stable inspection package before any production bridge.
- This supports a premium-quality workflow: content is authored, reviewed, checksummed, exported, and inspected before it can reach the app.
- The artifact still does not publish anything to live app data.

Files:
- `tools/personal_plan_gavan_day1_generated_artifact.ts`
- `tests/personal_plan_gavan_day1_generated_artifact.test.ts`
- `.codex-tmp/personal-plans/gavan-day1-approved-report.json`

Quality gate:
- Red test first failed on the missing module.
- Focused generated artifact tests passed: 1 suite, 6 tests.
- Focused generated-artifact/artifact-writer/report/approval tests passed: 5 suites, 31 tests.
- Full Personal Plans suite passed: 73 suites, 431 tests.
- TypeScript passed: `npx tsc --noEmit --pretty false`.
- Source guard passed.
- Encoding guard passed.
- `Да:` guard passed.
- Generated artifact exists at 25,631 bytes.

Research synthesis:
- A high-trust learning product needs editorial review artifacts, not only dynamic generators.
- Checksums and exact text protect against silent content drift after approval.
- The next quality layer must evaluate tone, clarity, and explanation usefulness, because valid data can still be weak product copy.

Next best step:
P3.41 should add a stricter product-copy audit gate:
- scan generated approved rows;
- fail developer-like, robotic, corrupted, repetitive, or fake-context copy;
- require explanation rows to be helpful enough for a real learner;
- keep the gate non-production until the content passes.

## Implementation status 2026-06-01 - P3.41

Completed: stricter product-copy gate for generated approved artifact rows.

Product value:
- The pipeline now has a real editorial brake before production bridge.
- The gate treats generated rows as learner-facing copy, not merely as valid JSON.
- It catches issues that are invisible to structural validation: robotic wording, developer copy, mojibake, fake selected-answer context, repetitive starts, thin explanations, and technical metadata leaking into text.
- The current Gavan day 1 artifact is correctly blocked because phrase explanation rows include technical covered-target tails in `exactText`.
- This prevents a premium feature from shipping with "almost right" content that would feel unfinished to a learner.

Files:
- `tools/personal_plan_gavan_day1_artifact_copy_audit.ts`
- `tests/personal_plan_gavan_day1_artifact_copy_audit.test.ts`

Quality gate:
- Red test first failed on the missing module.
- Focused copy-audit tests passed: 1 suite, 5 tests.
- Focused copy-audit/generated-artifact/artifact-writer/report/approval tests passed: 6 suites, 36 tests.
- Full Personal Plans suite passed: 74 suites, 436 tests.
- TypeScript passed: `npx tsc --noEmit --pretty false`.
- Source guard passed.
- Encoding guard passed.

Research synthesis:
- Strong learning products need a separation between teaching text and internal metadata.
- Quality gates should not only ask "is data valid?" but also "would a real learner understand and trust this?"
- Blocking bad copy early is cheaper than polishing UI around weak content later.

Next best step:
P3.42 should clean the approved report exactText assembly:
- remove technical covered-target tails from learner-facing text;
- preserve target metadata separately;
- regenerate the artifact;
- require the product-copy gate to pass before any production bridge draft.

## Implementation status 2026-06-01 - P3.42

Completed: learner-facing `exactText` cleanup for approved report and generated artifact.

Product value:
- Phrase explanation rows no longer leak internal target metadata into learner-facing text.
- A learner or reviewer now sees a clean explanation sentence, while the system still keeps `coveredTargets` as structured metadata.
- Checksum validation remains deterministic and catches changed learner-facing text.
- The product-copy artifact gate now passes on the regenerated artifact.
- This makes the day materially closer to a real premium content pipeline: clean copy, separate metadata, validated artifact.

Files:
- `app/personal_plan_gavan_day1_approved_export_report.ts`
- `app/personal_plan_gavan_day1_reviewer_approval_gate.ts`
- `app/personal_plan_gavan_day1_reviewer_export_fixture.ts`
- `tests/personal_plan_gavan_day1_approved_export_report.test.ts`
- `tests/personal_plan_gavan_day1_generated_artifact.test.ts`
- `tests/personal_plan_gavan_day1_artifact_copy_audit.test.ts`
- `.codex-tmp/personal-plans/gavan-day1-approved-report.json`

Quality gate:
- Red tests first failed on the old technical-tail behavior.
- Focused report/copy-audit/generated-artifact/approval tests passed: 5 suites, 32 tests.
- Full Personal Plans suite passed: 74 suites, 438 tests.
- TypeScript passed: `npx tsc --noEmit --pretty false`.
- Source guard passed.
- Encoding guard passed.
- Artifact inspection confirmed first phrase `exactText` no longer ends with `here I'm`.
- Artifact inspection confirmed `coveredTargets` remain as metadata.

Research synthesis:
- Premium UX starts before UI: content data must separate what the learner reads from what the engine tracks.
- Metadata leakage is one of the fastest ways for a polished feature to feel unfinished.
- Passing copy audit should become a required bridge condition, not a manual suggestion.

Next best step:
P3.43 should add a non-live production bridge readiness gate:
- approved report validation passes;
- generated artifact validation passes;
- product-copy audit passes;
- readiness result lists blockers before any live registry edit.

## Implementation status 2026-06-01 - P3.43

Completed: non-live production bridge readiness gate.

Product value:
- The system now has one accountable answer before bridge work: ready or blocked.
- Readiness is not based on a developer impression; it combines report validation, artifact validation, and product-copy audit.
- If anything regresses, the result names the blocked stage and the exact source issue.
- This is the right safety layer before generating any dry-run production bridge manifest.
- The gate still does not edit live catalog, live quizzes, UI, storage, audio, pronunciation, onboarding, Premium, or Home.

Files:
- `tools/personal_plan_gavan_day1_production_bridge_readiness.ts`
- `tests/personal_plan_gavan_day1_production_bridge_readiness.test.ts`
- `tools/personal_plan_gavan_day1_artifact_copy_audit.ts`

Quality gate:
- Red test first failed on the missing module.
- Focused readiness tests passed: 1 suite, 6 tests.
- Focused readiness/report/copy-audit/generated-artifact tests passed: 5 suites, 32 tests.
- Full Personal Plans suite passed: 75 suites, 444 tests.
- TypeScript passed: `npx tsc --noEmit --pretty false`.
- Source guard passed.
- Encoding guard passed.

Research synthesis:
- Before a premium plan day enters product data, the pipeline needs a single readiness answer that composes all lower-level checks.
- Stage-level blockers are better than one generic failure because they tell the next editor or engineer exactly what to fix.
- A dry-run manifest is now safe to create because it can depend on this readiness result instead of bypassing gates.

Next best step:
P3.44 should create a dry-run production bridge manifest:
- no live file edits;
- exact proposed additions;
- readiness result embedded;
- clear blocker if readiness is not passing.

## Implementation status 2026-06-02 - P3.44

Completed: dry-run production bridge manifest for clean Gavan day 1.

Product value:
- The future bridge is now reviewable before it becomes code.
- The manifest lists proposed catalog units, quiz ids, prompt snippets, note snippets, future source files, and readiness status.
- It writes only to safe temp/report locations.
- It rejects source and test output targets.
- This lets product/content/engineering review what would be added before touching live registries.

Files:
- `tools/personal_plan_gavan_day1_dry_run_bridge_manifest.ts`
- `tests/personal_plan_gavan_day1_dry_run_bridge_manifest.test.ts`
- `.codex-tmp/personal-plans/gavan-day1-dry-run-bridge-manifest.json`

Quality gate:
- Red test first failed on the missing module.
- Focused manifest tests passed: 1 suite, 6 tests.
- Focused manifest/readiness/generated-artifact tests passed: 4 suites, 24 tests.
- Full Personal Plans suite passed: 76 suites, 450 tests.
- TypeScript passed: `npx tsc --noEmit --pretty false`.
- Source guard passed.
- Encoding guard passed.

Research synthesis:
- A premium content pipeline should expose a proposed production change as a reviewable artifact before code edits.
- Dry-run manifests reduce accidental live-data drift and make future implementation diffs easier to audit.
- The next useful step is shape compatibility: does this manifest map cleanly onto the actual live catalog and quiz files?

Next best step:
P3.45 should create a non-applied implementation diff plan:
- inspect live catalog and quiz file shape;
- map manifest fields to real file structures;
- list exact future additions;
- still do not edit live files.

## Audit update 2026-06-02 - P3.45 non-applied bridge diff plan

Status: implementation-ready, not applied to live app.

What improved:
- The approved Gavan day 1 artifact now has a precise bridge diff plan instead of a vague "later connect this" note.
- The bridge plan recognizes the current catalog shape in `app/personal_plan_catalog.ts` read-only.
- The bridge plan recognizes the current quiz registries in `app/personal_plan_quizzes.ts` read-only.
- The future catalog change is reduced to 5 proposed unit ids and a named insertion point.
- The future quiz change is reduced to `gavan-week1-day1-quiz` and the exact registries that must receive it.
- Every future edit is explicitly marked `not_applied` and `applied: false`.
- The writer refuses source/test/tool targets and writes only into `.codex-tmp` or `docs/reports`.

Why this matters for product quality:
- It prevents accidental live-content mutation while the plan system is still being reset.
- It makes the future live bridge reviewable before implementation.
- It keeps the onboarding, Premium, Home, catalog, quiz, storage, audio, and navigation surfaces untouched.
- It creates a stable handoff between content approval and production integration.

Current risk:
- The existing live catalog still contains legacy corrupted copy in places outside this phase. P3.45 deliberately did not clean it because this phase is about safe bridge planning, not source-copy cleanup.

Next product route:
- P3.46 should add guarded tests for the future live bridge behavior without applying live edits yet.
- After explicit approval, a later phase can use those tests to connect Gavan day 1 to catalog and quiz registries.

## Audit update 2026-06-02 - P3.46 future bridge guard report

Status: dry safety gate completed.

What improved:
- The future live bridge now has a guard report, not just a diff plan.
- The guard report turns future edits into a checklist that remains blocked until approval.
- An accidental `applied` state now has a testable failure path: `applied_without_explicit_approval`.
- Missing catalog unit ids now have a testable failure path: `missing_catalog_unit_ids`.
- Missing quiz id or registry target now has testable failure paths: `missing_quiz_id` and `missing_quiz_registry_target`.
- The report explicitly proves this phase used no source write targets.

Why this matters for product quality:
- It makes the production bridge harder to apply by accident.
- It gives a reviewer a small, concrete artifact to approve before live code changes.
- It keeps the reset pipeline honest: content approval, diff plan, guard report, then only later live integration.

Current risk:
- The product still does not expose the new certified Gavan day 1 content in live catalog/quiz routes. That is intentional until explicit approval.

Next product route:
- P3.47 should be an explicit live-bridge phase with tests first, and only if the user approves touching live catalog and quiz registries.

## Audit update 2026-06-02 - P3.47 read-only live bridge preflight

Status: dry preflight completed.

What improved:
- The system now checks live catalog and quiz source before any bridge application.
- It confirms the certified Gavan day 1 ids are not already in live source.
- It confirms the planned future diff remains stable.
- It confirms missing approval blocks live application.
- It keeps the pipeline safe when the user asks to continue but has not explicitly approved live source edits.

Why this matters for product quality:
- It prevents accidental duplicate content registration.
- It prevents accidental partial live bridge application.
- It gives a clean decision point: approve live bridge, or continue building content/product quality in dry mode.

Current risk:
- The certified Gavan day 1 content is still not available through live catalog/quiz routes. That remains intentional until approval.

Next product route:
- Ask for explicit approval before touching `app/personal_plan_catalog.ts` and `app/personal_plan_quizzes.ts`, or continue with non-live content expansion and standards work.

## Audit update 2026-06-02 - P3.48 Gavan week 1 expansion standards

Status: non-live product/content standards completed.

What improved:
- The next Gavan content work now has a standards artifact before anyone writes final exercises.
- Days 2-7 are constrained to universal public everyday communication, not narrow relocation bureaucracy.
- Personal identity data, phone numbers, apartment viewing, rent/documents, doctor appointments, and bank card problems are forbidden by default.
- Exercise variety is now required before content writing starts.
- Audio and pronunciation are treated honestly: required later, not generated or scored yet.
- The four onboarding minute choices are the only allowed load variants.

Why this matters for product quality:
- It prevents repeating the earlier mistake of writing overly specific, socially awkward, or fake-practical tasks.
- It makes future authoring feel more like a product system and less like random lesson text.
- It gives a clear checklist for human-quality content before a live implementation step.

Current risk:
- These are standards, not final exercises. They do not make days 2-7 playable yet.

Next product route:
- Use P3.49 to write a non-live day 2 content blueprint candidate under these standards.

## Audit update 2026-06-02 - P3.49 Gavan day 2 blueprint candidate

Status: non-live blueprint candidate completed.

What improved:
- Gavan day 2 now has a concrete candidate built from standards, not improvised copy.
- The candidate focuses on a high-frequency social survival skill: asking someone to repeat or slow down.
- The candidate avoids personal data and narrow relocation bureaucracy.
- Every new word and first-seen construction has explanation coverage.
- Wrong-answer explanations are constrained so they cannot describe options the learner did not see.
- Audio and pronunciation stay honest: required later, not generated or scored yet.

Why this matters for product quality:
- This is the first step from standards into actual content without falling back into awkward or overly specific situations.
- The day has a clear skill promise and multiple exercise paths without becoming a fake final lesson.

Current risk:
- Day 2 is not live, not reviewer-approved, and not exported for production yet.

Next product route:
- Add a day 2 reviewer/export quality gate before considering any production bridge.

## Audit update 2026-06-02 - P3.50 Gavan day 2 reviewer export gate

Status: non-live reviewer export completed.

What improved:
- Day 2 now has a stable review artifact instead of only a raw blueprint candidate.
- The artifact exposes all content units, explanation cards, and exercise blueprints in one place.
- The artifact separates review from approval: nothing is silently certified.
- Media honesty is enforced again: no generated audio or pronunciation scoring is claimed.
- The gate checks only visible reviewer copy for forbidden anchors, so technical ids do not create false product failures.
- The writer remains confined to `.codex-tmp` and `docs/reports`.

Why this matters for product quality:
- It prevents half-ready content from sneaking into the live plan pipeline.
- It gives a reviewer one concrete surface to assess phrase quality, explanation quality, and exercise variety.
- It protects the product from the earlier failure mode: improvised copy becoming "real" before it is socially safe and useful.

Current risk:
- Day 2 is still not approved, not playable, and not registered in live catalog/quiz routes.

Next product route:
- Add a day 2 reviewer approval gate, then either prepare an approved artifact or move to day 3 blueprint generation with the same safeguards.

## Audit update 2026-06-02 - P3.51 Gavan day 2 reviewer approval gate

Status: non-live approval gate completed.

What improved:
- Day 2 now has a formal approval boundary after reviewer export.
- Approval records are explicit and checksum-based, so copy changes after review are caught.
- Partial approval is blocked.
- Unsafe reviewer exports are blocked before approval, including fake media readiness and forbidden anchors.
- The approved artifact is still not a production bridge, which keeps live routes protected.

Why this matters for product quality:
- It prevents "looks reviewed" content from being treated as approved without proof.
- It creates an audit trail that can later support a real content operations workflow.
- It makes future Gavan days easier to scale because the review/approval pattern is now repeatable.

Current risk:
- Day 2 is approved only as a review artifact. It is not playable and not connected to production catalog or quiz routes.

Next product route:
- Continue with Gavan day 3 blueprint generation under the same non-live safeguards, unless the user explicitly approves a live bridge.

## Audit update 2026-06-02 - P3.52 Gavan day 3 blueprint candidate

Status: non-live blueprint candidate completed.

What improved:
- Gavan day 3 now has a concrete candidate built from the week standards.
- The day focuses on a universal communication skill: saying you missed something, asking for slower speech, asking what something means, and asking someone to show you.
- The candidate avoids personal data and narrow relocation bureaucracy.
- Every new word and first-seen construction has explanation coverage.
- Exercise variety is preserved through missing word, micro dialogue, listening choice, and active recall.
- Audio and pronunciation stay honest: required later, not generated or scored yet.

Why this matters for product quality:
- This creates progression after day 2 without repeating the same task shape.
- It keeps the plan useful for a broad audience instead of locking it into niche relocation errands.
- It gives day 3 a reviewable structure before anyone turns it into live playable content.

Current risk:
- Day 3 is not live, not reviewer-exported, not approved, and not playable yet.

Next product route:
- Add a day 3 reviewer/export quality gate, then a day 3 approval gate, before considering any production bridge.

## Audit update 2026-06-02 - P3.53 Gavan day 3 reviewer export gate

Status: non-live reviewer export completed.

What improved:
- Day 3 now has a stable review artifact instead of only a raw blueprint candidate.
- All phrase rows, explanation rows, and exercise blueprint rows are visible for review.
- Media honesty is enforced again: no generated audio or pronunciation scoring is claimed.
- The gate checks visible copy for forbidden anchors and corrupted text.
- The writer remains confined to `.codex-tmp` and `docs/reports`.

Why this matters for product quality:
- It prevents day 3 content from moving forward without a review surface.
- It keeps the repeatable content pipeline intact across multiple days.
- It gives reviewers one artifact to inspect before approving the day.

Current risk:
- Day 3 is reviewer-exported but not approved, not playable, and not connected to production catalog or quiz routes.

Next product route:
- Add a day 3 reviewer approval gate before considering any production bridge.
## Audit update 2026-06-02 - P3.54 Gavan day 3 reviewer approval gate

### Product logic score

P3.54 improves the pipeline from reviewable to review-approved but still non-live. That is the right quality step for a premium learning feature because it separates content confidence from production activation.

### What this prevents

- Copy drift after review: the checksum catches changed visible text.
- Hidden partial approval: every content unit, explanation card, and exercise blueprint needs its own approval row.
- Fake readiness: audio and pronunciation remain explicitly unbuilt until real assets and scoring exist.
- Accidental live shipping: approval artifacts keep `liveIntegration: false` and writes are limited to safe report/temp roots.
- Developer shortcut text entering production: reviewer approval is now a distinct state, not just a generated file.

### What still needs improvement

- Approval is mechanical and metadata-based; it does not replace a real human content review.
- Day 3 remains an artifact, not a playable lesson route.
- The next content step must keep the reset standard: common, socially safe, generally useful phrases, varied exercise types, and explanations that describe the correct phrase rather than invented wrong options.

### Recommendation

Move to P3.55 and author day 4 as another non-live blueprint candidate. Do not bridge days 2 or 3 to production until the user explicitly asks for the live bridge and the release criteria are re-run.

## Audit update 2026-06-02 - P3.55 Gavan day 4 blueprint candidate

### Product logic score

P3.55 is a strong step because it shifts Gavan week 1 away from narrow relocation chores and toward common, emotionally low-risk public language. The phrase set is useful even outside relocation, which makes the route feel less brittle and more premium.

### What improved

- The content is broad: visible help, uncertainty, place check, direction check.
- The copy avoids identity, contact data, apartment, bank, doctor, rent, and documents.
- Pronunciation appears only as a future exercise blueprint, with no fake scoring claim.
- Explanations are attached to words and constructions that a learner may not know.
- The day uses multiple exercise modes instead of repeating one phrase-build format.

### What to watch next

- Reviewer export must check whether the Russian meanings display correctly in every downstream artifact.
- Reviewer export should also flag any phrase that feels too formal or too vague after human review.
- The future playable renderer must make pronunciation shadow honest: listen/repeat first, scoring only after the real scoring mechanism exists.

## Audit update 2026-06-02 - P3.56 Gavan day 4 reviewer export gate

### Product logic score

P3.56 strengthens the editorial workflow. Day 4 is no longer just generated candidate data; it is now arranged as a review surface where phrases, explanations, and exercise blueprints can be inspected separately.

### What improved

- Content, explanation, and exercise rows are separated for review.
- The review state is explicit: `needs_manual_review`.
- The pronunciation-shadow task remains honest: it is visible as a blueprint, but final scoring is still `not_built`.
- The export checks that no narrow forbidden anchors slipped into visible copy.

### What to watch next

- Approval must lock visible text with checksums, just like day 3.
- Reviewer approval should still not make day 4 playable.
- The eventual UI should use this row structure to show reviewers what exact snippets are entering the route.

## Audit update 2026-06-02 - P3.57 Gavan day 4 reviewer approval gate

### Product logic score

P3.57 is the right quality step because it makes approval explicit and auditable. The route now has a checksum-backed approval artifact instead of relying on a generated file being "probably okay."

### What improved

- Day 4 visible copy is locked by checksum at approval time.
- The approval gate catches changed explanations and phrase text after review.
- Fake audio and pronunciation readiness remain blocked.
- The artifact is still non-live, which prevents accidental shipping.

### What to watch next

- Day 5 should continue with broad public-safe language and varied exercise types.
- The pipeline should keep separating candidate, reviewer export, approval artifact, and live bridge.
- No day should become playable from approval alone.

## Audit update 2026-06-02 - P3.58 Gavan day 5 blueprint candidate

### Product logic score

P3.58 improves the route because day 5 practices a very common real-life need: checking whether you are in the right place, what to do next, whether waiting is needed, and whether the current action is acceptable. This is more universal than narrow relocation chores and less likely to annoy users who do not match a specific life situation.

### What improved

- Day 5 keeps the reset rule: common phrases, no private identity data, no apartment/contact/document trap.
- The exercise mix is more varied than a single phrase-build path: micro dialogue, missing word, active recall, and natural choice.
- Explanation cards cover every new word and first-seen construction.
- Wrong-answer explanations are constrained to presented options, so the app will not invent a weird unseen mistake after the learner answers.
- Audio and pronunciation stay honest: planned, not faked.

### What to watch next

- Reviewer export must inspect whether the four candidate phrases feel natural enough for a broad audience.
- The future final exercises should not overfit to "directions" only; they should include correctness and next-step checks too.
- When day 5 becomes playable later, the active recall renderer must return missed phrases on later days instead of simply marking exposure as success.

## Audit update 2026-06-02 - P3.59 Gavan day 5 reviewer export gate

### Product logic score

P3.59 improves product reliability because it separates generated candidate content from reviewable content. That distinction matters for a premium route: the app should never ship "looks plausible" phrases without a reviewer-facing audit artifact.

### What improved

- Day 5 content, explanations, and exercise plans are split into inspectable rows.
- The export keeps all rows in `needs_manual_review`; approval is not implied by generation.
- Required exercise coverage is explicit and easy to audit.
- The gate keeps audio and pronunciation honest, with no fake readiness.
- The visible-copy check blocks narrow private anchors and corrupted text before approval.

### What to watch next

- Approval should lock every visible row by checksum.
- Reviewer approval must not make day 5 playable.
- The eventual live bridge should still require explicit user approval and a separate release preflight.

## Audit update 2026-06-02 - P3.60 Gavan day 5 reviewer approval gate

### Product logic score

P3.60 is a strong quality-control step because it turns day 5 from reviewable into checksum-approved without crossing into production. This is the distinction a premium content pipeline needs: editorial confidence first, user-facing release later.

### What improved

- Day 5 visible text is locked by checksum at approval time.
- Partial approvals fail, so the route cannot silently approve only phrases while skipping explanations or exercise plans.
- Approval metadata makes the artifact auditable.
- Fake audio and pronunciation readiness remain blocked.
- Live integration remains explicitly false.

### What to watch next

- Day 6 should continue the reset pattern and avoid slipping back into overly narrow scenario chores.
- The next candidate should keep exercise variety and explanation coverage from the start.
- No approved artifact should be used as a live route without a separate bridge and release preflight.

## Audit update 2026-06-03 - P3.61 Gavan day 6 blueprint candidate

### Product logic score

P3.61 is a useful content step because it trains small social control: pause, agree, admit uncertainty, and delay a decision. These are high-frequency skills for real conversations and do not depend on a narrow relocation situation.

### What improved

- Day 6 avoids private data and narrow chores.
- The phrase set is socially safe and broadly reusable.
- Explanations cover words and constructions that can confuse beginners, especially `yet`, `works for me`, and `could we`.
- The day introduces `error_repair` as a candidate exercise type without claiming final exercise copy.
- Pronunciation remains a future shadowing blueprint, not fake scoring.

### What to watch next

- Reviewer export should check whether `That works for me` and `Could we decide later?` are simple enough for the target level.
- Final exercises must keep explanations tied to presented choices only.
- Approval and live bridge must remain separate steps.

## Audit update 2026-06-03 - P3.62 Gavan day 6 reviewer export gate

### Product logic score

P3.62 improves editorial control because day 6 is no longer only generated candidate data. The phrases, explanation cards, and exercise blueprints are now separated into review rows, which makes weak wording or overcomplicated teaching notes easier to catch before approval.

### What improved

- Content, explanation, and exercise rows are inspectable independently.
- The review state is explicit: `needs_manual_review`.
- `error_repair` is present as a planned exercise type without pretending final exercise copy exists.
- `pronunciation_shadow` remains honest: no final audio and no scoring claim.
- Forbidden anchors and corrupted text are blocked at the review-export level.

### What to watch next

- Approval must checksum-lock every visible row.
- Reviewer approval should still not make day 6 playable.
- The future live bridge must preserve carryover, recall, and mistake analytics behavior rather than only registering static text.

## Audit update 2026-06-03 - P3.63 Gavan day 6 reviewer approval gate

### Product logic score

P3.63 is a strong pipeline hardening step. It turns day 6 from "reviewable" into "review-approved" while still refusing to ship it, which is exactly the separation needed for a premium learning product: content confidence first, release confidence later.

### What improved

- Every visible row is checksum-locked at approval time.
- Approval is explicit and auditable: reviewer id, timestamp, row id, row kind, and checksum.
- Partial approvals are blocked, so explanations and exercise plans cannot be skipped.
- Fake audio and pronunciation readiness remain blocked.
- Live integration remains explicitly false.
- The approved export can be used as a stable input for the next non-live planning step.

### What to watch next

- Day 7 should close week 1 with review and one simple next action, not with narrow chores.
- The next candidate should keep broad, socially safe phrases and varied exercise types.
- The eventual live bridge must still be explicit and must not silently import approved artifacts into production routes.

## Audit update 2026-06-03 - P3.64 Gavan day 7 blueprint candidate

### Product logic score

P3.64 is a strong week-closure step. It avoids the trap of making Gavan feel like a pile of niche errands and instead reinforces broad conversation control: pause, ask again, ask what comes next, and return after checking.

### What improved

- Day 7 closes the first week with review value rather than new narrow scenarios.
- The phrase set is public-safe and reusable across everyday situations.
- Visible content blocks private anchors and numbers.
- The candidate includes four distinct exercise formats, including a week-review active recall slot.
- Audio and pronunciation remain honest future requirements, not fake readiness claims.
- Explanation cards cover every new word and first-seen construction.

### What to watch next

- Reviewer export should preserve the visible-only forbidden-number check so technical ids do not create false failures.
- Final exercises must keep the same broad language and avoid turning day 7 into a hidden quiz dump.
- The next approval gate should checksum-lock every phrase, explanation, and exercise blueprint before any live bridge.

## Audit update 2026-06-03 - P3.65 Gavan day 7 reviewer export gate

### Product logic score

P3.65 improves editorial safety because it separates the day 7 candidate from approval. This matters for a premium feature: reviewable content is not the same thing as approved content, and approved content is still not the same thing as live product.

### What improved

- Day 7 phrases, explanations, and exercise blueprints are inspectable independently.
- Every exported row stays in `needs_manual_review`.
- Exercise coverage is explicit for `active_recall`, `listening_choice`, `natural_choice`, and `micro_dialogue`.
- Visible-number checks apply to user-facing copy instead of technical ids.
- Fake audio and pronunciation readiness remain blocked.
- Writes are restricted to safe artifact/report directories.

### What to watch next

- Approval must checksum-lock every visible row.
- Day 7 approval should not make the day playable.
- Live bridge should remain a separate, explicit task with release preflight and no automatic catalog mutation.

## Audit update 2026-06-03 - P3.66 Gavan day 7 reviewer approval gate

### Product logic score

P3.66 is a strong closure step for week 1 authoring because it locks day 7 by checksum while preserving the no-live-bridge boundary. This is the right shape for a premium content pipeline: review, approval, then a separate release decision.

### What improved

- Day 7 visible text is locked by checksum at approval time.
- Partial approval is blocked across phrases, explanations, and exercise blueprints.
- Approval metadata makes the artifact auditable.
- Forbidden anchors, visible numbers, fake audio, and fake pronunciation readiness remain blocked.
- Live integration remains explicitly false.

### What to watch next

- A week-level readiness manifest should verify that days 2-7 all have the expected non-live approved artifacts.
- The manifest should clearly distinguish approved content from playable production content.
- The live bridge should remain a separate explicit task, not an automatic next step.

## Audit update 2026-06-03 - P3.67 Gavan week 1 approval/readiness manifest

### Product logic score

P3.67 is an important product-safety milestone. It moves the work from day-by-day approval into week-level readiness without pretending the week is ready for users.

### What improved

- Days 2-7 are visible in one readiness artifact.
- Counts and approved artifact paths are easy to inspect.
- Week status explicitly says `approved_non_live_not_playable`.
- Release blockers are named instead of hidden in notes.
- The manifest preserves the separation between editorial approval and production release.

### What to watch next

- A bridge diff/preflight should compare the manifest against production surfaces without editing them.
- Release blockers should remain blocking until real audio, pronunciation, routes, UI, and sync exist.
- The eventual live bridge should be small, explicit, and test-first.

## Audit update 2026-06-03 - P3.68 Gavan week 1 bridge diff/preflight plan

### Product logic score

P3.68 is a strong release-safety step. It turns the week-level manifest into a production-surface map while still refusing to apply live integration. That keeps the product honest: approved content is valuable, but it is not a working premium feature until real routes, media, scoring, UI, and sync exist.

### What improved

- The preflight artifact names every production surface needed for a playable week.
- All six surfaces stay blocked unless metadata proves a real connection exists.
- Release blockers from the readiness manifest are preserved instead of replaced by a vague note.
- The artifact records that legacy day 1/day 2 quiz ids are disabled, which matters for avoiding stale content routes.
- The writer remains restricted to `.codex-tmp` and `docs/reports`.

### What to watch next

- The next live-bridge contract must require explicit approval metadata before any production source edit.
- The bridge should not connect UI before final audio, pronunciation policy, quiz route, and sync behavior are agreed.
- Any future production edit must be tiny, TDD-first, and reversible by review rather than by silent generated mutation.

## Audit update 2026-06-03 - P3.69 Gavan week 1 future bridge approval contract

### Product logic score

P3.69 is a strong governance step. It turns "we need a bridge" into "these exact owners must approve these exact surfaces before a bridge can even become an implementation task." That is the right posture for a premium feature that touches content, UI, audio, pronunciation, sync, and paid-plan trust.

### What improved

- The contract has seven approval areas, not one vague approval flag.
- Every area has a named owner role and concrete acceptance criteria.
- The contract preserves P3.68 missing surfaces and P3.67 release blockers.
- Current `canOpenLiveBridgeImplementationTask` is false, which is honest for the present state.
- The contract blocks source writes in this phase.

### What to watch next

- A future guard report should make the blocked state machine explicit: missing surface, missing signature, or both.
- No UI route should be opened until product design and copy approval are present.
- No audio or pronunciation task should claim release readiness until real assets/scoring policy exist.

## Audit update 2026-06-03 - P3.70 Gavan week 1 future bridge guard report

### Product logic score

P3.70 is a strong release-control step. It converts the approval contract into a blocker report with counts and categories, which makes the next work obvious and prevents accidental production edits while the week is still not playable.

### What improved

- The report shows 19 blockers instead of one generic "not ready" state.
- Missing signatures, missing surfaces, and release blockers are separated.
- The report preserves all original blocker details instead of flattening them into a note.
- Applied/live contracts are rejected while signatures and surfaces are incomplete.
- Source writes remain blocked.

### What to watch next

- The next roadmap should order blockers by dependency, not by convenience.
- Catalog and quiz route plans should remain dry-run until explicit live bridge approval exists.
- UI, audio, pronunciation, and sync work should not be hidden under a single "route connected" checkbox.

## Audit update 2026-06-03 - P3.71 Gavan week 1 blocker resolution roadmap

### Product logic score

P3.71 is a strong operational step. It turns a blocker list into a dependency-aware release path and keeps the product honest: no live bridge, no fake readiness, and no production mutation until each work package is separately proven.

### What improved

- The 19 blockers from P3.70 are preserved and mapped to responsible work packages.
- Work starts with product copy quality, not with wiring code, which reduces the risk of shipping awkward or narrow plan text.
- Catalog, quiz, UI, audio, pronunciation, and sync are separated so none of them can hide behind a single green check.
- Final release approval depends on every prior package, so live implementation stays blocked.
- Unsafe guard input is rejected if it already contains source writes or implementation approval.

### What to watch next

- Product copy approval should be specific enough to reject stale day 1/day 2 wording patterns.
- Route plans should remain dry-run until the owner approvals are present.
- The final approval gate should require verification of old onboarding, Premium, Home, and self-guided paths before any live bridge is applied.

## Audit update 2026-06-03 - P3.72 Gavan week 1 product copy approval packet

### Product logic score

P3.72 is a strong content-governance step. It separates "copy checks pass" from "copy is signed for release", which is exactly the distinction a premium learning product needs. Good text should not silently become live without a named owner approval.

### What improved

- The first P3.71 work package now has a concrete evidence packet.
- The packet checks real product-copy risks: narrow anchors, developer wording, fake wrong-answer context, unsafe explanations, forbidden user-facing route/scene/scenario terms, and explanation coverage.
- Current approved days 2-7 pass the copy checks, so the week has a stronger content baseline than before.
- The packet does not hide the remaining blocker: `signatureStatus` is still `missing`.
- Output is sanitized so the packet does not spread encoding markers if a future artifact contains them.

### What to watch next

- The content-quality signature should be requested explicitly instead of inferred from automated checks.
- Catalog route planning should stay blocked until that signature exists or a separate approved exception is recorded.
- Future copy packets should keep this same distinction for every plan: automated checks can prepare approval, but they cannot impersonate approval.

## Audit update 2026-06-03 - P3.73 Gavan week 1 product copy signature request packet

### Product logic score

P3.73 is a strong approval-hygiene step. It allows the system to prepare a signature request while explicitly refusing to sign itself. That matters because premium-plan trust depends on not confusing automated checks with human/product approval.

### What improved

- Passing copy evidence is now packaged for the `content_quality_owner`.
- `readyToRequestSignature` is true, but `signatureStatus` remains missing.
- `signatureMayBeInferred` is false, so no downstream process can treat checks as a signature.
- Catalog route planning remains blocked, which preserves the dependency order from P3.71.
- Unsafe source-writing or already-signed packets are rejected instead of silently accepted.

### What to watch next

- Catalog route preflight should read this request and stay blocked until a real signature or approved exception exists.
- Future signed artifacts must carry explicit signature metadata, not just a boolean.
- No catalog, quiz, UI, audio, pronunciation, or sync route should cite P3.73 as approval; it is only a request packet.

## Audit update 2026-06-03 - P3.74 Gavan week 1 catalog route preflight

### Product logic score

P3.74 is a strong dependency-control step. It lets the future catalog route become visible without letting it become playable. That is the right behavior when approved content exists but the product-copy signature is still missing.

### What improved

- Proposed catalog routes now list the six approved day artifacts explicitly.
- The preflight preserves the blocker `missing_signature:product_copy`.
- `canOpenCatalogRouteTask` remains false, so no production route work is implied.
- Every proposed route is blocked, not registered, and not playable.
- Signed, unsafe, or wrong-shape request packets are rejected instead of unblocking the catalog.

### What to watch next

- The next source inventory should inspect catalog structure without editing it.
- Future route design should preserve existing catalog behavior and avoid overwriting old plan/day entries.
- The first live catalog task still requires either explicit content-quality signature metadata or an approved exception.

## Audit update 2026-06-03 - P3.75 Gavan week 1 catalog source inventory

### Product logic score

P3.75 is a strong release-safety step. It prevents the team from pretending approved content is already routed by checking the current catalog source directly, but it still keeps all production edits blocked.

### What improved

- The future Gavan week 1 route now has a source inventory instead of assumptions.
- The inventory proves the six proposed approved day ids are not present in the current catalog source.
- It identifies the likely adapter surfaces without editing them: catalog export, Gavan plan definition, generated days call, day model, task destination model, and minute-load helper.
- It confirms the current catalog source uses generated scaffold for Gavan, so the future adapter must preserve existing behavior carefully.
- It confirms the current catalog source does not contain broken encoding markers.
- It rejects unsafe or unblocked preflights instead of treating catalog work as open.

### What to watch next

- The adapter design should not replace generated days until the content-quality signature exists.
- Future route planning should describe compatibility with `PlanDay`, task destinations, and minute-load behavior before touching source.
- The next step should stay dry-run and must not register the six approved ids as playable.

## Audit update 2026-06-03 - P3.76 Gavan week 1 catalog adapter design

### Product logic score

P3.76 is a strong bridge-design step. It turns source inventory into a future adapter contract while still refusing to edit source or open route registration. That is the correct behavior for a premium plan feature that is not signed for live release.

### What improved

- The six approved week 1 day ids now have explicit future mapping rules.
- Every mapping is blocked until signature and remains not registered and not playable.
- Generated scaffold replacement is treated as a preservation risk, not a casual overwrite.
- Minute choices are protected as a compatibility requirement for 5, 10, 15, and 20 minute onboarding selections.
- Task destination behavior is called out so lessons, quizzes, and plan exercises do not become mixed up.
- Old catalog and self-guided paths are explicitly protected by regression criteria.

### What to watch next

- The next source inventory should inspect quiz route shape without editing `app/personal_plan_quizzes.ts`.
- Future quiz routes should be dedicated to the approved day content, but not registered while signature is missing.
- Any future live route task must prove old catalog behavior, plan task destinations, and minute-load behavior before it can be accepted.

## Audit update 2026-06-03 - P3.77 Gavan week 1 quiz source inventory

### Product logic score

P3.77 is a strong source-truth step. It checks the actual quiz source before designing routes, keeps production writes blocked, and separates legacy Gavan quiz exceptions from the future reset week.

### What improved

- Future day quiz ids are explicit and checked against source.
- The inventory proves none of the six future Gavan week 1 quiz ids are currently registered.
- It detects the quiz factory, registry, coverage, task copy, and getter surfaces needed for future adapter design.
- It detects old Gavan exceptions and marks them as a risk, not a reusable solution.
- It records that future plan-day quizzes must be dedicated 10-question quizzes.
- Every proposed quiz route remains blocked, not registered, and not playable.

### What to watch next

- The quiz adapter design should require coverage links to approved day phrases, not generic lesson leftovers.
- The adapter should require product-ready task copy for choice and typing modes.
- A future live task must prove that old exceptions remain safe and that new quiz ids do not break existing quiz flows.

## Audit update 2026-06-03 - P3.78 Gavan week 1 quiz adapter design

### Product logic score

P3.78 is a strong route-contract step. It turns quiz source findings into a strict future adapter design while keeping route registration blocked. That is better than rushing source edits because it defines what a good quiz route must prove.

### What improved

- Every future Gavan week 1 day now has a dedicated quiz design.
- Each quiz requires exactly 10 questions.
- Coverage must link to approved day phrases instead of generic lesson leftovers.
- Task copy must exist for both choice and typing modes.
- The design reserves copy language slots for `ru`, `uk`, and `es`.
- Legacy Gavan exceptions are explicitly isolated and cannot become the new week route.
- Live acceptance criteria stay blocked until product-copy signature approval exists.

### What to watch next

- UI route/source inventory should check where plan tasks would open quizzes and plan exercises without editing screens.
- Future UI work must preserve existing Home, onboarding, Premium, and self-guided paths.
- The live quiz route task should not start until catalog route, quiz route, and UI entrypoint contracts agree.

## Audit update 2026-06-03 - P3.79 Gavan week 1 UI route source inventory

### Product logic score

P3.79 is a strong route-safety step. It checks the real UI source surfaces before designing the user-facing opening contract, but it keeps every live UI change blocked.

### What improved

- Future plan task opening is now grounded in actual Home, plan screen, task open helper, day action, and task surface sources.
- The inventory detects route abilities for plan screen, development plan screen, lesson menu, plan phrase lesson, quiz screen, plan renderer, and lesson shell.
- Home, onboarding, Premium, and self-guided paths are recorded as preservation risks.
- The inspected UI route source files currently have no visible broken encoding markers.
- The tool source does not import live app UI, storage, audio, quiz, or catalog modules.
- The artifact contains source summaries only, not copied source text.

### What to watch next

- The next adapter design must not edit UI or register routes.
- The future route contract must keep lesson, quiz, and plan exercise opening distinct.
- The live route step should require regression checks for Home, onboarding, Premium, self-guided lessons, self-guided quizzes, and plan task carryover.

## Audit update 2026-06-03 - P3.80 Gavan week 1 UI route adapter design

### Product logic score

P3.80 is a strong UX safety step. It separates user-facing task opening into explicit contracts before any screen or route can be changed.

### What improved

- Lesson, plan phrase, quiz, plan renderer, and lesson shell openings are distinct.
- Each opening contract is linked to detected UI source surfaces and route abilities from P3.79.
- The dedicated quiz opening requires six quiz route designs and 10 questions.
- Regression gates now protect Home, onboarding, Premium, self-guided lessons, self-guided quizzes, carryover, and completed-day behavior.
- Every live criterion remains blocked until product-copy signature exists.
- The tool source avoids live app imports and writes only dry-run artifacts.

### What to watch next

- The next gate should verify catalog day ids, quiz ids, and UI opening contracts agree.
- Future live work must not begin from only one adapter design.
- Device or emulator route verification should happen only after the aggregate readiness gate and signature are both satisfied.

## Audit update 2026-06-03 - P3.81 Gavan week 1 aggregate route readiness gate

### Product logic score

P3.81 is a strong release-control step. It moves the route pipeline from separate contracts to one joined readiness view.

### What improved

- Catalog, quiz, and UI route contracts are now checked together.
- The gate proves the reset week has 6 catalog day mappings, 6 dedicated quiz designs, and 5 UI opening contracts.
- The quiz side proves all six future quizzes require 10 questions.
- The UI side proves all five opening families are covered and all seven regression gates are present.
- `readyForLive` remains false, so the gate cannot be mistaken for approval.
- Route blockers are explicit: missing product-copy signature, catalog routes not registered, quiz routes not registered, UI routes not registered, and live regression not run.

### What to watch next

- The next packet should make human signature review easier without changing source.
- Future approval must sign the whole route bundle, not a single isolated file.
- Live route work should require this aggregate gate plus an explicit signed approval artifact.

## Audit update 2026-06-03 - P3.82 Gavan week 1 route signature request packet

### Product logic score

P3.82 is a strong governance step. It converts readiness evidence into a reviewer packet while refusing to self-approve.

### What improved

- The route signature request now summarizes catalog, quiz, UI, regression, blockers, and live acceptance criteria.
- Evidence paths are explicit for catalog adapter, quiz adapter, UI route adapter, and aggregate readiness gate.
- Reviewer decision is required but remains `not_reviewed` and `approved: false`.
- `signatureMayBeInferred` is false, which blocks accidental approval by artifact generation.
- Unsafe or live-ready gates are rejected instead of treated as approval.

### What to watch next

- The next guard should validate approval metadata separately.
- Live route work must require a separate signed approval artifact.
- Approval must cover the full route bundle and regression gates, not only catalog or quiz pieces.

## Audit update 2026-06-03 - P3.83 Gavan week 1 route approval guard

### Product logic score

P3.83 is a strong approval-boundary step. It defines exactly what a valid route approval must contain while keeping the current system unsigned.

### What improved

- Approval is explicitly separate from the request packet.
- The guard requires a reviewer name, owner role, ISO timestamp, full route bundle scope, full regression scope, all evidence paths, and decision text.
- Partial route approvals are rejected.
- Already-approved or unsafe requests are rejected instead of opening routes.
- The generated guard remains `approved: false`, `readyForLive: false`, and non-live.

### What to watch next

- A future live preflight should list exact source files and tests that would be involved after approval.
- No production file should be edited until this guard is paired with explicit signed metadata.
- The route bundle should remain blocked if any approval evidence is partial or stale.

## Audit update 2026-06-03 - P3.84 Gavan week 1 live route implementation preflight

### Product logic score

P3.84 is a strong release-discipline step. It turns the unsigned approval guard into a practical live-implementation map while keeping the system non-live.

### What improved

- The future source touchpoints are explicit: catalog days, dedicated quizzes, task opening helper, and day open actions.
- Every proposed source edit is blocked and marked `writeActionAllowed: false`.
- Route registration remains false for catalog, quiz, and UI.
- Required regression suites are listed before any future source edit can be considered.
- Required emulator checks are listed but blocked until signed approval.
- The pass writes only dry-run artifacts and reports.

### What to watch next

- The project should now move from preflight governance to content authoring artifacts.
- Gavan week 1 should be rewritten around broad, useful everyday communication rather than narrow anchors.
- The next content pass must keep user-facing language simple, human, varied, and non-robotic.

## Audit update 2026-06-03 - P3.85 Gavan week 1 content authoring seed

### Product logic score

P3.85 is a meaningful product step because it starts replacing the old narrow materials with a broad, teachable week model.

### What improved

- Gavan week 1 now has a non-live seven-day content seed.
- The seed avoids required personal-data anchors such as names, phone, email, apartment, rent, landlord, and viewing.
- Every day has a lesson bridge before plan-specific practice.
- Every day supports the four onboarding minute choices: 5, 10, 15, and 20.
- Exercise formats vary across the week instead of repeating the same phrase-building pattern.
- Explanation cards cover new words and first-seen constructions.
- Wrong-answer guidance is constrained to explain the correct idea without inventing unseen wrong options.
- Audio and pronunciation remain honest: required later, but not generated or scored in this pass.

### What to watch next

- Day 1 needs a concrete exercise material candidate from the seed.
- The day 1 candidate should define actual blocks, options, distractors, recall order, explanation moments, and quiz intent.
- Production should remain untouched until the material candidate passes quality gates.

## Audit update 2026-06-03 - P3.86 Gavan week 1 day 1 material candidate

### Product logic score

P3.86 is a strong product-material step. It starts turning the reset seed into something a learner could actually practice, while still protecting production from unfinished material.

### What improved

- Day 1 now has a concrete material candidate.
- Phrase build items have target token counts and matching word tiles.
- Distractor tiles cannot duplicate correct tiles.
- Active recall has no correct-word highlighting and no hints.
- Errors remain eligible to return later.
- Explanations are attached after answer and cover new words/constructions.
- Quiz intent plans exactly 10 questions without registering a live quiz.
- Audio and pronunciation remain honest and non-final.

### What to watch next

- Review day 1 for tone, clarity, distractor quality, and exercise rhythm before copying the shape to more days.
- The next pass should produce an export/quality packet that a product reviewer can inspect quickly.
- Day 2 should only start after day 1 material shape is accepted or repaired.

## Audit update 2026-06-03 - P3.87 Gavan week 1 day 1 material export packet

### Product logic score

P3.87 is a useful quality-control step. It makes the first concrete day inspectable before that shape gets reused across the week.

### What improved

- Day 1 now has a compact reviewer-facing export packet.
- The packet summarizes exercise blocks, phrases, word tiles, distractors, explanations, recall, and quiz intent.
- Quality gates are explicit and easy to scan.
- A broken candidate becomes `day1_material_export_blocked` instead of quietly passing.
- The packet remains non-live and does not approve production use.

### What to watch next

- Day 2 can now reuse the shape, but not copy day 1 content.
- Day 2 should focus on asking to repeat and understanding speech.
- The next material candidate should keep the same safety gates: word counts, distractors, explanations, recall without highlighting, quiz intent, and honest media state.

## Audit update 2026-06-03 - P3.88 Gavan week 1 day 2 material candidate

### Product logic score

P3.88 is a useful next material step because it adds a different training mode, listening preparation, without making false audio claims or repeating the exact day 1 pattern.

### What improved

- Day 2 now has a concrete material candidate.
- The exercise order is different from day 1: lesson bridge, listening choice, active recall, phrase build, then quiz intent.
- Listening assets are placeholders only and explicitly marked `not_generated`.
- Phrase build items still enforce exact word counts.
- Distractors remain safe and cannot duplicate target words.
- Active recall still has no correct-word highlighting and no hints.
- Mistakes remain eligible to return later.
- Explanations are attached after answer and cover new words/constructions.
- Wrong-answer feedback is constrained so it does not pretend to know which wrong option the learner selected.
- Quiz intent plans exactly 10 questions without registering a live quiz.
- Production files remain untouched.

### What to watch next

- Day 2 needs a reviewer export/quality packet like day 1.
- The export should add a listening-specific gate, because placeholder honesty is now part of the material shape.
- Day 3 should not start until day 2 review packet confirms broadness, explanation coverage, recall safety, quiz count, and media honesty.

## Audit update 2026-06-03 - P3.89 Gavan week 1 day 2 material export packet

### Product logic score

P3.89 is a strong quality-control step because it adds a review surface for the first day that includes listening placeholders. This prevents the product from silently drifting into fake audio or unfinished task claims.

### What improved

- Day 2 now has a compact reviewer-facing export packet.
- Reviewer summary includes listening placeholder count, not just phrase and quiz counts.
- Quality gates now include `listening_placeholder_honesty`.
- Failed listening, word tile, recall, quiz, or production-write gates block the packet instead of approving it.
- Preview shows phrases, tiles, listening placeholder status, recall state, and quiz intent.
- The packet remains non-live and does not approve production use.

### What to watch next

- Day 3 should get a concrete material candidate, not a live route.
- Day 3 should add a different exercise rhythm so the week feels varied.
- The same quality pattern should now repeat for every new day: candidate first, export packet second.

## Audit update 2026-06-03 - P3.90 Gavan week 1 day 3 material candidate

### Product logic score

P3.90 is a meaningful content step because it adds variation instead of copying the day 2 listening flow. The day focuses on broad requests for help, a minute, or a quick check.

### What improved

- Day 3 now has a concrete non-live material candidate.
- The exercise rhythm differs from day 2: phrase build plus missing-word practice.
- Missing-word items enforce one blank and exact token counts.
- Missing-word distractors cannot duplicate the answer.
- Phrase build distractors remain safe.
- Active recall still has no correct-word highlighting and no hints.
- Mistakes remain eligible to return later.
- Explanations are attached after answer and cover new words/constructions.
- Quiz intent plans exactly 10 questions without registering a live quiz.
- Production files remain untouched.

### What to watch next

- Day 3 needs a reviewer export/quality packet like days 1 and 2.
- The export packet should add a missing-word gate, because this mode now has its own failure cases.
- Day 4 should not start until day 3 review packet confirms broadness, slot quality, explanation coverage, recall safety, quiz count, and media honesty.

## Audit update 2026-06-03 - P3.91 Gavan week 1 day 3 material export packet

### Product logic score

P3.91 is a strong quality-control step because it turns the new missing-word mode into an auditable product shape instead of letting it remain a hidden implementation detail.

### What improved

- Day 3 now has a compact reviewer-facing export packet.
- Reviewer summary includes phrase-build and missing-word counts separately.
- Quality gates now include `missing_word_slot_quality`.
- Failed word tile, distractor, missing-word, recall, quiz, media, or production-write gates block the packet instead of approving it.
- Preview shows phrases, phrase tiles, missing-word slots, recall state, and quiz intent.
- The packet remains non-live and does not approve production use.

### What to watch next

- Day 4 can now start as a material candidate.
- Day 4 should practice broad short questions, not narrow identity or apartment tasks.
- The next candidate should introduce another rhythm, so the week feels varied and not like the same exercise copied seven times.

## Audit update 2026-06-03 - P3.92 Gavan week 1 day 4 material candidate

### Product logic score

P3.92 is a strong content reset step because it replaces the older narrow day 4 direction/help idea with broad short questions that fit many everyday situations.

### What improved

- Day 4 now uses only reset seed phrases.
- The day focuses on short questions: `Is this right?`, `Is it here?`, `Is that okay?`, and `Do I need anything else?`.
- The exercise rhythm differs from day 3: natural choice, mistake repair, quick reply, active recall, and quiz intent.
- Choice items require exact option counts and unique options.
- Repair items enforce exact token counts and safe distractors.
- Active recall still has no correct-word highlighting and no hints.
- Mistakes remain eligible to return later.
- Explanations are attached after answer and cover new words/constructions.
- Quiz intent plans exactly 10 questions without registering a live quiz.
- Production files remain untouched.

### What to watch next

- Day 4 needs a reviewer export/quality packet like days 1-3.
- The export should add gates for choice-option counts and repair-tile integrity.
- Day 5 should not start until day 4 review packet confirms broadness, explanation coverage, recall safety, quiz count, and media honesty.

## Audit update 2026-06-03 - P3.93 Gavan week 1 day 4 material export packet

### Product logic score

P3.93 is a strong quality-control step because it reviews the first day with three different non-live exercise formats: natural choice, mistake repair, and quick reply.

### What improved

- Day 4 now has a compact reviewer-facing export packet.
- Reviewer summary separates natural-choice, repair, and quick-reply counts.
- Quality gates now include `choice_option_counts` and `repair_tile_counts`.
- Failed choice, repair, distractor, recall, quiz, media, or production-write gates block the packet instead of approving it.
- Preview shows day title, blocks, phrases, natural-choice line, repair line, quick-reply line, recall state, and quiz intent.
- The packet remains non-live and does not approve production use.

### What to watch next

- Day 5 can now start as a material candidate.
- Day 5 should focus on asking for simpler explanation, showing, or writing down.
- The next material candidate should keep broad phrasing and avoid fake listening or pronunciation claims.

## Audit update 2026-06-03 - P3.94 Gavan week 1 day 5 material candidate

### Product logic score

P3.94 is a strong content step because it teaches a high-value everyday skill: asking someone to make the conversation easier without sounding lost or demanding.

### What improved

- Day 5 now uses only reset seed phrases.
- The day focuses on useful broad requests: explain simply, show me, write it down, and use simple words.
- The exercise rhythm differs from day 4: phrase build, listening placeholder, natural choice, active recall, and quiz intent.
- Phrase-build items enforce exact token counts.
- Distractors remain safe and cannot duplicate target words.
- Listening is honest: placeholders only, no generated audio claim.
- Natural-choice items require exact option counts and unique options.
- Active recall still has no correct-word highlighting and no hints.
- Mistakes remain eligible to return later.
- Explanations are attached after answer and cover new words/constructions.
- Quiz intent plans exactly 10 questions without registering a live quiz.
- Production files remain untouched.

### What to watch next

- Day 5 needs a reviewer export/quality packet like days 1-4.
- The export should add a listening-placeholder honesty gate and keep choice-option count checks.
- Day 6 should not start until day 5 review packet confirms broadness, explanation coverage, recall safety, quiz count, and media honesty.

## Audit update 2026-06-03 - P3.95 Gavan week 1 day 5 material export packet

### Product logic score

P3.95 is a strong quality step because it reviews the first reset day that combines phrase build, future listening, natural choice, active recall, and quiz intent in one material packet.

### What improved

- Day 5 now has a compact reviewer-facing export packet.
- Reviewer summary separates phrase-build items, listening placeholders, natural-choice items, recall flags, and quiz intent.
- Quality gates now include `word_tile_counts` and `listening_placeholder_honesty`.
- Failed word tiles, unsafe distractors, choice counts, fake listening, recall highlighting, quiz count, media, or production-write gates block the packet instead of approving it.
- Preview shows day title, blocks, phrases, phrase tile line, listening placeholder line, natural-choice line, recall state, and quiz intent.
- The packet remains non-live and does not approve production use.

### What to watch next

- Day 6 can now start as a material candidate.
- Day 6 should introduce another exercise rhythm so the week does not feel copied.
- Any future listening or pronunciation work must stay honest until real assets and scoring exist.

## Audit update 2026-06-03 - P3.96 Gavan week 1 day 6 material candidate

### Product logic score

P3.96 is a useful content step because it moves from asking for simpler input to giving short, socially safe replies. The learner practices what people often need in real conversations: accept, commit, decline for today, or pause to check.

### What improved

- Day 6 now uses only reset seed phrases.
- The day focuses on broad everyday replies instead of personal names, numbers, emails, appointments, or apartment-specific content.
- The exercise rhythm differs from day 5: quick reply, missing word, mistake repair, pronunciation placeholder, active recall, and quiz intent.
- Quick-reply items enforce exact option counts and unique options.
- Missing-word items enforce visible blanks and exact option counts.
- Repair items enforce exact target tile counts.
- Distractors remain safe and cannot duplicate target words.
- Pronunciation is honest: placeholders only, no generated audio or scoring claim.
- Active recall still has no correct-word highlighting and no hints.
- Mistakes remain eligible to return later.
- Explanations are attached after answer and cover new words/constructions.
- Quiz intent plans exactly 10 questions without registering a live quiz.
- Production files remain untouched.

### What to watch next

- Day 6 needs a reviewer export/quality packet like days 1-5.
- The export should add gates for quick-reply option counts, missing-word blanks, repair tile counts, pronunciation placeholder honesty, explanation coverage, recall safety, quiz count, and media honesty.
- Day 7 should not start until day 6 review packet confirms the material is broad, understandable, and safe for non-live export.

## Audit update 2026-06-03 - P3.97 Gavan week 1 day 6 material export packet

### Product logic score

P3.97 is a strong quality-control step because it turns day 6 from a candidate into a reviewer-facing export packet with explicit pass/fail gates before day 7 content begins.

### What improved

- Day 6 now has a compact reviewer-facing export packet.
- Reviewer summary separates quick replies, missing-word items, repair items, pronunciation placeholders, recall flags, and quiz intent.
- Quality gates cover quick-reply options, missing-word blanks, repair tiles, pronunciation placeholder honesty, explanation coverage, recall safety, quiz count, media honesty, and production-write safety.
- Broken candidates produce `day6_material_export_blocked` and keep `exportApproved: false`.
- Preview shows day title, block list, phrases, quick-reply line, missing-word line, repair line, pronunciation placeholder line, recall state, and quiz intent.
- The packet remains non-live and does not approve production use.

### What to watch next

- Day 7 can start as a material candidate only from the reviewed day 6 export shape.
- The week still needs real approved audio, real pronunciation readiness, final quiz registration, and live route integration before production readiness can rise.
- The broad `personal_plan` Jest suite currently has unrelated failures outside P3.97, so the next large pass should either clean up that verification chain or continue content work with the blocker reported honestly.
## Audit update 2026-06-03 - P3.99 Gavan week 1 day 7 material export packet

- Day 7 now has a non-live material export quality packet.
- Gavan week 1 material candidate/export chain is now inspectable for days 1-7.
- This does not make the feature production-ready: export packets are reviewer artifacts, not live catalog registration.
- Remaining product blockers: live catalog integration, final quiz registration, approved audio assets, real pronunciation scoring, and UI/runtime smoke for production route changes.
- Verification for this update: focused day 7 export packet tests passed, related material-chain tests passed, broad `personal_plan` Jest passed, and TypeScript passed.

## Audit update 2026-06-04 - P3.101 Gavan week 1 signed approval handoff packet

### Product logic score

P3.101 is a release-discipline improvement. It turns the route approval boundary into a reviewer-ready package without pretending the missing signature exists.

### What improved

- Human review now has one handoff packet for the unsigned route guard, live-route preflight, and all seven material export packets.
- The packet lists exactly which evidence paths must be considered before approval.
- Reviewer checklist now covers route bundle scope, material evidence, regression scope, no live edits before signature, and separate audio/pronunciation blockers.
- The handoff rejects partial material evidence.
- Approved or live-ready input fixtures are rejected instead of opening routes.

### What to watch next

- This handoff is not an approval artifact.
- Live catalog, quiz, and UI route registration remain blocked until explicit signed approval exists.
- Final quiz route candidates can continue as non-live evidence while waiting for signature.

## Audit update 2026-06-04 - P3.102 Gavan week 1 final quiz candidate packet

### Product logic score

P3.102 is a useful final-quiz readiness step because it turns vague "write quizzes later" work into seven inspectable candidate quizzes without registering them as live production content.

### What improved

- The week now has seven final quiz candidates with 70 total candidate questions.
- Every candidate quiz is tied to material export phrases instead of generic legacy quiz leftovers.
- Choice and typing modes are represented in the candidate model.
- RU/UK/ES task-copy readiness is recorded.
- Partial material evidence blocks the packet.
- Live-ready or approved handoff inputs are rejected, so quiz registration cannot sneak in through this artifact.

### What to watch next

- Candidate quizzes are not production quiz source registration.
- A future approved live task must still write `app/personal_plan_quizzes.ts`, run regression, and preserve existing self-guided quiz flows.
- Audio and pronunciation remain separate blockers and should not be treated as solved by quiz readiness.

## Audit update 2026-06-04 - P3.103 Final quiz evidence in route preflight and handoff

### Product logic score

P3.103 is a release-review improvement. It makes the P3.102 quiz work visible inside the actual route-review handoff instead of leaving it as a detached artifact.

### What improved

- Live-route preflight now has a dedicated final quiz evidence block.
- Handoff now includes final quiz candidate evidence alongside material export evidence.
- Reviewer evidence paths now include the final quiz candidate packet.
- Handoff readiness fails when final quiz candidate evidence is incomplete.
- Quiz candidates are still not counted as production registration.

### What to watch next

- The review packet is better, but it is still unsigned.
- Production quiz source edits still require explicit signed approval and a separate registration task.
- Audio approval and pronunciation scoring remain the next major product blockers.

## Audit update 2026-06-04 - P3.104 Audio approval evidence packet

### Product logic score

P3.104 improves review readiness, not end-user audio quality yet. It turns the audio blocker into a concrete packet that names exactly what is missing before the route can sound premium.

### What improved

- Gavan week 1 now has an audio approval evidence packet.
- The packet connects the generation plan, generated-asset validation, and approval-report summary.
- Reviewers can see the exact state: 10 expected MP3 jobs, 0 generated assets, 10 missing generated-file blockers, 0 approved assets, and 0 production-ready assets.
- The packet blocks fake readiness by keeping live, production audio, registration, and pronunciation inference disabled.
- Write policy stays dry-run only under `.codex-tmp` or `docs/reports`.

### What to watch next

- This is not audio production and not audio approval.
- Real MP3 assets still need to be generated or supplied and then explicitly approved.
- Pronunciation scoring/recording readiness remains separate; it cannot be inferred from generated listening audio.
