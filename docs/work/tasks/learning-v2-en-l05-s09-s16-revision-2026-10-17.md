# Task packet: курс EN, урок 5, занятия 9–16 — четыре новых слова, три интро, карточки перед заданиями

Governance-ID: TG-C7D1B7FAEE97
Status: In progress
Owner: сессия-исполнитель (субагент координатора), параллельно другой автор ведёт l05 s01–s08
Related epic/enabler: Learning V2 фабрика курса (content/learning-v2-course), правила владельца 16.10 и 17.10

## Outcome
Занятия L05S09–S16 переписаны по правилам владельца: в каждом 4 действительно новых слова с карточками; три интро — три разные сцены с разными новыми словами; ответы интро не повторяют прежние; карточки стоят прямо перед первым заданием со словом; RU и UK зеркальны; грамматика по ПЛАН_КУРСА.md (урок 5: have/has, притяжательные, owner + place, вопросы Is this your…?, итоговое занятие s16); релиз собран.

## Scope
Только `content/learning-v2-course/sessions/en/l05/s09..s16/final.ru.md`, `final.uk.md`, их `practice.atomic.json` и `content/learning-v2-course/release/en/l05/s09–s16/*` (генерируются сборкой).
Out of scope: аудио, ПЛАН_КУРСА.md, код приложения, другие занятия, коммиты.

## Architecture
Текст собирается из структурных данных (скрипты в scratchpad сессии) по образцам l04 s49–s56; порядок карточек — place_cards.mjs; atomic — sync-session.mjs; проверка — pipeline/check.mjs; релиз — pipeline/build_release.mjs. Новые слова резервируются в общем файле reserved_words.txt до записи.

## Security and privacy
Данные пользователей не затрагиваются; только учебный текст.

## Technical debt
Нет. Озвучка новых фраз — отдельный шаг координатора.

## Verification
check.mjs (ожидаемо только FIX [plan]), build_release.mjs «готово: 21 заданий», 4 карточки в learner.json и learner.uk.json каждого занятия, node qa_words.mjs l05 молчит для s09–s16.

## Rollback
git checkout затронутых файлов занятий и релиза (коммита нет).
