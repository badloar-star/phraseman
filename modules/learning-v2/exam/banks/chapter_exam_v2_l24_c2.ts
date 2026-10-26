// chapter_exam_v2_l24_c2.ts — банк экзамена v2: урок 24, глава 2 (эпизоды 9–16). Подключён в registry_l24_l26.ts.
// зачем: только слова и формы эпизодов 1–16 урока 24 — сам вопрос «How long have you had…?» (эпизоды 9–13; с 92b29de96 «?» запрещён
// только в уроке 1, координатор 26.10: вопросы нужны, где они есть в эпизодах), ответ на него через for / since, just / already и
// not … yet (эпизоды 14–16). Сторож слов — tests/owner_locks_exam_episode_words_2026_10_25.test.ts.
import type { ChapterExamV2Bank } from '../chapter_exam_v2';

export const CHAPTER_EXAM_V2_BANK_L24_C2: ChapterExamV2Bank = {
  lessonOrdinal: 24,
  chapterOrdinal: 2,
  grammarPoints: [
    { id: 'l24c2_question', label: { ru: 'вопрос — How long have you had…?', uk: 'питання — How long have you had…?' }, episodeOrdinals: [9, 10, 11] },
    { id: 'l24c2_how_long', label: { ru: 'ответ на How long — for / since', uk: 'відповідь на How long — for / since' }, episodeOrdinals: [11, 12, 13] },
    { id: 'l24c2_just_already', label: { ru: 'только что / уже — just, already', uk: 'щойно / вже — just, already' }, episodeOrdinals: [14, 15, 16] },
    { id: 'l24c2_not_yet', label: { ru: 'ещё не — not … yet', uk: 'ще не — not … yet' }, episodeOrdinals: [15] },
  ],
  items: [
    // ── Ситуация → сам говоришь или пишешь ───────────────────────────────────────────────────────────────────────
    { id: 'l24c2-01', type: 'situation', grammarPoint: 'l24c2_question', situation: { ru: 'Ты зашёл в старый книжный магазин. Спроси продавца, как давно существует этот магазин.', uk: 'Ти зайшов до старої книгарні. Запитай продавця, як давно існує ця крамниця.' }, accepted: ['How long has this shop existed?'] },
    { id: 'l24c2-02', type: 'situation', grammarPoint: 'l24c2_question', situation: { ru: 'Друг носит руку на перевязи. Спроси, как давно.', uk: 'Друг носить руку на пов’язці. Запитай, як давно.' }, accepted: ['How long have you worn a sling?'] },
    { id: 'l24c2-03', type: 'situation', grammarPoint: 'l24c2_how_long', situation: { ru: 'Стоматолог спрашивает, как давно у тебя брекеты. Ответь: два года.', uk: 'Стоматолог питає, як давно в тебе брекети. Відповідай: два роки.' }, accepted: ['I have had braces for two years.', "I've had braces for two years."] },
    { id: 'l24c2-04', type: 'situation', grammarPoint: 'l24c2_how_long', situation: { ru: 'Врач спрашивает, как давно у тебя астма. Ответь: с детства.', uk: 'Лікар питає, як давно в тебе астма. Відповідай: з дитинства.' }, accepted: ['I have had asthma since childhood.', "I've had asthma since childhood."] },
    { id: 'l24c2-05', type: 'situation', grammarPoint: 'l24c2_just_already', situation: { ru: 'Вы смотрите фильм, и тебе звонят. Скажи, что ты только что поставил фильм на паузу.', uk: 'Ви дивитеся фільм, і тобі дзвонять. Скажи, що ти щойно поставив фільм на паузу.' }, accepted: ['I have just paused the film.', "I've just paused the film."] },
    { id: 'l24c2-06', type: 'situation', grammarPoint: 'l24c2_not_yet', situation: { ru: 'Ты с утра ждёшь ответа от коллеги. Скажи, что он ещё не ответил.', uk: 'Ти з ранку чекаєш на відповідь від колеги. Скажи, що він ще не відповів.' }, accepted: ['He has not responded yet.', "He hasn't responded yet."] },
    // ── Ответ в мини-диалоге ──────────────────────────────────────────────────────────────────────────────────────
    { id: 'l24c2-07', type: 'dialogue', grammarPoint: 'l24c2_question', partnerLine: 'I have a bruise.', situation: { ru: 'Спроси, как давно у него этот синяк.', uk: 'Запитай, як давно в нього цей синець.' }, accepted: ['How long have you had this bruise?', 'How long have you had the bruise?'] },
    { id: 'l24c2-08', type: 'dialogue', grammarPoint: 'l24c2_how_long', partnerLine: 'She has had a fringe for a month.', situation: { ru: 'Поправь: у неё чёлка с мая.', uk: 'Виправ: у неї чубчик із травня.' }, accepted: ['She has had a fringe since May.'] },
    { id: 'l24c2-09', type: 'dialogue', grammarPoint: 'l24c2_just_already', partnerLine: 'Please check the sum.', situation: { ru: 'Скажи, что ты уже проверил сумму.', uk: 'Скажи, що ти вже перевірив суму.' }, accepted: ['I have already checked the sum.', "I've already checked the sum."] },
    { id: 'l24c2-10', type: 'dialogue', grammarPoint: 'l24c2_just_already', partnerLine: 'Please announce the result.', situation: { ru: 'Скажи, что вы только что объявили результат.', uk: 'Скажи, що ви щойно оголосили результат.' }, accepted: ['We have just announced the result.', "We've just announced the result."] },
    { id: 'l24c2-11', type: 'dialogue', grammarPoint: 'l24c2_not_yet', partnerLine: 'We need to discuss the plan.', situation: { ru: 'Согласись: вы его ещё не обсудили.', uk: 'Погодься: ви його ще не обговорили.' }, accepted: ['We have not discussed the plan yet.', "We haven't discussed the plan yet."] },
    { id: 'l24c2-12', type: 'dialogue', grammarPoint: 'l24c2_how_long', partnerLine: 'How long have you used crutches?', situation: { ru: 'Ответь: две недели.', uk: 'Відповідай: два тижні.' }, accepted: ['I have used crutches for two weeks.', "I've used crutches for two weeks."] },
    // ── Найди и исправь ошибку ────────────────────────────────────────────────────────────────────────────────────
    { id: 'l24c2-13', type: 'fix', grammarPoint: 'l24c2_question', wrong: 'How long you have had braces?', accepted: ['How long have you had braces?'] },
    { id: 'l24c2-14', type: 'fix', grammarPoint: 'l24c2_just_already', wrong: 'We have already discuss the plan.', accepted: ['We have already discussed the plan.', "We've already discussed the plan."] },
    { id: 'l24c2-15', type: 'fix', grammarPoint: 'l24c2_not_yet', wrong: 'She has not responded already.', accepted: ['She has not responded yet.', "She hasn't responded yet."] },
    { id: 'l24c2-16', type: 'fix', grammarPoint: 'l24c2_how_long', wrong: 'I have had this bruise since a week.', accepted: ['I have had this bruise for a week.'] },
  ],
};
