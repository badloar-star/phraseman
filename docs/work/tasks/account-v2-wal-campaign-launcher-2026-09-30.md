# Task packet: Account V2 — лаунчер WAL-кампании Android (SQLCipher crash-recovery) на эмуляторе

Governance-ID: TG-88837487B247
Governance-ID: TG-88837487B247
Governance-ID: TG-88837487B247
Governance-ID: TG-88837487B247
Status: Done (SOURCE APPROVE + RUNTIME EVIDENCE ACCEPT; отступления приняты Fable)
Owner: Claude session (Account V2, /loop)

## Outcome

Получить RUNTIME-доказательство (а не только SOURCE APPROVE) того, что зашифрованная база аккаунта (SQLCipher, WAL) на Android переживает убийство процесса в шести фазах кампании и восстанавливается без потери подтверждённых записей и без утечки открытого текста.

1. Написать лаунчер (хост-скрипт) кампании по нормативному пакету Codex `C:\Users\badlo\Documents\Codex\2026-09-22\new-chat\outputs\ACCOUNT_ANDROID_SQLCIPHER_WAL_RECOVERY_PACKET.md` и открытым пунктам статуса: событие `launch-sent` между `baseline-bound` и `launch-ack` (+ мутация), маркер `account_sqlcipher_recovery_bootstrap_acknowledged`, `bootstrap-ack` первым в каждой фазе, ключи aggregate, привязка aggregate к транскрипту (`transcriptSha256`).
2. Снять fail-closed `device_campaign_not_authorized` ТОЛЬКО через явный параметр авторизации запуска (владелец разрешил эмулятор 2026-09-30), по умолчанию раннер остаётся закрытым.
3. Прогнать кампанию на эмуляторе, если он свободен (перед запуском — проверить, не используется ли эмулятор другой сессией: `adb devices`, процессы Metro/emulator, светофор; если занят — предупредить в статусе и не трогать чужой процесс). Сборка APK — только со слотом, одна тяжёлая операция за раз.
4. Записать квитанцию: хэши файлов, устройство (без персональных данных), итог по фазам PASS/FAIL, сырые факты.

## Scope

In scope: runtime-probes/android-account-sqlcipher-recovery/* (замороженные хэши ПЕРЕСЧИТАТЬ и записать после правок), tests/account_sqlcipher_wal_recovery_android_runtime_*.test.ts, новый лаунчер в той же папке, квитанция в docs/work/tasks. Out of scope: код приложения вне probe-обвязки, production, реальные аккаунты, commit, deploy. Патч expo-sqlite (`patches/expo-sqlite+16.0.10.patch`) НЕ трогать.

## Architecture

Лаунчер — хост (PowerShell/Node), управляет adb: установка probe-сборки, запуск по фазам с nonce, убийство процесса в заданной точке, сбор транскрипта, проверка через `run-proof.ps1`. Всё детерминировано, fail-closed на любой неожиданности.

## Security and privacy

Ключ SQLCipher не покидает устройство и не попадает в логи; adb-команды без интерполяции непроверенных строк; запись только в разрешённые пути probe. Пользовательских данных нет — синтетические канарейки.

## Technical debt

Accept temporarily: iOS-доказательство и OEM/облачный бэкап — вне этой задачи.

## Verification

RED→GREEN для новых событий/мутаций; тесты probe/entrypoint; `node --check`, PowerShell Parser, strict tsc, eslint; runtime-прогон на эмуляторе с квитанцией; независимое ревью лаунчера и квитанции.

## Rollback

Копия `.tmp_wal_launcher_backup/`; эмулятор — удалить probe-пакет после кампании.

## Ремонт №1 после ревью (SOURCE HOLD, RUNTIME EVIDENCE ACCEPT условно)
- P2 launch-campaign.ps1:711-713: `am force-stop app.phraseman` в уборке после отказа выполняется даже при отказе на preflight (device_not_exclusive, adb_reverse_preexisting, metro_port_busy, family_present_before_prepare) — убивает приложение чужой сессии. Force-stop только после достижения стадии host-setup; тест + мутация.
- P2 квитанция: попыток с отказом 9, а не 3 — перечислить все каталоги доказательств и причины честно; раздел «Отступления от пакета» (запуск эмулятора, повторы после отказа, удалённая БД, байты лаунчера не ревьюились до запуска) — на решение.
- P3: probe.ts:495-505 убрать приём `…account_native_sqlite_revoked` для closeSync (revoked ≠ closed); launch-campaign.ps1:618-620 RecoveryOrdering с постоянным списком — убрать или подать реальные события; строки 659/666-667/673 — пометить в aggregate как probe-derived; Metro-стоп по PID сверять starttime.
- Повторный прогон на эмуляторе НЕ требуется, если ремонт не трогает путь фаз (иначе — через очередь emulator.sh).

## Ремонт №2 (после повторного прогона 2026-10-01: фазы 6/6 PASS, уборка упала)
- P2: Exit-PackageSwap бросает IOException «user-mapped section» (package.json держит чужой процесс) → campaign_failed и подменённый package.json в общем дереве. Повторять запись с паузой (до ~60 с), не бросать; при неудаче — громкий лог и код, журнал остаётся.
- P2: подмена общего package.json видна другим сессиям ~5 мин (их сборки/бандлер). Найти способ запустить пробу без подмены общего файла (например, отдельная точка входа через параметр бандлера/EXPO_ROUTER_APP_ROOT или временная копия проекта вне общего дерева), если реально; иначе — сократить окно и предупреждать в очереди эмулятора.
- Коммит: scripts/scan_secrets.mjs — в ALLOWLIST_FILES три файла WAL: фраза авторизации запуска wal-campaign-authorized-by-owner-2026-09-30 не секрет (открытая фиксированная строка-предохранитель), ложное срабатывание named-secret-assign. Байты лаунчера не меняются (заморожены по решению Fable).
