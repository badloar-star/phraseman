# Task packet: 8G — progressMigrateSnapshot не должен затирать progress пустым снимком

Governance-ID: TG-6FDDD994F361
Status: Done (SPEC+SECURITY APPROVE) — ВЫЛОЖИТЬ В БЛИЖАЙШУЮ ВЫКЛАДКУ ФУНКЦИЙ
Owner: Claude session (Account V2, /loop) — найдено E2E второго захода (квитанция 66270d794)

## Outcome

E2E 2026-10-02: на чистой установке у аккаунта без `users/{id}/progress_migrations/client_snapshot_v1` вызов `progressMigrateSnapshot` (functions/src/progress_events.ts:968) с пустым локальным снимком строит `patch = {}` и пишет `tx.set(userRef, { progress: patch, … }, { merge: true })`. В Admin SDK пустой map при merge — лист → поле `progress` ЗАМЕНЯЕТСЯ пустым: уроки/карточки/библиотека в старом облаке стираются ДО переноса OD21 (`accountsV2MigrateMine` затем `done ops=0`). Это существующий прод-код (не только V2): риск для любого вернувшегося пользователя без маркера.

1. **Сперва доказательство/логи:** тест на реальной семантике (Firestore emulator или проверка поля маски Admin SDK) — пустой patch затирает progress; постоянный лог `[PROGRESS-MIGRATE]` на каждом решении (размер снимка, размер patch, есть ли existing, ветка) без uid.
2. **Починка:** если patch пуст — НЕ писать поле `progress` (только маркеры/время), и вообще никогда не заменять `progress` целиком: писать точечными путями (`progress.<key>`) или merge, гарантированно не удаляющий существующие ключи. Проверить `buildMigrationPatch`: может ли он вернуть меньше ключей, чем existing (тогда merge тоже не должен удалять). Маркер миграции ставить так же (чтобы не повторялось), либо не ставить при пустом снимке — выбрать безопасное и обосновать.
3. **Оценка масштаба (без прода):** read-only скрипт/план агрегата `.count()` для владельца — сколько users без `progress_migrations/client_snapshot_v1` (только по команде владельца).

## Scope

functions/src/progress_events.ts (только progressMigrateSnapshot/buildMigrationPatch), тесты, скрипт-план. Out of scope: деплой, прод, клиентский вызов (если нужен — отдельно).

## Architecture

Запись точечными путями вместо замены объекта; пустой снимок = no-op для данных.

## Security and privacy

Без новых данных; логи без uid.

## Technical debt

Accept temporarily: уже затёртые у кого-то в проде данные этой правкой не восстанавливаются (масштаб — по агрегату владельца; восстановление из бэкапа — отдельно).

## Verification

RED (пустой снимок стирает progress) → GREEN, мутации, затронутые functions-тесты по одному, независимое ревью. Порядок выкладки: функции — в ближайшую выкладку (это защита данных).

## Rollback

git revert.

## Итог исполнителя (2026-10-02)

**Доказательство (настоящий Admin SDK, без сети и без эмулятора).** `@google-cloud/firestore` (тот, что внутри firebase-admin) строит для `batch.set(ref, { progress: {}, updatedAt }, { merge: true })` маску `["progress", "updatedAt"]` — пустой map при merge = лист, поле `progress` ЗАМЕНЯЕТСЯ пустым. Для непустого `{ progress: { lesson1_cellIndex } }` маска — `progress.lesson1_cellIndex` (существующие ключи не трогаются). Тест `functions/src/progress_migrate_snapshot_8g.test.ts` проверяет именно эту маску.

**`buildMigrationPatch`** только добавляет/повышает ключи (cellIndex — если больше, progress-массивы — если «счёт» больше), значения — строки-листья; ключей не удаляет. Значит, опасен был только пустой patch.

**Починка** (`functions/src/progress_events.ts`, только progressMigrateSnapshot): чистая функция `planProgressMigration` + запись по плану.
- уже перенесено → ничего не пишем (как было);
- **пустой снимок (0 ключей) → ничего не пишем и маркер НЕ ставим.** Обоснование: переносить нечего; маркер закрыл бы перенос навсегда для устройства, у которого локальный прогресс есть (маркер — на аккаунт, не на устройство). Цена — нет: клиент ставит свою локальную отметку «перенесено» независимо от ответа сервера, повторных вызовов с этого устройства не будет;
- ключ `progress` попадает в запись ТОЛЬКО с непустым patch (маска — `progress.<ключ>`);
- снимок есть, но сервер не хуже (patch пуст) → маркер и служебные поля (`progressServerAuthoritative`, время), без `progress` — прежнее поведение минус затирание.
- Лог `[PROGRESS-MIGRATE] decision=… snapshot_keys=… existing_keys=… user_exists=… patch_keys=…` без uid на каждом проходе.

**Тесты.** RED: на исходном файле новый тест не собирается (нет плана), а тест маски SDK показывает дефект старой записи (`progress: {}` → маска `progress`). GREEN: 8G 7/7. `progress_events.test.ts` — 28/29, красный `recognizes server-owned progress keys` (`user_total_xp`) — **был красным до пакета** (проверено на исходнике), к 8G не относится. Типы и eslint своих файлов — чисто.

**Мутации 4/4 пойманы:** пустой снимок не пишет, `progress` только с непустым patch, «уже перенесено», запись в callable идёт по плану.

**Оценка масштаба (только по команде владельца).** `scripts/progress_migrate_marker_count.mjs` (+ `.test.mjs` 3/3): только агрегаты `count()` — `users`, `collectionGroup('progress_migrations')`, `users where progressServerAuthoritative == true`; оценка «без маркера» = users − маркеры (верхняя граница зоны риска до 8G). Без аргументов — план без сети; прод — только `--project=<id> --owner-command="…"`; запись запрещена (`--write/--fix/…` → код 2). Стоимость: ~1 чтение на 1000 записей индекса. Сам не запускал.

**Остаток.** Уже затёртые у кого-то в проде данные правкой не восстанавливаются (масштаб — по агрегату; восстановление — из бэкапа, отдельно). Выкладка: функции — в ближайшую выкладку (защита данных); клиент менять не нужно (ответ `migrated:false, reason:'empty_snapshot'` клиент игнорирует, как и раньше).
