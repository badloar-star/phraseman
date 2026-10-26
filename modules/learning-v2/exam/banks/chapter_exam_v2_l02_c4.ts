// chapter_exam_v2_l02_c4.ts — банк экзамена v2: урок 2, глава 4 (эпизоды 25–32).
// зачем (слово владельца 26.10 «банки для всех уроков и глав — в 2.0.3»): глава 4 урока 2 вводит вопросы who / what / where (25–32) и
// описание вещей новыми словами (вкус, состояние, ценность). Слова в «исправь ошибку» — только знакомые. Сторож слов —
// owner_locks_exam_episode_words.
import type { ChapterExamV2Bank } from '../chapter_exam_v2';

export const CHAPTER_EXAM_V2_BANK_L02_C4: ChapterExamV2Bank = {
  lessonOrdinal: 2,
  chapterOrdinal: 4,
  grammarPoints: [
    { id: 'l02c4_where', label: { ru: 'где — Where is / are …?', uk: 'де — Where is / are …?' }, episodeOrdinals: [25, 26, 29] },
    { id: 'l02c4_who_what', label: { ru: 'кто и что — Who / What is …?', uk: 'хто і що — Who / What is …?' }, episodeOrdinals: [25, 26, 28] },
    { id: 'l02c4_state', label: { ru: 'какая вещь — it is', uk: 'яка річ — it is' }, episodeOrdinals: [27, 30, 31] },
  ],
  items: [
    // ── Ситуация → сам говоришь или пишешь ───────────────────────────────────────────────────────────────────────
    { id: 'l02c4-01', type: 'situation', grammarPoint: 'l02c4_where', situation: { ru: 'Жена должна была вернуться час назад. Спроси у сына, где она.', uk: 'Дружина мала повернутися годину тому. Запитай сина, де вона.' }, accepted: ['Where is she?'] },
    { id: 'l02c4-02', type: 'situation', grammarPoint: 'l02c4_who_what', situation: { ru: 'На совещании пустует один стул. Спроси, кого нет.', uk: 'На нараді порожній один стілець. Запитай, кого немає.' }, accepted: ['Who is absent?'] },
    { id: 'l02c4-03', type: 'situation', grammarPoint: 'l02c4_state', situation: { ru: 'Ты попробовал соус и машешь рукой у рта. Скажи, что он острый.', uk: 'Ти скуштував соус і махаєш рукою біля рота. Скажи, що він гострий.' }, accepted: ['It is spicy.', "It's spicy."] },
    { id: 'l02c4-04', type: 'situation', grammarPoint: 'l02c4_who_what', situation: { ru: 'Друг молча вручает тебе странный свёрток. Спроси, что это.', uk: 'Друг мовчки вручає тобі дивний пакунок. Запитай, що це.' }, accepted: ['What is it?'] },
    { id: 'l02c4-05', type: 'situation', grammarPoint: 'l02c4_where', situation: { ru: 'Ключей нет на привычном крючке. Спроси у мужа, где они.', uk: 'Ключів немає на звичному гачку. Запитай чоловіка, де вони.' }, accepted: ['Where are they?'] },
    { id: 'l02c4-06', type: 'situation', grammarPoint: 'l02c4_state', situation: { ru: 'Ты вернулся из отпуска: цветок на окне поник. Скажи, что он завял.', uk: 'Ти повернувся з відпустки: квітка на вікні поникла. Скажи, що вона зів’яла.' }, accepted: ['It is wilted.', "It's wilted."] },
    // ── Ответ в мини-диалоге ──────────────────────────────────────────────────────────────────────────────────────
    { id: 'l02c4-07', type: 'dialogue', grammarPoint: 'l02c4_where', partnerLine: 'He is away.', situation: { ru: 'Секретарь говорит про начальника. Спроси, где он.', uk: 'Секретарка говорить про начальника. Запитай, де він.' }, accepted: ['Where is he?'] },
    { id: 'l02c4-08', type: 'dialogue', grammarPoint: 'l02c4_who_what', partnerLine: 'They are worried.', situation: { ru: 'Кто-то в команде переживает из-за сроков. Спроси, кто волнуется.', uk: 'Хтось у команді переживає через терміни. Запитай, хто хвилюється.' }, accepted: ['Who is worried?'] },
    { id: 'l02c4-09', type: 'dialogue', grammarPoint: 'l02c4_state', partnerLine: 'It is fresh.', situation: { ru: 'Возрази: хлеб почернел в тостере — он подгорел.', uk: 'Заперечи: хліб почорнів у тостері — він підгорів.' }, accepted: ['It is burnt.', "It's burnt.", 'It is not fresh.', "It's not fresh."] },
    { id: 'l02c4-10', type: 'dialogue', grammarPoint: 'l02c4_who_what', partnerLine: 'She is absent.', situation: { ru: 'Учитель называет незнакомое тебе имя. Спроси, кто она.', uk: 'Учитель називає незнайоме тобі ім’я. Запитай, хто вона.' }, accepted: ['Who is she?'] },
    { id: 'l02c4-11', type: 'dialogue', grammarPoint: 'l02c4_where', partnerLine: 'It is elsewhere.', situation: { ru: 'Сосед говорит, что твоя посылка не у него. Спроси, где она.', uk: 'Сусід каже, що твоя посилка не в нього. Запитай, де вона.' }, accepted: ['Where is it?'] },
    { id: 'l02c4-12', type: 'dialogue', grammarPoint: 'l02c4_state', partnerLine: 'It is cheap.', situation: { ru: 'Возрази: эта старинная ваза стоит целое состояние — она ценная.', uk: 'Заперечи: ця старовинна ваза коштує цілий статок — вона цінна.' }, accepted: ['It is valuable.', "It's valuable.", 'It is not cheap.', "It's not cheap."] },
    // ── Найди и исправь ошибку ────────────────────────────────────────────────────────────────────────────────────
    { id: 'l02c4-13', type: 'fix', grammarPoint: 'l02c4_where', wrong: 'Where she is?', accepted: ['Where is she?'] },
    { id: 'l02c4-14', type: 'fix', grammarPoint: 'l02c4_who_what', wrong: 'Who she is?', accepted: ['Who is she?'] },
    { id: 'l02c4-15', type: 'fix', grammarPoint: 'l02c4_who_what', wrong: 'What it is?', accepted: ['What is it?'] },
    { id: 'l02c4-16', type: 'fix', grammarPoint: 'l02c4_where', wrong: 'Where is they?', accepted: ['Where are they?'] },
  ],
};
