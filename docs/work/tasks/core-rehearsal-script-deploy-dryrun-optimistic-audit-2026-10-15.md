# Task packet: репетиция одной командой, сухой прогон выкладки 17.10, аудит Optimistic UI

Governance-ID: TG-541593DFF7C5
Status: In progress
Owner: Ядро (сессия 1)
Related: задача координатора 15.10 ~12:25.

## Outcome

1. `scripts/build_rehearsal.sh` — репетиция сборки одной командой:
   - выгрузка HEAD минус `.easignore` во временную папку;
   - junction на `node_modules`;
   - гейты `eas-build-post-install`;
   - экспорт Android;
   - итог одной строкой PASS/FAIL и лог.
2. Сухой прогон выкладки 17.10 по `docs/phraseman-2.0/handoff/SERVER_DEPLOY_2026-10-17.md`: сборка functions, тесты правил, порядок шагов, план отката. НИЧЕГО не выкладывать.
3. Аудит Optimistic UI сегодняшних фич: гейт голоса, окно «Встречайте 2.0», сторис.

## Scope

- Новые файлы `scripts/build_rehearsal.sh` и `scripts/build_rehearsal_files.mjs`.
- Чек-лист выкладки — документ в `docs/phraseman-2.0/handoff/`.
- Аудит — чтение кода; правки только при найденной дыре, в окно кода.

## Architecture

- Репетиция пишет только во временную папку вне репо. Общий индекс не трогается: используется временный `GIT_INDEX_FILE`.
- `node_modules` подключается junction'ом, только на чтение.
- Экспорт идёт без Watchman: через junction он не видит `node_modules`.

## Security and privacy

- Секреты не читаются и не подставляются.
- Проверка версии без `EXPO_PUBLIC_RC_*` получает статус WARN (секрет EAS), а не FAIL.
- Прод не трогается: никаких deploy и записей в Firestore.

## Technical debt

Экспорт идёт через junction и без Watchman — это отличие от EAS, и оно записано в выводе скрипта.
Полная замена — `npm ci` во временной папке, но это дорого по памяти.

## Verification

- Прогон `scripts/build_rehearsal.sh` на текущем HEAD → PASS.
- Сборка functions и тесты правил — локально.

## Rollback

Удалить скрипт. Репозиторий и прод не меняются.
