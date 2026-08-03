# Language test control sets

This directory contains unpublished, isolated control sets for rebuilding non-English placement tests.

## Release boundary

- Files here are not runtime data and must never be loaded by the website or Cloud Functions.
- Every control set must keep `publishable: false` until the complete pool, psychometric routing, native-language review, and owner review are finished.
- `authorReviewStatus: self_checked` records only the author pass. It is not a substitute for independent review.
- `externalReviewStatus: pending` must remain unchanged until a qualified external reviewer has actually reviewed every item.
- Languages move through this process one at a time. A pilot is evidence for the writing standard, not permission to deploy.

## Item-writing standard

Each item must test one declared construct, have one defensible answer, and use three plausible distractors with written rationales. Learner-visible text must be natural and free of technical identifiers, numbered placeholders, template residue, and repeated scenario shells. Difficulty labels must be justified by the language operation required, not by sentence length alone.

Localization follows the existing assessment contract: `scenario`, `prompt`, `explanation`, `cefrRationale`, and `ambiguityNotes` are English; their `*Ru` counterparts are Russian; `stimulus` and `options` stay in the assessed language. Internal review evidence does not replace either localized learner copy or independent linguistic review.

The Spanish control set is guarded by `functions-english-test/spanish_pilot_quality.test.js`.
