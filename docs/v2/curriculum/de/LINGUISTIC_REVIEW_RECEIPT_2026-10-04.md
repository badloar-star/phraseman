# German Learning V2 — cumulative linguistic review receipt 2026-10-04

**Verdict:** `PASS`
**Findings:** `P0=0`; `P1=0`; `P2=0`
**Scope:** the bounded `de_l24` through `de_l32` closure across cumulative
Stages A–D already recorded below, plus L27–L30 Stage A (Task 4 authority
repair) and Stage B (Task 5 chapter blueprint plus fail-closed chapter gate),
L31 Stage A authority repair and Task 5 closure, and L32 Task 5 closure.
**Mode:** fresh independent read-only reviews after each GREEN. Cumulative
Stages B–D and L27/L28/L29/L30 Stage B used exact-spec and native-German semantic
judges; L31 and L32 closure used fresh exact-spec and native-German reviews.
No reviewer authored or mutated the reviewed files.
**Reviewed commits:** cumulative Stage A
`40a9087f0d00a679e66439f932f5fa0044e145fc`; Stage B
`eadfba9fe2225a9205eb9242a62f74496685e3fc`; Stage C
`917c02a80599354847ba211e205484751a53fef0`; Stage D
`4091319a91241636f0f1d9ff9a2837857bd914ee`; L27 Stage A
`8a02c929f11c91dcc4ad234b988f8c0b157cd2b0`; L27 Stage B
`079b54138296271cbec921b200cd4176b951cb4b`; L28 Stage A
`ce23e30d42ce91acee65de53b488070e40e3c68e`; L28 Stage B
`3963b8d16a6c3872a671d2801594f1b513432c20`; L29 Stage A
`9b3de41e021f87969eef9c820b42c091d8859d3b`; L29 Stage B
`f4d8b0b5cf8074b72b766d9c85ceec4f6da62241`; L30 Stage A
`8cd2b0e56092d2a97b3f2691de5424694d635c0d`; L30 Stage B
`66b08395634b794c67ec3555bb7aaf3253587815`; L31 Stage A
`0fad5983ab41b48c5baf95ac9479c6438e3def18`; L31 Task 5
`7bd38fc3d57c28bb939dca5f937ad544c41c3ba1`; L32 Task 5
`30472efb65bd6717fa41f3579be8dd5b33cef4a1`.

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

## L28 Stage A — repaired Task 4 authority boundary

| Reviewed artifact                                                | SHA-256                                                            |
| ---------------------------------------------------------------- | ------------------------------------------------------------------ |
| `modules/learning-v2/curriculum/de/lesson_blueprints_de_v1.json` | `0BE735435BF0D326757CED50300BB96D440CD1C35503A3628FF3E8EBC1FAD798` |
| `tests/learning_v2_de_lesson_boundaries_gate.ts`                 | `BCB9A32256ED70FE544169E51BD8F3FDB24EDA25FC249ACB82AA727A9F55DD00` |

The canonical Task 4 `de_l28` object SHA-256 is
`BBED0011F3A848A569CF608A0DE706D82A5503B0A137235D60DBDDF412BC8328`.
Its exact ordered three-row recall-authority SHA-256 is
`4498CC546C93BE421B36BAA5FD911C755AF937E58C07A5D0CC7CBA74D3B68B6C`.

The initial guardian returned `PASS_FULL_PREAUTHOR_AUTHORIZATION_L28` for
canonical chapter candidate
`AAB50F4FE37AAA9E51C814F6B1FA40B248C5A7ED4732CFA526C33A282F44F7A4`,
acknowledged as `ACK_L28_CANONICAL_aab50f4f`. A subsequent fail-closed authority
check blocked the missing non-adjacent L15/L18 recall authority. Stage A repaired
Task 4 and its gate by pinning the exact ordered L16/L15/L18 contract. Fresh
Stage A exact-spec and adversarial reviews both returned `PASS`, with `P0=0`,
`P1=0`, `P2=0`.

## L28 Stage B — closed Task 5 L28 blueprint

| Reviewed artifact                                                 | SHA-256                                                            |
| ----------------------------------------------------------------- | ------------------------------------------------------------------ |
| `modules/learning-v2/curriculum/de/chapter_blueprints_de_v1.json` | `B1F3FF628232136DA04CA50437AD425F815AB1D6835F12CF6509CF0186772218` |
| `tests/learning_v2_de_chapter_blueprints_gate.ts`                 | `BE5B70830B7326B910AC5A9D3DDA2C1CAB7241C7AC22587040023D5D7C1EFD7E` |

The final canonical Task 5 `de_l28` chapter object SHA-256 is
`3105C00880C7EC7BFEC15D6D0D62EE7A6508A941B88015D08F0B7EDF2D9DA1B5`.
The chapter gate pins the exact Task 4 plan SHA-256
`BBED0011F3A848A569CF608A0DE706D82A5503B0A137235D60DBDDF412BC8328`.
The final C05 object SHA-256 is
`6D317C542BE79FD8B0BDCBAB1DB8CCC3134CB320A8B49868B2C0478457F2D41F`;
the reviewed support-surface SHA-256 is
`5735291D555AEDD166D700B3135208E8E648D05EF13D8200EBA22988C5E87F7D`.
The canonical object contains 27,533 characters and 27,588 UTF-8 bytes.

The materialized lesson contains exactly seven chapters and 56 packet IDs. It
introduces only the selected bounded narrative Präteritum inventory, contrasts
it with the already known Perfekt and spoken-past islands, preserves exact
L16/L15/L18 recall provenance, and ends in independent changed-context transfer
at `de_l28_c07_s56`. The component identities remain pinned: grammar boundary
`767F049902A83F16904179FC7AF81F6095BB596670B610FDBAF364DC975A5D79`,
packet IDs `90A77D162A565B5E1E058E4D3CD9FAC37370E1225C9F257ED88A81B5D1B4A977`,
lexical packages `E59121F8A6139B16A36DE17A536A638226DEC70F126248F497D4C6DA1E7E4F9D`,
recall schedule `F91E45CD83E039B856E62F150FBECA3F00CA819CACDAA88A99D96E64DC93FE83`
and lifecycle anchors
`FB4060A3564661407BDD9C4489F5350837C528A5FCF0C8F6FCE07628E622DE6D`.

`AMENDED_PASS_L28_TRANSPORT` clarified only the review-packet transport and did
not alter candidate bytes or content authority. The first reviewers acknowledged
`ACK_L28_REVIEW_PACKET_aab50f4f`; exact-spec review passed with `P0=0`, `P1=0`,
`P2=0`, while native-German review blocked the unselected `folgte` as `P1` and
the combined H84 hostile mutation's masking gap as `P2`.
`AMENDED_PASS_L28_CONTENT_1` authorized the bounded content and isolated-hostile
repair; the writer acknowledged `ACK_AMENDED_PASS_L28_CONTENT_1`. The final
reviewers acknowledged `ACK_L28_FINAL_REVIEW_3105c008`. Fresh final exact-spec
and native-German reviews both returned `PASS`, with `P0=0`, `P1=0`, `P2=0`.

## L29 Stage A — repaired Task 4 authority boundary

| Reviewed artifact                                                | SHA-256                                                            |
| ---------------------------------------------------------------- | ------------------------------------------------------------------ |
| `modules/learning-v2/curriculum/de/lesson_blueprints_de_v1.json` | `0FA844EE3291A36B659C4A8043913B4DD649CB6D4367BBECF36247B8830A33D0` |
| `tests/learning_v2_de_lesson_boundaries_gate.ts`                 | `376E55DA68A9C6E662401DF0FF6C27D8D6130DAFF71362398ABAA45D6475D7BA` |

The canonical Task 4 `de_l29` object SHA-256 is
`414E499F0FF839D80CA6DF6AF2A29C3A1F7E3B9EC133B2F8AA1549FED5207295`.
Its exact ordered L13/L12/L22/L28 recall-authority SHA-256 is
`9132D6885FC12DD807B12CF537F6E19B8A9C328E2A4C9093B5D08E9EB9433124`;
its exact CASE/ADP/NP/CEFR evidence-array SHA-256 is
`B05EECA3CE0F6992804F7EDF96532D28DDF23B6453A9C4E75259C1A58700EE7E`.
The complete lesson file contains 143,724 bytes and the Task 4 gate contains
80,078 bytes.

Stage A repaired two fail-closed authority gaps before Task 5: the extended
L12 two-object construct now has an exact recall row preserving dative
recipient versus accusative transferred entity, and C04's future
preposition-plus-Genitiv outcome now carries `DE-GRM-ADP-001` alongside the
case, nominal-group and CEFR evidence. Fresh exact-spec and native/adversarial
reviews both returned `PASS`, with `P0=0`, `P1=0`, `P2=0`.

The source selection was tightened rather than broadened. An initial
memory-level candidate, `wegen eines Unfalls`, was rejected because its exact
IDS page was not the bound ledger URL. The final production frame is the
verbatim `wegen des Regens` from the already approved
`DE-GRM-ADP-001` page. That source also attests colloquial
`wegen dem Regen`; L29 therefore produces only the bounded written Genitiv
frame but does not declare the Dative variant universally ungrammatical.

## L29 Stage B — closed Task 5 L29 blueprint

| Reviewed artifact                                                 | SHA-256                                                            |
| ----------------------------------------------------------------- | ------------------------------------------------------------------ |
| `modules/learning-v2/curriculum/de/chapter_blueprints_de_v1.json` | `3DF05F1E301BA8CB05246BE9A2FC8FFCFED4FE61ED4B5A688679FD3845904F81` |
| `tests/learning_v2_de_chapter_blueprints_gate.ts`                 | `F9478F9C7A0E074FC3C0CD50439A9716B33917E6E4A2070F81AA1238F47DD37A` |

The final canonical Task 5 `de_l29` object SHA-256 is
`1D1A460ED69D0D12E016E8768365CC09860722D01610CD4C42732C89682CB889`.
Its compact canonical serialization contains 32,439 characters and 32,489
UTF-8 bytes. The reviewed standalone Prettier transport is
`3187149066BB5529F62524A41F3A17D9BF4B0B513E1CB74BE835F2BA3A8CD05F`,
with 44,906 characters and 44,956 UTF-8 bytes. The final chapter file contains
1,170,428 bytes and the final gate contains 752,492 bytes.

The component identities are pinned: grammar boundary
`0B2CA79A738FF6BD8BA7E5FFF88616632FFF4D536827C2CB1297B18343ED6B68`,
packet IDs `536DE44247C2169C9A127E9CDBFEE62E39F67282223791CD53D7FC5EAD5B4B96`,
lexical packages
`08E763B5E1FFD46414A06FB98B7E9CECC53A19736EC211364C54DF38ED45C971`,
recall schedule
`A9F35BA79741C0FA1A8E025C952EE0D4C4DCADF4DAB2B3FC69DFD293B19BC04A`
and lifecycle anchors
`A6FE63947BE9944813FD5D6A6BDF272688E28C7159C135BBEB38C78BD1899075`.

The materialized lesson contains exactly seven chapters, 56 packet IDs and 14
planned lexical senses. It permits only five closed nominal Genitiv wholes,
the single approved `wegen des Regens` frame, the established L12 two-object
contrast, one already licensed neuter-nominative relative mapping and selected
`sah`. It preserves exact L13/L12/L22/L28 recall, support fading, changed
contexts and final independent transfer at `de_l29_c07_s56`. Its six local
lifecycle anchors include the required delayed L28 broader-narrative anchor at
`de_l29_c07_s49`.

The first prose-only Task 5 authorization was correctly blocked by the sole
writer because it lacked complete machine-reconstructable chapter JSON, gate
code and target identities. It was superseded, not patched by assumption.
`AMENDED_PASS_L29_TASK5_EXACT_TRANSPORT` supplied exact full target candidates,
component/file hashes and 117 isolated hostile mutations. During temp decode,
the generic gate exposed a missing delayed anchor as
`task3_lifecycle_anchors_mismatch:expected=269:actual=268`; the exact transport
was repaired with the L28 delayed anchor at `de_l29_c07_s49`, rerun to GREEN
and acknowledged as
`ACK_L29_TASK5_EXACT_TRANSPORT_1d1a460e_f9478f9c_117`. The final committed
bytes exactly match those reviewed identities.

Fresh final exact-spec and native-German adversarial reviews both returned
`PASS`, with `P0=0`, `P1=0`, `P2=0`. No reviewer authored or mutated the
reviewed files.

## L30 Stage A — repaired Task 4 authority boundary

| Reviewed artifact                                                | SHA-256                                                            |
| ---------------------------------------------------------------- | ------------------------------------------------------------------ |
| `modules/learning-v2/curriculum/de/lesson_blueprints_de_v1.json` | `FBDE334D3A2768562FDED9A2701869F982D1D259D7386CCD0321E16D054085E2` |
| `tests/learning_v2_de_lesson_boundaries_gate.ts`                 | `CD1FC6B34102BD69C59968D3C75B8627F15E1567FCB87C74445864F7C4BEBAFF` |

Stage A is commit `8cd2b0e56092d2a97b3f2691de5424694d635c0d`, tree
`ccc4a8d4e4fc8fa7ca6b5569743fd6b9c3161bda`. The lesson file contains
144,830 bytes and the gate contains 93,876 bytes. The canonical Task 4
`de_l30` object SHA-256 is
`CACBA03EEAAD98DD132EDE35B32E43AB93D25DE87ABE04B8350117E179B3BCA9`;
its ordered recall-authority SHA-256 is
`445B40B2409BC26790F0158DC72339DF4592BC7AF53B7BD5E506F3244C7683EA`
and its evidence-array SHA-256 is
`4E01F56D92DA435C5F3FEDDD4F26864E4B3B7B1F1C0A533200CE26227161014A`.

The bound source is `DE-GRM-MODALPERF-001`, with the exact attested frame
`Anderthalb Stunden hat er warten müssen`. The final V4 exact transport added
one direct probe and 26 isolated hostile cases. Two fresh prewrite reviews and
two fresh postwrite reviews returned exact `PASS`; reviewers made no edits.

## L30 Stage B — closed Task 5 L30 blueprint

| Reviewed artifact                                                 | SHA-256                                                            |
| ----------------------------------------------------------------- | ------------------------------------------------------------------ |
| `modules/learning-v2/curriculum/de/chapter_blueprints_de_v1.json` | `E640E3F4472440BFD14FA28EA3961DBC8C75A52F846C6118E53DE5739A0752DC` |
| `tests/learning_v2_de_chapter_blueprints_gate.ts`                 | `2E0A11B6E7263285B659A8CDA5312B1BA1714B0A02E997C4AF16F00BA05541D2` |

Stage B is commit `66b08395634b794c67ec3555bb7aaf3253587815`, tree
`e6c677373b11a63e34fb7fce7bcfcada1b2e8a99`. The chapter file contains
1,216,856 bytes and the gate contains 789,721 bytes. The canonical Task 5
`de_l30` object SHA-256 is
`9FEEBEEB4E8C52428ED3663F0C9D2F56DB620BB2C58E41243DFA2AC3A4204C5D`.
Its standalone object payload is
`AD6B5FC1BD895BA58D65678D44F05E1721719844D014F03C10AFAB0123AA249A`
and contains 42,339 UTF-8 bytes.

The component identities are pinned: grammar boundary
`DDFDF11E2559245639030F9C79EACC86289C03E257D94CF5FDED6B0EC3EDB867`,
packet IDs `607FBED73D83BF66122864568F3E1FCC2EE6F9E6B40EDF0C6CEF326A1ACA6037`,
lexical packages
`02709AE2B80BC7F295B2B1C705190AA52CE8011C8B43FA863AD126CCE428F1E0`,
recall schedule
`AB44B382D81C2083BD8E85A037A5A97DC9BD070BC07EB13DE7C3B24F0A15CD2B`
and lifecycle anchors
`1A5A0477FA7F140A5D9BE7DBAE472290AF5C29B0BE3AA9AD217C8A078561A6B5`.

The materialized lesson contains seven chapters, 56 packet IDs and exactly 12
planned lexical senses distributed `[1,1,2,2,2,2,2]`. Its final isolated
hostile corpus contains 125 cases. Fresh exact-spec and native-German reviews
returned `PASS` before and after materialization.

Transport history is explicit. V1 manifest `8d12…` was superseded after a
lexical-utility P1. Broken interim V2 manifest `594f…` and gate `c8db…`
were superseded after `$&` replacement-string insertion corruption. Repaired
V2 manifest `9e2…` was superseded after a native P1 found unlicensed
`gab`/`betraf`. Final V3 manifest
`805835f7be5981c70c2281e087814eee36ab14d1e3aad1a0a54e08c757fc46b1`
passed exact/prewrite, exact/native and postwrite review.

The frozen prewrite verifier's first postwrite result is recorded as
`EXPECTED_POSTWRITE_SOURCE_ANCHOR_REJECTION`: only after all payload-integrity
checks passed, its frozen chapter anchor `3df05f1e…` correctly differed from
the exact materialized `e640e3f4…`. Independent reviewers approved that
interpretation; evidence bytes remained unchanged.

The default Git gate diff `+1265/-252` is a heuristic alignment only.
Minimal, histogram and patience diffs are `+1013/-0`; exact parent hashes
match, every parent line is preserved in order, and an independent commit
review passed. No rewrite or reset was used.

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

## L28 hostile and deterministic evidence

- All 111 ordered L28 hostile mutations fail closed with their dedicated
  diagnostics, including exact Task 4 recall authority, selected-form inventory,
  register contrast, event sequencing, state/action and cause/result meaning,
  lifecycle and recall provenance, lexical packages and utility, independent
  transfer, isolated rejection of `folgte`, `ging`, `brauchte` and `schrieb`,
  forbidden grammar/surface leakage and English-contour isolation.
- L28 focused chapter gate: `PASS (de_l28; 7 chapters; 56 packet IDs; Task6
lexical reconciliation pending)`.
- Prefix-28 chapter gate: `PASS (prefix 28; 196 chapters; 1568 packet IDs;
Task6 lexical reconciliation pending)`.
- L27 focused and prefix-27 regression gates: `PASS` (7/56 and 189/1512).
- The unscoped Task 5 gate remains the required incompleteness signal with exit
  1 and exact error
  `full_registry_incomplete_or_not_complete:INCREMENTAL_TASK5;28/32 lessons;196/224 chapters`.
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

## L29 hostile and deterministic evidence

- All 117 ordered L29 hostile mutations fail closed with their exact dedicated
  diagnostics. They cover Task 4 recall/evidence authority, identity and set
  drift, lifecycle/registry anchors, recall/future probes, situations, support
  fading, evidence packets, lexical packages and utility, all seven required
  chapter semantics, the bounded nominal inventory, the exact approved
  preposition frame, colloquial-Dative overreach, paradigms and formation
  rules, genitive pronouns/relatives, proper-name/plural/postposed Genitiv,
  unselected relative and Präteritum forms, modal Perfekt, register-repair
  mediation, legal overclaim, unlabelled DACH production, Task 6, RU/UK,
  release, audio, mockup and English-contour contamination.
- L29 focused chapter gate: `PASS (de_l29; 7 chapters; 56 packet IDs; Task6
lexical reconciliation pending)`.
- Prefix-29 chapter gate: `PASS (prefix 29; 203 chapters; 1624 packet IDs;
Task6 lexical reconciliation pending)`.
- L28 focused and prefix-28 regression gates: `PASS` (7/56 and 196/1568).
- The unscoped Task 5 gate remains the required incompleteness signal with exit
  1 and exact error
  `full_registry_incomplete_or_not_complete:INCREMENTAL_TASK5;29/32 lessons;203/224 chapters`.
- Task 4 lesson-boundary gate: `PASS (32 lessons; 224 chapter outcomes; 32
session-56 finals; 48 Task3 constructs; DACH PENDING/HOLD)`.
- Research-authority gate: `PASS (53 claims)`.
- Grammar-graph gate: `PASS (48 constructs; 89 edges; 18 branches)`.
- Current one-phrase interaction gate: `PASS (72/72)`.
- Schema and owner-decision gates: `PASS`.
- Prettier, ESLint and scoped two-file diff gates: `PASS`.
- Recenter manifest/pack/receipt suite is valid only after the manifest replaces
  its single receipt digest with this cumulative receipt's final SHA-256; source
  document and requirement counts remain exactly 52 and 102, and no receipt ↔
  manifest identity cycle is introduced. At that point the suite must report
  `PASS (31/31)`.

## L30 hostile and deterministic evidence

- All 125 ordered L30 hostile mutations fail closed with their exact dedicated
  diagnostics, including lexical surface/facet/participant grounding and the
  two isolated broader-narrative-Präteritum leak probes.
- L30 focused chapter gate: `PASS (de_l30; 7 chapters; 56 packet IDs; Task6
lexical reconciliation pending)`.
- Prefix-30 chapter gate: `PASS (prefix 30; 210 chapters; 1680 packet IDs;
Task6 lexical reconciliation pending)`.
- L29 focused regression gate: `PASS` (7 chapters; 56 packet IDs).
- The unscoped Task 5 gate remains the required incompleteness signal with exit
  1 and exact error
  `full_registry_incomplete_or_not_complete:INCREMENTAL_TASK5;30/32 lessons;210/224 chapters`.
- Task 4 lesson-boundary gate: `PASS (32 lessons; 224 chapter outcomes; 32
session-56 finals; 48 Task3 constructs; DACH PENDING/HOLD)`.
- Research-authority gate: `PASS (53 claims)`.
- Grammar-graph gate: `PASS (48 constructs; 89 edges; 18 branches)`.
- Current one-phrase interaction gate: `PASS (72/72)`.
- Schema and owner-decision gates: `PASS`.
- Prettier, ESLint and scoped two-file diff gates: `PASS`.
- Recenter manifest/pack/receipt suite is valid only after the manifest replaces
  its single receipt digest with this cumulative receipt's final SHA-256; source
  document and requirement counts remain exactly 52 and 102, and no receipt ↔
  manifest identity cycle is introduced. At that point the suite must report
  `PASS (31/31)`.

## L30 local Codex OpenAI API firewall evidence

In `C:\appsprojects\phraseman`, local Codex used no project OpenAI API key
for L30 chat, responses, reasoning, reviews, research, judging, phrase/content
generation, image generation, transcription, embeddings, experiments, or batch
analysis; no such API use occurred in L30 Stage A, Task 5, review, verification,
commit, or closure.

The sole permitted local Codex API exception is TTS/voiceover through
`/v1/audio/speech`, only after an explicit user audio request AND
`PHRASEMAN_ALLOW_OPENAI_DEV_SPEND=1`. Local scripts must use
`OPENAI_TTS_API_KEY`, never generic `OPENAI_API_KEY`.

Production/user Phraseman Firebase/Cloud Functions secrets are outside this
local-Codex firewall. TTS/audio remains `HOLD`, so the exception was not
invoked.

Deterministic added-line and path-scope scans of L30 Stage A commit
`8cd2b0e56092d2a97b3f2691de5424694d635c0d` and Stage B commit
`66b08395634b794c67ec3555bb7aaf3253587815` confirm that neither commit
introduces `api.openai.com`, `/v1/audio/speech`, `OPENAI_API_KEY`,
`OPENAI_TTS_API_KEY` or `PHRASEMAN_ALLOW_OPENAI_DEV_SPEND`. The scan excludes
this explanatory receipt.

## Identity-cycle boundary

This receipt deliberately excludes
`content/learning-v2-course/curriculum/de/REQUIREMENT_MANIFEST_V1.json` from its
reviewed identity: that manifest must bind this receipt's final SHA-256, and
including the manifest hash here would create a content-address cycle.
`docs/v2/HANDOVER.md` is also excluded from the reviewed identity because it is
mutable execution history maintained after bounded closure. Neither exclusion
weakens the separate recenter hash gate or handover obligation.

## Closed boundary and next authorized step

- `de_l24` through `de_l30` are closed for Task 5 at the reviewed commits
  above; their applicable Task 4 identities remain pinned by the fail-closed gate.
- The next exact grammar-first blueprint tasks require fresh instruction rereads
  and content-addressed guardians for `de_l31` Task 4 and Task 5, followed by
  both independent final reviews.
- Task 6 lexical reconciliation remains mandatory before exact learner-facing
  packet authoring.
- RU+UK learner sessions, release, audio, the German owner mockup,
  English-contour work and HANDOVER updates remain `HOLD` until the complete
  32/32 grammar-first blueprint and downstream gates close.
- This receipt authorizes no English-contour change, deploy, push, production
  write or release action.

Any byte change in a reviewed cumulative Stage A–D, L27 Stage A/B, L28 Stage
A/B, L29 Stage A/B or L30 Stage A/B identity invalidates the corresponding
verdict and requires fresh independent review.

## L31/L32 cumulative closure — Task 5 complete

| Closure artifact                 | Exact identity                                                     |
| -------------------------------- | ------------------------------------------------------------------ |
| final chapter blueprint registry | `494ABD91C59C88ED652B3B4CDAAEAA118BC53EF64BEB57FF54F735433612EB29` |
| final chapter gate               | `E372D23E7B69772500658C0F1C29348BD82C3CC1D637C83E8238B62CB820C737` |
| L31 Task 4 authority object      | `6090121F5518966A377235D5ADC8E450BEB7E7C5717D8595EB7026B64277F9E9` |
| L31 Task 4 recall authority      | `4BAE9D6EAEA0835BF39ECA79F447113A6A6444FB7DE23908145E76BE087FCDB7` |
| L31 Task 4 session-56 final      | `A7D5AA7B88C02A3C98ED19A7750F34A5FD12DFF1CC1B9DB3190BC2CA29F11593` |
| L31 Task 5 semantic object       | `1DD16F8AB5DBAB505A1BD152E78953DC30A6DCB4B57F120B62A547797EEC0DF4` |
| L32 Task 4 authority object      | `823A46887ADA299EE93CA64AE73EE3A31E42AFA729770816CADCD9504C96F343` |
| L32 Task 4 session-56 final      | `0B5718C31A4C4B858BB73458362921DE59D74F99C1ECFCB9912D79DF80284DC3` |
| L32 Task 5 semantic object       | `37DD8F7BBD72A11C1C075F376A8B49D3087DC4F795FBB3BD426EBE3701D096FB` |

L31 Stage A authority repair is commit
`0fad5983ab41b48c5baf95ac9479c6438e3def18`; the materialized L31 Task 5
chapter blueprint is commit `7bd38fc3d57c28bb939dca5f937ad544c41c3ba1`. The
materialized L32 Task 5 chapter blueprint is commit
`30472efb65bd6717fa41f3579be8dd5b33cef4a1`. The present registry declares
`COMPLETE_TASK5`: it contains exactly 32 lessons, 224 chapters and 1,792
packet IDs. Focused current gates pass for L31 and L32 (7 chapters and 56
packet IDs each), and the prefix-32 gate passes for the full 224/1,792 set.

L31 introduces register-repair while integrating the closed L14/L18/L19/L22/L29/L30
resources, including the L18 connector topology; its final transfer deliberately
excludes L29 Genitiv and relative-clause surfaces. L32 is the terminal integration
lesson: apart from its newly introduced functional-B1 integration wrapper, its
surface constructs are already introduced and context-selected. Its C7 is a bounded
functional-B1/register-repair mediation transfer with the single context-required
modal-Perfekt meaning. Neither closure licenses Task 6,
learner-facing RU+UK sessions, audio, release, mockup, HANDOVER changes or any
English-contour work.

The L32 native postwrite closure explicitly verified the final live byte
identities above after deleting one stale _untracked generated_ JavaScript
shadow of the TypeScript gate. The live TypeScript gate, focused L32 and
prefix-32 gates, Prettier and ESLint then passed. This receipt records the
reviewed blueprint boundary only; it does not claim a learner-facing release.

## German shared-prompt adapter and precedence

German `OWNER_DECISIONS.md` and `DE-INTERACTION-001` are standalone
normative authority for the German contour. English owner citations, English
content and hardcoded English wording that appear in shared factory prompts are
calibration/placeholders only: they must be target-adapted to the exact German
packet and can never authorize English content or override a German owner
decision. An unadapted shared-prompt invocation is `HOLD`.

## Closed authority boundary and next authorized step — superseding status

- Task 5 is now complete for all 32 German lessons; its live registry is
  `COMPLETE_TASK5` and the exact final identities are recorded above.
- Task 6 lexical reconciliation remains mandatory before any exact
  learner-facing packet authoring. Its work must begin with a fresh independent
  instruction/authority reread and a current recenter receipt.
- RU+UK learner sessions, audio, release, German owner mockup, English-contour
  work and HANDOVER updates remain `HOLD` until Task 6 and every downstream
  gate required by the German contour close.
- The receipt still excludes the requirement-manifest identity: the manifest
  binds this receipt SHA-256 after this text is finalized. This one-way binding
  avoids a receipt↔manifest content-address cycle.

## 2026-10-08 shared locale-judge source-identity repair

The shared locale-judge prompt changed from SHA-256
`2d1f2df6be7dadc221ee139aefea6ab4db0c4d9246aae98de362f51a481a0d45` to
`7c75761015964913d1d6ed4ad0aca0c8fcbe0f05cb3851f0ff3768f9844af02a`.
The German requirement manifest is rebound to those current bytes and adapts
their general learner-option rules into `DE-JUDGES-005`: every visible
`responseOption` and selectable localized meaning is one atomic word, phrase or
meaning; packages using `;`, `；`, `|`, newlines, list markers, repeated
`word — meaning` pairs or three-word glossary bundles are forbidden;
multiline explanation belongs only in a separate non-selectable word-card; and
Markdown must have exact target/options/audio parity with the atomic source.

The prompt's humor cadence applies specifically to the English Codex L2/S33+
series and is an editorial target, not a literal numeric owner requirement. It
does not create `DE-HUMOR-001`, a German numeric humor quota or permission to
import English-series cadence. German `DE-OWNER-007`, `DE-OPENING-005`,
`DE-JUDGES-001`, `DE-RESEARCH-003`, `DE-INTERACTION-001` and the German
`OWNER_DECISIONS.md` remain unchanged authority for natural, useful,
non-glued-on voice, exact German target granularity and shared-prompt
target-adaptation. The RU/UK native-locale judge remains independent and must
preserve German target and diagnostic intent.

This source-identity repair does not claim that a fresh independent review has
completed. Historical Task 6A3–A11 TEMP packets and their reviews remain bound
to their own earlier manifest/receipt anchors; they are not reprinted, resealed
or promoted to a fresh live-anchor PASS. The next Task 6A12 packet must accept
the new live manifest and receipt anchors through a fresh guardian while
preserving the parent A11 bytes. No numbered task advances, and no learner
session, audio, mockup, publish or release is authorized by this note.
