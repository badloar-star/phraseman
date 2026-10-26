// chapter_exam_v2_l06_c4.ts — банк экзамена v2: урок 6, глава 4 (эпизоды 25–32).
// зачем (слово владельца 26.10: экзамены глав v2 для всех уроков, войдут в 2.0.3; правила — docs/work/factory-exam-banks-task-for-codex-2026-10-25.md):
// каждое английское слово реплики, фразы с ошибкой и всех принятых ответов уже встречалось в эпизодах 1–32 урока 6
// (сторож tests/owner_locks_exam_episode_words_2026_10_25.test.ts); ситуация и ответ сходятся по смыслу; вопросы без «?» — общий тест правил банков.
// Глава 4: мы / они без s — walk, jog, exercise (25, 26, 27), он / она с s — stretches, calls, scrubs (28, 29, 30), утро по привычке (31, 32).
// Подключение в приложении (BANKS) — Learning V2 после вычитки владельцем; читабельный вид — docs/work/exam-banks/l06.md.
import type { ChapterExamV2Bank } from '../chapter_exam_v2';

export const CHAPTER_EXAM_V2_BANK_L06_C4: ChapterExamV2Bank = {
  lessonOrdinal: 6,
  chapterOrdinal: 4,
  grammarPoints: [
    { id: "l06c4_no_s", label: { ru: "мы / они без s — we walk, they jog", uk: "ми / вони без s — we walk, they jog" }, episodeOrdinals: [25, 26, 27] },
    { id: "l06c4_s", label: { ru: "он / она с s — he stretches, she calls", uk: "він / вона з s — he stretches, she calls" }, episodeOrdinals: [28, 29, 30] },
    { id: "l06c4_morning", label: { ru: "утро — she jogs at sunrise, he showers", uk: "ранок — she jogs at sunrise, he showers" }, episodeOrdinals: [31, 32] },
  ],
  items: [
    { id: "l06c4-01", type: "situation", grammarPoint: "l06c4_no_s", situation: { ru: "Коллега спрашивает, как вы добираетесь в офис. Скажи, что вы ходите пешком.", uk: "Колега питає, як ви добираєтеся до офісу. Скажи, що ви ходите пішки." }, accepted: ["We walk to work."] },
    { id: "l06c4-02", type: "situation", grammarPoint: "l06c4_no_s", situation: { ru: "Тренер спрашивает про друзей. Скажи, что они бегают в парке.", uk: "Тренер питає про друзів. Скажи, що вони бігають у парку." }, accepted: ["They jog in the park."] },
    { id: "l06c4-03", type: "situation", grammarPoint: "l06c4_s", situation: { ru: "Врач спрашивает про брата. Скажи, что он делает растяжку дома.", uk: "Лікар питає про брата. Скажи, що він робить розтяжку вдома." }, accepted: ["He stretches at home."] },
    { id: "l06c4-04", type: "situation", grammarPoint: "l06c4_s", situation: { ru: "Подруга спрашивает, кому звонит сестра. Скажи, что она звонит бабушке.", uk: "Подруга питає, кому телефонує сестра. Скажи, що вона телефонує бабусі." }, accepted: ["She calls her grandmother."] },
    { id: "l06c4-05", type: "situation", grammarPoint: "l06c4_morning", situation: { ru: "Сосед видит сестру в парке на рассвете. Скажи, что она бегает на рассвете.", uk: "Сусід бачить сестру в парку на світанку. Скажи, що вона бігає на світанку." }, accepted: ["She jogs at sunrise."] },
    { id: "l06c4-06", type: "situation", grammarPoint: "l06c4_morning", situation: { ru: "Гость спрашивает, где брат. Скажи, что он принимает душ в ванной.", uk: "Гість питає, де брат. Скажи, що він приймає душ у ванній." }, accepted: ["He showers in the bathroom."] },
    { id: "l06c4-07", type: "dialogue", grammarPoint: "l06c4_no_s", partnerLine: "She exercises at home.", situation: { ru: "Скажи, что вы занимаетесь на коврике.", uk: "Скажи, що ви займаєтеся на килимку." }, accepted: ["We exercise on the mat."] },
    { id: "l06c4-08", type: "dialogue", grammarPoint: "l06c4_no_s", partnerLine: "He jogs on the track.", situation: { ru: "Скажи, что ты тоже бегаешь на дорожке.", uk: "Скажи, що ти теж бігаєш на доріжці." }, accepted: ["I jog on the track."] },
    { id: "l06c4-09", type: "dialogue", grammarPoint: "l06c4_s", partnerLine: "We scrub the floor.", situation: { ru: "Добавь: она трёт стол.", uk: "Додай: вона тре стіл." }, accepted: ["She scrubs the table."] },
    { id: "l06c4-10", type: "dialogue", grammarPoint: "l06c4_s", partnerLine: "They call their grandmother.", situation: { ru: "Поправь: брату звонит он.", uk: "Виправ: братові телефонує він." }, accepted: ["He calls his brother."] },
    { id: "l06c4-11", type: "dialogue", grammarPoint: "l06c4_morning", partnerLine: "I walk to work.", situation: { ru: "Добавь: он ходит к холму.", uk: "Додай: він ходить до пагорба." }, accepted: ["He walks to the hill."] },
    { id: "l06c4-12", type: "dialogue", grammarPoint: "l06c4_morning", partnerLine: "We shower at home.", situation: { ru: "Скажи, что он ополаскивает чашку.", uk: "Скажи, що він ополіскує чашку." }, accepted: ["He rinses the cup."] },
    { id: "l06c4-13", type: "fix", grammarPoint: "l06c4_no_s", wrong: "They jogs in the park.", accepted: ["They jog in the park."] },
    { id: "l06c4-14", type: "fix", grammarPoint: "l06c4_s", wrong: "She stretch her shoulder.", accepted: ["She stretches her shoulder."] },
    { id: "l06c4-15", type: "fix", grammarPoint: "l06c4_morning", wrong: "She jog at sunrise.", accepted: ["She jogs at sunrise."] },
    { id: "l06c4-16", type: "fix", grammarPoint: "l06c4_s", wrong: "He scrub the table.", accepted: ["He scrubs the table."] },
  ],
};
