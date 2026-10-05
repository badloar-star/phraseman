# Task packet: шаг 1а — досыпка outbox шардов после первого кадра Главной (деньги, только перенос)

Governance-ID: TG-D15247B7BFE4
Status: In progress (ОК координатора 05.10 на порядок 1а → К1 → замер 05:26 → К2; перед коммитом ревью opus)
Owner: сессия 1 · ЯДРО

## Outcome

Пакеты 03:26/04:26: backfillClientShardPhoneStateOutbox держит замок аккаунта + storage-замок 3,4–5,2 с на холодном
старте (полный getAllKeys + multiGet корней + запись outbox), за ним стоят кошелёк монет, курс, оформление.
Шаг 1а: тот же вызов (и следом drainClientShardPhoneStateOutbox) запускать после первого кадра Главной
(runAfterHomeFirstFrame). ЛОГИКА НЕ МЕНЯЕТСЯ.

## Scope

app/phone_state_runtime.ts — только место запуска цепочки backfill → drain (строки ~596–600). Сам
client_shard_operation_ledger.ts не трогается. Customization drain — не в этом шаге.

## Architecture

Новые операции шардов кладутся в outbox сами в момент записи (enqueuePhoneStateMirror) — досыпка лишь подбирает
старые корни; задержка на секунды после первого кадра ничего не теряет. Функция сама сверяет поколение аккаунта
(смена аккаунта до запуска → no-op). Вне холодного старта (вход в аккаунт по ходу) событие первого кадра уже
защёлкнуто — запуск почти сразу.

## Security and privacy

Деньги (шарды): поведение досыпки и выгрузки не меняется, меняется только момент запуска. Без деплоя.

## Technical debt

Шаг 1б (чтения вне замка) — после замера 05:26 и решения координатора.

## Verification

client_shard_operation_ledger, phone_state_runtime_install, pm211 + сторож места запуска; ревью opus; замер 05:26.

## Rollback

git revert коммита.
