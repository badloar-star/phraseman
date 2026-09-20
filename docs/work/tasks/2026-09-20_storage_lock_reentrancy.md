# Самозахват storage-замка: покупка за руны висела вечно

Governance-ID: TG-28C3A76504DA
Governance-ID: TG-655AC799085B
Governance-ID: TG-BC3F247A0302

## Outcome

Покупка диалога за руны доходит до конца и открывает диалог. Тот же класс
бага закрыт и в покупке наборов карточек, где он был ровно такой же.

## Диагноз (по логам, не по догадке)

`.expo/metro-console.log`, 19:17:10:

```
[RUNES-BUY] step 6 before_read_balance
<step 7 НЕ НАСТУПАЕТ НИКОГДА>
[RUNES-BUY] briefing:tap_ignored busy=true   (xN)
```

Цепочка самозахвата:

1. `buyDialogAccessLocally` берёт `withStorageLockDeadline` — `_locked = true`.
2. Внутри зовёт `readUnifiedLevelSpinStars(token, lease)`.
3. `recoverProjection` наследует замок АККАУНТА через lease (починено 20.09,
   коммит a642f81ad) — эта половина работает.
4. Но `app/level_spin_star_grants.ts:832` зовёт `withStorageLock(...)` БЕЗ
   наследования — встаёт в очередь за замком, который держит сам вызывающий.
5. `acquireStorageLock()` ждёт вечно, step 7 не наступает.

Дедлайн снаружи от этого не спасает ПО ПОСТРОЕНИЮ: он режет только ожидание
в очереди, а здесь работа уже началась и висит внутри.

Прошлая сессия починила наследование у замка аккаунта и остановилась.
Второй замок — `storage_mutex` — остался глобальным булевым флагом без
понятия владельца, реентерабельности в нём нет вообще.

## Scope

- `app/storage_mutex.ts` — lease-наследование, зеркально замку аккаунта.
- `app/level_spin_star_grants.ts` — проброс lease в точки `withStorageLock`.
- `app/ai_dialog_ownership.ts` — покупка передаёт свою аренду.
- `app/community_packs/packPurchase.ts` — тот же дедлок, та же починка.
- `tests/storage_lock_reentrancy_contract.test.ts` — сторож.

## Architecture

Механизм НЕ новый: точная копия `activeAccountTransitionLockLeases`
(WeakSet + непрозрачный `Object.freeze({})`). Один способ наследования на оба
замка — иначе следующая сессия будет чинить третий.

`withStorageLock` без lease ведёт себя ровно как раньше — сотни точек вызова
не трогаются.

## Security and privacy

Данных не касается. Новых полей, сторонних сервисов и разрешений нет —
privacy policy не затрагивается.

## Technical debt

Остаётся: сотни точек `withStorageLock` по-прежнему ждут вечно. Класс бага
может повториться на третьей паре вложенных вызовов. Сторож ловит
конкретно связку покупка → чтение баланса.

## Verification

- `tests/storage_lock_reentrancy_contract.test.ts` — вложенный вызов с lease
  проходит насквозь и замок отпускается (сам дедлок в тесте НЕ
  воспроизводится намеренно: повисший вызов занял бы общий замок навсегда
  и уронил соседние тесты).
- `tests/account_lock_reentrancy_contract.test.ts` — не сломан.
- Точечная проверка типов по затронутым файлам.
- Владелец воспроизводит покупку на телефоне: в логе обязаны появиться
  step 7..12 и `briefing:bought`.

## Rollback

`git revert` одного коммита. Файлы не относятся к Арене/Лигам/MAX.
