# Task packet: макеты М и окна по месту — тексты живым голосом (copy-sweep, раздел 6) + шапка по Темам

Governance-ID: TG-4FCEDAFF391A
Status: In progress
Owner: 3 · МАКЕТЫ (координатор 25.10: владелец утвердил голос «Да, так и делать везде»)

## Outcome

Дизайн сверяет экран пейвола с эталонами М (AKuWv3RWqbu3a4Xe7EBj7q) и окон по месту (6dkmYjjEX3kCv2s1nuFT9B), а там старые тексты.
Переписать дословно по docs/work/copy-sweep-2026-10-25.md, раздел 6 (m.head.*, mc.*, m.cmp.asMuch); список строк для Переводчика
привести к тем же ru. Шапку М доводить legibleOn(base, isLight ? text : '#FFFFFF', все края подложки, 4.55) — Темы c843a230a.

## Scope

In scope: docs/design/v2-app/paywall-variant-m.html, docs/design/v2-app/paywall-m-context.html (+ артефакты),
docs/work/paywall-m-context-strings-2026-10-25.md (ru), этот пакет. Out of scope: код пейвола, переводы 8 языков.

## Architecture

No architecture change. Наборы макета в Temp (pw_kit_m/mc, pw_frames_m/mc) — замена строк, пересборка кадров и страниц.

## Security and privacy

Макет, данных нет.

## Technical debt

- None known: строки не из раздела 6 остаются прежними до следующих пачек Переводчика.

## Verification

Grep по собранным страницам: старых строк раздела 6 нет, новые есть дословно; кадры глазами — переносы без ужатия; страницы без ошибок.

## Rollback

Вернуть страницы и список строк из git — приложение не меняется.
