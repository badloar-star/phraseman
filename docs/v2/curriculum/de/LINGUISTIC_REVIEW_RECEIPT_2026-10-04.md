# German Learning V2 — linguistic review receipt 2026-10-04

**Verdict:** `PASS`
**Findings:** `P0=0`; `P1=0`; `P2=0`
**Scope:** the bounded Task 4 authority repair for `de_l24`, including its
exact lesson object and lesson-boundary gate. This receipt does not review or
authorize the currently stale Task 5 L24 chapter blueprint or chapter gate.
**Mode:** two fresh independent read-only reviews after GREEN: exact-spec review
and adversarial red-team review. Neither reviewer authored or mutated the
reviewed files.
**Observed HEAD:** `c0333fe6d48f1e6beffab3400c72581b575ac7a9`

## Exact reviewed identities

| Artifact                                                                     | SHA-256                                                            |
| ---------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| `docs/v2/curriculum/de/OWNER_DECISIONS.md`                                   | `EFF5412A13531052AA56C1E40F4058F35DA405297B418CA8FCBB7B44BC19F615` |
| `docs/v2/curriculum/de/RESEARCH_DOSSIER.ru.md`                               | `55C8CC16BDEDCB1E8E3B61BFBD9FB82D61C74A21119F4ADC3CAA7EFD99C76318` |
| `docs/v2/curriculum/de/SOURCE_EVIDENCE_LEDGER.md`                            | `38A878346F1BB410CBA6F11311563669B29E91AD63E5EDA6F548F21C4C6CE10A` |
| `modules/learning-v2/curriculum/de/graphs/prerequisite_dag_de_v1.json`       | `82278EEE7428E6950118105E046EB0BE395E7D245F5766B7555285D44C68542E` |
| `modules/learning-v2/curriculum/de/lesson_blueprints_de_v1.json`             | `30C3DD0795CD1E28433D94623632A09F680DB4D159EC94E6F63360EF3D1B0BEB` |
| `modules/learning-v2/curriculum/de/registries/grammar_constructs_de_v1.json` | `A8131C418606EB700266F43A8D30C218EE58A006BDF475AD2ED955D8D56F88FB` |
| `modules/learning-v2/curriculum/de/research_authority_de_v1.ts`              | `0CF28BE0B30FE66735CBDD609DE10BCDA88193290C129006E7A6E393749873FB` |
| `tests/learning_v2_de_lesson_boundaries_gate.ts`                             | `A2C7818ADD23C8A3EFFB43775DE166A95E6B38C8F2EB21E162855C9B3B68851B` |

The canonical `de_l24` object SHA-256 is
`C04A3B85A017855EBA5BFDAAC514DCA66B27255D275FFFB6E4C67C176244D8B3`.

## Authorization and independent verdicts

- Terminal Task 4 repair contract:
  `E3A2BAE7432BE859D5C13C7E517EEA137E72C6E4429CF74CF162F39B47B2EAF5`;
  guardian receipt:
  `291699E226172FAEAD2A640822137203CBAE1B37A8A0C590C7E4FF783C32BD48`.
- Narrow gate amendment contract:
  `82EB00ED26DB11D2C0BF8B664F4030ED8398FCC44B0A20CE3CFBAF8ACC533ECD`;
  guardian receipt:
  `1D1E73EE0E9DD8D4D1C30EEE9C06AB35DC3342EEBD221612B67E21AEA3F4CD1D`.
- Fresh exact-spec review on the exact lesson, canonical L24 object and gate
  identities above: `PASS`, `P0=0`, `P1=0`, `P2=0`.
- Fresh independent red-team review on the same identities: `PASS`, `P0=0`,
  `P1=0`, `P2=0`.

## Verified finite-split and participle boundary

- `de_gc_separable_verb_bracket_v1` requires a finite lexical stem in the left
  bracket and its detached particle in the right bracket.
- L24 therefore retrieves exactly one already known finite split clause from
  L08 as reception-only contrast: `Der Abholdienst holt das Fahrrad ab.`
- The controlled Partizip II wholes `abgegeben` and `abgeholt` do not constitute
  evidence of a finite separable-verb bracket.
- Productive L24 grammar remains the bounded event passive: finite singular
  `wird` plus a verified controlled Partizip II. The Task 4 repair does not make
  the finite separable clause productive in L24.
- The existing L15 recall remains a separate contrast between controlled
  Partizip II and `haben`-Perfekt brackets. Surface similarity does not merge
  those functions with the finite separable bracket.
- The L24 final still requires the event-passive, controlled-Partizip-II and
  separable-bracket construct identities, while `reception` records the limited
  evidence mode for the separable bracket.

## Verified fail-closed gate behavior

- Generic structural guards run before the L24 semantic block, so malformed
  recall and final records return stable structural diagnostics rather than a
  `TypeError` or premature digest error.
- Exact L24 checks bind the receptive boundary, one L08 recall, its singleton
  construct, the Partizip-II-does-not-count responsibility, the full `[L08,
L15]` recall array and the separable final evidence.
- A final canonical object digest is evaluated only after those specific
  diagnostics. It rejects removal of controlled Partizip II, insertion of a
  known alien construct and productive expansion to recipient or agent passive.
- Hostile fixtures also preserve the dedicated failures for the old receptive
  boundary, weakened `exactly one`, missing or duplicated L08 recall, wrong
  L08-native construct, weakened responsibility, mutated L15 recall and missing
  separable final evidence. Missing `reception` remains covered by the generic
  anchored core-dimension diagnostic.

## Deterministic evidence

- Lesson boundary gate: `PASS (32 lessons; 224 chapter outcomes; 32 session-56
finals; 48 Task3 constructs)`.
- Research authority gate: `PASS (53 claims)`.
- Grammar graph gate: `PASS (48 constructs; 89 edges; 18 branches)`.
- Blueprint schema gate: `PASS (closed schema; completeness intentionally
separate)`.
- Owner decisions gate: `PASS`.
- Scoped Prettier, ESLint and diff checks: `PASS`.
- Recenter closure is intentionally deferred until the requirement manifest
  binds this receipt's final SHA-256; closure requires a fresh `PASS` afterward.

## Explicitly excluded stale and mutable context

| Artifact                                                                | Observed pre-receipt SHA-256                                       | Reason excluded                                                                                                                                         |
| ----------------------------------------------------------------------- | ------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `modules/learning-v2/curriculum/de/chapter_blueprints_de_v1.json`       | `5480B62CE187B3264FA850A8B1179A8A342A5BA996E736878CC179A8A749981B` | The current Task 5 L24 object is stale against the repaired Task 4 plan and remains `HOLD`; this receipt neither reviews nor authorizes it.             |
| `tests/learning_v2_de_chapter_blueprints_gate.ts`                       | `C94CCD1DC015994E87A1FE2FCBC85709135807196C3F51D2D69942EBA96B3933` | The current chapter gate intentionally fails closed with `l24_semantic_contract_invalid:identity`; Stage B requires a new guardian and separate review. |
| `content/learning-v2-course/curriculum/de/REQUIREMENT_MANIFEST_V1.json` | `52A481302ED89190EFFA1A5EDF62612F540AC834EF8FD46F5744F398EFD6DDA8` | The manifest must bind this receipt's final SHA-256, so including it in the receipt identity would create a content-address cycle.                      |
| `docs/v2/HANDOVER.md`                                                   | `B796DB6E930BFB5ECC2347B718BBB8DF0BBE83A8B1840CC748B582FAB39DCAE2` | HANDOVER is mutable execution history and is updated only after the bounded task closes.                                                                |

## Remaining boundaries

- Task 5 L24 Stage B remains `HOLD` until a new guardian binds the repaired
  Task 4 lesson, gate, this receipt and the updated manifest.
- Task 6 lexical reconciliation remains mandatory before learner-facing
  authoring.
- RU+UK learner sessions, release, audio and the German owner mockup remain
  `HOLD` until the complete grammar-first blueprint and downstream gates close.
- This receipt does not authorize English-contour changes, L25 authoring or any
  deploy, push or release action.

Any byte change in the eight exact reviewed identities invalidates this receipt
and requires fresh independent exact-spec and red-team reviews.
