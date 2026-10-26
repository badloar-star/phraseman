// chapter_exam_v2_l07_c4.ts — банк экзамена v2: урок 7, глава 4 (эпизоды 25–32).
// зачем (слово владельца 26.10: экзамены глав v2 для всех уроков, войдут в 2.0.3; правила — docs/work/factory-exam-banks-task-for-codex-2026-10-25.md):
// каждое английское слово реплики, фразы с ошибкой и всех принятых ответов уже встречалось в эпизодах 1–32 урока 7
// (сторож tests/owner_locks_exam_episode_words_2026_10_25.test.ts); ситуация и ответ сходятся по смыслу; вопросы со знаком «?» (с 92b29de96 запрет только для урока 1).
// Глава 4: Where do / does (25, 26, 30), When do / does (27, 28, 29), do с you и does с he / she в семейных делах и спорте (31, 32).
// Подключение в приложении (BANKS) — Learning V2 после вычитки владельцем; читабельный вид — docs/work/exam-banks/l07.md.
import type { ChapterExamV2Bank } from '../chapter_exam_v2';

export const CHAPTER_EXAM_V2_BANK_L07_C4: ChapterExamV2Bank = {
  lessonOrdinal: 7,
  chapterOrdinal: 4,
  grammarPoints: [
    { id: "l07c4_where", label: { ru: "где — Where do you…, Where does he…", uk: "де — Where do you…, Where does he…" }, episodeOrdinals: [25, 26, 30] },
    { id: "l07c4_when", label: { ru: "когда — When do you…, When does it…", uk: "коли — When do you…, When does it…" }, episodeOrdinals: [27, 28, 29] },
    { id: "l07c4_do_does", label: { ru: "do или does — When do you…, When does she…", uk: "do чи does — When do you…, When does she…" }, episodeOrdinals: [31, 32] },
  ],
  items: [
    { id: "l07c4-01", type: "situation", grammarPoint: "l07c4_where", situation: { ru: "Вы договариваетесь о встрече с друзьями. Спроси, где вы встречаетесь.", uk: "Ви домовляєтеся про зустріч із друзями. Спитай, де ви зустрічаєтеся." }, accepted: ["Where do we meet?", "Where do you meet?"] },
    { id: "l07c4-02", type: "situation", grammarPoint: "l07c4_where", situation: { ru: "Новый коллега спрашивает про юриста. Спроси, где юрист паркуется.", uk: "Новий колега питає про юриста. Спитай, де юрист паркується." }, accepted: ["Where does the lawyer park?"] },
    { id: "l07c4-03", type: "situation", grammarPoint: "l07c4_when", situation: { ru: "Ты в новом офисе. Спроси, когда открывается столовая.", uk: "Ти в новому офісі. Спитай, коли відчиняється їдальня." }, accepted: ["When does the canteen open?"] },
    { id: "l07c4-04", type: "situation", grammarPoint: "l07c4_when", situation: { ru: "Ты приглашаешь друга в гости. Спроси, когда он возвращается из поездки.", uk: "Ти запрошуєш друга в гості. Спитай, коли він повертається з поїздки." }, accepted: ["When do you return?"] },
    { id: "l07c4-05", type: "situation", grammarPoint: "l07c4_do_does", situation: { ru: "Сестра часто помогает с детьми. Спроси, где она сидит с детьми.", uk: "Сестра часто допомагає з дітьми. Спитай, де вона доглядає дітей." }, accepted: ["Where does she babysit?"] },
    { id: "l07c4-06", type: "situation", grammarPoint: "l07c4_do_does", situation: { ru: "Друг занимается греблей. Спроси, где он гребёт.", uk: "Друг займається веслуванням. Спитай, де він веслує." }, accepted: ["Where do you row?"] },
    { id: "l07c4-07", type: "dialogue", grammarPoint: "l07c4_when", partnerLine: "The festival is near the park.", situation: { ru: "Спроси, когда фестиваль открывается.", uk: "Спитай, коли фестиваль відкривається." }, accepted: ["When does the festival open?"] },
    { id: "l07c4-08", type: "dialogue", grammarPoint: "l07c4_where", partnerLine: "Your payment is late.", situation: { ru: "Спроси, где оплатить счёт.", uk: "Спитай, де сплатити рахунок." }, accepted: ["Where do you pay the bill?"] },
    { id: "l07c4-09", type: "dialogue", grammarPoint: "l07c4_when", partnerLine: "The concert is loud.", situation: { ru: "Спроси, когда концерт заканчивается.", uk: "Спитай, коли концерт закінчується." }, accepted: ["When does the concert finish?"] },
    { id: "l07c4-10", type: "dialogue", grammarPoint: "l07c4_when", partnerLine: "We rehearse here.", situation: { ru: "Спроси, когда хор репетирует.", uk: "Спитай, коли хор репетирує." }, accepted: ["When does the choir rehearse?"] },
    { id: "l07c4-11", type: "dialogue", grammarPoint: "l07c4_do_does", partnerLine: "The rink is near the park.", situation: { ru: "Спроси, когда каток закрывается.", uk: "Спитай, коли ковзанка зачиняється." }, accepted: ["When does the rink close?"] },
    { id: "l07c4-12", type: "dialogue", grammarPoint: "l07c4_do_does", partnerLine: "I visit our grandmother.", situation: { ru: "Спроси, когда она навещает бабушку.", uk: "Спитай, коли вона відвідує бабусю." }, accepted: ["When does she visit our grandmother?"] },
    { id: "l07c4-13", type: "fix", grammarPoint: "l07c4_where", wrong: "Where does you work?", accepted: ["Where do you work?"] },
    { id: "l07c4-14", type: "fix", grammarPoint: "l07c4_when", wrong: "When do the canteen open?", accepted: ["When does the canteen open?"] },
    { id: "l07c4-15", type: "fix", grammarPoint: "l07c4_do_does", wrong: "When do he shave?", accepted: ["When does he shave?"] },
    { id: "l07c4-16", type: "fix", grammarPoint: "l07c4_where", wrong: "Where do the lawyer park?", accepted: ["Where does the lawyer park?"] },
  ],
};
