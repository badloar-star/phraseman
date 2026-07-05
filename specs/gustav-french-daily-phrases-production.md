# Gustav French Daily Phrases Production Spec

Date: 2026-07-04
Status: build contract, not activated
Owner: Gustav content pipeline

## Objective

Build the French `Daily phrases` section as a French-native idiom/expression product surface with the same content style and operational safety as the English Daily Phrases section.

This is not complete while French Daily Phrases are only bridged from remote flashcards. The existing `fr-daily-*` flashcard bridge is a temporary target-aware runtime path, not the final idiom/expression bank.

## Inspected English Blueprint

Source files inspected:

- `app/idioms_data.ts`
- `admin/daily_phrases_seed.json`
- `app/daily_phrase_system.ts`
- `scripts/seed_daily_phrases.mjs`
- `admin/index.html`

English facts:

- English Daily Phrases are idioms/expressions, not generic phrasebook rows.
- The local English blueprint contains 176 rows.
- The admin seed contains 176 rows.
- Required row fields are:
  - `id`
  - `english`
  - `literal`
  - `meaning`
  - `text`
  - `literal_uk`
  - `meaning_uk`
  - `text_uk`
  - optional `literal_es`, `meaning_es`, `text_es`
  - optional `sourceLocales`
- The explanation style is:
  - expression itself
  - literal meaning
  - actual meaning
  - compact contextual explanation with usage nuance
- Runtime maps idioms through `phraseFromIdiom()` into `DailyPhrase`.
- Cloud/admin path uses Firestore collection `daily_phrases`, `scheduledDate`, `order`, `active`, and `allowSave`.
- Admin has a Daily Phrases editor with queue, draft, active, allow-save, reorder, and modal editing behavior.

## Current French State

Source files inspected:

- `app/daily_phrase_system.ts`
- `app/daily_phrase_target_gate.ts`
- `tests/gustav_french_daily_phrase_target_gate.test.ts`
- `app/french_content_source_gate.ts`
- `scripts/gustav_builder_work_orders.mjs`

Current facts:

- French target currently returns a phrase through `phraseFromFrenchFlashcard()`.
- French IDs currently use the `fr-daily-*` prefix.
- The bridge maps a flashcard `en` value into the existing `DailyPhrase.english` field.
- `literal`, `meaning`, and `text` are mostly reused from flashcard RU/UK text or description.
- `dailyPhraseContentGateForTarget('fr')` is enabled because the flashcard system is available.
- `french_content_source_gate.ts` still requires `french_daily_phrase_bank` and `ru_uk_daily_phrase_prompt_review`.
- The source gate explicitly blocks `english_daily_phrase_reuse_without_french_source_gate`.

Conclusion: French Daily Phrases have a runtime-safe placeholder, but they do not yet have a production-ready French-native idiom/expression bank.

## Product Requirements

### FDPR-01 Shape Parity

Create a French daily phrase bank with at least the English count: 176 accepted rows.

The build artifact must be:

- `docs/gustav/runs/2026-07-04_fr_daily_phrases_production_v1/build/fr_daily_phrase_bank.json`

Each row must preserve app-compatible Daily Phrase shape:

- `id`
- `english`
- `literal`
- `meaning`
- `text`
- `literal_uk`
- `meaning_uk`
- `text_uk`
- `sourceEvidence`
- `review`

For compatibility, `english` may temporarily carry the target expression text, but review artifacts must treat it as `targetText` for French. New code should prefer explicit French naming where a safe adapter exists.

### FDPR-02 French-Native Selection

Rows must be native French idioms, locutions, and common fixed expressions.

Forbidden:

- translating English idioms into French as the source of truth
- using generic phrasebook rows like greetings, thanks, or travel basics
- filling the bank from flashcards
- padding the count with near-duplicates

### FDPR-03 Source Evidence Per Row

Every row must have trusted source evidence before it can be accepted.

Accepted source families:

- Le Robert
- Larousse
- CNRTL
- Academie francaise
- TV5MONDE / official French learning source
- Alliance Francaise / recognised institutional learning source
- Council of Europe / CEFR references for level framing only

Each accepted row must include:

- source name
- URL
- accessed date
- what was verified: existence, meaning, register, usage, or level

No row may be marked accepted from memory alone.

### FDPR-04 Style Parity

French explanations must follow the English Daily Phrases product style, not a dictionary dump.

Required columns:

- `literal`: literal rendering in Russian
- `meaning`: actual meaning in Russian
- `text`: short, lively explanation in Russian with context/use nuance
- `literal_uk`: literal rendering in Ukrainian
- `meaning_uk`: actual meaning in Ukrainian
- `text_uk`: short explanation in Ukrainian

Do not mix English as a teaching language inside French rows. English may appear only in internal file/field names required by existing app compatibility.

### FDPR-05 RU/UK Review

Russian and Ukrainian copy must be reviewed for:

- natural wording
- no mojibake
- no English-section leakage
- no overlong walls of text compared with English Daily Phrase style
- literal/meaning/text distinction preserved

### FDPR-06 Runtime Contract

Final French Daily Phrases runtime must load the accepted French bank/server pack for `studyTarget='fr'`.

It must preserve:

- target-scoped AsyncStorage keys
- no fallback to English `IDIOMS`
- no subscription to English cloud `daily_phrases` for French unless the document path is target-scoped
- current English behavior unchanged

The existing flashcard bridge may remain only as a guarded fallback until the approved bank/server pack is active.

### FDPR-07 Admin Contract

Admin must expose French Daily Phrases without violating the Admin UI Bible.

Required workflow:

- target selector or clearly scoped French Daily Phrases surface
- draft import/preview
- source-evidence audit status
- review status
- scheduled publish
- rollback/off switch
- visible distinction between English Daily Phrases and French Daily Phrases

Do not publish French rows into the English queue by accident.

### FDPR-08 Storage And Cloud Isolation

French Daily Phrases must be target-scoped in server/storage paths.

Accepted approaches:

- a dedicated French collection/pack path
- a server-delivered target pack with explicit `studyTarget: 'fr'`
- a target field plus hard validation that prevents English runtime/admin from reading French rows

The final gate must prove no English `daily_phrases` pollution.

### FDPR-09 Activation And Rollback

`activationApproved` must remain `false` until the user explicitly approves activation.

Final build may reach:

- `productionReady: true`
- `status: READY_FOR_EXPLICIT_ACTIVATION_APPROVAL`
- `activationApproved: false`

It must not silently activate the French section.

Rollback requirements:

- previous flashcard bridge remains restorable
- server pack/collection activation has an off switch
- admin rollback workflow is documented and gated

### FDPR-10 Gates And Tests

Required gates:

- English blueprint parity gate
- French source evidence gate
- duplicate/near-duplicate gate
- RU/UK copy integrity gate
- runtime target isolation gate
- server pack manifest gate
- admin workflow wiring gate
- activation/rollback gate
- final production readiness gate

## Definition Of Done

French Daily Phrases are done only when:

- at least 176 French-native idiom/expression rows are accepted
- every row has trusted source evidence
- every row has RU and UK literal/meaning/text copy
- runtime loads the French bank/pack for French target
- English Daily Phrases behavior is unchanged
- admin can preview, schedule, publish, and rollback French Daily Phrases safely
- all narrow tests/gates pass
- final gate says `READY_FOR_EXPLICIT_ACTIVATION_APPROVAL`
- `productionReady` is `true`
- `activationApproved` is `false`

## Initial Build Artifacts

Build root:

- `docs/gustav/runs/2026-07-04_fr_daily_phrases_production_v1/`

Expected artifacts:

- `build/fr_daily_phrase_bank.json`
- `build/fr_daily_phrase_source_evidence.json`
- `build/fr_daily_phrase_duplicate_audit.json`
- `build/fr_daily_phrase_runtime_manifest.json`
- `build/fr_daily_phrase_server_pack_manifest.json`
- `build/fr_daily_phrase_activation_rollback_manifest.json`
- `review/fr_daily_phrase_review.json`
- `review/fr_daily_phrase_review.md`
- `build/fr_daily_phrase_final_gate.json`
