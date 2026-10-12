# Task packet: состояние гейтов release:precheck на HEAD — «гейт → зелёный/красный → чей»

Governance-ID: TG-D5DF2F752045
Status: In progress
Owner: сессия «1 · Ядро» (координатор 12.10: «список гейтов на HEAD; тяжёлые без памяти — „не гонял“»).

## Outcome
Свежий список по каждому гейту scripts/release_precheck.mjs на текущем HEAD: итог, главная причина, чья зона.
Обновление `docs/phraseman-2.0/RELEASE_PRECHECK_STATUS_2026-10-12.md` (мой отчёт) — раздел «На HEAD …».

## Scope
In: прогон гейтов по одному (скрипт в scratchpad), обновление отчёта. Out: правки гейтов и кода.

## Architecture
Лёгкие гейты — сразу; тяжёлые (паритет Learning V2, озвучка, визуальная сверка) — только со слотом светофора и ≥4 ГБ.
Версии production-профиля — с заглушками ключей RevenueCat (секреты EAS локально отсутствуют, как в precheck).

## Security and privacy
Секреты не читаются; заглушки ключей — фиктивные строки.

## Technical debt
Гейт версий production-профиля локально всегда требует заглушек ключей RevenueCat — честный прогон только на сервере EAS.

## Verification
Логи каждого гейта в scratchpad/gates/*.log; итог сверяется с прежним отчётом.

## Rollback
`git revert` отчёта.
