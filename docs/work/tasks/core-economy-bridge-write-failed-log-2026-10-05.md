# Task packet: [ECONOMY-BRIDGE] write_failed — причина сбоя записи покупки (только лог)

Governance-ID: TG-49D471B47539
Status: In progress (координатор 05.10: «ДА на одну правку… больше в этом файле ничего не трогать»)
Owner: сессия 1 · ЯДРО

## Outcome

В commitPhoneStateNonMonetaryEconomyGrant (app/phone_state_economy_bridge.ts) немой `catch { return false; }` — сбой
записи покупки/начисления в очередь PhoneState не оставляет следа. Добавить console.warn('[ECONOMY-BRIDGE] write_failed')
с причиной, видом, суммой и id операции. `return false` остаётся.

## Scope

Только этот catch. Тест: при сбое store.commit — по-прежнему false и есть строка лога.

## Architecture

Не меняется.

## Security and privacy

Без uid: вид, сумма, id операции, текст причины.

## Technical debt

Новый долг не вносится. Остаётся известный: ранние `return false` на проверках отпечатка/владельца в этой же функции
без лога — по указанию координатора в этом шаге не трогаются (только catch).

## Verification

Новый тест + tests/phone_state_economy_bridge.test.ts + тесты кошелька.

## Rollback

git revert коммита.
