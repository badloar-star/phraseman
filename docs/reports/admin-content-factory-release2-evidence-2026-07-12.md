# Admin v2 Content Factory — Release 2 Evidence

## Реализованный контур

`stage request -> server plan -> immutable stage identity -> dependency gate -> exact prompt packet -> structured generation/repair -> immutable object -> preview -> human approve/reject -> downstream prerequisite`

## Независимые стадии

- Урок: outline, phrases, vocabulary, irregular verbs, prepositions, theory.
- Квиз: topic, questions.
- Вызов: topic, questions.
- Карточки: pack idea, items.
- Арена: topic, questions.

Каждая стадия имеет собственные `stageId`, `artifactId`, `revision`, `schemaVersion`, `promptVersion`, `count`, `qaPolicy`, prerequisite artifacts и idempotency key.

## Безопасность и совместимость

- Client request не может задавать model, prompt/schema version, QA policy/receipt или artifact ID.
- Callable повторно читает prerequisite stages с сервера и требует state `approved`.
- Prerequisite обязан совпадать по request ID, study target, source locale и scope.
- Старые lesson/quiz/flashcard/arena units читаются через compatibility adapter; legacy lesson сохраняет отметку о bundled vocabulary/drills.
- Admin v2 обращается к новым коллекциям только через callable; прямого Firestore SDK-доступа в клиентском коде нет.
- Prompt objective проходит instruction-injection guard.
- Project OpenAI API key не читался и generation callable не запускался в Codex.

## Prompt и runner

- 14 отдельных prompt definitions, без универсального surface prompt.
- Явные source/target language semantics, CEFR и exact count.
- SHA-256 для prompt, context и schema.
- Structured JSON validation; максимум две repair-попытки с previous JSON + validation errors.
- Pause/resume/cancel state transitions.
- Immutable storage path основан на SHA-256 stage ID.
- Failure record сохраняет sanitized detail, normalized code, retryability и history.
- Worker lease содержит token, attempt и expiry; late completion не может перезаписать pause/cancel или новую попытку, а expired `running` восстанавливается.
- Immutable object path включает attempt и hash lease token; abandoned/crashed attempt не блокирует новый payload через `artifact_content_conflict`.
- Idempotency fingerprint включает все generation-affecting поля и отсортированные prerequisite stage/artifact identities.
- Objective хранится только в JSON context data и не интерполируется в instruction task; adversarial delimiter/instruction cases покрыты тестами.

## Admin v2

- Пять отдельных generator tiles.
- Поля: stage, study target, explanation language, CEFR, objective, scope, count, approved dependencies.
- Queue actions: generate, pause, continue, cancel, preview.
- Preview показывает payload и QA receipt.
- Approve/Reject доступны только с `content.publish`; approval разблокирует зависимости.
- Старый full-package workflow сохранён в совместимом раскрываемом разделе.

## Свежая проверка

```text
Functions build: PASS
Functions focused suites: 11 passed
Functions focused tests: 62 passed
Admin/rules suites: 4 passed
Admin/rules tests: 63 passed
Tooltip audit: 142/142, missing 0
Language audit: 19 files, hard findings 0
git diff --check: PASS
```

Неблокирующее существующее предупреждение: Node reparses `admin-guidance.js` as ESM из-за отсутствующего package `type`.

## Не входит в Release 2

- Лингвистические schemas конкретных lesson/quiz/card/arena artifacts и реальный routed language QA начинаются с Release 3.
- Firebase deployment не выполнялся и не требовался для implementation gate.
