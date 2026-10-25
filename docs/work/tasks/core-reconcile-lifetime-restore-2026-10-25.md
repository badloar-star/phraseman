# Ядро · подтяжка Plus «навсегда» из RevenueCat; сброс задержки подтяжки при восстановлении; причина отказа осколков (25.10)

Governance-ID: TG-FAF12C29F675

## Outcome
Решение координатора 25.10 по разбору «оплата в отсрочке удаления»: в отсрочке оплату НЕ принимаем (вебхук как есть). Чтобы
купленное за 14 дней вернулось после восстановления:
1. revenueCatPremiumReconcileMine берёт не только подписки, но и разовую покупку «навсегда» (RevenueCat v2
   /customers/{id}/purchases, только phraseman_premium_lifetime_v1) — то же синтетическое событие с отдельным id
   (NON_RENEWING_PURCHASE). Журнал [PREMIUM-RECONCILE]: что пришло, что применено, почему пропущено.
2. accountDeleteRestoreMine после восстановления сбрасывает задержку подтяжки, чтобы Plus вернулся на первом же входе (а не через 6 ч).
3. Осколки/руны, отклонённые в отсрочке, не подтягиваем (живых случаев 0); в их отказ — понятная причина для поддержки + памятка
   docs/work/support-paid-during-account-deletion-grace.md.
Без выкладки — вместе с 713677ddd по «да» владельца.

## Scope
- functions/src/revenuecat_reconcile.ts: eligibleLifetimePurchase / selectEligibleLifetimePurchase / fetchEligibleLifetimePurchase
  (страницы только по /customers/{id}/purchases, тот же белый список хоста и проекта), mapLifetimePurchaseToSyntheticEvent
  (id `rc_reconcile_lt_<hash от id покупки>`), ветка в reconcileMine ПОСЛЕ подписок (подписки — как раньше); необязательная
  функция применения для тестов.
- functions/src/account_delete_restore.ts: в транзакции восстановления — удалить revenuecat_reconcile_reservations/{reservationId}.
- Причина отказа осколков: НЕ применимо — товары сняты (D103/D136/D139), вебхук их игнорирует (`retired_product`),
  `revenuecat_shard_denials` нигде не пишется. revenuecat_shards.ts не трогаем; суть — в памятке поддержке.
- Тесты: выбор и сопоставление «навсегда», цепочка «восстановили → подтяжка применила "навсегда" → повтор не задваивает»,
  подписки по-прежнему первыми, сброс задержки в восстановлении.

## Architecture
Синтетическое событие идёт через тот же applyVerifiedPremiumSubscriptionEvent (линия оплаты, квитанции, проекция) — повтор того
же события упирается в квитанцию «duplicate». Разовая покупка отбирается строго: production, ownership purchased, status owned
(не refunded), app_store/play_store, активное право premium, наш lifetime-продукт (проверка по store_identifier продукта).

## Security and privacy
Новых данных нет; запросы только к api.revenuecat.com нашего проекта с тем же секретом. В журнал — без идентификаторов покупок
(короткий хэш) и без uid.

## Technical debt
Осколки/руны в отсрочке — ручной путь поддержки (памятка), автоматической подтяжки нет.

## Verification
Тесты revenuecat_reconcile.test.ts (существующие + новые), account_delete_restore-тесты, узкая проверка типов functions.

## Rollback
Откат коммита (сервер не выложен).
