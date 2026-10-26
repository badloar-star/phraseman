// chapter_exam_v2_l04_c3.ts — банк экзамена v2: урок 4, глава 3 (эпизоды 17–24).
// зачем (слово владельца 26.10: экзамены глав v2 для всех уроков, войдут в 2.0.3; правила — docs/work/factory-exam-banks-task-for-codex-2026-10-25.md):
// каждое английское слово реплики, фразы с ошибкой и всех принятых ответов уже встречалось в эпизодах 1–24 урока 4
// (сторож tests/owner_locks_exam_episode_words_2026_10_25.test.ts); ситуация и ответ сходятся по смыслу; вопросы со знаком «?» (с 92b29de96 запрет только для урока 1).
// Глава 3: some в сообщении (17, 18, 23), any в вопросе (19, 20, 24), There isn’t / aren’t any (21, 22, 23).
// Подключение в приложении (BANKS) — Learning V2 после вычитки владельцем; читабельный вид — docs/work/exam-banks/l04.md.
import type { ChapterExamV2Bank } from '../chapter_exam_v2';

export const CHAPTER_EXAM_V2_BANK_L04_C3: ChapterExamV2Bank = {
  lessonOrdinal: 4,
  chapterOrdinal: 3,
  grammarPoints: [
    { id: "l04c3_some", label: { ru: "немного / несколько — some", uk: "трохи / кілька — some" }, episodeOrdinals: [17, 18, 23] },
    { id: "l04c3_any_q", label: { ru: "есть ли — Is there any / Are there any", uk: "чи є — Is there any / Are there any" }, episodeOrdinals: [19, 20, 24] },
    { id: "l04c3_not_any", label: { ru: "нет — There isn’t any / There aren’t any", uk: "немає — There isn’t any / There aren’t any" }, episodeOrdinals: [21, 22, 23] },
  ],
  items: [
    { id: "l04c3-01", type: "situation", grammarPoint: "l04c3_some", situation: { ru: "Друг ищет, чем перекусить. Скажи, что у холодильника есть ягоды.", uk: "Друг шукає, чим перекусити. Скажи, що біля холодильника є ягоди." }, accepted: ["There are some berries near the fridge."] },
    { id: "l04c3-02", type: "situation", grammarPoint: "l04c3_some", situation: { ru: "Гость спрашивает, есть ли хлеб к супу. Скажи, что немного хлеба есть.", uk: "Гість питає, чи є хліб до супу. Скажи, що трохи хліба є." }, accepted: ["There is some bread here."] },
    { id: "l04c3-03", type: "situation", grammarPoint: "l04c3_any_q", situation: { ru: "Ты голоден и заглянул на кухню к другу. Спроси, есть ли суп.", uk: "Ти голодний і зазирнув на кухню до друга. Спитай, чи є суп." }, accepted: ["Is there any soup here?", "Is there any soup?"] },
    { id: "l04c3-04", type: "situation", grammarPoint: "l04c3_any_q", situation: { ru: "Ты печёшь пирог. Спроси, есть ли в доме орехи.", uk: "Ти печеш пиріг. Спитай, чи є вдома горіхи." }, accepted: ["Are there any nuts here?", "Are there any nuts?"] },
    { id: "l04c3-05", type: "situation", grammarPoint: "l04c3_not_any", situation: { ru: "Гость просит кофе, а он закончился. Скажи, что кофе нет.", uk: "Гість просить каву, а вона закінчилася. Скажи, що кави немає." }, accepted: ["There isn't any coffee here.", "There isn't any coffee."] },
    { id: "l04c3-06", type: "situation", grammarPoint: "l04c3_not_any", situation: { ru: "Дети просят печенье, а пачка пустая. Скажи, что печенья нет.", uk: "Діти просять печиво, а пачка порожня. Скажи, що печива немає." }, accepted: ["There aren't any biscuits here.", "There aren't any biscuits."] },
    { id: "l04c3-07", type: "dialogue", grammarPoint: "l04c3_some", partnerLine: "There isn't any milk here.", situation: { ru: "Возрази: молоко есть, у холодильника.", uk: "Заперечи: молоко є, біля холодильника." }, accepted: ["There is some milk near the fridge."] },
    { id: "l04c3-08", type: "dialogue", grammarPoint: "l04c3_any_q", partnerLine: "There is some rice here.", situation: { ru: "Спроси, есть ли ещё и макароны.", uk: "Спитай, чи є ще й макарони." }, accepted: ["Is there any pasta here?", "Is there any pasta?"] },
    { id: "l04c3-09", type: "dialogue", grammarPoint: "l04c3_not_any", partnerLine: "There is some tea here.", situation: { ru: "Поправь: чая здесь нет.", uk: "Виправ: чаю тут немає." }, accepted: ["There isn't any tea here."] },
    { id: "l04c3-10", type: "dialogue", grammarPoint: "l04c3_some", partnerLine: "There aren't any cherries here.", situation: { ru: "Возрази: вишни есть, за холодильником.", uk: "Заперечи: вишні є, за холодильником." }, accepted: ["There are some cherries behind the fridge."] },
    { id: "l04c3-11", type: "dialogue", grammarPoint: "l04c3_any_q", partnerLine: "There are some beans here.", situation: { ru: "Спроси, есть ли грибы.", uk: "Спитай, чи є гриби." }, accepted: ["Are there any mushrooms here?", "Are there any mushrooms?"] },
    { id: "l04c3-12", type: "dialogue", grammarPoint: "l04c3_not_any", partnerLine: "There are some carrots near the fridge.", situation: { ru: "Поправь: моркови там нет.", uk: "Виправ: моркви там немає." }, accepted: ["There aren't any carrots near the fridge."] },
    { id: "l04c3-13", type: "fix", grammarPoint: "l04c3_some", wrong: "There are some milk here.", accepted: ["There is some milk here."] },
    { id: "l04c3-14", type: "fix", grammarPoint: "l04c3_any_q", wrong: "Is there some soup here?", accepted: ["Is there any soup here?"] },
    { id: "l04c3-15", type: "fix", grammarPoint: "l04c3_not_any", wrong: "There isn't some juice here.", accepted: ["There isn't any juice here."] },
    { id: "l04c3-16", type: "fix", grammarPoint: "l04c3_not_any", wrong: "There aren't any carrot here.", accepted: ["There aren't any carrots here."] },
  ],
};
