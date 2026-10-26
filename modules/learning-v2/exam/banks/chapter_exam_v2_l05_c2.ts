// chapter_exam_v2_l05_c2.ts — банк экзамена v2: урок 5, глава 2 (эпизоды 9–16).
// зачем (слово владельца 26.10: экзамены глав v2 для всех уроков, войдут в 2.0.3; правила — docs/work/factory-exam-banks-task-for-codex-2026-10-25.md):
// каждое английское слово реплики, фразы с ошибкой и всех принятых ответов уже встречалось в эпизодах 1–16 урока 5
// (сторож tests/owner_locks_exam_episode_words_2026_10_25.test.ts); ситуация и ответ сходятся по смыслу; вопросы со знаком «?» (с 92b29de96 запрет только для урока 1).
// Глава 2: my, your, his, her, our, their (9, 10, 12), Is this your…? / It is my… (11, 16), родственники и its (13, 14, 15).
// Подключение в приложении (BANKS) — Learning V2 после вычитки владельцем; читабельный вид — docs/work/exam-banks/l05.md.
import type { ChapterExamV2Bank } from '../chapter_exam_v2';

export const CHAPTER_EXAM_V2_BANK_L05_C2: ChapterExamV2Bank = {
  lessonOrdinal: 5,
  chapterOrdinal: 2,
  grammarPoints: [
    { id: "l05c2_poss", label: { ru: "чья вещь — my, your, his, her, our, their", uk: "чия річ — my, your, his, her, our, their" }, episodeOrdinals: [9, 10, 12] },
    { id: "l05c2_is_this", label: { ru: "это твоё — Is this your…, It is my…", uk: "це твоє — Is this your…, It is my…" }, episodeOrdinals: [11, 16] },
    { id: "l05c2_family_its", label: { ru: "родные и its — my aunt, its collar", uk: "рідні та its — my aunt, its collar" }, episodeOrdinals: [13, 14, 15] },
  ],
  items: [
    { id: "l05c2-01", type: "situation", grammarPoint: "l05c2_poss", situation: { ru: "Коллега ищет свою кружку. Скажи, что его кружка на столе.", uk: "Колега шукає свою чашку. Скажи, що його чашка на столі." }, accepted: ["Your mug is on the table."] },
    { id: "l05c2-02", type: "situation", grammarPoint: "l05c2_poss", situation: { ru: "Кондуктор просит билет. Скажи, что твой билет у тебя в кармане.", uk: "Кондуктор просить квиток. Скажи, що твій квиток у тебе в кишені." }, accepted: ["My ticket is in my pocket."] },
    { id: "l05c2-03", type: "situation", grammarPoint: "l05c2_is_this", situation: { ru: "В холле отеля лежит паспорт. Спроси гостя, его ли это паспорт.", uk: "У холі готелю лежить паспорт. Спитай гостя, чи це його паспорт." }, accepted: ["Is this your passport?"] },
    { id: "l05c2-04", type: "situation", grammarPoint: "l05c2_is_this", situation: { ru: "Подруга держит фотоаппарат и сомневается. Скажи, что это её фотоаппарат.", uk: "Подруга тримає фотоапарат і вагається. Скажи, що це її фотоапарат." }, accepted: ["It is her camera."] },
    { id: "l05c2-05", type: "situation", grammarPoint: "l05c2_family_its", situation: { ru: "Гость спрашивает, где твоя тётя. Скажи, что она на кухне.", uk: "Гість питає, де твоя тітка. Скажи, що вона на кухні." }, accepted: ["My aunt is in the kitchen."] },
    { id: "l05c2-06", type: "situation", grammarPoint: "l05c2_family_its", situation: { ru: "Соседка хвалит вашего щенка. Скажи, что его ошейник новый.", uk: "Сусідка хвалить вашого цуценя. Скажи, що його нашийник новий." }, accepted: ["Its collar is new."] },
    { id: "l05c2-07", type: "dialogue", grammarPoint: "l05c2_poss", partnerLine: "Your purse is on the table.", situation: { ru: "Возрази: твой кошелёк у тебя в сумке.", uk: "Заперечи: твій гаманець у тебе в сумці." }, accepted: ["My purse is in my bag."] },
    { id: "l05c2-08", type: "dialogue", grammarPoint: "l05c2_poss", partnerLine: "Their lunchbox is on the shelf.", situation: { ru: "Поправь: их ланчбокс в холодильнике.", uk: "Виправ: їхній ланчбокс у холодильнику." }, accepted: ["Their lunchbox is in the fridge."] },
    { id: "l05c2-09", type: "dialogue", grammarPoint: "l05c2_is_this", partnerLine: "This is your bedroom.", situation: { ru: "Спроси, твоя ли это книжная полка.", uk: "Спитай, чи це твоя книжкова шафа." }, accepted: ["Is this my bookcase?"] },
    { id: "l05c2-10", type: "dialogue", grammarPoint: "l05c2_is_this", partnerLine: "It is my laptop.", situation: { ru: "Возрази: это её ноутбук.", uk: "Заперечи: це її ноутбук." }, accepted: ["It is her laptop."] },
    { id: "l05c2-11", type: "dialogue", grammarPoint: "l05c2_family_its", partnerLine: "My aunt has a dog.", situation: { ru: "Скажи, что у твоей тёти кошка.", uk: "Скажи, що в твоєї тітки кішка." }, accepted: ["My aunt has a cat."] },
    { id: "l05c2-12", type: "dialogue", grammarPoint: "l05c2_family_its", partnerLine: "Her puppy has a long tail.", situation: { ru: "Добавь, что его поводок короткий.", uk: "Додай, що його повідець короткий." }, accepted: ["Its leash is short."] },
    { id: "l05c2-13", type: "fix", grammarPoint: "l05c2_poss", wrong: "My headphones is in her bag.", accepted: ["My headphones are in her bag."] },
    { id: "l05c2-14", type: "fix", grammarPoint: "l05c2_poss", wrong: "This is your pencils.", accepted: ["These are your pencils."] },
    { id: "l05c2-15", type: "fix", grammarPoint: "l05c2_family_its", wrong: "Her puppy have a long tail.", accepted: ["Her puppy has a long tail."] },
    { id: "l05c2-16", type: "fix", grammarPoint: "l05c2_is_this", wrong: "Is this you passport?", accepted: ["Is this your passport?"] },
  ],
};
