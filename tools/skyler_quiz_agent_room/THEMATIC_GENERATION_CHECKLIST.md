# Skyler Thematic Generation Checklist

Use this before generating any new English thematic quiz pack.

## Canonical Baseline

- Read `app/quiz_thematic_kitchen_and_cooking.ts` first.
- Treat Kitchen and cooking as the product style baseline.
- New packs must feel like the same feature family, not like generated glossary
  cards.

## Item Contract

- Target: `en`.
- User-facing prompt: localized into `ru`, `uk`, `es`, `pt-BR`, `vi`, `id`,
  `tr`, `pl`.
- Choices: always four English choices.
- Correct answer: exactly one `correctIndex`.
- IDs: `<category-id>-001`, `<category-id>-002`, continuing in order.
- Metadata: `learningGoal`, `skillTag`, `sourceIds`, `claimIds`,
  `choiceRationales`, `qualityChecks`, and localized `explanations` are required.

## Prompt Rules

- Ask in the user's interface/source locale.
- Make the learner choose the English word, verb, object, or phrase.
- Match prompt and choice size:
  - one-word choices -> ask for one word;
  - verb choices -> ask for the verb;
  - phrase choices -> ask for the phrase.
- Use concrete everyday prompts: visible object, function, action, place, or
  short situation.
- Do not use taxonomy labels, generic shells, or meta wording.

## Explanation Rules

- Each choice gets its own explanation in every active locale.
- Explanation must name the selected English option or the correct English
  contrast.
- RU/UK can be warmer and more playful: `Ð‘Ð¸Ð½Ð³Ð¾!`, `Ð›Ð¾Ð²ÑƒÑˆÐºÐ°!`, `ÐžÐ¹`, a small
  scene, or a useful memory image.
- ES/PT-BR/VI/ID/TR/PL should be shorter but still concrete and useful.
- Correct-answer explanation focuses on why the answer works.
- Wrong-answer explanation says exactly why that selected option fails.
- Do not mention internal evidence wording: no `source-backed`, `source IDs`,
  `verified claim`, or gate language in learner-facing copy.
- Do not reuse one generic explanation tail across choices.

## Distractor Rules

- Distractors must be plausible: same category, near action, false friend,
  wrong part of speech, wrong tool, wrong context.
- Distractors must not create a second correct answer.
- Every distractor must have a unique `choiceRationale` and matching localized
  explanation.

## Evidence Rules

- At least two Tier A/B sources per item.
- Social signals prove demand only; never use them to prove an answer.
- Every item needs one verified content claim and one verified `answer_key`
  claim.
- `answer_key.itemId` and `answer_key.answerIndex` must exactly match the item.

## First-10 Gate

- Show the first 10 generated items in chat before generating the rest:
  item id, prompt, choices, answer, and per-choice explanations.
- Wait for user approval or explicit continuation.
- If the first 10 are off-style, rewrite the pattern before continuing.
- Do not show a bare question list as a generation preview. The preview must
  include the explanation for every choice, because explanation style decides
  whether the item belongs in the product.
