# Task packet: банк слов lesson_words — без расчёта при импорте (холодный старт)

Governance-ID: TG-D9114F82BD06
Status: In progress
Owner: сессия 1 · ЯДРО (координатор 04.10, пункт холодного старта про lesson_words)

## Outcome

lesson_words.tsx — самый тяжёлый по собственному времени модуль на холодном старте (замеры №5–7: 110–200 мс
своего, 400–460 мс всего). Прошлая правка 279fbc556 сделала сборку банка ленивой, но три вычисления при
импорте (ALL_WORDS_FLAT, WORD_COUNT_BY_LESSON, WORD_KEYS_BY_LESSON) всё равно звали lessonWordBank для КАЖДОГО
урока — трижды. Цель: при импорте не считать банк вовсе; считать при первом обращении и один раз на урок.

## Scope

app/lesson_words.tsx: мемоизация lessonWordBank по уроку (наружу — копия массива), ленивые allWordsFlat() и
множество en-слов, функции lessonWordCount(id) / lessonWordKeys(id) вместо таблиц, считаемых при импорте.
app/lesson_menu.tsx: 4 места чтения таблиц → функции. Данные словаря, тексты, поведение экранов — без изменений.

## Architecture

Таблица-литерал WORDS_BY_LESSON остаётся (её парсинг неизбежен). LESSONS_WITH_WORDS — только ключи, дёшево,
остаётся константой. Кэши — в памяти процесса, детерминированы (из констант).

## Security and privacy

Данные пользователя не затрагиваются.

## Technical debt

Нет. Таблицы слов в будущем — кандидат на вынос из файла экрана в отдельный модуль данных.

## Verification

Тесты lesson_words_bank_regression и связанные; замер холодного старта у координатора (module_eval lesson_words).

## Rollback

git revert коммита.
