// chapter_exam_v2_l06_c6.ts — банк экзамена v2: урок 6, глава 6 (эпизоды 41–48).
// зачем (слово владельца 26.10: экзамены глав v2 для всех уроков, войдут в 2.0.3; правила — docs/work/factory-exam-banks-task-for-codex-2026-10-25.md):
// каждое английское слово реплики, фразы с ошибкой и всех принятых ответов уже встречалось в эпизодах 1–48 урока 6
// (сторож tests/owner_locks_exam_episode_words_2026_10_25.test.ts); ситуация и ответ сходятся по смыслу; вопросы со знаком «?» (с 92b29de96 запрет только для урока 1).
// Глава 6: fishes, mends, snores (41, 45, 47), когда приезжает и уезжает — arrives, leaves (42, 48), растит, кормит, жарит — grows, feeds, grills (43, 44, 46).
// Подключение в приложении (BANKS) — Learning V2 после вычитки владельцем; читабельный вид — docs/work/exam-banks/l06.md.
import type { ChapterExamV2Bank } from '../chapter_exam_v2';

export const CHAPTER_EXAM_V2_BANK_L06_C6: ChapterExamV2Bank = {
  lessonOrdinal: 6,
  chapterOrdinal: 6,
  grammarPoints: [
    { id: "l06c6_fish_mend", label: { ru: "fishes, mends, snores", uk: "fishes, mends, snores" }, episodeOrdinals: [41, 45, 47] },
    { id: "l06c6_arrive", label: { ru: "приезжает и уезжает — arrives at five", uk: "приїжджає й від’їжджає — arrives at five" }, episodeOrdinals: [42, 48] },
    { id: "l06c6_grow_feed", label: { ru: "растит, кормит, жарит — grows, feeds, grills", uk: "вирощує, годує, смажить — grows, feeds, grills" }, episodeOrdinals: [43, 44, 46] },
  ],
  items: [
    { id: "l06c6-01", type: "situation", grammarPoint: "l06c6_fish_mend", situation: { ru: "Сосед спрашивает, где брат по выходным. Скажи, что он рыбачит на озере.", uk: "Сусід питає, де брат на вихідних. Скажи, що він рибалить на озері." }, accepted: ["He fishes at the lake."] },
    { id: "l06c6-02", type: "situation", grammarPoint: "l06c6_fish_mend", situation: { ru: "Подруга видит заштопанные носки. Скажи, что бабушка штопает носки.", uk: "Подруга бачить заштопані шкарпетки. Скажи, що бабуся штопає шкарпетки." }, accepted: ["My grandmother mends socks."] },
    { id: "l06c6-03", type: "situation", grammarPoint: "l06c6_arrive", situation: { ru: "Тебя спрашивают, когда приедет сестра. Скажи, что она приезжает в пять.", uk: "Тебе питають, коли приїде сестра. Скажи, що вона приїжджає о п’ятій." }, accepted: ["She arrives at five.", "My sister arrives at five."] },
    { id: "l06c6-04", type: "situation", grammarPoint: "l06c6_arrive", situation: { ru: "Проводник спрашивает про вас. Скажи, что вы уезжаете в пять.", uk: "Провідник питає про вас. Скажи, що ви від’їжджаєте о п’ятій." }, accepted: ["We leave at five."] },
    { id: "l06c6-05", type: "situation", grammarPoint: "l06c6_grow_feed", situation: { ru: "Гости хвалят цветы. Скажи, что она выращивает цветы на балконе.", uk: "Гості хвалять квіти. Скажи, що вона вирощує квіти на балконі." }, accepted: ["She grows flowers on the balcony."] },
    { id: "l06c6-06", type: "situation", grammarPoint: "l06c6_grow_feed", situation: { ru: "Соседи уехали. Скажи, что вы кормите их щенка.", uk: "Сусіди поїхали. Скажи, що ви годуєте їхнє цуценя." }, accepted: ["We feed the puppy."] },
    { id: "l06c6-07", type: "dialogue", grammarPoint: "l06c6_fish_mend", partnerLine: "They snore in the tent.", situation: { ru: "Поправь: в палатке храпит он.", uk: "Виправ: у наметі хропе він." }, accepted: ["He snores in the tent."] },
    { id: "l06c6-08", type: "dialogue", grammarPoint: "l06c6_fish_mend", partnerLine: "They fish at the jetty.", situation: { ru: "Скажи, что она рыбачит на озере.", uk: "Скажи, що вона рибалить на озері." }, accepted: ["She fishes at the lake."] },
    { id: "l06c6-09", type: "dialogue", grammarPoint: "l06c6_arrive", partnerLine: "She arrives at five.", situation: { ru: "Добавь: а уезжает она в четыре.", uk: "Додай: а від’їжджає вона о четвертій." }, accepted: ["She leaves at four."] },
    { id: "l06c6-10", type: "dialogue", grammarPoint: "l06c6_arrive", partnerLine: "The host is at the gate.", situation: { ru: "Скажи, что хозяин встречает гостей.", uk: "Скажи, що господар зустрічає гостей." }, accepted: ["The host greets the guests."] },
    { id: "l06c6-11", type: "dialogue", grammarPoint: "l06c6_grow_feed", partnerLine: "They feed the puppy.", situation: { ru: "Поправь: собаку кормит он.", uk: "Виправ: собаку годує він." }, accepted: ["He feeds the dog."] },
    { id: "l06c6-12", type: "dialogue", grammarPoint: "l06c6_grow_feed", partnerLine: "We grill sausages.", situation: { ru: "Добавь: она запекает картошку во дворе.", uk: "Додай: вона запікає картоплю у дворі." }, accepted: ["She roasts potatoes in the yard."] },
    { id: "l06c6-13", type: "fix", grammarPoint: "l06c6_fish_mend", wrong: "He fish at the lake.", accepted: ["He fishes at the lake."] },
    { id: "l06c6-14", type: "fix", grammarPoint: "l06c6_arrive", wrong: "She arrive at five.", accepted: ["She arrives at five."] },
    { id: "l06c6-15", type: "fix", grammarPoint: "l06c6_grow_feed", wrong: "He grow flowers on the balcony.", accepted: ["He grows flowers on the balcony."] },
    { id: "l06c6-16", type: "fix", grammarPoint: "l06c6_grow_feed", wrong: "They feeds the puppy.", accepted: ["They feed the puppy."] },
  ],
};
