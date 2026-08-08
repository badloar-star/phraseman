# Admin v2 Content Factory — Release 4 Evidence

## Реализованный workflow

`editable topic -> human approval -> exact-10 batch -> review -> cumulative ledger -> next batch / one-question replacement`

- `quiz_topic` и `challenge_topic` возвращают title, learning promise, skill tags, inclusions, exclusions и распределение сложности 3/4/3 (или другое целочисленное распределение с суммой 10).
- `quiz_questions` и `challenge_questions` всегда создают ровно 10 вопросов.
- Topic artifact загружается полностью и проверяется по state, Storage generation, SHA-256 и v2 contract до генерации вопросов.
- Каждый вопрос содержит source-language prompt, четыре уникальных target-language choices, один `correctIndex`, четыре выровненных по индексу source-language explanations, approved skill tag, difficulty и source phrase IDs при наличии.
- Пояснения выбраны per-option на основании реального `QuizPhrase` consumer: приложение показывает explanation с тем же индексом, что и выбранный вариант.
- Ledger хранит semantic keys всех одобренных пачек темы, блокирует повторные шаблоны между пачками и поддерживает rollback.
- Отдельные `quiz_question_replacement` / `challenge_question_replacement` stages заменяют один stable question ID, не меняя другие элементы. Replacement можно отдельно принять, отклонить и откатить.
- Admin создаёт новую exact-10 пачку одной кнопкой из approved topic и replacement stage одной кнопкой для выбранного вопроса approved batch.

## Runtime consumer decision

### Quiz

Фактический consumer:

- `app/quiz_data.ts` — `QuizPhrase` с `choices`, `correct`, и массивами explanations по индексам options.
- `app/(tabs)/quizzes.tsx` — `quizExplanationIndexForAnswer` выбирает explanation по выбранному option index.
- `app/quiz_thematic_packs.ts` — `skyler-quiz-pack-v1` и adapter в `QuizPhrase`.

`buildSkylerQuizPackFromStages` создаёт этот существующий формат только для текущего поддержанного target `en`, только когда собраны и взаимно выровнены все активные source locales: `ru`, `uk`, `es`, `pt-BR`, `vi`, `id`, `tr`, `pl`. Для неполного набора, несовпадающих choices/correctIndex/skill или другого target adapter останавливается, не публикуя частичный pack.

### Challenge

Поиск app loaders/screens/Firestore paths не обнаружил consumer для создаваемых MCQ Challenge artifacts. Найденные dialog challenges, survey daily challenge и Arena ghost challenge имеют другие схемы и назначения.

Поэтому:

- все Challenge stages получают `publicationPolicy=draft_only_no_consumer`;
- Admin preview показывает `Не подключено к приложению`;
- `assertChallengeDraftOnly('publish')` всегда завершает публикацию ошибкой `challenge_runtime_consumer_not_found`;
- Challenge можно генерировать, проверять и хранить как draft, но нельзя выдавать как подключённый runtime-контент.

## Fake-provider smoke

`question_studio_smoke.test.ts` выполняет для Quiz и Challenge:

1. topic generation;
2. human-approved topic grounding;
3. batch 1 из 10;
4. ledger approval;
5. batch 2 из 10 с previous semantic keys;
6. ledger approval до 20 unique keys;
7. replacement одного вопроса;
8. подтверждение, что соседний вопрос не изменился.

## Real-language smoke

Путь: `.codex-tmp/admin-content-factory-r4-smoke/run1/`

- Random Quiz topic, `en <- ru`, A2.
- Две независимые пачки по 10 вопросов.
- В каждой пачке 3 easy / 4 medium / 3 hard.
- Batch 2 проверен против 10 semantic keys Batch 1.
- Quiz ledger: revision 2, 2 batches, 20 keys.
- Draft-only Challenge topic и одна пачка из 10.
- Все локальные validators: PASS.
- SHA-256 всех JSON: PASS.
- Данные обезличены; project API calls = 0; secrets read = false.
- Самооценки качества Executor не использовались; все 20 Quiz items должны быть переданы Advisor вместе для проверки повторяющихся шаблонов и distractors.

## Verification

```text
Functions TypeScript build: PASS
Functions focused suites (R0-R4 final): 26 passed
Functions focused tests (R0-R4 final): 152 passed
R4 fake workflow: PASS
Admin JavaScript syntax: PASS
R4 UI source contracts: PASS
Tooltip audit: 142/142, missing 0
Language audit: hard findings 0
Real-language manifest hashes: PASS
Scoped git diff --check: PASS
```

Корневой Jest runtime в конце R4 был недоступен: корневой `node_modules` потерял объявленный `ts-jest`/Expo runtime, а fallback через Functions Jest увидел duplicate mocks в чужих `.worktrees`. Исходники, worktrees и зависимости не удалялись и не переустанавливались. UI-проверка выполнена через `node --check`, focused source contracts и ранее прошедший Admin suite до изменения среды.

Firebase deployment не выполнялся и не требуется для implementation gate.

## Повторная проверка после замечаний Advisor

- В вопросе 4 второй пачки Quiz теперь ровно один допустимый ответ; неоднозначный отвлекающий вариант заменён, пояснение синхронизировано.
- Сложные задания Challenge переписаны в пределах грамматики A2; повторный аудит не нашёл выходов за A2.
- Замены вопросов используют версионный CAS-стек: одобрение B замещает A, откат устаревшей A запрещён, откат активной B восстанавливает A, а откат пачки удаляет активный стек замен.
- Все 6 SHA-256 из манифеста реального smoke-набора совпали с файлами.
- Связанные тесты Functions после CAS: 7 suites / 57 tests — PASS; TypeScript build — PASS.
- Корневые Admin/rules тесты после восстановления зависимостей: 4 suites / 68 tests — PASS.
- Project OpenAI API не вызывался, секреты проекта не читались.
