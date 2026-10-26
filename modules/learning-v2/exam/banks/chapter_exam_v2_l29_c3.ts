// chapter_exam_v2_l29_c3.ts — банк экзамена v2: урок 29, глава 3 (эпизоды 17–24).
// зачем (слово владельца 26.10 «банки для всех уроков и глав — в 2.0.3»): глава 3 урока 29 уточняет место через where (This is the café
// where we met) и повторяет who / that и «кем сделано» — was / were + … by (17–24). Сторож слов — owner_locks_exam_episode_words.
import type { ChapterExamV2Bank } from '../chapter_exam_v2';

export const CHAPTER_EXAM_V2_BANK_L29_C3: ChapterExamV2Bank = {
  lessonOrdinal: 29,
  chapterOrdinal: 3,
  grammarPoints: [
    { id: 'l29c3_where', label: { ru: 'место, где … — where', uk: 'місце, де … — where' }, episodeOrdinals: [17, 18, 19] },
    { id: 'l29c3_by', label: { ru: 'кем сделано — was / were + … by', uk: 'ким зроблено — was / were + … by' }, episodeOrdinals: [18, 21, 23] },
    { id: 'l29c3_who_that', label: { ru: 'который — who / that', uk: 'який — who / that' }, episodeOrdinals: [20, 24] },
  ],
  items: [
    // ── Ситуация → сам говоришь или пишешь ───────────────────────────────────────────────────────────────────────
    { id: 'l29c3-01', type: 'situation', grammarPoint: 'l29c3_where', situation: { ru: 'Вы с женой проходите мимо маленького кафе. Скажи, что это кафе, где вы познакомились.', uk: 'Ви з дружиною проходите повз маленьке кафе. Скажи, що це кафе, де ви познайомилися.' }, accepted: ['This is the café where we met.'] },
    { id: 'l29c3-02', type: 'situation', grammarPoint: 'l29c3_where', situation: { ru: 'Друзья голодны после прогулки. Скажи, что знаешь кафе, где можно поесть.', uk: 'Друзі голодні після прогулянки. Скажи, що знаєш кафе, де можна поїсти.' }, accepted: ['I know a café where we can eat.'] },
    { id: 'l29c3-03', type: 'situation', grammarPoint: 'l29c3_by', situation: { ru: 'Гостья хвалит торт на столе. Скажи, что его испекла твоя сестра.', uk: 'Гостя хвалить торт на столі. Скажи, що його спекла твоя сестра.' }, accepted: ['The cake was made by my sister.'] },
    { id: 'l29c3-04', type: 'situation', grammarPoint: 'l29c3_where', situation: { ru: 'Подруга показывает фото гостиницы из отпуска. Спроси, это ли отель, где она останавливалась.', uk: 'Подруга показує фото готелю з відпустки. Запитай, чи це готель, де вона зупинялася.' }, accepted: ['Is this the hotel where you stayed?'] },
    { id: 'l29c3-05', type: 'situation', grammarPoint: 'l29c3_by', situation: { ru: 'Продавец не может разобрать почерк в твоём списке. Скажи, что список писала сестра.', uk: 'Продавець не може розібрати почерк у твоєму списку. Скажи, що список писала сестра.' }, accepted: ['The list was written by my sister.'] },
    { id: 'l29c3-06', type: 'situation', grammarPoint: 'l29c3_who_that', situation: { ru: 'Хозяйка вечера идёт к вам навстречу. Шепни мужу, что женщина, которая вас пригласила, здесь.', uk: 'Господиня вечора йде вам назустріч. Шепни чоловікові, що жінка, яка вас запросила, тут.' }, accepted: ['The woman who invited us is here.'] },
    // ── Ответ в мини-диалоге ──────────────────────────────────────────────────────────────────────────────────────
    { id: 'l29c3-07', type: 'dialogue', grammarPoint: 'l29c3_where', partnerLine: 'Could I have a receipt, please?', situation: { ru: 'Друг жалуется, что в этой лавке берут только наличные. Скажи, что знаешь магазин, где можно платить картой.', uk: 'Друг скаржиться, що в цій крамничці беруть лише готівку. Скажи, що знаєш магазин, де можна платити карткою.' }, accepted: ['I know a shop where you can pay by card.'] },
    { id: 'l29c3-08', type: 'dialogue', grammarPoint: 'l29c3_by', partnerLine: 'Can I taste a leaf?', situation: { ru: 'Конечно. Скажи, что эти травы посадила твоя мама.', uk: 'Звісно. Скажи, що ці трави посадила твоя мама.' }, accepted: ['These herbs were planted by my mother.'] },
    { id: 'l29c3-09', type: 'dialogue', grammarPoint: 'l29c3_who_that', partnerLine: 'Do you have a larger size?', situation: { ru: 'Скажи продавцу, что тебе нравится платье, у которого есть карманы.', uk: 'Скажи продавцеві, що тобі подобається сукня, у якої є кишені.' }, accepted: ['I like the dress that has pockets.', 'I like the dress which has pockets.'] },
    { id: 'l29c3-10', type: 'dialogue', grammarPoint: 'l29c3_where', partnerLine: 'There is an inn in the village.', situation: { ru: 'Ты узнаёшь эту деревню на фото. Скажи, что это деревня, где вы останавливались.', uk: 'Ти впізнаєш це село на фото. Скажи, що це село, де ви зупинялися.' }, accepted: ['This is the village where we stayed.'] },
    { id: 'l29c3-11', type: 'dialogue', grammarPoint: 'l29c3_by', partnerLine: 'The dessert is made with mascarpone.', situation: { ru: 'Похвали кафе: этот десерт приготовил сам владелец.', uk: 'Похвали кафе: цей десерт приготував сам власник.' }, accepted: ['The dessert was made by the owner.'] },
    { id: 'l29c3-12', type: 'dialogue', grammarPoint: 'l29c3_where', partnerLine: 'Shall we go inside?', situation: { ru: 'Внутри шумно. Скажи, что знаешь место, где можно посидеть.', uk: 'Усередині галасливо. Скажи, що знаєш місце, де можна посидіти.' }, accepted: ['I know a place where we can sit.'] },
    // ── Найди и исправь ошибку ────────────────────────────────────────────────────────────────────────────────────
    { id: 'l29c3-13', type: 'fix', grammarPoint: 'l29c3_where', wrong: 'This is the café which we met.', accepted: ['This is the café where we met.'] },
    { id: 'l29c3-14', type: 'fix', grammarPoint: 'l29c3_who_that', wrong: 'I like the dress who has pockets.', accepted: ['I like the dress that has pockets.', 'I like the dress which has pockets.'] },
    { id: 'l29c3-15', type: 'fix', grammarPoint: 'l29c3_by', wrong: 'The soup was made from the chef.', accepted: ['The soup was made by the chef.'] },
    { id: 'l29c3-16', type: 'fix', grammarPoint: 'l29c3_by', wrong: 'These herbs was planted by my mother.', accepted: ['These herbs were planted by my mother.'] },
  ],
};
