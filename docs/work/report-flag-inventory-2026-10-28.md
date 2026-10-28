# Кнопка «Пожаловаться»: инвентаризация и что сделано (Дизайн, 28.10)

Governance-ID: TG-555E81CC2D7B

## Как устроено
- Компонент один: `components/ReportErrorButton.tsx` (флажок `variant="icon-flag"`, иконка 17, hitSlop 14, красный `t.wrong`; форма-шторка с полем пояснения ≥ 10 знаков).
- Шлюз `REPORT_ERROR_ENABLED = ENABLE_DEV_TOOLS` (решение владельца 05.10: «Нашёл ошибку?» — только тестерам): в сборке магазина обычная кнопка скрыта. Видна всем только та, у которой есть свой транспорт `submitOverride` (уроки Learning V2 — решение 21.10, Шпиль).
- Отправка: `submitErrorReport` → колбэк `submitClientReport('error_report')`, лимит сервера 10 в час на человека; `dataText` ≤ 5000, `userAnswer` ≤ 1000 знаков.
- Новое (28.10): `app/content_report_v1.ts` — общий транспорт для всех: запись в долговечную очередь `sendSupportReportInBackground` (дослать при следующем запуске без сети), «Спасибо» сразу, диагностический журнал не прикладывается; `components/ContentReportFlag.tsx` — тот же ReportErrorButton со своим транспортом.

## Где флажок был и где стал (видят ВСЕ люди после правок)
| Место | Было | Стало |
|---|---|---|
| Уроки Learning V2 (плеер, экран занятия) | есть, для всех (`submitOverride`) | без изменений |
| Шпиль (задание) | есть, для всех | без изменений |
| **Диалоги по сценам — реплика собеседника** | нет | флажок рядом с «озвучить / перевести / почему» (`dialogue-v2-report-<id>`) |
| **Диалоги по сценам — диалог целиком** | нет (пункт меню «Сообщить об ошибке» из макета сознательно не рисовали) | пункт в меню «⋯» (`dialogue-v2-session-menu-report`), в отчёте последние 12 реплик |
| **Свободный разговор — реплика / разговор целиком** | нет | флажок на реплике собеседника и флажок в шапке |
| **Тест уровня «Не хочу с начала» (каждое задание)** | нет | флажок в `ChapterExamQuestion`, экран `learning_v2_placement` |
| **Экзамен главы Learning V2 (каждое задание)** | нет | тот же `ChapterExamQuestion`, экран `learning_v2_chapter_exam` |
| Флажки `icon-flag` в классических уроках (`lesson_intro_screens`), карточках (`flashcards_recall/speaking/swipe`), старом ИИ-диалоге и «собеседнике» (`ai_dialog_session`, `ai_companion_session`), введении занятия V2 | были, но только в сборках разработки/тестеров | теперь видны всем: шлюз даёт флажку `icon-flag` общий транспорт (`REPORT_ERROR_FLAG_FOR_ALL`) |

## Не сделано — нужно решение
Текстовые «Нашёл ошибку?» (`variant` по умолчанию) остаются только у тестеров на экранах упражнений: `lesson1`, `lesson_words`, `lesson_irregular_verbs`, `preposition_drill`, `exam`, `level_exam`, `diagnostic_test`, `mistake_practice_session` (файл Codex, не тронут), `blitz`/true-false карточек (`flashcards_blitz_session`: флажка нет). Чтобы показать всем, текстовую ссылку надо заменить на тот же флажок в том же месте — это правка вида ~10 экранов; ждёт слова координатора/владельца.

## Политика конфиденциальности — нужна правка ДО релиза
`legal/privacy_policy_en.json` (и `_ios`), раздел 6 «User content, community packs, reports, and moderation» говорит о жалобах на наборы, комментарии и людей, а раздел 10 — о support-отчётах с журналом. **Жалоб на контент (задание, реплика ИИ, диалог) в тексте нет.** Что уходит к нам с такой жалобой: пояснение человека, текст задания или реплики собеседника, его ответ, для жалобы на диалог — последние реплики разговора, **включая реплики человека**, id места, язык контента и интерфейса, стабильный id аккаунта, платформа, версия приложения, время.

Предложение абзаца (добавить в раздел 6 после абзаца про жалобы на наборы; перевод на 9 языков — по процессу `npm run legal:sync` и Переводчику):

> Content reports. If you use the flag button to report a problem in a lesson task, test question, flashcard or AI conversation, we receive the explanation you write, the text of that task, card or reply, the answer you gave, the screen and item ID, the content language and interface language, your account ID, platform, app version and the time. If you report a whole conversation, we also receive its most recent messages, including messages you wrote. We use this only to fix content, answer you and prevent abuse; a moderator may use AI assistance to draft the reply from the report text. These reports do not include the technical action history that support reports can include. If the report cannot be sent right away, it is kept in a queue on your device and sent later.

Срок хранения: жалобы на контент лежат в той же коллекции `error_reports`, что и support-отчёты, — TTL 30 дней (`functions/src/log_ttl.ts`, `SUPPORT_REPORT_TTL_DAYS`) и удаление вместе с аккаунтом (`account_delete.ts`). Поэтому в предложенный абзац стоит добавить: «Content reports are deleted automatically 30 days after they are sent and together with your account.» Саму политику не менял: правка юридического текста — по слову владельца.
