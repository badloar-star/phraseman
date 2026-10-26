// chapter_exam_v2_l15_c7.ts — банк экзамена v2: урок 15, глава 7 (эпизоды 49–56). НЕ подключён: строку в BANKS
// (app/learning_v2_chapter_exam_v2.ts) добавляет Learning V2 после вычитки владельцем (docs/work/exam-banks/l15.md).
// зачем (владелец 26.10: экзамены глав v2 для всех уроков, войдут в 2.0.3): только слова и формы эпизодов 1–56 урока 15
// (повторение going to и am / are + -ing: поездки, покупки, забираем заказ); ситуация и ответ сходятся по смыслу; верных вариантов несколько. Сторож слов —
// tests/owner_locks_exam_episode_words_2026_10_25.test.ts. Эталон (первый в accepted) — полной формой, как в эпизодах.
import type { ChapterExamV2Bank } from '../chapter_exam_v2';

export const CHAPTER_EXAM_V2_BANK_L15_C7: ChapterExamV2Bank = {
  lessonOrdinal: 15,
  chapterOrdinal: 7,
  grammarPoints: [
    { id: 'l15c7_going_to', label: { ru: 'решил сделать — going to', uk: 'вирішив зробити — going to' }, episodeOrdinals: [49, 50, 56] },
    { id: 'l15c7_collecting', label: { ru: 'договорились забрать — are collecting tomorrow', uk: 'домовилися забрати — are collecting tomorrow' }, episodeOrdinals: [51, 52, 53] },
    { id: 'l15c7_travel', label: { ru: 'поездка в планах — are staying / travelling', uk: 'поїздка в планах — are staying / travelling' }, episodeOrdinals: [49, 50, 54] },
  ],
  items: [
    // ── Ситуация → сам говоришь или пишешь ──────────────────────────────────────────────────────────────────────
    { id: 'l15c7-01', type: 'situation', grammarPoint: 'l15c7_going_to', situation: { ru: 'Тебе хочется к морю. Скажи, что собираешься съездить в приморский город.', uk: 'Тобі хочеться до моря. Скажи, що збираєшся поїхати до приморського міста.' }, accepted: ['I am going to visit a coastal town.'] },
    { id: 'l15c7-02', type: 'situation', grammarPoint: 'l15c7_collecting', situation: { ru: 'Магазин подтвердил: завтра вы забираете фланелевую рубашку. Скажи.', uk: 'Магазин підтвердив: завтра ви забираєте фланелеву сорочку. Скажи.' }, accepted: ['We are collecting the flannel shirt tomorrow.'] },
    { id: 'l15c7-03', type: 'situation', grammarPoint: 'l15c7_travel', situation: { ru: 'Жильё забронировано: на следующей неделе вы живёте за городом. Скажи.', uk: 'Житло заброньовано: наступного тижня ви живете за містом. Скажи.' }, accepted: ['We are staying in a rural area next week.'] },
    { id: 'l15c7-04', type: 'situation', grammarPoint: 'l15c7_going_to', situation: { ru: 'Тебе хочется тишины. Скажи, что найдёшь уединённый пляж.', uk: 'Тобі хочеться тиші. Скажи, що знайдеш відлюднений пляж.' }, accepted: ['I am going to find a secluded beach.'] },
    { id: 'l15c7-05', type: 'situation', grammarPoint: 'l15c7_collecting', situation: { ru: 'Договорились с магазином: завтра вы забираете несладкий йогурт. Скажи.', uk: 'Домовилися з магазином: завтра ви забираєте несолодкий йогурт. Скажи.' }, accepted: ['We are collecting the unsweetened yoghurt tomorrow.'] },
    { id: 'l15c7-06', type: 'situation', grammarPoint: 'l15c7_travel', situation: { ru: 'Билеты куплены: вы едете на школьные каникулы в середине четверти. Скажи.', uk: 'Квитки куплено: ви їдете на шкільні канікули в середині чверті. Скажи.' }, accepted: ['We are travelling at half-term.'] },
    // ── Ответ в мини-диалоге ────────────────────────────────────────────────────────────────────────────────────
    { id: 'l15c7-07', type: 'dialogue', grammarPoint: 'l15c7_going_to', partnerLine: 'We are collecting the dress tomorrow.', situation: { ru: 'Скажи, что ты собираешься купить шарф.', uk: 'Скажи, що ти збираєшся купити шарф.' }, accepted: ['I am going to buy a scarf.'] },
    { id: 'l15c7-08', type: 'dialogue', grammarPoint: 'l15c7_collecting', partnerLine: 'I am going to buy a jacket.', situation: { ru: 'Скажи, что завтра вы забираете рубашку.', uk: 'Скажи, що завтра ви забираєте сорочку.' }, accepted: ['We are collecting the shirt tomorrow.'] },
    { id: 'l15c7-09', type: 'dialogue', grammarPoint: 'l15c7_travel', partnerLine: 'I am going to choose a room.', situation: { ru: 'Скажи, что на следующей неделе вы живёте в этом доме.', uk: 'Скажи, що наступного тижня ви живете в цьому будинку.' }, accepted: ['We are staying at the house next week.'] },
    { id: 'l15c7-10', type: 'dialogue', grammarPoint: 'l15c7_going_to', partnerLine: 'We are having a lesson tomorrow.', situation: { ru: 'Скажи, что ты собираешься перемешать карты.', uk: 'Скажи, що ти збираєшся перетасувати карти.' }, accepted: ['I am going to shuffle the cards.'] },
    { id: 'l15c7-11', type: 'dialogue', grammarPoint: 'l15c7_collecting', partnerLine: 'I am going to buy some bread.', situation: { ru: 'Скажи, что завтра вы забираете продукты.', uk: 'Скажи, що завтра ви забираєте продукти.' }, accepted: ['We are collecting the food tomorrow.'] },
    { id: 'l15c7-12', type: 'dialogue', grammarPoint: 'l15c7_travel', partnerLine: 'We are visiting the museum next month.', situation: { ru: 'Скажи, что ты собираешься путешествовать две недели.', uk: 'Скажи, що ти збираєшся подорожувати два тижні.' }, accepted: ['I am going to travel for two weeks.'] },
    // ── Найди и исправь ошибку ──────────────────────────────────────────────────────────────────────────────────
    { id: 'l15c7-13', type: 'fix', grammarPoint: 'l15c7_going_to', wrong: 'I am going to buying a tweed jacket.', accepted: ['I am going to buy a tweed jacket.'] },
    { id: 'l15c7-14', type: 'fix', grammarPoint: 'l15c7_collecting', wrong: 'We collecting the coat on Saturday.', accepted: ['We are collecting the coat on Saturday.'] },
    { id: 'l15c7-15', type: 'fix', grammarPoint: 'l15c7_travel', wrong: 'We is travelling at half-term.', accepted: ['We are travelling at half-term.'] },
    { id: 'l15c7-16', type: 'fix', grammarPoint: 'l15c7_going_to', wrong: 'She going to buy a tartan skirt.', accepted: ['She is going to buy a tartan skirt.'] },
  ],
};
