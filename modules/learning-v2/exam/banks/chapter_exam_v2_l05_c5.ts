// chapter_exam_v2_l05_c5.ts — банк экзамена v2: урок 5, глава 5 (эпизоды 33–40).
// зачем (слово владельца 26.10: экзамены глав v2 для всех уроков, войдут в 2.0.3; правила — docs/work/factory-exam-banks-task-for-codex-2026-10-25.md):
// каждое английское слово реплики, фразы с ошибкой и всех принятых ответов уже встречалось в эпизодах 1–40 урока 5
// (сторож tests/owner_locks_exam_episode_words_2026_10_25.test.ts); ситуация и ответ сходятся по смыслу; вопросы без «?» — общий тест правил банков.
// Глава 5: чья одна вещь — whose… this / that (33, 34, 38), чьи вещи — whose… these / those (35, 36), ответ mine, hers, his, ’s (37, 39, 40).
// Подключение в приложении (BANKS) — Learning V2 после вычитки владельцем; читабельный вид — docs/work/exam-banks/l05.md.
import type { ChapterExamV2Bank } from '../chapter_exam_v2';

export const CHAPTER_EXAM_V2_BANK_L05_C5: ChapterExamV2Bank = {
  lessonOrdinal: 5,
  chapterOrdinal: 5,
  grammarPoints: [
    { id: "l05c5_whose_one", label: { ru: "чья вещь — Whose… is this / that", uk: "чия річ — Whose… is this / that" }, episodeOrdinals: [33, 34, 38] },
    { id: "l05c5_whose_many", label: { ru: "чьи вещи — Whose… are these / those", uk: "чиї речі — Whose… are these / those" }, episodeOrdinals: [35, 36] },
    { id: "l05c5_answer", label: { ru: "ответ — mine, hers, his, my sister’s", uk: "відповідь — mine, hers, his, my sister’s" }, episodeOrdinals: [37, 39, 40] },
  ],
  items: [
    { id: "l05c5-01", type: "situation", grammarPoint: "l05c5_whose_one", situation: { ru: "На стойке ресепшена лежит планшет. Спроси, чей он.", uk: "На стійці рецепції лежить планшет. Спитай, чий він." }, accepted: ["Whose tablet is this"] },
    { id: "l05c5-02", type: "situation", grammarPoint: "l05c5_whose_one", situation: { ru: "На полу у сцены лежит брошь. Спроси, чья она.", uk: "На підлозі біля сцени лежить брошка. Спитай, чия вона." }, accepted: ["Whose brooch is this"] },
    { id: "l05c5-03", type: "situation", grammarPoint: "l05c5_whose_many", situation: { ru: "В бассейне на скамейке очки для плавания. Спроси, чьи они.", uk: "У басейні на лавці окуляри для плавання. Спитай, чиї вони." }, accepted: ["Whose goggles are these"] },
    { id: "l05c5-04", type: "situation", grammarPoint: "l05c5_whose_many", situation: { ru: "На диване лежат наушники. Спроси, чьи они.", uk: "На дивані лежать навушники. Спитай, чиї вони." }, accepted: ["Whose earbuds are these"] },
    { id: "l05c5-05", type: "situation", grammarPoint: "l05c5_answer", situation: { ru: "Друг спрашивает про скейтборд. Скажи, что он твой.", uk: "Друг питає про скейтборд. Скажи, що він твій." }, accepted: ["The skateboard is mine.", "It is mine."] },
    { id: "l05c5-06", type: "situation", grammarPoint: "l05c5_answer", situation: { ru: "Мама спрашивает про парик. Скажи, что он сестры.", uk: "Мама питає про перуку. Скажи, що вона сестри." }, accepted: ["The wig is my sister's.", "It is my sister's."] },
    { id: "l05c5-07", type: "dialogue", grammarPoint: "l05c5_whose_one", partnerLine: "Here is a joystick.", situation: { ru: "Спроси, чей тогда этот дрон.", uk: "Спитай, чий тоді цей дрон." }, accepted: ["Whose drone is this"] },
    { id: "l05c5-08", type: "dialogue", grammarPoint: "l05c5_whose_one", partnerLine: "The tie is on the chair.", situation: { ru: "Спроси, чей это галстук.", uk: "Спитай, чия це краватка." }, accepted: ["Whose tie is this"] },
    { id: "l05c5-09", type: "dialogue", grammarPoint: "l05c5_whose_many", partnerLine: "The binoculars are on the table.", situation: { ru: "Спроси, чьи это бинокли.", uk: "Спитай, чий це бінокль." }, accepted: ["Whose binoculars are these"] },
    { id: "l05c5-10", type: "dialogue", grammarPoint: "l05c5_whose_many", partnerLine: "The snorkel is hers.", situation: { ru: "Спроси, чьи тогда вон те наушники.", uk: "Спитай, чиї тоді он ті навушники." }, accepted: ["Whose earbuds are those"] },
    { id: "l05c5-11", type: "dialogue", grammarPoint: "l05c5_answer", partnerLine: "The trophy is mine.", situation: { ru: "Возрази: кубок твоего двоюродного брата.", uk: "Заперечи: кубок твого двоюрідного брата." }, accepted: ["The trophy is my cousin's."] },
    { id: "l05c5-12", type: "dialogue", grammarPoint: "l05c5_answer", partnerLine: "The mouse is mine.", situation: { ru: "Возрази: мышка не его.", uk: "Заперечи: мишка не його." }, accepted: ["The mouse isn't yours."] },
    { id: "l05c5-13", type: "fix", grammarPoint: "l05c5_whose_one", wrong: "Whose tie are this", accepted: ["Whose tie is this"] },
    { id: "l05c5-14", type: "fix", grammarPoint: "l05c5_whose_many", wrong: "Whose goggles is these", accepted: ["Whose goggles are these"] },
    { id: "l05c5-15", type: "fix", grammarPoint: "l05c5_answer", wrong: "The brooch is her.", accepted: ["The brooch is hers."] },
    { id: "l05c5-16", type: "fix", grammarPoint: "l05c5_answer", wrong: "The earrings is mine.", accepted: ["The earrings are mine."] },
  ],
};
