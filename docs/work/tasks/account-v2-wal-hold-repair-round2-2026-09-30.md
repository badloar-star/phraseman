# Task packet: Account V2 — WAL SOURCE HOLD, раунд 2 (порядок событий хоста + факты aggregate)

Governance-ID: TG-5FD9FC083712
Status: In progress
Owner: Claude session (Account V2)

## Outcome

Закрыть две находки повторного ревью: (P1-регрессия) порядок событий dirty-hold в валидаторе должен позволять снять baseline WAL ДО команды launch, как требует пакет §5 Phase 2; (P2) aggregate PASS должен требовать остальные факты §8. Успех: authentic RED → GREEN, повторное ревью SOURCE APPROVE, строгие гейты.

## Scope

In scope только пять файлов: runtime-probes/android-account-sqlcipher-recovery/{probe.ts,index.js,run-proof.ps1}, tests/account_sqlcipher_wal_recovery_android_runtime_{probe,entrypoint}.test.ts. Плюс запись результата в PROGRESS.md.
Out of scope: устройство/эмулятор/ADB/сборка, staging, commit, P3.

## Architecture

Для всех фаз транскрипт начинается с `bootstrap-ack` (хост проверил pid/starttime); dirty-hold: `bootstrap-ack, baseline-bound, launch-ack, dirty-ready, wal-delta-validated, sigkill-sent, proc-gone`. Aggregate получает точный набор недостающих полей §8 с типизированной проверкой и сверкой `post − pre = dirtyDeltaFrameCount`.

## Security and privacy

Ключ, пути и SQL в маркеры не попадают; нет adb/shell-подстановок. Данных пользователей нет.

## Technical debt

Pay now: P1-регрессия, P2. Contain: P3 (pwsh 7, канонический JSON, скорость checksum, failure-evidence, cleanup) — в статус как открытые. Дополнение к пакету про маркер bootstrap_acknowledged фиксируется в статусе.

## Verification

RED до правки, GREEN после (`npm run test:one` двух файлов), node --check, PowerShell parser, strict tsc, eslint --max-warnings 0, trailing-whitespace grep; новые SHA-256; повторное независимое ревью.

## Rollback

Резервная копия версии до раунда 2 снимается в `.tmp_wal_backup2/`; версия до ремонта — `.tmp_wal_backup/`.
