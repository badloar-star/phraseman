# Personal Plans Mode Roadmap

This is the execution order for making Personal Plans a complete product experience.

## Priority 1 - linked_lesson_slice

Goal: a plan task opens an existing lesson, uses the normal lesson mechanics, counts only correct answers, stops after the required phrase count, and lets the user continue freely after the plan part is done.

Acceptance:

- A plan lesson slice has explicit params: `lessonId`, `requiredPhrases`, optional `requiredPhraseIds`, `planId`, `planInstanceId`, `taskId`, `dayIndex`.
- Progress counts only correct assembled phrases.
- Wrong answers create plan attempt events and recovery candidates.
- Completion is isolated by `planInstanceId`.
- UI can show a plan slice header and a completion modal without changing the normal non-plan lesson path.
- Existing standalone lesson flow stays unchanged.

## Priority 2 - plan_phrase_build

Goal: route-specific phrases use the same word-building feeling as normal lessons, but with plan content, exact word counts, safe distractors, no highlighted correct words during recall, and grounded explanations.

Acceptance:

- Runtime supports `plan_phrase_build`.
- Canonical Gavan bridge maps `phrase_build` to this runtime type.
- The renderer receives choices, target, explanations, and progress policy.
- Wrong answers return to recall/trainer.
- Tests cover distractor safety and no mojibake/dev copy.

## Priority 3 - plan_listen_choose

Goal: user hears approved generated audio and chooses the matching phrase/meaning.

Acceptance:

- Copy is clean Russian.
- Missing approved audio blocks the task honestly.
- Approved audio unlocks the item.
- Explanations do not pretend to know unseen choices.
- UI has a large play button, clear choices, replay, and calm feedback.

## Priority 4 - plan_listen_build

Goal: user hears audio and builds the phrase from word tiles.

Acceptance:

- Uses approved audio only.
- Word tiles match target token count.
- Distractors are safe.
- Replay and slower replay are available.
- Mistakes feed recall/trainer.

## Priority 5 - plan_pronunciation_repeat

Goal: user repeats a phrase out loud and records an attempt without fake scoring.

Acceptance:

- Recording contract is stable.
- If scoring is unavailable, UI says that honestly and still gives useful shadowing practice.
- Attempts are stored as plan pronunciation attempts.
- Later scoring can attach without changing content ids.

## Priority 6 - plan_quiz

Goal: each day can have a separate 10-question plan quiz with plan-aware mistakes.

Acceptance:

- Exactly 10 questions.
- Questions only use content already introduced by that day.
- Mistakes include planId, planInstanceId, taskId, dayIndex, contentUnitId/questionId.
- Explanations are authored and clean.

## Priority 7 - personal_practice_seeded

Goal: if "Моя практика" has enough due material, it becomes a plan task.

Acceptance:

- Appears only with enough due items.
- Does not create empty tasks.
- Completion returns to plan.
- Weak spots update plan analytics.

## Priority 8 - trainer_weak_spot

Goal: trainer tasks become part of the plan when route mistakes exist.

Acceptance:

- Attempt event creates weak spot.
- Weak spot can become trainer task.
- Unfinished trainer task carries over.
- Completion updates plan progress.

## Priority 9 - flashcards_plan_review

Goal: due cards can be a plan reinforcement task.

Acceptance:

- Appears only with enough due cards.
- Uses existing card review.
- Completion returns to plan.
- Card results inform plan analytics.

## UI Standard For All Modes

- One clear primary action per screen.
- Large touch targets, at least 44px.
- No developer copy.
- No fake readiness.
- Dark premium route style, theme accent inherited from app theme.
- Cards/buttons should feel tactile and polished, but not noisy.
- Feedback modals must explain the result and next step in simple language.

