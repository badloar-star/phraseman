// chapter_exam_v2_l03_c6.ts — банк экзамена v2: урок 3, глава 6 (эпизоды 41–48).
// зачем (слово владельца 26.10 «банки для всех уроков и глав — в 2.0.3»): глава 6 урока 3 — a / an, когда предмет назван впервые,
// the — когда он понятен обоим, и множественное без артикля, когда говорим «вообще» (41–48). Ситуация подсказывает, новый предмет
// или знакомый обоим. Сторож слов — owner_locks_exam_episode_words.
import type { ChapterExamV2Bank } from '../chapter_exam_v2';

export const CHAPTER_EXAM_V2_BANK_L03_C6: ChapterExamV2Bank = {
  lessonOrdinal: 3,
  chapterOrdinal: 6,
  grammarPoints: [
    { id: 'l03c6_a_first', label: { ru: 'впервые — a / an', uk: 'уперше — a / an' }, episodeOrdinals: [41, 44, 47] },
    { id: 'l03c6_the_known', label: { ru: 'понятно обоим — the', uk: 'зрозуміло обом — the' }, episodeOrdinals: [42, 46, 48] },
    { id: 'l03c6_plural_general', label: { ru: '«вообще» — без артикля', uk: '«взагалі» — без артикля' }, episodeOrdinals: [43, 47] },
  ],
  items: [
    // ── Ситуация → сам говоришь или пишешь ───────────────────────────────────────────────────────────────────────
    { id: 'l03c6-01', type: 'situation', grammarPoint: 'l03c6_the_known', situation: { ru: 'Вы с мужем вернулись домой, а входная дверь распахнута. Скажи, что дверь открыта.', uk: 'Ви з чоловіком повернулися додому, а вхідні двері відчинені навстіж. Скажи, що двері відчинені.' }, accepted: ['The door is open.'] },
    { id: 'l03c6-02', type: 'situation', grammarPoint: 'l03c6_a_first', situation: { ru: 'Ты продавец. В пустую лавку вдруг зашёл покупатель. Крикни в подсобку, что пришёл покупатель.', uk: 'Ти продавець. У порожню крамницю раптом зайшов покупець. Гукни в підсобку, що прийшов покупець.' }, accepted: ['A customer is here.'] },
    { id: 'l03c6-03', type: 'situation', grammarPoint: 'l03c6_plural_general', situation: { ru: 'Ты переносишь библиотеку при переезде. Пожалуйся, что книги — вещь тяжёлая.', uk: 'Ти переносиш бібліотеку під час переїзду. Поскаржся, що книжки — річ важка.' }, accepted: ['Books are heavy.'] },
    { id: 'l03c6-04', type: 'situation', grammarPoint: 'l03c6_the_known', situation: { ru: 'Гости вздрагивают от вашего дверного звонка. Скажи, что звонок громкий.', uk: 'Гості здригаються від вашого дверного дзвінка. Скажи, що дзвінок гучний.' }, accepted: ['The bell is loud.'] },
    { id: 'l03c6-05', type: 'situation', grammarPoint: 'l03c6_a_first', situation: { ru: 'В углу прихожей ты заметил чужой зонт. Скажи жене, что тут зонт.', uk: 'У кутку передпокою ти помітив чужу парасольку. Скажи дружині, що тут парасолька.' }, accepted: ['An umbrella is here.'] },
    { id: 'l03c6-06', type: 'situation', grammarPoint: 'l03c6_the_known', situation: { ru: 'Вы с соседом пятую минуту ждёте лифт в вашем доме. Скажи, что лифт медленный.', uk: 'Ви із сусідом п’яту хвилину чекаєте ліфт у вашому будинку. Скажи, що ліфт повільний.' }, accepted: ['The lift is slow.'] },
    // ── Ответ в мини-диалоге ──────────────────────────────────────────────────────────────────────────────────────
    { id: 'l03c6-07', type: 'dialogue', grammarPoint: 'l03c6_plural_general', partnerLine: 'The dictionary is expensive.', situation: { ru: 'Сын удивлён ценой нового словаря. Скажи, что словари вообще дорогие.', uk: 'Син здивований ціною нового словника. Скажи, що словники взагалі дорогі.' }, accepted: ['Dictionaries are expensive.'] },
    { id: 'l03c6-08', type: 'dialogue', grammarPoint: 'l03c6_the_known', partnerLine: 'Where is the drill?', situation: { ru: 'Дрель лежит прямо перед вами на столе. Скажи, что дрель здесь.', uk: 'Дриль лежить просто перед вами на столі. Скажи, що дриль тут.' }, accepted: ['The drill is here.'] },
    { id: 'l03c6-09', type: 'dialogue', grammarPoint: 'l03c6_a_first', partnerLine: 'The seller is busy.', situation: { ru: 'К вам как раз подходит другой работник магазина. Скажи, что тут есть помощник.', uk: 'До вас якраз підходить інший працівник магазину. Скажи, що тут є помічник.' }, accepted: ['An assistant is here.'] },
    { id: 'l03c6-10', type: 'dialogue', grammarPoint: 'l03c6_the_known', partnerLine: 'Is the queue short?', situation: { ru: 'Перед вами человек двадцать. Скажи, что очередь длинная.', uk: 'Перед вами людей двадцять. Скажи, що черга довга.' }, accepted: ['The queue is long.'] },
    { id: 'l03c6-11', type: 'dialogue', grammarPoint: 'l03c6_plural_general', partnerLine: 'Is the wrench cheap?', situation: { ru: 'Скажи, что гаечные ключи вообще дорогие.', uk: 'Скажи, що гайкові ключі взагалі дорогі.' }, accepted: ['Wrenches are expensive.'] },
    { id: 'l03c6-12', type: 'dialogue', grammarPoint: 'l03c6_a_first', partnerLine: 'The bag is here.', situation: { ru: 'Рядом с сумкой ты замечаешь ещё и коробку. Скажи, что тут коробка.', uk: 'Біля сумки ти помічаєш ще й коробку. Скажи, що тут коробка.' }, accepted: ['A box is here.'] },
    // ── Найди и исправь ошибку ────────────────────────────────────────────────────────────────────────────────────
    { id: 'l03c6-13', type: 'fix', grammarPoint: 'l03c6_a_first', wrong: 'An cashier is here.', accepted: ['A cashier is here.'] },
    { id: 'l03c6-14', type: 'fix', grammarPoint: 'l03c6_a_first', wrong: 'A item is missing.', accepted: ['An item is missing.'] },
    { id: 'l03c6-15', type: 'fix', grammarPoint: 'l03c6_plural_general', wrong: 'Books is heavy.', accepted: ['Books are heavy.'] },
    { id: 'l03c6-16', type: 'fix', grammarPoint: 'l03c6_the_known', wrong: 'The stairs is narrow.', accepted: ['The stairs are narrow.'] },
  ],
};
