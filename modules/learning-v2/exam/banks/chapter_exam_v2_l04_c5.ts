// chapter_exam_v2_l04_c5.ts — банк экзамена v2: урок 4, глава 5 (эпизоды 33–40).
// зачем (слово владельца 26.10: экзамены глав v2 для всех уроков, войдут в 2.0.3; правила — docs/work/factory-exam-banks-task-for-codex-2026-10-25.md):
// каждое английское слово реплики, фразы с ошибкой и всех принятых ответов уже встречалось в эпизодах 1–40 урока 4
// (сторож tests/owner_locks_exam_episode_words_2026_10_25.test.ts); ситуация и ответ сходятся по смыслу; вопросы без «?» — общий тест правил банков.
// Глава 5: There isn’t a (33, 35, 39), There aren’t any (34, 35, 40), известная вещь не здесь или не такая — The tap isn’t here (38, 39).
// Подключение в приложении (BANKS) — Learning V2 после вычитки владельцем; читабельный вид — docs/work/exam-banks/l04.md.
import type { ChapterExamV2Bank } from '../chapter_exam_v2';

export const CHAPTER_EXAM_V2_BANK_L04_C5: ChapterExamV2Bank = {
  lessonOrdinal: 4,
  chapterOrdinal: 5,
  grammarPoints: [
    { id: "l04c5_isnt_a", label: { ru: "нет одного — There isn’t a…", uk: "немає одного — There isn’t a…" }, episodeOrdinals: [33, 35, 39] },
    { id: "l04c5_arent_any", label: { ru: "нет ни одного — There aren’t any…", uk: "немає жодного — There aren’t any…" }, episodeOrdinals: [34, 35, 40] },
    { id: "l04c5_known", label: { ru: "эта вещь не здесь / не такая — The… isn’t…", uk: "ця річ не тут / не така — The… isn’t…" }, episodeOrdinals: [38, 39] },
  ],
  items: [
    { id: "l04c5-01", type: "situation", grammarPoint: "l04c5_isnt_a", situation: { ru: "Курьер звонит: не может найти звонок. Скажи, что звонка нет.", uk: "Кур’єр телефонує: не може знайти дзвінок. Скажи, що дзвінка немає." }, accepted: ["There isn't a doorbell."] },
    { id: "l04c5-02", type: "situation", grammarPoint: "l04c5_arent_any", situation: { ru: "Гость с тяжёлым чемоданом ищет лифт. Скажи, что лифтов нет.", uk: "Гість із важкою валізою шукає ліфт. Скажи, що ліфтів немає." }, accepted: ["There aren't any lifts."] },
    { id: "l04c5-03", type: "situation", grammarPoint: "l04c5_isnt_a", situation: { ru: "Друг на коляске спрашивает про вход. Скажи, что у входа нет пандуса.", uk: "Друг на візку питає про вхід. Скажи, що біля входу немає пандуса." }, accepted: ["There isn't a ramp at the entrance."] },
    { id: "l04c5-04", type: "situation", grammarPoint: "l04c5_arent_any", situation: { ru: "Пожилая соседка боится лестницы. Скажи, что на лестнице нет перил.", uk: "Літня сусідка боїться сходів. Скажи, що на сходах немає поручнів." }, accepted: ["There aren't any handrails on the stairs."] },
    { id: "l04c5-05", type: "situation", grammarPoint: "l04c5_known", situation: { ru: "Мастер пришёл чинить бойлер. Скажи, что он не сломан.", uk: "Майстер прийшов лагодити бойлер. Скажи, що він не зламаний." }, accepted: ["The boiler isn't broken."] },
    { id: "l04c5-06", type: "situation", grammarPoint: "l04c5_known", situation: { ru: "Хозяйка спрашивает, где кран. Скажи, что его здесь нет.", uk: "Господиня питає, де кран. Скажи, що його тут немає." }, accepted: ["The tap isn't here."] },
    { id: "l04c5-07", type: "dialogue", grammarPoint: "l04c5_isnt_a", partnerLine: "There is a key on the table.", situation: { ru: "Возрази: ключа на столе нет.", uk: "Заперечи: ключа на столі немає." }, accepted: ["There isn't a key on the table."] },
    { id: "l04c5-08", type: "dialogue", grammarPoint: "l04c5_arent_any", partnerLine: "There are some chairs in the hall.", situation: { ru: "Возрази: стульев в зале нет.", uk: "Заперечи: стільців у залі немає." }, accepted: ["There aren't any chairs in the hall."] },
    { id: "l04c5-09", type: "dialogue", grammarPoint: "l04c5_isnt_a", partnerLine: "There is a lift in the building.", situation: { ru: "Возрази: лифта в здании нет.", uk: "Заперечи: ліфта в будівлі немає." }, accepted: ["There isn't a lift in the building."] },
    { id: "l04c5-10", type: "dialogue", grammarPoint: "l04c5_arent_any", partnerLine: "There are lamps on the ceiling.", situation: { ru: "Возрази: ламп на потолке нет.", uk: "Заперечи: ламп на стелі немає." }, accepted: ["There aren't any lamps on the ceiling."] },
    { id: "l04c5-11", type: "dialogue", grammarPoint: "l04c5_known", partnerLine: "The heater is broken.", situation: { ru: "Возрази: обогреватель не сломан.", uk: "Заперечи: обігрівач не зламаний." }, accepted: ["The heater isn't broken."] },
    { id: "l04c5-12", type: "dialogue", grammarPoint: "l04c5_known", partnerLine: "The boiler is in the basement.", situation: { ru: "Поправь: бойлера здесь нет.", uk: "Виправ: бойлера тут немає." }, accepted: ["The boiler isn't here."] },
    { id: "l04c5-13", type: "fix", grammarPoint: "l04c5_isnt_a", wrong: "There aren't a lift.", accepted: ["There isn't a lift."] },
    { id: "l04c5-14", type: "fix", grammarPoint: "l04c5_arent_any", wrong: "There isn't any stairs.", accepted: ["There aren't any stairs."] },
    { id: "l04c5-15", type: "fix", grammarPoint: "l04c5_known", wrong: "The tap aren't hot.", accepted: ["The tap isn't hot."] },
    { id: "l04c5-16", type: "fix", grammarPoint: "l04c5_arent_any", wrong: "There aren't any window here.", accepted: ["There aren't any windows here."] },
  ],
};
