# Task packet: напоминания о Plus на 4/7/14 день от установки

Governance-ID: TG-DED20893BEC3
Status: In progress (код и сторож написаны, прогон ждёт слот светофора)
Owner: сессия Claude «аудит мотивации к покупке Plus», 2026-11-11
Related epic/enabler: аудит мотивации к покупке Plus (пункт «Пуши на 4/7/14 день», владелец: делать)

## Outcome

Бесплатный пользователь в первые 14 дней после установки получает три локальных напоминания о Plus (4-й, 7-й,
14-й день) — тексты уже были в приложении, но не уходили никому: их ставил только выключенный «Бонус на старт» (D186).
Успех: в журнале `[UPSELL-PUSH] from_install … result={"ok":true,"scheduled":N}` у новой бесплатной установки.

## Scope

In scope: `app/notifications.ts` (новая внутренняя функция `scheduleUpsellNotificationsFromInstall` и её вызов из
`scheduleNotifications`), сторож `tests/upsell_push_from_install_contract.test.ts`.

Out of scope: тексты пушей (не менялись); мягкие карточки на вехах серии, в недельном обзоре и после второго
диалога — им нужны макеты экранов-хозяев; окно Plus на уровнях 10 и 20 — правка в `app/_layout.tsx`, файл правит
другая сессия; окно «магазин недоступен».

## Architecture

Новых точек вызова нет: `scheduleNotifications` уже зовётся при запуске и из настроек уведомлений. Вызов стоит после
проверки разрешения и мастер-тумблера, поэтому системный запрос разрешения не появляется. Отсчёт — от `install_date`.
Категорию «offers» и защиту от повторной постановки (ключи `notification_upsell_d*_scheduled_at`) даёт прежняя
`scheduleUpsellNotifications`. Статус подписки берётся только подтверждённый; не подтверждён — не планируем.

## Security and privacy

Уведомления локальные, на сервер ничего не уходит, новых данных и разрешений нет. Категория «Предложения» в
настройках уведомлений по-прежнему их выключает. Политика конфиденциальности правки не требует.

## Technical debt

- Contain: поведение проверено сторожем по исходнику, а не запуском с подменой модуля уведомлений. Exit — проверка на
  устройстве по журналу `[UPSELL-PUSH]`.
- Accept temporarily: полная проверка типов не запускалась (слот светофора занят); владелец — эта сессия, до коммита
  следующей правки в том же файле.

## Verification

`npm run test:one -- tests/upsell_push_from_install_contract.test.ts tests/conversion_push_result_contract.test.ts
tests/gustav_french_notifications_target_isolation.test.ts` — смотреть текст вывода.
На устройстве: новая бесплатная установка с разрешёнными уведомлениями → в журнале `[UPSELL-PUSH] from_install`;
аккаунт с Plus → `skip reason=premium`.

## Rollback

`git revert` коммита; уже поставленные напоминания снимает `cancelUpsellNotifications` (зовётся при покупке Plus).
