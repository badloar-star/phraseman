# Task packet: AA-1 — Account Authority 2.0: починить типы и немой catch, закоммитить частями

Governance-ID: TG-A5BF04652076
Status: Planned (после 8S; агент один)
Owner: Claude session (Account V2) — передано координатором (автор неактивен)

## Outcome

Незакоммиченная работа «Account Authority 2.0» (план `docs/superpowers/plans/2026-10-01-account-authority-2-0.md`, опись в INBOX §AV2-23) ломает общий typecheck и ратчет PM-229:
1. `modules/account-session-v2/account_authority_production_adapter.ts` — TS2739 (порт хранилища аренды без `readLease/bindLease/writeLease`) и новый немой `catch` → починить (реализовать недостающие методы через существующий `account_authority_local_store.ts`, catch с причиной `[ACCOUNT-AUTHORITY]` без uid).
2. Полный аудит, что флаг cutover жёстко OFF и при OFF поведение входа/выхода/смены аккаунта НЕ меняется (+66 строк в `app/auth_provider.ts`, +244 в `accounts_v2_client_runtime.ts`): тест «флаг OFF → прежний путь».
3. `tests/account_authority_legacy_callsite_guard.test.ts` ждёт старый хеш `app/cloud_sync.ts` → законный сдвиг (cloud_sync меняли 8H…8N, PM-229) — перевести на устойчивую проверку (перепись вызовов, а не хеш файла) или обновить хеш с `// зачем:`.
4. Прогнать все `tests/account_authority_*` и functions `src/account_authority/*` по одному; тайпчек.
5. Коммит частями (каждая часть — независимое ревью, вход/безопасность): (а) клиентские чистые модули + тесты; (б) серверные `functions/src/account_authority/*` + экспорты в `functions/src/index.ts` — БЕЗ выкладки, с отчётом совместимости 1.6.24; (в) проводка в auth_provider/runtime/client_session.

## Scope

Перечисленные файлы. Чужие незакоммиченные хунки (если появятся) не трогать. Out of scope: включение флага, деплой, прод, Task 7/8 плана.

## Architecture

Как в плане: authority = единственный владелец решений об аккаунте, за флагом OFF; legacy остаётся authoritative до gates.

## Security and privacy

Вход/аккаунты: обязательное независимое ревью каждой части; App Check не включать; новых данных не собирать без проверки политики (owner-rules → Privacy Policy, если authority пишет новые поля на сервер — аренда/устройство).

## Technical debt

Accept temporarily: Task 7/8 (emulator/device/release gates) остаются открытыми.

## Verification

Тайпчек без TS2739; ратчет немых catch не растёт; тесты authority зелёные; тест «флаг OFF = прежнее поведение»; ревью APPROVE на каждую часть.

## Rollback

git revert по частям.
