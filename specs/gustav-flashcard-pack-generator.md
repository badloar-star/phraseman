# Gustav Flashcard Pack Generator Spec

Date: 2026-07-04
Status: generator contract, not activated
Owner: Gustav content pipeline

## Objective

Create a reusable Gustav Flashcard Pack Generator that can build official flashcard pack candidates for French and later target languages without copying English packs blindly.

The generator must first study the English marketplace pack product shape and style, then produce target-language native pack plans, rows, source evidence, review artifacts, server-pack manifests, admin workflow evidence, and activation gates.

The same generator contract is mandatory for future languages so each language can keep its own culture-native packs instead of inheriting French- or English-specific content.

## Source-Of-Truth Files Inspected

English marketplace blueprint:

- `app/flashcards/bundles/bundled_marketplace_manifest.json`
- `app/flashcards/bundles/victoriaBundleShared.ts`
- `app/flashcards/types.ts`
- `app/flashcards/marketplace.ts`
- `app/flashcards/bundles/packIds.ts`
- `app/flashcards/bundles/official_peaky_blinders_en.json`
- `app/flashcards/bundles/royal_tea/royal_tea_part1.ts`
- `app/flashcards/bundles/negotiator/negotiator_part1.ts`
- `app/flashcards/bundles/phrasal_verbs/phrasal_verbs_cards.ts`
- `app/flashcards/bundles/movie_series/movie_series_cards.ts`
- `app/flashcards/bundles/prep_in/prep_in_cards.ts`

French/Gustav current rules:

- `docs/gustav/OPERATOR.md`
- `docs/gustav/state.json`
- `app/french_content_source_gate.ts`
- `scripts/gustav_builder_work_orders.mjs`
- `app/french_flashcard_remote_runtime.ts`
- `app/flashcards_target_gate.ts`
- `tests/gustav_flashcards_target_isolation.test.ts`

## English Blueprint Facts

The English official marketplace currently has 12 bundled packs and 385 cards.

Pack metadata shape:

- `id`
- `codeName`
- `titleRu`
- `titleUk`
- optional planned interface titles
- `descriptionRu`
- `descriptionUk`
- optional planned interface descriptions
- `category`
- `cardCount`
- `priceShards`
- `authorName`
- `isOfficial`
- `updatedAt`

Pack categories currently used:

- `business`
- `slang`
- `daily`
- `verbs`

Card shape:

- `id`
- `en`
- `ru`
- `uk`
- optional `es` and planned source-locale strings
- optional `sourceLocales`
- `literalRu`
- `literalUk`
- optional `literalEs`
- `explanationRu`
- `explanationUk`
- optional `explanationEs`
- optional `exampleEn`, `exampleRu`, `exampleUk`
- optional `usageNoteRu`, `usageNoteUk`
- optional `register`
- optional `level`

English pack style families:

- Grammar utility packs: prepositions, phrasal verbs. They are concise, practical, rule-focused, and explain usage patterns.
- Everyday media packs: Movie & Series. They use common live phrases, contexts, examples, and normal register.
- Culture/genre packs: Peaky Blinders, Royal Tea, Wild West, Dark Logic, Negotiator. They use vivid theme framing, memorable descriptions, roleplay tone, and longer explanations.

Description style:

- short code name for tiles
- punchy RU/UK title
- description usually 130-300 chars in RU
- product copy is playful, concrete, and situational
- not academic; it sells a fantasy/use-case
- still tied to useful phrases, examples, or patterns

## Current French Facts

Current Gustav work order has `flashcards`:

- builder: `french_flashcard_pack_builder`
- required sources: `le_robert_dictionary`, `tv5monde_apprendre`, `phraseman_english_flashcard_blueprint`
- artifacts: `fr_flashcard_starter_packs.json`, `fr_flashcard_french_realities_packs.json`
- gates: `flashcard_target_gate`, `not_lesson_fanout_gate`, `card_content_language_gate`, `srs_target_gate`

`app/french_content_source_gate.ts` requires:

- `french_flashcard_system_bank`
- `french_flashcard_marketplace_pack_review`
- `french_flashcard_community_pack_policy`
- `ru_uk_flashcard_prompt_review`

It blocks:

- `english_flashcard_system_bank_reuse_without_french_source_gate`
- `english_flashcard_marketplace_pack_reuse_without_french_source_gate`
- `english_flashcard_community_pack_reuse_without_french_source_gate`

Gustav state says existing 1600-row `quiz`, `flashcard`, and `personal_practice` slices are seed coverage only, not English-feature parity.

## Gap List

- There is no reusable target-language flashcard pack generator contract.
- English pack style has not been extracted into a machine-readable blueprint.
- French marketplace packs are not production-ready as native cultural/grammar packs.
- Current French flashcard slices are not enough for official marketplace pack parity.
- Admin/server/runtime/rollback gates for generated target-language official packs are not fully tied to a pack generator.
- Future languages would repeat manual chaos without a shared generator contract.

## Requirements

### FPG-01 Reusable Generator Identity

Create a Gustav generator contract named `gustav_flashcard_pack_generator`.

It must accept at least:

- `targetLanguage`
- `studyTarget`
- `sourceLocales`
- `packPlan`
- `trustedSourcePolicy`
- `englishBlueprintInventory`
- `outputRunId`

It must not be hard-coded to French, although the first production target is French.

### FPG-02 English Product Shape Blueprint

The generator must produce an English blueprint inventory artifact before target-language generation.

Required artifact:

- `docs/gustav/runs/<runId>/build/english_flashcard_pack_blueprint_inventory.json`

It must include:

- pack count
- card count
- categories
- pack metadata shape
- card row shape
- title/description length stats
- pack style families
- per-pack examples

### FPG-03 Pack Taxonomy

The generator must classify target packs into:

- `grammar_utility`
- `everyday_functional`
- `culture_native`
- `media_register`
- `exam_or_school`
- `travel_or_city`

For French, at minimum, pack candidates must include both:

- common learner packs: core verbs, pronouns, connectors, prepositions/articles, everyday phrases
- French-native cultural packs: cafe/terrace culture, boulangerie/market, metro/train life, politeness/formality, bureaucracy, apero/social life, school/work, renting/housing, healthcare/pharmacy, texting/slang

### FPG-04 Native Content Rule

The generator must not translate English marketplace packs as the source of truth.

Allowed:

- use English packs as product-shape/style reference
- preserve metadata fields and operational surfaces
- create analogous learning value

Forbidden:

- literal translations of English pack rows
- English cultural themes forced onto French
- French rows that are just lesson-row fanout
- generic phrasebook padding

### FPG-05 Source Evidence

Every generated pack and every accepted card row must carry source evidence.

Accepted source families:

- Le Robert
- Larousse
- CNRTL
- TV5MONDE Apprendre
- France Education international
- Alliance Francaise
- official transport/government/service sites where the card is culture-specific
- CEFR/CoE only for level framing

Each accepted row must include:

- source id
- URL
- accessed date
- what was verified: expression, meaning, register, grammar pattern, culture use, or level

### FPG-06 Pack Copy Style

Generated pack titles/descriptions must match the English product style:

- short code name
- RU/UK title with hook
- RU/UK description with concrete use-case
- scene first, conflict/tension, concrete social fantasy, useful promise
- concise but not sterile
- no “this pack contains vocabulary about X” filler
- no bland “набор для...” / “contains phrases about...” / “this pack teaches...” product-copy drift
- culture-native packs may be playful, but not random parody

### FPG-07 Card Copy Style

Each accepted card must include:

- target text
- RU meaning
- UK meaning
- literal RU/UK when useful
- explanation RU/UK
- example target sentence when useful
- example RU/UK when useful
- register/level when useful

Explanations must be at least as useful as English marketplace cards:

- pattern or usage model
- context
- common trap
- register note
- source-backed meaning

### FPG-08 Output Architecture

Generator artifacts must be created under:

- `docs/gustav/runs/<runId>/build/`
- `docs/gustav/runs/<runId>/review/`

Required build artifacts:

- `english_flashcard_pack_blueprint_inventory.json`
- `flashcard_pack_generator_contract.json`
- `target_flashcard_pack_plan.json`
- `target_flashcard_pack_candidates.json`
- `target_flashcard_source_evidence.json`
- `target_flashcard_duplicate_audit.json`
- `target_flashcard_server_pack_manifest.json`
- `target_flashcard_admin_workflow_manifest.json`
- `target_flashcard_final_gate.json`

Required review artifacts:

- `target_flashcard_review.json`
- `target_flashcard_review.md`

### FPG-09 Runtime And Storage Isolation

Generated target-language packs must be target-scoped.

For French:

- `studyTarget: 'fr'`
- server paths under `course-packs/fr/<sourceLocale>/flashcard/<contentVersion>/...`
- no writes to English official pack ids
- no unscoped cache keys
- no `uiLocale` path segment as target/source
- rollback scopes only under `course-packs/fr/ru/` and `course-packs/fr/uk/`

### FPG-10 Admin Contract

Generated packs must have admin evidence:

- pack status
- preview
- source review
- duplicate audit
- draft publish
- activation request
- rollback/off switch

Activation remains `false` until explicit approval.

### FPG-11 Generator Gates

Required gates:

- English blueprint inventory gate
- generator contract gate
- pack taxonomy gate
- source evidence gate
- duplicate/near-duplicate gate
- RU/UK copy integrity gate
- target-language leakage gate
- lesson-row fanout rejection gate
- runtime/storage isolation gate
- server pack dry-run gate
- admin workflow/surface gate
- rollback gate
- final production readiness gate

## Edge Cases

- A target language may share some universal learner packs with English, but the rows must be rebuilt for the target language.
- Culture packs must not rely on stereotypes without source-backed language/culture evidence.
- If official/trusted sources do not confirm a row, the row stays HOLD.
- If a pack is fun but not useful for language learning, it stays HOLD.
- If a row is useful but too generic, it belongs in system flashcards, not marketplace pack candidates.
- If a future language lacks enough culture-specific evidence, the generator must produce a smaller accepted subset and a repair queue, not padded content.

## Files To Edit

Initial build must edit/add:

- `scripts/gustav_build_flashcard_pack_generator_contract.mjs`
- `tests/gustav_flashcard_pack_generator_contract.test.ts`
- `docs/gustav/OPERATOR.md`
- `scripts/gustav_builder_work_orders.mjs`

Future French content build may add:

- `admin/french-flashcard-packs-workflow.js`
- `admin/french-flashcard-packs-admin.js`
- `app/french_flashcard_pack_remote_runtime.ts`
- French run artifacts under `docs/gustav/runs/`

## Definition Of Done

This generator spec is satisfied when:

- English marketplace pack blueprint inventory is materialized.
- Reusable generator contract exists and is validated by tests.
- Gustav operator/work orders name the generator as the required path for target-language official flashcard packs.
- French-first pack plan distinguishes common packs from French-native cultural packs.
- Source evidence, review, server, admin, rollback, and activation gates are defined.
- No generated pack is marked production-ready without accepted rows and all gates passing.
- `activationApproved` remains `false`.

## Explicit Production Blockers

- French packs are not production-ready from this spec alone.
- No live server upload is allowed from this spec alone.
- No app activation is allowed from this spec alone.
- No future language may use English pack translation as the generator source of truth.

## Build Handoff

Next build target:

- `scripts/gustav_build_flashcard_pack_generator_contract.mjs`

First build steps:

1. Read this spec.
2. Parse `app/flashcards/bundles/bundled_marketplace_manifest.json`.
3. Inspect representative bundle card files.
4. Write `english_flashcard_pack_blueprint_inventory.json`.
5. Write `flashcard_pack_generator_contract.json`.
6. Write `target_flashcard_pack_plan.json` for French with common and culture-native pack families.
7. Add Jest contract tests.
