// chapter_exam_v2_l07_c5.ts — банк экзамена v2: урок 7, глава 5 (эпизоды 33–40).
// зачем (слово владельца 26.10: экзамены глав v2 для всех уроков, войдут в 2.0.3; правила — docs/work/factory-exam-banks-task-for-codex-2026-10-25.md):
// каждое английское слово реплики, фразы с ошибкой и всех принятых ответов уже встречалось в эпизодах 1–40 урока 7
// (сторож tests/owner_locks_exam_episode_words_2026_10_25.test.ts); ситуация и ответ сходятся по смыслу; вопросы со знаком «?» (с 92b29de96 запрет только для урока 1).
// Глава 5: I usually / often + действие (33, 35, 37), he / she often + действие с s (34, 36, 38), привычки вперемешку (39, 40).
// Подключение в приложении (BANKS) — Learning V2 после вычитки владельцем; читабельный вид — docs/work/exam-banks/l07.md.
import type { ChapterExamV2Bank } from '../chapter_exam_v2';

export const CHAPTER_EXAM_V2_BANK_L07_C5: ChapterExamV2Bank = {
  lessonOrdinal: 7,
  chapterOrdinal: 5,
  grammarPoints: [
    { id: "l07c5_i", label: { ru: "я обычно / часто — I usually recycle", uk: "я зазвичай / часто — I usually recycle" }, episodeOrdinals: [33, 35, 37] },
    { id: "l07c5_he_s", label: { ru: "он / она + s — he often compares", uk: "він / вона + s — he often compares" }, episodeOrdinals: [34, 36, 38] },
    { id: "l07c5_mixed", label: { ru: "привычки — usually, often", uk: "звички — usually, often" }, episodeOrdinals: [39, 40] },
  ],
  items: [
    { id: "l07c5-01", type: "situation", grammarPoint: "l07c5_i", situation: { ru: "Соседка спрашивает про мусор. Скажи, что ты обычно сортируешь отходы.", uk: "Сусідка питає про сміття. Скажи, що ти зазвичай сортуєш відходи." }, accepted: ["I usually recycle."] },
    { id: "l07c5-02", type: "situation", grammarPoint: "l07c5_i", situation: { ru: "Коллега спрашивает, как ты добираешься. Скажи, что обычно ездишь на автобусе.", uk: "Колега питає, як ти добираєшся. Скажи, що зазвичай їздиш автобусом." }, accepted: ["I usually commute by bus."] },
    { id: "l07c5-03", type: "situation", grammarPoint: "l07c5_he_s", situation: { ru: "Подруга спрашивает про сестру. Скажи, что она часто приносит торт.", uk: "Подруга питає про сестру. Скажи, що вона часто приносить торт." }, accepted: ["She often brings a cake."] },
    { id: "l07c5-04", type: "situation", grammarPoint: "l07c5_he_s", situation: { ru: "Врач спрашивает про мужа. Скажи, что у него часто болит спина.", uk: "Лікар питає про чоловіка. Скажи, що в нього часто болить спина." }, accepted: ["His back often hurts."] },
    { id: "l07c5-05", type: "situation", grammarPoint: "l07c5_mixed", situation: { ru: "Друг зовёт гулять. Скажи, что ты обычно гуляешь в парке.", uk: "Друг кличе гуляти. Скажи, що ти зазвичай гуляєш у парку." }, accepted: ["I usually stroll in the park."] },
    { id: "l07c5-06", type: "situation", grammarPoint: "l07c5_mixed", situation: { ru: "Банковский служащий спрашивает про наличные. Скажи, что ты обычно кладёшь их в банке.", uk: "Банківський службовець питає про готівку. Скажи, що ти зазвичай кладеш її в банку." }, accepted: ["I usually deposit cash at the bank."] },
    { id: "l07c5-07", type: "dialogue", grammarPoint: "l07c5_i", partnerLine: "He often irons shirts.", situation: { ru: "Скажи, что ты обычно разгружаешь посудомойку.", uk: "Скажи, що ти зазвичай розвантажуєш посудомийку." }, accepted: ["I usually unload the dishwasher."] },
    { id: "l07c5-08", type: "dialogue", grammarPoint: "l07c5_i", partnerLine: "She usually refills her bottle.", situation: { ru: "Скажи, что ты часто разогреваешь суп на работе.", uk: "Скажи, що ти часто розігріваєш суп на роботі." }, accepted: ["I often reheat soup at work."] },
    { id: "l07c5-09", type: "dialogue", grammarPoint: "l07c5_he_s", partnerLine: "I often compare phones.", situation: { ru: "Скажи, что он часто сравнивает телефоны.", uk: "Скажи, що він часто порівнює телефони." }, accepted: ["He often compares phones."] },
    { id: "l07c5-10", type: "dialogue", grammarPoint: "l07c5_he_s", partnerLine: "I usually text my sister.", situation: { ru: "Добавь: она обычно отвечает вечером.", uk: "Додай: вона зазвичай відповідає ввечері." }, accepted: ["She usually replies in the evening."] },
    { id: "l07c5-11", type: "dialogue", grammarPoint: "l07c5_mixed", partnerLine: "I often download films.", situation: { ru: "Скажи, что он обычно обновляет телефон.", uk: "Скажи, що він зазвичай оновлює телефон." }, accepted: ["He usually updates his phone."] },
    { id: "l07c5-12", type: "dialogue", grammarPoint: "l07c5_mixed", partnerLine: "I usually deposit cash at the bank.", situation: { ru: "Добавь: он обычно оставляет чаевые официанту.", uk: "Додай: він зазвичай лишає чайові офіціантові." }, accepted: ["He usually tips the waiter."] },
    { id: "l07c5-13", type: "fix", grammarPoint: "l07c5_i", wrong: "I recycle usually.", accepted: ["I usually recycle."] },
    { id: "l07c5-14", type: "fix", grammarPoint: "l07c5_he_s", wrong: "She often bring a cake.", accepted: ["She often brings a cake."] },
    { id: "l07c5-15", type: "fix", grammarPoint: "l07c5_mixed", wrong: "He usually update his phone.", accepted: ["He usually updates his phone."] },
    { id: "l07c5-16", type: "fix", grammarPoint: "l07c5_he_s", wrong: "He often attend lectures.", accepted: ["He often attends lectures."] },
  ],
};
