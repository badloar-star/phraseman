// chapter_exam_v2_l25_c7.ts — банк экзамена v2: урок 25, глава 7 (эпизоды 49–56). Подключён в registry_l24_l26.ts.
// зачем: только слова и формы эпизодов 1–56 урока 25 — повтор рассказа о прошлом: had … before, used to / would (как было раньше),
// was (каким было тогда). Сторож слов — tests/owner_locks_exam_episode_words_2026_10_25.test.ts.
import type { ChapterExamV2Bank } from '../chapter_exam_v2';

export const CHAPTER_EXAM_V2_BANK_L25_C7: ChapterExamV2Bank = {
  lessonOrdinal: 25,
  chapterOrdinal: 7,
  grammarPoints: [
    { id: 'l25c7_had', label: { ru: 'уже раньше — had left before', uk: 'уже раніше — had left before' }, episodeOrdinals: [49, 51, 54] },
    { id: 'l25c7_used_to', label: { ru: 'как было раньше — used to, would', uk: 'як було раніше — used to, would' }, episodeOrdinals: [50, 53, 55] },
    { id: 'l25c7_was', label: { ru: 'каким было тогда — was delighted, was vacant', uk: 'яким було тоді — was delighted, was vacant' }, episodeOrdinals: [52, 56] },
  ],
  items: [
    // ── Ситуация → сам говоришь или пишешь ───────────────────────────────────────────────────────────────────────
    { id: 'l25c7-01', type: 'situation', grammarPoint: 'l25c7_had', situation: { ru: 'Вы уехали из города утром, а к обеду там стало душно. Скажи, что вы уехали до того, как стало влажно.', uk: 'Ви поїхали з міста вранці, а до обіду там стало задушливо. Скажи, що ви поїхали до того, як стало волого.' }, accepted: ['We had left the city before it became humid.'] },
    { id: 'l25c7-02', type: 'situation', grammarPoint: 'l25c7_used_to', situation: { ru: 'Расскажи, что раньше в вашей семье ели в полдень.', uk: 'Розкажи, що раніше у вашій родині їли опівдні.' }, accepted: ['We used to eat at midday.'] },
    { id: 'l25c7-03', type: 'situation', grammarPoint: 'l25c7_was', situation: { ru: 'Вчера друг подарил тебе шарф. Скажи, что ты был в восторге от подарка.', uk: 'Учора друг подарував тобі шарф. Скажи, що ти був у захваті від подарунка.' }, accepted: ['I was delighted with the gift yesterday.', 'I was delighted with the gift.'] },
    { id: 'l25c7-04', type: 'situation', grammarPoint: 'l25c7_had', situation: { ru: 'Ты вернулся на работу после болезни. Скажи, что восстановил силы до выхода на работу.', uk: 'Ти повернувся на роботу після хвороби. Скажи, що відновив сили до виходу на роботу.' }, accepted: ['I had regained my strength before I went back to work.'] },
    { id: 'l25c7-05', type: 'situation', grammarPoint: 'l25c7_used_to', situation: { ru: 'Друг смеётся над твоими толстыми носками. Скажи, что раньше ты носил шерстяные носки.', uk: 'Друг сміється з твоїх товстих шкарпеток. Скажи, що раніше ти носив вовняні шкарпетки.' }, accepted: ['I used to wear woollen socks.'] },
    { id: 'l25c7-06', type: 'situation', grammarPoint: 'l25c7_was', situation: { ru: 'Расскажи про гостиницу: когда вы приехали, номер был свободен.', uk: 'Розкажи про готель: коли ви приїхали, номер був вільний.' }, accepted: ['The room was vacant when we arrived.'] },
    // ── Ответ в мини-диалоге ──────────────────────────────────────────────────────────────────────────────────────
    { id: 'l25c7-07', type: 'dialogue', grammarPoint: 'l25c7_had', partnerLine: 'The soup is delicious.', situation: { ru: 'Скажи, что он добавил специи ещё до того, как ты попробовал суп.', uk: 'Скажи, що він додав спеції ще до того, як ти скуштував суп.' }, accepted: ['He had added the spices before I tasted the soup.'] },
    { id: 'l25c7-08', type: 'dialogue', grammarPoint: 'l25c7_was', partnerLine: 'We want to sit by the window.', situation: { ru: 'Напомни: место было занято, когда вы пришли.', uk: 'Нагадай: місце було зайняте, коли ви прийшли.' }, accepted: ['The seat was occupied when we arrived.'] },
    { id: 'l25c7-09', type: 'dialogue', grammarPoint: 'l25c7_used_to', partnerLine: 'We talk at mealtimes.', situation: { ru: 'Скажи, что вы тоже раньше разговаривали за едой.', uk: 'Скажи, що ви теж раніше розмовляли за їжею.' }, accepted: ['We used to talk at mealtimes.'] },
    { id: 'l25c7-10', type: 'dialogue', grammarPoint: 'l25c7_was', partnerLine: 'I saw the price yesterday.', situation: { ru: 'Скажи, что тебя вчера тоже поразила цена.', uk: 'Скажи, що тебе вчора теж вразила ціна.' }, accepted: ['I was astonished by the price yesterday.'] },
    { id: 'l25c7-11', type: 'dialogue', grammarPoint: 'l25c7_used_to', partnerLine: 'We walked towards the park.', situation: { ru: 'Вспомни: в детстве вы гуляли вдоль реки.', uk: 'Згадай: у дитинстві ви гуляли вздовж річки.' }, accepted: ['We would walk alongside the river.', 'We used to walk alongside the river.'] },
    // ── Найди и исправь ошибку ────────────────────────────────────────────────────────────────────────────────────
    { id: 'l25c7-12', type: 'fix', grammarPoint: 'l25c7_had', wrong: 'We had make the gravy before the guests arrived.', accepted: ['We had made the gravy before the guests arrived.'] },
    { id: 'l25c7-13', type: 'fix', grammarPoint: 'l25c7_used_to', wrong: 'She used to wore oversized sweaters.', accepted: ['She used to wear oversized sweaters.'] },
    { id: 'l25c7-14', type: 'fix', grammarPoint: 'l25c7_was', wrong: 'The kitchen were sunlit when we arrived.', accepted: ['The kitchen was sunlit when we arrived.'] },
    { id: 'l25c7-15', type: 'fix', grammarPoint: 'l25c7_had', wrong: 'She has reconsidered her plan before she called.', accepted: ['She had reconsidered her plan before she called.'] },
  ],
};
