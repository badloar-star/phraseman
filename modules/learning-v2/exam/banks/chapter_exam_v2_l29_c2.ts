// chapter_exam_v2_l29_c2.ts — банк экзамена v2: урок 29, глава 2 (эпизоды 9–16).
// зачем (слово владельца 26.10 «банки для всех уроков и глав — в 2.0.3»): глава 2 урока 29 вводит whose — «чей» (The man whose bag is
// missing is here, Whose bowl is this?) — и продолжает that о вещах и «я …, если …» (9–16). Сторож слов — owner_locks_exam_episode_words.
import type { ChapterExamV2Bank } from '../chapter_exam_v2';

export const CHAPTER_EXAM_V2_BANK_L29_C2: ChapterExamV2Bank = {
  lessonOrdinal: 29,
  chapterOrdinal: 2,
  grammarPoints: [
    { id: 'l29c2_whose', label: { ru: 'чей — whose', uk: 'чий — whose' }, episodeOrdinals: [9, 12, 15] },
    { id: 'l29c2_that', label: { ru: 'вещь, которая … — that', uk: 'річ, яка … — that' }, episodeOrdinals: [11, 14] },
    { id: 'l29c2_will_if', label: { ru: 'я …, если … — I will … if …', uk: 'я …, якщо … — I will … if …' }, episodeOrdinals: [10, 11, 12] },
  ],
  items: [
    // ── Ситуация → сам говоришь или пишешь ───────────────────────────────────────────────────────────────────────
    { id: 'l29c2-01', type: 'situation', grammarPoint: 'l29c2_whose', situation: { ru: 'Ты администратор отеля. У гостя пропала сумка, и он ждёт в холле. Скажи коллеге, что мужчина, чья сумка пропала, ждёт внутри.', uk: 'Ти адміністратор готелю. У гостя зникла сумка, і він чекає в холі. Скажи колезі, що чоловік, чия сумка зникла, чекає всередині.' }, accepted: ['The man whose bag is missing is waiting inside.'] },
    { id: 'l29c2-02', type: 'situation', grammarPoint: 'l29c2_whose', situation: { ru: 'После обеда на столе осталась чья-то миска. Спроси, чья она.', uk: 'Після обіду на столі залишилася чиясь миска. Запитай, чия вона.' }, accepted: ['Whose bowl is this?'] },
    { id: 'l29c2-03', type: 'situation', grammarPoint: 'l29c2_will_if', situation: { ru: 'Сок на завтрак почти кончился. Скажи, что купишь ещё, если понадобится.', uk: 'Сік на сніданок майже закінчився. Скажи, що купиш ще, якщо знадобиться.' }, accepted: ['I will buy more juice if we need it.', 'If we need it, I will buy more juice.'] },
    { id: 'l29c2-04', type: 'situation', grammarPoint: 'l29c2_whose', situation: { ru: 'Ищут хозяйку пальто со стула. Скажи, что женщина, чьё пальто на стуле, вышла на улицу.', uk: 'Шукають власницю пальта зі стільця. Скажи, що жінка, чиє пальто на стільці, вийшла надвір.' }, accepted: ['The woman whose coat is on the chair is outside.'] },
    { id: 'l29c2-05', type: 'situation', grammarPoint: 'l29c2_that', situation: { ru: 'Ты выбираешь шарф в магазине. Скажи, что тебе нравится шарф, который подходит к пальто.', uk: 'Ти обираєш шарф у магазині. Скажи, що тобі подобається шарф, який пасує до пальта.' }, accepted: ['I like the scarf that matches my coat.', 'I like the scarf which matches my coat.'] },
    { id: 'l29c2-06', type: 'situation', grammarPoint: 'l29c2_will_if', situation: { ru: 'Ты меряешь парку. Скажи продавцу, что купишь её, если она подойдёт.', uk: 'Ти міряєш парку. Скажи продавцеві, що купиш її, якщо вона підійде.' }, accepted: ['I will buy it if it fits.', 'If it fits, I will buy it.'] },
    // ── Ответ в мини-диалоге ──────────────────────────────────────────────────────────────────────────────────────
    { id: 'l29c2-07', type: 'dialogue', grammarPoint: 'l29c2_whose', partnerLine: 'I need flowers for my aunt.', situation: { ru: 'Покажи флористу на тётю у двери: это женщина, у которой сегодня день рождения.', uk: 'Покажи флористові на тітку біля дверей: це жінка, у якої сьогодні день народження.' }, accepted: ['That is the woman whose birthday is today.'] },
    { id: 'l29c2-08', type: 'dialogue', grammarPoint: 'l29c2_that', partnerLine: 'What would you like to play?', situation: { ru: 'Ты новичок в настольных играх. Скажи, что хочешь игру, которую легко освоить.', uk: 'Ти новачок у настільних іграх. Скажи, що хочеш гру, яку легко опанувати.' }, accepted: ['I want a game that is easy to learn.', 'I want a game which is easy to learn.'] },
    { id: 'l29c2-09', type: 'dialogue', grammarPoint: 'l29c2_will_if', partnerLine: 'I prefer small groups.', situation: { ru: 'Друг-интроверт стесняется на вечеринке. Скажи, что вы уйдёте, если он устанет.', uk: 'Друг-інтроверт ніяковіє на вечірці. Скажи, що ви підете, якщо він утомиться.' }, accepted: ['We will leave if you get tired.', 'If you get tired, we will leave.'] },
    { id: 'l29c2-10', type: 'dialogue', grammarPoint: 'l29c2_whose', partnerLine: 'Your dog is very affectionate.', situation: { ru: 'Это не твоя собака. Скажи, кто её хозяин: мужчина, чья собака у двери, — твой друг.', uk: 'Це не твій собака. Скажи, хто його господар: чоловік, чий собака біля дверей, — твій друг.' }, accepted: ['The man whose dog is by the door is my friend.'] },
    { id: 'l29c2-11', type: 'dialogue', grammarPoint: 'l29c2_that', partnerLine: 'Could you bring a larger size?', situation: { ru: 'Скажи продавцу, что тебе нравится шапка, у которой красный помпон.', uk: 'Скажи продавцеві, що тобі подобається шапка, у якої червоний помпон.' }, accepted: ['I like the hat that has a red bobble.', 'I like the hat which has a red bobble.'] },
    { id: 'l29c2-12', type: 'dialogue', grammarPoint: 'l29c2_will_if', partnerLine: 'Thank you for bringing lunch.', situation: { ru: 'Хлеба на всех может не хватить. Скажи, что принесёшь ещё, если понадобится.', uk: 'Хліба на всіх може не вистачити. Скажи, що принесеш ще, якщо знадобиться.' }, accepted: ['If we need more bread, I will bring some.', 'I will bring some if we need more bread.'] },
    // ── Найди и исправь ошибку ────────────────────────────────────────────────────────────────────────────────────
    { id: 'l29c2-13', type: 'fix', grammarPoint: 'l29c2_whose', wrong: 'The man who bag is missing is here.', accepted: ['The man whose bag is missing is here.'] },
    { id: 'l29c2-14', type: 'fix', grammarPoint: 'l29c2_that', wrong: 'I want a game who is easy to learn.', accepted: ['I want a game that is easy to learn.', 'I want a game which is easy to learn.'] },
    { id: 'l29c2-15', type: 'fix', grammarPoint: 'l29c2_will_if', wrong: 'I will buy it if it will fit.', accepted: ['I will buy it if it fits.', 'If it fits, I will buy it.'] },
    { id: 'l29c2-16', type: 'fix', grammarPoint: 'l29c2_whose', wrong: 'The woman whose coat are on the chair is outside.', accepted: ['The woman whose coat is on the chair is outside.'] },
  ],
};
