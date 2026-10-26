// chapter_exam_v2_l06_c7.ts — банк экзамена v2: урок 6, глава 7 (эпизоды 49–56).
// зачем (слово владельца 26.10: экзамены глав v2 для всех уроков, войдут в 2.0.3; правила — docs/work/factory-exam-banks-task-for-codex-2026-10-25.md):
// каждое английское слово реплики, фразы с ошибкой и всех принятых ответов уже встречалось в эпизодах 1–56 урока 6
// (сторож tests/owner_locks_exam_episode_words_2026_10_25.test.ts); ситуация и ответ сходятся по смыслу; вопросы со знаком «?» (с 92b29de96 запрет только для урока 1).
// Глава 7: кто чем занят на работе — delivers, sells, repairs (50, 51, 54, 56), кто что носит — wears (52, 53), чья вещь — whose, mine, hers (49, 53, 55).
// Подключение в приложении (BANKS) — Learning V2 после вычитки владельцем; читабельный вид — docs/work/exam-banks/l06.md.
import type { ChapterExamV2Bank } from '../chapter_exam_v2';

export const CHAPTER_EXAM_V2_BANK_L06_C7: ChapterExamV2Bank = {
  lessonOrdinal: 6,
  chapterOrdinal: 7,
  grammarPoints: [
    { id: "l06c7_work", label: { ru: "работа — delivers, sells, repairs", uk: "робота — delivers, sells, repairs" }, episodeOrdinals: [50, 51, 54, 56] },
    { id: "l06c7_wear", label: { ru: "кто что носит — she wears, we wear", uk: "хто що носить — she wears, we wear" }, episodeOrdinals: [52, 53] },
    { id: "l06c7_whose", label: { ru: "чья вещь — Whose… is this, mine, hers", uk: "чия річ — Whose… is this, mine, hers" }, episodeOrdinals: [49, 53, 55] },
  ],
  items: [
    { id: "l06c7-01", type: "situation", grammarPoint: "l06c7_work", situation: { ru: "Сосед спрашивает, чем занят брат утром. Скажи, что он разносит газеты.", uk: "Сусід питає, чим зайнятий брат уранці. Скажи, що він розносить газети." }, accepted: ["He delivers newspapers.", "My brother delivers newspapers."] },
    { id: "l06c7-02", type: "situation", grammarPoint: "l06c7_work", situation: { ru: "На ярмарке спрашивают про твой прилавок. Скажи, что вы продаёте лампы.", uk: "На ярмарку питають про твій прилавок. Скажи, що ви продаєте лампи." }, accepted: ["We sell lamps."] },
    { id: "l06c7-03", type: "situation", grammarPoint: "l06c7_wear", situation: { ru: "Подруга ищет сестру в толпе. Скажи, что она носит шляпу.", uk: "Подруга шукає сестру в натовпі. Скажи, що вона носить капелюх." }, accepted: ["She wears a hat."] },
    { id: "l06c7-04", type: "situation", grammarPoint: "l06c7_wear", situation: { ru: "Новичок спрашивает про форму. Скажи, что на работе ты носишь форму.", uk: "Новачок питає про форму. Скажи, що на роботі ти носиш форму." }, accepted: ["I wear a uniform."] },
    { id: "l06c7-05", type: "situation", grammarPoint: "l06c7_whose", situation: { ru: "В больнице на стуле лежит стетоскоп. Спроси, чей он.", uk: "У лікарні на стільці лежить стетоскоп. Спитай, чий він." }, accepted: ["Whose stethoscope is this?"] },
    { id: "l06c7-06", type: "situation", grammarPoint: "l06c7_whose", situation: { ru: "Подруга держит кардиган. Скажи, что он её.", uk: "Подруга тримає кардиган. Скажи, що він її." }, accepted: ["This cardigan is hers."] },
    { id: "l06c7-07", type: "dialogue", grammarPoint: "l06c7_work", partnerLine: "They repair gutters.", situation: { ru: "Добавь: вы чините крыши.", uk: "Додай: ви лагодите дахи." }, accepted: ["We repair roofs."] },
    { id: "l06c7-08", type: "dialogue", grammarPoint: "l06c7_work", partnerLine: "This artist paints portraits.", situation: { ru: "Добавь: портной чинит форму.", uk: "Додай: кравець лагодить форму." }, accepted: ["The tailor repairs uniforms."] },
    { id: "l06c7-09", type: "dialogue", grammarPoint: "l06c7_wear", partnerLine: "He wears a suit.", situation: { ru: "Скажи, что она носит юбку.", uk: "Скажи, що вона носить спідницю." }, accepted: ["She wears a skirt."] },
    { id: "l06c7-10", type: "dialogue", grammarPoint: "l06c7_wear", partnerLine: "They wear overalls.", situation: { ru: "Скажи, что он носит козырёк.", uk: "Скажи, що він носить козирок." }, accepted: ["He wears a visor."] },
    { id: "l06c7-11", type: "dialogue", grammarPoint: "l06c7_whose", partnerLine: "The crossword is on the bench.", situation: { ru: "Спроси, чей это кроссворд.", uk: "Спитай, чий це кросворд." }, accepted: ["Whose crossword is this?"] },
    { id: "l06c7-12", type: "dialogue", grammarPoint: "l06c7_whose", partnerLine: "This sketch is hers.", situation: { ru: "Возрази: набросок твой.", uk: "Заперечи: ескіз твій." }, accepted: ["This sketch is mine."] },
    { id: "l06c7-13", type: "fix", grammarPoint: "l06c7_work", wrong: "My brother deliver newspapers.", accepted: ["My brother delivers newspapers."] },
    { id: "l06c7-14", type: "fix", grammarPoint: "l06c7_wear", wrong: "She wear a hood.", accepted: ["She wears a hood."] },
    { id: "l06c7-15", type: "fix", grammarPoint: "l06c7_whose", wrong: "This skirt is her.", accepted: ["This skirt is hers."] },
    { id: "l06c7-16", type: "fix", grammarPoint: "l06c7_work", wrong: "They sells lamps.", accepted: ["They sell lamps."] },
  ],
};
