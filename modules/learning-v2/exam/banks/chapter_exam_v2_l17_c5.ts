// chapter_exam_v2_l17_c5.ts — банк экзамена v2: урок 17, глава 5 (эпизоды 33–40). НЕ подключён: список BANKS (app/learning_v2_chapter_exam_v2.ts) пополняет Learning V2 после вычитки владельцем.
// зачем: глава 5 — вещества считают единицами: «two bags of rice», «two bottles of oil»; те же слова в планах и в рассказе о покупках («I am going to buy … tomorrow», «I bought … yesterday»); плюс «some / any» из главы 4. Только слова и формы эпизодов 1–40 урока 17; ситуация и ответ сходятся по смыслу, верных вариантов несколько, вопросительных знаков нет.
// Сторож слов — tests/owner_locks_exam_episode_words_2026_10_25.test.ts. Эталон (первый в accepted) — полной формой, как в эпизодах.
import type { ChapterExamV2Bank } from '../chapter_exam_v2';

export const CHAPTER_EXAM_V2_BANK_L17_C5: ChapterExamV2Bank = {
  lessonOrdinal: 17,
  chapterOrdinal: 5,
  grammarPoints: [
    { id: 'l17c5_units', label: { ru: 'считаем единицами: two bags / bottles / kilos of …', uk: 'рахуємо одиницями: two bags / bottles / kilos of …' }, episodeOrdinals: [33, 34, 35, 36, 37, 38, 39, 40] },
    { id: 'l17c5_buy', label: { ru: 'покупки: I am going to buy … tomorrow / I bought … yesterday', uk: 'покупки: I am going to buy … tomorrow / I bought … yesterday' }, episodeOrdinals: [34, 35, 36, 37, 38, 39, 40] },
    { id: 'l17c5_some_any', label: { ru: 'some / any из главы 4', uk: 'some / any з глави 4' }, episodeOrdinals: [25, 26, 27, 28, 29, 30, 31, 32] },
  ],
  items: [
    // ── Ситуация → сам говоришь или пишешь ────────────────────────────────────────
    { id: 'l17c5-01', type: 'situation', grammarPoint: 'l17c5_units', situation: { ru: 'Тебе нужны два тюбика зубной пасты. Скажи об этом.', uk: 'Тобі потрібні два тюбики зубної пасти. Скажи про це.' }, accepted: ['We need two tubes of toothpaste.'] },
    { id: 'l17c5-02', type: 'situation', grammarPoint: 'l17c5_units', situation: { ru: 'Вам нужны два пакета сахара. Скажи об этом.', uk: 'Вам потрібні два пакети цукру. Скажи про це.' }, accepted: ['We need two bags of sugar.'] },
    { id: 'l17c5-03', type: 'situation', grammarPoint: 'l17c5_buy', situation: { ru: 'Завтра ты собираешься купить два пакета муки. Скажи об этом.', uk: 'Завтра ти збираєшся купити два пакети борошна. Скажи про це.' }, accepted: ['I am going to buy two bags of flour tomorrow.'] },
    { id: 'l17c5-04', type: 'situation', grammarPoint: 'l17c5_buy', situation: { ru: 'Вчера ты купил две банки варенья. Скажи об этом.', uk: 'Вчора ти купив дві банки варення. Скажи про це.' }, accepted: ['I bought two jars of jam yesterday.'] },
    { id: 'l17c5-05', type: 'situation', grammarPoint: 'l17c5_some_any', situation: { ru: 'Платы за бронирование у вас нет. Скажи об этом.', uk: 'Плати за бронювання у вас немає. Скажи про це.' }, accepted: ["There aren't any booking fees."] },
    { id: 'l17c5-06', type: 'situation', grammarPoint: 'l17c5_some_any', situation: { ru: 'На улице вам нужно хоть какое-то освещение. Скажи, что вам нужно уличное освещение.', uk: 'На вулиці вам потрібне хоч якесь освітлення. Скажи, що вам потрібне вуличне освітлення.' }, accepted: ['We need some street lighting.'] },
    // ── Ответ в мини-диалоге ────────────────────────────────────────
    { id: 'l17c5-07', type: 'dialogue', grammarPoint: 'l17c5_units', partnerLine: 'We need two cartons of juice.', situation: { ru: 'Друг говорит, что вам нужны два пакета сока. Скажи, что вам нужны ещё две бутылки масла.', uk: 'Друг каже, що вам потрібні два пакети соку. Скажи, що вам потрібні ще дві пляшки олії.' }, accepted: ['We need two bottles of oil.'] },
    { id: 'l17c5-08', type: 'dialogue', grammarPoint: 'l17c5_units', partnerLine: 'We need two kilos of rice.', situation: { ru: 'Друг говорит, что вам нужны два килограмма риса. Скажи, что вам нужны два литра молока.', uk: 'Друг каже, що вам потрібні два кілограми рису. Скажи, що вам потрібні два літри молока.' }, accepted: ['We need two litres of milk.'] },
    { id: 'l17c5-09', type: 'dialogue', grammarPoint: 'l17c5_buy', partnerLine: 'We need two pots of yoghurt.', situation: { ru: 'Друг говорит, что вам нужны два горшочка йогурта. Скажи, что завтра ты собираешься купить два горшочка йогурта.', uk: 'Друг каже, що вам потрібні два горщики йогурту. Скажи, що завтра ти збираєшся купити два горщики йогурту.' }, accepted: ['I am going to buy two pots of yoghurt tomorrow.'] },
    { id: 'l17c5-10', type: 'dialogue', grammarPoint: 'l17c5_buy', partnerLine: 'We need two kilos of meat.', situation: { ru: 'Друг говорит, что вам нужны два килограмма мяса. Скажи, что вчера ты купил два килограмма мяса.', uk: 'Друг каже, що вам потрібні два кілограми м’яса. Скажи, що вчора ти купив два кілограми м’яса.' }, accepted: ['I bought two kilos of meat yesterday.'] },
    { id: 'l17c5-11', type: 'dialogue', grammarPoint: 'l17c5_some_any', partnerLine: 'We need two bags of rice.', situation: { ru: 'Друг говорит, что вам нужны два пакета риса. Скажи, что вам нужна проточная вода.', uk: 'Друг каже, що вам потрібні два пакети рису. Скажи, що вам потрібна проточна вода.' }, accepted: ['We need some running water.'] },
    { id: 'l17c5-12', type: 'dialogue', grammarPoint: 'l17c5_some_any', partnerLine: 'We need two tubes of cream.', situation: { ru: 'Друг говорит, что вам нужны два тюбика крема. Скажи, что счетов за ремонт у вас нет.', uk: 'Друг каже, що вам потрібні два тюбики крему. Скажи, що рахунків за ремонт у вас немає.' }, accepted: ["We don't have any repair bills."] },
    // ── Найди и исправь ошибку ────────────────────────────────────────
    { id: 'l17c5-13', type: 'fix', grammarPoint: 'l17c5_units', wrong: 'We need two bag of rice.', accepted: ['We need two bags of rice.'] },
    { id: 'l17c5-14', type: 'fix', grammarPoint: 'l17c5_units', wrong: 'We need two bars soap.', accepted: ['We need two bars of soap.'] },
    { id: 'l17c5-15', type: 'fix', grammarPoint: 'l17c5_buy', wrong: 'I am going buy two bags of flour tomorrow.', accepted: ['I am going to buy two bags of flour tomorrow.'] },
    { id: 'l17c5-16', type: 'fix', grammarPoint: 'l17c5_some_any', wrong: "We don't have some repair bills.", accepted: ["We don't have any repair bills."] },
  ],
};
