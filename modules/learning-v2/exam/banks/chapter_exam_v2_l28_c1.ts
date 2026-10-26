// chapter_exam_v2_l28_c1.ts — банк экзамена v2: урок 28, глава 1 (эпизоды 1–8).
// зачем (слово владельца 26.10 «банки для всех уроков и глав — в 2.0.3»): урок 28 — что с вещью делают: is / are + третья форма
// (The cheese is made from goat's milk, The lids are sold separately) — и «жаль, что не …» I wish it were … / I wish we had …
// (1–8). Сторож слов — owner_locks_exam_episode_words.
import type { ChapterExamV2Bank } from '../chapter_exam_v2';

export const CHAPTER_EXAM_V2_BANK_L28_C1: ChapterExamV2Bank = {
  lessonOrdinal: 28,
  chapterOrdinal: 1,
  grammarPoints: [
    { id: 'l28c1_is_done', label: { ru: 'с одной вещью делают — is + made / kept', uk: 'з однією річчю роблять — is + made / kept' }, episodeOrdinals: [1, 3, 4] },
    { id: 'l28c1_are_done', label: { ru: 'с вещами делают — are + sold / kept', uk: 'з речами роблять — are + sold / kept' }, episodeOrdinals: [1, 5, 7] },
    { id: 'l28c1_wish', label: { ru: 'жаль, что не … — I wish it were / we had', uk: 'шкода, що не … — I wish it were / we had' }, episodeOrdinals: [2, 3, 5] },
  ],
  items: [
    // ── Ситуация → сам говоришь или пишешь ───────────────────────────────────────────────────────────────────────
    { id: 'l28c1-01', type: 'situation', grammarPoint: 'l28c1_is_done', situation: { ru: 'Покупательница спрашивает, откуда хлеб в твоей пекарне. Скажи, что его пекут здесь.', uk: 'Покупниця питає, звідки хліб у твоїй пекарні. Скажи, що його печуть тут.' }, accepted: ['The bread is baked here.', 'It is baked here.', "It's baked here."] },
    { id: 'l28c1-02', type: 'situation', grammarPoint: 'l28c1_are_done', situation: { ru: 'Турист на рынке спрашивает про яблоки. Скажи, что их выращивают здесь, в округе.', uk: 'Турист на ринку питає про яблука. Скажи, що їх вирощують тут, в окрузі.' }, accepted: ['The apples are grown locally.'] },
    { id: 'l28c1-03', type: 'situation', grammarPoint: 'l28c1_wish', situation: { ru: 'Комбинезон сидит идеально, но цена кусается. Скажи: жаль, что он не дешевле.', uk: 'Комбінезон сидить ідеально, але ціна кусається. Скажи: шкода, що він не дешевший.' }, accepted: ['I wish it were cheaper.'] },
    { id: 'l28c1-04', type: 'situation', grammarPoint: 'l28c1_is_done', situation: { ru: 'Гость ищет чизкейк на витрине. Скажи, что его хранят в холодильнике.', uk: 'Гість шукає чізкейк на вітрині. Скажи, що його зберігають у холодильнику.' }, accepted: ['The cheesecake is kept in the fridge.', 'It is kept in the fridge.', "It's kept in the fridge."] },
    { id: 'l28c1-05', type: 'situation', grammarPoint: 'l28c1_are_done', situation: { ru: 'Подруга ищет гирлянду для ёлки. Скажи, что огоньки хранятся в этой коробке.', uk: 'Подруга шукає гірлянду для ялинки. Скажи, що вогники зберігаються в цій коробці.' }, accepted: ['The lights are kept in this box.'] },
    { id: 'l28c1-06', type: 'situation', grammarPoint: 'l28c1_wish', situation: { ru: 'Гостей шестеро, а стол на четверых. Скажи: жаль, что у вас нет стола побольше.', uk: 'Гостей шестеро, а стіл на чотирьох. Скажи: шкода, що у вас немає більшого столу.' }, accepted: ['I wish we had a bigger table.'] },
    // ── Ответ в мини-диалоге ──────────────────────────────────────────────────────────────────────────────────────
    { id: 'l28c1-07', type: 'dialogue', grammarPoint: 'l28c1_is_done', partnerLine: 'Is it served with naan?', situation: { ru: 'Гость спрашивает про суп. Ответь, что суп подают с хлебом.', uk: 'Гість питає про суп. Відповідай, що суп подають із хлібом.' }, accepted: ['The soup is served with bread.', 'It is served with bread.', "It's served with bread."] },
    { id: 'l28c1-08', type: 'dialogue', grammarPoint: 'l28c1_are_done', partnerLine: 'I would like three bowls, please.', situation: { ru: 'Покупатель ищет крышки к мискам. Скажи, что крышки продаются отдельно.', uk: 'Покупець шукає кришки до мисок. Скажи, що кришки продаються окремо.' }, accepted: ['The lids are sold separately.'] },
    { id: 'l28c1-09', type: 'dialogue', grammarPoint: 'l28c1_wish', partnerLine: 'Can these go in the dishwasher?', situation: { ru: 'Ты держишь чугунную сковороду и еле её поднимаешь. Скажи: жаль, что она не легче.', uk: 'Ти тримаєш чавунну сковорідку й ледве її піднімаєш. Скажи: шкода, що вона не легша.' }, accepted: ['I wish this pan were lighter.', 'I wish it were lighter.'] },
    { id: 'l28c1-10', type: 'dialogue', grammarPoint: 'l28c1_is_done', partnerLine: 'Is the milk fresh?', situation: { ru: 'Ты продаёшь молоко на ферме. Скажи, что его привозят каждое утро.', uk: 'Ти продаєш молоко на фермі. Скажи, що його привозять щоранку.' }, accepted: ['The milk is delivered every morning.', 'It is delivered every morning.', "It's delivered every morning."] },
    { id: 'l28c1-11', type: 'dialogue', grammarPoint: 'l28c1_are_done', partnerLine: 'Are the eggs fresh?', situation: { ru: 'Скажи, что яйца собирают каждое утро.', uk: 'Скажи, що яйця збирають щоранку.' }, accepted: ['The eggs are collected every morning.'] },
    { id: 'l28c1-12', type: 'dialogue', grammarPoint: 'l28c1_wish', partnerLine: 'Would you like some more?', situation: { ru: 'Сок тёплый, лёд растаял. Скажи: жаль, что напитки не холоднее.', uk: 'Сік теплий, лід розтанув. Скажи: шкода, що напої не холодніші.' }, accepted: ['I wish the drinks were colder.'] },
    // ── Найди и исправь ошибку ────────────────────────────────────────────────────────────────────────────────────
    { id: 'l28c1-13', type: 'fix', grammarPoint: 'l28c1_is_done', wrong: "The cheese made from goat's milk.", accepted: ["The cheese is made from goat's milk."] },
    { id: 'l28c1-14', type: 'fix', grammarPoint: 'l28c1_are_done', wrong: 'The candles is sold in packs of six.', accepted: ['The candles are sold in packs of six.'] },
    { id: 'l28c1-15', type: 'fix', grammarPoint: 'l28c1_is_done', wrong: 'This shirt are washed by hand.', accepted: ['This shirt is washed by hand.'] },
    { id: 'l28c1-16', type: 'fix', grammarPoint: 'l28c1_wish', wrong: 'I wish the shop is closer.', accepted: ['I wish the shop were closer.'] },
  ],
};
