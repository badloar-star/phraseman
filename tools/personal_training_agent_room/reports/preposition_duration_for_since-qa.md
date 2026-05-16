# QA Report: preposition_duration_for_since

Room: Jesse Pinkman
Training id: `preposition_duration_for_since`
Draft reviewed: `tools/personal_training_agent_room/drafts/preposition_duration_for_since.draft.md`
Report status: pass for draft handoff

## Scope Check

| Check | Result |
| --- | --- |
| Works only on `preposition_duration_for_since` | Pass |
| Creates no app implementation changes | Pass |
| Does not touch registry/taxonomy/admin | Pass |
| Focuses only on `for` vs `since` | Pass |
| Does not mix with other prepositions in answer options | Pass |
| RU/UK/ES copy is separate | Pass |
| Every wrong answer has exact feedback | Pass |

## Product Rule Check

Required learner model:

- RU: `for` отвечает на "как долго", `since` показывает "с какого момента".
- UK: `for` відповідає на "як довго", `since` показує "з якого моменту".
- ES: `for` responde a "cuánto tiempo", `since` muestra "desde qué momento".

Result: Pass. The draft repeats this model in the rule card, retry hints, correct feedback, and wrong feedback.

## No-Terms Check

The draft avoids grammar labels in learner-facing explanations. It does not teach through tense names or broad grammar categories. The learner is asked only to identify whether the words after the gap answer:

- "как долго" / "як довго" / "cuánto tiempo"
- "с какого момента" / "з якого моменту" / "desde qué momento"

Result: Pass.

## Distractor Feedback Check

All single-choice exercises use only two answer options: `for` and `since`.

For each wrong option, the feedback names:

- the exact wrong phrase, for example `since two hours` or `for 2020`;
- why it fails;
- the correct question to ask;
- the correct replacement.

Pair exercises use only pairs made from `for` and `since`. Wrong feedback identifies the exact part of the pair that is wrong.

Result: Pass.

## Exercise Coverage

The draft contains 14 exercises:

- 6 easy items
- 4 contrast items
- 4 mixed pair items

Covered patterns:

- `for` + answer to "how long": `two hours`, `five years`, `a long time`, `a week`, `three nights`, `an hour`
- `since` + answer to "when it began": `2020`, `January`, `Monday`, `last Friday`, `the weekend`, `school`, `morning`
- paired checks where the learner must separate the two questions inside one sentence

Result: Pass.

## Forbidden Mixing Check

The draft keeps answer options limited to `for` and `since`.

Result: Pass.

## Replacement Sweep Notes

Observed current app state before creating the draft/report:

- Active app file exists: `app/diagnosis_training_preposition_duration_for_since.ts`
- Registry references exist in `app/diagnosis_trainings.ts`
- No stale same-id app files were found by filename scan.

No app files were edited in this pass because the requested deliverables were the draft and QA report only.

## Handoff Recommendation

When this draft is promoted into app code:

- replace `app/diagnosis_training_preposition_duration_for_since.ts` in place;
- keep exactly one registry import and route;
- keep `answerOptions` limited to `for` and `since`;
- keep each wrong option mapped to its own RU/UK/ES explanation;
- do not add admin/taxonomy/registry changes unless the promotion task explicitly asks for them.

## Focused Gate

Command:

```powershell
npm run training:jesse:check
```

Result: Pass.

- `tests/diagnosis_training_copy.test.ts`: passed
- `tests/personal_training_agent_room.test.ts`: passed
- `tests/diagnosis_training_hygiene.test.ts`: passed
- Total: 3 suites, 7 tests
