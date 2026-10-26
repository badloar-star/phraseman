// chapter_exam_v2_l16_c7.ts — банк экзамена v2: урок 16, глава 7 (эпизоды 49–56). НЕ подключён: список BANKS (app/learning_v2_chapter_exam_v2.ts) пополняет Learning V2 после вычитки владельцем.
// зачем: глава 7 — три формы будущего на словах про жильё и поиски: «I think … will be …», «I am going to …», «We are …ing tomorrow». Только слова и формы эпизодов 1–56 урока 16; ситуация и ответ сходятся по смыслу, верных вариантов несколько, вопросительных знаков нет.
// Сторож слов — tests/owner_locks_exam_episode_words_2026_10_25.test.ts. Эталон (первый в accepted) — полной формой, как в эпизодах.
import type { ChapterExamV2Bank } from '../chapter_exam_v2';

export const CHAPTER_EXAM_V2_BANK_L16_C7: ChapterExamV2Bank = {
  lessonOrdinal: 16,
  chapterOrdinal: 7,
  grammarPoints: [
    { id: 'l16c7_will', label: { ru: 'предположение: I think … will be …', uk: 'припущення: I think … will be …' }, episodeOrdinals: [51, 52, 53, 54, 55, 56] },
    { id: 'l16c7_going_to', label: { ru: 'план: I am going to look for / choose …', uk: 'план: I am going to look for / choose …' }, episodeOrdinals: [49, 51, 52, 53, 55] },
    { id: 'l16c7_arranged', label: { ru: 'договорённость: We are viewing / checking out …', uk: 'домовленість: We are viewing / checking out …' }, episodeOrdinals: [49, 50, 51, 53, 55] },
  ],
  items: [
    // ── Ситуация → сам говоришь или пишешь ────────────────────────────────────────
    { id: 'l16c7-01', type: 'situation', grammarPoint: 'l16c7_will', situation: { ru: 'Ты заходишь в квартиру, и в комнате сквозит. Скажи, что, по-твоему, в комнате будут сквозняки.', uk: 'Ти заходиш у квартиру, і в кімнаті протяг. Скажи, що, на твою думку, у кімнаті буде протяг.' }, accepted: ['I think the room will be draughty.'] },
    { id: 'l16c7-02', type: 'situation', grammarPoint: 'l16c7_will', situation: { ru: 'Вы подходите к дому вечером. Скажи, что вход, по-твоему, будет хорошо освещён.', uk: 'Ви підходите до будинку ввечері. Скажи, що вхід, на твою думку, буде добре освітлений.' }, accepted: ['I think the entrance will be well-lit.'] },
    { id: 'l16c7-03', type: 'situation', grammarPoint: 'l16c7_going_to', situation: { ru: 'Тебе нужна тишина для работы. Скажи, что собираешься искать звукоизолированную комнату.', uk: 'Тобі потрібна тиша для роботи. Скажи, що збираєшся шукати звукоізольовану кімнату.' }, accepted: ['I am going to look for a soundproof room.'] },
    { id: 'l16c7-04', type: 'situation', grammarPoint: 'l16c7_going_to', situation: { ru: 'Ты хочешь жить в доме на одну семью. Скажи, что собираешься искать отдельно стоящий дом.', uk: 'Ти хочеш жити в будинку на одну сім’ю. Скажи, що збираєшся шукати окремий будинок.' }, accepted: ['I am going to look for a detached house.'] },
    { id: 'l16c7-05', type: 'situation', grammarPoint: 'l16c7_arranged', situation: { ru: 'Завтра в десять вы выезжаете из гостиницы — всё решено. Скажи об этом.', uk: 'Завтра о десятій ви виїжджаєте з готелю — усе вирішено. Скажи про це.' }, accepted: ['We are checking out at ten tomorrow.'] },
    { id: 'l16c7-06', type: 'situation', grammarPoint: 'l16c7_arranged', situation: { ru: 'В субботу вы вместе убираете гараж — договорились. Скажи об этом.', uk: 'У суботу ви разом прибираєте гараж — домовилися. Скажи про це.' }, accepted: ['We are cleaning out the garage on Saturday.'] },
    // ── Ответ в мини-диалоге ────────────────────────────────────────
    { id: 'l16c7-07', type: 'dialogue', grammarPoint: 'l16c7_will', partnerLine: 'I think the house will be unfurnished.', situation: { ru: 'Друг думает, что дом будет без мебели. Скажи, что квартира, по-твоему, будет с мебелью.', uk: 'Друг думає, що будинок буде без меблів. Скажи, що квартира, на твою думку, буде з меблями.' }, accepted: ['I think the flat will be furnished.'] },
    { id: 'l16c7-08', type: 'dialogue', grammarPoint: 'l16c7_will', partnerLine: 'I think the garden will be south-facing.', situation: { ru: 'Друг думает, что сад будет выходить на юг. Скажи, что спальня, по-твоему, будет выходить на север.', uk: 'Друг думає, що сад виходитиме на південь. Скажи, що спальня, на твою думку, виходитиме на північ.' }, accepted: ['I think the bedroom will be north-facing.'] },
    { id: 'l16c7-09', type: 'dialogue', grammarPoint: 'l16c7_going_to', partnerLine: 'I think the path will be uneven.', situation: { ru: 'Друг думает, что дорожка будет неровной. Скажи, что собираешься выбрать вымощенную дорожку.', uk: 'Друг думає, що доріжка буде нерівною. Скажи, що збираєшся вибрати вимощену доріжку.' }, accepted: ['I am going to choose a paved path.'] },
    { id: 'l16c7-10', type: 'dialogue', grammarPoint: 'l16c7_going_to', partnerLine: 'I think the room will be draughty.', situation: { ru: 'Друг думает, что в комнате будут сквозняки. Скажи, что собираешься искать квартиру с центральным отоплением.', uk: 'Друг думає, що в кімнаті буде протяг. Скажи, що збираєшся шукати квартиру з центральним опаленням.' }, accepted: ['I am going to look for a flat with central heating.'] },
    { id: 'l16c7-11', type: 'dialogue', grammarPoint: 'l16c7_arranged', partnerLine: 'I think the flat will be well-kept.', situation: { ru: 'Друг думает, что квартира будет ухоженной. Скажи, что завтра вы идёте смотреть ухоженную квартиру — это решено.', uk: 'Друг думає, що квартира буде доглянутою. Скажи, що завтра ви йдете дивитися доглянуту квартиру — це вирішено.' }, accepted: ['We are viewing a well-kept flat tomorrow.'] },
    { id: 'l16c7-12', type: 'dialogue', grammarPoint: 'l16c7_arranged', partnerLine: 'I think the house will be semi-detached.', situation: { ru: 'Друг думает, что дом будет на две семьи. Скажи, что завтра вы смотрите дом рядной застройки.', uk: 'Друг думає, що будинок буде на дві сім’ї. Скажи, що завтра ви дивитеся будинок рядної забудови.' }, accepted: ['We are viewing a terraced house tomorrow.'] },
    // ── Найди и исправь ошибку ────────────────────────────────────────
    { id: 'l16c7-13', type: 'fix', grammarPoint: 'l16c7_will', wrong: 'I think the path be uneven.', accepted: ['I think the path will be uneven.'] },
    { id: 'l16c7-14', type: 'fix', grammarPoint: 'l16c7_going_to', wrong: 'I am going look for a top-floor flat.', accepted: ['I am going to look for a top-floor flat.'] },
    { id: 'l16c7-15', type: 'fix', grammarPoint: 'l16c7_arranged', wrong: 'We viewing a new-build flat tomorrow.', accepted: ['We are viewing a new-build flat tomorrow.'] },
    { id: 'l16c7-16', type: 'fix', grammarPoint: 'l16c7_arranged', wrong: 'We are viewing a flat waterfront tomorrow.', accepted: ['We are viewing a waterfront flat tomorrow.'] },
  ],
};
