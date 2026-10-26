// chapter_exam_v2_l27_c2.ts — банк экзамена v2: урок 27, глава 2 (эпизоды 9–16).
// зачем (слово владельца 26.10 «банки для всех уроков и глав — в 2.0.3»): глава 2 урока 27 вводит were в условии — If she were here,
// she would help; I would keep the receipt if I were you (9–16) — и продолжает would и «уже сделал». Обе части условия засчитываются
// в любом порядке. Сторож слов — owner_locks_exam_episode_words.
import type { ChapterExamV2Bank } from '../chapter_exam_v2';

export const CHAPTER_EXAM_V2_BANK_L27_C2: ChapterExamV2Bank = {
  lessonOrdinal: 27,
  chapterOrdinal: 2,
  grammarPoints: [
    { id: 'l27c2_if_were', label: { ru: 'если бы был / на твоём месте — if … were', uk: 'якби був / на твоєму місці — if … were' }, episodeOrdinals: [9, 10, 13] },
    { id: 'l27c2_would', label: { ru: 'я бы … — would + глагол', uk: 'я б … — would + дієслово' }, episodeOrdinals: [9, 13, 15] },
    { id: 'l27c2_have_done', label: { ru: 'уже сделал — have + done', uk: 'уже зробив — have + done' }, episodeOrdinals: [10, 11, 16] },
  ],
  items: [
    // ── Ситуация → сам говоришь или пишешь ───────────────────────────────────────────────────────────────────────
    { id: 'l27c2-01', type: 'situation', grammarPoint: 'l27c2_if_were', situation: { ru: 'Подруга собирается выбросить чек от новой куртки. Посоветуй: на её месте ты бы сохранил чек.', uk: 'Подруга збирається викинути чек від нової куртки. Порадь: на її місці ти б зберіг чек.' }, accepted: ['I would keep the receipt if I were you.', 'If I were you, I would keep the receipt.'] },
    { id: 'l27c2-02', type: 'situation', grammarPoint: 'l27c2_if_were', situation: { ru: 'Вы не справляетесь с тестом для пирога. Скажи, что если бы мама была здесь, она бы помогла.', uk: 'Ви не дають ради тісту для пирога. Скажи, що якби мама була тут, вона б допомогла.' }, accepted: ['If she were here, she would help.', 'She would help if she were here.', 'She would help us if she were here.', 'If she were here, she would help us.'] },
    { id: 'l27c2-03', type: 'situation', grammarPoint: 'l27c2_have_done', situation: { ru: 'Друг предлагает купить билеты на концерт. Скажи, что ты уже купил два билета.', uk: 'Друг пропонує купити квитки на концерт. Скажи, що ти вже купив два квитки.' }, accepted: ['I have already bought two tickets.', 'I have bought two tickets.'] },
    { id: 'l27c2-04', type: 'situation', grammarPoint: 'l27c2_would', situation: { ru: 'Друзья зовут на боулинг, а у тебя все вечера заняты. Скажи, что присоединился бы, если бы у тебя был свободный вечер.', uk: 'Друзі кличуть на боулінг, а в тебе всі вечори зайняті. Скажи, що приєднався б, якби в тебе був вільний вечір.' }, accepted: ['I would join you if I had a free evening.', 'If I had a free evening, I would join you.'] },
    { id: 'l27c2-05', type: 'situation', grammarPoint: 'l27c2_if_were', situation: { ru: 'На концерте играют любимую песню сестры. Скажи, что она бы подпевала, если бы была здесь.', uk: 'На концерті грають улюблену пісню сестри. Скажи, що вона б підспівувала, якби була тут.' }, accepted: ['She would sing along if she were here.', 'If she were here, she would sing along.'] },
    { id: 'l27c2-06', type: 'situation', grammarPoint: 'l27c2_have_done', situation: { ru: 'Начальник просит предупредить коллегу о встрече. Скажи, что ты уже отправил ей сообщение.', uk: 'Начальник просить попередити колегу про зустріч. Скажи, що ти вже надіслав їй повідомлення.' }, accepted: ['I have already sent her a message.'] },
    // ── Ответ в мини-диалоге ──────────────────────────────────────────────────────────────────────────────────────
    { id: 'l27c2-07', type: 'dialogue', grammarPoint: 'l27c2_would', partnerLine: 'Shall we play billiards?', situation: { ru: 'Бильярд ты не любишь. Скажи, что предпочёл бы дартс.', uk: 'Більярд ти не любиш. Скажи, що волів би дартс.' }, accepted: ['I would prefer darts.', 'I prefer darts.'] },
    { id: 'l27c2-08', type: 'dialogue', grammarPoint: 'l27c2_if_were', partnerLine: 'I am hesitant about buying it.', situation: { ru: 'Кресло удобное и со скидкой. Посоветуй: на её месте ты бы его купил.', uk: 'Крісло зручне й зі знижкою. Порадь: на її місці ти б його купив.' }, accepted: ['I would buy it if I were you.', 'If I were you, I would buy it.'] },
    { id: 'l27c2-09', type: 'dialogue', grammarPoint: 'l27c2_have_done', partnerLine: 'Have you seen the first film?', situation: { ru: 'Да, ты смотрел первую часть. Скажи, что ты уже видел первый фильм.', uk: 'Так, ти дивився першу частину. Скажи, що ти вже бачив перший фільм.' }, accepted: ['I have already seen the first film.', 'I have seen the first film.'] },
    { id: 'l27c2-10', type: 'dialogue', grammarPoint: 'l27c2_would', partnerLine: 'This chair is comfy.', situation: { ru: 'Тебе больше нравится соседнее кресло. Скажи, что ты бы выбрал другое.', uk: 'Тобі більше подобається сусіднє крісло. Скажи, що ти б обрав інше.' }, accepted: ['I would choose the other one.'] },
    { id: 'l27c2-11', type: 'dialogue', grammarPoint: 'l27c2_if_were', partnerLine: 'I have nausea.', situation: { ru: 'Подругу тошнит третий день. Посоветуй: на её месте ты бы записался к врачу.', uk: 'Подругу нудить третій день. Порадь: на її місці ти б записався до лікаря.' }, accepted: ['I would make an appointment if I were you.', 'If I were you, I would make an appointment.'] },
    { id: 'l27c2-12', type: 'dialogue', grammarPoint: 'l27c2_have_done', partnerLine: 'Could you pass me the large bowl?', situation: { ru: 'Подруга просит миску для муки. Скажи, что муку ты уже отмерил.', uk: 'Подруга просить миску для борошна. Скажи, що борошно ти вже відміряв.' }, accepted: ['I have already measured the flour.'] },
    // ── Найди и исправь ошибку ────────────────────────────────────────────────────────────────────────────────────
    { id: 'l27c2-13', type: 'fix', grammarPoint: 'l27c2_if_were', wrong: 'If I was you, I would keep the receipt.', accepted: ['If I were you, I would keep the receipt.', 'I would keep the receipt if I were you.'] },
    { id: 'l27c2-14', type: 'fix', grammarPoint: 'l27c2_would', wrong: 'She will help if she were here.', accepted: ['She would help if she were here.', 'If she were here, she would help.'] },
    { id: 'l27c2-15', type: 'fix', grammarPoint: 'l27c2_have_done', wrong: 'I have already book the seats.', accepted: ['I have already booked the seats.'] },
    { id: 'l27c2-16', type: 'fix', grammarPoint: 'l27c2_if_were', wrong: 'If she is here, she would help.', accepted: ['If she were here, she would help.', 'She would help if she were here.'] },
  ],
};
