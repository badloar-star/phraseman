// chapter_exam_v2_l03_c1.ts — банк экзамена v2: урок 3, глава 1 (эпизоды 1–8).
// зачем (слово владельца 26.10 «банки для всех уроков и глав — в 2.0.3»): глава 1 урока 3 учит называть один предмет со словом a —
// It is a … / Is it a …? / It is not a … (1–8), мебель, дверь и замок, вещи в магазине и инструменты. Слов you / yes / no в эпизодах
// урока 3 до экзамена нет — их нет и здесь. Сторож слов — owner_locks_exam_episode_words.
import type { ChapterExamV2Bank } from '../chapter_exam_v2';

export const CHAPTER_EXAM_V2_BANK_L03_C1: ChapterExamV2Bank = {
  lessonOrdinal: 3,
  chapterOrdinal: 1,
  grammarPoints: [
    { id: 'l03c1_it_is_a', label: { ru: 'это … — It is a …', uk: 'це … — It is a …' }, episodeOrdinals: [1, 2, 3] },
    { id: 'l03c1_is_it_a', label: { ru: 'это …? — Is it a …?', uk: 'це …? — Is it a …?' }, episodeOrdinals: [1, 2, 4] },
    { id: 'l03c1_not_a', label: { ru: 'это не … — It is not a …', uk: 'це не … — It is not a …' }, episodeOrdinals: [1, 3, 5] },
  ],
  items: [
    // ── Ситуация → сам говоришь или пишешь ───────────────────────────────────────────────────────────────────────
    { id: 'l03c1-01', type: 'situation', grammarPoint: 'l03c1_it_is_a', situation: { ru: 'Гость ищет, куда присесть. Покажи на табурет и скажи, что это табурет.', uk: 'Гість шукає, де присісти. Покажи на табурет і скажи, що це табурет.' }, accepted: ['It is a stool.', "It's a stool."] },
    { id: 'l03c1-02', type: 'situation', grammarPoint: 'l03c1_is_it_a', situation: { ru: 'В тёмной прихожей ты нащупал на стене что-то гладкое и холодное. Спроси, зеркало ли это.', uk: 'У темному передпокої ти намацав на стіні щось гладке й холодне. Запитай, чи це дзеркало.' }, accepted: ['Is it a mirror?'] },
    { id: 'l03c1-03', type: 'situation', grammarPoint: 'l03c1_not_a', situation: { ru: 'Малыш называет коврик подушкой. Поправь: это не подушка.', uk: 'Малюк називає килимок подушкою. Виправ: це не подушка.' }, accepted: ['It is not a pillow.', "It's not a pillow.", 'It is a rug.', "It's a rug."] },
    { id: 'l03c1-04', type: 'situation', grammarPoint: 'l03c1_it_is_a', situation: { ru: 'Мастер не понимает, что ты держишь в руке. Скажи, что это ключ.', uk: 'Майстер не розуміє, що ти тримаєш у руці. Скажи, що це ключ.' }, accepted: ['It is a key.', "It's a key."] },
    { id: 'l03c1-05', type: 'situation', grammarPoint: 'l03c1_is_it_a', situation: { ru: 'На куртке в магазине болтается картонка с цифрами. Спроси, ценник ли это.', uk: 'На куртці в магазині теліпається картонка з цифрами. Запитай, чи це цінник.' }, accepted: ['Is it a tag?'] },
    { id: 'l03c1-06', type: 'situation', grammarPoint: 'l03c1_not_a', situation: { ru: 'Ребёнок уверен, что на стене потайная дверь. Скажи, что это не дверь.', uk: 'Дитина впевнена, що на стіні потаємні двері. Скажи, що це не двері.' }, accepted: ['It is not a door.', "It's not a door.", 'It is a crack.', "It's a crack."] },
    // ── Ответ в мини-диалоге ──────────────────────────────────────────────────────────────────────────────────────
    { id: 'l03c1-07', type: 'dialogue', grammarPoint: 'l03c1_not_a', partnerLine: 'It is a table.', situation: { ru: 'Возрази: это не стол — это письменный стол с ящиками.', uk: 'Заперечи: це не стіл — це письмовий стіл із шухлядами.' }, accepted: ['It is not a table.', "It's not a table.", 'It is a desk.', "It's a desk."] },
    { id: 'l03c1-08', type: 'dialogue', grammarPoint: 'l03c1_is_it_a', partnerLine: 'It is not a chair.', situation: { ru: 'Продавец показывает на сиденье без спинки. Спроси, табурет ли это.', uk: 'Продавець показує на сидіння без спинки. Запитай, чи це табурет.' }, accepted: ['Is it a stool?'] },
    { id: 'l03c1-09', type: 'dialogue', grammarPoint: 'l03c1_it_is_a', partnerLine: 'Is it a bag?', situation: { ru: 'В руках у тебя плетёная корзина. Скажи, что это корзина.', uk: 'У руках у тебе плетений кошик. Скажи, що це кошик.' }, accepted: ['It is a basket.', "It's a basket."] },
    { id: 'l03c1-10', type: 'dialogue', grammarPoint: 'l03c1_not_a', partnerLine: 'It is a wall.', situation: { ru: 'Возрази: пятно не на стене, а наверху — это потолок.', uk: 'Заперечи: пляма не на стіні, а вгорі — це стеля.' }, accepted: ['It is not a wall.', "It's not a wall.", 'It is a ceiling.', "It's a ceiling."] },
    { id: 'l03c1-11', type: 'dialogue', grammarPoint: 'l03c1_is_it_a', partnerLine: 'It is not a cupboard.', situation: { ru: 'Друг показывает на высокий шкаф с вешалками. Спроси, шкаф для одежды ли это.', uk: 'Друг показує на високу шафу з вішаками. Запитай, чи це шафа для одягу.' }, accepted: ['Is it a wardrobe?'] },
    { id: 'l03c1-12', type: 'dialogue', grammarPoint: 'l03c1_it_is_a', partnerLine: 'Is it a ladder?', situation: { ru: 'Ты несёшь из сарая ведро. Скажи, что это ведро.', uk: 'Ти несеш із сарая відро. Скажи, що це відро.' }, accepted: ['It is a bucket.', "It's a bucket."] },
    // ── Найди и исправь ошибку ────────────────────────────────────────────────────────────────────────────────────
    { id: 'l03c1-13', type: 'fix', grammarPoint: 'l03c1_it_is_a', wrong: 'It is chair.', accepted: ['It is a chair.', "It's a chair."] },
    { id: 'l03c1-14', type: 'fix', grammarPoint: 'l03c1_is_it_a', wrong: 'It is a lamp?', accepted: ['Is it a lamp?'] },
    { id: 'l03c1-15', type: 'fix', grammarPoint: 'l03c1_not_a', wrong: 'It not is a box.', accepted: ['It is not a box.', "It's not a box."] },
    { id: 'l03c1-16', type: 'fix', grammarPoint: 'l03c1_it_is_a', wrong: 'It a is hammer.', accepted: ['It is a hammer.', "It's a hammer."] },
  ],
};
