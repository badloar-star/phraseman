// chapter_exam_v2_l06_c3.ts — банк экзамена v2: урок 6, глава 3 (эпизоды 17–24).
// зачем (слово владельца 26.10: экзамены глав v2 для всех уроков, войдут в 2.0.3; правила — docs/work/factory-exam-banks-task-for-codex-2026-10-25.md):
// каждое английское слово реплики, фразы с ошибкой и всех принятых ответов уже встречалось в эпизодах 1–24 урока 6
// (сторож tests/owner_locks_exam_episode_words_2026_10_25.test.ts); ситуация и ответ сходятся по смыслу; вопросы без «?» — общий тест правил банков.
// Глава 3: он / она + s — drives, smiles, draws (17, 18, 19), cooks, writes, reads (20, 21, 22), es — teaches, catches (23, 24).
// Подключение в приложении (BANKS) — Learning V2 после вычитки владельцем; читабельный вид — docs/work/exam-banks/l06.md.
import type { ChapterExamV2Bank } from '../chapter_exam_v2';

export const CHAPTER_EXAM_V2_BANK_L06_C3: ChapterExamV2Bank = {
  lessonOrdinal: 6,
  chapterOrdinal: 3,
  grammarPoints: [
    { id: "l06c3_s", label: { ru: "он / она + s — she drives, he smiles", uk: "він / вона + s — she drives, he smiles" }, episodeOrdinals: [17, 18, 19] },
    { id: "l06c3_s_more", label: { ru: "он / она + s — she cooks, he reads", uk: "він / вона + s — she cooks, he reads" }, episodeOrdinals: [20, 21, 22] },
    { id: "l06c3_es", label: { ru: "он / она + es — teaches, catches", uk: "він / вона + es — teaches, catches" }, episodeOrdinals: [23, 24] },
  ],
  items: [
    { id: "l06c3-01", type: "situation", grammarPoint: "l06c3_s", situation: { ru: "Коллега спрашивает про твою сестру. Скажи, что она ездит на работу на машине.", uk: "Колега питає про твою сестру. Скажи, що вона їздить на роботу машиною." }, accepted: ["She drives to work."] },
    { id: "l06c3-02", type: "situation", grammarPoint: "l06c3_s", situation: { ru: "Учительница хвалит твоего сына. Скажи, что он рисует дома.", uk: "Учителька хвалить твого сина. Скажи, що він малює вдома." }, accepted: ["He draws at home.", "My son draws at home."] },
    { id: "l06c3-03", type: "situation", grammarPoint: "l06c3_s_more", situation: { ru: "Подруга спрашивает про бабушку. Скажи, что она готовит дома.", uk: "Подруга питає про бабусю. Скажи, що вона готує вдома." }, accepted: ["She cooks at home.", "My grandmother cooks at home."] },
    { id: "l06c3-04", type: "situation", grammarPoint: "l06c3_s_more", situation: { ru: "Брат сидит в кресле с книгой. Скажи, что он читает в кресле.", uk: "Брат сидить у кріслі з книжкою. Скажи, що він читає в кріслі." }, accepted: ["He reads in the armchair."] },
    { id: "l06c3-05", type: "situation", grammarPoint: "l06c3_es", situation: { ru: "Знакомые спрашивают, кем работает сестра. Скажи, что она преподаёт английский.", uk: "Знайомі питають, ким працює сестра. Скажи, що вона викладає англійську." }, accepted: ["She teaches English.", "My sister teaches English."] },
    { id: "l06c3-06", type: "situation", grammarPoint: "l06c3_es", situation: { ru: "Сестра опаздывает. Скажи, что она успевает на автобус.", uk: "Сестра запізнюється. Скажи, що вона встигає на автобус." }, accepted: ["She catches the bus."] },
    { id: "l06c3-07", type: "dialogue", grammarPoint: "l06c3_s", partnerLine: "They wait here.", situation: { ru: "Поправь: ждёт только она.", uk: "Виправ: чекає лише вона." }, accepted: ["She waits here."] },
    { id: "l06c3-08", type: "dialogue", grammarPoint: "l06c3_s", partnerLine: "He coughs at home.", situation: { ru: "Добавь: он улыбается малышу.", uk: "Додай: він усміхається малюкові." }, accepted: ["He smiles at the baby."] },
    { id: "l06c3-09", type: "dialogue", grammarPoint: "l06c3_s_more", partnerLine: "They taste the soup.", situation: { ru: "Поправь: суп пробует только он.", uk: "Виправ: суп куштує лише він." }, accepted: ["He tastes the soup."] },
    { id: "l06c3-10", type: "dialogue", grammarPoint: "l06c3_s_more", partnerLine: "They jump in the pool.", situation: { ru: "Поправь: в бассейне плавает она.", uk: "Виправ: у басейні плаває вона." }, accepted: ["She swims in the pool."] },
    { id: "l06c3-11", type: "dialogue", grammarPoint: "l06c3_es", partnerLine: "They catch the bus.", situation: { ru: "Поправь: на поезд успевает она.", uk: "Виправ: на потяг встигає вона." }, accepted: ["She catches the train."] },
    { id: "l06c3-12", type: "dialogue", grammarPoint: "l06c3_es", partnerLine: "He pours the coffee.", situation: { ru: "Добавь: она наливает молоко.", uk: "Додай: вона наливає молоко." }, accepted: ["She pours the milk."] },
    { id: "l06c3-13", type: "fix", grammarPoint: "l06c3_s", wrong: "He drive to work.", accepted: ["He drives to work."] },
    { id: "l06c3-14", type: "fix", grammarPoint: "l06c3_s_more", wrong: "She write at home.", accepted: ["She writes at home."] },
    { id: "l06c3-15", type: "fix", grammarPoint: "l06c3_es", wrong: "She teachs English.", accepted: ["She teaches English."] },
    { id: "l06c3-16", type: "fix", grammarPoint: "l06c3_es", wrong: "My sister catchs the bus.", accepted: ["My sister catches the bus."] },
  ],
};
