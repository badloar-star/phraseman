# Task packet: очередь инфо-окон — несколько кнопок (выбор), для 014/038/039

Governance-ID: TG-986B99819A74
Status: In progress (координатор/Дизайн 05.10, DESIGN_OVERLAYS_RUNTIME_MORE_2026-10-05.md: «очередь инфо-окон умеет
только OK; по макету 014 Проверить статус / Восстановить покупки, 039 Закрыть / Повторить, 038 Продолжить с закладкой»)
Owner: сессия 1 · ЯДРО

## Outcome

Расширяем API очереди без поломки прежнего: enqueueThemedBlockingChoiceAlert(title, message, actions[], opts) →
Promise<значение выбранной кнопки | 'dismiss'>; прежний enqueueThemedBlockingInfoAlert работает как был (одна кнопка).
Хост рисует все кнопки через GlassAlertDialog (ghost-вариант, порядок как в макете). Значок плитки: замок и закладка.
Закрытие системной «назад» = 'dismiss'.
Подключение к конкретным окнам — отдельными шагами с решениями: 014 — денежный код (paywall_purchase: тесты, ревью,
отдельный коммит, «да» координатора), 039 — удаление аккаунта (повтор удаления), 038 — app/(tabs)/settings.tsx (участок
сессии 3).

## Scope

app/themed_blocking_alert_queue.ts, components/ThemedBlockingAlertHost.tsx, tests/themed_blocking_alert_queue.test.ts.

## Architecture

Очередь хранит actions (по умолчанию одна — okLabel). resolve получает значение кнопки.

## Security and privacy

Не затрагивает.

## Technical debt

Подключение 014/038/039 — после решений (см. Outcome).

## Verification

Тест очереди (порядок, значение, обратная совместимость); синтаксис.

## Rollback

git revert коммита.
