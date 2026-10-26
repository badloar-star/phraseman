// chapter_exam_v2_l05_c6.ts — банк экзамена v2: урок 5, глава 6 (эпизоды 41–48).
// зачем (слово владельца 26.10: экзамены глав v2 для всех уроков, войдут в 2.0.3; правила — docs/work/factory-exam-banks-task-for-codex-2026-10-25.md):
// каждое английское слово реплики, фразы с ошибкой и всех принятых ответов уже встречалось в эпизодах 1–48 урока 5
// (сторож tests/owner_locks_exam_episode_words_2026_10_25.test.ts); ситуация и ответ сходятся по смыслу; вопросы без «?» — общий тест правил банков.
// Глава 6: whose в шкафчике, в походе, в саду (41, 43, 48), где вещь хозяина — my brother’s… is on… (42, 46, 47), ответ одним словом — hers, mine (44, 45).
// Подключение в приложении (BANKS) — Learning V2 после вычитки владельцем; читабельный вид — docs/work/exam-banks/l05.md.
import type { ChapterExamV2Bank } from '../chapter_exam_v2';

export const CHAPTER_EXAM_V2_BANK_L05_C6: ChapterExamV2Bank = {
  lessonOrdinal: 5,
  chapterOrdinal: 6,
  grammarPoints: [
    { id: "l05c6_whose", label: { ru: "чья — Whose… is this", uk: "чия — Whose… is this" }, episodeOrdinals: [41, 43, 48] },
    { id: "l05c6_where", label: { ru: "где вещь хозяина — my uncle’s tent is under…", uk: "де річ власника — my uncle’s tent is under…" }, episodeOrdinals: [42, 46, 47] },
    { id: "l05c6_word", label: { ru: "одним словом — hers, mine, my colleague’s", uk: "одним словом — hers, mine, my colleague’s" }, episodeOrdinals: [44, 45] },
  ],
  items: [
    { id: "l05c6-01", type: "situation", grammarPoint: "l05c6_whose", situation: { ru: "В раздевалке спортзала висит спортивный костюм. Спроси, чей он.", uk: "У роздягальні спортзалу висить спортивний костюм. Спитай, чий він." }, accepted: ["Whose tracksuit is this"] },
    { id: "l05c6-02", type: "situation", grammarPoint: "l05c6_whose", situation: { ru: "В саду у сарая стоит тачка. Спроси, чья она.", uk: "У саду біля сараю стоїть тачка. Спитай, чия вона." }, accepted: ["Whose wheelbarrow is this"] },
    { id: "l05c6-03", type: "situation", grammarPoint: "l05c6_where", situation: { ru: "В походе друг ищет палатку дяди. Скажи, что она под деревом.", uk: "У поході друг шукає намет дядька. Скажи, що він під деревом." }, accepted: ["My uncle's tent is under the tree."] },
    { id: "l05c6-04", type: "situation", grammarPoint: "l05c6_where", situation: { ru: "На яхте все ищут спасательный жилет брата. Скажи, что он на палубе.", uk: "На яхті всі шукають рятувальний жилет брата. Скажи, що він на палубі." }, accepted: ["My brother's lifejacket is on the deck."] },
    { id: "l05c6-05", type: "situation", grammarPoint: "l05c6_word", situation: { ru: "Коллега спрашивает про гарнитуру. Скажи, что она твоя.", uk: "Колега питає про гарнітуру. Скажи, що вона твоя." }, accepted: ["The headset is mine.", "It is mine."] },
    { id: "l05c6-06", type: "situation", grammarPoint: "l05c6_word", situation: { ru: "Брат держит седло от велосипеда. Скажи, что оно сестры.", uk: "Брат тримає сідло від велосипеда. Скажи, що воно сестри." }, accepted: ["The saddle is my sister's."] },
    { id: "l05c6-07", type: "dialogue", grammarPoint: "l05c6_whose", partnerLine: "The hairclip is on the desk.", situation: { ru: "Спроси, чья это заколка.", uk: "Спитай, чия це заколка." }, accepted: ["Whose hairclip is this"] },
    { id: "l05c6-08", type: "dialogue", grammarPoint: "l05c6_whose", partnerLine: "The rake is behind the shed.", situation: { ru: "Спроси, чьи вот эти грабли.", uk: "Спитай, чиї ось ці граблі." }, accepted: ["Whose rakes are these"] },
    { id: "l05c6-09", type: "dialogue", grammarPoint: "l05c6_where", partnerLine: "The penknife is in my uncle's tent.", situation: { ru: "Добавь: фонарик у тебя в рюкзаке.", uk: "Додай: ліхтарик у тебе в рюкзаку." }, accepted: ["The flashlight is in my backpack."] },
    { id: "l05c6-10", type: "dialogue", grammarPoint: "l05c6_where", partnerLine: "The cello is behind the bench.", situation: { ru: "Добавь: укулеле сестры на скамейке.", uk: "Додай: укулеле сестри на лавці." }, accepted: ["My sister's ukulele is on the bench."] },
    { id: "l05c6-11", type: "dialogue", grammarPoint: "l05c6_word", partnerLine: "The saddle is my brother's.", situation: { ru: "Возрази: седло её.", uk: "Заперечи: сідло її." }, accepted: ["The saddle is hers."] },
    { id: "l05c6-12", type: "dialogue", grammarPoint: "l05c6_word", partnerLine: "The binder is mine.", situation: { ru: "Возрази: папка менеджера.", uk: "Заперечи: папка менеджера." }, accepted: ["The binder is my manager's."] },
    { id: "l05c6-13", type: "fix", grammarPoint: "l05c6_whose", wrong: "Whose tracksuits is these", accepted: ["Whose tracksuits are these"] },
    { id: "l05c6-14", type: "fix", grammarPoint: "l05c6_where", wrong: "My brother keycard is on the bench.", accepted: ["My brother's keycard is on the bench."] },
    { id: "l05c6-15", type: "fix", grammarPoint: "l05c6_word", wrong: "The saddle is her.", accepted: ["The saddle is hers."] },
    { id: "l05c6-16", type: "fix", grammarPoint: "l05c6_whose", wrong: "Whose handlebars is this", accepted: ["Whose handlebars are these"] },
  ],
};
