# Learning V2 — обязательный recenter после каждой сессии

> Этот файл полностью перечитывается после каждой законченной planned session
> packet и после каждой законченной learner-facing session. Следующую сессию
> нельзя открывать для работы, пока recenter не завершён со статусом `ON TRACK`.

## 1. Что перечитать полностью

1. `docs/v2/СТАРТ В2.md`.
2. `docs/v2/curriculum/START_CURRICULUM_BLUEPRINT.ru.md`.
3. `docs/v2/LEARNING_V2_COURSE_BLUEPRINT_32X56_DESIGN.ru.md`.
4. Target-language `RESEARCH_DOSSIER` и `SOURCE_EVIDENCE_LEDGER`.
5. Current target-language 32-lesson authority. Для English это
   `en/FULL_B1_BLUEPRINT_OWNER_REVIEW_2026-08-30.md` и canonical V2 modules;
   `en/COURSE_OVERVIEW_32_LESSONS.ru.md` помечен `SUPERSEDED` и читается только
   как исторический scenario shell.
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

Каждая сессия явно имеет одну из двух ролей. Более новое прямое решение
владельца 2026-08-30 отменяет прежние исключения для voice/repair/transfer:

### `introduce_and_retrieve` — обязательно для Sessions 1–7 каждой главы

- вводится 1–5 новых lexical senses, реально нужных primary can-do;
- каждое новое значение имеет уникальный first-introduction packet;
- word-first grounding происходит до обязательного phrase use;
- одновременно возвращаются ранее изученные senses;
- для нового sense уже назначены later-session, later-lesson и delayed
  retrieval contacts.

### `retrieval_only` — только Session 8 checkpoint

- `newLexicalSenseIds` строго пуст;
- перечислены точные ранее введённые sense IDs;
- scored mastery probe использует только ранее введённую лексику;
- checkpoint не маскирует новое слово как «контекстное».

Число само по себе не оправдывает filler. Однако пустая не-контрольная сессия
теперь является машинным `HOLD`: автор обязан подобрать 1–5 частотных полезных
значений, естественно совместимых с текущей грамматикой. Owner map должен
показывать и first introduction, и последующее закрепление каждого важного
sense.

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
