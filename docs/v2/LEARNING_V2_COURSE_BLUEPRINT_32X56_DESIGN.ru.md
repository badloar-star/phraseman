# Learning V2: канонический Course Blueprint 32 × 56

**Статус:** дизайн утверждён владельцем 2026-08-28; реализация blueprint ещё не является owner-approved curriculum content.  
**Область:** все target languages Learning V2, начиная с английского.  
**Topology:** 32 урока × 7 глав × 8 сессий = 1 792 сессии.  
**Главное решение:** learner-facing сессии нельзя писать, пока весь curriculum blueprint конкретного target language не исследован, заполнен, проверен и закреплён fingerprint.

---

## 1. Зачем нужен отдельный blueprint

Существующие документы уже фиксируют:

- 32 сценарных урока и их can-do outcomes;
- 56 сессий в каждом уроке;
- семь глав по восемь сессий;
- один ограниченный grammar/can-do boundary на урок;
- необходимость 224 chapter outcomes и 1 792 session packets.

Но подробная карта существует только локально для первого урока. Это оставляет
автору право придумывать grammar focus, lexicon, prerequisites и повторение во
время написания очередной сессии. Из-за этого уже возникали повторное введение
одной конструкции, скрытая грамматика будущих уроков и практика, не связанная с
интро.

Course Blueprint устраняет эту неопределённость. После его утверждения автор
сессии не выбирает, чему учить. Он только пишет качественный learner-facing
материал для заранее утверждённого session packet.

---

## 2. Источники и доказательные границы

### 2.1 Обязательные внешние источники

1. [CEFR Companion Volume и searchable descriptors](https://www.coe.int/en/web/common-european-framework-reference-languages/cefr-descriptors) — action-oriented can-do outcomes, communicative activities, interaction, production, reception, mediation и стратегии.
2. [English Profile](https://englishprofile.org/?menu=english-vocabulary-profile) — языкоспецифичная проверка английской грамматики, слов, значений и употреблений по CEFR.
3. [Cambridge guided learning hours](https://support.cambridgeenglish.org/hc/en-gb/articles/202838506-Guided-learning-hours) — только ориентир нагрузки, не доказательство уровня.
4. [Cepeda et al., 2006](https://pubmed.ncbi.nlm.nih.gov/16719566/) — distributed practice и зависимость интервала от retention target.
5. [Karpicke & Roediger, 2008](https://doi.org/10.1126/science.1152408) — retrieval как механизм delayed retention.
6. [Butler & Roediger, 2008](https://doi.org/10.3758/MC.36.3.604) — corrective feedback после multiple-choice distractors.
7. [Hwang, 2025](https://doi.org/10.1111/lang.12659) — риск слишком раннего interleaving для начинающих; сначала требуется достаточное blocked grounding.

### 2.2 Что источники не разрешают утверждать

- CEFR не задаёт единственную правильную последовательность грамматики.
- Число уроков, сессий или часов не доказывает CEFR level.
- Немедленный правильный ответ не доказывает delayed retention.
- Узнавание варианта не доказывает способность говорить.
- Универсальный интервал повторения не считается научно установленным для всех
  learner profiles и всех языковых единиц.

### 2.3 Текущая граница английского курса

Исходная точка — настоящий `PRE_A1 / A0`. Целевая продуктовая граница — сильные
функциональные задачи A1 и выбранные задачи начала A2. Курс не обещает
сертификацию A2. Текущие 209 целевых часов topology сопоставимы с приблизительным
ориентиром Cambridge для A2, но являются только `PRODUCT_HYPOTHESIS`, пока
Phraseman не провёл external benchmarking и delayed pilot.

Legacy-подписи A1/A2/B1/B2 и старый manifest `PRE_A1 → C2` не являются
curriculum authority нового blueprint. Источник тем — 32 scenario-based lessons
из `03-learning-architecture-and-curriculum.md`; grammar boundary каждой темы
повторно проверяется по исследовательскому досье.

---

## 3. Иерархия curriculum authority

```text
Target Language Research Dossier
└── Course Blueprint (32 lessons)
    └── Lesson Blueprint (7 chapters / 56 sessions)
        └── Chapter Blueprint (8 sessions)
            └── Session Packet
                └── learner-facing authored session
```

Нижний уровень не имеет права расширять верхний:

- activity не добавляет grammar, которой нет в session packet;
- session packet не добавляет construct, которого нет в chapter blueprint;
- chapter не расширяет lesson grammar boundary;
- lesson не использует construct до завершения его prerequisite lesson/session;
- перевод не меняет target-language curriculum logic.

---

## 4. Target Language Research Dossier

До проектирования первого урока нового target language создаётся immutable
research dossier со следующими разделами:

1. `targetLanguage`, varieties и выбранная нормативная форма;
2. entry и exit functional bands;
3. письменность, направление, tokenization и обязательный script curriculum;
4. фонемы, stress/tone, connected speech и TTS/STT capabilities;
5. morphology, dominant word orders, agreement и grammatical categories;
6. register, politeness, pronoun/address system и pragmatic risks;
7. language-specific CEFR/RLD или эквивалентные reference sources;
8. corpus/frequency и dictionary sources для лексики;
9. reference sources для natural examples и definitions;
10. source-locale interference profiles для `ru`, `uk`, `es`, `pt-BR`, `vi`,
    `id`, `tr`, `pl`;
11. unsupported или unsafe activity families;
12. evidence ledger: claim, source, confidence, limitation;
13. owner decision, independent linguistic review и dossier fingerprint.

Английский blueprint нельзя автоматически переносить на испанский, французский
или другой язык. Общими остаются topology, evidence states и quality contracts;
grammar sequence, vocabulary, sound focus и pragmatics проектируются заново.

---

## 5. Course Blueprint

Course Blueprint содержит ровно 32 lesson blueprints и следующие общие реестры:

- `grammarConstructRegistry`;
- `lexicalSenseRegistry`;
- `communicativeOutcomeRegistry`;
- `pronunciationTargetRegistry`;
- `prerequisiteDag`;
- `reviewEdgeRegistry`;
- `assessmentProbeRegistry`;
- `prohibitedLeakageRegistry`;
- `sourceEvidenceLedger`;
- `coverageMatrix`;
- `blueprintFingerprint`.

Каждый grammar construct имеет:

- стабильный `constructId`;
- точное form/function описание;
- receptive и productive scope;
- prerequisite construct IDs;
- first-introduction session;
- guided, retrieval, production, transfer и delayed-review sessions;
- explicitly excluded meanings/forms;
- CEFR/English Profile evidence refs;
- status `OFFICIAL_STANDARD`, `PRIMARY_EVIDENCE`, `SYNTHESIS` или
  `PRODUCT_HYPOTHESIS`.

Один construct может развиваться позднее, но каждое новое значение или новая
порождающая операция получает отдельный construct ID и отдельную teaching
session. Нельзя считать «слово уже встречалось» объяснением новой грамматики.

---

## 6. Lesson Blueprint

Каждый из 32 уроков обязан иметь:

- неизменный `lessonId` и ordinal;
- scenario title и primary communicative can-do;
- одну ограниченную grammar boundary;
- список introduced, extended, reviewed и prohibited constructs;
- prerequisites из предыдущих уроков;
- семь chapter outcomes;
- lexical domains и sense-level targets;
- pronunciation/sound-focus profile;
- planned cross-lesson recall edges;
- lesson final transfer в сессии 56;
- independent evidence requirements;
- accessibility alternatives;
- source refs, review receipt и fingerprint.

Grammar boundary — не список всех форм, которые можно вставить в примеры. Она
точно определяет, какие формы ученик учится порождать, какие только узнаёт как
fixed chunks и какие запрещены до будущих уроков.

---

## 7. Chapter Blueprint

Урок содержит семь глав. Каждая глава — одна микропрогрессия внутри lesson
boundary, а не случайная подборка режимов.

Каждая глава задаёт:

- `chapterCanDoStep`;
- primary grammar operation или explicit review set;
- lexical sense set;
- prerequisite objective states;
- support-fading trajectory;
- eight session packet IDs;
- chapter checkpoint evidence;
- recall edges из предыдущих глав;
- будущий delayed probe.

Восьмая сессия главы всегда checkpoint и не вводит новую grammar operation.
Она обычно работает как lexical retrieval/transfer; новое слово допустимо
только если оно не влияет на scored mastery probe и действительно нужно
сценарию, а не добавлено ради квоты.

---

## 8. Session Packet

Каждая из 1 792 сессий существует в blueprint как отдельная immutable запись.

```ts
type LearningV2CurriculumSessionPacketV1 = Readonly<{
  sessionId: string;
  lessonOrdinal: number;
  chapterOrdinal: number;
  sessionOrdinal: number;
  role:
    | "introduce_grammar"
    | "extend_grammar"
    | "guided_application"
    | "retrieval"
    | "variation"
    | "near_transfer_repair"
    | "voice"
    | "checkpoint"
    | "final_exam";
  primaryCanDoStep: string;
  grammarOperationId: string | null;
  reviewConstructIds: readonly string[];
  learningDelta: readonly (
    | "support_fade"
    | "delayed_retrieval"
    | "changed_context"
    | "contrast_discrimination"
    | "productive_shift"
    | "targeted_error_repair"
    | "transfer"
  )[];
  prerequisiteObjectiveIds: readonly string[];
  newLexicalSenseIds: readonly string[];
  retrievalLexicalSenseIds: readonly string[];
  lexicalPlanRole: "introduce_and_retrieve" | "retrieval_only";
  lexicalReviewOnlyReason: string | null;
  phraseFrameIds: readonly string[];
  canonicalEnglishExamples: readonly [string, string, ...string[]];
  allowedLexicalSlotSenseIds: readonly string[];
  forbiddenSurfaceFormIds: readonly string[];
  prohibitedConstructIds: readonly string[];
  sessionKind: string;
  learningFunctions: readonly string[];
  requiredModeFamilies: readonly string[];
  supportStart: "maximum" | "high" | "medium" | "low" | "minimal";
  supportEnd: "high" | "medium" | "low" | "minimal" | "none";
  independentProbeId: string;
  delayedProbeIds: readonly string[];
  reviewSourceSessionIds: readonly string[];
  sourceEvidenceRefs: readonly string[];
}>;
```

`canonicalEnglishExamples` содержит от двух до четырёх коротких эталонных
английских фраз. Tuple задаёт минимум две; validation gate ограничивает максимум
четырьмя.

### 8.1 Grammar rule

Сессия имеет ровно одно из двух состояний:

1. `grammarOperationId != null` — вводится или расширяется одна новая операция;
2. `grammarOperationId == null` и `reviewConstructIds.length > 0` — явно
   отрабатываются уже объяснённые операции.

Сессия без grammar focus и без review set запрещена. Две независимые новые
grammar operations в одной сессии запрещены.

### 8.2 Intro-to-practice rule

Для teaching session:

```text
intro grammarFeatureId
= sessionPacket.grammarOperationId
= practice operation target
= independent probe construct
```

Для review session каждая intro page и каждая practice family ссылается только
на `reviewConstructIds`. Лексическая тема не может заменить grammar focus.

Review session не имеет права повторять прежнее упражнение ради заполнения
карты. Она обязана иметь минимум один `learningDelta`: снизить поддержку,
проверить после задержки, изменить контекст, потребовать различения близких
форм, перевести recognition в production, исправить зарегистрированную ошибку
или проверить перенос. Идентичный prompt не может быть одновременно training и
independent/delayed evidence.

### 8.3 Lexicon rule

- лексика учитывается на уровне значения, а не только spelling;
- каждый packet явно выбирает `introduce_and_retrieve` либо `retrieval_only`;
- teaching/application sessions по умолчанию вводят полезные новые senses и
  одновременно повторяют более ранние;
- `retrieval_only` допустим для checkpoint, voice, delayed retrieval, targeted
  repair или сложного transfer, но требует конкретной причины и sense IDs;
- новое значение имеет одну first-introduction session;
- до phrase use оно получает word-first grounding;
- каждое важное значение имеет recognition, retrieval, productive и delayed
  contacts;
- одинаковое написание с новым значением считается новым lexical sense, но не
  новым словом без пояснения;
- точная numeric quota новых слов является product hypothesis и калибруется
  пилотом; механическая квота на каждую сессию запрещена;
- новое слово обязано обслуживать can-do, grammar focus или утверждённый
  transfer edge; filler ради counts запрещён;
- blueprint обязан показывать регулярный lexical growth по каждой главе и
  последующее закрепление новых senses в других sessions/lessons.

### 8.4 Mode rule

Режим назначается по учебной операции. Универсальный фиксированный цикл режимов
запрещён. Каждый mode в сессии обязан иметь mapping к primary can-do и текущему
grammar/review focus. Режим, который отрабатывает только постороннюю лексику,
считается curriculum drift.

### 8.5 Phrase planning boundary

До learner-facing authoring каждый exact packet обязан зафиксировать:

- `phraseFrameIds` — разрешённые синтаксико-коммуникативные рамки;
- `canonicalEnglishExamples` — 2–4 естественные эталонные фразы;
- `allowedLexicalSlotSenseIds` — разрешённые senses для slots;
- `forbiddenSurfaceFormIds` — формы, которые нельзя случайно вывести;
- машинная проверка этих ID получает отдельный неизменяемый справочник
  `forbiddenSurfaceFormsById: ID → literal surface forms`; сравнивать сам ID с
  текстом примера или молча пропускать неизвестный ID запрещено;
- mapping каждой frame/example к primary can-do и grammar/review focus.

Эти примеры проверяют смысл packet и направляют будущий authoring. Они не
являются готовым банком упражнений и не копируются механически во все modes.

На этапе полного blueprint запрещено пакетно генерировать финальные
learner-facing prompts, полный practice bank, distractors, response-specific
feedback, восемь locale-native версий, карточечные определения и audio scripts.
Этот материал пишется последовательно во время authoring одной exact session
после обязательного recenter. Blueprint заранее снимает педагогические решения,
но не заменяет ручную редактуру десятками тысяч автоматических строк.

---

## 9. Coverage matrices

До learner-facing authoring должны быть построены и пройти проверку четыре
матрицы.

### 9.1 Grammar coverage

Для каждого construct:

```text
explain → discriminate → guided retrieve → independent produce
→ changed-context transfer → delayed retrieve
```

Отсутствие любой обязательной стадии создаёт HOLD.

### 9.2 Lexical ledger

Для каждого lexical sense:

- first encounter;
- first meaning retrieval;
- first form retrieval;
- first phrase use;
- first spoken use;
- cross-session retrieval;
- cross-lesson retrieval;
- delayed probe.

### 9.3 Prerequisite DAG

DAG проверяет:

- отсутствие циклов;
- отсутствие ссылки в будущее;
- наличие объяснения до application;
- отсутствие hidden prerequisite;
- достижимость каждого lesson/session outcome от PRE_A1 entry state.

### 9.4 Can-do coverage

Каждая interaction family, session, chapter и lesson обязана вести к одному из
утверждённых can-do components. Orphan activity запрещена.

---

## 10. Authoring workflow

```text
1. target-language research dossier PASS
2. 32 lesson blueprints owner-approved
3. prerequisite DAG PASS
4. 224 chapter blueprints owner-approved
5. 1 792 session packets PASS
6. grammar/lexicon/can-do coverage PASS
7. owner HTML curriculum-map review
8. blueprint fingerprint LOCKED
9. authoring preflight for exactly one current session
10. learner-facing session writing
11. content gates + owner mock + owner approval
12. full `AFTER_EVERY_SESSION_RECENTER` reread + fresh owner-map fingerprint
13. next session unlock
```

Будущие session packets содержат curriculum metadata, но не автоматически
сгенерированные learner-facing интро, фразы, distractors или feedback.

Тот же recenter обязателен во время planning: после каждого готового packet
исполнитель перечитывает маршрут, сверяет exact next packet и обновляет owner
map. Пакетная запись нескольких sessions без промежуточного recenter запрещена.

Существующие английские сессии 1–3 не удаляются автоматически. После
утверждения blueprint они проходят conformance audit. Сессия сохраняется, если
её grammar, lexicon, practice и evidence совпадают с packet; иначе возвращается
на owner review. Сессия 4 и последующие не продолжаются до blueprint lock.

---

## 11. Owner HTML curriculum map

Owner map показывает:

1. все 32 урока;
2. внутри урока — семь глав;
3. внутри главы — восемь session packets;
4. для каждой сессии — role, can-do, grammar operation/review set, new lexicon,
   prerequisites, recalls, phrase frames, 2–4 canonical examples, modes,
   evidence и prohibited future material;
5. фильтры `new grammar`, `review`, `voice`, `checkpoint`, `delayed probe`;
6. curriculum findings и fingerprint;
7. статус `RESEARCH`, `DRAFT`, `REVIEWED`, `LOCKED`, `AUTHORED`;
8. ссылки grammar construct → все его будущие contacts;
9. ссылки lexical sense → first encounter и все retrieval contacts.

Карта строится только из canonical blueprint. Ручной HTML, который расходится
с данными, запрещён. После любого изменения blueprint owner map обязательно
пересобирается; freshness gate сравнивает fingerprint и время сборки.

---

## 12. Обязательный маршрут чтения

`СТАРТ В2.md` должен направлять автора в таком порядке:

1. общие V2 boundaries;
2. target-language research dossier;
3. current Course Blueprint revision;
4. exact Lesson Blueprint;
5. exact Chapter Blueprint;
6. exact Session Packet;
7. text/style/mode/distractor contracts;
8. authoring preflight.

Без подтверждения exact packet ID и blueprint fingerprint authoring command
завершается HOLD.

Для нового target language отдельный `СТАРТ <LANG>.md` сначала требует research
dossier и собственный curriculum blueprint. Наличие английского blueprint не
удовлетворяет этот gate.

---

## 13. Машинные гейты

Минимальный обязательный набор:

1. `research_dossier_required`;
2. `course_blueprint_exact_32_lessons`;
3. `chapter_blueprint_exact_7_per_lesson`;
4. `session_packet_exact_56_per_lesson`;
5. `course_packet_exact_1792`;
6. `prerequisite_dag_acyclic`;
7. `prerequisite_no_future_reference`;
8. `grammar_operation_one_or_review_required`;
9. `new_grammar_requires_full_session`;
10. `grammar_used_before_explained`;
11. `intro_practice_probe_alignment`;
12. `lesson_grammar_boundary_no_leakage`;
13. `lexical_sense_first_introduction_unique`;
14. `word_first_before_phrase_use`;
15. `lexical_plan_role_required`;
16. `lexical_progress_or_review_reason_required`;
17. `new_lexical_sense_serves_can_do`;
18. `new_lexical_sense_has_retrieval_edges`;
19. `retrieval_only_has_exact_senses_and_reason`;
20. `review_learning_delta_required`;
21. `review_no_identical_prompt_as_evidence`;
22. `phrase_frames_required`;
23. `canonical_examples_count_2_to_4`;
24. `canonical_examples_natural_and_unique`;
25. `canonical_examples_no_future_construct`;
26. `canonical_examples_only_allowed_lexical_senses`;
27. `blueprint_no_bulk_learner_facing_bank`;
28. `grammar_coverage_no_missing_stage`;
29. `lexical_ledger_no_forgotten_core_target`;
30. `can_do_no_orphan_activity`;
31. `delayed_probe_distinct_from_training`;
32. `source_evidence_reference_required`;
33. `owner_map_fingerprint_fresh`;
34. `authoring_source_matches_exact_packet`;
35. `target_language_blueprint_not_english_copy`;
36. `existing_authored_session_conformance`.

Гейт проверяет данные, а не слова в документации. Ослаблять гейт ради зелёного
CI запрещено.

---

## 14. Файловая архитектура

```text
docs/v2/curriculum/
  START_CURRICULUM_BLUEPRINT.ru.md
  en/
    RESEARCH_DOSSIER.ru.md
    COURSE_OVERVIEW_32_LESSONS.ru.md
    SOURCE_EVIDENCE_LEDGER.md

modules/learning-v2/curriculum/
  contracts/course_blueprint_v1.ts
  validation/course_blueprint_validation_v1.ts
  en/course_blueprint_en_v1.ts
  en/lessons/lesson_01_blueprint_v1.ts
  ...
  en/lessons/lesson_32_blueprint_v1.ts
  en/session_packets_en_v1.ts
  en/coverage_en_v1.ts

scripts/
  learning_v2_curriculum_blueprint_gate.ts
  build_learning_v2_curriculum_owner_map.ts

tests/
  learning_v2_curriculum_blueprint_contract_gate.ts
  learning_v2_curriculum_grammar_coverage_gate.ts
  learning_v2_curriculum_lexical_ledger_gate.ts
  learning_v2_curriculum_owner_map_freshness_gate.ts

.codex-tmp/learning-v2-curriculum-owner-map/
  index.html
```

Каждый lesson file содержит семь chapter definitions. 1 792 session packets
создаются детерминированным compiler из полностью заполненных human-reviewed
lesson definitions и сохраняются как inspectable generated artifact с
fingerprint. Compiler не придумывает grammar, lexicon или can-do; он только
нормализует и проверяет заранее записанные решения.

---

## 15. Acceptance criteria

Blueprint считается готовым к возобновлению learner-facing authoring, когда:

- существует проверенное research dossier английского;
- утверждены все 32 lesson boundaries;
- утверждены все 224 chapter outcomes;
- материализованы все 1 792 session packets;
- ни один packet не имеет пустого grammar operation/review set;
- prerequisite DAG не содержит циклов, future refs или hidden prerequisites;
- grammar coverage не имеет orphan или forgotten constructs;
- lexical ledger не имеет повторного first introduction;
- каждый packet имеет lexical progress или валидный retrieval-only reason;
- lexical growth распределён по курсу, а новые senses имеют будущие retrieval
  edges;
- каждая review session имеет измеримый learning delta;
- каждый packet содержит phrase frames и 2–4 canonical English examples, но не
  массово сгенерированный learner-facing банк;
- каждая session practice связана с intro focus;
- owner HTML показывает все 32 × 56 и совпадает с blueprint fingerprint;
- `СТАРТ В2` и target-language start route требуют exact packet до authoring;
- existing sessions 1–3 имеют conformance report;
- владелец вручную подтверждает blueprint revision.

До выполнения этих критериев authoring сессии 4 и следующих остаётся HOLD.

---

## Находки и предложения

1. Existing 32-lesson scenario map — хорошая communicative оболочка, но не
   заменяет grammar/lexicon prerequisite graph.
2. Полностью плоский hand-authored файл на 1 792 строки затруднит review. Лучше
   хранить 32 human-authored lesson blueprints и детерминированно
   материализовывать inspectable packets без генерации педагогических решений.
3. Topology даёт около 209 часов. Это позволяет проектировать глубокую практику,
   но не разрешает автоматически обещать A2.
4. Current lesson 1 map необходимо считать временной локальной картой до
   conformance audit against course blueprint.
5. Новый target language должен начинаться не с перевода английских сессий, а с
   собственного research dossier и curriculum graph.
