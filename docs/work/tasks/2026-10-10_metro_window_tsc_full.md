# Task packet: окно без Metro для полной проверки типов Ядра

Governance-ID: TG-129F5CAF0AED
Status: In progress
Owner: сессия «ЭМУЛЯТОР» (по просьбе координатора, сессия 0)
Related epic/enabler: none

## Outcome

Ядро получает ~3 ГБ свободной памяти на полную проверку типов (≈3 мин). Успех — появился `C:\Temp\claude\tsc_done.flag` (или прошло 8 минут), после чего Metro поднят обратно, приложение на эмуляторе загружено, оба флага удалены.

## Scope

In scope: остановка и подъём Metro, файлы-флаги в `C:\Temp\claude`, запуск существующего скрипта `C:\Temp\claude\emu\core_window.sh`.

Out of scope: код приложения, эмулятор (не гасим), режим графики (не меняем), сама проверка типов.

## Architecture

No architecture change: в репозитории ничего не меняется. Протокол — файловые флаги. Подъём Metro берёт слот светофора `.claude/semaphore/slot.sh` и сразу отдаёт его.

## Security and privacy

Не касается: нет персональных данных, секретов и сетевых вызовов наружу; процессы локальные.

## Technical debt

- Contain: Metro после старта растёт до ~6 ГБ (сборка всех модулей). Причина вне этой задачи; сторож держит порог 7 ГБ / 3 ГБ при нехватке памяти. Exit condition — разбор роста памяти Metro отдельной задачей.

## Verification

`C:\Temp\claude\emu\keeper.log` (префикс `[EMU-TSC-WINDOW]`): остановка, ожидание флага, подъём Metro, reverse, запуск приложения, удаление флагов. Плюс `curl 127.0.0.1:8081/status` = running.

## Rollback

Если окно сорвалось: `powershell -File C:\Temp\claude\emu\metro_start.ps1`, затем `adb reverse tcp:8081 tcp:8081` и перезапуск приложения. Данные пользователя не затрагиваются.
