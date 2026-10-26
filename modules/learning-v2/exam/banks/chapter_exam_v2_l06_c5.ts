// chapter_exam_v2_l06_c5.ts — банк экзамена v2: урок 6, глава 5 (эпизоды 33–40).
// зачем (слово владельца 26.10: экзамены глав v2 для всех уроков, войдут в 2.0.3; правила — docs/work/factory-exam-banks-task-for-codex-2026-10-25.md):
// каждое английское слово реплики, фразы с ошибкой и всех принятых ответов уже встречалось в эпизодах 1–40 урока 6
// (сторож tests/owner_locks_exam_episode_words_2026_10_25.test.ts); ситуация и ответ сходятся по смыслу; вопросы без «?» — общий тест правил банков.
// Глава 5: studies, drinks, sleeps (33, 34, 35), где живёт и как покупает — lives, shops, rests (36, 37, 38), соседи на велосипеде — cycles (39, 40).
// Подключение в приложении (BANKS) — Learning V2 после вычитки владельцем; читабельный вид — docs/work/exam-banks/l06.md.
import type { ChapterExamV2Bank } from '../chapter_exam_v2';

export const CHAPTER_EXAM_V2_BANK_L06_C5: ChapterExamV2Bank = {
  lessonOrdinal: 6,
  chapterOrdinal: 5,
  grammarPoints: [
    { id: "l06c5_studies", label: { ru: "studies, drinks, sleeps", uk: "studies, drinks, sleeps" }, episodeOrdinals: [33, 34, 35] },
    { id: "l06c5_lives", label: { ru: "где живёт и покупает — lives, shops, rests", uk: "де живе й купує — lives, shops, rests" }, episodeOrdinals: [36, 37, 38] },
    { id: "l06c5_cycles", label: { ru: "на велосипеде — he cycles to work", uk: "на велосипеді — he cycles to work" }, episodeOrdinals: [39, 40] },
  ],
  items: [
    { id: "l06c5-01", type: "situation", grammarPoint: "l06c5_studies", situation: { ru: "Учитель спрашивает про дочь. Скажи, что она занимается с репетитором.", uk: "Учитель питає про доньку. Скажи, що вона займається з репетитором." }, accepted: ["She studies with a tutor."] },
    { id: "l06c5-02", type: "situation", grammarPoint: "l06c5_studies", situation: { ru: "В кафе спрашивают, что будет пить брат. Скажи, что он пьёт чай.", uk: "У кафе питають, що питиме брат. Скажи, що він п’є чай." }, accepted: ["He drinks tea."] },
    { id: "l06c5-03", type: "situation", grammarPoint: "l06c5_lives", situation: { ru: "Новый сосед спрашивает про тебя. Скажи, что ты живёшь в квартире.", uk: "Новий сусід питає про тебе. Скажи, що ти живеш у квартирі." }, accepted: ["I live in a flat."] },
    { id: "l06c5-04", type: "situation", grammarPoint: "l06c5_lives", situation: { ru: "Подруга спрашивает, где отдыхает мама. Скажи, что она отдыхает в тени.", uk: "Подруга питає, де відпочиває мама. Скажи, що вона відпочиває в тіні." }, accepted: ["She rests in the shade."] },
    { id: "l06c5-05", type: "situation", grammarPoint: "l06c5_cycles", situation: { ru: "Коллега удивлён, что брат не ездит на машине. Скажи, что он ездит на работу на велосипеде.", uk: "Колега здивований, що брат не їздить машиною. Скажи, що він їздить на роботу велосипедом." }, accepted: ["He cycles to work."] },
    { id: "l06c5-06", type: "situation", grammarPoint: "l06c5_cycles", situation: { ru: "Мама волнуется за сестру. Скажи, что она ездит в шлеме.", uk: "Мама хвилюється за сестру. Скажи, що вона їздить у шоломі." }, accepted: ["She cycles with a helmet."] },
    { id: "l06c5-07", type: "dialogue", grammarPoint: "l06c5_studies", partnerLine: "We drink tea.", situation: { ru: "Скажи, что она пьёт лимонад.", uk: "Скажи, що вона п’є лимонад." }, accepted: ["She drinks lemonade."] },
    { id: "l06c5-08", type: "dialogue", grammarPoint: "l06c5_studies", partnerLine: "We sleep on the sofa.", situation: { ru: "Скажи, что кот спит на подушке.", uk: "Скажи, що кіт спить на подушці." }, accepted: ["It sleeps on the cushion."] },
    { id: "l06c5-09", type: "dialogue", grammarPoint: "l06c5_lives", partnerLine: "We live in a flat.", situation: { ru: "Скажи, что он живёт в коттедже.", uk: "Скажи, що він живе в котеджі." }, accepted: ["He lives in a cottage."] },
    { id: "l06c5-10", type: "dialogue", grammarPoint: "l06c5_lives", partnerLine: "They shop here.", situation: { ru: "Скажи, что она покупает со скидками.", uk: "Скажи, що вона купує зі знижками." }, accepted: ["She shops for bargains."] },
    { id: "l06c5-11", type: "dialogue", grammarPoint: "l06c5_cycles", partnerLine: "I cycle to the park.", situation: { ru: "Скажи, что вы ездите на работу на велосипеде.", uk: "Скажи, що ви їздите на роботу велосипедом." }, accepted: ["We cycle to work."] },
    { id: "l06c5-12", type: "dialogue", grammarPoint: "l06c5_cycles", partnerLine: "He studies in the library.", situation: { ru: "Добавь: она живёт рядом с библиотекой.", uk: "Додай: вона живе поруч із бібліотекою." }, accepted: ["She lives near the library."] },
    { id: "l06c5-13", type: "fix", grammarPoint: "l06c5_studies", wrong: "She studys in the library.", accepted: ["She studies in the library."] },
    { id: "l06c5-14", type: "fix", grammarPoint: "l06c5_lives", wrong: "He live in a cottage.", accepted: ["He lives in a cottage."] },
    { id: "l06c5-15", type: "fix", grammarPoint: "l06c5_cycles", wrong: "We cycles to the park.", accepted: ["We cycle to the park."] },
    { id: "l06c5-16", type: "fix", grammarPoint: "l06c5_studies", wrong: "He sleep on the sofa.", accepted: ["He sleeps on the sofa."] },
  ],
};
