// chapter_exam_v2_l07_c6.ts — банк экзамена v2: урок 7, глава 6 (эпизоды 41–48).
// зачем (слово владельца 26.10: экзамены глав v2 для всех уроков, войдут в 2.0.3; правила — docs/work/factory-exam-banks-task-for-codex-2026-10-25.md):
// каждое английское слово реплики, фразы с ошибкой и всех принятых ответов уже встречалось в эпизодах 1–48 урока 7
// (сторож tests/owner_locks_exam_episode_words_2026_10_25.test.ts); ситуация и ответ сходятся по смыслу; вопросы со знаком «?» (с 92b29de96 запрет только для урока 1).
// Глава 6: мои привычки дома, в магазине, в дороге (41, 42, 44), привычки других с s (43, 45, 47), вопросы о привычке и «Где…» (46, 48).
// Подключение в приложении (BANKS) — Learning V2 после вычитки владельцем; читабельный вид — docs/work/exam-banks/l07.md.
import type { ChapterExamV2Bank } from '../chapter_exam_v2';

export const CHAPTER_EXAM_V2_BANK_L07_C6: ChapterExamV2Bank = {
  lessonOrdinal: 7,
  chapterOrdinal: 6,
  grammarPoints: [
    { id: "l07c6_i", label: { ru: "мои привычки — I usually wake early", uk: "мої звички — I usually wake early" }, episodeOrdinals: [41, 42, 44] },
    { id: "l07c6_he_s", label: { ru: "привычки других — my boss usually works late", uk: "звички інших — my boss usually works late" }, episodeOrdinals: [43, 45, 47] },
    { id: "l07c6_ask", label: { ru: "спросить — Where is…, Do you often…", uk: "спитати — Where is…, Do you often…" }, episodeOrdinals: [46, 48] },
  ],
  items: [
    { id: "l07c6-01", type: "situation", grammarPoint: "l07c6_i", situation: { ru: "Друг удивлён, что ты бодр утром. Скажи, что обычно встаёшь рано.", uk: "Друг здивований, що ти бадьорий уранці. Скажи, що зазвичай встаєш рано." }, accepted: ["I usually wake early."] },
    { id: "l07c6-02", type: "situation", grammarPoint: "l07c6_i", situation: { ru: "В магазине продавец советует пальто. Скажи, что обычно сначала проверяешь цену.", uk: "У магазині продавець радить пальто. Скажи, що зазвичай спершу перевіряєш ціну." }, accepted: ["I usually check the price."] },
    { id: "l07c6-03", type: "situation", grammarPoint: "l07c6_he_s", situation: { ru: "Коллега спрашивает про начальника. Скажи, что он обычно работает допоздна.", uk: "Колега питає про начальника. Скажи, що він зазвичай працює допізна." }, accepted: ["My boss usually works late."] },
    { id: "l07c6-04", type: "situation", grammarPoint: "l07c6_he_s", situation: { ru: "Фармацевт спрашивает про брата. Скажи, что у него часто болит голова.", uk: "Фармацевт питає про брата. Скажи, що в нього часто болить голова." }, accepted: ["My brother often has a headache."] },
    { id: "l07c6-05", type: "situation", grammarPoint: "l07c6_ask", situation: { ru: "Ты готовишь ужин в гостях. Спроси, где сыр.", uk: "Ти готуєш вечерю в гостях. Спитай, де сир." }, accepted: ["Where is the cheese?"] },
    { id: "l07c6-06", type: "situation", grammarPoint: "l07c6_ask", situation: { ru: "Друг снова ищет ключ. Спроси, часто ли он забывает ключ.", uk: "Друг знову шукає ключ. Спитай, чи часто він забуває ключ." }, accepted: ["Do you often forget the key?"] },
    { id: "l07c6-07", type: "dialogue", grammarPoint: "l07c6_i", partnerLine: "My brother often misses the bus.", situation: { ru: "Скажи, что ты обычно оплачиваешь проезд.", uk: "Скажи, що ти зазвичай оплачуєш проїзд." }, accepted: ["I usually pay the fare."] },
    { id: "l07c6-08", type: "dialogue", grammarPoint: "l07c6_i", partnerLine: "My sister often cancels orders.", situation: { ru: "Скажи, что ты часто покупаешь подарок.", uk: "Скажи, що ти часто купуєш подарунок." }, accepted: ["I often buy a present."] },
    { id: "l07c6-09", type: "dialogue", grammarPoint: "l07c6_he_s", partnerLine: "I often forget the key.", situation: { ru: "Добавь: сосед тоже часто забывает ключ.", uk: "Додай: сусід теж часто забуває ключ." }, accepted: ["My neighbour often forgets the key."] },
    { id: "l07c6-10", type: "dialogue", grammarPoint: "l07c6_he_s", partnerLine: "I often email my colleague.", situation: { ru: "Добавь: сестра часто пишет начальнику.", uk: "Додай: сестра часто пише начальникові." }, accepted: ["My sister often emails her boss."] },
    { id: "l07c6-11", type: "dialogue", grammarPoint: "l07c6_ask", partnerLine: "My brother often whisks the eggs.", situation: { ru: "Спроси, где десерт.", uk: "Спитай, де десерт." }, accepted: ["Where is the dessert?"] },
    { id: "l07c6-12", type: "dialogue", grammarPoint: "l07c6_ask", partnerLine: "My brother often misses the bus.", situation: { ru: "Спроси, часто ли твой брат опаздывает на автобус.", uk: "Спитай, чи часто твій брат запізнюється на автобус." }, accepted: ["Does your brother often miss the bus?"] },
    { id: "l07c6-13", type: "fix", grammarPoint: "l07c6_i", wrong: "I wake usually early.", accepted: ["I usually wake early."] },
    { id: "l07c6-14", type: "fix", grammarPoint: "l07c6_he_s", wrong: "My neighbour often forget the key.", accepted: ["My neighbour often forgets the key."] },
    { id: "l07c6-15", type: "fix", grammarPoint: "l07c6_ask", wrong: "Do you forget often the key?", accepted: ["Do you often forget the key?"] },
    { id: "l07c6-16", type: "fix", grammarPoint: "l07c6_he_s", wrong: "My boss usually work late.", accepted: ["My boss usually works late."] },
  ],
};
