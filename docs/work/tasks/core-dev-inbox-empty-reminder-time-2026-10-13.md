# Task packet: dev_state для робота — inbox=empty и reminderTime=HH:MM (только память)

Governance-ID: TG-ABBC967A70D2
Status: Done
Owner: Ядро (сессия 1)
Related: координатор 13.10; system-015 (входящие «Сообщений нет»), settings-gap-028 (время напоминания 20:00 в образце)

## Outcome

(а) `dev_state?inbox=empty` — входящие показывают пусто: список и счётчик непрочитанного пусты, закреплённое серверное сообщение
не видно, поэтому нечего закрывать и `dismissAppMessage` в облако не уходит. (б) `dev_state?reminderTime=20:00` — экран
настроек уведомлений показывает это время: подменяется только копия расписания, которая отдаётся экрану.
Хранилище, облако и расписание уведомлений не трогаются. Только `__DEV__ && !IS_STORE_RELEASE`, перезапуск сбрасывает.

## Scope

In scope: новый app/dev_robot_display.ts, components/AppMessagesInbox.tsx (одна ветка в applyAppMessagesSnapshot),
app/notifications.ts (getNotifSettingsSnapshot), app/dev_state_fixtures.ts (разбор и шаги), тест.
Out of scope: app/settings_notifications.tsx (в работе у другой сессии — не трогаем), значение по умолчанию 19:00 (вопрос владельцу).

## Architecture

No architecture change.

## Security and privacy

Только память dev-сборки; данных и облака не касается.

## Technical debt

- Время по умолчанию 19:00 (с марта 2026, без записи решения) против 20:00 в образце и 20:00 у напоминания D+1 — решает владелец.

## Verification

Тест: разбор параметров, подмена времени только в отдаваемой копии, флаг входящих; в стор-сборке установка отклоняется.

## Rollback

Откат коммита.
