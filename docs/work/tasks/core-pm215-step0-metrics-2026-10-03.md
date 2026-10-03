# Task packet: PM-215 шаг 0 — только метрики очереди хранилища (без изменения поведения)

Governance-ID: TG-C4FE8B6C694B
Status: Done — метрики 3/3, замок 5/5+5/5, cold_start_io 2/2, pm220 6/6, тайпчек 0
Owner: Ядро; координатор §115 («шаг 0 (только метрики) — ДА, сейчас»)

## Outcome
Добавить измерения глобального замка `app/storage_mutex.ts` (один FIFO на ~20 файлов): максимальная глубина очереди, максимальное ожидание, число ожиданий > 1 с, максимальное удержание; предупреждение `[STORAGE-LOCK] slow_wait wait=… depth=…` при ожидании > 1 с (с потолком числа строк); итог — в строке `[COLD-START-IO] summary … lock={…}`. Поведение замка (порядок FIFO, наследование аренды, дедлайн) не меняется.

## Scope
app/storage_mutex.ts, app/cold_start_io_trace.ts, новый тест tests/storage_mutex_metrics.test.ts.

## Architecture
Счётчики в памяти модуля; `getStorageLockMetrics()` — снимок; `resetStorageLockMetricsForTests()`. Ожидание меряется от постановки в очередь до выдачи замка; удержание — длительность fn в withStorageLock / withStorageLockDeadline.

## Security and privacy
Только числа, без ключей и значений. Локально (logcat / консоль бандлера), на сервер не уходит.

## Technical debt
Принято: временное (по PM-215 шаги 1–4); строки slow_wait ограничены 20 за процесс, чтобы не шуметь.

## Verification
tests/storage_mutex_metrics.test.ts (FIFO прежний, метрики считаются, дедлайн-ветка учитывается); существующие тесты замка и холодного старта; тайпчек файлов.

## Rollback
git revert (только наблюдение).

## Замер «Дизайна» (03.10 ~22:50, store, Pixel_8 2 ядра/2 ГБ, 3 холодных старта) и вывод
- lock: maxQueueDepth 0, maxWaitMs 0, slowWaits 0, deadlineTimeouts 0 во всех трёх; maxHoldMs 2547/233/384 → очереди на замке нет, шаг 4 (дедлайн/приоритет замка) НЕ нужен; разово 2,5 с удержания на первом старте — кандидат для разбора.
- calls 404/533/532 — выше потолка PM-220 (520): AS.getAllKeys n=15, пустые AS.multiGet:[0] n=10, required-session-completion-scheduler n=10, stable_auth_link_cache 14–16, premium_active 7–14, mistake_practice 15.
- Добавлено (логи, по правилу «сперва логи»): итог [COLD-START-IO] получает `callers=[…]` — источник (2 кадра стека вне трассировки) для AS.getAllKeys и пустых multiGet; coldStartIoCallerTag + tests/cold_start_io_callers.test.ts 3/3.
