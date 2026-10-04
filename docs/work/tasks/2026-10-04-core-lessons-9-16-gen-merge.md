# Task packet: lessons 9-16 Spanish phrase data — pick only the good parts from the generator; compare lessons 1-8

Governance-ID: TG-5A1ED89C0745
Status: In progress
Owner: Claude session «App Check» (82577f25), by coordinator (2026-10-04)
Related epic/enabler: lesson content (Spanish word-bank phrases)

## Outcome

app/lesson_data_9_16_phrases_es.gen.ts keeps its curated distractors and categories (they are better than a regeneration: 398 vs 1644 self-intersecting distractor slots) and gains only the verified extras of the generator: four alternativesEs (lesson9_phrase_7/21/37/45) and the verified wordsEn variants. The same comparison for lessons 1-8 is reported to the content owner before anyone moves .gen into _source.

## Scope

In scope: point edits in the lessons 9-16 .gen file; a test that locks the merge; the comparison of lessons 1-8 (regeneration into a temporary file only, repository untouched).
Out of scope: categories, distractors, token sequences, regenerating or replacing the .gen file, lessons 1-8 edits.

## Architecture

No architecture change. Data-only edit; token sequences (the answer keys) stay byte-identical, which a test asserts.

## Security and privacy

None: lesson text only.

## Technical debt

- Contain: the generator is stale and worse on distractors; the report says so and nothing regenerates it.

## Verification

Before/after comparison script: token keys identical in all 400 phrases, distractors and categories unchanged, only the intended fields changed; lesson data tests and type check green.

## Rollback

Revert the commit.
