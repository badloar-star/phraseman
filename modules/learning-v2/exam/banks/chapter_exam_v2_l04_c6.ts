// chapter_exam_v2_l04_c6.ts — банк экзамена v2: урок 4, глава 6 (эпизоды 41–48).
// зачем (слово владельца 26.10: экзамены глав v2 для всех уроков, войдут в 2.0.3; правила — docs/work/factory-exam-banks-task-for-codex-2026-10-25.md):
// каждое английское слово реплики, фразы с ошибкой и всех принятых ответов уже встречалось в эпизодах 1–48 урока 4
// (сторож tests/owner_locks_exam_episode_words_2026_10_25.test.ts); ситуация и ответ сходятся по смыслу; вопросы без «?» — общий тест правил банков.
// Глава 6: короткое There’s (41, 46), вопросы о наличии (42, 43, 46), есть / нет в кладовке и холодильнике (45, 47).
// Подключение в приложении (BANKS) — Learning V2 после вычитки владельцем; читабельный вид — docs/work/exam-banks/l04.md.
import type { ChapterExamV2Bank } from '../chapter_exam_v2';

export const CHAPTER_EXAM_V2_BANK_L04_C6: ChapterExamV2Bank = {
  lessonOrdinal: 4,
  chapterOrdinal: 6,
  grammarPoints: [
    { id: "l04c6_theres", label: { ru: "коротко — There’s", uk: "коротко — There’s" }, episodeOrdinals: [41, 46] },
    { id: "l04c6_ask", label: { ru: "спросить, есть ли — Is there / Are there any", uk: "спитати, чи є — Is there / Are there any" }, episodeOrdinals: [42, 43, 46] },
    { id: "l04c6_mixed", label: { ru: "есть или нет — some, isn’t a, aren’t any", uk: "є чи немає — some, isn’t a, aren’t any" }, episodeOrdinals: [45, 47] },
  ],
  items: [
    { id: "l04c6-01", type: "situation", grammarPoint: "l04c6_theres", situation: { ru: "Ты разбираешь продукты. Скажи коротко, что на полке есть мешок.", uk: "Ти розбираєш продукти. Скажи коротко, що на полиці є мішок." }, accepted: ["There's a sack on the shelf."] },
    { id: "l04c6-02", type: "situation", grammarPoint: "l04c6_ask", situation: { ru: "Ты ищешь молоко в коробках. Спроси, есть ли в кладовке пакеты.", uk: "Ти шукаєш молоко в коробках. Спитай, чи є в коморі пакети." }, accepted: ["Are there any cartons in the pantry"] },
    { id: "l04c6-03", type: "situation", grammarPoint: "l04c6_ask", situation: { ru: "Вечером хочется лазаньи. Спроси, есть ли она в холодильнике.", uk: "Увечері хочеться лазаньї. Спитай, чи є вона в холодильнику." }, accepted: ["Is there any lasagne in the fridge"] },
    { id: "l04c6-04", type: "situation", grammarPoint: "l04c6_mixed", situation: { ru: "Друг спрашивает про пирог. Скажи, что в духовке пирога нет.", uk: "Друг питає про пиріг. Скажи, що в духовці пирога немає." }, accepted: ["There isn't a pie in the oven."] },
    { id: "l04c6-05", type: "situation", grammarPoint: "l04c6_mixed", situation: { ru: "Сестра голодна. Скажи, что в холодильнике есть карри.", uk: "Сестра голодна. Скажи, що в холодильнику є карі." }, accepted: ["There is some curry in the fridge."] },
    { id: "l04c6-06", type: "situation", grammarPoint: "l04c6_theres", situation: { ru: "Гость ищет кладовку. Скажи коротко, что она за залом.", uk: "Гість шукає комору. Скажи коротко, що вона за залою." }, accepted: ["There's a pantry behind the hall."] },
    { id: "l04c6-07", type: "dialogue", grammarPoint: "l04c6_ask", partnerLine: "There are some leftovers on the worktop.", situation: { ru: "Спроси, есть ли остатки и в холодильнике.", uk: "Спитай, чи є залишки й у холодильнику." }, accepted: ["Are there any leftovers in the fridge"] },
    { id: "l04c6-08", type: "dialogue", grammarPoint: "l04c6_mixed", partnerLine: "There is a pie in the fridge.", situation: { ru: "Возрази: пирога в холодильнике нет.", uk: "Заперечи: пирога в холодильнику немає." }, accepted: ["There isn't a pie in the fridge."] },
    { id: "l04c6-09", type: "dialogue", grammarPoint: "l04c6_theres", partnerLine: "There isn't any curry here.", situation: { ru: "Возрази коротко: карри есть, в холодильнике.", uk: "Заперечи коротко: карі є, у холодильнику." }, accepted: ["There's some curry in the fridge."] },
    { id: "l04c6-10", type: "dialogue", grammarPoint: "l04c6_ask", partnerLine: "There is a sack on the shelf.", situation: { ru: "Спроси, есть ли мешок под полкой.", uk: "Спитай, чи є мішок під полицею." }, accepted: ["Is there a sack under the shelf"] },
    { id: "l04c6-11", type: "dialogue", grammarPoint: "l04c6_mixed", partnerLine: "There are some cartons in the pantry.", situation: { ru: "Поправь: в кладовке их нет.", uk: "Виправ: у коморі їх немає." }, accepted: ["There aren't any cartons in the pantry."] },
    { id: "l04c6-12", type: "dialogue", grammarPoint: "l04c6_theres", partnerLine: "There isn't a packet here.", situation: { ru: "Возрази коротко: пакет есть, на полке.", uk: "Заперечи коротко: пакет є, на полиці." }, accepted: ["There's a packet on the shelf."] },
    { id: "l04c6-13", type: "fix", grammarPoint: "l04c6_theres", wrong: "There's some leftovers here.", accepted: ["There are some leftovers here."] },
    { id: "l04c6-14", type: "fix", grammarPoint: "l04c6_ask", wrong: "Is there any leftovers in the oven", accepted: ["Are there any leftovers in the oven"] },
    { id: "l04c6-15", type: "fix", grammarPoint: "l04c6_mixed", wrong: "There isn't any packets near the sink.", accepted: ["There aren't any packets near the sink."] },
    { id: "l04c6-16", type: "fix", grammarPoint: "l04c6_mixed", wrong: "There aren't a pantry here.", accepted: ["There isn't a pantry here."] },
  ],
};
