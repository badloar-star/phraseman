# Task packet: курс EN, урок 2, занятия 13–20 — четыре новых слова, три интро, карточки перед заданиями

Governance-ID: TG-FAC4258A4C7F
Status: In progress
Owner: сессия-исполнитель (субагент координатора), параллельно другой автор ведёт l02 s21–s28
Related epic/enabler: Learning V2 фабрика курса (content/learning-v2-course), правила владельца 16.10 и 17.10

## Outcome
Занятия L02S13–S20 переписаны по правилам владельца: в каждом ≥4 действительно новых слова с карточками; три интро — три разные сцены с разными новыми словами; ответы интро не повторяют прежние; карточки стоят прямо перед первым заданием со словом; RU и UK зеркальны; релиз собран.

## Scope
Только `content/learning-v2-course/sessions/en/l02/s13..s20/final.ru.md`, `final.uk.md`, их `practice.atomic.json` и `content/learning-v2-course/release/en/l02/s13–s20/*` (генерируются сборкой).
Out of scope: аудио, ПЛАН_КУРСА.md, код приложения, другие занятия, коммиты.

## Architecture
Текст пишется руками по образцам l02 s01–s12; порядок карточек — скрипт place_cards.mjs; atomic — sync-session.mjs; проверка — pipeline/check.mjs; релиз — pipeline/build_release.mjs. Новые слова резервируются в общем файле reserved_words.txt до записи.

## Security and privacy
Данные пользователей не затрагиваются; только учебный текст.

## Technical debt
Нет. Озвучка новых фраз — отдельный шаг координатора.

## Verification
check.mjs (ожидаемо только FIX [plan]), build_release.mjs «готово: N заданий», 4 карточки в learner.json и learner.uk.json каждого занятия.

## Rollback
git checkout затронутых файлов занятий и релиза (коммита нет).
