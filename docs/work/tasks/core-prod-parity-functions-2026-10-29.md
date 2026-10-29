# Ядро · паритет functions с боем (da0a435e3 / a82a3b220) перед выкладкой конкурса и лесенки (29.10)

Governance-ID: TG-6D8BCE1988DB
Governance-ID: TG-FD2FC8323822
Status: Part 1 in commit B; part 2 handed to Site
Owner: 1 · ЯДРО

## Outcome
HEAD содержит всё, что уже работает на бою, — выкладка конкурса (B) и лесенки (C) из чистого HEAD не откатывает боевые
правки Codex. Ревизор нашёл 15 файлов замыкания functions/src/index.ts, где бой новее HEAD (13 == бой побайтно,
access_projection = бой + contestLastWin, account_delete = бой + невыложенная добавка Codex со стиранием рекордов Пика).

## Scope
Коммит 1 (с B): premium_status.ts, access_projection.ts целиком.
Коммит 2: 13 файлов из списка Ревизора как есть; account_delete.ts целиком (бой + стирание рекордов Пика + 2 строки
лесенки: plus_grant_ledger по uid, referral_ladder_stats по id) и account_delete_coverage_gaps.test.ts.
Не трогаю: admin/v2 (паритет — Сайт), firestore.rules (чужие правки).

## Architecture
Без изменения логики: перенос боевых версий в HEAD. Свои строки — только в account_delete (стирание новых коллекций).

## Security and privacy
Стирание при удалении аккаунта расширено на новые коллекции с uid (журнал выдачи Plus, счётчики лесенки).

## Technical debt
Снимает долг «бой новее HEAD» для functions.

## Verification
Снимок HEAD + файлы: проверка типов functions 0 ошибок; тесты account_delete*, access_projection, premium_status.
Ревизор пересверяет хэши с боем после коммита.

## Rollback
git revert коммита; бой не меняется (выкладки нет).

## Итог части 2 (29.10, 10:00)
Снимок HEAD 95850c22e + 12 боевых файлов: типы functions — 13 ошибок, потому что файлы тянут неотслеживаемые модули Codex
(admin_spire_statistics_core, admin_spire_pack_status, diagnostics_scheduler_status); падает и тест проекции Learning V2.
Это сироты раздела Сайта (он их коммитит после тестов). В замыкание бота, B и C эти файлы не входят (Ревизор).
Часть 2 снята с Ядра; строки account_delete (лесенка, журнал Plus) уходят коммитом C.
