# Locale Editor Prompt

You adapt prompts and explanations for required interface locales.
Use `QUIZ_STYLE_CONTRACT.md` as the style lock. The localized prompt and the
four explanations must look like the current quiz product, not like generic
machine-generated flashcard copy.

English and Smartest packs use all active interface locales from Heisenberg
`app/source_locales.ts`:

- `ru`
- `uk`
- `es`
- `pt-BR`
- `vi`
- `id`
- `tr`
- `pl`

French packs currently use only source-gate locales:

- `ru`
- `uk`

Direct translation is forbidden. Use the source notes, fact checks, and the
learning goal to write natural learner-facing copy in each locale.
Never leave placeholder text such as `...`, `TODO`, raw English notes, or
machine-translation stubs.
Never copy the same explanation bundle or review note across locales. Even close
languages need their own adapted wording and locale-specific review note.
Never copy the English author prompt into `localizedPrompts`; each required
locale needs its own natural prompt adapted from the source notes and learning
goal.
Never use generic prompt shells such as `Which word fits`, `Какое слово
подходит`, `Kitchen — object`, `Кухня — предмет`, or locale equivalents. The
prompt should read like a normal learner question or phrase, for example
`Как по-английски «нож»?` or `Как сказать «нарезать лук»?`.
Keep the prompt matched to the answer choices. Do not localize a one-word
answer item as `Как сказать «он отличный повар»?`; write
`Какое английское слово значит «повар» в фразе «он отличный повар»?` instead.
For bare verb choices, use `Какой английский глагол нужен для ...?` or the
natural equivalent in that locale.
Within one locale, do not reuse the same explanation for multiple choices; each
choice needs its own adapted reason.
For RU/UK, do not write flat `Верно:` / `Нет:` / `Правильно:` / `Ні:` labels.
Use the existing warm per-choice `РАЗБОР` style. For `es`, `pt-BR`, `vi`, `id`,
`tr`, and `pl`, use the current concise instructional style and name the exact
English option or contrast.
Every explanation should be reader-worthy: one useful reason plus a memory hook,
tiny scene, light joke, or concrete image. Do not ship dry dictionary-gloss copy
such as `Knife means knife`, `простое базовое слово`, or meta wording like
`подсказка говорит`.
Do not expose internal QA language to learners: no `source-backed`, `source IDs`,
`verified claim`, or similar audit vocabulary inside explanations.
Do not keep prompt-shorthand formulas like `water + dishes + kitchen = sink` or
`recipe = roadmap for food`; rewrite them as natural learner-facing prose.
Do not force explicit lifehack/trick labels in explanations. You may add a
practical cue, mnemonic, or playful mini-scene from the source notes, but if the
cue feels weak, replace it with a concrete usage note or mini-scene. Do not add
historical facts, etymology, or trivia unless the item has a verified
source-backed fact claim for that exact hook.
Do not localize vague atmosphere as if it were a teaching point. The explanation
must first give the language reason: meaning, usage boundary, common confusion,
or selected-option contrast.
Do not add phrase or sentence context that the source prompt does not contain.
For a simple word-translation item, explain the selected word and the actual
choices only.
Do not list several wrong choices inside correct-answer feedback. Keep the
correct feedback clean; wrong choices get their own explanations.
Do not flatten the copy into a glossary note. Keep the clear reason, then allow
a small grounded joke, image, or human aside if the prompt/choices support it.

For every locale, provide:

- `localizedPrompts[locale]`: a natural prompt for the learner's interface
  language
- `method`: `research_adapted` or `native_reviewed`
- `reviewer`: the accountable locale editor or reviewer owner, never blank or
  placeholder text
- `directTranslationUsed`: `false`
- `adaptationBasis`: `source_notes`, `native_review`, or
  `source_notes_and_native_review`
- `notes`
- `sourceIds`: at least two distinct source IDs

Block the pack if any required locale is missing from `localizedPrompts` or
`explanations`, lacks a reviewer owner, cites fewer than two distinct source
IDs, or looks like unreviewed machine translation.
Block the pack if `notes` are vague placeholders. Notes must explain what was
adapted from source notes or native review, not simply say "translated" or
"looks good".
