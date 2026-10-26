// chapter_exam_v2_l27_c4.ts — банк экзамена v2: урок 27, глава 4 (эпизоды 25–32).
// зачем (слово владельца 26.10 «банки для всех уроков и глав — в 2.0.3»): глава 4 урока 27 вводит wish — «жаль, что / хотел бы»:
// I wish I had more stamina, I wish this room were quieter (25–32) — и повторяет условие «бы». Сторож слов — owner_locks_exam_episode_words.
import type { ChapterExamV2Bank } from '../chapter_exam_v2';

export const CHAPTER_EXAM_V2_BANK_L27_C4: ChapterExamV2Bank = {
  lessonOrdinal: 27,
  chapterOrdinal: 4,
  grammarPoints: [
    { id: 'l27c4_wish_had', label: { ru: 'хотел бы иметь / знать — I wish I had / knew', uk: 'хотів би мати / знати — I wish I had / knew' }, episodeOrdinals: [25, 29, 31] },
    { id: 'l27c4_wish_were', label: { ru: 'жаль, что не … — I wish … were', uk: 'шкода, що не … — I wish … were' }, episodeOrdinals: [26, 27, 28] },
    { id: 'l27c4_would_if', label: { ru: 'я бы … если бы … — would + if', uk: 'я б … якби … — would + if' }, episodeOrdinals: [26, 27, 28] },
  ],
  items: [
    // ── Ситуация → сам говоришь или пишешь ───────────────────────────────────────────────────────────────────────
    { id: 'l27c4-01', type: 'situation', grammarPoint: 'l27c4_wish_had', situation: { ru: 'На третьем километре ты уже задыхаешься. Скажи, что хотел бы иметь больше выносливости.', uk: 'На третьому кілометрі ти вже задихаєшся. Скажи, що хотів би мати більше витривалості.' }, accepted: ['I wish I had more stamina.'] },
    { id: 'l27c4-02', type: 'situation', grammarPoint: 'l27c4_wish_were', situation: { ru: 'За стеной гостиничного номера всю ночь шумят. Скажи, что хотел бы, чтобы комната была тише.', uk: 'За стіною готельного номера всю ніч шумлять. Скажи, що хотів би, щоб кімната була тихіша.' }, accepted: ['I wish this room were quieter.', 'I wish the room were quieter.'] },
    { id: 'l27c4-03', type: 'situation', grammarPoint: 'l27c4_would_if', situation: { ru: 'Гости ужинают в гостиной — на кухне тесно. Скажи, что вы бы ели на кухне, если бы было больше места.', uk: 'Гості вечеряють у вітальні — на кухні тісно. Скажи, що ви б їли на кухні, якби було більше місця.' }, accepted: ['We would eat here if we had more space.', 'If we had more space, we would eat here.'] },
    { id: 'l27c4-04', type: 'situation', grammarPoint: 'l27c4_wish_had', situation: { ru: 'Ты опять съел торт посреди диеты. Признайся, что хотел бы иметь больше силы воли.', uk: 'Ти знову з’їв торт посеред дієти. Зізнайся, що хотів би мати більше сили волі.' }, accepted: ['I wish I had more willpower.'] },
    { id: 'l27c4-05', type: 'situation', grammarPoint: 'l27c4_wish_were', situation: { ru: 'Ты на море, а подруга дома. Напиши ей, как жаль, что её здесь нет.', uk: 'Ти на морі, а подруга вдома. Напиши їй, як шкода, що її тут немає.' }, accepted: ['I wish you were here.'] },
    { id: 'l27c4-06', type: 'situation', grammarPoint: 'l27c4_would_if', situation: { ru: 'Друзья обижаются, что вы редко заходите. Скажи, что вы бы навещали их, если бы у вас был свободный вечер.', uk: 'Друзі ображаються, що ви рідко заходите. Скажи, що ви б навідували їх, якби у вас був вільний вечір.' }, accepted: ['We would visit you if we had a free evening.', 'If we had a free evening, we would visit you.'] },
    // ── Ответ в мини-диалоге ──────────────────────────────────────────────────────────────────────────────────────
    { id: 'l27c4-07', type: 'dialogue', grammarPoint: 'l27c4_wish_had', partnerLine: 'Which one would you choose?', situation: { ru: 'Вы выбираете подарок сестре. Скажи: жаль, что ты не знаешь её размер.', uk: 'Ви обираєте подарунок сестрі. Скажи: шкода, що ти не знаєш її розміру.' }, accepted: ['I wish I knew her size.'] },
    { id: 'l27c4-08', type: 'dialogue', grammarPoint: 'l27c4_wish_were', partnerLine: 'Where do these plates go?', situation: { ru: 'Тарелки ставить уже некуда. Пожалуйся, что хотел бы кухню побольше.', uk: 'Тарілки ставити вже нікуди. Поскаржся, що хотів би більшу кухню.' }, accepted: ['I wish the kitchen were bigger.'] },
    { id: 'l27c4-09', type: 'dialogue', grammarPoint: 'l27c4_would_if', partnerLine: 'Shall we come back on Sunday?', situation: { ru: 'Вам нравится это место, но ехать далеко. Скажи, что вы бы приезжали чаще, если бы жили рядом.', uk: 'Вам подобається це місце, але їхати далеко. Скажи, що ви б приїздили частіше, якби жили поруч.' }, accepted: ['We would come more often if we lived nearby.', 'If we lived nearby, we would come more often.'] },
    { id: 'l27c4-10', type: 'dialogue', grammarPoint: 'l27c4_wish_had', partnerLine: 'Can we meet after dinner?', situation: { ru: 'Друг живёт в другом районе. Скажи: жаль, что он живёт не рядом.', uk: 'Друг живе в іншому районі. Скажи: шкода, що він живе не поруч.' }, accepted: ['I wish you lived nearby.'] },
    { id: 'l27c4-11', type: 'dialogue', grammarPoint: 'l27c4_wish_were', partnerLine: 'Is this the one she wanted?', situation: { ru: 'Ты не уверен, понравится ли подруге. Скажи: жаль, что её нет здесь.', uk: 'Ти не впевнений, чи сподобається подрузі. Скажи: шкода, що її тут немає.' }, accepted: ['I wish she were here.', 'I wish she were here to choose.'] },
    { id: 'l27c4-12', type: 'dialogue', grammarPoint: 'l27c4_would_if', partnerLine: 'How long is the wait?', situation: { ru: 'Очередь на два часа. Скажи, что вы бы её избежали, если бы пришли раньше.', uk: 'Черга на дві години. Скажи, що ви б її уникнули, якби прийшли раніше.' }, accepted: ['We would avoid the queue if we came earlier.', 'If we came earlier, we would avoid the queue.'] },
    // ── Найди и исправь ошибку ────────────────────────────────────────────────────────────────────────────────────
    { id: 'l27c4-13', type: 'fix', grammarPoint: 'l27c4_wish_had', wrong: 'I wish I have more stamina.', accepted: ['I wish I had more stamina.'] },
    { id: 'l27c4-14', type: 'fix', grammarPoint: 'l27c4_wish_were', wrong: 'I wish this room is quieter.', accepted: ['I wish this room were quieter.'] },
    { id: 'l27c4-15', type: 'fix', grammarPoint: 'l27c4_would_if', wrong: 'We would eat here if we have more space.', accepted: ['We would eat here if we had more space.', 'If we had more space, we would eat here.'] },
    { id: 'l27c4-16', type: 'fix', grammarPoint: 'l27c4_wish_were', wrong: 'I wish she is here.', accepted: ['I wish she were here.'] },
  ],
};
