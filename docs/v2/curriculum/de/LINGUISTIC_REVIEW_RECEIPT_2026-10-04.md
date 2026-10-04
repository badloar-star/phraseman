# German Learning V2 — cumulative linguistic review receipt 2026-10-04

**Verdict:** `PASS`
**Findings:** `P0=0`; `P1=0`; `P2=0`
**Scope:** the bounded `de_l24` closure across Stage A (Task 4 authority
repair) and Stage B (Task 5 chapter blueprint plus fail-closed chapter gate).
**Mode:** fresh independent read-only reviews after each GREEN. Stage B used
exact-spec and native-German semantic judges. No reviewer authored or mutated
the reviewed files.
**Reviewed commits:** Stage A
`40a9087f0d00a679e66439f932f5fa0044e145fc`; Stage B
`eadfba9fe2225a9205eb9242a62f74496685e3fc`.

## Stable authority identities

| Artifact                                                                     | SHA-256                                                            |
| ---------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| `docs/v2/curriculum/de/OWNER_DECISIONS.md`                                   | `EFF5412A13531052AA56C1E40F4058F35DA405297B418CA8FCBB7B44BC19F615` |
| `docs/v2/curriculum/de/RESEARCH_DOSSIER.ru.md`                               | `55C8CC16BDEDCB1E8E3B61BFBD9FB82D61C74A21119F4ADC3CAA7EFD99C76318` |
| `docs/v2/curriculum/de/SOURCE_EVIDENCE_LEDGER.md`                            | `38A878346F1BB410CBA6F11311563669B29E91AD63E5EDA6F548F21C4C6CE10A` |
| `modules/learning-v2/curriculum/de/graphs/prerequisite_dag_de_v1.json`       | `82278EEE7428E6950118105E046EB0BE395E7D245F5766B7555285D44C68542E` |
| `modules/learning-v2/curriculum/de/registries/grammar_constructs_de_v1.json` | `A8131C418606EB700266F43A8D30C218EE58A006BDF475AD2ED955D8D56F88FB` |
| `modules/learning-v2/curriculum/de/research_authority_de_v1.ts`              | `0CF28BE0B30FE66735CBDD609DE10BCDA88193290C129006E7A6E393749873FB` |

## Stage A — repaired Task 4 authority boundary

| Reviewed artifact                                                 | SHA-256                                                            |
| ----------------------------------------------------------------- | ------------------------------------------------------------------ |
| `modules/learning-v2/curriculum/de/lesson_blueprints_de_v1.json`  | `30C3DD0795CD1E28433D94623632A09F680DB4D159EC94E6F63360EF3D1B0BEB` |
| `tests/learning_v2_de_lesson_boundaries_gate.ts`                  | `A2C7818ADD23C8A3EFFB43775DE166A95E6B38C8F2EB21E162855C9B3B68851B` |
| `content/learning-v2-course/pipeline/recenter_contract.test.mjs`  | `D8FE0780941468D1237537C3CB276C7EC3A1A69FFE249A739249E10BE1E46BA3` |
| predecessor Stage-A linguistic receipt, before cumulative rewrite | `4F0F7359624A3C7681F0DFA875CFC067804D31CA591BCC5981064710CD1A162F` |

The canonical Task 4 `de_l24` object SHA-256 is
`C04A3B85A017855EBA5BFDAAC514DCA66B27255D275FFFB6E4C67C176244D8B3`.
The exact lesson and its gate preserve the following reviewed boundary:

- the productive target is only present singular event passive `wird` plus a
  verified controlled Partizip II;
- the one known finite split clause from L08 is reception-only contrast;
- `abgegeben` and `abgeholt` do not by themselves prove the finite separable
  bracket;
- state passive, recipient passive, agent phrases, `werden` plus infinitive,
  new passive person-number forms and unverified participles remain excluded.

Stage A received independent exact-spec and adversarial reviews on these exact
identities: both `PASS`, with `P0=0`, `P1=0`, `P2=0`.

## Stage B — closed Task 5 L24 blueprint

| Reviewed artifact                                                 | SHA-256                                                            |
| ----------------------------------------------------------------- | ------------------------------------------------------------------ |
| `modules/learning-v2/curriculum/de/chapter_blueprints_de_v1.json` | `AAF34C9C8FB5B250B294F2870A823780B31DA8AF2B1F3F5EDA2A7D1C61C7B1A2` |
| `tests/learning_v2_de_chapter_blueprints_gate.ts`                 | `1E92F44A25210CDF00F654E6B199011E3DEF0711AC1B29C285B89F6BDAF33D74` |

The canonical Task 5 `de_l24` chapter object SHA-256 is
`5E3CD3D724938C91DA01D639BCC9B0AFDF68C0C7B80A72DE701FC60FB8F03EEF`.
The chapter gate also pins the repaired Task 4 plan SHA-256
`C04A3B85A017855EBA5BFDAAC514DCA66B27255D275FFFB6E4C67C176244D8B3`.

The materialized lesson contains exactly seven chapters and 56 packet IDs. It
preserves the declared lifecycle anchors, inverse L23→L24 recall provenance,
per-chapter changed-context evidence, controlled lexical packages, exact
support fading and independent final transfer at `de_l24_c07_s56`.

Stage B received two fresh independent reviews on the exact identities above:

- exact-spec review: `PASS`, `P0=0`, `P1=0`, `P2=0`;
- native-German semantic review: `PASS`, `P0=0`, `P1=0`, `P2=0`.

The native review confirmed that the active-versus-passive contrast, process
descriptions, clarification repair and final workplace transfer are natural
German within the bounded grammar. It found no productive state passive,
recipient passive, agent phrase, future/`werden`-infinitive reading, universal
participle rule, auxiliary guessing, new connector, new case/preposition
relation or English-contour reuse.

## Hostile and deterministic evidence

- All 52 ordered L24 hostile mutations fail closed with their dedicated
  diagnostics, including passive-type leakage, finite-split substitution,
  lexical/situation drift, future learner-layer flags, topology/provenance
  mutations and terminal transfer weakening.
- L24 focused chapter gate: `PASS (de_l24; 7 chapters; 56 packet IDs; Task6
lexical reconciliation pending)`.
- Prefix-24 chapter gate: `PASS (prefix 24; 168 chapters; 1344 packet IDs;
Task6 lexical reconciliation pending)`.
- L23 focused and prefix-23 regression gates: `PASS`.
- The unscoped Task 5 gate remains the required incompleteness signal:
  `INCREMENTAL_TASK5;24/32 lessons;168/224 chapters`.
- Lesson-boundary, research-authority, grammar-graph, schema, owner-decision,
  one-phrase interaction, formatting, lint and scoped diff gates: `PASS`.
- Recenter manifest/pack/receipt suite: `PASS (31/31)` after the manifest binds
  this cumulative receipt's final SHA-256.

## Identity-cycle boundary

This receipt deliberately excludes
`content/learning-v2-course/curriculum/de/REQUIREMENT_MANIFEST_V1.json` from its
reviewed identity: that manifest must bind this receipt's final SHA-256, and
including the manifest hash here would create a content-address cycle.
`docs/v2/HANDOVER.md` is also excluded from the reviewed identity because it is
mutable execution history maintained after bounded closure. Neither exclusion
weakens the separate recenter hash gate or handover obligation.

## Closed boundary and next authorized step

- `de_l24` is closed for Task 4 and Task 5 at the two reviewed commits above.
- The next exact grammar-first blueprint task is a fresh instruction reread and
  content-addressed guardian for `de_l25`, followed by one bounded lesson and
  both independent final reviews.
- Task 6 lexical reconciliation remains mandatory before exact learner-facing
  packet authoring.
- RU+UK learner sessions, release, audio and the German owner mockup remain
  `HOLD` until the complete 32/32 grammar-first blueprint and downstream gates
  close.
- This receipt authorizes no English-contour change, deploy, push, production
  write or release action.

Any byte change in a reviewed Stage A or Stage B identity invalidates the
corresponding verdict and requires fresh independent review.
