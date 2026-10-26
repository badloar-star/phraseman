// chapter_exam_v2_l29_c6.ts — банк экзамена v2: урок 29, глава 6 (эпизоды 41–48). НЕ подключён: список BANKS (app/learning_v2_chapter_exam_v2.ts) пополняет Learning V2 после вычитки владельцем.
// зачем: глава 6 — «where» (место, где), «who / whose» (кто и чей) и уточнение без «that» («The ticket I lost was in my bag») на словах о покупках, тренировках и поездках. Только слова и формы эпизодов 1–48 урока 29; ситуация и ответ сходятся по смыслу, верных вариантов несколько, вопросительных знаков нет.
// Сторож слов — tests/owner_locks_exam_episode_words_2026_10_25.test.ts. Эталон (первый в accepted) — полной формой, как в эпизодах.
import type { ChapterExamV2Bank } from '../chapter_exam_v2';

export const CHAPTER_EXAM_V2_BANK_L29_C6: ChapterExamV2Bank = {
  lessonOrdinal: 29,
  chapterOrdinal: 6,
  grammarPoints: [
    { id: 'l29c6_where', label: { ru: 'место: This is the shop where I bought the pan', uk: 'місце: This is the shop where I bought the pan' }, episodeOrdinals: [43, 44, 47, 48] },
    { id: 'l29c6_who_whose', label: { ru: 'кто и чей: the trainer who helped me / the woman whose baby is asleep', uk: 'хто і чий: the trainer who helped me / the woman whose baby is asleep' }, episodeOrdinals: [41, 42, 45, 46, 48] },
    { id: 'l29c6_contact', label: { ru: 'без that: The ticket I lost / The dessert you recommended', uk: 'без that: The ticket I lost / The dessert you recommended' }, episodeOrdinals: [41, 42, 43, 44, 45, 46, 47, 48] },
  ],
  items: [
    // ── Ситуация → сам говоришь или пишешь ────────────────────────────────────────
    { id: 'l29c6-01', type: 'situation', grammarPoint: 'l29c6_where', situation: { ru: 'Ты показываешь магазин, где купил сковороду. Скажи, что это магазин, где ты её купил.', uk: 'Ти показуєш магазин, де купив сковорідку. Скажи, що це магазин, де ти її купив.' }, accepted: ['This is the shop where I bought the pan.'] },
    { id: 'l29c6-02', type: 'situation', grammarPoint: 'l29c6_where', situation: { ru: 'Вы договорились встретиться в кафе. Скажи, что это кафе, где вы встретитесь.', uk: 'Ви домовилися зустрітися в кафе. Скажи, що це кафе, де ви зустрінетеся.' }, accepted: ['This is the café where we will meet.'] },
    { id: 'l29c6-03', type: 'situation', grammarPoint: 'l29c6_who_whose', situation: { ru: 'Тренер помог тебе с упражнением. Скажи, что это тренер, который тебе помог.', uk: 'Тренер допоміг тобі з вправою. Скажи, що це тренер, який тобі допоміг.' }, accepted: ['This is the trainer who helped me.'] },
    { id: 'l29c6-04', type: 'situation', grammarPoint: 'l29c6_who_whose', situation: { ru: 'У молодой мамы спит малыш. Скажи, что это женщина, чей ребёнок спит.', uk: 'У молодої мами спить малюк. Скажи, що це жінка, чия дитина спить.' }, accepted: ['This is the woman whose baby is asleep.'] },
    { id: 'l29c6-05', type: 'situation', grammarPoint: 'l29c6_contact', situation: { ru: 'Ты потерял билет, и он был в сумке. Скажи, что билет, который ты потерял, был в твоей сумке.', uk: 'Ти загубив квиток, і він був у сумці. Скажи, що квиток, який ти загубив, був у твоїй сумці.' }, accepted: ['The ticket I lost was in my bag.'] },
    { id: 'l29c6-06', type: 'situation', grammarPoint: 'l29c6_contact', situation: { ru: 'Тебе порекомендовали десерт, и он вкусный. Скажи, что десерт, который ты порекомендовал, вкусный.', uk: 'Тобі порадили десерт, і він смачний. Скажи, що десерт, який ти порадив, смачний.' }, accepted: ['The dessert you recommended is delicious.'] },
    // ── Ответ в мини-диалоге ────────────────────────────────────────
    { id: 'l29c6-07', type: 'dialogue', grammarPoint: 'l29c6_where', partnerLine: 'The pan I bought is too heavy.', situation: { ru: 'Друг говорит, что купленная сковорода слишком тяжёлая. Скажи, что это кафе, где ты пробовал десерт.', uk: 'Друг каже, що куплена сковорідка занадто важка. Скажи, що це кафе, де ти куштував десерт.' }, accepted: ['This is the café where I tried it.'] },
    { id: 'l29c6-08', type: 'dialogue', grammarPoint: 'l29c6_where', partnerLine: 'The clip I bought is too small.', situation: { ru: 'Друг говорит, что купленная заколка слишком мала. Скажи, что это магазин, где ты её купил.', uk: 'Друг каже, що куплена заколка замала. Скажи, що це магазин, де ти її купив.' }, accepted: ['This is the shop where I bought it.'] },
    { id: 'l29c6-09', type: 'dialogue', grammarPoint: 'l29c6_who_whose', partnerLine: 'I need a short break.', situation: { ru: 'Друг просит небольшой перерыв. Скажи, что это женщина, чей гребень ты брал.', uk: 'Друг просить невелику перерву. Скажи, що це жінка, чий гребінець ти брав.' }, accepted: ['This is the woman whose comb I borrowed.'] },
    { id: 'l29c6-10', type: 'dialogue', grammarPoint: 'l29c6_who_whose', partnerLine: 'I want to check the brakes first.', situation: { ru: 'Друг хочет сначала проверить тормоза. Скажи, что это мужчина, чей велосипед ты хочешь купить.', uk: 'Друг хоче спершу перевірити гальма. Скажи, що це чоловік, чий велосипед ти хочеш купити.' }, accepted: ['That is the man whose bike I want to buy.'] },
    { id: 'l29c6-11', type: 'dialogue', grammarPoint: 'l29c6_contact', partnerLine: 'Thank you for your honest opinion.', situation: { ru: 'Друг благодарит за честное мнение. Скажи, что совет, который ты дал, был полезным.', uk: 'Друг дякує за чесну думку. Скажи, що порада, яку ти дав, була корисною.' }, accepted: ['The advice you gave me was useful.'] },
    { id: 'l29c6-12', type: 'dialogue', grammarPoint: 'l29c6_contact', partnerLine: 'I am taking extra water as a precaution.', situation: { ru: 'Друг берёт запас воды. Скажи, что сумка, которую ты собрал, готова.', uk: 'Друг бере запас води. Скажи, що сумка, яку ти зібрав, готова.' }, accepted: ['The bag I packed is ready.'] },
    // ── Найди и исправь ошибку ────────────────────────────────────────
    { id: 'l29c6-13', type: 'fix', grammarPoint: 'l29c6_where', wrong: 'This is the shop which I bought the pan.', accepted: ['This is the shop where I bought the pan.'] },
    { id: 'l29c6-14', type: 'fix', grammarPoint: 'l29c6_who_whose', wrong: 'This is the woman who baby is asleep.', accepted: ['This is the woman whose baby is asleep.'] },
    { id: 'l29c6-15', type: 'fix', grammarPoint: 'l29c6_who_whose', wrong: 'This is the trainer whose helped me.', accepted: ['This is the trainer who helped me.'] },
    { id: 'l29c6-16', type: 'fix', grammarPoint: 'l29c6_contact', wrong: 'The ticket I lost it was in my bag.', accepted: ['The ticket I lost was in my bag.'] },
  ],
};
