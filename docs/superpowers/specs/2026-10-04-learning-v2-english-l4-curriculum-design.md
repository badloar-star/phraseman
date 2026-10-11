# Learning V2 English L4 Curriculum Design

**Date:** 2026-10-04
**Status:** implemented contract, exact fingerprint owner-approved, pending fresh independent review
**Authoring boundary:** curriculum and machine contracts only; no L4 learner session, preauthoring receipt, release, mockup, push, deploy, or paid API call

## Problem

The factory curriculum had exact 56-session plans for English L1–L3, while L4 existed only as a broad topic in the 32-lesson overview and as generic machine scaffolding. That left the next authoring step ambiguous: vocabulary could repeat earlier learner material, chapter deltas could drift into L5+ grammar, and the factory lesson number could be confused with the functional V2 episode number.

L4 now needs one authoritative contract before any S01 preauthoring can start. The contract must make every session measurable, keep the learner-facing runtime identity stable, and give deterministic gates enough evidence to reject drift.

## Identity and authority

- The factory source is `en/l04`, with runtime identity `lesson-04` and session identities `en:lesson-04:session-01` through `session-56`.
- Its functional scenario connection is V2 episode E09, “My home and neighborhood”. E09 is not a runtime renumbering.
- The exact 56 rows in `content/learning-v2-course/curriculum/en/ПЛАН_КУРСА.md` are authoritative for session delta, new lexical senses, and scene.
- `modules/learning-v2/curriculum/en/session_lexical_assignments_en_v2.ts` is the synchronized machine projection. It must match the Markdown row-for-row.
- `docs/v2/03-learning-architecture-and-curriculum.md` owns the scenario-level E09 connection.

## Scope

L4 teaches only:

- affirmative `there is/there are` with singular and plural noun groups;
- `Is there…?` / `Are there…?` and short answers in separate interactions;
- negative existence with `there isn't` / `there aren't`;
- a limited `some/any` contrast inside existential clauses;
- static `in`, `on`, `under`, `next to`, and `between`;
- previously grounded `near` and `behind` as review chunks;
- singular spoken contraction `There's`; plural remains standard `There are`.

L4 does not teach Present Simple, `have/has`, dynamic movement, past or future forms, broad countability, advanced spatial relations, plural conversational `there's`, or any other L5+ system.

## Progression

The lesson is seven chapters of eight sessions:

1. Affirmative existence and singular/plural choice.
2. Existence questions and separate short answers.
3. Bounded `some/any` in food existence clauses.
4. Static place and the distinction between introducing and locating an object.
5. Singular/plural negative existence.
6. Spoken recognition, controlled contraction, repair, and walkthrough.
7. Changed-context independent transfer.

Every session has one to five new lexical senses. S01 has the owner-locked three-sense row (`pharmacy`, `library`, `bakery`); every later session uses a different new surface. Checkpoints introduce one concrete scene noun so they still produce a measurable lexical delta without adding grammar.

## Scene and lexical invariants

- All 56 scene cells have distinct normalized fingerprints.
- All 58 planned new surfaces are unique within L4.
- Every planned surface is absent from the current L1–L3 learner sources (`final.ru.md`, `final.uk.md`, and `practice.atomic.json`).
- Machine assignments preserve exactly the same surface order and the same `lesson-04` identity.
- Multiword surfaces use stable underscore slugs only in lexical sense IDs; their learner-facing spelling remains unchanged.
- Canonical examples contain each new surface so the lexical grounding gate can prove its operation binding.

## Grammar and prerequisite projection

The machine grammar order is:

1. `en.grammar.existence_place.there_is_are`
2. `en.grammar.existence_place.existential_questions`
3. `en.grammar.existence_place.existential_some_any`
4. `en.grammar.existence_place.basic_place_prepositions`
5. `en.grammar.existence_place.existential_negatives`

The fifth operation makes the singular/plural negative chapter explicit instead of hiding it in question or quantifier scaffolding. The existing deterministic DAG derives one edge from each preceding operation, so this order makes L4 fail closed and connects the first later operation only after the complete L4 boundary.

## Exact target repetition boundary

An intro question is already an assessed contact. After punctuation and case normalization, its correct primary target may not appear again as a practice primary target, even under a different activity family. The same normalized practice target may not be recycled across different families either.

The gate intentionally ignores explanatory intro prose and allows exactly three required word-first contacts in three distinct families for one exact planned lexical surface; a fourth exact contact is forbidden. A lexical surface may contain more than one word, such as `post office`; a word-card payload flag or a grammar sentence does not grant an exemption. Phrase-level answer reuse remains forbidden. Normalization is case-insensitive, collapses whitespace, and removes terminal Unicode punctuation, so `There is a pharmacy.` and `There is a pharmacy…` are the same assessed target in both cross-family and same-family checks. A fixture with intro target `There is a pharmacy.` and a `phrase_builder` practice target with the same text must fail, as must the same practice phrase under two different activity families.

## Deterministic evidence

`tests/learning_v2_english_l4_curriculum_contract.test.ts` proves:

- 56 ordered rows and 7×8 chapter topology;
- exact owner-locked S01 row;
- exact lexical cell for every session;
- one to five new senses per row and no L4 duplicates;
- zero prior learner-source occurrences in L1–L3;
- no L5+ grammar surface in session deltas;
- 56 distinct scene fingerprints;
- documented factory-to-E09 mapping with stable runtime identity;
- exact Markdown-to-machine lexical parity;
- exact L4 operation order and prerequisite chain.

`content/learning-v2-course/pipeline/single_phrase_release.test.mjs` proves the normalized intro-to-practice regression. The same guard runs in release building and in the all-source verifier.

## Non-goals and approval evidence

This change does not create `en/l04/s01`, issue a preauthoring receipt, write RU/UK learner text, or publish native artifacts. The owner repeatedly and explicitly instructed the team to start and continue writing Lesson 4 on 2026-10-04. That authorization is recorded against the exact derived fingerprint `f776cf32cd9a46df28ce54ff548c29abd1b9722a76e243fedc30cf5109a418b0`; every previous fingerprint is historical or superseded. Fresh independent review remains required before the next bounded authoring packet.
