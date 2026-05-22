# Lesson 1 Row Research Work Order

Run: `2026-05-19_fr_inventory_v0a1`

Status: research-only, not approved for app activation.

## Scope

- Study target: French.
- Source UI locales: Russian and Ukrainian.
- Connected row ledger: `lesson1_row_ledger.json`.
- Connected English base source: `app/lesson_data_1_8.ts`.
- Activation target: none. This work order must not write French rows, words, intros, quizzes, diagnostic content, SRS, trainer queues or personal-practice trainings.

## Approved Research Inputs

- `fr-l1-a1-communication-boundary-fei`
- `fr-l1-etre-sappeler-a1-tv5monde`
- `fr-l1-etre-conjugation-larousse`
- `fr-l1-be-lexical-risk-cambridge`
- `fr-l1-app-activation-block`

These claims allow Lesson 1 planning and row triage only. They do not approve `proposedFrench` or `wordsFr`.

## Row Batches

### Batch 1: Rows 1-10

Purpose: identity/location/status affirmative sentences with `to be`.

Required decisions before any French candidate can be written:

- Determine whether the English row is a valid Lesson 1 French starter row or should move later.
- Check whether the row needs gender/number variants for RU/UK meanings.
- Check whether the row is identity/status/location grammar, not an English-only idiom.
- Attach at least one grammar claim and one lexical/source claim.
- Add RU and UK meaning-review notes separately.

### Batch 2: Rows 11-25

Purpose: personal state, adjective agreement and simple impersonal `it is` rows.

Required decisions before any French candidate can be written:

- Decide whether adjective agreement creates multiple accepted answers.
- Decide whether impersonal English `it is` maps to a French impersonal structure or a noun phrase.
- Reject English calques where natural French requires a different construction.
- Mark rows that need pronunciation or liaison notes.

### Batch 3: Rows 26-40

Purpose: repeated subject/adjective patterns plus place/status rows.

Required decisions before any French candidate can be written:

- Avoid duplicating too many near-identical adjective rows in the French curriculum order.
- Decide whether the row belongs in Lesson 1 or in later adjective/place lessons.
- Check if `you` requires tu/vous handling in the target app logic.
- Map mistake categories without activating personal practice.

### Batch 4: Rows 41-50

Purpose: higher-risk status/adjective rows and final Lesson 1 affirmative review.

Required decisions before any French candidate can be written:

- Check naturalness and register for emotional/physical states.
- Decide if the row needs a lexical warning or should be replaced by a French-specific starter row.
- Prepare quiz distractor needs without writing quiz content.
- Keep activation status `blocked` until reviewer acceptance exists.

## Required Output Per Row

Every row review must produce:

- `phraseId`
- `englishBase`
- `ruMeaningReview`
- `ukMeaningReview`
- `grammarEvidenceClaimIds`
- `lexicalEvidenceClaimIds`
- `curriculumDecision`
- `riskTags`
- `mistakeTaxonomyDraft`
- `quizDistractorNeeds`
- `reviewerStatus`
- `activationStatus`

Allowed `activationStatus` values for this work order:

- `blocked`
- `rejected_for_french_curriculum`
- `needs_more_sources`

The value `approved_for_apply` is forbidden in this work order.

## Forbidden Actions

- Do not add French target text.
- Do not add `wordsFr`.
- Do not add French intro examples.
- Do not populate quiz or exam questions.
- Do not change `approvedAppSeedLessonIds`.
- Do not change `approvedIntroLessonIds`.
- Do not use English row order as final French order without a row-level curriculum decision.

## Next Step

Batch 1 row-review packet now lives at `lesson1_batch1_row_review_packet.json`.

Next: attach row-level lexical evidence for rows 1-10. French target text remains blocked until the row review is accepted.
