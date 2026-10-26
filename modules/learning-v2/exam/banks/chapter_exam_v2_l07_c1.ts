// chapter_exam_v2_l07_c1.ts — банк экзамена v2: урок 7, глава 1 (эпизоды 1–8).
// зачем (слово владельца 26.10: экзамены глав v2 для всех уроков, войдут в 2.0.3; правила — docs/work/factory-exam-banks-task-for-codex-2026-10-25.md):
// каждое английское слово реплики, фразы с ошибкой и всех принятых ответов уже встречалось в эпизодах 1–8 урока 7
// (сторож tests/owner_locks_exam_episode_words_2026_10_25.test.ts); ситуация и ответ сходятся по смыслу; вопросы без «?» — общий тест правил банков.
// Глава 1: Do you… (1, 3, 5), Do they… (2, 4, 7), нет — There is no… и am / are при профессии (2, 6, 8).
// Подключение в приложении (BANKS) — Learning V2 после вычитки владельцем; читабельный вид — docs/work/exam-banks/l07.md.
import type { ChapterExamV2Bank } from '../chapter_exam_v2';

export const CHAPTER_EXAM_V2_BANK_L07_C1: ChapterExamV2Bank = {
  lessonOrdinal: 7,
  chapterOrdinal: 1,
  grammarPoints: [
    { id: "l07c1_do_you", label: { ru: "спросить тебя — Do you…", uk: "спитати тебе — Do you…" }, episodeOrdinals: [1, 3, 5] },
    { id: "l07c1_do_they", label: { ru: "спросить про них — Do they…", uk: "спитати про них — Do they…" }, episodeOrdinals: [2, 4, 7] },
    { id: "l07c1_no", label: { ru: "нет — There is no…, Are you a plumber", uk: "немає — There is no…, Are you a plumber" }, episodeOrdinals: [2, 6, 8] },
  ],
  items: [
    { id: "l07c1-01", type: "situation", grammarPoint: "l07c1_do_you", situation: { ru: "На собеседовании на склад спроси кандидата, водит ли он погрузчик.", uk: "На співбесіді на склад спитай кандидата, чи водить він навантажувач." }, accepted: ["Do you drive a forklift"] },
    { id: "l07c1-02", type: "situation", grammarPoint: "l07c1_do_you", situation: { ru: "В копицентре спроси, печатают ли здесь фото.", uk: "У копіцентрі спитай, чи друкують тут фото." }, accepted: ["Do you print photos here", "Do you print photos"] },
    { id: "l07c1-03", type: "situation", grammarPoint: "l07c1_do_they", situation: { ru: "Ты на почте с подругой. Спроси, отправляют ли они здесь посылки.", uk: "Ти на пошті з подругою. Спитай, чи відправляють вони тут посилки." }, accepted: ["Do they send packages here", "Do they send packages"] },
    { id: "l07c1-04", type: "situation", grammarPoint: "l07c1_do_they", situation: { ru: "В кафе спроси, есть ли у них меню.", uk: "У кафе спитай, чи є в них меню." }, accepted: ["Do they have a menu"] },
    { id: "l07c1-05", type: "situation", grammarPoint: "l07c1_no", situation: { ru: "Курьер ищет скотч. Скажи, что скотча здесь нет.", uk: "Кур’єр шукає скотч. Скажи, що скотчу тут немає." }, accepted: ["There is no tape here."] },
    { id: "l07c1-06", type: "situation", grammarPoint: "l07c1_no", situation: { ru: "Хозяйка не понимает, кто ты. Скажи, что ты сантехник.", uk: "Господиня не розуміє, хто ти. Скажи, що ти сантехнік." }, accepted: ["I am a plumber."] },
    { id: "l07c1-07", type: "dialogue", grammarPoint: "l07c1_do_you", partnerLine: "I work in a warehouse.", situation: { ru: "Спроси, работает ли он на фабрике.", uk: "Спитай, чи працює він на фабриці." }, accepted: ["Do you work in a factory"] },
    { id: "l07c1-08", type: "dialogue", grammarPoint: "l07c1_do_you", partnerLine: "We work at night.", situation: { ru: "Спроси, работает ли он и по выходным.", uk: "Спитай, чи працює він і на вихідних." }, accepted: ["Do you work on weekends"] },
    { id: "l07c1-09", type: "dialogue", grammarPoint: "l07c1_do_they", partnerLine: "They work in a warehouse.", situation: { ru: "Спроси, водят ли они погрузчик.", uk: "Спитай, чи водять вони навантажувач." }, accepted: ["Do they drive a forklift"] },
    { id: "l07c1-10", type: "dialogue", grammarPoint: "l07c1_do_they", partnerLine: "We have a schedule.", situation: { ru: "Спроси, сдают ли они мольберты.", uk: "Спитай, чи здають вони мольберти." }, accepted: ["Do they rent easels"] },
    { id: "l07c1-11", type: "dialogue", grammarPoint: "l07c1_no", partnerLine: "There is a voucher here.", situation: { ru: "Возрази: ваучера здесь нет.", uk: "Заперечи: ваучера тут немає." }, accepted: ["There is no voucher here."] },
    { id: "l07c1-12", type: "dialogue", grammarPoint: "l07c1_no", partnerLine: "We are plumbers.", situation: { ru: "Скажи, что ты электрик.", uk: "Скажи, що ти електрик." }, accepted: ["I am an electrician."] },
    { id: "l07c1-13", type: "fix", grammarPoint: "l07c1_do_you", wrong: "Do you works in a factory", accepted: ["Do you work in a factory"] },
    { id: "l07c1-14", type: "fix", grammarPoint: "l07c1_do_they", wrong: "Do they send package", accepted: ["Do they send packages"] },
    { id: "l07c1-15", type: "fix", grammarPoint: "l07c1_no", wrong: "There is not courier here.", accepted: ["There is no courier here."] },
    { id: "l07c1-16", type: "fix", grammarPoint: "l07c1_do_you", wrong: "You do have a key", accepted: ["Do you have a key"] },
  ],
};
