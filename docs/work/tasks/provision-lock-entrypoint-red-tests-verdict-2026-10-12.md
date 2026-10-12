# Task packet: красный tests/account_provision_lock_android_runtime_entrypoint.test.ts (4 теста) — вывод дочернего процесса и вердикт

Governance-ID: TG-62E3EE54AE1D
Status: Done
Owner: 5 · АВТОРИЗАЦИЯ (координатор 12.10)

## Outcome

Снят полный вывод редьюсера отказов внешнего запускателя (Get-SanitizedRunnerFailure) на тех же входах, что в тесте; вердикт:
дефект кода (чинить) или устаревший контракт (обновить с объяснением). Флаги Account V2 не трогаются.

## Scope

In scope: чтение внешнего файла запускателя, прогон теста, при вердикте «контракт» — правка ожиданий теста с объяснением.
Out of scope: правка внешнего запускателя Codex (вне репозитория), флаги Account V2, запуск на устройстве.

## Architecture

Тест извлекает функцию Get-SanitizedRunnerFailure из ACCOUNT_ANDROID_PROVISION_LOCK_REVIEWED_LAUNCH.ps1 (папка Codex outputs) и проверяет
обезличенный конверт отказа.

## Security and privacy

Конверт отказа обязан оставаться обезличенным (без путей, имён, сырого вывода) — проверяется отдельно от состава полей.

## Technical debt

- Contain: тест зависит от файла вне репозитория — отмечено в вердикте.

## Verification

Пробник (scratchpad/launcher_probe.cjs) на 4 входах теста; npm run test:one теста через светофор.

## Rollback

Откат правки теста.

## Result

Вывод редьюсера (Get-SanitizedRunnerFailure, внешний файл mtime 2026-09-28 07:15Z, sha256 211a4652…fc45) снят на 6 входах: всё → общий отказ из 8 полей,
утечек нет. Причины: (1) новый договор — 8 полей в порядке внутреннего run-proof.ps1 (FailureEnvelope: … cleanupFailures, databaseRootDiagnostic …);
(2) тест вырезал только функцию без Assert-JsonIntegerValue и $script:CleanupFailureOrder / DatabaseRootDiagnosticCategories → любой вход падал в общий отказ.
Вердикт: устаревший контракт теста. Тест обновлён (подгрузка трёх определений, 8-польный общий отказ, приём канонического 8-польного, отказ 6-польному
и диагностике у чужого кода) — 58/58. Внешний файл не менялся. Остаётся: тест зависит от файла в личной папке Codex — в CI не запустится.
