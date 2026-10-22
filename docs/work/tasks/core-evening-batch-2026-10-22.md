# Task packet: вечерняя пачка Ядра 22.10 — хвост «Дневного пути», инвентарь Learning V2, метрика limits_flag, хотфикс OTA Пика

Governance-ID: TG-A3328E012D30
Status: В работе. Решения координатора и кнопки владельца 22.10 (вечер).
Owner: Ядро (сессия 1).

## Outcome

1. Старые операции «Дневного пути» без `promotionEligibility` принимаются кошельком как gameplay (кнопка владельца «Да, выложить»). Явное `excluded_compensation` — по-прежнему отказ, потолок пути 2000/сутки остаётся. Коммит со сторожем; выкладку `levelSpinStarGrant` запускает координатор по точной команде.
2. Инвентарь переноса Account V2: `learning_v2_course_progress_sync_v1` и `learning_v2_course_masks_sync_v1` → keep_in_place (координатор, решение 3).
3. Лог-метрика по `[COIN-WALLET] limits_flag` + алерт, без чтений Firestore (координатор, решение 2).
4. План хотфикса OTA: прошлый OTA + ТОЛЬКО коммит вершины Пика, отдельная папка экспорта, без ветки и worktree. Выпуск — только с «да» владельца у координатора.

## Scope

- `functions/src/coin_wallet_policy.ts` (`assertJourneyShape`) + тест-сторож.
- `functions/src/accounts_v2_migration/inventory.ts` (правило progress).
- Cloud Logging / Monitoring: одна метрика и одна политика алерта (конфигурация облака, без кода).
- Снимок OTA во временной папке `C:\Temp\claude\ota_hotfix_*` (вне репозитория).

## Architecture

- Отсутствие поля у старой операции — это не решение «давать или нет», а отсутствие разметки: операции ставились в очередь до появления поля. Закон «сервер хранит, а не решает».
- Перенос: курс Learning V2 уже живёт в хранилище 2.0, переносить нечего, поле остаётся на месте.

## Security and privacy

Новых данных нет. Метрика считает строки журнала без uid.

## Technical debt

Выкладка `levelSpinStarGrant` из чистого HEAD унесёт и `lessontogether_`/`stars_2` (652953424). Без клиента это инертно, координатор предупреждён.

## Verification

Тесты политики кошелька и `level_spin_star_grant`, PM-080, сторож переписи корня и инвентаря, сухой прогон выкладки. Для OTA — сверка строк Hermes с прошлым OTA.

## Rollback

Функция — прежняя ревизия `levelspinstargrant-00010-kin`. Инвентарь — откат коммита. Метрика и алерт — удаление по имени. OTA — `eas update:rollback`.
