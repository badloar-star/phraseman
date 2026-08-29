# Learning V2 — один стартовый промпт для нового языкового курса

> **Статус:** `NORMATIVE`.  
> **Решение владельца:** 2026-08-28.  
> **Назначение:** новый target-language курс Learning V2 должен запускаться
> одним промптoм, после которого исполнитель самостоятельно проходит весь
> обязательный curriculum pipeline до owner-review полного blueprint.

Этот документ не заменяет Библии и contracts. Он является единственной
входной командой, которая заставляет исполнителя найти, полностью прочитать и
применить их в правильном порядке. Промпт нельзя сокращать, пересказывать по
памяти или заменять фразой «сделай как английский».

## 1. Что владелец заполняет перед запуском

Заполнить только значения в угловых скобках:

| Переменная | Что указать | Пример |
|---|---|---|
| `<TARGET_LANGUAGE>` | язык курса по-русски | `испанский` |
| `<TARGET_LANGUAGE_EN>` | английское название | `Spanish` |
| `<TARGET_CODE>` | стабильный BCP-47/проектный код | `es` |
| `<TARGET_VARIETY>` | нормативная разновидность | `neutral international Spanish` |
| `<SCRIPT_AND_DIRECTION>` | письмо и направление | `Latin, LTR` |
| `<ENTRY_BOUNDARY>` | честная входная граница | `PRE_A1 / zero beginner` |
| `<EXIT_BOUNDARY>` | продуктовая выходная гипотеза | `strong functional A1 + selected early A2 tasks` |
| `<OWNER_NOTES>` | дополнительные прямые решения | `нет` |

Если владелец не указал разновидность, исполнитель обязан исследовать варианты,
предложить одну нормативную разновидность и поставить `HOLD` до её утверждения.
Нельзя молча смешивать национальные нормы, алфавиты, регистры или системы
вежливости.

## 2. Канонический промпт — копировать целиком

```text
Ты продолжаешь работу в репозитории Phraseman и создаёшь новый независимый
Learning V2 курс.

TARGET LANGUAGE INPUT
- target language: <TARGET_LANGUAGE>
- English name: <TARGET_LANGUAGE_EN>
- stable target code: <TARGET_CODE>
- normative variety: <TARGET_VARIETY>
- script/direction: <SCRIPT_AND_DIRECTION>
- entry boundary: <ENTRY_BOUNDARY>
- exit product hypothesis: <EXIT_BOUNDARY>
- mandatory interface locales: ru, uk, es, pt-BR, vi, id, tr, pl
- owner notes: <OWNER_NOTES>

PRIMARY OBJECTIVE
Создай полностью исследованный, проверяемый и owner-reviewable curriculum
blueprint этого языка: ровно 32 scenario lessons, 224 chapter outcomes и
1 792 exact session packets. После одного этого промпта самостоятельно доведи
planning pipeline до свежего полного owner HTML/PDF, machine gates и candidate
fingerprint. Затем остановись на OWNER APPROVAL PENDING. Не начинай массово
писать learner-facing sessions, prompts, distractors, feedback, definitions,
localizations или audio до явного approval fingerprint владельцем.

AUTHORITY AND RECENTER
1. Работай только из корня checkout, содержащего AGENTS.md.
2. До любого изменения полностью прочитай, а не перескажи:
   - AGENTS.md;
   - docs/v2/СТАРТ В2.md;
   - docs/v2/curriculum/START_CURRICULUM_BLUEPRINT.ru.md;
   - docs/v2/curriculum/ONE_PROMPT_NEW_LANGUAGE_COURSE_START.ru.md;
   - docs/v2/LEARNING_V2_COURSE_BLUEPRINT_32X56_DESIGN.ru.md;
   - docs/v2/MODE_NATIVE_AUTHORING_CONTRACT.ru.md;
   - docs/v2/БИБЛИЯ_ТЕКСТОВ_LEARNING_V2.ru.md;
   - docs/v2/LEARNING_CONTENT_STYLE_BIBLE.ru.md;
   - docs/v2/LESSON_DESIGN_RULES.ru.md;
   - docs/v2/LEARNING_V2_1792_SESSION_PEDAGOGICAL_ORCHESTRATION.ru.md;
   - docs/v2/03-learning-architecture-and-curriculum.md;
   - docs/v2/04-activity-catalog-and-storyboards.md;
   - docs/v2/curriculum/AFTER_EVERY_SESSION_RECENTER.ru.md.
3. Найди существующий `СТАРТ <TARGET_CODE>` и target-language artifacts. Если
   их нет, создай их только после research. Если есть — прочитай полностью и
   продолжай с первого незавершённого canonical этапа, не перезаписывая
   утверждённое и не полагаясь на чат.
4. Запиши recenter receipt: прочитанные документы, текущий stage, точный scope,
   non-goals, blockers и ближайший артефакт. Вердикт только ON TRACK или HOLD.
5. При конфликте действует более новое прямое owner decision. Не придумывай
   компромисс: зафиксируй конфликт и HOLD.

NON-NEGOTIABLE BOUNDARIES
- Топология неизменна: 32 lessons × 7 chapters × 8 sessions = 1 792 packets.
- Новый язык нельзя переводить или клонировать из английского. Общими остаются
  topology, evidence states и quality contracts; grammar order, lexicon,
  pronunciation, writing system, pragmatics и transfer analysis исследуются
  заново.
- Одна session вводит ровно одну новую микрограмматическую operation либо
  явно отрабатывает непустой набор уже объяснённых operation IDs.
- Новая grammar operation никогда не появляется побочно в словарной, voice,
  checkpoint или review session. Первое появление получает собственную полную
  session и объяснение до practice.
- Никакая форма не используется до выполнения всех prerequisite operations.
- Каждая teaching/application session имеет явный lexical plan. Полезные новые
  lexical senses вводятся регулярно, но механическая квота запрещена.
  Retrieval-only допустим только с точной причиной и точными ранее введёнными
  sense IDs.
- Каждое важное lexical sense имеет одно first-introduction место и будущие
  retrieval edges: later-session, later-lesson и delayed probe.
- Review без измеримого learningDelta запрещён. Идентичный prompt/ответ с той
  же поддержкой не считается новой практикой.
- Сборка по буквам запрещена. Builders используют только целые слова или
  утверждённые цельные chunks. Однобуквенные элементы допустимы только если
  сами являются самостоятельными словами target language.
- Финальные learner-facing тексты пишутся вручную для одной exact session,
  последовательно и отдельно для всех восьми interface locales. Машинный
  перевод, общий locale fallback и массовая генерация будущих sessions
  запрещены.
- Project/user OpenAI API keys нельзя использовать для research, planning,
  writing, judging, translation или generation. Разрешены встроенные средства
  Codex и обычный web research по первичным источникам. TTS — отдельный этап
  только по прямому разрешению владельца и действующему spend guard.
- Не ослабляй gates ради PASS. Не меняй несвязанные функции и не откатывай
  чужие изменения в dirty worktree.

STAGE 0 — TASK PACKET AND DIRECTORY CONTRACT
До research создай bounded task packet со следующими полями:
- target language/code/variety/script;
- entry and exit boundaries;
- 8 interface locales;
- exact authorized scope: curriculum planning only;
- non-goals: learner-facing mass authoring, TTS, deploy, publish, release;
- expected artifacts and paths;
- evidence standard;
- acceptance gates;
- unresolved owner decisions.

Используй стабильные пути:
- docs/v2/СТАРТ <TARGET_CODE>.md;
- docs/v2/curriculum/<TARGET_CODE>/RESEARCH_DOSSIER.ru.md;
- docs/v2/curriculum/<TARGET_CODE>/SOURCE_EVIDENCE_LEDGER.md;
- docs/v2/curriculum/<TARGET_CODE>/COURSE_OVERVIEW_32_LESSONS.ru.md;
- docs/v2/curriculum/<TARGET_CODE>/FULL_COURSE_BLUEPRINT_OWNER_REVIEW_<DATE>.md;
- modules/learning-v2/curriculum/<TARGET_CODE>/...;
- .codex-tmp/learning-v2-curriculum-owner-map-<TARGET_CODE>/index.html.

STAGE 1 — RESEARCH DOSSIER
Проведи свежий source-backed research, приоритет — первичные/официальные
источники. Для каждого утверждения запиши source ID, URL/библиографию, claim,
что источник реально доказывает, чего он не доказывает, confidence и product
decision, который ещё требует owner approval.

Research dossier обязан отдельно покрыть:
1. нормативную разновидность и допустимые региональные варианты;
2. entry/exit functional boundary без обещания сертификата;
3. письменность, направление, segmentation/tokenization, capitalization,
   punctuation, diacritics и необходимость отдельного script curriculum;
4. звуковую систему, stress/tone, connected speech, beginner intelligibility;
5. morphology, agreement, grammatical categories и dominant word orders;
6. pronouns/address, register, politeness и прагматические риски;
7. полный structural inventory внутри 32-scenario scope;
8. corpus/frequency and dictionary sources для lexical sense registry;
9. источники естественных примеров и точных beginner-safe definitions;
10. TTS/STT/ASR возможности и ограничения, включая offline/accessibility;
11. отдельный L1-transfer profile для ru, uk, es, pt-BR, vi, id, tr, pl;
12. какие activity families небезопасны или требуют адаптации для языка;
13. uncertainty ledger и decisions, которые нельзя угадывать.

Создай SOURCE_EVIDENCE_LEDGER с типами PRIMARY_STANDARD,
PRIMARY_LANGUAGE_PROFILE, PRIMARY_RESEARCH, OWNER_CONTRACT и
PRODUCT_HYPOTHESIS. Dossier получает PASS только после focused gate и
independent linguistic review; иначе HOLD.

STAGE 2 — COURSE SCOPE AND 32 LESSON BOUNDARIES
Сохрани 32 communicative scenario identities Phraseman, но адаптируй can-do,
grammar boundary, lexical domains и pragmatics под target language.
Для каждого lesson 01–32 запиши:
- stable lesson ID, ordinal, title and scenario;
- primary observable can-do;
- entry prerequisites;
- introduced/extended/reviewed constructs;
- hard grammar boundary;
- prohibited future constructs;
- lexical domains and sense-level goals;
- pronunciation/script focus;
- cross-lesson retrieval responsibilities;
- lesson-final independent transfer at session 56;
- accessibility alternative;
- evidence refs and uncertainty status.

Lesson boundary не является списком всего, что можно вставить в примеры.
Каждая новая порождающая операция далее получает собственный session packet.
Проверь отсутствие дубликатов, скачков уровня, скрытых prerequisites и
непокрытых 32 scenario outcomes. Пересобери owner overview.

STAGE 3 — REGISTRIES
Создай стабильные inspectable registries:
A. grammar operation registry: operation ID, form, function, receptive/
   productive scope, prerequisites, contrasts, prohibited extensions, evidence;
B. lexical sense registry: sense ID, lemma/surface, exact meaning, POS/function,
   frequency/usefulness evidence, first-introduction candidate, definition
   source, locale risks;
C. communicative outcome registry;
D. pronunciation/script target registry;
E. prohibited leakage registry;
F. assessment probe registry.

Не объединяй разные значения одного spelling в один lexical ID. Не считай
contraction, auxiliary, article, negation, question, new subject, politeness or
register «мелочью»: если learner должен сам породить новую операцию, она имеет
отдельный ID.

STAGE 4 — PREREQUISITE DAG AND RETRIEVAL GRAPH
Материализуй directed acyclic graph. Каждая edge называет конкретную earlier
operation и объясняет, зачем она нужна. Запрети cycles, future refs, hidden
prerequisites и недостижимые outcomes от PRE_A1 entry state.

Отдельно создай lexical retrieval graph. Для каждого core sense запланируй:
meaning recognition → form retrieval → controlled phrase use → spoken/
constructed production → later-session retrieval → later-lesson retrieval →
delayed probe. Интервалы маркируй как product hypothesis до telemetry.

STAGE 5 — 224 CHAPTER OUTCOMES
Для каждого из 32 lessons создай ровно 7 chapters. Для каждой chapter запиши:
- stable chapter ID and ordinal;
- один primary can-do step;
- primary grammar operation либо explicit review set;
- lexical sense set and retrieval obligations;
- prerequisite objective states;
- supportStart/supportEnd trajectory;
- eight exact session IDs;
- chapter checkpoint evidence;
- prior recall edges and future delayed probe;
- source refs and prohibited leakage.

Chapter не является случайной каруселью modes. Она образует progression
encounter → notice → build → speak → transfer → review. Checkpoint сохраняет
independent evidence и не прячет необъяснённый material внутри score.

STAGE 6 — 1 792 EXACT SESSION PACKETS
Материализуй ровно 56 packets на lesson и 8 на chapter. Каждый packet обязан
содержать без незаполненных заглушек и неопределённых полей:
- sessionId, lesson/chapter/session ordinals;
- role: introduce_grammar, extend_grammar, guided_application, retrieval,
  variation, near_transfer_repair, voice, checkpoint или final_exam;
- primaryCanDoStep;
- ровно один grammarOperationId ИЛИ непустой reviewConstructIds;
- measurable learningDelta;
- prerequisiteObjectiveIds;
- newLexicalSenseIds and retrievalLexicalSenseIds;
- lexicalPlanRole: introduce_and_retrieve или retrieval_only;
- для retrieval_only — конкретный lexicalReviewOnlyReason;
- phraseFrameIds;
- 2–4 коротких естественных canonical target-language examples;
- allowedLexicalSlotSenseIds;
- forbiddenSurfaceFormIds and prohibitedConstructIds;
- sessionKind and learningFunctions;
- requiredModeFamilies, выбранные по учебной операции, не по фиксированной
  карусели;
- supportStart/supportEnd;
- independentProbeId and delayedProbeIds;
- reviewSourceSessionIds;
- sourceEvidenceRefs.

Canonical examples показывают intent и границу packet. Они не являются готовым
exercise bank. На этом этапе не пиши полные prompts, полный practice, options,
distractors, feedback, definitions, audio scripts или восемь локализаций.

STAGE 7 — COVERAGE MATRICES
Построй и проверь минимум:
1. grammar coverage: explain → discriminate → guided retrieve → independent
   produce → changed-context transfer → delayed retrieve;
2. lexical coverage: first encounter, meaning/form retrieval, phrase use,
   spoken use, cross-session, cross-lesson and delayed probe;
3. prerequisite reachability and no-future-reference matrix;
4. can-do coverage: packet/chapter/lesson/mode → observable outcome;
5. pronunciation/script coverage where applicable;
6. eight-locale transfer-risk coverage.

Orphan construct, orphan activity, forgotten lexical sense, missing delayed
probe, duplicated first-introduction или identical review даёт HOLD.

STAGE 8 — MACHINE GATES
Создай RED tests до исправления измеримого класса ошибки. Gates обязаны
проверять canonical data, а не слова в документации. Минимум:
- exact 32 lessons / 224 chapters / 1 792 packets;
- one grammar operation or explicit review per packet;
- DAG acyclic, no future reference, no hidden prerequisite;
- intro/practice/probe alignment contract;
- unique lexical first-introduction and valid retrieval edges;
- lexical progress or exact retrieval-only reason;
- review learningDelta and no duplicated evidence prompt;
- 2–4 examples, natural/unique/within boundary;
- no bulk learner-facing bank at blueprint stage;
- no letter-level assembly;
- active mode set only; retired modes forbidden;
- coverage matrices have no gaps;
- owner map fingerprint freshness;
- target-language blueprint is not an English copy.

Запускай только узкие проверки. Перед тяжёлой командой используй общий
repository semaphore из AGENTS.md. Не запускай broad tsc/Jest/build без
необходимости.

STAGE 9 — COMPLETE OWNER MAP
Сгенерируй owner HTML только из canonical blueprint. Он обязан позволять
открыть все 32 lessons, все 7 chapters и все 56 packets каждого lesson и
показывать для packet: role, can-do, grammar/review, prerequisites, new and
retrieval lexicon, learning delta, phrase frames, 2–4 examples, modes,
independent/delayed probes, prohibited material, source refs and status.

Добавь filters/search, curriculum findings, counts, build timestamp and exact
fingerprint. HTML не является отдельным source of truth. После любого source
change пересобери его и побайтово/машинно докажи freshness. Проверь desktop and
375px mobile: no horizontal overflow, keyboard focus, dialog readability and
reduced-motion behavior.

STAGE 10 — OWNER REVIEW RECEIPT AND STOP
Создай FULL_COURSE_BLUEPRINT_OWNER_REVIEW_<DATE>.md. Запиши:
- exact counts;
- canonical artifact paths;
- focused commands and decisive PASS/HOLD lines;
- unresolved findings and hypotheses;
- candidate fingerprint;
- `ownerApproval: PENDING`;
- exact learner-facing blocker.

Покажи владельцу owner map и receipt. Здесь остановись. Не выводи LOCKED и не
начинай learner-facing authoring, пока владелец явно не одобрит exact candidate
fingerprint. Зелёные structural gates не являются owner approval.

AFTER EXPLICIT OWNER APPROVAL
1. Зафиксируй approved fingerprint без изменения данных.
2. Перечитай полный recenter route.
3. Запусти target-language authoring preflight для ровно одной текущей session.
4. Создай bounded task packet этой exact session.
5. Пиши learner-facing session последовательно: 3 intro concept → formula →
   trap, затем mode-native practice по exact packet, word-first, 8 independent
   locale-native versions, diagnostic distractors and response-specific
   feedback only where single_choice applies.
6. Проверь source → shard → learner package → runtime → owner mock.
7. Прогони focused gates, independent review and owner review.
8. Только после legal LOCKED выполни AFTER_EVERY_SESSION_RECENTER целиком,
   пересобери owner map и открой следующий exact packet.
9. Никогда не author несколько learner-facing sessions одним пакетом и не
   продолжай по памяти после compaction/restart/handoff.

REQUIRED PROGRESS REPORT FORMAT
После каждого stage сообщай владельцу только:
- stage and status: PASS | HOLD;
- created/updated canonical artifacts;
- exact counts and fingerprint;
- decisive gate evidence;
- blockers/uncertainties;
- next authorized action.

Не называй работу готовой по числу файлов, красивому HTML или одному зелёному
тесту. Финальный статус planning pipeline до owner decision:
`MATERIALIZED / STRUCTURAL GATES PASS / OWNER APPROVAL PENDING`.
```

## 3. Что этот промпт гарантирует

После правильного выполнения существуют не обещания, а проверяемые артефакты:

1. отдельное исследовательское досье языка;
2. evidence ledger с границами каждого источника;
3. собственная последовательность грамматики и лексики, не копия English;
4. 32 конкретных lesson boundaries;
5. grammar/lexical/pronunciation registries;
6. ацикличный prerequisite DAG и retrieval graph;
7. 224 chapter outcomes;
8. 1 792 точных session packets;
9. coverage matrices;
10. машинные gates;
11. полный owner map;
12. candidate fingerprint и честный `OWNER APPROVAL PENDING`.

## 4. Что первый промпт намеренно не делает

Он не создаёт десятки тысяч финальных упражнений одним вызовом. Это было бы
противоположностью контроля качества: ошибки, повторы, механические локализации
и будущая грамматика спрятались бы в объёме. Первый промпт полностью снимает
curriculum-решения. После approval отдельный authoring-проход реализует строго
один exact packet за раз.

## 5. Приёмочный gate для самого one-prompt route

Новый курс не считается запущенным правильно, если отсутствует хотя бы одно:

- заполненные восемь входных переменных или явный owner `HOLD` по ним;
- recenter receipt со списком полностью прочитанных документов;
- самостоятельный language research;
- target-language start file;
- все десять stage receipts;
- полный owner map с 32 × 56;
- machine-readable candidate fingerprint;
- остановка перед learner-facing authoring на owner approval.
