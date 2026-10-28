// chapter_exam_v2_l01_c1.ts — банк экзамена v2: урок 1, глава 1 (эпизоды 1–8). НЕ подключён (координатор 25.10: владелец читает
// банки глав 1 и 3 до массовой фабрики; включение — после склейки и слова координатора, через список в app/learning_v2_chapter_exam_v2.ts).
// зачем: правила главы 2 — только слова и формы эпизодов 1–8 (здесь это только I am / I am not и слова эпизодов; «you», «he», «is»
// и вопросы ещё не проходили), ситуация и ответ сходятся по смыслу, верных вариантов несколько. Сторож слов —
// tests/owner_locks_exam_episode_words_2026_10_25.test.ts. Эталон (первый в accepted) — полной формой, без сокращений.
import type { ChapterExamV2Bank } from '../chapter_exam_v2';

export const CHAPTER_EXAM_V2_BANK_L01_C1: ChapterExamV2Bank = {
  lessonOrdinal: 1,
  chapterOrdinal: 1,
  grammarPoints: [
    { id: 'l01c1_i_am', label: { ru: 'я — I am', uk: 'я — I am' }, episodeOrdinals: [1, 2, 6] },
    { id: 'l01c1_not', label: { ru: 'не — I am not', uk: 'не — I am not' }, episodeOrdinals: [3, 4, 7] },
  ],
  items: [
    // ── Ситуация → сам говоришь или пишешь ───────────────────────────────────────────────────────────────────────
    { id: 'l01c1-01', type: 'situation', grammarPoint: 'l01c1_i_am', situation: { ru: 'Коллега спрашивает, можно ли начинать встречу. Скажи, что ты готов.', uk: 'Колега питає, чи можна починати зустріч. Скажи, що ти готовий.' }, accepted: ['I am ready.', "I'm ready."] },
    { id: 'l01c1-02', type: 'situation', grammarPoint: 'l01c1_i_am', situation: { ru: 'Ты наконец вернулся домой и пишешь сестре. Напиши, что ты дома.', uk: 'Ти нарешті повернувся додому й пишеш сестрі. Напиши, що ти вдома.' }, accepted: ['I am home.', "I'm home.", 'I am back.', "I'm back."] },
    { id: 'l01c1-03', type: 'situation', grammarPoint: 'l01c1_not', situation: { ru: 'Друг предлагает тебе пиццу, а ты только что поел. Скажи, что ты не голоден.', uk: 'Друг пропонує тобі піцу, а ти щойно поїв. Скажи, що ти не голодний.' }, accepted: ['I am not hungry.', "I'm not hungry.", 'No, I am not hungry.', "No, I'm not hungry.", 'Sorry, I am not hungry.', "Sorry, I'm not hungry."] },
    { id: 'l01c1-04', type: 'situation', grammarPoint: 'l01c1_i_am', situation: { ru: 'Ты бежал на встречу и успел. Напиши другу, что ты уже на месте.', uk: 'Ти біг на зустріч і встиг. Напиши другові, що ти вже на місці.' }, accepted: ['I am here.', "I'm here."] },
    { id: 'l01c1-05', type: 'situation', grammarPoint: 'l01c1_not', situation: { ru: 'Друг волнуется, что ты заблудился в новом городе. Скажи, что нет.', uk: 'Друг хвилюється, що ти заблукав у новому місті. Скажи, що ні.' }, accepted: ['I am not lost.', "I'm not lost.", 'No, I am not lost.', "No, I'm not lost."] },
    { id: 'l01c1-06', type: 'situation', grammarPoint: 'l01c1_i_am', situation: { ru: 'Ты опоздал на встречу на десять минут. Извинись.', uk: 'Ти запізнився на зустріч на десять хвилин. Перепрошуй.' }, accepted: ['I am sorry.', "I'm sorry.", 'I am late.', "I'm late.", 'Sorry, I am late.', "Sorry, I'm late."] },
    // ── Ответ в мини-диалоге ──────────────────────────────────────────────────────────────────────────────────────
    { id: 'l01c1-07', type: 'dialogue', grammarPoint: 'l01c1_not', partnerLine: 'I am tired.', situation: { ru: 'Друг устал после работы. Скажи, что ты — нет.', uk: 'Друг утомився після роботи. Скажи, що ти — ні.' }, accepted: ['I am not tired.', "I'm not tired."] },
    { id: 'l01c1-08', type: 'dialogue', grammarPoint: 'l01c1_i_am', partnerLine: 'I am not hungry.', situation: { ru: 'Друг не голоден, а ты голоден. Скажи это.', uk: 'Друг не голодний, а ти голодний. Скажи це.' }, accepted: ['I am hungry.', "I'm hungry."] },
    { id: 'l01c1-09', type: 'dialogue', grammarPoint: 'l01c1_not', partnerLine: 'I am scared.', situation: { ru: 'Друг боится грозы. Скажи, что тебе не страшно.', uk: 'Друг боїться грози. Скажи, що тобі не страшно.' }, accepted: ['I am not scared.', "I'm not scared."] },
    { id: 'l01c1-10', type: 'dialogue', grammarPoint: 'l01c1_i_am', partnerLine: 'I am not ready.', situation: { ru: 'Друг ещё собирается. Скажи, что ты уже готов.', uk: 'Друг ще збирається. Скажи, що ти вже готовий.' }, accepted: ['I am ready.', "I'm ready."] },
    // ── Найди и исправь ошибку ────────────────────────────────────────────────────────────────────────────────────
    { id: 'l01c1-11', type: 'fix', grammarPoint: 'l01c1_i_am', wrong: 'I hungry.', accepted: ['I am hungry.', "I'm hungry."] },
    { id: 'l01c1-12', type: 'fix', grammarPoint: 'l01c1_not', wrong: 'I not am sure.', accepted: ['I am not sure.', "I'm not sure."] },
    { id: 'l01c1-13', type: 'fix', grammarPoint: 'l01c1_not', wrong: 'I am no tired.', accepted: ['I am not tired.', "I'm not tired."] },
    { id: 'l01c1-14', type: 'fix', grammarPoint: 'l01c1_i_am', wrong: 'I fine.', accepted: ['I am fine.', "I'm fine."] },
  ],
};
