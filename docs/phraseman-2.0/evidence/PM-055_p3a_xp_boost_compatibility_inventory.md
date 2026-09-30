# PM-055 P3a — inventory совместимости XP-бустов

Дата: 2026-09-26  
Статус: preflight; не разрешает удаление, миграцию, выпуск или изменение
Firestore Rules/Functions.

## Контекст

P1 сделал `app/xp_manager.ts` нейтральным: legacy XP-бусты больше не читаются
и не меняют начисление XP. P3a фиксирует, какие записи всё ещё могут
выдаваться, отображаться, истекать или синхронизироваться, чтобы их removal не
лишил пользователя уже выданной ценности и не сломал restore.

| Ключ / контур | Проверенные writers | Readers / replica | Риск при преждевременном удалении |
|---|---|---|---|
| `gift_xp_multiplier` | `app/level_gift_system.ts`; `functions/src/admin_grant.ts`; `functions/src/friend_gifts.ts` | `app/cloud_sync.ts` сохраняет/восстанавливает root + `progress`; legacy readers остаются в `level_gift_system.ts` | Потеря выданного временного gift и нарушение межустройственного restore. |
| `club_gift_free_boost_v1` | `app/club_boosts.ts`; `app/season_reward_apply.ts`; `app/level_gift_system.ts`; серверная transaction в `functions/src/league_groups.ts` | `app/cloud_sync.ts` сохраняет/восстанавливает root + `progress`; server transaction расходует ваучер idempotently | Удаление поля/producer может изменить оплаченный или выданный бесплатный вход в league activation. |
| `league_personal_boost_v1` | `app/league_personal_boosts.ts`, season reward flow | `app/level_gift_active_inventory.ts`; local TTL-state | Потеря активного duration-state и рассинхрон UI/expiry. |
| `season_golden_lesson_v1` | `app/season_reward_apply.ts` | `season_reward_apply.ts`; active-gift inventory | Потеря оставшихся charge у season reward. |
| `league_chest_xp_override_v1` | `functions/src/league_chest.ts`; `app/services/league_chest_rewards.ts` | local chest reward service, remaining-use/expiry ledger | Потеря уже полученной награды или нарушение exactly-once claim/expiry. |

## Границы следующего изменения

1. Сначала каждому ключу назначить canonical owner, формат, TTL/uses, writers,
   readers и policy для уже существующих значений: preserve, expire naturally
   или reversible migration marker.
2. Добавить contract-тесты: legacy значения восстанавливаются/сохраняются по
   текущему контракту, но не могут влиять на `registerXP`.
3. Лишь после этого отдельно рассматривать закрытие acquisition UI, client
   producers и server producers. Это затрагивает виртуальную ценность и
   entitlements, поэтому требует `BASELINE_SHA_APPROVED`,
   `DOMAIN_AUDIT_AND_IMPACT_ACCEPTED`,
   `MIGRATION_AND_ROLLBACK_APPROVED_BEFORE_DESTRUCTIVE_CHANGE` и проверки
   Plus/purchase compatibility.

## Неподтверждённое

- Не доказано, что каждый перечисленный reward был куплен за реальные деньги:
  некоторые используют runes или бесплатные выдачи. Но их уже выданная
  пользовательская ценность и sync semantics делают удаление чувствительным.
- Не выполнялись production reads, data migration, cloud deployment или
  Firestore Rules changes.
