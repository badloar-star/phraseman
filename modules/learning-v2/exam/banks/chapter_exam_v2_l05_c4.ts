// chapter_exam_v2_l05_c4.ts — банк экзамена v2: урок 5, глава 4 (эпизоды 25–32).
// зачем (слово владельца 26.10: экзамены глав v2 для всех уроков, войдут в 2.0.3; правила — docs/work/factory-exam-banks-task-for-codex-2026-10-25.md):
// каждое английское слово реплики, фразы с ошибкой и всех принятых ответов уже встречалось в эпизодах 1–32 урока 5
// (сторож tests/owner_locks_exam_episode_words_2026_10_25.test.ts); ситуация и ответ сходятся по смыслу; вопросы без «?» — общий тест правил банков.
// Глава 4: вещь родных через ’s (25, 26, 28), ’s = is и вещи животных (29, 31), «это вещь…?» и ответ без названия (27, 30, 32).
// Подключение в приложении (BANKS) — Learning V2 после вычитки владельцем; читабельный вид — docs/work/exam-banks/l05.md.
import type { ChapterExamV2Bank } from '../chapter_exam_v2';

export const CHAPTER_EXAM_V2_BANK_L05_C4: ChapterExamV2Bank = {
  lessonOrdinal: 5,
  chapterOrdinal: 4,
  grammarPoints: [
    { id: "l05c4_s_name", label: { ru: "вещь родных — my sister’s, the baby’s", uk: "річ рідних — my sister’s, the baby’s" }, episodeOrdinals: [25, 26, 28] },
    { id: "l05c4_s_is", label: { ru: "’s = is и вещи животных — my aunt’s here, the bird’s cage", uk: "’s = is і речі тварин — my aunt’s here, the bird’s cage" }, episodeOrdinals: [29, 31] },
    { id: "l05c4_answer", label: { ru: "ответ без названия — It is my cousin’s", uk: "відповідь без назви — It is my cousin’s" }, episodeOrdinals: [27, 30, 32] },
  ],
  items: [
    { id: "l05c4-01", type: "situation", grammarPoint: "l05c4_s_name", situation: { ru: "На пикнике кто-то берёт термос. Скажи, что это термос твоего брата.", uk: "На пікніку хтось бере термос. Скажи, що це термос твого брата." }, accepted: ["This is my brother's thermos."] },
    { id: "l05c4-02", type: "situation", grammarPoint: "l05c4_s_name", situation: { ru: "Сестра ищет подгузник для малыша. Скажи, что подгузник малыша в сумке.", uk: "Сестра шукає підгузок для малюка. Скажи, що підгузок малюка в сумці." }, accepted: ["The baby's nappy is in the bag."] },
    { id: "l05c4-03", type: "situation", grammarPoint: "l05c4_s_is", situation: { ru: "Гость спрашивает, где твоя тётя. Скажи коротко: тётя на кухне.", uk: "Гість питає, де твоя тітка. Скажи коротко: тітка на кухні." }, accepted: ["My aunt's in the kitchen."] },
    { id: "l05c4-04", type: "situation", grammarPoint: "l05c4_s_is", situation: { ru: "Дети ищут клетку. Скажи, что клетка хомяка за диваном.", uk: "Діти шукають клітку. Скажи, що клітка хом’яка за диваном." }, accepted: ["The hamster's cage is behind the sofa."] },
    { id: "l05c4-05", type: "situation", grammarPoint: "l05c4_answer", situation: { ru: "Учитель держит калькулятор и смотрит на тебя. Скажи, что он твоего двоюродного брата.", uk: "Учитель тримає калькулятор і дивиться на тебе. Скажи, що він твого двоюрідного брата." }, accepted: ["It is my cousin's."] },
    { id: "l05c4-06", type: "situation", grammarPoint: "l05c4_answer", situation: { ru: "Хозяйка показывает скатерть. Скажи, что скатерть твоей тёти.", uk: "Господиня показує скатертину. Скажи, що скатертина твоєї тітки." }, accepted: ["The tablecloth is my aunt's."] },
    { id: "l05c4-07", type: "dialogue", grammarPoint: "l05c4_s_name", partnerLine: "My uncle's saw is in the garden.", situation: { ru: "Поправь: пила дяди в сарае.", uk: "Виправ: пилка дядька в сараї." }, accepted: ["My uncle's saw is in the shed."] },
    { id: "l05c4-08", type: "dialogue", grammarPoint: "l05c4_s_name", partnerLine: "The baby's rattle is on the floor.", situation: { ru: "Поправь: погремушка малыша под диваном.", uk: "Виправ: брязкальце малюка під диваном." }, accepted: ["The baby's rattle is under the sofa."] },
    { id: "l05c4-09", type: "dialogue", grammarPoint: "l05c4_s_is", partnerLine: "My cousin has a rabbit.", situation: { ru: "Добавь: миска кролика под столом.", uk: "Додай: миска кролика під столом." }, accepted: ["The rabbit's bowl is under the table."] },
    { id: "l05c4-10", type: "dialogue", grammarPoint: "l05c4_s_is", partnerLine: "My aunt's piano is in the hall.", situation: { ru: "Добавь: а барабан двоюродного брата на диване.", uk: "Додай: а барабан двоюрідного брата на дивані." }, accepted: ["My cousin's drum is on the sofa."] },
    { id: "l05c4-11", type: "dialogue", grammarPoint: "l05c4_answer", partnerLine: "The hoodie is the guest's.", situation: { ru: "Возрази: худи — туриста.", uk: "Заперечи: худі — туриста." }, accepted: ["The hoodie is the tourist's."] },
    { id: "l05c4-12", type: "dialogue", grammarPoint: "l05c4_answer", partnerLine: "The textbook is my cousin's.", situation: { ru: "Поправь: учебник твоего друга.", uk: "Виправ: підручник твого друга." }, accepted: ["The textbook is my friend's."] },
    { id: "l05c4-13", type: "fix", grammarPoint: "l05c4_s_name", wrong: "This is my aunt basket.", accepted: ["This is my aunt's basket."] },
    { id: "l05c4-14", type: "fix", grammarPoint: "l05c4_s_is", wrong: "The bird cage is on the table.", accepted: ["The bird's cage is on the table."] },
    { id: "l05c4-15", type: "fix", grammarPoint: "l05c4_answer", wrong: "The tablecloth is my uncle.", accepted: ["The tablecloth is my uncle's."] },
    { id: "l05c4-16", type: "fix", grammarPoint: "l05c4_s_name", wrong: "My sister's baby have a rattle.", accepted: ["My sister's baby has a rattle."] },
  ],
};
