// chapter_exam_v2_l18_c6.ts — банк экзамена v2: урок 18, глава 6 (эпизоды 41–48). НЕ подключён: список BANKS (app/learning_v2_chapter_exam_v2.ts) пополняет Learning V2 после вычитки владельцем.
// зачем: глава 6 — «so welcome» (так, без существительного), «such a busy day» (такой, с существительным) и сравнение «longer than» из главы 1. Только слова и формы эпизодов 1–48 урока 18; ситуация и ответ сходятся по смыслу, верных вариантов несколько, вопросительных знаков нет.
// Сторож слов — tests/owner_locks_exam_episode_words_2026_10_25.test.ts. Эталон (первый в accepted) — полной формой, как в эпизодах.
import type { ChapterExamV2Bank } from '../chapter_exam_v2';

export const CHAPTER_EXAM_V2_BANK_L18_C6: ChapterExamV2Bank = {
  lessonOrdinal: 18,
  chapterOrdinal: 6,
  grammarPoints: [
    { id: 'l18c6_so', label: { ru: 'так: so welcome / so long / so useful', uk: 'так: so welcome / so long / so useful' }, episodeOrdinals: [41, 42, 43, 44, 45, 46, 47, 48] },
    { id: 'l18c6_such', label: { ru: 'такой: such a busy day / such a good mood', uk: 'такий: such a busy day / such a good mood' }, episodeOrdinals: [41, 42, 43, 44, 45, 46, 47, 48] },
    { id: 'l18c6_comparison', label: { ru: 'сравниваем: longer / sweeter / quieter than …', uk: 'порівнюємо: longer / sweeter / quieter than …' }, episodeOrdinals: [41, 42, 43, 46, 48] },
  ],
  items: [
    // ── Ситуация → сам говоришь или пишешь ────────────────────────────────────────
    { id: 'l18c6-01', type: 'situation', grammarPoint: 'l18c6_so', situation: { ru: 'Короткий перерыв очень кстати. Скажи, что он так нужен.', uk: 'Коротка перерва дуже доречна. Скажи, що вона така потрібна.' }, accepted: ['This short break is so welcome.'] },
    { id: 'l18c6-02', type: 'situation', grammarPoint: 'l18c6_so', situation: { ru: 'Рабочие часы очень длинные. Скажи, что они такие длинные.', uk: 'Робочі години дуже довгі. Скажи, що вони такі довгі.' }, accepted: ['The working hours are so long.'] },
    { id: 'l18c6-03', type: 'situation', grammarPoint: 'l18c6_such', situation: { ru: 'У тебя отличное настроение. Скажи, что ты в таком хорошем настроении.', uk: 'У тебе чудовий настрій. Скажи, що ти в такому гарному настрої.' }, accepted: ['I am in such a good mood.'] },
    { id: 'l18c6-04', type: 'situation', grammarPoint: 'l18c6_such', situation: { ru: 'У вас был очень занятой день. Скажи, что это был такой занятой день.', uk: 'У вас був дуже зайнятий день. Скажи, що це був такий зайнятий день.' }, accepted: ['We had such a busy day.'] },
    { id: 'l18c6-05', type: 'situation', grammarPoint: 'l18c6_comparison', situation: { ru: 'Этот перерыв длиннее прошлого. Скажи об этом.', uk: 'Ця перерва довша за минулу. Скажи про це.' }, accepted: ['This break is longer than the last one.'] },
    { id: 'l18c6-06', type: 'situation', grammarPoint: 'l18c6_comparison', situation: { ru: 'Этот горячий напиток слаще моего. Скажи об этом.', uk: 'Цей гарячий напій солодший за мій. Скажи про це.' }, accepted: ['This hot drink is sweeter than mine.'] },
    // ── Ответ в мини-диалоге ────────────────────────────────────────
    { id: 'l18c6-07', type: 'dialogue', grammarPoint: 'l18c6_so', partnerLine: 'This light lunch is so fresh.', situation: { ru: 'Друг говорит, что лёгкий обед такой свежий. Скажи, что быстрый перекус такой полезный.', uk: 'Друг каже, що легкий обід такий свіжий. Скажи, що швидкий перекус такий корисний.' }, accepted: ['A quick snack is so useful.'] },
    { id: 'l18c6-08', type: 'dialogue', grammarPoint: 'l18c6_so', partnerLine: 'The train delay is so long.', situation: { ru: 'Друг говорит, что задержка поезда такая долгая. Скажи, что шум дороги такой громкий.', uk: 'Друг каже, що затримка потяга така довга. Скажи, що шум дороги такий гучний.' }, accepted: ['The traffic noise is so loud.'] },
    { id: 'l18c6-09', type: 'dialogue', grammarPoint: 'l18c6_such', partnerLine: 'We had such a big breakfast.', situation: { ru: 'Друг говорит, что у вас был такой большой завтрак. Скажи, что у вас была такая поздняя ночь.', uk: 'Друг каже, що у вас був такий великий сніданок. Скажи, що у вас була така пізня ніч.' }, accepted: ['We had such a late night.'] },
    { id: 'l18c6-10', type: 'dialogue', grammarPoint: 'l18c6_such', partnerLine: 'He is in such a bad mood.', situation: { ru: 'Друг говорит, что он в таком плохом настроении. Скажи, что у тебя такие смешанные чувства.', uk: 'Друг каже, що він у такому поганому настрої. Скажи, що в тебе такі змішані почуття.' }, accepted: ['I have such mixed feelings.'] },
    { id: 'l18c6-11', type: 'dialogue', grammarPoint: 'l18c6_comparison', partnerLine: 'This quiet evening is so nice.', situation: { ru: 'Друг говорит, что этот тихий вечер такой приятный. Скажи, что этот вечер тише вчерашнего.', uk: 'Друг каже, що цей тихий вечір такий приємний. Скажи, що цей вечір тихіший за вчорашній.' }, accepted: ['This evening is quieter than yesterday.'] },
    { id: 'l18c6-12', type: 'dialogue', grammarPoint: 'l18c6_comparison', partnerLine: 'My annual leave is so short.', situation: { ru: 'Друг говорит, что его отпуск такой короткий. Скажи, что твой ежегодный отпуск короче вашего.', uk: 'Друг каже, що його відпустка така коротка. Скажи, що твоя щорічна відпустка коротша за вашу.' }, accepted: ['My annual leave is shorter than yours.'] },
    // ── Найди и исправь ошибку ────────────────────────────────────────
    { id: 'l18c6-13', type: 'fix', grammarPoint: 'l18c6_so', wrong: 'The early start is such difficult.', accepted: ['The early start is so difficult.'] },
    { id: 'l18c6-14', type: 'fix', grammarPoint: 'l18c6_such', wrong: 'We have such a high hopes.', accepted: ['We have such high hopes.'] },
    { id: 'l18c6-15', type: 'fix', grammarPoint: 'l18c6_such', wrong: 'This is such interesting job vacancy.', accepted: ['This is such an interesting job vacancy.'] },
    { id: 'l18c6-16', type: 'fix', grammarPoint: 'l18c6_comparison', wrong: 'This flight delay is more long than the last one.', accepted: ['This flight delay is longer than the last one.'] },
  ],
};
