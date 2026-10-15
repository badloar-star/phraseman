# Task packet: репетиция сборки 16.10 из чистого HEAD

Governance-ID: TG-34DF31D487D2
Governance-ID: TG-DD4BDAEA061B
Governance-ID: TG-CBDD90C95932
Governance-ID: TG-118C3E015ABF
Governance-ID: TG-1E1690252229
Governance-ID: TG-51FB529A1F84
Governance-ID: TG-7586797A9FEB
Governance-ID: TG-F94DB7213385
Governance-ID: TG-25D19982D2FA
Governance-ID: TG-A1F91E573DA7
Governance-ID: TG-CF5F0BD7CE2D
Governance-ID: TG-D16CEA95D27C
Governance-ID: TG-511429E3B3B7
Находка 12:15: экспорт android на чистой машине — «Unable to resolve ../content/learning-v2-course/activation/en/runtime-audio-omissions.v1.json».
`.watchmanconfig` с 13.08 исключает `content` целиком, а Watchman читает исключения при создании watch.
Решение координатора: рантайм не импортирует JSON из `content/`. Генератор `scripts/generate_learning_v2_runtime_audio_omissions.mjs` пишет
`app/learning_v2_runtime_audio_omissions_v1.generated.ts`; тест «сгенерированное = JSON»; модуль омиссий импортирует сгенерированное.
Находка 12:11 (репетиция HEAD 81159ff65): на EAS `content/learning-v2-course/` существует (с 2a033ab6e .easignore пропускает
`activation/`). Поэтому `learningV2CourseSourcesAbsentOnBuildServer` отвечает `course_sources_present`, и строгая сверка паритета
падает без исходников → `eas-build-post-install` ОТКАЗ. Фикс: признак исходников — `content/learning-v2-course/sessions` (DEFAULT_SOURCE_ROOT гейта).
Update 12:06 (координатор): `npm ci` не делаем. `node_modules` — junction на основное дерево, только чтение; lockfile тот же.
Status: Done (15.10 12:21 — повтор на e9d9b445a зелёный: post-install, экспорт android; RC_ANDROID — секрет EAS)
Owner: Ядро (сессия 1)
Related: задача координатора 15.10 ~11:10 — «главный предохранитель перед завтрашней сборкой».

## Outcome

Ответ на вопрос «соберётся ли приложение на EAS из того, что лежит в HEAD». Отчёт координатору:
- что упало;
- какие файлы импортируются, но отсутствуют в HEAD.

## Scope

- Только чтение репозитория. Всё пишется во временную папку `C:/Temp/claude/build_rehearsal` вне репо.
- Состав архива как у EAS: файлы HEAD минус `.easignore`. Выгрузка — через временный индекс `read-tree HEAD` + `checkout-index`; общий индекс не трогается.
- Шаги внутри временной папки:
  1. `npm ci` из lockfile (предпочтительно офлайн, из кэша);
  2. проверка типов;
  3. `eas-build-post-install` с переменными EAS production;
  4. стор-экспорт бандла Android.

## Architecture

Шаги тяжёлые, поэтому запускаются через `slot.sh run`. Перед запуском — проверка свободной памяти ≥5 ГБ.

## Security and privacy

- Ключи и секреты не читаются и не вводятся.
- Переменные окружения — только публичные `EXPO_PUBLIC_*` из `eas.json` production.

## Technical debt

Нет. Временная папка удаляется после отчёта.

## Verification

Коды выхода каждого шага и хвосты журналов.

## Rollback

Не требуется: репозиторий не меняется.
