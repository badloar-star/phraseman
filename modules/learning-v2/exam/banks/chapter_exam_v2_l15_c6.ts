// chapter_exam_v2_l15_c6.ts — банк экзамена v2: урок 15, глава 6 (эпизоды 41–48). НЕ подключён: строку в BANKS
// (app/learning_v2_chapter_exam_v2.ts) добавляет Learning V2 после вычитки владельцем (docs/work/exam-banks/l15.md).
// зачем (владелец 26.10: экзамены глав v2 для всех уроков, войдут в 2.0.3): только слова и формы эпизодов 1–48 урока 15
// (going to и am / are + -ing о планах с людьми; слова характера и покупки); ситуация и ответ сходятся по смыслу; верных вариантов несколько. Сторож слов —
// tests/owner_locks_exam_episode_words_2026_10_25.test.ts. Эталон (первый в accepted) — полной формой, как в эпизодах.
import type { ChapterExamV2Bank } from '../chapter_exam_v2';

export const CHAPTER_EXAM_V2_BANK_L15_C6: ChapterExamV2Bank = {
  lessonOrdinal: 15,
  chapterOrdinal: 6,
  grammarPoints: [
    { id: 'l15c6_going_to', label: { ru: 'решил сделать — going to', uk: 'вирішив зробити — going to' }, episodeOrdinals: [41, 42, 46] },
    { id: 'l15c6_arranged', label: { ru: 'уже договорились — are …ing + время', uk: 'уже домовилися — are …ing + час' }, episodeOrdinals: [41, 43, 45] },
    { id: 'l15c6_buying', label: { ru: 'покупки и дела — going to buy / are viewing', uk: 'покупки й справи — going to buy / are viewing' }, episodeOrdinals: [47, 48] },
  ],
  items: [
    // ── Ситуация → сам говоришь или пишешь ──────────────────────────────────────────────────────────────────────
    { id: 'l15c6-01', type: 'situation', grammarPoint: 'l15c6_going_to', situation: { ru: 'Брат очень привередлив в еде. Скажи, что ты собираешься приготовить для него.', uk: 'Брат дуже вибагливий у їжі. Скажи, що ти збираєшся приготувати для нього.' }, accepted: ['I am going to cook for my picky brother.'] },
    { id: 'l15c6-02', type: 'situation', grammarPoint: 'l15c6_arranged', situation: { ru: 'Вы договорились завтра встретиться с общительным соседом. Скажи.', uk: 'Ви домовилися завтра зустрітися з товариським сусідом. Скажи.' }, accepted: ['We are meeting our sociable neighbour tomorrow.'] },
    { id: 'l15c6-03', type: 'situation', grammarPoint: 'l15c6_buying', situation: { ru: 'Нужно удобное пальто на каждый день. Скажи, что купишь практичное пальто.', uk: 'Потрібне зручне пальто на кожен день. Скажи, що купиш практичне пальто.' }, accepted: ['I am going to buy a practical coat.'] },
    { id: 'l15c6-04', type: 'situation', grammarPoint: 'l15c6_going_to', situation: { ru: 'Тебе нужна поддержка. Скажи, что ты позвонишь своему другу-оптимисту.', uk: 'Тобі потрібна підтримка. Скажи, що ти зателефонуєш своєму другові-оптимістові.' }, accepted: ['I am going to call my optimistic friend.'] },
    { id: 'l15c6-05', type: 'situation', grammarPoint: 'l15c6_arranged', situation: { ru: 'В субботу вы едете со спокойным, лёгким в общении другом — уже договорились. Скажи.', uk: 'У суботу ви їдете зі спокійним, легким у спілкуванні другом — уже домовилися. Скажи.' }, accepted: ['We are travelling with our easy-going friend on Saturday.'] },
    { id: 'l15c6-06', type: 'situation', grammarPoint: 'l15c6_buying', situation: { ru: 'Просмотр назначен: завтра вы смотрите недорогую квартиру. Скажи.', uk: 'Перегляд призначено: завтра ви дивитеся недорогу квартиру. Скажи.' }, accepted: ['We are viewing an affordable flat tomorrow.'] },
    // ── Ответ в мини-диалоге ────────────────────────────────────────────────────────────────────────────────────
    { id: 'l15c6-07', type: 'dialogue', grammarPoint: 'l15c6_going_to', partnerLine: 'We are meeting our neighbour tomorrow evening.', situation: { ru: 'Скажи, что ты собираешься попросить о помощи.', uk: 'Скажи, що ти збираєшся попросити про допомогу.' }, accepted: ['I am going to ask for help.'] },
    { id: 'l15c6-08', type: 'dialogue', grammarPoint: 'l15c6_arranged', partnerLine: 'I am going to help my friend.', situation: { ru: 'Скажи, что вы встречаетесь в пятницу днём.', uk: 'Скажи, що ви зустрічаєтеся в п’ятницю вдень.' }, accepted: ['We are meeting on Friday afternoon.'] },
    { id: 'l15c6-09', type: 'dialogue', grammarPoint: 'l15c6_buying', partnerLine: 'I am going to turn the handle.', situation: { ru: 'Скажи, что она повернёт ручку против часовой стрелки.', uk: 'Скажи, що вона поверне ручку проти годинникової стрілки.' }, accepted: ['She is going to turn the handle anticlockwise.'] },
    { id: 'l15c6-10', type: 'dialogue', grammarPoint: 'l15c6_going_to', partnerLine: 'We are meeting tomorrow afternoon.', situation: { ru: 'Скажи, что ты собираешься поговорить с братом.', uk: 'Скажи, що ти збираєшся поговорити з братом.' }, accepted: ['I am going to talk to my brother.'] },
    { id: 'l15c6-11', type: 'dialogue', grammarPoint: 'l15c6_arranged', partnerLine: 'I am going to travel with a friend.', situation: { ru: 'Скажи, что завтра вы работаете в саду.', uk: 'Скажи, що завтра ви працюєте в саду.' }, accepted: ['We are working in the garden tomorrow.'] },
    { id: 'l15c6-12', type: 'dialogue', grammarPoint: 'l15c6_buying', partnerLine: 'We are viewing the flat tomorrow.', situation: { ru: 'Скажи, что ты собираешься купить новое пальто.', uk: 'Скажи, що ти збираєшся купити нове пальто.' }, accepted: ['I am going to buy a new coat.'] },
    // ── Найди и исправь ошибку ──────────────────────────────────────────────────────────────────────────────────
    { id: 'l15c6-13', type: 'fix', grammarPoint: 'l15c6_going_to', wrong: 'I going to visit my modest friend.', accepted: ['I am going to visit my modest friend.'] },
    { id: 'l15c6-14', type: 'fix', grammarPoint: 'l15c6_arranged', wrong: 'They is meeting their bossy cousin tomorrow.', accepted: ['They are meeting their bossy cousin tomorrow.'] },
    { id: 'l15c6-15', type: 'fix', grammarPoint: 'l15c6_buying', wrong: 'She is going buy an economical car.', accepted: ['She is going to buy an economical car.'] },
    { id: 'l15c6-16', type: 'fix', grammarPoint: 'l15c6_going_to', wrong: 'She are going to help her ambitious son.', accepted: ['She is going to help her ambitious son.'] },
  ],
};
