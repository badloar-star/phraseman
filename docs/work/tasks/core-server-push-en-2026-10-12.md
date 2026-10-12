# Task packet: серверные пуши — английский текст (EN_READINESS_R1, строка «Серверные тексты»)

Governance-ID: TG-FD78D7885016
Status: Done (77 тестов, срез типов functions 0); ждёт прицельной выкладки
Owner: сессия «1 · Ядро» (координатор 12.10: «после этого — открытые пункты EN_READINESS_R1.md из твоей полосы»).

## Outcome
Замер functions/src (та же логика, что `scripts/scan_missing_en_dictionaries.mjs`): 15 словарей ru+uk без en в 7 файлах.
Разбор:
- `re_engage_push.ts` (серия ждёт / давно не был / очень давно) и `premium_expiry_reminder.ts` (Plus скоро продлится /
  доступ скоро закончится) — список языков без `en`, запасной язык `ru`: при включённом английском интерфейсе человек
  получил бы русский пуш. ЧИНИТСЯ: `en` в список и английский текст.
- `spire_week_result_push.ts`, `spire_zone_warning_push.ts`, `spire_notifications.ts` — пуши Шпиля уходят только ru/uk
  (`SPIRE_PUSH_UI_LANGS`, вместе с клиентским языковым гейтом Шпиля) — английскому пользователю пуш не уйдёт вовсе, русского
  текста он не увидит. Не трогается, пока Шпиль не открыт для других языков.
- `tournament_start_push.ts` — не экспортирован в index (Арена удалена). Не трогается.
- `admin_global_broadcast.ts` — схема рассылки админки (поля titleRu…titlePl, без En): английский текст рассылки пишет
  владелец в админке; нужно поле En в `admin/v2/legacy.html` + клиенте — отдельная задача, в отчёт.

## Scope
In: `functions/src/re_engage_push.ts`, `functions/src/premium_expiry_reminder.ts` и их тесты.
Out: выкладка functions (прицельно, координатором), Шпиль, админка.

## Architecture
`SUPPORTED_LANGS` += 'en', английский текст в каждом словаре тем же тоном (gain-framing, без давления).

## Security and privacy
Без данных пользователя; тексты пушей.

## Technical debt
Пока `ENGLISH_UI_LOCALE_ENABLED=false`, клиент не присылает `en` — правка безвредна до включения.

## Verification
Тесты локализаций (it.each по языкам + en), срез типов functions.

## Rollback
`git revert`.
