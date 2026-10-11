# Task packet: состояние release:precheck к сборкам 16.10

Governance-ID: TG-D25EF66A774E
Status: In progress
Owner: сессия «1 · Ядро» (координатор 12.10: «сборку не запускать, пока release:precheck не зелёный»).

## Outcome
Разобрать `npm run release:precheck` (scripts/release_precheck.mjs: сверка версий + 6 гейтов) и прогнать ЧАСТЯМИ,
по одной; отчёт `docs/phraseman-2.0/RELEASE_PRECHECK_STATUS_2026-10-12.md` — проверка → зелёная/красная → причина →
чей файл → что сделать. Отдельно — можно ли собрать стор-сборку без Learning V2 (вырез caafa92ab).

## Scope
In: запуск гейтов только на чтение, отчёт. Out: правки чужих файлов (ничего не чиним), `--bump`, сборки.

## Architecture
Каждый гейт — отдельный node-скрипт; гейт озвучки запускает jest — последним, со слотом, с лимитом кучи.

## Security and privacy
Гейт ключей читает конфиги; секреты не печатаем в отчёт.

## Technical debt
Найденные дефекты гейтов — в отчёт с владельцем.

## Verification
Вывод каждого гейта сохранён в scratchpad; отчёт ссылается на коды выхода.

## Rollback
Удалить отчёт.
