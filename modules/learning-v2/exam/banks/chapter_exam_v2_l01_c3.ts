// chapter_exam_v2_l01_c3.ts — банк экзамена v2: урок 1, глава 3 (эпизоды 17–24). НЕ подключён (координатор 25.10: владелец читает
// банки глав 1 и 3 до массовой фабрики; включение — после склейки и слова координатора, через список в app/learning_v2_chapter_exam_v2.ts).
// зачем: правила главы 2 — только слова и формы эпизодов 1–24: глава 3 вводит «we are» (17–20) и «they are» (17–23) и снова
// he/she/it is с новыми словами (18–24). Вопросов в уроке 1 ещё нет. Ситуация и ответ сходятся по смыслу, верных вариантов
// несколько. Сторож слов — tests/owner_locks_exam_episode_words_2026_10_25.test.ts. Эталон (первый в accepted) — полной формой.
import type { ChapterExamV2Bank } from '../chapter_exam_v2';

export const CHAPTER_EXAM_V2_BANK_L01_C3: ChapterExamV2Bank = {
  lessonOrdinal: 1,
  chapterOrdinal: 3,
  grammarPoints: [
    { id: 'l01c3_we_are', label: { ru: 'мы — we are', uk: 'ми — we are' }, episodeOrdinals: [17, 18, 20] },
    { id: 'l01c3_they_are', label: { ru: 'они — they are', uk: 'вони — they are' }, episodeOrdinals: [17, 19, 21] },
    { id: 'l01c3_is', label: { ru: 'он / она / оно — is', uk: 'він / вона / воно — is' }, episodeOrdinals: [20, 21, 24] },
  ],
  items: [
    // ── Ситуация → сам говоришь или пишешь ───────────────────────────────────────────────────────────────────────
    { id: 'l01c3-01', type: 'situation', grammarPoint: 'l01c3_we_are', situation: { ru: 'Вы с коллегой пришли на встречу за полчаса. Скажи, что вы рано.', uk: 'Ви з колегою прийшли на зустріч за пів години. Скажи, що ви рано.' }, accepted: ['We are early.', "We're early."] },
    { id: 'l01c3-02', type: 'situation', grammarPoint: 'l01c3_they_are', situation: { ru: 'Сосед ищет твоих детей. Скажи, что они на улице.', uk: 'Сусід шукає твоїх дітей. Скажи, що вони надворі.' }, accepted: ['They are outside.', "They're outside."] },
    { id: 'l01c3-03', type: 'situation', grammarPoint: 'l01c3_is', situation: { ru: 'Подруга спрашивает про новое кафе. Скажи, что там пусто.', uk: 'Подруга питає про нове кафе. Скажи, що там порожньо.' }, accepted: ['It is empty.', "It's empty."] },
    { id: 'l01c3-04', type: 'situation', grammarPoint: 'l01c3_we_are', situation: { ru: 'Вы с другом сбились с тропы в лесу. Напиши брату, что вы заблудились.', uk: 'Ви з другом збилися зі стежки в лісі. Напиши братові, що ви заблукали.' }, accepted: ['We are lost.', "We're lost."] },
    { id: 'l01c3-05', type: 'situation', grammarPoint: 'l01c3_they_are', situation: { ru: 'Соседи сверху всю ночь шумят. Пожалуйся другу, что они шумные.', uk: 'Сусіди згори всю ніч шумлять. Поскаржся другові, що вони галасливі.' }, accepted: ['They are noisy.', "They're noisy."] },
    { id: 'l01c3-06', type: 'situation', grammarPoint: 'l01c3_is', situation: { ru: 'Ты рассказываешь коллеге про брата: он всем помогает деньгами. Скажи, что он щедрый.', uk: 'Ти розповідаєш колезі про брата: він усім допомагає грошима. Скажи, що він щедрий.' }, accepted: ['He is generous.', "He's generous."] },
    // ── Ответ в мини-диалоге ──────────────────────────────────────────────────────────────────────────────────────
    { id: 'l01c3-07', type: 'dialogue', grammarPoint: 'l01c3_they_are', partnerLine: 'They are inside.', situation: { ru: 'Возрази: они на улице.', uk: 'Заперечи: вони надворі.' }, accepted: ['They are outside.', "They're outside.", 'No, they are outside.', "No, they're outside."] },
    { id: 'l01c3-08', type: 'dialogue', grammarPoint: 'l01c3_we_are', partnerLine: 'You are late!', situation: { ru: 'Возрази: вы с коллегой пришли рано.', uk: 'Заперечи: ви з колегою прийшли рано.' }, accepted: ['We are early.', "We're early.", 'No, we are early.', "No, we're early."] },
    { id: 'l01c3-09', type: 'dialogue', grammarPoint: 'l01c3_is', partnerLine: 'It is heavy.', situation: { ru: 'Друг поднимает коробку с посудой. Предупреди, что она ещё и хрупкая.', uk: 'Друг піднімає коробку з посудом. Попередь, що вона ще й крихка.' }, accepted: ['It is fragile.', "It's fragile."] },
    { id: 'l01c3-10', type: 'dialogue', grammarPoint: 'l01c3_they_are', partnerLine: 'They are poor.', situation: { ru: 'Возрази: они богатые.', uk: 'Заперечи: вони багаті.' }, accepted: ['They are rich.', "They're rich.", 'No, they are rich.', "No, they're rich."] },
    { id: 'l01c3-11', type: 'dialogue', grammarPoint: 'l01c3_we_are', partnerLine: 'You are not ready.', situation: { ru: 'Возрази: вы с командой готовы.', uk: 'Заперечи: ви з командою готові.' }, accepted: ['We are ready.', "We're ready.", 'We are prepared.', "We're prepared.", 'No, we are ready.', "No, we're ready.", 'No, we are prepared.', "No, we're prepared."] },
    { id: 'l01c3-12', type: 'dialogue', grammarPoint: 'l01c3_is', partnerLine: 'He is poor.', situation: { ru: 'Возрази: он богатый.', uk: 'Заперечи: він багатий.' }, accepted: ['He is rich.', "He's rich.", 'No, he is rich.', "No, he's rich."] },
    // ── Найди и исправь ошибку ────────────────────────────────────────────────────────────────────────────────────
    { id: 'l01c3-13', type: 'fix', grammarPoint: 'l01c3_they_are', wrong: 'They is outside.', accepted: ['They are outside.', "They're outside."] },
    { id: 'l01c3-14', type: 'fix', grammarPoint: 'l01c3_we_are', wrong: 'We is together.', accepted: ['We are together.', "We're together."] },
    { id: 'l01c3-15', type: 'fix', grammarPoint: 'l01c3_is', wrong: 'She are married.', accepted: ['She is married.', "She's married."] },
    { id: 'l01c3-16', type: 'fix', grammarPoint: 'l01c3_is', wrong: 'It are small.', accepted: ['It is small.', "It's small."] },
  ],
};
