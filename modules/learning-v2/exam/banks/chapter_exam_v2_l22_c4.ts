// chapter_exam_v2_l22_c4.ts — банк экзамена v2: урок 22, глава 4 (эпизоды 25–32).
// зачем (владелец через координатора 26.10: экзамены глав v2 для всех уроков, войдут в полную 2.0.3): правила
// docs/work/factory-exam-banks-task-for-codex-2026-10-25.md — только слова и формы эпизодов 1–32 урока 22, ситуация и ответ
// сходятся по смыслу, верных вариантов несколько, эталон (первый в accepted) — полной формой. Вопросов нет: «?» запрещён общим сторожем.
// Глава 4 — the hooded one / the patterned ones (эпизоды 25–29) и «чтобы»: I go swimming to keep fit (эпизоды 30–32).
import type { ChapterExamV2Bank } from '../chapter_exam_v2';

export const CHAPTER_EXAM_V2_BANK_L22_C4: ChapterExamV2Bank = {
  lessonOrdinal: 22,
  chapterOrdinal: 4,
  grammarPoints: [
    { id: 'l22c4_the_one', label: { ru: 'одну вещь — the hooded one', uk: 'одну річ — the hooded one' }, episodeOrdinals: [25, 26, 27, 28] },
    { id: 'l22c4_the_ones', label: { ru: 'несколько вещей — the patterned ones', uk: 'кілька речей — the patterned ones' }, episodeOrdinals: [25, 26, 27, 29] },
    { id: 'l22c4_purpose', label: { ru: 'чтобы — to keep fit', uk: 'щоб — to keep fit' }, episodeOrdinals: [30, 31, 32] },
  ],
  items: [
    // ── Ситуация → сам говоришь или пишешь ───────────────────────────────────────────────────────────────────────
    { id: 'l22c4-01', type: 'situation', grammarPoint: 'l22c4_the_one', situation: { ru: 'В магазине две куртки: с капюшоном и без. Скажи продавцу, что хочешь ту, что с капюшоном.', uk: 'У магазині дві куртки: з каптуром і без. Скажи продавцеві, що хочеш ту, що з каптуром.' }, accepted: ['I want the hooded one.', 'I prefer the hooded one.', 'I like the hooded one.'] },
    { id: 'l22c4-02', type: 'situation', grammarPoint: 'l22c4_the_ones', situation: { ru: 'Зима, ты выбираешь носки. Скажи, что хочешь термоноски.', uk: 'Зима, ти обираєш шкарпетки. Скажи, що хочеш термошкарпетки.' }, accepted: ['I want the thermal ones.', 'I prefer the thermal ones.', 'I like the thermal ones.'] },
    { id: 'l22c4-03', type: 'situation', grammarPoint: 'l22c4_the_one', situation: { ru: 'Ты выбираешь миску, чтобы греть в ней еду. Скажи, что предпочитаешь ту, что для микроволновки.', uk: 'Ти обираєш миску, щоб гріти в ній їжу. Скажи, що віддаєш перевагу тій, що для мікрохвильовки.' }, accepted: ['I prefer the microwave-safe one.', 'I want the microwave-safe one.', 'I like the microwave-safe one.'] },
    { id: 'l22c4-04', type: 'situation', grammarPoint: 'l22c4_purpose', situation: { ru: 'Друг спрашивает, зачем ты ходишь в бассейн. Скажи: чтобы быть в форме.', uk: 'Друг питає, навіщо ти ходиш у басейн. Скажи: щоб бути у формі.' }, accepted: ['I go swimming to keep fit.'] },
    { id: 'l22c4-05', type: 'situation', grammarPoint: 'l22c4_purpose', situation: { ru: 'Ты занимаешься английским каждый день. Объясни: чтобы был результат.', uk: 'Ти займаєшся англійською щодня. Поясни: щоб був результат.' }, accepted: ['I practise every day to make progress.'] },
    { id: 'l22c4-06', type: 'situation', grammarPoint: 'l22c4_the_ones', situation: { ru: 'Ты выбираешь полотенца. Скажи, что тебе нравятся те, что хорошо впитывают.', uk: 'Ти обираєш рушники. Скажи, що тобі подобаються ті, що добре вбирають.' }, accepted: ['I like the absorbent ones.', 'I want the absorbent ones.', 'I prefer the absorbent ones.'] },
    // ── Ответ в мини-диалоге ──────────────────────────────────────────────────────────────────────────────────────
    { id: 'l22c4-07', type: 'dialogue', grammarPoint: 'l22c4_the_ones', partnerLine: 'I like the tight-fitting jeans.', situation: { ru: 'Подруга советует облегающие джинсы. Скажи, что ты такие не хочешь.', uk: 'Подруга радить облягаючі джинси. Скажи, що ти такі не хочеш.' }, accepted: ['I do not want the tight-fitting ones.', 'I prefer the loose-fitting ones.'] },
    { id: 'l22c4-08', type: 'dialogue', grammarPoint: 'l22c4_the_ones', partnerLine: 'These boots are lace-up.', situation: { ru: 'Продавец показывает ботинки на шнурках. Скажи, что хочешь те, что без застёжек.', uk: 'Продавець показує черевики на шнурках. Скажи, що хочеш ті, що без застібок.' }, accepted: ['I want the slip-on ones.', 'I prefer the slip-on ones.'] },
    { id: 'l22c4-09', type: 'dialogue', grammarPoint: 'l22c4_the_one', partnerLine: 'This bread is not sliced.', situation: { ru: 'В пекарне предлагают целую буханку. Скажи, что хочешь нарезанную.', uk: 'У пекарні пропонують цілу хлібину. Скажи, що хочеш нарізану.' }, accepted: ['I want the pre-sliced one.', 'I prefer the pre-sliced one.'] },
    { id: 'l22c4-10', type: 'dialogue', grammarPoint: 'l22c4_the_one', partnerLine: 'This jacket is not padded.', situation: { ru: 'Продавец показывает лёгкую куртку, а на улице мороз. Скажи, что предпочитаешь утеплённую.', uk: 'Продавець показує легку куртку, а надворі мороз. Скажи, що віддаєш перевагу утепленій.' }, accepted: ['I prefer the padded one.', 'I want the padded one.', 'I want the fleece-lined one.'] },
    { id: 'l22c4-11', type: 'dialogue', grammarPoint: 'l22c4_purpose', partnerLine: 'You can stay at home.', situation: { ru: 'На улице дождь, и друг советует остаться дома. Скажи, что берёшь зонт, чтобы не промокнуть.', uk: 'Надворі дощ, і друг радить залишитися вдома. Скажи, що береш парасолю, щоб не промокнути.' }, accepted: ['I use an umbrella to stay dry.'] },
    { id: 'l22c4-12', type: 'dialogue', grammarPoint: 'l22c4_purpose', partnerLine: 'You turn off your phone.', situation: { ru: 'Коллега заметил, что ты выключаешь телефон. Объясни: чтобы не отвлекаться.', uk: 'Колега помітив, що ти вимикаєш телефон. Поясни: щоб не відволікатися.' }, accepted: ['I turn off my phone to stay focused.'] },
    // ── Найди и исправь ошибку ────────────────────────────────────────────────────────────────────────────────────
    { id: 'l22c4-13', type: 'fix', grammarPoint: 'l22c4_the_one', wrong: 'I want the hooded.', accepted: ['I want the hooded one.'] },
    { id: 'l22c4-14', type: 'fix', grammarPoint: 'l22c4_the_ones', wrong: 'I like the cushioned.', accepted: ['I like the cushioned ones.', 'I like the cushioned one.'] },
    { id: 'l22c4-15', type: 'fix', grammarPoint: 'l22c4_the_ones', wrong: 'I want the non-slip ones socks.', accepted: ['I want the non-slip socks.', 'I want the non-slip ones.'] },
    { id: 'l22c4-16', type: 'fix', grammarPoint: 'l22c4_purpose', wrong: 'I go to bed early for get enough rest.', accepted: ['I go to bed early to get enough rest.'] },
  ],
};
