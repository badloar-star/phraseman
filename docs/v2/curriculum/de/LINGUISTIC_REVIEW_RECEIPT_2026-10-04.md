# German Learning V2 — cumulative linguistic review receipt 2026-10-04

**Verdict:** `PASS`
**Findings:** `P0=0`; `P1=0`; `P2=0`
**Scope:** the bounded `de_l24` through `de_l27` closure across cumulative
Stages A–D already recorded below, plus L27 Stage A (Task 4 authority repair)
and L27 Stage B (Task 5 L27 chapter blueprint plus fail-closed chapter gate).
**Mode:** fresh independent read-only reviews after each GREEN. Cumulative
Stages B–D and L27 Stage B used exact-spec and native-German semantic judges.
No reviewer authored or mutated the reviewed files.
**Reviewed commits:** cumulative Stage A
`40a9087f0d00a679e66439f932f5fa0044e145fc`; Stage B
`eadfba9fe2225a9205eb9242a62f74496685e3fc`; Stage C
`917c02a80599354847ba211e205484751a53fef0`; Stage D
`4091319a91241636f0f1d9ff9a2837857bd914ee`; L27 Stage A
`8a02c929f11c91dcc4ad234b988f8c0b157cd2b0`; L27 Stage B
`079b54138296271cbec921b200cd4176b951cb4b`.

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

## Stage C — closed Task 5 L25 blueprint

| Reviewed artifact                                                 | SHA-256                                                            |
| ----------------------------------------------------------------- | ------------------------------------------------------------------ |
| `modules/learning-v2/curriculum/de/chapter_blueprints_de_v1.json` | `9C319C9546CBDF234B1A97ADE8555ABA80B7D2483A6BB482EA805DC2AB36525E` |
| `tests/learning_v2_de_chapter_blueprints_gate.ts`                 | `D503BEC21EF1850273E848DC232B4C7A94D4184F60BF53D404AD2BEED8B05DAF` |

The canonical Task 5 `de_l25` chapter object SHA-256 is
`31125F05DDD4AD87F67BE874A259EBBA62D15E0E86D4C9D8C749C4998FE64150`.
The chapter gate pins the exact Task 4 `de_l25` plan SHA-256
`3AA85EC64295BDAE6FA46070F60E7559000B5BAA78DAA9024B5E32F1483E8A5D`.

The materialized lesson contains exactly seven chapters and 56 packet IDs. It
preserves the declared lifecycle anchors, inverse L24→L25 recall provenance,
per-chapter changed-context evidence, controlled lexical packages, exact
support fading and independent final transfer at `de_l25_c07_s56`.

Stage C received two fresh independent reviews on the exact identities above:

- exact-spec review: `PASS`, `P0=0`, `P1=0`, `P2=0`;
- native-German semantic review: `PASS`, `P0=0`, `P1=0`, `P2=0`.

The native review confirmed bounded, natural German for the productive contrast
between present singular event passive `wird` plus one verified controlled
participle and present singular state passive `ist` plus the matching
participle. The sole Perfekt-with-`sein` contrast remains the already known
receptive whole `Der Techniker ist angekommen`; no broader auxiliary rule or
new tense is licensed. It found no plural or other passive person-number
paradigm, `war`, `wurde`, `worden`, `werden` plus infinitive, recipient passive,
agent phrase, unverified participle, participle-formation rule, auxiliary
guessing, adjectival substitution, new connector, new case/preposition
relation, broader narrative Präteritum, L26 grammar, Task 6 lexical
adjudication, learner-facing surface, release, audio, mockup or English-contour
reuse.

## Stage D — closed Task 5 L26 blueprint

| Reviewed artifact                                                 | SHA-256                                                            |
| ----------------------------------------------------------------- | ------------------------------------------------------------------ |
| `modules/learning-v2/curriculum/de/chapter_blueprints_de_v1.json` | `04903AA1A8B79444F81A448ADD8F680C044D47C264A8CFCAD9E04AC49AAE814B` |
| `tests/learning_v2_de_chapter_blueprints_gate.ts`                 | `71D6423750D43367DC41323A11C35411271E6DA271033C73E8174F7470EE3989` |

The canonical Task 5 `de_l26` chapter object SHA-256 is
`695CB33190DB3141A47A27F3A26988C9906CD15A6A469AEA70F03FED3660424A`.
The chapter gate pins the exact Task 4 `de_l26` plan SHA-256
`805FE54F40B7F2C9229F6BEC162BCF2D4EB686E0F849A1DCA1435D5AF3106F1D`.

The materialized lesson contains exactly seven chapters and 56 packet IDs. It
preserves the declared lifecycle anchors, inverse L25→L26 recall provenance,
per-chapter changed-context evidence, controlled lexical packages, exact
support fading and independent final transfer at `de_l26_c07_s56`.

Stage D received two fresh independent reviews on the exact identities above:

- exact-spec review: `PASS`, `P0=0`, `P1=0`, `P2=0`;
- native-German semantic review: `PASS`, `P0=0`, `P1=0`, `P2=0`.

The native review confirmed bounded, natural German for present third-person
singular `wird` plus a clause-final bare infinitive in one future-time use and
one cautious modal-assessment use marked by `wahrscheinlich`, contrasted with
ordinary Präsens plus explicit future-time wording and the known event/state
passive distinction. It found no universal-future rule, other `werden`
person-number forms, question or negation-scope expansion, future perfect,
modal Perfekt, double-infinitive cluster, new passive paradigm, recipient
passive, agent phrase, participle-formation rule, new tense, new connector, new
case/preposition relation, broader narrative Präteritum, functional Genitiv,
L27 grammar, Task 6 lexical adjudication, learner-facing surface, release,
audio, mockup or English-contour reuse.

The required repair loop remained fail-closed: a transient file lock was
resolved safely; initial duplicate hostile mutations #4–#10 and the
native-German C4/C5 findings blocked closure; the amended guardian's exact
four-field repair packet changed only
`chapters[3].supportFading.entry`,
`chapters[3].checkpoint.plannedNewLexicalSenses[0].communicativeUse`,
`chapters[4].supportFading.entry` and
`chapters[4].checkpoint.plannedNewLexicalSenses[0].communicativeUse`; both C4/C5
`supportFading.exit` values remained unchanged; and both fresh reviewers reran
on the final bytes before returning `PASS`, with `P0=0`, `P1=0`, `P2=0`.

## L27 Stage A — repaired Task 4 authority boundary

| Reviewed artifact                                                | SHA-256                                                            |
| ---------------------------------------------------------------- | ------------------------------------------------------------------ |
| `modules/learning-v2/curriculum/de/lesson_blueprints_de_v1.json` | `ADE0A0DA59DBEAE934BE06C89F6EE33496BEF7C15625AD5C316B83D52886E3DC` |
| `tests/learning_v2_de_lesson_boundaries_gate.ts`                 | `0F208E810CC1B164D536539F750A87A68EFC40F5719E753EAE49971F6E5805DC` |

The canonical Task 4 `de_l27` object SHA-256 is
`CA4411B999F2F0E199C1DE2B352B8F606E89969713F4C5350ED5F5F5E40BC9D5`.
Its exact five-row recall-authority SHA-256 is
`38DA89E2562454A1DAEBB1C1DDB124D36AD487B0AABCCB6D807A68744CA6473A`.

The initial preauthor guardian returned
`PASS_FULL_PREAUTHOR_AUTHORIZATION_L27` for canonical chapter candidate
`056BD6D245C7B8F0E1EB986322029C85898D82FA28F0A002498C6F9CB1854D93`,
acknowledged as `ACK_L27_CANONICAL_056BD6D2`. It then blocked the missing
non-adjacent L18/L24/L25 recall authority and returned
`AMENDED_PASS_L27_AUTHORITY` only after Task 4 and its gate pinned the exact
five-row L26/L22/L18/L24/L25 contract. Fresh Stage A exact-spec and adversarial
reviews both returned `PASS`, with `P0=0`, `P1=0`, `P2=0`.

## L27 Stage B — closed Task 5 L27 blueprint

| Reviewed artifact                                                 | SHA-256                                                            |
| ----------------------------------------------------------------- | ------------------------------------------------------------------ |
| `modules/learning-v2/curriculum/de/chapter_blueprints_de_v1.json` | `5681954273A55154842BF734D3BB045706026CA44D461CBF63BD5DB947068D43` |
| `tests/learning_v2_de_chapter_blueprints_gate.ts`                 | `9C0A57478D51DADF2DE7962B0C914DA42DDDEC41FB1112D54B269B7D9E67381C` |

The final canonical Task 5 `de_l27` chapter object SHA-256 is
`DBBFC9C8F5ADC2C0AA871EC5F998549AECB35B9B7A78E482F05008828E458884`.
The chapter gate pins the exact Task 4 `de_l27` plan SHA-256
`CA4411B999F2F0E199C1DE2B352B8F606E89969713F4C5350ED5F5F5E40BC9D5`.

The materialized lesson contains exactly seven chapters and 56 packet IDs. It
is review-only integration of the already introduced L18 connector topology,
L22 relative reference, L24 event passive, L25 state passive and L26 certainty
contrast, with ordinary present future as known contrast. It preserves exact
lifecycle anchors, inverse L26→L27 provenance, per-chapter changed-context
evidence, controlled lexical packages, support fading and independent final
transfer at `de_l27_c07_s56`.

The first Stage B exact-spec review passed, while the first native-German review
blocked a monologic C07 as `P1` and unnatural C04 wording as `P2`. The
first guardian amendment produced candidate
`506F5E86F0FB932CD96FE02893D760A09BA48BF64DF1EB9CE28718E1A51457D6`,
but native review blocked its unlicensed `Ihre`, `ein anderer Tag` and
`besser` wording as `P1`. `PASS_AMENDMENT_2` then produced the final
canonical object above: C04 now says `Das ist der aktuelle Zustand.`, and C07
ends with `Passt Freitag, oder wann passt es?`. Exact re-review passed and the
native content review passed, but a `P2` masking gap remained because the
combined leak detector did not prove those three tokens independently.
`PASS_AMENDMENT_3` added isolated hostile mutations #70–#72 without changing
the canonical object. Fresh final exact-spec and native-German adversarial
reviews then both returned `PASS`, with no actionable `P0`, `P1` or `P2`.

The final boundary introduces no new grammatical operation. It excludes other
`werden` persons or numbers, questions, negation-scope expansion, future
perfect, modal Perfekt, double-infinitive clusters, new passive paradigms,
recipient passive, agent phrases, unverified participles or participle rules,
broader relative scope, new connectors, new case/preposition relations, new
tense, broader narrative Präteritum, functional Genitiv, L28 grammar, Task 6,
learner-facing surfaces, release, audio, mockup and English-contour reuse.

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

## L25 hostile and deterministic evidence

- All 60 ordered L25 hostile mutations fail closed with their dedicated
  diagnostics, including event/state confusion, number and tense expansion,
  `werden`-infinitive and recipient-passive leakage, agent phrases, unverified
  participles, auxiliary guessing, lexical/situation drift, future
  learner-layer flags, topology/provenance mutations and terminal transfer
  weakening.
- L25 focused chapter gate: `PASS (de_l25; 7 chapters; 56 packet IDs; Task6
lexical reconciliation pending)`.
- Prefix-25 chapter gate: `PASS (prefix 25; 175 chapters; 1400 packet IDs;
Task6 lexical reconciliation pending)`.
- L24 focused and prefix-24 regression gates: `PASS`.
- The unscoped Task 5 gate remains the required incompleteness signal:
  `INCREMENTAL_TASK5;25/32 lessons;175/224 chapters`.
- Task 4 lesson-boundary gate: `PASS (32 lessons; 224 chapter outcomes; 32
session-56 finals; 48 Task3 constructs; DACH PENDING/HOLD)`.
- Research-authority gate: `PASS (53 claims)`.
- Grammar-graph gate: `PASS (48 constructs; 89 edges; 18 branches)`.
- One-phrase interaction gate: `PASS (66/66)`.
- Schema, owner-decision, formatting, lint and scoped diff gates: `PASS`.
- Recenter manifest/pack/receipt suite is valid only after the manifest binds
  this cumulative receipt's final SHA-256; at that point it must report
  `PASS (31/31)`.

## L26 hostile and deterministic evidence

- All 60 ordered L26 hostile mutations fail closed with their dedicated
  diagnostics, including future/modal meaning collapse, ordinary
  present-future erasure, `wahrscheinlich` cue loss, person-number and tense
  expansion, question and negation-scope leakage, future perfect, modal
  Perfekt, double-infinitive clusters, passive expansion, lexical/situation
  drift, future learner-layer flags, topology/provenance mutations and terminal
  transfer weakening.
- L26 focused chapter gate: `PASS (de_l26; 7 chapters; 56 packet IDs; Task6
lexical reconciliation pending)`.
- Prefix-26 chapter gate: `PASS (prefix 26; 182 chapters; 1456 packet IDs;
Task6 lexical reconciliation pending)`.
- L25 focused and prefix-25 regression gates: `PASS`.
- The unscoped Task 5 gate remains the required incompleteness signal:
  `INCREMENTAL_TASK5;26/32 lessons;182/224 chapters`.
- Task 4 lesson-boundary gate: `PASS (32 lessons; 224 chapter outcomes; 32
session-56 finals; 48 Task3 constructs; DACH PENDING/HOLD)`.
- Research-authority gate: `PASS (53 claims)`.
- Grammar-graph gate: `PASS (48 constructs; 89 edges; 18 branches)`.
- Current one-phrase interaction gate: `PASS (72/72)`.
- Schema and owner-decision gates: `PASS`.
- Prettier, ESLint and scoped diff gates: `PASS`.
- Recenter manifest/pack/receipt suite is valid only after the manifest binds
  this cumulative receipt's final SHA-256; at that point it must report
  `PASS (31/31)`.

## L27 hostile and deterministic evidence

- All 72 ordered L27 hostile mutations fail closed with their dedicated
  diagnostics, including exact Task 4 recall authority, inverse L26→L27
  provenance, review-only construct sets and lifecycle anchors, the six known
  grammar surfaces, forbidden grammar/surface leakage, lexical and situation
  identity, terminal transfer, correction invitation and isolated rejection of
  `Ihre`, `ein anderer Tag` and `besser`.
- L27 focused chapter gate: `PASS (de_l27; 7 chapters; 56 packet IDs; Task6
lexical reconciliation pending)`.
- Prefix-27 chapter gate: `PASS (prefix 27; 189 chapters; 1512 packet IDs;
Task6 lexical reconciliation pending)`.
- L26 focused and prefix-26 regression gates: `PASS`.
- The unscoped Task 5 gate remains the required incompleteness signal with exit
  1 and exact error
  `full_registry_incomplete_or_not_complete:INCREMENTAL_TASK5;27/32 lessons;189/224 chapters`.
- Task 4 lesson-boundary gate: `PASS (32 lessons; 224 chapter outcomes; 32
session-56 finals; 48 Task3 constructs; DACH PENDING/HOLD)`.
- Research-authority gate: `PASS (53 claims)`.
- Grammar-graph gate: `PASS (48 constructs; 89 edges; 18 branches)`.
- Current one-phrase interaction gate: `PASS (72/72)`.
- Schema and owner-decision gates: `PASS`.
- Prettier, ESLint and scoped diff gates: `PASS`.
- Recenter manifest/pack/receipt suite is valid only after the manifest binds
  this cumulative receipt's final SHA-256; at that point it must report
  `PASS (31/31)`.

## Identity-cycle boundary

This receipt deliberately excludes
`content/learning-v2-course/curriculum/de/REQUIREMENT_MANIFEST_V1.json` from its
reviewed identity: that manifest must bind this receipt's final SHA-256, and
including the manifest hash here would create a content-address cycle.
`docs/v2/HANDOVER.md` is also excluded from the reviewed identity because it is
mutable execution history maintained after bounded closure. Neither exclusion
weakens the separate recenter hash gate or handover obligation.

## Closed boundary and next authorized step

- `de_l24` through `de_l27` are closed for Task 5 at the reviewed commits
  above; their applicable Task 4 identities remain pinned by the fail-closed gate.
- The next exact grammar-first blueprint task is a fresh instruction reread and
  content-addressed guardian for `de_l28`, followed by one bounded lesson and
  both independent final reviews.
- Task 6 lexical reconciliation remains mandatory before exact learner-facing
  packet authoring.
- RU+UK learner sessions, release, audio and the German owner mockup remain
  `HOLD` until the complete 32/32 grammar-first blueprint and downstream gates
  close.
- This receipt authorizes no English-contour change, deploy, push, production
  write or release action.

Any byte change in a reviewed cumulative Stage A–D or L27 Stage A/B identity
invalidates the corresponding verdict and requires fresh independent review.
