# Task packet: закоммитить модуль «Диалоги V2: память» — functions из чистого HEAD снова собираются

Governance-ID: TG-0CF68C553F0B
Status: Done
Owner: Ядро (модуль создан сессией Ядра 27.09, не был закоммичен)

## Outcome
functions/src/dialogue_v2_memory_management.ts и 5 его тестов не коммитились с 27.09, а снимок efe19ae9d (30.09) взял dialogue_v2_memory_management_callable.ts, который их импортирует — HEAD functions не собирался, выкладки (explainMistake, revenueCatPremiumReconcileMine, progressSubmitEvent, submitClientReport) стояли. Модуль закоммичен.

## Scope
functions/src/dialogue_v2_memory_management.ts (+ тесты: contract, management, reader, writer, resume_callable.emulator), scripts/scan_secrets.mjs.

## Architecture
Сканер секретов ложно срабатывал: (1) в боевом файле — параметр с именем authorization и типом языкового разрешения похож для сканера на заголовок авторизации → переименован в `languageAuthorization` (чисто локальное имя; снаружи поле не читается); боевой файл в исключения НЕ внесён. (2) В тестах — заглушки секретов (`server-owned-secret-with-at-least-32-bytes` и т. п.) → тестовые файлы внесены в ALLOWLIST_FILES с «зачем».

## Security and privacy
Реальных секретов нет: тестовые значения — фикстуры HMAC в тестах; сканер для боевого кода не ослаблен.

## Technical debt
Нет.

## Verification
Проверка типов functions — 0 ошибок; тесты памяти; сканер по этим путям чист.

## Rollback
Откат коммита (тогда HEAD снова не соберётся — откатывать вместе с callable).
