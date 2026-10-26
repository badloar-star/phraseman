// chapter_exam_v2_l04_c7.ts — банк экзамена v2: урок 4, глава 7 (эпизоды 49–56).
// зачем (слово владельца 26.10: экзамены глав v2 для всех уроков, войдут в 2.0.3; правила — docs/work/factory-exam-banks-task-for-codex-2026-10-25.md):
// каждое английское слово реплики, фразы с ошибкой и всех принятых ответов уже встречалось в эпизодах 1–56 урока 4
// (сторож tests/owner_locks_exam_episode_words_2026_10_25.test.ts); ситуация и ответ сходятся по смыслу; вопросы без «?» — общий тест правил банков.
// Глава 7: есть одно или несколько (49, 53), спросить о наличии (50, 52), сказать, чего нет (52, 54, 55).
// Подключение в приложении (BANKS) — Learning V2 после вычитки владельцем; читабельный вид — docs/work/exam-banks/l04.md.
import type { ChapterExamV2Bank } from '../chapter_exam_v2';

export const CHAPTER_EXAM_V2_BANK_L04_C7: ChapterExamV2Bank = {
  lessonOrdinal: 4,
  chapterOrdinal: 7,
  grammarPoints: [
    { id: "l04c7_is_are", label: { ru: "есть — There is a… / There are…", uk: "є — There is a… / There are…" }, episodeOrdinals: [49, 53] },
    { id: "l04c7_ask", label: { ru: "есть ли — Is there / Are there", uk: "чи є — Is there / Are there" }, episodeOrdinals: [50, 52] },
    { id: "l04c7_not", label: { ru: "нет — There isn’t a / There aren’t any", uk: "немає — There isn’t a / There aren’t any" }, episodeOrdinals: [52, 54, 55] },
  ],
  items: [
    { id: "l04c7-01", type: "situation", grammarPoint: "l04c7_is_are", situation: { ru: "Вы гуляете у пруда с ребёнком. Скажи, что у пруда есть лебеди.", uk: "Ви гуляєте біля ставка з дитиною. Скажи, що біля ставка є лебеді." }, accepted: ["There are swans near the pond."] },
    { id: "l04c7-02", type: "situation", grammarPoint: "l04c7_is_are", situation: { ru: "Друг ищет лодку для прогулки. Скажи, что у моста есть узкая лодка.", uk: "Друг шукає човен для прогулянки. Скажи, що біля мосту є вузький човен." }, accepted: ["There is a narrowboat near the bridge."] },
    { id: "l04c7-03", type: "situation", grammarPoint: "l04c7_ask", situation: { ru: "Ты выбираешь маршрут для прогулки. Спроси, есть ли за библиотекой река.", uk: "Ти обираєш маршрут для прогулянки. Спитай, чи є за бібліотекою річка." }, accepted: ["Is there a river behind the library"] },
    { id: "l04c7-04", type: "situation", grammarPoint: "l04c7_ask", situation: { ru: "Ты выбираешь садик для сына. Спроси, есть ли во дворе горки.", uk: "Ти обираєш садочок для сина. Спитай, чи є у дворі гірки." }, accepted: ["Are there any slides in the yard"] },
    { id: "l04c7-05", type: "situation", grammarPoint: "l04c7_not", situation: { ru: "Сосед боится шума машин. Скажи, что у парка нет автомагистрали.", uk: "Сусід боїться шуму машин. Скажи, що біля парку немає автомагістралі." }, accepted: ["There isn't a motorway near the park."] },
    { id: "l04c7-06", type: "situation", grammarPoint: "l04c7_not", situation: { ru: "Подруга в новых туфлях. Скажи, что у скамейки нет луж.", uk: "Подруга в нових туфлях. Скажи, що біля лавки немає калюж." }, accepted: ["There aren't any puddles near the bench."] },
    { id: "l04c7-07", type: "dialogue", grammarPoint: "l04c7_is_are", partnerLine: "There is a swan on the canal.", situation: { ru: "Уточни: лебедей там несколько.", uk: "Уточни: лебедів там кілька." }, accepted: ["There are swans on the canal."] },
    { id: "l04c7-08", type: "dialogue", grammarPoint: "l04c7_ask", partnerLine: "There is a nursery near the park.", situation: { ru: "Спроси, есть ли за садиком песочница.", uk: "Спитай, чи є за садочком пісочниця." }, accepted: ["Is there a sandpit behind the nursery"] },
    { id: "l04c7-09", type: "dialogue", grammarPoint: "l04c7_not", partnerLine: "There are swings near the nursery.", situation: { ru: "Возрази: качелей у садика нет.", uk: "Заперечи: гойдалок біля садочка немає." }, accepted: ["There aren't any swings near the nursery."] },
    { id: "l04c7-10", type: "dialogue", grammarPoint: "l04c7_ask", partnerLine: "There are roadworks near the bridge.", situation: { ru: "Спроси, есть ли у моста объезд.", uk: "Спитай, чи є біля мосту об’їзд." }, accepted: ["Is there a detour near the bridge"] },
    { id: "l04c7-11", type: "dialogue", grammarPoint: "l04c7_not", partnerLine: "There is a sandpit in the yard.", situation: { ru: "Возрази: во дворе песочницы нет.", uk: "Заперечи: у дворі пісочниці немає." }, accepted: ["There isn't a sandpit in the yard."] },
    { id: "l04c7-12", type: "dialogue", grammarPoint: "l04c7_is_are", partnerLine: "There isn't a towpath here.", situation: { ru: "Возрази: тропа есть, рядом с каналом.", uk: "Заперечи: стежка є, поруч із каналом." }, accepted: ["There is a towpath next to the canal."] },
    { id: "l04c7-13", type: "fix", grammarPoint: "l04c7_is_are", wrong: "There is narrowboats under the bridge.", accepted: ["There are narrowboats under the bridge."] },
    { id: "l04c7-14", type: "fix", grammarPoint: "l04c7_ask", wrong: "Are there a footbridge behind the cafe", accepted: ["Is there a footbridge behind the cafe"] },
    { id: "l04c7-15", type: "fix", grammarPoint: "l04c7_not", wrong: "There aren't a sandpit here.", accepted: ["There isn't a sandpit here."] },
    { id: "l04c7-16", type: "fix", grammarPoint: "l04c7_ask", wrong: "Is there cones on the pavement", accepted: ["Are there cones on the pavement"] },
  ],
};
