# QA Report: word_order_basic_question

Status: draft QA complete
Training id: `word_order_basic_question`
Files reviewed in this room pass:
- `tools/personal_training_agent_room/drafts/word_order_basic_question.draft.md`

## Scope Check

- Diagnosis id is exactly one focused mistake category: English questions need a helper before the person in common question shapes.
- Created only requested room artifacts.
- Did not edit `app/diagnosis_training_word_order_basic_question.ts`.
- Did not edit `app/diagnosis_trainings.ts`.
- Did not edit shared docs, manifests, tests, or admin files.

## Replacement Sweep

Commands run:
- `Get-ChildItem app -Filter "diagnosis_training_word_order_basic_question*"`
- `rg -n "word_order_basic_question|diagnosis_training_word_order_basic_question" app tests docs admin tools`

Findings:
- Active app file already exists: `app/diagnosis_training_word_order_basic_question.ts`.
- Registry references already exist in `app/diagnosis_trainings.ts`.
- Existing docs/tests/admin references were observed but not changed because the user explicitly requested draft/report only and said not to touch shared files.

## Product Standard Check

- One concrete mistake: question built like a statement without a front helper.
- The explanation avoids a broad grammar lecture.
- Required learner-facing model is present:
  - RU: "В английском вопросе помощник часто выходит перед человеком: `Do you like coffee?`"
  - UK: "В англійському питанні помічник часто виходить перед людиною: `Do you like coffee?`"
  - ES: "En una pregunta en inglés, el ayudante suele ir antes de la persona: `Do you like coffee?`"
- RU/UK/ES copy is present for the training voice, learner pattern, core rule, every prompt, and every feedback item.
- Tone is calm, concrete, and shame-free.

## Step Count

The draft contains exactly 12 numbered steps:

1. `Do you like coffee?`
2. `Do they live here?`
3. `Does she speak English?`
4. `Did you call him?`
5. `Did they leave early?`
6. `Where do you live?`
7. `What does he want?`
8. `Are you ready?`
9. `Is he at home?`
10. `Can you help me?`
11. `What can you do?`
12. `When does she start work?`

## Options And Feedback

- Each step has 4 answer variants.
- Each step marks 1 correct variant.
- Every variant has its own feedback in RU/UK/ES.
- Wrong feedback is tied to the exact mistake:
  - statement-shaped question
  - wrong helper for `you/they`
  - wrong helper for `he/she/it`
  - `does + -s`
  - `did + past verb`
  - unnecessary `do` with `are/is/can`
  - helper not placed before the person

## Similar Phrases

- Each step contains 3 similar phrases.
- Total similar phrases: 36.
- Similar phrases stay inside the same repair pattern instead of expanding into unrelated grammar.

## Risk Notes

- The existing app training appears to contain broader labels and some mojibake in terminal output, but no app file was modified in this pass.
- This draft is ready for a later implementation pass if the user asks to replace the connected app training.

## QA Verdict

Pass for requested artifact scope: the draft/report files exist, the draft has 12 steps, RU/UK/ES coverage, 3 similar phrases per step, and separate feedback for every answer variant.

Focused Jesse gate passed:
- `npm run training:jesse:check`
- 3 test suites passed
- 7 tests passed
