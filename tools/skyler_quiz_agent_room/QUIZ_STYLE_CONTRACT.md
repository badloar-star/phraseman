# Skyler Quiz Style Contract

Skyler language quiz packs must match the existing quiz surface before they can
ship. This contract is based on sampled pool copy in `app/quiz_data.ts` and
`app/quiz_source_locale_payloads.ts`; it is a gate input, not optional advice.

## Visual Asset Style Baseline

All thematic quiz plaques and topic icons must use the approved DALL-E raster
style baseline from the May 26, 2026 level-card/thematic-card refresh. The
visual reference is the `Легко / Средне / Сложно` quiz level plaque style and
the dark glossy thematic cards with rounded-square topic icons.

Required visual direction:

- Generate bitmap art with DALL-E or an equivalent AI image-generation pass.
  Do not create the plaque or icon artwork as SVG/vector/code-drawn shapes.
- Use premium mobile-game illustration: dark glossy rounded plaque, soft
  enamel/glass material, smooth silver bevels, gentle inner green/olive glow,
  and readable object art.
- Keep the plaque left half quiet and low-detail so app-rendered title,
  subtitle, and badge text remain legible. Put the topic object cluster on the
  right half.
- Keep compact icons centered, readable at small size, and visually paired with
  the matching plaque.
- Preserve the same composition, proportions, card quiet zone, icon placement,
  and dark polished material across all app visual families. Do not create a
  separate cyber/neon/flat style per family for thematic quiz plaques.
- Never include bitmap text, letters, numbers, currency signs, random symbols,
  UI labels, watermarks, or generated pseudo-writing in plaques or icons.
- Avoid the rejected cyberpunk direction: no city backdrops, hacker/circuit
  grids, harsh neon tubes, magenta/cyan noise, wires, robots, weapons, skulls,
  or busy tech panels.
- Preferred mood: clean, calm, dark premium learning-game asset, like the
  existing level cards and the approved thematic cards in the app screenshot.

Canonical prompt anchor:

`premium mobile game illustration, DALL-E generated raster art, same style as
the app quiz level cards, dark glossy rounded enamel/glass plaque, silver bevel,
muted green/olive glow, left half reserved for app text, topic object on right,
matching compact dark rounded-square icon, no text, no letters, no numbers, no
symbols, no watermark, not cyberpunk`.

## Source Pools To Sample

- `app/quiz_data.ts`: current easy/medium/hard prompts, English choices, RU/UK
  explanations, and Spanish explanations.
- `app/quiz_source_locale_payloads.ts`: Heisenberg-owned explanations for
  `pt-BR`, `vi`, `id`, `tr`, and `pl`.
- `app/quiz_thematic_kitchen_and_cooking.ts`: canonical Skyler thematic pack.
  New thematic packs must match its prompt shape, English-choice rule,
  per-choice explanation rhythm, source/claim structure, and distractor quality.

Every language pack must include a `styleProfile` proving that these files were
sampled before writing:

- `basedOnExistingPools: true`
- `sampledFiles` includes both files above
- `promptPattern`, `explanationPattern`, `readerRewardPattern`, and
  `distractorPattern` describe the observed product style and how the pack
  follows it.

## Canonical Thematic Pack Rules

Use `kitchen-and-cooking` as the strict baseline for all new thematic English
packs. If a new pack does not feel like a sibling of Kitchen and cooking, stop
and rewrite before adding tests or app integration.

Hard structure:

- Target is `en`; choices are always English words or English phrases.
- `prompt` is the author prompt; `localizedPrompts` are required for `ru`, `uk`,
  `es`, `pt-BR`, `vi`, `id`, `tr`, and `pl`.
- The learner sees the interface-locale prompt and chooses from four English
  choices. Do not translate choices into the interface locale.
- Every item is `type: "mcq"` with exactly four unique choices and exactly one
  `correctIndex`.
- Item IDs are stable kebab-case: `<category-id>-001`, `<category-id>-002`, etc.
- `skillTag` is a lowercase machine tag, not prose.
- Every item has `learningGoal`, `sourceIds`, `claimIds`, `choiceRationales`,
  `qualityChecks`, and `explanations` for all active interface locales.
- Every item cites at least two Tier A/B sources. Social/forum evidence can
  justify demand only; it cannot prove answers.
- Every item has a verified content claim plus a verified `answer_key` claim
  whose `itemId` and `answerIndex` match the item exactly.

Content shape:

- Prefer concrete everyday clues: objects, room/scene use, visible function,
  recipe-style action, or near-miss contrast.
- The prompt must match the answer granularity. If choices are one-word nouns,
  ask for one word. If choices are verbs, ask for the verb. If choices are full
  phrases, ask for a full phrase.
- Good prompt families:
  - `Как по-английски «нож»?`
  - `Какой английский глагол нужен для «мариновать мясо»?`
  - `Какая английская фраза подходит для ...?`
  - `Что означает ...?`
- Bad prompt families:
  - taxonomy labels like `Home - furniture`
  - generic shells like `Which word fits?`
  - meta wording like `The clue asks for...`
  - prompts that require a sentence while choices are single words.

First-10 rule:

- Before generating or expanding a full pack, show the user the first 10 items
  in chat: item id, prompt, four choices, answer, and per-choice explanations.
- Do not proceed to the remaining items until those first 10 are reviewed or
  the user explicitly says to continue.
- If the user rejects the style, rewrite the rules/examples first, then generate
  again. Do not patch around one item while leaving the pattern broken.
- A preview without explanations is incomplete. Explanations are part of the
  item design, not a later decoration.

## Prompt Style

Current quiz prompts are learner-facing source-locale phrases or natural
questions, not meta questions and not taxonomy labels. For thematic vocabulary,
write the kind of thing a learner would actually understand in a quiz: a short
human clue, phrase, or micro-situation.

Allowed shape:

- `Чем нарезают овощи?`
- `Из чего обычно пьют чай?`
- `Он отличный повар`
- `Нарезать лук мелкими кусочками`

Blocked shells:

- `Кухня — предмет. ...`
- `Kitchen — object. ...`
- `Which word fits: ...`
- `Which kitchen word fits: ...`
- `Which verb best completes the sentence: ...`
- `Какое слово подходит: ...`
- Equivalent generic shells in `uk`, `es`, `pt-BR`, `vi`, `id`, `tr`, or `pl`.

Prompt/choice granularity must match. If the prompt asks `How do you say...`,
`Как сказать...`, or a locale equivalent for a full phrase, the answer choices
must be full phrase translations. If the choices are single words or bare
verbs, the prompt must ask for that word or verb directly: `Какое английское
слово значит «повар»...` or `Какой английский глагол нужен для «нарезать
лук»?`. Do not make the learner infer a whole sentence from a one-word choice.

## Explanation Style

Explanations are per-choice feedback shown in the `РАЗБОР` / `EXPLANATION`
block. Each entry must explain why that exact selected option works or fails.
This block is a product moment, not a dictionary note: it should feel like a
tiny reward after the tap. The learner should want to read it because it gives
one useful idea, a direct language reason, a concrete image, or a small smile.
The concrete image is allowed only after the explanation makes the meaning,
usage boundary, or contrast clear. Atmosphere without a language reason is not
reader value.
Do not overcorrect into sterile dictionary copy. Safe explanations still need
product voice: a light joke, grounded image, or small human aside is welcome
when it comes from the actual prompt and choices.

RU/UK style:

- Warm, concrete, and close to the current product tone.
- Usually starts with a small hook such as `Бинго!`, `Ловушка!`, `Ой`,
  `Предупреждение!`, `Ха-ха!`, `Победа!`, or a similarly natural Ukrainian
  equivalent.
- Names the English option or contrast when it matters.
- Explains the learner mistake, not only the dictionary meaning.
- Gives a reader-worthy hook: a tiny scene, mnemonic, joke, or useful image.
- Avoids dry `Верно:` / `Нет:` / `Правильно:` / `Ні:` labels.

## Reader Reward Rule

Every explanation must give the learner one small reason to keep reading after
the tap. Use at least one of these reward types:

- A concrete mini-scene that makes the meaning easy to picture.
- A practical usage cue for remembering or using the word, written naturally.
- A mnemonic, tiny joke, or useful contrast with the selected option.
- A source-backed fact, historical note, or etymology hook.

Historical notes, etymology, and factual trivia are allowed only when they are a
source-backed fact in the pack evidence. They must appear as verified claims
with source IDs and sourceComparison, and they cannot replace the required
language usage/grammar claim for the item. If no source-backed fact is verified,
use a concrete mini-scene, natural memory cue, or useful contrast instead.

Gate-level requirements:

- Do not show internal evidence language to learners: no `source-backed`,
  `source IDs`, `verified claim`, or similar audit wording inside explanations.
- Do not explain taxonomy to the learner. The explanation must be about the
  tapped English word, its meaning, and the contrast with the correct word, not
  that a word lands in a kitchen/category/section.
- Do not force an explicit `Лайфхак:`, `Truco:`, `Dica:`, `Mẹo nhớ:`,
  `Trik:`, `İpucu:`, or `Sztuczka:` label in explanations. If
  the cue is genuinely useful, write it as normal feedback. If it is not useful,
  use a mini-scene, usage note, or verified fact instead.
- Do not make the correct answer depend on another unrelated target word, such
  as `bake and oven go together`, unless the prompt itself tests that
  collocation or a source-backed usage claim requires it.
- Do not write vague scene rewards such as `imagine cold water in your hand and
  the word is in place`. Explain the language choice first: meaning, usage
  boundary, common confusion, or why the selected option fits.
- Do not invent sentence or phrase context. If the prompt is only `How do you
  say "knife"?`, the explanation must not say `in this phrase vegetables...` or
  describe objects/actions that are not in the prompt. Explain the selected
  choice and the actual prompt evidence.
- Correct-answer feedback should not list multiple distractors. Keep the
  correct explanation focused on the right word; put detailed distractor
  contrasts in the wrong-answer feedback.
- Do not write formulaic pseudo-lifehack copy such as `water + dishes + kitchen
  = sink` or `recipe = roadmap for food`. If it looks like prompt shorthand,
  rewrite it as a normal human image or usage cue.
- Each explanation must be long enough to carry one useful idea, but short
  enough for the quiz card.
- Each explanation must mention the selected English choice or the correct
  English contrast, so wrong-answer feedback stays tied to the actual tap.

ES/PT-BR/VI/ID/TR/PL style:

- Shorter and more instructional than RU/UK.
- Names the selected English option and the exact reason.
- Correct answers can start naturally (`Correcto.`, `Correto.`, `Đúng.`,
  `Benar.`, `Doğru.`, `Dobrze.`), but not as flat `Correcto:` label copy.
- Wrong answers must state the concrete mismatch, false friend, grammar error,
  or context problem.
- Keep the same reader-first standard in a locale-appropriate way; concise does
  not mean lifeless.

Blocked explanation patterns:

- Flat Correct/Wrong label prefixes such as `Correct:`, `Wrong:`, `Верно:`,
  `Нет:`, `Правильно:`, `Ні:`, `Correcto:`, `Certo:`.
- Generic filler such as “another kitchen word” or “other kitchen word”.
- Dry dictionary-gloss feedback such as “Knife means knife”, “простое базовое слово”,
  or “the prompt asks...”.
- Meta wording like “подсказка говорит/просит” instead of explaining the
  selected option directly.
- One explanation, or one long generated explanation tail, reused for multiple
  choices.
- Locale bundles copied from another locale.

## Distractor Style

Choices must look like the current pools:

- Four unique English choices.
- Exactly one correct answer.
- Wrong options are plausible learner errors, same-domain confusions, spelling
  traps, false friends, wrong part of speech, or wrong context.
- Avoid random unrelated nouns unless the current pool pattern intentionally
  uses a near-spelling joke and the explanation makes that joke pedagogical.
- Every distractor needs a unique `choiceRationale` and a matching per-locale
  explanation.

## Gate Rule

When uncertain, Skyler must block and rewrite. Do not ship a pack that only
sounds like generated dictionary feedback. It must sound like the quiz product
already in the app.
