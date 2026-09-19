# German Learning V2 — полный grammar-first blueprint: план материализации

> **Статус:** план реализации до learner-facing authoring. Этот документ не
> является owner approval blueprint и не разрешает писать сессии.

**Цель:** материализовать независимый немецкий Learning V2 contour
`PRE_A1 → functional B1`: ровно 32 урока, 224 главы и 1 792 exact session
packets, собственные German registries, prerequisite/retrieval graphs,
coverage matrices, детерминированный owner map и candidate fingerprint.

**Главный запрет:** English curriculum, English sessions, English release,
English authoring registry, English fingerprints и English owner mock не
редактируются и не используются как содержательный источник. Общими остаются
только утверждённые factory contracts, topology и gate discipline.

**Метод:** один writer; TDD для каждого контракта; после каждой законченной
части — независимый spec/linguistic review; после каждого compaction, restart,
handoff и перед каждым новым packet batch — полный German recenter. Любой
непрошедший детерминированный gate или judge verdict оставляет этап на `HOLD`.

---

## Нормативная основа

Перед выполнением каждого task writer заново читает обязательный маршрут из
`docs/v2/СТАРТ de.md`, включая Desktop Codex package, `docs/v2/СТАРТ В2.md`,
factory Constitution/Method/Main Requirement, три английских эталона как
эталоны качества (не как источник немецкого content), все owner verdicts,
German Stage0, research dossier, ledger, owner decisions и applicable packet.

Канонические немецкие источники этого этапа:

- `docs/v2/curriculum/de/RESEARCH_DOSSIER.ru.md`;
- `docs/v2/curriculum/de/SOURCE_EVIDENCE_LEDGER.md`;
- `docs/v2/curriculum/de/OWNER_DECISIONS.md`;
- `modules/learning-v2/curriculum/de/research_authority_de_v1.ts`;
- `docs/superpowers/specs/2026-09-19-learning-v2-german-grammar-first-course-design.md`;
- `docs/v2/curriculum/de/TASK_PACKET_STAGE_0.md`;
- `content/learning-v2-course/curriculum/de/REQUIREMENT_MANIFEST_V1.json`.

Latest owner override имеет приоритет над старым общим blueprint-текстом:
**каждая** нумерованная немецкая сессия, включая checkpoint, voice, recall и
review, получает 1–5 новых полезных lexical senses и новую ситуацию. Filler и
скрытое повторное введение старого sense запрещены.

---

## Канонические выходы

### Blueprint source

- `modules/learning-v2/curriculum/de/course_blueprint_de_v1.json` — корневой
  canonical index, counts, IDs, source digests, registry digests и candidate
  fingerprint.
- `modules/learning-v2/curriculum/de/lesson_blueprints_de_v1.json` — 32 lesson
  boundaries.
- `modules/learning-v2/curriculum/de/chapter_blueprints_de_v1.json` — 224
  chapter outcomes.
- `modules/learning-v2/curriculum/de/registries/grammar_constructs_de_v1.json`.
- `modules/learning-v2/curriculum/de/registries/lexical_senses_de_v1.json`.
- `modules/learning-v2/curriculum/de/registries/communicative_outcomes_de_v1.json`.
- `modules/learning-v2/curriculum/de/registries/pronunciation_targets_de_v1.json`.
- `modules/learning-v2/curriculum/de/registries/phrase_frames_de_v1.json`.
- `modules/learning-v2/curriculum/de/registries/forbidden_surface_forms_de_v1.json`.
- `modules/learning-v2/curriculum/de/graphs/prerequisite_dag_de_v1.json`.
- `modules/learning-v2/curriculum/de/graphs/lexical_retrieval_graph_de_v1.json`.
- `modules/learning-v2/curriculum/de/graphs/review_edges_de_v1.json`.
- `modules/learning-v2/curriculum/de/matrices/grammar_coverage_de_v1.json`.
- `modules/learning-v2/curriculum/de/matrices/lexical_coverage_de_v1.json`.
- `modules/learning-v2/curriculum/de/matrices/can_do_coverage_de_v1.json`.
- `modules/learning-v2/curriculum/de/matrices/pronunciation_coverage_de_v1.json`.
- `modules/learning-v2/curriculum/de/matrices/ru_uk_interference_de_v1.json`.
- `content/learning-v2-course/curriculum/de/packets/lXX/sYY.json` — ровно
  1 792 exact packets.

### Validation, approval and owner projection

- `modules/learning-v2/curriculum/de/course_blueprint_contract_de_v1.ts`.
- `modules/learning-v2/curriculum/de/course_blueprint_validation_de_v1.ts`.
- `modules/learning-v2/curriculum/de/blueprint_approval_registry_de_v1.ts`.
- `scripts/learning-v2-de-build-owner-map.mjs`.
- `.codex-tmp/learning-v2-curriculum-owner-map-de/index.html` — generated,
  ignored owner map.
- `.codex-tmp/learning-v2-curriculum-owner-map-de/manifest.json` — exact file
  digests, candidate fingerprint, generator version and build receipt.
- `docs/v2/curriculum/de/BLUEPRINT_OWNER_APPROVAL.md` — `PENDING` до явного
  ответа владельца на exact displayed fingerprint.

Ни один generated файл не является самостоятельным source of truth. Owner map
строится только из canonical German JSON и должен быть побайтово воспроизводим.

---

## Task 1 — закрыть research admission и owner-decision envelope

**Tests first**

- Расширить `tests/learning_v2_de_research_authority_gate.ts` отрицательными
  fixtures для неизвестного evidence ID, отсутствующего ограничения и
  несогласованного evidence status.
- Добавить `tests/learning_v2_de_owner_decisions_gate.ts`, который требует:
  confirmed decisions отдельно от pending; отсутствие фиктивного approval;
  Germany Standard production baseline; RU+UK; functional B1; DACH inventory
  и Goethe cross-check остаются явно `PENDING`, пока владелец не ответил.

**Implementation**

- Завершить независимый linguistic/source review всех typed claims.
- После PASS изменить статус dossier на `REVIEWED — SOURCE-BACKED` и сохранить
  review receipt с exact hashes.
- Добавить research dossier, ledger, decisions и typed authority в German
  requirement manifest; пересчитать hashes только после чтения изменившихся
  файлов.

**Gate**

```powershell
npx tsx tests/learning_v2_de_research_authority_gate.ts
npx tsx tests/learning_v2_de_owner_decisions_gate.ts
node --test content/learning-v2-course/pipeline/recenter_contract.test.mjs
```

**Acceptance:** research review `PASS`; unresolved product choices видимы и не
маскируются значением по умолчанию; learner-facing authoring остаётся `HOLD`.

---

## Task 2 — определить closed German blueprint schema

**Tests first**

Создать `tests/learning_v2_de_blueprint_schema_gate.ts` с RED cases:

- extra/unknown field;
- English-prefixed ID или English target path;
- counts не `32/224/1792`;
- неканонический `de_lXX_cYY_sZZ` identity;
- чужая locale policy;
- незаявленный evidence ID;
- grammar construct без form/function, scope, exclusions или prerequisites;
- lexical sense без lemma, sense gloss, part of speech, gender/plural package
  для существительного или valency/frame для глагола;
- pronunciation target без evidence status и отдельной RU/UK applicability;
- packet без exact source hashes.

**Implementation**

Создать closed types и parser в
`course_blueprint_contract_de_v1.ts`. Контракт должен быть target-native, но
не изменять English types. Он фиксирует стабильные ID, immutable arrays,
explicit nulls, exact path format и deterministic canonical JSON encoding.

**Acceptance:** все malformed fixtures fail closed; пустой German skeleton с
правильной схемой парсится, но не проходит completeness gate.

---

## Task 3 — материализовать German grammar construct graph

**German-native arc**

Конструкции проектируются вокруг Satzklammer/topological fields, а не вокруг
English tense order. Обязательные связанные ветви:

1. formulaic chunks → personal reference → finite agreement;
2. statement V2 → Verberst yes/no → W-element + V2;
3. noun package `Artikel + Singular + Plural`;
4. Nominativ → frequent Akkusativ frames → Dativ recipient/location →
   two-object contrasts → limited functional Genitiv;
5. negation `nein / nicht / kein- / doch`;
6. separable verbs and right bracket;
7. modal finite operator + bare infinitive;
8. local/temporal Präposition + governed case, then Wechselpräpositionen;
9. pronoun reference and case forms;
10. adjective/predicative use, then staged Nominalgruppe agreement;
11. Perfekt with verified `haben/sein` lexical classes;
12. compact spoken Präteritum island `war/hatte/modals`, then broader narrative
    Präteritum;
13. introduced Verbletzt clauses and connector contrasts;
14. infinitive/verb clusters, formal `Sie → sich`, reflexive/reciprocal;
15. relative clauses after gender/case/Verbletzt prerequisites;
16. event/state passive after participles and bracket control;
17. Präsens future reference before separate `werden + Infinitiv` meanings;
18. late functional B1 integration, repair, register, mediation and limited
    modal Perfekt only after stable multi-verb brackets.

**Tests first**

Создать `tests/learning_v2_de_grammar_graph_gate.ts`:

- DAG acyclic and fully reachable from PRE_A1;
- no future prerequisite;
- every productive operation has earlier explanation and later independent,
  transfer and delayed evidence;
- Verbletzt does not use the false finite/non-finite split;
- formal `Sie → sich` is represented;
- Präsens future and `werden + Infinitiv` are separate operations;
- no CEFR sequence is falsely attributed to a source.

**Implementation**

Заполнить grammar registry и prerequisite DAG. Каждый construct stores
receptive/productive scope, exclusions, source refs, first-introduction,
guided/retrieval/production/transfer/delayed targets and evidence status.

**Acceptance:** fresh linguistic judge returns PASS for every construct and
every graph edge.

---

## Task 4 — спроектировать 32 lesson boundaries

**Tests first**

Создать `tests/learning_v2_de_lesson_boundaries_gate.ts`:

- exactly 32 unique lessons;
- each has one bounded grammar/can-do territory, seven chapter outcomes and
  a session-56 transfer/final-exam contract;
- functional B1 exit evidence covers reception, production, interaction,
  mediation, repair, register and changed-context transfer;
- German grammar order follows Task 3 prerequisites, not English ordinals;
- de-DE production and labelled AT/CH receptive boundary are explicit;
- pending DACH scope cannot silently become approved content.

**Implementation**

Заполнить `lesson_blueprints_de_v1.json`. Сценарная оболочка обеспечивает
everyday/travel/service/work/community can-do coverage, но grammar boundary,
lexicon, pronunciation и pragmatics выбираются заново для немецкого. Для
каждого урока указать introduced/extended/reviewed/prohibited constructs,
lexical domains, pronunciation targets, cross-lesson recall and final transfer.

**Review:** fresh linguistic judge + pedagogy judge + spec judge. Любой HOLD
исправляется до проектирования 224 chapters.

---

## Task 5 — материализовать 224 chapter outcomes

**Tests first**

Создать `tests/learning_v2_de_chapter_blueprints_gate.ts`:

- exactly seven chapters per lesson and 224 total;
- eight unique packet IDs per chapter;
- chapter outcome advances the lesson boundary and declares support fading;
- checkpoint integrates known grammar but, по latest owner override, still
  introduces 1–5 useful lexical senses and a genuinely new situation;
- each chapter schedules cross-chapter recall and a future delayed probe;
- no chapter expands the lesson grammar boundary.

**Implementation**

Заполнить `chapter_blueprints_de_v1.json` in lesson order. После каждого урока
выполнять full recenter и получать fresh read-only review, чтобы drift не
накапливался на 224 записях.

**Acceptance:** 224 outcomes are useful, non-duplicative and prerequisite-safe;
никакая глава не является переименованной копией другой.

---

## Task 6 — создать lexical-sense, phrase-frame и pronunciation registries

**Tests first**

Создать:

- `tests/learning_v2_de_lexical_registry_gate.ts`;
- `tests/learning_v2_de_phrase_frame_gate.ts`;
- `tests/learning_v2_de_pronunciation_registry_gate.ts`.

Обязательные RED cases:

- bare German noun without article/gender/exact plural;
- new meaning reused under an old sense ID;
- filler sense not tied to can-do/grammar/transfer;
- sense first used in phrase before word-first grounding;
- phrase frame leaks future grammar or forbidden surface form;
- UK profile copied from RU;
- contrastive risk scored as presumed nationality error;
- pronunciation target lacks separate perception and production evidence;
- DACH variant appears as unlabelled production target.

**Implementation**

- Lexical entries count meanings, not spelling; each noun stores
  `article + singular + plural`, each verb stores valency/frame and relevant
  separability/auxiliary behavior.
- Phrase frames are German examples only, 2–4 per packet later; they are
  blueprint evidence, not final learner prompts.
- Pronunciation registry distinguishes `DIRECT_SYSTEM`, `DIRECT_L2_RU`,
  `DIRECT_L2_UK`, `CONTRASTIVE_RISK`, `PEDAGOGICAL_INFERENCE`; RU and UK
  corrective routes remain separate.

**Acceptance:** every registry item has a real downstream owner; no speculative
entry exists only to satisfy a count.

---

## Task 7 — materialize exact packets in 32 atomic lesson batches

Каждый batch owns exactly one directory range:

```text
content/learning-v2-course/curriculum/de/packets/l01/s01.json ... s56.json
...
content/learning-v2-course/curriculum/de/packets/l32/s01.json ... s56.json
```

Перед **каждым** packet или mechanically contiguous packet batch:

1. rebuild instruction pack from disk;
2. obtain fresh `judge_recenter` PRE_AUTHOR `ON_TRACK` receipt bound to current
   process epoch, research/blueprint digests and exact target range;
3. materialize only the declared packet(s);
4. run POST_AUTHOR recenter on exact changed bytes;
5. run lesson-local deterministic gates;
6. receive fresh spec/pedagogy/linguistic review before opening the next lesson.

**Tests first**

Создать `tests/learning_v2_de_exact_packets_gate.ts` с проверками:

- exactly 56 packets per lesson and 1 792 total;
- canonical identity/path equality and no duplicates;
- exactly one new grammar operation or explicit review set;
- every packet, including checkpoint/voice/recall/review, has 1–5 genuinely new
  useful senses and one new situation;
- every old sense is used only as support/retrieval and cannot dominate primary
  targets or all independent evidence;
- exact German canonical examples instantiate packet operation/review set;
- no future grammar, hidden prerequisite or forbidden surface form;
- support fades and independent probe uses a new context/signature;
- each new sense has word-first grounding before scored phrase use;
- audio semantics and phonetic distractor checks are independent obligations;
- session role, mode families, accessibility alternative and review edges are
  explicit;
- no learner-facing RU/UK prompts, final distractors or feedback are generated
  at blueprint stage.

**Acceptance per lesson batch:** 56/56 packets pass deterministic gates and
fresh judges; lesson digest is frozen before the next lesson batch.

---

## Task 8 — build global graphs and coverage matrices

**Tests first**

Создать `tests/learning_v2_de_coverage_matrices_gate.ts`:

- every construct has explain → discriminate → guided retrieve → independent
  produce → changed-context transfer → delayed retrieve;
- every lexical sense has first encounter, meaning retrieval, form retrieval,
  phrase use, spoken use, cross-session, cross-lesson and delayed contacts;
- prerequisite graph is acyclic, reachable and contains no future edge;
- each functional B1 can-do has reception, production/interaction and transfer
  evidence;
- each required pronunciation target has perception and production evidence;
- all 1 792 packets are covered exactly once by every applicable matrix;
- matrix cells contain packet IDs, not free-form claims.

**Implementation**

Generate matrices from canonical packet/registry bytes, then manually review
every HOLD cell. Generator never invents missing contacts; it only exposes
them. Repair canonical packets/registries, never weaken the gate.

**Acceptance:** zero missing/duplicate coverage cells; independent verifier
recomputes the same results from a clean process.

---

## Task 9 — assemble canonical blueprint and candidate fingerprint

**Tests first**

Создать `tests/learning_v2_de_blueprint_fingerprint_gate.ts`:

- canonical serialization is stable across runs and filesystem order;
- one-byte source change changes candidate fingerprint;
- untracked/generated HTML cannot influence canonical fingerprint;
- research, registry, lesson, chapter, packet, graph and matrix digests are all
  included;
- approval registry rejects unknown/superseded fingerprints;
- English blueprint/fingerprint files remain byte-identical.

**Implementation**

Build `course_blueprint_de_v1.json` and candidate SHA-256. Create approval
receipt with `ownerApproval: PENDING`; do not place the fingerprint into the
approved set before an explicit owner statement naming the displayed digest.

**Acceptance:** clean-process rebuild yields identical bytes and fingerprint.

---

## Task 10 — build complete owner map for blueprint approval

**Tests first**

Создать `tests/learning_v2_de_owner_map_gate.ts`:

- owner map contains all 32 lessons, 224 chapters and 1 792 packets;
- displayed IDs, summaries and counts equal canonical source;
- map shows grammar progression, can-do, new/retrieval senses, pronunciation,
  prerequisites, review edges, prohibited leakage and coverage status;
- map displays pending owner decisions rather than silently resolving them;
- manifest fingerprint equals canonical blueprint fingerprint;
- generated paths are German-only and no English owner mock is read/written;
- stale map after any source-byte change is rejected.

**Implementation**

`scripts/learning-v2-de-build-owner-map.mjs` produces a deterministic,
read-only HTML projection and manifest under
`.codex-tmp/learning-v2-curriculum-owner-map-de/`. It contains filters and
cross-links but no independent curriculum facts.

**Acceptance:** fresh owner map is opened for inspection and candidate
fingerprint is shown verbatim. Until explicit approval, authoring remains
`HOLD`.

---

## Task 11 — record explicit owner fingerprint approval and freeze

**Tests first**

Создать `tests/learning_v2_de_blueprint_approval_gate.ts`:

- PENDING, missing, ambiguous or mismatched approval blocks authoring;
- approval names exact fingerprint and timestamp;
- any canonical blueprint change supersedes approval and returns status to
  `HOLD`;
- approval cannot be inferred from test PASS, a judge verdict or this plan.

**Implementation after explicit owner response only**

- Update `BLUEPRINT_OWNER_APPROVAL.md` and
  `blueprint_approval_registry_de_v1.ts` with the exact approved fingerprint.
- Freeze canonical bytes; any later change creates a new candidate fingerprint
  and requires new owner approval.

**Acceptance:** target-scoped German authoring preflight opens only
`de_l01_s01`; all later packets stay locked.

---

## Task 12 — make “mockup always exists” a release invariant

Этот task выполняется до первой learner-facing сессии и проверяет не blueprint
owner map, а будущий **per-session German owner mockup**.

**Tests first**

Создать `content/learning-v2-course/pipeline/de_owner_mockup_contract.test.mjs`
с отрицательными cases для:

- отсутствующего mockup при любом session type;
- learner-facing edit/re-release без rebuild;
- mockup, собранного только из RU или только из UK;
- stale RU/UK source digest;
- mockup другого session ID;
- English mockup path или English bytes;
- release receipt без mockup fingerprint;
- красивого HTML при failing content judge;
- source, release и mockup fingerprints, которые не совпадают;
- попытки открыть следующую session при stale/missing previous mockup.

**Implementation**

- German mockup builder принимает только exact final RU+UK German bytes,
  approved exact packet и current blueprint fingerprint.
- Для каждой сессии и каждого learner-facing изменения он в том же release
  step создаёт/пересобирает отдельный German owner mockup и manifest.
- Mockup receipt содержит session ID, RU digest, UK digest, release digest,
  blueprint fingerprint, packet fingerprint, generator version и mockup
  fingerprint.
- После content judges отдельный `judge_recenter` RELEASE_PROJECTION связывает
  exact POST receipt, release package, German owner mockup и новый UUID каждой
  попытки релиза. Он, owner-quality gate и target authoring preflight считают
  отсутствие, устаревание или mismatch безусловным `HOLD`.
- Старый HTML, screenshot или устное подтверждение не заменяет fresh build.
- Никакая ветка для checkpoint, voice, recall, review, hotfix или re-release не
  освобождается от mockup requirement.

**Acceptance:** fresh mockup exists **always** for the current released German
session state; next session cannot open otherwise.

---

## Task 13 — final blueprint verification and handoff to one-session authoring

Run narrow gates first, then acquire the shared heavy-process semaphore only if
a repository-wide command is genuinely required.

Required deterministic evidence:

```powershell
npx tsx tests/learning_v2_de_research_authority_gate.ts
npx tsx tests/learning_v2_de_owner_decisions_gate.ts
npx tsx tests/learning_v2_de_blueprint_schema_gate.ts
npx tsx tests/learning_v2_de_grammar_graph_gate.ts
npx tsx tests/learning_v2_de_lesson_boundaries_gate.ts
npx tsx tests/learning_v2_de_chapter_blueprints_gate.ts
npx tsx tests/learning_v2_de_lexical_registry_gate.ts
npx tsx tests/learning_v2_de_phrase_frame_gate.ts
npx tsx tests/learning_v2_de_pronunciation_registry_gate.ts
npx tsx tests/learning_v2_de_exact_packets_gate.ts
npx tsx tests/learning_v2_de_coverage_matrices_gate.ts
npx tsx tests/learning_v2_de_blueprint_fingerprint_gate.ts
npx tsx tests/learning_v2_de_owner_map_gate.ts
npx tsx tests/learning_v2_de_blueprint_approval_gate.ts
node --test content/learning-v2-course/pipeline/recenter_contract.test.mjs \
  content/learning-v2-course/pipeline/recenter_pack.test.mjs \
  content/learning-v2-course/pipeline/recenter_receipt.test.mjs \
  content/learning-v2-course/pipeline/de_owner_mockup_contract.test.mjs
npx tsx tests/learning_v2_target_policy_gate.ts
npx tsx tests/learning_v2_course_blueprint_contract_gate.ts
```

Fresh independent evidence:

1. linguistic review of complete German progression and examples;
2. spec-conformance review against every German requirement ID;
3. pedagogy review of prerequisite safety, support fading, retrieval and
   independent probes;
4. adversarial review for future grammar, lexical filler, repeated situations,
   RU/UK conflation, DACH mislabelling and English contamination;
5. `judge_recenter` proof that current instructions were reread from disk;
6. owner inspection of the full deterministic map and explicit approval of the
   exact candidate fingerprint.

Only after all six are PASS may the next plan write `de_l01_s01` in RU+UK.
That later plan must still process exactly one session at a time and must build
a fresh German owner mockup after every authored state or learner-facing edit.

---

## Definition of done

- Canonical German blueprint contains exactly `32 / 224 / 1 792` native German
  records with no English curriculum reuse.
- Every packet is prerequisite-safe, evidence-linked, lexical-growth-bearing
  and mapped to functional B1 exit evidence.
- RU and UK interference policies are independent; UK is not translated RU.
- All graphs and matrices close with no unproved gaps.
- Owner map is a fresh deterministic projection of exact canonical bytes.
- Candidate fingerprint is explicitly approved by the owner; no implicit
  approval is accepted.
- English contour remains byte-identical in all protected curriculum/release/
  authoring/mock paths.
- Learner-facing authoring remains `HOLD` until the approved fingerprint exists.
- After authoring begins, a fresh exact RU+UK German mockup exists for every
  session state and every learner-facing change; missing/stale mismatch blocks
  release and the next session.
