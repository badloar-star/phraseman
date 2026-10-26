// chapter_exam_v2_l03_c2.ts — банк экзамена v2: урок 3, глава 2 (эпизоды 9–16).
// зачем (слово владельца 26.10 «банки для всех уроков и глав — в 2.0.3»): глава 2 урока 3 учит выбирать a или an по первому ЗВУКУ
// слова (9–16): an armchair, a kettle, an hour, a uniform. В «исправь ошибку» — оба направления и ловушки hour / uniform.
// Сторож слов — owner_locks_exam_episode_words.
import type { ChapterExamV2Bank } from '../chapter_exam_v2';

export const CHAPTER_EXAM_V2_BANK_L03_C2: ChapterExamV2Bank = {
  lessonOrdinal: 3,
  chapterOrdinal: 2,
  grammarPoints: [
    { id: 'l03c2_an', label: { ru: 'an — перед гласным звуком', uk: 'an — перед голосним звуком' }, episodeOrdinals: [9, 11, 13] },
    { id: 'l03c2_a', label: { ru: 'a — перед согласным звуком', uk: 'a — перед приголосним звуком' }, episodeOrdinals: [10, 11, 12] },
    { id: 'l03c2_question', label: { ru: 'это …? — Is it a / an …?', uk: 'це …? — Is it a / an …?' }, episodeOrdinals: [9, 12, 14] },
  ],
  items: [
    // ── Ситуация → сам говоришь или пишешь ───────────────────────────────────────────────────────────────────────
    { id: 'l03c2-01', type: 'situation', grammarPoint: 'l03c2_an', situation: { ru: 'Гость не может разглядеть, что стоит в тёмном углу. Скажи, что это кресло.', uk: 'Гість не може роздивитися, що стоїть у темному кутку. Скажи, що це крісло.' }, accepted: ['It is an armchair.', "It's an armchair."] },
    { id: 'l03c2-02', type: 'situation', grammarPoint: 'l03c2_a', situation: { ru: 'На кухне что-то засвистело, и гость вздрогнул. Скажи, что это чайник.', uk: 'На кухні щось засвистіло, і гість здригнувся. Скажи, що це чайник.' }, accepted: ['It is a kettle.', "It's a kettle."] },
    { id: 'l03c2-03', type: 'situation', grammarPoint: 'l03c2_question', situation: { ru: 'В кафе на тарелке лежит что-то жёлтое и круглое. Спроси, яйцо ли это.', uk: 'У кафе на тарілці лежить щось жовте й кругле. Запитай, чи це яйце.' }, accepted: ['Is it an egg?'] },
    { id: 'l03c2-04', type: 'situation', grammarPoint: 'l03c2_an', situation: { ru: 'Сестра ищет, чем укрыться от дождя. Протяни ей зонт и скажи, что это зонт.', uk: 'Сестра шукає, чим затулитися від дощу. Простягни їй парасольку й скажи, що це парасолька.' }, accepted: ['It is an umbrella.', "It's an umbrella."] },
    { id: 'l03c2-05', type: 'situation', grammarPoint: 'l03c2_a', situation: { ru: 'На полке что-то тихо тикает. Скажи гостю, что это часы.', uk: 'На полиці щось тихо цокає. Скажи гостеві, що це годинник.' }, accepted: ['It is a clock.', "It's a clock."] },
    { id: 'l03c2-06', type: 'situation', grammarPoint: 'l03c2_question', situation: { ru: 'В бабушкиной шкатулке блестит маленькая белая бусина. Спроси, жемчужина ли это.', uk: 'У бабусиній скриньці блищить маленька біла намистина. Запитай, чи це перлина.' }, accepted: ['Is it a pearl?'] },
    // ── Ответ в мини-диалоге ──────────────────────────────────────────────────────────────────────────────────────
    { id: 'l03c2-07', type: 'dialogue', grammarPoint: 'l03c2_an', partnerLine: 'Is it a discount?', situation: { ru: 'Это не скидка — это счёт на оплату. Скажи, что это счёт.', uk: 'Це не знижка — це рахунок на оплату. Скажи, що це рахунок.' }, accepted: ['It is an invoice.', "It's an invoice."] },
    { id: 'l03c2-08', type: 'dialogue', grammarPoint: 'l03c2_a', partnerLine: 'It is an oven.', situation: { ru: 'Возрази: на столе маленький прибор для хлеба — это тостер.', uk: 'Заперечи: на столі маленький прилад для хліба — це тостер.' }, accepted: ['It is a toaster.', "It's a toaster.", 'It is not an oven.', "It's not an oven."] },
    { id: 'l03c2-09', type: 'dialogue', grammarPoint: 'l03c2_question', partnerLine: 'It is not a salad.', situation: { ru: 'Официант ставит тарелку с хлебом и сыром. Спроси, бутерброд ли это.', uk: 'Офіціант ставить тарілку з хлібом і сиром. Запитай, чи це бутерброд.' }, accepted: ['Is it a sandwich?'] },
    { id: 'l03c2-10', type: 'dialogue', grammarPoint: 'l03c2_an', partnerLine: 'Is it a necklace?', situation: { ru: 'В руке у тебя одна маленькая серёжка. Скажи, что это серёжка.', uk: 'У руці в тебе одна маленька сережка. Скажи, що це сережка.' }, accepted: ['It is an earring.', "It's an earring."] },
    { id: 'l03c2-11', type: 'dialogue', grammarPoint: 'l03c2_a', partnerLine: 'Is it a candle?', situation: { ru: 'Свеча внутри, но вещь — со стеклом и ручкой. Скажи, что это фонарь.', uk: 'Свічка всередині, але річ — зі склом і ручкою. Скажи, що це ліхтар.' }, accepted: ['It is a lantern.', "It's a lantern."] },
    { id: 'l03c2-12', type: 'dialogue', grammarPoint: 'l03c2_question', partnerLine: 'It is not a radio.', situation: { ru: 'Продавец показывает старую коробку со стрелками. Спроси, часы ли это.', uk: 'Продавець показує стару коробку зі стрілками. Запитай, чи це годинник.' }, accepted: ['Is it a clock?'] },
    // ── Найди и исправь ошибку ────────────────────────────────────────────────────────────────────────────────────
    { id: 'l03c2-13', type: 'fix', grammarPoint: 'l03c2_an', wrong: 'It is a oven.', accepted: ['It is an oven.', "It's an oven."] },
    { id: 'l03c2-14', type: 'fix', grammarPoint: 'l03c2_a', wrong: 'It is an kettle.', accepted: ['It is a kettle.', "It's a kettle."] },
    { id: 'l03c2-15', type: 'fix', grammarPoint: 'l03c2_an', wrong: 'It is a hour.', accepted: ['It is an hour.', "It's an hour."] },
    { id: 'l03c2-16', type: 'fix', grammarPoint: 'l03c2_a', wrong: 'It is an uniform.', accepted: ['It is a uniform.', "It's a uniform."] },
  ],
};
