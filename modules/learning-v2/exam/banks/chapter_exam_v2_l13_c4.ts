// chapter_exam_v2_l13_c4.ts — банк экзамена v2: урок 13, глава 4 (эпизоды 25–32). НЕ подключён: строку в BANKS
// (app/learning_v2_chapter_exam_v2.ts) добавляет Learning V2 после вычитки владельцем (docs/work/exam-banks/l13.md).
// зачем (владелец 26.10: экзамены глав v2 для всех уроков, войдут в 2.0.3): только слова и формы эпизодов 1–32 урока 13
// (законченное время — yesterday, last week, last night; точно и к счастью — definitely, luckily, unfortunately; didn’t); ситуация и ответ сходятся по смыслу; верных вариантов несколько. Сторож слов —
// tests/owner_locks_exam_episode_words_2026_10_25.test.ts. Эталон (первый в accepted) — полной формой, как в эпизодах.
import type { ChapterExamV2Bank } from '../chapter_exam_v2';

export const CHAPTER_EXAM_V2_BANK_L13_C4: ChapterExamV2Bank = {
  lessonOrdinal: 13,
  chapterOrdinal: 4,
  grammarPoints: [
    { id: 'l13c4_anchor', label: { ru: 'когда — yesterday, last week', uk: 'коли — yesterday, last week' }, episodeOrdinals: [26, 27, 30] },
    { id: 'l13c4_luckily', label: { ru: 'точно, к счастью — definitely, luckily', uk: 'точно, на щастя — definitely, luckily' }, episodeOrdinals: [28] },
    { id: 'l13c4_didnt', label: { ru: 'не сделал — didn’t … beforehand', uk: 'не зробив — didn’t … beforehand' }, episodeOrdinals: [25, 29, 31] },
    { id: 'l13c4_ask', label: { ru: 'спросить — Did you …?', uk: 'запитати — Did you …?' }, episodeOrdinals: [25, 26, 28] },
  ],
  items: [
    // ── Ситуация → сам говоришь или пишешь ──────────────────────────────────────────────────────────────────────
    { id: 'l13c4-01', type: 'situation', grammarPoint: 'l13c4_luckily', situation: { ru: 'Ты чуть не опоздал, но успел на автобус. Расскажи, что тебе повезло.', uk: 'Ти мало не запізнився, але встиг на автобус. Розкажи, що тобі пощастило.' }, accepted: ['Luckily, I caught the bus.'] },
    { id: 'l13c4-02', type: 'situation', grammarPoint: 'l13c4_luckily', situation: { ru: 'Друг сомневается, что ты звонил. Скажи, что ты точно звонил вчера.', uk: 'Друг сумнівається, що ти телефонував. Скажи, що ти точно телефонував учора.' }, accepted: ['I definitely called yesterday.'] },
    { id: 'l13c4-03', type: 'situation', grammarPoint: 'l13c4_didnt', situation: { ru: 'Сестра не купила билеты заранее. Расскажи об этом.', uk: 'Сестра не купила квитки заздалегідь. Розкажи про це.' }, accepted: ['She didn’t buy the tickets beforehand.', 'She did not buy the tickets beforehand.'] },
    { id: 'l13c4-04', type: 'situation', grammarPoint: 'l13c4_ask', situation: { ru: 'Спроси друга, звонил ли он недавно.', uk: 'Запитай друга, чи телефонував він нещодавно.' }, accepted: ['Did you call recently?'] },
    { id: 'l13c4-05', type: 'situation', grammarPoint: 'l13c4_ask', situation: { ru: 'Спроси, заплатили ли они на прошлой неделе.', uk: 'Запитай, чи заплатили вони минулого тижня.' }, accepted: ['Did they pay last week?'] },
    { id: 'l13c4-06', type: 'situation', grammarPoint: 'l13c4_didnt', situation: { ru: 'Вчера вы так и не сварили суп. Скажи об этом.', uk: 'Учора ви так і не зварили суп. Скажи про це.' }, accepted: ['We didn’t make soup yesterday.', 'We did not make soup yesterday.'] },
    // ── Ответ в мини-диалоге ────────────────────────────────────────────────────────────────────────────────────
    { id: 'l13c4-07', type: 'dialogue', grammarPoint: 'l13c4_anchor', partnerLine: 'We didn’t paint the room last week.', situation: { ru: 'Скажи, что ты покрасил дверную раму на прошлой неделе.', uk: 'Скажи, що ти пофарбував дверну раму минулого тижня.' }, accepted: ['I painted the doorframe last week.'] },
    { id: 'l13c4-08', type: 'dialogue', grammarPoint: 'l13c4_luckily', partnerLine: 'He didn’t miss the bus yesterday.', situation: { ru: 'Скажи, что ты безусловно заплатил вчера.', uk: 'Скажи, що ти безумовно заплатив учора.' }, accepted: ['I certainly paid yesterday.'] },
    { id: 'l13c4-09', type: 'dialogue', grammarPoint: 'l13c4_didnt', partnerLine: 'Did you feel frightened last night?', situation: { ru: 'Ответь, что не испугался.', uk: 'Відповідай, що не злякався.' }, accepted: ['I didn’t feel frightened last night.', 'I did not feel frightened last night.'] },
    { id: 'l13c4-10', type: 'dialogue', grammarPoint: 'l13c4_anchor', partnerLine: 'We didn’t make soup yesterday.', situation: { ru: 'Скажи, что ты купил батат на прошлой неделе.', uk: 'Скажи, що ти купив батат минулого тижня.' }, accepted: ['I bought a sweet potato last week.'] },
    { id: 'l13c4-11', type: 'dialogue', grammarPoint: 'l13c4_luckily', partnerLine: 'Unfortunately, I missed the train.', situation: { ru: 'Скажи, что она, к счастью, успела на автобус вчера.', uk: 'Скажи, що вона, на щастя, встигла на автобус учора.' }, accepted: ['Luckily, she caught the bus yesterday.'] },
    { id: 'l13c4-12', type: 'dialogue', grammarPoint: 'l13c4_didnt', partnerLine: 'I accidentally broke a cup.', situation: { ru: 'Скажи, что ты не нашёл свои носки.', uk: 'Скажи, що ти не знайшов свої шкарпетки.' }, accepted: ['I did not find my socks.', 'I didn’t find my socks.'] },
    // ── Найди и исправь ошибку ──────────────────────────────────────────────────────────────────────────────────
    { id: 'l13c4-13', type: 'fix', grammarPoint: 'l13c4_anchor', wrong: 'I cleaned the garden shed tomorrow.', accepted: ['I cleaned the garden shed yesterday.'] },
    { id: 'l13c4-14', type: 'fix', grammarPoint: 'l13c4_luckily', wrong: 'Luckily, I catch the bus yesterday.', accepted: ['Luckily, I caught the bus yesterday.'] },
    { id: 'l13c4-15', type: 'fix', grammarPoint: 'l13c4_didnt', wrong: 'She didn’t found the check-in desk yesterday.', accepted: ['She didn’t find the check-in desk yesterday.', 'She did not find the check-in desk yesterday.'] },
    { id: 'l13c4-16', type: 'fix', grammarPoint: 'l13c4_ask', wrong: 'Did you bought the tickets beforehand?', accepted: ['Did you buy the tickets beforehand?'] },
  ],
};
