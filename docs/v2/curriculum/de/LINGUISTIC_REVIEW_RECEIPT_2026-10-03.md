# German Learning V2 — linguistic review receipt 2026-10-03

**Verdict:** `PASS`
**Findings:** `P0=0`; `P1=0`; `P2=0`
**Scope:** L13 research/evidence amendment, grammar constructs and prerequisite
edges, Task 4 L13 evidence, all seven L13 chapters, exact C06/C07 contracts and
their gates.
**Mode:** fresh independent read-only linguistic review; no learner-facing
authoring and no file mutation by the reviewer.
**Base HEAD:** `858e60c98a85ef4c61eb6841b21e012b6100ad2a`

## Exact reviewed identities

| Artifact                                                                     | SHA-256                                                            |
| ---------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| `docs/v2/curriculum/de/OWNER_DECISIONS.md`                                   | `EFF5412A13531052AA56C1E40F4058F35DA405297B418CA8FCBB7B44BC19F615` |
| `docs/v2/curriculum/de/RESEARCH_DOSSIER.ru.md`                               | `55C8CC16BDEDCB1E8E3B61BFBD9FB82D61C74A21119F4ADC3CAA7EFD99C76318` |
| `docs/v2/curriculum/de/SOURCE_EVIDENCE_LEDGER.md`                            | `38A878346F1BB410CBA6F11311563669B29E91AD63E5EDA6F548F21C4C6CE10A` |
| `modules/learning-v2/curriculum/de/chapter_blueprints_de_v1.json`            | `CD68BD95319B8B50EFBBCC29E020694223BB7ADA601A17C248B95446BAB49803` |
| `modules/learning-v2/curriculum/de/graphs/prerequisite_dag_de_v1.json`       | `82278EEE7428E6950118105E046EB0BE395E7D245F5766B7555285D44C68542E` |
| `modules/learning-v2/curriculum/de/lesson_blueprints_de_v1.json`             | `06CBF2585CC1C7E104038109A04C60B4EFD484D5EB5C83FEBC7A9EBA44BFA275` |
| `modules/learning-v2/curriculum/de/registries/grammar_constructs_de_v1.json` | `A8131C418606EB700266F43A8D30C218EE58A006BDF475AD2ED955D8D56F88FB` |
| `modules/learning-v2/curriculum/de/research_authority_de_v1.ts`              | `0CF28BE0B30FE66735CBDD609DE10BCDA88193290C129006E7A6E393749873FB` |
| `tests/learning_v2_de_chapter_blueprints_gate.ts`                            | `CE7EF0C45190E3F9C45C0696D728A93609AF8EC0837BBC43064AED0F8B08EBB8` |
| `tests/learning_v2_de_grammar_graph_gate.ts`                                 | `94CC1DADF164D87F72D1063452678AF39EB222B9C6783116061E9B630BDC0A76` |
| `tests/learning_v2_de_lesson_boundaries_gate.ts`                             | `2A028E5ECF3221EFE5E937D9015B6610F7866AC20E6CF33B9CFA85BC14CF8E83` |
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

## Deterministic evidence

- Research authority gate: `PASS (53 claims)`.
- Grammar graph gate: `PASS (48 constructs; 89 edges; 18 branches)`.
- Lesson boundary gate: `PASS (32 lessons; 224 chapter outcomes; 32 session-56
finals; 48 Task3 constructs)`.
- Blueprint schema gate: `PASS`.
- Owner decisions gate: `PASS`.
- L13 chapter gate: `PASS (7 chapters; 56 packet IDs)`.
- Prefix-13 chapter gate: `PASS (91 chapters; 728 packet IDs)`.
- Recenter is intentionally deferred until this receipt is materialized and
  the manifest binds its final SHA; closure requires a fresh `PASS`.
- Scoped Prettier, ESLint and diff checks: `PASS`.

## Mutable context excluded from receipt identity

| Artifact                                                                | Observed pre-receipt SHA-256                                       | Reason excluded                                                                                                                  |
| ----------------------------------------------------------------------- | ------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------- |
| `content/learning-v2-course/curriculum/de/REQUIREMENT_MANIFEST_V1.json` | `34A55EB45F4F2F89C648F23BDCD620CEFE668CCC631A1661AC6AA6B05B1853BB` | The manifest must add this receipt's path and SHA, so including it in the receipt identity would create a content-address cycle. |
| `docs/v2/HANDOVER.md`                                                   | `7613B2F0B92DACCD11B6E2568C5D773C1435F34314641686EBB229DFB9D038B5` | HANDOVER is updated only after independent reviews and is mutable execution history, not linguistic evidence.                    |

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
