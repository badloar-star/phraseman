# Admin v2 Content Factory — Release 3 Evidence

## Результат

Release 3 реализует независимый конвейер урока:

`English blueprint -> outline -> exactly 50 approved phrases -> deterministic extraction -> cumulative dedupe -> vocabulary / irregular verbs / prepositions / theory`

Все артефакты остаются отдельными и неизменяемыми. Перегенерация одного раздела создаёт новую ревизию и не заменяет остальные успешные результаты.

## Контракты и безопасность

- Production использует `schemaVersion=3`, `promptVersion=v3`, `qaPolicy=lesson-quality-v3`; `v2` остаётся читаемой предыдущей версией.
- `lesson_outline` загружает серверный `english-core-32:v1` и проверяет точные registry ID, lesson ID, topic и разрешённый source focus.
- `lesson_phrases` принимает ровно 50 уникальных пар с CEFR, meaning key и coverage tag.
- Create callable отклоняет любое значение lesson phrase count кроме 50; worker повторно принудительно устанавливает 50 для уже сохранённых/старых запросов.
- Phrase generation загружает, проверяет по Storage generation и SHA-256 полный approved outline artifact. `coverageReceipt` обязан точно покрывать outline coverage и exclusions.
- Одобренный phrase artifact повторно проверяется по Storage generation, SHA-256 и полному предметному контракту перед использованием.
- Vocabulary, irregular verbs и prepositions получают только `acceptedCandidates`; выдуманные lemma или source phrase refs отклоняются.
- Неподдерживаемая локальная лемматизация переводит стадию в видимую ошибку проверки, а не создаёт недостоверную дедупликацию.
- Накопительный ledger учитывает lemma + part of speech, пропущенные предыдущие уроки, омонимы, новую ревизию раннего урока и rollback.
- Одобрение/rollback ledger и перевод связанных downstream stages в `superseded` выполняются одной Firestore-транзакцией.
- Теория использует обязательный exemplar текущего английского урока и 1–3 дополнительных релевантных exemplars. Каждое правило, пример, ошибка и mini-check ссылаются на разрешённую phrase или exemplar fragment.
- Project OpenAI API key не вызывался и не читался во время Codex smoke/review.

## Итерация prompt quality

### Run 1 — намеренно не принят

Путь: `.codex-tmp/admin-content-factory-r3-smoke/run1/`

Технические схемы прошли, но lesson 16 (`Phrasal verbs`) получил слишком свободную цель `Directions`. Это выявило недостаточную обязательность blueprint topic. Результат не засчитан.

Исправления:

- outline получает реальный серверный blueprint grounding;
- blueprint topic и source focus стали обязательными;
- поля translation, irregular forms и содержимое theory sections стали формальными hard gates;
- prompt/schema/QA увеличены до v3/3/v3.

### Run 2 — повтор исправленного кейса

Путь: `.codex-tmp/admin-content-factory-r3-smoke/run2/`

- Lesson 16, `en <- ru`, B1.
- Canonical topic: `Phrasal verbs`.
- Objective адаптирован внутри canonical topic: phrasal verbs для маршрутов и движения.
- 50 phrases; 8 vocabulary; 6 irregular verbs; 8 prepositions.
- Required theory exemplar: `english-lesson-16`.
- Все локальные validators: PASS.
- Manifest hashes: PASS.

### Run 3 — невиданный кейс

Путь: `.codex-tmp/admin-content-factory-r3-smoke/run3/`

- Lesson 17, `en <- uk`, A2.
- Canonical topic: `Present Continuous`.
- 50 phrases; 8 vocabulary; 6 irregular verbs; 8 prepositions.
- Required theory exemplar: `english-lesson-17`.
- Все локальные validators: PASS.
- Manifest hashes: PASS.

После первого Advisor review все 100 RU/UK source sentences были повторно проверены. Исправлено 5 формулировок Run2 и 6 формулировок Run3. В Run2 теория теперь явно фиксирует обязательную позицию object pronoun между verb и particle (`pick us up`; `pick up us` неверно). Самостоятельные баллы Executor удалены; blueprint registry alignment помечен `unverified_without_exported_firestore_registry`, а техническая проверка grounding учитывается отдельно.

Run2 и Run3 используют обезличенные данные, содержат manifest с SHA-256 каждого JSON и не содержат пользовательских идентификаторов или секретов.

## Автоматическая проверка

```text
Functions TypeScript build: PASS
Functions focused suites: 21 passed
Functions focused tests: 113 passed
Admin/rules suites: 4 passed
Admin/rules tests: 66 passed
Admin JavaScript syntax: PASS
Tooltip audit: 142/142, missing 0
Language audit: 19 files, hard findings 0
Run2/run3 manifest SHA-256: PASS
Scoped git diff --check: PASS
```

Неблокирующее существующее предупреждение: Node reparses `admin-guidance.js` as ESM из-за отсутствующего package `type`.

## Ограничения локальной среды

Полный production-документ Firestore `content_factory_source_registry/english-core-32:v1` локально не экспортировался. Runtime загружает и валидирует его на сервере и останавливается с `source_registry_not_found`/`source_registry_invalid`, если документ отсутствует или повреждён. Smoke использует канонические локальные English theory, grammar map и lesson blueprint sources.

Firebase deployment не выполнялся и не требуется для implementation gate.

## Advisor gate

После первого `CHANGES_REQUIRED` исправлены outline grounding, серверный invariant 50, coverage/exclusion receipt и языковые замечания Run2/Run3. Повторная проверка фактического финального состояния: `DECISION: APPROVED`.
