// chapter_exam_v2_l24_c2.ts — банк экзамена v2: урок 24, глава 2 (эпизоды 9–16). Подключён в registry_l24_l26.ts.
// зачем: только слова и формы эпизодов 1–16 урока 24. Сами вопросы «How long…?» в банк не входят — правила банков запрещают знак
// вопроса (tests/learning_v2_chapter_exam_v2_banks_rules.test.ts), поэтому проверяем ответ на такой вопрос: for / since.
// Плюс just / already и not … yet (эпизоды 14–16). Сторож слов — tests/owner_locks_exam_episode_words_2026_10_25.test.ts.
import type { ChapterExamV2Bank } from '../chapter_exam_v2';

export const CHAPTER_EXAM_V2_BANK_L24_C2: ChapterExamV2Bank = {
  lessonOrdinal: 24,
  chapterOrdinal: 2,
  grammarPoints: [
    { id: 'l24c2_how_long', label: { ru: 'ответ на How long — for / since', uk: 'відповідь на How long — for / since' }, episodeOrdinals: [9, 11, 12] },
    { id: 'l24c2_just_already', label: { ru: 'только что / уже — just, already', uk: 'щойно / вже — just, already' }, episodeOrdinals: [14, 15, 16] },
    { id: 'l24c2_not_yet', label: { ru: 'ещё не — not … yet', uk: 'ще не — not … yet' }, episodeOrdinals: [15] },
  ],
  items: [
    // ── Ситуация → сам говоришь или пишешь ───────────────────────────────────────────────────────────────────────
    { id: 'l24c2-01', type: 'situation', grammarPoint: 'l24c2_how_long', situation: { ru: 'Стоматолог спрашивает, как давно у тебя брекеты. Ответь: два года.', uk: 'Стоматолог питає, як давно в тебе брекети. Відповідай: два роки.' }, accepted: ['I have had braces for two years.', "I've had braces for two years."] },
    { id: 'l24c2-02', type: 'situation', grammarPoint: 'l24c2_how_long', situation: { ru: 'Врач спрашивает, как давно у тебя астма. Ответь: с детства.', uk: 'Лікар питає, як давно в тебе астма. Відповідай: з дитинства.' }, accepted: ['I have had asthma since childhood.', "I've had asthma since childhood."] },
    { id: 'l24c2-03', type: 'situation', grammarPoint: 'l24c2_how_long', situation: { ru: 'Друг спрашивает, сколько ты уже ходишь на костылях. Ответь: две недели.', uk: 'Друг питає, скільки ти вже ходиш на милицях. Відповідай: два тижні.' }, accepted: ['I have used crutches for two weeks.', "I've used crutches for two weeks."] },
    { id: 'l24c2-04', type: 'situation', grammarPoint: 'l24c2_just_already', situation: { ru: 'Вы смотрите фильм, и тебе звонят. Скажи, что ты только что поставил фильм на паузу.', uk: 'Ви дивитеся фільм, і тобі дзвонять. Скажи, що ти щойно поставив фільм на паузу.' }, accepted: ['I have just paused the film.', "I've just paused the film."] },
    { id: 'l24c2-05', type: 'situation', grammarPoint: 'l24c2_just_already', situation: { ru: 'Начальник хочет обсудить план поездки. Скажи, что вы с командой его уже обсудили.', uk: 'Начальник хоче обговорити план поїздки. Скажи, що ви з командою його вже обговорили.' }, accepted: ['We have already discussed the plan.', "We've already discussed the plan."] },
    { id: 'l24c2-06', type: 'situation', grammarPoint: 'l24c2_not_yet', situation: { ru: 'Ты с утра ждёшь ответа от коллеги. Скажи, что он ещё не ответил.', uk: 'Ти з ранку чекаєш на відповідь від колеги. Скажи, що він ще не відповів.' }, accepted: ['He has not responded yet.', "He hasn't responded yet."] },
    // ── Ответ в мини-диалоге ──────────────────────────────────────────────────────────────────────────────────────
    { id: 'l24c2-07', type: 'dialogue', grammarPoint: 'l24c2_how_long', partnerLine: 'She has had a fringe for a month.', situation: { ru: 'Поправь: у неё чёлка с мая.', uk: 'Виправ: у неї чубчик із травня.' }, accepted: ['She has had a fringe since May.'] },
    { id: 'l24c2-08', type: 'dialogue', grammarPoint: 'l24c2_just_already', partnerLine: 'Please check the sum.', situation: { ru: 'Скажи, что ты уже проверил сумму.', uk: 'Скажи, що ти вже перевірив суму.' }, accepted: ['I have already checked the sum.', "I've already checked the sum."] },
    { id: 'l24c2-09', type: 'dialogue', grammarPoint: 'l24c2_just_already', partnerLine: 'Please announce the result.', situation: { ru: 'Скажи, что вы только что объявили результат.', uk: 'Скажи, що ви щойно оголосили результат.' }, accepted: ['We have just announced the result.', "We've just announced the result."] },
    { id: 'l24c2-10', type: 'dialogue', grammarPoint: 'l24c2_just_already', partnerLine: 'Please respond to my message.', situation: { ru: 'Скажи, что ты только что ответил на его сообщение.', uk: 'Скажи, що ти щойно відповів на його повідомлення.' }, accepted: ['I have just responded to your message.', "I've just responded to your message.", 'I have just responded.', "I've just responded."] },
    { id: 'l24c2-11', type: 'dialogue', grammarPoint: 'l24c2_how_long', partnerLine: 'He has had this scar for a year.', situation: { ru: 'Поправь: у него этот шрам с детства.', uk: 'Виправ: у нього цей шрам із дитинства.' }, accepted: ['He has had this scar since childhood.'] },
    { id: 'l24c2-12', type: 'dialogue', grammarPoint: 'l24c2_not_yet', partnerLine: 'We need to discuss the plan.', situation: { ru: 'Согласись: вы его ещё не обсудили.', uk: 'Погодься: ви його ще не обговорили.' }, accepted: ['We have not discussed the plan yet.', "We haven't discussed the plan yet."] },
    // ── Найди и исправь ошибку ────────────────────────────────────────────────────────────────────────────────────
    { id: 'l24c2-13', type: 'fix', grammarPoint: 'l24c2_how_long', wrong: 'I have had this bruise since a week.', accepted: ['I have had this bruise for a week.'] },
    { id: 'l24c2-14', type: 'fix', grammarPoint: 'l24c2_just_already', wrong: 'We have already discuss the plan.', accepted: ['We have already discussed the plan.', "We've already discussed the plan."] },
    { id: 'l24c2-15', type: 'fix', grammarPoint: 'l24c2_not_yet', wrong: 'She has not responded already.', accepted: ['She has not responded yet.', "She hasn't responded yet."] },
    { id: 'l24c2-16', type: 'fix', grammarPoint: 'l24c2_just_already', wrong: 'He have just paused the film.', accepted: ['He has just paused the film.'] },
  ],
};
