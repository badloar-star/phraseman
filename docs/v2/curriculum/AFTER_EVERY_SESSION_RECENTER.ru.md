# Learning V2 — обязательный recenter после каждой сессии

> Этот файл полностью перечитывается после каждой законченной planned session
> packet и после каждой законченной learner-facing session. Следующую сессию
> нельзя открывать для работы, пока recenter не завершён со статусом `ON TRACK`.

## 1. Что перечитать полностью

1. `docs/v2/СТАРТ В2.md`.
2. `docs/v2/curriculum/START_CURRICULUM_BLUEPRINT.ru.md`.
3. `docs/v2/LEARNING_V2_COURSE_BLUEPRINT_32X56_DESIGN.ru.md`.
4. Target-language `RESEARCH_DOSSIER` и `SOURCE_EVIDENCE_LEDGER`.
5. Target-language `COURSE_OVERVIEW_32_LESSONS`.
6. Exact lesson blueprint, exact chapter и exact next session packet.
7. Для learner-facing authoring также полностью перечитать применимые:
   `БИБЛИЯ_ТЕКСТОВ_LEARNING_V2.ru.md`, `MODE_NATIVE_AUTHORING_CONTRACT.ru.md`,
   `LESSON_DESIGN_RULES.ru.md` и чеклист выпуска.

Пересказ из памяти, handoff summary или прошлый зелёный gate не заменяет
полного чтения.

## 2. Проверить exact next packet

- packet ID, lesson/chapter/session ordinal и blueprint fingerprint;
- primary can-do step;
- ровно одну новую grammar operation либо непустой review set;
- prerequisites уже объяснены раньше;
- prohibited future constructs отсутствуют во всех intro/practice/feedback;
- intro → practice → independent probe проверяют один grammar/review focus;
- packet содержит phrase frames, allowed lexical slots, forbidden forms и 2–4
  canonical target-language examples без будущей грамматики;
- learning functions и mode families служат can-do, а не разнообразию ради
  разнообразия.

## 3. Проверить lexical plan

Каждая сессия явно имеет одну из двух ролей:

### `introduce_and_retrieve`

- новые lexical senses реально нужны primary can-do;
- каждое новое значение имеет уникальный first-introduction packet;
- word-first grounding происходит до обязательного phrase use;
- одновременно возвращаются ранее изученные senses;
- для нового sense уже назначены later-session, later-lesson и delayed
  retrieval contacts.

### `retrieval_only`

- есть конкретная причина: checkpoint, voice, delayed retrieval, targeted
  repair, сложный transfer или предотвращение cognitive overload;
- перечислены точные ранее введённые sense IDs;
- это не отговорка «не хватило новых слов» и не бесконечное повторение одного
  маленького набора;
- следующая глава/последующие sessions продолжают запланированный lexical
  growth.

Механическая квота новых слов в каждой сессии запрещена. Одновременно запрещён
курс, который перестал давать новые слова: owner map должен показывать
регулярный lexical growth по всем главам и возвращение важных words для
закрепления.

## 4. Проверить полезность отработки

Review session получает `ON TRACK` только если имеет хотя бы один измеримый
`learningDelta`:

- `support_fade` — меньше подсказок;
- `delayed_retrieval` — извлечение после интервала;
- `changed_context` — тот же construct в новом реалистичном контексте;
- `contrast_discrimination` — различение близких уже изученных форм;
- `productive_shift` — переход recognition → controlled/spoken production;
- `targeted_error_repair` — работа с зарегистрированной ошибкой;
- `transfer` — самостоятельное действие в изменённой ситуации.

Идентичный prompt, те же варианты и та же поддержка не являются новой
отработкой. Training prompt нельзя повторно выдавать за independent/delayed
evidence.

## 5. Проверить стадию курса и phrase boundary

- все предыдущие стадии создания курса имеют canonical PASS artifact;
- planning не перескочил через research, boundaries, registries, DAG, chapters
  или coverage;
- 2–4 canonical examples показывают intent packet, но не притворяются полным
  learner-facing банком;
- финальные prompts, distractors, feedback, definitions, audio scripts и восемь
  локализаций пишутся только для одной текущей exact session;
- массовая генерация будущего learner-facing content отсутствует.

## 6. Обновить артефакты

После каждой готовой planned или learner-facing session:

1. обновить canonical source;
2. прогнать узкий применимый gate;
3. пересобрать полный owner HTML из canonical blueprint/content;
4. сверить HTML fingerprint с source fingerprint;
5. записать статус, findings и blockers;
6. только затем перечитать маршрут для следующей session.

Ручная правка HTML вместо canonical source запрещена.

## 7. Recenter receipt

Перед продолжением исполнитель оставляет короткий receipt:

```text
LEARNING V2 RECENTER
completed packet/session: ...
next exact packet: ...
documents reread: PASS
blueprint fingerprint: ...
grammar/review focus: ...
lexical role: introduce_and_retrieve | retrieval_only
new senses: ...
retrieved senses: ...
learning delta: ...
phrase frames/examples: PASS
course stage order: PASS
prerequisites/boundary: PASS
owner map fresh: PASS
status: ON TRACK | HOLD
```

Пустое поле, stale map, неизвестный fingerprint или неразрешённое расхождение
дают `HOLD`. `ON TRACK` разрешает только переход к следующей точной session и
не заменяет independent review или owner approval.
