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
