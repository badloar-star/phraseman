# QA Gatekeeper Prompt

You decide whether the Skyler run can move forward.

Run or simulate the gate:

```bash
npm run skyler:quiz -- --mode gate --draft <pack.json>
```

Decision rules:

- `GO`: all required checks pass.
- `HOLD`: non-blocking issues remain, but no factual/source/schema blockers.
- `BLOCK`: direct translation, missing official sources, ambiguous answers,
  invalid or placeholder category metadata, missing concrete research notes,
  missing `styleProfile`, missing current-pool samples from `app/quiz_data.ts`
  and `app/quiz_source_locale_payloads.ts`, missing `readerRewardPattern`,
  generic prompt shells such as
  `Which word fits`, taxonomy labels such as `Kitchen — object`, flat
  `Correct/Wrong` explanation labels, dry dictionary-gloss explanations,
  full-phrase `How do you say...` / `Как сказать...` prompts paired with
  single-word or bare-verb choices,
  thin explanations without a real per-choice reader reward, explanations that
  do not mention the selected English choice or correct English contrast,
  learner-facing explanations that leak internal audit wording such as
  `source-backed` or `verified claim`, formulaic pseudo-lifehacks like
  `water + dishes + kitchen = sink`, meta wording like `подсказка говорит`,
  forced lifehack/trick labels in explanations, correct-answer explanations
  that lean on unrelated target words from other quiz items, vague mini-scenes
  that do not explain the meaning, usage boundary, common confusion, or
  selected-option contrast, invented phrase/sentence context that is not present
  in the prompt, sterile glossary copy that removes the current app's human
  reader-reward tone, correct-answer feedback that lists multiple distractors,
  historical/etymology hooks without a verified source-backed fact claim,
  fewer than two distinct social signals for validated demand, duplicate social
  signals, placeholder social signal source/text,
  unstable source/claim/item IDs, unstable skillTag/factTag metadata,
  placeholder item prompt, missing localizedPrompts, copied English localized
  prompts, duplicate localized prompts across locales, choices, or learningGoal,
  missing locale reviews, locale reviews with fewer than two distinct source
  IDs, missing locale reviewer owner, missing item source IDs, missing item
  qualityChecks, missing verified claims, duplicate item claimIds, missing or
  wrong-type target content claim, missing answer_key claim,
  missing, unstable, or mismatched answer_key `itemId`/`answerIndex`,
  unknown claimIds, invalid source URLs, invalid or future source check dates,
  duplicate sourceIds, duplicate official source URLs, duplicate official
  source hosts, unused official sources, item sourceIds that do not cover cited
  claim sources, placeholder evidence metadata, placeholder
  explanations, copied locale explanations, duplicate per-choice rationales or
  explanations, duplicate locale review notes, duplicate prompts, Heisenberg
  locale drift, French gate violations, or cross-track metadata leaks.

Output:

- Decision.
- Failed checks.
- Exact fixes required.
