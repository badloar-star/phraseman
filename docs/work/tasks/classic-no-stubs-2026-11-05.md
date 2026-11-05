# Task packet: классика — никаких заглушек «пока готовится», теория только целевого языка

Governance-ID: TG-5FA8BDDD3D0E
Status: In progress
Owner: Learning V2 session; P0 от координатора 05.11 (слова владельца 06:07–06:10: «нигде не должно быть никаких заглушек», «теория во всех языках показывает английский»)
Related epic/enabler: none

## Outcome

В меню урока классического курса (fr/es/de/it) нет ни одной строки-заглушки «пока готовится / скрыты / скоро откроется». Пункт, для которого нет данных целевого языка (слова, неправильные глаголы, предлоги, шпаргалка), скрыт. «Теория» (`/lesson_help`, `/hint`) для не-английского курса показывает ТОЛЬКО теорию целевого языка (вступления курса `intro.json`) и никогда английскую.

## Scope

In scope: `app/lesson_menu.tsx`, `app/lesson_support_target_gate.ts`, `app/lesson_help.tsx`, `app/hint.tsx` (защита маршрута), `app/lesson_words.tsx` / `app/lesson_irregular_verbs.tsx` (если нужен выход при закрытом разделе), тесты `tests/gustav_french_*.test.ts`, `scripts/gustav_readiness_gate.ts`, новый сторож «заглушек нет».

Out of scope: данные слов/глаголов/теории целевых языков (Теория 12), V2 (`modules/learning-v2`), прогресс (`progress_preservation` не трогается), `app/lesson_complete.tsx` и аудио (чужое WIP).

## Architecture

Единая функция доступности `lessonSupportContentAvailableForTarget` (теория/шпаргалка) и `vocabularyContentAvailableForTarget` (слова/глаголы/предлоги) решают, показывать ли пункт. Нет данных = `hidden`, не заглушка. Английский источник для не-en не используется ни в одном маршруте.

## Security and privacy

Данных пользователя и разрешений не затрагивает.

## Technical debt

Убирается мёртвая ветка заглушек (текстовые строки «готовится»); контракты gustav_* переписываются под «заглушек нет».

## Verification

Точечные тесты gustav_french_*, сторож отсутствия заглушек, проверка типов, `babel.parseSync` для lesson_menu.tsx.

## Rollback

Откат одним коммитом (`git revert`); данные не меняются.

Governance-ID: TG-D2FB9300227B (коммит P0 «заглушки классики» после перезапуска; затем подключение слов glossary.json)
Governance-ID: TG-6905F50BF830 (задача Теории 12: wiring словаря/теории из json)

Governance-ID: TG-2C7DB19BCA1F (слова урока fr/es/de/it из glossary.json: firstLesson==N, без повторов; app/classic_lesson_words.ts, lesson_menu, lesson_words, vocabulary_target_gate)

Governance-ID: TG-0E153B452E14 (план интерактивных заданий теории fr/es/de/it: чтение данных и оценка)

Governance-ID: TG-C44F45024B95 (интерактивные задания теории fr/es/de/it: адаптер ClassicTheory→TheorySection + TheoryLessonView)

Governance-ID: TG-087054EE1A0A (задания теории «как ребёнку»: инструкции, образец ответа, убрать непонятные типы и технические блоки)

Governance-ID: TG-F4A397C9A3C2 (задания только из слов, введённых теорией к этому разделу; команды из classic_task_commands_9lang.md; сторож firstLesson<=N)

Governance-ID: TG-D980467BC13F (срочно: типы в HEAD — сужение типа classicWordsActiveFor в lesson_menu/lesson_words; затем рендер plain-формата теории)

Governance-ID: TG-E62B1E24CB5D (рендер plain-формата теории: classic_theory_plain.ts, ThreeTileChoice stacked, hint для en)

Governance-ID: TG-86DA1598522B (вёрстка: заголовок колонки таблицы форм «AFFIRMATIVE» ломается посреди слова)

Governance-ID: TG-364790768A0A (проверка формулировок на упоминания лишних языков)

Governance-ID: TG-1DC7AACFC10C (очередь координатора: темы уроков, журнал ожидания слов, сторож слов, drills)

Governance-ID: TG-8247D3BF5B24 (экран слов без ожидания прогресса; exam_episode_words; learning_v2_locale_gate; прогон сторожей на данных Теории)
