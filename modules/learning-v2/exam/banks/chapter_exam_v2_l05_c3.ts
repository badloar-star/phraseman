// chapter_exam_v2_l05_c3.ts — банк экзамена v2: урок 5, глава 3 (эпизоды 17–24).
// зачем (слово владельца 26.10: экзамены глав v2 для всех уроков, войдут в 2.0.3; правила — docs/work/factory-exam-banks-task-for-codex-2026-10-25.md):
// каждое английское слово реплики, фразы с ошибкой и всех принятых ответов уже встречалось в эпизодах 1–24 урока 5
// (сторож tests/owner_locks_exam_episode_words_2026_10_25.test.ts); ситуация и ответ сходятся по смыслу; вопросы без «?» — общий тест правил банков.
// Глава 3: mine, yours, his, hers, ours, theirs (17, 18, 19), хозяин с ’s (20, 21, 23), whose (22, 24).
// Подключение в приложении (BANKS) — Learning V2 после вычитки владельцем; читабельный вид — docs/work/exam-banks/l05.md.
import type { ChapterExamV2Bank } from '../chapter_exam_v2';

export const CHAPTER_EXAM_V2_BANK_L05_C3: ChapterExamV2Bank = {
  lessonOrdinal: 5,
  chapterOrdinal: 3,
  grammarPoints: [
    { id: "l05c3_mine", label: { ru: "одним словом — mine, yours, his, hers, ours, theirs", uk: "одним словом — mine, yours, his, hers, ours, theirs" }, episodeOrdinals: [17, 18, 19] },
    { id: "l05c3_s", label: { ru: "хозяин с ’s — my husband’s, the manager’s", uk: "власник з ’s — my husband’s, the manager’s" }, episodeOrdinals: [20, 21, 23] },
    { id: "l05c3_whose", label: { ru: "чей — Whose… is this / are these", uk: "чий — Whose… is this / are these" }, episodeOrdinals: [22, 24] },
  ],
  items: [
    { id: "l05c3-01", type: "situation", grammarPoint: "l05c3_mine", situation: { ru: "Друг берёт со скамейки твой шлем. Скажи, что шлем твой.", uk: "Друг бере з лавки твій шолом. Скажи, що шолом твій." }, accepted: ["The helmet is mine."] },
    { id: "l05c3-02", type: "situation", grammarPoint: "l05c3_mine", situation: { ru: "В прихожей два зонта. Скажи, что этот зонт его.", uk: "У передпокої дві парасольки. Скажи, що ця парасолька його." }, accepted: ["The umbrella is his."] },
    { id: "l05c3-03", type: "situation", grammarPoint: "l05c3_s", situation: { ru: "Гостья тянется к кружке на столе. Скажи, что это кружка твоего мужа.", uk: "Гостя тягнеться до чашки на столі. Скажи, що це чашка твого чоловіка." }, accepted: ["The mug is my husband's."] },
    { id: "l05c3-04", type: "situation", grammarPoint: "l05c3_s", situation: { ru: "Курьер нашёл в офисе ключ. Скажи, что ключ менеджера.", uk: "Кур’єр знайшов в офісі ключ. Скажи, що ключ менеджера." }, accepted: ["The key is the manager's."] },
    { id: "l05c3-05", type: "situation", grammarPoint: "l05c3_whose", situation: { ru: "После встречи на столе остался микрофон. Спроси, чей он.", uk: "Після зустрічі на столі лишився мікрофон. Спитай, чий він." }, accepted: ["Whose microphone is this"] },
    { id: "l05c3-06", type: "situation", grammarPoint: "l05c3_whose", situation: { ru: "В раздевалке лежат перчатки. Спроси, чьи они.", uk: "У роздягальні лежать рукавички. Спитай, чиї вони." }, accepted: ["Whose gloves are these"] },
    { id: "l05c3-07", type: "dialogue", grammarPoint: "l05c3_mine", partnerLine: "The diary is yours.", situation: { ru: "Возрази: дневник не твой.", uk: "Заперечи: щоденник не твій." }, accepted: ["It is not mine.", "The diary is not mine."] },
    { id: "l05c3-08", type: "dialogue", grammarPoint: "l05c3_mine", partnerLine: "The rackets are ours.", situation: { ru: "Поправь: ракетки их.", uk: "Виправ: ракетки їхні." }, accepted: ["The rackets are theirs."] },
    { id: "l05c3-09", type: "dialogue", grammarPoint: "l05c3_s", partnerLine: "The scarf is his wife's.", situation: { ru: "Поправь: шарф — твоей дочери.", uk: "Виправ: шарф — твоєї доньки." }, accepted: ["The scarf is my daughter's."] },
    { id: "l05c3-10", type: "dialogue", grammarPoint: "l05c3_s", partnerLine: "The dog is my niece's.", situation: { ru: "Добавь: а воздушный змей — твоего племянника.", uk: "Додай: а повітряний змій — твого племінника." }, accepted: ["The kite is my nephew's."] },
    { id: "l05c3-11", type: "dialogue", grammarPoint: "l05c3_whose", partnerLine: "The microphone is his.", situation: { ru: "Спроси, чья тогда эта перчатка.", uk: "Спитай, чия тоді ця рукавичка." }, accepted: ["Whose glove is this"] },
    { id: "l05c3-12", type: "dialogue", grammarPoint: "l05c3_whose", partnerLine: "These are my sister's glasses.", situation: { ru: "Спроси, чьи тогда вот эти очки.", uk: "Спитай, чиї тоді ось ці окуляри." }, accepted: ["Whose glasses are these"] },
    { id: "l05c3-13", type: "fix", grammarPoint: "l05c3_mine", wrong: "The guitar is my.", accepted: ["The guitar is mine."] },
    { id: "l05c3-14", type: "fix", grammarPoint: "l05c3_s", wrong: "The umbrella is his wife.", accepted: ["The umbrella is his wife's."] },
    { id: "l05c3-15", type: "fix", grammarPoint: "l05c3_whose", wrong: "Whose glasses is this", accepted: ["Whose glasses are these"] },
    { id: "l05c3-16", type: "fix", grammarPoint: "l05c3_s", wrong: "My nephew have a puppy.", accepted: ["My nephew has a puppy."] },
  ],
};
