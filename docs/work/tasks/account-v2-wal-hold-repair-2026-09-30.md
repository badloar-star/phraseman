# Task packet: Account V2 — исправление SOURCE HOLD в WAL/crash-recovery пакете

Governance-ID: TG-6115CA330229
Status: In progress
Owner: Claude session (Account V2, handover Codex 2026-09-29 §11)
Related epic/enabler: Account System V2, пакет 2B (Android native storage)

## Outcome

Пять файлов WAL-пакета проходят повторное независимое ревью: протокол bootstrap→launch выполним на реальном процессе (host узнаёт PID после старта), тесты порядка «чтение до checkpoint» и переиспользования PID реально ловят регресс, публикация PASS требует всех фактов dirty-WAL из пакета §8. Успех = authentic RED → GREEN, повторное ревью SOURCE APPROVE, строгие TS/ESLint/PS-парсер/node --check.

## Scope

In scope только: runtime-probes/android-account-sqlcipher-recovery/{probe.ts,index.js,run-proof.ps1}, tests/account_sqlcipher_wal_recovery_android_runtime_{probe,entrypoint}.test.ts.
Out of scope: устройство/эмулятор/ADB/сборка, staging, commit, другие account-файлы, чужие изменения.

## Architecture

Протокол фаз по пакету §5: bootstrap = `command=bootstrap&mode=<mode>`, рантайм выдаёт runtimeIdentity; хост проверяет PID/starttime, затем launch несёт pid/starttime/launchNonce/runtimeIdentity/mode; маркер launch_acknowledged — после принятия launch. Раннер остаётся library mode, fail-closed `device_campaign_not_authorized`.

## Security and privacy

Фиксированный тестовый ключ не утекает в маркеры/ошибки; параметры URL — жёсткие форматы; никаких adb/shell подстановок. Пользовательских данных нет.

## Technical debt

Pay now: P1, P2-A, P2-B, P2-C. Contain: P3 (pwsh 7 прогон, канонический JSON, производительность checksum, failure-evidence схема, cleanup перекрывает код) — записать в статус как открытые.

## Verification

RED до правки (падающие тесты на каждую находку), GREEN после; `npm run test:one` двух тестов; strict tsc по файлам; eslint --max-warnings 0; PowerShell parser; node --check; git diff --check. Новые SHA-256 пяти файлов.

## Rollback

Файлы не отслеживаются git; перед правкой снимается копия пяти файлов в .tmp_wal_backup/ для отката.
