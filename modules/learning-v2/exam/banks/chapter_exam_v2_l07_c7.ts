// chapter_exam_v2_l07_c7.ts — банк экзамена v2: урок 7, глава 7 (эпизоды 49–56).
// зачем (слово владельца 26.10: экзамены глав v2 для всех уроков, войдут в 2.0.3; правила — docs/work/factory-exam-banks-task-for-codex-2026-10-25.md):
// каждое английское слово реплики, фразы с ошибкой и всех принятых ответов уже встречалось в эпизодах 1–56 урока 7
// (сторож tests/owner_locks_exam_episode_words_2026_10_25.test.ts); ситуация и ответ сходятся по смыслу; вопросы со знаком «?» (с 92b29de96 запрет только для урока 1).
// Глава 7: мои привычки — haggle, swap, prune (49, 52, 54), привычки других с s (50, 51, 55), вопросы — Where is…, Do you accept… (50, 53, 56).
// Подключение в приложении (BANKS) — Learning V2 после вычитки владельцем; читабельный вид — docs/work/exam-banks/l07.md.
import type { ChapterExamV2Bank } from '../chapter_exam_v2';

export const CHAPTER_EXAM_V2_BANK_L07_C7: ChapterExamV2Bank = {
  lessonOrdinal: 7,
  chapterOrdinal: 7,
  grammarPoints: [
    { id: "l07c7_i", label: { ru: "мои привычки — I usually haggle", uk: "мої звички — I usually haggle" }, episodeOrdinals: [49, 52, 54] },
    { id: "l07c7_he_s", label: { ru: "привычки других — she often hails a taxi", uk: "звички інших — she often hails a taxi" }, episodeOrdinals: [50, 51, 55] },
    { id: "l07c7_ask", label: { ru: "спросить — Where is…, Do you accept…", uk: "спитати — Where is…, Do you accept…" }, episodeOrdinals: [50, 53, 56] },
  ],
  items: [
    { id: "l07c7-01", type: "situation", grammarPoint: "l07c7_i", situation: { ru: "На рынке подруга удивляется твоим ценам. Скажи, что обычно торгуешься на рынке.", uk: "На ринку подруга дивується твоїм цінам. Скажи, що зазвичай торгуєшся на ринку." }, accepted: ["I usually haggle at the market."] },
    { id: "l07c7-02", type: "situation", grammarPoint: "l07c7_i", situation: { ru: "Сосед хвалит твой сад. Скажи, что ты часто полешь огород.", uk: "Сусід хвалить твій сад. Скажи, що ти часто полеш город." }, accepted: ["I often weed the garden."] },
    { id: "l07c7-03", type: "situation", grammarPoint: "l07c7_he_s", situation: { ru: "Подруга спрашивает про сестру. Скажи, что она часто ловит такси ночью.", uk: "Подруга питає про сестру. Скажи, що вона часто ловить таксі вночі." }, accepted: ["She often hails a taxi at night."] },
    { id: "l07c7-04", type: "situation", grammarPoint: "l07c7_he_s", situation: { ru: "Тренер спрашивает про брата. Скажи, что он часто потеет в спортзале.", uk: "Тренер питає про брата. Скажи, що він часто пітніє в спортзалі." }, accepted: ["My brother often sweats at the gym."] },
    { id: "l07c7-05", type: "situation", grammarPoint: "l07c7_ask", situation: { ru: "В незнакомом здании тебе нужен гардероб. Спроси, где он.", uk: "У незнайомій будівлі тобі потрібен гардероб. Спитай, де він." }, accepted: ["Where is the cloakroom?"] },
    { id: "l07c7-06", type: "situation", grammarPoint: "l07c7_ask", situation: { ru: "В такси у тебя только карта. Спроси, принимают ли карты.", uk: "У таксі в тебе лише картка. Спитай, чи приймають картки." }, accepted: ["Do you accept cards?"] },
    { id: "l07c7-07", type: "dialogue", grammarPoint: "l07c7_i", partnerLine: "She often mashes potatoes.", situation: { ru: "Скажи, что ты часто растапливаешь масло на сковороде.", uk: "Скажи, що ти часто розтоплюєш масло на сковороді." }, accepted: ["I often melt butter in a pan."] },
    { id: "l07c7-08", type: "dialogue", grammarPoint: "l07c7_i", partnerLine: "My sister often swaps books with a friend.", situation: { ru: "Скажи, что ты тоже часто меняешься книгами с другом.", uk: "Скажи, що ти теж часто обмінюєшся книжками з другом." }, accepted: ["I often swap books with a friend."] },
    { id: "l07c7-09", type: "dialogue", grammarPoint: "l07c7_he_s", partnerLine: "I usually loosen my tie at work.", situation: { ru: "Добавь: она тоже обычно ослабляет галстук на работе.", uk: "Додай: вона теж зазвичай послаблює краватку на роботі." }, accepted: ["She usually loosens her tie at work."] },
    { id: "l07c7-10", type: "dialogue", grammarPoint: "l07c7_he_s", partnerLine: "I usually shiver in cold water.", situation: { ru: "Добавь: он тоже обычно дрожит в холодной воде.", uk: "Додай: він теж зазвичай тремтить у холодній воді." }, accepted: ["He usually shivers in cold water."] },
    { id: "l07c7-11", type: "dialogue", grammarPoint: "l07c7_ask", partnerLine: "The bus usually departs from the terminal.", situation: { ru: "Спроси, где автовокзал.", uk: "Спитай, де автовокзал." }, accepted: ["Where is the bus terminal?"] },
    { id: "l07c7-12", type: "dialogue", grammarPoint: "l07c7_ask", partnerLine: "I often tighten the screws on the chair.", situation: { ru: "Спроси, точит ли он ножницы.", uk: "Спитай, чи гострить він ножиці." }, accepted: ["Do you sharpen scissors?"] },
    { id: "l07c7-13", type: "fix", grammarPoint: "l07c7_i", wrong: "I haggle usually at the market.", accepted: ["I usually haggle at the market."] },
    { id: "l07c7-14", type: "fix", grammarPoint: "l07c7_he_s", wrong: "She often hail a taxi at night.", accepted: ["She often hails a taxi at night."] },
    { id: "l07c7-15", type: "fix", grammarPoint: "l07c7_ask", wrong: "Where the cafeteria is?", accepted: ["Where is the cafeteria?"] },
    { id: "l07c7-16", type: "fix", grammarPoint: "l07c7_he_s", wrong: "He usually prune the hedge.", accepted: ["He usually prunes the hedge."] },
  ],
};
