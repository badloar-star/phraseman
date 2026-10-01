# PM-237 — Backup/restore source gate

Дата evidence: 2026-10-01  
Область: локальный versioned manifest; Firestore/Storage/device не использовались.

## Проверенный контракт

- `accounts-v2-migration-backup.v1` содержит `uidHash`, timestamp, канонический JSON операций, SHA-256 содержимого и отсортированные refs entity/operation.
- `verifyMigrationBackup` проверяет schema, timestamp, JSON-массив, content hash и refs; tamper в payload, refs или schema отвергается.
- `restoreMigrationBackup` сначала проверяет manifest, затем возвращает восстановленный набор batch/operation/entity refs. Наличие файла само по себе не считается rollback evidence.
- Реальный apply/restore в Firestore, backup export, device restore, purge и production не выполнялись.

## Evidence

- RED: до реализации `TS2307` для `./backup_manifest`, 0 тестов.
- GREEN focused: `backup_manifest.test.ts` — 1 suite, 5/5 passed.
- Full migration: **9 suites, 197/197 passed**, exit 0.
- ESLint `src/accounts_v2_migration` — PASS.
- Functions TypeScript `npx tsc --noEmit --pretty false --incremental false` — PASS.
- No-network import closure расширен для `backup_manifest.ts`.

## Ограничения

PM-237 source gate не закрывает реальный backup/restore или rollback acceptance. Нужен отдельный Firebase Emulator/device прогон с восстановленным dataset и refs перед release.

## Принято Account V2 (2026-10-01, TG-4D4949E78A5B)

- `backup_manifest.ts` принят как **модель/контракт**: к рантайму не подключён (`migrate_mine`/`pull_mine` его не используют). `restoreMigrationBackup` **данные не пишет** — возвращает только проверенный набор refs. Записано в шапку файла.
- **Реальная защита данных при откате сегодня:** старое облако `users/{uid}` не удаляется (OD20: 30 дней, чистка только по команде владельца; `legacyCleanupPaths` → `[]`), перенос идемпотентен (повтор = `duplicate`), V2 включается/выключается флагами `config/accounts_v2`. Настоящий бэкап/восстановление Firestore (экспорт, эмулятор, прод) **не выполнялся**.
- Перепрогон: `cd functions && NODE_OPTIONS=--max-old-space-size=8192 npx jest --runInBand --watchman=false src/accounts_v2_migration/backup_manifest.test.ts` → Tests: 5 passed, 5 total.
