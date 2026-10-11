# Task packet: сборка functions из чистого среза HEAD (блокер выкладки — только рабочая копия Codex)

Governance-ID: TG-5BB7AD72747B
Status: In progress
Owner: сессия «1 · Ядро» (координатор 12.10).

## Outcome
TS2352 в `modules/learning-v2/content/factory_native/factory_native_course_v1.ts:527` — только в незакоммиченной правке
Codex (+153/−49 в рабочей копии); в HEAD строка 527 другая. Проверить: собирается ли functions из ЧИСТОГО среза HEAD.
Да — «выкладка функций возможна из чистого среза HEAD»; нет — точная ошибка и файл. Ничего не выкладывать.

## Scope
In: `git archive HEAD` (без docs/asset_sources/.dev-screens — сборка их не читает) → `C:/Temp/claude/fn_head/`,
ссылки-соединения на существующие node_modules (без npm ci), `npm run build` в functions среза.
Out: worktree/ветки (запрещены), файлы Codex, выкладка.

## Architecture
Срез — обычная папка вне репозитория; сборка пишет только в `fn_head/functions/lib` (очистка рантайма удаляет только его).

## Security and privacy
Без секретов; сборка без сети и выкладки.

## Technical debt
Папку среза удалить после проверки (ссылки-соединения снимать ДО удаления, чтобы не задеть настоящие node_modules).

## Verification
Код возврата сборки, ошибки tsc/гейтов из лога.

## Rollback
Удалить `C:/Temp/claude/fn_head` (сначала соединения).
