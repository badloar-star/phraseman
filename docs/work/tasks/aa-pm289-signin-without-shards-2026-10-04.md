# Task packet: PM-289 — вход без шагов шардов (срез из AccountV2)

Governance-ID: TG-A679FAEBB1DE
Governance-ID: TG-A6B9C3190FFA
Governance-ID: TG-B9AA836FC8CD
Status: Planned (после S1d)
Owner: Claude session (Account Authority 2.0); поручение координатора

## Outcome
Убрать из потока входа шаг `loadShardsFromCloud` (`app/auth_provider.ts` ~3231) и импорт `shards_pending_grants` (~4056), если после анализа подтверждено, что шарды в 2.0 больше не участвуют во входе. На месте снятого шага — лог `[AUTH-SHARDS] шаг шардов снят` (один раз за вход, без id). Денежный журнал `client_shard_operation_ledger` НЕ трогать (отдельная задача с миграцией). Время входа должно уменьшиться — замер до/после (тест-хронометраж на моках или трассировка шагов входа с длительностями; честно указать метод).

## Анализ перед удалением (обязательно, сперва)
- grep всех читателей/писателей: `loadShardsFromCloud`, `shards_pending_grants`, ключей шардов в AsyncStorage/снапшоте, `shard` в auth_provider/cloud_sync/_layout/экранах.
- Ответить: (1) живут ли шарды в 2.0 (решения в docs/phraseman-2.0/03_DECISIONS.md: руны/монеты/шарды — что заменено чем); (2) кто отображает баланс шардов и что увидит человек без шага загрузки на входе (не должно быть «0 вместо баланса» — правило «нет ноля-потом-прыжка»); (3) не теряются ли начисления (pending grants) — если они ещё могут прийти с сервера, удаление их применения на входе = потеря валюты → ОСТАНОВИТЬСЯ и написать координатору вместо удаления.
- Если шаг нужен частично — перенести в фон после входа, а не удалять.

## Scope
`app/auth_provider.ts` (только этот шаг/импорт), тесты входа; другие файлы — только если анализ покажет мёртвых потребителей, и только с явным списком. `client_shard_operation_ledger` — вне объёма.

## Architecture
Вход короче на один сетевой шаг; шарды (если живы) — фоном/лениво.

## Security and privacy
Нет новых данных.

## Technical debt
Журнал шардов — отдельная задача с миграцией (координатор).

## Verification
Тесты входа (auth_provider_behavior и др.) зелёные; тест «вход не вызывает loadShardsFromCloud»; мутация; тайпчек; замер до/после; независимое ревью (деньги → security).

## Rollback
git revert.

## Итог исполнителя PM-289 (2026-10-04)

**Анализ (до правок).**
- Жемчуг (шарды) в 2.0 удалён: D70 (без компенсации), D84 (обнуляет только клиент), D103 (купленный тоже сгорает, пакеты сняты с продажи), D139 (приём покупок на сервере удалить). Баланс нигде не показывается: `app/shards_shop.tsx` — редирект на `/flashcards_my_packs`; `getShardsBalance` читают только `pearl_retire_d70.ts:202` (лог) и `shards_system.ts:226`. Трат нет: `commitClientShardOperation` зовёт только `pearl_retire_d70.ts:178`. «Ноля-потом-прыжка» быть не может — показывать нечего.
- Начисления не теряются: писатели журнала ожиданий удалены (`shards_pending_grants.ts:5-8` — остался только снос ключей при удалении); `loadShardsFromCloud` pending grants не применял вовсе (`shards_system.ts:183-239` — только открытие журнала: до 2 чтений Firestore `users/{uid}` и `client_economy_opening/v1`).
- Последствие снятия: на НОВОМ устройстве журнал жемчуга не открывается → `pearl_retire_d70` выходит `ledger_not_initialized` (`pearl_retire_d70.ts:146-150`) — локально обнулять нечего; облачный `users/{uid}.shards` по D84 не трогаем. Импорт экономики PhoneState переносит `openingBalance === null` (`phone_state_runtime.ts:289-291`).
- Снос `pending_shard_grants_*` при удалении аккаунта избыточен: `finishAccountDeletion` идёт только после проверенного `AsyncStorage.clear()` (`executePostDeleteLocalWipe` → `verifyPostDeleteLocalWipe`, остаться может лишь `ACCOUNT_DELETE_PENDING_AUTH_KEY`); префиксы есть в `ACCOUNT_LOCAL_KEY_PREFIXES` (`cloud_sync.ts:697-701`).

**Сделано (только `app/auth_provider.ts` + тесты).**
- импорт `loadShardsFromCloud` убран (`forceSyncShardsToCloud`, `preparePendingShardDeltasForAccountSwitch` для смены аккаунта не тронуты);
- в `scheduleSameStablePostAuthRefresh` шаг `loadShards` и проверка `stale_after_shards` заменены логом `[AUTH-SHARDS] шаг шардов снят stage=<stage>` (без id);
- в `finishAccountDeletion` ленивый импорт `./shards_pending_grants` заменён логом `[AUTH-SHARDS] delete: …`; из деструктуризации убран ставший неиспользуемым `pendingDeleteStableId`;
- `client_shard_operation_ledger` не тронут.

**Тесты:** новый в auth_provider_behavior «sign-in background refresh no longer loads the retired pearl journal (PM-289)» (до правки красный: вызов 1 раз); контракты post_auth_generation_guard_contract и shards_shop_account_identity_contract переведены на «не содержит». Прогон по одному: auth_provider_behavior 106/106, auth_provider_stable_link 35/35, account_authority_legacy_callsite_guard 31/31, post_auth_generation_guard_contract 2/2, shards_shop_account_identity_contract 3/3, auth_clean_install_recovery_adoption 13/13, referral_bootstrap_activity_gate 5/5. economy_constitution_contract — 1 падение, существующее независимо от этой задачи (ждёт однострочный `if (finalResidue.length > 0) throw …` в cloud_sync.ts; в HEAD он тоже многострочный).
**Мутации:** (1) возврат шага входа → красные PM-289-тест и контракт post_auth; (2) возврат импорта в удалении → красный контракт shards_shop. Восстановление сверено cmp.
**Тайпчек:** exit 0, 0 ошибок. **PM-229:** PASS.
**Замер (моки, трассировка [SIGNIN]):** до — `bg:created_restore:loadShards ok 0ms`; после — шага нет. На моках шаг стоил 0 мс; итоговые total (1730 → 64 мс) задаёт разброс мока revenueCat, к правке не относятся. Реальный выигрыш — минус один await и до 2 чтений Firestore в ФОНЕ после входа (экран входа их и раньше не ждал).
**Хвост для координатора:** мёртвыми стали `loadShardsFromCloud` (shards_system.ts) и весь `app/shards_pending_grants.ts` (+ тесты shards_cloud_generation_guard, shards_pending_grants_account_race, часть economy_constitution_contract) — удалить отдельным пакетом по D78.

## Попутно (AA, долг S2c 5c0c5e234)
`tests/economy_constitution_contract.test.ts` ждал однострочный `if (finalResidue.length > 0) throw new Error(...)`; S2c сделал блок с логом `[ACC-SWITCH-WIPE] residue`. Проверка переписана на смысл: при остатке после стирания — лог и throw account_wipe_incomplete.
