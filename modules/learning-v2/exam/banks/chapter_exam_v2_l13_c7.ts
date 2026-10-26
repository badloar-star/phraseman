// chapter_exam_v2_l13_c7.ts — банк экзамена v2: урок 13, глава 7 (эпизоды 49–56). НЕ подключён: строку в BANKS
// (app/learning_v2_chapter_exam_v2.ts) добавляет Learning V2 после вычитки владельцем (docs/work/exam-banks/l13.md).
// зачем (владелец 26.10: экзамены глав v2 для всех уроков, войдут в 2.0.3): только слова и формы эпизодов 1–56 урока 13
// (повторение порядка событий: First…, Then…; купил, оплатил, забронировал); ситуация и ответ сходятся по смыслу; верных вариантов несколько. Сторож слов —
// tests/owner_locks_exam_episode_words_2026_10_25.test.ts. Эталон (первый в accepted) — полной формой, как в эпизодах.
import type { ChapterExamV2Bank } from '../chapter_exam_v2';

export const CHAPTER_EXAM_V2_BANK_L13_C7: ChapterExamV2Bank = {
  lessonOrdinal: 13,
  chapterOrdinal: 7,
  grammarPoints: [
    { id: 'l13c7_first', label: { ru: 'сначала — First', uk: 'спочатку — First' }, episodeOrdinals: [49, 50, 53] },
    { id: 'l13c7_then', label: { ru: 'потом — Then', uk: 'потім — Then' }, episodeOrdinals: [50, 52, 56] },
    { id: 'l13c7_booked', label: { ru: 'купил, оплатил, забронировал — bought, paid, booked', uk: 'купив, оплатив, забронював — bought, paid, booked' }, episodeOrdinals: [49, 52, 55] },
    { id: 'l13c7_ask', label: { ru: 'спросить — Did you …?', uk: 'запитати — Did you …?' }, episodeOrdinals: [51, 52, 53] },
  ],
  items: [
    // ── Ситуация → сам говоришь или пишешь ──────────────────────────────────────────────────────────────────────
    { id: 'l13c7-01', type: 'situation', grammarPoint: 'l13c7_first', situation: { ru: 'Ты рассказываешь о покупках. Первым делом ты проверил цену.', uk: 'Ти розповідаєш про покупки. Насамперед ти перевірив ціну.' }, accepted: ['First I checked the price.'] },
    { id: 'l13c7-02', type: 'situation', grammarPoint: 'l13c7_then', situation: { ru: 'Ты пересчитал монеты. Скажи, что потом положил их в копилку.', uk: 'Ти перерахував монети. Скажи, що потім поклав їх у скарбничку.' }, accepted: ['Then I put them in my piggy bank.'] },
    { id: 'l13c7-03', type: 'situation', grammarPoint: 'l13c7_booked', situation: { ru: 'Расскажи, что вы забронировали семейный номер.', uk: 'Розкажи, що ви забронювали сімейний номер.' }, accepted: ['We booked a family room.'] },
    { id: 'l13c7-04', type: 'situation', grammarPoint: 'l13c7_first', situation: { ru: 'Вы ужинали с друзьями. Расскажи, что сначала вы разделили счёт.', uk: 'Ви вечеряли з друзями. Розкажи, що спочатку ви розділили рахунок.' }, accepted: ['First we split the bill.'] },
    { id: 'l13c7-05', type: 'situation', grammarPoint: 'l13c7_ask', situation: { ru: 'Друг поздно вернулся с работы. Спроси, работал ли он сверхурочно.', uk: 'Друг пізно повернувся з роботи. Запитай, чи працював він понаднормово.' }, accepted: ['Did you work overtime?'] },
    { id: 'l13c7-06', type: 'situation', grammarPoint: 'l13c7_ask', situation: { ru: 'Спроси друга, платил ли он наличными.', uk: 'Запитай друга, чи платив він готівкою.' }, accepted: ['Did you pay in cash?'] },
    // ── Ответ в мини-диалоге ────────────────────────────────────────────────────────────────────────────────────
    { id: 'l13c7-07', type: 'dialogue', grammarPoint: 'l13c7_first', partnerLine: 'Then we chose half board.', situation: { ru: 'Скажи, что сначала вы выбрали отель.', uk: 'Скажи, що спочатку ви вибрали готель.' }, accepted: ['First we chose the hotel.'] },
    { id: 'l13c7-08', type: 'dialogue', grammarPoint: 'l13c7_then', partnerLine: 'First we went sightseeing.', situation: { ru: 'Скажи, что потом вам понравилась пешая экскурсия.', uk: 'Скажи, що потім вам сподобалася піша екскурсія.' }, accepted: ['Then we enjoyed the walking tour.'] },
    { id: 'l13c7-09', type: 'dialogue', grammarPoint: 'l13c7_booked', partnerLine: 'The milk was out of stock yesterday.', situation: { ru: 'Скажи, что ты купил хлеб за полцены.', uk: 'Скажи, що ти купив хліб за півціни.' }, accepted: ['I bought the half-price bread.'] },
    { id: 'l13c7-10', type: 'dialogue', grammarPoint: 'l13c7_first', partnerLine: 'Did you have any spare time?', situation: { ru: 'Скажи, что сначала ты закончил работу.', uk: 'Скажи, що спочатку ти закінчив роботу.' }, accepted: ['First I finished my work.'] },
    { id: 'l13c7-11', type: 'dialogue', grammarPoint: 'l13c7_then', partnerLine: 'First we caught our connecting flight.', situation: { ru: 'Скажи, что потом вы поехали домой.', uk: 'Скажи, що потім ви поїхали додому.' }, accepted: ['Then we went home.'] },
    { id: 'l13c7-12', type: 'dialogue', grammarPoint: 'l13c7_booked', partnerLine: 'We split the bill.', situation: { ru: 'Скажи, что ты заплатил наличными.', uk: 'Скажи, що ти заплатив готівкою.' }, accepted: ['I paid in cash.'] },
    // ── Найди и исправь ошибку ──────────────────────────────────────────────────────────────────────────────────
    { id: 'l13c7-13', type: 'fix', grammarPoint: 'l13c7_ask', wrong: 'Did you booked a coach tour?', accepted: ['Did you book a coach tour?'] },
    { id: 'l13c7-14', type: 'fix', grammarPoint: 'l13c7_then', wrong: 'Then I request a wake-up call.', accepted: ['Then I requested a wake-up call.'] },
    { id: 'l13c7-15', type: 'fix', grammarPoint: 'l13c7_booked', wrong: 'We book a family room yesterday.', accepted: ['We booked a family room yesterday.'] },
    { id: 'l13c7-16', type: 'fix', grammarPoint: 'l13c7_then', wrong: 'Then we ask for a sea view.', accepted: ['Then we asked for a sea view.'] },
  ],
};
