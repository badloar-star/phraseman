# Ошибки админки зоны «Вход и аккаунт»: G (карантин удаления) и D2 (переход до монтирования корня) — 05.11

Governance-ID: TG-1A66737F3CAD
Status: В работе
Owner: «5 · ВХОД»

## Outcome

Из выгрузки `ADMIN_ERRORS_2026-11-05.md` взяты сигнатуры G и D2: сперва логи, потом правка. Итог: G — понижен уровень задуманного карантина и добавлены метки веток; D2 — найдено, что гард уже в HEAD.

## Scope

`app/auth_provider.ts` (3 небольших хунка), `tests/delete_quarantine_severity_2026_11_05.test.ts`. D2: правок нет (`app/(tabs)/_layout.tsx` уже содержит `rootNavigationReady` + `scheduleAfterRootNavigationReady`, коммит b9773b2ca от 28.10; `DeferredRedirect` тоже ждёт готовности навигации).

## Architecture

G: `local_exit_unverified` — три выхода (`auth_provider.ts` ~5630, ~5650, ~5688) возвращали одну причину; карантин намеренный (замок остаётся, данные стёрты, старт дожимает удаление). Фоновый исход `acc_mut:delete_background_failed` теперь `warning` для этой причины и `critical` для остальных; ветки различаются меткой `[AUTH-DELETE] quarantine branch=…`.

## Security and privacy

Данные не затрагиваются; в журнал идут только статусы без идентификаторов.

## Technical debt

Настоящую причину, почему личность не стала «ready» за 7,3 с (1 запись за 30 дней), покажет метка ветки при следующем появлении. Записи в `app_errors` остаются `new` — смена статуса в боевой базе по слову владельца.

## Verification

Тест `delete_quarantine_severity_2026_11_05`, проверка типов, контракты удаления аккаунта.

## Rollback

Откат коммита.
