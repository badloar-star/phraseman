// chapter_exam_v2_l27_c7.ts — банк экзамена v2: урок 27, глава 7 (эпизоды 49–56, последняя глава урока).
// зачем (слово владельца 26.10 «банки для всех уроков и глав — в 2.0.3»): глава 7 урока 27 повторяет весь урок на прогулках, уроках,
// встречах в кафе и сборах: «я бы …, если бы …», совет If I were you, I would … и «уже сделал / ещё не сделал» (49–56). Обе части
// условия засчитываются в любом порядке. Сторож слов — owner_locks_exam_episode_words.
import type { ChapterExamV2Bank } from '../chapter_exam_v2';

export const CHAPTER_EXAM_V2_BANK_L27_C7: ChapterExamV2Bank = {
  lessonOrdinal: 27,
  chapterOrdinal: 7,
  grammarPoints: [
    { id: 'l27c7_would_if', label: { ru: 'я бы …, если бы … — would + if', uk: 'я б …, якби … — would + if' }, episodeOrdinals: [49, 52, 54] },
    { id: 'l27c7_if_i_were_you', label: { ru: 'совет — If I were you, I would …', uk: 'порада — If I were you, I would …' }, episodeOrdinals: [51, 52, 53] },
    { id: 'l27c7_have_done', label: { ru: 'уже сделал / ещё не сделал — have + done', uk: 'уже зробив / ще не зробив — have + done' }, episodeOrdinals: [50, 53, 56] },
  ],
  items: [
    // ── Ситуация → сам говоришь или пишешь ───────────────────────────────────────────────────────────────────────
    { id: 'l27c7-01', type: 'situation', grammarPoint: 'l27c7_would_if', situation: { ru: 'Пешком до дома ещё час, а автобус через двадцать минут. Скажи, что вы были бы дома быстрее, если бы сели на автобус.', uk: 'Пішки до дому ще година, а автобус за двадцять хвилин. Скажи, що ви були б удома швидше, якби сіли на автобус.' }, accepted: ['We would get home sooner if we took the bus.', 'If we took the bus, we would get home sooner.'] },
    { id: 'l27c7-02', type: 'situation', grammarPoint: 'l27c7_if_i_were_you', situation: { ru: 'Подруга пытается завернуть маленький подарок в огромный лист. Посоветуй взять кусок поменьше.', uk: 'Подруга намагається загорнути маленький подарунок у величезний аркуш. Порадь узяти шматок менший.' }, accepted: ['If I were you, I would try a smaller piece.', 'I would try a smaller piece if I were you.'] },
    { id: 'l27c7-03', type: 'situation', grammarPoint: 'l27c7_have_done', situation: { ru: 'Тренер по плаванию спрашивает, придёшь ли ты ещё. Скажи, что уже записался на следующий урок.', uk: 'Тренер із плавання питає, чи прийдеш ти ще. Скажи, що вже записався на наступний урок.' }, accepted: ['I have already booked the next lesson.'] },
    { id: 'l27c7-04', type: 'situation', grammarPoint: 'l27c7_would_if', situation: { ru: 'Подруга живёт на другом конце города. Скажи, что вы встречались бы чаще, если бы жили ближе.', uk: 'Подруга живе на іншому кінці міста. Скажи, що ви зустрічалися б частіше, якби жили ближче.' }, accepted: ['We would meet more often if we lived closer.', 'If we lived closer, we would meet more often.'] },
    { id: 'l27c7-05', type: 'situation', grammarPoint: 'l27c7_if_i_were_you', situation: { ru: 'Друг в панике ищет ключи. Посоветуй проверить карманы.', uk: 'Друг у паніці шукає ключі. Порадь перевірити кишені.' }, accepted: ['If I were you, I would check the pockets.', 'I would check the pockets if I were you.'] },
    { id: 'l27c7-06', type: 'situation', grammarPoint: 'l27c7_have_done', situation: { ru: 'Жена всё ещё ищет твои ключи по квартире. Скажи, что ты уже нашёл их.', uk: 'Дружина досі шукає твої ключі по квартирі. Скажи, що ти вже їх знайшов.' }, accepted: ['I have already found my keys.', 'I have found my keys.'] },
    // ── Ответ в мини-диалоге ──────────────────────────────────────────────────────────────────────────────────────
    { id: 'l27c7-07', type: 'dialogue', grammarPoint: 'l27c7_would_if', partnerLine: 'Could you send me your address?', situation: { ru: 'Старый друг зовёт в гости, но ты работаешь без выходных. Скажи, что навестил бы его, если бы у тебя был выходной.', uk: 'Старий друг кличе в гості, але ти працюєш без вихідних. Скажи, що навідав би його, якби в тебе був вихідний.' }, accepted: ['I would visit you if I had a day off.', 'If I had a day off, I would visit you.'] },
    { id: 'l27c7-08', type: 'dialogue', grammarPoint: 'l27c7_have_done', partnerLine: 'Could I have a small latte without sugar?', situation: { ru: 'Подруга делает заказ. Скажи, что ты уже заказал бутерброд.', uk: 'Подруга робить замовлення. Скажи, що ти вже замовив бутерброд.' }, accepted: ['I have already ordered a sandwich.'] },
    { id: 'l27c7-09', type: 'dialogue', grammarPoint: 'l27c7_if_i_were_you', partnerLine: 'Where does the group meet?', situation: { ru: 'Друг впервые идёт в поход с группой. Посоветуй спросить про маршрут.', uk: 'Друг уперше йде в похід із групою. Порадь запитати про маршрут.' }, accepted: ['If I were you, I would ask about the route.', 'I would ask about the route if I were you.'] },
    { id: 'l27c7-10', type: 'dialogue', grammarPoint: 'l27c7_would_if', partnerLine: 'There are six people coming tonight.', situation: { ru: 'Стол у вас на четверых. Скажи, что все сидели бы вместе, если бы у вас был стол побольше.', uk: 'Стіл у вас на чотирьох. Скажи, що всі сиділи б разом, якби у вас був більший стіл.' }, accepted: ['Everyone would sit together if we had a bigger table.', 'If we had a bigger table, everyone would sit together.'] },
    { id: 'l27c7-11', type: 'dialogue', grammarPoint: 'l27c7_have_done', partnerLine: 'Have you packed the sunscreen?', situation: { ru: 'Крем упакован, а вот очки пропали. Скажи, что ещё не нашёл солнечные очки.', uk: 'Крем спакований, а от окуляри зникли. Скажи, що ще не знайшов сонячні окуляри.' }, accepted: ['I have not found my sunglasses yet.'] },
    { id: 'l27c7-12', type: 'dialogue', grammarPoint: 'l27c7_if_i_were_you', partnerLine: 'Shall we sit by the window?', situation: { ru: 'На улице тепло и солнечно. Посоветуй сесть на улице.', uk: 'Надворі тепло й сонячно. Порадь сісти надворі.' }, accepted: ['If I were you, I would sit outside.', 'I would sit outside if I were you.'] },
    // ── Найди и исправь ошибку ────────────────────────────────────────────────────────────────────────────────────
    { id: 'l27c7-13', type: 'fix', grammarPoint: 'l27c7_would_if', wrong: 'We would get home sooner if we take the bus.', accepted: ['We would get home sooner if we took the bus.', 'If we took the bus, we would get home sooner.'] },
    { id: 'l27c7-14', type: 'fix', grammarPoint: 'l27c7_if_i_were_you', wrong: 'If I were you, I will try a smaller piece.', accepted: ['If I were you, I would try a smaller piece.', 'I would try a smaller piece if I were you.'] },
    { id: 'l27c7-15', type: 'fix', grammarPoint: 'l27c7_have_done', wrong: 'I have already find my keys.', accepted: ['I have already found my keys.'] },
    { id: 'l27c7-16', type: 'fix', grammarPoint: 'l27c7_would_if', wrong: 'I would visit you if I have a day off.', accepted: ['I would visit you if I had a day off.', 'If I had a day off, I would visit you.'] },
  ],
};
