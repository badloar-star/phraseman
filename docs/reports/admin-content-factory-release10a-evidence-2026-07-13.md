# Admin Content Factory — Release 10A Evidence

Дата: 2026-07-13  
Статус: локально проверено, Advisor `APPROVED`  
Деплой: не выполнялся

## Реализовано

- Единая серверная матрица возможностей: тип стадии, языки, CEFR, количество, зависимости, scope, редактируемые поля и публикационные ограничения.
- Серверный каталог только одобренных зависимостей с фильтрами до лимита, стабильным cursor и `isPartial`.
- Атомарный серверный bulk/range-план до 100 стадий без browser loop; точный replay не создаёт повторных стадий или audit-записей.
- Immutable edit: новая ревизия и новый Storage object, повторная структурная проверка, semantic diff, correction event и orphan candidate при потере транзакции.
- Preview и approve/reject связаны точным fingerprint immutable receipt, grounding, QA и версий контрактов.
- Correction status учитывается только после ручного решения по новой редакции.

## Проверки

- Functions TypeScript build: `PASS`.
- Focused Functions: 14 suites, 124 tests — `PASS`.
- Admin/permission/firewall contracts: 5 suites, 21 tests — `PASS`.
- Firestore Emulator, общий Content Factory набор: 5 suites, 20 tests — `PASS`.
- Повторный bulk race после финального progress delta: 2 tests — `PASS`.
- R10A local smoke: `PASS`, provider calls `0`, deployment `not_performed`.
- Smoke manifest: `deafb09aaa839da9eacd22b7071bc26a271daacda24f8715ab35b243ad9fd526`.
- Firestore rules/indexes dry-run для `phraseman-ea0b3`: `PASS`; только существующие предупреждения rules linter, ошибок компиляции нет.
- Advisor final review и post-review delta review: `DECISION: APPROVED`.

## Ограничения

- Реальный LLM/provider не вызывался: это запрещено локальным OpenAI API firewall и не требуется для backend-контрактов R10A.
- Cloud Functions, Hosting, rules и indexes не разворачивались.
- Полный UI bulk/dependency/edit workflow относится к R10B.
