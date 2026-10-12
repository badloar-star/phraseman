# Task packet: аудит Optimistic UI «Настроек» (R1_SETTINGS_OPTIMISTIC_UI.md) и дешёвые правки в своей зоне

Governance-ID: TG-5F5E8B141DB7
Status: In progress
Owner: сессия «2 · ДИЗАЙН» по заданию координатора (12.10/14:55)
Related epic/enabler: правило владельца №10 (Optimistic UI), docs/phraseman-2.0/R1_CARDS_OPTIMISTIC_UI.md, R1_DIALOGS_OPTIMISTIC_UI.md

## Outcome

1. Документ-аудит по коду: переключатели уведомлений и времени, приватность (ИИ), «Очистить кэш», звук карточек и тактильный отклик, смена темы (сошёлся с Темами). По каждому: мгновенно / откат с сообщением / двойной тап / без спиннера / согласованность с облаком; пишет ли в облако один раз.
2. Дешёвые правки в моей зоне с логом и тестом: немой catch в «Очистить кэш» и при смене времени/ежедневного напоминания, мёртвый откат у звука карточек (сеттеры глотают ошибку), откат тактильного отклика с сообщением, защита отката от гонки.
3. Строка Авторизации по privacy_settings.tsx.

## Scope

In scope: app/(tabs)/settings.tsx (clear cache, haptics), app/settings_notifications.tsx, app/settings_edu.tsx, app/flashcards/SoundService.ts, тест-сторож, документ.
Out of scope: app/privacy_settings.tsx и app/account_* (Авторизация), тема (Темы), серверная запись pushPrefs (app/push_token_registration.ts — только замечание).

## Architecture

No architecture change: откат и логи в существующих обработчиках.

## Security and privacy

Данных не касается: новые поля и сервисы не появляются; пишутся те же значения и логи без идентификаторов.

## Technical debt

Pay now: немые catch и мёртвые откаты.

## Verification

Тест-сторож по исходникам, соседние тесты настроек, срез типов.

## Rollback

Откат коммита.
