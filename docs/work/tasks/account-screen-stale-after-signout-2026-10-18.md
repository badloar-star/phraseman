# Task packet: экран «Аккаунт» после выхода показывает имя и дату прежнего аккаунта

Governance-ID: TG-4327B8E7C55B
Status: В работе (найдено на прогоне координатора 18.10 01:35–01:37)
Owner: 5 · АВТОРИЗАЦИЯ

## Outcome

Сразу после выхода экран «Аккаунт» (он остаётся открытым под окном входа) показывает нового гостя: «Не задано» и его
дату «С нами с», а не имя и дату прежнего аккаунта.

## Факты прогона (docs/phraseman-2.0/evidence/signout_1018/)

- 01:35:42 выход №2 (Delta 94030) ok; окно входа поверх экрана «Аккаунт».
- 04_guest_sees_previous_name_stale.png: после «Позже» гость видит «Delta 94030» в герое и строке «Имя», «С нами с
  17.10.2026». Строк [ACC-NAME] после выхода нет — эффект по снимку не сработал.
- 06_reopened_account_clean.png: экран открыт заново — «Не задано», 18.10.2026, [ACC-NAME] present:false. Значит, данные
  стёрты; старое значение живёт только в состоянии уже открытого экрана (userName, memberSinceMs без сеттера).

## Scope

app/account_details.tsx: в onSignedOut — сбросить userName в '' и заново прочитать memberSince (useState с сеттером,
peekAccountCreatedAtMs()), лог `[ACC-NAME] {"step":"signed_out_reset", snapshotPresent, memberSince}`.

## Architecture

Детерминированная точка — onSignedOut (выход завершён, локальные данные стёрты). Снимок может обновиться позже — эффект
по snapshotName остаётся источником после этого.

## Security and privacy

Устраняет показ имени прежнего аккаунта следующему человеку на том же телефоне.

## Technical debt

Почему снимок не дал смены имени в открытом экране — разобрать по логу при следующем прогоне (лог на сбросе покажет,
был ли снимок пуст в момент выхода).

## Verification

tests/profile_liquid_glass_source_contract.test.mjs, tests/account_modals_liquid_glass_source_contract.test.mjs,
tests/layout_stability_contract.test.ts; babel-разбор файла; прогон на эмуляторе при следующем окне.

## Rollback

Обратный собственный патч.
