// chapter_exam_v2_l05_c7.ts — банк экзамена v2: урок 5, глава 7 (эпизоды 49–56).
// зачем (слово владельца 26.10: экзамены глав v2 для всех уроков, войдут в 2.0.3; правила — docs/work/factory-exam-banks-task-for-codex-2026-10-25.md):
// каждое английское слово реплики, фразы с ошибкой и всех принятых ответов уже встречалось в эпизодах 1–56 урока 5
// (сторож tests/owner_locks_exam_episode_words_2026_10_25.test.ts); ситуация и ответ сходятся по смыслу; вопросы со знаком «?» (с 92b29de96 запрет только для урока 1).
// Глава 7: whose про гараж, корт, уборку (49, 53, 56), хозяин одним словом или через ’s (50, 52, 55), «это твоё…?» (51, 54).
// Подключение в приложении (BANKS) — Learning V2 после вычитки владельцем; читабельный вид — docs/work/exam-banks/l05.md.
import type { ChapterExamV2Bank } from '../chapter_exam_v2';

export const CHAPTER_EXAM_V2_BANK_L05_C7: ChapterExamV2Bank = {
  lessonOrdinal: 5,
  chapterOrdinal: 7,
  grammarPoints: [
    { id: "l05c7_whose", label: { ru: "чей — Whose… is this / that", uk: "чий — Whose… is this / that" }, episodeOrdinals: [49, 53, 56] },
    { id: "l05c7_owner", label: { ru: "хозяин — his, hers, ours, my brother’s", uk: "власник — his, hers, ours, my brother’s" }, episodeOrdinals: [50, 52, 55] },
    { id: "l05c7_is_this", label: { ru: "это твоё — Is this… yours / your cousin’s", uk: "це твоє — Is this… yours / your cousin’s" }, episodeOrdinals: [51, 54] },
  ],
  items: [
    { id: "l05c7-01", type: "situation", grammarPoint: "l05c7_whose", situation: { ru: "Во дворе открыт гараж. Спроси соседа, чей это гараж.", uk: "У дворі відчинений гараж. Спитай сусіда, чий це гараж." }, accepted: ["Whose garage is that?", "Whose garage is this?"] },
    { id: "l05c7-02", type: "situation", grammarPoint: "l05c7_whose", situation: { ru: "После уборки за дверью осталась швабра. Спроси, чья она.", uk: "Після прибирання за дверима лишилася швабра. Спитай, чия вона." }, accepted: ["Whose mop is this?", "Whose mop is that?"] },
    { id: "l05c7-03", type: "situation", grammarPoint: "l05c7_owner", situation: { ru: "На детской площадке лежит мел. Скажи, что он твой.", uk: "На дитячому майданчику лежить крейда. Скажи, що вона твоя." }, accepted: ["The chalk is mine."] },
    { id: "l05c7-04", type: "situation", grammarPoint: "l05c7_owner", situation: { ru: "На пляже спрашивают про спасательный круг. Скажи, что он ваш.", uk: "На пляжі питають про рятувальний круг. Скажи, що він ваш." }, accepted: ["The lifebelt is ours."] },
    { id: "l05c7-05", type: "situation", grammarPoint: "l05c7_is_this", situation: { ru: "На стадионе лежит футболка. Спроси, не твоего ли двоюродного брата она.", uk: "На стадіоні лежить футболка. Спитай, чи не твого двоюрідного брата вона." }, accepted: ["Is this jersey your cousin's?"] },
    { id: "l05c7-06", type: "situation", grammarPoint: "l05c7_is_this", situation: { ru: "У киоска лежит комикс. Спроси друга, его ли он.", uk: "Біля кіоску лежить комікс. Спитай друга, чи його він." }, accepted: ["Is this comic yours?"] },
    { id: "l05c7-07", type: "dialogue", grammarPoint: "l05c7_whose", partnerLine: "The scoreboard is on the wall.", situation: { ru: "Спроси, чья вон та сетка.", uk: "Спитай, чия он та сітка." }, accepted: ["Whose net is that?"] },
    { id: "l05c7-08", type: "dialogue", grammarPoint: "l05c7_whose", partnerLine: "The brake is on my bicycle.", situation: { ru: "Спроси, чьи вот эти шины.", uk: "Спитай, чиї ось ці шини." }, accepted: ["Whose tyres are these?"] },
    { id: "l05c7-09", type: "dialogue", grammarPoint: "l05c7_owner", partnerLine: "The easel is hers.", situation: { ru: "Возрази: мольберт его.", uk: "Заперечи: мольберт його." }, accepted: ["The easel is his."] },
    { id: "l05c7-10", type: "dialogue", grammarPoint: "l05c7_owner", partnerLine: "The hoop is my brother's.", situation: { ru: "Возрази: обруч его, а мел её.", uk: "Заперечи: обруч його, а крейда її." }, accepted: ["The chalk is hers."] },
    { id: "l05c7-11", type: "dialogue", grammarPoint: "l05c7_is_this", partnerLine: "The balloon is in the bag.", situation: { ru: "Спроси, не сестры ли этот шарик.", uk: "Спитай, чи не сестри ця кулька." }, accepted: ["Is this balloon your sister's?"] },
    { id: "l05c7-12", type: "dialogue", grammarPoint: "l05c7_is_this", partnerLine: "The mop is behind the door.", situation: { ru: "Спроси, не соседа ли эта швабра.", uk: "Спитай, чи не сусіда ця швабра." }, accepted: ["Is this mop your neighbour's?"] },
    { id: "l05c7-13", type: "fix", grammarPoint: "l05c7_whose", wrong: "Whose brooms is these?", accepted: ["Whose brooms are these?"] },
    { id: "l05c7-14", type: "fix", grammarPoint: "l05c7_owner", wrong: "The broom is our.", accepted: ["The broom is ours."] },
    { id: "l05c7-15", type: "fix", grammarPoint: "l05c7_is_this", wrong: "Is this comic your?", accepted: ["Is this comic yours?"] },
    { id: "l05c7-16", type: "fix", grammarPoint: "l05c7_owner", wrong: "The deckchair is her.", accepted: ["The deckchair is hers."] },
  ],
};
