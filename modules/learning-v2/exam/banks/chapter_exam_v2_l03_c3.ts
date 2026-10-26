// chapter_exam_v2_l03_c3.ts — банк экзамена v2: урок 3, глава 3 (эпизоды 17–24).
// зачем (слово владельца 26.10 «банки для всех уроков и глав — в 2.0.3»): глава 3 урока 3 учит называть несколько предметов —
// -s (tickets), -es (watches), y → ies (stories) — и различать один предмет с a и несколько без a (17–24). В «исправь ошибку» только
// знакомые слова: забытое окончание (They are ticket / city / bus), лишнее a перед несколькими. Сторож слов — owner_locks_exam_episode_words.
import type { ChapterExamV2Bank } from '../chapter_exam_v2';

export const CHAPTER_EXAM_V2_BANK_L03_C3: ChapterExamV2Bank = {
  lessonOrdinal: 3,
  chapterOrdinal: 3,
  grammarPoints: [
    { id: 'l03c3_plural_s', label: { ru: 'несколько: +s', uk: 'кілька: +s' }, episodeOrdinals: [17, 22, 23] },
    { id: 'l03c3_plural_es_ies', label: { ru: 'несколько: +es и y → ies', uk: 'кілька: +es і y → ies' }, episodeOrdinals: [18, 19, 20] },
    { id: 'l03c3_one_or_many', label: { ru: 'один с a или несколько без a', uk: 'один з a чи кілька без a' }, episodeOrdinals: [21, 22, 24] },
  ],
  items: [
    // ── Ситуация → сам говоришь или пишешь ───────────────────────────────────────────────────────────────────────
    { id: 'l03c3-01', type: 'situation', grammarPoint: 'l03c3_plural_s', situation: { ru: 'В кармане старого пальто ты нашёл бумажки с местами и рядами. Скажи, что это билеты.', uk: 'У кишені старого пальта ти знайшов папірці з місцями й рядами. Скажи, що це квитки.' }, accepted: ['They are tickets.', "They're tickets."] },
    { id: 'l03c3-02', type: 'situation', grammarPoint: 'l03c3_plural_es_ies', situation: { ru: 'В витрине лежат наручные часы — сразу пять штук. Скажи, что это часы.', uk: 'У вітрині лежать наручні годинники — одразу п’ять штук. Скажи, що це годинники.' }, accepted: ['They are watches.', "They're watches."] },
    { id: 'l03c3-03', type: 'situation', grammarPoint: 'l03c3_one_or_many', situation: { ru: 'Курьер привёз заказ с посудой. Напиши мужу, что тарелки здесь.', uk: 'Кур’єр привіз замовлення з посудом. Напиши чоловікові, що тарілки тут.' }, accepted: ['The plates are here.'] },
    { id: 'l03c3-04', type: 'situation', grammarPoint: 'l03c3_plural_s', situation: { ru: 'Сын высыпал из копилки горсть металлических кругляшей. Скажи, что это монеты.', uk: 'Син висипав зі скарбнички жменю металевих кружечків. Скажи, що це монети.' }, accepted: ['They are coins.', "They're coins."] },
    { id: 'l03c3-05', type: 'situation', grammarPoint: 'l03c3_plural_es_ies', situation: { ru: 'Пульт не работает, а у тебя в руке две новые батарейки. Скажи, что это батарейки.', uk: 'Пульт не працює, а в тебе в руці дві нові батарейки. Скажи, що це батарейки.' }, accepted: ['They are batteries.', "They're batteries."] },
    { id: 'l03c3-06', type: 'situation', grammarPoint: 'l03c3_plural_es_ies', situation: { ru: 'Дочка листает книжку сказок на ночь. Скажи, что истории короткие.', uk: 'Донька гортає книжку казок на ніч. Скажи, що історії короткі.' }, accepted: ['The stories are short.'] },
    // ── Ответ в мини-диалоге ──────────────────────────────────────────────────────────────────────────────────────
    { id: 'l03c3-07', type: 'dialogue', grammarPoint: 'l03c3_one_or_many', partnerLine: 'Is it a spoon?', situation: { ru: 'В ящике лежит целая горсть ложек. Скажи, что это ложки.', uk: 'У шухляді лежить ціла жменя ложок. Скажи, що це ложки.' }, accepted: ['They are spoons.', "They're spoons."] },
    { id: 'l03c3-08', type: 'dialogue', grammarPoint: 'l03c3_plural_s', partnerLine: 'Are they pens?', situation: { ru: 'Это не ручки — это пластиковые карточки. Скажи, что это карточки.', uk: 'Це не ручки — це пластикові картки. Скажи, що це картки.' }, accepted: ['They are cards.', "They're cards."] },
    { id: 'l03c3-09', type: 'dialogue', grammarPoint: 'l03c3_plural_es_ies', partnerLine: 'It is a dish.', situation: { ru: 'Возрази: на столе не одно блюдо, а много — это блюда.', uk: 'Заперечи: на столі не одна страва, а багато — це страви.' }, accepted: ['They are dishes.', "They're dishes."] },
    { id: 'l03c3-10', type: 'dialogue', grammarPoint: 'l03c3_one_or_many', partnerLine: 'They are combs.', situation: { ru: 'Возрази: в сумке всего одна расчёска.', uk: 'Заперечи: у сумці лише один гребінець.' }, accepted: ['It is a comb.', "It's a comb."] },
    { id: 'l03c3-11', type: 'dialogue', grammarPoint: 'l03c3_plural_es_ies', partnerLine: 'Are they cups?', situation: { ru: 'Это не чашки — это стеклянные стаканы. Скажи, что это стаканы.', uk: 'Це не чашки — це скляні склянки. Скажи, що це склянки.' }, accepted: ['They are glasses.', "They're glasses."] },
    { id: 'l03c3-12', type: 'dialogue', grammarPoint: 'l03c3_plural_s', partnerLine: 'Where are the bowls?', situation: { ru: 'Миски уже стоят на столе. Скажи, что они здесь.', uk: 'Миски вже стоять на столі. Скажи, що вони тут.' }, accepted: ['The bowls are here.', 'They are here.', "They're here."] },
    // ── Найди и исправь ошибку ────────────────────────────────────────────────────────────────────────────────────
    { id: 'l03c3-13', type: 'fix', grammarPoint: 'l03c3_plural_s', wrong: 'They are ticket.', accepted: ['They are tickets.', "They're tickets."] },
    { id: 'l03c3-14', type: 'fix', grammarPoint: 'l03c3_plural_es_ies', wrong: 'They are bus.', accepted: ['They are buses.', "They're buses."] },
    { id: 'l03c3-15', type: 'fix', grammarPoint: 'l03c3_plural_es_ies', wrong: 'They are city.', accepted: ['They are cities.', "They're cities."] },
    { id: 'l03c3-16', type: 'fix', grammarPoint: 'l03c3_one_or_many', wrong: 'It is a forks.', accepted: ['It is a fork.', "It's a fork.", 'They are forks.', "They're forks."] },
  ],
};
