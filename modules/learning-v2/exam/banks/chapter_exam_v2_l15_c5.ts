// chapter_exam_v2_l15_c5.ts — банк экзамена v2: урок 15, глава 5 (эпизоды 33–40). НЕ подключён: строку в BANKS
// (app/learning_v2_chapter_exam_v2.ts) добавляет Learning V2 после вычитки владельцем (docs/work/exam-banks/l15.md).
// зачем (владелец 26.10: экзамены глав v2 для всех уроков, войдут в 2.0.3): только слова и формы эпизодов 1–40 урока 15
// (going to для решения и am / are + -ing для договорённости; пробуем новое); ситуация и ответ сходятся по смыслу; верных вариантов несколько. Сторож слов —
// tests/owner_locks_exam_episode_words_2026_10_25.test.ts. Эталон (первый в accepted) — полной формой, как в эпизодах.
import type { ChapterExamV2Bank } from '../chapter_exam_v2';

export const CHAPTER_EXAM_V2_BANK_L15_C5: ChapterExamV2Bank = {
  lessonOrdinal: 15,
  chapterOrdinal: 5,
  grammarPoints: [
    { id: 'l15c5_going_to', label: { ru: 'решил сделать — going to', uk: 'вирішив зробити — going to' }, episodeOrdinals: [33, 34, 35] },
    { id: 'l15c5_arranged', label: { ru: 'уже договорились — are …ing + время', uk: 'уже домовилися — are …ing + час' }, episodeOrdinals: [36, 37, 39] },
    { id: 'l15c5_trying', label: { ru: 'пробую новое — going to try / are trying', uk: 'пробую нове — going to try / are trying' }, episodeOrdinals: [38, 40] },
  ],
  items: [
    // ── Ситуация → сам говоришь или пишешь ──────────────────────────────────────────────────────────────────────
    { id: 'l15c5-01', type: 'situation', grammarPoint: 'l15c5_going_to', situation: { ru: 'Тебя пригласили на крестины. Скажи, что пойдёшь.', uk: 'Тебе запросили на хрестини. Скажи, що підеш.' }, accepted: ['I am going to attend a christening.'] },
    { id: 'l15c5-02', type: 'situation', grammarPoint: 'l15c5_arranged', situation: { ru: 'Приём назначен: в понедельник вы встречаетесь с акушеркой. Скажи.', uk: 'Прийом призначено: у понеділок ви зустрічаєтеся з акушеркою. Скажи.' }, accepted: ['We are meeting the midwife on Monday.'] },
    { id: 'l15c5-03', type: 'situation', grammarPoint: 'l15c5_trying', situation: { ru: 'Ты решил попробовать делать свечи. Скажи об этом.', uk: 'Ти вирішив спробувати робити свічки. Скажи про це.' }, accepted: ['I am going to try candle making.'] },
    { id: 'l15c5-04', type: 'situation', grammarPoint: 'l15c5_going_to', situation: { ru: 'Волосы отросли. Скажи, что собираешься подстричься.', uk: 'Волосся відросло. Скажи, що збираєшся підстригтися.' }, accepted: ['I am going to get a haircut.'] },
    { id: 'l15c5-05', type: 'situation', grammarPoint: 'l15c5_arranged', situation: { ru: 'Договорились с продавцом: завтра вы забираете кориандр. Скажи.', uk: 'Домовилися з продавцем: завтра ви забираєте коріандр. Скажи.' }, accepted: ['We are collecting the coriander tomorrow.'] },
    { id: 'l15c5-06', type: 'situation', grammarPoint: 'l15c5_trying', situation: { ru: 'Вы записались: в субботу пробуете делать модели. Скажи.', uk: 'Ви записалися: у суботу пробуєте робити моделі. Скажи.' }, accepted: ['We are trying model making on Saturday.'] },
    // ── Ответ в мини-диалоге ────────────────────────────────────────────────────────────────────────────────────
    { id: 'l15c5-07', type: 'dialogue', grammarPoint: 'l15c5_going_to', partnerLine: 'We are meeting the instructor tomorrow.', situation: { ru: 'Скажи, что ты собираешься научиться первой помощи.', uk: 'Скажи, що ти збираєшся навчитися першої допомоги.' }, accepted: ['I am going to learn first aid.'] },
    { id: 'l15c5-08', type: 'dialogue', grammarPoint: 'l15c5_arranged', partnerLine: 'I am going to cook at home.', situation: { ru: 'Скажи, что завтра вы идёте на рынок.', uk: 'Скажи, що завтра ви йдете на ринок.' }, accepted: ['We are visiting the market tomorrow.'] },
    { id: 'l15c5-09', type: 'dialogue', grammarPoint: 'l15c5_trying', partnerLine: 'I am going to try a new recipe.', situation: { ru: 'Скажи, что она собирается попробовать кардамон.', uk: 'Скажи, що вона збирається спробувати кардамон.' }, accepted: ['She is going to try cardamom.'] },
    { id: 'l15c5-10', type: 'dialogue', grammarPoint: 'l15c5_going_to', partnerLine: 'We are attending a party on Saturday.', situation: { ru: 'Скажи, что ты собираешься пригласить семью.', uk: 'Скажи, що ти збираєшся запросити родину.' }, accepted: ['I am going to invite my family.'] },
    { id: 'l15c5-11', type: 'dialogue', grammarPoint: 'l15c5_arranged', partnerLine: 'I am going to book an appointment.', situation: { ru: 'Скажи, что в понедельник вы встречаетесь в клинике.', uk: 'Скажи, що в понеділок ви зустрічаєтеся в клініці.' }, accepted: ['We are meeting at the clinic on Monday.'] },
    { id: 'l15c5-12', type: 'dialogue', grammarPoint: 'l15c5_trying', partnerLine: 'I am going to make something new.', situation: { ru: 'Скажи, что в субботу вы идёте на занятие.', uk: 'Скажи, що в суботу ви йдете на заняття.' }, accepted: ['We are attending a class on Saturday.'] },
    // ── Найди и исправь ошибку ──────────────────────────────────────────────────────────────────────────────────
    { id: 'l15c5-13', type: 'fix', grammarPoint: 'l15c5_going_to', wrong: 'I am go to book a lesson.', accepted: ['I am going to book a lesson.'] },
    { id: 'l15c5-14', type: 'fix', grammarPoint: 'l15c5_arranged', wrong: 'We is meeting the hairdresser on Saturday.', accepted: ['We are meeting the hairdresser on Saturday.'] },
    { id: 'l15c5-15', type: 'fix', grammarPoint: 'l15c5_trying', wrong: 'They are try weaving tomorrow.', accepted: ['They are trying weaving tomorrow.'] },
    { id: 'l15c5-16', type: 'fix', grammarPoint: 'l15c5_arranged', wrong: 'I seeing a dietitian tomorrow.', accepted: ['I am seeing a dietitian tomorrow.'] },
  ],
};
