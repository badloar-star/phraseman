// chapter_exam_v2_l04_c4.ts — банк экзамена v2: урок 4, глава 4 (эпизоды 25–32).
// зачем (слово владельца 26.10: экзамены глав v2 для всех уроков, войдут в 2.0.3; правила — docs/work/factory-exam-banks-task-for-codex-2026-10-25.md):
// каждое английское слово реплики, фразы с ошибкой и всех принятых ответов уже встречалось в эпизодах 1–32 урока 4
// (сторож tests/owner_locks_exam_episode_words_2026_10_25.test.ts); ситуация и ответ сходятся по смыслу; вопросы без «?» — общий тест правил банков.
// Глава 4: in и on (25, 26), under и next to (27, 28), between, near, behind (29, 30, 32). The… is… — предмет уже известен (31).
// Подключение в приложении (BANKS) — Learning V2 после вычитки владельцем; читабельный вид — docs/work/exam-banks/l04.md.
import type { ChapterExamV2Bank } from '../chapter_exam_v2';

export const CHAPTER_EXAM_V2_BANK_L04_C4: ChapterExamV2Bank = {
  lessonOrdinal: 4,
  chapterOrdinal: 4,
  grammarPoints: [
    { id: "l04c4_in_on", label: { ru: "в и на — in, on", uk: "в і на — in, on" }, episodeOrdinals: [25, 26] },
    { id: "l04c4_under_next", label: { ru: "под и рядом — under, next to", uk: "під і поруч — under, next to" }, episodeOrdinals: [27, 28] },
    { id: "l04c4_between", label: { ru: "между, у, за — between, near, behind", uk: "між, біля, за — between, near, behind" }, episodeOrdinals: [29, 30, 32] },
  ],
  items: [
    { id: "l04c4-01", type: "situation", grammarPoint: "l04c4_in_on", situation: { ru: "Соседка по квартире ищет ложку. Скажи, что ложка в раковине.", uk: "Сусідка по квартирі шукає ложку. Скажи, що ложка в раковині." }, accepted: ["The spoon is in the sink."] },
    { id: "l04c4-02", type: "situation", grammarPoint: "l04c4_in_on", situation: { ru: "Муж не может найти ключи. Скажи, что ключи на столешнице.", uk: "Чоловік не може знайти ключі. Скажи, що ключі на стільниці." }, accepted: ["The keys are on the worktop."] },
    { id: "l04c4-03", type: "situation", grammarPoint: "l04c4_under_next", situation: { ru: "Сосед пришёл раньше тебя и стоит у двери. Скажи, что ключ под ковриком.", uk: "Сусід прийшов раніше за тебе й стоїть біля дверей. Скажи, що ключ під килимком." }, accepted: ["The key is under the doormat."] },
    { id: "l04c4-04", type: "situation", grammarPoint: "l04c4_under_next", situation: { ru: "Друг ищет твой велосипед во дворе. Скажи, что он рядом с воротами.", uk: "Друг шукає твій велосипед у дворі. Скажи, що він поруч із воротами." }, accepted: ["The bicycle is next to the gate."] },
    { id: "l04c4-05", type: "situation", grammarPoint: "l04c4_between", situation: { ru: "Турист ищет памятник. Скажи, что он между парком и школой.", uk: "Турист шукає пам’ятник. Скажи, що він між парком і школою." }, accepted: ["The monument is between the park and the school."] },
    { id: "l04c4-06", type: "situation", grammarPoint: "l04c4_between", situation: { ru: "Бабушка ищет, где присесть в саду. Скажи, что скамейка за живой изгородью.", uk: "Бабуся шукає, де присісти в саду. Скажи, що лавка за живоплотом." }, accepted: ["The bench is behind the hedge."] },
    { id: "l04c4-07", type: "dialogue", grammarPoint: "l04c4_in_on", partnerLine: "The apple is on the plate.", situation: { ru: "Поправь: яблоко в миске.", uk: "Виправ: яблуко в мисці." }, accepted: ["The apple is in the bowl."] },
    { id: "l04c4-08", type: "dialogue", grammarPoint: "l04c4_in_on", partnerLine: "The bottles are in the sink.", situation: { ru: "Поправь: бутылки в посудомойке.", uk: "Виправ: пляшки в посудомийці." }, accepted: ["The bottles are in the dishwasher."] },
    { id: "l04c4-09", type: "dialogue", grammarPoint: "l04c4_under_next", partnerLine: "The bag is on the chair.", situation: { ru: "Поправь: сумка под стулом.", uk: "Виправ: сумка під стільцем." }, accepted: ["The bag is under the chair."] },
    { id: "l04c4-10", type: "dialogue", grammarPoint: "l04c4_under_next", partnerLine: "The cafe is behind the library.", situation: { ru: "Поправь: кафе рядом с библиотекой.", uk: "Виправ: кафе поруч із бібліотекою." }, accepted: ["The cafe is next to the library."] },
    { id: "l04c4-11", type: "dialogue", grammarPoint: "l04c4_between", partnerLine: "The fountain is near the library.", situation: { ru: "Добавь, что голуби у фонтана.", uk: "Додай, що голуби біля фонтана." }, accepted: ["The pigeons are near the fountain."] },
    { id: "l04c4-12", type: "dialogue", grammarPoint: "l04c4_between", partnerLine: "The bin is near the shed.", situation: { ru: "Поправь: урна за сараем.", uk: "Виправ: смітник за сараєм." }, accepted: ["The bin is behind the shed."] },
    { id: "l04c4-13", type: "fix", grammarPoint: "l04c4_in_on", wrong: "The clock is in the wall.", accepted: ["The clock is on the wall."] },
    { id: "l04c4-14", type: "fix", grammarPoint: "l04c4_under_next", wrong: "The bicycles is next to the gate.", accepted: ["The bicycles are next to the gate."] },
    { id: "l04c4-15", type: "fix", grammarPoint: "l04c4_between", wrong: "The monument is between park and the school.", accepted: ["The monument is between the park and the school."] },
    { id: "l04c4-16", type: "fix", grammarPoint: "l04c4_in_on", wrong: "The plates is on the worktop.", accepted: ["The plates are on the worktop."] },
  ],
};
