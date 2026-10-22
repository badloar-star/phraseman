# Названия эпизодов на 9 языках — где хранить переводы (Переводчик → Learning V2, предложение)

Governance-ID: TG-81CC86CA647A
Status: Proposal — решение за Learning V2
Owner: «10 · ПЕРЕВОДЧИК» (поручение координатора 22.10)

## Outcome

Сейчас названия есть только по-русски: `LEARNING_V2_SESSION_TITLES_RU_V1` в
`modules/learning-v2/content/session_titles_v1.generated.ts` (168 эпизодов уроков 1–3). Читают их через
`learningV2SessionTitleV1(lesson, session)`: `app/(tabs)/lessons.tsx`, `app/home_continue_mark.ts`, `SeasonCourseConnected.tsx`,
`LearningV2ChapterExamResult.tsx`. Файл генерируется из `ПЛАН_КУРСА.md` и лежит в зоне `modules/learning-v2/content/**`
(Codex): руками туда переводы не пишем.

**Предложение (3 строки):**
1. Переводы — отдельный файл вне генерируемой зоны: `modules/learning-v2/titles/session_titles_i18n_v1.ts`, словарь
   `{ "1.1": { uk, en, es, "pt-BR", vi, id, tr, pl }, … }`, ключ «урок.эпизод»; русский остаётся в генерируемом файле.
2. Новый доступ `learningV2SessionTitleForLocaleV1(lesson, session, locale)`: перевод на язык интерфейса → для ru/uk без
   перевода — русское название → иначе `null` (карта пишет «Эпизод N», как сейчас). Старый `learningV2SessionTitleV1`
   не трогаем, вызовы переводим по одному.
3. Сторож: у каждого ключа, где есть ru, должны быть все 8 языков, ≤ 2 слов и без кириллицы вне uk; пустые не допускаются
   (лучше «Эпизод N», чем пустая подпись). Так же — сцены глав (`LEARNING_V2_CHAPTER_SCENES_RU_V1`) и арки уроков.

## Как я буду переводить

Новые названия даёт 12 · ТЕОРИЯ (≤ 2 слов, интригующие). Переводы — тоже ≤ 2 слов, не дословно, а с той же интригой;
термины — по словарю «Сезона» (tr эпизод = «bölüm», глава = «ünite»). Сдаю тем же словарём, что в п. 1.

## Scope

In scope: предложение хранения. Out of scope: код (Learning V2), сами названия (12 · ТЕОРИЯ).

## Architecture

Предложение: новый файл переводов + новая функция доступа; генерируемый файл и Codex-зона не меняются.

## Security and privacy

Не применимо.

## Technical debt

- Сейчас карта на 7 языках (кроме ru/uk) показывает только «Эпизод N».

## Verification

Потребители `learningV2SessionTitleV1` найдены поиском по репозиторию (4 места).

## Rollback

Удалить файл.
