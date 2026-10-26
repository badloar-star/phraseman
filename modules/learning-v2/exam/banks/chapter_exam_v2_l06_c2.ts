// chapter_exam_v2_l06_c2.ts — банк экзамена v2: урок 6, глава 2 (эпизоды 9–16).
// зачем (слово владельца 26.10: экзамены глав v2 для всех уроков, войдут в 2.0.3; правила — docs/work/factory-exam-banks-task-for-codex-2026-10-25.md):
// каждое английское слово реплики, фразы с ошибкой и всех принятых ответов уже встречалось в эпизодах 1–16 урока 6
// (сторож tests/owner_locks_exam_episode_words_2026_10_25.test.ts); ситуация и ответ сходятся по смыслу; вопросы без «?» — общий тест правил банков.
// Глава 2: чем вы занимаетесь — practice, learn, paint (10, 11, 12), где и с чем — swim in the pool, laugh at the joke, sing in the choir (13, 14, 15), действие или am / is / are — I paint и I am a member (9, 16).
// Подключение в приложении (BANKS) — Learning V2 после вычитки владельцем; читабельный вид — docs/work/exam-banks/l06.md.
import type { ChapterExamV2Bank } from '../chapter_exam_v2';

export const CHAPTER_EXAM_V2_BANK_L06_C2: ChapterExamV2Bank = {
  lessonOrdinal: 6,
  chapterOrdinal: 2,
  grammarPoints: [
    { id: "l06c2_activity", label: { ru: "занятие — I learn English, we paint", uk: "заняття — I learn English, we paint" }, episodeOrdinals: [10, 11, 12] },
    { id: "l06c2_place", label: { ru: "где и над чем — in the pool, at the joke, in the choir", uk: "де і з чого — in the pool, at the joke, in the choir" }, episodeOrdinals: [13, 14, 15] },
    { id: "l06c2_be_or_do", label: { ru: "действие или am / are — I start at four, I am a member", uk: "дія чи am / are — I start at four, I am a member" }, episodeOrdinals: [9, 16] },
  ],
  items: [
    { id: "l06c2-01", type: "situation", grammarPoint: "l06c2_activity", situation: { ru: "Попутчик в трамвае видит учебник. Скажи, что учишь английский.", uk: "Попутник у трамваї бачить підручник. Скажи, що вчиш англійську." }, accepted: ["I learn English."] },
    { id: "l06c2-02", type: "situation", grammarPoint: "l06c2_activity", situation: { ru: "Подруга спрашивает, где ты рисуешь. Скажи, что дома.", uk: "Подруга питає, де ти малюєш. Скажи, що вдома." }, accepted: ["I paint at home."] },
    { id: "l06c2-03", type: "situation", grammarPoint: "l06c2_place", situation: { ru: "Тренер спрашивает, где ты плаваешь. Скажи, что во второй дорожке.", uk: "Тренер питає, де ти плаваєш. Скажи, що на другій доріжці." }, accepted: ["I swim in lane two."] },
    { id: "l06c2-04", type: "situation", grammarPoint: "l06c2_place", situation: { ru: "Друзья смеются над шуткой. Скажи, что они смеются вместе.", uk: "Друзі сміються з жарту. Скажи, що вони сміються разом." }, accepted: ["They laugh together.", "They laugh at the joke."] },
    { id: "l06c2-05", type: "situation", grammarPoint: "l06c2_be_or_do", situation: { ru: "Администратор клуба спрашивает, кто ты. Скажи, что ты член клуба.", uk: "Адміністратор клубу питає, хто ти. Скажи, що ти член клубу." }, accepted: ["I am a member of the club."] },
    { id: "l06c2-06", type: "situation", grammarPoint: "l06c2_be_or_do", situation: { ru: "Начальник спрашивает про смену. Скажи, что ты начинаешь в четыре.", uk: "Начальник питає про зміну. Скажи, що ти починаєш о четвертій." }, accepted: ["I start at four.", "I start the shift at four."] },
    { id: "l06c2-07", type: "dialogue", grammarPoint: "l06c2_activity", partnerLine: "We work in this hotel.", situation: { ru: "Добавь: вы практикуете здесь английский.", uk: "Додай: ви практикуєте тут англійську." }, accepted: ["We practice English here.", "We practice English in the hotel."] },
    { id: "l06c2-08", type: "dialogue", grammarPoint: "l06c2_activity", partnerLine: "I paint at home.", situation: { ru: "Скажи, что друг рисует в студии.", uk: "Скажи, що друг малює в студії." }, accepted: ["You paint in the studio."] },
    { id: "l06c2-09", type: "dialogue", grammarPoint: "l06c2_place", partnerLine: "This song is new.", situation: { ru: "Скажи, что вы поёте в хоре.", uk: "Скажи, що ви співаєте в хорі." }, accepted: ["We sing in the choir."] },
    { id: "l06c2-10", type: "dialogue", grammarPoint: "l06c2_place", partnerLine: "We have a funny joke.", situation: { ru: "Скажи, что ты смеёшься над шуткой.", uk: "Скажи, що ти смієшся з жарту." }, accepted: ["I laugh at the joke."] },
    { id: "l06c2-11", type: "dialogue", grammarPoint: "l06c2_be_or_do", partnerLine: "We start at two.", situation: { ru: "Скажи, что у тебя перерыв в четыре.", uk: "Скажи, що в тебе перерва о четвертій." }, accepted: ["I have a break at four."] },
    { id: "l06c2-12", type: "dialogue", grammarPoint: "l06c2_be_or_do", partnerLine: "I paint at the club.", situation: { ru: "Скажи, что ты член класса.", uk: "Скажи, що ти член класу." }, accepted: ["I am a member of the class."] },
    { id: "l06c2-13", type: "fix", grammarPoint: "l06c2_activity", wrong: "I am learn English.", accepted: ["I learn English."] },
    { id: "l06c2-14", type: "fix", grammarPoint: "l06c2_place", wrong: "They are swim in the pool.", accepted: ["They swim in the pool."] },
    { id: "l06c2-15", type: "fix", grammarPoint: "l06c2_be_or_do", wrong: "I member of the club.", accepted: ["I am a member of the club."] },
    { id: "l06c2-16", type: "fix", grammarPoint: "l06c2_activity", wrong: "We are paint at home.", accepted: ["We paint at home."] },
  ],
};
