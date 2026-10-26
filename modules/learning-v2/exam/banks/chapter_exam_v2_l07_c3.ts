// chapter_exam_v2_l07_c3.ts — банк экзамена v2: урок 7, глава 3 (эпизоды 17–24).
// зачем (слово владельца 26.10: экзамены глав v2 для всех уроков, войдут в 2.0.3; правила — docs/work/factory-exam-banks-task-for-codex-2026-10-25.md):
// каждое английское слово реплики, фразы с ошибкой и всех принятых ответов уже встречалось в эпизодах 1–24 урока 7
// (сторож tests/owner_locks_exam_episode_words_2026_10_25.test.ts); ситуация и ответ сходятся по смыслу; вопросы со знаком «?» (с 92b29de96 запрет только для урока 1).
// Глава 3: I don’t… (17, 19, 22), he / she doesn’t… (18, 20, 21), вещь не работает — doesn’t work (17, 23, 24).
// Подключение в приложении (BANKS) — Learning V2 после вычитки владельцем; читабельный вид — docs/work/exam-banks/l07.md.
import type { ChapterExamV2Bank } from '../chapter_exam_v2';

export const CHAPTER_EXAM_V2_BANK_L07_C3: ChapterExamV2Bank = {
  lessonOrdinal: 7,
  chapterOrdinal: 3,
  grammarPoints: [
    { id: "l07c3_i_dont", label: { ru: "я не — I don’t…", uk: "я не — I don’t…" }, episodeOrdinals: [17, 19, 22] },
    { id: "l07c3_he_doesnt", label: { ru: "он / она не — he doesn’t…", uk: "він / вона не — he doesn’t…" }, episodeOrdinals: [18, 20, 21] },
    { id: "l07c3_thing", label: { ru: "не работает — The horn doesn’t work", uk: "не працює — The horn doesn’t work" }, episodeOrdinals: [17, 23, 24] },
  ],
  items: [
    { id: "l07c3-01", type: "situation", grammarPoint: "l07c3_i_dont", situation: { ru: "Коллеги обсуждают начальника за спиной. Скажи, что ты не сплетничаешь.", uk: "Колеги обговорюють начальника за спиною. Скажи, що ти не пліткуєш." }, accepted: ["I don't gossip."] },
    { id: "l07c3-02", type: "situation", grammarPoint: "l07c3_i_dont", situation: { ru: "Друг предлагает подвезти тебя на твоей машине. Скажи, что ты не водишь.", uk: "Друг пропонує підвезти тебе твоєю машиною. Скажи, що ти не водиш." }, accepted: ["I don't drive."] },
    { id: "l07c3-03", type: "situation", grammarPoint: "l07c3_he_doesnt", situation: { ru: "Тебя спрашивают про брата. Скажи, что он не кричит.", uk: "Тебе питають про брата. Скажи, що він не кричить." }, accepted: ["He doesn't shout."] },
    { id: "l07c3-04", type: "situation", grammarPoint: "l07c3_he_doesnt", situation: { ru: "Подругу спрашивают, есть ли у её друга дом. Скажи за неё: у него нет дома.", uk: "Подругу питають, чи є в її друга будинок. Скажи за неї: у нього немає будинку." }, accepted: ["He doesn't have a house."] },
    { id: "l07c3-05", type: "situation", grammarPoint: "l07c3_thing", situation: { ru: "Ты сигналишь, но тихо. Скажи, что гудок не работает.", uk: "Ти сигналиш, але тихо. Скажи, що клаксон не працює." }, accepted: ["The horn doesn't work."] },
    { id: "l07c3-06", type: "situation", grammarPoint: "l07c3_thing", situation: { ru: "Вечером на стадионе темно. Скажи, что прожектор не работает.", uk: "Увечері на стадіоні темно. Скажи, що прожектор не працює." }, accepted: ["The floodlight doesn't work."] },
    { id: "l07c3-07", type: "dialogue", grammarPoint: "l07c3_i_dont", partnerLine: "You argue.", situation: { ru: "Возрази: ты не споришь.", uk: "Заперечи: ти не сперечаєшся." }, accepted: ["I don't argue."] },
    { id: "l07c3-08", type: "dialogue", grammarPoint: "l07c3_i_dont", partnerLine: "You have money.", situation: { ru: "Возрази: денег у тебя нет.", uk: "Заперечи: грошей у тебе немає." }, accepted: ["I don't have money."] },
    { id: "l07c3-09", type: "dialogue", grammarPoint: "l07c3_he_doesnt", partnerLine: "I don't lie.", situation: { ru: "Скажи, что и он не лжёт.", uk: "Скажи, що й він не бреше." }, accepted: ["He doesn't lie."] },
    { id: "l07c3-10", type: "dialogue", grammarPoint: "l07c3_he_doesnt", partnerLine: "I don't complain.", situation: { ru: "Скажи, что и она не жалуется.", uk: "Скажи, що й вона не скаржиться." }, accepted: ["She doesn't complain."] },
    { id: "l07c3-11", type: "dialogue", grammarPoint: "l07c3_thing", partnerLine: "The horn works.", situation: { ru: "Возрази: гудок не работает.", uk: "Заперечи: клаксон не працює." }, accepted: ["The horn doesn't work."] },
    { id: "l07c3-12", type: "dialogue", grammarPoint: "l07c3_thing", partnerLine: "I don't cheat.", situation: { ru: "Скажи, что и он не жульничает.", uk: "Скажи, що й він не шахраює." }, accepted: ["He doesn't cheat."] },
    { id: "l07c3-13", type: "fix", grammarPoint: "l07c3_i_dont", wrong: "I doesn't brag.", accepted: ["I don't brag."] },
    { id: "l07c3-14", type: "fix", grammarPoint: "l07c3_he_doesnt", wrong: "He don't argue.", accepted: ["He doesn't argue."] },
    { id: "l07c3-15", type: "fix", grammarPoint: "l07c3_thing", wrong: "The floodlight don't work.", accepted: ["The floodlight doesn't work."] },
    { id: "l07c3-16", type: "fix", grammarPoint: "l07c3_i_dont", wrong: "I doesn't shout.", accepted: ["I don't shout."] },
  ],
};
