# Task packet: курс EN, урок 4, занятия 49–56 — четыре новых слова, три интро, карточки перед заданиями

Governance-ID: TG-45DF5A935479
Status: In progress
Owner: сессия-исполнитель (субагент координатора), параллельно другие авторы ведут l04 s01–s48
Related epic/enabler: Learning V2 фабрика курса (content/learning-v2-course), правила владельца 16.10 и 17.10

## Outcome
Занятия L04S49–S56 переписаны по правилам владельца: в каждом 4 действительно новых слова с карточками; три интро — три разные сцены с разными новыми словами; ответы интро не повторяют прежние; карточки стоят прямо перед первым заданием со словом, у каждого слова свои отдельные контакты до фраз (family_choreography); RU и UK зеркальны; грамматика по ПЛАН_КУРСА.md (глава 7 урока 4: самостоятельный перенос там, где одно — There is a, а несколько — There are, вопросы с короткими ответами, some/any в общественном месте, контраст There is и It is, итоговое занятие); релиз собран.

## Scope
Только `content/learning-v2-course/sessions/en/l04/s49..s56/final.ru.md`, `final.uk.md`, их `practice.atomic.json` и `content/learning-v2-course/release/en/l04/s49–s56/*` (генерируются сборкой).
Out of scope: аудио, ПЛАН_КУРСА.md, код приложения, другие занятия, коммиты.

## Architecture
Текст собирается из структурных данных (скрипты в scratchpad сессии) по образцам l04 s32 и s40; порядок карточек — place_cards.mjs; atomic — sync-session.mjs; проверка — pipeline/check.mjs; релиз — pipeline/build_release.mjs. Новые слова резервируются в общем файле reserved_words.txt до записи.

## Security and privacy
Данные пользователей не затрагиваются; только учебный текст.

## Technical debt
Нет. Озвучка новых фраз — отдельный шаг координатора.

## Verification
check.mjs (ожидаемо только FIX [plan]), build_release.mjs «готово: 21 заданий», 4 карточки в learner.json и learner.uk.json каждого занятия, node qa_words.mjs l04 молчит для s49–s56.

## Rollback
git checkout затронутых файлов занятий и релиза (коммита нет).
