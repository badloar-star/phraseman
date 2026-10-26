// chapter_exam_v2_l29_c7.ts — банк экзамена v2: урок 29, глава 7 (эпизоды 49–56). НЕ подключён: список BANKS (app/learning_v2_chapter_exam_v2.ts) пополняет Learning V2 после вычитки владельцем.
// зачем: глава 7 — итог урока: «who / where» (кто и где), «whose» и уточнение без «that» («The message you sent was unclear»), плюс вопросы и благодарность («What do you mean?», «Thank you for warning me»). Только слова и формы эпизодов 1–56 урока 29; ситуация и ответ сходятся по смыслу, верных вариантов несколько, вопросительных знаков нет.
// Сторож слов — tests/owner_locks_exam_episode_words_2026_10_25.test.ts. Эталон (первый в accepted) — полной формой, как в эпизодах.
import type { ChapterExamV2Bank } from '../chapter_exam_v2';

export const CHAPTER_EXAM_V2_BANK_L29_C7: ChapterExamV2Bank = {
  lessonOrdinal: 29,
  chapterOrdinal: 7,
  grammarPoints: [
    { id: 'l29c7_who_where', label: { ru: 'кто и где: the neighbour who listened / a café where we can talk', uk: 'хто й де: the neighbour who listened / a café where we can talk' }, episodeOrdinals: [49, 50, 52, 56] },
    { id: 'l29c7_whose_contact', label: { ru: 'чей и без that: the woman whose bag I repaired / The message you sent', uk: 'чий і без that: the woman whose bag I repaired / The message you sent' }, episodeOrdinals: [49, 50, 51, 52, 53, 54, 55, 56] },
    { id: 'l29c7_questions_thanks', label: { ru: 'вопросы и благодарность: What do you mean? / Thank you for …', uk: 'запитання й подяка: What do you mean? / Thank you for …' }, episodeOrdinals: [49, 50, 51, 52, 53, 54, 55, 56] },
  ],
  items: [
    // ── Ситуация → сам говоришь или пишешь ────────────────────────────────────────
    { id: 'l29c7-01', type: 'situation', grammarPoint: 'l29c7_who_where', situation: { ru: 'Соседка выслушала тебя, когда было тяжело. Скажи, что она соседка, которая тебя выслушала.', uk: 'Сусідка вислухала тебе, коли було важко. Скажи, що вона сусідка, яка тебе вислухала.' }, accepted: ['She is the neighbour who listened to me.'] },
    { id: 'l29c7-02', type: 'situation', grammarPoint: 'l29c7_who_where', situation: { ru: 'Поговорить спокойно можно в кафе, которое ты знаешь. Скажи, что знаешь кафе, где вы можете поговорить.', uk: 'Поговорити спокійно можна в кафе, яке ти знаєш. Скажи, що знаєш кафе, де ви можете поговорити.' }, accepted: ['I know a café where we can talk.'] },
    { id: 'l29c7-03', type: 'situation', grammarPoint: 'l29c7_whose_contact', situation: { ru: 'Ты чинил чужую сумку. Скажи, что это женщина, чью сумку ты починил.', uk: 'Ти лагодив чужу сумку. Скажи, що це жінка, чию сумку ти полагодив.' }, accepted: ['That is the woman whose bag I repaired.'] },
    { id: 'l29c7-04', type: 'situation', grammarPoint: 'l29c7_whose_contact', situation: { ru: 'Сообщение друга запутало тебя. Скажи, что сообщение, которое ты отправил, было неясным.', uk: 'Повідомлення друга заплутало тебе. Скажи, що повідомлення, яке ти надіслав, було незрозумілим.' }, accepted: ['The message you sent was unclear.'] },
    { id: 'l29c7-05', type: 'situation', grammarPoint: 'l29c7_questions_thanks', situation: { ru: 'Собеседник говорит загадками. Спроси, что он имеет в виду.', uk: 'Співрозмовник говорить загадками. Запитай, що він має на увазі.' }, accepted: ['What do you mean?'] },
    { id: 'l29c7-06', type: 'situation', grammarPoint: 'l29c7_questions_thanks', situation: { ru: 'Тебя предостерегли от обмана. Поблагодари за предупреждение.', uk: 'Тебе застерегли від обману. Подякуй за попередження.' }, accepted: ['Thank you for warning me.'] },
    // ── Ответ в мини-диалоге ────────────────────────────────────────
    { id: 'l29c7-07', type: 'dialogue', grammarPoint: 'l29c7_who_where', partnerLine: 'I feel bewildered by all these changes.', situation: { ru: 'Друг растерян от перемен. Скажи, что ты знаешь место, где можно поговорить.', uk: 'Друг розгублений від змін. Скажи, що ти знаєш місце, де можна поговорити.' }, accepted: ['I know a place where we can talk.'] },
    { id: 'l29c7-08', type: 'dialogue', grammarPoint: 'l29c7_who_where', partnerLine: 'This sounds like a scam.', situation: { ru: 'Друг подозревает мошенничество. Скажи, что это офис, где продают билеты.', uk: 'Друг підозрює шахрайство. Скажи, що це офіс, де продають квитки.' }, accepted: ['This is the office where they sell tickets.'] },
    { id: 'l29c7-09', type: 'dialogue', grammarPoint: 'l29c7_whose_contact', partnerLine: 'You have an aptitude for sewing.', situation: { ru: 'Друг хвалит твои способности к шитью. Скажи, что способ, который он тебе показал, помог.', uk: 'Друг хвалить твої здібності до шиття. Скажи, що спосіб, який він тобі показав, допоміг.' }, accepted: ['The method you showed me was helpful.'] },
    { id: 'l29c7-10', type: 'dialogue', grammarPoint: 'l29c7_whose_contact', partnerLine: 'It takes perseverance.', situation: { ru: 'Друг говорит, что нужна настойчивость. Скажи, что правило, о котором вы договорились, ясное.', uk: 'Друг каже, що потрібна наполегливість. Скажи, що правило, про яке ви домовилися, зрозуміле.' }, accepted: ['The rule we agreed on is clear.'] },
    { id: 'l29c7-11', type: 'dialogue', grammarPoint: 'l29c7_questions_thanks', partnerLine: 'That message is ambiguous.', situation: { ru: 'Друг говорит, что сообщение двусмысленное. Вежливо попроси объяснить нюанс.', uk: 'Друг каже, що повідомлення двозначне. Ввічливо попроси пояснити нюанс.' }, accepted: ['Could you explain that nuance?'] },
    { id: 'l29c7-12', type: 'dialogue', grammarPoint: 'l29c7_questions_thanks', partnerLine: 'That seller is very pushy.', situation: { ru: 'Друг говорит, что продавец слишком навязчивый. Спроси, не пытается ли он вас обмануть.', uk: 'Друг каже, що продавець надто нав’язливий. Запитай, чи не намагається він вас обдурити.' }, accepted: ['Is he trying to deceive us?'] },
    // ── Найди и исправь ошибку ────────────────────────────────────────
    { id: 'l29c7-13', type: 'fix', grammarPoint: 'l29c7_who_where', wrong: 'She is the neighbour whose listened to me.', accepted: ['She is the neighbour who listened to me.'] },
    { id: 'l29c7-14', type: 'fix', grammarPoint: 'l29c7_whose_contact', wrong: 'She is the friend who parents I met.', accepted: ['She is the friend whose parents I met.'] },
    { id: 'l29c7-15', type: 'fix', grammarPoint: 'l29c7_whose_contact', wrong: 'The message you sent it was unclear.', accepted: ['The message you sent was unclear.'] },
    { id: 'l29c7-16', type: 'fix', grammarPoint: 'l29c7_questions_thanks', wrong: 'Could you to explain that word?', accepted: ['Could you explain that word?'] },
  ],
};
