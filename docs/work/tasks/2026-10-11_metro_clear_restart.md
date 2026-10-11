# Task packet: однократный перезапуск сервера с --clear после патча «Темы»

Governance-ID: TG-8044ED7725D8
Status: In progress
Owner: сессия «ЭМУЛЯТОР» (по просьбе сессии «Темы 2.0», коммит cd05e0963)
Related epic/enabler: none

## Outcome

Сервер перезапущен один раз с очисткой кэша (`--clear`), чтобы подхватить новый `metro.config.js`: `maxWorkers=4` только в разработке и дополненный блок-лист. Успех: сервер отвечает `running`, сборка приложения проходит, через 15 минут суммарная память рабочих процессов около 1,2–1,8 ГБ.

## Scope

In scope: перезапуск сервера, файл `C:\Temp\claude\emu\metro_clear_start.ps1` (новый, запускает `npx expo start --clear` отдельным процессом), замер памяти по `scripts/dev_node_memory.ps1`.

Out of scope: сам `metro.config.js` (правит сессия «Темы»), код приложения, эмулятор.

## Architecture

No architecture change: конфиг сборщика меняет другая сессия. Здесь только однократный запуск с очисткой кэша. Лимит памяти процесса: `--max-old-space-size=4096`, по просьбе координатора; при падении с ошибкой кучи вернуть 12288.

## Security and privacy

Не касается: локальный процесс, персональных данных и секретов нет.

## Technical debt

- Contain: лимит 4096 МБ уже один раз привёл к падению сервера с нехваткой кучи (21:09–21:23). Exit condition — замер после запуска; если падает снова, вернуть 12288 и сообщить координатору.

## Verification

1. `curl 127.0.0.1:8081/status` = `packager-status:running`.
2. В `C:\Temp\claude\metro_live.log` нет `FATAL` и `heap`; есть `Bundled`.
3. Через 15 минут: `powershell -NoProfile -ExecutionPolicy Bypass -File scripts/dev_node_memory.ps1` — ожидание 4 рабочих процесса, суммарно ~1,2–1,8 ГБ.

## Rollback

Перезапуск старым скриптом `C:\Temp\claude\emu\metro_start.ps1` (12288 МБ, без `--clear`). Конфиг откатывает сессия «Темы».
