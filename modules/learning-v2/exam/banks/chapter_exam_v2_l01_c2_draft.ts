// chapter_exam_v2_l01_c2_draft.ts — ВРЕМЕННЫЙ банк пилота экзамена v2: урок 1, глава 2 «Кофе с коллегой».
// зачем (координатор 25.10): движок v2 пилотируется на главе 2 по черновику 3 · МАКЕТОВ (docs/work/tasks/chapter-exam-v2-2026-10-25.md,
// 951c52ffb) — 10 заданий, написаны для макета, НЕ редактором курса. В выпуск — только банк фабрики (exam_bank, спецификация
// docs/work/tasks/factory-spec-exam-bank-and-outcomes-2026-10-25.md) после вычитки владельцем. Экзамен v2 за флагом «Пульта».
// ⚠️ Черновик проверяет «мы / они — are» (T3) и вопросы (T5), а в эпизодах 9–16 урока 1 их ещё нет — у этих тем нет эпизодов
// для «Повторить эти темы». Банк фабрики обязан держаться пройденной грамматики.
import type { ChapterExamV2Bank } from '../chapter_exam_v2';

export const CHAPTER_EXAM_V2_BANK_L01_C2_DRAFT: ChapterExamV2Bank = {
  lessonOrdinal: 1,
  chapterOrdinal: 2,
  grammarPoints: [
    { id: 'l01c2_am_are', label: { ru: 'я / ты — am, are', uk: 'я / ти — am, are' }, episodeOrdinals: [12, 13, 15] },
    { id: 'l01c2_is', label: { ru: 'он / она / оно — is', uk: 'він / вона / воно — is' }, episodeOrdinals: [9, 16] },
    { id: 'l01c2_we_they', label: { ru: 'мы / они — are', uk: 'ми / вони — are' }, episodeOrdinals: [] },
    { id: 'l01c2_not', label: { ru: 'не — isn’t, aren’t, I’m not', uk: 'не — isn’t, aren’t, I’m not' }, episodeOrdinals: [11, 15] },
    { id: 'l01c2_question', label: { ru: 'вопрос и короткий ответ', uk: 'питання і коротка відповідь' }, episodeOrdinals: [] },
  ],
  items: [
    { id: 'l01c2-d01', type: 'situation', grammarPoint: 'l01c2_not', situation: { ru: 'Коллега спрашивает про отчёт. Скажи, что ты ещё не готов.' }, accepted: ["I'm not ready yet.", 'I am not ready yet.'] },
    { id: 'l01c2-d02', type: 'dialogue', grammarPoint: 'l01c2_question', partnerLine: 'Are you new here?', situation: { ru: 'Ответь: да, ты новенький.' }, accepted: ["Yes, I'm new here.", 'Yes, I am.', 'Yes, I am new here.'] },
    { id: 'l01c2-d03', type: 'fix', grammarPoint: 'l01c2_is', wrong: 'She are in a meeting.', accepted: ['She is in a meeting.', "She's in a meeting."] },
    { id: 'l01c2-d04', type: 'situation', grammarPoint: 'l01c2_is', situation: { ru: 'Кофе остыл. Скажи об этом.' }, accepted: ['The coffee is cold.', "The coffee's cold."] },
    { id: 'l01c2-d05', type: 'dialogue', grammarPoint: 'l01c2_question', partnerLine: 'Is Tom at work today?', situation: { ru: 'Ответь: нет, он дома.' }, accepted: ["No, he isn't. He's at home.", 'No, he is at home.', "No, he's at home.", 'No, he is not. He is at home.'] },
    { id: 'l01c2-d06', type: 'fix', grammarPoint: 'l01c2_we_they', wrong: 'We is late for the bus.', accepted: ['We are late for the bus.', "We're late for the bus."] },
    { id: 'l01c2-d07', type: 'situation', grammarPoint: 'l01c2_not', situation: { ru: 'Сосед зовёт обедать. Скажи, что ты не голоден.' }, accepted: ["I'm not hungry.", 'I am not hungry.'] },
    { id: 'l01c2-d08', type: 'dialogue', grammarPoint: 'l01c2_we_they', partnerLine: 'Where are my keys?', situation: { ru: 'Ответь: они на столе.' }, accepted: ["They're on the table.", 'They are on the table.'] },
    { id: 'l01c2-d09', type: 'fix', grammarPoint: 'l01c2_not', wrong: 'It not is my phone.', accepted: ["It isn't my phone.", "It's not my phone.", 'It is not my phone.'] },
    { id: 'l01c2-d10', type: 'situation', grammarPoint: 'l01c2_we_they', situation: { ru: 'Тебя спрашивают, откуда вы с другом. Скажи, что вы из Казани.' }, accepted: ["We're from Kazan.", 'We are from Kazan.'] },
  ],
};
