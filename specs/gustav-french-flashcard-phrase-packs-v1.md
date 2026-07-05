# Gustav French Flashcard Phrase Packs V1 Spec

Date: 2026-07-04
Status: content candidate, not activated
Owner: Gustav content pipeline

## Objective

Build five French-native official flashcard marketplace pack candidates with the actual phrases, not just topic shells:

- `fr_cafe_terrace_life`
- `fr_pronouns_and_politeness`
- `fr_apero_social_life`
- `fr_pharmacy_healthcare`
- `fr_texting_reactions`

Each pack must preserve the English marketplace product style: vivid title and description, concrete social use-case, compact code name, useful card explanations, and no generic phrasebook padding.

## Source-Of-Truth Files Inspected

- `specs/gustav-flashcard-pack-generator.md`
- `docs/gustav/OPERATOR.md`
- `scripts/gustav_build_flashcard_pack_generator_contract.mjs`
- `app/flashcards/bundles/bundled_marketplace_manifest.json`
- `app/flashcards/bundles/victoriaBundleShared.ts`
- `app/flashcards/types.ts`
- `app/flashcards/marketplace.ts`
- `app/flashcards/bundles/official_peaky_blinders_en.json`
- `app/flashcards/bundles/royal_tea/royal_tea_part1.ts`
- `app/flashcards/bundles/negotiator/negotiator_part1.ts`
- `app/flashcards/bundles/prep_in/prep_in_cards.ts`

Trusted web evidence opened on 2026-07-04:

- Le Robert: `cafe`, `terrasse`, `addition`, `serveur`, `commander`
- Le Robert: `merci`, `desole`, `tu`, `vous`, `politesse`
- TV5MONDE Apprendre: `Culture(s) / Tu ou vous ?`
- Le Robert: `apero`, `aperitif`, `inviter`, `trinquer`, `soiree`
- Le Robert: `pharmacie`, `ordonnance`, `douleur`, `symptome`, `rendez-vous`
- Ameli: ordonnance, pharmacie/test angine, douleur, consultation pages
- Le Robert: `texto`, `message`, `accord`, `marche`, `bref`, `coup`, `genre`, `repondre`

## English Blueprint Facts

English marketplace official packs use:

- vivid code names and hooky RU/UK descriptions;
- category, card count, price shard metadata;
- card fields for target expression, RU/UK meanings, literal notes, explanation, examples, register, and level;
- explanations that explain usage and traps, not just translate.

## Current French Facts

`gustav_flashcard_pack_generator` is the required generator for official target-language flashcard packs. French pack candidates must not be translated from English rows and must remain `activationApproved=false`.

## Requirements

### FFP-01 Pack Count And Identity

Produce exactly five pack candidates for the five selected user topics.

### FFP-02 Phrase Count

Produce at least 20 card rows per pack. Rows must be useful French phrases or fixed patterns, not isolated single words unless the expression naturally works as a standalone reaction.

### FFP-03 English-Style Pack Copy

Each pack must include `codeName`, `titleRu`, `titleUk`, `descriptionRu`, `descriptionUk`, `category`, `taxonomy`, and `priceShards`. Descriptions must be vivid and situational, similar in product intent to English packs, not bland "contains phrases about..." filler.

Each description must follow the locked Gustav marketplace voice:

- scene first;
- conflict/tension;
- concrete social fantasy;
- useful promise;
- compact voice with a little bite;
- no bland `набор для...`, `набір для...`, `contains phrases about...`, or `this pack teaches...` framing.

### FFP-04 Card Shape

Each card must include:

- `id`
- `targetText`
- `ru`
- `uk`
- `literalRu`
- `literalUk`
- `explanationRu`
- `explanationUk`
- `exampleFr`
- `exampleRu`
- `exampleUk`
- `register`
- `level`
- `evidence`

### FFP-05 Translation Reliability

RU and UK meanings must be natural and precise. Literal fields must explain structure when useful, not replace the meaning.

### FFP-06 Source Evidence Per Row

Every row must contain at least one trusted evidence object with `sourceId`, `url`, and `verified`. Evidence may verify the expression, key lexical item, register, context, or cultural/medical domain. Rows without evidence remain HOLD and cannot be accepted.

### FFP-07 Medical Safety

`fr_pharmacy_healthcare` must stay practical and non-diagnostic. It may teach how to describe symptoms, ask pharmacy questions, and mention prescriptions, but must not give medical treatment advice as app content.

### FFP-08 Activation Closed

The build may mark phrase candidates ready for review, but must keep `productionReady=false` and `activationApproved=false` until runtime, server, admin, rollback, and LLM review gates pass.

### FFP-09 Production-Candidate Dry Run

Before saying the work is complete, the generator must also produce:

- server pack dry-run manifest with RU/UK source-locale-scoped payloads;
- runtime/storage isolation evidence;
- admin workflow manifest;
- rollback manifest;
- description style gate;
- review/final gate showing production candidate readiness while keeping real activation closed.

## Gates And Tests

- `scripts/gustav_build_fr_flashcard_phrase_packs_v1.mjs`
- `tests/gustav_fr_flashcard_phrase_packs_v1.test.ts`

## Files To Edit

- `specs/gustav-french-flashcard-phrase-packs-v1.md`
- `scripts/gustav_build_fr_flashcard_phrase_packs_v1.mjs`
- `tests/gustav_fr_flashcard_phrase_packs_v1.test.ts`

## Definition Of Done

- Five selected packs exist with at least 100 total cards.
- Every card has RU/UK meaning, literal fields, explanations, example fields, register/level, and evidence.
- Pack descriptions follow the English marketplace copy principle.
- Gustav-wide marketplace description style rule is updated and tested.
- Server/admin/runtime/rollback dry-run artifacts exist and pass source-locale isolation checks.
- Admin workflow handlers exist for preview, guarded publication draft, activation approval request, rollback draft, and emergency off switch.
- Runtime activation evidence proves the French marketplace payload has 5 packs / 100 cards per RU/UK source locale and uses the French cache scope.
- Final activation-readiness gate may report `productionReady=true` only as `READY_FOR_EXPLICIT_ACTIVATION_APPROVAL`; it must keep `activationApproved=false`.
- Duplicate target phrases are blocked.
- Final gate reports production candidate ready, real activation still HOLD, and `activationApproved=false`.

## Explicit Production Blockers

- No live server upload execution in this pass.
- No automatic admin activation in this pass.
- No runtime publication without explicit activation approval.
- No `activationApproved=true` without explicit approval.

## Build Handoff

Build target:

- `scripts/gustav_build_fr_flashcard_phrase_packs_v1.mjs`
- `scripts/gustav_build_fr_flashcard_packs_activation_readiness.mjs`

First command:

- `node scripts/gustav_build_fr_flashcard_phrase_packs_v1.mjs`
- `node scripts/gustav_build_fr_flashcard_packs_activation_readiness.mjs`
