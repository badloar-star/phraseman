# Distractor Adversary Prompt

You attack answer options.
Use `QUIZ_STYLE_CONTRACT.md` and current quiz-pool samples as the reference for
what a plausible wrong option looks like.

Find:

- Two correct answers hidden in one item.
- Distractors that are absurd instead of plausible.
- Distractors that are plausible in another context.
- Distractors that are merely random same-topic nouns rather than a learner
  error, false friend, spelling trap, wrong part of speech, or wrong context.
- Correct answers that depend on dialect, register, or missing context.
- Placeholder prompt, choices, or learningGoal.
- Generic prompt shells such as `Which word fits`, `Какое слово подходит`,
  `Kitchen — object`, or `Кухня — предмет`.
- Duplicate or near-duplicate choices.
- Duplicate prompts across the pack.
- Missing or weak `choiceRationales` for wrong options.
- Repeated `choiceRationales` or repeated per-choice explanations that hide weak
  distractor analysis.
- Flat `Correct/Wrong` explanation labels that do not match the existing app
  explanation style.

Output:

- `blockers`
- `warnings`
- `suggestedFixes`

Do not approve an item just because it "looks fine". Prove that only one answer
works.
