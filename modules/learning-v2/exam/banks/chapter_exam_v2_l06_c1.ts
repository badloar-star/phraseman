// chapter_exam_v2_l06_c1.ts — банк экзамена v2: урок 6, глава 1 (эпизоды 1–8).
// зачем (слово владельца 26.10: экзамены глав v2 для всех уроков, войдут в 2.0.3; правила — docs/work/factory-exam-banks-task-for-codex-2026-10-25.md):
// каждое английское слово реплики, фразы с ошибкой и всех принятых ответов уже встречалось в эпизодах 1–8 урока 6
// (сторож tests/owner_locks_exam_episode_words_2026_10_25.test.ts); ситуация и ответ сходятся по смыслу; вопросы со знаком «?» (с 92b29de96 запрет только для урока 1).
// Глава 1: I / you + действие без am / are (1, 2, 6), we / they + действие (3, 4, 5), два действия подряд с and (7, 8).
// Подключение в приложении (BANKS) — Learning V2 после вычитки владельцем; читабельный вид — docs/work/exam-banks/l06.md.
import type { ChapterExamV2Bank } from '../chapter_exam_v2';

export const CHAPTER_EXAM_V2_BANK_L06_C1: ChapterExamV2Bank = {
  lessonOrdinal: 6,
  chapterOrdinal: 1,
  grammarPoints: [
    { id: "l06c1_i_you", label: { ru: "я / ты делаешь — I work, you carry", uk: "я / ти робиш — I work, you carry" }, episodeOrdinals: [1, 2, 6] },
    { id: "l06c1_we_they", label: { ru: "мы / они делают — we mow, they build", uk: "ми / вони роблять — we mow, they build" }, episodeOrdinals: [3, 4, 5] },
    { id: "l06c1_two", label: { ru: "два действия — I chop… and I stir…", uk: "дві дії — I chop… and I stir…" }, episodeOrdinals: [7, 8] },
  ],
  items: [
    { id: "l06c1-01", type: "situation", grammarPoint: "l06c1_i_you", situation: { ru: "Новый знакомый спрашивает, где ты работаешь. Скажи, что в аптеке.", uk: "Новий знайомий питає, де ти працюєш. Скажи, що в аптеці." }, accepted: ["I work in a pharmacy."] },
    { id: "l06c1-02", type: "situation", grammarPoint: "l06c1_i_you", situation: { ru: "Сосед спрашивает, как ты добираешься по парку. Скажи, что ездишь на велосипеде.", uk: "Сусід питає, як ти добираєшся парком. Скажи, що їздиш на велосипеді." }, accepted: ["I ride a bicycle in the park.", "I ride a bicycle."] },
    { id: "l06c1-03", type: "situation", grammarPoint: "l06c1_we_they", situation: { ru: "Тётя спрашивает, что вы делаете в саду. Скажи, что вы стрижёте газон.", uk: "Тітка питає, що ви робите в саду. Скажи, що ви косите газон." }, accepted: ["We mow the lawn.", "We mow the lawn in the garden."] },
    { id: "l06c1-04", type: "situation", grammarPoint: "l06c1_we_they", situation: { ru: "Друг смотрит на стройку. Скажи, что они строят стену.", uk: "Друг дивиться на будову. Скажи, що вони будують стіну." }, accepted: ["They build a wall."] },
    { id: "l06c1-05", type: "situation", grammarPoint: "l06c1_two", situation: { ru: "Ты готовишь ужин. Скажи, что режешь лук и мешаешь суп.", uk: "Ти готуєш вечерю. Скажи, що ріжеш цибулю й мішаєш суп." }, accepted: ["I chop onions and I stir the soup."] },
    { id: "l06c1-06", type: "situation", grammarPoint: "l06c1_two", situation: { ru: "Мама спрашивает про стирку. Скажи, что вы складываете полотенца и вешаете рубашки.", uk: "Мама питає про прання. Скажи, що ви складаєте рушники й вішаєте сорочки." }, accepted: ["We fold the towels and we hang the shirts."] },
    { id: "l06c1-07", type: "dialogue", grammarPoint: "l06c1_i_you", partnerLine: "I wash the plates.", situation: { ru: "Распредели дела: друг подметает пол.", uk: "Розподіли справи: друг підмітає підлогу." }, accepted: ["You sweep the floor."] },
    { id: "l06c1-08", type: "dialogue", grammarPoint: "l06c1_i_you", partnerLine: "You carry the trays.", situation: { ru: "Скажи, что ты моешь чашки.", uk: "Скажи, що ти миєш чашки." }, accepted: ["I wash the cups."] },
    { id: "l06c1-09", type: "dialogue", grammarPoint: "l06c1_we_they", partnerLine: "We pack the bags.", situation: { ru: "Добавь: они взвешивают сливы.", uk: "Додай: вони зважують сливи." }, accepted: ["They weigh the plums."] },
    { id: "l06c1-10", type: "dialogue", grammarPoint: "l06c1_we_they", partnerLine: "They run in the park.", situation: { ru: "Скажи, что вы играете в футбол во дворе.", uk: "Скажи, що ви граєте у футбол у дворі." }, accepted: ["We play football in the yard.", "We play football."] },
    { id: "l06c1-11", type: "dialogue", grammarPoint: "l06c1_two", partnerLine: "I chop onions.", situation: { ru: "Скажи, что ты подаёшь суп и подаёшь салат.", uk: "Скажи, що ти подаєш суп і подаєш салат." }, accepted: ["You serve the soup and you serve the salad."] },
    { id: "l06c1-12", type: "dialogue", grammarPoint: "l06c1_two", partnerLine: "We bake bread.", situation: { ru: "Добавь: вы печёте хлеб и моете тарелки.", uk: "Додай: ви печете хліб і миєте тарілки." }, accepted: ["We bake bread and we wash the plates."] },
    { id: "l06c1-13", type: "fix", grammarPoint: "l06c1_i_you", wrong: "I am work in a bakery.", accepted: ["I work in a bakery."] },
    { id: "l06c1-14", type: "fix", grammarPoint: "l06c1_we_they", wrong: "They are dig in the yard.", accepted: ["They dig in the yard."] },
    { id: "l06c1-15", type: "fix", grammarPoint: "l06c1_two", wrong: "I am chop onions and I stir the soup.", accepted: ["I chop onions and I stir the soup."] },
    { id: "l06c1-16", type: "fix", grammarPoint: "l06c1_we_they", wrong: "We are pick pears.", accepted: ["We pick pears."] },
  ],
};
