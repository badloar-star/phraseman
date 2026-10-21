# Task packet: монеты после смены аккаунта — сервер главный (A1) + пустая проекция не пишется (A2)

Governance-ID: TG-DD043009429E
Status: В работе
Owner: 5 · ВХОД И АККАУНТ (совместно с 1 · Ядро по кошельку); проверка — 11 · Ревизор

## Outcome

Решение владельца 21.10 (№1, «сервер — главный»): после смены аккаунта и возврата монеты не обнуляются. Диагноз (отчёт 21.10):
1) после входа экраны читают монеты раньше долива аварийной копии, recoverProjection пишет пустую проекцию с нулём,
   долив копии пропускает существующий ключ и удаляет копию (account_switch_backup_restore.ts:767/866/815);
2) после входа никто не вливает серверный кошелёк users/{uid}.stars в проекцию.

## Scope

- app/level_spin_star_grants.ts:
  - A2: recoverProjection не записывает проекцию, если её не было на диске и она пустая (0 операций, 0 подтверждений,
    баланс/заработано/seq 0, без разницы и свёрнутых трат). Журнал [COIN-DIVERGENCE] recover:empty_not_persisted.
  - A1: adoptServerWalletFromUserDoc(token, stars, source) — разбор users/{uid}.stars {balance, earnedTotal, seq} и вливание
    через mergeLevelSpinServerStars (только более новый seq; при неподтверждённых начислениях база не трогается).
    Журнал [COIN-DIVERGENCE] server_wallet:*.
- app/cloud_sync.ts: restore отдаёт users/{uid}.stars вызывающему через CloudRestoreOptions.onServerStars (0 лишних чтений —
  документ уже прочитан). Сам НЕ вливает: безопасное умолчание.
- app/auth_provider.ts (scheduleSameStablePostAuthRefresh): вливание ПОСЛЕ долива аварийной копии; поздний ответ restore
  после долива — вливается сразу. Журнал [ACC-MUT].
- app/_layout.tsx (восстановление на старте) и app/auth_clean_install_recovery_adoption.ts — вливание сразу после restore.
- Тесты: гонка «чтение монет до долива копии» в aa_account_switch_roundtrip_scenario, пустая проекция, вливание сервера.

## Architecture

Вливание идёт только через существующий канал серверных снимков (mergeLevelSpinServerStars) — его правила «только новее
seq», «не трогать при неподтверждённых начислениях», Q-COIN a (локальная разница при seq 0) уже проверены. Порядок
«копия → сервер» сохраняет локальные подтверждения и неотправленные начисления из копии.

## Security and privacy

Новых данных нет: users/{uid}.stars клиент уже читает (firestore.rules). В журнал — только числа, без uid.

## Technical debt

«Вернуть монеты за прошлое» (бэкфилл кошелька курса) — отдельным коммитом. Первый кадр Главной у нового гостя без монет
покажет «неизвестно» до первой публикации (раньше — 0 с диска).

## Verification

Точечные тесты через светофор: aa_account_switch_roundtrip_scenario, coin_divergence_cold_start, coin_compaction_logs_contract,
runes_balance_read_quality, новые проверки. Проверка Ревизора (денежный путь) после коммита.

## Rollback

`git revert <hash>` — возвращается прежнее поведение (нулевая проекция пишется, сервер не вливается).
