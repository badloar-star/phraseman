# Skyler Quiz Pipeline And Smartest Mode

Skyler is the source-gated editorial pipeline for new quiz categories.

## Idea Verdict

"Smartest" is a strong product idea if it is treated as a separate content mode,
not as a language. It can sit visually near the language picker, but internally it
should use its own `contentMode` or `learningTrack`, its own progress keys, and a
different menu. Lessons are not the right primary object there. Categories,
quizzes, facts, streak loops, and themed collections are.

## Why It Fits Phraseman

- The app already has quiz mechanics, XP, daily limits, themes, and source gates.
- The current English/French architecture shows that reused banks are risky.
- A knowledge mode can reuse the quiz engine concept while using a different
  authoring pipeline and category taxonomy.

## Keep Separate

- Language learning target: `en`, `fr`.
- Interface/source locale: `ru`, `uk`, `es`, `pt-BR`, `vi`, `id`, `tr`, `pl`.
- Smartest content vertical: not a study target language.

Skyler must read the active interface locale list from `app/source_locales.ts`.
If Heisenberg adds a new active locale, Skyler's protocol check should fail
until prompts, docs, and pack gates cover it.

French is narrower on purpose: until the French source gate changes, French
quiz authoring is limited to the source UI locales declared in
`app/french_content_source_gate.ts`, currently `ru` and `uk`.

## Recommended Implementation Path

1. Build Skyler runs and approved packs outside runtime first.
2. Add a Smartest content schema and static seed pack.
3. Add a menu entry near language selection, but route to a separate Smartest hub.
4. Add progress keys scoped to Smartest.
5. Add tests preventing Smartest state from sharing lesson/quiz target keys.

## Content Standard

Social listening can choose themes. Official sources must prove facts. Direct
translation without research is forbidden for all interface locales.
Validated demand must use at least two distinct social signals with concrete
non-placeholder `source` and `text`; duplicate URLs or repeated source/text
pairs cannot inflate category demand. Single-signal demand stays seed-only.
Evidence metadata is part of quality: source titles, URLs, `usedFor`,
limitations, claim comparisons, and locale review notes must be concrete and
non-placeholder, or the pack stays blocked.
Top-level pack metadata is gated too: `categoryId` must be stable kebab-case,
`categoryTitle` must be concrete, and `researchPolicy.notes` must explain the
research/adaptation basis.
Source IDs, claim IDs, and item IDs must be stable machine IDs, not placeholders
or prose labels.
Track tags must also be stable: language items use lowercase `skillTag` tokens,
Smartest items use lowercase `factTag` tokens, never placeholders or prose.
Item text is gated before explanations: prompt, choices, and learningGoal must
be concrete learner-facing text, not placeholders.
Locale coverage also means real adaptation: Skyler blocks duplicated locale
review notes and identical explanation bundles across interface locales.
Each locale review must name a reviewer owner, so adaptation has accountability
instead of anonymous generated approval.
Each locale review must cite at least two distinct source IDs, so adaptation is
checked against research evidence instead of a single-source note.
Within one item, choice rationales and per-locale explanations must also be
unique per choice, so weak copied feedback cannot hide behind valid schema.
Track metadata is isolated: Smartest `trackPolicy` and `factTag` cannot leak
into English/French packs, and French `frenchGate` cannot leak into English or
Smartest packs.
Source dates must be real non-future `YYYY-MM-DD` values, and item-level
`sourceIds` must cover the sources behind every cited claim.
Duplicate source IDs or duplicate official source URLs do not count as
cross-checking; claim, item, and locale-review source lists must cite distinct
sources, and the source matrix must use unique source URLs with distinct source
hosts. Unused official sources are blocked: every source in the matrix must be
cited by at least one verified claim or `answer_key`.
Every item must cite both a verified target-appropriate content claim and a
verified `answer_key` claim whose `itemId` and `answerIndex` match the item
`id` and `correctIndex`, so the tested rule/fact and selected answer are both
source-backed. Item `claimIds` must be distinct; repeating the same claim does
not add evidence coverage. Each `answer_key.itemId` must itself be the stable
kebab-case item ID, not a prose label.
