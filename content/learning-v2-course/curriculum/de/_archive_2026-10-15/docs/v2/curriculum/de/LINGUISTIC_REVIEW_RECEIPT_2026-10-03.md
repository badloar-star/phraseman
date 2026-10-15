# German Learning V2 — linguistic review receipt 2026-10-03

**Verdict:** `PASS`
**Findings:** `P0=0`; `P1=0`; `P2=0`
**Scope:** preserved L13 research/evidence amendment, grammar constructs and
prerequisite edges, current chapter blueprint through L14, plus the bounded
Task 4 L15/C04 lexical-sequencing amendment and their exact gates.
**Mode:** fresh independent read-only linguistic review; no learner-facing
authoring and no file mutation by the reviewer.
**Base HEAD:** `5fc1bd2970038838d4286c1895a3f980c5db1bee`

## Exact reviewed identities

| Artifact                                                                     | SHA-256                                                            |
| ---------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| `docs/v2/curriculum/de/OWNER_DECISIONS.md`                                   | `EFF5412A13531052AA56C1E40F4058F35DA405297B418CA8FCBB7B44BC19F615` |
| `docs/v2/curriculum/de/RESEARCH_DOSSIER.ru.md`                               | `55C8CC16BDEDCB1E8E3B61BFBD9FB82D61C74A21119F4ADC3CAA7EFD99C76318` |
| `docs/v2/curriculum/de/SOURCE_EVIDENCE_LEDGER.md`                            | `38A878346F1BB410CBA6F11311563669B29E91AD63E5EDA6F548F21C4C6CE10A` |
| `modules/learning-v2/curriculum/de/chapter_blueprints_de_v1.json`            | `97FBA02668C1E98A5219C1332E8A97FF5CB5049F784FBF08A2BE04D2372800D3` |
| `modules/learning-v2/curriculum/de/graphs/prerequisite_dag_de_v1.json`       | `82278EEE7428E6950118105E046EB0BE395E7D245F5766B7555285D44C68542E` |
| `modules/learning-v2/curriculum/de/lesson_blueprints_de_v1.json`             | `0635170320A190CFBC9ED3A8F4B6C6431B9AC0F34141D5A38C0253ADE1966F9D` |
| `modules/learning-v2/curriculum/de/registries/grammar_constructs_de_v1.json` | `A8131C418606EB700266F43A8D30C218EE58A006BDF475AD2ED955D8D56F88FB` |
| `modules/learning-v2/curriculum/de/research_authority_de_v1.ts`              | `0CF28BE0B30FE66735CBDD609DE10BCDA88193290C129006E7A6E393749873FB` |
| `tests/learning_v2_de_chapter_blueprints_gate.ts`                            | `266BDCAF8D036F56DC52012B9616ED8F4929CBEBE18B7EACD59016BD7F9418E5` |
| `tests/learning_v2_de_grammar_graph_gate.ts`                                 | `94CC1DADF164D87F72D1063452678AF39EB222B9C6783116061E9B630BDC0A76` |
| `tests/learning_v2_de_lesson_boundaries_gate.ts`                             | `B8D327744ED102AC39B8E5236AC574887DEDA9DE4744F6AF3CFE7F0CA77A1892` |
| `tests/learning_v2_de_research_authority_gate.ts`                            | `6A6D049B5A750146B58996EB9261F344B510F4CCEB77A546F1F8704D8AE365F9` |

## Source fidelity

- The official IDS Mannheim grammis source at
  `https://grammis.ids-mannheim.de/systematische-grammatik/2264` states that
  adjectives used predicatively are not inflected.
- `DE-GRM-ADJ-001` is narrower than and faithful to that source: it records only
  the uninflected predicative morphology fact.
- The source does not prescribe a curriculum sequence or CEFR placement.
  Predicative-before-attributive staging therefore remains an explicit
  pedagogical inference.
- `de_gc_predicative_adjective_v1` remains `PEDAGOGICAL_INFERENCE` while citing
  the direct morphology evidence together with the nominal-group evidence.
- Staged attributive agreement remains bounded to established frames and makes
  no source-assigned CEFR-sequence claim.

## Verified L13 contracts

- C01: `Das Zimmer ist ruhig. Das ruhige Zimmer ist frei.`
- C02: `Der Koffer ist leicht. Der leichte Koffer ist dort.`
- C03: `Die Wohnung ist hell. Die helle Wohnung ist frei.`
- C04: `Der Koffer ist stabil. Ich kaufe den stabilen Koffer.`
- C05: `Der Helfer ist erfahren. Ich gebe dem erfahrenen Helfer die Mappe.`
- C06 preserves two separate repairs: `[1] Der Koffer ist praktische. → Der
Koffer ist praktisch.` and `[2] Ich kaufe den praktisch Koffer. → Ich kaufe
den praktischen Koffer.`
- C07 compares two rooms and correctly uses `Der geräumige Gruppenraum B`, `in
den geräumigen Gruppenraum B`, `im geräumigen Gruppenraum B`, and `Die Gruppe
ist groß.`
- `Gruppe` and `groß` have exact L13/C07 lexical ownership and utility evidence.
- The two-object and Wechselpreposition contrasts remain explicit and bounded.
- Full adjective paradigms, unestablished forms, comparative/superlative,
  `nicht` focus, `doch`, future grammar and other prohibited expansions are
  absent.

## Bounded Task 4 amendment for L15/C04

- The prior outcome `sequence two completed errands with known connectors`
  incorrectly described lexical material that L15 must ground at that point.
- The exact amended outcome is `sequence two completed errands with newly
grounded temporal adverbs zuerst and dann`.
- `zuerst` and `dann` are identified here as newly grounded temporal adverbs;
  the amendment neither adds a grammar construct nor changes the established
  L15 Perfekt boundary, evidence IDs, prerequisites, final transfer or later
  lesson boundaries.
- The lesson-boundary gate binds that exact outcome and includes a hostile
  mutation that restores `known connectors`; it must fail with
  `l15_c04_sequence_lexical_contract_invalid`.
- This is a bounded correction to Task 4's lexical-sequencing contract, not a
  new external research claim. The research dossier and evidence ledger remain
  byte-identical.

## Deterministic evidence

- Research authority gate: `PASS (53 claims)`.
- Grammar graph gate: `PASS (48 constructs; 89 edges; 18 branches)`.
- Lesson boundary gate: `PASS (32 lessons; 224 chapter outcomes; 32 session-56
finals; 48 Task3 constructs)`.
- Blueprint schema gate: `PASS`.
- Owner decisions gate: `PASS`.
- L14 chapter gate: `PASS (7 chapters; 56 packet IDs)`.
- Prefix-14 chapter gate: `PASS (98 chapters; 784 packet IDs)`.
- Recenter is intentionally deferred until this receipt is materialized and
  the manifest binds its final SHA; closure requires a fresh `PASS`.
- Scoped Prettier, ESLint and diff checks: `PASS`.

## Mutable context excluded from receipt identity

| Artifact                                                                | Observed pre-receipt SHA-256                                       | Reason excluded                                                                                                                |
| ----------------------------------------------------------------------- | ------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------ |
| `content/learning-v2-course/curriculum/de/REQUIREMENT_MANIFEST_V1.json` | `435F0609E6FBFE82A80BBAE865108A5E82AEB0893411C78391FCF31E6B2E1700` | The manifest must bind this receipt's final SHA, so including it in the receipt identity would create a content-address cycle. |
| `docs/v2/HANDOVER.md`                                                   | `5371459EE450D3B8A9AF3E4A21738DBAE4E11DC362BF7797704CB75EA6DFF864` | HANDOVER is updated only after independent reviews and is mutable execution history, not linguistic evidence.                  |

## Remaining boundaries

- Task 6 lexical reconciliation remains required before any exact learner
  packet.
- Task 7, RU+UK learner authoring, audio, release and owner mockup remain
  `HOLD`.
- DACH receptive inventory and the Goethe B1 cross-check remain pending owner
  decisions.
- The 2026-09-19 linguistic receipt remains historical only and does not cover
  this amendment.

Any byte change in the twelve exact reviewed identities invalidates this
receipt and requires a fresh independent linguistic review.
