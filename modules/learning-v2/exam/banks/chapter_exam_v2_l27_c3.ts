// chapter_exam_v2_l27_c3.ts — банк экзамена v2: урок 27, глава 3 (эпизоды 17–24).
// зачем (слово владельца 26.10 «банки для всех уроков и глав — в 2.0.3»): глава 3 урока 27 — условие с прошедшей формой без would
// внутри if (I would take the bus if I knew the route), were про вещи и погоду (if it were warmer, if it were smaller) и «уже
// сделал» (17–24). Обе части условия засчитываются в любом порядке. Сторож слов — owner_locks_exam_episode_words.
import type { ChapterExamV2Bank } from '../chapter_exam_v2';

export const CHAPTER_EXAM_V2_BANK_L27_C3: ChapterExamV2Bank = {
  lessonOrdinal: 27,
  chapterOrdinal: 3,
  grammarPoints: [
    { id: 'l27c3_if_past', label: { ru: 'если бы знал / ушли — if + knew / left', uk: 'якби знав / пішли — if + knew / left' }, episodeOrdinals: [17, 18, 19] },
    { id: 'l27c3_if_were', label: { ru: 'если бы было — if it were / if I were', uk: 'якби було — if it were / if I were' }, episodeOrdinals: [22, 23, 24] },
    { id: 'l27c3_have_done', label: { ru: 'уже сделал — have + done', uk: 'уже зробив — have + done' }, episodeOrdinals: [19, 21, 23] },
  ],
  items: [
    // ── Ситуация → сам говоришь или пишешь ───────────────────────────────────────────────────────────────────────
    { id: 'l27c3-01', type: 'situation', grammarPoint: 'l27c3_if_past', situation: { ru: 'Друг зовёт тебя в гости на другой конец города. Скажи, что поехал бы на автобусе, если бы знал маршрут.', uk: 'Друг кличе тебе в гості на інший кінець міста. Скажи, що поїхав би автобусом, якби знав маршрут.' }, accepted: ['I would take the bus if I knew the route.', 'If I knew the route, I would take the bus.'] },
    { id: 'l27c3-02', type: 'situation', grammarPoint: 'l27c3_if_were', situation: { ru: 'Официант предлагает столик на террасе, но дует холодный ветер. Скажи, что вы сели бы на улице, если бы было теплее.', uk: 'Офіціант пропонує столик на терасі, але дме холодний вітер. Скажи, що ви сіли б надворі, якби було тепліше.' }, accepted: ['We would sit outside if it were warmer.', 'If it were warmer, we would sit outside.'] },
    { id: 'l27c3-03', type: 'situation', grammarPoint: 'l27c3_have_done', situation: { ru: 'Жена собирается мыть посуду после гостей. Скажи, что ты уже её помыл.', uk: 'Дружина збирається мити посуд після гостей. Скажи, що ти вже його помив.' }, accepted: ['I have already washed the dishes.'] },
    { id: 'l27c3-04', type: 'situation', grammarPoint: 'l27c3_if_past', situation: { ru: 'До поезда два часа, а вы ещё дома. Скажи, что вы приехали бы рано, если бы вышли сейчас.', uk: 'До потяга дві години, а ви ще вдома. Скажи, що ви приїхали б рано, якби вийшли зараз.' }, accepted: ['We would arrive early if we left now.', 'If we left now, we would arrive early.'] },
    { id: 'l27c3-05', type: 'situation', grammarPoint: 'l27c3_if_were', situation: { ru: 'Шкаф нравится, но не влезет в комнату. Скажи продавцу, что вы бы его взяли, если бы он был поменьше.', uk: 'Шафа подобається, але не влізе в кімнату. Скажи продавцеві, що ви б її взяли, якби вона була менша.' }, accepted: ['We would take it if it were smaller.', 'If it were smaller, we would take it.'] },
    { id: 'l27c3-06', type: 'situation', grammarPoint: 'l27c3_have_done', situation: { ru: 'Сосед помог донести тяжёлые сумки. Жена напоминает сказать ему спасибо. Ответь, что ты его уже поблагодарил.', uk: 'Сусід допоміг донести важкі сумки. Дружина нагадує подякувати йому. Відповідай, що ти вже йому подякував.' }, accepted: ['I have already thanked him.'] },
    // ── Ответ в мини-диалоге ──────────────────────────────────────────────────────────────────────────────────────
    { id: 'l27c3-07', type: 'dialogue', grammarPoint: 'l27c3_if_past', partnerLine: 'This bill is unpaid.', situation: { ru: 'Ты не получал этот счёт. Скажи, что оплатил бы его, если бы знал о нём.', uk: 'Ти не отримував цей рахунок. Скажи, що сплатив би його, якби знав про нього.' }, accepted: ['I would pay it if I knew about it.', 'If I knew about it, I would pay it.'] },
    { id: 'l27c3-08', type: 'dialogue', grammarPoint: 'l27c3_have_done', partnerLine: 'Would you like soup instead?', situation: { ru: 'Новое блюдо ты уже выбрал. Скажи, что уже заказал.', uk: 'Нову страву ти вже обрав. Скажи, що вже замовив.' }, accepted: ['I have already ordered.'] },
    { id: 'l27c3-09', type: 'dialogue', grammarPoint: 'l27c3_if_were', partnerLine: 'Can you come to the clinic with me?', situation: { ru: 'Ты весь день на работе. Скажи, что если бы ты был свободен, пошёл бы с ней.', uk: 'Ти весь день на роботі. Скажи, що якби ти був вільний, пішов би з нею.' }, accepted: ['If I were free, I would go with you.', 'I would go with you if I were free.'] },
    { id: 'l27c3-10', type: 'dialogue', grammarPoint: 'l27c3_if_past', partnerLine: 'Where are they?', situation: { ru: 'Друзья впервые едут к вам за город. Скажи, что они бы уже присоединились, если бы знали дорогу.', uk: 'Друзі вперше їдуть до вас за місто. Скажи, що вони б уже приєдналися, якби знали дорогу.' }, accepted: ['They would join us if they knew the way.', 'If they knew the way, they would join us.'] },
    { id: 'l27c3-11', type: 'dialogue', grammarPoint: 'l27c3_have_done', partnerLine: 'Will it fit through the door?', situation: { ru: 'Ты заранее всё обмерил. Скажи, что уже измерил комнату.', uk: 'Ти заздалегідь усе обміряв. Скажи, що вже виміряв кімнату.' }, accepted: ['I have already measured the room.'] },
    { id: 'l27c3-12', type: 'dialogue', grammarPoint: 'l27c3_if_were', partnerLine: 'I still feel groggy.', situation: { ru: 'Друга второй день шатает. Посоветуй: на его месте ты бы позвонил в клинику.', uk: 'Друга другий день хитає. Порадь: на його місці ти б зателефонував до клініки.' }, accepted: ['I would call the clinic if I were you.', 'If I were you, I would call the clinic.'] },
    // ── Найди и исправь ошибку ────────────────────────────────────────────────────────────────────────────────────
    { id: 'l27c3-13', type: 'fix', grammarPoint: 'l27c3_if_past', wrong: 'I would take the bus if I know the route.', accepted: ['I would take the bus if I knew the route.', 'If I knew the route, I would take the bus.'] },
    { id: 'l27c3-14', type: 'fix', grammarPoint: 'l27c3_if_were', wrong: 'We will sit outside if it were warmer.', accepted: ['We would sit outside if it were warmer.', 'If it were warmer, we would sit outside.'] },
    { id: 'l27c3-15', type: 'fix', grammarPoint: 'l27c3_have_done', wrong: 'I have already wash the dishes.', accepted: ['I have already washed the dishes.'] },
    { id: 'l27c3-16', type: 'fix', grammarPoint: 'l27c3_if_past', wrong: 'We would arrive early if we leave now.', accepted: ['We would arrive early if we left now.', 'If we left now, we would arrive early.'] },
  ],
};
