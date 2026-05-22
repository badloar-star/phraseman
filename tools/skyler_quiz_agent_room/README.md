# Skyler Quiz Agent Room

Skyler is the editorial pipeline for discovering learner pain, choosing a quiz
category, researching it from reliable sources, and producing quiz packs for:

- English learning quizzes.
- French learning quizzes.
- The separate "Smartest" knowledge mode.

Use this room when the user says Skyler should start work on new quiz
categories or a source-checked thematic quiz pack.

## Start Protocol

1. Read `tools/skyler_quiz_agent_room/README.md`.
2. Read `tools/skyler_quiz_agent_room/ROOM.md`.
3. Read `tools/skyler_quiz_agent_room/QUIZ_STYLE_CONTRACT.md`.
4. Run `npm run skyler:quiz:check`.
5. Start discovery with `npm run skyler:quiz -- --mode discover --target <en|fr|smartest>`.
6. If social-listening evidence is available, pass it with `--social-input <file>`.
7. Present exactly three category candidates to the user.
8. After the user chooses one category, run:

```bash
npm run skyler:quiz -- --mode brief --target <en|fr|smartest> --category <category-id>
```

9. Build the first quiz draft only after the source matrix, style contract, and
   QA checklist are created.
10. Gate any draft with:

```bash
npm run skyler:quiz -- --mode gate --draft <path-to-skyler-pack.json>
```

11. Report done only when the gate decision is `GO`.

## Non-Negotiable Rules

- Direct translation without research is forbidden.
- Social posts are pain signals, not factual sources.
- Validated demand needs at least two distinct social signals; single-signal
  demand stays seed-only.
- Every factual claim needs an official or institution-backed source.
- Every language-learning item needs a target-language reference, not an
  English-bank copy.
- Every language-learning pack needs a `styleProfile` from current quiz-pool
  analysis; generic prompts like `Which word fits`, taxonomy labels like
  `Kitchen — object`, and flat `Correct/Wrong` explanation labels are blocked.
  Prompt, localizedPrompts, and choices must match granularity: full-phrase
  `How do you say...` / `Как сказать...` questions need full-phrase choices;
  single-word choices need direct word/verb prompts.
  Include `readerRewardPattern` so every explanation has a natural memory cue,
  mini-scene, useful contrast, or source-backed fact.
  Mini-scenes must be anchored to a direct language reason: meaning, usage
  boundary, common confusion, or selected-option contrast.
  Explanations must not invent phrase/sentence context that the prompt does not
  contain.
  Correct-answer feedback should not list multiple distractors; put those
  contrasts in wrong-answer feedback.
  Explanations should still keep a grounded human aside or light joke where the
  actual prompt/choices support it; sterile glossary copy is not enough.
- Historical or etymology hooks are allowed only when represented by verified
  source-backed claims. If that evidence is missing, use a mini-scene, usage
  note, or natural memory hook instead.
- French quizzes cannot reuse the English quiz bank while the French source gate
  is closed.
- All active interface source locales must be handled: `ru`, `uk`, `es`,
  `pt-BR`, `vi`, `id`, `tr`, `pl`.
- The active locale list is owned by Heisenberg/source-locale architecture in
  `app/source_locales.ts`; `npm run skyler:quiz:check` must fail if Skyler drifts
  from it.
- The final pack must include source notes, a current-pool style profile, locale
  review notes, and a QA report.

## Commands

```bash
npm run skyler:quiz:check
npm run skyler:quiz -- --mode discover --target en
npm run skyler:quiz -- --mode discover --target fr
npm run skyler:quiz -- --mode discover --target smartest
npm run skyler:quiz -- --mode brief --target en --category conversation-repair
npm run skyler:quiz -- --mode gate --draft docs/skyler/runs/<run>/drafts/pack.json
```

## Artifact Layout

Each run writes to `docs/skyler/runs/<runId>/`:

- `manifest.json`
- `topic_candidates.md`
- `agent_board.md`
- `source_matrix.md`
- `quality_gates.md`
- `work_order.md`
- `gate_report.json` and `gate_report.md` when a draft is checked

Draft packs should live under `docs/skyler/runs/<runId>/drafts/`.
