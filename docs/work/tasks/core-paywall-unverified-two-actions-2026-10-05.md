# Task packet: 65(а) — окно «Статус покупки не подтверждён»: «Проверить статус» / «Восстановить покупки»

Governance-ID: TG-1662040212BE
Status: In progress (решено по рекомендации, владелец 11:10; координатор: «65(а): окно 014 — да, отдельный коммит,
тесты»; макет overlays-runtime 014 — две кнопки)
Owner: сессия 1 · ЯДРО

## Outcome

Окно после неподтверждённой покупки умело только «OK», хотя текст сам просит «проверь покупки или нажми
«Восстановить»». Теперь (очередь окон 8f9c3c4e6 уже умеет выбор):
- «Проверить статус» — чтение текущего customerInfo RevenueCat (Purchases.getCustomerInfo, без восстановления);
- «Восстановить покупки» — прежнее восстановление (Purchases.restorePurchases).
Обе кнопки идут ОДНИМ путём синхронизации доступа (бывший handleRestore → runEntitlementSync(mode)): проверка доступа,
сохранение Plus, пополнение, празднование, тосты, аналитика — без изменений, в аналитику добавлен параметр mode.
«Назад»/закрытие окна — ничего не делаем (как раньше «OK»).

## Scope

app/paywall_purchase.ts (showUnverifiedPurchaseAlert → выбор; runEntitlementSync(mode) + handleRestore-обёртка; ref
для вызова из handlePurchase), tests/paywall_unverified_alert_actions.test.ts.

## Architecture

Один путь применения доступа для двух источников customerInfo. Повторные нажатия режет прежний operationRef/restoring.

## Security and privacy

Не затрагивает: тот же RevenueCat, без новых данных.

## Technical debt

Денежный участок: отдельный коммит, ревью диффа агентом перед коммитом; полная проверка типов недоступна по памяти —
узкая проверка файлов дня.

## Verification

Тест кнопок окна и сопоставления выбора; paywall_plus_resilient_checkout и прочие сторожа пейвола; ревью.

## Rollback

git revert коммита.
