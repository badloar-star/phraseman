# Помощник «засчитанное занятие» для Ядра + 6 дефектов экзамена (Learning V2, 22.10)

Governance-ID: TG-9C18050F29C2
Governance-ID: TG-070347B5ABB4
Governance-ID: TG-4D68764B05C8

## Outcome

1. Ядро («Урок вместе», решение владельца по «Друзьям») получает `readRequiredSessionCompletionFactV1(tx, db, { authUid,
   stableUid, mutationId })` → `{ lessonOrdinal, sessionOrdinal, studyTarget, awardedAtMs } | null` ровно под свой
   `LessonCompletionReader` в `functions/src/friends_lesson_together.ts`.
2. Экзамен главы по показу Сверки (sverka-status §22): одна «Проверить»; без «Попробуй ещё раз»; выбор в «Послушай и
   выбери» не раскрывает слово; заголовок итога по числу верных; «12» цифрой; разбор не уходит под часы.

## Scope

- Новый файл `functions/src/learning_v2/required_session_completion_fact_reader.ts` + тест; в
  `required_session_completion_callable.ts` — только экспорт формулы id документа (внутренний `inboxDocumentId` зовёт её,
  поведение то же).
- Экран экзамена `app/learning-v2/chapter-exam.tsx`, итог/разбор `components/learning-v2/LearningV2ChapterExamResult.tsx`,
  тексты `learning_v2_chapter_exam_result_copy.ts`. Общий роутер заданий не меняется для занятий — только режим экзамена.

## Architecture

- Помощник только читает внутри переданной транзакции: `auth_links/{authUid}` (stable_id = stableUid), надгробие,
  `users/{stableUid}` (поколение аккаунта → progressAccountScopeHash той же формулой, что засчитывание), затем
  `users/{stableUid}/v2_required_session_completion_inbox/{rsciv1_…}`. Запись разбирается тем же
  `parseStructuralRequiredSessionCompletionInboxRecord`. Нет записи / чужая / другое поколение → null.
- Урок — из episodeId, иначе из canonicalSessionId (одинаково для en и es); номер занятия — `requiredSessionOrdinal`;
  время — `createTime` документа (в записи времени нет).
- Экзамен: флаг режима экзамена в существующих компонентах, без новых экранов.

## Security and privacy

Новых данных не собирается. Помощник не пишет и не раскрывает чужие записи: проверка владельца по auth_links и
поколению, как в самом засчитывании. Firestore: 4 чтения по документам, без запросов по коллекциям.

## Technical debt

Подключение помощника в `friendsLessonTogetherClaim` делает Ядро (их файл). Тексты заголовков итога 0–5 / 6–9 — на
вычитку Переводчику.

## Verification

Точечные тесты после снятия «тишины»: тест помощника (functions jest --no-watchman), тесты экзамена
(`tests/learning_v2_chapter_exam_screen_v1.test.ts`, итог/разбор). Без эмулятора (запрет владельца).

## Rollback

git revert коммитов задачи.

Governance-ID: TG-D35C2B2094B5

Governance-ID: TG-9431470DC4BD

## Дополнение 22.10: «Не хочу с начала» — один раз на аккаунт (слово владельца)

- `app/learning_v2_not_from_start_once_v1.ts`: флаг `learning_v2_not_from_start_used_v1` ставит телефон в момент нажатия
  (память + AsyncStorage), облако хранит: ключ в `SYNC_KEYS`, слияние ИЛИ (`mergeTruthyFlagRestoreValue`) — переживает
  переустановку. Кэш процесса привязан к владельцу аккаунта. Журнал `[PLACEMENT-ONCE]` (read / mark / button / сбои).
- `SeasonCourseConnected.tsx`: обработчик передаётся только пока флаг не стоит; до чтения флага кнопки нет (показать второй
  раз хуже, чем на миг позже). Вид и место кнопки не менялись (`SeasonCourseView.tsx` правит другая сессия).
- Теста-распределения по макету в коде ещё нет: кнопка открывает список уроков; «прошёл» = нажал.
- Сторож: `tests/learning_v2_not_from_start_once_v1.test.ts`.
