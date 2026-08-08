# Learning V2 — статус готовности по фактам

**Срез:** 2 августа 2026. Этот файл отвечает только на вопрос «что проверяемо существует сейчас». Он не превращает утверждённый план в готовую функциональность.

## Сводка

| Область | Статус | Что есть проверяемо | Чего нет |
|---|---|---|---|
| Решения владельца | Зафиксировано | Более 360 решений сведены в [полный хендовер](LEARNING_V2_FULL_OWNER_HANDOVER_2026-08-02.md) и аудит | Не нужно продолжать интервью без блокера |
| 32 урока и контент | Первый вертикальный срез готов | 32 урока, 1 600 фраз, интро/теория/словарные данные старого продукта; Lesson 1 versioned payload связывает реальные 50 фраз, интро, теорию и словарь и проходит compiler → QA | Остальные 31 урок и пользовательский V2-runtime ещё не подключены |
| V2 contracts | Частично готово | Session set: 12 сессий; канонический валидатор: ровно 12 карточек | Контракт stars, repeat, hard mode, prices, migration не реализован полностью |
| V2 compiler | Частично готово | Детерминированная сборка 12×12; policy использует 7 утверждённых семейств; реальный versioned Lesson 1 source payload проходит compiler → QA | Остальные 31 урок и пользовательский runtime ещё не подключены |
| Server content QA | Частично готово | QA блокирует неверную кардинальность 12 карточек, порядок зон, дубли и несовместимые семьи | Не покрывает все правила владельца: права контента, плановый non-duplicate, audio/text, preview/release |
| Карта урока | Начат фундамент | Точная спецификация mock 08 и проверяемая модель 12-узлового маршрута/состояний/боковых plan-узлов | Нет пользовательского маршрута «список → карта → сессия → результат → карта», RN-тактильности и покадровой приёмки |
| Семь режимов по макетам | Не готово | Есть исходные HTML-макеты и спецификации | Нет покадрово принятой RN-реализации каждого режима |
| Личные планы на карте | Не готово | Существующая логика планов в приложении | Нет V2-узлов, отдельного пула и запрета дублирования основной цепочки в production pipeline |
| Слова/глаголы | Частично существует | Существующие словари и тренировки | Нет новых V2-боковых узлов и специального V2-режима неправильных глаголов |
| Hard Mode | Не готово | Решения и motion-спецификация зафиксированы | Нет flip, отдельных результатов, таймеров и наград |
| Энергия | Не удалена | Владелец утвердил удаление | Нет миграции и инвентаризации всех потребителей; удалять сейчас нельзя |
| Админ-генератор | Частично существует | Демо-части content factory и живая админка | Нет production pipeline нового языка, plan-pool QA, preview/release workflow |
| Офлайн/миграция | Частично готово | Lesson 1 local-first contract: restart, operation replay/conflict, fail-closed legacy adapter и raw XP/shards preservation проверены тестами | Нет runtime-интеграции, production idempotency ledger и полного переноса 32 уроков |

## Подтверждённые изменения в рабочем коде

| Файл | Проверяемое изменение | Статус |
|---|---|---|
| `modules/learning-v2/content/session_compiler.ts` | Ровно 12 карточек в сессии; policy и fallback используют только семь утверждённых family | Изменён и focused-тестирован |
| `modules/learning-v2/contracts/session.ts` | Канонический validator принимает ровно 12 карточек и отклоняет unapproved family; лимит `targetSeconds` до 360 | Изменён и focused-тестирован |
| `functions/src/content_factory/v2_episode_content_qa.ts` | QA требует ровно 12 карточек | Изменён; functions QA 7/7 |
| `tests/learning_v2_session_compiler.test.ts`, `tests/learning_v2_session_contract.test.ts` | Проверяют 12 карточек, допустимые mode family и fail-closed policy | Root focused tests 18/18 |
| `modules/learning-v2/content/legacy_lesson_adapter.ts` | Неизменяющий адаптер настоящих legacy-фраз: английский текст, перевод и word-level distractors → V2 content item | Lesson 1: 50/50 фраз проходят V2 validator |
| `modules/learning-v2/content/legacy_lesson_payload.ts` | Versioned envelope Lesson 1: реальные content items + существующие intro screens + существующая теория + словарь из текущих phrase-words | Не читает demo fixture и не переписывает курс |
| `tests/learning_v2_lesson1_legacy_slice.test.ts` | Regression proof: versioned Lesson 1 payload → 50 фраз / intro / theory / vocabulary → 12 сессий / 144 карточки → QA | Root focused test 3/3 |

## Последняя фактическая проверка

Запуск 2 августа 2026 из корня проекта:

```text
npx jest tests/learning_v2_session_contract.test.ts tests/learning_v2_session_compiler.test.ts --runInBand
PASS: 2 suites, 18 tests

cd functions
npm test -- --runTestsByPath src/content_factory/v2_episode_content_qa.test.ts --runInBand
PASS: 1 suite, 7 tests

npx jest tests/learning_v2_lesson1_legacy_slice.test.ts --runInBand
PASS: 1 suite, 3 tests; versioned real Lesson 1 = 50 фраз + intro + theory + vocabulary → 12 сессий / 144 карточки → QA
```

Jest сообщил о принудительном завершении из-за незакрытых async handles. Это предупреждение не маскирует падение теста, но его источник пока не расследован в рамках Learning V2.

## Честная готовность по этапам

| Пакет | Готовность | Доказательство / блокер |
|---|---:|---|
| P0 — contracts | Начат | Кардинальность и allowlist внесены; отсутствуют stars/repeat/hard/migration contracts и их tests |
| P1 — real content slice | Готов | Versioned Lesson 1 source payload: реальные 50 фраз, intro, theory, vocabulary; compiler → QA доказан тестом |
| P2 — progress/migration | Частично готово | Готов ограниченный безопасный Lesson 1 local-first contract; реальные начисления, network/runtime и 32-lesson migration ещё не реализованы |
| P3 — map shell | Частично готово | Есть отдельный RN route `app/learning-v2/lesson/[id].tsx`: реальный local-first Lesson 1 state → 12 узлов, словарь/теория, safe-area/accessibility, current halo; web export и focused contracts зелёные | Нет подключённого входа из списка уроков, старта V2-сессии, Hard Mode, wallet и покадровой приёмки на телефонах |
| P4 — seven modes | Не начат | Нет независимой frame-by-frame приемки |
| P5 — map extras | Не начат | Нет V2 plans/dictionary/verbs/hard integration |
| P6 — admin surface | Не начат | Живая админка есть, но менять её до P1 нельзя |
| P7 — remove energy | Не начат | Нужны инвентаризация, миграция, focused regressions |
| P8 — 32 lesson rollout | Не начат | Нельзя масштабировать до прохождения P0–P7 |

## Следующий безопасный большой проход

1. Завершить P0 тестами: строгое allowlist-правило, 3/2/1/0, правила повтора, независимость Hard Mode и обычного результата, миграционные состояния.
2. Перейти к пользовательской карте и первому экрану `phrase_builder` по исходному HTML-макету.

## Запрет на ложную готовность

Нельзя заявлять, что готовы «четыре переписанных экрана», «экономика», «генератор», «карта» или Learning V2 целиком. Сейчас существует документация, исследование, часть контрактного основания и один зелёный focused compiler test. Всё остальное из таблицы выше остаётся работой.
