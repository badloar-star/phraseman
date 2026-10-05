# Task packet: learn-2 — список уроков пустеет после очистки поиска (сперва лог)

Governance-ID: TG-B7324F0089B5
Status: In progress (Сверка: «поиск → крестик → прокрутка: после первого урока A2 — пустота на несколько экранов, ошибок нет»)
Owner: сессия 1 · ЯДРО

## Outcome

Стабильное воспроизведение (SVERKA_LOG 14/86): поиск «qzxw» → очистить → прокрутка → одна-две карточки, дальше пусто.
Подозрение — виртуализация Animated.FlatList (windowSize 7, без getItemLayout) после смены данных. Сперва лог: при смене
данных — запрос и число строк; в конце прокрутки — offsetY, contentHeight, layoutHeight, rows, query. Огромная contentHeight
при малом числе отрисованных строк = виртуализация/устаревшие замеры; маленькая — данные/высоты.

## Scope

app/(tabs)/lessons.tsx: console.warn [LESSONS-LIST] data / scroll_end. Поведение не меняется.

## Architecture

Не меняется.

## Security and privacy

Строка поиска — только длина (без текста).

## Technical debt

Временная трассировка; после диагноза — починка и сторож.

## Verification

Синтаксис; сторожа lessons; воспроизведение Сверкой.

## Rollback

git revert коммита.
