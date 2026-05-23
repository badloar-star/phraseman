# Skyler Room Protocol

Room name: Skyler

Mission: discover high-interest quiz categories, validate them with reliable
sources, and produce polished quiz packs that feel curious, useful, and safe for
students.

## Product Tracks

- `en`: thematic English-learning quiz packs.
- `fr`: thematic French-learning quiz packs behind the French source gate.
- `smartest`: a separate knowledge mode with facts, categories, and curiosity
  loops. It is not a normal study target language.
- Interface locales come from Heisenberg/source-locale architecture. Skyler must
  follow `app/source_locales.ts` instead of inventing or freezing its own list.
  Current active baseline: `ru`, `uk`, `es`, `pt-BR`, `vi`, `id`, `tr`, `pl`.
- Active app visual families for thematic assets: `forest`, `dark`, `neon`,
  `neonGreen`, `gold`, `coral`, `minimalLight`, `minimalDark`.

## Architecture Rule For "Smartest"

"Smartest" should be modeled as a content vertical or learning track, not as a
language in `StudyTarget`. The existing language-target switch owns learning
state for English/French. "Smartest" needs its own navigation, progress keys,
category taxonomy, and menu shape so it can have quizzes, facts, streaks, and
future game loops without polluting lesson progress.

## Agent Office

- Skyler Orchestrator: owns the run, scope, user choice, and final GO/HOLD/BLOCK.
- Social Listening Analyst: scans allowed public channels or supplied exports
  for learner pain, repeated confusions, and curiosity hooks.
- Topic Taxonomist: turns noisy signals into exactly three candidate categories.
- Source Librarian: builds the official source matrix and rejects weak sources.
- Fact Checker: verifies claims, examples, answer keys, and nuance.
- Quiz Architect: designs item types, difficulty ramp, and category structure.
- Visual Asset Producer: runs the visual asset kickoff / AI visual asset pass as
  the first creation step by generating DALL-E/imagegen theme card backgrounds
  and theme logos (the topic plaque and topic icon) for every active app visual
  family / all active app theme modes before quiz drafting.
- Visual Asset Director: verifies that the AI visual asset pass matches existing
  thematic quiz style, keeps card art text-safe on the left, and records source
  files plus final WebP outputs.
- English Quiz Writer: writes English-learning items from English references.
- French Quiz Writer: writes French-learning items from French/FLE references.
- Smartest Writer: writes general-knowledge items with cited facts.
- Distractor Adversary: attacks wrong options for ambiguity and accidental truth.
- Locale Editor: adapts prompts/explanations for every active interface locale.
- Style Editor: keeps the current app tone: crisp, warm, useful, not lecture-y.
- Integration Maintainer: maps output to app schemas, gates, tests, and assets.
- QA Gatekeeper: runs the Skyler gate and blocks anything under source standard.

## Allowed Source Tiers

- Tier A: official institutions, academic/university material, government or
  museum/library/science bodies, CEFR/FLE/ELT references, dictionaries.
- Tier B: established educational publishers and expert-edited reference sites.
- Tier C: social posts, forum threads, blogs, creator posts. Tier C can discover
  pain only; it cannot prove a fact or grammar rule.

## Discovery Flow

1. Gather pain signals from public, allowed, attributable sources or user-provided
   exports.
2. Cluster signals into themes.
3. Produce exactly three category candidates.
4. Mark each candidate as `ready`, `needs_sources`, or `hold`.
5. The user chooses one candidate.

## Creation Flow

1. Run the visual asset kickoff / AI visual asset pass before quiz drafting:
   create DALL-E/imagegen theme card backgrounds and theme logos (the topic
   plaque and topic icon) for every active app visual family / all active app
   theme modes (`forest`, `dark`, `neon`, `neonGreen`, `gold`, `coral`,
   `minimalLight`, `minimalDark`) in the style of existing Phraseman thematic
   assets. Exact active app visual family coverage string: `forest`, `dark`,
   `neon`, `neonGreen`, `gold`, `coral`, `minimalLight`, `minimalDark`.
   This is the mandatory DALL-E topic plaque and topic icon start gate.
2. Build a source matrix before writing questions.
3. Write the category brief.
4. Read `QUIZ_STYLE_CONTRACT.md` and sample `app/quiz_data.ts` plus
   `app/quiz_source_locale_payloads.ts`.
5. Draft the first pack with a concrete `styleProfile`.
6. Attach source IDs to every item and claim.
7. Attach locale review notes for every active interface locale.
8. Run the gate.
9. Fix only the failed gate areas.

## Hard Editorial Rules

- Direct translation without research is forbidden.
- Social posts are pain signals, not factual proof.
- Validated demand needs at least two distinct social signals with concrete
  non-placeholder `source` and `text`; duplicate URLs or repeated source/text
  pairs do not count as separate pain signals. Single signals stay `seed-only`.
- Official source records must use real source titles, http(s) URLs, concrete
  `usedFor` notes, concrete limitations, and non-future `YYYY-MM-DD` checked
  dates. Official source records must have unique source URLs; two source IDs
  pointing to the same URL do not count as cross-checking. Official source
  records must also use distinct source hosts; two pages on one host are not
  independent cross-checking.
- Block unused official sources: every source in `officialSources` must be
  cited by at least one verified claim or `answer_key`.
- Pack metadata must be concrete: stable kebab-case `categoryId`, non-placeholder
  `categoryTitle`, and non-placeholder `researchPolicy.notes`.
- Language quiz packs must include `styleProfile` evidence from
  `QUIZ_STYLE_CONTRACT.md`, `app/quiz_data.ts`, and
  `app/quiz_source_locale_payloads.ts`; generic shells like `Which word fits`
  or `Kitchen — object` and flat `Correct/Wrong label prefixes` are blocked.
  `styleProfile.readerRewardPattern` must state how each explanation gives a
  natural memory cue, mini-scene, useful contrast, or source-backed fact.
- Use stable source, claim, and item IDs: source/claim IDs are alphanumeric
  tokens, and item IDs are kebab-case.
- Use stable answer_key itemId values: each `answer_key.itemId` must be the
  same kebab-case item ID used by the item it proves.
- Use stable skillTag/factTag metadata: lowercase machine tags with `_` or `-`
  separators, never prose labels or placeholders.
- French quiz packs cannot reuse the English quiz bank while the French source
  gate is closed.

## Quality Gates

- G0 Social evidence: validated pain signals include at least two distinct
  social signals, or the run is explicitly marked as seed-only.
- G1 Source matrix: every factual/grammar claim has source IDs, and official
  source records have unique source URLs, distinct source hosts, and no unused
  official sources.
- G1.5 Visual asset kickoff: a selected category must complete the AI visual
  asset pass before quiz drafting, with DALL-E/imagegen theme card backgrounds
  and theme logos (the topic plaque and topic icon), `visual_asset_plan.md`,
  source files, and manifest coverage for every active app visual family / all
  active app theme modes before production mapping.
- G2 Track fit: `en`, `fr`, and `smartest` use the correct schema and references.
- G3 Item validity: four unique choices, one correct answer, no ambiguous keys.
- G4 Distractor quality: wrong options are plausible learner errors but clearly
  wrong.
- G4.5 Style fit: prompts, localizedPrompts, explanations, and distractor
  rationales must match `QUIZ_STYLE_CONTRACT.md`; Skyler must block generic
  prompt shells, taxonomy labels like `Kitchen — object`, flat
  `Correct/Wrong label prefixes`, dry dictionary-gloss feedback, and meta
  wording like `подсказка говорит`. Prompt/choice granularity must match:
  full-phrase `How do you say...` / `Как сказать...` prompts need full-phrase
  choices; one-word choices need direct word or verb prompts. Each explanation must have a reader reward:
  a natural memory cue, mini-scene, useful contrast, or source-backed fact.
  Learner-facing explanations must not leak internal audit wording such as
  `source-backed`, `source IDs`, or `verified claim`, and must mention the
  selected English choice or the correct English contrast. Explanations must not
  force explicit lifehack/trick labels. Correct-answer explanations must not
  depend on unrelated target words from other quiz items. Mini-scenes must be
  anchored to a direct language reason: meaning, usage boundary, common
  confusion, or selected-option contrast. Explanations must not invent sentence
  or phrase context that is not present in the prompt. They also must not become
  sterile glossary copy: preserve a small grounded joke, concrete image, or
  human aside when the real prompt/choices support it. Correct-answer feedback
  must not list multiple distractors; wrong-answer feedback owns those
  contrasts.
- G5 Fact truth: claims are checked against official or institution-backed
  sources.
- G6 Locale quality: all interface locales are adapted from research notes, not
  direct translated blindly; each locale review needs at least two distinct
  source IDs and a concrete reviewer owner.
  Exact gate phrase: locale review needs at least two distinct source IDs.
- G7 App fit: output can be mapped to the existing quiz or future Smartest schema.
- G7.5 Visual assets: the DALL-E visual pass is complete before quiz drafting;
  theme card backgrounds and theme logos (topic plaques and topic icons) cover
  every active app visual family / all active app theme modes, use optimized
  WebP/transparent logo assets where appropriate, contain no text or watermark,
  and match the existing thematic quiz asset style.
- G8 Human choice: new categories are selected by the user before pack drafting.
- G9 Drift guard: Skyler locale requirements must match Heisenberg
  `ACTIVE_INTERFACE_SOURCE_LOCALES`; French locale requirements must match the
  French source gate `sourceLocaleUi`.
- G10 Claim registry: every fact, rule, and answer key must exist in `claims[]`
  with `verificationStatus: verified`, source comparison notes, and at least two
  distinct Tier A/B source IDs; every item must cite known `claimIds`, include
  at least one verified target-appropriate content claim (`grammar_rule` or
  `usage_rule` for English/French, `fact` for Smartest), include at least one
  verified `answer_key` claim whose `itemId` matches the item `id` and whose
  `answerIndex` matches the item `correctIndex`, use distinct claimIds, include
  every source ID required by those claims, and use distinct item `sourceIds`.
  Historical notes, etymology, or trivia in a language pack are allowed only as
  supplemental verified `fact` claims; they cannot replace the required
  `grammar_rule` or `usage_rule` content claim.
- G13 Stable IDs: source IDs, claim IDs, item IDs, and stable skillTag/factTag
  metadata must be stable machine identifiers, never placeholders or prose
  labels. Each answer-key claim must also use a stable answer_key itemId.
- G11 Copy/evidence hygiene: prompts must not duplicate inside a pack;
  localizedPrompts must exist for every required interface locale and must not
  copy the English author prompt; explanations, author choice rationales,
  social signals, source records,
  claim comparisons, and locale review notes must be real text, never
  placeholders like `...`, `TODO`, or machine-translation stubs. Locale review
  notes and explanation bundles must not be copy-pasted across locales.
  Social signals must include at least two distinct social signals; repeated
  URLs or repeated source/text pairs do not validate demand twice.
  Prompt, localizedPrompts, choices, and learningGoal must be real
  learner-facing text, never placeholders.
  Author `choiceRationales` and each locale's explanations must be unique per
  choice so distractor feedback cannot collapse into generic copy.
  Explanations must be reader-worthy mini rewards: useful, memorable, lightly
  playful where the locale allows it, and never just a dictionary gloss.
  Historical or etymology hooks must be source-backed; otherwise use a
  natural memory cue, concrete image, or useful contrast.
- G12 Track isolation: `trackPolicy` belongs only to Smartest, `frenchGate`
  belongs only to French, `skillTag` belongs only to language-learning items,
  and `factTag` belongs only to Smartest items. Track tags must be stable
  lowercase machine tokens.
- G12.5 Release isolation: Skyler-generated packs stay `dev-only` with
  `productionActivation: blocked_until_explicit_user_approval` until the user
  explicitly approves production activation. After approval, the pack may use
  `releasePolicy.environment: production`,
  `productionActivation: approved_by_user`, and concrete approval metadata.

## Draft Pack Minimum

The gate expects a JSON object with:

- `schemaVersion`: `skyler-quiz-pack-v1`
- `target`: `en`, `fr`, or `smartest`
- `categoryId`: stable kebab-case category id
- `categoryTitle`: concrete product-facing title
- `researchPolicy.directTranslationUsed`: `false`
- `researchPolicy.notes`: concrete research/adaptation notes
- `releasePolicy.environment`: `dev-only` or `production`
- `releasePolicy.productionActivation`: `blocked_until_explicit_user_approval`
  for dev-only packs, or `approved_by_user` for explicitly approved production
  packs.
- `socialListening.status`: `validated` or `seed-only`
- `socialListening.signals`: if status is `validated`, signals must be
  at least two non-placeholder distinct social signals.
- `styleProfile`: for English/French language packs, proof that the writer
  sampled `app/quiz_data.ts` and `app/quiz_source_locale_payloads.ts` and
  followed `QUIZ_STYLE_CONTRACT.md` for prompt, explanation, reader reward, and
  distractor style.
- `visualAssets`: proof that the visual asset kickoff / AI visual asset pass ran
  first, with DALL-E/imagegen theme card backgrounds and theme logos (the topic
  plaque and topic icon) covering every active app visual family / all active
  app theme modes before production mapping.
- `officialSources`: at least two Tier A/B source records with publisher type,
  http(s) URL, concrete `usedFor`, non-future `YYYY-MM-DD` checked date, and
  limitations. Source URLs must be unique, source hosts must be distinct, and
  source IDs must be stable alphanumeric tokens. Every source must be cited by
  at least one verified claim or `answer_key`.
- `claims`: verified claim/rule/answer-key records with concrete source
  comparison notes, stable claim IDs, stable answer_key itemId values, and at
  least two distinct source IDs
- `localeReviews`: one record for each required locale. English and Smartest use
  all active Heisenberg interface locales; French uses only the current French
  source UI locales (`ru`, `uk`) until the source gate changes. Each review must
  include a concrete reviewer owner, explicitly set `directTranslationUsed:
  false`, document its adaptation basis, include non-placeholder review notes,
  cite at least two distinct source IDs, and be unique to that locale.
- `items`: MCQ items with stable kebab-case item IDs, non-placeholder prompt,
  localized prompts for every required interface locale, choices, and
  learningGoal, four unique choices, a valid correct index, per-choice adapted
  explanations for every required locale, distinct source
  IDs, author `choiceRationales`, item-level `qualityChecks`, and
  target-specific metadata:
  `skillTag` for English/French or `factTag` for Smartest, never both. Every
  tag must be a stable lowercase machine token, not a placeholder or prose
  label. Every item must cite at least one verified target-appropriate content claim plus at
  least one verified `answer_key` claim whose `itemId` matches item `id` and
  whose `answerIndex` matches `correctIndex`; `claimIds` must be distinct.
  Rationales and explanations must be unique per choice, not repeated filler.

## Done Definition

A Skyler run is complete only when:

- The user chose one category from three candidates.
- The source matrix exists.
- The visual asset plan exists and records DALL-E/imagegen theme card
  backgrounds and theme logos (the topic plaque and topic icon) for every active
  app visual family / all active app theme modes.
- The first draft pack has no direct-translation flag.
- Every item has source IDs.
- Every active locale has review notes, localized prompts, and explanations.
- The AI visual asset pass has produced theme card backgrounds and theme logos
  (topic plaques and topic icons) for every active app visual family / all active
  app theme modes before quiz drafting or app integration.
- The gate report decision is `GO`.
- French packs remain blocked from production activation until the app-level
  French quiz source gate is updated with approved evidence.
