// chapter_exam_v2_l28_c6.ts — банк экзамена v2: урок 28, глава 6 (эпизоды 41–48).
// зачем (слово владельца 26.10 «банки для всех уроков и глав — в 2.0.3»): глава 6 урока 28 повторяет by, will be + третья форма и
// обычный порядок / правила (are kept, must be packed) на семейном празднике, в садовом центре, на рынке, кухне и в мебельном
// (41–48). Сторож слов — owner_locks_exam_episode_words.
import type { ChapterExamV2Bank } from '../chapter_exam_v2';

export const CHAPTER_EXAM_V2_BANK_L28_C6: ChapterExamV2Bank = {
  lessonOrdinal: 28,
  chapterOrdinal: 6,
  grammarPoints: [
    { id: 'l28c6_by', label: { ru: 'кем сделано — was / were + … by', uk: 'ким зроблено — was / were + … by' }, episodeOrdinals: [41, 43, 44] },
    { id: 'l28c6_will_be', label: { ru: 'что сделают — will be + delivered / served', uk: 'що зроблять — will be + delivered / served' }, episodeOrdinals: [41, 42, 45] },
    { id: 'l28c6_rules', label: { ru: 'порядок и правила — are kept, must be', uk: 'порядок і правила — are kept, must be' }, episodeOrdinals: [42, 44, 47] },
  ],
  items: [
    // ── Ситуация → сам говоришь или пишешь ───────────────────────────────────────────────────────────────────────
    { id: 'l28c6-01', type: 'situation', grammarPoint: 'l28c6_by', situation: { ru: 'Гостья на семейном празднике хвалит торт. Скажи, что его испекла твоя тётя.', uk: 'Гостя на сімейному святі хвалить торт. Скажи, що його спекла твоя тітка.' }, accepted: ['The cake was made by my aunt.', 'It was made by my aunt.'] },
    { id: 'l28c6-02', type: 'situation', grammarPoint: 'l28c6_will_be', situation: { ru: 'Покупатель оплатил набор тарелок. Скажи, что их доставят в пятницу.', uk: 'Покупець оплатив набір тарілок. Скажи, що їх доставлять у п’ятницю.' }, accepted: ['The plates will be delivered on Friday.'] },
    { id: 'l28c6-03', type: 'situation', grammarPoint: 'l28c6_rules', situation: { ru: 'Покупательница в садовом центре удивляется, какие растения свежие. Скажи, что их поливают каждое утро.', uk: 'Покупниця в садовому центрі дивується, які рослини свіжі. Скажи, що їх поливають щоранку.' }, accepted: ['These plants are watered every morning.', 'The plants are watered every morning.'] },
    { id: 'l28c6-04', type: 'situation', grammarPoint: 'l28c6_by', situation: { ru: 'Покупатель на рынке спрашивает, откуда овощи. Скажи, что их вырастил местный фермер.', uk: 'Покупець на ринку питає, звідки овочі. Скажи, що їх виростив місцевий фермер.' }, accepted: ['The vegetables were grown by a local farmer.'] },
    { id: 'l28c6-05', type: 'situation', grammarPoint: 'l28c6_will_be', situation: { ru: 'Гости спрашивают, когда сядете за стол. Скажи, что ужин подадут в семь.', uk: 'Гості питають, коли сядете за стіл. Скажи, що вечерю подадуть о сьомій.' }, accepted: ['Dinner will be served at seven.'] },
    { id: 'l28c6-06', type: 'situation', grammarPoint: 'l28c6_rules', situation: { ru: 'Брат ищет на твоей кухне нож. Скажи, что ножи хранятся в этом ящике.', uk: 'Брат шукає на твоїй кухні ніж. Скажи, що ножі зберігаються в цій шухляді.' }, accepted: ['The knives are kept in this drawer.'] },
    // ── Ответ в мини-диалоге ──────────────────────────────────────────────────────────────────────────────────────
    { id: 'l28c6-07', type: 'dialogue', grammarPoint: 'l28c6_by', partnerLine: 'Is this bowl made of stoneware?', situation: { ru: 'Ты продавец. Скажи, что эти чашки сделал местный художник.', uk: 'Ти продавець. Скажи, що ці чашки зробив місцевий художник.' }, accepted: ['These cups were made by a local artist.'] },
    { id: 'l28c6-08', type: 'dialogue', grammarPoint: 'l28c6_will_be', partnerLine: 'Could you show me a smaller plant?', situation: { ru: 'Покупательница уже оформила большой заказ. Скажи, что заказ доставят завтра.', uk: 'Покупниця вже оформила велике замовлення. Скажи, що замовлення доставлять завтра.' }, accepted: ['Your order will be delivered tomorrow.'] },
    { id: 'l28c6-09', type: 'dialogue', grammarPoint: 'l28c6_rules', partnerLine: 'I would like some tomato relish.', situation: { ru: 'Скажи, что банки хранятся на верхней полке.', uk: 'Скажи, що банки зберігаються на верхній полиці.' }, accepted: ['These jars are kept on the top shelf.', 'The jars are kept on the top shelf.'] },
    { id: 'l28c6-10', type: 'dialogue', grammarPoint: 'l28c6_by', partnerLine: 'How wide is this daybed?', situation: { ru: 'Ты продавец мебели. Похвали: каркас сделал местный плотник.', uk: 'Ти продавець меблів. Похвали: каркас зробив місцевий тесля.' }, accepted: ['The frame was made by a local carpenter.'] },
    { id: 'l28c6-11', type: 'dialogue', grammarPoint: 'l28c6_will_be', partnerLine: 'Will it fit through the door?', situation: { ru: 'Не переживай за дверь. Скажи, что кровать соберут у покупателя в комнате.', uk: 'Не хвилюйся за двері. Скажи, що ліжко зберуть у покупця в кімнаті.' }, accepted: ['The bed will be assembled in your room.'] },
    { id: 'l28c6-12', type: 'dialogue', grammarPoint: 'l28c6_rules', partnerLine: 'Do you have a softer bolster?', situation: { ru: 'Покупательница спрашивает и про чехлы. Скажи, что чехлы стирают отдельно.', uk: 'Покупниця питає й про чохли. Скажи, що чохли перуть окремо.' }, accepted: ['The covers are washed separately.'] },
    // ── Найди и исправь ошибку ────────────────────────────────────────────────────────────────────────────────────
    { id: 'l28c6-13', type: 'fix', grammarPoint: 'l28c6_by', wrong: 'This ring was made from my sister.', accepted: ['This ring was made by my sister.'] },
    { id: 'l28c6-14', type: 'fix', grammarPoint: 'l28c6_will_be', wrong: 'Dinner will served at seven.', accepted: ['Dinner will be served at seven.'] },
    { id: 'l28c6-15', type: 'fix', grammarPoint: 'l28c6_rules', wrong: 'These glasses must packed carefully.', accepted: ['These glasses must be packed carefully.'] },
    { id: 'l28c6-16', type: 'fix', grammarPoint: 'l28c6_by', wrong: 'These plants was grown by my father.', accepted: ['These plants were grown by my father.'] },
  ],
};
