// chapter_exam_v2_l18_c1.ts — банк экзамена v2: урок 18, глава 1 (эпизоды 1–8). НЕ подключён: список BANKS (app/learning_v2_chapter_exam_v2.ts) пополняет Learning V2 после вычитки владельцем.
// зачем: глава 1 — сравнение «cheaper than ours» и две формы будущего на тех же словах: «We are going to buy …» (план) и «We are viewing … tomorrow» (договорённость). Только слова и формы эпизодов 1–8 урока 18; ситуация и ответ сходятся по смыслу, верных вариантов несколько, вопросительных знаков нет.
// Сторож слов — tests/owner_locks_exam_episode_words_2026_10_25.test.ts. Эталон (первый в accepted) — полной формой, как в эпизодах.
import type { ChapterExamV2Bank } from '../chapter_exam_v2';

export const CHAPTER_EXAM_V2_BANK_L18_C1: ChapterExamV2Bank = {
  lessonOrdinal: 18,
  chapterOrdinal: 1,
  grammarPoints: [
    { id: 'l18c1_er_than', label: { ru: 'сравниваем: cheaper / quieter / lighter than …', uk: 'порівнюємо: cheaper / quieter / lighter than …' }, episodeOrdinals: [1, 2, 3, 4, 5, 6, 7, 8] },
    { id: 'l18c1_going_to', label: { ru: 'план: We are going to buy / book …', uk: 'план: We are going to buy / book …' }, episodeOrdinals: [2, 3, 4, 5, 6, 7, 8] },
    { id: 'l18c1_arranged', label: { ru: 'договорённость: We are viewing / taking … tomorrow', uk: 'домовленість: We are viewing / taking … tomorrow' }, episodeOrdinals: [2, 3, 4, 5, 6, 7, 8] },
  ],
  items: [
    // ── Ситуация → сам говоришь или пишешь ────────────────────────────────────────
    { id: 'l18c1-01', type: 'situation', grammarPoint: 'l18c1_er_than', situation: { ru: 'Номер в этой гостинице дешевле вашего. Скажи об этом.', uk: 'Номер у цьому готелі дешевший за ваш. Скажи про це.' }, accepted: ['This hotel room is cheaper than ours.'] },
    { id: 'l18c1-02', type: 'situation', grammarPoint: 'l18c1_er_than', situation: { ru: 'Верхний этаж тише, чем этот. Скажи об этом.', uk: 'Верхній поверх тихіший, ніж цей. Скажи про це.' }, accepted: ['The top floor is quieter than this floor.'] },
    { id: 'l18c1-03', type: 'situation', grammarPoint: 'l18c1_going_to', situation: { ru: 'Вы решили купить зимнее пальто. Скажи, что вы собираетесь его купить.', uk: 'Ви вирішили купити зимове пальто. Скажи, що ви збираєтесь його купити.' }, accepted: ['We are going to buy a winter coat.'] },
    { id: 'l18c1-04', type: 'situation', grammarPoint: 'l18c1_going_to', situation: { ru: 'Вы решили снять квартиру на первом этаже. Скажи, что вы собираетесь её забронировать.', uk: 'Ви вирішили зняти квартиру на першому поверсі. Скажи, що ви збираєтесь її забронювати.' }, accepted: ['We are going to book a ground-floor flat.'] },
    { id: 'l18c1-05', type: 'situation', grammarPoint: 'l18c1_arranged', situation: { ru: 'Завтра вы идёте смотреть квартиру — всё решено. Скажи об этом.', uk: 'Завтра ви йдете дивитися квартиру — усе вирішено. Скажи про це.' }, accepted: ['We are viewing the flat tomorrow.'] },
    { id: 'l18c1-06', type: 'situation', grammarPoint: 'l18c1_arranged', situation: { ru: 'В шесть вы садитесь на аэропортовый поезд — уже договорились. Скажи об этом.', uk: 'О шостій ви сідаєте на аеропортовий потяг — уже домовилися. Скажи про це.' }, accepted: ['We are taking the airport train at six.'] },
    // ── Ответ в мини-диалоге ────────────────────────────────────────
    { id: 'l18c1-07', type: 'dialogue', grammarPoint: 'l18c1_er_than', partnerLine: 'The bus journey is cheaper than the train journey.', situation: { ru: 'Друг говорит, что поездка на автобусе дешевле поездки на поезде. Скажи, что поездка на машине длиннее вашей.', uk: 'Друг каже, що поїздка автобусом дешевша за поїздку потягом. Скажи, що поїздка на машині довша за вашу.' }, accepted: ['This car journey is longer than ours.'] },
    { id: 'l18c1-08', type: 'dialogue', grammarPoint: 'l18c1_er_than', partnerLine: 'These running shoes are lighter than mine.', situation: { ru: 'Друг говорит, что эти кроссовки легче его. Скажи, что эти кожаные туфли мягче той пары.', uk: 'Друг каже, що ці кросівки легші за його. Скажи, що ці шкіряні туфлі м’якші за ту пару.' }, accepted: ['These leather shoes are softer than that pair.'] },
    { id: 'l18c1-09', type: 'dialogue', grammarPoint: 'l18c1_going_to', partnerLine: 'The airport train is faster than the airport bus.', situation: { ru: 'Друг говорит, что поезд быстрее автобуса. Скажи, что вы собираетесь купить проездной.', uk: 'Друг каже, що потяг швидший за автобус. Скажи, що ви збираєтесь купити проїзний.' }, accepted: ['We are going to buy a travel pass.'] },
    { id: 'l18c1-10', type: 'dialogue', grammarPoint: 'l18c1_going_to', partnerLine: 'This summer dress is shorter than that one.', situation: { ru: 'Друг говорит, что это летнее платье короче того. Скажи, что вы собираетесь купить кроссовки.', uk: 'Друг каже, що ця літня сукня коротша за ту. Скажи, що ви збираєтесь купити кросівки.' }, accepted: ['We are going to buy running shoes.'] },
    { id: 'l18c1-11', type: 'dialogue', grammarPoint: 'l18c1_arranged', partnerLine: 'We are going to buy a travel pass.', situation: { ru: 'Друг говорит, что вы собираетесь купить проездной. Скажи, что завтра вы начинаете поездку на поезде — всё решено.', uk: 'Друг каже, що ви збираєтесь купити проїзний. Скажи, що завтра ви починаєте поїздку потягом — усе вирішено.' }, accepted: ['We are starting our train journey tomorrow.'] },
    { id: 'l18c1-12', type: 'dialogue', grammarPoint: 'l18c1_arranged', partnerLine: 'This hot meal is cheaper than that one.', situation: { ru: 'Друг говорит, что это горячее блюдо дешевле того. Скажи, что вечером вы обедаете с друзьями — договорились.', uk: 'Друг каже, що ця гаряча страва дешевша за ту. Скажи, що ввечері ви обідаєте з друзями — домовилися.' }, accepted: ['We are having a hot meal with friends tonight.'] },
    // ── Найди и исправь ошибку ────────────────────────────────────────
    { id: 'l18c1-13', type: 'fix', grammarPoint: 'l18c1_er_than', wrong: 'This hotel room is more cheap than ours.', accepted: ['This hotel room is cheaper than ours.'] },
    { id: 'l18c1-14', type: 'fix', grammarPoint: 'l18c1_going_to', wrong: 'We are going buy a winter coat.', accepted: ['We are going to buy a winter coat.'] },
    { id: 'l18c1-15', type: 'fix', grammarPoint: 'l18c1_arranged', wrong: 'We viewing the flat tomorrow.', accepted: ['We are viewing the flat tomorrow.'] },
    { id: 'l18c1-16', type: 'fix', grammarPoint: 'l18c1_arranged', wrong: 'We meeting at the shop tomorrow.', accepted: ['We are meeting at the shop tomorrow.'] },
  ],
};
