// chapter_exam_v2_l15_c4.ts — банк экзамена v2: урок 15, глава 4 (эпизоды 25–32). НЕ подключён: строку в BANKS
// (app/learning_v2_chapter_exam_v2.ts) добавляет Learning V2 после вычитки владельцем (docs/work/exam-banks/l15.md).
// зачем (владелец 26.10: экзамены глав v2 для всех уроков, войдут в 2.0.3): только слова и формы эпизодов 1–32 урока 15
// (going to для решения и am / are + -ing для договорённости со временем; новые занятия); ситуация и ответ сходятся по смыслу; верных вариантов несколько. Сторож слов —
// tests/owner_locks_exam_episode_words_2026_10_25.test.ts. Эталон (первый в accepted) — полной формой, как в эпизодах.
import type { ChapterExamV2Bank } from '../chapter_exam_v2';

export const CHAPTER_EXAM_V2_BANK_L15_C4: ChapterExamV2Bank = {
  lessonOrdinal: 15,
  chapterOrdinal: 4,
  grammarPoints: [
    { id: 'l15c4_going_to', label: { ru: 'решил сделать — going to', uk: 'вирішив зробити — going to' }, episodeOrdinals: [25, 26, 27] },
    { id: 'l15c4_arranged', label: { ru: 'уже договорились — are …ing + время', uk: 'уже домовилися — are …ing + час' }, episodeOrdinals: [27, 28, 29] },
    { id: 'l15c4_hobby', label: { ru: 'новое занятие — going to try / are trying', uk: 'нове заняття — going to try / are trying' }, episodeOrdinals: [31, 32] },
  ],
  items: [
    // ── Ситуация → сам говоришь или пишешь ──────────────────────────────────────────────────────────────────────
    { id: 'l15c4-01', type: 'situation', grammarPoint: 'l15c4_going_to', situation: { ru: 'Пропуск скоро закончится. Скажи, что собираешься его продлить.', uk: 'Перепустка скоро закінчиться. Скажи, що збираєшся її продовжити.' }, accepted: ['I am going to renew my pass.'] },
    { id: 'l15c4-02', type: 'situation', grammarPoint: 'l15c4_arranged', situation: { ru: 'Мастер ждёт вас в пятницу: вы забираете обувь из ремонта. Скажи.', uk: 'Майстер чекає на вас у п’ятницю: ви забираєте взуття з ремонту. Скажи.' }, accepted: ['We are collecting the shoes on Friday.'] },
    { id: 'l15c4-03', type: 'situation', grammarPoint: 'l15c4_hobby', situation: { ru: 'Ты решил попробовать оригами. Скажи об этом.', uk: 'Ти вирішив спробувати орігамі. Скажи про це.' }, accepted: ['I am going to try origami.'] },
    { id: 'l15c4-04', type: 'situation', grammarPoint: 'l15c4_going_to', situation: { ru: 'Стиральная машина сломалась. Скажи, что пойдёшь в прачечную самообслуживания.', uk: 'Пральна машина зламалася. Скажи, що підеш до пральні самообслуговування.' }, accepted: ['I am going to use the launderette.'] },
    { id: 'l15c4-05', type: 'situation', grammarPoint: 'l15c4_arranged', situation: { ru: 'Магазин подтвердил: завтра вы забираете заказ. Скажи.', uk: 'Магазин підтвердив: завтра ви забираєте замовлення. Скажи.' }, accepted: ['We are collecting the order tomorrow.'] },
    { id: 'l15c4-06', type: 'situation', grammarPoint: 'l15c4_hobby', situation: { ru: 'Друзья договорились сегодня ночью смотреть на звёзды. Расскажи.', uk: 'Друзі домовилися сьогодні вночі дивитися на зорі. Розкажи.' }, accepted: ['They are going stargazing tonight.'] },
    // ── Ответ в мини-диалоге ────────────────────────────────────────────────────────────────────────────────────
    { id: 'l15c4-07', type: 'dialogue', grammarPoint: 'l15c4_going_to', partnerLine: 'We are meeting on Friday.', situation: { ru: 'Скажи, что ты собираешься вступить в клуб.', uk: 'Скажи, що ти збираєшся вступити до клубу.' }, accepted: ['I am going to join the club.'] },
    { id: 'l15c4-08', type: 'dialogue', grammarPoint: 'l15c4_arranged', partnerLine: 'I am going to check the car.', situation: { ru: 'Скажи, что завтра вы встречаетесь с механиком.', uk: 'Скажи, що завтра ви зустрічаєтеся з механіком.' }, accepted: ['We are meeting the mechanic tomorrow.'] },
    { id: 'l15c4-09', type: 'dialogue', grammarPoint: 'l15c4_hobby', partnerLine: 'I am going to make an album.', situation: { ru: 'Скажи, что завтра вы пробуете каллиграфию.', uk: 'Скажи, що завтра ви пробуєте каліграфію.' }, accepted: ['We are trying calligraphy tomorrow.'] },
    { id: 'l15c4-10', type: 'dialogue', grammarPoint: 'l15c4_going_to', partnerLine: 'We are visiting the museum on Sunday.', situation: { ru: 'Скажи, что ты собираешься купить билет.', uk: 'Скажи, що ти збираєшся купити квиток.' }, accepted: ['I am going to buy a ticket.'] },
    { id: 'l15c4-11', type: 'dialogue', grammarPoint: 'l15c4_arranged', partnerLine: 'I am going to call my family.', situation: { ru: 'Скажи, что вы встречаетесь в воскресенье утром.', uk: 'Скажи, що ви зустрічаєтеся в неділю вранці.' }, accepted: ['We are meeting on Sunday morning.'] },
    { id: 'l15c4-12', type: 'dialogue', grammarPoint: 'l15c4_hobby', partnerLine: 'I am going to try a new hobby.', situation: { ru: 'Скажи, что в субботу вы идёте наблюдать за птицами.', uk: 'Скажи, що в суботу ви йдете спостерігати за птахами.' }, accepted: ['We are going birdwatching on Saturday.'] },
    // ── Найди и исправь ошибку ──────────────────────────────────────────────────────────────────────────────────
    { id: 'l15c4-13', type: 'fix', grammarPoint: 'l15c4_going_to', wrong: 'I am going renew my pass.', accepted: ['I am going to renew my pass.'] },
    { id: 'l15c4-14', type: 'fix', grammarPoint: 'l15c4_arranged', wrong: 'We collecting the shoes on Friday.', accepted: ['We are collecting the shoes on Friday.'] },
    { id: 'l15c4-15', type: 'fix', grammarPoint: 'l15c4_hobby', wrong: 'She are going to learn woodworking.', accepted: ['She is going to learn woodworking.'] },
    { id: 'l15c4-16', type: 'fix', grammarPoint: 'l15c4_going_to', wrong: 'She going to check the tyre pressure.', accepted: ['She is going to check the tyre pressure.'] },
  ],
};
