# Применение патча конфигурации Metro (ограничение воркеров и блок-лист) по просьбе координатора 02:40

Governance-ID: TG-E18E81E2388B
Status: In progress
Owner: сессия «4 · ТЕМЫ 2.0»
Related epic/enabler: `metro-memory-root-cause-2026-10-10.md` (14 воркеров на 24 ядрах → 5–6,5 ГБ)

## Outcome

Патч `bundler-memory-fix-2026-10-10.patch` применён к `metro.config.js`: `maxWorkers = 4` только в локальной разработке, сборочные режимы (EAS, CI, стор-релиз) без изменений, блок-лист дополнен 26 корневыми папками и 5 префиксами. Конфигурация загружается в Node во всех режимах; приложение исключённые папки не импортирует.

## Scope

In scope: `metro.config.js` (только хунки патча; чужая незакоммиченная правка `content` в коммит не идёт), проверка загрузки в трёх режимах, повторная проверка импортов, замер до/после в документ причины.
Out of scope: запуск и перезапуск Metro (делает «Эмулятор»), `.watchmanconfig`.

## Architecture

Патч накладывается на рабочий файл (`git apply --ignore-whitespace`) и отдельно на версию из HEAD для коммита (чтобы чужие хунки не попали).

## Security and privacy

Не применимо.

## Technical debt

Замер «после» делается через 15 минут после перезапуска; до этого в документ причины записан только замер «до».

## Verification

Загрузка реального `metro.config.js` в Node в режимах dev / `EAS_BUILD=true` / `EXPO_PUBLIC_STORE_RELEASE=1` (отдельные процессы), проверка блок-листа на реальных путях, `git grep` импортов исключаемых папок, замер `scripts/dev_node_memory.ps1`.

## Rollback

`git revert` коммита или `PHRASEMAN_METRO_MAX_WORKERS=14`.
