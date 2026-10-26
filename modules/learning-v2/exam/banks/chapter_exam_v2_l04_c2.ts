// chapter_exam_v2_l04_c2.ts — банк экзамена v2: урок 4, глава 2 (эпизоды 9–16).
// зачем (слово владельца 26.10: экзамены глав v2 для всех уроков, войдут в 2.0.3; правила — docs/work/factory-exam-banks-task-for-codex-2026-10-25.md):
// каждое английское слово реплики, фразы с ошибкой и всех принятых ответов уже встречалось в эпизодах 1–16 урока 4
// (сторож tests/owner_locks_exam_episode_words_2026_10_25.test.ts); ситуация и ответ сходятся по смыслу; вопросы со знаком «?» (с 92b29de96 запрет только для урока 1).
// Глава 2: Is there a… (9, 10, 13), Are there… (11, 14, 15), короткие ответы Yes, there is / No, there aren’t (10, 12, 16).
// Подключение в приложении (BANKS) — Learning V2 после вычитки владельцем; читабельный вид — docs/work/exam-banks/l04.md.
import type { ChapterExamV2Bank } from '../chapter_exam_v2';

export const CHAPTER_EXAM_V2_BANK_L04_C2: ChapterExamV2Bank = {
  lessonOrdinal: 4,
  chapterOrdinal: 2,
  grammarPoints: [
    { id: "l04c2_is_there", label: { ru: "есть ли одно — Is there a…", uk: "чи є одне — Is there a…" }, episodeOrdinals: [9, 10, 13] },
    { id: "l04c2_are_there", label: { ru: "есть ли несколько — Are there…", uk: "чи є кілька — Are there…" }, episodeOrdinals: [11, 14, 15] },
    { id: "l04c2_short", label: { ru: "короткий ответ — Yes, there is / No, there aren’t", uk: "коротка відповідь — Yes, there is / No, there aren’t" }, episodeOrdinals: [10, 12, 16] },
  ],
  items: [
    { id: "l04c2-01", type: "situation", grammarPoint: "l04c2_is_there", situation: { ru: "В новом районе у тебя заболел зуб. Спроси, есть ли здесь стоматолог.", uk: "У новому районі в тебе заболів зуб. Спитай, чи є тут стоматолог." }, accepted: ["Is there a dentist here?"] },
    { id: "l04c2-02", type: "situation", grammarPoint: "l04c2_are_there", situation: { ru: "Ты на остановке в чужом городе. Спроси, ходят ли здесь трамваи.", uk: "Ти на зупинці в чужому місті. Спитай, чи ходять тут трамваї." }, accepted: ["Are there trams here?", "Are there trams near here?"] },
    { id: "l04c2-03", type: "situation", grammarPoint: "l04c2_is_there", situation: { ru: "Ты зашёл в хостел и не видишь стойку. Спроси, есть ли тут ресепшен.", uk: "Ти зайшов у хостел і не бачиш стійки. Спитай, чи є тут рецепція." }, accepted: ["Is there a reception here?"] },
    { id: "l04c2-04", type: "situation", grammarPoint: "l04c2_are_there", situation: { ru: "Ты пришёл в спортзал побегать. Спроси, есть ли здесь беговые дорожки.", uk: "Ти прийшов у спортзал побігати. Спитай, чи є тут бігові доріжки." }, accepted: ["Are there treadmills here?"] },
    { id: "l04c2-05", type: "situation", grammarPoint: "l04c2_short", situation: { ru: "Подруга спрашивает, есть ли рядом аптека. Аптека есть — ответь коротко.", uk: "Подруга питає, чи є поруч аптека. Аптека є — відповідай коротко." }, accepted: ["Yes, there is."] },
    { id: "l04c2-06", type: "situation", grammarPoint: "l04c2_short", situation: { ru: "Турист спрашивает, есть ли здесь парки. Парков нет — ответь коротко.", uk: "Турист питає, чи є тут парки. Парків немає — відповідай коротко." }, accepted: ["No, there aren't."] },
    { id: "l04c2-07", type: "situation", grammarPoint: "l04c2_short", situation: { ru: "Сосед спрашивает, есть ли в прачечной сушилки. Есть — ответь коротко.", uk: "Сусід питає, чи є в пральні сушарки. Є — відповідай коротко." }, accepted: ["Yes, there are."] },
    { id: "l04c2-08", type: "dialogue", grammarPoint: "l04c2_is_there", partnerLine: "There is a gym near the park.", situation: { ru: "Спроси, есть ли там и бассейн.", uk: "Спитай, чи є там і басейн." }, accepted: ["Is there a swimming pool here?"] },
    { id: "l04c2-09", type: "dialogue", grammarPoint: "l04c2_are_there", partnerLine: "There is a dryer near the door.", situation: { ru: "Спроси, есть ли здесь жетоны.", uk: "Спитай, чи є тут жетони." }, accepted: ["Are there tokens here?"] },
    { id: "l04c2-10", type: "dialogue", grammarPoint: "l04c2_is_there", partnerLine: "There is a doctor here.", situation: { ru: "Спроси, есть ли тут и медсестра.", uk: "Спитай, чи є тут і медсестра." }, accepted: ["Is there a nurse here?"] },
    { id: "l04c2-11", type: "dialogue", grammarPoint: "l04c2_are_there", partnerLine: "There is a bank near here.", situation: { ru: "Спроси, есть ли рядом парки.", uk: "Спитай, чи є поруч парки." }, accepted: ["Are there parks near here?", "Are there parks here?"] },
    { id: "l04c2-12", type: "dialogue", grammarPoint: "l04c2_is_there", partnerLine: "There is a hotel near the bank.", situation: { ru: "Спроси, есть ли рядом хостел — подешевле.", uk: "Спитай, чи є поруч хостел — дешевший." }, accepted: ["Is there a hostel near here?"] },
    { id: "l04c2-13", type: "fix", grammarPoint: "l04c2_is_there", wrong: "Are there a taxi here?", accepted: ["Is there a taxi here?"] },
    { id: "l04c2-14", type: "fix", grammarPoint: "l04c2_are_there", wrong: "Is there trams here?", accepted: ["Are there trams here?"] },
    { id: "l04c2-15", type: "fix", grammarPoint: "l04c2_are_there", wrong: "Are there a dumbbells here?", accepted: ["Are there dumbbells here?"] },
    { id: "l04c2-16", type: "fix", grammarPoint: "l04c2_is_there", wrong: "Is there dentist here?", accepted: ["Is there a dentist here?"] },
  ],
};
