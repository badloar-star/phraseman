// chapter_exam_v2_l02_c6.ts — банк экзамена v2: урок 2, глава 6 (эпизоды 41–48).
// зачем (слово владельца 26.10 «банки для всех уроков и глав — в 2.0.3»): глава 6 урока 2 — характер, самочувствие, настроение,
// дорога, инструменты, еда и природа (41–48) теми же средствами урока: сказать, сказать с not, спросить «да / нет» и who / what.
// Сторож слов — owner_locks_exam_episode_words.
import type { ChapterExamV2Bank } from '../chapter_exam_v2';

export const CHAPTER_EXAM_V2_BANK_L02_C6: ChapterExamV2Bank = {
  lessonOrdinal: 2,
  chapterOrdinal: 6,
  grammarPoints: [
    { id: 'l02c6_statement', label: { ru: 'сказать и сказать с not', uk: 'сказати й сказати з not' }, episodeOrdinals: [41, 44, 45] },
    { id: 'l02c6_yes_no_question', label: { ru: 'вопрос: Is it / Are you …?', uk: 'питання: Is it / Are you …?' }, episodeOrdinals: [42, 43, 47] },
    { id: 'l02c6_wh_question', label: { ru: 'вопрос: Who / What …?', uk: 'питання: Who / What …?' }, episodeOrdinals: [41, 43, 46] },
  ],
  items: [
    // ── Ситуация → сам говоришь или пишешь ───────────────────────────────────────────────────────────────────────
    { id: 'l02c6-01', type: 'situation', grammarPoint: 'l02c6_statement', situation: { ru: 'Сын полчаса отказывается надеть шапку. Пожалуйся мужу, что он упрямый.', uk: 'Син пів години відмовляється вдягнути шапку. Поскаржся чоловікові, що він упертий.' }, accepted: ['He is stubborn.', "He's stubborn."] },
    { id: 'l02c6-02', type: 'situation', grammarPoint: 'l02c6_yes_no_question', situation: { ru: 'У дочки на руке красное пятно. Спроси, чешется ли оно.', uk: 'У доньки на руці червона пляма. Запитай, чи вона свербить.' }, accepted: ['Is it itchy?'] },
    { id: 'l02c6-03', type: 'situation', grammarPoint: 'l02c6_wh_question', situation: { ru: 'На фото класса все хмурые, кроме одного. Спроси, кто тут весёлый.', uk: 'На фото класу всі похмурі, крім одного. Запитай, хто тут веселий.' }, accepted: ['Who is cheerful?'] },
    { id: 'l02c6-04', type: 'situation', grammarPoint: 'l02c6_statement', situation: { ru: 'Нож мнёт помидор вместо того, чтобы резать. Скажи, что он тупой.', uk: 'Ніж мне помідор замість того, щоб різати. Скажи, що він тупий.' }, accepted: ['It is blunt.', "It's blunt."] },
    { id: 'l02c6-05', type: 'situation', grammarPoint: 'l02c6_yes_no_question', situation: { ru: 'Друг зовёт тебя искупаться в пруду, а ты плохо плаваешь. Спроси, мелко ли там.', uk: 'Друг кличе тебе скупатися у ставку, а ти погано плаваєш. Запитай, чи там мілко.' }, accepted: ['Is it shallow?'] },
    { id: 'l02c6-06', type: 'situation', grammarPoint: 'l02c6_statement', situation: { ru: 'В супе ни соли, ни специй. Скажи, что он пресный.', uk: 'У супі ні солі, ні спецій. Скажи, що він прісний.' }, accepted: ['It is bland.', "It's bland."] },
    // ── Ответ в мини-диалоге ──────────────────────────────────────────────────────────────────────────────────────
    { id: 'l02c6-07', type: 'dialogue', grammarPoint: 'l02c6_wh_question', partnerLine: 'It is tricky.', situation: { ru: 'Учитель предупреждает про домашнее задание. Спроси, что именно сложно.', uk: 'Учитель попереджає про домашнє завдання. Запитай, що саме складно.' }, accepted: ['What is tricky?'] },
    { id: 'l02c6-08', type: 'dialogue', grammarPoint: 'l02c6_yes_no_question', partnerLine: 'I am nervous.', situation: { ru: 'Подруга сидит перед собеседованием. Спроси, напряжена ли она.', uk: 'Подруга сидить перед співбесідою. Запитай, чи вона напружена.' }, accepted: ['Are you tense?', 'Are you anxious?'] },
    { id: 'l02c6-09', type: 'dialogue', grammarPoint: 'l02c6_statement', partnerLine: 'It is sturdy.', situation: { ru: 'Возрази: полка гнётся от одной книги — она хлипкая.', uk: 'Заперечи: полиця гнеться від однієї книжки — вона хлипка.' }, accepted: ['It is flimsy.', "It's flimsy.", 'It is not sturdy.', "It's not sturdy."] },
    { id: 'l02c6-10', type: 'dialogue', grammarPoint: 'l02c6_wh_question', partnerLine: 'They are naughty.', situation: { ru: 'Учительница жалуется на твоих близнецов. Спроси, кто из них балуется.', uk: 'Учителька скаржиться на твоїх близнюків. Запитай, хто з них пустує.' }, accepted: ['Who is naughty?'] },
    { id: 'l02c6-11', type: 'dialogue', grammarPoint: 'l02c6_yes_no_question', partnerLine: 'It is overgrown.', situation: { ru: 'Друг рассказывает про старый парк. Спроси, спокойно ли там.', uk: 'Друг розповідає про старий парк. Запитай, чи там спокійно.' }, accepted: ['Is it peaceful?'] },
    { id: 'l02c6-12', type: 'dialogue', grammarPoint: 'l02c6_statement', partnerLine: 'He is selfish.', situation: { ru: 'Возрази: брат мягкий и заботливый.', uk: 'Заперечи: брат лагідний і турботливий.' }, accepted: ['He is gentle.', "He's gentle.", 'He is not selfish.', "He's not selfish.", 'He is kind.', "He's kind."] },
    // ── Найди и исправь ошибку ────────────────────────────────────────────────────────────────────────────────────
    { id: 'l02c6-13', type: 'fix', grammarPoint: 'l02c6_wh_question', wrong: 'What tricky is?', accepted: ['What is tricky?'] },
    { id: 'l02c6-14', type: 'fix', grammarPoint: 'l02c6_yes_no_question', wrong: 'Is they itchy?', accepted: ['Are they itchy?'] },
    { id: 'l02c6-15', type: 'fix', grammarPoint: 'l02c6_statement', wrong: 'They not are rough.', accepted: ['They are not rough.', "They're not rough."] },
    { id: 'l02c6-16', type: 'fix', grammarPoint: 'l02c6_yes_no_question', wrong: 'Are it bumpy?', accepted: ['Is it bumpy?'] },
  ],
};
