# PM-235 — Migration version и совместимость клиентов

Дата evidence: 2026-10-01  
Область: чистый контракт функций, без Firestore, без device, без apply/purge.

## Принятый контракт

- `schemaVersion = 1` — версия контракта совместимости миграции; она не меняет `ACCOUNTS_V2_SCHEMA_VERSION` конверта операции.
- Фазы: `legacy` → `dual_write` → `v2_cutover` → `purged`.
- В `legacy` V2 ещё закрыт. В `dual_write` оба протокола могут читать/писать, но V2 требует проверенный hydration marker.
- После `v2_cutover` legacy-read остаётся разрешённым для rollback window, но legacy-write блокируется; V2 read/write разрешены только после hydration.
- После `purged` старый протокол полностью блокируется.
- Cutover разрешается только при `ready`, `applyAllowed=true`, `pendingDomainCount=0`, проверенном hydration и backup, пока rollback window открыт.
- Purge разрешается только из `v2_cutover`, при выключенном legacy sync, тех же миграционных gates и закрытом rollback window. До purge rollback доступен только при подтверждённом backup и открытом окне.
- Неподдержанная schema version, HOLD, pending domain, неподтверждённые hydration/backup и несоответствующая фаза блокируют переходы. Функция ничего не меняет сама.

## Реализация

- `functions/src/accounts_v2_migration/compatibility.ts`
- `functions/src/accounts_v2_migration/compatibility.test.ts`
- `functions/src/accounts_v2_migration/no_network.test.ts` — compatibility module добавлен в import-closure guard.

## Evidence

- RED до реализации: Jest не смог разрешить `./compatibility` (`TS2307`), 0 тестов.
- GREEN: `npx jest --config jest.config.js --runInBand --watchman=false --no-cache src/accounts_v2_migration` — **7 suites, 187/187 passed**, exit 0.
- ESLint: `npx eslint src/accounts_v2_migration` — **PASS**.
- TypeScript: `npx tsc --noEmit --pretty false --incremental false` из `functions/` — **PASS**, exit 0.
- Контрактные случаи: unsupported schema, dual-write read/write, hydration gate, legacy-write block, cutover/purge gates, rollback до/после purge.

## Ограничения

Это source/spec gate. Он не доказывает работу на устройстве, реальный Firestore cutover, backup/restore, production purge или готовность старого клиента к обновлению. Эти проверки остаются PM-236/PM-237 и runtime/release gates.

## Принято Account V2 (2026-10-01, TG-4D4949E78A5B)

- Файлы `compatibility.ts` / `compatibility.test.ts` приняты как **модель/контракт**: к рантайму не подключены (их импортирует только `two_device_idempotency.test.ts`), подключение — отдельным решением. В шапку `compatibility.ts` записано сопоставление фаз с настоящими флагами (`config/accounts_v2.syncEnabled`, `accounts_v2_client_enabled`, `accounts_v2_legacy_sync_disabled`, OD20) и расхождение модели с рантаймом.
- **Поправка к «Принятому контракту»:** «после `v2_cutover` legacy-write блокируется» — верно только для модели и для НОВОГО клиента (выключатель 7A). Старые версии приложения сервер не блокирует (серверного min-version нет, PM-235 T2); E2E J (квитанция 5b18dd743) подтвердил: правки старого телефона после переноса V2 не видит. Отсюда предусловие 7B — force_update + min_app_version.
- **Поправка к «purged»:** фаза в рантайме не существует — чистка старых данных (OD20) не реализована, `legacyCleanupPaths` → `[]`.
- Перепрогон (2026-10-01, по одному файлу, `cd functions && NODE_OPTIONS=--max-old-space-size=8192 npx jest --runInBand --watchman=false <файл>`): `compatibility.test.ts` — Tests: 11 passed, 11 total; `no_network.test.ts` — Tests: 28 passed, 28 total. Числа «187/187» выше — исторические (прогон Codex на тогдашнем HEAD).
- Карта по фактическому коду: `PM-235_migration_version_compat.md`.
